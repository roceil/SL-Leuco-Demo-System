/**
 * 訂單管理 Composable
 * 統一管理訂單的 CRUD 操作
 */

import { ref, computed } from 'vue'
import type { SavedOrder } from '@/constants/mockOrders'
import { apiGet, apiPut } from './useLocalStorage'

// 訂單資料（模組級別，單例）
const orders = ref<SavedOrder[]>([])

/**
 * 從 /api/orders 初始化訂單資料
 */
export async function initOrders(): Promise<void> {
  const data = await apiGet<SavedOrder[]>('orders')
  orders.value = data
}

/**
 * 訂單管理 Composable
 */
export function useOrders() {
  // Getters
  const allOrders = computed(() => orders.value)

  const getOrderByNumber = (orderNumber: string) => {
    return orders.value.find(order => order.orderNumber === orderNumber)
  }

  const getOrdersByDateRange = (startDate: string, endDate: string) => {
    return orders.value.filter(order => {
      const orderDate = order.outboundDate
      return orderDate >= startDate && orderDate <= endDate
    })
  }

  const getOrdersByDistributor = (distributorName: string) => {
    return orders.value.filter(order => order.distributor === distributorName)
  }

  const getOrdersByStatus = (status: string) => {
    return orders.value.filter(order => order.status === status)
  }

  // Actions
  const addOrder = (order: SavedOrder) => {
    orders.value.push(order)
    apiPut('orders', orders.value)
    return order
  }

  const updateOrder = (orderNumber: string, updates: Partial<SavedOrder>): SavedOrder | null => {
    const index = orders.value.findIndex(order => order.orderNumber === orderNumber)
    if (index !== -1) {
      orders.value[index] = {
        ...orders.value[index],
        ...updates
      } as SavedOrder
      apiPut('orders', orders.value)
      return orders.value[index]
    }
    return null
  }

  const deleteOrder = (orderNumber: string) => {
    const index = orders.value.findIndex(order => order.orderNumber === orderNumber)
    if (index !== -1) {
      const deletedOrder = orders.value.splice(index, 1)[0]
      apiPut('orders', orders.value)
      return deletedOrder
    }
    return null
  }

  const clearAllOrders = () => {
    orders.value = []
    apiPut('orders', orders.value)
  }

  return {
    // Getters
    allOrders,
    getOrderByNumber,
    getOrdersByDateRange,
    getOrdersByDistributor,
    getOrdersByStatus,

    // Actions
    addOrder,
    updateOrder,
    deleteOrder,
    clearAllOrders
  }
}
