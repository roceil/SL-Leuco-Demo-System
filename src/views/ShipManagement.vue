<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSidebar } from '@/composables/useSidebar'
import { useTheme } from '@/composables/useTheme'
import { useShips } from '@/composables/useShips'
import { useAuth } from '@/composables/useAuth'
import { useRbacStore } from '@/stores/rbac'
import { ShipStatus, type ShipFormData } from '@/types/ship'
import Navbar from '@/components/Navbar.vue'
import Sidebar from '@/components/Sidebar.vue'
import PageContainer from '@/components/ui/PageContainer.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import {
  TruckIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  XMarkIcon,
  CheckIcon,
} from '@heroicons/vue/24/outline'

const { isCollapsed } = useSidebar()
const { theme } = useTheme()
const { ships, addShip, updateShip, deleteShip, updateShipStatus } = useShips()
const { currentUser } = useAuth()
const rbacStore = useRbacStore()

// 當前登入帳號資訊
const currentAccount = computed(() => {
  if (!currentUser.value) return null
  return rbacStore.accounts.find(a => a.username === currentUser.value) ?? null
})
const isCurrentSuperAdmin = computed(() => rbacStore.isSuperAdmin(currentAccount.value?.id ?? ''))
const currentOrgId = computed(() => currentAccount.value?.organizationId ?? 'org-kx')

// Modal 控制
const showModal = ref(false)
const isEditing = ref(false)
const currentShipId = ref<string | null>(null)

// 表單數據
const formData = ref<ShipFormData>({
  name: '',
  registrationNumber: '',
  organizationId: '',
  maxCapacity: 100,
  status: ShipStatus.ACTIVE,
  description: ''
})

// 搜尋與篩選
const searchQuery = ref('')
const statusFilter = ref<ShipStatus | 'all'>('all')

// 狀態選項
const statusOptions = [
  { value: 'all', label: '全部狀態' },
  { value: ShipStatus.ACTIVE, label: '營運中' },
  { value: ShipStatus.MAINTENANCE, label: '維修中' },
  { value: ShipStatus.INACTIVE, label: '停用' }
]

// 篩選後的船隻列表
const filteredShips = computed(() => {
  let result = ships.value

  // 組織過濾：非 super_admin 只看到本組織的船隻
  if (!isCurrentSuperAdmin.value && currentOrgId.value) {
    result = result.filter(ship => ship.organizationId === currentOrgId.value)
  }

  // 狀態篩選
  if (statusFilter.value !== 'all') {
    result = result.filter(ship => ship.status === statusFilter.value)
  }

  // 搜尋篩選
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(ship =>
      ship.name.toLowerCase().includes(query) ||
      ship.registrationNumber.toLowerCase().includes(query)
    )
  }

  return result
})

// 統計數據
const stats = computed(() => {
  return {
    total: ships.value.length,
    active: ships.value.filter(s => s.status === ShipStatus.ACTIVE).length,
    maintenance: ships.value.filter(s => s.status === ShipStatus.MAINTENANCE).length,
    inactive: ships.value.filter(s => s.status === ShipStatus.INACTIVE).length
  }
})

// 狀態顯示文字
const getStatusText = (status: ShipStatus): string => {
  const statusMap = {
    [ShipStatus.ACTIVE]: '營運中',
    [ShipStatus.MAINTENANCE]: '維修中',
    [ShipStatus.INACTIVE]: '停用'
  }
  return statusMap[status]
}

// 狀態樣式
const getStatusClass = (status: ShipStatus): string => {
  const baseClasses = 'px-3 py-1 rounded-full text-xs font-medium'
  const colorMap = {
    [ShipStatus.ACTIVE]: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    [ShipStatus.MAINTENANCE]: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    [ShipStatus.INACTIVE]: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
  }
  return `${baseClasses} ${colorMap[status]}`
}

// 重置表單
const resetForm = () => {
  formData.value = {
    name: '',
    registrationNumber: '',
    organizationId: currentOrgId.value,
    maxCapacity: 100,
    status: ShipStatus.ACTIVE,
    description: ''
  }
  currentShipId.value = null
  isEditing.value = false
}

// 開啟新增 Modal
const openAddModal = () => {
  resetForm()
  showModal.value = true
}

// 開啟編輯 Modal
const openEditModal = (shipId: string) => {
  const ship = ships.value.find(s => s.id === shipId)
  if (!ship) return

  formData.value = {
    name: ship.name,
    registrationNumber: ship.registrationNumber,
    organizationId: ship.organizationId,
    maxCapacity: ship.maxCapacity,
    status: ship.status,
    description: ship.description || ''
  }
  currentShipId.value = shipId
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
  if (!formData.value.name.trim()) {
    return '請輸入船隻名稱'
  }
  if (!formData.value.registrationNumber.trim()) {
    return '請輸入船籍編號'
  }
  if (formData.value.maxCapacity < 1) {
    return '最大載運人數必須大於 0'
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

  if (isEditing.value && currentShipId.value) {
    // 更新船隻
    const success = updateShip(currentShipId.value, formData.value)
    if (success) {
      alert('船隻資料更新成功')
      closeModal()
    } else {
      alert('更新失敗，請稍後再試')
    }
  } else {
    // 新增船隻
    const newShip = addShip(formData.value)
    alert(`新增船隻成功\n\n船隻編號：${newShip.id}\n船隻名稱：${newShip.name}`)
    closeModal()
  }
}

// 刪除船隻
const handleDelete = (shipId: string, shipName: string) => {
  if (confirm(`確定要刪除船隻「${shipName}」嗎？\n\n此操作無法復原。`)) {
    const success = deleteShip(shipId)
    if (success) {
      alert('船隻已刪除')
    } else {
      alert('刪除失敗，請稍後再試')
    }
  }
}

// 切換狀態
const handleStatusToggle = (shipId: string, currentStatus: ShipStatus) => {
  const statusOptions = [
    { value: ShipStatus.ACTIVE, label: '營運中' },
    { value: ShipStatus.MAINTENANCE, label: '維修中' },
    { value: ShipStatus.INACTIVE, label: '停用' }
  ]

  const message = statusOptions
    .map((opt, idx) => `${idx + 1}. ${opt.label}`)
    .join('\n')

  const choice = prompt(`請選擇新狀態（輸入 1-3）：\n\n${message}`)

  if (choice) {
    const index = parseInt(choice) - 1
    if (index >= 0 && index < statusOptions.length) {
      const selectedOption = statusOptions[index]
      if (selectedOption) {
        const newStatus = selectedOption.value
        if (newStatus !== currentStatus) {
          updateShipStatus(shipId, newStatus)
          alert('狀態已更新')
        }
      }
    } else {
      alert('無效的選擇')
    }
  }
}

// 格式化日期
const formatDate = (dateString: string): string => {
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

      <main :class="[
        'flex-1 transition-all duration-300',
        isCollapsed ? 'ml-20' : 'ml-64'
      ]">
        <PageContainer
          title="船隻管理"
          subtitle="管理船舶基本資訊與維護記錄"
          :icon="TruckIcon"
          max-width="2xl"
        >
          <!-- 統計資訊 -->
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <BaseCard padding="md">
              <div
                class="text-sm font-medium mb-1"
                :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'"
              >
                總船隻數
              </div>
              <div
                class="text-2xl font-bold"
                :class="theme === 'dark' ? 'text-white' : 'text-neutral-900'"
              >
                {{ stats.total }}
              </div>
            </BaseCard>

            <BaseCard padding="md">
              <div
                class="text-sm font-medium mb-1"
                :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'"
              >
                營運中
              </div>
              <div class="text-2xl font-bold text-green-500">
                {{ stats.active }}
              </div>
            </BaseCard>

            <BaseCard padding="md">
              <div
                class="text-sm font-medium mb-1"
                :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'"
              >
                維修中
              </div>
              <div class="text-2xl font-bold text-amber-500">
                {{ stats.maintenance }}
              </div>
            </BaseCard>

            <BaseCard padding="md">
              <div
                class="text-sm font-medium mb-1"
                :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'"
              >
                停用
              </div>
              <div class="text-2xl font-bold text-neutral-500">
                {{ stats.inactive }}
              </div>
            </BaseCard>
          </div>

          <!-- 搜尋和操作列 -->
          <div class="flex flex-col md:flex-row gap-4 mb-6">
            <div class="flex-1">
              <BaseInput
                v-model="searchQuery"
                placeholder="搜尋船隻名稱或船籍編號..."
                :icon="MagnifyingGlassIcon"
              />
            </div>
            <div class="flex gap-3">
              <select
                v-model="statusFilter"
                class="px-4 py-2 rounded-lg border transition-all outline-none"
                :class="theme === 'dark'
                    ? 'bg-secondary-800 border-secondary-700 text-white focus:border-primary-500'
                    : 'bg-white border-neutral-300 text-neutral-900 focus:border-primary-500'
                  "
              >
                <option
                  v-for="option in statusOptions"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </option>
              </select>
              <BaseButton
                variant="primary"
                :icon="PlusIcon"
                @click="openAddModal"
              >
                新增船隻
              </BaseButton>
            </div>
          </div>

          <!-- 船隻列表 -->
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
                    <th class="text-left py-4 px-6">船隻編號</th>
                    <th class="text-left py-4 px-6">船隻名稱</th>
                    <th class="text-left py-4 px-6">船籍編號</th>
                    <th class="text-left py-4 px-6">最大載客量</th>
                    <th class="text-left py-4 px-6">狀態</th>
                    <th class="text-left py-4 px-6">更新時間</th>
                    <th class="text-right py-4 px-6">操作</th>
                  </tr>
                </thead>
                <tbody
                  v-if="filteredShips.length > 0"
                  class="divide-y"
                  :class="theme === 'dark' ? 'divide-secondary-800' : 'divide-neutral-200'"
                >
                  <tr
                    v-for="ship in filteredShips"
                    :key="ship.id"
                    class="hover:bg-opacity-50 transition-colors"
                    :class="theme === 'dark' ? 'hover:bg-secondary-800' : 'hover:bg-neutral-50'"
                  >
                    <td class="py-4 px-6 font-medium font-mono text-sm">
                      {{ ship.id }}
                    </td>
                    <td class="py-4 px-6 font-medium">
                      {{ ship.name }}
                    </td>
                    <td class="py-4 px-6 font-mono text-sm">
                      {{ ship.registrationNumber }}
                    </td>
                    <td class="py-4 px-6">
                      {{ ship.maxCapacity }} 人
                    </td>
                    <td class="py-4 px-6">
                      <span
                        :class="getStatusClass(ship.status)"
                        class="cursor-pointer hover:opacity-80 transition-opacity"
                        @click="handleStatusToggle(ship.id, ship.status)"
                        title="點擊切換狀態"
                      >
                        {{ getStatusText(ship.status) }}
                      </span>
                    </td>
                    <td class="py-4 px-6 text-sm">
                      {{ formatDate(ship.updatedAt) }}
                    </td>
                    <td class="py-4 px-6 text-right">
                      <div class="flex justify-end gap-2">
                        <BaseButton
                          variant="outline"
                          size="sm"
                          @click="openEditModal(ship.id)"
                        >
                          編輯
                        </BaseButton>
                        <BaseButton
                          variant="danger"
                          size="sm"
                          @click="handleDelete(ship.id, ship.name)"
                        >
                          刪除
                        </BaseButton>
                      </div>
                    </td>
                  </tr>
                </tbody>
                <tbody v-else>
                  <tr>
                    <td
                      colspan="7"
                      class="py-12 text-center"
                    >
                      <div
                        class="text-neutral-400"
                        :class="theme === 'dark' ? 'text-neutral-500' : 'text-neutral-400'"
                      >
                        <MagnifyingGlassIcon class="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p class="text-lg font-medium">找不到符合條件的船隻</p>
                        <p class="text-sm mt-1">請嘗試其他搜尋條件</p>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
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
            {{ isEditing ? '編輯船隻資料' : '新增船隻' }}
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
          <!-- 船隻名稱 -->
          <div class="space-y-2">
            <label
              class="block text-sm font-semibold"
              :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
            >
              船隻名稱<span class="text-red-500 ml-1">*</span>
            </label>
            <BaseInput
              v-model="formData.name"
              placeholder="例：小琉球之星"
            />
          </div>

          <!-- 船籍編號 -->
          <div class="space-y-2">
            <label
              class="block text-sm font-semibold"
              :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
            >
              船籍編號<span class="text-red-500 ml-1">*</span>
            </label>
            <BaseInput
              v-model="formData.registrationNumber"
              placeholder="例：LQ-2024-001"
            />
          </div>

          <!-- 最大載運人數 -->
          <div class="space-y-2">
            <label
              class="block text-sm font-semibold"
              :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
            >
              最大載運人數<span class="text-red-500 ml-1">*</span>
            </label>
            <div class="flex items-center gap-4">
              <input
                v-model.number="formData.maxCapacity"
                type="number"
                min="1"
                class="flex-1 px-4 py-3 border rounded-lg transition-all outline-none"
                :class="theme === 'dark'
                    ? 'bg-secondary-800 border-secondary-700 text-white focus:border-primary-500'
                    : 'bg-white border-neutral-300 text-neutral-900 focus:border-primary-500'
                  "
              >
              <span
                class="font-medium"
                :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-600'"
              >
                人
              </span>
            </div>
            <p
              class="text-sm"
              :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-500'"
            >
              請輸入船隻的最大乘客載運數量
            </p>
          </div>

          <!-- 船隻狀態 -->
          <div class="space-y-2">
            <label
              class="block text-sm font-semibold"
              :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
            >
              船隻狀態<span class="text-red-500 ml-1">*</span>
            </label>
            <select
              v-model="formData.status"
              class="w-full px-4 py-3 border rounded-lg transition-all outline-none"
              :class="theme === 'dark'
                  ? 'bg-secondary-800 border-secondary-700 text-white focus:border-primary-500'
                  : 'bg-white border-neutral-300 text-neutral-900 focus:border-primary-500'
                "
            >
              <option :value="ShipStatus.ACTIVE">營運中</option>
              <option :value="ShipStatus.MAINTENANCE">維修中</option>
              <option :value="ShipStatus.INACTIVE">停用</option>
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
              placeholder="輸入船隻的相關描述或備註..."
              class="w-full px-4 py-3 border rounded-lg transition-all resize-none outline-none"
              :class="theme === 'dark'
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
