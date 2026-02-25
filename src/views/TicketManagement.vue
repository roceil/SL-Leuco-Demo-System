<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useTicketStore } from '@/stores/ticket'
import { useRouteStore } from '@/stores/route'
import { useRbacStore } from '@/stores/rbac'
import { useSidebar } from '@/composables/useSidebar'
import { useTheme } from '@/composables/useTheme'
import Navbar from '@/components/Navbar.vue'
import Sidebar from '@/components/Sidebar.vue'
import PageContainer from '@/components/ui/PageContainer.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import type { TicketType, SegmentDiscount } from '@/types/ticket'
import { calculateSalePrice } from '@/types/ticket'
import {
  TicketIcon,
  PlusIcon,
  CheckIcon,
  TrashIcon,
  TagIcon
} from '@heroicons/vue/24/outline'

const ticketStore = useTicketStore()
const routeStore = useRouteStore()
const rbacStore = useRbacStore()
const { isCollapsed } = useSidebar()
const { theme } = useTheme()

// 表單資料
const formData = ref<Partial<TicketType>>({
  name: '',
  passengerType: '',
  organizationId: '',
  facePrice: 0,
  segmentDiscounts: [
    { segmentCount: 1, discountAmount: 0 }
  ],
  route: {
    from: '',
    to: ''
  },
  isSpecial: false
})

// 選中的航段 ID（用於下拉選單）
const selectedRouteSegmentId = ref<string>('')

// 航段篩選器
const filterSegmentId = ref<string>('')

// 依篩選條件過濾後的票種列表
const filteredTicketTypes = computed(() => {
  if (!filterSegmentId.value) return ticketStore.ticketTypes
  const segment = routeStore.activeRouteSegments.find(s => s.id === filterSegmentId.value)
  if (!segment) return ticketStore.ticketTypes
  return ticketStore.ticketTypes.filter(
    t => t.route.from === segment.fromPortId && t.route.to === segment.toPortId
  )
})

// 是否顯示表單
const showForm = ref(false)
const isEditMode = ref(false)

// 新增航段折扣
function addSegmentDiscount() {
  if (!formData.value.segmentDiscounts) {
    formData.value.segmentDiscounts = []
  }

  // 找出下一個航段數量（最大值 + 1）
  const maxSegmentCount = formData.value.segmentDiscounts.length > 0
    ? Math.max(...formData.value.segmentDiscounts.map((d) => d.segmentCount))
    : 0

  formData.value.segmentDiscounts.push({
    segmentCount: maxSegmentCount + 1,
    discountAmount: 0
  })
}

// 刪除航段折扣
function removeSegmentDiscount(index: number) {
  if (formData.value.segmentDiscounts && formData.value.segmentDiscounts.length > 1) {
    formData.value.segmentDiscounts.splice(index, 1)
  } else {
    alert('至少需要保留一個航段折扣設定')
  }
}

// 計算售價
function calculateDiscountSalePrice(discount: SegmentDiscount): number {
  const face = formData.value.facePrice || 0
  return calculateSalePrice(face, discount.discountAmount)
}

// 取得航點名稱
function getPortName(portId: string): string {
  const port = routeStore.getPortById(portId)
  return port ? port.name : portId
}

// 當選擇航段時，更新 formData.route
function onRouteSegmentChange() {
  const segment = routeStore.activeRouteSegments.find(
    (s) => s.id === selectedRouteSegmentId.value
  )
  if (segment) {
    formData.value.route = {
      from: segment.fromPortId,
      to: segment.toPortId
    }
  }
}

// 根據 route 找到對應的航段 ID
function findRouteSegmentId(route: { from: string; to: string }): string {
  const segment = routeStore.activeRouteSegments.find(
    (s) => s.fromPortId === route.from && s.toPortId === route.to
  )
  return segment ? segment.id : ''
}

// 監聽選中的票種變化，更新表單資料
watch(
  () => ticketStore.selectedTicketType,
  (newTicketType) => {
    if (newTicketType) {
      formData.value = {
        name: newTicketType.name,
        passengerType: newTicketType.passengerType,
        organizationId: newTicketType.organizationId ?? '',
        facePrice: newTicketType.facePrice,
        segmentDiscounts: [...newTicketType.segmentDiscounts],
        route: { ...newTicketType.route },
        isSpecial: newTicketType.isSpecial
      }
      // 找到對應的航段 ID
      selectedRouteSegmentId.value = findRouteSegmentId(newTicketType.route)
      isEditMode.value = true
      showForm.value = true
    }
  },
  { immediate: true }
)

function resetForm() {
  formData.value = {
    name: '',
    passengerType: '',
    facePrice: 0,
    segmentDiscounts: [
      { segmentCount: 1, discountAmount: 0 }
    ],
    route: {
      from: '',
      to: ''
    },
    isSpecial: false
  }
  selectedRouteSegmentId.value = ''
  isEditMode.value = false
  showForm.value = false
  ticketStore.selectTicketType(null)
}

function createNewTicket() {
  resetForm()
  showForm.value = true
}

function editTicket(ticketTypeId: string) {
  ticketStore.selectTicketType(ticketTypeId)
}

function saveTicket() {
  if (!formData.value.name) {
    alert('請輸入票種名稱')
    return
  }

  if (!formData.value.passengerType?.trim()) {
    alert('請輸入乘客類型')
    return
  }

  if (!formData.value.route?.from || !formData.value.route?.to) {
    alert('請選擇航段')
    return
  }

  if (formData.value.facePrice === undefined || formData.value.facePrice < 0) {
    alert('請輸入有效的票面價')
    return
  }

  // 驗證折扣設定
  const segmentDiscounts = formData.value.segmentDiscounts
  if (!segmentDiscounts || segmentDiscounts.length === 0) {
    alert('請至少設定一個航段折扣')
    return
  }

  // 驗證折扣金額和航段數量
  for (const discount of segmentDiscounts) {
    if (discount.segmentCount < 1) {
      alert('航段數量必須大於 0')
      return
    }
    if (discount.discountAmount < 0) {
      alert('折扣金額不能為負數')
      return
    }
  }

  // 檢查是否有重複的航段數量
  const segmentCounts = segmentDiscounts.map((d) => d.segmentCount)
  const uniqueCounts = new Set(segmentCounts)
  if (segmentCounts.length !== uniqueCounts.size) {
    alert('航段數量不能重複')
    return
  }

  // 排序航段折扣（按航段數量由小到大）
  const sortedDiscounts = [...segmentDiscounts].sort((a, b) => a.segmentCount - b.segmentCount)

  if (isEditMode.value && ticketStore.selectedTicketTypeId) {
    // 更新現有票種
    ticketStore.updateTicketType(ticketStore.selectedTicketTypeId, {
      name: formData.value.name!,
      passengerType: formData.value.passengerType!,
      organizationId: formData.value.organizationId || undefined,
      facePrice: formData.value.facePrice!,
      segmentDiscounts: sortedDiscounts,
      route: formData.value.route!,
      isSpecial: formData.value.isSpecial || false
    })
    alert('票種更新成功')
  } else {
    // 創建新票種
    ticketStore.createTicketType({
      name: formData.value.name!,
      passengerType: formData.value.passengerType!,
      organizationId: formData.value.organizationId || undefined,
      facePrice: formData.value.facePrice || 0,
      segmentDiscounts: sortedDiscounts,
      route: formData.value.route!,
      isSpecial: formData.value.isSpecial || false
    })
    alert('票種創建成功')
  }
  resetForm()
}

function deleteTicket(ticketTypeId: string) {
  if (confirm('確定要刪除此票種嗎？')) {
    ticketStore.deleteTicketType(ticketTypeId)
    alert('票種已刪除')
    resetForm()
  }
}

function cancelEdit() {
  resetForm()
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
          title="票種管理"
          subtitle="管理系統中的票種及其定價"
          :icon="TicketIcon"
          max-width="full"
        >
          <template #actions>
            <BaseButton
              variant="primary"
              :icon="PlusIcon"
              @click="createNewTicket"
            >
              新增票種
            </BaseButton>
          </template>

          <!-- 表單區（當顯示時） -->
          <BaseCard
            v-if="showForm"
            :title="isEditMode ? '編輯票種' : '新增票種'"
            padding="lg"
            class="mb-6"
          >
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- 票種名稱 -->
              <div>
                <label
                  class="block text-sm font-medium mb-2"
                  :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                >
                  票種名稱 <span class="text-red-500">*</span>
                </label>
                <BaseInput
                  v-model="formData.name"
                  placeholder="例如：現場全票、現場半票"
                />
              </div>

              <!-- 票種類型 -->
              <div>
                <label
                  class="block text-sm font-medium mb-2"
                  :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                >
                  票種類型 <span class="text-red-500">*</span>
                </label>
                <select
                  v-model="formData.passengerType"
                  :class="[
                    'w-full px-4 py-2.5 rounded-md border',
                    theme === 'dark'
                      ? 'bg-secondary-900 border-secondary-800 text-white'
                      : 'bg-white border-neutral-200 text-neutral-900'
                  ]"
                >
                  <option value="">請選擇票種類型</option>
                  <option value="全票">全票</option>
                  <option value="半票">半票</option>
                  <option value="居民票">居民票</option>
                  <option value="優惠票">優惠票</option>
                </select>
              </div>

              <!-- 航段 + 運行航商（並排） -->
              <div class="md:col-span-2 flex gap-6">
                <!-- 航段選擇 -->
                <div class="flex-1">
                  <label
                    class="block text-sm font-medium mb-2"
                    :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                  >
                    航段 <span class="text-red-500">*</span>
                  </label>
                  <select
                    v-model="selectedRouteSegmentId"
                    @change="onRouteSegmentChange"
                    :class="[
                      'w-full px-4 py-2.5 rounded-md border',
                      theme === 'dark'
                        ? 'bg-secondary-900 border-secondary-800 text-white'
                        : 'bg-white border-neutral-200 text-neutral-900'
                    ]"
                  >
                    <option value="">請選擇航段</option>
                    <option
                      v-for="segment in routeStore.activeRouteSegments"
                      :key="segment.id"
                      :value="segment.id"
                    >
                      {{ getPortName(segment.fromPortId) }} → {{ getPortName(segment.toPortId) }}
                    </option>
                  </select>
                </div>

                <!-- 運行航商 -->
                <div class="flex-1">
                  <label
                    class="block text-sm font-medium mb-2"
                    :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                  >
                    運行航商 <span class="text-red-500">*</span>
                  </label>
                  <select
                    v-model="formData.organizationId"
                    :class="[
                      'w-full px-4 py-2.5 rounded-md border',
                      theme === 'dark'
                        ? 'bg-secondary-900 border-secondary-800 text-white'
                        : 'bg-white border-neutral-200 text-neutral-900'
                    ]"
                  >
                    <option value="">請選擇航商</option>
                    <option
                      v-for="org in rbacStore.organizations.filter(o => o.id !== 'org-sys')"
                      :key="org.id"
                      :value="org.id"
                    >
                      {{ org.name }}
                    </option>
                  </select>
                </div>
              </div>

              <!-- 票面價（原價） -->
              <div class="md:col-span-2">
                <label
                  class="block text-sm font-medium mb-2"
                  :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                >
                  票面價（原價） <span class="text-red-500">*</span>
                </label>
                <BaseInput
                  v-model.number="formData.facePrice"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="請輸入票面價"
                />
              </div>

              <!-- 航段折扣設定區域 -->
              <div class="md:col-span-2">
                <div class="flex justify-between items-center mb-3">
                  <label
                    class="text-sm font-medium"
                    :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                  >
                    航段折扣設定
                  </label>
                  <BaseButton
                    variant="secondary"
                    :icon="PlusIcon"
                    @click="addSegmentDiscount"
                    class="!py-1 !px-3 !text-xs"
                  >
                    新增航段
                  </BaseButton>
                </div>

                <!-- 航段折扣列表 -->
                <div class="space-y-3">
                  <div
                    v-for="(discount, index) in formData.segmentDiscounts"
                    :key="index"
                    :class="[
                      'grid grid-cols-12 gap-3 p-3 rounded-md',
                      theme === 'dark' ? 'bg-secondary-900/50' : 'bg-neutral-50'
                    ]"
                  >
                    <!-- 航段數量 -->
                    <div class="col-span-3">
                      <label
                        class="block text-xs font-medium mb-1"
                        :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'"
                      >
                        航段數
                      </label>
                      <BaseInput
                        v-model.number="discount.segmentCount"
                        type="number"
                        min="1"
                        step="1"
                        placeholder="1"
                      />
                    </div>

                    <!-- 折扣金額 -->
                    <div class="col-span-3">
                      <label
                        class="block text-xs font-medium mb-1"
                        :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'"
                      >
                        折扣金額
                      </label>
                      <BaseInput
                        v-model.number="discount.discountAmount"
                        type="number"
                        min="0"
                        step="1"
                        placeholder="0"
                      />
                    </div>

                    <!-- 售價（自動計算） -->
                    <div class="col-span-3">
                      <label
                        class="block text-xs font-medium mb-1"
                        :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'"
                      >
                        售價
                      </label>
                      <input
                        :value="calculateDiscountSalePrice(discount)"
                        type="number"
                        readonly
                        disabled
                        :class="[
                          'w-full px-3 py-2 text-sm rounded-md cursor-not-allowed',
                          theme === 'dark'
                            ? 'bg-secondary-950 border-secondary-800 text-neutral-400'
                            : 'bg-neutral-100 border-neutral-200 text-neutral-600',
                          'border'
                        ]"
                      />
                    </div>

                    <!-- 刪除按鈕 -->
                    <div class="col-span-3 flex items-end">
                      <BaseButton
                        variant="danger"
                        :icon="TrashIcon"
                        @click="removeSegmentDiscount(index)"
                        class="!py-2 !px-3 w-full"
                        :disabled="formData.segmentDiscounts!.length === 1"
                      >
                        刪除
                      </BaseButton>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 是否為特殊票種 -->
              <div class="flex items-center">
                <label class="flex items-center cursor-pointer">
                  <input
                    v-model="formData.isSpecial"
                    type="checkbox"
                    :class="[
                      'w-5 h-5 rounded',
                      theme === 'dark'
                        ? 'bg-secondary-900 border-secondary-800'
                        : 'bg-white border-neutral-300'
                    ]"
                  />
                  <span
                    class="ml-2 text-sm font-medium"
                    :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                  >
                    特殊票種
                  </span>
                </label>
              </div>
            </div>

            <!-- 操作按鈕 -->
            <div
              :class="[
                'flex gap-3 pt-6 mt-6 border-t',
                theme === 'dark' ? 'border-secondary-800' : 'border-neutral-200'
              ]"
            >
              <BaseButton
                v-if="isEditMode"
                variant="danger"
                :icon="TrashIcon"
                @click="deleteTicket(ticketStore.selectedTicketTypeId!)"
              >
                刪除票種
              </BaseButton>
              <BaseButton
                variant="secondary"
                @click="cancelEdit"
              >
                取消
              </BaseButton>
              <BaseButton
                variant="primary"
                :icon="CheckIcon"
                @click="saveTicket"
                class="ml-auto"
              >
                {{ isEditMode ? '更新並儲存' : '創建票種' }}
              </BaseButton>
            </div>
          </BaseCard>

          <!-- 航段篩選器 -->
          <div
            :class="[
              'mb-6 flex items-center gap-3 flex-wrap',
            ]"
          >
            <label
              class="text-sm font-medium shrink-0"
              :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
            >
              依航段篩選
            </label>
            <select
              v-model="filterSegmentId"
              :class="[
                'px-3 py-2 rounded-md border text-sm',
                theme === 'dark'
                  ? 'bg-secondary-900 border-secondary-800 text-white'
                  : 'bg-white border-neutral-200 text-neutral-900'
              ]"
            >
              <option value="">全部航段</option>
              <option
                v-for="segment in routeStore.activeRouteSegments"
                :key="segment.id"
                :value="segment.id"
              >
                {{ getPortName(segment.fromPortId) }} → {{ getPortName(segment.toPortId) }}
              </option>
            </select>
            <span
              v-if="filterSegmentId"
              class="text-xs"
              :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-500'"
            >
              共 {{ filteredTicketTypes.length }} 個票種
            </span>
            <button
              v-if="filterSegmentId"
              @click="filterSegmentId = ''"
              class="text-xs underline"
              :class="theme === 'dark' ? 'text-primary-400 hover:text-primary-300' : 'text-primary-600 hover:text-primary-500'"
            >
              清除篩選
            </button>
          </div>

          <!-- 票種列表 (grid) -->
          <div
            v-if="filteredTicketTypes.length > 0"
            class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            <BaseCard
              v-for="ticket in filteredTicketTypes"
              :key="ticket.id"
              padding="md"
              :class="[
                'cursor-pointer transition-all',
                theme === 'dark'
                  ? 'hover:border-primary-600'
                  : 'hover:border-primary-500'
              ]"
              @click="editTicket(ticket.id)"
            >
              <div class="flex justify-between items-start mb-4">
                <h3
                  class="text-lg font-semibold"
                  :class="theme === 'dark' ? 'text-white' : 'text-neutral-900'"
                >
                  {{ ticket.name }}
                </h3>
                <span
                  :class="[
                    'px-2 py-1 text-xs font-medium rounded flex items-center gap-1',
                    ticket.isSpecial
                      ? theme === 'dark'
                        ? 'bg-amber-900/30 text-amber-400'
                        : 'bg-amber-100 text-amber-700'
                      : theme === 'dark'
                        ? 'bg-primary-900/30 text-primary-400'
                        : 'bg-primary-100 text-primary-700'
                  ]"
                >
                  <TagIcon class="w-3 h-3" />
                  {{ ticket.isSpecial ? '特殊票種' : '票種' }}
                </span>
              </div>

              <!-- 乘客類型 + 所屬航商標籤 -->
              <div class="mb-2 flex flex-wrap gap-1">
                <span
                  :class="[
                    'inline-block px-2 py-0.5 rounded text-xs font-medium',
                    theme === 'dark'
                      ? 'bg-secondary-700 text-neutral-300'
                      : 'bg-neutral-200 text-neutral-600'
                  ]"
                >
                  {{ ticket.passengerType }}
                </span>
                <span
                  v-if="ticket.organizationId"
                  :class="[
                    'inline-block px-2 py-0.5 rounded text-xs font-medium',
                    theme === 'dark'
                      ? 'bg-primary-900/40 text-primary-300'
                      : 'bg-primary-50 text-primary-700'
                  ]"
                >
                  {{ rbacStore.organizations.find(o => o.id === ticket.organizationId)?.name ?? ticket.organizationId }}
                </span>
              </div>

              <!-- 航段資訊 -->
              <div
                :class="[
                  'mb-3 px-3 py-2 rounded-md text-sm font-medium',
                  theme === 'dark'
                    ? 'bg-secondary-900/50 text-neutral-300'
                    : 'bg-neutral-100 text-neutral-700'
                ]"
              >
                {{ getPortName(ticket.route.from) }} → {{ getPortName(ticket.route.to) }}
              </div>

              <div class="space-y-3">
                <div class="flex justify-between items-center">
                  <span
                    class="text-sm"
                    :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'"
                  >
                    票面價
                  </span>
                  <span
                    class="text-base font-medium"
                    :class="theme === 'dark' ? 'text-neutral-200' : 'text-neutral-900'"
                  >
                    NT$ {{ ticket.facePrice }}
                  </span>
                </div>

                <div
                  :class="[
                    'pt-3 border-t',
                    theme === 'dark' ? 'border-secondary-800' : 'border-neutral-200'
                  ]"
                >
                  <!-- 動態顯示所有航段折扣 -->
                  <div
                    v-for="(discount, idx) in ticket.segmentDiscounts"
                    :key="idx"
                    class="flex justify-between items-center"
                    :class="{ 'mb-2': idx < ticket.segmentDiscounts.length - 1 }"
                  >
                    <span
                      class="text-xs"
                      :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'"
                    >
                      {{ discount.segmentCount }}航段 (折扣 -NT$ {{ discount.discountAmount }})
                    </span>
                    <span class="text-sm font-semibold text-green-600">
                      NT$ {{ ticket.facePrice - discount.discountAmount }}
                    </span>
                  </div>
                </div>
              </div>

              <div
                class="mt-4 text-xs"
                :class="theme === 'dark' ? 'text-neutral-500' : 'text-neutral-500'"
              >
                最後更新：{{ new Date(ticket.updatedAt).toLocaleString('zh-TW') }}
              </div>
            </BaseCard>
          </div>

          <!-- 空狀態 -->
          <BaseCard
            v-if="filteredTicketTypes.length === 0"
            padding="lg"
            class="text-center"
          >
            <TicketIcon
              class="w-24 h-24 mx-auto mb-6 opacity-30"
              :class="theme === 'dark' ? 'text-neutral-600' : 'text-neutral-300'"
            />
            <p
              class="text-lg mb-6"
              :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-500'"
            >
              {{ filterSegmentId ? '此航段目前沒有任何票種' : '目前還沒有任何票種' }}
            </p>
            <BaseButton
              v-if="!filterSegmentId"
              variant="primary"
              :icon="PlusIcon"
              @click="createNewTicket"
            >
              新增第一個票種
            </BaseButton>
            <BaseButton
              v-else
              variant="secondary"
              @click="filterSegmentId = ''"
            >
              清除篩選
            </BaseButton>
          </BaseCard>
        </PageContainer>
      </main>
    </div>
  </div>
</template>
