<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import QRCode from 'qrcode'
import Navbar from '@/components/Navbar.vue'
import Sidebar from '@/components/Sidebar.vue'
import PageContainer from '@/components/ui/PageContainer.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { useSidebar } from '@/composables/useSidebar'
import { useTheme } from '@/composables/useTheme'
import { useOrders } from '@/composables/useOrders'
import type { SavedOrder, TicketPassenger, TicketStatus } from '@/constants/mockOrders'
import {
  DocumentTextIcon,
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
  PrinterIcon,
  QrCodeIcon
} from '@heroicons/vue/24/outline'

const { isCollapsed } = useSidebar()
const { theme } = useTheme()
const route = useRoute()
const router = useRouter()
const qrCodeDataUrl = ref<string>('')
const { getOrderByNumber, updateOrder } = useOrders()

interface Ticket {
  id: string
  type: 'full' | 'half'
  price: number
  status: '未取票' | '已取票' | '已登船' | '已取消'
  passengerName: string
  passengerId: string
  isEditing: boolean
}

const order = ref<SavedOrder | null>(null)
const tickets = ref<Ticket[]>([])
const orderNotFound = ref(false)

// 從訂單數據生成票券列表
const generateTickets = (orderData: SavedOrder): Ticket[] => {
  const ticketList: Ticket[] = []
  const fullTicketPrice = 250
  const halfTicketPrice = 125
  const ticketPassengers = orderData.ticketPassengers || []
  const ticketStatuses = orderData.ticketStatuses || []

  // 生成全票
  for (let i = 0; i < orderData.tickets.full; i++) {
    const ticketId = `${orderData.orderNumber}-F${i + 1}`
    const passengerInfo = ticketPassengers.find(p => p.ticketId === ticketId)
    const statusInfo = ticketStatuses.find(s => s.ticketId === ticketId)

    ticketList.push({
      id: ticketId,
      type: 'full',
      price: fullTicketPrice,
      status: statusInfo?.status || '未取票',
      passengerName: passengerInfo?.passengerName || '',
      passengerId: passengerInfo?.passengerId || '',
      isEditing: false
    })
  }

  // 生成半票
  for (let i = 0; i < orderData.tickets.half; i++) {
    const ticketId = `${orderData.orderNumber}-H${i + 1}`
    const passengerInfo = ticketPassengers.find(p => p.ticketId === ticketId)
    const statusInfo = ticketStatuses.find(s => s.ticketId === ticketId)

    ticketList.push({
      id: ticketId,
      type: 'half',
      price: halfTicketPrice,
      status: statusInfo?.status || '未取票',
      passengerName: passengerInfo?.passengerName || '',
      passengerId: passengerInfo?.passengerId || '',
      isEditing: false
    })
  }

  return ticketList
}

// 載入訂單詳細資訊
const loadOrderDetail = () => {
  const orderNumber = route.params.orderNumber as string
  const foundOrder = getOrderByNumber(orderNumber)

  if (foundOrder) {
    order.value = foundOrder
    tickets.value = generateTickets(foundOrder)
    generateQRCode(foundOrder)
  } else {
    orderNotFound.value = true
  }
}

// 生成 QR Code
const generateQRCode = async (orderData: SavedOrder) => {
  try {
    const qrData = JSON.stringify({
      orderNumber: orderData.orderNumber,
      distributor: orderData.distributor || orderData.orderOwnerName,
      bookerName: orderData.bookerName,
      outboundDate: orderData.outboundDate,
      outboundTime: orderData.outboundTime,
      tickets: {
        full: orderData.tickets.full,
        half: orderData.tickets.half
      },
      status: orderData.status
    })

    const dataUrl = await QRCode.toDataURL(qrData, {
      width: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    })

    qrCodeDataUrl.value = dataUrl
  } catch (error) {
    console.error('生成 QR Code 失敗:', error)
  }
}

// 計算統計數據
const ticketStats = computed(() => {
  const activeTickets = tickets.value.filter(t => t.status !== '已取消')
  const cancelledTickets = tickets.value.filter(t => t.status === '已取消')

  const activeFull = activeTickets.filter(t => t.type === 'full').length
  const activeHalf = activeTickets.filter(t => t.type === 'half').length
  const cancelledFull = cancelledTickets.filter(t => t.type === 'full').length
  const cancelledHalf = cancelledTickets.filter(t => t.type === 'half').length

  const activeTotal = activeTickets.reduce((sum, t) => sum + t.price, 0)
  const cancelledTotal = cancelledTickets.reduce((sum, t) => sum + t.price, 0)

  const ticketsWithPassenger = activeTickets.filter(t => t.passengerName && t.passengerId).length

  return {
    activeFull,
    activeHalf,
    cancelledFull,
    cancelledHalf,
    activeTotal,
    cancelledTotal,
    totalTickets: tickets.value.length,
    activeCount: activeTickets.length,
    cancelledCount: cancelledTickets.length,
    ticketsWithPassenger,
    ticketsWithoutPassenger: activeTickets.length - ticketsWithPassenger
  }
})

// 檢查是否有任何票券正在編輯
const hasEditingTicket = computed(() => {
  return tickets.value.some(t => t.isEditing)
})

// 開始編輯單張票券
const startEditTicket = (ticketId: string) => {
  const ticket = tickets.value.find(t => t.id === ticketId)
  if (ticket) {
    ticket.isEditing = true
  }
}

// 取消編輯單張票券
const cancelEditTicket = (ticketId: string) => {
  const ticket = tickets.value.find(t => t.id === ticketId)
  if (!ticket) return

  const orderNumber = route.params.orderNumber as string
  const foundOrder = getOrderByNumber(orderNumber)
  if (foundOrder && foundOrder.ticketPassengers) {
    const passengerInfo = foundOrder.ticketPassengers.find(p => p.ticketId === ticketId)
    if (passengerInfo) {
      ticket.passengerName = passengerInfo.passengerName
      ticket.passengerId = passengerInfo.passengerId
    } else {
      ticket.passengerName = ''
      ticket.passengerId = ''
    }
  }

  ticket.isEditing = false
}

// 保存單張票券編輯
const saveEditTicket = (ticketId: string) => {
  const ticket = tickets.value.find(t => t.id === ticketId)
  if (!ticket) return

  if (!ticket.passengerName.trim() || !ticket.passengerId.trim()) {
    alert('請填寫乘客姓名和身分證字號')
    return
  }

  const idPattern = /^[A-Z][12]\d{8}$/
  if (!idPattern.test(ticket.passengerId.toUpperCase())) {
    alert('身分證字號格式不正確')
    return
  }

  ticket.isEditing = false
  savePassengerInfoToLocalStorage()
  alert('乘客資訊已保存')
}

// 全部編輯
const editAllTickets = () => {
  const activeTickets = tickets.value.filter(t => t.status !== '已取消')
  activeTickets.forEach(ticket => {
    ticket.isEditing = true
  })
}

// 保存全部編輯
const saveAllTickets = () => {
  const editingTickets = tickets.value.filter(t => t.isEditing)

  for (const ticket of editingTickets) {
    if (!ticket.passengerName.trim() || !ticket.passengerId.trim()) {
      alert(`票券 ${ticket.id} 的乘客資訊未完整填寫`)
      return
    }

    const idPattern = /^[A-Z][12]\d{8}$/
    if (!idPattern.test(ticket.passengerId.toUpperCase())) {
      alert(`票券 ${ticket.id} 的身分證字號格式不正確`)
      return
    }
  }

  editingTickets.forEach(ticket => {
    ticket.isEditing = false
  })

  savePassengerInfoToLocalStorage()
  alert('所有乘客資訊已保存')
}

// 取消編輯狀態
const cancelAllEdits = () => {
  const confirmed = confirm('確定要取消編輯嗎？未保存的變更將會遺失。')
  if (!confirmed) return

  const orderNumber = route.params.orderNumber as string
  const foundOrder = getOrderByNumber(orderNumber)
  if (foundOrder) {
    tickets.value = generateTickets(foundOrder)
  }
}

// 取消全部票券
const cancelAllTickets = () => {
  const activeTickets = tickets.value.filter(t => t.status !== '已取消')

  if (activeTickets.length === 0) {
    alert('沒有有效的票券可以取消')
    return
  }

  const confirmed = confirm(`確定要取消所有 ${activeTickets.length} 張有效票券嗎？此操作無法復原。`)
  if (!confirmed) return

  activeTickets.forEach(ticket => {
    ticket.status = '已取消'
    ticket.isEditing = false
  })

  saveTicketStatusesToLocalStorage()
  updateOrderInLocalStorage()
  alert(`已取消 ${activeTickets.length} 張票券`)
}

// 保存票券狀態到 localStorage
const saveTicketStatusesToLocalStorage = () => {
  if (!order.value) return

  const ticketStatuses: TicketStatus[] = tickets.value.map(t => ({
    ticketId: t.id,
    status: t.status
  }))

  order.value.ticketStatuses = ticketStatuses
  updateOrder(order.value.orderNumber, order.value)
}

// 保存乘客資訊到 localStorage
const savePassengerInfoToLocalStorage = () => {
  if (!order.value) return

  const ticketPassengers: TicketPassenger[] = tickets.value
    .filter(t => t.passengerName || t.passengerId)
    .map(t => ({
      ticketId: t.id,
      passengerName: t.passengerName,
      passengerId: t.passengerId
    }))

  order.value.ticketPassengers = ticketPassengers
  updateOrder(order.value.orderNumber, order.value)
}

// 取消單張票券
const cancelTicket = (ticketId: string) => {
  const ticket = tickets.value.find(t => t.id === ticketId)
  if (!ticket) return

  const ticketType = ticket.type === 'full' ? '全票' : '半票'
  const confirmed = confirm(`確定要取消此 ${ticketType} 嗎？\n票券編號: ${ticketId}`)

  if (confirmed) {
    ticket.status = '已取消'
    ticket.isEditing = false
    saveTicketStatusesToLocalStorage()
    updateOrderInLocalStorage()
    alert(`${ticketType} 已取消`)
  }
}

// 更新 localStorage 中的訂單
const updateOrderInLocalStorage = () => {
  if (!order.value) return

  const activeTickets = tickets.value.filter(t => t.status !== '已取消')
  const activeFull = activeTickets.filter(t => t.type === 'full').length
  const activeHalf = activeTickets.filter(t => t.type === 'half').length

  order.value.tickets.full = activeFull
  order.value.tickets.half = activeHalf

  if (activeTickets.length === 0) {
    order.value.status = '已取消'
  }

  updateOrder(order.value.orderNumber, order.value)
}

// 返回訂單列表
const goBack = () => {
  if (hasEditingTicket.value) {
    const confirmed = confirm('有未保存的編輯內容，確定要離開嗎？')
    if (!confirmed) return
  }
  router.push('/order-search')
}

// 列印票券
const printTickets = () => {
  window.print()
}

// 取得狀態樣式
const getStatusClass = (status: string) => {
  const baseClasses = 'px-3 py-1 rounded-full text-xs font-medium'
  switch (status) {
    case '未取票':
      return `${baseClasses} bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400`
    case '已取票':
      return `${baseClasses} bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400`
    case '已登船':
      return `${baseClasses} bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400`
    case '已取消':
      return `${baseClasses} bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400`
    default:
      return `${baseClasses} bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300`
  }
}

// 取得票券類型標籤樣式
const getTicketTypeClass = (type: string) => {
  if (type === 'full') return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
  if (type === 'half') return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400'
  return ''
}

onMounted(() => {
  loadOrderDetail()
})
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
        <!-- 訂單未找到 -->
        <PageContainer
          v-if="orderNotFound"
          title="訂單未找到"
          subtitle="找不到指定的訂單"
          :icon="DocumentTextIcon"
          max-width="lg"
        >
          <BaseCard padding="lg" class="text-center">
            <DocumentTextIcon class="w-16 h-16 mx-auto mb-4 opacity-30" :class="theme === 'dark' ? 'text-neutral-500' : 'text-neutral-400'" />
            <h2 class="text-2xl font-bold mb-4" :class="theme === 'dark' ? 'text-white' : 'text-neutral-900'">
              訂單未找到
            </h2>
            <p class="mb-6" :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'">
              找不到指定的訂單，請確認訂單編號是否正確
            </p>
            <BaseButton
              variant="primary"
              :icon="ArrowLeftIcon"
              @click="goBack"
            >
              返回訂單列表
            </BaseButton>
          </BaseCard>
        </PageContainer>

        <!-- 訂單詳細 -->
        <PageContainer
          v-else-if="order"
          title="訂單詳細"
          :subtitle="`訂單編號：${order.orderNumber}`"
          :icon="DocumentTextIcon"
          max-width="2xl"
        >
          <template #actions>
            <BaseButton
              variant="ghost"
              :icon="ArrowLeftIcon"
              @click="goBack"
            >
              返回列表
            </BaseButton>
          </template>

          <!-- 訂單基本資訊 -->
          <BaseCard title="訂單資訊" padding="lg" class="mb-6">
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <label class="block text-sm font-medium mb-1" :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'">
                  訂單編號
                </label>
                <p class="text-lg font-semibold font-mono" :class="theme === 'dark' ? 'text-white' : 'text-neutral-900'">
                  {{ order.orderNumber }}
                </p>
              </div>

              <div>
                <label class="block text-sm font-medium mb-1" :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'">
                  訂單狀態
                </label>
                <span :class="getStatusClass(order.status)">
                  {{ order.status }}
                </span>
              </div>

              <div>
                <label class="block text-sm font-medium mb-1" :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'">
                  訂票單位
                </label>
                <p class="text-lg" :class="theme === 'dark' ? 'text-neutral-200' : 'text-neutral-800'">
                  {{ order.distributor || order.orderOwnerName }}
                </p>
              </div>

              <div>
                <label class="block text-sm font-medium mb-1" :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'">
                  訂票人姓名
                </label>
                <p class="text-lg" :class="theme === 'dark' ? 'text-neutral-200' : 'text-neutral-800'">
                  {{ order.bookerName }}
                </p>
              </div>

              <div>
                <label class="block text-sm font-medium mb-1" :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'">
                  訂票人電話
                </label>
                <p class="text-lg" :class="theme === 'dark' ? 'text-neutral-200' : 'text-neutral-800'">
                  {{ order.bookerPhone }}
                </p>
              </div>

              <div>
                <label class="block text-sm font-medium mb-1" :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'">
                  訂票時間
                </label>
                <p class="text-lg" :class="theme === 'dark' ? 'text-neutral-200' : 'text-neutral-800'">
                  {{ new Date(order.createdAt).toLocaleString('zh-TW') }}
                </p>
              </div>

              <div>
                <label class="block text-sm font-medium mb-1" :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'">
                  出發地
                </label>
                <p class="text-lg" :class="theme === 'dark' ? 'text-neutral-200' : 'text-neutral-800'">
                  {{ order.departure }}
                </p>
              </div>

              <div>
                <label class="block text-sm font-medium mb-1" :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'">
                  去程日期時間
                </label>
                <p class="text-lg" :class="theme === 'dark' ? 'text-neutral-200' : 'text-neutral-800'">
                  {{ order.outboundDate }} {{ order.outboundTime }}
                </p>
              </div>

              <div v-if="order.returnDate">
                <label class="block text-sm font-medium mb-1" :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'">
                  回程日期時間
                </label>
                <p class="text-lg" :class="theme === 'dark' ? 'text-neutral-200' : 'text-neutral-800'">
                  {{ order.returnDate }} {{ order.returnTime }}
                </p>
              </div>
            </div>
          </BaseCard>

          <!-- 票券列表 -->
          <BaseCard title="票券明細" padding="lg" class="mb-6">
            <template #actions>
              <div class="flex gap-3">
                <template v-if="!hasEditingTicket">
                  <BaseButton
                    variant="outline"
                    size="sm"
                    :icon="PencilIcon"
                    @click="editAllTickets"
                  >
                    編輯全部
                  </BaseButton>
                  <BaseButton
                    variant="danger"
                    size="sm"
                    :icon="TrashIcon"
                    @click="cancelAllTickets"
                  >
                    取消全部
                  </BaseButton>
                </template>
                <template v-else>
                  <BaseButton
                    variant="primary"
                    size="sm"
                    :icon="CheckIcon"
                    @click="saveAllTickets"
                  >
                    儲存
                  </BaseButton>
                  <BaseButton
                    variant="ghost"
                    size="sm"
                    :icon="XMarkIcon"
                    @click="cancelAllEdits"
                  >
                    取消編輯
                  </BaseButton>
                </template>
              </div>
            </template>

            <div class="overflow-x-auto">
              <table
                class="w-full"
                :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
              >
                <thead
                  class="text-sm font-medium border-b"
                  :class="theme === 'dark' ? 'border-secondary-800' : 'border-neutral-200'"
                >
                  <tr>
                    <th class="text-left py-4 px-6">票券編號</th>
                    <th class="text-left py-4 px-6">票種</th>
                    <th class="text-left py-4 px-6">票價</th>
                    <th class="text-left py-4 px-6">乘客姓名</th>
                    <th class="text-left py-4 px-6">身分證字號</th>
                    <th class="text-left py-4 px-6">狀態</th>
                    <th class="text-right py-4 px-6">操作</th>
                  </tr>
                </thead>
                <tbody
                  v-if="tickets.length > 0"
                  class="divide-y"
                  :class="theme === 'dark' ? 'divide-secondary-800' : 'divide-neutral-200'"
                >
                  <tr
                    v-for="ticket in tickets"
                    :key="ticket.id"
                    class="transition-colors"
                    :class="[
                      ticket.status === '已取消' ? 'opacity-50' : '',
                      ticket.isEditing
                        ? theme === 'dark' ? 'bg-primary-950/30' : 'bg-primary-50'
                        : theme === 'dark' ? 'hover:bg-secondary-800' : 'hover:bg-neutral-50'
                    ]"
                  >
                    <td class="py-4 px-6">
                      <span class="font-mono text-sm">{{ ticket.id }}</span>
                    </td>
                    <td class="py-4 px-6">
                      <span :class="['text-xs font-medium', getTicketTypeClass(ticket.type)]">
                        {{ ticket.type === 'full' ? '全票' : '半票' }}
                      </span>
                    </td>
                    <td class="py-4 px-6">
                      <span class="font-semibold">NT$ {{ ticket.price }}</span>
                    </td>
                    <td class="py-4 px-6">
                      <input
                        v-if="ticket.isEditing"
                        v-model="ticket.passengerName"
                        type="text"
                        placeholder="請輸入姓名"
                        class="w-full px-3 py-2 rounded-lg border transition-all outline-none"
                        :class="
                          theme === 'dark'
                            ? 'bg-secondary-800 border-primary-600 text-white focus:border-primary-500'
                            : 'bg-white border-primary-500 text-neutral-900 focus:border-primary-600'
                        "
                      >
                      <span v-else :class="[ticket.passengerName ? '' : 'text-neutral-400 italic']">
                        {{ ticket.passengerName || '未填寫' }}
                      </span>
                    </td>
                    <td class="py-4 px-6">
                      <input
                        v-if="ticket.isEditing"
                        v-model="ticket.passengerId"
                        type="text"
                        placeholder="A123456789"
                        maxlength="10"
                        class="w-full px-3 py-2 rounded-lg border transition-all outline-none font-mono"
                        :class="
                          theme === 'dark'
                            ? 'bg-secondary-800 border-primary-600 text-white focus:border-primary-500'
                            : 'bg-white border-primary-500 text-neutral-900 focus:border-primary-600'
                        "
                      >
                      <span v-else :class="[ticket.passengerId ? 'font-mono' : 'text-neutral-400 italic']">
                        {{ ticket.passengerId || '未填寫' }}
                      </span>
                    </td>
                    <td class="py-4 px-6">
                      <span :class="getStatusClass(ticket.status)">
                        {{ ticket.status }}
                      </span>
                    </td>
                    <td class="py-4 px-6 text-right">
                      <div class="flex justify-end gap-2">
                        <template v-if="ticket.status !== '已取消'">
                          <template v-if="ticket.isEditing">
                            <BaseButton
                              variant="primary"
                              size="sm"
                              @click="saveEditTicket(ticket.id)"
                            >
                              保存
                            </BaseButton>
                            <BaseButton
                              variant="ghost"
                              size="sm"
                              @click="cancelEditTicket(ticket.id)"
                            >
                              取消
                            </BaseButton>
                          </template>
                          <template v-else>
                            <BaseButton
                              variant="outline"
                              size="sm"
                              @click="startEditTicket(ticket.id)"
                            >
                              編輯
                            </BaseButton>
                            <BaseButton
                              variant="danger"
                              size="sm"
                              @click="cancelTicket(ticket.id)"
                            >
                              取消票
                            </BaseButton>
                          </template>
                        </template>
                        <span v-else class="text-sm" :class="theme === 'dark' ? 'text-neutral-500' : 'text-neutral-400'">
                          已取消
                        </span>
                      </div>
                    </td>
                  </tr>
                </tbody>
                <tbody v-else>
                  <tr>
                    <td colspan="7" class="py-12 text-center">
                      <div :class="theme === 'dark' ? 'text-neutral-500' : 'text-neutral-400'">
                        <DocumentTextIcon class="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p class="text-lg font-medium">沒有票券資料</p>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </BaseCard>

          <!-- 票券摘要與 QR Code -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- QR Code -->
            <BaseCard title="訂單 QR Code" padding="lg">
              <div class="flex justify-center">
                <div v-if="qrCodeDataUrl" class="text-center">
                  <div class="bg-white p-4 rounded-lg inline-block border-2" :class="theme === 'dark' ? 'border-secondary-700' : 'border-neutral-200'">
                    <img :src="qrCodeDataUrl" alt="訂單 QR Code" class="w-48 h-48">
                  </div>
                  <p class="text-xs mt-3" :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-500'">
                    掃描此 QR Code 查看訂單資訊
                  </p>
                </div>
                <div v-else class="w-48 h-48 flex items-center justify-center">
                  <QrCodeIcon class="w-16 h-16 opacity-30" :class="theme === 'dark' ? 'text-neutral-600' : 'text-neutral-300'" />
                </div>
              </div>
            </BaseCard>

            <!-- 票券統計 -->
            <BaseCard title="有效票券" padding="lg">
              <template #actions>
                <BaseButton
                  variant="outline"
                  size="sm"
                  :icon="PrinterIcon"
                  @click="printTickets"
                >
                  列印
                </BaseButton>
              </template>

              <div class="space-y-4">
                <div class="flex justify-between">
                  <span :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'">
                    全票 x {{ ticketStats.activeFull }}
                  </span>
                  <span class="font-semibold" :class="theme === 'dark' ? 'text-neutral-200' : 'text-neutral-800'">
                    NT$ {{ ticketStats.activeFull * 250 }}
                  </span>
                </div>
                <div class="flex justify-between">
                  <span :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'">
                    半票 x {{ ticketStats.activeHalf }}
                  </span>
                  <span class="font-semibold" :class="theme === 'dark' ? 'text-neutral-200' : 'text-neutral-800'">
                    NT$ {{ ticketStats.activeHalf * 125 }}
                  </span>
                </div>
                <div class="flex justify-between">
                  <span :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'">
                    已填寫資訊 / 總票數
                  </span>
                  <span class="font-semibold" :class="theme === 'dark' ? 'text-neutral-200' : 'text-neutral-800'">
                    {{ ticketStats.ticketsWithPassenger }} / {{ ticketStats.activeCount }}
                  </span>
                </div>
                <div class="flex justify-between pt-4 mt-4 border-t" :class="theme === 'dark' ? 'border-secondary-800' : 'border-neutral-200'">
                  <span class="font-semibold text-lg" :class="theme === 'dark' ? 'text-neutral-200' : 'text-neutral-700'">
                    小計
                  </span>
                  <span class="font-bold text-xl text-green-500">
                    NT$ {{ ticketStats.activeTotal }}
                  </span>
                </div>
              </div>
            </BaseCard>
          </div>
        </PageContainer>
      </main>
    </div>
  </div>
</template>
