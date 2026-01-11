/**
 * localStorage 統一管理工具
 * 提供類型安全的 localStorage 操作和自動序列化/反序列化
 */

// localStorage keys 常數
export const STORAGE_KEYS = {
  ORDERS: 'orders',
  RBAC_ROLES: 'rbac_roles',
  RBAC_PERMISSION_GROUPS: 'rbac_permission_groups',
  RBAC_ORGANIZATIONS: 'rbac_organizations',
  RBAC_ACCOUNTS: 'rbac_accounts',
  TICKET_TYPES: 'ticket_types'
} as const

/**
 * 從 localStorage 讀取資料
 * @param key - storage key
 * @param defaultValue - 當資料不存在時返回的預設值
 * @returns 解析後的資料或預設值
 */
export function getFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key)
    if (item === null) {
      return defaultValue
    }
    return JSON.parse(item) as T
  } catch (error) {
    console.error(`Error reading from localStorage (key: ${key}):`, error)
    return defaultValue
  }
}

/**
 * 儲存資料到 localStorage
 * @param key - storage key
 * @param value - 要儲存的資料
 * @returns 是否成功儲存
 */
export function saveToStorage<T>(key: string, value: T): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch (error) {
    console.error(`Error saving to localStorage (key: ${key}):`, error)
    return false
  }
}

/**
 * 從 localStorage 刪除資料
 * @param key - storage key
 * @returns 是否成功刪除
 */
export function removeFromStorage(key: string): boolean {
  try {
    localStorage.removeItem(key)
    return true
  } catch (error) {
    console.error(`Error removing from localStorage (key: ${key}):`, error)
    return false
  }
}

/**
 * 清空所有 localStorage 資料
 * @returns 是否成功清空
 */
export function clearStorage(): boolean {
  try {
    localStorage.clear()
    return true
  } catch (error) {
    console.error('Error clearing localStorage:', error)
    return false
  }
}

/**
 * 檢查 localStorage 中是否存在某個 key
 * @param key - storage key
 * @returns 是否存在
 */
export function hasStorageKey(key: string): boolean {
  return localStorage.getItem(key) !== null
}

/**
 * 取得 localStorage 的使用量（以 KB 為單位）
 * @returns 使用量（KB）
 */
export function getStorageSize(): number {
  try {
    let total = 0
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += localStorage[key].length + key.length
      }
    }
    return Math.round((total / 1024) * 100) / 100 // 保留兩位小數
  } catch (error) {
    console.error('Error calculating localStorage size:', error)
    return 0
  }
}
