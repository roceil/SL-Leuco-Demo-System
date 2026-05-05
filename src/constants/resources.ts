import type { ResourceDefinition } from '@/types/rbac'

/**
 * 系統資源定義
 * 用於權限矩陣配置與側邊欄可見性控制
 * resource key 對應各頁面的路由名稱
 */
export const RESOURCES: ResourceDefinition[] = [
  // 儀表板（§3.9 即時航班配額）
  {
    key: 'dashboard-overview',
    label: '儀表板（即時航班配額）',
    category: '儀表板'
  },

  // 售票作業
  {
    key: 'dashboard',
    label: '建立訂單（訂位作業）',
    category: '售票作業'
  },
  {
    key: 'order-search',
    label: '訂單管理',
    category: '售票作業'
  },
  {
    key: 'order-management',
    label: '網單查詢',
    category: '售票作業'
  },
  {
    key: 'passenger-list',
    label: '乘客清單',
    category: '售票作業'
  },

  // 系統管理
  {
    key: 'organization-management',
    label: '組織管理',
    category: '系統管理'
  },
  {
    key: 'account-management',
    label: '帳號管理',
    category: '系統管理'
  },
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

  // 票務管理
  {
    key: 'ticket-config',
    label: '票種配置',
    description: '集中管理共用票種名稱與類型清單',
    category: '票務管理'
  },
  {
    key: 'ticket-management',
    label: '票種管理',
    category: '票務管理'
  },
  {
    key: 'route-management',
    label: '航點與航段管理',
    category: '票務管理'
  },
  {
    key: 'special-ticket-whitelist',
    label: '特殊票種白名單',
    category: '票務管理'
  },

  // 報表
  {
    key: 'report',
    label: '報表總覽',
    category: '報表'
  },
  {
    key: 'cash-report',
    label: '票口現金報表',
    category: '報表'
  },
  {
    key: 'dealer-report',
    label: '經銷商報表',
    category: '報表'
  },
  {
    key: 'joint-report',
    label: '聯合報表（跨航商分帳）',
    description: '依各航段分配各航商應收金額，分潤比例與票價無關',
    category: '報表'
  },

  // 船務管理
  {
    key: 'transport-analysis',
    label: '載運分析',
    category: '船務管理'
  },
  {
    key: 'ship-management',
    label: '船隻管理',
    category: '船務管理'
  },
  {
    key: 'schedule-management',
    label: '船班管理',
    category: '船務管理'
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
