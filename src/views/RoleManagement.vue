<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRbacStore } from '@/stores/rbac'
import { useSidebar } from '@/composables/useSidebar'
import { useTheme } from '@/composables/useTheme'
import Navbar from '@/components/Navbar.vue'
import Sidebar from '@/components/Sidebar.vue'
import PageContainer from '@/components/ui/PageContainer.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import type { Role } from '@/types/rbac'
import {
  UserGroupIcon,
  PlusIcon,
  TrashIcon,
  CheckIcon
} from '@heroicons/vue/24/outline'

const rbacStore = useRbacStore()
const { isCollapsed } = useSidebar()
const { theme } = useTheme()

// 表單資料
const formData = ref<Partial<Role>>({
  name: '',
  organizationId: 'org-1',
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
  formData.value = {
    name: '',
    organizationId: 'org-1',
    loginRoute: '',
    hasBackendAccess: true,
    permissionGroupIds: []
  }
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
      loginRoute: formData.value.loginRoute!,
      hasBackendAccess: formData.value.hasBackendAccess!,
      permissionGroupIds: formData.value.permissionGroupIds!
    })
    alert('角色更新成功')
  } else {
    // 創建新角色
    const newRole = rbacStore.createRole({
      name: formData.value.name!,
      organizationId: formData.value.organizationId || 'org-1',
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
                    <button
                      v-for="role in rbacStore.roles"
                      :key="role.id"
                      @click="selectRole(role.id)"
                      :class="[
                        'w-full text-left px-3 py-2 rounded-md transition-colors',
                        rbacStore.selectedRoleId === role.id
                          ? theme === 'dark'
                            ? 'bg-primary-900/30 text-primary-400 font-medium'
                            : 'bg-primary-100 text-primary-700 font-medium'
                          : theme === 'dark'
                            ? 'hover:bg-secondary-800 text-neutral-300'
                            : 'hover:bg-neutral-100 text-neutral-700'
                      ]"
                    >
                      {{ role.name }}
                    </button>
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
