<script setup lang="ts">
/**
 * §3.4.3 載運分析
 * 供航務人員查看指定日期各船班的航段與票種人數分布，
 * 作為評估次日船隻容量配置（大船／小船）的決策依據。
 */

import { ref, computed } from 'vue'
import { useSidebar } from '@/composables/useSidebar'
import { useTheme } from '@/composables/useTheme'
import { useSchedules } from '@/composables/useSchedules'
import { useOrderStore } from '@/stores/order'
import { useRouteStore } from '@/stores/route'
import Navbar from '@/components/Navbar.vue'
import Sidebar from '@/components/Sidebar.vue'
import PageContainer from '@/components/ui/PageContainer.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import { ChartBarIcon, CalendarDaysIcon } from '@heroicons/vue/24/outline'

const { isCollapsed } = useSidebar()
const { theme } = useTheme()
const { schedules } = useSchedules()
const orderStore = useOrderStore()
const routeStore = useRouteStore()

const selectedDate = ref(new Date().toISOString().split('T')[0])
const selectedScheduleId = ref<string>('') // ''=全部

function getSegmentLabel(id: string): string {
  const seg = routeStore.getRouteSegmentWithPorts(id)
  return seg ? `${seg.fromPort.name} → ${seg.toPort.name}` : '—'
}

const dayFlights = computed(() =>
  schedules.value
    .filter((s) => s.status !== 'cancelled')
    .filter((s) => s.isDaily || s.date === selectedDate.value)
    .sort((a, b) => a.departureTime.localeCompare(b.departureTime))
)

const visibleFlights = computed(() => {
  if (selectedScheduleId.value) {
    return dayFlights.value.filter((f) => f.id === selectedScheduleId.value)
  }
  return dayFlights.value
})

// 該日期的訂單 — 依訂單第一段日期判定
const dayOrders = computed(() =>
  orderStore.orders.filter((o) => {
    if (o.status === 'cancelled') return false
    return o.scheduleSegments?.[0]?.date === selectedDate.value
  })
)

// 取每個 flight 的票種分佈統計
function statsForFlight(flight: typeof schedules.value[number]) {
  const matching = dayOrders.value.filter((o) =>
    o.scheduleSegments?.some(
      (s) => s.time === flight.departureTime && s.date === selectedDate.value
    )
  )

  // 票種分佈
  const byType = new Map<string, number>()
  for (const o of matching) {
    for (const t of o.ticketBreakdown ?? []) {
      byType.set(t.passengerType, (byType.get(t.passengerType) ?? 0) + t.quantity)
    }
  }
  return {
    orderCount: matching.length,
    byType: Array.from(byType.entries()).map(([type, count]) => ({ type, count })),
  }
}
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <Navbar username="管理員" />
    <div class="flex flex-1">
      <Sidebar :active-route="$route.path.slice(1)" />
      <main :class="['flex-1 transition-all duration-300', isCollapsed ? 'ml-20' : 'ml-64']">
        <PageContainer
          title="載運分析"
          subtitle="查看各船班的航段與票種人數分布（§3.4.3）"
          :icon="ChartBarIcon"
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
                  查詢日期
                </label>
                <input
                  v-model="selectedDate"
                  type="date"
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
                  船班
                </label>
                <select
                  v-model="selectedScheduleId"
                  class="px-3 py-2 rounded-md border text-sm min-w-[240px]"
                  :class="theme === 'dark'
                    ? 'bg-secondary-900 border-secondary-800 text-white'
                    : 'bg-white border-neutral-300 text-neutral-900'"
                >
                  <option value="">全部船班</option>
                  <option v-for="f in dayFlights" :key="f.id" :value="f.id">
                    {{ f.departureTime }} {{ f.shipName }} ({{ getSegmentLabel(f.routeSegmentId) }})
                  </option>
                </select>
              </div>
            </div>
          </BaseCard>

          <BaseCard padding="md">
            <table class="w-full text-sm">
              <thead>
                <tr
                  class="text-xs uppercase font-medium border-b"
                  :class="theme === 'dark' ? 'text-neutral-400 border-secondary-800' : 'text-neutral-700 border-neutral-200'"
                >
                  <th class="text-left px-3 py-2.5">時間</th>
                  <th class="text-left px-3 py-2.5">船隻</th>
                  <th class="text-left px-3 py-2.5">航段</th>
                  <th class="text-right px-3 py-2.5">已售</th>
                  <th class="text-right px-3 py-2.5">最大載客</th>
                  <th class="text-right px-3 py-2.5">載客率</th>
                  <th class="text-left px-3 py-2.5">票種人數分佈</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="f in visibleFlights"
                  :key="f.id"
                  class="border-b last:border-0"
                  :class="theme === 'dark' ? 'border-secondary-800' : 'border-neutral-100'"
                >
                  <td class="px-3 py-3 font-mono font-medium" :class="theme === 'dark' ? 'text-white' : 'text-neutral-900'">
                    {{ f.departureTime }}
                  </td>
                  <td class="px-3 py-3" :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'">
                    {{ f.shipName }}
                  </td>
                  <td class="px-3 py-3" :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'">
                    {{ getSegmentLabel(f.routeSegmentId) }}
                  </td>
                  <td class="px-3 py-3 text-right tabular-nums font-medium" :class="theme === 'dark' ? 'text-white' : 'text-neutral-900'">
                    {{ f.currentPassengers }}
                  </td>
                  <td class="px-3 py-3 text-right tabular-nums" :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'">
                    {{ f.maxCapacity }}
                  </td>
                  <td class="px-3 py-3 text-right tabular-nums">
                    <span
                      :class="
                        f.maxCapacity > 0 && f.currentPassengers / f.maxCapacity >= 0.8
                          ? 'text-orange-500 font-medium'
                          : f.maxCapacity > 0 && f.currentPassengers / f.maxCapacity >= 0.5
                            ? 'text-amber-500 font-medium'
                            : theme === 'dark' ? 'text-green-400' : 'text-green-600'
                      "
                    >
                      {{ f.maxCapacity > 0 ? Math.round((f.currentPassengers / f.maxCapacity) * 100) : 0 }}%
                    </span>
                  </td>
                  <td class="px-3 py-3">
                    <div class="flex flex-wrap gap-1.5">
                      <span
                        v-for="b in statsForFlight(f).byType"
                        :key="b.type"
                        class="px-2 py-0.5 text-xs rounded-full"
                        :class="theme === 'dark' ? 'bg-primary-900/40 text-primary-300' : 'bg-primary-100 text-primary-700'"
                      >
                        {{ b.type }} × {{ b.count }}
                      </span>
                      <span
                        v-if="statsForFlight(f).byType.length === 0"
                        class="text-xs"
                        :class="theme === 'dark' ? 'text-neutral-500' : 'text-neutral-400'"
                      >
                        —
                      </span>
                    </div>
                  </td>
                </tr>
                <tr v-if="!visibleFlights.length">
                  <td
                    colspan="7"
                    class="px-3 py-12 text-center"
                    :class="theme === 'dark' ? 'text-neutral-500' : 'text-neutral-400'"
                  >
                    {{ selectedDate }} 沒有符合條件的船班
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
