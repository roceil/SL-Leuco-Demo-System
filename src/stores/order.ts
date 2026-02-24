import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  Order,
  PaymentInfo,
  InvoiceInfo,
  PassengerInfo,
  PaymentRecord
} from '@/types/order'
import { apiGet, apiPut } from '@/composables/useLocalStorage'
import { usePayment } from '@/composables/usePayment'

export const useOrderStore = defineStore('order', () => {
  const { initializePaymentInfo, addPaymentRecord } = usePayment()

  const isLoading = ref(false)
  const orders = ref<Order[]>([])
  const selectedOrderId = ref<string | null>(null)

  async function init() {
    isLoading.value = true
    try {
      orders.value = await apiGet<Order[]>('orders')
    } finally {
      isLoading.value = false
    }
  }

  // Getters
  const selectedOrder = computed(() => {
    if (!selectedOrderId.value) return null
    return orders.value.find((o) => o.id === selectedOrderId.value) || null
  })

  const pendingOrders = computed(() =>
    orders.value.filter((o) => o.status === 'pending')
  )

  const confirmedOrders = computed(() =>
    orders.value.filter((o) => o.status === 'confirmed')
  )

  const completedOrders = computed(() =>
    orders.value.filter((o) => o.status === 'completed')
  )

  const unpaidOrders = computed(() =>
    orders.value.filter((o) => o.paymentInfo.paymentStatus === 'unpaid')
  )

  const partialPaidOrders = computed(() =>
    orders.value.filter((o) => o.paymentInfo.paymentStatus === 'partial')
  )

  const paidOrders = computed(() =>
    orders.value.filter((o) => o.paymentInfo.paymentStatus === 'paid')
  )

  function getOrderByNumber(orderNumber: string): Order | undefined {
    return orders.value.find((o) => o.orderNumber === orderNumber)
  }

  function getOrdersBySchedule(scheduleId: string): Order[] {
    return orders.value.filter((o) => o.scheduleId === scheduleId)
  }

  // Actions - Order
  function selectOrder(orderId: string | null) {
    selectedOrderId.value = orderId
  }

  function createOrder(
    order: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt'>,
    createdBy: string
  ): Order {
    const orderNumber = generateOrderNumber()
    const newOrder: Order = {
      ...order,
      id: `order-${Date.now()}`,
      orderNumber,
      paymentInfo: order.paymentInfo || initializePaymentInfo(),
      createdAt: new Date().toISOString(),
      createdBy,
      updatedAt: new Date().toISOString()
    }
    orders.value.push(newOrder)
    apiPut('orders', orders.value)
    return newOrder
  }

  function updateOrder(
    orderId: string,
    updates: Partial<Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'createdBy'>>,
    updatedBy: string
  ) {
    const index = orders.value.findIndex((o) => o.id === orderId)
    if (index !== -1) {
      orders.value[index] = {
        ...orders.value[index],
        ...updates,
        updatedAt: new Date().toISOString(),
        updatedBy
      } as Order
      apiPut('orders', orders.value)
    }
  }

  function deleteOrder(orderId: string) {
    const index = orders.value.findIndex((o) => o.id === orderId)
    if (index !== -1) {
      orders.value.splice(index, 1)
      if (selectedOrderId.value === orderId) selectedOrderId.value = null
      apiPut('orders', orders.value)
    }
  }

  // Actions - Payment
  function addPayment(
    orderId: string,
    record: PaymentRecord
  ): boolean {
    const order = orders.value.find((o) => o.id === orderId)
    if (!order) return false

    const updatedPaymentInfo = addPaymentRecord(order.paymentInfo, record)
    updateOrder(orderId, { paymentInfo: updatedPaymentInfo }, record.paidBy)
    return true
  }

  function updatePaymentInfo(
    orderId: string,
    paymentInfo: PaymentInfo,
    updatedBy: string
  ) {
    updateOrder(orderId, { paymentInfo }, updatedBy)
  }

  // Actions - Invoice
  function updateInvoiceInfo(
    orderId: string,
    invoiceInfo: InvoiceInfo,
    updatedBy: string
  ) {
    const now = new Date().toISOString()
    const updatedInvoice: InvoiceInfo = {
      ...invoiceInfo,
      editedBy: updatedBy,
      editedAt: now
    }
    updateOrder(orderId, { invoiceInfo: updatedInvoice }, updatedBy)
  }

  // Actions - Passengers
  function addPassenger(
    orderId: string,
    passenger: Omit<PassengerInfo, 'id'>,
    updatedBy: string
  ) {
    const order = orders.value.find((o) => o.id === orderId)
    if (!order) return

    const newPassenger: PassengerInfo = {
      ...passenger,
      id: `passenger-${Date.now()}`
    }

    updateOrder(
      orderId,
      { passengers: [...order.passengers, newPassenger] },
      updatedBy
    )
  }

  function updatePassenger(
    orderId: string,
    passengerId: string,
    updates: Partial<PassengerInfo>,
    updatedBy: string
  ) {
    const order = orders.value.find((o) => o.id === orderId)
    if (!order) return

    const passengers = order.passengers.map((p) =>
      p.id === passengerId ? { ...p, ...updates } : p
    )

    updateOrder(orderId, { passengers }, updatedBy)
  }

  function removePassenger(
    orderId: string,
    passengerId: string,
    updatedBy: string
  ) {
    const order = orders.value.find((o) => o.id === orderId)
    if (!order) return

    const passengers = order.passengers.filter((p) => p.id !== passengerId)
    updateOrder(orderId, { passengers }, updatedBy)
  }

  // Actions - Ticket Issuance
  function issueTicket(
    orderId: string,
    issuedBy: string
  ): { success: boolean; error?: string } {
    const order = orders.value.find((o) => o.id === orderId)
    if (!order) {
      return { success: false, error: '訂單不存在' }
    }

    if (order.paymentInfo.paidAmount < order.paymentInfo.deposit) {
      return { success: false, error: '訂金尚未完全支付' }
    }

    if (order.passengers.length === 0) {
      return { success: false, error: '尚未新增乘客資訊' }
    }

    for (const passenger of order.passengers) {
      if (!passenger.name) {
        return { success: false, error: '乘客姓名未完整填寫' }
      }
      if (!passenger.ticketTypeId) {
        return { success: false, error: '乘客票種未選擇' }
      }
    }

    updateOrder(
      orderId,
      {
        ticketIssuedBy: issuedBy,
        ticketIssuedAt: new Date().toISOString(),
        status: 'confirmed'
      },
      issuedBy
    )

    return { success: true }
  }

  // Actions - Status
  function updateOrderStatus(
    orderId: string,
    status: Order['status'],
    updatedBy: string
  ) {
    updateOrder(orderId, { status }, updatedBy)
  }

  function generateOrderNumber(): string {
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0')
    return `${year}${month}${day}-${random}`
  }

  return {
    // State
    isLoading,
    orders,
    selectedOrderId,

    // Getters
    selectedOrder,
    pendingOrders,
    confirmedOrders,
    completedOrders,
    unpaidOrders,
    partialPaidOrders,
    paidOrders,

    // Helper functions
    getOrderByNumber,
    getOrdersBySchedule,

    // Actions
    init,
    selectOrder,
    createOrder,
    updateOrder,
    deleteOrder,

    // Actions - Payment
    addPayment,
    updatePaymentInfo,

    // Actions - Invoice
    updateInvoiceInfo,

    // Actions - Passengers
    addPassenger,
    updatePassenger,
    removePassenger,

    // Actions - Ticket
    issueTicket,

    // Actions - Status
    updateOrderStatus
  }
})
