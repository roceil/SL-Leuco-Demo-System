<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSidebar } from '@/composables/useSidebar'
import { useTheme } from '@/composables/useTheme'
import { useTicketConfig } from '@/composables/useTicketConfig'
import Navbar from '@/components/Navbar.vue'
import Sidebar from '@/components/Sidebar.vue'
import PageContainer from '@/components/ui/PageContainer.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import {
  TagIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/vue/24/outline'

const { isCollapsed } = useSidebar()
const { theme } = useTheme()
const {
  nameOptions,
  typeOptions,
  addNameOption,
  updateNameOption,
  toggleNameOptionActive,
  deleteNameOption,
  addTypeOption,
  updateTypeOption,
  toggleTypeOptionActive,
  deleteTypeOption,
} = useTicketConfig()

type Tab = 'name' | 'type'
const activeTab = ref<Tab>('name')

const showForm = ref(false)
const isEditMode = ref(false)
const editingId = ref<string | null>(null)
const formName = ref('')
const errorMessage = ref('')

const currentList = computed(() =>
  activeTab.value === 'name' ? nameOptions.value : typeOptions.value
)

const tabLabel = computed(() =>
  activeTab.value === 'name' ? '票種名稱' : '票種類型'
)

function openCreate() {
  isEditMode.value = false
  editingId.value = null
  formName.value = ''
  errorMessage.value = ''
  showForm.value = true
}

function openEdit(id: string, name: string) {
  isEditMode.value = true
  editingId.value = id
  formName.value = name
  errorMessage.value = ''
  showForm.value = true
}

function resetForm() {
  showForm.value = false
  formName.value = ''
  editingId.value = null
  errorMessage.value = ''
  isEditMode.value = false
}

function save() {
  const trimmed = formName.value.trim()
  if (!trimmed) {
    errorMessage.value = '請輸入名稱'
    return
  }

  // 檢查重複（同分頁內）
  const list = currentList.value
  const dup = list.some(
    (o) => o.name === trimmed && o.id !== editingId.value
  )
  if (dup) {
    errorMessage.value = `「${trimmed}」已存在`
    return
  }

  if (isEditMode.value && editingId.value) {
    if (activeTab.value === 'name') {
      updateNameOption(editingId.value, { name: trimmed })
    } else {
      updateTypeOption(editingId.value, { name: trimmed })
    }
  } else {
    const created =
      activeTab.value === 'name' ? addNameOption(trimmed) : addTypeOption(trimmed)
    if (!created) {
      errorMessage.value = '建立失敗'
      return
    }
  }
  resetForm()
}

function toggle(id: string) {
  if (activeTab.value === 'name') toggleNameOptionActive(id)
  else toggleTypeOptionActive(id)
}

function remove(id: string, name: string) {
  if (!confirm(`確定要刪除「${name}」嗎？\n注意：已綁定此選項的票種不會自動更名。`)) return
  if (activeTab.value === 'name') deleteNameOption(id)
  else deleteTypeOption(id)
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('zh-TW')
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
          title="票種配置"
          subtitle="集中管理三家聯營航商共用的票種名稱與類型清單"
          :icon="TagIcon"
          max-width="2xl"
        >
          <!-- Tab 切換 -->
          <div class="flex gap-2 mb-6 border-b" :class="theme === 'dark' ? 'border-secondary-800' : 'border-neutral-200'">
            <button
              @click="activeTab = 'name'"
              :class="[
                'px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px',
                activeTab === 'name'
                  ? theme === 'dark'
                    ? 'border-primary-500 text-primary-300'
                    : 'border-primary-500 text-primary-700'
                  : theme === 'dark'
                    ? 'border-transparent text-neutral-400 hover:text-neutral-200'
                    : 'border-transparent text-neutral-600 hover:text-neutral-900'
              ]"
            >
              票種名稱（{{ nameOptions.length }}）
            </button>
            <button
              @click="activeTab = 'type'"
              :class="[
                'px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px',
                activeTab === 'type'
                  ? theme === 'dark'
                    ? 'border-primary-500 text-primary-300'
                    : 'border-primary-500 text-primary-700'
                  : theme === 'dark'
                    ? 'border-transparent text-neutral-400 hover:text-neutral-200'
                    : 'border-transparent text-neutral-600 hover:text-neutral-900'
              ]"
            >
              票種類型（{{ typeOptions.length }}）
            </button>
          </div>

          <!-- 操作列 -->
          <div class="flex items-center justify-between mb-4">
            <p
              class="text-sm"
              :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'"
            >
              <template v-if="activeTab === 'name'">
                票種名稱顯示在訂票流程中（如「現場全票」、「民宿全票」），由各航商在票種管理頁面建立票種時選用
              </template>
              <template v-else>
                票種類型用於統計與分組（全票 / 半票 / 居民票…），同一類型可對應多個名稱
              </template>
            </p>
            <BaseButton variant="primary" :icon="PlusIcon" @click="openCreate">
              新增{{ tabLabel }}
            </BaseButton>
          </div>

          <!-- 列表 -->
          <BaseCard padding="md">
            <table class="w-full">
              <thead>
                <tr
                  class="text-xs uppercase font-medium border-b"
                  :class="theme === 'dark' ? 'text-neutral-400 border-secondary-800' : 'text-neutral-700 border-neutral-200'"
                >
                  <th class="text-left px-4 py-3">{{ tabLabel }}</th>
                  <th class="text-left px-4 py-3">狀態</th>
                  <th class="text-left px-4 py-3">建立時間</th>
                  <th class="text-left px-4 py-3">最後更新</th>
                  <th class="text-right px-4 py-3">操作</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="item in currentList"
                  :key="item.id"
                  class="border-b last:border-0"
                  :class="theme === 'dark' ? 'border-secondary-800 hover:bg-secondary-800/50' : 'border-neutral-100 hover:bg-neutral-50'"
                >
                  <td class="px-4 py-3 text-sm font-medium" :class="theme === 'dark' ? 'text-white' : 'text-neutral-900'">
                    {{ item.name }}
                  </td>
                  <td class="px-4 py-3 text-sm">
                    <button
                      @click="toggle(item.id)"
                      :class="[
                        'px-2.5 py-1 text-xs font-medium rounded-full transition-colors',
                        item.isActive
                          ? theme === 'dark'
                            ? 'bg-green-900/30 text-green-300 hover:bg-green-900/50'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                          : theme === 'dark'
                            ? 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                            : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
                      ]"
                    >
                      {{ item.isActive ? '啟用' : '停用' }}
                    </button>
                  </td>
                  <td class="px-4 py-3 text-sm" :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'">
                    {{ formatDate(item.createdAt) }}
                  </td>
                  <td class="px-4 py-3 text-sm" :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'">
                    {{ formatDate(item.updatedAt) }}
                  </td>
                  <td class="px-4 py-3 text-sm text-right">
                    <div class="flex items-center justify-end gap-3">
                      <button
                        @click="openEdit(item.id, item.name)"
                        :class="[
                          'flex items-center gap-1 transition-colors',
                          theme === 'dark' ? 'text-primary-400 hover:text-primary-300' : 'text-primary-600 hover:text-primary-800'
                        ]"
                      >
                        <PencilIcon class="w-4 h-4" />
                        編輯
                      </button>
                      <button
                        @click="remove(item.id, item.name)"
                        :class="[
                          'flex items-center gap-1 transition-colors',
                          theme === 'dark' ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-800'
                        ]"
                      >
                        <TrashIcon class="w-4 h-4" />
                        刪除
                      </button>
                    </div>
                  </td>
                </tr>
                <tr v-if="!currentList.length">
                  <td colspan="5" class="px-4 py-12 text-center text-sm" :class="theme === 'dark' ? 'text-neutral-500' : 'text-neutral-400'">
                    尚無資料，請點擊上方「新增{{ tabLabel }}」建立
                  </td>
                </tr>
              </tbody>
            </table>
          </BaseCard>
        </PageContainer>
      </main>
    </div>

    <!-- Modal -->
    <div
      v-if="showForm"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      @click.self="resetForm"
    >
      <div
        class="w-full max-w-md rounded-lg shadow-xl"
        :class="theme === 'dark' ? 'bg-secondary-900 border border-secondary-800' : 'bg-white'"
      >
        <div class="flex items-center justify-between p-6 border-b" :class="theme === 'dark' ? 'border-secondary-800' : 'border-neutral-200'">
          <h2 class="text-lg font-semibold" :class="theme === 'dark' ? 'text-white' : 'text-neutral-900'">
            {{ isEditMode ? '編輯' : '新增' }}{{ tabLabel }}
          </h2>
          <button
            @click="resetForm"
            :class="theme === 'dark' ? 'text-neutral-400 hover:text-neutral-200' : 'text-neutral-500 hover:text-neutral-700'"
          >
            <XMarkIcon class="w-5 h-5" />
          </button>
        </div>

        <div class="p-6 space-y-4">
          <div
            v-if="errorMessage"
            class="p-3 rounded-lg border text-sm"
            :class="theme === 'dark' ? 'bg-red-950/30 border-red-900 text-red-400' : 'bg-red-50 border-red-200 text-red-700'"
          >
            {{ errorMessage }}
          </div>

          <div>
            <label class="block text-sm font-medium mb-2" :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'">
              {{ tabLabel }} <span class="text-red-500">*</span>
            </label>
            <BaseInput
              v-model="formName"
              :placeholder="activeTab === 'name' ? '例如：現場全票' : '例如：全票'"
              @keyup.enter="save"
            />
          </div>
        </div>

        <div class="flex gap-3 p-6 border-t" :class="theme === 'dark' ? 'border-secondary-800' : 'border-neutral-200'">
          <BaseButton variant="secondary" @click="resetForm">取消</BaseButton>
          <BaseButton variant="primary" :icon="CheckIcon" @click="save" class="ml-auto">
            {{ isEditMode ? '更新並儲存' : '新增' }}
          </BaseButton>
        </div>
      </div>
    </div>
  </div>
</template>
