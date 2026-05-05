<script setup lang="ts">
import { ref, watch, computed } from 'vue'
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
import type { Role, RoleTemplate } from '@/types/rbac'
import {
  UserGroupIcon,
  PlusIcon,
  TrashIcon,
  CheckIcon
} from '@heroicons/vue/24/outline'

const rbacStore = useRbacStore()
const { isCollapsed } = useSidebar()
const { theme } = useTheme()
const { currentUser } = useAuth()

// 當前登入帳號資訊
const currentAccount = computed(() => {
  if (!currentUser.value) return null
  return rbacStore.accounts.find(a => a.username === currentUser.value) ?? null
})
const isCurrentSuperAdmin = computed(() => rbacStore.isSuperAdmin(currentAccount.value?.id ?? ''))
const currentOrgId = computed(() => currentAccount.value?.organizationId ?? null)

// 可見的角色列表（非 super_admin 只看到本組織角色）
const visibleRoles = computed(() => {
  if (isCurrentSuperAdmin.value) return rbacStore.roles
  return rbacStore.roles.filter(r => r.organizationId === currentOrgId.value)
})

// 角色範本選項
const roleTemplateOptions: { value: RoleTemplate; label: string }[] = [
  { value: 'super_admin', label: '系統超管' },
  { value: 'operator_admin', label: '航商管理員' },
  { value: 'maritime_staff', label: '船務人員' },
  { value: 'ticket_staff', label: '票口人員' },
  { value: 'partner', label: '合作廠商' }
]

// 表單資料
const formData = ref<Partial<Role>>({
  name: '',
  organizationId: 'org-sys',
  roleTemplate: 'ticket_staff',
  loginRoute: '',
  hasBackendAccess: true,
  permissionGroupIds: []
})

// 監聽選中的角色變化，更新表單資料
watch(
  () => rbacStore.selectedRole,
  (newRole) => {
    if (newRole) {
      formData.value = {
        name: newRole.name,
        organizationId: newRole.organizationId,
        roleTemplate: newRole.roleTemplate,
        loginRoute: newRole.loginRoute,
        hasBackendAccess: newRole.hasBackendAccess,
        permissionGroupIds: [...newRole.permissionGroupIds]
      }
    } else {
      resetForm()
    }
  },
  { immediate: true }
)

function resetForm() {
  const defaultOrgId = isCurrentSuperAdmin.value ? 'org-sys' : (currentOrgId.value ?? 'org-sys')
  formData.value = {
    name: '',
    organizationId: defaultOrgId,
    roleTemplate: 'ticket_staff',
    loginRoute: '',
    hasBackendAccess: true,
    permissionGroupIds: []
  }
}

// §3.14.4 啟用/停用 toggle
function toggleRoleActive(roleId: string) {
  const r = rbacStore.roles.find(x => x.id === roleId)
  if (!r) return
  rbacStore.updateRole(roleId, { isActive: r.isActive === false ? true : false })
}

function selectRole(roleId: string) {
  rbacStore.selectRole(roleId)
}

function createNewRole() {
  rbacStore.selectRole(null)
  resetForm()
}

function saveRole() {
  if (!formData.value.name) {
    alert('請輸入角色名稱')
    return
  }

  if (rbacStore.selectedRoleId) {
    // 更新現有角色
    rbacStore.updateRole(rbacStore.selectedRoleId, {
      name: formData.value.name!,
      organizationId: formData.value.organizationId!,
      roleTemplate: formData.value.roleTemplate!,
      loginRoute: formData.value.loginRoute!,
      hasBackendAccess: formData.value.hasBackendAccess!,
      permissionGroupIds: formData.value.permissionGroupIds!
    })
    alert('角色更新成功')
  } else {
    // 創建新角色（非 super_admin 只能在本組織建立角色）
    const targetOrgId = isCurrentSuperAdmin.value
      ? (formData.value.organizationId || 'org-sys')
      : (currentOrgId.value || 'org-sys')

    const newRole = rbacStore.createRole({
      name: formData.value.name!,
      organizationId: targetOrgId,
      roleTemplate: formData.value.roleTemplate || 'ticket_staff',
      loginRoute: formData.value.loginRoute || '/create-order',
      hasBackendAccess: formData.value.hasBackendAccess ?? true,
      permissionGroupIds: formData.value.permissionGroupIds || []
    })
    rbacStore.selectRole(newRole.id)
    alert('角色創建成功')
  }
}

function deleteRole() {
  if (!rbacStore.selectedRoleId) return

  if (confirm('確定要刪除此角色嗎？')) {
    rbacStore.deleteRole(rbacStore.selectedRoleId)
    alert('角色已刪除')
  }
}

function togglePermissionGroup(groupId: string) {
  const index = formData.value.permissionGroupIds!.indexOf(groupId)
  if (index === -1) {
    formData.value.permissionGroupIds!.push(groupId)
  } else {
    formData.value.permissionGroupIds!.splice(index, 1)
  }
}

function isPermissionGroupChecked(groupId: string): boolean {
  return formData.value.permissionGroupIds?.includes(groupId) ?? false
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
          title="角色管理"
          subtitle="管理系統角色及其對應的權限組"
          :icon="UserGroupIcon"
          max-width="full"
        >
          <!-- 內容區 -->
          <div class="grid grid-cols-12 gap-6">
            <!-- 左側：角色列表 -->
            <div class="col-span-12 lg:col-span-3">
              <BaseCard padding="md">
                <!-- 新增角色按鈕 -->
                <BaseButton
                  variant="primary"
                  :icon="PlusIcon"
                  @click="createNewRole"
                  class="w-full mb-4"
                >
                  新增角色
                </BaseButton>

                <!-- 角色列表 -->
                <div>
                  <h5
                    class="text-sm font-semibold mb-2"
                    :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                  >
                    角色
                  </h5>
                  <div class="space-y-1">
                    <div
                      v-for="role in visibleRoles"
                      :key="role.id"
                      class="flex items-center gap-1"
                    >
                      <button
                        @click="selectRole(role.id)"
                        :class="[
                          'flex-1 text-left px-3 py-2 rounded-md transition-colors',
                          rbacStore.selectedRoleId === role.id
                            ? theme === 'dark'
                              ? 'bg-primary-900/30 text-primary-400 font-medium'
                              : 'bg-primary-100 text-primary-700 font-medium'
                            : theme === 'dark'
                              ? 'hover:bg-secondary-800 text-neutral-300'
                              : 'hover:bg-neutral-100 text-neutral-700',
                          role.isActive === false ? 'opacity-60' : ''
                        ]"
                      >
                        {{ role.name }}
                      </button>
                      <button
                        @click="toggleRoleActive(role.id)"
                        :title="role.isActive === false ? '啟用角色' : '停用角色'"
                        :class="[
                          'px-2 py-1 text-[10px] font-medium rounded-full transition-colors shrink-0',
                          role.isActive === false
                            ? theme === 'dark'
                              ? 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                              : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
                            : theme === 'dark'
                              ? 'bg-green-900/30 text-green-300 hover:bg-green-900/50'
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                        ]"
                      >
                        {{ role.isActive === false ? '停用' : '啟用' }}
                      </button>
                    </div>
                  </div>
                </div>
              </BaseCard>
            </div>

            <!-- 右側：角色編輯器 -->
            <div class="col-span-12 lg:col-span-9">
              <BaseCard
                :title="rbacStore.selectedRoleId ? '編輯角色' : '新增角色'"
                padding="lg"
              >
                <div v-if="rbacStore.selectedRoleId || !rbacStore.selectedRole">
                  <div class="space-y-6">
                    <!-- 角色名稱 -->
                    <div>
                      <label
                        class="block text-sm font-medium mb-2"
                        :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                      >
                        名稱 <span class="text-red-500">*</span>
                      </label>
                      <BaseInput
                        v-model="formData.name"
                        placeholder="請輸入角色名稱"
                      />
                    </div>

                    <!-- 角色範本 -->
                    <div>
                      <label
                        class="block text-sm font-medium mb-2"
                        :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                      >
                        角色範本
                      </label>
                      <select
                        v-model="formData.roleTemplate"
                        :class="[
                          'w-full px-4 py-2.5 rounded-md border transition-colors',
                          theme === 'dark'
                            ? 'bg-secondary-900 border-secondary-800 text-white'
                            : 'bg-white border-neutral-300 text-neutral-900',
                          'focus:outline-none focus:ring-2 focus:ring-primary-500'
                        ]"
                      >
                        <option v-for="opt in roleTemplateOptions" :key="opt.value" :value="opt.value">
                          {{ opt.label }}
                        </option>
                      </select>
                    </div>

                    <!-- 登入預設路徑 -->
                    <div>
                      <label
                        class="block text-sm font-medium mb-2"
                        :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                      >
                        登入預設路徑
                      </label>
                      <BaseInput
                        v-model="formData.loginRoute"
                        placeholder="/create-order"
                      />
                    </div>

                    <!-- 登入後台權限 -->
                    <div>
                      <label
                        class="block text-sm font-medium mb-2"
                        :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                      >
                        登入後台權限
                      </label>
                      <select
                        v-model="formData.hasBackendAccess"
                        :class="[
                          'w-full px-4 py-2.5 rounded-md border transition-colors',
                          theme === 'dark'
                            ? 'bg-secondary-900 border-secondary-800 text-white'
                            : 'bg-white border-neutral-300 text-neutral-900',
                          'focus:outline-none focus:ring-2 focus:ring-primary-500'
                        ]"
                      >
                        <option :value="true">是</option>
                        <option :value="false">否</option>
                      </select>
                    </div>

                    <!-- 權限組配置 -->
                    <div>
                      <label
                        class="block text-sm font-medium mb-3"
                        :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                      >
                        權限組
                      </label>
                      <div
                        :class="[
                          'border rounded-md p-4',
                          theme === 'dark' ? 'border-secondary-800' : 'border-neutral-200'
                        ]"
                      >
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div
                            v-for="group in rbacStore.permissionGroups"
                            :key="group.id"
                            class="flex items-center"
                          >
                            <input
                              :id="`pg-${group.id}`"
                              type="checkbox"
                              :checked="isPermissionGroupChecked(group.id)"
                              @change="togglePermissionGroup(group.id)"
                              class="w-4 h-4 text-primary-600 border-neutral-300 rounded focus:ring-primary-500"
                            />
                            <label
                              :for="`pg-${group.id}`"
                              class="ml-2 text-sm"
                              :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                            >
                              {{ group.name }}
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- 操作按鈕 -->
                    <div
                      :class="[
                        'flex gap-3 pt-6 border-t',
                        theme === 'dark' ? 'border-secondary-800' : 'border-neutral-200'
                      ]"
                    >
                      <BaseButton
                        v-if="rbacStore.selectedRoleId"
                        variant="danger"
                        :icon="TrashIcon"
                        @click="deleteRole"
                      >
                        刪除角色
                      </BaseButton>
                      <BaseButton
                        variant="primary"
                        :icon="CheckIcon"
                        @click="saveRole"
                        class="ml-auto"
                      >
                        {{ rbacStore.selectedRoleId ? '更新並儲存' : '創建角色' }}
                      </BaseButton>
                    </div>
                  </div>
                </div>

                <div
                  v-else
                  class="text-center py-12"
                  :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-500'"
                >
                  <p>請從左側選擇一個角色進行編輯，或點擊「新增角色」創建新角色</p>
                </div>
              </BaseCard>
            </div>
          </div>
        </PageContainer>
      </main>
    </div>
  </div>
</template>
