<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useTicketStore } from '@/stores/ticket'
import { useSidebar } from '@/composables/useSidebar'
import Navbar from '@/components/Navbar.vue'
import Sidebar from '@/components/Sidebar.vue'
import type { TicketType } from '@/types/ticket'
import { calculateSalePrice } from '@/types/ticket'

const ticketStore = useTicketStore()
const { isCollapsed } = useSidebar()

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
    const newTicket = ticketStore.createTicketType({
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
  if (parts.length === 2 && parts[1].length > 1) {
    // 限制為一位小數
    input.value = parseFloat(value).toFixed(1)
    formData.value.discount = parseFloat(input.value)
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <Navbar />
    <Sidebar active-route="ticket-management" />

    <!-- 主要內容區 -->
    <main :class="['p-8 min-h-[calc(100vh-4rem)] transition-all duration-300', isCollapsed ? 'ml-20' : 'ml-64']">
      <!-- 頁面標題 -->
      <div class="mb-6 flex justify-between items-center">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">票種管理</h1>
          <p class="text-gray-600 mt-1">管理系統中的票種及其定價</p>
        </div>
        <button
          @click="createNewTicket"
          class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
        >
          + 新增票種
        </button>
      </div>

      <!-- 表單區（當顯示時） -->
      <div v-if="showForm" class="bg-white rounded-lg shadow p-6 mb-6">
        <h2 class="text-xl font-semibold text-gray-900 mb-6">
          {{ isEditMode ? '編輯票種' : '新增票種' }}
        </h2>

        <div class="grid grid-cols-2 gap-4">
          <!-- 票種名稱 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2"
              >票種名稱 <span class="text-red-500">*</span></label
            >
            <input
              v-model="formData.name"
              type="text"
              required
              placeholder="請輸入票種名稱"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <!-- 定價 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2"
              >定價 <span class="text-red-500">*</span></label
            >
            <input
              v-model.number="formData.basePrice"
              type="number"
              min="0"
              step="1"
              required
              placeholder="請輸入定價"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <!-- 折扣金額 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2"
              >折扣金額 <span class="text-gray-500 text-xs">(最多小數點後一位)</span></label
            >
            <input
              v-model.number="formData.discount"
              type="number"
              min="0"
              step="0.1"
              placeholder="請輸入折扣金額"
              @input="validateDiscountInput"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <!-- 售價（唯讀） -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">售價</label>
            <input
              :value="salePrice"
              type="number"
              readonly
              disabled
              class="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed text-gray-700"
            />
          </div>
        </div>

        <!-- 操作按鈕 -->
        <div class="flex gap-3 pt-4 border-t border-gray-200 mt-6">
          <button
            v-if="isEditMode"
            @click="deleteTicket(ticketStore.selectedTicketTypeId!)"
            class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            刪除票種
          </button>
          <button
            @click="cancelEdit"
            class="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
          >
            取消
          </button>
          <button
            @click="saveTicket"
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors ml-auto"
          >
            {{ isEditMode ? '更新並儲存' : '創建票種' }}
          </button>
        </div>
      </div>

      <!-- 票種列表 (grid-cols-3) -->
      <div class="grid grid-cols-3 gap-6">
        <div
          v-for="ticket in ticketStore.ticketTypes"
          :key="ticket.id"
          class="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer"
          @click="editTicket(ticket.id)"
        >
          <div class="flex justify-between items-start mb-4">
            <h3 class="text-lg font-semibold text-gray-900">{{ ticket.name }}</h3>
            <span
              class="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded"
            >
              票種
            </span>
          </div>

          <div class="space-y-3">
            <div class="flex justify-between items-center">
              <span class="text-sm text-gray-600">定價</span>
              <span class="text-base font-medium text-gray-900">NT$ {{ ticket.basePrice }}</span>
            </div>

            <div class="flex justify-between items-center">
              <span class="text-sm text-gray-600">折扣金額</span>
              <span class="text-base font-medium text-orange-600">- NT$ {{ ticket.discount }}</span>
            </div>

            <div class="pt-3 border-t border-gray-200">
              <div class="flex justify-between items-center">
                <span class="text-sm font-medium text-gray-700">售價</span>
                <span class="text-xl font-bold text-green-600">
                  NT$ {{ calculateSalePrice(ticket.basePrice, ticket.discount) }}
                </span>
              </div>
            </div>
          </div>

          <div class="mt-4 text-xs text-gray-500">
            最後更新：{{ new Date(ticket.updatedAt).toLocaleString('zh-TW') }}
          </div>
        </div>
      </div>

      <!-- 空狀態 -->
      <div
        v-if="ticketStore.ticketTypes.length === 0"
        class="bg-white rounded-lg shadow p-12 text-center"
      >
        <p class="text-gray-500 mb-4">目前還沒有任何票種</p>
        <button
          @click="createNewTicket"
          class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
        >
          + 新增第一個票種
        </button>
      </div>
    </main>
  </div>
</template>
