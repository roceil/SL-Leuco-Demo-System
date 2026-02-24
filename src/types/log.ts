/**
 * 實體類型
 */
export type EntityType =
  | 'account'      // 帳號
  | 'ticket'       // 票種
  | 'order'        // 訂單
  | 'role'         // 角色
  | 'permission'   // 權限
  | 'ship'         // 船隻
  | 'schedule'     // 航班
  | 'port'         // 航點
  | 'route'        // 航段
  | 'whitelist'    // 白名單

/**
 * 操作類型
 */
export type ActionType =
  | 'create'       // 新增
  | 'update'       // 更新
  | 'delete'       // 刪除
  | 'password_reset' // 密碼重置
  | 'login'        // 登入
  | 'logout'       // 登出

/**
 * 欄位變更記錄
 */
export interface FieldChange {
  field: string      // 欄位名稱
  oldValue: unknown  // 舊值
  newValue: unknown  // 新值
  displayName?: string // 欄位顯示名稱（中文）
}

/**
 * 審計日誌
 */
export interface AuditLog {
  id: string
  entityType: EntityType
  entityId: string
  entityName?: string // 實體名稱（方便顯示）
  action: ActionType
  operatorId: string
  operatorName: string
  timestamp: string // ISO 格式時間
  changes?: FieldChange[] // 變更內容
  ipAddress?: string
  userAgent?: string
  note?: string // 備註
}

/**
 * Log 查詢選項
 */
export interface LogQueryOptions {
  entityType?: EntityType
  entityId?: string
  action?: ActionType
  operatorId?: string
  startDate?: string
  endDate?: string
  limit?: number
  offset?: number
}

/**
 * Log 統計資訊
 */
export interface LogStatistics {
  totalLogs: number
  byEntityType: Record<EntityType, number>
  byAction: Record<ActionType, number>
  byOperator: Record<string, number>
  recentLogs: AuditLog[]
}
