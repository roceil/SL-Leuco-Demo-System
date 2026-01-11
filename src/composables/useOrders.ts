/**
 * 訂單管理 Composable
 * 統一管理訂單的 CRUD 操作
 */

import { ref, computed } from 'vue'
import type { SavedOrder } from '@/constants/mockOrders'
import { getFromStorage, saveToStorage, STORAGE_KEYS } from './useLocalStorage'
import { mockOrders } from '@/constants/mockOrders'

// 訂單資料
const orders = ref<SavedOrder[]>([])

// 是否已初始化
let initialized = false

/**
 * 初始化訂單資料
 * 從 localStorage 讀取，如果沒有則使用 mock 資料
 */
export function initializeOrders() {
  if (initialized) return

  const storedOrders = getFromStorage<SavedOrder[]>(STORAGE_KEYS.ORDERS, [])

  // 如果 localStorage 中沒有資料，使用 mock 資料並儲存
  if (storedOrders.length === 0) {
    orders.value = [...mockOrders]
    saveToStorage(STORAGE_KEYS.ORDERS, orders.value)
  } else {
    orders.value = storedOrders
  }

  initialized = true
}

/**
 * 訂單管理 Composable
 */
export function useOrders() {
  // 確保資料已初始化
  if (!initialized) {
    initializeOrders()
  }

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
  /**
   * 新增訂單
   */
  const addOrder = (order: SavedOrder) => {
    orders.value.push(order)
    saveToStorage(STORAGE_KEYS.ORDERS, orders.value)
    return order
  }

  /**
   * 更新訂單
   */
  const updateOrder = (orderNumber: string, updates: Partial<SavedOrder>): SavedOrder | null => {
    const index = orders.value.findIndex(order => order.orderNumber === orderNumber)
    if (index !== -1) {
      orders.value[index] = {
        ...orders.value[index],
        ...updates
      } as SavedOrder
      saveToStorage(STORAGE_KEYS.ORDERS, orders.value)
      return orders.value[index]
    }
    return null
  }

  /**
   * 刪除訂單
   */
  const deleteOrder = (orderNumber: string) => {
    const index = orders.value.findIndex(order => order.orderNumber === orderNumber)
    if (index !== -1) {
      const deletedOrder = orders.value.splice(index, 1)[0]
      saveToStorage(STORAGE_KEYS.ORDERS, orders.value)
      return deletedOrder
    }
    return null
  }

  /**
   * 重設為 mock 資料
   */
  const resetToMockData = () => {
    orders.value = [...mockOrders]
    saveToStorage(STORAGE_KEYS.ORDERS, orders.value)
  }

  /**
   * 清空所有訂單
   */
  const clearAllOrders = () => {
    orders.value = []
    saveToStorage(STORAGE_KEYS.ORDERS, orders.value)
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
    resetToMockData,
    clearAllOrders
  }
}
