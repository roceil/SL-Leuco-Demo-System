<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRbacStore } from '@/stores/rbac'
import { useSidebar } from '@/composables/useSidebar'
import Navbar from '@/components/Navbar.vue'
import Sidebar from '@/components/Sidebar.vue'
import type { Role } from '@/types/rbac'

const rbacStore = useRbacStore()
const { isCollapsed } = useSidebar()

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
      loginRoute: formData.value.loginRoute || '/dashboard',
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
  <div class="min-h-screen bg-gray-50">
    <Navbar />
    <Sidebar active-route="role-management" />

    <!-- 主要內容區 -->
    <main :class="['p-8 min-h-[calc(100vh-4rem)] transition-all duration-300', isCollapsed ? 'ml-20' : 'ml-64']">
      <!-- 頁面標題 -->
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900">角色管理</h1>
        <p class="text-gray-600 mt-1">管理系統角色及其對應的權限組</p>
      </div>

      <!-- 內容區 -->
      <div class="grid grid-cols-12 gap-6">
      <!-- 左側：角色列表 -->
      <div class="col-span-3 bg-white rounded-lg shadow p-4">
        <!-- 新增角色按鈕 -->
        <button
          @click="createNewRole"
          class="w-full mb-4 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
        >
          + 新增角色
        </button>

        <!-- 角色列表 -->
        <div>
          <h5 class="text-sm font-semibold text-gray-700 mb-2">角色</h5>
          <div class="space-y-1">
            <button
              v-for="role in rbacStore.roles"
              :key="role.id"
              @click="selectRole(role.id)"
              class="w-full text-left px-3 py-2 rounded-md transition-colors"
              :class="
                rbacStore.selectedRoleId === role.id
                  ? 'bg-blue-100 text-blue-700 font-medium'
                  : 'hover:bg-gray-100 text-gray-700'
              "
            >
              {{ role.name }}
            </button>
          </div>
        </div>
      </div>

      <!-- 右側：角色編輯器 -->
      <div class="col-span-9 bg-white rounded-lg shadow p-6">
        <div v-if="rbacStore.selectedRoleId || !rbacStore.selectedRole">
          <h2 class="text-xl font-semibold text-gray-900 mb-6">
            {{ rbacStore.selectedRoleId ? '編輯角色' : '新增角色' }}
          </h2>

          <div class="space-y-4">
            <!-- 角色名稱 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2"
                >名稱 <span class="text-red-500">*</span></label
              >
              <input
                v-model="formData.name"
                type="text"
                required
                placeholder="請輸入角色名稱"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <!-- 登入預設路徑 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">登入預設路徑</label>
              <input
                v-model="formData.loginRoute"
                type="text"
                placeholder="/dashboard"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <!-- 登入後台權限 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">登入後台權限</label>
              <select
                v-model="formData.hasBackendAccess"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option :value="true">是</option>
                <option :value="false">否</option>
              </select>
            </div>

            <!-- 權限組配置 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-3">權限組</label>
              <div class="border border-gray-200 rounded-md p-4">
                <div class="grid grid-cols-2 gap-3">
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
                      class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label :for="`pg-${group.id}`" class="ml-2 text-sm text-gray-700">
                      {{ group.name }}
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <!-- 操作按鈕 -->
            <div class="flex gap-3 pt-4 border-t border-gray-200">
              <button
                v-if="rbacStore.selectedRoleId"
                @click="deleteRole"
                class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                刪除角色
              </button>
              <button
                @click="saveRole"
                class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors ml-auto"
              >
                {{ rbacStore.selectedRoleId ? '更新並儲存' : '創建角色' }}
              </button>
            </div>
          </div>
        </div>

        <div v-else class="text-center py-12 text-gray-500">
          <p>請從左側選擇一個角色進行編輯，或點擊「新增角色」創建新角色</p>
        </div>
      </div>
    </div>
    </main>
  </div>
</template>
