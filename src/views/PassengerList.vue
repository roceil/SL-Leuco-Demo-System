<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSidebar } from '@/composables/useSidebar'
import { useTheme } from '@/composables/useTheme'
import { usePassengers } from '@/composables/usePassengers'
import { useSchedules } from '@/composables/useSchedules'
import Navbar from '@/components/Navbar.vue'
import Sidebar from '@/components/Sidebar.vue'
import PageContainer from '@/components/ui/PageContainer.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import {
  UsersIcon,
  MagnifyingGlassIcon,
  ArrowUpTrayIcon,
  Cog6ToothIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  DocumentArrowDownIcon,
  ChartBarIcon,
  InboxIcon,
  CheckIcon,
  XMarkIcon,
  FunnelIcon
} from '@heroicons/vue/24/outline'

const { isCollapsed } = useSidebar()
const { theme } = useTheme()
const {
  statistics,
  passengersBySchedule,
  filter,
  uploadRecords,
  autoUploadConfig,
  hasSearched,
  updateFilter,
  executeSearch,
  resetSearch,
  uploadPassengerList,
  updateAutoUploadConfig,
  exportToCSV,
  exportUploadRecordsToCSV,
  BoardingStatus,
  UploadStatus,
  UploadType
} = usePassengers()

const { schedules, getRouteName } = useSchedules()

// Modal 控制
const showConfigModal = ref(false)
const showUploadRecordsModal = ref(false)
const uploading = ref(false)
const uploadingScheduleId = ref<string | null>(null)

// 配置表單
const configForm = ref({
  enabled: autoUploadConfig.value.enabled,
  intervalMinutes: autoUploadConfig.value.intervalMinutes
})

// 搜尋條件表單
const searchForm = ref({
  date: '',
  scheduleId: '',
  name: '',
  idNumber: '',
  phone: ''
})

// 可選的船班列表（根據選擇的日期）
const availableSchedules = computed(() => {
  const date = searchForm.value.date
  if (!date) return []

  return schedules.value.filter(
    (schedule) => schedule.isDaily || schedule.date === date
  )
})

// 執行查詢
const handleSearch = () => {
  // 驗證必填欄位
  if (!searchForm.value.date) {
    alert('請選擇航行日期')
    return
  }

  // 組合搜尋關鍵字（姓名、身分證、電話）
  const searchParts = [
    searchForm.value.name.trim(),
    searchForm.value.idNumber.trim(),
    searchForm.value.phone.trim()
  ].filter(Boolean)

  const searchQuery = searchParts.join(' ')

  // 更新篩選條件
  updateFilter({
    date: searchForm.value.date,
    scheduleId: searchForm.value.scheduleId,
    searchQuery
  })

  // 執行查詢
  executeSearch()
}

// 重置搜尋
const handleReset = () => {
  searchForm.value = {
    date: '',
    scheduleId: '',
    name: '',
    idNumber: '',
    phone: ''
  }
  resetSearch()
}

// 開啟配置 Modal
const openConfigModal = () => {
  configForm.value = {
    enabled: autoUploadConfig.value.enabled,
    intervalMinutes: autoUploadConfig.value.intervalMinutes
  }
  showConfigModal.value = true
}

// 儲存配置
const saveConfig = () => {
  updateAutoUploadConfig({
    enabled: configForm.value.enabled,
    intervalMinutes: configForm.value.intervalMinutes
  })
  showConfigModal.value = false
  alert('自動上傳配置已更新')
}

// 手動上傳
const handleManualUpload = async (scheduleId: string, scheduleName: string) => {
  if (uploading.value) return

  if (
    !confirm(
      `確定要上傳「${scheduleName}」的乘客清單至航港局系統嗎？\n\n此操作將上傳該船班的所有乘客資料。`
    )
  ) {
    return
  }

  uploading.value = true
  uploadingScheduleId.value = scheduleId

  try {
    const success = await uploadPassengerList(scheduleId, scheduleName)
    if (success) {
      alert(`✓ 上傳成功\n\n船班：${scheduleName}\n乘客人數：${passengersBySchedule.value.get(scheduleId)?.length || 0} 人`)
    } else {
      alert('✗ 上傳失敗\n\n請稍後再試或聯絡系統管理員')
    }
  } catch {
    alert('上傳過程發生錯誤，請重試')
  } finally {
    uploading.value = false
    uploadingScheduleId.value = null
  }
}

// 匯出乘客清單
const handleExportCSV = (scheduleId?: string, scheduleName?: string) => {
  const csv = exportToCSV(scheduleId)
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  const filename = scheduleId
    ? `乘客清單_${scheduleName}_${filter.value.date}.csv`
    : `乘客清單_${filter.value.date}.csv`

  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// 匯出上傳記錄
const handleExportUploadRecords = () => {
  const csv = exportUploadRecordsToCSV()
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', `上傳記錄_${new Date().toISOString().split('T')[0]}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// 格式化時間
const formatTime = (isoString: string): string => {
  const date = new Date(isoString)
  return date.toLocaleString('zh-TW', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 取得登船狀態文字
const getBoardingStatusText = (status: typeof BoardingStatus[keyof typeof BoardingStatus]): string => {
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

// 取得登船狀態顏色
const getBoardingStatusColor = (status: typeof BoardingStatus[keyof typeof BoardingStatus]): string => {
  switch (status) {
    case BoardingStatus.BOARDED:
      return 'bg-green-500'
    case BoardingStatus.PENDING:
      return 'bg-amber-500'
    case BoardingStatus.CANCELLED:
      return 'bg-red-500'
    default:
      return 'bg-neutral-500'
  }
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
          title="乘客清單"
          subtitle="查看、管理與上傳乘客資訊至航港局系統"
          :icon="UsersIcon"
          max-width="full"
        >
          <!-- 統計資訊（僅在查詢後顯示） -->
          <div
            v-if="hasSearched && statistics.totalPassengers > 0"
            class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
          >
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
                    {{ statistics.totalPassengers }}
                  </div>
                </div>
                <UsersIcon class="w-10 h-10" :class="theme === 'dark' ? 'text-primary-400' : 'text-primary-500'" />
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
                    {{ statistics.boardedCount }}
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
                    {{ statistics.pendingCount }}
                  </div>
                </div>
                <ClockIcon class="w-10 h-10 text-amber-500" />
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
                    {{ statistics.cancelledCount }}
                  </div>
                </div>
                <XCircleIcon class="w-10 h-10 text-red-500" />
              </div>
            </BaseCard>
          </div>

          <!-- 搜尋條件區塊 -->
          <BaseCard padding="lg" class="mb-6">
            <div class="flex items-center gap-3 mb-6">
              <FunnelIcon class="w-6 h-6" :class="theme === 'dark' ? 'text-primary-400' : 'text-primary-500'" />
              <h3
                class="text-lg font-bold"
                :class="theme === 'dark' ? 'text-white' : 'text-neutral-900'"
              >
                查詢條件
              </h3>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <!-- 航行日期（必填） -->
              <div class="space-y-2">
                <label
                  class="block text-sm font-medium"
                  :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                >
                  航行日期<span class="text-red-500 ml-1">*</span>
                </label>
                <input
                  v-model="searchForm.date"
                  type="date"
                  class="w-full px-4 py-2 border rounded-lg transition-all outline-none"
                  :class="
                    theme === 'dark'
                      ? 'bg-secondary-800 border-secondary-700 text-white focus:border-primary-500'
                      : 'bg-white border-neutral-300 text-neutral-900 focus:border-primary-500'
                  "
                >
              </div>

              <!-- 選擇船班（選填） -->
              <div class="space-y-2">
                <label
                  class="block text-sm font-medium"
                  :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                >
                  選擇船班
                </label>
                <select
                  v-model="searchForm.scheduleId"
                  :disabled="!searchForm.date"
                  class="w-full px-4 py-2 border rounded-lg transition-all outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                  :class="
                    theme === 'dark'
                      ? 'bg-secondary-800 border-secondary-700 text-white focus:border-primary-500'
                      : 'bg-white border-neutral-300 text-neutral-900 focus:border-primary-500'
                  "
                >
                  <option value="">全部船班</option>
                  <option
                    v-for="schedule in availableSchedules"
                    :key="schedule.id"
                    :value="schedule.id"
                  >
                    {{ schedule.departureTime }} - {{ schedule.shipName }} ({{ getRouteName(schedule.route) }})
                  </option>
                </select>
              </div>

              <!-- 姓名 -->
              <div class="space-y-2">
                <label
                  class="block text-sm font-medium"
                  :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                >
                  姓名
                </label>
                <input
                  v-model="searchForm.name"
                  type="text"
                  placeholder="請輸入乘客姓名"
                  class="w-full px-4 py-2 border rounded-lg transition-all outline-none"
                  :class="
                    theme === 'dark'
                      ? 'bg-secondary-800 border-secondary-700 text-white placeholder-neutral-500 focus:border-primary-500'
                      : 'bg-white border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-primary-500'
                  "
                >
              </div>

              <!-- 身分證字號 -->
              <div class="space-y-2">
                <label
                  class="block text-sm font-medium"
                  :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                >
                  身分證字號
                </label>
                <input
                  v-model="searchForm.idNumber"
                  type="text"
                  placeholder="請輸入身分證字號"
                  class="w-full px-4 py-2 border rounded-lg transition-all outline-none"
                  :class="
                    theme === 'dark'
                      ? 'bg-secondary-800 border-secondary-700 text-white placeholder-neutral-500 focus:border-primary-500'
                      : 'bg-white border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-primary-500'
                  "
                >
              </div>

              <!-- 聯絡電話 -->
              <div class="space-y-2">
                <label
                  class="block text-sm font-medium"
                  :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                >
                  聯絡電話
                </label>
                <input
                  v-model="searchForm.phone"
                  type="text"
                  placeholder="請輸入聯絡電話"
                  class="w-full px-4 py-2 border rounded-lg transition-all outline-none"
                  :class="
                    theme === 'dark'
                      ? 'bg-secondary-800 border-secondary-700 text-white placeholder-neutral-500 focus:border-primary-500'
                      : 'bg-white border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-primary-500'
                  "
                >
              </div>
            </div>

            <!-- 操作按鈕 -->
            <div class="flex flex-wrap gap-3 pt-4 border-t" :class="theme === 'dark' ? 'border-secondary-800' : 'border-neutral-200'">
              <BaseButton
                variant="primary"
                :icon="MagnifyingGlassIcon"
                @click="handleSearch"
              >
                查詢
              </BaseButton>
              <BaseButton
                variant="outline"
                :icon="ArrowPathIcon"
                @click="handleReset"
              >
                重置
              </BaseButton>
              <BaseButton
                variant="outline"
                :icon="Cog6ToothIcon"
                @click="openConfigModal"
              >
                自動上傳設定
              </BaseButton>
              <BaseButton
                variant="outline"
                :icon="ChartBarIcon"
                @click="showUploadRecordsModal = true"
              >
                上傳記錄
              </BaseButton>
              <BaseButton
                v-if="hasSearched && passengersBySchedule.size > 0"
                variant="outline"
                :icon="DocumentArrowDownIcon"
                @click="handleExportCSV()"
              >
                匯出 CSV
              </BaseButton>
              <div
                v-if="autoUploadConfig.enabled"
                class="flex items-center gap-2 px-4 py-2 rounded-lg border"
                :class="
                  theme === 'dark'
                    ? 'bg-green-900/20 border-green-700 text-green-400'
                    : 'bg-green-50 border-green-200 text-green-700'
                "
              >
                <CheckCircleIcon class="w-5 h-5" />
                <span class="text-sm font-medium">
                  自動上傳已啟用 ({{ autoUploadConfig.intervalMinutes }} 分鐘)
                </span>
              </div>
            </div>
          </BaseCard>

          <!-- 乘客清單（按船班分組） -->
          <div class="space-y-6">
            <div
              v-for="[scheduleId, passengers] of passengersBySchedule"
              :key="scheduleId"
            >
              <BaseCard padding="none">
                <!-- 船班標題 -->
                <div
                  class="px-6 py-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  :class="theme === 'dark' ? 'border-secondary-800 bg-secondary-800/50' : 'border-neutral-200 bg-neutral-50'"
                >
                  <div>
                    <h3
                      class="text-lg font-bold mb-1"
                      :class="theme === 'dark' ? 'text-white' : 'text-neutral-900'"
                    >
                      {{ passengers[0]!.scheduleName }}
                    </h3>
                    <p
                      class="text-sm"
                      :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'"
                    >
                      {{ passengers[0]!.route }} • 乘客人數：{{ passengers.length }} 人
                    </p>
                  </div>
                  <div class="flex gap-2">
                    <BaseButton
                      variant="outline"
                      size="sm"
                      :icon="DocumentArrowDownIcon"
                      @click="handleExportCSV(scheduleId, passengers[0]!.scheduleName)"
                    >
                      匯出
                    </BaseButton>
                    <BaseButton
                      variant="primary"
                      size="sm"
                      :icon="ArrowUpTrayIcon"
                      :loading="uploading && uploadingScheduleId === scheduleId"
                      :disabled="uploading"
                      @click="handleManualUpload(scheduleId, passengers[0]!.scheduleName)"
                    >
                      {{ uploading && uploadingScheduleId === scheduleId ? '上傳中...' : '上傳至航港局' }}
                    </BaseButton>
                  </div>
                </div>

                <!-- 乘客列表 -->
                <div class="overflow-x-auto">
                  <table
                    class="w-full"
                    :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                  >
                    <thead
                      class="text-sm font-medium border-b"
                      :class="theme === 'dark' ? 'border-secondary-800 bg-secondary-900' : 'border-neutral-200 bg-neutral-50'"
                    >
                      <tr>
                        <th class="text-left py-3 px-6">姓名</th>
                        <th class="text-left py-3 px-6">身分證字號</th>
                        <th class="text-left py-3 px-6">聯絡電話</th>
                        <th class="text-left py-3 px-6">票種</th>
                        <th class="text-left py-3 px-6">座位</th>
                        <th class="text-left py-3 px-6">登船狀態</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y" :class="theme === 'dark' ? 'divide-secondary-800' : 'divide-neutral-200'">
                      <tr
                        v-for="passenger in passengers"
                        :key="passenger.id"
                        class="hover:bg-opacity-50"
                        :class="theme === 'dark' ? 'hover:bg-secondary-800' : 'hover:bg-neutral-50'"
                      >
                        <td class="py-3 px-6 font-medium">{{ passenger.name }}</td>
                        <td class="py-3 px-6 font-mono text-sm">{{ passenger.idNumber }}</td>
                        <td class="py-3 px-6">{{ passenger.phone }}</td>
                        <td class="py-3 px-6">{{ passenger.ticketType }}</td>
                        <td class="py-3 px-6">{{ passenger.seatNumber || '-' }}</td>
                        <td class="py-3 px-6">
                          <span
                            class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold text-white"
                            :class="getBoardingStatusColor(passenger.boardingStatus)"
                          >
                            {{ getBoardingStatusText(passenger.boardingStatus) }}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </BaseCard>
            </div>

            <!-- 空狀態 -->
            <BaseCard
              v-if="hasSearched && passengersBySchedule.size === 0"
              padding="lg"
              class="text-center"
            >
              <InboxIcon
                class="w-16 h-16 mx-auto mb-4 opacity-30"
                :class="theme === 'dark' ? 'text-neutral-600' : 'text-neutral-300'"
              />
              <h3
                class="text-lg font-semibold mb-2"
                :class="theme === 'dark' ? 'text-white' : 'text-neutral-900'"
              >
                查無乘客資料
              </h3>
              <p
                class="text-sm"
                :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-500'"
              >
                請調整查詢條件後重新搜尋
              </p>
            </BaseCard>

            <!-- 未查詢狀態 -->
            <BaseCard
              v-if="!hasSearched"
              padding="lg"
              class="text-center"
            >
              <MagnifyingGlassIcon
                class="w-16 h-16 mx-auto mb-4 opacity-30"
                :class="theme === 'dark' ? 'text-neutral-600' : 'text-neutral-300'"
              />
              <h3
                class="text-lg font-semibold mb-2"
                :class="theme === 'dark' ? 'text-white' : 'text-neutral-900'"
              >
                請設定查詢條件
              </h3>
              <p
                class="text-sm"
                :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-500'"
              >
                請選擇航行日期並點擊「查詢」按鈕
              </p>
            </BaseCard>
          </div>
        </PageContainer>
      </main>
    </div>

    <!-- 自動上傳配置 Modal -->
    <div
      v-if="showConfigModal"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      @click.self="showConfigModal = false"
    >
      <div
        class="rounded-xl shadow-2xl max-w-lg w-full"
        :class="theme === 'dark' ? 'bg-secondary-900' : 'bg-white'"
      >
        <!-- Modal Header -->
        <div
          class="px-6 py-4 flex items-center justify-between border-b"
          :class="theme === 'dark' ? 'border-secondary-800' : 'border-neutral-200'"
        >
          <h2
            class="text-xl font-bold"
            :class="theme === 'dark' ? 'text-white' : 'text-neutral-900'"
          >
            自動上傳設定
          </h2>
          <button
            @click="showConfigModal = false"
            class="text-2xl leading-none transition-colors"
            :class="theme === 'dark' ? 'text-neutral-400 hover:text-neutral-200' : 'text-neutral-400 hover:text-neutral-600'"
          >
            ×
          </button>
        </div>

        <!-- Modal Body -->
        <div class="p-6 space-y-6">
          <!-- 啟用自動上傳 -->
          <div class="flex items-start gap-4">
            <input
              v-model="configForm.enabled"
              type="checkbox"
              id="auto-upload-enabled"
              class="mt-1 w-5 h-5 rounded border transition-colors cursor-pointer"
              :class="
                theme === 'dark'
                  ? 'bg-secondary-800 border-secondary-700'
                  : 'bg-white border-neutral-300'
              "
            >
            <div class="flex-1">
              <label
                for="auto-upload-enabled"
                class="block text-sm font-semibold mb-1 cursor-pointer"
                :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
              >
                啟用自動上傳
              </label>
              <p
                class="text-sm"
                :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-500'"
              >
                系統將根據設定的時間間隔，自動上傳已出發船班的乘客清單至航港局系統
              </p>
            </div>
          </div>

          <!-- 上傳間隔 -->
          <div class="space-y-2">
            <label
              class="block text-sm font-semibold"
              :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
            >
              上傳間隔時間（分鐘）
            </label>
            <input
              v-model.number="configForm.intervalMinutes"
              type="number"
              min="5"
              max="120"
              step="5"
              :disabled="!configForm.enabled"
              class="w-full px-4 py-3 border rounded-lg transition-all outline-none disabled:opacity-50"
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
              建議設定為 30 分鐘，範圍：5-120 分鐘
            </p>
          </div>

          <!-- 上次上傳時間 -->
          <div
            v-if="autoUploadConfig.lastUploadTime"
            class="p-4 rounded-lg border"
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
              <span class="font-medium">上次自動上傳：</span>
              {{ formatTime(autoUploadConfig.lastUploadTime) }}
            </p>
          </div>
        </div>

        <!-- Modal Footer -->
        <div
          class="px-6 py-4 flex gap-3 justify-end border-t"
          :class="theme === 'dark' ? 'border-secondary-800 bg-secondary-900/50' : 'border-neutral-200 bg-neutral-50'"
        >
          <BaseButton
            variant="ghost"
            :icon="XMarkIcon"
            @click="showConfigModal = false"
          >
            取消
          </BaseButton>
          <BaseButton
            variant="primary"
            :icon="CheckIcon"
            @click="saveConfig"
          >
            儲存設定
          </BaseButton>
        </div>
      </div>
    </div>

    <!-- 上傳記錄 Modal -->
    <div
      v-if="showUploadRecordsModal"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      @click.self="showUploadRecordsModal = false"
    >
      <div
        class="rounded-xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col"
        :class="theme === 'dark' ? 'bg-secondary-900' : 'bg-white'"
      >
        <!-- Modal Header -->
        <div
          class="px-6 py-4 flex items-center justify-between border-b"
          :class="theme === 'dark' ? 'border-secondary-800' : 'border-neutral-200'"
        >
          <h2
            class="text-xl font-bold"
            :class="theme === 'dark' ? 'text-white' : 'text-neutral-900'"
          >
            上傳記錄
          </h2>
          <div class="flex items-center gap-3">
            <BaseButton
              variant="outline"
              size="sm"
              :icon="DocumentArrowDownIcon"
              @click="handleExportUploadRecords"
            >
              匯出記錄
            </BaseButton>
            <button
              @click="showUploadRecordsModal = false"
              class="text-2xl leading-none transition-colors"
              :class="theme === 'dark' ? 'text-neutral-400 hover:text-neutral-200' : 'text-neutral-400 hover:text-neutral-600'"
            >
              ×
            </button>
          </div>
        </div>

        <!-- Modal Body -->
        <div class="flex-1 overflow-y-auto p-6">
          <div class="space-y-4">
            <div
              v-for="record in uploadRecords"
              :key="record.id"
              class="p-4 rounded-lg border"
              :class="
                theme === 'dark'
                  ? 'bg-secondary-800 border-secondary-700'
                  : 'bg-white border-neutral-200'
              "
            >
              <div class="flex items-start justify-between gap-4">
                <div class="flex-1">
                  <div class="flex items-center gap-3 mb-2">
                    <h3
                      class="font-semibold"
                      :class="theme === 'dark' ? 'text-white' : 'text-neutral-900'"
                    >
                      {{ record.scheduleName }}
                    </h3>
                    <span
                      class="px-2 py-0.5 rounded text-xs font-semibold"
                      :class="
                        record.uploadType === UploadType.MANUAL
                          ? 'bg-blue-500 text-white'
                          : 'bg-purple-500 text-white'
                      "
                    >
                      {{ record.uploadType === UploadType.MANUAL ? '手動上傳' : '自動上傳' }}
                    </span>
                    <span
                      class="px-2 py-0.5 rounded text-xs font-semibold"
                      :class="
                        record.status === UploadStatus.SUCCESS
                          ? 'bg-green-500 text-white'
                          : record.status === UploadStatus.FAILED
                            ? 'bg-red-500 text-white'
                            : 'bg-amber-500 text-white'
                      "
                    >
                      {{ record.status === UploadStatus.SUCCESS ? '成功' : record.status === UploadStatus.FAILED ? '失敗' : '上傳中' }}
                    </span>
                  </div>
                  <div
                    class="text-sm space-y-1"
                    :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'"
                  >
                    <p>航行日期：{{ record.scheduleDate }}</p>
                    <p>乘客人數：{{ record.passengerCount }} 人</p>
                    <p>上傳時間：{{ formatTime(record.uploadTime) }}</p>
                    <p v-if="record.errorMessage" class="text-red-500 font-medium">
                      錯誤訊息：{{ record.errorMessage }}
                    </p>
                  </div>
                </div>
                <div>
                  <component
                    :is="record.status === UploadStatus.SUCCESS ? CheckCircleIcon : record.status === UploadStatus.FAILED ? XCircleIcon : ArrowPathIcon"
                    class="w-8 h-8"
                    :class="
                      record.status === UploadStatus.SUCCESS
                        ? 'text-green-500'
                        : record.status === UploadStatus.FAILED
                          ? 'text-red-500'
                          : 'text-amber-500 animate-spin'
                    "
                  />
                </div>
              </div>
            </div>

            <!-- 空狀態 -->
            <div
              v-if="uploadRecords.length === 0"
              class="text-center py-12"
            >
              <InboxIcon
                class="w-16 h-16 mx-auto mb-4 opacity-30"
                :class="theme === 'dark' ? 'text-neutral-600' : 'text-neutral-300'"
              />
              <p
                class="text-sm"
                :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-500'"
              >
                尚無上傳記錄
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
