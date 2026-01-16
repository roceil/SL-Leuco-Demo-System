<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useTicketStore } from '@/stores/ticket'
import { useSidebar } from '@/composables/useSidebar'
import { useTheme } from '@/composables/useTheme'
import Navbar from '@/components/Navbar.vue'
import Sidebar from '@/components/Sidebar.vue'
import PageContainer from '@/components/ui/PageContainer.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import type { TicketType } from '@/types/ticket'
import { calculateSalePrice } from '@/types/ticket'
import {
  TicketIcon,
  PlusIcon,
  CheckIcon,
  TrashIcon,
  TagIcon
} from '@heroicons/vue/24/outline'

const ticketStore = useTicketStore()
const { isCollapsed } = useSidebar()
const { theme } = useTheme()

// 表單資料
const formData = ref<Partial<TicketType>>({
  name: '',
  basePrice: 0,
  discount: 0
})

// 是否顯示表單
const showForm = ref(false)
const isEditMode = ref(false)

// 計算售價
const salePrice = computed(() => {
  const base = formData.value.basePrice || 0
  const disc = formData.value.discount || 0
  return calculateSalePrice(base, disc)
})

// 監聽選中的票種變化，更新表單資料
watch(
  () => ticketStore.selectedTicketType,
  (newTicketType) => {
    if (newTicketType) {
      formData.value = {
        name: newTicketType.name,
        basePrice: newTicketType.basePrice,
        discount: newTicketType.discount
      }
      isEditMode.value = true
      showForm.value = true
    }
  },
  { immediate: true }
)

function resetForm() {
  formData.value = {
    name: '',
    basePrice: 0,
    discount: 0
  }
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

  if (formData.value.basePrice === undefined || formData.value.basePrice < 0) {
    alert('請輸入有效的定價')
    return
  }

  if (formData.value.discount === undefined || formData.value.discount < 0) {
    alert('請輸入有效的折扣金額')
    return
  }

  // 驗證折扣最多小數點後一位
  const discountStr = formData.value.discount.toString()
  const decimalPart = discountStr.split('.')[1]
  if (decimalPart && decimalPart.length > 1) {
    alert('折扣金額最多只能有小數點後一位')
    return
  }

  if (isEditMode.value && ticketStore.selectedTicketTypeId) {
    // 更新現有票種
    ticketStore.updateTicketType(ticketStore.selectedTicketTypeId, {
      name: formData.value.name!,
      basePrice: formData.value.basePrice!,
      discount: formData.value.discount!
    })
    alert('票種更新成功')
  } else {
    // 創建新票種
    ticketStore.createTicketType({
      name: formData.value.name!,
      basePrice: formData.value.basePrice || 0,
      discount: formData.value.discount || 0
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

// 限制折扣輸入為最多一位小數
function validateDiscountInput(event: Event) {
  const input = event.target as HTMLInputElement
  const value = input.value

  // 允許空字串或數字
  if (value === '') {
    formData.value.discount = 0
    return
  }

  // 檢查小數位數
  const parts = value.split('.')
  if (parts.length === 2 && parts[1]!.length > 1) {
    // 限制為一位小數
    input.value = parseFloat(value).toFixed(1)
    formData.value.discount = parseFloat(input.value)
  }
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
                  placeholder="請輸入票種名稱"
                />
              </div>

              <!-- 定價 -->
              <div>
                <label
                  class="block text-sm font-medium mb-2"
                  :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                >
                  定價 <span class="text-red-500">*</span>
                </label>
                <BaseInput
                  v-model.number="formData.basePrice"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="請輸入定價"
                />
              </div>

              <!-- 折扣金額 -->
              <div>
                <label
                  class="block text-sm font-medium mb-2"
                  :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                >
                  折扣金額
                  <span
                    class="text-xs ml-1"
                    :class="theme === 'dark' ? 'text-neutral-500' : 'text-neutral-500'"
                  >
                    (最多小數點後一位)
                  </span>
                </label>
                <BaseInput
                  v-model.number="formData.discount"
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="請輸入折扣金額"
                  @input="validateDiscountInput"
                />
              </div>

              <!-- 售價（唯讀） -->
              <div>
                <label
                  class="block text-sm font-medium mb-2"
                  :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                >
                  售價
                </label>
                <input
                  :value="salePrice"
                  type="number"
                  readonly
                  disabled
                  :class="[
                    'w-full px-4 py-2.5 rounded-md cursor-not-allowed',
                    theme === 'dark'
                      ? 'bg-secondary-900 border-secondary-800 text-neutral-400'
                      : 'bg-neutral-100 border-neutral-200 text-neutral-600',
                    'border'
                  ]"
                />
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

          <!-- 票種列表 (grid) -->
          <div
            v-if="ticketStore.ticketTypes.length > 0"
            class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            <BaseCard
              v-for="ticket in ticketStore.ticketTypes"
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
                    theme === 'dark'
                      ? 'bg-primary-900/30 text-primary-400'
                      : 'bg-primary-100 text-primary-700'
                  ]"
                >
                  <TagIcon class="w-3 h-3" />
                  票種
                </span>
              </div>

              <div class="space-y-3">
                <div class="flex justify-between items-center">
                  <span
                    class="text-sm"
                    :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'"
                  >
                    定價
                  </span>
                  <span
                    class="text-base font-medium"
                    :class="theme === 'dark' ? 'text-neutral-200' : 'text-neutral-900'"
                  >
                    NT$ {{ ticket.basePrice }}
                  </span>
                </div>

                <div class="flex justify-between items-center">
                  <span
                    class="text-sm"
                    :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'"
                  >
                    折扣金額
                  </span>
                  <span class="text-base font-medium text-amber-600">
                    - NT$ {{ ticket.discount }}
                  </span>
                </div>

                <div
                  :class="[
                    'pt-3 border-t',
                    theme === 'dark' ? 'border-secondary-800' : 'border-neutral-200'
                  ]"
                >
                  <div class="flex justify-between items-center">
                    <span
                      class="text-sm font-medium"
                      :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                    >
                      售價
                    </span>
                    <span class="text-xl font-bold text-green-600">
                      NT$ {{ calculateSalePrice(ticket.basePrice, ticket.discount) }}
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
            v-if="ticketStore.ticketTypes.length === 0"
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
              目前還沒有任何票種
            </p>
            <BaseButton
              variant="primary"
              :icon="PlusIcon"
              @click="createNewTicket"
            >
              新增第一個票種
            </BaseButton>
          </BaseCard>
        </PageContainer>
      </main>
    </div>
  </div>
</template>
