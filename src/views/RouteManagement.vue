<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouteStore } from '@/stores/route'
import { useSidebar } from '@/composables/useSidebar'
import { useTheme } from '@/composables/useTheme'
import Navbar from '@/components/Navbar.vue'
import Sidebar from '@/components/Sidebar.vue'
import PageContainer from '@/components/ui/PageContainer.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import type { Port, RouteSegment } from '@/types/route'
import {
  MapIcon,
  PlusIcon,
  CheckIcon,
  TrashIcon,
  MapPinIcon,
  ArrowPathIcon,
  ClockIcon
} from '@heroicons/vue/24/outline'

const routeStore = useRouteStore()
const { isCollapsed } = useSidebar()
const { theme } = useTheme()

// 分頁狀態
const activeTab = ref<'ports' | 'segments'>('ports')

// 航點表單資料
const portFormData = ref<Partial<Port>>({
  name: '',
  code: '',
  isActive: true,
  order: 0
})

// 航段表單資料
const segmentFormData = ref<Partial<RouteSegment>>({
  fromPortId: '',
  toPortId: '',
  estimatedDuration: 60,
  allowedNextSegments: [],
  isActive: true
})

// 表單顯示狀態
const showPortForm = ref(false)
const showSegmentForm = ref(false)
const isEditPortMode = ref(false)
const isEditSegmentMode = ref(false)

// 可用的目的地（航段表單）
const availableToPorts = computed(() => {
  if (!segmentFormData.value.fromPortId) return []
  return routeStore.ports.filter((p) => p.id !== segmentFormData.value.fromPortId)
})

// 可用的後續航段（航段表單）
const availableNextSegments = computed(() => {
  if (!segmentFormData.value.toPortId) return []
  // 從目的地出發的所有航段
  return routeStore.routeSegments.filter((s) => s.fromPortId === segmentFormData.value.toPortId)
})

// 航點功能
function createNewPort() {
  portFormData.value = {
    name: '',
    code: '',
    isActive: true,
    order: routeStore.ports.length + 1
  }
  isEditPortMode.value = false
  showPortForm.value = true
}

function editPort(port: Port) {
  portFormData.value = { ...port }
  isEditPortMode.value = true
  showPortForm.value = true
  routeStore.selectPort(port.id)
}

function savePort() {
  if (!portFormData.value.name) {
    alert('請輸入航點名稱')
    return
  }

  if (!portFormData.value.code) {
    alert('請輸入航點代碼')
    return
  }

  // 檢查代碼重複（編輯時排除自己）
  const duplicateCode = routeStore.ports.find(
    (p) =>
      p.code === portFormData.value.code &&
      (isEditPortMode.value ? p.id !== routeStore.selectedPortId : true)
  )
  if (duplicateCode) {
    alert('航點代碼已存在')
    return
  }

  if (isEditPortMode.value && routeStore.selectedPortId) {
    routeStore.updatePort(routeStore.selectedPortId, {
      name: portFormData.value.name!,
      code: portFormData.value.code!,
      isActive: portFormData.value.isActive!,
      order: portFormData.value.order!
    })
    alert('航點更新成功')
  } else {
    routeStore.createPort({
      name: portFormData.value.name!,
      code: portFormData.value.code!,
      isActive: portFormData.value.isActive ?? true,
      order: portFormData.value.order ?? routeStore.ports.length + 1
    })
    alert('航點創建成功')
  }
  resetPortForm()
}

function deletePort(portId: string) {
  if (confirm('確定要刪除此航點嗎？')) {
    const success = routeStore.deletePort(portId)
    if (success) {
      alert('航點已刪除')
      resetPortForm()
    } else {
      alert('無法刪除：此航點正被航段使用')
    }
  }
}

function resetPortForm() {
  portFormData.value = {
    name: '',
    code: '',
    isActive: true,
    order: 0
  }
  isEditPortMode.value = false
  showPortForm.value = false
  routeStore.selectPort(null)
}

// 航段功能
function createNewSegment() {
  segmentFormData.value = {
    fromPortId: '',
    toPortId: '',
    estimatedDuration: 60,
    allowedNextSegments: [],
    isActive: true
  }
  isEditSegmentMode.value = false
  showSegmentForm.value = true
}

function editSegment(segment: RouteSegment) {
  segmentFormData.value = { ...segment }
  isEditSegmentMode.value = true
  showSegmentForm.value = true
  routeStore.selectRouteSegment(segment.id)
}

function saveSegment() {
  if (!segmentFormData.value.fromPortId || !segmentFormData.value.toPortId) {
    alert('請選擇出發地和目的地')
    return
  }

  if (
    segmentFormData.value.estimatedDuration === undefined ||
    segmentFormData.value.estimatedDuration <= 0
  ) {
    alert('請輸入有效的預計航行時間')
    return
  }

  // 檢查航段重複（編輯時排除自己）
  const duplicateSegment = routeStore.routeSegments.find(
    (s) =>
      s.fromPortId === segmentFormData.value.fromPortId &&
      s.toPortId === segmentFormData.value.toPortId &&
      (isEditSegmentMode.value ? s.id !== routeStore.selectedRouteSegmentId : true)
  )
  if (duplicateSegment) {
    alert('此航段已存在')
    return
  }

  if (isEditSegmentMode.value && routeStore.selectedRouteSegmentId) {
    routeStore.updateRouteSegment(routeStore.selectedRouteSegmentId, {
      fromPortId: segmentFormData.value.fromPortId!,
      toPortId: segmentFormData.value.toPortId!,
      estimatedDuration: segmentFormData.value.estimatedDuration!,
      allowedNextSegments: segmentFormData.value.allowedNextSegments || [],
      isActive: segmentFormData.value.isActive!
    })
    alert('航段更新成功')
  } else {
    routeStore.createRouteSegment({
      fromPortId: segmentFormData.value.fromPortId!,
      toPortId: segmentFormData.value.toPortId!,
      estimatedDuration: segmentFormData.value.estimatedDuration!,
      allowedNextSegments: segmentFormData.value.allowedNextSegments || [],
      isActive: segmentFormData.value.isActive ?? true
    })
    alert('航段創建成功')
  }
  resetSegmentForm()
}

function deleteSegment(segmentId: string) {
  if (confirm('確定要刪除此航段嗎？')) {
    routeStore.deleteRouteSegment(segmentId)
    alert('航段已刪除')
    resetSegmentForm()
  }
}

function resetSegmentForm() {
  segmentFormData.value = {
    fromPortId: '',
    toPortId: '',
    estimatedDuration: 60,
    allowedNextSegments: [],
    isActive: true
  }
  isEditSegmentMode.value = false
  showSegmentForm.value = false
  routeStore.selectRouteSegment(null)
}

// 切換後續航段
function toggleAllowedSegment(segmentId: string) {
  if (!segmentFormData.value.allowedNextSegments) {
    segmentFormData.value.allowedNextSegments = []
  }
  const index = segmentFormData.value.allowedNextSegments.indexOf(segmentId)
  if (index > -1) {
    segmentFormData.value.allowedNextSegments.splice(index, 1)
  } else {
    segmentFormData.value.allowedNextSegments.push(segmentId)
  }
}

// 取得航點名稱
function getPortName(portId: string): string {
  const port = routeStore.getPortById(portId)
  return port ? `${port.name} (${port.code})` : portId
}

// 格式化航行時間
function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours > 0) {
    return mins > 0 ? `${hours} 小時 ${mins} 分鐘` : `${hours} 小時`
  }
  return `${mins} 分鐘`
}
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <Navbar username="管理員" />

    <div class="flex flex-1">
      <Sidebar :active-route="$route.path.slice(1)" />

      <main :class="['flex-1 transition-all duration-300', isCollapsed ? 'ml-20' : 'ml-64']">
        <PageContainer
          title="航點與航段管理"
          subtitle="管理系統中的航點及航段設定"
          :icon="MapIcon"
          max-width="full"
        >
          <!-- 分頁切換 -->
          <div class="mb-6 border-b" :class="theme === 'dark' ? 'border-secondary-800' : 'border-neutral-200'">
            <div class="flex gap-4">
              <button
                @click="activeTab = 'ports'"
                :class="[
                  'px-4 py-3 font-medium transition-colors relative',
                  activeTab === 'ports'
                    ? theme === 'dark'
                      ? 'text-primary-400'
                      : 'text-primary-600'
                    : theme === 'dark'
                      ? 'text-neutral-400 hover:text-neutral-300'
                      : 'text-neutral-600 hover:text-neutral-900'
                ]"
              >
                <MapPinIcon class="w-5 h-5 inline mr-2" />
                航點管理
                <div
                  v-if="activeTab === 'ports'"
                  class="absolute bottom-0 left-0 right-0 h-0.5"
                  :class="theme === 'dark' ? 'bg-primary-500' : 'bg-primary-600'"
                />
              </button>
              <button
                @click="activeTab = 'segments'"
                :class="[
                  'px-4 py-3 font-medium transition-colors relative',
                  activeTab === 'segments'
                    ? theme === 'dark'
                      ? 'text-primary-400'
                      : 'text-primary-600'
                    : theme === 'dark'
                      ? 'text-neutral-400 hover:text-neutral-300'
                      : 'text-neutral-600 hover:text-neutral-900'
                ]"
              >
                <ArrowPathIcon class="w-5 h-5 inline mr-2" />
                航段管理
                <div
                  v-if="activeTab === 'segments'"
                  class="absolute bottom-0 left-0 right-0 h-0.5"
                  :class="theme === 'dark' ? 'bg-primary-500' : 'bg-primary-600'"
                />
              </button>
            </div>
          </div>

          <!-- 航點管理 -->
          <div v-if="activeTab === 'ports'">
            <div class="mb-6 flex justify-between items-center">
              <p :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'">
                共 {{ routeStore.ports.length }} 個航點
              </p>
              <BaseButton variant="primary" :icon="PlusIcon" @click="createNewPort">
                新增航點
              </BaseButton>
            </div>

            <!-- 航點表單 -->
            <BaseCard
              v-if="showPortForm"
              :title="isEditPortMode ? '編輯航點' : '新增航點'"
              padding="lg"
              class="mb-6"
            >
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label
                    class="block text-sm font-medium mb-2"
                    :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                  >
                    航點名稱 <span class="text-red-500">*</span>
                  </label>
                  <BaseInput v-model="portFormData.name" placeholder="例如：台東、綠島" />
                </div>

                <div>
                  <label
                    class="block text-sm font-medium mb-2"
                    :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                  >
                    航點代碼 <span class="text-red-500">*</span>
                  </label>
                  <BaseInput v-model="portFormData.code" placeholder="例如：TT、GI" />
                </div>

                <div>
                  <label
                    class="block text-sm font-medium mb-2"
                    :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                  >
                    排序順序
                  </label>
                  <BaseInput v-model.number="portFormData.order" type="number" min="1" />
                </div>

                <div class="flex items-center">
                  <label class="flex items-center cursor-pointer">
                    <input
                      v-model="portFormData.isActive"
                      type="checkbox"
                      :class="[
                        'w-5 h-5 rounded border-2 transition-colors',
                        theme === 'dark'
                          ? 'bg-secondary-900 border-secondary-700 checked:bg-primary-600'
                          : 'bg-white border-neutral-300 checked:bg-primary-500'
                      ]"
                    />
                    <span
                      class="ml-2 text-sm font-medium"
                      :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                    >
                      啟用此航點
                    </span>
                  </label>
                </div>
              </div>

              <div
                :class="[
                  'flex gap-3 pt-6 mt-6 border-t',
                  theme === 'dark' ? 'border-secondary-800' : 'border-neutral-200'
                ]"
              >
                <BaseButton
                  v-if="isEditPortMode"
                  variant="danger"
                  :icon="TrashIcon"
                  @click="deletePort(routeStore.selectedPortId!)"
                >
                  刪除航點
                </BaseButton>
                <BaseButton variant="secondary" @click="resetPortForm"> 取消 </BaseButton>
                <BaseButton variant="primary" :icon="CheckIcon" @click="savePort" class="ml-auto">
                  {{ isEditPortMode ? '更新並儲存' : '創建航點' }}
                </BaseButton>
              </div>
            </BaseCard>

            <!-- 航點列表 -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <BaseCard
                v-for="port in routeStore.ports"
                :key="port.id"
                padding="md"
                :class="[
                  'cursor-pointer transition-all',
                  theme === 'dark' ? 'hover:border-primary-600' : 'hover:border-primary-500'
                ]"
                @click="editPort(port)"
              >
                <div class="flex justify-between items-start mb-4">
                  <div>
                    <h3
                      class="text-lg font-semibold mb-1"
                      :class="theme === 'dark' ? 'text-white' : 'text-neutral-900'"
                    >
                      {{ port.name }}
                    </h3>
                    <p
                      class="text-sm"
                      :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'"
                    >
                      代碼：{{ port.code }}
                    </p>
                  </div>
                  <span
                    :class="[
                      'px-2 py-1 text-xs font-medium rounded',
                      port.isActive
                        ? theme === 'dark'
                          ? 'bg-green-900/30 text-green-400'
                          : 'bg-green-100 text-green-700'
                        : theme === 'dark'
                          ? 'bg-neutral-800 text-neutral-500'
                          : 'bg-neutral-200 text-neutral-600'
                    ]"
                  >
                    {{ port.isActive ? '啟用' : '停用' }}
                  </span>
                </div>

                <div
                  class="text-xs"
                  :class="theme === 'dark' ? 'text-neutral-500' : 'text-neutral-500'"
                >
                  排序：{{ port.order }}
                </div>
              </BaseCard>
            </div>
          </div>

          <!-- 航段管理 -->
          <div v-if="activeTab === 'segments'">
            <div class="mb-6 flex justify-between items-center">
              <p :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'">
                共 {{ routeStore.routeSegments.length }} 個航段
              </p>
              <BaseButton variant="primary" :icon="PlusIcon" @click="createNewSegment">
                新增航段
              </BaseButton>
            </div>

            <!-- 航段表單 -->
            <BaseCard
              v-if="showSegmentForm"
              :title="isEditSegmentMode ? '編輯航段' : '新增航段'"
              padding="lg"
              class="mb-6"
            >
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label
                    class="block text-sm font-medium mb-2"
                    :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                  >
                    出發地 <span class="text-red-500">*</span>
                  </label>
                  <select
                    v-model="segmentFormData.fromPortId"
                    :class="[
                      'w-full px-4 py-2.5 rounded-md border transition-colors',
                      theme === 'dark'
                        ? 'bg-secondary-900 border-secondary-800 text-white'
                        : 'bg-white border-neutral-200 text-neutral-900'
                    ]"
                  >
                    <option value="">請選擇出發地</option>
                    <option v-for="port in routeStore.ports" :key="port.id" :value="port.id">
                      {{ port.name }} ({{ port.code }})
                    </option>
                  </select>
                </div>

                <div>
                  <label
                    class="block text-sm font-medium mb-2"
                    :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                  >
                    目的地 <span class="text-red-500">*</span>
                  </label>
                  <select
                    v-model="segmentFormData.toPortId"
                    :disabled="!segmentFormData.fromPortId"
                    :class="[
                      'w-full px-4 py-2.5 rounded-md border transition-colors',
                      theme === 'dark'
                        ? 'bg-secondary-900 border-secondary-800 text-white'
                        : 'bg-white border-neutral-200 text-neutral-900',
                      !segmentFormData.fromPortId && 'opacity-50 cursor-not-allowed'
                    ]"
                  >
                    <option value="">請選擇目的地</option>
                    <option v-for="port in availableToPorts" :key="port.id" :value="port.id">
                      {{ port.name }} ({{ port.code }})
                    </option>
                  </select>
                </div>

                <div>
                  <label
                    class="block text-sm font-medium mb-2"
                    :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                  >
                    預計航行時間（分鐘） <span class="text-red-500">*</span>
                  </label>
                  <BaseInput
                    v-model.number="segmentFormData.estimatedDuration"
                    type="number"
                    min="1"
                    placeholder="例如：60"
                  />
                </div>

                <div class="flex items-center">
                  <label class="flex items-center cursor-pointer">
                    <input
                      v-model="segmentFormData.isActive"
                      type="checkbox"
                      :class="[
                        'w-5 h-5 rounded border-2 transition-colors',
                        theme === 'dark'
                          ? 'bg-secondary-900 border-secondary-700 checked:bg-primary-600'
                          : 'bg-white border-neutral-300 checked:bg-primary-500'
                      ]"
                    />
                    <span
                      class="ml-2 text-sm font-medium"
                      :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                    >
                      啟用此航段
                    </span>
                  </label>
                </div>

                <!-- 允許的後續航段 -->
                <div v-if="availableNextSegments.length > 0" class="md:col-span-2">
                  <label
                    class="block text-sm font-medium mb-2"
                    :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                  >
                    允許的後續航段
                  </label>
                  <div class="flex flex-wrap gap-2">
                    <button
                      v-for="segment in availableNextSegments"
                      :key="segment.id"
                      type="button"
                      @click="toggleAllowedSegment(segment.id)"
                      :class="[
                        'px-3 py-2 rounded-md text-sm font-medium transition-colors border',
                        segmentFormData.allowedNextSegments?.includes(segment.id)
                          ? theme === 'dark'
                            ? 'bg-primary-900/30 border-primary-600 text-primary-400'
                            : 'bg-primary-100 border-primary-500 text-primary-700'
                          : theme === 'dark'
                            ? 'bg-secondary-800 border-secondary-700 text-neutral-400'
                            : 'bg-neutral-100 border-neutral-300 text-neutral-700'
                      ]"
                    >
                      {{ getPortName(segment.fromPortId) }} → {{ getPortName(segment.toPortId) }}
                    </button>
                  </div>
                </div>
              </div>

              <div
                :class="[
                  'flex gap-3 pt-6 mt-6 border-t',
                  theme === 'dark' ? 'border-secondary-800' : 'border-neutral-200'
                ]"
              >
                <BaseButton
                  v-if="isEditSegmentMode"
                  variant="danger"
                  :icon="TrashIcon"
                  @click="deleteSegment(routeStore.selectedRouteSegmentId!)"
                >
                  刪除航段
                </BaseButton>
                <BaseButton variant="secondary" @click="resetSegmentForm"> 取消 </BaseButton>
                <BaseButton
                  variant="primary"
                  :icon="CheckIcon"
                  @click="saveSegment"
                  class="ml-auto"
                >
                  {{ isEditSegmentMode ? '更新並儲存' : '創建航段' }}
                </BaseButton>
              </div>
            </BaseCard>

            <!-- 航段列表 -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <BaseCard
                v-for="segment in routeStore.routeSegments"
                :key="segment.id"
                padding="md"
                :class="[
                  'cursor-pointer transition-all',
                  theme === 'dark' ? 'hover:border-primary-600' : 'hover:border-primary-500'
                ]"
                @click="editSegment(segment)"
              >
                <div class="flex justify-between items-start">
                  <div class="flex-1">
                    <div class="flex items-center gap-3 mb-3">
                      <MapPinIcon
                        class="w-5 h-5"
                        :class="theme === 'dark' ? 'text-primary-400' : 'text-primary-600'"
                      />
                      <h3
                        class="text-lg font-semibold"
                        :class="theme === 'dark' ? 'text-white' : 'text-neutral-900'"
                      >
                        {{ getPortName(segment.fromPortId) }}
                        <ArrowPathIcon class="w-5 h-5 inline mx-2" />
                        {{ getPortName(segment.toPortId) }}
                      </h3>
                    </div>

                    <div class="flex items-center gap-2 mb-3">
                      <ClockIcon
                        class="w-4 h-4"
                        :class="theme === 'dark' ? 'text-neutral-500' : 'text-neutral-400'"
                      />
                      <span
                        class="text-sm"
                        :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'"
                      >
                        預計航行時間：{{ formatDuration(segment.estimatedDuration) }}
                      </span>
                    </div>

                    <!-- 允許的後續航段 -->
                    <div
                      v-if="segment.allowedNextSegments.length > 0"
                      :class="[
                        'pt-3 border-t',
                        theme === 'dark' ? 'border-secondary-800' : 'border-neutral-200'
                      ]"
                    >
                      <div
                        class="text-xs mb-2"
                        :class="theme === 'dark' ? 'text-neutral-500' : 'text-neutral-500'"
                      >
                        允許的後續航段：
                      </div>
                      <div class="flex flex-wrap gap-2">
                        <span
                          v-for="nextSegmentId in segment.allowedNextSegments"
                          :key="nextSegmentId"
                          :class="[
                            'px-2 py-1 text-xs rounded',
                            theme === 'dark'
                              ? 'bg-secondary-800 text-neutral-400'
                              : 'bg-neutral-100 text-neutral-600'
                          ]"
                        >
                          {{
                            (() => {
                              const nextSeg = routeStore.routeSegments.find(
                                (s) => s.id === nextSegmentId
                              )
                              return nextSeg
                                ? `${getPortName(nextSeg.fromPortId)} → ${getPortName(nextSeg.toPortId)}`
                                : nextSegmentId
                            })()
                          }}
                        </span>
                      </div>
                    </div>
                  </div>

                  <span
                    :class="[
                      'px-2 py-1 text-xs font-medium rounded',
                      segment.isActive
                        ? theme === 'dark'
                          ? 'bg-green-900/30 text-green-400'
                          : 'bg-green-100 text-green-700'
                        : theme === 'dark'
                          ? 'bg-neutral-800 text-neutral-500'
                          : 'bg-neutral-200 text-neutral-600'
                    ]"
                  >
                    {{ segment.isActive ? '啟用' : '停用' }}
                  </span>
                </div>
              </BaseCard>
            </div>
          </div>
        </PageContainer>
      </main>
    </div>
  </div>
</template>
