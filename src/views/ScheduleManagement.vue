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
          <div class="flex gap-3 mb-6">
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
  </div>
</template>
