/**
 * 船隻管理系統類型定義
 */

// 船隻狀態
export enum ShipStatus {
  ACTIVE = 'active',      // 營運中
  MAINTENANCE = 'maintenance', // 維修中
  INACTIVE = 'inactive'   // 停用
}

// 船隻類型
export interface Ship {
  id: string
  name: string // 船隻名稱
  registrationNumber: string // 船籍編號
  organizationId: string // 所屬航商 ID
  maxCapacity: number // 最大載運人數
  currentCapacity?: number // 當前載運人數（可選）
  status: ShipStatus // 船隻狀態
  description?: string // 描述備註
  createdAt: string
  updatedAt: string
}

// 船隻表單數據
export interface ShipFormData {
  name: string
  registrationNumber: string
  organizationId: string
  maxCapacity: number
  status: ShipStatus
  description?: string
}
