import { ref } from 'vue'
import type { LoginRecord, AccountLockInfo, LoginConfig, LoginResult } from '@/types/auth'
import { apiGet, apiPut } from './useLocalStorage'

// 模組級別共享狀態
let loginRecords: LoginRecord[] = []
let accountLocks: AccountLockInfo[] = []
let loadInitiated = false

// 全域共享的登入狀態（singleton），從 localStorage 恢復以支援頁面重整
const _storedUser = localStorage.getItem('currentUser')
const currentUser = ref<string | null>(_storedUser)
const isAuthenticated = ref(_storedUser !== null)

/** 從 /api/login_records 和 /api/account_locks 初始化資料 */
async function init(): Promise<void> {
  if (loadInitiated) return
  loadInitiated = true
  try {
    ;[loginRecords, accountLocks] = await Promise.all([
      apiGet<LoginRecord[]>('login_records'),
      apiGet<AccountLockInfo[]>('account_locks')
    ])
  } catch {
    loginRecords = []
    accountLocks = []
  }
}

// 預設登入設定
const defaultConfig: LoginConfig = {
  maxFailedAttempts: 5,
  lockDuration: 30,
  resetFailedAttemptsAfter: 60
}

export function useAuth() {
  // 觸發懶加載（非阻塞）
  init()

  /**
   * 獲取客戶端 IP（模擬，實際應該從伺服器獲取）
   */
  const getClientIP = (): string => {
    return '127.0.0.1'
  }

  /**
   * 獲取用戶代理
   */
  const getUserAgent = (): string => {
    return navigator.userAgent
  }

  /**
   * 保存登入記錄
   */
  const saveLoginRecord = (record: LoginRecord) => {
    loginRecords.unshift(record) // 最新的記錄放在最前面

    // 只保留最近 1000 筆記錄
    if (loginRecords.length > 1000) {
      loginRecords.splice(1000)
    }

    apiPut('login_records', loginRecords)
  }

  /**
   * 保存帳戶鎖定資訊
   */
  const saveAccountLocks = (locks: AccountLockInfo[]) => {
    accountLocks = locks
    apiPut('account_locks', accountLocks)
  }

  /**
   * 獲取指定帳戶的鎖定資訊
   */
  const getAccountLockInfo = (username: string): AccountLockInfo | null => {
    return accountLocks.find(lock => lock.username === username) || null
  }

  /**
   * 檢查帳戶是否被鎖定
   */
  const isAccountLocked = (username: string): { locked: boolean; lockUntil?: string } => {
    const lockInfo = getAccountLockInfo(username)

    if (!lockInfo || !lockInfo.lockUntil) {
      return { locked: false }
    }

    const lockUntilTime = new Date(lockInfo.lockUntil).getTime()
    const now = new Date().getTime()

    if (now >= lockUntilTime) {
      unlockAccount(username)
      return { locked: false }
    }

    return { locked: true, lockUntil: lockInfo.lockUntil }
  }

  /**
   * 記錄登入失敗
   */
  const recordLoginFailure = (username: string, reason: string) => {
    const now = new Date().toISOString()

    const loginRecord: LoginRecord = {
      id: `login-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      username,
      loginTime: now,
      ipAddress: getClientIP(),
      userAgent: getUserAgent(),
      success: false,
      failureReason: reason
    }
    saveLoginRecord(loginRecord)

    const locks = [...accountLocks]
    let lockInfo = locks.find(lock => lock.username === username)

    if (!lockInfo) {
      lockInfo = {
        username,
        failedAttempts: 0,
        lockUntil: null,
        lastFailedAttempt: now
      }
      locks.push(lockInfo)
    }

    const lastFailedTime = new Date(lockInfo.lastFailedAttempt).getTime()
    const timeSinceLastFailed = (new Date().getTime() - lastFailedTime) / (1000 * 60)

    if (timeSinceLastFailed > defaultConfig.resetFailedAttemptsAfter) {
      lockInfo.failedAttempts = 1
    } else {
      lockInfo.failedAttempts++
    }

    lockInfo.lastFailedAttempt = now

    if (lockInfo.failedAttempts >= defaultConfig.maxFailedAttempts) {
      const lockUntilTime = new Date()
      lockUntilTime.setMinutes(lockUntilTime.getMinutes() + defaultConfig.lockDuration)
      lockInfo.lockUntil = lockUntilTime.toISOString()
    }

    saveAccountLocks(locks)
  }

  /**
   * 記錄登入成功
   */
  const recordLoginSuccess = (username: string) => {
    const now = new Date().toISOString()

    const loginRecord: LoginRecord = {
      id: `login-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      username,
      loginTime: now,
      ipAddress: getClientIP(),
      userAgent: getUserAgent(),
      success: true
    }
    saveLoginRecord(loginRecord)

    const locks = [...accountLocks]
    const lockIndex = locks.findIndex(lock => lock.username === username)
    if (lockIndex !== -1) {
      locks[lockIndex].failedAttempts = 0
      locks[lockIndex].lockUntil = null
      saveAccountLocks(locks)
    }

    currentUser.value = username
    isAuthenticated.value = true
    localStorage.setItem('currentUser', username)
  }

  /**
   * 解除帳戶鎖定
   */
  const unlockAccount = (username: string) => {
    const locks = [...accountLocks]
    const lockIndex = locks.findIndex(lock => lock.username === username)

    if (lockIndex !== -1) {
      locks[lockIndex].failedAttempts = 0
      locks[lockIndex].lockUntil = null
      saveAccountLocks(locks)
    }
  }

  /**
   * 登入
   */
  const login = (username: string, password: string): LoginResult => {
    const lockStatus = isAccountLocked(username)
    if (lockStatus.locked) {
      const lockUntil = new Date(lockStatus.lockUntil!)
      return {
        success: false,
        message: `帳戶已被鎖定，請於 ${lockUntil.toLocaleString('zh-TW')} 後再試`,
        lockUntil: lockStatus.lockUntil
      }
    }

    const isValidCredentials = validateCredentials(username, password)

    if (isValidCredentials) {
      recordLoginSuccess(username)
      return {
        success: true,
        message: '登入成功'
      }
    } else {
      recordLoginFailure(username, '帳號或密碼錯誤')

      const lockInfo = getAccountLockInfo(username)
      const remainingAttempts = lockInfo
        ? defaultConfig.maxFailedAttempts - lockInfo.failedAttempts
        : defaultConfig.maxFailedAttempts - 1

      if (remainingAttempts > 0) {
        return {
          success: false,
          message: `帳號或密碼錯誤，剩餘 ${remainingAttempts} 次嘗試機會`,
          remainingAttempts
        }
      } else {
        const lockInfo = getAccountLockInfo(username)
        return {
          success: false,
          message: `登入失敗次數過多，帳戶已被鎖定 ${defaultConfig.lockDuration} 分鐘`,
          lockUntil: lockInfo?.lockUntil || undefined
        }
      }
    }
  }

  /**
   * 驗證帳號密碼（示範用）
   */
  const validateCredentials = (username: string, password: string): boolean => {
    return username.trim() !== '' && password.trim() !== ''
  }

  /**
   * 登出
   */
  const logout = () => {
    currentUser.value = null
    isAuthenticated.value = false
    localStorage.removeItem('currentUser')
  }

  /**
   * 獲取指定用戶的登入歷史
   */
  const getUserLoginHistory = (username: string, limit: number = 50): LoginRecord[] => {
    return loginRecords
      .filter(record => record.username === username)
      .slice(0, limit)
  }

  /**
   * 獲取所有登入歷史
   */
  const getAllLoginHistory = (limit: number = 100): LoginRecord[] => {
    return loginRecords.slice(0, limit)
  }

  /**
   * 管理員強制解除鎖定
   */
  const forceUnlockAccount = (username: string) => {
    unlockAccount(username)
  }

  /**
   * 獲取所有被鎖定的帳戶
   */
  const getLockedAccounts = (): AccountLockInfo[] => {
    const now = new Date().getTime()

    return accountLocks.filter(lock => {
      if (!lock.lockUntil) return false
      return new Date(lock.lockUntil).getTime() > now
    })
  }

  /**
   * 生成隨機密碼
   */
  const generateRandomPassword = (length: number = 12): string => {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
    let password = ''
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * charset.length)
      password += charset[randomIndex]
    }
    return password
  }

  /**
   * 管理員重置用戶密碼
   */
  const resetUserPassword = (username: string, adminUsername: string): { success: boolean; newPassword?: string; message: string } => {
    try {
      const newPassword = generateRandomPassword(12)

      const now = new Date().toISOString()
      const resetRecord: LoginRecord = {
        id: `password-reset-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        username,
        loginTime: now,
        ipAddress: getClientIP(),
        userAgent: `Admin: ${adminUsername}`,
        success: true,
        failureReason: `密碼由管理員 ${adminUsername} 重置`
      }
      saveLoginRecord(resetRecord)

      unlockAccount(username)

      return {
        success: true,
        newPassword,
        message: '密碼已成功重置'
      }
    } catch {
      return {
        success: false,
        message: '密碼重置失敗'
      }
    }
  }

  return {
    currentUser,
    isAuthenticated,
    login,
    logout,
    isAccountLocked,
    getUserLoginHistory,
    getAllLoginHistory,
    forceUnlockAccount,
    getLockedAccounts,
    getAccountLockInfo,
    resetUserPassword
  }
}
