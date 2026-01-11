<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import Navbar from '../components/Navbar.vue'
import Sidebar from '../components/Sidebar.vue'
import { useSidebar } from '../composables/useSidebar'
import { distributors, DistributorType, mockOrders, type SavedOrder, type Distributor } from '../constants/mockOrders'

const { isCollapsed } = useSidebar()
const router = useRouter()

interface DistributorStats {
  distributor: Distributor
  totalOrders: number
  totalAmount: number
  totalFullTickets: number
  totalHalfTickets: number
}

interface TypeStats {
  type: DistributorType
  totalOrders: number
  totalAmount: number
  totalFullTickets: number
  totalHalfTickets: number
}

const selectedMonth = ref('2026-01')
const selectedDistributorId = ref<string>('all')
const selectedType = ref<string>('all')
const allOrders = ref<SavedOrder[]>([])

// 統計資料
const distributorStats = ref<DistributorStats[]>([])
const typeStats = ref<TypeStats[]>([])

// 載入訂單資料（使用假資料）
const loadOrders = () => {
  allOrders.value = mockOrders
  calculateStats()
}

// 計算統計資料
const calculateStats = () => {
  const [year, month] = selectedMonth.value.split('-')

  // 篩選該月份的訂單
  const filteredOrders = allOrders.value.filter(order => {
    const orderDate = new Date(order.outboundDate)
    const orderYear = orderDate.getFullYear().toString()
    const orderMonth = (orderDate.getMonth() + 1).toString().padStart(2, '0')
    return orderYear === year && orderMonth === month
  })

  // 計算各訂票單位統計
  distributorStats.value = distributors.map(distributor => {
    const orders = filteredOrders.filter(order => order.distributorId === distributor.id)
    return {
      distributor,
      totalOrders: orders.length,
      totalAmount: orders.reduce((sum, order) => sum + order.pricing.discountedTotal, 0),
      totalFullTickets: orders.reduce((sum, order) => sum + order.tickets.full, 0),
      totalHalfTickets: orders.reduce((sum, order) => sum + order.tickets.half, 0)
    }
  }).filter(stat => stat.totalOrders > 0) // 只顯示有訂單的單位

  // 計算各類型統計
  const typeMap = new Map<DistributorType, SavedOrder[]>()
  filteredOrders.forEach(order => {
    if (order.distributorType) {
      if (!typeMap.has(order.distributorType)) {
        typeMap.set(order.distributorType, [])
      }
      typeMap.get(order.distributorType)!.push(order)
    }
  })

  typeStats.value = Array.from(typeMap.entries()).map(([type, orders]) => ({
    type,
    totalOrders: orders.length,
    totalAmount: orders.reduce((sum, order) => sum + order.pricing.discountedTotal, 0),
    totalFullTickets: orders.reduce((sum, order) => sum + order.tickets.full, 0),
    totalHalfTickets: orders.reduce((sum, order) => sum + order.tickets.half, 0)
  }))
}

// 套用篩選條件
const applyFilters = () => {
  calculateStats()
}

const searchReports = () => {
  calculateStats()
}

// 重置篩選
const resetFilters = () => {
  selectedDistributorId.value = 'all'
  selectedType.value = 'all'
  calculateStats()
}

// 查看訂票單位詳細記錄
const viewDistributorDetails = (distributorId: string) => {
  router.push({
    path: `/distributor/${distributorId}`,
    query: { month: selectedMonth.value }
  })
}

// 總統計
const totalStats = computed(() => {
  const total = {
    orders: 0,
    fullTickets: 0,
    halfTickets: 0,
    amount: 0
  }
  distributorStats.value.forEach(stat => {
    total.orders += stat.totalOrders
    total.fullTickets += stat.totalFullTickets
    total.halfTickets += stat.totalHalfTickets
    total.amount += stat.totalAmount
  })
  return total
})

onMounted(() => {
  loadOrders()
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
        <span>報表總覽</span>
      </div>

      <!-- 頁面標題 -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-800 mb-2">報表總覽（管理者視角）</h1>
        <p class="text-gray-600">查看所有訂票單位的訂票紀錄與帳單明細</p>
      </div>

      <!-- 查詢卡片 -->
      <div class="bg-white rounded-xl p-8 shadow-md mb-6">
        <h2 class="text-xl font-semibold text-gray-800 mb-6 pb-4 border-b-2 border-gray-200">查詢條件</h2>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div class="space-y-2">
            <label
              for="monthSelect"
              class="block text-gray-700 text-sm font-medium"
            >查詢月份</label>
            <input
              type="month"
              id="monthSelect"
              v-model="selectedMonth"
              class="w-full p-3 border-2 border-gray-300 rounded-lg text-base transition-all outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            >
          </div>
          <div class="space-y-2">
            <label
              for="distributorFilter"
              class="block text-gray-700 text-sm font-medium"
            >訂票單位</label>
            <select
              id="distributorFilter"
              v-model="selectedDistributorId"
              class="w-full p-3 border-2 border-gray-300 rounded-lg text-base transition-all outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            >
              <option value="all">全部</option>
              <option
                v-for="dist in distributors"
                :key="dist.id"
                :value="dist.id"
              >
                {{ dist.name }}
              </option>
            </select>
          </div>
          <div class="space-y-2">
            <label
              for="typeFilter"
              class="block text-gray-700 text-sm font-medium"
            >訂票單位類型</label>
            <select
              id="typeFilter"
              v-model="selectedType"
              class="w-full p-3 border-2 border-gray-300 rounded-lg text-base transition-all outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            >
              <option value="all">全部</option>
              <option :value="DistributorType.BNB">{{ DistributorType.BNB }}</option>
              <option :value="DistributorType.TRAVEL_AGENCY">{{ DistributorType.TRAVEL_AGENCY }}</option>
              <option :value="DistributorType.BEE">{{ DistributorType.BEE }}</option>
              <option :value="DistributorType.DIRECT">{{ DistributorType.DIRECT }}</option>
              <option :value="DistributorType.ONLINE">{{ DistributorType.ONLINE }}</option>
            </select>
          </div>
        </div>

        <div class="flex gap-4">
          <button
            @click="searchReports"
            type="button"
            class="py-3 px-8 bg-blue-600 text-white rounded-lg text-base font-semibold cursor-pointer transition-all shadow-lg hover:bg-blue-700 hover:-translate-y-0.5 hover:shadow-xl"
          >
            查詢
          </button>
          <button
            @click="resetFilters"
            type="button"
            class="py-3 px-8 bg-gray-500 text-white rounded-lg text-base font-semibold cursor-pointer transition-all shadow-lg hover:bg-gray-600 hover:-translate-y-0.5 hover:shadow-xl"
          >
            重置篩選
          </button>
        </div>
      </div>

      <!-- 總統計卡片 -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div class="bg-white rounded-xl p-6 shadow-md">
          <div class="text-gray-600 text-sm mb-2">總訂單數</div>
          <div class="text-3xl font-bold text-blue-600">{{ totalStats.orders }}</div>
        </div>
        <div class="bg-white rounded-xl p-6 shadow-md">
          <div class="text-gray-600 text-sm mb-2">總全票數</div>
          <div class="text-3xl font-bold text-green-600">{{ totalStats.fullTickets }}</div>
        </div>
        <div class="bg-white rounded-xl p-6 shadow-md">
          <div class="text-gray-600 text-sm mb-2">總半票數</div>
          <div class="text-3xl font-bold text-orange-600">{{ totalStats.halfTickets }}</div>
        </div>
        <div class="bg-white rounded-xl p-6 shadow-md">
          <div class="text-gray-600 text-sm mb-2">總金額</div>
          <div class="text-3xl font-bold text-purple-600">NT$ {{ totalStats.amount.toLocaleString() }}</div>
        </div>
      </div>

      <!-- 訂票單位統計 -->
      <div
        v-if="distributorStats.length > 0"
        class="bg-white rounded-xl p-8 shadow-md mb-6"
      >
        <h2 class="text-xl font-semibold text-gray-800 mb-6 pb-4 border-b-2 border-gray-200">各訂票單位統計</h2>

        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-gray-50">
              <tr>
                <th class="p-4 text-left font-semibold text-gray-700 text-sm border-b-2 border-gray-200">訂票單位</th>
                <th class="p-4 text-left font-semibold text-gray-700 text-sm border-b-2 border-gray-200">類型</th>
                <th class="p-4 text-left font-semibold text-gray-700 text-sm border-b-2 border-gray-200">聯絡人</th>
                <th class="p-4 text-left font-semibold text-gray-700 text-sm border-b-2 border-gray-200">訂單數</th>
                <th class="p-4 text-left font-semibold text-gray-700 text-sm border-b-2 border-gray-200">全票</th>
                <th class="p-4 text-left font-semibold text-gray-700 text-sm border-b-2 border-gray-200">半票</th>
                <th class="p-4 text-left font-semibold text-gray-700 text-sm border-b-2 border-gray-200">總金額</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="stat in distributorStats"
                :key="stat.distributor.id"
                @click="viewDistributorDetails(stat.distributor.id)"
                class="hover:bg-blue-50 cursor-pointer transition-colors"
              >
                <td class="p-4 text-gray-800 border-b border-gray-100 font-semibold">{{ stat.distributor.name }}</td>
                <td class="p-4 border-b border-gray-100">
                  <span
                    class="inline-block px-3 py-1 rounded-full text-xs font-semibold"
                    :class="{
                      'bg-blue-100 text-blue-800': stat.distributor.type === DistributorType.BNB,
                      'bg-green-100 text-green-800': stat.distributor.type === DistributorType.TRAVEL_AGENCY,
                      'bg-orange-100 text-orange-800': stat.distributor.type === DistributorType.BEE,
                      'bg-purple-100 text-purple-800': stat.distributor.type === DistributorType.DIRECT,
                      'bg-pink-100 text-pink-800': stat.distributor.type === DistributorType.ONLINE
                    }"
                  >
                    {{ stat.distributor.type }}
                  </span>
                </td>
                <td class="p-4 text-gray-800 border-b border-gray-100">{{ stat.distributor.contact }}</td>
                <td class="p-4 text-gray-800 border-b border-gray-100">{{ stat.totalOrders }}</td>
                <td class="p-4 text-gray-800 border-b border-gray-100">{{ stat.totalFullTickets }} 張</td>
                <td class="p-4 text-gray-800 border-b border-gray-100">{{ stat.totalHalfTickets }} 張</td>
                <td class="p-4 text-gray-800 border-b border-gray-100 font-semibold">NT$ {{
                  stat.totalAmount.toLocaleString() }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 類型統計 -->
      <div
        v-if="typeStats.length > 0"
        class="bg-white rounded-xl p-8 shadow-md mb-6"
      >
        <h2 class="text-xl font-semibold text-gray-800 mb-6 pb-4 border-b-2 border-gray-200">各類型統計</h2>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div
            v-for="stat in typeStats"
            :key="stat.type"
            class="border-2 border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
          >
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-semibold text-gray-800">{{ stat.type }}</h3>
              <span
                class="inline-block px-3 py-1 rounded-full text-xs font-semibold"
                :class="{
                  'bg-blue-100 text-blue-800': stat.type === DistributorType.BNB,
                  'bg-green-100 text-green-800': stat.type === DistributorType.TRAVEL_AGENCY,
                  'bg-orange-100 text-orange-800': stat.type === DistributorType.BEE,
                  'bg-purple-100 text-purple-800': stat.type === DistributorType.DIRECT,
                  'bg-pink-100 text-pink-800': stat.type === DistributorType.ONLINE
                }"
              >
                {{ stat.totalOrders }} 筆
              </span>
            </div>
            <div class="space-y-2">
              <div class="flex justify-between text-sm">
                <span class="text-gray-600">全票：</span>
                <span class="font-semibold">{{ stat.totalFullTickets }} 張</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-gray-600">半票：</span>
                <span class="font-semibold">{{ stat.totalHalfTickets }} 張</span>
              </div>
              <div class="flex justify-between text-sm pt-2 border-t border-gray-200">
                <span class="text-gray-600">總金額：</span>
                <span class="font-bold text-lg">NT$ {{ stat.totalAmount.toLocaleString() }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
