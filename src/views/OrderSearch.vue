<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import Navbar from '@/components/Navbar.vue'
import Sidebar from '@/components/Sidebar.vue'
import PageContainer from '@/components/ui/PageContainer.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import { useSidebar } from '@/composables/useSidebar'
import { useTheme } from '@/composables/useTheme'
import { useOrderStore } from '@/stores/order'
import type { ScheduleSegment } from '@/types/order'
import {
  MagnifyingGlassIcon,
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon
} from '@heroicons/vue/24/outline'

const { isCollapsed } = useSidebar()
const { theme } = useTheme()
const router = useRouter()
const orderStore = useOrderStore()

interface Order {
  shipSegments: ScheduleSegment[]
  orderNo: string
  distributor: string
  bookerInfo: string
  bookTime: string
  orderStatus: string
  tickets: string
}

const dateFrom = ref('2026-01-10')
const dateTo = ref('2026-01-10')
const searchKeyword = ref('')
const searchField = ref('id')
const currentStatusFilter = ref('none')
const entriesPerPage = ref(30)
const currentPage = ref(1)
const tableSearchText = ref('')

const allOrders = ref<Order[]>([])
const filteredOrders = ref<Order[]>([])

const setToday = () => {
  const today = new Date().toISOString().split('T')[0] as string
  dateFrom.value = today
  dateTo.value = today
}

const setThisMonth = () => {
  const today = new Date()
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0)

  dateFrom.value = firstDay.toISOString().split('T')[0] as string
  dateTo.value = lastDay.toISOString().split('T')[0] as string
}

// 新 Order 狀態對應顯示文字
const statusDisplayMap: Record<string, string> = {
  pending: '未取票',
  confirmed: '已取票',
  completed: '已登船',
  cancelled: '已取消',
  waitlist: '候補中'
}

// 從 orderStore 讀取訂單並轉換格式
const loadOrdersFromLocalStorage = (): Order[] => {
  if (!orderStore.orders || orderStore.orders.length === 0) return []

  try {
    return orderStore.orders.map((order) => {
      return {
        shipSegments: order.scheduleSegments || [],
        orderNo: order.orderNumber,
        distributor: order.createdBy || '',
        bookerInfo: `${order.customerName} / ${order.customerPhone}`,
        bookTime: order.createdAt.split('T')[0] as string,
        orderStatus: statusDisplayMap[order.status] || order.status,
        tickets: order.ticketBreakdown?.length
          ? order.ticketBreakdown.map(b => `${b.passengerType} x${b.quantity}`).join('、')
          : order.notes || `${order.passengers.length} 人`
      }
    })
  } catch (error) {
    console.error('讀取訂單失敗:', error)
    return []
  }
}

const performSearch = (showAlert = true) => {
  const allStoredOrders = loadOrdersFromLocalStorage()

  if (allStoredOrders.length === 0) {
    if (showAlert) {
      alert('目前沒有訂單資料')
    }
    filteredOrders.value = []
    allOrders.value = []
    return
  }

  const filtered = allStoredOrders.filter(order => {
    // 以第一段航段的日期為基準篩選
    const firstDate = order.shipSegments[0]?.date
    if (!firstDate) return false
    return firstDate >= dateFrom.value && firstDate <= dateTo.value
  })

  if (searchKeyword.value.trim()) {
    const keyword = searchKeyword.value.toLowerCase()
    allOrders.value = filtered.filter(order => {
      switch (searchField.value) {
        case 'id':
        case 'name':
        case 'phone':
          return order.bookerInfo.toLowerCase().includes(keyword)
        case 'orderNo':
          return order.orderNo.toLowerCase().includes(keyword)
        case 'distributor':
          return order.distributor.toLowerCase().includes(keyword)
        default:
          return true
      }
    })
  } else {
    allOrders.value = filtered
  }

  filteredOrders.value = allOrders.value
  currentPage.value = 1

  if (filteredOrders.value.length === 0 && showAlert) {
    alert('沒有符合條件的訂單')
  }
}

const filterStatus = (status: string) => {
  currentStatusFilter.value = status

  if (allOrders.value.length > 0) {
    if (status === 'none') {
      filteredOrders.value = allOrders.value
    } else {
      const statusMap: Record<string, string> = {
        'unpicked': '未取票',
        'picked': '已取票',
        'boarded': '已登船',
        'cancelled': '已取消',
        'waitlist': '候補中'
      }
      filteredOrders.value = allOrders.value.filter(order =>
        order.orderStatus === statusMap[status]
      )
    }
    currentPage.value = 1
  }
}

const searchTable = () => {
  const searchText = tableSearchText.value.toLowerCase()

  if (searchText === '') {
    filteredOrders.value = allOrders.value
  } else {
    filteredOrders.value = allOrders.value.filter(order => {
      const segmentStr = order.shipSegments.map(s => `${s.date} ${s.time} ${s.route}`).join(' ')
      const { shipSegments: _, ...rest } = order
      return (
        segmentStr.toLowerCase().includes(searchText) ||
        Object.values(rest).some(value => String(value).toLowerCase().includes(searchText))
      )
    })
  }

  currentPage.value = 1
}

const paginatedOrders = computed(() => {
  const start = (currentPage.value - 1) * entriesPerPage.value
  const end = start + entriesPerPage.value
  return filteredOrders.value.slice(start, end)
})

const totalPages = computed(() => {
  return Math.ceil(filteredOrders.value.length / entriesPerPage.value)
})

const paginationInfo = computed(() => {
  const totalRecords = filteredOrders.value.length
  const start = totalRecords === 0 ? 0 : (currentPage.value - 1) * entriesPerPage.value + 1
  const end = Math.min(currentPage.value * entriesPerPage.value, totalRecords)

  return {
    start,
    end,
    total: totalRecords
  }
})

const goToPage = (action: string) => {
  switch (action) {
    case 'first':
      currentPage.value = 1
      break
    case 'prev':
      if (currentPage.value > 1) currentPage.value--
      break
    case 'next':
      if (currentPage.value < totalPages.value) currentPage.value++
      break
    case 'last':
      currentPage.value = totalPages.value
      break
  }
}

const getStatusClass = (status: string) => {
  const baseClasses = 'px-3 py-1 rounded-full text-xs font-medium'
  switch (status) {
    case '未取票':
      return `${baseClasses} bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400`
    case '已取票':
      return `${baseClasses} bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400`
    case '已登船':
      return `${baseClasses} bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400`
    case '已取消':
      return `${baseClasses} bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400`
    case '候補中':
      return `${baseClasses} bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400`
    default:
      return `${baseClasses} bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300`
  }
}

const viewOrderDetail = (orderNo: string) => {
  router.push(`/order-detail/${orderNo}`)
}

const formatShipTime = (segments: ScheduleSegment[]): string[] => {
  return segments.map(s => `${s.date}｜${s.time}｜${s.route}`)
}

const loadDefaultSearchSettings = () => {
  const settings = localStorage.getItem('defaultSearchSettings')
  if (settings) {
    try {
      const parsed = JSON.parse(settings)

      if (parsed.dateRange === 'today') {
        setToday()
      } else if (parsed.dateRange === 'thisMonth') {
        setThisMonth()
      } else {
        setToday()
      }

      searchField.value = parsed.searchField || 'id'
      currentStatusFilter.value = parsed.statusFilter || 'none'
      entriesPerPage.value = parsed.entriesPerPage || 30
    } catch (error) {
      console.error('讀取預設搜尋條件失敗:', error)
      setToday()
    }
  } else {
    setToday()
  }
}

onMounted(() => {
  loadDefaultSearchSettings()
  performSearch(false)
})
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <Navbar username="管理員" />

    <div class="flex flex-1">
      <Sidebar :active-route="$route.path.slice(1)" />

      <main
        :class="[
          'flex-1 transition-all duration-300',
          isCollapsed ? 'ml-20' : 'ml-64'
        ]"
      >
        <PageContainer
          title="訂單查詢"
          subtitle="搜尋和查詢訂單資訊"
          :icon="MagnifyingGlassIcon"
          max-width="2xl"
        >
          <!-- 搜尋條件卡片 -->
          <BaseCard title="查詢條件" padding="lg" class="mb-6">
            <!-- 快速選擇日期 -->
            <div class="flex gap-3 mb-6">
              <BaseButton
                variant="outline"
                :icon="CalendarIcon"
                @click="setToday"
              >
                今日
              </BaseButton>
              <BaseButton
                variant="outline"
                :icon="CalendarIcon"
                @click="setThisMonth"
              >
                本月
              </BaseButton>
            </div>

            <!-- 日期範圍 -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div class="space-y-2">
                <label
                  for="dateFrom"
                  class="block text-sm font-medium"
                  :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                >
                  查詢船班時間包含從
                </label>
                <input
                  type="date"
                  id="dateFrom"
                  v-model="dateFrom"
                  class="w-full px-3 py-2 rounded-lg border transition-all outline-none"
                  :class="
                    theme === 'dark'
                      ? 'bg-secondary-800 border-secondary-700 text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/50'
                      : 'bg-white border-neutral-300 text-neutral-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/50'
                  "
                >
              </div>
              <div class="space-y-2">
                <label
                  for="dateTo"
                  class="block text-sm font-medium"
                  :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                >
                  到
                </label>
                <input
                  type="date"
                  id="dateTo"
                  v-model="dateTo"
                  class="w-full px-3 py-2 rounded-lg border transition-all outline-none"
                  :class="
                    theme === 'dark'
                      ? 'bg-secondary-800 border-secondary-700 text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/50'
                      : 'bg-white border-neutral-300 text-neutral-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/50'
                  "
                >
              </div>
            </div>

            <!-- 搜尋欄位選擇 -->
            <div class="space-y-2 mb-6">
              <label
                class="block text-sm font-medium"
                :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
              >
                搜尋欄位
              </label>
              <div class="flex flex-wrap gap-3">
                <button
                  v-for="field in [
                    { value: 'id', label: '訂票人身分證字號' },
                    { value: 'name', label: '訂票人姓名' },
                    { value: 'phone', label: '訂票人電話' },
                    { value: 'orderNo', label: '訂單編號' },
                    { value: 'distributor', label: '經銷商名稱' }
                  ]"
                  :key="field.value"
                  @click="searchField = field.value"
                  type="button"
                  class="px-4 py-2 border-2 rounded-lg text-sm font-medium cursor-pointer transition-all"
                  :class="
                    searchField === field.value
                      ? 'bg-primary-500 text-white border-primary-500'
                      : theme === 'dark'
                        ? 'bg-secondary-800 text-primary-400 border-primary-500 hover:bg-secondary-700'
                        : 'bg-white text-primary-600 border-primary-500 hover:bg-primary-50'
                  "
                >
                  {{ field.label }}
                </button>
              </div>
            </div>

            <!-- 搜尋關鍵字 -->
            <div class="flex gap-3">
              <div class="flex-1">
                <BaseInput
                  v-model="searchKeyword"
                  placeholder="請輸入搜尋關鍵字"
                  :icon="MagnifyingGlassIcon"
                  @keyup.enter="() => performSearch(true)"
                />
              </div>
              <BaseButton
                variant="primary"
                :icon="MagnifyingGlassIcon"
                @click="() => performSearch(true)"
              >
                搜尋
              </BaseButton>
            </div>
          </BaseCard>

          <!-- 狀態篩選 -->
          <BaseCard padding="md" class="mb-6">
            <div class="flex flex-wrap items-center gap-3">
              <span
                class="font-medium text-sm"
                :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
              >
                票卷狀態篩選
              </span>
              <button
                v-for="status in [
                  { value: 'none', label: '全部', color: 'neutral' },
                  { value: 'unpicked', label: '未取票', color: 'amber' },
                  { value: 'picked', label: '已取票', color: 'blue' },
                  { value: 'boarded', label: '已登船', color: 'green' },
                  { value: 'cancelled', label: '已取消', color: 'red' },
                  { value: 'waitlist', label: '候補中', color: 'purple' }
                ]"
                :key="status.value"
                @click="filterStatus(status.value)"
                type="button"
                class="px-4 py-1.5 border-2 rounded-full text-sm font-medium cursor-pointer transition-all"
                :class="[
                  currentStatusFilter === status.value
                    ? `bg-${status.color}-500 text-white border-${status.color}-500`
                    : theme === 'dark'
                      ? `bg-secondary-800 text-${status.color}-400 border-${status.color}-500 hover:bg-secondary-700`
                      : `bg-white text-${status.color}-600 border-${status.color}-500 hover:bg-${status.color}-50`
                ]"
              >
                {{ status.label }}
              </button>
            </div>
          </BaseCard>

          <!-- 表格控制 -->
          <div class="flex items-center justify-between mb-6 flex-wrap gap-4">
            <div class="flex items-center gap-2">
              <span
                class="text-sm"
                :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'"
              >
                一次顯示
              </span>
              <select
                v-model.number="entriesPerPage"
                class="px-3 py-1.5 rounded-lg border transition-all outline-none"
                :class="
                  theme === 'dark'
                    ? 'bg-secondary-800 border-secondary-700 text-white'
                    : 'bg-white border-neutral-300 text-neutral-900'
                "
              >
                <option :value="30">30</option>
                <option :value="50">50</option>
                <option :value="100">100</option>
              </select>
              <span
                class="text-sm"
                :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'"
              >
                筆紀錄
              </span>
            </div>
            <div class="flex items-center gap-2">
              <BaseInput
                v-model="tableSearchText"
                placeholder="快速搜尋表格..."
                :icon="MagnifyingGlassIcon"
                @input="searchTable"
              />
            </div>
          </div>

          <!-- 訂單列表 -->
          <BaseCard padding="none">
            <div class="overflow-x-auto">
              <table
                class="w-full"
                :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
              >
                <thead
                  class="text-sm font-medium border-b"
                  :class="theme === 'dark' ? 'border-secondary-800' : 'border-neutral-200'"
                >
                  <tr>
                    <th class="text-left py-4 px-6">船班時間</th>
                    <th class="text-left py-4 px-6">訂單編號</th>
                    <th class="text-left py-4 px-6">訂票單位</th>
                    <th class="text-left py-4 px-6">訂票人資料</th>
                    <th class="text-left py-4 px-6">訂票時間</th>
                    <th class="text-left py-4 px-6">票卷狀態</th>
                    <th class="text-left py-4 px-6">船票列表</th>
                  </tr>
                </thead>
                <tbody
                  v-if="paginatedOrders.length > 0"
                  class="divide-y"
                  :class="theme === 'dark' ? 'divide-secondary-800' : 'divide-neutral-200'"
                >
                  <tr
                    v-for="order in paginatedOrders"
                    :key="order.orderNo"
                    class="hover:bg-opacity-50 transition-colors"
                    :class="theme === 'dark' ? 'hover:bg-secondary-800' : 'hover:bg-neutral-50'"
                  >
                    <td class="py-4 px-6 text-sm">
                      <div v-for="(line, i) in formatShipTime(order.shipSegments)" :key="i">{{ line }}</div>
                    </td>
                    <td class="py-4 px-6">
                      <button
                        @click="viewOrderDetail(order.orderNo)"
                        type="button"
                        class="text-primary-500 hover:text-primary-600 hover:underline font-medium transition-all"
                      >
                        {{ order.orderNo }}
                      </button>
                    </td>
                    <td class="py-4 px-6 text-sm">{{ order.distributor }}</td>
                    <td class="py-4 px-6 text-sm">{{ order.bookerInfo }}</td>
                    <td class="py-4 px-6 text-sm">{{ order.bookTime }}</td>
                    <td class="py-4 px-6">
                      <span :class="getStatusClass(order.orderStatus)">
                        {{ order.orderStatus }}
                      </span>
                    </td>
                    <td class="py-4 px-6 text-sm">{{ order.tickets }}</td>
                  </tr>
                </tbody>
                <tbody v-else>
                  <tr>
                    <td colspan="7" class="py-12 text-center">
                      <div
                        :class="theme === 'dark' ? 'text-neutral-500' : 'text-neutral-400'"
                      >
                        <MagnifyingGlassIcon class="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p class="text-lg font-medium">沒有資料</p>
                        <p class="text-sm mt-1">請調整搜尋條件或日期範圍</p>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </BaseCard>

          <!-- 分頁 -->
          <div class="flex items-center justify-between mt-6 flex-wrap gap-4">
            <div
              class="text-sm"
              :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'"
            >
              第 <span class="font-semibold">{{ paginationInfo.start }}</span> 至
              <span class="font-semibold">{{ paginationInfo.end }}</span> 筆紀錄
              （共 <span class="font-semibold">{{ paginationInfo.total }}</span> 筆）
            </div>
            <div class="flex gap-2">
              <BaseButton
                variant="outline"
                size="sm"
                :icon="ChevronDoubleLeftIcon"
                :disabled="currentPage === 1"
                @click="goToPage('first')"
              >
                第一頁
              </BaseButton>
              <BaseButton
                variant="outline"
                size="sm"
                :icon="ChevronLeftIcon"
                :disabled="currentPage === 1"
                @click="goToPage('prev')"
              >
                上一頁
              </BaseButton>
              <BaseButton
                variant="outline"
                size="sm"
                :icon="ChevronRightIcon"
                :disabled="currentPage === totalPages || totalPages === 0"
                @click="goToPage('next')"
              >
                下一頁
              </BaseButton>
              <BaseButton
                variant="outline"
                size="sm"
                :icon="ChevronDoubleRightIcon"
                :disabled="currentPage === totalPages || totalPages === 0"
                @click="goToPage('last')"
              >
                最後一頁
              </BaseButton>
            </div>
          </div>
        </PageContainer>
      </main>
    </div>
  </div>
</template>
