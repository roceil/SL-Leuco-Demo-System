<script setup lang="ts">
/**
 * §3.9 儀表板（即時航班配額）
 * 提供後台人員即時查看當日航班的配額與銷售狀況
 */

import { ref, computed } from 'vue'
import { useSidebar } from '@/composables/useSidebar'
import { useTheme } from '@/composables/useTheme'
import { useSchedules } from '@/composables/useSchedules'
import { useRouteStore } from '@/stores/route'
import Navbar from '@/components/Navbar.vue'
import Sidebar from '@/components/Sidebar.vue'
import PageContainer from '@/components/ui/PageContainer.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import {
  ChartPieIcon,
  CalendarDaysIcon,
  MapIcon,
  TicketIcon,
} from '@heroicons/vue/24/outline'

const { isCollapsed } = useSidebar()
const { theme } = useTheme()
const { schedules } = useSchedules()
const routeStore = useRouteStore()

// 預設今天
const selectedDate = ref(new Date().toISOString().split('T')[0])
// 航段篩選（''=全部）
const selectedSegmentId = ref<string>('')

// 取得有 isActive 的航段
const activeSegments = computed(() => routeStore.routeSegments.filter((s) => s.isActive))

// 顯示用航段名稱
function getSegmentLabel(segmentId: string): string {
  const seg = routeStore.getRouteSegmentWithPorts(segmentId)
  if (!seg) return '—'
  return `${seg.fromPort.name} → ${seg.toPort.name}`
}

// 過濾後的航班（依日期 + 航段）
const filteredFlights = computed(() => {
  return schedules.value
    .filter((s) => {
      // 固定船班每天都顯示，機動船班只在當天
      if (!(s.isDaily || s.date === selectedDate.value)) return false
      if (selectedSegmentId.value && s.routeSegmentId !== selectedSegmentId.value) return false
      // 取消的航班仍顯示（紅字標記）
      return true
    })
    .sort((a, b) => a.departureTime.localeCompare(b.departureTime))
})

// 統計卡
const stats = computed(() => {
  const list = filteredFlights.value
  return {
    flights: list.length,
    totalSeats: list.reduce((sum, f) => sum + f.maxCapacity, 0),
    sold: list.reduce((sum, f) => sum + f.currentPassengers, 0),
    waitlist: list.reduce((sum, f) => sum + (f.currentWaitlist ?? 0), 0),
  }
})

const occupancyRate = computed(() => {
  const { totalSeats, sold } = stats.value
  return totalSeats > 0 ? Math.round((sold / totalSeats) * 100) : 0
})

function loadFactor(flight: { maxCapacity: number; currentPassengers: number }): number {
  return flight.maxCapacity > 0
    ? Math.round((flight.currentPassengers / flight.maxCapacity) * 100)
    : 0
}

function loadColor(rate: number): string {
  if (rate >= 100) return 'bg-red-500'
  if (rate >= 80) return 'bg-orange-500'
  if (rate >= 50) return 'bg-amber-400'
  return 'bg-green-500'
}

function gotoToday() {
  selectedDate.value = new Date().toISOString().split('T')[0]
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
          title="儀表板"
          subtitle="即時查看當日航班的配額與銷售狀況（§3.9）"
          :icon="ChartPieIcon"
          max-width="2xl"
        >
          <!-- 篩選列 -->
          <BaseCard padding="md" class="mb-4">
            <div class="flex flex-wrap items-end gap-4">
              <div>
                <label
                  class="block text-xs mb-1.5"
                  :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'"
                >
                  <CalendarDaysIcon class="w-3.5 h-3.5 inline-block mr-1" />
                  日期
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
                  <MapIcon class="w-3.5 h-3.5 inline-block mr-1" />
                  航段
                </label>
                <select
                  v-model="selectedSegmentId"
                  class="px-3 py-2 rounded-md border text-sm min-w-[200px]"
                  :class="theme === 'dark'
                    ? 'bg-secondary-900 border-secondary-800 text-white'
                    : 'bg-white border-neutral-300 text-neutral-900'"
                >
                  <option value="">全部航段</option>
                  <option v-for="seg in activeSegments" :key="seg.id" :value="seg.id">
                    {{ getSegmentLabel(seg.id) }}
                  </option>
                </select>
              </div>
              <button
                @click="gotoToday"
                class="px-4 py-2 rounded-md text-sm transition-colors"
                :class="theme === 'dark'
                  ? 'bg-secondary-800 text-neutral-300 hover:bg-secondary-700'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'"
              >
                回到今天
              </button>
            </div>
          </BaseCard>

          <!-- 統計卡 -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <BaseCard padding="md">
              <div class="text-xs mb-1" :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'">
                航班數
              </div>
              <div class="text-2xl font-bold" :class="theme === 'dark' ? 'text-white' : 'text-neutral-900'">
                {{ stats.flights }}
              </div>
            </BaseCard>
            <BaseCard padding="md">
              <div class="text-xs mb-1" :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'">
                總座位
              </div>
              <div class="text-2xl font-bold" :class="theme === 'dark' ? 'text-white' : 'text-neutral-900'">
                {{ stats.totalSeats }}
              </div>
            </BaseCard>
            <BaseCard padding="md">
              <div class="text-xs mb-1" :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'">
                已售（載客率）
              </div>
              <div class="flex items-baseline gap-2">
                <div class="text-2xl font-bold" :class="theme === 'dark' ? 'text-white' : 'text-neutral-900'">
                  {{ stats.sold }}
                </div>
                <div class="text-sm font-medium" :class="theme === 'dark' ? 'text-primary-300' : 'text-primary-700'">
                  {{ occupancyRate }}%
                </div>
              </div>
            </BaseCard>
            <BaseCard padding="md">
              <div class="text-xs mb-1" :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'">
                候補中
              </div>
              <div class="text-2xl font-bold text-purple-500">
                {{ stats.waitlist }}
              </div>
            </BaseCard>
          </div>

          <!-- 航班表格 -->
          <BaseCard padding="md">
            <table class="w-full text-sm">
              <thead>
                <tr
                  class="text-xs uppercase font-medium border-b"
                  :class="theme === 'dark' ? 'text-neutral-400 border-secondary-800' : 'text-neutral-700 border-neutral-200'"
                >
                  <th class="text-left px-3 py-2.5">時間</th>
                  <th class="text-left px-3 py-2.5">航段</th>
                  <th class="text-left px-3 py-2.5">船隻</th>
                  <th class="text-right px-3 py-2.5">總座位</th>
                  <th class="text-right px-3 py-2.5">已售</th>
                  <th class="text-right px-3 py-2.5">剩餘</th>
                  <th class="text-right px-3 py-2.5">候補額/已候</th>
                  <th class="text-left px-3 py-2.5 w-32">載客率</th>
                  <th class="text-left px-3 py-2.5">狀態</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="f in filteredFlights"
                  :key="f.id"
                  class="border-b last:border-0"
                  :class="theme === 'dark' ? 'border-secondary-800 hover:bg-secondary-800/50' : 'border-neutral-100 hover:bg-neutral-50'"
                >
                  <td class="px-3 py-3 font-mono font-medium" :class="theme === 'dark' ? 'text-white' : 'text-neutral-900'">
                    {{ f.departureTime }}
                  </td>
                  <td class="px-3 py-3" :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'">
                    {{ getSegmentLabel(f.routeSegmentId) }}
                  </td>
                  <td class="px-3 py-3" :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'">
                    {{ f.shipName }}
                  </td>
                  <td class="px-3 py-3 text-right tabular-nums" :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'">
                    {{ f.maxCapacity }}
                  </td>
                  <td class="px-3 py-3 text-right tabular-nums font-medium" :class="theme === 'dark' ? 'text-white' : 'text-neutral-900'">
                    {{ f.currentPassengers }}
                  </td>
                  <td class="px-3 py-3 text-right tabular-nums">
                    <span
                      :class="
                        f.maxCapacity - f.currentPassengers <= 0
                          ? 'text-red-500 font-medium'
                          : f.maxCapacity - f.currentPassengers <= 10
                            ? 'text-orange-500 font-medium'
                            : theme === 'dark' ? 'text-green-400' : 'text-green-600'
                      "
                    >
                      {{ f.maxCapacity - f.currentPassengers }}
                    </span>
                  </td>
                  <td class="px-3 py-3 text-right tabular-nums" :class="theme === 'dark' ? 'text-purple-300' : 'text-purple-700'">
                    {{ f.waitlistCapacity ?? 0 }} / {{ f.currentWaitlist ?? 0 }}
                  </td>
                  <td class="px-3 py-3">
                    <div class="flex items-center gap-2">
                      <div
                        class="flex-1 h-2 rounded-full overflow-hidden"
                        :class="theme === 'dark' ? 'bg-secondary-800' : 'bg-neutral-100'"
                      >
                        <div
                          :class="['h-full transition-all', loadColor(loadFactor(f))]"
                          :style="{ width: `${Math.min(loadFactor(f), 100)}%` }"
                        ></div>
                      </div>
                      <span class="text-xs tabular-nums" :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'">
                        {{ loadFactor(f) }}%
                      </span>
                    </div>
                  </td>
                  <td class="px-3 py-3">
                    <span
                      v-if="f.status === 'cancelled'"
                      class="text-red-500 font-medium"
                    >
                      已取消
                    </span>
                    <span
                      v-else-if="f.status === 'completed'"
                      class="text-neutral-500"
                    >
                      已完成
                    </span>
                    <span
                      v-else
                      class="text-green-600"
                    >
                      營運中
                    </span>
                  </td>
                </tr>
                <tr v-if="!filteredFlights.length">
                  <td
                    colspan="9"
                    class="px-3 py-12 text-center"
                    :class="theme === 'dark' ? 'text-neutral-500' : 'text-neutral-400'"
                  >
                    <TicketIcon class="w-10 h-10 mx-auto mb-2 opacity-30" />
                    {{ selectedDate }} 沒有符合條件的航班
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
