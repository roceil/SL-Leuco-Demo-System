<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRbacStore } from '@/stores/rbac'
import { useTicketStore } from '@/stores/ticket'
import { useSidebar } from '@/composables/useSidebar'
import Navbar from '@/components/Navbar.vue'
import Sidebar from '@/components/Sidebar.vue'
import type { Account, TicketPriceSetting } from '@/types/rbac'
import { calculateSalePrice } from '@/types/ticket'

const rbacStore = useRbacStore()
const ticketStore = useTicketStore()
const { isCollapsed } = useSidebar()

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

// 篩選後的帳號列表
const filteredAccounts = computed(() => {
  let result = rbacStore.accounts

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

// 獲取機構名稱
function getOrganizationName(orgId: string): string {
  const org = rbacStore.organizations.find((o) => o.id === orgId)
  return org?.name || '未知機構'
}

// 獲取票種名稱
function getTicketTypeName(ticketTypeId: string): string {
  const ticket = ticketStore.ticketTypes.find((t) => t.id === ticketTypeId)
  return ticket?.name || '未知票種'
}

// 獲取票種的預設售價
function getTicketDefaultPrice(ticketTypeId: string): number {
  const ticket = ticketStore.ticketTypes.find((t) => t.id === ticketTypeId)
  if (!ticket) return 0
  return calculateSalePrice(ticket.basePrice, ticket.discount)
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
    // 更新現有帳號
    rbacStore.updateAccount(rbacStore.selectedAccountId, {
      username: formData.value.username!,
      name: formData.value.name!,
      contactPerson: formData.value.contactPerson!,
      contactPhone: formData.value.contactPhone!,
      organizationId: formData.value.organizationId!,
      roleId: formData.value.roleId!,
      verified: formData.value.verified!,
      availableTicketTypes: formData.value.availableTicketTypes || [],
      ticketPriceSettings: formData.value.ticketPriceSettings || []
    })
    alert('帳號更新成功')
  } else {
    // 創建新帳號
    rbacStore.createAccount({
      username: formData.value.username!,
      name: formData.value.name!,
      contactPerson: formData.value.contactPerson!,
      contactPhone: formData.value.contactPhone!,
      organizationId: formData.value.organizationId || 'org-1',
      roleId: formData.value.roleId!,
      verified: formData.value.verified ?? true,
      availableTicketTypes: formData.value.availableTicketTypes || [],
      ticketPriceSettings: formData.value.ticketPriceSettings || []
    })
    alert('帳號創建成功')
  }
  resetForm()
}

// 刪除帳號
function deleteAccount(accountId: string) {
  if (confirm('確定要刪除此帳號嗎？')) {
    rbacStore.deleteAccount(accountId)
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
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <Navbar />
    <Sidebar active-route="account-management" />

    <!-- 主要內容區 -->
    <main
      :class="[
        'p-8 min-h-[calc(100vh-4rem)] transition-all duration-300',
        isCollapsed ? 'ml-20' : 'ml-64'
      ]"
    >
      <!-- 頁面標題 -->
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900">帳號管理</h1>
        <p class="text-gray-600 mt-1">管理系統帳號及其販售權限</p>
      </div>

      <!-- 篩選器和新增按鈕 -->
      <div class="bg-white rounded-lg shadow p-4 mb-6">
        <div class="grid grid-cols-4 gap-4">
          <!-- 關鍵字搜尋 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">搜尋</label>
            <input
              v-model="searchKeyword"
              type="text"
              placeholder="帳號、使用者名稱、聯絡人、電話..."
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <!-- 角色篩選 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">角色</label>
            <select
              v-model="filterRole"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">全部</option>
              <option v-for="role in rbacStore.roles" :key="role.id" :value="role.id">
                {{ role.name }}
              </option>
            </select>
          </div>

          <!-- 驗證狀態篩選 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">驗證狀態</label>
            <select
              v-model="filterVerified"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">全部</option>
              <option value="true">已驗證</option>
              <option value="false">未驗證</option>
            </select>
          </div>

          <!-- 新增按鈕 -->
          <div class="flex items-end">
            <button
              @click="createNewAccount"
              class="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              + 新增帳號
            </button>
          </div>
        </div>
      </div>

      <!-- 帳號列表 Table -->
      <div class="bg-white rounded-lg shadow overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  使用者名稱
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  聯絡人
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  聯絡電話
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  角色
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  可販售票種
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  狀態
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  操作
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              <tr
                v-for="account in filteredAccounts"
                :key="account.id"
                class="hover:bg-gray-50"
              >
                <td class="px-6 py-4 text-sm text-gray-900">{{ account.username }}</td>
                <td class="px-6 py-4 text-sm text-gray-900">{{ account.contactPerson }}</td>
                <td class="px-6 py-4 text-sm text-gray-900">{{ account.contactPhone }}</td>
                <td class="px-6 py-4 text-sm text-gray-900">{{ getRoleName(account.roleId) }}</td>
                <td class="px-6 py-4 text-sm text-gray-600">
                  <div class="flex flex-wrap gap-1">
                    <span
                      v-for="ticketId in account.availableTicketTypes"
                      :key="ticketId"
                      class="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded"
                    >
                      {{ getTicketTypeName(ticketId) }}
                    </span>
                  </div>
                </td>
                <td class="px-6 py-4 text-sm">
                  <span
                    :class="[
                      'px-2 py-1 text-xs font-medium rounded',
                      account.verified
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                    ]"
                  >
                    {{ account.verified ? '已驗證' : '未驗證' }}
                  </span>
                </td>
                <td class="px-6 py-4 text-sm">
                  <div class="flex gap-2">
                    <button
                      @click="editAccount(account)"
                      class="text-blue-600 hover:text-blue-800"
                    >
                      編輯
                    </button>
                    <button
                      @click="deleteAccount(account.id)"
                      class="text-red-600 hover:text-red-800"
                    >
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
          class="text-center py-12 text-gray-500"
        >
          <p>沒有找到符合條件的帳號</p>
        </div>
      </div>

      <!-- 新增/編輯表單 Modal -->
      <div
        v-if="showForm"
        class="fixed inset-0 bg-gray-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        @click.self="resetForm"
      >
        <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div class="p-6">
            <h2 class="text-xl font-semibold text-gray-900 mb-6">
              {{ isEditMode ? '編輯帳號' : '新增帳號' }}
            </h2>

            <div class="space-y-4">
              <!-- 基本資訊 -->
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2"
                    >帳號 <span class="text-red-500">*</span></label
                  >
                  <input
                    v-model="formData.name"
                    type="text"
                    required
                    placeholder="請輸入帳號"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2"
                    >使用者名稱 <span class="text-red-500">*</span></label
                  >
                  <input
                    v-model="formData.username"
                    type="text"
                    required
                    placeholder="請輸入使用者名稱"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2"
                    >聯絡人 <span class="text-red-500">*</span></label
                  >
                  <input
                    v-model="formData.contactPerson"
                    type="text"
                    required
                    placeholder="請輸入聯絡人姓名"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2"
                    >聯絡電話 <span class="text-red-500">*</span></label
                  >
                  <input
                    v-model="formData.contactPhone"
                    type="tel"
                    required
                    placeholder="請輸入聯絡電話"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2"
                    >角色 <span class="text-red-500">*</span></label
                  >
                  <select
                    v-model="formData.roleId"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span class="text-sm font-medium text-gray-700">帳號已驗證</span>
                  </label>
                </div>
              </div>

              <!-- 可販售票種設定 -->
              <div class="border-t border-gray-200 pt-4">
                <label class="block text-sm font-medium text-gray-700 mb-3"
                  >可販售票種及價格設定</label
                >
                <div class="border border-gray-200 rounded-md p-4">
                  <div class="space-y-4">
                    <div
                      v-for="ticket in ticketStore.ticketTypes"
                      :key="ticket.id"
                      class="border border-gray-200 rounded-lg p-4 bg-white"
                    >
                      <!-- 票種選擇標題 -->
                      <div class="flex items-center gap-3 mb-3">
                        <input
                          :id="`ticket-${ticket.id}`"
                          type="checkbox"
                          :checked="isTicketTypeSelected(ticket.id)"
                          @change="toggleTicketType(ticket.id)"
                          class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label :for="`ticket-${ticket.id}`" class="flex-1 text-sm font-medium text-gray-900">
                          {{ ticket.name }}
                          <span class="text-gray-500 font-normal ml-2"
                            >(預設售價: NT$ {{ calculateSalePrice(ticket.basePrice, ticket.discount) }})</span
                          >
                        </label>
                      </div>

                      <!-- 價格設定區域（僅在勾選時顯示） -->
                      <div v-if="isTicketTypeSelected(ticket.id)" class="ml-7 space-y-3">
                        <!-- 新增價格設定表單 -->
                        <div v-if="newPriceSettings[ticket.id]" class="bg-blue-50 border border-blue-200 rounded-md p-3">
                          <div class="text-xs font-medium text-blue-900 mb-2">新增價格設定</div>
                          <div class="flex items-center gap-3">
                            <div class="flex items-center gap-2">
                              <label class="text-xs text-gray-700">價格:</label>
                              <input
                                v-model.number="newPriceSettings[ticket.id]!.price"
                                type="number"
                                min="0"
                                step="1"
                                class="w-24 px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              <span class="text-xs text-gray-600">元</span>
                            </div>
                            <div class="flex items-center gap-2">
                              <label class="text-xs text-gray-700">啟用日期:</label>
                              <input
                                v-model="newPriceSettings[ticket.id]!.effectiveDate"
                                type="date"
                                class="px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <button
                              @click="addPriceSetting(ticket.id)"
                              class="px-3 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                            >
                              新增
                            </button>
                          </div>
                        </div>

                        <!-- 現有價格設定列表 -->
                        <div
                          v-if="getTicketPriceSettings(ticket.id).length > 0"
                          class="space-y-2"
                        >
                          <div class="text-xs font-medium text-gray-700">價格歷史記錄</div>
                          <div class="space-y-1">
                            <div
                              v-for="setting in getTicketPriceSettings(ticket.id)"
                              :key="setting.id"
                              class="flex items-center justify-between gap-3 p-2 bg-gray-50 rounded-md text-xs"
                            >
                              <div class="flex items-center gap-4">
                                <span class="text-gray-900 font-medium">
                                  NT$ {{ setting.customPrice }}
                                </span>
                                <span class="text-gray-600">
                                  啟用日期: {{ setting.effectiveDate }}
                                </span>
                                <span class="text-gray-400">
                                  建立於: {{ new Date(setting.createdAt).toLocaleDateString() }}
                                </span>
                              </div>
                              <button
                                @click="removePriceSetting(setting.id)"
                                class="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                              >
                                刪除
                              </button>
                            </div>
                          </div>
                        </div>
                        <div v-else class="text-xs text-gray-500 italic">
                          尚無價格設定，請新增至少一個價格設定
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 操作按鈕 -->
            <div class="flex gap-3 pt-6 border-t border-gray-200 mt-6">
              <button
                @click="resetForm"
                class="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
              >
                取消
              </button>
              <button
                @click="saveAccount"
                class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors ml-auto"
              >
                {{ isEditMode ? '更新並儲存' : '創建帳號' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

