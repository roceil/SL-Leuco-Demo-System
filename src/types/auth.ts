/**
 * 登入記錄
 */
export interface LoginRecord {
  id: string
  username: string
  loginTime: string // ISO 格式時間
  ipAddress: string
  userAgent: string
  success: boolean // 是否登入成功
  failureReason?: string // 失敗原因
}

/**
 * 帳戶鎖定資訊
 */
export interface AccountLockInfo {
  username: string
  failedAttempts: number // 失敗次數
  lockUntil: string | null // 鎖定到何時（ISO 格式），null 表示未鎖定
  lastFailedAttempt: string // 最後一次失敗時間
}

/**
 * 登入設定
 */
export interface LoginConfig {
  maxFailedAttempts: number // 最大失敗次數
  lockDuration: number // 鎖定時長（分鐘）
  resetFailedAttemptsAfter: number // 多久後重置失敗次數（分鐘）
}

/**
 * 登入結果
 */
export interface LoginResult {
  success: boolean
  message: string
  lockUntil?: string // 如果帳戶被鎖定，返回鎖定到何時
  remainingAttempts?: number // 剩餘嘗試次數
}
