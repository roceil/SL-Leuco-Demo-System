import { ref, computed } from 'vue'
import type { Schedule, ScheduleFormData, ScheduleStatistics } from '@/types/schedule'
import { ScheduleType, ScheduleStatus } from '@/types/schedule'
import { useShips } from './useShips'
import { useRouteStore } from '@/stores/route'
import { apiGet, apiPut } from './useLocalStorage'
import { useAuditLog } from './useAuditLog'

// 模組級別共享狀態
const schedules = ref<Schedule[]>([])

/** 從 /api/schedules 初始化船班資料 */
export async function initSchedules(): Promise<void> {
  const data = await apiGet<Schedule[]>('schedules')
  schedules.value = data
}

export function useSchedules() {
  const { getShipById } = useShips()
  const routeStore = useRouteStore()
  const { logCrud, generateChanges } = useAuditLog()

  // 取得所有船班
  const getAllSchedules = computed(() => schedules.value)

  // 取得固定船班
  const getRegularSchedules = computed(() =>
    schedules.value.filter(schedule => schedule.type === ScheduleType.REGULAR)
  )

  // 取得機動船班
  const getFlexibleSchedules = computed(() =>
    schedules.value.filter(schedule => schedule.type === ScheduleType.FLEXIBLE)
  )

  // 取得今日船班
  const getTodaySchedules = computed(() => {
    const today = new Date().toISOString().split('T')[0]
    return schedules.value.filter(schedule =>
      schedule.isDaily || schedule.date === today
    )
  })

  // 根據 ID 取得船班
  const getScheduleById = (id: string): Schedule | undefined => {
    return schedules.value.find(schedule => schedule.id === id)
  }

  // 新增船班
  const addSchedule = (formData: ScheduleFormData): Schedule => {
    const now = new Date().toISOString()
    const ship = getShipById(formData.shipId)

    if (!ship) {
      throw new Error('找不到指定的船隻')
    }

    const newSchedule: Schedule = {
      id: `SCH${String(schedules.value.length + 1).padStart(3, '0')}`,
      type: formData.type,
      shipId: formData.shipId,
      shipName: ship.name,
      routeSegmentId: formData.routeSegmentId,
      departureTime: formData.departureTime,
      date: formData.date,
      isDaily: formData.isDaily,
      currentPassengers: 0,
      maxCapacity: ship.maxCapacity,
      waitlistCapacity: formData.waitlistCapacity ?? 10,
      currentWaitlist: 0,
      reservedResident: formData.reservedResident ?? 30,
      reservedOnline: formData.reservedOnline ?? 30,
      channelQuotas: formData.channelQuotas ?? { counter: 100, agent: 50 },
      status: formData.status,
      description: formData.description,
      createdAt: now,
      updatedAt: now
    }

    schedules.value.push(newSchedule)
    apiPut('schedules', schedules.value)

    void logCrud({
      entityType: 'schedule',
      entityId: newSchedule.id,
      entityName: `${newSchedule.shipName} ${newSchedule.departureTime}`,
      action: 'create'
    })
    return newSchedule
  }

  // 更新船班
  const updateSchedule = (id: string, formData: ScheduleFormData): boolean => {
    const index = schedules.value.findIndex(schedule => schedule.id === id)
    if (index === -1) return false

    const existingSchedule = schedules.value[index]!
    const ship = getShipById(formData.shipId)
    if (!ship) {
      throw new Error('找不到指定的船隻')
    }

    const updated: Schedule = {
      id: existingSchedule.id,
      type: formData.type,
      shipId: formData.shipId,
      shipName: ship.name,
      routeSegmentId: formData.routeSegmentId,
      departureTime: formData.departureTime,
      date: formData.date,
      isDaily: formData.isDaily,
      currentPassengers: existingSchedule.currentPassengers,
      maxCapacity: ship.maxCapacity,
      waitlistCapacity: formData.waitlistCapacity ?? existingSchedule.waitlistCapacity ?? 10,
      currentWaitlist: existingSchedule.currentWaitlist ?? 0,
      reservedResident: formData.reservedResident ?? existingSchedule.reservedResident ?? 30,
      reservedOnline: formData.reservedOnline ?? existingSchedule.reservedOnline ?? 30,
      channelQuotas: formData.channelQuotas ?? existingSchedule.channelQuotas ?? { counter: 100, agent: 50 },
      status: formData.status,
      createdAt: existingSchedule.createdAt,
      description: formData.description,
      updatedAt: new Date().toISOString()
    }
    schedules.value[index] = updated
    apiPut('schedules', schedules.value)

    void logCrud({
      entityType: 'schedule',
      entityId: id,
      entityName: `${updated.shipName} ${updated.departureTime}`,
      action: 'update',
      changes: generateChanges(
        existingSchedule as unknown as Record<string, unknown>,
        updated as unknown as Record<string, unknown>
      )
    })
    return true
  }

  // 刪除船班
  const deleteSchedule = (id: string): boolean => {
    const index = schedules.value.findIndex(schedule => schedule.id === id)
    if (index === -1) return false

    const removed = schedules.value[index]!
    schedules.value.splice(index, 1)
    apiPut('schedules', schedules.value)

    void logCrud({
      entityType: 'schedule',
      entityId: id,
      entityName: `${removed.shipName} ${removed.departureTime}`,
      action: 'delete'
    })
    return true
  }

  // 更新船班狀態
  const updateScheduleStatus = (id: string, status: ScheduleStatus): boolean => {
    const schedule = schedules.value.find(s => s.id === id)
    if (!schedule) return false

    const oldStatus = schedule.status
    schedule.status = status
    schedule.updatedAt = new Date().toISOString()
    apiPut('schedules', schedules.value)

    void logCrud({
      entityType: 'schedule',
      entityId: id,
      entityName: `${schedule.shipName} ${schedule.departureTime}`,
      action: 'update',
      changes: [{ field: 'status', oldValue: oldStatus, newValue: status, displayName: '狀態' }]
    })
    return true
  }

  // 統計數據
  const statistics = computed<ScheduleStatistics>(() => {
    const today = new Date().toISOString().split('T')[0]
    return {
      totalSchedules: schedules.value.length,
      regularSchedules: schedules.value.filter(s => s.type === ScheduleType.REGULAR).length,
      flexibleSchedules: schedules.value.filter(s => s.type === ScheduleType.FLEXIBLE).length,
      activeSchedules: schedules.value.filter(s => s.status === ScheduleStatus.ACTIVE).length,
      todaySchedules: schedules.value.filter(s => s.isDaily || s.date === today).length
    }
  })

  // 取得航段名稱
  const getRouteName = (routeSegmentId: string): string => {
    const segment = routeStore.getRouteSegmentWithPorts(routeSegmentId)
    if (!segment) return '未知航段'
    return `${segment.fromPort.name} → ${segment.toPort.name}`
  }

  // 取得航段資訊
  const getRouteSegment = (routeSegmentId: string) => {
    return routeStore.getRouteSegmentWithPorts(routeSegmentId)
  }

  return {
    schedules: getAllSchedules,
    regularSchedules: getRegularSchedules,
    flexibleSchedules: getFlexibleSchedules,
    todaySchedules: getTodaySchedules,
    statistics,
    getScheduleById,
    addSchedule,
    updateSchedule,
    deleteSchedule,
    updateScheduleStatus,
    getRouteName,
    getRouteSegment,
    ScheduleType,
    ScheduleStatus
  }
}
