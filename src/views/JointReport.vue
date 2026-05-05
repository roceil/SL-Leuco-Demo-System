<script setup lang="ts">
/**
 * §3.7.4 聯合報表（跨航商分帳）
 *
 * 三家航商為聯營狀態，旅行社訂單可能跨越多家航商。本報表逐筆訂單顯示
 * 各航商應分配金額，作為航商之間結算依據。
 *
 * 分帳計算邏輯（規格指定「分潤比例跟票價無關」）：
 *   每筆訂單的總金額平均分配到各航段；某航商的應收金額 =
 *   該訂單在該航商運行的航段數 × (訂單總金額 / 訂單航段總數)
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
  PresentationChartLineIcon,
  CalendarDaysIcon,
  BuildingOfficeIcon,
  ArrowDownTrayIcon,
} from '@heroicons/vue/24/outline'
import { exportToXlsx } from '@/composables/useExcelExport'

const { isCollapsed } = useSidebar()
const { theme } = useTheme()
const orderStore = useOrderStore()
const rbacStore = useRbacStore()

// 預設當月
const today = new Date()
const selectedMonth = ref(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`)

// 多選航商（空 = 全部）
const selectedOrgIds = ref<string[]>([])

// 排除系統管理組織（org-sys 通常不出現在實際對帳）
const ferryOrgs = computed(() =>
  rbacStore.organizations.filter((o) => o.id !== 'org-sys')
)

function toggleOrg(orgId: string) {
  const i = selectedOrgIds.value.indexOf(orgId)
  if (i === -1) selectedOrgIds.value.push(orgId)
  else selectedOrgIds.value.splice(i, 1)
}

function getOrgName(orgId: string | undefined): string {
  if (!orgId) return '—'
  return rbacStore.organizations.find((o) => o.id === orgId)?.name ?? orgId
}

function getOrgCode(orgId: string | undefined): string {
  if (!orgId) return '—'
  return rbacStore.organizations.find((o) => o.id === orgId)?.code ?? '—'
}

// 過濾：排除已取消、依月份、依分帳邏輯（必須跨航商或包含選中的航商）
const reportOrders = computed(() => {
  const [year, month] = selectedMonth.value.split('-')
  return orderStore.orders.filter((o) => {
    if (o.status === 'cancelled') return false
    if (!o.scheduleSegments || o.scheduleSegments.length === 0) return false

    // 月份依訂單建立日期
    const created = new Date(o.createdAt)
    if (created.getFullYear().toString() !== year) return false
    if ((created.getMonth() + 1).toString().padStart(2, '0') !== month) return false

    // 航商範圍：若有指定，需該訂單至少含一段對應航商
    if (selectedOrgIds.value.length > 0) {
      const orderOrgs = new Set(o.scheduleSegments.map((s) => s.organizationId).filter(Boolean))
      const hit = selectedOrgIds.value.some((id) => orderOrgs.has(id))
      if (!hit) return false
    }
    return true
  })
})

// 計算每筆訂單的航商分帳明細
type SplitDetail = { orgId: string; segmentCount: number; amount: number }
type OrderRow = {
  order: typeof orderStore.orders[number]
  totalAmount: number
  segmentCount: number
  perSegment: number
  splits: SplitDetail[]
  // 是否真正跨航商（含 2+ 個 org）
  isMulti: boolean
}

const orderRows = computed<OrderRow[]>(() => {
  return reportOrders.value.map((o) => {
    const total = o.paymentInfo?.totalAmount ?? 0
    const segs = o.scheduleSegments
    const perSeg = segs.length > 0 ? total / segs.length : 0

    // 累計每個 org 的航段數
    const counts = new Map<string, number>()
    for (const s of segs) {
      const oid = s.organizationId ?? 'unknown'
      counts.set(oid, (counts.get(oid) ?? 0) + 1)
    }

    const splits: SplitDetail[] = Array.from(counts.entries()).map(([orgId, count]) => ({
      orgId,
      segmentCount: count,
      amount: Math.round(perSeg * count),
    }))

    return {
      order: o,
      totalAmount: total,
      segmentCount: segs.length,
      perSegment: Math.round(perSeg),
      splits,
      isMulti: counts.size >= 2,
    }
  })
})

// 航商彙總（依查詢期間，加總各家應收）
const orgSummary = computed(() => {
  const map = new Map<string, { orgId: string; totalAmount: number; orderCount: number }>()
  for (const row of orderRows.value) {
    for (const s of row.splits) {
      if (!map.has(s.orgId)) {
        map.set(s.orgId, { orgId: s.orgId, totalAmount: 0, orderCount: 0 })
      }
      const entry = map.get(s.orgId)!
      entry.totalAmount += s.amount
      entry.orderCount += 1
    }
  }
  return Array.from(map.values()).sort((a, b) => b.totalAmount - a.totalAmount)
})

const grandTotal = computed(() => orgSummary.value.reduce((s, e) => s + e.totalAmount, 0))

// 匯出 Excel
async function exportCsv() {
  await exportToXlsx(
    `joint-report-${selectedMonth.value}`,
    '聯合報表',
    [
      { header: '訂單編號', width: 22 },
      { header: '建立日期', width: 12 },
      { header: '簽約航商', width: 14 },
      { header: '總金額', width: 12 },
      { header: '航段數', width: 8 },
      { header: '分帳明細', width: 60 },
    ],
    orderRows.value.map((row) => [
      row.order.orderNumber,
      row.order.createdAt.split('T')[0] ?? '',
      getOrgName(row.order.organizationId),
      row.totalAmount,
      row.segmentCount,
      row.splits.map((s) => `${getOrgName(s.orgId)}(${s.segmentCount}段=${s.amount})`).join('; '),
    ])
  )
}
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
          title="聯合報表"
          subtitle="跨航商訂單分帳明細（§3.7.4）；分潤比例依航段數平均分配，與票價無關"
          :icon="PresentationChartLineIcon"
          max-width="2xl"
        >
          <!-- 篩選 -->
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
              <div class="flex-1">
                <label
                  class="block text-xs mb-1.5"
                  :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'"
                >
                  <BuildingOfficeIcon class="w-3.5 h-3.5 inline-block mr-1" />
                  航商範圍（不選 = 全部）
                </label>
                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="org in ferryOrgs"
                    :key="org.id"
                    @click="toggleOrg(org.id)"
                    :class="[
                      'px-3 py-1.5 text-xs font-medium rounded-full border transition-colors',
                      selectedOrgIds.includes(org.id)
                        ? theme === 'dark'
                          ? 'bg-primary-900 border-primary-700 text-primary-200'
                          : 'bg-primary-100 border-primary-300 text-primary-700'
                        : theme === 'dark'
                          ? 'border-secondary-700 text-neutral-400 hover:bg-secondary-800'
                          : 'border-neutral-300 text-neutral-600 hover:bg-neutral-100'
                    ]"
                  >
                    {{ org.name }}
                    <span v-if="org.code" class="ml-1 font-mono opacity-70">({{ org.code }})</span>
                  </button>
                </div>
              </div>
              <BaseButton
                variant="secondary"
                :icon="ArrowDownTrayIcon"
                @click="exportCsv"
              >
                匯出 Excel
              </BaseButton>
            </div>
          </BaseCard>

          <!-- 航商彙總 -->
          <BaseCard padding="md" class="mb-4">
            <h3 class="text-sm font-medium mb-3" :class="theme === 'dark' ? 'text-white' : 'text-neutral-900'">
              航商彙總（共 {{ grandTotal.toLocaleString() }} 元）
            </h3>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div
                v-for="entry in orgSummary"
                :key="entry.orgId"
                class="p-3 rounded-lg border"
                :class="theme === 'dark' ? 'bg-secondary-800 border-secondary-700' : 'bg-neutral-50 border-neutral-200'"
              >
                <div class="text-xs mb-1" :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'">
                  {{ getOrgName(entry.orgId) }}
                  <span v-if="getOrgCode(entry.orgId) !== '—'" class="font-mono opacity-70">({{ getOrgCode(entry.orgId) }})</span>
                </div>
                <div class="text-xl font-bold" :class="theme === 'dark' ? 'text-white' : 'text-neutral-900'">
                  NT$ {{ entry.totalAmount.toLocaleString() }}
                </div>
                <div class="text-xs" :class="theme === 'dark' ? 'text-neutral-500' : 'text-neutral-500'">
                  涉及 {{ entry.orderCount }} 筆訂單
                </div>
              </div>
              <div
                v-if="!orgSummary.length"
                class="col-span-full text-center py-4 text-sm"
                :class="theme === 'dark' ? 'text-neutral-500' : 'text-neutral-400'"
              >
                查詢期間內無資料
              </div>
            </div>
          </BaseCard>

          <!-- 訂單明細 -->
          <BaseCard padding="md">
            <h3 class="text-sm font-medium mb-3" :class="theme === 'dark' ? 'text-white' : 'text-neutral-900'">
              訂單分帳明細（{{ orderRows.length }} 筆）
            </h3>
            <table class="w-full text-sm">
              <thead>
                <tr
                  class="text-xs uppercase font-medium border-b"
                  :class="theme === 'dark' ? 'text-neutral-400 border-secondary-800' : 'text-neutral-700 border-neutral-200'"
                >
                  <th class="text-left px-3 py-2.5">訂單編號</th>
                  <th class="text-left px-3 py-2.5">建立日</th>
                  <th class="text-left px-3 py-2.5">簽約航商</th>
                  <th class="text-right px-3 py-2.5">航段數</th>
                  <th class="text-right px-3 py-2.5">總金額</th>
                  <th class="text-left px-3 py-2.5">分帳明細</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in orderRows"
                  :key="row.order.id"
                  class="border-b last:border-0"
                  :class="theme === 'dark' ? 'border-secondary-800' : 'border-neutral-100'"
                >
                  <td class="px-3 py-3 font-mono text-xs" :class="theme === 'dark' ? 'text-white' : 'text-neutral-900'">
                    {{ row.order.orderNumber }}
                    <span
                      v-if="row.isMulti"
                      class="ml-1.5 px-1.5 py-0.5 text-[10px] font-medium rounded"
                      :class="theme === 'dark' ? 'bg-amber-900/40 text-amber-300' : 'bg-amber-100 text-amber-700'"
                      title="跨航商訂單"
                    >
                      跨航商
                    </span>
                  </td>
                  <td class="px-3 py-3" :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'">
                    {{ row.order.createdAt.split('T')[0] }}
                  </td>
                  <td class="px-3 py-3" :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'">
                    {{ getOrgName(row.order.organizationId) }}
                  </td>
                  <td class="px-3 py-3 text-right tabular-nums" :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'">
                    {{ row.segmentCount }}
                  </td>
                  <td class="px-3 py-3 text-right tabular-nums font-medium" :class="theme === 'dark' ? 'text-white' : 'text-neutral-900'">
                    NT$ {{ row.totalAmount.toLocaleString() }}
                  </td>
                  <td class="px-3 py-3">
                    <div class="flex flex-wrap gap-1.5">
                      <span
                        v-for="s in row.splits"
                        :key="s.orgId"
                        class="px-2 py-0.5 text-xs rounded font-mono tabular-nums"
                        :class="theme === 'dark' ? 'bg-secondary-800 text-neutral-300' : 'bg-neutral-100 text-neutral-700'"
                      >
                        {{ getOrgName(s.orgId) }} ({{ s.segmentCount }}段 = {{ s.amount.toLocaleString() }})
                      </span>
                    </div>
                  </td>
                </tr>
                <tr v-if="!orderRows.length">
                  <td
                    colspan="6"
                    class="px-3 py-12 text-center"
                    :class="theme === 'dark' ? 'text-neutral-500' : 'text-neutral-400'"
                  >
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
