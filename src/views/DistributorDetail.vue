<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useSidebar } from '@/composables/useSidebar'
import { useTheme } from '@/composables/useTheme'
import Navbar from '@/components/Navbar.vue'
import Sidebar from '@/components/Sidebar.vue'
import PageContainer from '@/components/ui/PageContainer.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import {
  distributors,
  mockOrders,
  DistributorType,
  type SavedOrder,
  type Distributor
} from '@/constants/mockOrders'
import {
  BuildingStorefrontIcon,
  ArrowDownTrayIcon,
  ArrowLeftIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ChevronUpDownIcon,
  ClipboardDocumentListIcon,
  ExclamationCircleIcon,
  UserIcon,
  PhoneIcon,
  HashtagIcon
} from '@heroicons/vue/24/outline'

const { isCollapsed } = useSidebar()
const { theme } = useTheme()
const router = useRouter()
const route = useRoute()

const distributorId = ref<string>(route.params.distributorId as string)
const distributor = ref<Distributor | null>(null)
const selectedMonth = ref((route.query.month as string) || 'all')
const allOrders = ref<SavedOrder[]>([])

// 排序狀態
type SortField = 'orderNumber' | 'bookerName' | 'outboundDate' | 'fullTickets' | 'halfTickets' | 'amount' | 'status'
type SortOrder = 'asc' | 'desc' | null
const sortField = ref<SortField | null>(null)
const sortOrder = ref<SortOrder>(null)

// 可用的月份選項
const availableMonths = computed(() => {
  const monthSet = new Set<string>()
  allOrders.value.forEach(order => {
    const date = new Date(order.outboundDate)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    monthSet.add(monthKey)
  })
  return Array.from(monthSet).sort().reverse()
})

// 篩選後並排序的訂單
const filteredOrders = computed(() => {
  let orders = allOrders.value

  // 月份篩選
  if (selectedMonth.value !== 'all') {
    const [year, month] = selectedMonth.value.split('-')
    orders = orders.filter(order => {
      const orderDate = new Date(order.outboundDate)
      const orderYear = orderDate.getFullYear().toString()
      const orderMonth = (orderDate.getMonth() + 1).toString().padStart(2, '0')
      return orderYear === year && orderMonth === month
    })
  }

  // 排序
  if (sortField.value && sortOrder.value) {
    orders = [...orders].sort((a, b) => {
      let aValue: string | number
      let bValue: string | number

      switch (sortField.value) {
        case 'orderNumber':
          aValue = a.orderNumber
          bValue = b.orderNumber
          break
        case 'bookerName':
          aValue = a.bookerName
          bValue = b.bookerName
          break
        case 'outboundDate':
          aValue = new Date(a.outboundDate).getTime()
          bValue = new Date(b.outboundDate).getTime()
          break
        case 'fullTickets':
          aValue = a.tickets.full
          bValue = b.tickets.full
          break
        case 'halfTickets':
          aValue = a.tickets.half
          bValue = b.tickets.half
          break
        case 'amount':
          aValue = a.pricing.discountedTotal
          bValue = b.pricing.discountedTotal
          break
        case 'status':
          aValue = a.status
          bValue = b.status
          break
        default:
          return 0
      }

      if (aValue < bValue) return sortOrder.value === 'asc' ? -1 : 1
      if (aValue > bValue) return sortOrder.value === 'asc' ? 1 : -1
      return 0
    })
  }

  return orders
})

// 統計資料
const stats = computed(() => {
  const orders = filteredOrders.value
  // 只計算已取票和已登船的訂單金額
  const paidOrders = orders.filter(order => order.status === '已取票' || order.status === '已登船')

  return {
    totalOrders: orders.length,
    totalFullTickets: orders.reduce((sum, order) => sum + order.tickets.full, 0),
    totalHalfTickets: orders.reduce((sum, order) => sum + order.tickets.half, 0),
    totalAmount: paidOrders.reduce((sum, order) => sum + order.pricing.discountedTotal, 0)
  }
})

// 載入訂票單位資料
const loadDistributor = () => {
  distributor.value = distributors.find(d => d.id === distributorId.value) || null
  if (!distributor.value) {
    router.push('/report')
    return
  }

  // 載入該訂票單位的所有訂單
  allOrders.value = mockOrders.filter(order => order.distributorId === distributorId.value)
}

// 處理排序
const handleSort = (field: SortField) => {
  if (sortField.value === field) {
    // 同一個欄位，切換排序方向：asc -> desc -> null
    if (sortOrder.value === 'asc') {
      sortOrder.value = 'desc'
    } else if (sortOrder.value === 'desc') {
      sortOrder.value = null
      sortField.value = null
    }
  } else {
    // 新欄位，從升序開始
    sortField.value = field
    sortOrder.value = 'asc'
  }
}

// 獲取排序圖標組件
const getSortIcon = (field: SortField) => {
  if (sortField.value !== field) return ChevronUpDownIcon
  if (sortOrder.value === 'asc') return ChevronUpIcon
  if (sortOrder.value === 'desc') return ChevronDownIcon
  return ChevronUpDownIcon
}

// 格式化月份顯示
const formatMonth = (monthKey: string) => {
  const [year, month] = monthKey.split('-')
  return `${year}年${parseInt(month || '1')}月`
}

// 查看訂單詳細
const viewOrderDetail = (orderNumber: string) => {
  router.push(`/order-detail/${orderNumber}`)
}

// 返回報表頁面
const goBack = () => {
  router.push('/report')
}

// 下載訂單列表 CSV
const downloadCSV = () => {
  const headers = ['訂單編號', '出發地', '訂票方式', '訂票人', '聯絡電話', '出發日期', '回程日期', '回程時間', '全票', '半票', '金額', '狀態']
  const rows = filteredOrders.value.map(order => [
    order.orderNumber,
    order.departure,
    order.bookingType,
    order.bookerName,
    order.bookerPhone,
    order.outboundDate,
    order.returnDate || '-',
    order.returnTime || '-',
    order.tickets.full,
    order.tickets.half,
    order.pricing.discountedTotal,
    order.status
  ])

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n')

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `${distributor.value?.name}_訂單明細.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// 獲取訂票單位類型的樣式
const getDistributorTypeStyle = (type: DistributorType) => {
  const styles = {
    [DistributorType.BNB]: theme.value === 'dark'
      ? 'bg-primary-900/30 text-primary-400'
      : 'bg-primary-100 text-primary-700',
    [DistributorType.TRAVEL_AGENCY]: theme.value === 'dark'
      ? 'bg-green-900/30 text-green-400'
      : 'bg-green-100 text-green-700',
    [DistributorType.BEE]: theme.value === 'dark'
      ? 'bg-amber-900/30 text-amber-400'
      : 'bg-amber-100 text-amber-700',
    [DistributorType.DIRECT]: theme.value === 'dark'
      ? 'bg-purple-900/30 text-purple-400'
      : 'bg-purple-100 text-purple-700',
    [DistributorType.ONLINE]: theme.value === 'dark'
      ? 'bg-pink-900/30 text-pink-400'
      : 'bg-pink-100 text-pink-700'
  }
  return styles[type] || ''
}

onMounted(() => {
  loadDistributor()
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
        <div v-if="distributor">
          <PageContainer
            :title="distributor.name"
            subtitle="訂票單位詳細資訊及訂單明細"
            :icon="BuildingStorefrontIcon"
            max-width="full"
          >
            <template #actions>
              <BaseButton
                variant="secondary"
                :icon="ArrowLeftIcon"
                @click="goBack"
              >
                返回列表
              </BaseButton>
            </template>

            <!-- 訂票單位資訊卡片 -->
            <BaseCard padding="lg" class="mb-6">
              <div class="flex items-center justify-between mb-6">
                <span
                  :class="[
                    'inline-block px-4 py-2 rounded-full text-sm font-semibold',
                    getDistributorTypeStyle(distributor.type)
                  ]"
                >
                  {{ distributor.type }}
                </span>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="space-y-4">
                  <div class="flex items-center gap-3">
                    <UserIcon
                      class="w-5 h-5"
                      :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-500'"
                    />
                    <span
                      class="font-medium"
                      :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'"
                    >
                      聯絡人：
                    </span>
                    <span
                      :class="theme === 'dark' ? 'text-white' : 'text-neutral-900'"
                    >
                      {{ distributor.contact }}
                    </span>
                  </div>
                  <div class="flex items-center gap-3">
                    <PhoneIcon
                      class="w-5 h-5"
                      :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-500'"
                    />
                    <span
                      class="font-medium"
                      :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'"
                    >
                      聯絡電話：
                    </span>
                    <span
                      :class="theme === 'dark' ? 'text-white' : 'text-neutral-900'"
                    >
                      {{ distributor.phone }}
                    </span>
                  </div>
                </div>
                <div class="space-y-4">
                  <div class="flex items-center gap-3">
                    <HashtagIcon
                      class="w-5 h-5"
                      :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-500'"
                    />
                    <span
                      class="font-medium"
                      :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'"
                    >
                      單位編號：
                    </span>
                    <span
                      :class="theme === 'dark' ? 'text-white' : 'text-neutral-900'"
                    >
                      {{ distributor.id }}
                    </span>
                  </div>
                </div>
              </div>
            </BaseCard>

            <!-- 統計卡片 -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <BaseCard padding="md">
                <div
                  class="text-sm mb-2"
                  :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'"
                >
                  訂單總數
                </div>
                <div class="text-3xl font-bold text-primary-600">
                  {{ stats.totalOrders }}
                </div>
              </BaseCard>
              <BaseCard padding="md">
                <div
                  class="text-sm mb-2"
                  :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'"
                >
                  全票總數
                </div>
                <div class="text-3xl font-bold text-green-600">
                  {{ stats.totalFullTickets }}
                </div>
              </BaseCard>
              <BaseCard padding="md">
                <div
                  class="text-sm mb-2"
                  :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'"
                >
                  半票總數
                </div>
                <div class="text-3xl font-bold text-amber-600">
                  {{ stats.totalHalfTickets }}
                </div>
              </BaseCard>
              <BaseCard padding="md">
                <div
                  class="text-sm mb-2"
                  :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'"
                >
                  總金額
                </div>
                <div class="text-3xl font-bold text-purple-600">
                  NT$ {{ stats.totalAmount.toLocaleString() }}
                </div>
              </BaseCard>
            </div>

            <!-- 訂單列表 -->
            <BaseCard title="訂單明細" padding="none">
              <template #actions>
                <div class="flex items-center gap-3">
                  <select
                    v-model="selectedMonth"
                    :class="[
                      'px-4 py-2 rounded-md text-sm border transition-colors',
                      theme === 'dark'
                        ? 'bg-secondary-900 border-secondary-800 text-white'
                        : 'bg-white border-neutral-300 text-neutral-900',
                      'focus:outline-none focus:ring-2 focus:ring-primary-500'
                    ]"
                  >
                    <option value="all">全部月份</option>
                    <option
                      v-for="month in availableMonths"
                      :key="month"
                      :value="month"
                    >
                      {{ formatMonth(month) }}
                    </option>
                  </select>
                  <BaseButton
                    variant="primary"
                    :icon="ArrowDownTrayIcon"
                    @click="downloadCSV"
                  >
                    下載 CSV
                  </BaseButton>
                </div>
              </template>

              <div class="overflow-x-auto">
                <table class="w-full">
                  <thead
                    :class="theme === 'dark' ? 'bg-secondary-800' : 'bg-neutral-50'"
                  >
                    <tr>
                      <th
                        class="p-4 text-left font-semibold text-sm"
                        :class="theme === 'dark' ? 'text-neutral-300 border-b-2 border-secondary-700' : 'text-neutral-700 border-b-2 border-neutral-200'"
                      >
                        <button
                          @click="handleSort('orderNumber')"
                          class="flex items-center gap-2 hover:text-primary-600 transition-colors"
                          type="button"
                        >
                          <span>訂單編號</span>
                          <component :is="getSortIcon('orderNumber')" class="w-4 h-4" />
                        </button>
                      </th>
                      <th
                        class="p-4 text-left font-semibold text-sm"
                        :class="theme === 'dark' ? 'text-neutral-300 border-b-2 border-secondary-700' : 'text-neutral-700 border-b-2 border-neutral-200'"
                      >
                        <button
                          @click="handleSort('outboundDate')"
                          class="flex items-center gap-2 hover:text-primary-600 transition-colors"
                          type="button"
                        >
                          <span>出發日期</span>
                          <component :is="getSortIcon('outboundDate')" class="w-4 h-4" />
                        </button>
                      </th>
                      <th
                        class="p-4 text-left font-semibold text-sm"
                        :class="theme === 'dark' ? 'text-neutral-300 border-b-2 border-secondary-700' : 'text-neutral-700 border-b-2 border-neutral-200'"
                      >
                        <button
                          @click="handleSort('bookerName')"
                          class="flex items-center gap-2 hover:text-primary-600 transition-colors"
                          type="button"
                        >
                          <span>訂票人</span>
                          <component :is="getSortIcon('bookerName')" class="w-4 h-4" />
                        </button>
                      </th>
                      <th
                        class="p-4 text-left font-semibold text-sm"
                        :class="theme === 'dark' ? 'text-neutral-300 border-b-2 border-secondary-700' : 'text-neutral-700 border-b-2 border-neutral-200'"
                      >
                        聯絡電話
                      </th>
                      <th
                        class="p-4 text-left font-semibold text-sm"
                        :class="theme === 'dark' ? 'text-neutral-300 border-b-2 border-secondary-700' : 'text-neutral-700 border-b-2 border-neutral-200'"
                      >
                        <button
                          @click="handleSort('fullTickets')"
                          class="flex items-center gap-2 hover:text-primary-600 transition-colors"
                          type="button"
                        >
                          <span>全票</span>
                          <component :is="getSortIcon('fullTickets')" class="w-4 h-4" />
                        </button>
                      </th>
                      <th
                        class="p-4 text-left font-semibold text-sm"
                        :class="theme === 'dark' ? 'text-neutral-300 border-b-2 border-secondary-700' : 'text-neutral-700 border-b-2 border-neutral-200'"
                      >
                        <button
                          @click="handleSort('halfTickets')"
                          class="flex items-center gap-2 hover:text-primary-600 transition-colors"
                          type="button"
                        >
                          <span>半票</span>
                          <component :is="getSortIcon('halfTickets')" class="w-4 h-4" />
                        </button>
                      </th>
                      <th
                        class="p-4 text-left font-semibold text-sm"
                        :class="theme === 'dark' ? 'text-neutral-300 border-b-2 border-secondary-700' : 'text-neutral-700 border-b-2 border-neutral-200'"
                      >
                        <button
                          @click="handleSort('amount')"
                          class="flex items-center gap-2 hover:text-primary-600 transition-colors"
                          type="button"
                        >
                          <span>金額</span>
                          <component :is="getSortIcon('amount')" class="w-4 h-4" />
                        </button>
                      </th>
                      <th
                        class="p-4 text-left font-semibold text-sm"
                        :class="theme === 'dark' ? 'text-neutral-300 border-b-2 border-secondary-700' : 'text-neutral-700 border-b-2 border-neutral-200'"
                      >
                        <button
                          @click="handleSort('status')"
                          class="flex items-center gap-2 hover:text-primary-600 transition-colors"
                          type="button"
                        >
                          <span>狀態</span>
                          <component :is="getSortIcon('status')" class="w-4 h-4" />
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="order in filteredOrders"
                      :key="order.orderNumber"
                      @click="viewOrderDetail(order.orderNumber)"
                      :class="[
                        'cursor-pointer transition-colors border-b',
                        theme === 'dark'
                          ? 'hover:bg-secondary-800 border-secondary-800'
                          : 'hover:bg-primary-50 border-neutral-100'
                      ]"
                    >
                      <td
                        class="p-4 font-semibold"
                        :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-900'"
                      >
                        {{ order.orderNumber }}
                      </td>
                      <td
                        class="p-4"
                        :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-900'"
                      >
                        {{ order.outboundDate }}
                      </td>
                      <td
                        class="p-4"
                        :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-900'"
                      >
                        {{ order.bookerName }}
                      </td>
                      <td
                        class="p-4"
                        :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-900'"
                      >
                        {{ order.bookerPhone }}
                      </td>
                      <td
                        class="p-4"
                        :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-900'"
                      >
                        {{ order.tickets.full }} 張
                      </td>
                      <td
                        class="p-4"
                        :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-900'"
                      >
                        {{ order.tickets.half }} 張
                      </td>
                      <td
                        class="p-4 font-semibold"
                        :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-900'"
                      >
                        NT$ {{ order.pricing.discountedTotal.toLocaleString() }}
                      </td>
                      <td class="p-4">
                        <span
                          class="inline-block px-3 py-1 rounded-full text-xs font-semibold"
                          :class="{
                            'bg-blue-100 text-blue-800': order.status === '未取票',
                            'bg-amber-100 text-amber-800': order.status === '已取票',
                            'bg-green-100 text-green-800': order.status === '已登船',
                            'bg-red-100 text-red-800': order.status === '已取消'
                          }"
                        >
                          {{ order.status }}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- 空狀態 -->
              <div
                v-if="filteredOrders.length === 0"
                class="text-center py-12"
                :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-500'"
              >
                <ClipboardDocumentListIcon
                  class="w-24 h-24 mx-auto mb-4 opacity-30"
                  :class="theme === 'dark' ? 'text-neutral-600' : 'text-neutral-300'"
                />
                <div class="text-lg mb-2">尚無訂單資料</div>
                <div class="text-sm">此訂票單位在選擇的時間範圍內沒有訂單</div>
              </div>
            </BaseCard>
          </PageContainer>
        </div>

        <!-- 找不到訂票單位 -->
        <PageContainer
          v-else
          title="找不到訂票單位"
          subtitle="請確認訂票單位編號是否正確"
          :icon="ExclamationCircleIcon"
          max-width="lg"
        >
          <BaseCard padding="lg" class="text-center">
            <ExclamationCircleIcon
              class="w-24 h-24 mx-auto mb-6 opacity-30 text-red-500"
            />
            <h2 class="text-2xl font-semibold mb-3">找不到訂票單位</h2>
            <p
              class="mb-6"
              :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'"
            >
              請確認訂票單位編號是否正確
            </p>
            <BaseButton
              variant="primary"
              :icon="ArrowLeftIcon"
              @click="goBack"
            >
              返回報表頁面
            </BaseButton>
          </BaseCard>
        </PageContainer>
      </main>
    </div>
  </div>
</template>
