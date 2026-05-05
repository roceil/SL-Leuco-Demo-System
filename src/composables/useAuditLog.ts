import { ref } from 'vue'
import type { AuditLog, LogQueryOptions, LogStatistics, EntityType, ActionType, FieldChange } from '@/types/log'
import { apiGet, apiPut } from './useLocalStorage'

// 模組級別共享狀態
let auditLogs: AuditLog[] = []
let loadInitiated = false

/** 從 /api/audit_logs 初始化日誌資料 */
async function init(): Promise<void> {
  if (loadInitiated) return
  loadInitiated = true
  try {
    auditLogs = await apiGet<AuditLog[]>('audit_logs')
  } catch {
    auditLogs = []
  }
}

export function useAuditLog() {
  // 觸發懶加載（非阻塞）
  init()

  const logs = ref<AuditLog[]>(auditLogs)

  /**
   * 獲取客戶端 IP（模擬）
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
   * 創建日誌記錄
   */
  const createLog = (log: Omit<AuditLog, 'id' | 'timestamp' | 'ipAddress' | 'userAgent'>): AuditLog => {
    const newLog: AuditLog = {
      ...log,
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      timestamp: new Date().toISOString(),
      ipAddress: getClientIP(),
      userAgent: getUserAgent()
    }

    auditLogs.unshift(newLog) // 最新的記錄放在最前面

    // 只保留最近 10000 筆記錄
    if (auditLogs.length > 10000) {
      auditLogs.splice(10000)
    }

    apiPut('audit_logs', auditLogs)
    return newLog
  }

  /**
   * 簡化版 logger：自動帶入當前登入者作為操作者，給 store/composable 內部 CRUD 用。
   * 因為 useAuth 與 stores/rbac 之間有循環匯入風險，這裡用 dynamic import 取得。
   */
  const logCrud = async (entry: {
    entityType: EntityType
    entityId: string
    entityName?: string
    action: ActionType
    changes?: FieldChange[]
    note?: string
  }) => {
    const [{ useAuth }, { useRbacStore }] = await Promise.all([
      import('./useAuth'),
      import('@/stores/rbac'),
    ])
    const { currentUser } = useAuth()
    const rbacStore = useRbacStore()
    const username = currentUser.value || 'system'
    const account = rbacStore.accounts.find((a) => a.username === username)
    createLog({
      ...entry,
      operatorId: account?.id || username,
      operatorName: account?.name || username,
    })
  }

  /**
   * 獲取所有日誌
   */
  const getAllLogs = (options?: LogQueryOptions): AuditLog[] => {
    let result = [...auditLogs]

    if (!options) return result

    if (options.entityType) {
      result = result.filter(log => log.entityType === options.entityType)
    }

    if (options.entityId) {
      result = result.filter(log => log.entityId === options.entityId)
    }

    if (options.action) {
      result = result.filter(log => log.action === options.action)
    }

    if (options.operatorId) {
      result = result.filter(log => log.operatorId === options.operatorId)
    }

    if (options.startDate) {
      const startTime = new Date(options.startDate).getTime()
      result = result.filter(log => new Date(log.timestamp).getTime() >= startTime)
    }

    if (options.endDate) {
      const endTime = new Date(options.endDate).getTime()
      result = result.filter(log => new Date(log.timestamp).getTime() <= endTime)
    }

    if (options.offset !== undefined && options.limit !== undefined) {
      result = result.slice(options.offset, options.offset + options.limit)
    } else if (options.limit !== undefined) {
      result = result.slice(0, options.limit)
    }

    return result
  }

  /**
   * 獲取特定實體的日誌
   */
  const getEntityLogs = (entityType: EntityType, entityId: string, limit?: number): AuditLog[] => {
    return getAllLogs({ entityType, entityId, limit })
  }

  /**
   * 獲取特定用戶的操作日誌
   */
  const getUserLogs = (operatorId: string, limit?: number): AuditLog[] => {
    return getAllLogs({ operatorId, limit })
  }

  /**
   * 獲取最近的日誌
   */
  const getRecentLogs = (limit: number = 50): AuditLog[] => {
    return getAllLogs({ limit })
  }

  /**
   * 獲取日誌統計資訊
   */
  const getLogStatistics = (): LogStatistics => {
    const byEntityType: Record<string, number> = {}
    const byAction: Record<string, number> = {}
    const byOperator: Record<string, number> = {}

    auditLogs.forEach(log => {
      byEntityType[log.entityType] = (byEntityType[log.entityType] || 0) + 1
      byAction[log.action] = (byAction[log.action] || 0) + 1
      byOperator[log.operatorName] = (byOperator[log.operatorName] || 0) + 1
    })

    return {
      totalLogs: auditLogs.length,
      byEntityType: byEntityType as Record<EntityType, number>,
      byAction: byAction as Record<ActionType, number>,
      byOperator,
      recentLogs: auditLogs.slice(0, 10)
    }
  }

  /**
   * 刪除指定實體的所有日誌
   */
  const deleteEntityLogs = (entityType: EntityType, entityId: string) => {
    auditLogs = auditLogs.filter(
      log => !(log.entityType === entityType && log.entityId === entityId)
    )
    apiPut('audit_logs', auditLogs)
  }

  /**
   * 清除所有日誌（謹慎使用）
   */
  const clearAllLogs = () => {
    auditLogs = []
    apiPut('audit_logs', auditLogs)
  }

  /**
   * 比較物件並生成變更記錄
   */
  const generateChanges = (
    oldObj: Record<string, unknown>,
    newObj: Record<string, unknown>,
    fieldDisplayNames?: Record<string, string>
  ): FieldChange[] => {
    const changes: FieldChange[] = []

    const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)])

    allKeys.forEach(key => {
      if (['id', 'createdAt', 'updatedAt'].includes(key)) return

      const oldValue = oldObj[key]
      const newValue = newObj[key]

      const oldValueStr = JSON.stringify(oldValue)
      const newValueStr = JSON.stringify(newValue)

      if (oldValueStr !== newValueStr) {
        changes.push({
          field: key,
          oldValue,
          newValue,
          displayName: fieldDisplayNames?.[key] || key
        })
      }
    })

    return changes
  }

  /**
   * 匯出日誌為 CSV
   */
  const exportLogsToCSV = (logs: AuditLog[]): string => {
    const headers = ['時間', '操作類型', '實體類型', '實體ID', '實體名稱', '操作者', 'IP位址', '備註']
    const rows = logs.map(log => [
      new Date(log.timestamp).toLocaleString('zh-TW'),
      getActionDisplayName(log.action),
      getEntityTypeDisplayName(log.entityType),
      log.entityId,
      log.entityName || '',
      log.operatorName,
      log.ipAddress || '',
      log.note || ''
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    return csvContent
  }

  /**
   * 獲取操作類型顯示名稱
   */
  const getActionDisplayName = (action: ActionType): string => {
    const names: Record<ActionType, string> = {
      create: '新增',
      update: '更新',
      delete: '刪除',
      password_reset: '密碼重置',
      login: '登入',
      logout: '登出'
    }
    return names[action] || action
  }

  /**
   * 獲取實體類型顯示名稱
   */
  const getEntityTypeDisplayName = (entityType: EntityType): string => {
    const names: Record<EntityType, string> = {
      account: '帳號',
      organization: '組織',
      ticket: '票種',
      ticket_name_option: '票種名稱',
      ticket_type_option: '票種類型',
      order: '訂單',
      role: '角色',
      permission: '權限組',
      ship: '船隻',
      schedule: '航班',
      port: '航點',
      route: '航段',
      whitelist: '白名單'
    }
    return names[entityType] || entityType
  }

  return {
    logs,
    createLog,
    logCrud,
    getAllLogs,
    getEntityLogs,
    getUserLogs,
    getRecentLogs,
    getLogStatistics,
    deleteEntityLogs,
    clearAllLogs,
    generateChanges,
    exportLogsToCSV,
    getActionDisplayName,
    getEntityTypeDisplayName
  }
}
