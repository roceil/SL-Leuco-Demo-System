import type { Ship } from '@/types/ship'
import { ShipStatus } from '@/types/ship'

/**
 * Mock 船隻數據
 */
export const mockShips: Ship[] = [
  {
    id: 'SHIP001',
    name: '小琉球之星',
    registrationNumber: 'LQ-2023-001',
    maxCapacity: 200,
    currentCapacity: 0,
    status: ShipStatus.ACTIVE,
    description: '主力船班，適合大量客運',
    createdAt: '2023-01-15T08:00:00Z',
    updatedAt: '2024-01-10T10:30:00Z'
  },
  {
    id: 'SHIP002',
    name: '海洋快艇',
    registrationNumber: 'LQ-2023-002',
    maxCapacity: 150,
    currentCapacity: 0,
    status: ShipStatus.ACTIVE,
    description: '快速渡輪，航行時間較短',
    createdAt: '2023-03-20T09:00:00Z',
    updatedAt: '2024-02-05T14:20:00Z'
  },
  {
    id: 'SHIP003',
    name: '藍色珊瑚號',
    registrationNumber: 'LQ-2023-003',
    maxCapacity: 180,
    currentCapacity: 0,
    status: ShipStatus.ACTIVE,
    description: '觀光遊覽船，配備良好',
    createdAt: '2023-05-10T07:30:00Z',
    updatedAt: '2024-03-15T16:45:00Z'
  },
  {
    id: 'SHIP004',
    name: '東港快線',
    registrationNumber: 'LQ-2022-005',
    maxCapacity: 120,
    currentCapacity: 0,
    status: ShipStatus.MAINTENANCE,
    description: '目前進行例行保養維修',
    createdAt: '2022-11-05T10:00:00Z',
    updatedAt: '2024-01-08T11:00:00Z'
  },
  {
    id: 'SHIP005',
    name: '珍珠號',
    registrationNumber: 'LQ-2021-003',
    maxCapacity: 100,
    currentCapacity: 0,
    status: ShipStatus.INACTIVE,
    description: '已停用，待更新設備',
    createdAt: '2021-08-12T08:30:00Z',
    updatedAt: '2023-12-20T09:15:00Z'
  }
]
