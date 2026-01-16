import type { Schedule } from '@/types/schedule'
import { ScheduleType, ScheduleStatus, RouteDirection } from '@/types/schedule'

/**
 * Mock 船班數據
 */
export const mockSchedules: Schedule[] = [
  // 固定船班 - 東港 → 小琉球
  {
    id: 'SCH001',
    type: ScheduleType.REGULAR,
    shipId: 'SHIP001',
    shipName: '小琉球之星',
    route: RouteDirection.TO_ISLAND,
    departureTime: '07:00',
    isDaily: true,
    currentPassengers: 0,
    maxCapacity: 200,
    status: ScheduleStatus.ACTIVE,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    description: '早班固定船班'
  },
  {
    id: 'SCH002',
    type: ScheduleType.REGULAR,
    shipId: 'SHIP002',
    shipName: '海洋快艇',
    route: RouteDirection.TO_ISLAND,
    departureTime: '09:00',
    isDaily: true,
    currentPassengers: 0,
    maxCapacity: 150,
    status: ScheduleStatus.ACTIVE,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    description: '上午固定船班'
  },
  {
    id: 'SCH003',
    type: ScheduleType.REGULAR,
    shipId: 'SHIP003',
    shipName: '藍色珊瑚號',
    route: RouteDirection.TO_ISLAND,
    departureTime: '11:00',
    isDaily: true,
    currentPassengers: 0,
    maxCapacity: 180,
    status: ScheduleStatus.ACTIVE,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    description: '中午固定船班'
  },
  {
    id: 'SCH004',
    type: ScheduleType.REGULAR,
    shipId: 'SHIP001',
    shipName: '小琉球之星',
    route: RouteDirection.TO_ISLAND,
    departureTime: '14:00',
    isDaily: true,
    currentPassengers: 0,
    maxCapacity: 200,
    status: ScheduleStatus.ACTIVE,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    description: '下午固定船班'
  },
  {
    id: 'SCH005',
    type: ScheduleType.REGULAR,
    shipId: 'SHIP002',
    shipName: '海洋快艇',
    route: RouteDirection.TO_ISLAND,
    departureTime: '16:30',
    isDaily: true,
    currentPassengers: 0,
    maxCapacity: 150,
    status: ScheduleStatus.ACTIVE,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    description: '傍晚固定船班'
  },

  // 固定船班 - 小琉球 → 東港
  {
    id: 'SCH006',
    type: ScheduleType.REGULAR,
    shipId: 'SHIP001',
    shipName: '小琉球之星',
    route: RouteDirection.FROM_ISLAND,
    departureTime: '08:00',
    isDaily: true,
    currentPassengers: 0,
    maxCapacity: 200,
    status: ScheduleStatus.ACTIVE,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    description: '早班回程'
  },
  {
    id: 'SCH007',
    type: ScheduleType.REGULAR,
    shipId: 'SHIP002',
    shipName: '海洋快艇',
    route: RouteDirection.FROM_ISLAND,
    departureTime: '10:00',
    isDaily: true,
    currentPassengers: 0,
    maxCapacity: 150,
    status: ScheduleStatus.ACTIVE,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    description: '上午回程'
  },
  {
    id: 'SCH008',
    type: ScheduleType.REGULAR,
    shipId: 'SHIP003',
    shipName: '藍色珊瑚號',
    route: RouteDirection.FROM_ISLAND,
    departureTime: '12:30',
    isDaily: true,
    currentPassengers: 0,
    maxCapacity: 180,
    status: ScheduleStatus.ACTIVE,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    description: '中午回程'
  },
  {
    id: 'SCH009',
    type: ScheduleType.REGULAR,
    shipId: 'SHIP001',
    shipName: '小琉球之星',
    route: RouteDirection.FROM_ISLAND,
    departureTime: '15:00',
    isDaily: true,
    currentPassengers: 0,
    maxCapacity: 200,
    status: ScheduleStatus.ACTIVE,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    description: '下午回程'
  },
  {
    id: 'SCH010',
    type: ScheduleType.REGULAR,
    shipId: 'SHIP002',
    shipName: '海洋快艇',
    route: RouteDirection.FROM_ISLAND,
    departureTime: '17:30',
    isDaily: true,
    currentPassengers: 0,
    maxCapacity: 150,
    status: ScheduleStatus.ACTIVE,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    description: '傍晚回程'
  },

  // 機動船班範例
  {
    id: 'SCH011',
    type: ScheduleType.FLEXIBLE,
    shipId: 'SHIP003',
    shipName: '藍色珊瑚號',
    route: RouteDirection.TO_ISLAND,
    departureTime: '13:00',
    date: new Date().toISOString().split('T')[0], // 今天
    isDaily: false,
    currentPassengers: 0,
    maxCapacity: 180,
    status: ScheduleStatus.ACTIVE,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    description: '加開機動船班，因應假日人潮'
  }
]
