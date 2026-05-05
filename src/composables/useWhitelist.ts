import { ref, computed } from 'vue'
import type { WhitelistEntry } from '@/types/whitelist'
import { apiGet, apiPut } from './useLocalStorage'
import { useAuditLog } from './useAuditLog'

// 模組級別共享狀態
const whitelistData = ref<WhitelistEntry[]>([])
const loading = ref(false)

/** 從 /api/whitelist 初始化白名單 */
export async function initWhitelist(): Promise<void> {
  const data = await apiGet<WhitelistEntry[]>('whitelist')
  whitelistData.value = data
}

export function useWhitelist() {
  const { logCrud, generateChanges } = useAuditLog()

  // 根據票種 ID 獲取白名單
  const getWhitelistByTicketType = (ticketTypeId: string) => {
    return computed(() => whitelistData.value.filter((entry) => entry.ticketTypeId === ticketTypeId))
  }

  // 獲取特定白名單項目
  const getWhitelistById = (id: string) => {
    return whitelistData.value.find((entry) => entry.id === id)
  }

  // 新增白名單
  const addWhitelistEntry = async (entry: Omit<WhitelistEntry, 'id' | 'createdAt' | 'updatedAt'>) => {
    loading.value = true
    try {
      const newEntry: WhitelistEntry = {
        ...entry,
        id: `wl-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      whitelistData.value.push(newEntry)
      apiPut('whitelist', whitelistData.value)

      void logCrud({
        entityType: 'whitelist',
        entityId: newEntry.id,
        entityName: newEntry.passengerName,
        action: 'create'
      })
      return { success: true, data: newEntry }
    } catch (error) {
      console.error('新增白名單失敗:', error)
      return { success: false, error: '新增失敗' }
    } finally {
      loading.value = false
    }
  }

  // 更新白名單
  const updateWhitelistEntry = async (id: string, updates: Partial<WhitelistEntry>) => {
    loading.value = true
    try {
      const index = whitelistData.value.findIndex((entry) => entry.id === id)
      if (index === -1) {
        return { success: false, error: '找不到該白名單項目' }
      }

      const existingEntry = whitelistData.value[index]!
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: _id, createdAt: _createdAt, ...validUpdates } = updates
      whitelistData.value[index] = {
        id: existingEntry.id,
        ticketTypeId: validUpdates.ticketTypeId ?? existingEntry.ticketTypeId,
        passengerName: validUpdates.passengerName ?? existingEntry.passengerName,
        phone: validUpdates.phone ?? existingEntry.phone,
        idNumber: validUpdates.idNumber ?? existingEntry.idNumber,
        createdAt: existingEntry.createdAt,
        updatedAt: new Date().toISOString(),
        createdBy: validUpdates.createdBy ?? existingEntry.createdBy,
        remark: validUpdates.remark ?? existingEntry.remark
      }

      apiPut('whitelist', whitelistData.value)

      const updatedEntry = whitelistData.value[index]!
      void logCrud({
        entityType: 'whitelist',
        entityId: id,
        entityName: updatedEntry.passengerName,
        action: 'update',
        changes: generateChanges(existingEntry, updatedEntry)
      })
      return { success: true, data: whitelistData.value[index] }
    } catch (error) {
      console.error('更新白名單失敗:', error)
      return { success: false, error: '更新失敗' }
    } finally {
      loading.value = false
    }
  }

  // 刪除白名單
  const deleteWhitelistEntry = async (id: string) => {
    loading.value = true
    try {
      const index = whitelistData.value.findIndex((entry) => entry.id === id)
      if (index === -1) {
        return { success: false, error: '找不到該白名單項目' }
      }

      const removed = whitelistData.value[index]!
      whitelistData.value.splice(index, 1)
      apiPut('whitelist', whitelistData.value)

      void logCrud({
        entityType: 'whitelist',
        entityId: id,
        entityName: removed.passengerName,
        action: 'delete'
      })
      return { success: true }
    } catch (error) {
      console.error('刪除白名單失敗:', error)
      return { success: false, error: '刪除失敗' }
    } finally {
      loading.value = false
    }
  }

  // 批次刪除白名單
  const batchDeleteWhitelist = async (ids: string[]) => {
    loading.value = true
    try {
      whitelistData.value = whitelistData.value.filter((entry) => !ids.includes(entry.id))
      apiPut('whitelist', whitelistData.value)
      return { success: true }
    } catch (error) {
      console.error('批次刪除白名單失敗:', error)
      return { success: false, error: '批次刪除失敗' }
    } finally {
      loading.value = false
    }
  }

  // 驗證身分證字號格式
  const validateIdNumber = (idNumber: string): boolean => {
    const regex = /^[A-Z][12]\d{8}$/
    if (!regex.test(idNumber)) return false

    const letters = 'ABCDEFGHJKLMNPQRSTUVXYWZIO'
    const letterValue = letters.indexOf(idNumber[0]!) + 10

    const weights = [1, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1]
    const digits = [Math.floor(letterValue / 10), letterValue % 10, ...idNumber.slice(1).split('').map(Number)]

    const sum = digits.reduce((acc, digit, index) => acc + digit * (weights[index] ?? 0), 0)

    return sum % 10 === 0
  }

  // 驗證手機號碼格式
  const validatePhone = (phone: string): boolean => {
    return /^09\d{8}$/.test(phone)
  }

  return {
    whitelistData,
    loading,
    getWhitelistByTicketType,
    getWhitelistById,
    addWhitelistEntry,
    updateWhitelistEntry,
    deleteWhitelistEntry,
    batchDeleteWhitelist,
    validateIdNumber,
    validatePhone
  }
}
