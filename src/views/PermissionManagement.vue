<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRbacStore } from '@/stores/rbac'
import { useSidebar } from '@/composables/useSidebar'
import Navbar from '@/components/Navbar.vue'
import Sidebar from '@/components/Sidebar.vue'
import { RESOURCES } from '@/constants/resources'
import type { PermissionGroup, Permission } from '@/types/rbac'
import { PermissionAction } from '@/types/rbac'

const rbacStore = useRbacStore()
const { isCollapsed } = useSidebar()

// 表單資料
const formData = ref<Partial<PermissionGroup>>({
  name: '',
  permissions: []
})

// 監聽選中的權限組變化，更新表單資料
watch(
  () => rbacStore.selectedPermissionGroup,
  (newGroup) => {
    if (newGroup) {
      formData.value = {
        name: newGroup.name,
        permissions: JSON.parse(JSON.stringify(newGroup.permissions)) // 深拷貝
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
    permissions: []
  }
}

function selectPermissionGroup(groupId: string) {
  rbacStore.selectPermissionGroup(groupId)
}

function createNewPermissionGroup() {
  rbacStore.selectPermissionGroup(null)
  resetForm()
}

function savePermissionGroup() {
  if (!formData.value.name) {
    alert('請輸入權限組名稱')
    return
  }

  if (rbacStore.selectedPermissionGroupId) {
    // 更新現有權限組
    rbacStore.updatePermissionGroup(rbacStore.selectedPermissionGroupId, {
      name: formData.value.name!,
      permissions: formData.value.permissions || []
    })
    alert('權限組更新成功')
  } else {
    // 創建新權限組
    const newGroup = rbacStore.createPermissionGroup({
      name: formData.value.name!,
      permissions: formData.value.permissions || []
    })
    rbacStore.selectPermissionGroup(newGroup.id)
    alert('權限組創建成功')
  }
}

function deletePermissionGroup() {
  if (!rbacStore.selectedPermissionGroupId) return

  if (confirm('確定要刪除此權限組嗎？此操作將同時移除所有角色中對此權限組的引用。')) {
    rbacStore.deletePermissionGroup(rbacStore.selectedPermissionGroupId)
    alert('權限組已刪除')
  }
}

// 權限矩陣操作
function hasAction(resource: string, action: PermissionAction): boolean {
  const permission = formData.value.permissions?.find((p) => p.resource === resource)
  return permission?.actions.includes(action) ?? false
}

function toggleAction(resource: string, action: PermissionAction) {
  if (!formData.value.permissions) {
    formData.value.permissions = []
  }

  const permissionIndex = formData.value.permissions.findIndex((p) => p.resource === resource)

  if (permissionIndex === -1) {
    // 不存在此資源的權限，創建新的
    formData.value.permissions.push({
      resource,
      actions: [action]
    })
  } else {
    // 存在此資源的權限，切換操作
    const permission = formData.value.permissions[permissionIndex]
    const actionIndex = permission.actions.indexOf(action)

    if (actionIndex === -1) {
      // 添加操作
      permission.actions.push(action)
    } else {
      // 移除操作
      permission.actions.splice(actionIndex, 1)

      // 如果沒有任何操作了，移除整個權限項目
      if (permission.actions.length === 0) {
        formData.value.permissions.splice(permissionIndex, 1)
      }
    }
  }
}

// 所有操作類型
const allActions = [
  PermissionAction.READ,
  PermissionAction.CREATE,
  PermissionAction.UPDATE,
  PermissionAction.DELETE
]

// 操作類型的中文標籤
const actionLabels = {
  [PermissionAction.READ]: '讀取',
  [PermissionAction.CREATE]: '新增',
  [PermissionAction.UPDATE]: '修改',
  [PermissionAction.DELETE]: '刪除'
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <Navbar />
    <Sidebar active-route="permission-management" />

    <!-- 主要內容區 -->
    <main :class="['p-8 min-h-[calc(100vh-4rem)] transition-all duration-300', isCollapsed ? 'ml-20' : 'ml-64']">
      <!-- 頁面標題 -->
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900">權限管理</h1>
        <p class="text-gray-600 mt-1">管理權限組及其對應的資源操作權限</p>
      </div>

      <!-- 內容區 -->
      <div class="grid grid-cols-12 gap-6">
      <!-- 左側：權限組列表 -->
      <div class="col-span-3 bg-white rounded-lg shadow p-4">
        <!-- 新增權限組按鈕 -->
        <button
          @click="createNewPermissionGroup"
          class="w-full mb-4 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
        >
          + 新增權限組
        </button>

        <!-- 權限組列表 -->
        <div>
          <h5 class="text-sm font-semibold text-gray-700 mb-2">權限組</h5>
          <div class="space-y-1">
            <button
              v-for="group in rbacStore.permissionGroups"
              :key="group.id"
              @click="selectPermissionGroup(group.id)"
              class="w-full text-left px-3 py-2 rounded-md transition-colors"
              :class="
                rbacStore.selectedPermissionGroupId === group.id
                  ? 'bg-blue-100 text-blue-700 font-medium'
                  : 'hover:bg-gray-100 text-gray-700'
              "
            >
              {{ group.name }}
            </button>
          </div>
        </div>
      </div>

      <!-- 右側：權限組編輯器 -->
      <div class="col-span-9 bg-white rounded-lg shadow p-6">
        <div v-if="rbacStore.selectedPermissionGroupId || !rbacStore.selectedPermissionGroup">
          <h2 class="text-xl font-semibold text-gray-900 mb-6">
            {{ rbacStore.selectedPermissionGroupId ? '編輯權限組' : '新增權限組' }}
          </h2>

          <div class="space-y-6">
            <!-- 權限組名稱 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2"
                >名稱 <span class="text-red-500">*</span></label
              >
              <input
                v-model="formData.name"
                type="text"
                required
                placeholder="請輸入權限組名稱"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <!-- 權限矩陣 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-3">權限矩陣</label>
              <div class="border border-gray-200 rounded-md overflow-hidden">
                <div class="overflow-x-auto">
                  <table class="w-full">
                    <thead class="bg-gray-50">
                      <tr>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                          頁面/功能
                        </th>
                        <th
                          v-for="action in allActions"
                          :key="action"
                          class="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase"
                        >
                          {{ actionLabels[action] }}
                        </th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200">
                      <tr
                        v-for="resource in RESOURCES"
                        :key="resource.key"
                        class="hover:bg-gray-50"
                      >
                        <td class="px-4 py-3 text-sm text-gray-900">
                          <div>
                            <div class="font-medium">{{ resource.label }}</div>
                            <div v-if="resource.category" class="text-xs text-gray-500">
                              {{ resource.category }}
                            </div>
                          </div>
                        </td>
                        <td
                          v-for="action in allActions"
                          :key="`${resource.key}-${action}`"
                          class="px-4 py-3 text-center"
                        >
                          <input
                            type="checkbox"
                            :checked="hasAction(resource.key, action)"
                            @change="toggleAction(resource.key, action)"
                            class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <!-- 操作按鈕 -->
            <div class="flex gap-3 pt-4 border-t border-gray-200">
              <button
                v-if="rbacStore.selectedPermissionGroupId"
                @click="deletePermissionGroup"
                class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                刪除權限組
              </button>
              <button
                @click="savePermissionGroup"
                class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors ml-auto"
              >
                {{ rbacStore.selectedPermissionGroupId ? '更新並儲存' : '創建權限組' }}
              </button>
            </div>
          </div>
        </div>

        <div v-else class="text-center py-12 text-gray-500">
          <p>請從左側選擇一個權限組進行編輯，或點擊「新增權限組」創建新權限組</p>
        </div>
      </div>
    </div>
    </main>
  </div>
</template>
