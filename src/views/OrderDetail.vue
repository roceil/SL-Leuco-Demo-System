<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useOrderStore } from '@/stores/order'
import { useTicketStore } from '@/stores/ticket'
import { useAuthStore } from '@/stores/auth'
import { usePayment } from '@/composables/usePayment'
import { useSidebar } from '@/composables/useSidebar'
import { useTheme } from '@/composables/useTheme'
import Navbar from '@/components/Navbar.vue'
import Sidebar from '@/components/Sidebar.vue'
import PageContainer from '@/components/ui/PageContainer.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import type { InvoiceInfo, PassengerInfo, PaymentMethod } from '@/types/order'
import { validateIssueTicket } from '@/types/order'
import {
  DocumentTextIcon,
  ArrowLeftIcon,
  TicketIcon,
  PrinterIcon,
  XCircleIcon,
  PlusIcon,
  TrashIcon
} from '@heroicons/vue/24/outline'

const route = useRoute()
const router = useRouter()
const orderStore = useOrderStore()
const ticketStore = useTicketStore()
const authStore = useAuthStore()
const payment = usePayment()
const { isCollapsed } = useSidebar()
const { theme } = useTheme()

// 訂單資料
const orderId = ref<string>('')
const orderNotFound = ref(false)

// 付款表單
const showPaymentForm = ref(false)
const paymentAmount = ref(0)
const paymentMethod = ref<PaymentMethod>('cash')
const paymentNote = ref('')

// 發票表單
const showInvoiceForm = ref(false)
const invoiceFormData = ref<InvoiceInfo>({
  type: '二聯式'
})

// 乘客表單
const showPassengerForm = ref(false)
const passengerFormData = ref<Partial<PassengerInfo>>({
  name: '',
  idNumber: '',
  phone: '',
  isResident: false,
  ticketTypeId: '',
  hasBoarded: false
})

const currentOrder = computed(() => orderStore.selectedOrder)

// 載入訂單
function loadOrder() {
  const orderNumber = route.params.orderNumber as string
  const order = orderStore.getOrderByNumber(orderNumber)

  if (order) {
    orderId.value = order.id
    orderStore.selectOrder(order.id)
    orderNotFound.value = false
  } else {
    orderNotFound.value = true
  }
}

// 返回列表
function goBack() {
  router.push('/order-management')
}

// ============ 付款功能 ============

function openPaymentForm() {
  if (!currentOrder.value) return
  paymentAmount.value = currentOrder.value.paymentInfo.remainingAmount
  paymentMethod.value = currentOrder.value.paymentInfo.paymentMethod
  paymentNote.value = ''
  showPaymentForm.value = true
}

function savePayment() {
  if (!currentOrder.value) return

  const validation = payment.validatePaymentAmount(
    paymentAmount.value,
    currentOrder.value.paymentInfo.remainingAmount
  )

  if (!validation.isValid) {
    alert(validation.error)
    return
  }

  const record = payment.createPaymentRecord(
    paymentAmount.value,
    paymentMethod.value,
    authStore.currentUser?.id || 'system',
    paymentNote.value
  )

  const success = orderStore.addPayment(currentOrder.value.id, record)

  if (success) {
    alert('付款記錄新增成功')
    showPaymentForm.value = false
  } else {
    alert('付款記錄新增失敗')
  }
}

// ============ 發票功能 ============

function openInvoiceForm() {
  if (!currentOrder.value?.invoiceInfo) {
    invoiceFormData.value = { type: '二聯式' }
  } else {
    invoiceFormData.value = { ...currentOrder.value.invoiceInfo }
  }
  showInvoiceForm.value = true
}

function saveInvoice() {
  if (!currentOrder.value) return

  // 驗證三聯式必填欄位
  if (invoiceFormData.value.type === '三聯式') {
    if (!invoiceFormData.value.taxId || !invoiceFormData.value.companyName) {
      alert('三聯式發票需要填寫統一編號和公司名稱')
      return
    }
  }

  orderStore.updateInvoiceInfo(
    currentOrder.value.id,
    invoiceFormData.value,
    authStore.currentUser?.id || 'system'
  )

  alert('發票資訊已更新')
  showInvoiceForm.value = false
}

// ============ 乘客功能 ============

function openPassengerForm() {
  passengerFormData.value = {
    name: '',
    idNumber: '',
    phone: '',
    isResident: false,
    ticketTypeId: '',
    hasBoarded: false
  }
  showPassengerForm.value = true
}

function savePassenger() {
  if (!currentOrder.value) return

  if (!passengerFormData.value.name) {
    alert('請輸入乘客姓名')
    return
  }

  if (!passengerFormData.value.ticketTypeId) {
    alert('請選擇票種')
    return
  }

  orderStore.addPassenger(
    currentOrder.value.id,
    passengerFormData.value as Omit<PassengerInfo, 'id'>,
    authStore.currentUser?.id || 'system'
  )

  alert('乘客已新增')
  showPassengerForm.value = false
}

function removePassenger(passengerId: string) {
  if (!currentOrder.value) return

  if (confirm('確定要移除此乘客嗎？')) {
    orderStore.removePassenger(
      currentOrder.value.id,
      passengerId,
      authStore.currentUser?.id || 'system'
    )
  }
}

function getTicketName(ticketTypeId: string): string {
  const ticket = ticketStore.ticketTypes.find(t => t.id === ticketTypeId)
  return ticket?.name || ticketTypeId
}

// ============ 出票功能 ============

function issueTicket() {
  if (!currentOrder.value) return

  const validation = validateIssueTicket(currentOrder.value)

  if (!validation.isValid) {
    alert('無法出票：\n' + validation.errors.join('\n'))
    return
  }

  if (!confirm('確定要出票嗎？出票後將無法修改乘客資訊。')) {
    return
  }

  const result = orderStore.issueTicket(
    currentOrder.value.id,
    authStore.currentUser?.id || 'system'
  )

  if (result.success) {
    alert('出票成功')
  } else {
    alert('出票失敗：' + result.error)
  }
}

// ============ 列印簽單 ============

function printReceipt() {
  if (!currentOrder.value) return
  // TODO: 實作列印功能
  alert('列印功能開發中')
}

onMounted(() => {
  loadOrder()
})
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <Navbar :username="authStore.currentUser?.username || '管理員'" />

    <div class="flex flex-1">
      <Sidebar :active-route="$route.path.slice(1)" />

      <main :class="['flex-1 transition-all duration-300', isCollapsed ? 'ml-20' : 'ml-64']">
        <!-- 訂單未找到 -->
        <PageContainer v-if="orderNotFound" title="訂單不存在" :icon="XCircleIcon">
          <BaseCard padding="lg" class="text-center">
            <XCircleIcon class="w-24 h-24 mx-auto mb-4 text-red-500" />
            <p class="text-lg mb-6" :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'">
              找不到訂單編號：{{ route.params.orderNumber }}
            </p>
            <BaseButton variant="primary" @click="goBack">
              返回訂單列表
            </BaseButton>
          </BaseCard>
        </PageContainer>

        <!-- 訂單詳細 -->
        <PageContainer
          v-else-if="currentOrder"
          :title="`訂單詳細 - ${currentOrder.orderNumber}`"
          :icon="DocumentTextIcon"
        >
          <template #actions>
            <BaseButton variant="secondary" :icon="ArrowLeftIcon" @click="goBack">
              返回
            </BaseButton>
            <BaseButton
              v-if="!currentOrder.ticketIssuedAt"
              variant="primary"
              :icon="TicketIcon"
              @click="issueTicket"
            >
              出票
            </BaseButton>
            <BaseButton variant="secondary" :icon="PrinterIcon" @click="printReceipt">
              列印簽單
            </BaseButton>
          </template>

          <div class="space-y-6">
            <!-- 訂單基本資訊 -->
            <BaseCard title="訂單資訊" padding="lg">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span class="text-sm" :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'">
                    訂單編號
                  </span>
                  <p class="font-medium" :class="theme === 'dark' ? 'text-white' : 'text-neutral-900'">
                    {{ currentOrder.orderNumber }}
                  </p>
                </div>
                <div>
                  <span class="text-sm" :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'">
                    訂單狀態
                  </span>
                  <p class="font-medium">
                    <span
                      :class="[
                        'px-2 py-1 rounded text-sm',
                        currentOrder.status === 'confirmed'
                          ? 'bg-green-100 text-green-700'
                          : currentOrder.status === 'pending'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-gray-100 text-gray-700'
                      ]"
                    >
                      {{ currentOrder.status === 'confirmed' ? '已確認' : currentOrder.status === 'pending' ? '待確認' : currentOrder.status }}
                    </span>
                  </p>
                </div>
                <div>
                  <span class="text-sm" :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'">
                    客戶姓名
                  </span>
                  <p class="font-medium" :class="theme === 'dark' ? 'text-white' : 'text-neutral-900'">
                    {{ currentOrder.customerName }}
                  </p>
                </div>
                <div>
                  <span class="text-sm" :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'">
                    聯絡電話
                  </span>
                  <p class="font-medium" :class="theme === 'dark' ? 'text-white' : 'text-neutral-900'">
                    {{ currentOrder.customerPhone }}
                  </p>
                </div>
                <div>
                  <span class="text-sm" :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'">
                    航班
                  </span>
                  <p class="font-medium" :class="theme === 'dark' ? 'text-white' : 'text-neutral-900'">
                    {{ currentOrder.scheduleName }}
                  </p>
                </div>
                <div v-if="currentOrder.ticketIssuedAt">
                  <span class="text-sm" :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'">
                    出票時間
                  </span>
                  <p class="font-medium text-green-600">
                    {{ new Date(currentOrder.ticketIssuedAt).toLocaleString('zh-TW') }}
                  </p>
                </div>
              </div>
            </BaseCard>

            <!-- 付款資訊 -->
            <BaseCard title="付款資訊" padding="lg">
              <template #actions>
                <BaseButton
                  v-if="currentOrder.paymentInfo.remainingAmount > 0"
                  variant="primary"
                  size="sm"
                  :icon="PlusIcon"
                  @click="openPaymentForm"
                >
                  新增付款
                </BaseButton>
              </template>

              <div class="space-y-4">
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <span class="text-sm" :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'">
                      訂金
                    </span>
                    <p class="text-lg font-bold" :class="theme === 'dark' ? 'text-white' : 'text-neutral-900'">
                      NT$ {{ currentOrder.paymentInfo.deposit }}
                    </p>
                  </div>
                  <div>
                    <span class="text-sm" :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'">
                      尾款
                    </span>
                    <p class="text-lg font-bold" :class="theme === 'dark' ? 'text-white' : 'text-neutral-900'">
                      NT$ {{ currentOrder.paymentInfo.balance }}
                    </p>
                  </div>
                  <div>
                    <span class="text-sm" :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'">
                      折扣
                    </span>
                    <p class="text-lg font-bold text-amber-600">
                      - NT$ {{ currentOrder.paymentInfo.discount }}
                    </p>
                  </div>
                  <div>
                    <span class="text-sm" :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'">
                      總金額
                    </span>
                    <p class="text-lg font-bold" :class="theme === 'dark' ? 'text-white' : 'text-neutral-900'">
                      NT$ {{ currentOrder.paymentInfo.totalAmount }}
                    </p>
                  </div>
                </div>

                <div :class="['pt-4 border-t', theme === 'dark' ? 'border-secondary-800' : 'border-neutral-200']">
                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <span class="text-sm" :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'">
                        已付金額
                      </span>
                      <p class="text-xl font-bold text-green-600">
                        NT$ {{ currentOrder.paymentInfo.paidAmount }}
                      </p>
                    </div>
                    <div>
                      <span class="text-sm" :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'">
                        剩餘應付
                      </span>
                      <p class="text-xl font-bold text-red-600">
                        NT$ {{ currentOrder.paymentInfo.remainingAmount }}
                      </p>
                    </div>
                  </div>
                </div>

                <!-- 付款記錄 -->
                <div
                  v-if="currentOrder.paymentInfo.paymentRecords.length > 0"
                  :class="['pt-4 border-t', theme === 'dark' ? 'border-secondary-800' : 'border-neutral-200']"
                >
                  <h4 class="text-sm font-medium mb-3" :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'">
                    付款記錄
                  </h4>
                  <div class="space-y-2">
                    <div
                      v-for="record in currentOrder.paymentInfo.paymentRecords"
                      :key="record.id"
                      :class="[
                        'p-3 rounded-md flex justify-between items-center',
                        theme === 'dark' ? 'bg-secondary-800' : 'bg-neutral-50'
                      ]"
                    >
                      <div>
                        <p class="font-medium" :class="theme === 'dark' ? 'text-white' : 'text-neutral-900'">
                          NT$ {{ record.amount }}
                        </p>
                        <p class="text-xs" :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'">
                          {{ payment.formatPaymentMethod(record.method) }} ·
                          {{ new Date(record.paidAt).toLocaleString('zh-TW') }}
                        </p>
                        <p v-if="record.note" class="text-xs mt-1" :class="theme === 'dark' ? 'text-neutral-500' : 'text-neutral-500'">
                          {{ record.note }}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </BaseCard>

            <!-- 發票資訊 -->
            <BaseCard title="發票資訊" padding="lg">
              <template #actions>
                <BaseButton variant="secondary" size="sm" @click="openInvoiceForm">
                  {{ currentOrder.invoiceInfo ? '編輯發票' : '填寫發票' }}
                </BaseButton>
              </template>

              <div v-if="currentOrder.invoiceInfo">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span class="text-sm" :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'">
                      發票類型
                    </span>
                    <p class="font-medium" :class="theme === 'dark' ? 'text-white' : 'text-neutral-900'">
                      {{ currentOrder.invoiceInfo.type }}
                    </p>
                  </div>
                  <div v-if="currentOrder.invoiceInfo.taxId">
                    <span class="text-sm" :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'">
                      統一編號
                    </span>
                    <p class="font-medium" :class="theme === 'dark' ? 'text-white' : 'text-neutral-900'">
                      {{ currentOrder.invoiceInfo.taxId }}
                    </p>
                  </div>
                  <div v-if="currentOrder.invoiceInfo.companyName">
                    <span class="text-sm" :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'">
                      公司名稱
                    </span>
                    <p class="font-medium" :class="theme === 'dark' ? 'text-white' : 'text-neutral-900'">
                      {{ currentOrder.invoiceInfo.companyName }}
                    </p>
                  </div>
                  <div v-if="currentOrder.invoiceInfo.editedAt">
                    <span class="text-sm" :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'">
                      最後編輯時間
                    </span>
                    <p class="text-sm" :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'">
                      {{ new Date(currentOrder.invoiceInfo.editedAt).toLocaleString('zh-TW') }}
                    </p>
                  </div>
                </div>
              </div>
              <p v-else :class="theme === 'dark' ? 'text-neutral-500' : 'text-neutral-400'">
                尚未填寫發票資訊
              </p>
            </BaseCard>

            <!-- 乘客列表 -->
            <BaseCard title="乘客列表" padding="lg">
              <template #actions>
                <BaseButton
                  v-if="!currentOrder.ticketIssuedAt"
                  variant="primary"
                  size="sm"
                  :icon="PlusIcon"
                  @click="openPassengerForm"
                >
                  新增乘客
                </BaseButton>
              </template>

              <div v-if="currentOrder.passengers.length > 0" class="space-y-3">
                <div
                  v-for="(passenger, index) in currentOrder.passengers"
                  :key="passenger.id"
                  :class="[
                    'p-4 rounded-md',
                    theme === 'dark' ? 'bg-secondary-800' : 'bg-neutral-50'
                  ]"
                >
                  <div class="flex justify-between items-start">
                    <div class="flex-1">
                      <div class="flex items-center gap-2 mb-2">
                        <h4 class="font-medium" :class="theme === 'dark' ? 'text-white' : 'text-neutral-900'">
                          {{ index + 1 }}. {{ passenger.name }}
                        </h4>
                        <span
                          v-if="passenger.isResident"
                          class="px-2 py-0.5 text-xs rounded bg-blue-100 text-blue-700"
                        >
                          居民
                        </span>
                      </div>
                      <div class="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'">
                            票種：
                          </span>
                          <span :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'">
                            {{ getTicketName(passenger.ticketTypeId) }}
                          </span>
                        </div>
                        <div v-if="passenger.phone">
                          <span :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'">
                            電話：
                          </span>
                          <span :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'">
                            {{ passenger.phone }}
                          </span>
                        </div>
                      </div>
                    </div>
                    <BaseButton
                      v-if="!currentOrder.ticketIssuedAt"
                      variant="danger"
                      size="sm"
                      :icon="TrashIcon"
                      @click="removePassenger(passenger.id)"
                    >
                      移除
                    </BaseButton>
                  </div>
                </div>
              </div>
              <p v-else :class="theme === 'dark' ? 'text-neutral-500' : 'text-neutral-400'">
                尚未新增乘客
              </p>
            </BaseCard>
          </div>

          <!-- 新增付款表單 Modal -->
          <div
            v-if="showPaymentForm"
            class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            @click.self="showPaymentForm = false"
          >
            <BaseCard title="新增付款記錄" padding="lg" class="w-full max-w-md">
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium mb-2" :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'">
                    付款金額 <span class="text-red-500">*</span>
                  </label>
                  <BaseInput v-model.number="paymentAmount" type="number" min="0" :max="currentOrder.paymentInfo.remainingAmount" />
                  <p class="text-xs mt-1" :class="theme === 'dark' ? 'text-neutral-500' : 'text-neutral-500'">
                    剩餘應付：NT$ {{ currentOrder.paymentInfo.remainingAmount }}
                  </p>
                </div>

                <div>
                  <label class="block text-sm font-medium mb-2" :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'">
                    付款方式 <span class="text-red-500">*</span>
                  </label>
                  <select
                    v-model="paymentMethod"
                    :class="[
                      'w-full px-4 py-2.5 rounded-md border',
                      theme === 'dark'
                        ? 'bg-secondary-900 border-secondary-800 text-white'
                        : 'bg-white border-neutral-200 text-neutral-900'
                    ]"
                  >
                    <option value="cash">現金</option>
                    <option value="credit_card">信用卡</option>
                    <option value="transfer">轉帳</option>
                    <option value="other">其他</option>
                  </select>
                </div>

                <div>
                  <label class="block text-sm font-medium mb-2" :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'">
                    備註
                  </label>
                  <BaseInput v-model="paymentNote" placeholder="選填" />
                </div>
              </div>

              <div class="flex gap-3 mt-6">
                <BaseButton variant="secondary" @click="showPaymentForm = false" class="flex-1">
                  取消
                </BaseButton>
                <BaseButton variant="primary" @click="savePayment" class="flex-1">
                  確認新增
                </BaseButton>
              </div>
            </BaseCard>
          </div>

          <!-- 發票資訊表單 Modal -->
          <div
            v-if="showInvoiceForm"
            class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            @click.self="showInvoiceForm = false"
          >
            <BaseCard title="發票資訊" padding="lg" class="w-full max-w-md">
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium mb-2" :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'">
                    發票類型 <span class="text-red-500">*</span>
                  </label>
                  <select
                    v-model="invoiceFormData.type"
                    :class="[
                      'w-full px-4 py-2.5 rounded-md border',
                      theme === 'dark'
                        ? 'bg-secondary-900 border-secondary-800 text-white'
                        : 'bg-white border-neutral-200 text-neutral-900'
                    ]"
                  >
                    <option value="二聯式">二聯式</option>
                    <option value="三聯式">三聯式</option>
                    <option value="電子發票">電子發票</option>
                  </select>
                </div>

                <div v-if="invoiceFormData.type === '三聯式'">
                  <label class="block text-sm font-medium mb-2" :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'">
                    統一編號 <span class="text-red-500">*</span>
                  </label>
                  <BaseInput v-model="invoiceFormData.taxId" placeholder="請輸入統一編號" />
                </div>

                <div v-if="invoiceFormData.type === '三聯式'">
                  <label class="block text-sm font-medium mb-2" :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'">
                    公司名稱 <span class="text-red-500">*</span>
                  </label>
                  <BaseInput v-model="invoiceFormData.companyName" placeholder="請輸入公司名稱" />
                </div>
              </div>

              <div class="flex gap-3 mt-6">
                <BaseButton variant="secondary" @click="showInvoiceForm = false" class="flex-1">
                  取消
                </BaseButton>
                <BaseButton variant="primary" @click="saveInvoice" class="flex-1">
                  儲存
                </BaseButton>
              </div>
            </BaseCard>
          </div>

          <!-- 新增乘客表單 Modal -->
          <div
            v-if="showPassengerForm"
            class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            @click.self="showPassengerForm = false"
          >
            <BaseCard title="新增乘客" padding="lg" class="w-full max-w-md">
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium mb-2" :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'">
                    姓名 <span class="text-red-500">*</span>
                  </label>
                  <BaseInput v-model="passengerFormData.name" placeholder="請輸入姓名" />
                </div>

                <div>
                  <label class="block text-sm font-medium mb-2" :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'">
                    票種 <span class="text-red-500">*</span>
                  </label>
                  <select
                    v-model="passengerFormData.ticketTypeId"
                    :class="[
                      'w-full px-4 py-2.5 rounded-md border',
                      theme === 'dark'
                        ? 'bg-secondary-900 border-secondary-800 text-white'
                        : 'bg-white border-neutral-200 text-neutral-900'
                    ]"
                  >
                    <option value="">請選擇票種</option>
                    <option v-for="ticket in ticketStore.ticketTypes" :key="ticket.id" :value="ticket.id">
                      {{ ticket.name }} - NT$ {{ ticket.facePrice }}
                    </option>
                  </select>
                </div>

                <div>
                  <label class="block text-sm font-medium mb-2" :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'">
                    電話
                  </label>
                  <BaseInput v-model="passengerFormData.phone" placeholder="選填" />
                </div>

                <div class="flex items-center">
                  <input
                    v-model="passengerFormData.isResident"
                    type="checkbox"
                    :class="[
                      'w-5 h-5 rounded',
                      theme === 'dark'
                        ? 'bg-secondary-900 border-secondary-700'
                        : 'bg-white border-neutral-300'
                    ]"
                  />
                  <label class="ml-2 text-sm" :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'">
                    居民
                  </label>
                </div>
              </div>

              <div class="flex gap-3 mt-6">
                <BaseButton variant="secondary" @click="showPassengerForm = false" class="flex-1">
                  取消
                </BaseButton>
                <BaseButton variant="primary" @click="savePassenger" class="flex-1">
                  新增
                </BaseButton>
              </div>
            </BaseCard>
          </div>
        </PageContainer>
      </main>
    </div>
  </div>
</template>
