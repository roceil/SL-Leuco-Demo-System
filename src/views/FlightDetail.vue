<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSidebar } from '@/composables/useSidebar'
import { useTheme } from '@/composables/useTheme'
import { useSchedules } from '@/composables/useSchedules'
import { usePassengers } from '@/composables/usePassengers'
import Navbar from '@/components/Navbar.vue'
import Sidebar from '@/components/Sidebar.vue'
import PageContainer from '@/components/ui/PageContainer.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import {
  CalendarDaysIcon,
  ClockIcon,
  UserGroupIcon,
  ArrowLeftIcon,
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon as PendingIcon
} from '@heroicons/vue/24/outline'

const route = useRoute()
const router = useRouter()
const { isCollapsed } = useSidebar()
const { theme } = useTheme()

const { getScheduleById, getRouteName } = useSchedules()
const {
  passengers,
  updateFilter,
  executeSearch,
  updateBoardingStatus,
  exportToCSV,
  BoardingStatus
} = usePassengers()

// 取得航班 ID
const scheduleId = route.params.id as string

// 取得航班資訊
const schedule = computed(() => getScheduleById(scheduleId))

// 如果航班不存在，返回列表
if (!schedule.value) {
  router.push('/schedule-management')
}

// 篩選條件
const searchQuery = ref('')
const statusFilter = ref<BoardingStatus | 'all'>('all')
const ticketTypeFilter = ref('')

// 航班的乘客列表
const schedulePassengers = computed(() => {
  let result = passengers.value.filter(p => p.scheduleId === scheduleId)

  // 按搜尋關鍵字篩選
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(
      p =>
        p.name.toLowerCase().includes(query) ||
        p.idNumber.toLowerCase().includes(query) ||
        p.phone.includes(query) ||
        p.ticketType.toLowerCase().includes(query)
    )
  }

  // 按登船狀態篩選
  if (statusFilter.value !== 'all') {
    result = result.filter(p => p.boardingStatus === statusFilter.value)
  }

  // 按票種篩選
  if (ticketTypeFilter.value) {
    result = result.filter(p => p.ticketType === ticketTypeFilter.value)
  }

  return result
})

// 票種列表（從乘客資料中提取）
const ticketTypes = computed(() => {
  const types = new Set<string>()
  passengers.value
    .filter(p => p.scheduleId === scheduleId)
    .forEach(p => types.add(p.ticketType))
  return Array.from(types)
})

// 統計資訊
const scheduleStatistics = computed(() => {
  const all = passengers.value.filter(p => p.scheduleId === scheduleId)
  return {
    total: all.length,
    boarded: all.filter(p => p.boardingStatus === BoardingStatus.BOARDED).length,
    pending: all.filter(p => p.boardingStatus === BoardingStatus.PENDING).length,
    cancelled: all.filter(p => p.boardingStatus === BoardingStatus.CANCELLED).length
  }
})

// 座位使用率
const seatUtilization = computed(() => {
  if (!schedule.value) return 0
  return Math.round((scheduleStatistics.value.total / schedule.value.maxCapacity) * 100)
})

// 返回列表
const goBack = () => {
  router.push('/schedule-management')
}

// 切換登船狀態
const toggleBoardingStatus = (passengerId: string, currentStatus: BoardingStatus) => {
  const newStatus =
    currentStatus === BoardingStatus.PENDING
      ? BoardingStatus.BOARDED
      : currentStatus === BoardingStatus.BOARDED
        ? BoardingStatus.CANCELLED
        : BoardingStatus.PENDING

  if (updateBoardingStatus(passengerId, newStatus)) {
    // 狀態更新成功
  }
}

// 取得狀態文字
const getStatusText = (status: BoardingStatus): string => {
  switch (status) {
    case BoardingStatus.BOARDED:
      return '已登船'
    case BoardingStatus.PENDING:
      return '待登船'
    case BoardingStatus.CANCELLED:
      return '已取消'
    default:
      return '未知'
  }
}

// 取得狀態顏色
const getStatusColor = (status: BoardingStatus): string => {
  switch (status) {
    case BoardingStatus.BOARDED:
      return theme.value === 'dark' ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'
    case BoardingStatus.PENDING:
      return theme.value === 'dark' ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-100 text-amber-700'
    case BoardingStatus.CANCELLED:
      return theme.value === 'dark' ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700'
    default:
      return theme.value === 'dark' ? 'bg-neutral-800 text-neutral-400' : 'bg-neutral-100 text-neutral-600'
  }
}

// 匯出 CSV
const handleExport = () => {
  const csv = exportToCSV(scheduleId)
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', `乘客名單_${scheduleId}_${new Date().toISOString().split('T')[0]}.csv`)
  link.style.visibility = 'hidden'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  alert('乘客名單已匯出')
}

// 格式化日期
const formatDate = (dateString?: string): string => {
  if (!dateString) return new Date().toLocaleDateString('zh-TW')
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'long'
  })
}

onMounted(() => {
  // 設定篩選條件為當前航班
  updateFilter({ scheduleId })
  executeSearch()
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
          :title="`航班詳細資訊 - ${schedule?.id}`"
          :subtitle="`${schedule?.shipName} | ${schedule?.departureTime}`"
          :icon="CalendarDaysIcon"
          max-width="full"
        >
          <!-- 返回按鈕 -->
          <div class="mb-6">
            <BaseButton
              variant="ghost"
              :icon="ArrowLeftIcon"
              @click="goBack"
            >
              返回船班管理
            </BaseButton>
          </div>

          <!-- 航班基本資訊 -->
          <BaseCard padding="lg" class="mb-6">
            <h3
              class="text-lg font-bold mb-4"
              :class="theme === 'dark' ? 'text-white' : 'text-neutral-900'"
            >
              航班資訊
            </h3>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <div
                  class="text-sm mb-1"
                  :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'"
                >
                  船隻名稱
                </div>
                <div
                  class="text-lg font-semibold"
                  :class="theme === 'dark' ? 'text-white' : 'text-neutral-900'"
                >
                  {{ schedule?.shipName }}
                </div>
              </div>

              <div>
                <div
                  class="text-sm mb-1"
                  :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'"
                >
                  航線
                </div>
                <div
                  class="text-lg font-semibold"
                  :class="theme === 'dark' ? 'text-white' : 'text-neutral-900'"
                >
                  {{ schedule ? getRouteName(schedule.routeSegmentId) : '' }}
                </div>
              </div>

              <div>
                <div
                  class="text-sm mb-1"
                  :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'"
                >
                  出發時間
                </div>
                <div
                  class="text-lg font-semibold flex items-center gap-2"
                  :class="theme === 'dark' ? 'text-white' : 'text-neutral-900'"
                >
                  <ClockIcon class="w-5 h-5" />
                  {{ schedule?.departureTime }}
                </div>
              </div>

              <div>
                <div
                  class="text-sm mb-1"
                  :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'"
                >
                  航行日期
                </div>
                <div
                  class="text-lg font-semibold flex items-center gap-2"
                  :class="theme === 'dark' ? 'text-white' : 'text-neutral-900'"
                >
                  <CalendarDaysIcon class="w-5 h-5" />
                  {{ schedule?.date ? formatDate(schedule.date) : '每日運行' }}
                </div>
              </div>
            </div>
          </BaseCard>

          <!-- 統計資訊 -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <BaseCard padding="md">
              <div class="flex items-center justify-between">
                <div>
                  <div
                    class="text-sm font-medium mb-1"
                    :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'"
                  >
                    總乘客數
                  </div>
                  <div
                    class="text-2xl font-bold"
                    :class="theme === 'dark' ? 'text-white' : 'text-neutral-900'"
                  >
                    {{ scheduleStatistics.total }}
                  </div>
                </div>
                <UserGroupIcon class="w-10 h-10" :class="theme === 'dark' ? 'text-primary-400' : 'text-primary-500'" />
              </div>
            </BaseCard>

            <BaseCard padding="md">
              <div class="flex items-center justify-between">
                <div>
                  <div
                    class="text-sm font-medium mb-1"
                    :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'"
                  >
                    已登船
                  </div>
                  <div class="text-2xl font-bold text-green-500">
                    {{ scheduleStatistics.boarded }}
                  </div>
                </div>
                <CheckCircleIcon class="w-10 h-10 text-green-500" />
              </div>
            </BaseCard>

            <BaseCard padding="md">
              <div class="flex items-center justify-between">
                <div>
                  <div
                    class="text-sm font-medium mb-1"
                    :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'"
                  >
                    待登船
                  </div>
                  <div class="text-2xl font-bold text-amber-500">
                    {{ scheduleStatistics.pending }}
                  </div>
                </div>
                <PendingIcon class="w-10 h-10 text-amber-500" />
              </div>
            </BaseCard>

            <BaseCard padding="md">
              <div class="flex items-center justify-between">
                <div>
                  <div
                    class="text-sm font-medium mb-1"
                    :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'"
                  >
                    已取消
                  </div>
                  <div class="text-2xl font-bold text-red-500">
                    {{ scheduleStatistics.cancelled }}
                  </div>
                </div>
                <XCircleIcon class="w-10 h-10 text-red-500" />
              </div>
            </BaseCard>

            <BaseCard padding="md">
              <div class="flex items-center justify-between">
                <div>
                  <div
                    class="text-sm font-medium mb-1"
                    :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'"
                  >
                    座位使用率
                  </div>
                  <div class="text-2xl font-bold text-blue-500">
                    {{ seatUtilization }}%
                  </div>
                </div>
                <div class="text-sm text-neutral-500">
                  {{ scheduleStatistics.total }} / {{ schedule?.maxCapacity }}
                </div>
              </div>
            </BaseCard>
          </div>

          <!-- 篩選與操作列 -->
          <BaseCard padding="md" class="mb-6">
            <div class="flex flex-col lg:flex-row items-start lg:items-center gap-4">
              <!-- 搜尋框 -->
              <div class="flex-1 relative">
                <MagnifyingGlassIcon
                  class="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5"
                  :class="theme === 'dark' ? 'text-neutral-500' : 'text-neutral-400'"
                />
                <BaseInput
                  v-model="searchQuery"
                  placeholder="搜尋姓名、身分證、電話、票種..."
                  class="pl-10"
                />
              </div>

              <!-- 狀態篩選 -->
              <select
                v-model="statusFilter"
                class="px-4 py-2 border rounded-lg transition-all outline-none"
                :class="
                  theme === 'dark'
                    ? 'bg-secondary-800 border-secondary-700 text-white focus:border-primary-500'
                    : 'bg-white border-neutral-300 text-neutral-900 focus:border-primary-500'
                "
              >
                <option value="all">全部狀態</option>
                <option :value="BoardingStatus.BOARDED">已登船</option>
                <option :value="BoardingStatus.PENDING">待登船</option>
                <option :value="BoardingStatus.CANCELLED">已取消</option>
              </select>

              <!-- 票種篩選 -->
              <select
                v-model="ticketTypeFilter"
                class="px-4 py-2 border rounded-lg transition-all outline-none"
                :class="
                  theme === 'dark'
                    ? 'bg-secondary-800 border-secondary-700 text-white focus:border-primary-500'
                    : 'bg-white border-neutral-300 text-neutral-900 focus:border-primary-500'
                "
              >
                <option value="">全部票種</option>
                <option v-for="type in ticketTypes" :key="type" :value="type">
                  {{ type }}
                </option>
              </select>

              <!-- 匯出按鈕 -->
              <BaseButton
                variant="primary"
                :icon="ArrowDownTrayIcon"
                @click="handleExport"
              >
                匯出 CSV
              </BaseButton>
            </div>
          </BaseCard>

          <!-- 乘客名單 -->
          <BaseCard padding="lg">
            <h3
              class="text-lg font-bold mb-4"
              :class="theme === 'dark' ? 'text-white' : 'text-neutral-900'"
            >
              乘客名單 ({{ schedulePassengers.length }} 人)
            </h3>

            <!-- 表格 -->
            <div class="overflow-x-auto">
              <table class="w-full">
                <thead>
                  <tr
                    class="border-b"
                    :class="theme === 'dark' ? 'border-secondary-800' : 'border-neutral-200'"
                  >
                    <th
                      class="text-left py-3 px-4 text-sm font-semibold"
                      :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                    >
                      姓名
                    </th>
                    <th
                      class="text-left py-3 px-4 text-sm font-semibold"
                      :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                    >
                      身分證字號
                    </th>
                    <th
                      class="text-left py-3 px-4 text-sm font-semibold"
                      :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                    >
                      聯絡電話
                    </th>
                    <th
                      class="text-left py-3 px-4 text-sm font-semibold"
                      :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                    >
                      票種
                    </th>
                    <th
                      class="text-left py-3 px-4 text-sm font-semibold"
                      :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                    >
                      座位
                    </th>
                    <th
                      class="text-left py-3 px-4 text-sm font-semibold"
                      :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                    >
                      登船狀態
                    </th>
                    <th
                      class="text-center py-3 px-4 text-sm font-semibold"
                      :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                    >
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="passenger in schedulePassengers"
                    :key="passenger.id"
                    class="border-b transition-colors"
                    :class="
                      theme === 'dark'
                        ? 'border-secondary-800 hover:bg-secondary-800'
                        : 'border-neutral-100 hover:bg-neutral-50'
                    "
                  >
                    <td
                      class="py-3 px-4"
                      :class="theme === 'dark' ? 'text-white' : 'text-neutral-900'"
                    >
                      {{ passenger.name }}
                    </td>
                    <td
                      class="py-3 px-4"
                      :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                    >
                      {{ passenger.idNumber }}
                    </td>
                    <td
                      class="py-3 px-4"
                      :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                    >
                      {{ passenger.phone }}
                    </td>
                    <td
                      class="py-3 px-4"
                      :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                    >
                      {{ passenger.ticketType }}
                    </td>
                    <td
                      class="py-3 px-4"
                      :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                    >
                      {{ passenger.seatNumber || '-' }}
                    </td>
                    <td class="py-3 px-4">
                      <span
                        :class="[
                          'px-2 py-1 text-xs font-medium rounded',
                          getStatusColor(passenger.boardingStatus)
                        ]"
                      >
                        {{ getStatusText(passenger.boardingStatus) }}
                      </span>
                    </td>
                    <td class="py-3 px-4 text-center">
                      <button
                        @click="toggleBoardingStatus(passenger.id, passenger.boardingStatus)"
                        class="px-3 py-1 text-xs font-medium rounded transition-colors"
                        :class="
                          theme === 'dark'
                            ? 'bg-primary-600 hover:bg-primary-700 text-white'
                            : 'bg-primary-500 hover:bg-primary-600 text-white'
                        "
                      >
                        切換狀態
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>

              <!-- 空狀態 -->
              <div
                v-if="schedulePassengers.length === 0"
                class="text-center py-12"
              >
                <UserGroupIcon
                  class="w-16 h-16 mx-auto mb-4 opacity-30"
                  :class="theme === 'dark' ? 'text-neutral-600' : 'text-neutral-300'"
                />
                <p
                  class="text-lg font-medium"
                  :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-500'"
                >
                  {{ searchQuery || statusFilter !== 'all' || ticketTypeFilter ? '無符合條件的乘客' : '尚無乘客資料' }}
                </p>
              </div>
            </div>
          </BaseCard>
        </PageContainer>
      </main>
    </div>
  </div>
</template>
