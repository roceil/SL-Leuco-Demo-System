<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useOrderStore } from '@/stores/order'
import { useTicketStore } from '@/stores/ticket'
import { useAuthStore } from '@/stores/auth'
import { useRbacStore } from '@/stores/rbac'
import { useAuth } from '@/composables/useAuth'
import { usePayment } from '@/composables/usePayment'
import { useSidebar } from '@/composables/useSidebar'
import { useTheme } from '@/composables/useTheme'
import Navbar from '@/components/Navbar.vue'
import Sidebar from '@/components/Sidebar.vue'
import PageContainer from '@/components/ui/PageContainer.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import type { InvoiceInfo, PaymentMethod } from '@/types/order'
import { validateIssueTicket } from '@/types/order'
import {
  DocumentTextIcon,
  ArrowLeftIcon,
  TicketIcon,
  PrinterIcon,
  XCircleIcon,
  PlusIcon,
  PencilSquareIcon,
  CheckIcon,
  XMarkIcon,
  TrashIcon
} from '@heroicons/vue/24/outline'

const route = useRoute()
const router = useRouter()
const orderStore = useOrderStore()
const ticketStore = useTicketStore()
const authStore = useAuthStore()
const rbacStore = useRbacStore()
const payment = usePayment()
const { isCollapsed } = useSidebar()
const { theme } = useTheme()
const { currentUser } = useAuth()

const currentAccountId = computed(() => {
  const account = rbacStore.accounts.find(a => a.username === currentUser.value)
  return account?.id || currentUser.value || 'system'
})

// 訂單資料
const orderId = ref<string>('')
const orderNotFound = ref(false)

// 付款表單
const showPaymentForm = ref(false)
const paymentAmount = ref(0)
const paymentType = ref<import('@/types/order').PaymentType>('deposit')
const paymentMethod = ref<PaymentMethod>('cash')
const paymentNote = ref('')

// 折扣表單
const showDiscountForm = ref(false)
const discountAmount = ref(0)

// 發票表單
const showInvoiceForm = ref(false)
const invoiceFormData = ref<InvoiceInfo>({
  type: '二聯式'
})

// 行內編輯乘客狀態
interface LocalPassenger {
  id: string          // 空字串表示尚未儲存
  ticketTypeId: string
  passengerType: string
  name: string
  idNumber: string
  birthday: string
}

const localPassengers = ref<LocalPassenger[]>([])
const isPassengersDirty = ref(false)
const isEditingPassengers = ref(false)

// 加票 Modal
const showAddTicketModal = ref(false)
const addTicketTypeId = ref('')

const currentOrder = computed(() => orderStore.selectedOrder)

const formatShipTime = (segments: import('@/types/order').ScheduleSegment[]): string[] => {
  return segments.map(s => `${s.date}｜${s.time}｜${s.route}`)
}

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
  // 若訂金尚未付清則預設訂金，否則預設尾款
  paymentType.value =
    currentOrder.value.paymentInfo.paidAmount < currentOrder.value.paymentInfo.deposit
      ? 'deposit'
      : 'balance'
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
    currentAccountId.value,
    paymentNote.value,
    paymentType.value
  )

  const success = orderStore.addPayment(currentOrder.value.id, record)

  if (success) {
    alert('付款記錄新增成功')
    showPaymentForm.value = false
  } else {
    alert('付款記錄新增失敗')
  }
}

// ============ 折扣功能 ============

function openDiscountForm() {
  if (!currentOrder.value) return
  discountAmount.value = currentOrder.value.paymentInfo.discount
  showDiscountForm.value = true
}

function saveDiscount() {
  if (!currentOrder.value) return

  if (discountAmount.value < 0) {
    alert('折扣金額不能為負數')
    return
  }

  const updatedInfo = payment.updatePaymentInfo(currentOrder.value.paymentInfo, {
    discount: discountAmount.value
  })
  orderStore.updatePaymentInfo(
    currentOrder.value.id,
    updatedInfo,
    currentAccountId.value
  )
  showDiscountForm.value = false
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
    currentAccountId.value
  )

  alert('發票資訊已更新')
  showInvoiceForm.value = false
}

// ============ 乘客功能 ============

function getPassengerType(ticketTypeId: string): string {
  const ticket = ticketStore.ticketTypes.find(t => t.id === ticketTypeId)
  return ticket?.passengerType || ticketTypeId
}

function initLocalPassengers() {
  if (!currentOrder.value) return

  const order = currentOrder.value

  if (order.passengers.length > 0) {
    // 已有乘客資料 → 從現有乘客初始化
    localPassengers.value = order.passengers.map(p => ({
      id: p.id,
      ticketTypeId: p.ticketTypeId,
      passengerType: getPassengerType(p.ticketTypeId),
      name: p.name,
      idNumber: p.idNumber || '',
      birthday: p.birthday || ''
    }))
  } else if (order.ticketBreakdown?.length) {
    // 尚無乘客，但有票種拆解 → 自動產生空白輸入列
    const slots: LocalPassenger[] = []
    for (const breakdown of order.ticketBreakdown) {
      for (let i = 0; i < breakdown.quantity; i++) {
        slots.push({
          id: '',
          ticketTypeId: breakdown.ticketTypeId,
          passengerType: breakdown.passengerType,
          name: '',
          idNumber: '',
          birthday: ''
        })
      }
    }
    localPassengers.value = slots
  } else {
    localPassengers.value = []
  }
  isPassengersDirty.value = false
}

function startEditPassengers() {
  isEditingPassengers.value = true
}

function cancelEditPassengers() {
  initLocalPassengers()
  isEditingPassengers.value = false
}

async function saveAllPassengers() {
  if (!currentOrder.value) return

  const userId = currentAccountId.value

  for (const slot of localPassengers.value) {
    if (slot.id) {
      // 已存在（含加票後立即持久化的乘客）→ 更新姓名 / 身分證 / 生日
      orderStore.updatePassenger(
        currentOrder.value.id,
        slot.id,
        {
          name: slot.name,
          idNumber: slot.idNumber || undefined,
          birthday: slot.birthday || undefined,
          ticketTypeId: slot.ticketTypeId,
          hasBoarded: false
        },
        userId
      )
    } else if (slot.name.trim()) {
      // 舊訂單由 ticketBreakdown 產生的空列，有填姓名才新增
      orderStore.addPassenger(
        currentOrder.value.id,
        {
          name: slot.name,
          idNumber: slot.idNumber || undefined,
          birthday: slot.birthday || undefined,
          ticketTypeId: slot.ticketTypeId,
          hasBoarded: false
        },
        userId
      )
    }
  }

  // 重新初始化以反映儲存後狀態
  initLocalPassengers()
  isPassengersDirty.value = false
  isEditingPassengers.value = false
  alert('乘客資料已儲存')
}

function openAddTicketModal() {
  addTicketTypeId.value = ticketStore.ticketTypes[0]?.id || ''
  showAddTicketModal.value = true
}

function confirmAddTicket() {
  if (!addTicketTypeId.value) {
    alert('請選擇票種')
    return
  }
  if (!currentOrder.value) return

  const ticket = ticketStore.ticketTypes.find(t => t.id === addTicketTypeId.value)
  if (!ticket) return

  const order = currentOrder.value
  const userId = currentAccountId.value

  // 1. 立即寫入乘客到 db.json
  orderStore.addPassenger(
    order.id,
    { name: '', ticketTypeId: ticket.id, hasBoarded: false },
    userId
  )

  // 2. 更新 ticketBreakdown
  const breakdown = order.ticketBreakdown ?? []
  const existingEntry = breakdown.find(b => b.ticketTypeId === ticket.id)
  const updatedBreakdown = existingEntry
    ? breakdown.map(b => b.ticketTypeId === ticket.id ? { ...b, quantity: b.quantity + 1 } : b)
    : [...breakdown, { passengerType: ticket.passengerType, ticketTypeId: ticket.id, quantity: 1 }]

  // 3. 更新 paymentInfo（票面價 × 航段數）
  const ticketPrice = ticket.facePrice * order.scheduleSegments.length
  const updatedPaymentInfo = payment.updatePaymentInfo(order.paymentInfo, {
    balance: order.paymentInfo.balance + ticketPrice
  })

  orderStore.updateOrder(order.id, { ticketBreakdown: updatedBreakdown, paymentInfo: updatedPaymentInfo }, userId)

  // 4. 重新初始化，讓新乘客取得真實 ID
  initLocalPassengers()

  isEditingPassengers.value = true
  showAddTicketModal.value = false
}

function refundPassenger(slot: LocalPassenger, index: number) {
  const label = slot.passengerType || '此票'
  if (!confirm(`確定要退掉這張「${label}」票嗎？此操作無法復原。`)) return

  if (!currentOrder.value) return

  const order = currentOrder.value
  const userId = currentAccountId.value

  // 1. 更新 ticketBreakdown 與 paymentInfo
  const ticket = ticketStore.ticketTypes.find(t => t.id === slot.ticketTypeId)
  if (ticket) {
    const ticketPrice = ticket.facePrice * order.scheduleSegments.length
    const breakdown = order.ticketBreakdown ?? []
    const updatedBreakdown = breakdown
      .map(b => b.ticketTypeId === slot.ticketTypeId ? { ...b, quantity: b.quantity - 1 } : b)
      .filter(b => b.quantity > 0)
    const updatedPaymentInfo = payment.updatePaymentInfo(order.paymentInfo, {
      balance: Math.max(0, order.paymentInfo.balance - ticketPrice)
    })
    orderStore.updateOrder(order.id, { ticketBreakdown: updatedBreakdown, paymentInfo: updatedPaymentInfo }, userId)
  }

  // 2. 移除乘客
  if (slot.id) {
    orderStore.removePassenger(order.id, slot.id, userId)
  }

  localPassengers.value.splice(index, 1)
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
    currentAccountId.value
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
  initLocalPassengers()
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
                <div class="md:col-span-2">
                  <span class="text-sm block mb-2" :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'">
                    航班 / 運行航商
                  </span>
                  <div
                    :class="[
                      'rounded-lg overflow-hidden border',
                      theme === 'dark' ? 'border-secondary-700' : 'border-neutral-200'
                    ]"
                  >
                    <table class="w-full text-sm">
                      <thead>
                        <tr
                          :class="[
                            'text-xs font-medium uppercase tracking-wide',
                            theme === 'dark'
                              ? 'bg-secondary-800 text-neutral-400'
                              : 'bg-neutral-100 text-neutral-500'
                          ]"
                        >
                          <th class="text-left px-4 py-2">日期</th>
                          <th class="text-left px-4 py-2">時間</th>
                          <th class="text-left px-4 py-2">航段</th>
                          <th class="text-left px-4 py-2">運行航商</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr
                          v-for="(seg, i) in currentOrder.scheduleSegments"
                          :key="i"
                          :class="[
                            'border-t',
                            theme === 'dark'
                              ? 'border-secondary-700 bg-secondary-900 text-white'
                              : 'border-neutral-100 bg-white text-neutral-900'
                          ]"
                        >
                          <td class="px-4 py-2.5 font-medium">{{ seg.date }}</td>
                          <td class="px-4 py-2.5 font-medium">{{ seg.time }}</td>
                          <td class="px-4 py-2.5">{{ seg.route }}</td>
                          <td class="px-4 py-2.5">
                            {{
                              rbacStore.organizations.find(
                                o => o.id === (seg.organizationId ?? currentOrder?.organizationId)
                              )?.name ?? '—'
                            }}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
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
                <div class="flex gap-2">
                  <BaseButton
                    variant="secondary"
                    size="sm"
                    @click="openDiscountForm"
                  >
                    設定折扣
                  </BaseButton>
                  <BaseButton
                    v-if="currentOrder.paymentInfo.remainingAmount > 0"
                    variant="primary"
                    size="sm"
                    :icon="PlusIcon"
                    @click="openPaymentForm"
                  >
                    新增付款
                  </BaseButton>
                </div>
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
                        <div class="flex items-center gap-2">
                          <p class="font-medium" :class="theme === 'dark' ? 'text-white' : 'text-neutral-900'">
                            NT$ {{ record.amount }}
                          </p>
                          <span
                            v-if="record.paymentType"
                            :class="[
                              'text-xs px-1.5 py-0.5 rounded font-medium',
                              record.paymentType === 'deposit'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-green-100 text-green-700'
                            ]"
                          >
                            {{ payment.formatPaymentType(record.paymentType) }}
                          </span>
                        </div>
                        <p class="text-xs" :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'">
                          {{ payment.formatPaymentMethod(record.method) }} ·
                          {{ new Date(record.paidAt).toLocaleString('zh-TW') }} ·
                          {{ rbacStore.accounts.find(a => a.id === record.paidBy)?.name || record.paidBy }}
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
                <!-- 編輯模式 -->
                <template v-if="isEditingPassengers">
                  <BaseButton
                    v-if="!currentOrder.ticketIssuedAt"
                    variant="secondary"
                    size="sm"
                    :icon="PlusIcon"
                    @click="openAddTicketModal"
                  >
                    加票
                  </BaseButton>
                  <BaseButton
                    variant="secondary"
                    size="sm"
                    :icon="XMarkIcon"
                    @click="cancelEditPassengers"
                  >
                    取消
                  </BaseButton>
                  <BaseButton
                    variant="primary"
                    size="sm"
                    :icon="CheckIcon"
                    @click="saveAllPassengers"
                  >
                    確認
                  </BaseButton>
                </template>

                <!-- 非編輯模式 -->
                <template v-else>
                  <BaseButton
                    variant="secondary"
                    size="sm"
                    :icon="PencilSquareIcon"
                    @click="startEditPassengers"
                  >
                    編輯
                  </BaseButton>
                </template>
              </template>

              <!-- 有乘客或票種拆解 -->
              <div v-if="localPassengers.length > 0" class="space-y-3">
                <div
                  v-for="(slot, index) in localPassengers"
                  :key="index"
                  class="p-4 rounded-md flex items-start gap-3"
                  :class="theme === 'dark' ? 'bg-secondary-800' : 'bg-neutral-50'"
                >
                  <!-- 票種 + 三欄輸入 -->
                  <div class="flex-1 grid grid-cols-4 gap-3">
                    <!-- 票種標籤（唯讀） -->
                    <div class="pt-1">
                      <span class="text-xs" :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-500'">
                        票種
                      </span>
                      <p class="font-medium text-sm mt-1" :class="theme === 'dark' ? 'text-white' : 'text-neutral-900'">
                        {{ slot.passengerType }}
                      </p>
                    </div>

                    <!-- 姓名輸入 -->
                    <div>
                      <label class="text-xs" :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-500'">
                        姓名
                      </label>
                      <BaseInput
                        v-model="slot.name"
                        placeholder="請輸入姓名"
                        :disabled="!isEditingPassengers || !!currentOrder.ticketIssuedAt"
                        @input="isPassengersDirty = true"
                      />
                    </div>

                    <!-- 身分證字號輸入 -->
                    <div>
                      <label class="text-xs" :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-500'">
                        身分證字號
                      </label>
                      <BaseInput
                        v-model="slot.idNumber"
                        placeholder="請輸入身分證字號"
                        :disabled="!isEditingPassengers || !!currentOrder.ticketIssuedAt"
                        @input="isPassengersDirty = true"
                      />
                    </div>

                    <!-- 生日輸入 -->
                    <div>
                      <label class="text-xs" :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-500'">
                        生日
                      </label>
                      <BaseInput
                        v-model="slot.birthday"
                        type="date"
                        :disabled="!isEditingPassengers || !!currentOrder.ticketIssuedAt"
                        @input="isPassengersDirty = true"
                      />
                    </div>
                  </div>

                  <!-- 退票按鈕 -->
                  <button
                    v-if="isEditingPassengers"
                    @click="refundPassenger(slot, index)"
                    type="button"
                    class="shrink-0 mt-6 flex items-center gap-1 px-3 py-1.5 text-xs rounded border transition-colors"
                    :class="theme === 'dark'
                      ? 'border-red-700 text-red-400 hover:bg-red-900/30'
                      : 'border-red-300 text-red-600 hover:bg-red-50'"
                  >
                    <TrashIcon class="w-3.5 h-3.5" />
                    退票
                  </button>
                </div>
              </div>

              <!-- 無票種資訊（舊訂單 fallback） -->
              <p v-else :class="theme === 'dark' ? 'text-neutral-500' : 'text-neutral-400'">
                尚無乘客資訊。請至訂單建立時選擇票種數量。
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
                    費用類型 <span class="text-red-500">*</span>
                  </label>
                  <select
                    v-model="paymentType"
                    :class="[
                      'w-full px-4 py-2.5 rounded-md border',
                      theme === 'dark'
                        ? 'bg-secondary-900 border-secondary-800 text-white'
                        : 'bg-white border-neutral-200 text-neutral-900'
                    ]"
                  >
                    <option value="deposit">訂金</option>
                    <option value="balance">尾款</option>
                  </select>
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

          <!-- 設定折扣 Modal -->
          <div
            v-if="showDiscountForm"
            class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            @click.self="showDiscountForm = false"
          >
            <BaseCard title="設定折扣" padding="lg" class="w-full max-w-sm">
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium mb-2" :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'">
                    折扣金額
                  </label>
                  <BaseInput v-model.number="discountAmount" type="number" min="0" placeholder="0" />
                  <p class="text-xs mt-1" :class="theme === 'dark' ? 'text-neutral-500' : 'text-neutral-500'">
                    訂金 NT$ {{ currentOrder.paymentInfo.deposit }} + 尾款 NT$ {{ currentOrder.paymentInfo.balance }} - 折扣 NT$ {{ discountAmount }} = 總計 NT$ {{ Math.max(0, currentOrder.paymentInfo.deposit + currentOrder.paymentInfo.balance - discountAmount) }}
                  </p>
                </div>
              </div>

              <div class="flex gap-3 mt-6">
                <BaseButton variant="secondary" @click="showDiscountForm = false" class="flex-1">
                  取消
                </BaseButton>
                <BaseButton variant="primary" @click="saveDiscount" class="flex-1">
                  確認
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

          <!-- 加票 Modal -->
          <div
            v-if="showAddTicketModal"
            class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            @click.self="showAddTicketModal = false"
          >
            <BaseCard title="加票" padding="lg" class="w-full max-w-sm">
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium mb-2" :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'">
                    選擇票種 <span class="text-red-500">*</span>
                  </label>
                  <select
                    v-model="addTicketTypeId"
                    :class="[
                      'w-full px-4 py-2.5 rounded-md border',
                      theme === 'dark'
                        ? 'bg-secondary-900 border-secondary-800 text-white'
                        : 'bg-white border-neutral-200 text-neutral-900'
                    ]"
                  >
                    <option value="" disabled>請選擇票種</option>
                    <option
                      v-for="ticket in ticketStore.ticketTypes"
                      :key="ticket.id"
                      :value="ticket.id"
                    >
                      {{ ticket.passengerType }} — NT$ {{ ticket.facePrice }}
                    </option>
                  </select>
                </div>
              </div>

              <div class="flex gap-3 mt-6">
                <BaseButton variant="secondary" @click="showAddTicketModal = false" class="flex-1">
                  取消
                </BaseButton>
                <BaseButton variant="primary" @click="confirmAddTicket" class="flex-1">
                  加入
                </BaseButton>
              </div>
            </BaseCard>
          </div>

        </PageContainer>
      </main>
    </div>
  </div>
</template>
