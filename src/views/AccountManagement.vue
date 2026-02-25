<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRbacStore } from '@/stores/rbac'
import { useTicketStore } from '@/stores/ticket'
import { useRouteStore } from '@/stores/route'
import { useSidebar } from '@/composables/useSidebar'
import { useTheme } from '@/composables/useTheme'
import { useAuth } from '@/composables/useAuth'
import { useAuditLog } from '@/composables/useAuditLog'
import { PermissionAction } from '@/types/rbac'
import Navbar from '@/components/Navbar.vue'
import Sidebar from '@/components/Sidebar.vue'
import PageContainer from '@/components/ui/PageContainer.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import type { Account, TicketPriceSetting } from '@/types/rbac'
import { calculateSalePrice, getDiscountBySegmentCount } from '@/types/ticket'
import {
  UsersIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
  KeyIcon,
  ClipboardDocumentIcon
} from '@heroicons/vue/24/outline'

const rbacStore = useRbacStore()
const ticketStore = useTicketStore()
const routeStore = useRouteStore()
const { isCollapsed } = useSidebar()
const { theme } = useTheme()
const { currentUser, resetUserPassword } = useAuth()
const { createLog, generateChanges } = useAuditLog()

// 當前登入帳號
const currentAccount = computed(() => {
  if (!currentUser.value) return null
  return rbacStore.accounts.find(a => a.username === currentUser.value) ?? null
})

const currentAccountId = computed(() => currentAccount.value?.id ?? 'admin-001')
const currentAccountName = computed(() => currentAccount.value?.name ?? '管理員')
const isCurrentSuperAdmin = computed(() => rbacStore.isSuperAdmin(currentAccountId.value))
const currentOrgId = computed(() => currentAccount.value?.organizationId ?? null)

// 當前操作者
const currentOperator = computed(() => ({
  id: currentAccountId.value,
  name: currentAccountName.value
}))

// 密碼重置相關狀態
const showPasswordResetModal = ref(false)
const resetPasswordUsername = ref('')
const resetPasswordAccountName = ref('')
const newGeneratedPassword = ref('')

// 篩選條件
const searchKeyword = ref('')
const filterRole = ref('')
const filterVerified = ref('')

// 表單狀態
const showForm = ref(false)
const isEditMode = ref(false)

// 表單資料
const formData = ref<Partial<Account>>({
  username: '',
  name: '',
  contactPerson: '',
  contactPhone: '',
  organizationId: 'org-1',
  roleId: '',
  verified: true,
  availableTicketTypes: [],
  ticketPriceSettings: []
})

// 可見的角色列表（非 super_admin 只看到本組織角色）
const visibleRoles = computed(() => {
  if (isCurrentSuperAdmin.value) return rbacStore.roles
  return rbacStore.roles.filter(r => r.organizationId === currentOrgId.value)
})

// 篩選後的帳號列表
const filteredAccounts = computed(() => {
  let result = rbacStore.accounts

  // 組織過濾：非 super_admin 只看到本組織的帳號
  if (!isCurrentSuperAdmin.value && currentOrgId.value) {
    result = result.filter(acc => acc.organizationId === currentOrgId.value)
  }

  // 關鍵字搜尋（帳號、使用者名稱、聯絡人、聯絡電話）
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    result = result.filter(
      (acc) =>
        acc.name.toLowerCase().includes(keyword) ||
        acc.username.toLowerCase().includes(keyword) ||
        acc.contactPerson.toLowerCase().includes(keyword) ||
        acc.contactPhone.includes(keyword)
    )
  }

  // 角色篩選
  if (filterRole.value) {
    result = result.filter((acc) => acc.roleId === filterRole.value)
  }

  // 驗證狀態篩選
  if (filterVerified.value !== '') {
    const verified = filterVerified.value === 'true'
    result = result.filter((acc) => acc.verified === verified)
  }

  return result
})

// 獲取角色名稱
function getRoleName(roleId: string): string {
  const role = rbacStore.roles.find((r) => r.id === roleId)
  return role?.name || '未知角色'
}

// 獲取票種名稱
function getTicketTypeName(ticketTypeId: string): string {
  const ticket = ticketStore.ticketTypes.find((t) => t.id === ticketTypeId)
  return ticket?.name || '未知票種'
}

// 獲取票種的預設售價（以單航段折扣計算）
function getTicketDefaultPrice(ticketTypeId: string): number {
  const ticket = ticketStore.ticketTypes.find((t) => t.id === ticketTypeId)
  if (!ticket) return 0
  const discount = getDiscountBySegmentCount(ticket.segmentDiscounts, 1)
  return calculateSalePrice(ticket.facePrice, discount)
}

// 重置表單
function resetForm() {
  formData.value = {
    username: '',
    name: '',
    contactPerson: '',
    contactPhone: '',
    organizationId: 'org-1',
    roleId: '',
    verified: true,
    availableTicketTypes: [],
    ticketPriceSettings: []
  }
  newPriceSettings.value = {}
  isEditMode.value = false
  showForm.value = false
  rbacStore.selectAccount(null)
}

// 新增帳號
function createNewAccount() {
  resetForm()
  showForm.value = true
}

// 編輯帳號
function editAccount(account: Account) {
  rbacStore.selectAccount(account.id)
  formData.value = {
    username: account.username,
    name: account.name,
    contactPerson: account.contactPerson,
    contactPhone: account.contactPhone,
    organizationId: account.organizationId,
    roleId: account.roleId,
    verified: account.verified,
    availableTicketTypes: [...account.availableTicketTypes],
    ticketPriceSettings: JSON.parse(JSON.stringify(account.ticketPriceSettings))
  }

  // 初始化 newPriceSettings 為每個選中的票種
  newPriceSettings.value = {}
  account.availableTicketTypes.forEach((ticketTypeId) => {
    newPriceSettings.value[ticketTypeId] = {
      price: getTicketDefaultPrice(ticketTypeId),
      effectiveDate: getTodayDateString()
    }
  })

  isEditMode.value = true
  showForm.value = true
}

// 儲存帳號
function saveAccount() {
  if (!formData.value.name) {
    alert('請輸入帳號')
    return
  }

  if (!formData.value.username) {
    alert('請輸入使用者名稱')
    return
  }

  if (!formData.value.contactPerson) {
    alert('請輸入聯絡人')
    return
  }

  if (!formData.value.contactPhone) {
    alert('請輸入聯絡電話')
    return
  }

  if (!formData.value.roleId) {
    alert('請選擇角色')
    return
  }

  // 驗證每個選中的票種都至少有一個價格設定
  const availableTypes = formData.value.availableTicketTypes || []
  for (const ticketTypeId of availableTypes) {
    const priceSettings = getTicketPriceSettings(ticketTypeId)
    if (priceSettings.length === 0) {
      const ticketName = getTicketTypeName(ticketTypeId)
      alert(`請為 "${ticketName}" 設定至少一個價格`)
      return
    }
  }

  if (isEditMode.value && rbacStore.selectedAccountId) {
    // 獲取舊資料用於記錄變更
    const oldAccount = rbacStore.accounts.find(a => a.id === rbacStore.selectedAccountId)

    // 更新現有帳號
    const updatedData = {
      username: formData.value.username!,
      name: formData.value.name!,
      contactPerson: formData.value.contactPerson!,
      contactPhone: formData.value.contactPhone!,
      organizationId: formData.value.organizationId!,
      roleId: formData.value.roleId!,
      verified: formData.value.verified!,
      availableTicketTypes: formData.value.availableTicketTypes || [],
      ticketPriceSettings: formData.value.ticketPriceSettings || []
    }

    rbacStore.updateAccount(rbacStore.selectedAccountId, updatedData)

    // 記錄操作日誌
    if (oldAccount) {
      const changes = generateChanges(oldAccount, { ...oldAccount, ...updatedData }, {
        username: '使用者名稱',
        name: '帳號名稱',
        contactPerson: '聯絡人',
        contactPhone: '聯絡電話',
        roleId: '角色',
        verified: '驗證狀態',
        availableTicketTypes: '可販售票種',
        ticketPriceSettings: '票價設定'
      })

      createLog({
        entityType: 'account',
        entityId: rbacStore.selectedAccountId,
        entityName: formData.value.name!,
        action: 'update',
        operatorId: currentOperator.value.id,
        operatorName: currentOperator.value.name,
        changes
      })
    }

    alert('帳號更新成功')
  } else {
    // 創建新帳號（自動帶入當前操作者所屬組織）
    const defaultOrgId = isCurrentSuperAdmin.value
      ? (formData.value.organizationId || 'org-sys')
      : (currentOrgId.value || 'org-sys')

    const newAccount = rbacStore.createAccount({
      username: formData.value.username!,
      name: formData.value.name!,
      contactPerson: formData.value.contactPerson!,
      contactPhone: formData.value.contactPhone!,
      organizationId: defaultOrgId,
      roleId: formData.value.roleId!,
      verified: formData.value.verified ?? true,
      availableTicketTypes: formData.value.availableTicketTypes || [],
      ticketPriceSettings: formData.value.ticketPriceSettings || []
    })

    // 記錄操作日誌
    createLog({
      entityType: 'account',
      entityId: newAccount.id,
      entityName: formData.value.name!,
      action: 'create',
      operatorId: currentOperator.value.id,
      operatorName: currentOperator.value.name,
      note: `創建新帳號：${formData.value.name}`
    })

    alert('帳號創建成功')
  }
  resetForm()
}

// 刪除帳號
function deleteAccount(accountId: string) {
  const account = rbacStore.accounts.find(a => a.id === accountId)
  if (!account) return

  if (confirm('確定要刪除此帳號嗎？')) {
    rbacStore.deleteAccount(accountId)

    // 記錄操作日誌
    createLog({
      entityType: 'account',
      entityId: accountId,
      entityName: account.name,
      action: 'delete',
      operatorId: currentOperator.value.id,
      operatorName: currentOperator.value.name,
      note: `刪除帳號：${account.name} (${account.username})`
    })

    alert('帳號已刪除')
    if (rbacStore.selectedAccountId === accountId) {
      resetForm()
    }
  }
}

// 新增價格設定的暫存狀態（用於表單輸入）
const newPriceSettings = ref<Record<string, { price: number; effectiveDate: string }>>({})

// 獲取今天的日期字串 (YYYY-MM-DD)
function getTodayDateString(): string {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// 切換票種選擇
function toggleTicketType(ticketTypeId: string) {
  const availableTypes = formData.value.availableTicketTypes || []
  const index = availableTypes.indexOf(ticketTypeId)

  if (index === -1) {
    // 添加票種
    availableTypes.push(ticketTypeId)
    // 初始化新增價格設定的暫存狀態
    newPriceSettings.value[ticketTypeId] = {
      price: getTicketDefaultPrice(ticketTypeId),
      effectiveDate: getTodayDateString()
    }
  } else {
    // 移除票種
    availableTypes.splice(index, 1)
    // 同時移除所有該票種的價格設定
    if (formData.value.ticketPriceSettings) {
      formData.value.ticketPriceSettings = formData.value.ticketPriceSettings.filter(
        (p) => p.ticketTypeId !== ticketTypeId
      )
    }
    // 清除暫存狀態
    delete newPriceSettings.value[ticketTypeId]
  }
}

// 彈窗內票種篩選（依航段）
const filterTicketRoute = ref('')

// 從所有票種中萃取不重複的航段（以 "from→to" 為 key）
const availableRouteOptions = computed(() => {
  const seen = new Set<string>()
  const options: { key: string; label: string }[] = []
  for (const ticket of ticketStore.ticketTypes) {
    const key = `${ticket.route.from}→${ticket.route.to}`
    if (!seen.has(key)) {
      seen.add(key)
      const fromName = routeStore.getPortById(ticket.route.from)?.name ?? ticket.route.from
      const toName = routeStore.getPortById(ticket.route.to)?.name ?? ticket.route.to
      options.push({ key, label: `${fromName} → ${toName}` })
    }
  }
  return options
})

// 依篩選航段過濾的票種列表
const filteredTicketTypes = computed(() => {
  if (!filterTicketRoute.value) return ticketStore.ticketTypes
  const [from, to] = filterTicketRoute.value.split('→')
  return ticketStore.ticketTypes.filter(
    (t) => t.route.from === from && t.route.to === to
  )
})

// 全部選取
function selectAllTicketTypes() {
  ticketStore.ticketTypes.forEach((ticket) => {
    if (!isTicketTypeSelected(ticket.id)) {
      toggleTicketType(ticket.id)
    }
  })
}

// 全部取消
function deselectAllTicketTypes() {
  ticketStore.ticketTypes.forEach((ticket) => {
    if (isTicketTypeSelected(ticket.id)) {
      toggleTicketType(ticket.id)
    }
  })
}

// 檢查票種是否被選中
function isTicketTypeSelected(ticketTypeId: string): boolean {
  return formData.value.availableTicketTypes?.includes(ticketTypeId) ?? false
}

// 獲取票種的所有價格設定（按生效日期排序）
function getTicketPriceSettings(ticketTypeId: string): TicketPriceSetting[] {
  if (!formData.value.ticketPriceSettings) return []

  return formData.value.ticketPriceSettings
    .filter((p) => p.ticketTypeId === ticketTypeId)
    .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate)) // 最新的在前面
}

// 新增價格設定
function addPriceSetting(ticketTypeId: string) {
  if (!formData.value.ticketPriceSettings) {
    formData.value.ticketPriceSettings = []
  }

  const newSetting = newPriceSettings.value[ticketTypeId]
  if (!newSetting || !newSetting.price || !newSetting.effectiveDate) {
    alert('請填寫完整的價格和啟用日期')
    return
  }

  // 檢查是否已有相同啟用日期的價格設定
  const existingSetting = formData.value.ticketPriceSettings.find(
    (p) => p.ticketTypeId === ticketTypeId && p.effectiveDate === newSetting.effectiveDate
  )

  if (existingSetting) {
    alert('該啟用日期已有價格設定，請選擇其他日期或刪除現有設定')
    return
  }

  formData.value.ticketPriceSettings.push({
    id: `price-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
    ticketTypeId,
    customPrice: newSetting.price,
    effectiveDate: newSetting.effectiveDate,
    createdAt: new Date().toISOString()
  })

  // 重置暫存狀態
  newPriceSettings.value[ticketTypeId] = {
    price: getTicketDefaultPrice(ticketTypeId),
    effectiveDate: getTodayDateString()
  }
}

// 刪除價格設定
function removePriceSetting(priceSettingId: string) {
  if (!formData.value.ticketPriceSettings) return

  const index = formData.value.ticketPriceSettings.findIndex((p) => p.id === priceSettingId)
  if (index !== -1) {
    formData.value.ticketPriceSettings.splice(index, 1)
  }
}

// 開啟密碼重置對話框
function openPasswordResetModal(account: Account) {
  resetPasswordUsername.value = account.username
  resetPasswordAccountName.value = account.name
  newGeneratedPassword.value = ''
  showPasswordResetModal.value = true
}

// 執行密碼重置
function executePasswordReset() {
  const result = resetUserPassword(resetPasswordUsername.value, currentOperator.value.name)

  if (result.success && result.newPassword) {
    newGeneratedPassword.value = result.newPassword

    // 記錄操作日誌
    const account = rbacStore.accounts.find(a => a.username === resetPasswordUsername.value)
    if (account) {
      createLog({
        entityType: 'account',
        entityId: account.id,
        entityName: account.name,
        action: 'password_reset',
        operatorId: currentOperator.value.id,
        operatorName: currentOperator.value.name,
        note: `管理員重置密碼：${account.name} (${account.username})`
      })
    }

    alert(result.message)
  } else {
    alert(result.message)
    showPasswordResetModal.value = false
  }
}

// 複製密碼到剪貼簿
async function copyPasswordToClipboard() {
  try {
    await navigator.clipboard.writeText(newGeneratedPassword.value)
    alert('密碼已複製到剪貼簿')
  } catch {
    alert('複製失敗，請手動複製密碼')
  }
}

// 關閉密碼重置對話框
function closePasswordResetModal() {
  showPasswordResetModal.value = false
  resetPasswordUsername.value = ''
  resetPasswordAccountName.value = ''
  newGeneratedPassword.value = ''
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
          title="帳號管理"
          subtitle="管理系統帳號及其販售權限"
          :icon="UsersIcon"
          max-width="2xl"
        >
          <!-- 篩選器和新增按鈕 -->
          <BaseCard padding="md" class="mb-6">
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
              <!-- 關鍵字搜尋 -->
              <div>
                <label
                  class="block text-sm font-medium mb-2"
                  :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                >
                  搜尋
                </label>
                <BaseInput
                  v-model="searchKeyword"
                  placeholder="帳號、使用者名稱、聯絡人、電話..."
                  :icon="MagnifyingGlassIcon"
                />
              </div>

              <!-- 角色篩選 -->
              <div>
                <label
                  class="block text-sm font-medium mb-2"
                  :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                >
                  角色
                </label>
                <select
                  v-model="filterRole"
                  :class="[
                    'w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500',
                    theme === 'dark'
                      ? 'bg-secondary-900 border-secondary-700 text-white'
                      : 'bg-white border-neutral-300 text-neutral-900'
                  ]"
                >
                  <option value="">全部</option>
                  <option v-for="role in visibleRoles" :key="role.id" :value="role.id">
                    {{ role.name }}
                  </option>
                </select>
              </div>

              <!-- 驗證狀態篩選 -->
              <div>
                <label
                  class="block text-sm font-medium mb-2"
                  :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                >
                  驗證狀態
                </label>
                <select
                  v-model="filterVerified"
                  :class="[
                    'w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500',
                    theme === 'dark'
                      ? 'bg-secondary-900 border-secondary-700 text-white'
                      : 'bg-white border-neutral-300 text-neutral-900'
                  ]"
                >
                  <option value="">全部</option>
                  <option value="true">已驗證</option>
                  <option value="false">未驗證</option>
                </select>
              </div>

              <!-- 新增按鈕 -->
              <div class="flex items-end">
                <BaseButton
                  variant="primary"
                  :icon="PlusIcon"
                  @click="createNewAccount"
                  class="w-full"
                >
                  新增帳號
                </BaseButton>
              </div>
            </div>
          </BaseCard>

          <!-- 帳號列表 Table -->
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
                      使用者名稱
                    </th>
                    <th
                      class="px-6 py-3 text-left text-xs font-medium uppercase"
                      :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                    >
                      聯絡人
                    </th>
                    <th
                      class="px-6 py-3 text-left text-xs font-medium uppercase"
                      :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                    >
                      聯絡電話
                    </th>
                    <th
                      class="px-6 py-3 text-left text-xs font-medium uppercase"
                      :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                    >
                      角色
                    </th>
                    <th
                      class="px-6 py-3 text-left text-xs font-medium uppercase"
                      :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                    >
                      狀態
                    </th>
                    <th
                      class="px-6 py-3 text-left text-xs font-medium uppercase"
                      :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                    >
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody
                  :class="[
                    'divide-y',
                    theme === 'dark' ? 'divide-secondary-800' : 'divide-neutral-200'
                  ]"
                >
                  <tr
                    v-for="account in filteredAccounts"
                    :key="account.id"
                    :class="
                      theme === 'dark'
                        ? 'hover:bg-secondary-800'
                        : 'hover:bg-neutral-50'
                    "
                  >
                    <td
                      class="px-6 py-4 text-sm"
                      :class="theme === 'dark' ? 'text-white' : 'text-neutral-900'"
                    >
                      {{ account.username }}
                    </td>
                    <td
                      class="px-6 py-4 text-sm"
                      :class="theme === 'dark' ? 'text-white' : 'text-neutral-900'"
                    >
                      {{ account.contactPerson }}
                    </td>
                    <td
                      class="px-6 py-4 text-sm"
                      :class="theme === 'dark' ? 'text-white' : 'text-neutral-900'"
                    >
                      {{ account.contactPhone }}
                    </td>
                    <td
                      class="px-6 py-4 text-sm"
                      :class="theme === 'dark' ? 'text-white' : 'text-neutral-900'"
                    >
                      {{ getRoleName(account.roleId) }}
                    </td>
                    <td class="px-6 py-4 text-sm">
                      <span
                        :class="[
                          'px-2 py-1 text-xs font-medium rounded',
                          account.verified
                            ? theme === 'dark'
                              ? 'bg-green-900/30 text-green-400'
                              : 'bg-green-100 text-green-700'
                            : theme === 'dark'
                              ? 'bg-amber-900/30 text-amber-400'
                              : 'bg-amber-100 text-amber-700'
                        ]"
                      >
                        {{ account.verified ? '已驗證' : '未驗證' }}
                      </span>
                    </td>
                    <td class="px-6 py-4 text-sm">
                      <div class="flex flex-wrap gap-2">
                        <button
                          @click="editAccount(account)"
                          :class="[
                            'flex items-center gap-1 transition-colors',
                            theme === 'dark'
                              ? 'text-primary-400 hover:text-primary-300'
                              : 'text-primary-600 hover:text-primary-800'
                          ]"
                        >
                          <PencilIcon class="w-4 h-4" />
                          編輯
                        </button>
                        <button
                          @click="openPasswordResetModal(account)"
                          :class="[
                            'flex items-center gap-1 transition-colors',
                            theme === 'dark'
                              ? 'text-amber-400 hover:text-amber-300'
                              : 'text-amber-600 hover:text-amber-800'
                          ]"
                          title="重置密碼"
                        >
                          <KeyIcon class="w-4 h-4" />
                          重置密碼
                        </button>
                        <button
                          @click="deleteAccount(account.id)"
                          :class="[
                            'flex items-center gap-1 transition-colors',
                            theme === 'dark'
                              ? 'text-red-400 hover:text-red-300'
                              : 'text-red-600 hover:text-red-800'
                          ]"
                        >
                          <TrashIcon class="w-4 h-4" />
                          刪除
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- 空狀態 -->
            <div
              v-if="filteredAccounts.length === 0"
              class="text-center py-12"
              :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-500'"
            >
              <p>沒有找到符合條件的帳號</p>
            </div>
          </BaseCard>

        </PageContainer>
      </main>
    </div>

    <!-- 新增/編輯表單 Modal -->
    <div
      v-if="showForm"
      class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      @click.self="resetForm"
    >
      <div
        :class="[
          'rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col',
          theme === 'dark' ? 'bg-secondary-900' : 'bg-white'
        ]"
      >
        <!-- Modal Header (Sticky) -->
        <div
          :class="[
            'p-6 border-b flex items-center justify-between sticky top-0 z-10',
            theme === 'dark'
              ? 'bg-secondary-900 border-secondary-800'
              : 'bg-white border-neutral-200'
          ]"
        >
          <h2
            class="text-xl font-semibold"
            :class="theme === 'dark' ? 'text-white' : 'text-neutral-900'"
          >
            {{ isEditMode ? '編輯帳號' : '新增帳號' }}
          </h2>
          <button
            @click="resetForm"
            :class="[
              'p-2 rounded-lg transition-colors',
              theme === 'dark'
                ? 'hover:bg-secondary-800 text-neutral-400'
                : 'hover:bg-neutral-100 text-neutral-600'
            ]"
          >
            <XMarkIcon class="w-5 h-5" />
          </button>
        </div>

        <!-- Modal Body (Scrollable) -->
        <div class="p-6 overflow-y-auto flex-1">

          <div class="space-y-4">
            <!-- 基本資訊 -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  class="block text-sm font-medium mb-2"
                  :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                >
                  帳號 <span class="text-red-500">*</span>
                </label>
                <BaseInput
                  v-model="formData.name"
                  placeholder="請輸入帳號"
                />
              </div>

              <div>
                <label
                  class="block text-sm font-medium mb-2"
                  :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                >
                  使用者名稱 <span class="text-red-500">*</span>
                </label>
                <BaseInput
                  v-model="formData.username"
                  placeholder="請輸入使用者名稱"
                />
              </div>

              <div>
                <label
                  class="block text-sm font-medium mb-2"
                  :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                >
                  聯絡人 <span class="text-red-500">*</span>
                </label>
                <BaseInput
                  v-model="formData.contactPerson"
                  placeholder="請輸入聯絡人姓名"
                />
              </div>

              <div>
                <label
                  class="block text-sm font-medium mb-2"
                  :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                >
                  聯絡電話 <span class="text-red-500">*</span>
                </label>
                <BaseInput
                  v-model="formData.contactPhone"
                  type="tel"
                  placeholder="請輸入聯絡電話"
                />
              </div>

              <div>
                <label
                  class="block text-sm font-medium mb-2"
                  :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                >
                  角色 <span class="text-red-500">*</span>
                </label>
                <select
                  v-model="formData.roleId"
                  :class="[
                    'w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500',
                    theme === 'dark'
                      ? 'bg-secondary-900 border-secondary-700 text-white'
                      : 'bg-white border-neutral-300 text-neutral-900'
                  ]"
                >
                  <option value="">請選擇角色</option>
                  <option v-for="role in rbacStore.roles" :key="role.id" :value="role.id">
                    {{ role.name }}
                  </option>
                </select>
              </div>

              <div>
                <label class="flex items-center gap-2 h-full items-end pb-2">
                  <input
                    v-model="formData.verified"
                    type="checkbox"
                    class="w-4 h-4 text-primary-600 border-neutral-300 rounded focus:ring-primary-500"
                  />
                  <span
                    class="text-sm font-medium"
                    :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                  >
                    帳號已驗證
                  </span>
                </label>
              </div>
            </div>

            <!-- 可販售票種設定 -->
            <div
              :class="[
                'border-t pt-4',
                theme === 'dark' ? 'border-secondary-800' : 'border-neutral-200'
              ]"
            >
              <div class="flex items-center justify-between mb-3">
                <label
                  class="text-sm font-medium"
                  :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                >
                  可販售票種及價格設定
                </label>
                <div class="flex items-center gap-2">
                  <!-- 航段篩選 -->
                  <select
                    v-model="filterTicketRoute"
                    :class="[
                      'text-sm px-2 py-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500',
                      theme === 'dark'
                        ? 'bg-secondary-900 border-secondary-700 text-white'
                        : 'bg-white border-neutral-300 text-neutral-900'
                    ]"
                  >
                    <option value="">全部航段</option>
                    <option v-for="opt in availableRouteOptions" :key="opt.key" :value="opt.key">
                      {{ opt.label }}
                    </option>
                  </select>
                  <BaseButton variant="outline" size="sm" @click="selectAllTicketTypes">
                    全部選取
                  </BaseButton>
                  <BaseButton variant="outline" size="sm" @click="deselectAllTicketTypes">
                    全部取消
                  </BaseButton>
                </div>
              </div>
              <div
                :class="[
                  'border rounded-md p-4',
                  theme === 'dark'
                    ? 'border-secondary-800 bg-secondary-950'
                    : 'border-neutral-200 bg-neutral-50'
                ]"
              >
                <div class="space-y-4">
                  <div
                    v-for="ticket in filteredTicketTypes"
                    :key="ticket.id"
                    :class="[
                      'border rounded-lg p-4',
                      theme === 'dark'
                        ? 'border-secondary-800 bg-secondary-900'
                        : 'border-neutral-200 bg-white'
                    ]"
                  >
                    <!-- 票種選擇標題 -->
                    <div class="flex items-center gap-3 mb-3">
                      <input
                        :id="`ticket-${ticket.id}`"
                        type="checkbox"
                        :checked="isTicketTypeSelected(ticket.id)"
                        @change="toggleTicketType(ticket.id)"
                        class="w-4 h-4 text-primary-600 border-neutral-300 rounded focus:ring-primary-500"
                      />
                      <label
                        :for="`ticket-${ticket.id}`"
                        :class="[
                          'flex-1 text-sm font-medium',
                          theme === 'dark' ? 'text-white' : 'text-neutral-900'
                        ]"
                      >
                        {{ ticket.name }}
                        <span
                          :class="[
                            'font-normal ml-2',
                            theme === 'dark' ? 'text-neutral-400' : 'text-neutral-500'
                          ]"
                        >
                          (預設售價: NT$ {{ calculateSalePrice(ticket.facePrice, getDiscountBySegmentCount(ticket.segmentDiscounts, 1)) }})
                        </span>
                      </label>
                    </div>

                    <!-- 價格設定區域（僅在勾選時顯示） -->
                    <div v-if="isTicketTypeSelected(ticket.id)" class="ml-7 space-y-3">
                      <!-- 新增價格設定表單 -->
                      <div
                        v-if="newPriceSettings[ticket.id]"
                        :class="[
                          'border rounded-md p-3',
                          theme === 'dark'
                            ? 'bg-primary-900/20 border-primary-800'
                            : 'bg-primary-50 border-primary-200'
                        ]"
                      >
                        <div
                          class="text-xs font-medium mb-2"
                          :class="theme === 'dark' ? 'text-primary-400' : 'text-primary-900'"
                        >
                          新增價格設定
                        </div>
                        <div class="flex flex-wrap items-center gap-3">
                          <div class="flex items-center gap-2">
                            <label
                              class="text-xs"
                              :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                            >
                              價格:
                            </label>
                            <input
                              v-model.number="newPriceSettings[ticket.id]!.price"
                              type="number"
                              min="0"
                              step="1"
                              :class="[
                                'w-24 px-2 py-1 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500',
                                theme === 'dark'
                                  ? 'bg-secondary-950 border-secondary-700 text-white'
                                  : 'bg-white border-neutral-300 text-neutral-900'
                              ]"
                            />
                            <span
                              class="text-xs"
                              :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'"
                            >
                              元
                            </span>
                          </div>
                          <div class="flex items-center gap-2">
                            <label
                              class="text-xs"
                              :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                            >
                              啟用日期:
                            </label>
                            <input
                              v-model="newPriceSettings[ticket.id]!.effectiveDate"
                              type="date"
                              :class="[
                                'px-2 py-1 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500',
                                theme === 'dark'
                                  ? 'bg-secondary-950 border-secondary-700 text-white'
                                  : 'bg-white border-neutral-300 text-neutral-900'
                              ]"
                            />
                          </div>
                          <BaseButton
                            variant="primary"
                            size="sm"
                            @click="addPriceSetting(ticket.id)"
                          >
                            新增
                          </BaseButton>
                        </div>
                      </div>

                      <!-- 現有價格設定列表 -->
                      <div
                        v-if="getTicketPriceSettings(ticket.id).length > 0"
                        class="space-y-2"
                      >
                        <div
                          class="text-xs font-medium"
                          :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                        >
                          價格歷史記錄
                        </div>
                        <div class="space-y-1">
                          <div
                            v-for="setting in getTicketPriceSettings(ticket.id)"
                            :key="setting.id"
                            :class="[
                              'flex items-center justify-between gap-3 p-2 rounded-md text-xs',
                              theme === 'dark'
                                ? 'bg-secondary-950'
                                : 'bg-neutral-50'
                            ]"
                          >
                            <div class="flex items-center gap-4">
                              <span
                                class="font-medium"
                                :class="theme === 'dark' ? 'text-white' : 'text-neutral-900'"
                              >
                                NT$ {{ setting.customPrice }}
                              </span>
                              <span
                                :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'"
                              >
                                啟用日期: {{ setting.effectiveDate }}
                              </span>
                              <span
                                :class="theme === 'dark' ? 'text-neutral-500' : 'text-neutral-400'"
                              >
                                建立於: {{ new Date(setting.createdAt).toLocaleDateString() }}
                              </span>
                            </div>
                            <BaseButton
                              variant="danger"
                              size="sm"
                              @click="removePriceSetting(setting.id)"
                            >
                              刪除
                            </BaseButton>
                          </div>
                        </div>
                      </div>
                      <div
                        v-else
                        class="text-xs italic"
                        :class="theme === 'dark' ? 'text-neutral-500' : 'text-neutral-500'"
                      >
                        尚無價格設定，請新增至少一個價格設定
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Modal Footer (Sticky) -->
        <div
          :class="[
            'p-6 border-t flex gap-3 sticky bottom-0 z-10',
            theme === 'dark'
              ? 'bg-secondary-900 border-secondary-800'
              : 'bg-white border-neutral-200'
          ]"
        >
          <BaseButton
            variant="secondary"
            @click="resetForm"
          >
            取消
          </BaseButton>
          <BaseButton
            variant="primary"
            :icon="CheckIcon"
            @click="saveAccount"
            class="ml-auto"
          >
            {{ isEditMode ? '更新並儲存' : '創建帳號' }}
          </BaseButton>
        </div>
      </div>
    </div>

    <!-- 密碼重置 Modal -->
    <div
      v-if="showPasswordResetModal"
      class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      @click.self="closePasswordResetModal"
    >
      <div
        :class="[
          'rounded-lg shadow-xl max-w-md w-full',
          theme === 'dark' ? 'bg-secondary-900' : 'bg-white'
        ]"
      >
        <!-- Modal Header -->
        <div
          :class="[
            'p-6 border-b flex items-center justify-between',
            theme === 'dark' ? 'border-secondary-800' : 'border-neutral-200'
          ]"
        >
          <h2
            class="text-xl font-semibold flex items-center gap-2"
            :class="theme === 'dark' ? 'text-white' : 'text-neutral-900'"
          >
            <KeyIcon class="w-6 h-6 text-amber-500" />
            重置密碼
          </h2>
          <button
            @click="closePasswordResetModal"
            :class="[
              'p-2 rounded-lg transition-colors',
              theme === 'dark'
                ? 'hover:bg-secondary-800 text-neutral-400'
                : 'hover:bg-neutral-100 text-neutral-600'
            ]"
          >
            <XMarkIcon class="w-5 h-5" />
          </button>
        </div>

        <!-- Modal Body -->
        <div class="p-6">
          <div class="space-y-4">
            <div>
              <label
                class="block text-sm font-medium mb-2"
                :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
              >
                帳號
              </label>
              <p
                class="text-lg font-semibold"
                :class="theme === 'dark' ? 'text-white' : 'text-neutral-900'"
              >
                {{ resetPasswordAccountName }} ({{ resetPasswordUsername }})
              </p>
            </div>

            <div
              v-if="!newGeneratedPassword"
              :class="[
                'p-4 rounded-lg border',
                theme === 'dark'
                  ? 'bg-amber-950/30 border-amber-900 text-amber-400'
                  : 'bg-amber-50 border-amber-200 text-amber-700'
              ]"
            >
              <p class="text-sm">
                確定要重置此帳號的密碼嗎？系統將生成一組隨機密碼，請務必妥善保管並通知使用者。
              </p>
            </div>

            <div
              v-if="newGeneratedPassword"
              class="space-y-3"
            >
              <div
                :class="[
                  'p-4 rounded-lg border',
                  theme === 'dark'
                    ? 'bg-green-950/30 border-green-900 text-green-400'
                    : 'bg-green-50 border-green-200 text-green-700'
                ]"
              >
                <p class="text-sm font-medium mb-2">密碼已重置成功！</p>
                <p class="text-xs">請將以下密碼提供給使用者，並要求其首次登入後立即更改密碼。</p>
              </div>

              <div>
                <label
                  class="block text-sm font-medium mb-2"
                  :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                >
                  新密碼
                </label>
                <div class="flex gap-2">
                  <input
                    :value="newGeneratedPassword"
                    readonly
                    class="flex-1 px-4 py-3 rounded-lg border font-mono text-lg select-all"
                    :class="
                      theme === 'dark'
                        ? 'bg-secondary-800 border-secondary-700 text-white'
                        : 'bg-neutral-50 border-neutral-300 text-neutral-900'
                    "
                  />
                  <BaseButton
                    variant="outline"
                    :icon="ClipboardDocumentIcon"
                    @click="copyPasswordToClipboard"
                    title="複製密碼"
                  >
                    複製
                  </BaseButton>
                </div>
              </div>

              <div
                :class="[
                  'p-3 rounded-lg border text-xs',
                  theme === 'dark'
                    ? 'bg-red-950/30 border-red-900 text-red-400'
                    : 'bg-red-50 border-red-200 text-red-700'
                ]"
              >
                <p class="font-medium mb-1">⚠️ 重要提醒</p>
                <p>此密碼僅會顯示一次，請務必複製並妥善保管。關閉此視窗後將無法再次查看。</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Modal Footer -->
        <div
          :class="[
            'p-6 border-t flex gap-3',
            theme === 'dark' ? 'border-secondary-800' : 'border-neutral-200'
          ]"
        >
          <BaseButton
            variant="secondary"
            @click="closePasswordResetModal"
            class="flex-1"
          >
            {{ newGeneratedPassword ? '關閉' : '取消' }}
          </BaseButton>
          <BaseButton
            v-if="!newGeneratedPassword"
            variant="primary"
            :icon="KeyIcon"
            @click="executePasswordReset"
            class="flex-1"
          >
            確認重置
          </BaseButton>
        </div>
      </div>
    </div>
  </div>
</template>

