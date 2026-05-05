<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuditLog } from '@/composables/useAuditLog'
import { useSidebar } from '@/composables/useSidebar'
import { useTheme } from '@/composables/useTheme'
import Navbar from '@/components/Navbar.vue'
import Sidebar from '@/components/Sidebar.vue'
import PageContainer from '@/components/ui/PageContainer.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import type { AuditLog, EntityType, ActionType } from '@/types/log'
import {
  ClipboardDocumentListIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/vue/24/outline'
import { exportToXlsx } from '@/composables/useExcelExport'

const { isCollapsed } = useSidebar()
const { theme } = useTheme()
const {
  getAllLogs,
  getActionDisplayName,
  getEntityTypeDisplayName
} = useAuditLog()

// 篩選條件
const filters = ref({
  entityType: '' as EntityType | '',
  action: '' as ActionType | '',
  operatorName: '',
  startDate: '',
  endDate: '',
  searchKeyword: ''
})

// 分頁
const currentPage = ref(1)
const pageSize = ref(50)

// 展開的日誌 ID（用於顯示變更詳情）
const expandedLogIds = ref<Set<string>>(new Set())

// 載入日誌
const logs = ref<AuditLog[]>([])

const loadLogs = () => {
  const options = {
    entityType: filters.value.entityType || undefined,
    action: filters.value.action || undefined,
    startDate: filters.value.startDate || undefined,
    endDate: filters.value.endDate || undefined
  }

  let result = getAllLogs(options)

  // 操作者名稱篩選
  if (filters.value.operatorName) {
    result = result.filter(log =>
      log.operatorName.toLowerCase().includes(filters.value.operatorName.toLowerCase())
    )
  }

  // 關鍵字搜尋（搜尋實體名稱、備註）
  if (filters.value.searchKeyword) {
    const keyword = filters.value.searchKeyword.toLowerCase()
    result = result.filter(log =>
      (log.entityName?.toLowerCase() || '').includes(keyword) ||
      (log.note?.toLowerCase() || '').includes(keyword) ||
      log.entityId.toLowerCase().includes(keyword)
    )
  }

  logs.value = result
}

// 分頁後的日誌
const paginatedLogs = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return logs.value.slice(start, end)
})

// 總頁數
const totalPages = computed(() => {
  return Math.ceil(logs.value.length / pageSize.value)
})

// 切換日誌展開狀態
const toggleLogExpand = (logId: string) => {
  if (expandedLogIds.value.has(logId)) {
    expandedLogIds.value.delete(logId)
  } else {
    expandedLogIds.value.add(logId)
  }
}

// 重置篩選
const resetFilters = () => {
  filters.value = {
    entityType: '',
    action: '',
    operatorName: '',
    startDate: '',
    endDate: '',
    searchKeyword: ''
  }
  currentPage.value = 1
  loadLogs()
}

// 匯出 Excel
const handleExport = async () => {
  await exportToXlsx(
    `\u64cd\u4f5c\u8a18\u9304_${new Date().toISOString().split('T')[0]}`,
    '\u64cd\u4f5c\u8a18\u9304',
    [
      { header: '\u6642\u9593', width: 22 },
      { header: '\u64cd\u4f5c', width: 10 },
      { header: '\u5be6\u9ad4\u985e\u578b', width: 14 },
      { header: '\u5be6\u9ad4\u540d\u7a31', width: 30 },
      { header: '\u64cd\u4f5c\u8005', width: 14 },
      { header: '\u5099\u8a3b', width: 30 },
      { header: '\u8b8a\u66f4\u5167\u5bb9', width: 60 },
    ],
    logs.value.map((log) => [
      new Date(log.timestamp).toLocaleString('zh-TW'),
      getActionDisplayName(log.action),
      getEntityTypeDisplayName(log.entityType),
      log.entityName ?? log.entityId,
      log.operatorName,
      log.note ?? '',
      (log.changes ?? [])
        .map((c) => `${c.displayName ?? c.field}: ${JSON.stringify(c.oldValue)} \u2192 ${JSON.stringify(c.newValue)}`)
        .join('; '),
    ])
  )
}

// 獲取操作類型的樣式
const getActionClass = (action: ActionType) => {
  const baseClasses = 'px-2 py-1 text-xs font-medium rounded'
  switch (action) {
    case 'create':
      return `${baseClasses} ${theme.value === 'dark' ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'}`
    case 'update':
      return `${baseClasses} ${theme.value === 'dark' ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700'}`
    case 'delete':
      return `${baseClasses} ${theme.value === 'dark' ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700'}`
    case 'password_reset':
      return `${baseClasses} ${theme.value === 'dark' ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-100 text-amber-700'}`
    default:
      return `${baseClasses} ${theme.value === 'dark' ? 'bg-neutral-800 text-neutral-300' : 'bg-neutral-100 text-neutral-700'}`
  }
}

// 格式化變更值
const formatChangeValue = (value: unknown): string => {
  if (value === null || value === undefined) return '(空)'
  if (typeof value === 'boolean') return value ? '是' : '否'
  if (Array.isArray(value)) return `[${value.length} 項目]`
  if (typeof value === 'object') return JSON.stringify(value, null, 2)
  return String(value)
}

onMounted(() => {
  loadLogs()
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
          title="操作記錄"
          subtitle="查詢系統操作日誌和審計記錄"
          :icon="ClipboardDocumentListIcon"
          max-width="2xl"
        >
          <!-- 篩選器 -->
          <BaseCard padding="md" class="mb-6">
            <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
              <!-- 實體類型 -->
              <div>
                <label
                  class="block text-sm font-medium mb-2"
                  :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                >
                  實體類型
                </label>
                <select
                  v-model="filters.entityType"
                  :class="[
                    'w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500',
                    theme === 'dark'
                      ? 'bg-secondary-900 border-secondary-700 text-white'
                      : 'bg-white border-neutral-300 text-neutral-900'
                  ]"
                >
                  <option value="">全部</option>
                  <option value="account">帳號</option>
                  <option value="ticket">票種</option>
                  <option value="order">訂單</option>
                  <option value="role">角色</option>
                  <option value="permission">權限</option>
                  <option value="ship">船隻</option>
                  <option value="schedule">航班</option>
                </select>
              </div>

              <!-- 操作類型 -->
              <div>
                <label
                  class="block text-sm font-medium mb-2"
                  :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                >
                  操作類型
                </label>
                <select
                  v-model="filters.action"
                  :class="[
                    'w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500',
                    theme === 'dark'
                      ? 'bg-secondary-900 border-secondary-700 text-white'
                      : 'bg-white border-neutral-300 text-neutral-900'
                  ]"
                >
                  <option value="">全部</option>
                  <option value="create">新增</option>
                  <option value="update">更新</option>
                  <option value="delete">刪除</option>
                  <option value="password_reset">密碼重置</option>
                </select>
              </div>

              <!-- 操作者 -->
              <div>
                <label
                  class="block text-sm font-medium mb-2"
                  :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                >
                  操作者
                </label>
                <BaseInput
                  v-model="filters.operatorName"
                  placeholder="操作者名稱..."
                />
              </div>

              <!-- 開始日期 -->
              <div>
                <label
                  class="block text-sm font-medium mb-2"
                  :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                >
                  開始日期
                </label>
                <input
                  v-model="filters.startDate"
                  type="date"
                  :class="[
                    'w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500',
                    theme === 'dark'
                      ? 'bg-secondary-900 border-secondary-700 text-white'
                      : 'bg-white border-neutral-300 text-neutral-900'
                  ]"
                />
              </div>

              <!-- 結束日期 -->
              <div>
                <label
                  class="block text-sm font-medium mb-2"
                  :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                >
                  結束日期
                </label>
                <input
                  v-model="filters.endDate"
                  type="date"
                  :class="[
                    'w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500',
                    theme === 'dark'
                      ? 'bg-secondary-900 border-secondary-700 text-white'
                      : 'bg-white border-neutral-300 text-neutral-900'
                  ]"
                />
              </div>
            </div>

            <!-- 關鍵字搜尋 -->
            <div class="mb-4">
              <label
                class="block text-sm font-medium mb-2"
                :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
              >
                關鍵字搜尋
              </label>
              <BaseInput
                v-model="filters.searchKeyword"
                placeholder="搜尋實體名稱、備註、ID..."
                :icon="MagnifyingGlassIcon"
              />
            </div>

            <!-- 操作按鈕 -->
            <div class="flex gap-3">
              <BaseButton
                variant="primary"
                :icon="FunnelIcon"
                @click="loadLogs"
              >
                套用篩選
              </BaseButton>
              <BaseButton
                variant="ghost"
                :icon="XMarkIcon"
                @click="resetFilters"
              >
                重置
              </BaseButton>
              <BaseButton
                variant="outline"
                :icon="ArrowDownTrayIcon"
                @click="handleExport"
                class="ml-auto"
              >
                匯出 Excel
              </BaseButton>
            </div>
          </BaseCard>

          <!-- 統計資訊 -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <BaseCard padding="md">
              <div class="text-center">
                <p
                  class="text-sm mb-1"
                  :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'"
                >
                  總記錄數
                </p>
                <p
                  class="text-3xl font-bold"
                  :class="theme === 'dark' ? 'text-white' : 'text-neutral-900'"
                >
                  {{ logs.length }}
                </p>
              </div>
            </BaseCard>

            <BaseCard padding="md">
              <div class="text-center">
                <p
                  class="text-sm mb-1"
                  :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'"
                >
                  當前頁面
                </p>
                <p
                  class="text-3xl font-bold"
                  :class="theme === 'dark' ? 'text-white' : 'text-neutral-900'"
                >
                  {{ currentPage }} / {{ totalPages }}
                </p>
              </div>
            </BaseCard>

            <BaseCard padding="md">
              <div class="text-center">
                <p
                  class="text-sm mb-1"
                  :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'"
                >
                  每頁顯示
                </p>
                <select
                  v-model.number="pageSize"
                  :class="[
                    'w-full px-3 py-2 border rounded-md text-center font-bold text-xl focus:outline-none focus:ring-2 focus:ring-primary-500',
                    theme === 'dark'
                      ? 'bg-secondary-900 border-secondary-700 text-white'
                      : 'bg-white border-neutral-300 text-neutral-900'
                  ]"
                >
                  <option :value="20">20</option>
                  <option :value="50">50</option>
                  <option :value="100">100</option>
                  <option :value="200">200</option>
                </select>
              </div>
            </BaseCard>
          </div>

          <!-- 日誌列表 -->
          <BaseCard padding="none">
            <div class="overflow-x-auto">
              <table class="w-full">
                <thead
                  :class="
                    theme === 'dark'
                      ? 'bg-secondary-800'
                      : 'bg-neutral-50'
                  "
                >
                  <tr>
                    <th
                      class="px-6 py-3 text-left text-xs font-medium uppercase"
                      :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                    >
                      時間
                    </th>
                    <th
                      class="px-6 py-3 text-left text-xs font-medium uppercase"
                      :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                    >
                      操作類型
                    </th>
                    <th
                      class="px-6 py-3 text-left text-xs font-medium uppercase"
                      :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                    >
                      實體
                    </th>
                    <th
                      class="px-6 py-3 text-left text-xs font-medium uppercase"
                      :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                    >
                      操作者
                    </th>
                    <th
                      class="px-6 py-3 text-left text-xs font-medium uppercase"
                      :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                    >
                      備註
                    </th>
                    <th
                      class="px-6 py-3 text-center text-xs font-medium uppercase"
                      :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                    >
                      詳情
                    </th>
                  </tr>
                </thead>
                <tbody
                  :class="[
                    'divide-y',
                    theme === 'dark' ? 'divide-secondary-800' : 'divide-neutral-200'
                  ]"
                >
                  <template v-for="log in paginatedLogs" :key="log.id">
                    <!-- 主要行 -->
                    <tr
                      :class="
                        theme === 'dark'
                          ? 'hover:bg-secondary-800'
                          : 'hover:bg-neutral-50'
                      "
                    >
                      <td
                        class="px-6 py-4 text-sm whitespace-nowrap"
                        :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                      >
                        {{ new Date(log.timestamp).toLocaleString('zh-TW') }}
                      </td>
                      <td class="px-6 py-4 text-sm">
                        <span :class="getActionClass(log.action)">
                          {{ getActionDisplayName(log.action) }}
                        </span>
                      </td>
                      <td
                        class="px-6 py-4 text-sm"
                        :class="theme === 'dark' ? 'text-white' : 'text-neutral-900'"
                      >
                        <div>
                          <span class="font-medium">{{ getEntityTypeDisplayName(log.entityType) }}</span>
                          <span v-if="log.entityName" class="block text-xs" :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-500'">
                            {{ log.entityName }}
                          </span>
                        </div>
                      </td>
                      <td
                        class="px-6 py-4 text-sm"
                        :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                      >
                        {{ log.operatorName }}
                      </td>
                      <td
                        class="px-6 py-4 text-sm"
                        :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'"
                      >
                        {{ log.note || '-' }}
                      </td>
                      <td class="px-6 py-4 text-center">
                        <button
                          v-if="log.changes && log.changes.length > 0"
                          @click="toggleLogExpand(log.id)"
                          :class="[
                            'inline-flex items-center gap-1 text-sm transition-colors',
                            theme === 'dark'
                              ? 'text-primary-400 hover:text-primary-300'
                              : 'text-primary-600 hover:text-primary-800'
                          ]"
                        >
                          <template v-if="expandedLogIds.has(log.id)">
                            <ChevronUpIcon class="w-4 h-4" />
                            收起
                          </template>
                          <template v-else>
                            <ChevronDownIcon class="w-4 h-4" />
                            展開
                          </template>
                        </button>
                        <span v-else class="text-xs" :class="theme === 'dark' ? 'text-neutral-500' : 'text-neutral-400'">
                          無變更
                        </span>
                      </td>
                    </tr>

                    <!-- 變更詳情行 -->
                    <tr v-if="expandedLogIds.has(log.id) && log.changes">
                      <td colspan="6" :class="theme === 'dark' ? 'bg-secondary-950' : 'bg-neutral-50'">
                        <div class="px-6 py-4">
                          <h4 class="text-sm font-medium mb-3" :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'">
                            變更內容：
                          </h4>
                          <div class="space-y-2">
                            <div
                              v-for="(change, index) in log.changes"
                              :key="index"
                              :class="[
                                'p-3 rounded-lg border',
                                theme === 'dark'
                                  ? 'bg-secondary-900 border-secondary-800'
                                  : 'bg-white border-neutral-200'
                              ]"
                            >
                              <div class="flex items-start gap-4">
                                <div class="flex-shrink-0 font-medium" :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'">
                                  {{ change.displayName || change.field }}:
                                </div>
                                <div class="flex-1 grid grid-cols-2 gap-4">
                                  <div>
                                    <div class="text-xs mb-1" :class="theme === 'dark' ? 'text-red-400' : 'text-red-600'">
                                      舊值
                                    </div>
                                    <div
                                      class="text-sm p-2 rounded"
                                      :class="theme === 'dark' ? 'bg-red-950/30 text-red-300' : 'bg-red-50 text-red-700'"
                                    >
                                      {{ formatChangeValue(change.oldValue) }}
                                    </div>
                                  </div>
                                  <div>
                                    <div class="text-xs mb-1" :class="theme === 'dark' ? 'text-green-400' : 'text-green-600'">
                                      新值
                                    </div>
                                    <div
                                      class="text-sm p-2 rounded"
                                      :class="theme === 'dark' ? 'bg-green-950/30 text-green-300' : 'bg-green-50 text-green-700'"
                                    >
                                      {{ formatChangeValue(change.newValue) }}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  </template>
                </tbody>
              </table>

              <!-- 空狀態 -->
              <div
                v-if="paginatedLogs.length === 0"
                class="text-center py-12"
                :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-500'"
              >
                <ClipboardDocumentListIcon class="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p class="text-lg">沒有找到符合條件的操作記錄</p>
              </div>
            </div>

            <!-- 分頁 -->
            <div
              v-if="totalPages > 1"
              :class="[
                'px-6 py-4 border-t flex items-center justify-between',
                theme === 'dark' ? 'border-secondary-800' : 'border-neutral-200'
              ]"
            >
              <div class="text-sm" :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'">
                顯示 {{ (currentPage - 1) * pageSize + 1 }} - {{ Math.min(currentPage * pageSize, logs.length) }} 筆，共 {{ logs.length }} 筆
              </div>
              <div class="flex gap-2">
                <BaseButton
                  variant="outline"
                  size="sm"
                  :disabled="currentPage === 1"
                  @click="currentPage--"
                >
                  上一頁
                </BaseButton>
                <BaseButton
                  variant="outline"
                  size="sm"
                  :disabled="currentPage === totalPages"
                  @click="currentPage++"
                >
                  下一頁
                </BaseButton>
              </div>
            </div>
          </BaseCard>
        </PageContainer>
      </main>
    </div>
  </div>
</template>
