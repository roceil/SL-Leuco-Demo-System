<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSidebar } from '@/composables/useSidebar'
import { useTheme } from '@/composables/useTheme'
import { useSchedules } from '@/composables/useSchedules'
import { useShips } from '@/composables/useShips'
import type { ScheduleFormData } from '@/types/schedule'
import { ScheduleType, ScheduleStatus, RouteDirection } from '@/types/schedule'
import Navbar from '@/components/Navbar.vue'
import Sidebar from '@/components/Sidebar.vue'
import PageContainer from '@/components/ui/PageContainer.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import {
  CalendarIcon,
  CalendarDaysIcon,
  BoltIcon,
  CheckCircleIcon,
  MapPinIcon,
  PlusIcon,
  PencilIcon,
  XMarkIcon,
  TrashIcon,
  InboxIcon,
  CheckIcon
} from '@heroicons/vue/24/outline'

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
  ScheduleStatus: SS,
  RouteDirection: RD
} = useSchedules()

const { activeShips } = useShips()

// 當前選擇的航線
const activeRoute = ref<RouteDirection>(RouteDirection.TO_ISLAND)

// Modal 控制
const showModal = ref(false)
const isEditing = ref(false)
const currentScheduleId = ref<string | null>(null)

// 表單數據
const formData = ref<ScheduleFormData>({
  type: ScheduleType.REGULAR,
  shipId: '',
  route: RouteDirection.TO_ISLAND,
  departureTime: '07:00',
  date: '',
  isDaily: true,
  status: ScheduleStatus.ACTIVE,
  description: ''
})

// 選擇日期（用於機動船班）
const selectedDate = ref(new Date().toISOString().split('T')[0])

// 根據當前航線和日期篩選的船班列表
const filteredSchedules = computed(() => {
  return schedules.value
    .filter(schedule => {
      // 篩選航線
      if (schedule.route !== activeRoute.value) return false

      // 固定船班總是顯示
      if (schedule.isDaily) return true

      // 機動船班只顯示選定日期的
      return schedule.date === selectedDate.value
    })
    .sort((a, b) => a.departureTime.localeCompare(b.departureTime))
})

// 取得固定船班（用於樣板）
const regularScheduleTemplates = computed(() => {
  return schedules.value
    .filter(s => s.type === ScheduleType.REGULAR && s.route === activeRoute.value)
    .sort((a, b) => a.departureTime.localeCompare(b.departureTime))
})

// 取得船班類型文字
const getTypeText = (type: ScheduleType): string => {
  return type === ScheduleType.REGULAR ? '固定船班' : '機動船班'
}

// 重置表單
const resetForm = () => {
  formData.value = {
    type: ScheduleType.REGULAR,
    shipId: '',
    route: RouteDirection.TO_ISLAND,
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
  formData.value.route = activeRoute.value
  showModal.value = true
}

// 開啟新增機動船班 Modal
const openAddFlexibleModal = () => {
  resetForm()
  formData.value.type = ScheduleType.FLEXIBLE
  formData.value.isDaily = false
  formData.value.date = selectedDate.value
  formData.value.route = activeRoute.value
  showModal.value = true
}

// 開啟編輯 Modal
const openEditModal = (scheduleId: string) => {
  const schedule = schedules.value.find(s => s.id === scheduleId)
  if (!schedule) return

  formData.value = {
    type: schedule.type,
    shipId: schedule.shipId,
    route: schedule.route,
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
      // 更新船班
      const success = updateSchedule(currentScheduleId.value, formData.value)
      if (success) {
        alert('船班資料更新成功')
        closeModal()
      } else {
        alert('更新失敗，請稍後再試')
      }
    } else {
      // 新增船班
      const newSchedule = addSchedule(formData.value)
      const typeText = getTypeText(newSchedule.type)
      alert(
        `${typeText}新增成功\n\n` +
        `船班編號：${newSchedule.id}\n` +
        `船隻：${newSchedule.shipName}\n` +
        `航線：${getRouteName(newSchedule.route)}\n` +
        `出發時間：${newSchedule.departureTime}`
      )
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

// 格式化日期
const formatDate = (dateString?: string): string => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
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
                <CalendarDaysIcon class="w-10 h-10 text-indigo-500" />
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
                <BoltIcon class="w-10 h-10 text-purple-500" />
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
                    今日船班
                  </div>
                  <div class="text-2xl font-bold text-amber-500">
                    {{ statistics.todaySchedules }}
                  </div>
                </div>
                <MapPinIcon class="w-10 h-10 text-amber-500" />
              </div>
            </BaseCard>
          </div>

          <!-- 主要內容區域 -->
          <div class="flex flex-col lg:flex-row gap-6">
            <!-- 左側：船班列表 -->
            <div class="flex-1">
              <!-- 標籤頁 -->
              <div class="flex gap-2 mb-6">
                <button
                  @click="activeRoute = RD.TO_ISLAND"
                  :class="[
                    'flex-1 py-3 px-6 rounded-lg font-semibold transition-all',
                    activeRoute === RD.TO_ISLAND
                      ? theme === 'dark'
                        ? 'bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-lg'
                        : 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg'
                      : theme === 'dark'
                        ? 'bg-secondary-900 text-neutral-300 hover:bg-secondary-800 border border-secondary-800'
                        : 'bg-white text-neutral-700 hover:bg-neutral-50 border border-neutral-200'
                  ]"
                >
                  東港 → 小琉球
                </button>
                <button
                  @click="activeRoute = RD.FROM_ISLAND"
                  :class="[
                    'flex-1 py-3 px-6 rounded-lg font-semibold transition-all',
                    activeRoute === RD.FROM_ISLAND
                      ? theme === 'dark'
                        ? 'bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-lg'
                        : 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg'
                      : theme === 'dark'
                        ? 'bg-secondary-900 text-neutral-300 hover:bg-secondary-800 border border-secondary-800'
                        : 'bg-white text-neutral-700 hover:bg-neutral-50 border border-neutral-200'
                  ]"
                >
                  小琉球 → 東港
                </button>
              </div>

              <!-- 操作列 -->
              <BaseCard padding="md" class="mb-6">
                <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div class="flex items-center gap-4">
                    <label
                      class="text-sm font-medium"
                      :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                    >
                      選擇日期
                    </label>
                    <input
                      v-model="selectedDate"
                      type="date"
                      class="px-4 py-2 border rounded-lg transition-all outline-none"
                      :class="
                        theme === 'dark'
                          ? 'bg-secondary-800 border-secondary-700 text-white focus:border-primary-500'
                          : 'bg-white border-neutral-300 text-neutral-900 focus:border-primary-500'
                      "
                    >
                  </div>
                  <BaseButton
                    variant="primary"
                    :icon="PlusIcon"
                    @click="openAddFlexibleModal"
                  >
                    新增船班
                  </BaseButton>
                </div>
              </BaseCard>

              <!-- 時間軸船班列表 -->
              <BaseCard padding="lg">
                <div class="space-y-6">
                  <div
                    v-for="(schedule, index) in filteredSchedules"
                    :key="schedule.id"
                    class="flex items-start gap-4"
                  >
                    <!-- 時間軸 -->
                    <div class="flex flex-col items-center">
                      <!-- 時間 -->
                      <div class="text-center mb-2">
                        <div
                          class="text-2xl font-bold"
                          :class="theme === 'dark' ? 'text-white' : 'text-neutral-900'"
                        >
                          {{ schedule.departureTime }}
                        </div>
                        <div
                          class="text-xs"
                          :class="theme === 'dark' ? 'text-neutral-500' : 'text-neutral-500'"
                        >
                          {{ formatDate(schedule.date) }}
                        </div>
                      </div>
                      <!-- 圓點和線 -->
                      <div class="flex flex-col items-center">
                        <div
                          class="w-4 h-4 rounded-full border-4 shadow-md"
                          :class="theme === 'dark' ? 'bg-primary-500 border-secondary-900' : 'bg-primary-500 border-white'"
                        ></div>
                        <div
                          v-if="index < filteredSchedules.length - 1"
                          class="w-0.5 h-16"
                          :class="theme === 'dark' ? 'bg-secondary-700' : 'bg-neutral-300'"
                        ></div>
                      </div>
                    </div>

                    <!-- 船班卡片 -->
                    <div class="flex-1 -mt-2">
                      <div
                        class="rounded-lg p-5 shadow-lg hover:shadow-xl transition-all"
                        :class="
                          theme === 'dark'
                            ? 'bg-gradient-to-r from-primary-900 to-primary-800 text-white'
                            : 'bg-gradient-to-r from-primary-500 to-primary-600 text-white'
                        "
                      >
                        <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                          <div class="flex-1">
                            <h3 class="text-xl font-bold mb-2">{{ schedule.shipName }} {{ schedule.id }}</h3>
                            <div class="flex flex-wrap items-center gap-4 text-sm">
                              <span class="flex items-center gap-1">
                                <span class="font-medium">載客：</span>
                                {{ schedule.currentPassengers }} / {{ schedule.maxCapacity }} 人
                              </span>
                              <span
                                v-if="!schedule.isDaily"
                                class="px-2 py-1 bg-purple-500 rounded text-xs font-semibold"
                              >
                                機動船班
                              </span>
                              <span
                                v-if="schedule.status === SS.CANCELLED"
                                class="px-2 py-1 bg-red-500 rounded text-xs font-semibold"
                              >
                                已取消
                              </span>
                            </div>
                          </div>
                          <div class="flex gap-2">
                            <button
                              @click="openEditModal(schedule.id)"
                              class="flex items-center gap-2 px-4 py-2 bg-white rounded hover:bg-opacity-90 transition-colors text-sm font-medium"
                              :class="theme === 'dark' ? 'text-primary-600' : 'text-primary-600'"
                            >
                              <PencilIcon class="w-4 h-4" />
                              編輯船班
                            </button>
                            <button
                              @click="handleDelete(schedule.id, `${schedule.shipName} ${schedule.departureTime}`)"
                              class="flex items-center gap-2 px-4 py-2 bg-error bg-opacity-20 rounded hover:bg-opacity-30 transition-colors text-sm font-medium text-white"
                            >
                              <XMarkIcon class="w-4 h-4" />
                              取消船班
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- 空狀態 -->
                  <div
                    v-if="filteredSchedules.length === 0"
                    class="text-center py-12"
                  >
                    <InboxIcon
                      class="w-16 h-16 mx-auto mb-4 opacity-30"
                      :class="theme === 'dark' ? 'text-neutral-600' : 'text-neutral-300'"
                    />
                    <p
                      class="text-lg font-medium"
                      :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-500'"
                    >
                      尚無船班資料
                    </p>
                    <p
                      class="text-sm mt-1"
                      :class="theme === 'dark' ? 'text-neutral-500' : 'text-neutral-400'"
                    >
                      請新增船班
                    </p>
                  </div>
                </div>
              </BaseCard>
            </div>

            <!-- 右側：船班樣板 -->
            <div class="lg:w-96">
              <BaseCard padding="lg" class="lg:sticky lg:top-20">
                <template #actions>
                  <BaseButton
                    variant="primary"
                    size="sm"
                    @click="openAddRegularModal"
                  >
                    匯入
                  </BaseButton>
                </template>

                <h3
                  class="text-lg font-bold mb-4"
                  :class="theme === 'dark' ? 'text-white' : 'text-neutral-900'"
                >
                  平日船班樣板
                </h3>

                <div class="space-y-2">
                  <div
                    class="grid grid-cols-[1fr_2fr_1fr_auto] gap-2 text-xs font-semibold pb-2 border-b"
                    :class="theme === 'dark' ? 'text-neutral-400 border-secondary-800' : 'text-neutral-600 border-neutral-200'"
                  >
                    <div>時間</div>
                    <div>船隻</div>
                    <div>型態</div>
                    <div></div>
                  </div>

                  <div
                    v-for="template in regularScheduleTemplates"
                    :key="template.id"
                    class="grid grid-cols-[1fr_2fr_1fr_auto] gap-2 items-center py-2 rounded transition-colors"
                    :class="theme === 'dark' ? 'hover:bg-secondary-800' : 'hover:bg-neutral-50'"
                  >
                    <div
                      class="text-sm font-medium"
                      :class="theme === 'dark' ? 'text-neutral-200' : 'text-neutral-900'"
                    >
                      {{ template.departureTime }}
                    </div>
                    <div
                      class="text-sm"
                      :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                    >
                      {{ template.shipName }}
                    </div>
                    <div
                      class="text-xs"
                      :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'"
                    >
                      正常
                    </div>
                    <div class="flex gap-1">
                      <button
                        @click="openEditModal(template.id)"
                        class="p-1.5 rounded transition-colors"
                        :class="
                          theme === 'dark'
                            ? 'bg-green-900/30 text-green-400 hover:bg-green-900/50'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        "
                        title="編輯"
                      >
                        <PencilIcon class="w-4 h-4" />
                      </button>
                      <button
                        @click="handleDelete(template.id, `${template.shipName} ${template.departureTime}`)"
                        class="p-1.5 rounded transition-colors"
                        :class="
                          theme === 'dark'
                            ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50'
                            : 'bg-red-100 text-red-700 hover:bg-red-200'
                        "
                        title="刪除"
                      >
                        <TrashIcon class="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <!-- 樣板空狀態 -->
                  <div
                    v-if="regularScheduleTemplates.length === 0"
                    class="text-center py-8"
                    :class="theme === 'dark' ? 'text-neutral-500' : 'text-neutral-400'"
                  >
                    <p class="text-sm">尚無固定船班樣板</p>
                  </div>
                </div>
              </BaseCard>
            </div>
          </div>
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
          <!-- 船班類型（僅新增時顯示提示） -->
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

          <!-- 航線資訊 -->
          <div
            class="p-3 rounded-lg border"
            :class="
              theme === 'dark'
                ? 'bg-secondary-800 border-secondary-700'
                : 'bg-neutral-50 border-neutral-200'
            "
          >
            <p
              class="text-sm"
              :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
            >
              <span class="font-semibold">航線：</span>
              {{ getRouteName(formData.route) }}
            </p>
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
            <p
              class="text-sm"
              :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-500'"
            >
              機動船班僅在指定日期運行
            </p>
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
