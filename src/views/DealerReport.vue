<script setup lang="ts">
/**
 * §3.7.3 經銷商報表
 * 經銷商查看自身當月訂單；航商會計人員查看旗下所有合作經銷商。
 */

import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useSidebar } from '@/composables/useSidebar'
import { useTheme } from '@/composables/useTheme'
import { useOrderStore } from '@/stores/order'
import { useRbacStore } from '@/stores/rbac'
import Navbar from '@/components/Navbar.vue'
import Sidebar from '@/components/Sidebar.vue'
import PageContainer from '@/components/ui/PageContainer.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import {
  BuildingStorefrontIcon,
  CalendarDaysIcon,
  ArrowDownTrayIcon,
} from '@heroicons/vue/24/outline'
import { exportToXlsx } from '@/composables/useExcelExport'

const { isCollapsed } = useSidebar()
const { theme } = useTheme()
const router = useRouter()
const orderStore = useOrderStore()
const rbacStore = useRbacStore()

const today = new Date()
const selectedMonth = ref(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`)
const selectedDealerId = ref<string>('') // ''=全部

// 經銷商：partner 角色的帳號
const dealerAccounts = computed(() =>
  rbacStore.accounts.filter((a) => {
    const role = rbacStore.roles.find((r) => r.id === a.roleId)
    return role?.roleTemplate === 'partner'
  })
)

function getDealerName(id: string | undefined): string {
  if (!id) return '直客'
  return rbacStore.accounts.find((a) => a.id === id)?.name ?? id
}

const reportOrders = computed(() => {
  const [year, month] = selectedMonth.value.split('-')
  return orderStore.orders.filter((o) => {
    if (o.status === 'cancelled') return false
    if (!o.agentAccountId) return false // 只看代訂訂單
    const created = new Date(o.createdAt)
    if (created.getFullYear().toString() !== year) return false
    if ((created.getMonth() + 1).toString().padStart(2, '0') !== month) return false
    if (selectedDealerId.value && o.agentAccountId !== selectedDealerId.value) return false
    return true
  })
})

// 依經銷商彙總
type DealerSummary = {
  dealerId: string
  orderCount: number
  totalAmount: number
  paidAmount: number
}
const dealerSummary = computed<DealerSummary[]>(() => {
  const map = new Map<string, DealerSummary>()
  for (const o of reportOrders.value) {
    const id = o.agentAccountId!
    if (!map.has(id)) {
      map.set(id, { dealerId: id, orderCount: 0, totalAmount: 0, paidAmount: 0 })
    }
    const entry = map.get(id)!
    entry.orderCount += 1
    entry.totalAmount += o.paymentInfo?.totalAmount ?? 0
    entry.paidAmount += o.paymentInfo?.paidAmount ?? 0
  }
  return Array.from(map.values()).sort((a, b) => b.totalAmount - a.totalAmount)
})

const grandStats = computed(() => ({
  orderCount: reportOrders.value.length,
  totalAmount: dealerSummary.value.reduce((s, e) => s + e.totalAmount, 0),
  paidAmount: dealerSummary.value.reduce((s, e) => s + e.paidAmount, 0),
}))

function viewDealerDetail(dealerId: string) {
  router.push({
    path: `/distributor/${dealerId}`,
    query: { month: selectedMonth.value },
  })
}

async function exportCsv() {
  await exportToXlsx(
    `dealer-report-${selectedMonth.value}`,
    '經銷商報表',
    [
      { header: '經銷商', width: 22 },
      { header: '訂單數', width: 10 },
      { header: '總金額', width: 14 },
      { header: '已付金額', width: 14 },
      { header: '應收餘額', width: 14 },
    ],
    dealerSummary.value.map((d) => [
      getDealerName(d.dealerId),
      d.orderCount,
      d.totalAmount,
      d.paidAmount,
      d.totalAmount - d.paidAmount,
    ])
  )
}
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <Navbar username="管理員" />
    <div class="flex flex-1">
      <Sidebar :active-route="$route.path.slice(1)" />
      <main :class="['flex-1 transition-all duration-300', isCollapsed ? 'ml-20' : 'ml-64']">
        <PageContainer
          title="經銷商報表"
          subtitle="代訂訂單彙總（§3.7.3）"
          :icon="BuildingStorefrontIcon"
          max-width="2xl"
        >
          <BaseCard padding="md" class="mb-4">
            <div class="flex flex-wrap items-end gap-4">
              <div>
                <label
                  class="block text-xs mb-1.5"
                  :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'"
                >
                  <CalendarDaysIcon class="w-3.5 h-3.5 inline-block mr-1" />
                  查詢月份
                </label>
                <input
                  v-model="selectedMonth"
                  type="month"
                  class="px-3 py-2 rounded-md border text-sm"
                  :class="theme === 'dark'
                    ? 'bg-secondary-900 border-secondary-800 text-white'
                    : 'bg-white border-neutral-300 text-neutral-900'"
                />
              </div>
              <div>
                <label
                  class="block text-xs mb-1.5"
                  :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'"
                >
                  <BuildingStorefrontIcon class="w-3.5 h-3.5 inline-block mr-1" />
                  經銷商
                </label>
                <select
                  v-model="selectedDealerId"
                  class="px-3 py-2 rounded-md border text-sm min-w-[220px]"
                  :class="theme === 'dark'
                    ? 'bg-secondary-900 border-secondary-800 text-white'
                    : 'bg-white border-neutral-300 text-neutral-900'"
                >
                  <option value="">全部經銷商</option>
                  <option v-for="d in dealerAccounts" :key="d.id" :value="d.id">
                    {{ d.name }}
                  </option>
                </select>
              </div>
              <BaseButton variant="secondary" :icon="ArrowDownTrayIcon" @click="exportCsv">
                匯出 Excel
              </BaseButton>
            </div>
          </BaseCard>

          <div class="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
            <BaseCard padding="md">
              <div class="text-xs mb-1" :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'">
                訂單數
              </div>
              <div class="text-2xl font-bold" :class="theme === 'dark' ? 'text-white' : 'text-neutral-900'">
                {{ grandStats.orderCount }}
              </div>
            </BaseCard>
            <BaseCard padding="md">
              <div class="text-xs mb-1" :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'">
                總金額
              </div>
              <div class="text-2xl font-bold" :class="theme === 'dark' ? 'text-white' : 'text-neutral-900'">
                NT$ {{ grandStats.totalAmount.toLocaleString() }}
              </div>
            </BaseCard>
            <BaseCard padding="md">
              <div class="text-xs mb-1" :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'">
                已付 / 應收餘額
              </div>
              <div class="flex items-baseline gap-2">
                <div class="text-xl font-bold text-green-500">
                  NT$ {{ grandStats.paidAmount.toLocaleString() }}
                </div>
                <div class="text-sm text-red-500">
                  / {{ (grandStats.totalAmount - grandStats.paidAmount).toLocaleString() }}
                </div>
              </div>
            </BaseCard>
          </div>

          <BaseCard padding="md">
            <table class="w-full text-sm">
              <thead>
                <tr
                  class="text-xs uppercase font-medium border-b"
                  :class="theme === 'dark' ? 'text-neutral-400 border-secondary-800' : 'text-neutral-700 border-neutral-200'"
                >
                  <th class="text-left px-3 py-2.5">經銷商</th>
                  <th class="text-right px-3 py-2.5">訂單數</th>
                  <th class="text-right px-3 py-2.5">總金額</th>
                  <th class="text-right px-3 py-2.5">已付</th>
                  <th class="text-right px-3 py-2.5">應收餘額</th>
                  <th class="text-right px-3 py-2.5">操作</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="d in dealerSummary"
                  :key="d.dealerId"
                  class="border-b last:border-0"
                  :class="theme === 'dark' ? 'border-secondary-800 hover:bg-secondary-800/50' : 'border-neutral-100 hover:bg-neutral-50'"
                >
                  <td class="px-3 py-3 font-medium" :class="theme === 'dark' ? 'text-white' : 'text-neutral-900'">
                    {{ getDealerName(d.dealerId) }}
                  </td>
                  <td class="px-3 py-3 text-right tabular-nums" :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'">
                    {{ d.orderCount }}
                  </td>
                  <td class="px-3 py-3 text-right tabular-nums font-medium" :class="theme === 'dark' ? 'text-white' : 'text-neutral-900'">
                    NT$ {{ d.totalAmount.toLocaleString() }}
                  </td>
                  <td class="px-3 py-3 text-right tabular-nums text-green-600">
                    NT$ {{ d.paidAmount.toLocaleString() }}
                  </td>
                  <td class="px-3 py-3 text-right tabular-nums">
                    <span :class="d.totalAmount - d.paidAmount > 0 ? 'text-red-500 font-medium' : 'text-neutral-400'">
                      NT$ {{ (d.totalAmount - d.paidAmount).toLocaleString() }}
                    </span>
                  </td>
                  <td class="px-3 py-3 text-right">
                    <button
                      @click="viewDealerDetail(d.dealerId)"
                      class="text-xs"
                      :class="theme === 'dark' ? 'text-primary-400 hover:text-primary-300' : 'text-primary-600 hover:text-primary-800'"
                    >
                      查看明細 →
                    </button>
                  </td>
                </tr>
                <tr v-if="!dealerSummary.length">
                  <td colspan="6" class="px-3 py-12 text-center" :class="theme === 'dark' ? 'text-neutral-500' : 'text-neutral-400'">
                    查詢期間內無代訂訂單
                  </td>
                </tr>
              </tbody>
            </table>
          </BaseCard>
        </PageContainer>
      </main>
    </div>
  </div>
</template>
