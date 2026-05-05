<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRbacStore } from '@/stores/rbac'
import { useSidebar } from '@/composables/useSidebar'
import { useTheme } from '@/composables/useTheme'
import { useAuth } from '@/composables/useAuth'
import Navbar from '@/components/Navbar.vue'
import Sidebar from '@/components/Sidebar.vue'
import PageContainer from '@/components/ui/PageContainer.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import type { Organization } from '@/types/rbac'
import { PermissionAction } from '@/types/rbac'
import {
  BuildingOfficeIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
  ExclamationTriangleIcon
} from '@heroicons/vue/24/outline'

const rbacStore = useRbacStore()
const { isCollapsed } = useSidebar()
const { theme } = useTheme()
const { currentUser } = useAuth()

// 取得當前登入帳號 ID
const currentAccountId = computed(() => {
  if (!currentUser.value) return ''
  const acc = rbacStore.accounts.find(a => a.username === currentUser.value)
  return acc?.id ?? ''
})

// 權限守衛：只有 super_admin 可以管理組織
const canManage = computed(() =>
  rbacStore.hasPermission(currentAccountId.value, 'manage-organization', PermissionAction.READ)
)

// 表單狀態
const showForm = ref(false)
const isEditMode = ref(false)
const editingOrgId = ref<string | null>(null)
const errorMessage = ref('')

const formData = ref<Partial<Organization>>({
  name: '',
  code: '',
  contactEmail: '',
  contactPhone: ''
})

function resetForm() {
  formData.value = { name: '', code: '', contactEmail: '', contactPhone: '' }
  isEditMode.value = false
  editingOrgId.value = null
  showForm.value = false
  errorMessage.value = ''
}

function openCreateForm() {
  resetForm()
  showForm.value = true
}

function openEditForm(org: Organization) {
  formData.value = {
    name: org.name,
    code: org.code ?? '',
    contactEmail: org.contactEmail ?? '',
    contactPhone: org.contactPhone ?? ''
  }
  editingOrgId.value = org.id
  isEditMode.value = true
  showForm.value = true
  errorMessage.value = ''
}

function isCodeTaken(code: string, excludeId?: string): boolean {
  return rbacStore.organizations.some(
    (o) => o.code?.toUpperCase() === code.toUpperCase() && o.id !== excludeId
  )
}

async function saveOrganization() {
  if (!formData.value.name?.trim()) {
    errorMessage.value = '請輸入航商名稱'
    return
  }

  // 公司代號驗證（僅新增時必填，編輯時 code 是 disabled 不會送出）
  const rawCode = formData.value.code?.trim().toUpperCase() ?? ''
  if (!isEditMode.value) {
    if (!rawCode) {
      errorMessage.value = '請輸入公司代號（單一英文字母 A-Z，建立後不可修改）'
      return
    }
    if (!/^[A-Z]$/.test(rawCode)) {
      errorMessage.value = '公司代號格式錯誤：請輸入單一英文字母 A-Z'
      return
    }
    if (isCodeTaken(rawCode)) {
      errorMessage.value = `公司代號「${rawCode}」已被其他航商使用`
      return
    }
  }

  errorMessage.value = ''

  if (isEditMode.value && editingOrgId.value) {
    // code 為不可修改欄位，刻意不傳入 updates
    await rbacStore.updateOrganization(editingOrgId.value, {
      name: formData.value.name!,
      contactEmail: formData.value.contactEmail,
      contactPhone: formData.value.contactPhone
    })
    alert('航商資訊更新成功')
  } else {
    await rbacStore.createOrganization({
      name: formData.value.name!,
      code: rawCode,
      contactEmail: formData.value.contactEmail,
      contactPhone: formData.value.contactPhone
    })
    alert('航商新增成功')
  }
  resetForm()
}

async function deleteOrganization(org: Organization) {
  if (!confirm(`確定要刪除「${org.name}」嗎？\n注意：若該航商仍有關聯帳號，將無法刪除。`)) return
  try {
    await rbacStore.deleteOrganization(org.id)
    alert('航商已刪除')
  } catch (e: unknown) {
    alert(e instanceof Error ? e.message : '刪除失敗')
  }
}

// 取得各組織的帳號數量
function getAccountCount(orgId: string): number {
  return rbacStore.accounts.filter(a => a.organizationId === orgId).length
}
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <Navbar :username="currentUser ?? ''" />

    <div class="flex flex-1">
      <Sidebar :active-route="$route.path.slice(1)" />

      <main
        :class="[
          'flex-1 transition-all duration-300',
          isCollapsed ? 'ml-20' : 'ml-64'
        ]"
      >
        <PageContainer
          title="組織管理"
          subtitle="管理系統中的航商組織"
          :icon="BuildingOfficeIcon"
          max-width="2xl"
        >
          <!-- 無權限提示 -->
          <div
            v-if="!canManage"
            :class="[
              'flex items-center gap-3 p-4 rounded-lg border mb-6',
              theme === 'dark'
                ? 'bg-red-950/30 border-red-900 text-red-400'
                : 'bg-red-50 border-red-200 text-red-700'
            ]"
          >
            <ExclamationTriangleIcon class="w-5 h-5 shrink-0" />
            <p class="text-sm">您沒有管理組織的權限，此頁面僅限系統管理員存取。</p>
          </div>

          <template v-else>
            <!-- 新增按鈕 -->
            <div class="mb-6 flex justify-end">
              <BaseButton variant="primary" :icon="PlusIcon" @click="openCreateForm">
                新增航商
              </BaseButton>
            </div>

            <!-- 組織列表 -->
            <BaseCard padding="none">
              <div class="overflow-x-auto">
                <table class="w-full">
                  <thead
                    :class="theme === 'dark' ? 'bg-secondary-800' : 'bg-neutral-50'"
                  >
                    <tr>
                      <th
                        class="px-6 py-3 text-left text-xs font-medium uppercase"
                        :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                      >
                        航商名稱
                      </th>
                      <th
                        class="px-6 py-3 text-left text-xs font-medium uppercase"
                        :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                      >
                        公司代號
                      </th>
                      <th
                        class="px-6 py-3 text-left text-xs font-medium uppercase"
                        :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                      >
                        聯絡信箱
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
                        關聯帳號數
                      </th>
                      <th
                        class="px-6 py-3 text-left text-xs font-medium uppercase"
                        :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                      >
                        建立時間
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
                      v-for="org in rbacStore.organizations"
                      :key="org.id"
                      :class="theme === 'dark' ? 'hover:bg-secondary-800' : 'hover:bg-neutral-50'"
                    >
                      <td
                        class="px-6 py-4 text-sm font-medium"
                        :class="theme === 'dark' ? 'text-white' : 'text-neutral-900'"
                      >
                        {{ org.name }}
                        <span
                          class="ml-2 text-xs font-normal"
                          :class="theme === 'dark' ? 'text-neutral-500' : 'text-neutral-400'"
                        >
                          ({{ org.id }})
                        </span>
                      </td>
                      <td class="px-6 py-4 text-sm">
                        <span
                          v-if="org.code"
                          :class="[
                            'inline-flex items-center justify-center w-7 h-7 font-mono font-bold rounded',
                            theme === 'dark'
                              ? 'bg-primary-900/30 text-primary-300'
                              : 'bg-primary-100 text-primary-700'
                          ]"
                        >
                          {{ org.code }}
                        </span>
                        <span
                          v-else
                          :class="theme === 'dark' ? 'text-neutral-500' : 'text-neutral-400'"
                        >—</span>
                      </td>
                      <td
                        class="px-6 py-4 text-sm"
                        :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                      >
                        {{ org.contactEmail || '—' }}
                      </td>
                      <td
                        class="px-6 py-4 text-sm"
                        :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                      >
                        {{ org.contactPhone || '—' }}
                      </td>
                      <td class="px-6 py-4 text-sm">
                        <span
                          :class="[
                            'px-2 py-1 text-xs font-medium rounded',
                            getAccountCount(org.id) > 0
                              ? theme === 'dark'
                                ? 'bg-primary-900/30 text-primary-400'
                                : 'bg-primary-100 text-primary-700'
                              : theme === 'dark'
                                ? 'text-neutral-500'
                                : 'text-neutral-400'
                          ]"
                        >
                          {{ getAccountCount(org.id) }} 個帳號
                        </span>
                      </td>
                      <td
                        class="px-6 py-4 text-sm"
                        :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-500'"
                      >
                        {{ org.createdAt ? new Date(org.createdAt).toLocaleDateString('zh-TW') : '—' }}
                      </td>
                      <td class="px-6 py-4 text-sm">
                        <div class="flex items-center gap-3">
                          <button
                            @click="openEditForm(org)"
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
                            @click="deleteOrganization(org)"
                            :disabled="org.id === 'org-sys'"
                            :class="[
                              'flex items-center gap-1 transition-colors',
                              org.id === 'org-sys'
                                ? theme === 'dark' ? 'text-neutral-600 cursor-not-allowed' : 'text-neutral-300 cursor-not-allowed'
                                : theme === 'dark'
                                  ? 'text-red-400 hover:text-red-300'
                                  : 'text-red-600 hover:text-red-800'
                            ]"
                            :title="org.id === 'org-sys' ? '系統組織不可刪除' : ''"
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

              <div
                v-if="rbacStore.organizations.length === 0"
                class="text-center py-12"
                :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-500'"
              >
                <p>尚無航商資料</p>
              </div>
            </BaseCard>
          </template>
        </PageContainer>
      </main>
    </div>

    <!-- 新增/編輯 Modal -->
    <div
      v-if="showForm"
      class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      @click.self="resetForm"
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
            class="text-xl font-semibold"
            :class="theme === 'dark' ? 'text-white' : 'text-neutral-900'"
          >
            {{ isEditMode ? '編輯航商' : '新增航商' }}
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

        <!-- Modal Body -->
        <div class="p-6 space-y-4">
          <div
            v-if="errorMessage"
            :class="[
              'p-3 rounded-lg border text-sm',
              theme === 'dark'
                ? 'bg-red-950/30 border-red-900 text-red-400'
                : 'bg-red-50 border-red-200 text-red-700'
            ]"
          >
            {{ errorMessage }}
          </div>

          <div>
            <label
              class="block text-sm font-medium mb-2"
              :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
            >
              航商名稱 <span class="text-red-500">*</span>
            </label>
            <BaseInput v-model="formData.name" placeholder="例：新設航運" />
          </div>

          <div>
            <label
              class="block text-sm font-medium mb-2"
              :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
            >
              公司代號
              <span v-if="!isEditMode" class="text-red-500">*</span>
              <span
                class="ml-2 text-xs font-normal"
                :class="theme === 'dark' ? 'text-neutral-500' : 'text-neutral-500'"
              >
                單一英文字母 A-Z；建立後不可修改；會帶入訂單編號開頭（如 K → K20260224-7299）
              </span>
            </label>
            <BaseInput
              v-model="formData.code"
              :disabled="isEditMode"
              maxlength="1"
              placeholder="例：K"
            />
          </div>

          <div>
            <label
              class="block text-sm font-medium mb-2"
              :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
            >
              聯絡信箱
            </label>
            <BaseInput v-model="formData.contactEmail" type="email" placeholder="contact@example.com" />
          </div>

          <div>
            <label
              class="block text-sm font-medium mb-2"
              :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
            >
              聯絡電話
            </label>
            <BaseInput v-model="formData.contactPhone" type="tel" placeholder="089-000000" />
          </div>
        </div>

        <!-- Modal Footer -->
        <div
          :class="[
            'p-6 border-t flex gap-3',
            theme === 'dark' ? 'border-secondary-800' : 'border-neutral-200'
          ]"
        >
          <BaseButton variant="secondary" @click="resetForm">取消</BaseButton>
          <BaseButton
            variant="primary"
            :icon="CheckIcon"
            @click="saveOrganization"
            class="ml-auto"
          >
            {{ isEditMode ? '更新並儲存' : '新增航商' }}
          </BaseButton>
        </div>
      </div>
    </div>
  </div>
</template>
