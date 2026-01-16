import { ref, computed } from 'vue'
import type { Schedule, ScheduleFormData, ScheduleStatistics } from '@/types/schedule'
import { ScheduleType, ScheduleStatus, RouteDirection } from '@/types/schedule'
import { mockSchedules } from '@/constants/mockSchedules'
import { useShips } from './useShips'

const schedules = ref<Schedule[]>([...mockSchedules])

export function useSchedules() {
  const { getShipById } = useShips()

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
      route: formData.route,
      departureTime: formData.departureTime,
      date: formData.date,
      isDaily: formData.isDaily,
      currentPassengers: 0,
      maxCapacity: ship.maxCapacity,
      status: formData.status,
      description: formData.description,
      createdAt: now,
      updatedAt: now
    }

    schedules.value.push(newSchedule)
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

    schedules.value[index] = {
      id: existingSchedule.id,
      type: formData.type,
      shipId: formData.shipId,
      shipName: ship.name,
      route: formData.route,
      departureTime: formData.departureTime,
      date: formData.date,
      isDaily: formData.isDaily,
      currentPassengers: existingSchedule.currentPassengers,
      maxCapacity: ship.maxCapacity,
      status: formData.status,
      createdAt: existingSchedule.createdAt,
      description: formData.description,
      updatedAt: new Date().toISOString()
    }
    return true
  }

  // 刪除船班
  const deleteSchedule = (id: string): boolean => {
    const index = schedules.value.findIndex(schedule => schedule.id === id)
    if (index === -1) return false

    schedules.value.splice(index, 1)
    return true
  }

  // 更新船班狀態
  const updateScheduleStatus = (id: string, status: ScheduleStatus): boolean => {
    const schedule = schedules.value.find(s => s.id === id)
    if (!schedule) return false

    schedule.status = status
    schedule.updatedAt = new Date().toISOString()
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

  // 取得航線名稱
  const getRouteName = (route: RouteDirection): string => {
    return route === RouteDirection.TO_ISLAND ? '東港 → 小琉球' : '小琉球 → 東港'
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
    RouteDirection,
    ScheduleType,
    ScheduleStatus
  }
}
