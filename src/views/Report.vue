<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useSidebar } from '@/composables/useSidebar'
import { useTheme } from '@/composables/useTheme'
import Navbar from '@/components/Navbar.vue'
import Sidebar from '@/components/Sidebar.vue'
import PageContainer from '@/components/ui/PageContainer.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { distributors, DistributorType, mockOrders, type SavedOrder, type Distributor } from '@/constants/mockOrders'
import { useDailySettlement } from '@/composables/useDailySettlement'
import { useAuth } from '@/composables/useAuth'
import { EXPENSE_CATEGORY_LABEL, type ExpenseCategory } from '@/types/settlement'
import {
  ChartBarIcon
} from '@heroicons/vue/24/outline'

const { isCollapsed } = useSidebar()
const { theme } = useTheme()
const router = useRouter()
const { currentUser } = useAuth()
const settlement = useDailySettlement()

// §3.7.1 日結支出 + 手動關帳
const settleDate = ref<string>(new Date().toISOString().split('T')[0] as string)
const expenseCategory = ref<ExpenseCategory>('misc')
const expenseAmount = ref<number>(0)
const expenseNote = ref<string>('')

function addDailyExpense() {
  if (!expenseAmount.value || expenseAmount.value <= 0) {
    alert('請輸入金額')
    return
  }
  if (settlement.isDateClosed(settleDate.value)) {
    alert('該日已關帳，無法新增支出')
    return
  }
  const result = settlement.addExpense(
    settleDate.value,
    expenseCategory.value,
    expenseAmount.value,
    expenseNote.value,
    currentUser.value || 'system'
  )
  if (!result) {
    alert('新增失敗')
    return
  }
  expenseAmount.value = 0
  expenseNote.value = ''
}

function removeDailyExpense(id: string) {
  if (!confirm('確定要刪除此支出嗎？')) return
  settlement.removeExpense(settleDate.value, id)
}

function closeSettlement() {
  if (!confirm(`確定要關帳「${settleDate.value}」嗎？\n關帳後該日訂單不可編輯，需手動「重開帳」才能再修改。`)) return
  settlement.closeDate(settleDate.value, currentUser.value || 'system')
  alert('已關帳')
}

function reopenSettlement() {
  if (!confirm(`確定要重開「${settleDate.value}」的帳嗎？`)) return
  settlement.reopenDate(settleDate.value, currentUser.value || 'system')
  alert('已重開帳')
}

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
          title="報表總覽"
          subtitle="查看所有訂票單位的訂票紀錄與帳單明細"
          :icon="ChartBarIcon"
          max-width="2xl"
        >
          <!-- 查詢卡片 -->
          <BaseCard title="查詢條件" padding="lg" class="mb-6">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div class="space-y-2">
                <label
                  for="monthSelect"
                  class="block text-sm font-medium"
                  :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                >
                  查詢月份
                </label>
                <input
                  type="month"
                  id="monthSelect"
                  v-model="selectedMonth"
                  :class="[
                    'w-full p-3 border-2 rounded-lg text-base transition-all outline-none focus:ring-4',
                    theme === 'dark'
                      ? 'bg-secondary-900 border-secondary-700 text-white focus:border-primary-500 focus:ring-primary-900/30'
                      : 'border-neutral-300 focus:border-primary-500 focus:ring-primary-100'
                  ]"
                />
              </div>
              <div class="space-y-2">
                <label
                  for="distributorFilter"
                  class="block text-sm font-medium"
                  :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                >
                  訂票單位
                </label>
                <select
                  id="distributorFilter"
                  v-model="selectedDistributorId"
                  :class="[
                    'w-full p-3 border-2 rounded-lg text-base transition-all outline-none focus:ring-4',
                    theme === 'dark'
                      ? 'bg-secondary-900 border-secondary-700 text-white focus:border-primary-500 focus:ring-primary-900/30'
                      : 'border-neutral-300 focus:border-primary-500 focus:ring-primary-100'
                  ]"
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
                  class="block text-sm font-medium"
                  :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                >
                  訂票單位類型
                </label>
                <select
                  id="typeFilter"
                  v-model="selectedType"
                  :class="[
                    'w-full p-3 border-2 rounded-lg text-base transition-all outline-none focus:ring-4',
                    theme === 'dark'
                      ? 'bg-secondary-900 border-secondary-700 text-white focus:border-primary-500 focus:ring-primary-900/30'
                      : 'border-neutral-300 focus:border-primary-500 focus:ring-primary-100'
                  ]"
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
              <BaseButton
                variant="primary"
                @click="searchReports"
              >
                查詢
              </BaseButton>
              <BaseButton
                variant="secondary"
                @click="resetFilters"
              >
                重置篩選
              </BaseButton>
            </div>
          </BaseCard>

          <!-- 總統計卡片 -->
          <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <BaseCard padding="md">
              <div
                class="text-sm mb-2"
                :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'"
              >
                總訂單數
              </div>
              <div class="text-3xl font-bold text-primary-600">{{ totalStats.orders }}</div>
            </BaseCard>
            <BaseCard padding="md">
              <div
                class="text-sm mb-2"
                :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'"
              >
                總全票數
              </div>
              <div class="text-3xl font-bold text-green-600">{{ totalStats.fullTickets }}</div>
            </BaseCard>
            <BaseCard padding="md">
              <div
                class="text-sm mb-2"
                :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'"
              >
                總半票數
              </div>
              <div class="text-3xl font-bold text-amber-600">{{ totalStats.halfTickets }}</div>
            </BaseCard>
            <BaseCard padding="md">
              <div
                class="text-sm mb-2"
                :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'"
              >
                總金額
              </div>
              <div class="text-3xl font-bold text-purple-600">NT$ {{ totalStats.amount.toLocaleString() }}</div>
            </BaseCard>
          </div>

          <!-- 訂票單位統計 -->
          <BaseCard
            v-if="distributorStats.length > 0"
            title="各訂票單位統計"
            padding="none"
            class="mb-6"
          >
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
                      訂票單位
                    </th>
                    <th
                      class="p-4 text-left font-semibold text-sm"
                      :class="theme === 'dark' ? 'text-neutral-300 border-b-2 border-secondary-700' : 'text-neutral-700 border-b-2 border-neutral-200'"
                    >
                      類型
                    </th>
                    <th
                      class="p-4 text-left font-semibold text-sm"
                      :class="theme === 'dark' ? 'text-neutral-300 border-b-2 border-secondary-700' : 'text-neutral-700 border-b-2 border-neutral-200'"
                    >
                      聯絡人
                    </th>
                    <th
                      class="p-4 text-left font-semibold text-sm"
                      :class="theme === 'dark' ? 'text-neutral-300 border-b-2 border-secondary-700' : 'text-neutral-700 border-b-2 border-neutral-200'"
                    >
                      訂單數
                    </th>
                    <th
                      class="p-4 text-left font-semibold text-sm"
                      :class="theme === 'dark' ? 'text-neutral-300 border-b-2 border-secondary-700' : 'text-neutral-700 border-b-2 border-neutral-200'"
                    >
                      全票
                    </th>
                    <th
                      class="p-4 text-left font-semibold text-sm"
                      :class="theme === 'dark' ? 'text-neutral-300 border-b-2 border-secondary-700' : 'text-neutral-700 border-b-2 border-neutral-200'"
                    >
                      半票
                    </th>
                    <th
                      class="p-4 text-left font-semibold text-sm"
                      :class="theme === 'dark' ? 'text-neutral-300 border-b-2 border-secondary-700' : 'text-neutral-700 border-b-2 border-neutral-200'"
                    >
                      總金額
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="stat in distributorStats"
                    :key="stat.distributor.id"
                    @click="viewDistributorDetails(stat.distributor.id)"
                    :class="[
                      'cursor-pointer transition-colors',
                      theme === 'dark' ? 'hover:bg-secondary-800' : 'hover:bg-primary-50'
                    ]"
                  >
                    <td
                      class="p-4 font-semibold border-b"
                      :class="theme === 'dark' ? 'text-white border-secondary-800' : 'text-neutral-800 border-neutral-100'"
                    >
                      {{ stat.distributor.name }}
                    </td>
                    <td
                      class="p-4 border-b"
                      :class="theme === 'dark' ? 'border-secondary-800' : 'border-neutral-100'"
                    >
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
                    <td
                      class="p-4 border-b"
                      :class="theme === 'dark' ? 'text-neutral-300 border-secondary-800' : 'text-neutral-800 border-neutral-100'"
                    >
                      {{ stat.distributor.contact }}
                    </td>
                    <td
                      class="p-4 border-b"
                      :class="theme === 'dark' ? 'text-neutral-300 border-secondary-800' : 'text-neutral-800 border-neutral-100'"
                    >
                      {{ stat.totalOrders }}
                    </td>
                    <td
                      class="p-4 border-b"
                      :class="theme === 'dark' ? 'text-neutral-300 border-secondary-800' : 'text-neutral-800 border-neutral-100'"
                    >
                      {{ stat.totalFullTickets }} 張
                    </td>
                    <td
                      class="p-4 border-b"
                      :class="theme === 'dark' ? 'text-neutral-300 border-secondary-800' : 'text-neutral-800 border-neutral-100'"
                    >
                      {{ stat.totalHalfTickets }} 張
                    </td>
                    <td
                      class="p-4 font-semibold border-b"
                      :class="theme === 'dark' ? 'text-neutral-300 border-secondary-800' : 'text-neutral-800 border-neutral-100'"
                    >
                      NT$ {{ stat.totalAmount.toLocaleString() }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </BaseCard>

          <!-- 類型統計 -->
          <BaseCard
            v-if="typeStats.length > 0"
            title="各類型統計"
            padding="lg"
          >
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div
                v-for="stat in typeStats"
                :key="stat.type"
                :class="[
                  'border-2 rounded-lg p-6 transition-shadow hover:shadow-lg',
                  theme === 'dark' ? 'border-secondary-800' : 'border-neutral-200'
                ]"
              >
                <div class="flex items-center justify-between mb-4">
                  <h3
                    class="text-lg font-semibold"
                    :class="theme === 'dark' ? 'text-white' : 'text-neutral-800'"
                  >
                    {{ stat.type }}
                  </h3>
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
                    <span
                      :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'"
                    >
                      全票：
                    </span>
                    <span class="font-semibold">{{ stat.totalFullTickets }} 張</span>
                  </div>
                  <div class="flex justify-between text-sm">
                    <span
                      :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'"
                    >
                      半票：
                    </span>
                    <span class="font-semibold">{{ stat.totalHalfTickets }} 張</span>
                  </div>
                  <div
                    :class="[
                      'flex justify-between text-sm pt-2 border-t',
                      theme === 'dark' ? 'border-secondary-800' : 'border-neutral-200'
                    ]"
                  >
                    <span
                      :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'"
                    >
                      總金額：
                    </span>
                    <span class="font-bold text-lg">NT$ {{ stat.totalAmount.toLocaleString() }}</span>
                  </div>
                </div>
              </div>
            </div>
          </BaseCard>

          <!-- §3.7.1 日結支出 + 手動關帳 -->
          <BaseCard padding="lg" class="mt-6">
            <div class="flex flex-wrap items-end justify-between gap-4 mb-4">
              <div>
                <h3 class="text-lg font-semibold mb-1" :class="theme === 'dark' ? 'text-white' : 'text-neutral-900'">
                  日結支出 + 關帳
                </h3>
                <p class="text-sm" :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'">
                  記錄當日雜支、手續費；關帳後該日訂單將鎖定不可編輯（§3.7.1）
                </p>
              </div>
              <div class="flex items-end gap-3">
                <div>
                  <label class="block text-xs mb-1" :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'">
                    結算日期
                  </label>
                  <input
                    v-model="settleDate"
                    type="date"
                    class="px-3 py-2 rounded-md border text-sm"
                    :class="theme === 'dark'
                      ? 'bg-secondary-900 border-secondary-800 text-white'
                      : 'bg-white border-neutral-300 text-neutral-900'"
                  />
                </div>
                <span
                  v-if="settlement.isDateClosed(settleDate)"
                  class="px-3 py-2 text-sm font-medium rounded-full"
                  :class="theme === 'dark' ? 'bg-red-900/30 text-red-300' : 'bg-red-100 text-red-700'"
                >
                  已關帳
                </span>
                <BaseButton
                  v-if="!settlement.isDateClosed(settleDate)"
                  variant="danger"
                  @click="closeSettlement"
                >
                  關帳
                </BaseButton>
                <BaseButton
                  v-else
                  variant="secondary"
                  @click="reopenSettlement"
                >
                  重開帳
                </BaseButton>
              </div>
            </div>

            <!-- 新增支出 form -->
            <div
              v-if="!settlement.isDateClosed(settleDate)"
              class="grid grid-cols-1 md:grid-cols-12 gap-3 mb-4"
            >
              <select
                v-model="expenseCategory"
                class="md:col-span-2 px-3 py-2 rounded-md border text-sm"
                :class="theme === 'dark'
                  ? 'bg-secondary-900 border-secondary-800 text-white'
                  : 'bg-white border-neutral-300 text-neutral-900'"
              >
                <option value="misc">雜支</option>
                <option value="fee">手續費</option>
                <option value="occasional">臨時費用</option>
              </select>
              <input
                v-model.number="expenseAmount"
                type="number"
                min="0"
                step="1"
                placeholder="金額"
                class="md:col-span-2 px-3 py-2 rounded-md border text-sm"
                :class="theme === 'dark'
                  ? 'bg-secondary-900 border-secondary-800 text-white'
                  : 'bg-white border-neutral-300 text-neutral-900'"
              />
              <input
                v-model="expenseNote"
                type="text"
                placeholder="備註（選填）"
                class="md:col-span-6 px-3 py-2 rounded-md border text-sm"
                :class="theme === 'dark'
                  ? 'bg-secondary-900 border-secondary-800 text-white'
                  : 'bg-white border-neutral-300 text-neutral-900'"
              />
              <BaseButton variant="primary" @click="addDailyExpense" class="md:col-span-2">
                新增支出
              </BaseButton>
            </div>

            <!-- 支出列表 -->
            <table class="w-full text-sm">
              <thead>
                <tr
                  class="text-xs uppercase font-medium border-b"
                  :class="theme === 'dark' ? 'text-neutral-400 border-secondary-800' : 'text-neutral-700 border-neutral-200'"
                >
                  <th class="text-left px-3 py-2.5">類別</th>
                  <th class="text-right px-3 py-2.5">金額</th>
                  <th class="text-left px-3 py-2.5">備註</th>
                  <th class="text-left px-3 py-2.5">建立時間</th>
                  <th class="text-right px-3 py-2.5">操作</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="exp in settlement.listExpenses(settleDate)"
                  :key="exp.id"
                  class="border-b last:border-0"
                  :class="theme === 'dark' ? 'border-secondary-800' : 'border-neutral-100'"
                >
                  <td class="px-3 py-3" :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'">
                    <span
                      class="px-2 py-0.5 text-xs font-medium rounded"
                      :class="theme === 'dark' ? 'bg-secondary-800 text-neutral-200' : 'bg-neutral-100 text-neutral-700'"
                    >
                      {{ EXPENSE_CATEGORY_LABEL[exp.category] }}
                    </span>
                  </td>
                  <td class="px-3 py-3 text-right tabular-nums font-medium" :class="theme === 'dark' ? 'text-white' : 'text-neutral-900'">
                    NT$ {{ exp.amount.toLocaleString() }}
                  </td>
                  <td class="px-3 py-3" :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'">
                    {{ exp.note || '—' }}
                  </td>
                  <td class="px-3 py-3 text-xs" :class="theme === 'dark' ? 'text-neutral-500' : 'text-neutral-500'">
                    {{ new Date(exp.createdAt).toLocaleString('zh-TW') }}
                  </td>
                  <td class="px-3 py-3 text-right">
                    <button
                      v-if="!settlement.isDateClosed(settleDate)"
                      @click="removeDailyExpense(exp.id)"
                      class="text-xs"
                      :class="theme === 'dark' ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-800'"
                    >
                      刪除
                    </button>
                    <span
                      v-else
                      class="text-xs"
                      :class="theme === 'dark' ? 'text-neutral-600' : 'text-neutral-400'"
                    >
                      已關帳
                    </span>
                  </td>
                </tr>
                <tr v-if="!settlement.listExpenses(settleDate).length">
                  <td colspan="5" class="px-3 py-8 text-center text-sm" :class="theme === 'dark' ? 'text-neutral-500' : 'text-neutral-400'">
                    尚無支出紀錄
                  </td>
                </tr>
                <tr v-else class="font-medium">
                  <td class="px-3 py-3" :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'">
                    合計
                  </td>
                  <td class="px-3 py-3 text-right tabular-nums" :class="theme === 'dark' ? 'text-white' : 'text-neutral-900'">
                    NT$ {{ settlement.totalExpenses(settleDate).toLocaleString() }}
                  </td>
                  <td colspan="3"></td>
                </tr>
              </tbody>
            </table>
          </BaseCard>
        </PageContainer>
      </main>
    </div>
  </div>
</template>
