<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import Navbar from '../components/Navbar.vue'
import Sidebar from '../components/Sidebar.vue'
import { useSidebar } from '../composables/useSidebar'
import { useOrders } from '../composables/useOrders'

const { isCollapsed } = useSidebar()
const router = useRouter()
const { allOrders: storedOrders } = useOrders()

interface Order {
  shipTime: string
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

interface SavedOrder {
  orderNumber: string
  departure: string
  bookingType: string
  distributor: string
  bookerName: string
  bookerPhone: string
  outboundDate: string
  outboundTime: string
  returnDate: string
  returnTime: string
  tickets: {
    full: number
    half: number
  }
  pricing: {
    originalTotal: number
    discountedTotal: number
  }
  status: string
  createdAt: string
}

// 從 useOrders 讀取訂單並轉換格式
const loadOrdersFromLocalStorage = (): Order[] => {
  if (!storedOrders.value || storedOrders.value.length === 0) return []

  try {
    return storedOrders.value.map((order) => {
      // 格式化票種資訊
      const ticketParts: string[] = []
      if (order.tickets.full > 0) ticketParts.push(`全票x${order.tickets.full}`)
      if (order.tickets.half > 0) ticketParts.push(`半票x${order.tickets.half}`)
      const ticketsStr = ticketParts.join(', ')

      return {
        shipTime: `${order.outboundDate} ${order.outboundTime}`,
        orderNo: order.orderNumber,
        distributor: order.distributor,
        bookerInfo: `${order.bookerName} / ${order.bookerPhone}`,
        bookTime: order.createdAt.split('T')[0] as string,
        orderStatus: order.status,
        tickets: ticketsStr
      }
    })
  } catch (error) {
    console.error('讀取訂單失敗:', error)
    return []
  }
}

const performSearch = (showAlert = true) => {
  // 從 localStorage 載入所有訂單
  const allStoredOrders = loadOrdersFromLocalStorage()

  if (allStoredOrders.length === 0) {
    if (showAlert) {
      alert('目前沒有訂單資料')
    }
    filteredOrders.value = []
    allOrders.value = []
    return
  }

  // 根據日期範圍篩選
  const filtered = allStoredOrders.filter(order => {
    const shipDate = order.shipTime.split(' ')[0]
    if (!shipDate) return false
    return shipDate >= dateFrom.value && shipDate <= dateTo.value
  })

  // 根據搜尋關鍵字和欄位篩選
  if (searchKeyword.value.trim()) {
    const keyword = searchKeyword.value.toLowerCase()
    allOrders.value = filtered.filter(order => {
      switch (searchField.value) {
        case 'id':
          return order.bookerInfo.toLowerCase().includes(keyword)
        case 'name':
          return order.bookerInfo.toLowerCase().includes(keyword)
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
        'cancelled': '已取消'
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
    filteredOrders.value = allOrders.value.filter(order =>
      Object.values(order).some(value =>
        String(value).toLowerCase().includes(searchText)
      )
    )
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
  if (status === '未取票') return 'bg-blue-100 text-blue-800'
  if (status === '已取票') return 'bg-orange-100 text-orange-800'
  if (status === '已登船') return 'bg-green-100 text-green-800'
  if (status === '已取消') return 'bg-red-100 text-red-800'
  return ''
}

const viewOrderDetail = (orderNo: string) => {
  router.push(`/order-detail/${orderNo}`)
}

// 從 localStorage 讀取預設搜尋條件
const loadDefaultSearchSettings = () => {
  const settings = localStorage.getItem('defaultSearchSettings')
  if (settings) {
    try {
      const parsed = JSON.parse(settings)

      // 設定預設日期範圍
      if (parsed.dateRange === 'today') {
        setToday()
      } else if (parsed.dateRange === 'thisMonth') {
        setThisMonth()
      } else {
        setToday() // 預設為今日
      }

      // 設定預設搜尋欄位
      searchField.value = parsed.searchField || 'id'

      // 設定預設票卷狀態篩選
      currentStatusFilter.value = parsed.statusFilter || 'none'

      // 設定預設每頁顯示筆數
      entriesPerPage.value = parsed.entriesPerPage || 30
    } catch (error) {
      console.error('讀取預設搜尋條件失敗:', error)
      setToday() // 發生錯誤時使用預設值
    }
  } else {
    setToday() // 沒有儲存的設定時使用預設值
  }
}

onMounted(() => {
  loadDefaultSearchSettings()
  // 頁面載入時自動執行搜尋
  performSearch(false)
})
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <Navbar />
    <Sidebar active-route="order-search" />

    <!-- 主要內容區 -->
    <main :class="['p-8 min-h-[calc(100vh-4rem)] transition-all duration-300', isCollapsed ? 'ml-20' : 'ml-64']">
        <!-- 麵包屑 -->
        <div class="flex items-center gap-2 text-gray-600 text-sm mb-6">
          <a href="#" class="text-blue-600 hover:underline">首頁</a>
          <span>→</span>
          <a href="#" class="text-blue-600 hover:underline">訂位作業</a>
          <span>→</span>
          <span>訂單查詢</span>
        </div>

        <!-- 頁面標題 -->
        <div class="mb-8">
          <h1 class="text-3xl font-bold text-gray-800">訂單查詢</h1>
        </div>

        <!-- 查詢卡片 -->
        <div class="bg-white rounded-xl p-8 shadow-md mb-6">
          <div class="flex items-center justify-between mb-6 flex-wrap gap-4">
            <h2 class="text-xl font-semibold text-gray-800">訂單列表</h2>
            <div class="flex gap-3">
              <button
                @click="setToday"
                type="button"
                class="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold cursor-pointer transition-all hover:bg-blue-700"
              >
                <span>📅</span>
                <span>今日</span>
              </button>
              <button
                @click="setThisMonth"
                type="button"
                class="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold cursor-pointer transition-all hover:bg-blue-700"
              >
                <span>📆</span>
                <span>本月</span>
              </button>
            </div>
          </div>

          <!-- 日期範圍 -->
          <div class="space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="space-y-2">
                <label for="dateFrom" class="block text-gray-700 text-sm font-medium">查詢船班時間包含從</label>
                <input
                  type="date"
                  id="dateFrom"
                  v-model="dateFrom"
                  class="w-full p-3 border-2 border-gray-300 rounded-lg text-base transition-all outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                >
              </div>
              <div class="space-y-2">
                <label for="dateTo" class="block text-gray-700 text-sm font-medium">到</label>
                <input
                  type="date"
                  id="dateTo"
                  v-model="dateTo"
                  class="w-full p-3 border-2 border-gray-300 rounded-lg text-base transition-all outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                >
              </div>
            </div>

            <!-- 搜尋欄位選擇 -->
            <div class="space-y-2">
              <label class="block text-gray-700 text-sm font-medium">搜尋欄位</label>
              <div class="flex flex-wrap gap-3">
                <button
                  @click="searchField = 'id'"
                  type="button"
                  :class="[
                    'px-4 py-2 border-2 rounded-lg text-sm font-medium cursor-pointer transition-all',
                    searchField === 'id'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                      : 'bg-white text-blue-600 border-blue-600 hover:bg-blue-50'
                  ]"
                >
                  訂票人身分證字號
                </button>
                <button
                  @click="searchField = 'name'"
                  type="button"
                  :class="[
                    'px-4 py-2 border-2 rounded-lg text-sm font-medium cursor-pointer transition-all',
                    searchField === 'name'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                      : 'bg-white text-blue-600 border-blue-600 hover:bg-blue-50'
                  ]"
                >
                  訂票人姓名
                </button>
                <button
                  @click="searchField = 'phone'"
                  type="button"
                  :class="[
                    'px-4 py-2 border-2 rounded-lg text-sm font-medium cursor-pointer transition-all',
                    searchField === 'phone'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                      : 'bg-white text-blue-600 border-blue-600 hover:bg-blue-50'
                  ]"
                >
                  訂票人電話
                </button>
                <button
                  @click="searchField = 'orderNo'"
                  type="button"
                  :class="[
                    'px-4 py-2 border-2 rounded-lg text-sm font-medium cursor-pointer transition-all',
                    searchField === 'orderNo'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                      : 'bg-white text-blue-600 border-blue-600 hover:bg-blue-50'
                  ]"
                >
                  訂單編號
                </button>
                <button
                  @click="searchField = 'distributor'"
                  type="button"
                  :class="[
                    'px-4 py-2 border-2 rounded-lg text-sm font-medium cursor-pointer transition-all',
                    searchField === 'distributor'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                      : 'bg-white text-blue-600 border-blue-600 hover:bg-blue-50'
                  ]"
                >
                  經銷商名稱
                </button>
              </div>
            </div>

            <div class="space-y-2">
              <label for="searchKeyword" class="block text-gray-700 text-sm font-medium">搜尋關鍵字</label>
              <div class="flex gap-3">
                <input
                  type="text"
                  id="searchKeyword"
                  v-model="searchKeyword"
                  @keyup.enter="() => performSearch(true)"
                  placeholder="請輸入搜尋關鍵字"
                  class="flex-1 p-3 border-2 border-gray-300 rounded-lg text-base transition-all outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                >
                <button
                  @click="() => performSearch(true)"
                  type="button"
                  class="inline-flex items-center gap-2 px-8 py-3 bg-green-600 text-white border-2 border-green-600 rounded-lg text-base font-semibold cursor-pointer transition-all hover:bg-green-700 hover:border-green-700 whitespace-nowrap"
                >
                  <span>🔍</span>
                  <span>搜尋</span>
                </button>
              </div>
            </div>
          </div>

          <!-- 票卷狀態篩選 -->
          <div class="flex items-center gap-3 mt-6 p-5 bg-gray-50 rounded-lg flex-wrap">
            <span class="font-semibold text-gray-700 mr-2">票卷狀態篩選</span>
            <button
              @click="filterStatus('none')"
              type="button"
              :class="['px-5 py-2 border-2 rounded-full text-sm font-medium cursor-pointer transition-all',
                currentStatusFilter === 'none'
                  ? 'bg-gray-600 text-white border-gray-600 shadow-md'
                  : 'bg-white text-gray-600 border-gray-600 hover:shadow-md'
              ]"
            >
              全部
            </button>
            <button
              @click="filterStatus('unpicked')"
              type="button"
              :class="['px-5 py-2 border-2 rounded-full text-sm font-medium cursor-pointer transition-all',
                currentStatusFilter === 'unpicked'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                  : 'bg-white text-blue-600 border-blue-600 hover:shadow-md'
              ]"
            >
              未取票
            </button>
            <button
              @click="filterStatus('picked')"
              type="button"
              :class="['px-5 py-2 border-2 rounded-full text-sm font-medium cursor-pointer transition-all',
                currentStatusFilter === 'picked'
                  ? 'bg-orange-600 text-white border-orange-600 shadow-md'
                  : 'bg-white text-orange-600 border-orange-600 hover:shadow-md'
              ]"
            >
              已取票
            </button>
            <button
              @click="filterStatus('boarded')"
              type="button"
              :class="['px-5 py-2 border-2 rounded-full text-sm font-medium cursor-pointer transition-all',
                currentStatusFilter === 'boarded'
                  ? 'bg-green-600 text-white border-green-600 shadow-md'
                  : 'bg-white text-green-600 border-green-600 hover:shadow-md'
              ]"
            >
              已登船
            </button>
            <button
              @click="filterStatus('cancelled')"
              type="button"
              :class="['px-5 py-2 border-2 rounded-full text-sm font-medium cursor-pointer transition-all',
                currentStatusFilter === 'cancelled'
                  ? 'bg-red-600 text-white border-red-600 shadow-md'
                  : 'bg-white text-red-600 border-red-600 hover:shadow-md'
              ]"
            >
              已取消
            </button>
          </div>

          <!-- 表格控制 -->
          <div class="flex items-center justify-between mt-6 flex-wrap gap-4">
            <div class="flex items-center gap-2 text-sm text-gray-600">
              <span>一次顯示</span>
              <select v-model.number="entriesPerPage" class="p-2 px-3 border-2 border-gray-300 rounded-lg">
                <option :value="30">30</option>
                <option :value="50">50</option>
                <option :value="100">100</option>
              </select>
              <span>筆紀錄</span>
            </div>
            <div class="flex items-center gap-2 text-sm text-gray-600">
              <label for="tableSearch">搜尋表格:</label>
              <input
                type="text"
                id="tableSearch"
                v-model="tableSearchText"
                @input="searchTable"
                placeholder="快速搜尋..."
                class="p-2 px-3 border-2 border-gray-300 rounded-lg w-48"
              >
            </div>
          </div>

          <!-- 資料表格 -->
          <div class="overflow-x-auto rounded-lg border-2 border-gray-200 mt-6">
            <table class="w-full border-collapse bg-white">
              <thead class="bg-gray-50">
                <tr>
                  <th class="p-4 text-left font-semibold text-gray-700 text-sm border-b-2 border-gray-200 whitespace-nowrap">船班時間</th>
                  <th class="p-4 text-left font-semibold text-gray-700 text-sm border-b-2 border-gray-200 whitespace-nowrap">訂單編號</th>
                  <th class="p-4 text-left font-semibold text-gray-700 text-sm border-b-2 border-gray-200 whitespace-nowrap">訂票單位</th>
                  <th class="p-4 text-left font-semibold text-gray-700 text-sm border-b-2 border-gray-200 whitespace-nowrap">訂票人資料</th>
                  <th class="p-4 text-left font-semibold text-gray-700 text-sm border-b-2 border-gray-200 whitespace-nowrap">訂票時間</th>
                  <th class="p-4 text-left font-semibold text-gray-700 text-sm border-b-2 border-gray-200 whitespace-nowrap">票卷狀態</th>
                  <th class="p-4 text-left font-semibold text-gray-700 text-sm border-b-2 border-gray-200 whitespace-nowrap">船票列表</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="paginatedOrders.length === 0">
                  <td colspan="7" class="py-16 text-center text-gray-500">
                    <div class="text-6xl opacity-30 mb-4">📋</div>
                    <div class="text-lg mb-2 font-medium">沒有資料</div>
                    <div class="text-sm">請調整搜尋條件或日期範圍</div>
                  </td>
                </tr>
                <tr v-for="order in paginatedOrders" :key="order.orderNo" class="hover:bg-gray-50">
                  <td class="p-4 text-gray-700 text-sm border-b border-gray-100">{{ order.shipTime }}</td>
                  <td class="p-4 text-sm border-b border-gray-100">
                    <button
                      @click="viewOrderDetail(order.orderNo)"
                      type="button"
                      class="text-blue-600 hover:text-blue-800 hover:underline font-semibold transition-all cursor-pointer"
                    >
                      {{ order.orderNo }}
                    </button>
                  </td>
                  <td class="p-4 text-gray-700 text-sm border-b border-gray-100">{{ order.distributor }}</td>
                  <td class="p-4 text-gray-700 text-sm border-b border-gray-100">{{ order.bookerInfo }}</td>
                  <td class="p-4 text-gray-700 text-sm border-b border-gray-100">{{ order.bookTime }}</td>
                  <td class="p-4 text-sm border-b border-gray-100">
                    <span :class="['inline-block px-3 py-1 rounded-full text-xs font-semibold', getStatusClass(order.orderStatus)]">
                      {{ order.orderStatus }}
                    </span>
                  </td>
                  <td class="p-4 text-gray-700 text-sm border-b border-gray-100">{{ order.tickets }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- 分頁 -->
          <div class="flex items-center justify-between mt-6 flex-wrap gap-4">
            <div class="text-gray-600 text-sm">
              第 <span class="font-semibold">{{ paginationInfo.start }}</span> 至 <span class="font-semibold">{{ paginationInfo.end }}</span> 筆紀錄（共 <span class="font-semibold">{{ paginationInfo.total }}</span> 筆）
            </div>
            <div class="flex gap-2">
              <button
                @click="goToPage('first')"
                :disabled="currentPage === 1"
                type="button"
                class="px-4 py-2 border-2 border-gray-300 bg-white text-gray-700 rounded-lg text-sm font-medium cursor-pointer transition-all hover:bg-gray-50 hover:border-blue-500 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-gray-300 disabled:hover:text-gray-700"
              >
                第一頁
              </button>
              <button
                @click="goToPage('prev')"
                :disabled="currentPage === 1"
                type="button"
                class="px-4 py-2 border-2 border-gray-300 bg-white text-gray-700 rounded-lg text-sm font-medium cursor-pointer transition-all hover:bg-gray-50 hover:border-blue-500 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-gray-300 disabled:hover:text-gray-700"
              >
                上一頁
              </button>
              <button
                @click="goToPage('next')"
                :disabled="currentPage === totalPages || totalPages === 0"
                type="button"
                class="px-4 py-2 border-2 border-gray-300 bg-white text-gray-700 rounded-lg text-sm font-medium cursor-pointer transition-all hover:bg-gray-50 hover:border-blue-500 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-gray-300 disabled:hover:text-gray-700"
              >
                下一頁
              </button>
              <button
                @click="goToPage('last')"
                :disabled="currentPage === totalPages || totalPages === 0"
                type="button"
                class="px-4 py-2 border-2 border-gray-300 bg-white text-gray-700 rounded-lg text-sm font-medium cursor-pointer transition-all hover:bg-gray-50 hover:border-blue-500 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-gray-300 disabled:hover:text-gray-700"
              >
                最後一頁
              </button>
            </div>
          </div>
        </div>
      </main>
  </div>
</template>
