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
import { RESOURCES } from '@/constants/resources'
import type { PermissionGroup } from '@/types/rbac'
import { PermissionAction } from '@/types/rbac'
import {
  ShieldCheckIcon,
  PlusIcon,
  TrashIcon
} from '@heroicons/vue/24/outline'

const rbacStore = useRbacStore()
const { isCollapsed } = useSidebar()
const { theme } = useTheme()

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
    const permission = formData.value.permissions![permissionIndex]!
    const actionIndex = permission.actions.indexOf(action)

    if (actionIndex === -1) {
      // 添加操作
      permission.actions.push(action)
    } else {
      // 移除操作
      permission.actions.splice(actionIndex, 1)

      // 如果沒有任何操作了，移除整個權限項目
      if (permission.actions.length === 0) {
        formData.value.permissions!.splice(permissionIndex, 1)
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
  <div class="min-h-screen flex flex-col">
    <Navbar username="管理員" />

    <div class="flex flex-1">
      <Sidebar :active-route="$route.path.slice(1)" />

      <main :class="[
        'flex-1 transition-all duration-300',
        isCollapsed ? 'ml-20' : 'ml-64'
      ]">
        <PageContainer
          title="權限管理"
          subtitle="管理權限組及其對應的資源操作權限"
          :icon="ShieldCheckIcon"
          max-width="full"
        >
          <!-- 內容區 -->
          <div class="grid grid-cols-12 gap-6">
            <!-- 左側：權限組列表 -->
            <div class="col-span-12 lg:col-span-3">
              <BaseCard padding="md">
                <!-- 新增權限組按鈕 -->
                <BaseButton
                  variant="primary"
                  :icon="PlusIcon"
                  @click="createNewPermissionGroup"
                  class="w-full mb-4"
                >
                  新增權限組
                </BaseButton>

                <!-- 權限組列表 -->
                <div>
                  <h5
                    class="text-sm font-semibold mb-2"
                    :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                  >
                    權限組
                  </h5>
                  <div class="space-y-1">
                    <button
                      v-for="group in rbacStore.permissionGroups"
                      :key="group.id"
                      @click="selectPermissionGroup(group.id)"
                      :class="[
                        'w-full text-left px-3 py-2 rounded-md transition-colors',
                        rbacStore.selectedPermissionGroupId === group.id
                          ? theme === 'dark'
                            ? 'bg-primary-900/30 text-primary-400 font-medium'
                            : 'bg-primary-100 text-primary-700 font-medium'
                          : theme === 'dark'
                            ? 'hover:bg-secondary-800 text-neutral-300'
                            : 'hover:bg-neutral-100 text-neutral-700'
                      ]"
                    >
                      {{ group.name }}
                    </button>
                  </div>
                </div>
              </BaseCard>
            </div>

            <!-- 右側：權限組編輯器 -->
            <div class="col-span-12 lg:col-span-9">
              <BaseCard
                :title="rbacStore.selectedPermissionGroupId ? '編輯權限組' : '新增權限組'"
                padding="lg"
              >
                <div v-if="rbacStore.selectedPermissionGroupId || !rbacStore.selectedPermissionGroup">
                  <div class="space-y-6">
                    <!-- 權限組名稱 -->
                    <div>
                      <label
                        class="block text-sm font-medium mb-2"
                        :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                      >
                        名稱 <span class="text-red-500">*</span>
                      </label>
                      <BaseInput
                        v-model="formData.name"
                        placeholder="請輸入權限組名稱"
                      />
                    </div>

                    <!-- 權限矩陣 -->
                    <div>
                      <label
                        class="block text-sm font-medium mb-3"
                        :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                      >
                        權限矩陣
                      </label>
                      <div :class="[
                        'border rounded-md overflow-hidden',
                        theme === 'dark' ? 'border-secondary-800' : 'border-neutral-200'
                      ]">
                        <div class="overflow-x-auto">
                          <table class="w-full">
                            <thead :class="theme === 'dark' ? 'bg-secondary-800' : 'bg-neutral-50'">
                              <tr>
                                <th
                                  class="px-4 py-3 text-left text-xs font-medium uppercase"
                                  :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                                >
                                  頁面/功能
                                </th>
                                <th
                                  v-for="action in allActions"
                                  :key="action"
                                  class="px-4 py-3 text-center text-xs font-medium uppercase"
                                  :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                                >
                                  {{ actionLabels[action] }}
                                </th>
                              </tr>
                            </thead>
                            <tbody :class="[
                              'divide-y',
                              theme === 'dark' ? 'divide-secondary-800' : 'divide-neutral-200'
                            ]">
                              <tr
                                v-for="resource in RESOURCES"
                                :key="resource.key"
                                :class="theme === 'dark'
                                  ? 'hover:bg-secondary-800'
                                  : 'hover:bg-neutral-50'
                                  "
                              >
                                <td
                                  class="px-4 py-3 text-sm"
                                  :class="theme === 'dark' ? 'text-white' : 'text-neutral-900'"
                                >
                                  <div>
                                    <div class="font-medium">{{ resource.label }}</div>
                                    <div
                                      v-if="resource.category"
                                      class="text-xs"
                                      :class="theme === 'dark' ? 'text-neutral-500' : 'text-neutral-500'"
                                    >
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
                                    class="w-4 h-4 text-primary-600 border-neutral-300 rounded focus:ring-primary-500"
                                  />
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    <!-- 操作按鈕 -->
                    <div :class="[
                      'flex gap-3 pt-4 border-t',
                      theme === 'dark' ? 'border-secondary-800' : 'border-neutral-200'
                    ]">
                      <BaseButton
                        v-if="rbacStore.selectedPermissionGroupId"
                        variant="danger"
                        :icon="TrashIcon"
                        @click="deletePermissionGroup"
                      >
                        刪除權限組
                      </BaseButton>
                      <BaseButton
                        variant="primary"
                        @click="savePermissionGroup"
                        class="ml-auto"
                      >
                        {{ rbacStore.selectedPermissionGroupId ? '更新並儲存' : '創建權限組' }}
                      </BaseButton>
                    </div>
                  </div>
                </div>

                <div
                  v-else
                  class="text-center py-12"
                  :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-500'"
                >
                  <p>請從左側選擇一個權限組進行編輯，或點擊「新增權限組」創建新權限組</p>
                </div>
              </BaseCard>
            </div>
          </div>
        </PageContainer>
      </main>
    </div>
  </div>
</template>
