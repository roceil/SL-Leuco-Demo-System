<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useSidebar } from '@/composables/useSidebar'
import { useTheme } from '@/composables/useTheme'
import { useSchedules } from '@/composables/useSchedules'
import { useShips } from '@/composables/useShips'
import { useRouteStore } from '@/stores/route'
import type { ScheduleFormData } from '@/types/schedule'
import { ScheduleType, ScheduleStatus } from '@/types/schedule'
import Navbar from '@/components/Navbar.vue'
import Sidebar from '@/components/Sidebar.vue'
import PageContainer from '@/components/ui/PageContainer.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import FlightCalendar from '@/components/FlightCalendar.vue'
import {
  CalendarIcon,
  CalendarDaysIcon,
  PlusIcon,
  XMarkIcon,
  CheckIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ClockIcon,
  UserGroupIcon
} from '@heroicons/vue/24/outline'

const router = useRouter()
const { isCollapsed } = useSidebar()
const { theme } = useTheme()
const {
  schedules,
  statistics,
  addSchedule,
  updateSchedule,
  deleteSchedule,
  getRouteName,
  ScheduleType: ST,
  ScheduleStatus: SS
} = useSchedules()

const { activeShips } = useShips()
const routeStore = useRouteStore()

// 當前選擇的航段（預設為全部）
const activeRouteSegmentId = ref<string | null>(null)

// 選擇的日期（用於顯示當日船班）
const selectedDate = ref<string | null>(null)

// Modal 控制
const showModal = ref(false)
const isEditing = ref(false)
const currentScheduleId = ref<string | null>(null)

// §3.4.2 批次建立（依星期）
const showBatchModal = ref(false)
const batchForm = ref({
  routeSegmentId: '',
  shipId: '',
  dateFrom: new Date().toISOString().split('T')[0] as string,
  dateTo: '',
  // 預設週一到週日全勾
  weekdays: [true, true, true, true, true, true, true],
  times: [{ time: '07:00' }] as Array<{ time: string }>,
  status: ScheduleStatus.ACTIVE,
  waitlistCapacity: 10,
  reservedResident: 30,
  reservedOnline: 30,
  channelQuotas: { counter: 100, agent: 50 },
  description: '',
})

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六']

function openBatchModal() {
  batchForm.value = {
    routeSegmentId: activeRouteSegmentId.value || '',
    shipId: '',
    dateFrom: new Date().toISOString().split('T')[0] as string,
    dateTo: '',
    weekdays: [true, true, true, true, true, true, true],
    times: [{ time: '07:00' }],
    status: ScheduleStatus.ACTIVE,
    waitlistCapacity: 10,
    reservedResident: 30,
    reservedOnline: 30,
    channelQuotas: { counter: 100, agent: 50 },
    description: '',
  }
  showBatchModal.value = true
}

function addBatchTime() {
  batchForm.value.times.push({ time: '09:00' })
}

function removeBatchTime(idx: number) {
  if (batchForm.value.times.length <= 1) return
  batchForm.value.times.splice(idx, 1)
}

function batchPreviewCount(): number {
  if (!batchForm.value.dateFrom || !batchForm.value.dateTo) return 0
  if (!batchForm.value.times.length) return 0
  let count = 0
  const start = new Date(batchForm.value.dateFrom)
  const end = new Date(batchForm.value.dateTo)
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    if (batchForm.value.weekdays[d.getDay()]) count += batchForm.value.times.length
  }
  return count
}

function submitBatch() {
  const { routeSegmentId, shipId, dateFrom, dateTo, weekdays, times, status,
    waitlistCapacity, reservedResident, reservedOnline, channelQuotas, description } = batchForm.value
  if (!routeSegmentId) { alert('請選擇航段'); return }
  if (!shipId) { alert('請選擇運行船隻'); return }
  if (!dateFrom || !dateTo) { alert('請選擇日期區間'); return }
  if (new Date(dateTo) < new Date(dateFrom)) { alert('結束日期必須大於開始日期'); return }
  if (!weekdays.some(Boolean)) { alert('請至少勾選一個星期'); return }
  if (!times.length) { alert('請至少新增一個時段'); return }

  const expected = batchPreviewCount()
  if (!confirm(`即將建立 ${expected} 筆船班，是否繼續？`)) return

  let created = 0
  const start = new Date(dateFrom)
  const end = new Date(dateTo)
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    if (!weekdays[d.getDay()]) continue
    const dateStr = d.toISOString().split('T')[0] as string
    for (const t of times) {
      try {
        addSchedule({
          type: ScheduleType.FLEXIBLE, // 用 flexible（指定日期）才不會 isDaily 重複建立
          shipId,
          routeSegmentId,
          departureTime: t.time,
          date: dateStr,
          isDaily: false,
          status,
          waitlistCapacity,
          reservedResident,
          reservedOnline,
          channelQuotas,
          description: description || '批次建立',
        })
        created++
      } catch (err) {
        console.error('batch create failed', err)
      }
    }
  }
  alert(`已建立 ${created} 筆船班`)
  showBatchModal.value = false
}

// 顯示當日船班列表
const showDaySchedules = ref(false)

// 表單數據
const formData = ref<ScheduleFormData>({
  type: ScheduleType.REGULAR,
  shipId: '',
  routeSegmentId: '',
  departureTime: '07:00',
  date: '',
  isDaily: true,
  status: ScheduleStatus.ACTIVE,
  waitlistCapacity: 10,
  reservedResident: 30,
  reservedOnline: 30,
  channelQuotas: { counter: 100, agent: 50 },
  description: ''
})

// 過濾後的船班（根據航段）
const filteredSchedules = computed(() => {
  if (!activeRouteSegmentId.value) {
    return schedules.value // 顯示全部
  }
  return schedules.value.filter(schedule => schedule.routeSegmentId === activeRouteSegmentId.value)
})

// 當日船班列表
const daySchedules = computed(() => {
  if (!selectedDate.value) return []

  return filteredSchedules.value
    .filter(schedule => {
      // 固定船班每天都有
      if (schedule.isDaily) return true
      // 機動船班只在指定日期
      return schedule.date === selectedDate.value
    })
    .sort((a, b) => a.departureTime.localeCompare(b.departureTime))
})

// 重置表單
const resetForm = () => {
  formData.value = {
    type: ScheduleType.REGULAR,
    shipId: '',
    routeSegmentId: activeRouteSegmentId.value || '',
    departureTime: '07:00',
    date: '',
    isDaily: true,
    status: ScheduleStatus.ACTIVE,
    waitlistCapacity: 10,
    reservedResident: 30,
    reservedOnline: 30,
    channelQuotas: { counter: 100, agent: 50 },
    description: ''
  }
  currentScheduleId.value = null
  isEditing.value = false
}

// 開啟新增固定船班 Modal
const openAddRegularModal = () => {
  resetForm()
  formData.value.type = ScheduleType.REGULAR
  formData.value.isDaily = true
  formData.value.date = ''
  formData.value.routeSegmentId = activeRouteSegmentId.value || ''
  showModal.value = true
}

// 開啟新增機動船班 Modal（指定日期）
const openAddFlexibleModal = (date?: string) => {
  resetForm()
  formData.value.type = ScheduleType.FLEXIBLE
  formData.value.isDaily = false
  formData.value.date = date || new Date().toISOString().split('T')[0]
  formData.value.routeSegmentId = activeRouteSegmentId.value || ''
  showModal.value = true
}

// 開啟編輯 Modal
const openEditModal = (scheduleId: string) => {
  const schedule = schedules.value.find(s => s.id === scheduleId)
  if (!schedule) return

  formData.value = {
    type: schedule.type,
    shipId: schedule.shipId,
    routeSegmentId: schedule.routeSegmentId,
    departureTime: schedule.departureTime,
    date: schedule.date || '',
    isDaily: schedule.isDaily,
    status: schedule.status,
    waitlistCapacity: schedule.waitlistCapacity ?? 10,
    reservedResident: schedule.reservedResident ?? 30,
    reservedOnline: schedule.reservedOnline ?? 30,
    channelQuotas: schedule.channelQuotas ?? { counter: 100, agent: 50 },
    description: schedule.description || ''
  }
  currentScheduleId.value = scheduleId
  isEditing.value = true
  showModal.value = true
}

// 關閉 Modal
const closeModal = () => {
  showModal.value = false
  resetForm()
}

// 表單驗證
const validateForm = (): string | null => {
  if (!formData.value.routeSegmentId) {
    return '請選擇航段'
  }
  if (!formData.value.shipId) {
    return '請選擇運行船隻'
  }
  if (!formData.value.departureTime) {
    return '請輸入出發時間'
  }
  if (formData.value.type === ScheduleType.FLEXIBLE && !formData.value.date) {
    return '機動船班必須指定日期'
  }
  return null
}

// 提交表單
const handleSubmit = () => {
  const error = validateForm()
  if (error) {
    alert(error)
    return
  }

  try {
    if (isEditing.value && currentScheduleId.value) {
      const success = updateSchedule(currentScheduleId.value, formData.value)
      if (success) {
        alert('船班資料更新成功')
        closeModal()
      } else {
        alert('更新失敗，請稍後再試')
      }
    } else {
      const newSchedule = addSchedule(formData.value)
      alert(`船班新增成功\n船班編號：${newSchedule.id}`)
      closeModal()
    }
  } catch (error) {
    alert(`操作失敗：${error instanceof Error ? error.message : '未知錯誤'}`)
  }
}

// 刪除船班
const handleDelete = (scheduleId: string, scheduleName: string) => {
  if (confirm(`確定要刪除船班「${scheduleName}」嗎？\n\n此操作無法復原。`)) {
    const success = deleteSchedule(scheduleId)
    if (success) {
      alert('船班已刪除')
    } else {
      alert('刪除失敗，請稍後再試')
    }
  }
}

// 處理日期點擊
const handleDateClick = (date: string) => {
  selectedDate.value = date
  showDaySchedules.value = true
}

// 處理新增船班（從日曆）
const handleAddScheduleFromCalendar = (date: string) => {
  openAddFlexibleModal(date)
}

// 處理船班點擊（從日曆）
const handleScheduleClick = (scheduleId: string) => {
  router.push(`/schedule-management/${scheduleId}`)
}

// 查看船班詳情
const viewScheduleDetail = (scheduleId: string) => {
  router.push(`/schedule-management/${scheduleId}`)
}

// 格式化日期
const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'long'
  })
}

// 取得船班類型文字
const getTypeText = (type: ScheduleType): string => {
  return type === ScheduleType.REGULAR ? '固定船班' : '機動船班'
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
          title="船班管理"
          subtitle="管理船班時刻表與航線資訊"
          :icon="CalendarIcon"
          max-width="full"
        >
          <!-- 統計資訊 -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <BaseCard padding="md">
              <div class="flex items-center justify-between">
                <div>
                  <div
                    class="text-sm font-medium mb-1"
                    :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'"
                  >
                    總船班數
                  </div>
                  <div
                    class="text-2xl font-bold"
                    :class="theme === 'dark' ? 'text-white' : 'text-neutral-900'"
                  >
                    {{ statistics.totalSchedules }}
                  </div>
                </div>
                <CalendarIcon class="w-10 h-10" :class="theme === 'dark' ? 'text-primary-400' : 'text-primary-500'" />
              </div>
            </BaseCard>

            <BaseCard padding="md">
              <div class="flex items-center justify-between">
                <div>
                  <div
                    class="text-sm font-medium mb-1"
                    :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'"
                  >
                    固定船班
                  </div>
                  <div class="text-2xl font-bold text-indigo-500">
                    {{ statistics.regularSchedules }}
                  </div>
                </div>
                <CalendarIcon class="w-10 h-10 text-indigo-500" />
              </div>
            </BaseCard>

            <BaseCard padding="md">
              <div class="flex items-center justify-between">
                <div>
                  <div
                    class="text-sm font-medium mb-1"
                    :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'"
                  >
                    機動船班
                  </div>
                  <div class="text-2xl font-bold text-purple-500">
                    {{ statistics.flexibleSchedules }}
                  </div>
                </div>
                <ClockIcon class="w-10 h-10 text-purple-500" />
              </div>
            </BaseCard>

            <BaseCard padding="md">
              <div class="flex items-center justify-between">
                <div>
                  <div
                    class="text-sm font-medium mb-1"
                    :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'"
                  >
                    營運中
                  </div>
                  <div class="text-2xl font-bold text-green-500">
                    {{ statistics.activeSchedules }}
                  </div>
                </div>
                <CheckIcon class="w-10 h-10 text-green-500" />
              </div>
            </BaseCard>

            <BaseCard padding="md">
              <div class="flex items-center justify-between">
                <div>
                  <div
                    class="text-sm font-medium mb-1"
                    :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'"
                  >
                    今日船班
                  </div>
                  <div class="text-2xl font-bold text-amber-500">
                    {{ statistics.todaySchedules }}
                  </div>
                </div>
                <UserGroupIcon class="w-10 h-10 text-amber-500" />
              </div>
            </BaseCard>
          </div>

          <!-- 航段篩選 -->
          <div class="mb-6">
            <label
              class="block text-sm font-semibold mb-2"
              :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
            >
              航段篩選
            </label>
            <select
              v-model="activeRouteSegmentId"
              class="w-full md:w-80 px-4 py-3 border rounded-lg transition-all outline-none font-medium"
              :class="
                theme === 'dark'
                  ? 'bg-secondary-900 border-secondary-800 text-white focus:border-primary-500'
                  : 'bg-white border-neutral-300 text-neutral-900 focus:border-primary-500'
              "
            >
              <option :value="null">全部航段</option>
              <option
                v-for="segment in routeStore.activeRouteSegments"
                :key="segment.id"
                :value="segment.id"
              >
                {{ getRouteName(segment.id) }}
              </option>
            </select>
          </div>

          <!-- 操作按鈕 -->
          <div class="flex gap-3 mb-6 flex-wrap">
            <BaseButton
              variant="primary"
              :icon="PlusIcon"
              @click="openAddRegularModal"
            >
              新增固定船班
            </BaseButton>
            <BaseButton
              variant="secondary"
              :icon="PlusIcon"
              @click="openAddFlexibleModal()"
            >
              新增機動船班
            </BaseButton>
            <BaseButton
              variant="outline"
              :icon="CalendarDaysIcon"
              @click="openBatchModal"
            >
              批次建立（依星期）
            </BaseButton>
          </div>

          <!-- 日曆視圖 -->
          <BaseCard padding="lg" class="mb-6">
            <FlightCalendar
              :schedules="filteredSchedules"
              @date-click="handleDateClick"
              @add-schedule="handleAddScheduleFromCalendar"
              @schedule-click="handleScheduleClick"
            />
          </BaseCard>

          <!-- 當日船班列表（當選擇日期時顯示） -->
          <BaseCard
            v-if="showDaySchedules && selectedDate"
            padding="lg"
            class="mb-6"
          >
            <template #actions>
              <button
                @click="showDaySchedules = false"
                class="text-2xl leading-none transition-colors"
                :class="theme === 'dark' ? 'text-neutral-400 hover:text-neutral-200' : 'text-neutral-400 hover:text-neutral-600'"
              >
                ×
              </button>
            </template>

            <h3
              class="text-xl font-bold mb-4"
              :class="theme === 'dark' ? 'text-white' : 'text-neutral-900'"
            >
              {{ formatDate(selectedDate) }} 的船班
            </h3>

            <div class="space-y-3">
              <div
                v-for="schedule in daySchedules"
                :key="schedule.id"
                :class="[
                  'flex items-center justify-between p-4 rounded-lg transition-all',
                  theme === 'dark' ? 'bg-secondary-800 hover:bg-secondary-700' : 'bg-neutral-50 hover:bg-neutral-100'
                ]"
              >
                <div class="flex items-center gap-4 flex-1">
                  <div
                    class="text-2xl font-bold"
                    :class="theme === 'dark' ? 'text-primary-400' : 'text-primary-600'"
                  >
                    {{ schedule.departureTime }}
                  </div>
                  <div class="flex-1">
                    <div
                      class="font-semibold mb-1"
                      :class="theme === 'dark' ? 'text-white' : 'text-neutral-900'"
                    >
                      {{ schedule.shipName }}
                    </div>
                    <div
                      class="text-sm"
                      :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'"
                    >
                      載客：{{ schedule.currentPassengers }} / {{ schedule.maxCapacity }} 人
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <span
                      :class="[
                        'px-2 py-1 text-xs font-medium rounded',
                        schedule.type === ST.REGULAR
                          ? theme === 'dark'
                            ? 'bg-indigo-900/30 text-indigo-400'
                            : 'bg-indigo-100 text-indigo-700'
                          : theme === 'dark'
                            ? 'bg-purple-900/30 text-purple-400'
                            : 'bg-purple-100 text-purple-700'
                      ]"
                    >
                      {{ getTypeText(schedule.type) }}
                    </span>
                    <span
                      v-if="schedule.status === SS.CANCELLED"
                      class="px-2 py-1 text-xs font-medium rounded"
                      :class="
                        theme === 'dark'
                          ? 'bg-red-900/30 text-red-400'
                          : 'bg-red-100 text-red-700'
                      "
                    >
                      已取消
                    </span>
                  </div>
                </div>

                <div class="flex gap-2 ml-4">
                  <BaseButton
                    variant="ghost"
                    size="sm"
                    :icon="EyeIcon"
                    @click="viewScheduleDetail(schedule.id)"
                  >
                    詳情
                  </BaseButton>
                  <BaseButton
                    variant="secondary"
                    size="sm"
                    :icon="PencilIcon"
                    @click="openEditModal(schedule.id)"
                  >
                    編輯
                  </BaseButton>
                  <BaseButton
                    variant="danger"
                    size="sm"
                    :icon="TrashIcon"
                    @click="handleDelete(schedule.id, `${schedule.shipName} ${schedule.departureTime}`)"
                  >
                    刪除
                  </BaseButton>
                </div>
              </div>

              <!-- 空狀態 -->
              <div
                v-if="daySchedules.length === 0"
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
                <BaseButton
                  variant="primary"
                  :icon="PlusIcon"
                  @click="openAddFlexibleModal(selectedDate)"
                  class="mt-4"
                >
                  新增船班
                </BaseButton>
              </div>
            </div>
          </BaseCard>
        </PageContainer>
      </main>
    </div>

    <!-- 新增/編輯 Modal -->
    <div
      v-if="showModal"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      @click.self="closeModal"
    >
      <div
        class="rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        :class="theme === 'dark' ? 'bg-secondary-900' : 'bg-white'"
      >
        <!-- Modal Header -->
        <div
          class="sticky top-0 px-6 py-4 flex items-center justify-between rounded-t-xl border-b"
          :class="theme === 'dark' ? 'bg-secondary-900 border-secondary-800' : 'bg-white border-neutral-200'"
        >
          <h2
            class="text-2xl font-bold"
            :class="theme === 'dark' ? 'text-white' : 'text-neutral-900'"
          >
            {{ isEditing ? '編輯船班' : (formData.type === ST.REGULAR ? '新增固定船班' : '新增機動船班') }}
          </h2>
          <button
            @click="closeModal"
            class="text-3xl leading-none transition-colors"
            :class="theme === 'dark' ? 'text-neutral-400 hover:text-neutral-200' : 'text-neutral-400 hover:text-neutral-600'"
          >
            ×
          </button>
        </div>

        <!-- Modal Body -->
        <div class="p-6 space-y-6">
          <!-- 船班類型提示 -->
          <div
            v-if="!isEditing"
            class="p-4 rounded border-l-4"
            :class="
              theme === 'dark'
                ? 'bg-primary-950/30 border-primary-500 text-primary-300'
                : 'bg-primary-50 border-primary-500 text-primary-800'
            "
          >
            <p class="text-sm">
              <span class="font-semibold">
                {{ formData.type === ST.REGULAR ? '固定船班' : '機動船班' }}
              </span>
              {{ formData.type === ST.REGULAR ? ' - 每日重複運行' : ' - 指定日期運行' }}
            </p>
          </div>

          <!-- 航段選擇 -->
          <div class="space-y-2">
            <label
              class="block text-sm font-semibold"
              :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
            >
              航段<span class="text-red-500 ml-1">*</span>
            </label>
            <select
              v-model="formData.routeSegmentId"
              class="w-full px-4 py-3 border rounded-lg transition-all outline-none"
              :class="
                theme === 'dark'
                  ? 'bg-secondary-800 border-secondary-700 text-white focus:border-primary-500'
                  : 'bg-white border-neutral-300 text-neutral-900 focus:border-primary-500'
              "
            >
              <option value="">請選擇航段</option>
              <option
                v-for="segment in routeStore.activeRouteSegments"
                :key="segment.id"
                :value="segment.id"
              >
                {{ getRouteName(segment.id) }}
              </option>
            </select>
          </div>

          <!-- 運行船隻 -->
          <div class="space-y-2">
            <label
              class="block text-sm font-semibold"
              :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
            >
              運行船隻<span class="text-red-500 ml-1">*</span>
            </label>
            <select
              v-model="formData.shipId"
              class="w-full px-4 py-3 border rounded-lg transition-all outline-none"
              :class="
                theme === 'dark'
                  ? 'bg-secondary-800 border-secondary-700 text-white focus:border-primary-500'
                  : 'bg-white border-neutral-300 text-neutral-900 focus:border-primary-500'
              "
            >
              <option value="">請選擇船隻</option>
              <option
                v-for="ship in activeShips"
                :key="ship.id"
                :value="ship.id"
              >
                {{ ship.name }} (載客量: {{ ship.maxCapacity }} 人)
              </option>
            </select>
          </div>

          <!-- 出發時間 -->
          <div class="space-y-2">
            <label
              class="block text-sm font-semibold"
              :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
            >
              出發時間<span class="text-red-500 ml-1">*</span>
            </label>
            <input
              v-model="formData.departureTime"
              type="time"
              class="w-full px-4 py-3 border rounded-lg transition-all outline-none"
              :class="
                theme === 'dark'
                  ? 'bg-secondary-800 border-secondary-700 text-white focus:border-primary-500'
                  : 'bg-white border-neutral-300 text-neutral-900 focus:border-primary-500'
              "
            >
          </div>

          <!-- 日期（僅機動船班） -->
          <div
            v-if="formData.type === ST.FLEXIBLE"
            class="space-y-2"
          >
            <label
              class="block text-sm font-semibold"
              :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
            >
              運行日期<span class="text-red-500 ml-1">*</span>
            </label>
            <input
              v-model="formData.date"
              type="date"
              class="w-full px-4 py-3 border rounded-lg transition-all outline-none"
              :class="
                theme === 'dark'
                  ? 'bg-secondary-800 border-secondary-700 text-white focus:border-primary-500'
                  : 'bg-white border-neutral-300 text-neutral-900 focus:border-primary-500'
              "
            >
          </div>

          <!-- 候補名額（§3.4.2） -->
          <div class="space-y-2">
            <label
              class="block text-sm font-semibold"
              :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
            >
              候補名額
              <span
                class="ml-2 text-xs font-normal"
                :class="theme === 'dark' ? 'text-neutral-500' : 'text-neutral-500'"
              >
                超額訂位用；不計入正式座位庫存，訂購後狀態為「候補中」
              </span>
            </label>
            <input
              v-model.number="formData.waitlistCapacity"
              type="number"
              min="0"
              step="1"
              placeholder="預設 10"
              class="w-full px-4 py-3 border rounded-lg transition-all outline-none"
              :class="
                theme === 'dark'
                  ? 'bg-secondary-800 border-secondary-700 text-white focus:border-primary-500'
                  : 'bg-white border-neutral-300 text-neutral-900 focus:border-primary-500'
              "
            />
          </div>

          <!-- 保留位 / 通路配額（§3.4.2） -->
          <div class="space-y-2">
            <label
              class="block text-sm font-semibold"
              :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
            >
              保留位 / 通路配額
              <span
                class="ml-2 text-xs font-normal"
                :class="theme === 'dark' ? 'text-neutral-500' : 'text-neutral-500'"
              >
                預先把部份座位保留給特定通路或特殊乘客（會佔用 maxCapacity，不另外計算）
              </span>
            </label>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label class="block text-xs mb-1" :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'">
                  居民保留位
                </label>
                <input
                  v-model.number="formData.reservedResident"
                  type="number"
                  min="0"
                  step="1"
                  class="w-full px-3 py-2 border rounded-md text-sm outline-none"
                  :class="theme === 'dark'
                    ? 'bg-secondary-800 border-secondary-700 text-white focus:border-primary-500'
                    : 'bg-white border-neutral-300 text-neutral-900 focus:border-primary-500'"
                />
              </div>
              <div>
                <label class="block text-xs mb-1" :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'">
                  線上保留位
                </label>
                <input
                  v-model.number="formData.reservedOnline"
                  type="number"
                  min="0"
                  step="1"
                  class="w-full px-3 py-2 border rounded-md text-sm outline-none"
                  :class="theme === 'dark'
                    ? 'bg-secondary-800 border-secondary-700 text-white focus:border-primary-500'
                    : 'bg-white border-neutral-300 text-neutral-900 focus:border-primary-500'"
                />
              </div>
              <div>
                <label class="block text-xs mb-1" :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'">
                  現場售票
                </label>
                <input
                  v-model.number="formData.channelQuotas!.counter"
                  type="number"
                  min="0"
                  step="1"
                  class="w-full px-3 py-2 border rounded-md text-sm outline-none"
                  :class="theme === 'dark'
                    ? 'bg-secondary-800 border-secondary-700 text-white focus:border-primary-500'
                    : 'bg-white border-neutral-300 text-neutral-900 focus:border-primary-500'"
                />
              </div>
              <div>
                <label class="block text-xs mb-1" :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'">
                  旅行社/經銷商
                </label>
                <input
                  v-model.number="formData.channelQuotas!.agent"
                  type="number"
                  min="0"
                  step="1"
                  class="w-full px-3 py-2 border rounded-md text-sm outline-none"
                  :class="theme === 'dark'
                    ? 'bg-secondary-800 border-secondary-700 text-white focus:border-primary-500'
                    : 'bg-white border-neutral-300 text-neutral-900 focus:border-primary-500'"
                />
              </div>
            </div>
          </div>

          <!-- 船班狀態 -->
          <div class="space-y-2">
            <label
              class="block text-sm font-semibold"
              :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
            >
              船班狀態<span class="text-red-500 ml-1">*</span>
            </label>
            <select
              v-model="formData.status"
              class="w-full px-4 py-3 border rounded-lg transition-all outline-none"
              :class="
                theme === 'dark'
                  ? 'bg-secondary-800 border-secondary-700 text-white focus:border-primary-500'
                  : 'bg-white border-neutral-300 text-neutral-900 focus:border-primary-500'
              "
            >
              <option :value="SS.ACTIVE">營運中</option>
              <option :value="SS.CANCELLED">已取消</option>
              <option :value="SS.COMPLETED">已完成</option>
            </select>
          </div>

          <!-- 描述備註 -->
          <div class="space-y-2">
            <label
              class="block text-sm font-semibold"
              :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
            >
              描述備註
            </label>
            <textarea
              v-model="formData.description"
              rows="4"
              placeholder="輸入船班的相關描述或備註..."
              class="w-full px-4 py-3 border rounded-lg transition-all resize-none outline-none"
              :class="
                theme === 'dark'
                  ? 'bg-secondary-800 border-secondary-700 text-white focus:border-primary-500'
                  : 'bg-white border-neutral-300 text-neutral-900 focus:border-primary-500'
              "
            ></textarea>
          </div>
        </div>

        <!-- Modal Footer -->
        <div
          class="sticky bottom-0 px-6 py-4 flex gap-3 justify-end border-t rounded-b-xl"
          :class="theme === 'dark' ? 'bg-secondary-900 border-secondary-800' : 'bg-neutral-50 border-neutral-200'"
        >
          <BaseButton
            variant="ghost"
            :icon="XMarkIcon"
            @click="closeModal"
          >
            取消
          </BaseButton>
          <BaseButton
            variant="primary"
            :icon="CheckIcon"
            @click="handleSubmit"
          >
            {{ isEditing ? '更新' : '新增' }}
          </BaseButton>
        </div>
      </div>
    </div>

    <!-- §3.4.2 批次建立 Modal -->
    <div
      v-if="showBatchModal"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      @click.self="showBatchModal = false"
    >
      <div
        class="rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
        :class="theme === 'dark' ? 'bg-secondary-900' : 'bg-white'"
      >
        <div
          class="sticky top-0 px-6 py-4 flex items-center justify-between border-b rounded-t-xl"
          :class="theme === 'dark' ? 'bg-secondary-900 border-secondary-800' : 'bg-white border-neutral-200'"
        >
          <h2 class="text-2xl font-bold" :class="theme === 'dark' ? 'text-white' : 'text-neutral-900'">
            批次建立船班
          </h2>
          <button @click="showBatchModal = false" class="text-3xl leading-none" :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-500'">×</button>
        </div>

        <div class="p-6 space-y-5">
          <!-- 航段 + 船隻 -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-semibold mb-1.5" :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'">
                航段 <span class="text-red-500">*</span>
              </label>
              <select
                v-model="batchForm.routeSegmentId"
                class="w-full px-3 py-2.5 rounded-md border"
                :class="theme === 'dark'
                  ? 'bg-secondary-800 border-secondary-700 text-white'
                  : 'bg-white border-neutral-300 text-neutral-900'"
              >
                <option value="">請選擇航段</option>
                <option v-for="seg in routeStore.activeRouteSegments" :key="seg.id" :value="seg.id">
                  {{ getRouteName(seg.id) }}
                </option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-semibold mb-1.5" :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'">
                運行船隻 <span class="text-red-500">*</span>
              </label>
              <select
                v-model="batchForm.shipId"
                class="w-full px-3 py-2.5 rounded-md border"
                :class="theme === 'dark'
                  ? 'bg-secondary-800 border-secondary-700 text-white'
                  : 'bg-white border-neutral-300 text-neutral-900'"
              >
                <option value="">請選擇船隻</option>
                <option v-for="ship in activeShips" :key="ship.id" :value="ship.id">
                  {{ ship.name }} ({{ ship.maxCapacity }} 人)
                </option>
              </select>
            </div>
          </div>

          <!-- 日期區間 -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-semibold mb-1.5" :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'">
                開始日期 <span class="text-red-500">*</span>
              </label>
              <input
                v-model="batchForm.dateFrom"
                type="date"
                class="w-full px-3 py-2.5 rounded-md border"
                :class="theme === 'dark'
                  ? 'bg-secondary-800 border-secondary-700 text-white'
                  : 'bg-white border-neutral-300 text-neutral-900'"
              />
            </div>
            <div>
              <label class="block text-sm font-semibold mb-1.5" :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'">
                結束日期 <span class="text-red-500">*</span>
              </label>
              <input
                v-model="batchForm.dateTo"
                type="date"
                class="w-full px-3 py-2.5 rounded-md border"
                :class="theme === 'dark'
                  ? 'bg-secondary-800 border-secondary-700 text-white'
                  : 'bg-white border-neutral-300 text-neutral-900'"
              />
            </div>
          </div>

          <!-- 星期別 -->
          <div>
            <label class="block text-sm font-semibold mb-1.5" :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'">
              星期 <span class="text-red-500">*</span>
              <span class="ml-2 text-xs font-normal" :class="theme === 'dark' ? 'text-neutral-500' : 'text-neutral-500'">
                可多選；空白日期區間中該星期的日期都會建立
              </span>
            </label>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="(label, i) in WEEKDAY_LABELS"
                :key="i"
                type="button"
                @click="batchForm.weekdays[i] = !batchForm.weekdays[i]"
                :class="[
                  'w-10 h-10 rounded-full text-sm font-medium border transition-colors',
                  batchForm.weekdays[i]
                    ? theme === 'dark'
                      ? 'bg-primary-700 border-primary-700 text-white'
                      : 'bg-primary-500 border-primary-500 text-white'
                    : theme === 'dark'
                      ? 'border-secondary-700 text-neutral-400 hover:bg-secondary-800'
                      : 'border-neutral-300 text-neutral-500 hover:bg-neutral-100'
                ]"
              >
                {{ label }}
              </button>
            </div>
          </div>

          <!-- 時段（多筆） -->
          <div>
            <label class="block text-sm font-semibold mb-1.5" :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'">
              時段 <span class="text-red-500">*</span>
              <span class="ml-2 text-xs font-normal" :class="theme === 'dark' ? 'text-neutral-500' : 'text-neutral-500'">
                每個時段都會在每個符合條件的日期建立一筆船班
              </span>
            </label>
            <div class="space-y-2">
              <div
                v-for="(t, idx) in batchForm.times"
                :key="idx"
                class="flex items-center gap-2"
              >
                <input
                  v-model="t.time"
                  type="time"
                  class="px-3 py-2 rounded-md border"
                  :class="theme === 'dark'
                    ? 'bg-secondary-800 border-secondary-700 text-white'
                    : 'bg-white border-neutral-300 text-neutral-900'"
                />
                <button
                  v-if="batchForm.times.length > 1"
                  type="button"
                  @click="removeBatchTime(idx)"
                  class="text-sm"
                  :class="theme === 'dark' ? 'text-red-400' : 'text-red-600'"
                >
                  移除
                </button>
              </div>
              <button
                type="button"
                @click="addBatchTime"
                class="text-sm font-medium"
                :class="theme === 'dark' ? 'text-primary-400 hover:text-primary-300' : 'text-primary-600 hover:text-primary-800'"
              >
                + 新增時段
              </button>
            </div>
          </div>

          <!-- 容量設定（沿用單筆建立預設值） -->
          <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label class="block text-xs mb-1" :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'">
                候補名額
              </label>
              <input v-model.number="batchForm.waitlistCapacity" type="number" min="0" class="w-full px-3 py-2 border rounded-md text-sm" :class="theme === 'dark' ? 'bg-secondary-800 border-secondary-700 text-white' : 'bg-white border-neutral-300 text-neutral-900'" />
            </div>
            <div>
              <label class="block text-xs mb-1" :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'">居民保留位</label>
              <input v-model.number="batchForm.reservedResident" type="number" min="0" class="w-full px-3 py-2 border rounded-md text-sm" :class="theme === 'dark' ? 'bg-secondary-800 border-secondary-700 text-white' : 'bg-white border-neutral-300 text-neutral-900'" />
            </div>
            <div>
              <label class="block text-xs mb-1" :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'">線上保留位</label>
              <input v-model.number="batchForm.reservedOnline" type="number" min="0" class="w-full px-3 py-2 border rounded-md text-sm" :class="theme === 'dark' ? 'bg-secondary-800 border-secondary-700 text-white' : 'bg-white border-neutral-300 text-neutral-900'" />
            </div>
            <div>
              <label class="block text-xs mb-1" :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'">現場/旅行社</label>
              <div class="flex gap-1">
                <input v-model.number="batchForm.channelQuotas.counter" type="number" min="0" placeholder="現場" class="w-1/2 px-2 py-2 border rounded-md text-sm" :class="theme === 'dark' ? 'bg-secondary-800 border-secondary-700 text-white' : 'bg-white border-neutral-300 text-neutral-900'" />
                <input v-model.number="batchForm.channelQuotas.agent" type="number" min="0" placeholder="旅行社" class="w-1/2 px-2 py-2 border rounded-md text-sm" :class="theme === 'dark' ? 'bg-secondary-800 border-secondary-700 text-white' : 'bg-white border-neutral-300 text-neutral-900'" />
              </div>
            </div>
          </div>

          <!-- 預覽 -->
          <div
            class="p-4 rounded-lg border"
            :class="theme === 'dark' ? 'bg-secondary-800/50 border-secondary-700' : 'bg-primary-50 border-primary-200'"
          >
            <div class="text-sm" :class="theme === 'dark' ? 'text-primary-300' : 'text-primary-700'">
              預計建立 <span class="font-bold text-lg">{{ batchPreviewCount() }}</span> 筆船班
            </div>
          </div>
        </div>

        <div
          class="sticky bottom-0 px-6 py-4 flex gap-3 justify-end border-t rounded-b-xl"
          :class="theme === 'dark' ? 'bg-secondary-900 border-secondary-800' : 'bg-neutral-50 border-neutral-200'"
        >
          <BaseButton variant="ghost" @click="showBatchModal = false">取消</BaseButton>
          <BaseButton variant="primary" :icon="CheckIcon" @click="submitBatch">
            批次建立 {{ batchPreviewCount() }} 筆
          </BaseButton>
        </div>
      </div>
    </div>
  </div>
</template>
