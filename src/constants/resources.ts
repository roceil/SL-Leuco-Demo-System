import type { ResourceDefinition } from '@/types/rbac'

/**
 * 系統資源定義
 * 用於權限矩陣配置
 * 對應 Sidebar 中的實際頁面
 */
export const RESOURCES: ResourceDefinition[] = [
  // 業務功能
  {
    key: 'dashboard',
    label: '訂位作業',
    category: '業務'
  },
  {
    key: 'order-search',
    label: '訂單查詢',
    category: '業務'
  },

  // 報表
  {
    key: 'report',
    label: '報表總覽',
    category: '報表'
  },

  // 系統管理
  {
    key: 'role-management',
    label: '角色管理',
    category: '系統管理'
  },
  {
    key: 'permission-management',
    label: '權限管理',
    category: '系統管理'
  },
  {
    key: 'ticket-management',
    label: '票種管理',
    category: '系統管理'
  },
  {
    key: 'account-management',
    label: '帳號管理',
    category: '系統管理'
  },

  // 個人設定
  {
    key: 'account-settings',
    label: '帳號設定',
    category: '個人設定'
  }
]

/**
 * 根據分類分組資源
 */
export function getResourcesByCategory(): Record<string, ResourceDefinition[]> {
  return RESOURCES.reduce(
    (acc, resource) => {
      const category = resource.category || '其他'
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(resource)
      return acc
    },
    {} as Record<string, ResourceDefinition[]>
  )
}
