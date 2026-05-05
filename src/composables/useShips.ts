import { ref, computed } from 'vue'
import type { Ship, ShipFormData } from '@/types/ship'
import { ShipStatus } from '@/types/ship'
import { apiGet, apiPut } from './useLocalStorage'
import { useAuditLog } from './useAuditLog'

// 模組級別共享狀態
const ships = ref<Ship[]>([])

/** 從 /api/ships 初始化船隻資料 */
export async function initShips(): Promise<void> {
  const data = await apiGet<Ship[]>('ships')
  ships.value = data
}

export function useShips() {
  const { logCrud, generateChanges } = useAuditLog()

  // 取得所有船隻
  const getAllShips = computed(() => ships.value)

  // 取得營運中的船隻
  const getActiveShips = computed(() =>
    ships.value.filter(ship => ship.status === ShipStatus.ACTIVE)
  )

  // 根據 ID 取得船隻
  const getShipById = (id: string): Ship | undefined => {
    return ships.value.find(ship => ship.id === id)
  }

  // 新增船隻
  const addShip = (formData: ShipFormData): Ship => {
    const now = new Date().toISOString()
    const newShip: Ship = {
      id: `SHIP${String(ships.value.length + 1).padStart(3, '0')}`,
      ...formData,
      currentCapacity: 0,
      createdAt: now,
      updatedAt: now
    }
    ships.value.push(newShip)
    apiPut('ships', ships.value)

    void logCrud({
      entityType: 'ship',
      entityId: newShip.id,
      entityName: newShip.name,
      action: 'create'
    })
    return newShip
  }

  // 更新船隻
  const updateShip = (id: string, formData: ShipFormData): boolean => {
    const index = ships.value.findIndex(ship => ship.id === id)
    if (index === -1) return false

    const existingShip = ships.value[index]!
    const updated: Ship = {
      id: existingShip.id,
      ...formData,
      organizationId: formData.organizationId || existingShip.organizationId,
      currentCapacity: existingShip.currentCapacity,
      createdAt: existingShip.createdAt,
      updatedAt: new Date().toISOString()
    }
    ships.value[index] = updated
    apiPut('ships', ships.value)

    void logCrud({
      entityType: 'ship',
      entityId: id,
      entityName: updated.name,
      action: 'update',
      changes: generateChanges(
        existingShip as unknown as Record<string, unknown>,
        updated as unknown as Record<string, unknown>
      )
    })
    return true
  }

  // 刪除船隻
  const deleteShip = (id: string): boolean => {
    const index = ships.value.findIndex(ship => ship.id === id)
    if (index === -1) return false

    const removed = ships.value[index]!
    ships.value.splice(index, 1)
    apiPut('ships', ships.value)

    void logCrud({
      entityType: 'ship',
      entityId: id,
      entityName: removed.name,
      action: 'delete'
    })
    return true
  }

  // 更新船隻狀態
  const updateShipStatus = (id: string, status: ShipStatus): boolean => {
    const ship = ships.value.find(s => s.id === id)
    if (!ship) return false

    const oldStatus = ship.status
    ship.status = status
    ship.updatedAt = new Date().toISOString()
    apiPut('ships', ships.value)

    void logCrud({
      entityType: 'ship',
      entityId: id,
      entityName: ship.name,
      action: 'update',
      changes: [{ field: 'status', oldValue: oldStatus, newValue: status, displayName: '狀態' }]
    })
    return true
  }

  // 統計數據
  const statistics = computed(() => ({
    total: ships.value.length,
    active: ships.value.filter(s => s.status === ShipStatus.ACTIVE).length,
    maintenance: ships.value.filter(s => s.status === ShipStatus.MAINTENANCE).length,
    inactive: ships.value.filter(s => s.status === ShipStatus.INACTIVE).length,
    totalCapacity: ships.value.reduce((sum, s) => sum + s.maxCapacity, 0)
  }))

  return {
    ships: getAllShips,
    activeShips: getActiveShips,
    statistics,
    getShipById,
    addShip,
    updateShip,
    deleteShip,
    updateShipStatus
  }
}
