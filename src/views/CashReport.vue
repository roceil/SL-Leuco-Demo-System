<script setup lang="ts">
/**
 * §3.7.2 票口報表
 * 票口人員查看自身訂單；航商會計人員查看旗下所有票口人員的訂單。
 */

import { ref, computed } from 'vue'
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
  BanknotesIcon,
  CalendarDaysIcon,
  UserIcon,
  ArrowDownTrayIcon,
} from '@heroicons/vue/24/outline'
import { exportToXlsx } from '@/composables/useExcelExport'

const { isCollapsed } = useSidebar()
const { theme } = useTheme()
const orderStore = useOrderStore()
const rbacStore = useRbacStore()

const today = new Date()
const selectedMonth = ref(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`)
const selectedStaffId = ref<string>('') // ''=全部

// 假設「票口人員」= 沒有 partner 角色的所有 staff（demo 簡化）
const staffAccounts = computed(() =>
  rbacStore.accounts.filter((a) => {
    const role = rbacStore.roles.find((r) => r.id === a.roleId)
    return role && role.roleTemplate !== 'partner'
  })
)

function getStaffName(id: string): string {
  return rbacStore.accounts.find((a) => a.id === id)?.name ?? id
}

const reportOrders = computed(() => {
  const [year, month] = selectedMonth.value.split('-')
  return orderStore.orders.filter((o) => {
    if (o.status === 'cancelled') return false
    const created = new Date(o.createdAt)
    if (created.getFullYear().toString() !== year) return false
    if ((created.getMonth() + 1).toString().padStart(2, '0') !== month) return false
    if (selectedStaffId.value && o.createdBy !== selectedStaffId.value) return false
    // 排除代訂訂單（partner 訂單由經銷商報表負責）
    if (o.agentAccountId) return false
    return true
  })
})

// 依票口人員彙總
type StaffSummary = {
  staffId: string
  orderCount: number
  totalAmount: number
  cashAmount: number
  cardAmount: number
}
const staffSummary = computed<StaffSummary[]>(() => {
  const map = new Map<string, StaffSummary>()
  for (const o of reportOrders.value) {
    if (!map.has(o.createdBy)) {
      map.set(o.createdBy, {
        staffId: o.createdBy,
        orderCount: 0,
        totalAmount: 0,
        cashAmount: 0,
        cardAmount: 0,
      })
    }
    const entry = map.get(o.createdBy)!
    entry.orderCount += 1
    entry.totalAmount += o.paymentInfo?.totalAmount ?? 0
    for (const r of o.paymentInfo?.paymentRecords ?? []) {
      if (r.method === 'cash') entry.cashAmount += r.amount
      else if (r.method === 'credit_card') entry.cardAmount += r.amount
    }
  }
  return Array.from(map.values()).sort((a, b) => b.totalAmount - a.totalAmount)
})

const grandStats = computed(() => ({
  orderCount: reportOrders.value.length,
  totalAmount: staffSummary.value.reduce((s, e) => s + e.totalAmount, 0),
  cashAmount: staffSummary.value.reduce((s, e) => s + e.cashAmount, 0),
  cardAmount: staffSummary.value.reduce((s, e) => s + e.cardAmount, 0),
}))

async function exportCsv() {
  await exportToXlsx(
    `cash-report-${selectedMonth.value}`,
    '票口報表',
    [
      { header: '票口人員', width: 18 },
      { header: '訂單數', width: 10 },
      { header: '總金額', width: 14 },
      { header: '現金收款', width: 14 },
      { header: '刷卡收款', width: 14 },
    ],
    staffSummary.value.map((s) => [
      getStaffName(s.staffId),
      s.orderCount,
      s.totalAmount,
      s.cashAmount,
      s.cardAmount,
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
          title="票口現金報表"
          subtitle="票口人員的訂單與收款報表（§3.7.2）"
          :icon="BanknotesIcon"
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
                  <UserIcon class="w-3.5 h-3.5 inline-block mr-1" />
                  票口人員
                </label>
                <select
                  v-model="selectedStaffId"
                  class="px-3 py-2 rounded-md border text-sm min-w-[200px]"
                  :class="theme === 'dark'
                    ? 'bg-secondary-900 border-secondary-800 text-white'
                    : 'bg-white border-neutral-300 text-neutral-900'"
                >
                  <option value="">全部</option>
                  <option v-for="acc in staffAccounts" :key="acc.id" :value="acc.id">
                    {{ acc.name }}
                  </option>
                </select>
              </div>
              <BaseButton variant="secondary" :icon="ArrowDownTrayIcon" @click="exportCsv">
                匯出 Excel
              </BaseButton>
            </div>
          </BaseCard>

          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <BaseCard padding="md">
              <div class="text-xs mb-1" :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'">
                總訂單
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
                現金
              </div>
              <div class="text-2xl font-bold text-green-500">
                NT$ {{ grandStats.cashAmount.toLocaleString() }}
              </div>
            </BaseCard>
            <BaseCard padding="md">
              <div class="text-xs mb-1" :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'">
                刷卡
              </div>
              <div class="text-2xl font-bold text-blue-500">
                NT$ {{ grandStats.cardAmount.toLocaleString() }}
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
                  <th class="text-left px-3 py-2.5">票口人員</th>
                  <th class="text-right px-3 py-2.5">訂單數</th>
                  <th class="text-right px-3 py-2.5">總金額</th>
                  <th class="text-right px-3 py-2.5">現金</th>
                  <th class="text-right px-3 py-2.5">刷卡</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="s in staffSummary"
                  :key="s.staffId"
                  class="border-b last:border-0"
                  :class="theme === 'dark' ? 'border-secondary-800' : 'border-neutral-100'"
                >
                  <td class="px-3 py-3 font-medium" :class="theme === 'dark' ? 'text-white' : 'text-neutral-900'">
                    {{ getStaffName(s.staffId) }}
                  </td>
                  <td class="px-3 py-3 text-right tabular-nums" :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'">
                    {{ s.orderCount }}
                  </td>
                  <td class="px-3 py-3 text-right tabular-nums font-medium" :class="theme === 'dark' ? 'text-white' : 'text-neutral-900'">
                    NT$ {{ s.totalAmount.toLocaleString() }}
                  </td>
                  <td class="px-3 py-3 text-right tabular-nums text-green-600">
                    NT$ {{ s.cashAmount.toLocaleString() }}
                  </td>
                  <td class="px-3 py-3 text-right tabular-nums text-blue-600">
                    NT$ {{ s.cardAmount.toLocaleString() }}
                  </td>
                </tr>
                <tr v-if="!staffSummary.length">
                  <td colspan="5" class="px-3 py-12 text-center" :class="theme === 'dark' ? 'text-neutral-500' : 'text-neutral-400'">
                    查詢期間內無資料
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
