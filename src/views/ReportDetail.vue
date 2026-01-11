<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Navbar from '../components/Navbar.vue'
import Sidebar from '../components/Sidebar.vue'
import { useSidebar } from '../composables/useSidebar'
import { useOrders } from '../composables/useOrders'

const { isCollapsed } = useSidebar()
const route = useRoute()
const router = useRouter()
const { allOrders: storedOrders } = useOrders()

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

const monthKey = ref('')
const orders = ref<SavedOrder[]>([])
const totalAmount = computed(() => orders.value.reduce((sum, order) => sum + order.pricing.discountedTotal, 0))
const totalOrders = computed(() => orders.value.length)

// 載入該月份的訂單資料
const loadMonthOrders = () => {
  const year = route.params.year as string
  const month = route.params.month as string
  monthKey.value = `${year}年${month}月`

  try {
    // 篩選出該月份的訂單
    orders.value = storedOrders.value.filter(order => {
      const orderDate = new Date(order.outboundDate)
      const orderYear = orderDate.getFullYear()
      const orderMonth = orderDate.getMonth() + 1
      return orderYear === parseInt(year) && orderMonth === parseInt(month)
    })
  } catch (error) {
    console.error('載入訂單資料失敗:', error)
  }
}

// 返回列表頁
const goBack = () => {
  router.push('/report')
}

// 下載明細（CSV 格式）
const downloadDetails = () => {
  const headers = ['訂單編號', '出發地', '訂票方式', '經銷商', '訂票人', '聯絡電話', '出發日期', '出發時間', '回程日期', '回程時間', '全票', '半票', '金額']
  const rows = orders.value.map(order => [
    order.orderNumber,
    order.departure,
    order.bookingType,
    order.distributor || '-',
    order.bookerName,
    order.bookerPhone,
    order.outboundDate,
    order.outboundTime,
    order.returnDate || '-',
    order.returnTime || '-',
    order.tickets.full,
    order.tickets.half,
    order.pricing.discountedTotal
  ])

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n')

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `帳單明細_${monthKey.value}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

onMounted(() => {
  loadMonthOrders()
})
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <Navbar />
    <Sidebar active-route="report" />

    <!-- 主要內容區 -->
    <main :class="['p-8 min-h-[calc(100vh-4rem)] transition-all duration-300', isCollapsed ? 'ml-20' : 'ml-64']">
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
        <span>{{ monthKey }} 明細</span>
      </div>

      <!-- 頁面標題 -->
      <div class="mb-8 flex justify-between items-start">
        <div>
          <h1 class="text-3xl font-bold text-gray-800 mb-2">{{ monthKey }} 帳單明細</h1>
          <p class="text-gray-600">共 {{ totalOrders }} 筆訂單，總金額 NT$ {{ totalAmount.toLocaleString() }}</p>
        </div>
        <div class="flex gap-3">
          <button
            @click="downloadDetails"
            class="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors shadow-lg"
          >
            下載 CSV
          </button>
          <button
            @click="goBack"
            class="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
          >
            返回列表
          </button>
        </div>
      </div>

      <!-- 明細列表 -->
      <div class="bg-white rounded-xl p-8 shadow-md">
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-gray-50">
              <tr>
                <th class="p-4 text-left font-semibold text-gray-700 text-sm border-b-2 border-gray-200">訂單編號</th>
                <th class="p-4 text-left font-semibold text-gray-700 text-sm border-b-2 border-gray-200">訂票人</th>
                <th class="p-4 text-left font-semibold text-gray-700 text-sm border-b-2 border-gray-200">聯絡電話</th>
                <th class="p-4 text-left font-semibold text-gray-700 text-sm border-b-2 border-gray-200">出發地</th>
                <th class="p-4 text-left font-semibold text-gray-700 text-sm border-b-2 border-gray-200">訂票方式</th>
                <th class="p-4 text-left font-semibold text-gray-700 text-sm border-b-2 border-gray-200">經銷商</th>
                <th class="p-4 text-left font-semibold text-gray-700 text-sm border-b-2 border-gray-200">出發日期</th>
                <th class="p-4 text-left font-semibold text-gray-700 text-sm border-b-2 border-gray-200">出發時間</th>
                <th class="p-4 text-left font-semibold text-gray-700 text-sm border-b-2 border-gray-200">回程日期</th>
                <th class="p-4 text-left font-semibold text-gray-700 text-sm border-b-2 border-gray-200">回程時間</th>
                <th class="p-4 text-center font-semibold text-gray-700 text-sm border-b-2 border-gray-200">全票</th>
                <th class="p-4 text-center font-semibold text-gray-700 text-sm border-b-2 border-gray-200">半票</th>
                <th class="p-4 text-right font-semibold text-gray-700 text-sm border-b-2 border-gray-200">金額</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="order in orders"
                :key="order.orderNumber"
                class="hover:bg-gray-50 border-b border-gray-100"
              >
                <td class="p-4 text-gray-800 font-mono text-xs">{{ order.orderNumber }}</td>
                <td class="p-4 text-gray-800">{{ order.bookerName }}</td>
                <td class="p-4 text-gray-800">{{ order.bookerPhone }}</td>
                <td class="p-4 text-gray-800">{{ order.departure }}</td>
                <td class="p-4 text-gray-800">{{ order.bookingType }}</td>
                <td class="p-4 text-gray-800">{{ order.distributor || '-' }}</td>
                <td class="p-4 text-gray-800">{{ order.outboundDate }}</td>
                <td class="p-4 text-gray-800">{{ order.outboundTime }}</td>
                <td class="p-4 text-gray-800">{{ order.returnDate || '-' }}</td>
                <td class="p-4 text-gray-800">{{ order.returnTime || '-' }}</td>
                <td class="p-4 text-center text-gray-800">{{ order.tickets.full }}</td>
                <td class="p-4 text-center text-gray-800">{{ order.tickets.half }}</td>
                <td class="p-4 text-right text-gray-800 font-semibold">NT$ {{
                  order.pricing.discountedTotal.toLocaleString() }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div
          v-if="orders.length === 0"
          class="text-center py-12 text-gray-500"
        >
          <div class="text-6xl mb-4">📋</div>
          <div class="text-lg mb-2">此月份無訂單資料</div>
        </div>
      </div>
    </main>
  </div>
</template>
