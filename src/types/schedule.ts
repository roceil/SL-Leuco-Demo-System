/**
 * 船班管理系統類型定義
 */

// 船班類型
export enum ScheduleType {
  REGULAR = 'regular',    // 每日固定船班
  FLEXIBLE = 'flexible'   // 機動船班
}

// 船班狀態
export enum ScheduleStatus {
  ACTIVE = 'active',      // 營運中
  CANCELLED = 'cancelled', // 已取消
  COMPLETED = 'completed'  // 已完成
}

// 船班
export interface Schedule {
  id: string
  type: ScheduleType // 船班類型
  organizationId?: string // 所屬航商 ID（標示由哪個航商建立）
  shipId: string // 船隻 ID
  shipName: string // 船隻名稱（冗餘欄位，方便顯示）
  routeSegmentId: string // 航段 ID（關聯到 RouteSegment）
  departureTime: string // 出發時間 (HH:mm 格式)
  date?: string // 日期 (YYYY-MM-DD 格式)，僅機動船班需要
  isDaily?: boolean // 是否每日重複，僅固定船班為 true
  currentPassengers: number // 當前乘客數
  maxCapacity: number // 最大載客量（從船隻繼承）
  /** §3.4.2 候補座位設定：超額訂位用，不計入正式座位庫存 */
  waitlistCapacity?: number
  /** 目前候補人數（依 orders 中 status='waitlist' 計算的快取值） */
  currentWaitlist?: number
  /** §3.4.2 保留位設定：居民保留座位 */
  reservedResident?: number
  /** §3.4.2 保留位設定：線上保留座位 */
  reservedOnline?: number
  /** §3.4.2 通路配額管理：分配給各通路的座位（旅行社、現場售票…） */
  channelQuotas?: {
    counter?: number // 現場售票
    agent?: number   // 旅行社/經銷商
  }
  status: ScheduleStatus // 船班狀態
  createdAt: string
  updatedAt: string
  description?: string // 備註
}

// 船班表單數據（新增/編輯）
export interface ScheduleFormData {
  type: ScheduleType
  shipId: string
  routeSegmentId: string // 航段 ID
  departureTime: string
  date?: string // 機動船班必填
  isDaily?: boolean // 固定船班為 true
  status: ScheduleStatus
  /** §3.4.2 候補座位設定 */
  waitlistCapacity?: number
  /** §3.4.2 保留位/通路配額 */
  reservedResident?: number
  reservedOnline?: number
  channelQuotas?: {
    counter?: number
    agent?: number
  }
  description?: string
}

// 船班統計
export interface ScheduleStatistics {
  totalSchedules: number
  regularSchedules: number
  flexibleSchedules: number
  activeSchedules: number
  todaySchedules: number
}
