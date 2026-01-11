<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import QRCode from 'qrcode'
import Navbar from '../components/Navbar.vue'
import Sidebar from '../components/Sidebar.vue'
import { useSidebar } from '../composables/useSidebar'
import { useOrders } from '../composables/useOrders'

const { isCollapsed } = useSidebar()
const route = useRoute()
const router = useRouter()
const qrCodeDataUrl = ref<string>('')
const { getOrderByNumber, updateOrder, deleteOrder } = useOrders()

interface TicketPassenger {
  ticketId: string
  passengerName: string
  passengerId: string
}

interface TicketStatus {
  ticketId: string
  status: '未取票' | '已取票' | '已登船' | '已取消'
}

interface SavedOrder {
  orderNumber: string
  departure: string
  bookingType: string
  distributor: string
  bookerName: string
  bookerPhone: string
  outboundDate: string
  outboundTime: string
  returnDate: string
  returnTime: string
  tickets: {
    full: number
    half: number
  }
  pricing: {
    originalTotal: number
    discountedTotal: number
  }
  status: string
  createdAt: string
  ticketPassengers?: TicketPassenger[]
  ticketStatuses?: TicketStatus[]
}

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
  const fullTicketPrice = 250 // 全票價格
  const halfTicketPrice = 125 // 半票價格
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
      distributor: orderData.distributor,
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

  // 統計已填寫乘客資訊的票券
  const ticketsWithPassenger = activeTickets.filter(t => t.passengerName && t.passengerId).length

  // 統計各狀態的票券數量（區分全票和半票）
  const notPickedTickets = tickets.value.filter(t => t.status === '未取票')
  const pickedTickets = tickets.value.filter(t => t.status === '已取票')
  const boardedTickets = tickets.value.filter(t => t.status === '已登船')

  const statusCounts = {
    notPicked: {
      total: notPickedTickets.length,
      full: notPickedTickets.filter(t => t.type === 'full').length,
      half: notPickedTickets.filter(t => t.type === 'half').length
    },
    picked: {
      total: pickedTickets.length,
      full: pickedTickets.filter(t => t.type === 'full').length,
      half: pickedTickets.filter(t => t.type === 'half').length
    },
    boarded: {
      total: boardedTickets.length,
      full: boardedTickets.filter(t => t.type === 'full').length,
      half: boardedTickets.filter(t => t.type === 'half').length
    },
    cancelled: {
      total: cancelledTickets.length,
      full: cancelledFull,
      half: cancelledHalf
    }
  }

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
    ticketsWithoutPassenger: activeTickets.length - ticketsWithPassenger,
    statusCounts
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

  // 恢復原始資料
  const orderNumber = route.params.orderNumber as string
  const ordersStr = localStorage.getItem('orders')
  if (!ordersStr) return

  try {
    const orders: SavedOrder[] = JSON.parse(ordersStr)
    const foundOrder = orders.find(o => o.orderNumber === orderNumber)
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
  } catch (error) {
    console.error('恢復資料失敗:', error)
  }

  ticket.isEditing = false
}

// 保存單張票券編輯
const saveEditTicket = (ticketId: string) => {
  const ticket = tickets.value.find(t => t.id === ticketId)
  if (!ticket) return

  // 驗證資料
  if (!ticket.passengerName.trim() || !ticket.passengerId.trim()) {
    alert('請填寫乘客姓名和身分證字號')
    return
  }

  // 簡單的身分證字號格式驗證
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

  // 驗證所有編輯中的票券
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

  // 全部保存
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
  const ordersStr = localStorage.getItem('orders')
  if (!ordersStr) return

  try {
    const orders: SavedOrder[] = JSON.parse(ordersStr)
    const foundOrder = orders.find(o => o.orderNumber === orderNumber)
    if (foundOrder) {
      tickets.value = generateTickets(foundOrder)
    }
  } catch (error) {
    console.error('恢復資料失敗:', error)
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

  // 更新訂單的票券數量
  order.value.tickets.full = activeFull
  order.value.tickets.half = activeHalf

  // 如果所有票券都被取消,更新訂單狀態
  if (activeTickets.length === 0) {
    order.value.status = '已取消'
  }

  // 更新訂單
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
  if (status === '未取票') return 'bg-blue-100 text-blue-800'
  if (status === '已取票') return 'bg-orange-100 text-orange-800'
  if (status === '已登船') return 'bg-green-100 text-green-800'
  if (status === '已取消') return 'bg-red-100 text-red-800'
  return ''
}

// 取得票券類型標籤樣式
const getTicketTypeClass = (type: string) => {
  if (type === 'full') return 'bg-purple-100 text-purple-800'
  if (type === 'half') return 'bg-cyan-100 text-cyan-800'
  return ''
}

onMounted(() => {
  loadOrderDetail()
})
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <Navbar />
    <Sidebar active-route="order-search" />

    <!-- 主要內容區 -->
    <main :class="['p-8 min-h-[calc(100vh-4rem)] transition-all duration-300', isCollapsed ? 'ml-20' : 'ml-64']">
      <!-- 麵包屑 -->
      <div class="flex items-center gap-2 text-gray-600 text-sm mb-6">
        <a href="#" class="text-blue-600 hover:underline">首頁</a>
        <span>→</span>
        <a href="#" class="text-blue-600 hover:underline">訂位作業</a>
        <span>→</span>
        <a href="#" @click.prevent="goBack" class="text-blue-600 hover:underline">訂單查詢</a>
        <span>→</span>
        <span>訂單詳細</span>
      </div>

      <!-- 訂單未找到 -->
      <div v-if="orderNotFound" class="bg-white rounded-xl p-8 shadow-md text-center">
        <div class="text-6xl mb-4">😕</div>
        <h2 class="text-2xl font-bold text-gray-800 mb-4">訂單未找到</h2>
        <p class="text-gray-600 mb-6">找不到指定的訂單,請確認訂單編號是否正確</p>
        <button
          @click="goBack"
          type="button"
          class="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all"
        >
          返回訂單列表
        </button>
      </div>

      <!-- 訂單詳細 -->
      <div v-else-if="order">
        <!-- 頁面標題 -->
        <div class="flex items-center justify-between mb-6">
          <h1 class="text-3xl font-bold text-gray-800">訂單詳細</h1>
          <button
            @click="goBack"
            type="button"
            class="flex items-center gap-2 px-5 py-2.5 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition-all"
          >
            <span>←</span>
            <span>返回列表</span>
          </button>
        </div>

        <!-- 訂單基本資訊 -->
        <div class="bg-white rounded-xl p-8 shadow-md mb-6">
          <h2 class="text-xl font-semibold text-gray-800 mb-6 pb-4 border-b-2 border-gray-100">訂單資訊</h2>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label class="block text-sm font-medium text-gray-600 mb-1">訂單編號</label>
              <p class="text-lg font-semibold text-gray-800">{{ order.orderNumber }}</p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-600 mb-1">訂單狀態</label>
              <span :class="['inline-block px-3 py-1 rounded-full text-sm font-semibold', getStatusClass(order.status)]">
                {{ order.status }}
              </span>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-600 mb-1">訂票單位</label>
              <p class="text-lg text-gray-800">{{ order.distributor }}</p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-600 mb-1">訂票人姓名</label>
              <p class="text-lg text-gray-800">{{ order.bookerName }}</p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-600 mb-1">訂票人電話</label>
              <p class="text-lg text-gray-800">{{ order.bookerPhone }}</p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-600 mb-1">訂票時間</label>
              <p class="text-lg text-gray-800">{{ new Date(order.createdAt).toLocaleString('zh-TW') }}</p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-600 mb-1">出發地</label>
              <p class="text-lg text-gray-800">{{ order.departure }}</p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-600 mb-1">去程日期時間</label>
              <p class="text-lg text-gray-800">{{ order.outboundDate }} {{ order.outboundTime }}</p>
            </div>

            <div v-if="order.returnDate">
              <label class="block text-sm font-medium text-gray-600 mb-1">回程日期時間</label>
              <p class="text-lg text-gray-800">{{ order.returnDate }} {{ order.returnTime }}</p>
            </div>
          </div>
        </div>

        <!-- 票券列表 -->
        <div class="bg-white rounded-xl p-8 shadow-md">
          <div class="flex items-center justify-between mb-6 pb-4 border-b-2 border-gray-100">
            <h2 class="text-xl font-semibold text-gray-800">票券明細</h2>
            <div class="flex gap-3">
              <template v-if="!hasEditingTicket">
                <button
                  @click="editAllTickets"
                  type="button"
                  class="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all"
                >
                  <span>✏️</span>
                  <span>編輯全部</span>
                </button>
                <button
                  @click="cancelAllTickets"
                  type="button"
                  class="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-all"
                >
                  <span>🗑️</span>
                  <span>取消全部</span>
                </button>
              </template>
              <template v-else>
                <button
                  @click="saveAllTickets"
                  type="button"
                  class="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all"
                >
                  <span>💾</span>
                  <span>儲存</span>
                </button>
                <button
                  @click="cancelAllEdits"
                  type="button"
                  class="flex items-center gap-2 px-5 py-2.5 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition-all"
                >
                  <span>✖️</span>
                  <span>取消編輯</span>
                </button>
              </template>
            </div>
          </div>

          <div class="overflow-x-auto rounded-lg border-2 border-gray-200">
            <table class="w-full border-collapse bg-white">
              <thead class="bg-gray-50">
                <tr>
                  <th class="p-4 text-left font-semibold text-gray-700 text-sm border-b-2 border-gray-200 whitespace-nowrap">票券編號</th>
                  <th class="p-4 text-left font-semibold text-gray-700 text-sm border-b-2 border-gray-200 whitespace-nowrap">票種</th>
                  <th class="p-4 text-left font-semibold text-gray-700 text-sm border-b-2 border-gray-200 whitespace-nowrap">票價</th>
                  <th class="p-4 text-left font-semibold text-gray-700 text-sm border-b-2 border-gray-200 whitespace-nowrap">乘客姓名</th>
                  <th class="p-4 text-left font-semibold text-gray-700 text-sm border-b-2 border-gray-200 whitespace-nowrap">身分證字號</th>
                  <th class="p-4 text-left font-semibold text-gray-700 text-sm border-b-2 border-gray-200 whitespace-nowrap">狀態</th>
                  <th class="p-4 text-left font-semibold text-gray-700 text-sm border-b-2 border-gray-200 whitespace-nowrap">操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="tickets.length === 0">
                  <td colspan="7" class="py-16 text-center text-gray-500">
                    <div class="text-6xl opacity-30 mb-4">🎫</div>
                    <div class="text-lg mb-2 font-medium">沒有票券資料</div>
                  </td>
                </tr>
                <tr
                  v-for="ticket in tickets"
                  :key="ticket.id"
                  :class="['hover:bg-gray-50', ticket.status === '已取消' ? 'opacity-50' : '', ticket.isEditing ? 'bg-blue-50' : '']"
                >
                  <td class="p-4 text-gray-700 text-sm border-b border-gray-100">
                    <span class="font-mono">{{ ticket.id }}</span>
                  </td>
                  <td class="p-4 text-sm border-b border-gray-100">
                    <span :class="['inline-block px-3 py-1 rounded-full text-xs font-semibold', getTicketTypeClass(ticket.type)]">
                      {{ ticket.type === 'full' ? '全票' : '半票' }}
                    </span>
                  </td>
                  <td class="p-4 text-gray-700 text-sm border-b border-gray-100">
                    <span class="font-semibold">NT$ {{ ticket.price }}</span>
                  </td>
                  <td class="p-4 text-sm border-b border-gray-100">
                    <input
                      v-if="ticket.isEditing"
                      v-model="ticket.passengerName"
                      type="text"
                      placeholder="請輸入姓名"
                      class="w-full p-2 border-2 border-blue-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                    >
                    <span v-else :class="[ticket.passengerName ? 'text-gray-800' : 'text-gray-400 italic']">
                      {{ ticket.passengerName || '未填寫' }}
                    </span>
                  </td>
                  <td class="p-4 text-sm border-b border-gray-100">
                    <input
                      v-if="ticket.isEditing"
                      v-model="ticket.passengerId"
                      type="text"
                      placeholder="A123456789"
                      maxlength="10"
                      class="w-full p-2 border-2 border-blue-300 rounded-lg text-sm font-mono focus:outline-none focus:border-blue-500"
                    >
                    <span v-else :class="[ticket.passengerId ? 'text-gray-800 font-mono' : 'text-gray-400 italic']">
                      {{ ticket.passengerId || '未填寫' }}
                    </span>
                  </td>
                  <td class="p-4 text-sm border-b border-gray-100">
                    <span :class="['inline-block px-3 py-1 rounded-full text-xs font-semibold', getStatusClass(ticket.status)]">
                      {{ ticket.status }}
                    </span>
                  </td>
                  <td class="p-4 text-sm border-b border-gray-100">
                    <div class="flex gap-2">
                      <template v-if="ticket.status !== '已取消'">
                        <template v-if="ticket.isEditing">
                          <button
                            @click="saveEditTicket(ticket.id)"
                            type="button"
                            class="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700 transition-all"
                          >
                            保存
                          </button>
                          <button
                            @click="cancelEditTicket(ticket.id)"
                            type="button"
                            class="px-3 py-1.5 bg-gray-600 text-white rounded-lg text-xs font-semibold hover:bg-gray-700 transition-all"
                          >
                            取消
                          </button>
                        </template>
                        <template v-else>
                          <button
                            @click="startEditTicket(ticket.id)"
                            type="button"
                            class="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-all"
                          >
                            編輯
                          </button>
                          <button
                            @click="cancelTicket(ticket.id)"
                            type="button"
                            class="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition-all"
                          >
                            取消票
                          </button>
                        </template>
                      </template>
                      <span v-else class="text-gray-400 text-xs">已取消</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- 票券摘要 -->
          <div class="mt-6 p-6 bg-gray-50 rounded-lg">
            <div class="flex justify-end gap-6">
              <!-- QR Code 區域 -->
              <div class="flex justify-center">
                <div class="bg-white p-4 rounded-lg shadow-sm border-2 border-gray-200 inline-block">
                  <div v-if="qrCodeDataUrl" class="text-center">
                    <img :src="qrCodeDataUrl" alt="訂單 QR Code" class="w-48 h-48">
                    <p class="text-xs text-gray-500 mt-2">訂單 QR Code</p>
                  </div>
                  <div v-else class="w-48 h-48 flex items-center justify-center text-gray-400">
                    <span class="text-4xl">⏳</span>
                  </div>
                </div>
              </div>

              <!-- 有效票券 -->
              <div class="w-80">
                <div class="bg-white p-5 rounded-lg shadow-sm border-2 border-gray-200 h-full">
                  <div class="flex items-center justify-between mb-4 pb-2 border-b-2 border-gray-100">
                    <h3 class="font-semibold text-gray-700">有效票券</h3>
                    <button
                      @click="printTickets"
                      type="button"
                      class="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-all"
                    >
                      <span>🖨️</span>
                      <span>列印</span>
                    </button>
                  </div>
                  <div class="space-y-3">
                    <div class="flex justify-between text-sm">
                      <span class="text-gray-600">全票 x {{ ticketStats.activeFull }}</span>
                      <span class="font-semibold text-gray-800">NT$ {{ ticketStats.activeFull * 250 }}</span>
                    </div>
                    <div class="flex justify-between text-sm">
                      <span class="text-gray-600">半票 x {{ ticketStats.activeHalf }}</span>
                      <span class="font-semibold text-gray-800">NT$ {{ ticketStats.activeHalf * 125 }}</span>
                    </div>
                    <div class="flex justify-between text-sm">
                      <span class="text-gray-600">已填寫資訊 / 總票數</span>
                      <span class="font-semibold text-gray-800">{{ ticketStats.ticketsWithPassenger }} / {{ ticketStats.activeCount }}</span>
                    </div>
                    <div class="flex justify-between text-base pt-3 mt-3 border-t-2 border-gray-200">
                      <span class="font-semibold text-gray-700">小計</span>
                      <span class="font-bold text-green-600">NT$ {{ ticketStats.activeTotal }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
