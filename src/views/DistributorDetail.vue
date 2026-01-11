<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import Navbar from '../components/Navbar.vue'
import Sidebar from '../components/Sidebar.vue'
import { useSidebar } from '../composables/useSidebar'
import { distributors, mockOrders, DistributorType, type SavedOrder, type Distributor } from '../constants/mockOrders'

const { isCollapsed } = useSidebar()
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
      let aValue: any
      let bValue: any

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

// 獲取排序圖標
const getSortIcon = (field: SortField) => {
  if (sortField.value !== field) return '⇅'
  if (sortOrder.value === 'asc') return '▲'
  if (sortOrder.value === 'desc') return '▼'
  return '⇅'
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

  // cSpell:ignore ufeff
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

onMounted(() => {
  loadDistributor()
})
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <Navbar />
    <Sidebar active-route="report" />

    <!-- 主要內容區 -->
    <main :class="['p-8 min-h-[calc(100vh-4rem)] transition-all duration-300', isCollapsed ? 'ml-20' : 'ml-64']">
      <div v-if="distributor">
        <!-- 麵包屑 -->
        <div class="flex items-center gap-2 text-gray-600 text-sm mb-6">
          <a
            href="#"
            class="text-blue-600 hover:underline"
          >首頁</a>
          <span>→</span>
          <button
            @click="goBack"
            class="text-blue-600 hover:underline"
          >報表總覽</button>
          <span>→</span>
          <span>{{ distributor.name }}</span>
        </div>

        <!-- 訂票單位資訊卡片 -->
        <div class="bg-white rounded-xl p-8 shadow-md mb-6">
          <div class="flex items-center justify-between mb-6">
            <div>
              <h1 class="text-3xl font-bold text-gray-800 mb-3">{{ distributor.name }}</h1>
              <div class="flex items-center gap-4">
                <span
                  class="inline-block px-4 py-2 rounded-full text-sm font-semibold"
                  :class="{
                    'bg-blue-100 text-blue-800': distributor.type === DistributorType.BNB,
                    'bg-green-100 text-green-800': distributor.type === DistributorType.TRAVEL_AGENCY,
                    'bg-orange-100 text-orange-800': distributor.type === DistributorType.BEE,
                    'bg-purple-100 text-purple-800': distributor.type === DistributorType.DIRECT,
                    'bg-pink-100 text-pink-800': distributor.type === DistributorType.ONLINE
                  }"
                >
                  {{ distributor.type }}
                </span>
              </div>
            </div>
            <button
              @click="goBack"
              class="py-2 px-6 bg-gray-500 text-white rounded-lg text-sm font-semibold cursor-pointer transition-all hover:bg-gray-600"
            >
              返回
            </button>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="space-y-3">
              <div class="flex items-center gap-3">
                <span class="text-gray-600 font-medium">聯絡人：</span>
                <span class="text-gray-800">{{ distributor.contact }}</span>
              </div>
              <div class="flex items-center gap-3">
                <span class="text-gray-600 font-medium">聯絡電話：</span>
                <span class="text-gray-800">{{ distributor.phone }}</span>
              </div>
            </div>
            <div class="space-y-3">
              <div class="flex items-center gap-3">
                <span class="text-gray-600 font-medium">單位編號：</span>
                <span class="text-gray-800">{{ distributor.id }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 統計卡片 -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div class="bg-white rounded-xl p-6 shadow-md">
            <div class="text-gray-600 text-sm mb-2">訂單總數</div>
            <div class="text-3xl font-bold text-blue-600">{{ stats.totalOrders }}</div>
          </div>
          <div class="bg-white rounded-xl p-6 shadow-md">
            <div class="text-gray-600 text-sm mb-2">全票總數</div>
            <div class="text-3xl font-bold text-green-600">{{ stats.totalFullTickets }}</div>
          </div>
          <div class="bg-white rounded-xl p-6 shadow-md">
            <div class="text-gray-600 text-sm mb-2">半票總數</div>
            <div class="text-3xl font-bold text-orange-600">{{ stats.totalHalfTickets }}</div>
          </div>
          <div class="bg-white rounded-xl p-6 shadow-md">
            <div class="text-gray-600 text-sm mb-2">總金額</div>
            <div class="text-3xl font-bold text-purple-600">NT$ {{ stats.totalAmount.toLocaleString() }}</div>
          </div>
        </div>

        <!-- 訂單列表 -->
        <div class="bg-white rounded-xl p-8 shadow-md">
          <div class="flex items-center justify-between mb-6 pb-4 border-b-2 border-gray-200">
            <h2 class="text-xl font-semibold text-gray-800">訂單明細</h2>
            <div class="flex items-center gap-4">
              <select
                v-model="selectedMonth"
                class="p-2 border-2 border-gray-300 rounded-lg text-sm transition-all outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
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
              <button
                @click="downloadCSV"
                class="py-2 px-6 bg-green-600 text-white rounded-lg text-sm font-semibold cursor-pointer transition-all hover:bg-green-700"
              >
                下載 CSV
              </button>
            </div>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full">
              <thead class="bg-gray-50">
                <tr>
                  <th class="p-4 text-left font-semibold text-gray-700 text-sm border-b-2 border-gray-200">
                    <button
                      @click="handleSort('orderNumber')"
                      class="flex items-center gap-2 hover:text-blue-600 transition-colors"
                      type="button"
                    >
                      <span>訂單編號</span>
                      <span class="text-xs">{{ getSortIcon('orderNumber') }}</span>
                    </button>
                  </th>
                  <th class="p-4 text-left font-semibold text-gray-700 text-sm border-b-2 border-gray-200">
                    <button
                      @click="handleSort('outboundDate')"
                      class="flex items-center gap-2 hover:text-blue-600 transition-colors"
                      type="button"
                    >
                      <span>出發日期</span>
                      <span class="text-xs">{{ getSortIcon('outboundDate') }}</span>
                    </button>
                  </th>
                  <th class="p-4 text-left font-semibold text-gray-700 text-sm border-b-2 border-gray-200">
                    <button
                      @click="handleSort('bookerName')"
                      class="flex items-center gap-2 hover:text-blue-600 transition-colors"
                      type="button"
                    >
                      <span>訂票人</span>
                      <span class="text-xs">{{ getSortIcon('bookerName') }}</span>
                    </button>
                  </th>
                  <th class="p-4 text-left font-semibold text-gray-700 text-sm border-b-2 border-gray-200">聯絡電話</th>
                  <th class="p-4 text-left font-semibold text-gray-700 text-sm border-b-2 border-gray-200">
                    <button
                      @click="handleSort('fullTickets')"
                      class="flex items-center gap-2 hover:text-blue-600 transition-colors"
                      type="button"
                    >
                      <span>全票</span>
                      <span class="text-xs">{{ getSortIcon('fullTickets') }}</span>
                    </button>
                  </th>
                  <th class="p-4 text-left font-semibold text-gray-700 text-sm border-b-2 border-gray-200">
                    <button
                      @click="handleSort('halfTickets')"
                      class="flex items-center gap-2 hover:text-blue-600 transition-colors"
                      type="button"
                    >
                      <span>半票</span>
                      <span class="text-xs">{{ getSortIcon('halfTickets') }}</span>
                    </button>
                  </th>
                  <th class="p-4 text-left font-semibold text-gray-700 text-sm border-b-2 border-gray-200">
                    <button
                      @click="handleSort('amount')"
                      class="flex items-center gap-2 hover:text-blue-600 transition-colors"
                      type="button"
                    >
                      <span>金額</span>
                      <span class="text-xs">{{ getSortIcon('amount') }}</span>
                    </button>
                  </th>
                  <th class="p-4 text-left font-semibold text-gray-700 text-sm border-b-2 border-gray-200">
                    <button
                      @click="handleSort('status')"
                      class="flex items-center gap-2 hover:text-blue-600 transition-colors"
                      type="button"
                    >
                      <span>狀態</span>
                      <span class="text-xs">{{ getSortIcon('status') }}</span>
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="order in filteredOrders"
                  :key="order.orderNumber"
                  @click="viewOrderDetail(order.orderNumber)"
                  class="hover:bg-blue-50 cursor-pointer transition-colors"
                >
                  <td class="p-4 text-gray-800 border-b border-gray-100 font-semibold">{{ order.orderNumber }}</td>
                  <td class="p-4 text-gray-800 border-b border-gray-100">{{ order.outboundDate }}</td>
                  <td class="p-4 text-gray-800 border-b border-gray-100">{{ order.bookerName }}</td>
                  <td class="p-4 text-gray-800 border-b border-gray-100">{{ order.bookerPhone }}</td>
                  <td class="p-4 text-gray-800 border-b border-gray-100">{{ order.tickets.full }} 張</td>
                  <td class="p-4 text-gray-800 border-b border-gray-100">{{ order.tickets.half }} 張</td>
                  <td class="p-4 text-gray-800 border-b border-gray-100 font-semibold">NT$ {{
                    order.pricing.discountedTotal.toLocaleString() }}</td>
                  <td class="p-4 border-b border-gray-100">
                    <span
                      class="inline-block px-3 py-1 rounded-full text-xs font-semibold"
                      :class="{
                        'bg-blue-100 text-blue-800': order.status === '未取票',
                        'bg-orange-100 text-orange-800': order.status === '已取票',
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

          <div
            v-if="filteredOrders.length === 0"
            class="text-center py-12 text-gray-500"
          >
            <div class="text-6xl mb-4">📋</div>
            <div class="text-lg mb-2">尚無訂單資料</div>
            <div class="text-sm">此訂票單位在選擇的時間範圍內沒有訂單</div>
          </div>
        </div>
      </div>

      <!-- 找不到訂票單位 -->
      <div
        v-else
        class="bg-white rounded-xl p-12 shadow-md text-center"
      >
        <div class="text-6xl mb-4">❌</div>
        <div class="text-2xl font-bold text-gray-800 mb-2">找不到訂票單位</div>
        <div class="text-gray-600 mb-6">請確認訂票單位編號是否正確</div>
        <button
          @click="goBack"
          class="py-3 px-8 bg-blue-600 text-white rounded-lg text-base font-semibold cursor-pointer transition-all shadow-lg hover:bg-blue-700"
        >
          返回報表頁面
        </button>
      </div>
    </main>
  </div>
</template>
