<script setup lang="ts">
import { ref, computed } from 'vue'
import { useTheme } from '@/composables/useTheme'
import type { Schedule } from '@/types/schedule'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarIcon,
  ClockIcon,
  PlusCircleIcon
} from '@heroicons/vue/24/outline'

interface Props {
  schedules: Schedule[]
  view?: 'month' | 'week' | 'day'
}

const props = withDefaults(defineProps<Props>(), {
  view: 'month'
})

const emit = defineEmits<{
  dateClick: [date: string]
  addSchedule: [date: string]
  scheduleClick: [scheduleId: string]
}>()

const { theme } = useTheme()

// 當前視圖
const currentView = ref(props.view)

// 當前日期
const currentDate = ref(new Date())

// 週的天數
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

// 船隻顏色映射
const shipColors: Record<string, string> = {
  'SHIP001': 'bg-blue-500',
  'SHIP002': 'bg-green-500',
  'SHIP003': 'bg-purple-500',
  'SHIP004': 'bg-amber-500',
  'SHIP005': 'bg-pink-500'
}

// 取得船隻顏色
const getShipColor = (shipId: string): string => {
  return shipColors[shipId] || 'bg-neutral-500'
}

// 當前月份的第一天
const firstDayOfMonth = computed(() => {
  return new Date(currentDate.value.getFullYear(), currentDate.value.getMonth(), 1)
})

// 當前月份的最後一天
const lastDayOfMonth = computed(() => {
  return new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() + 1, 0)
})

// 月份標題
const monthTitle = computed(() => {
  return `${currentDate.value.getFullYear()}年 ${currentDate.value.getMonth() + 1}月`
})

// 週標題
const weekTitle = computed(() => {
  const start = getWeekStart(currentDate.value)
  const end = getWeekEnd(currentDate.value)
  return `${start.getMonth() + 1}月${start.getDate()}日 - ${end.getMonth() + 1}月${end.getDate()}日`
})

// 日標題
const dayTitle = computed(() => {
  const date = currentDate.value
  return `${date.getFullYear()}年 ${date.getMonth() + 1}月 ${date.getDate()}日`
})

// 取得週的開始日期（週日）
const getWeekStart = (date: Date): Date => {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day
  return new Date(d.setDate(diff))
}

// 取得週的結束日期（週六）
const getWeekEnd = (date: Date): Date => {
  const start = getWeekStart(date)
  return new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6)
}

// 產生月曆的日期陣列（包含前後月份的日期以填滿6週）
const calendarDays = computed(() => {
  const days: Date[] = []
  const firstDay = firstDayOfMonth.value
  const lastDay = lastDayOfMonth.value

  // 取得第一天是星期幾（0-6）
  const firstDayOfWeek = firstDay.getDay()

  // 補齊上個月的日期
  const prevMonthLastDay = new Date(firstDay.getFullYear(), firstDay.getMonth(), 0)
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    days.push(new Date(prevMonthLastDay.getFullYear(), prevMonthLastDay.getMonth(), prevMonthLastDay.getDate() - i))
  }

  // 當月的日期
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push(new Date(firstDay.getFullYear(), firstDay.getMonth(), i))
  }

  // 補齊下個月的日期（補齊到6週 = 42天）
  const remainingDays = 42 - days.length
  for (let i = 1; i <= remainingDays; i++) {
    days.push(new Date(lastDay.getFullYear(), lastDay.getMonth() + 1, i))
  }

  return days
})

// 產生週曆的日期陣列
const weekDays = computed(() => {
  const days: Date[] = []
  const start = getWeekStart(currentDate.value)

  for (let i = 0; i < 7; i++) {
    days.push(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i))
  }

  return days
})

// 格式化日期為 YYYY-MM-DD
const formatDate = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// 檢查是否為今天
const isToday = (date: Date): boolean => {
  const today = new Date()
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  )
}

// 檢查是否為當前月份
const isCurrentMonth = (date: Date): boolean => {
  return date.getMonth() === currentDate.value.getMonth()
}

// 取得特定日期的船班
const getSchedulesForDate = (date: Date): Schedule[] => {
  const dateStr = formatDate(date)
  return props.schedules.filter(schedule => {
    // 固定船班每天都有
    if (schedule.isDaily) return true
    // 機動船班只在指定日期
    return schedule.date === dateStr
  })
}

// 取得特定日期的船班數量
const getScheduleCount = (date: Date): number => {
  return getSchedulesForDate(date).length
}

// 取得特定日期的總載運人數
const getTotalPassengers = (date: Date): number => {
  const schedules = getSchedulesForDate(date)
  return schedules.reduce((total, schedule) => total + (schedule.currentPassengers || 0), 0)
}

// 切換到上一個期間
const prevPeriod = () => {
  if (currentView.value === 'month') {
    currentDate.value = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() - 1, 1)
  } else if (currentView.value === 'week') {
    currentDate.value = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth(), currentDate.value.getDate() - 7)
  } else {
    currentDate.value = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth(), currentDate.value.getDate() - 1)
  }
}

// 切換到下一個期間
const nextPeriod = () => {
  if (currentView.value === 'month') {
    currentDate.value = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() + 1, 1)
  } else if (currentView.value === 'week') {
    currentDate.value = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth(), currentDate.value.getDate() + 7)
  } else {
    currentDate.value = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth(), currentDate.value.getDate() + 1)
  }
}

// 回到今天
const goToToday = () => {
  currentDate.value = new Date()
}

// 切換視圖
const switchView = (view: 'month' | 'week' | 'day') => {
  currentView.value = view
}

// 處理日期點擊
const handleDateClick = (date: Date) => {
  emit('dateClick', formatDate(date))
}

// 處理新增船班
const handleAddSchedule = (date: Date) => {
  emit('addSchedule', formatDate(date))
}

// 處理船班點擊
const handleScheduleClick = (scheduleId: string) => {
  emit('scheduleClick', scheduleId)
}
</script>

<template>
  <div class="flight-calendar">
    <!-- 日曆控制列 -->
    <div
      class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 p-4 rounded-lg border"
      :class="
        theme === 'dark'
          ? 'bg-secondary-900 border-secondary-800'
          : 'bg-white border-neutral-200'
      "
    >
      <!-- 左側：導航控制 -->
      <div class="flex items-center gap-3">
        <button
          @click="prevPeriod"
          class="p-2 rounded-lg transition-colors"
          :class="
            theme === 'dark'
              ? 'hover:bg-secondary-800 text-neutral-300'
              : 'hover:bg-neutral-100 text-neutral-700'
          "
        >
          <ChevronLeftIcon class="w-5 h-5" />
        </button>

        <button
          @click="goToToday"
          class="px-4 py-2 rounded-lg font-medium transition-colors"
          :class="
            theme === 'dark'
              ? 'bg-primary-600 hover:bg-primary-700 text-white'
              : 'bg-primary-500 hover:bg-primary-600 text-white'
          "
        >
          今天
        </button>

        <button
          @click="nextPeriod"
          class="p-2 rounded-lg transition-colors"
          :class="
            theme === 'dark'
              ? 'hover:bg-secondary-800 text-neutral-300'
              : 'hover:bg-neutral-100 text-neutral-700'
          "
        >
          <ChevronRightIcon class="w-5 h-5" />
        </button>

        <h2
          class="text-xl font-bold ml-3"
          :class="theme === 'dark' ? 'text-white' : 'text-neutral-900'"
        >
          {{
            currentView === 'month'
              ? monthTitle
              : currentView === 'week'
                ? weekTitle
                : dayTitle
          }}
        </h2>
      </div>

      <!-- 右側：視圖切換 -->
      <div class="flex items-center gap-2">
        <button
          @click="switchView('month')"
          :class="[
            'px-4 py-2 rounded-lg font-medium transition-colors',
            currentView === 'month'
              ? theme === 'dark'
                ? 'bg-primary-600 text-white'
                : 'bg-primary-500 text-white'
              : theme === 'dark'
                ? 'bg-secondary-800 text-neutral-300 hover:bg-secondary-700'
                : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
          ]"
        >
          月
        </button>
        <button
          @click="switchView('week')"
          :class="[
            'px-4 py-2 rounded-lg font-medium transition-colors',
            currentView === 'week'
              ? theme === 'dark'
                ? 'bg-primary-600 text-white'
                : 'bg-primary-500 text-white'
              : theme === 'dark'
                ? 'bg-secondary-800 text-neutral-300 hover:bg-secondary-700'
                : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
          ]"
        >
          週
        </button>
        <button
          @click="switchView('day')"
          :class="[
            'px-4 py-2 rounded-lg font-medium transition-colors',
            currentView === 'day'
              ? theme === 'dark'
                ? 'bg-primary-600 text-white'
                : 'bg-primary-500 text-white'
              : theme === 'dark'
                ? 'bg-secondary-800 text-neutral-300 hover:bg-secondary-700'
                : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
          ]"
        >
          日
        </button>
      </div>
    </div>

    <!-- 月曆視圖 -->
    <div v-if="currentView === 'month'" class="calendar-month">
      <!-- 星期標題 -->
      <div class="grid grid-cols-7 gap-2 mb-2">
        <div
          v-for="day in WEEKDAYS"
          :key="day"
          class="text-center text-sm font-semibold py-2"
          :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'"
        >
          {{ day }}
        </div>
      </div>

      <!-- 日期網格 -->
      <div class="grid grid-cols-7 gap-2">
        <div
          v-for="(date, index) in calendarDays"
          :key="index"
          @click="handleDateClick(date)"
          :class="[
            'min-h-[100px] p-2 rounded-lg border-2 transition-all cursor-pointer',
            isToday(date)
              ? theme === 'dark'
                ? 'border-primary-500 bg-primary-950/30'
                : 'border-primary-500 bg-primary-50'
              : theme === 'dark'
                ? 'border-secondary-800 hover:border-secondary-700 bg-secondary-900'
                : 'border-neutral-200 hover:border-neutral-300 bg-white',
            !isCurrentMonth(date) && 'opacity-40'
          ]"
        >
          <!-- 日期數字 -->
          <div class="flex items-center justify-between mb-1">
            <span
              :class="[
                'text-sm font-semibold',
                isToday(date)
                  ? theme === 'dark'
                    ? 'text-primary-400'
                    : 'text-primary-600'
                  : theme === 'dark'
                    ? 'text-white'
                    : 'text-neutral-900'
              ]"
            >
              {{ date.getDate() }}
            </span>

            <!-- 新增船班按鈕 -->
            <button
              v-if="isCurrentMonth(date)"
              @click.stop="handleAddSchedule(date)"
              class="opacity-0 hover:opacity-100 transition-opacity p-1 rounded"
              :class="
                theme === 'dark'
                  ? 'hover:bg-secondary-800 text-primary-400'
                  : 'hover:bg-neutral-100 text-primary-500'
              "
              title="新增船班"
            >
              <PlusCircleIcon class="w-4 h-4" />
            </button>
          </div>

          <!-- 船班數量與載運人數 -->
          <div
            v-if="getScheduleCount(date) > 0"
            class="mt-2 space-y-1.5"
          >
            <div
              class="flex items-center gap-1.5 text-xs"
              :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
            >
              <CalendarIcon class="w-3.5 h-3.5 flex-shrink-0" />
              <span class="font-medium">{{ getScheduleCount(date) }} 航班</span>
            </div>
            <div
              class="flex items-center gap-1.5 text-xs"
              :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
            >
              <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <span class="font-medium">{{ getTotalPassengers(date) }} 人</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 週曆視圖 -->
    <div v-else-if="currentView === 'week'" class="calendar-week">
      <!-- 星期標題 -->
      <div class="grid grid-cols-7 gap-2 mb-2">
        <div
          v-for="day in WEEKDAYS"
          :key="day"
          class="text-center text-sm font-semibold py-2"
          :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'"
        >
          {{ day }}
        </div>
      </div>

      <!-- 日期網格 -->
      <div class="grid grid-cols-7 gap-2">
        <div
          v-for="(date, index) in weekDays"
          :key="index"
          @click="handleDateClick(date)"
          :class="[
            'min-h-[200px] p-3 rounded-lg border-2 transition-all cursor-pointer',
            isToday(date)
              ? theme === 'dark'
                ? 'border-primary-500 bg-primary-950/30'
                : 'border-primary-500 bg-primary-50'
              : theme === 'dark'
                ? 'border-secondary-800 hover:border-secondary-700 bg-secondary-900'
                : 'border-neutral-200 hover:border-neutral-300 bg-white'
          ]"
        >
          <!-- 日期標題 -->
          <div class="flex items-center justify-between mb-2">
            <span
              :class="[
                'text-lg font-bold',
                isToday(date)
                  ? theme === 'dark'
                    ? 'text-primary-400'
                    : 'text-primary-600'
                  : theme === 'dark'
                    ? 'text-white'
                    : 'text-neutral-900'
              ]"
            >
              {{ date.getDate() }}
            </span>

            <button
              @click.stop="handleAddSchedule(date)"
              class="opacity-0 hover:opacity-100 transition-opacity p-1 rounded"
              :class="
                theme === 'dark'
                  ? 'hover:bg-secondary-800 text-primary-400'
                  : 'hover:bg-neutral-100 text-primary-500'
              "
              title="新增船班"
            >
              <PlusCircleIcon class="w-5 h-5" />
            </button>
          </div>

          <!-- 船班列表 -->
          <div class="space-y-1">
            <div
              v-for="schedule in getSchedulesForDate(date)"
              :key="schedule.id"
              @click.stop="handleScheduleClick(schedule.id)"
              :class="[
                'text-xs px-2 py-1.5 rounded text-white cursor-pointer hover:scale-105 transition-transform',
                getShipColor(schedule.shipId)
              ]"
            >
              <div class="font-semibold">{{ schedule.departureTime }}</div>
              <div class="text-[10px] opacity-90 truncate">{{ schedule.shipName }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 日曆視圖 -->
    <div v-else class="calendar-day">
      <div
        class="p-6 rounded-lg border"
        :class="
          theme === 'dark'
            ? 'bg-secondary-900 border-secondary-800'
            : 'bg-white border-neutral-200'
        "
      >
        <div class="space-y-4">
          <div
            v-for="schedule in getSchedulesForDate(currentDate)"
            :key="schedule.id"
            @click="handleScheduleClick(schedule.id)"
            :class="[
              'p-4 rounded-lg cursor-pointer hover:shadow-lg transition-all',
              theme === 'dark' ? 'bg-secondary-800' : 'bg-neutral-50'
            ]"
          >
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <div class="flex items-center gap-3 mb-2">
                  <ClockIcon
                    class="w-5 h-5"
                    :class="theme === 'dark' ? 'text-primary-400' : 'text-primary-500'"
                  />
                  <span
                    class="text-xl font-bold"
                    :class="theme === 'dark' ? 'text-white' : 'text-neutral-900'"
                  >
                    {{ schedule.departureTime }}
                  </span>
                  <span
                    :class="[
                      'px-2 py-1 text-xs font-medium rounded text-white',
                      getShipColor(schedule.shipId)
                    ]"
                  >
                    {{ schedule.shipName }}
                  </span>
                </div>

                <div
                  class="text-sm"
                  :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'"
                >
                  載客：{{ schedule.currentPassengers }} / {{ schedule.maxCapacity }} 人
                </div>
              </div>
            </div>
          </div>

          <!-- 空狀態 -->
          <div
            v-if="getSchedulesForDate(currentDate).length === 0"
            class="text-center py-12"
          >
            <CalendarIcon
              class="w-16 h-16 mx-auto mb-4 opacity-30"
              :class="theme === 'dark' ? 'text-neutral-600' : 'text-neutral-300'"
            />
            <p
              class="text-lg font-medium"
              :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-500'"
            >
              當日無船班
            </p>
            <button
              @click="handleAddSchedule(currentDate)"
              class="mt-4 px-4 py-2 rounded-lg font-medium transition-colors"
              :class="
                theme === 'dark'
                  ? 'bg-primary-600 hover:bg-primary-700 text-white'
                  : 'bg-primary-500 hover:bg-primary-600 text-white'
              "
            >
              新增船班
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.flight-calendar {
  @apply w-full;
}

.calendar-month,
.calendar-week,
.calendar-day {
  @apply w-full;
}
</style>
