<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSidebar } from '@/composables/useSidebar'
import { useTheme } from '@/composables/useTheme'
import { useWhitelist } from '@/composables/useWhitelist'
import Navbar from '@/components/Navbar.vue'
import Sidebar from '@/components/Sidebar.vue'
import PageContainer from '@/components/ui/PageContainer.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import { SPECIAL_TICKET_TYPES } from '@/constants/mockTickets'
import type { WhitelistEntry } from '@/types/whitelist'
import {
  UsersIcon,
  ArrowLeftIcon,
  PlusIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  CheckIcon
} from '@heroicons/vue/24/outline'

const route = useRoute()
const router = useRouter()
const { isCollapsed } = useSidebar()
const { theme } = useTheme()
const {
  getWhitelistByTicketType,
  addWhitelistEntry,
  updateWhitelistEntry,
  deleteWhitelistEntry,
  batchDeleteWhitelist,
  validateIdNumber,
  validatePhone,
  loading
} = useWhitelist()

// 票種資訊
const ticketTypeId = ref(route.params.ticketTypeId as string)
const ticketType = computed(() =>
  SPECIAL_TICKET_TYPES.find((t) => t.id === ticketTypeId.value)
)

// 白名單資料
const whitelistEntries = getWhitelistByTicketType(ticketTypeId.value)

// 搜尋和篩選
const searchQuery = ref('')
const filteredEntries = computed(() => {
  if (!searchQuery.value.trim()) {
    return whitelistEntries.value
  }

  const query = searchQuery.value.toLowerCase()
  return whitelistEntries.value.filter(
    (entry) =>
      entry.passengerName.toLowerCase().includes(query) ||
      entry.phone.includes(query) ||
      entry.idNumber.toLowerCase().includes(query)
  )
})

// 選擇項目
const selectedIds = ref<Set<string>>(new Set())
const isAllSelected = computed(
  () => filteredEntries.value.length > 0 && selectedIds.value.size === filteredEntries.value.length
)

const toggleSelectAll = () => {
  if (isAllSelected.value) {
    selectedIds.value.clear()
  } else {
    filteredEntries.value.forEach((entry) => selectedIds.value.add(entry.id))
  }
}

const toggleSelect = (id: string) => {
  if (selectedIds.value.has(id)) {
    selectedIds.value.delete(id)
  } else {
    selectedIds.value.add(id)
  }
}

// 新增/編輯表單
const showModal = ref(false)
const editingEntry = ref<WhitelistEntry | null>(null)
const formData = ref({
  passengerName: '',
  phone: '',
  idNumber: '',
  remark: ''
})
const formErrors = ref({
  passengerName: '',
  phone: '',
  idNumber: ''
})

const openAddModal = () => {
  editingEntry.value = null
  formData.value = {
    passengerName: '',
    phone: '',
    idNumber: '',
    remark: ''
  }
  formErrors.value = {
    passengerName: '',
    phone: '',
    idNumber: ''
  }
  showModal.value = true
}

const openEditModal = (entry: WhitelistEntry) => {
  editingEntry.value = entry
  formData.value = {
    passengerName: entry.passengerName,
    phone: entry.phone,
    idNumber: entry.idNumber,
    remark: entry.remark || ''
  }
  formErrors.value = {
    passengerName: '',
    phone: '',
    idNumber: ''
  }
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  editingEntry.value = null
}

// 表單驗證
const validateForm = () => {
  let isValid = true
  formErrors.value = {
    passengerName: '',
    phone: '',
    idNumber: ''
  }

  if (!formData.value.passengerName.trim()) {
    formErrors.value.passengerName = '請輸入乘客姓名'
    isValid = false
  }

  if (!formData.value.phone.trim()) {
    formErrors.value.phone = '請輸入電話號碼'
    isValid = false
  } else if (!validatePhone(formData.value.phone)) {
    formErrors.value.phone = '請輸入有效的手機號碼（09開頭，共10碼）'
    isValid = false
  }

  if (!formData.value.idNumber.trim()) {
    formErrors.value.idNumber = '請輸入身分證字號'
    isValid = false
  } else if (!validateIdNumber(formData.value.idNumber)) {
    formErrors.value.idNumber = '請輸入有效的身分證字號'
    isValid = false
  }

  return isValid
}

// 提交表單
const submitForm = async () => {
  if (!validateForm()) return

  const entryData = {
    ticketTypeId: ticketTypeId.value,
    passengerName: formData.value.passengerName.trim(),
    phone: formData.value.phone.trim(),
    idNumber: formData.value.idNumber.trim().toUpperCase(),
    remark: formData.value.remark.trim(),
    createdBy: '系統管理員'
  }

  let result
  if (editingEntry.value) {
    result = await updateWhitelistEntry(editingEntry.value.id, entryData)
  } else {
    result = await addWhitelistEntry(entryData)
  }

  if (result.success) {
    closeModal()
    alert(editingEntry.value ? '更新成功' : '新增成功')
  } else {
    alert(result.error || '操作失敗')
  }
}

// §3.6.2 啟用/停用 toggle
const toggleEntryActive = async (entry: WhitelistEntry) => {
  await updateWhitelistEntry(entry.id, { isActive: entry.isActive === false ? true : false })
}

// 刪除單筆
const handleDelete = async (id: string, name: string) => {
  if (!confirm(`確定要刪除「${name}」的白名單資格嗎？`)) return

  const result = await deleteWhitelistEntry(id)
  if (result.success) {
    alert('刪除成功')
    selectedIds.value.delete(id)
  } else {
    alert(result.error || '刪除失敗')
  }
}

// 批次刪除
const handleBatchDelete = async () => {
  if (selectedIds.value.size === 0) {
    alert('請先選擇要刪除的項目')
    return
  }

  if (!confirm(`確定要刪除 ${selectedIds.value.size} 筆白名單資料嗎？`)) return

  const result = await batchDeleteWhitelist(Array.from(selectedIds.value))
  if (result.success) {
    alert('批次刪除成功')
    selectedIds.value.clear()
  } else {
    alert(result.error || '批次刪除失敗')
  }
}

// 格式化日期
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 返回列表
const goBack = () => {
  router.push({ name: 'special-ticket-whitelist' })
}

onMounted(() => {
  if (!ticketType.value) {
    alert('找不到該票種')
    goBack()
  }
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
          title="白名單管理"
          :subtitle="ticketType?.name || ''"
          :icon="UsersIcon"
          max-width="2xl"
        >
          <template #actions>
            <BaseButton
              variant="ghost"
              :icon="ArrowLeftIcon"
              @click="goBack"
            >
              返回列表
            </BaseButton>
          </template>

          <!-- 票種資訊卡片 -->
          <BaseCard v-if="ticketType" padding="lg" class="mb-6">
            <div
              class="p-6 rounded-lg text-white"
              :class="
                theme === 'dark'
                  ? 'bg-gradient-to-r from-primary-800 to-primary-700'
                  : 'bg-gradient-to-r from-indigo-600 to-indigo-700'
              "
            >
              <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <h2 class="mb-2 text-2xl font-bold">{{ ticketType.name }}</h2>
                  <p
                    :class="
                      theme === 'dark'
                        ? 'text-primary-100'
                        : 'text-indigo-100'
                    "
                  >
                    {{ ticketType.description }}
                  </p>
                </div>
                <div class="text-right">
                  <p class="mb-1 text-sm opacity-90">優惠價格</p>
                  <p class="text-3xl font-bold">
                    NT$ {{ Math.max(0, ticketType.facePrice - ticketType.discount) }}
                  </p>
                </div>
              </div>
            </div>
          </BaseCard>

          <!-- 操作列 -->
          <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
            <div class="flex flex-wrap items-center gap-3">
              <BaseButton
                variant="primary"
                :icon="PlusIcon"
                @click="openAddModal"
              >
                新增白名單
              </BaseButton>

              <BaseButton
                v-if="selectedIds.size > 0"
                variant="danger"
                :icon="TrashIcon"
                @click="handleBatchDelete"
              >
                刪除 ({{ selectedIds.size }})
              </BaseButton>
            </div>

            <!-- 搜尋 -->
            <div class="flex-1 max-w-md w-full">
              <BaseInput
                v-model="searchQuery"
                placeholder="搜尋姓名、電話或身分證字號..."
                :icon="MagnifyingGlassIcon"
              />
            </div>
          </div>

          <!-- 白名單表格 -->
          <BaseCard padding="none">
            <div class="overflow-x-auto">
              <table
                class="w-full"
                :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
              >
                <thead
                  class="text-sm font-medium border-b"
                  :class="theme === 'dark' ? 'border-secondary-800' : 'border-neutral-200'"
                >
                  <tr>
                    <th class="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        :checked="isAllSelected"
                        @change="toggleSelectAll"
                        class="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </th>
                    <th class="px-6 py-3 text-left text-xs uppercase tracking-wider">姓名</th>
                    <th class="px-6 py-3 text-left text-xs uppercase tracking-wider">電話</th>
                    <th class="px-6 py-3 text-left text-xs uppercase tracking-wider">身分證字號</th>
                    <th class="px-6 py-3 text-left text-xs uppercase tracking-wider">備註</th>
                    <th class="px-6 py-3 text-left text-xs uppercase tracking-wider">建立時間</th>
                    <th class="px-6 py-3 text-left text-xs uppercase tracking-wider">狀態</th>
                    <th class="px-6 py-3 text-right text-xs uppercase tracking-wider">操作</th>
                  </tr>
                </thead>
                <tbody
                  v-if="filteredEntries.length > 0"
                  class="divide-y"
                  :class="theme === 'dark' ? 'divide-secondary-800' : 'divide-neutral-200'"
                >
                  <tr
                    v-for="entry in filteredEntries"
                    :key="entry.id"
                    class="hover:bg-opacity-50 transition-colors"
                    :class="theme === 'dark' ? 'hover:bg-secondary-800' : 'hover:bg-neutral-50'"
                  >
                    <td class="px-6 py-4">
                      <input
                        type="checkbox"
                        :checked="selectedIds.has(entry.id)"
                        @change="toggleSelect(entry.id)"
                        class="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </td>
                    <td class="px-6 py-4 text-sm font-medium">
                      {{ entry.passengerName }}
                    </td>
                    <td class="px-6 py-4 text-sm">{{ entry.phone }}</td>
                    <td class="px-6 py-4 text-sm font-mono">{{ entry.idNumber }}</td>
                    <td class="px-6 py-4 text-sm">{{ entry.remark || '-' }}</td>
                    <td class="px-6 py-4 text-sm">{{ formatDate(entry.createdAt) }}</td>
                    <td class="px-6 py-4 text-sm">
                      <button
                        @click="toggleEntryActive(entry)"
                        :class="[
                          'px-2 py-0.5 text-xs font-medium rounded-full transition-colors',
                          entry.isActive === false
                            ? theme === 'dark'
                              ? 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                              : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
                            : theme === 'dark'
                              ? 'bg-green-900/30 text-green-300 hover:bg-green-900/50'
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                        ]"
                      >
                        {{ entry.isActive === false ? '停用' : '啟用' }}
                      </button>
                    </td>
                    <td class="px-6 py-4 text-right">
                      <div class="flex items-center justify-end gap-2">
                        <BaseButton
                          variant="outline"
                          size="sm"
                          @click="openEditModal(entry)"
                        >
                          編輯
                        </BaseButton>
                        <BaseButton
                          variant="danger"
                          size="sm"
                          @click="handleDelete(entry.id, entry.passengerName)"
                        >
                          刪除
                        </BaseButton>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- 空狀態 -->
            <div v-if="filteredEntries.length === 0" class="p-12 text-center">
              <UsersIcon
                class="mx-auto mb-4 h-16 w-16 opacity-30"
                :class="theme === 'dark' ? 'text-neutral-600' : 'text-neutral-400'"
              />
              <h3
                class="mb-2 text-xl font-semibold"
                :class="theme === 'dark' ? 'text-white' : 'text-neutral-900'"
              >
                尚無白名單資料
              </h3>
              <p
                :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-500'"
              >
                {{ searchQuery ? '找不到符合的資料' : '點擊上方按鈕開始新增白名單' }}
              </p>
            </div>
          </BaseCard>
        </PageContainer>
      </main>
    </div>

    <!-- 新增/編輯 Modal -->
    <div
      v-if="showModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      @click.self="closeModal"
    >
      <div
        class="w-full max-w-md rounded-lg shadow-xl"
        :class="theme === 'dark' ? 'bg-secondary-900' : 'bg-white'"
      >
        <div
          class="flex items-center justify-between border-b p-6"
          :class="theme === 'dark' ? 'border-secondary-800' : 'border-neutral-200'"
        >
          <h2
            class="text-xl font-bold"
            :class="theme === 'dark' ? 'text-white' : 'text-neutral-900'"
          >
            {{ editingEntry ? '編輯白名單' : '新增白名單' }}
          </h2>
          <button
            @click="closeModal"
            class="transition-colors"
            :class="theme === 'dark' ? 'text-neutral-400 hover:text-neutral-200' : 'text-neutral-400 hover:text-neutral-600'"
          >
            <XMarkIcon class="h-6 w-6" />
          </button>
        </div>

        <form @submit.prevent="submitForm" class="p-6 space-y-4">
          <!-- 姓名 -->
          <div>
            <label
              class="mb-1 block text-sm font-medium"
              :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
            >
              乘客姓名<span class="text-red-500">*</span>
            </label>
            <input
              v-model="formData.passengerName"
              type="text"
              class="w-full rounded-lg border px-4 py-2 transition-all outline-none"
              :class="[
                formErrors.passengerName ? 'border-red-500' : '',
                theme === 'dark'
                  ? 'bg-secondary-800 border-secondary-700 text-white focus:border-primary-500'
                  : 'bg-white border-neutral-300 text-neutral-900 focus:border-primary-500'
              ]"
            />
            <p v-if="formErrors.passengerName" class="mt-1 text-sm text-red-500">
              {{ formErrors.passengerName }}
            </p>
          </div>

          <!-- 電話 -->
          <div>
            <label
              class="mb-1 block text-sm font-medium"
              :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
            >
              電話號碼<span class="text-red-500">*</span>
            </label>
            <input
              v-model="formData.phone"
              type="text"
              maxlength="10"
              placeholder="0912345678"
              class="w-full rounded-lg border px-4 py-2 transition-all outline-none"
              :class="[
                formErrors.phone ? 'border-red-500' : '',
                theme === 'dark'
                  ? 'bg-secondary-800 border-secondary-700 text-white focus:border-primary-500'
                  : 'bg-white border-neutral-300 text-neutral-900 focus:border-primary-500'
              ]"
            />
            <p v-if="formErrors.phone" class="mt-1 text-sm text-red-500">
              {{ formErrors.phone }}
            </p>
          </div>

          <!-- 身分證字號 -->
          <div>
            <label
              class="mb-1 block text-sm font-medium"
              :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
            >
              身分證字號<span class="text-red-500">*</span>
            </label>
            <input
              v-model="formData.idNumber"
              type="text"
              maxlength="10"
              placeholder="A123456789"
              class="w-full rounded-lg border px-4 py-2 uppercase transition-all outline-none font-mono"
              :class="[
                formErrors.idNumber ? 'border-red-500' : '',
                theme === 'dark'
                  ? 'bg-secondary-800 border-secondary-700 text-white focus:border-primary-500'
                  : 'bg-white border-neutral-300 text-neutral-900 focus:border-primary-500'
              ]"
            />
            <p v-if="formErrors.idNumber" class="mt-1 text-sm text-red-500">
              {{ formErrors.idNumber }}
            </p>
          </div>

          <!-- 備註 -->
          <div>
            <label
              class="mb-1 block text-sm font-medium"
              :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
            >
              備註
            </label>
            <textarea
              v-model="formData.remark"
              rows="3"
              class="w-full rounded-lg border px-4 py-2 transition-all outline-none resize-none"
              :class="
                theme === 'dark'
                  ? 'bg-secondary-800 border-secondary-700 text-white focus:border-primary-500'
                  : 'bg-white border-neutral-300 text-neutral-900 focus:border-primary-500'
              "
            ></textarea>
          </div>

          <!-- 按鈕 -->
          <div class="flex gap-3 pt-4">
            <BaseButton
              type="button"
              variant="ghost"
              :icon="XMarkIcon"
              @click="closeModal"
              class="flex-1"
            >
              取消
            </BaseButton>
            <BaseButton
              type="submit"
              variant="primary"
              :icon="CheckIcon"
              :disabled="loading"
              class="flex-1"
            >
              {{ loading ? '處理中...' : editingEntry ? '更新' : '新增' }}
            </BaseButton>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
