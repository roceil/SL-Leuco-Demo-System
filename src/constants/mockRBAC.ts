import type {
  Organization,
  PermissionGroup,
  Role,
  Account,
  Permission
} from '@/types/rbac'
import { PermissionAction } from '@/types/rbac'

/**
 * Mock 資料 - 機構
 */
export const MOCK_ORGANIZATIONS: Organization[] = [
  {
    id: 'org-1',
    name: '東琉聯營處'
  },
  {
    id: 'org-2',
    name: '系統管理'
  }
]

/**
 * Mock 資料 - 權限組
 */
export const MOCK_PERMISSION_GROUPS: PermissionGroup[] = [
  {
    id: 'pg-1',
    name: '系統管理權限',
    permissions: [
      {
        resource: 'admin',
        actions: [
          PermissionAction.READ,
          PermissionAction.CREATE,
          PermissionAction.UPDATE,
          PermissionAction.DELETE
        ]
      },
      {
        resource: 'manage-role',
        actions: [
          PermissionAction.READ,
          PermissionAction.CREATE,
          PermissionAction.UPDATE,
          PermissionAction.DELETE
        ]
      },
      {
        resource: 'manage-permission',
        actions: [
          PermissionAction.READ,
          PermissionAction.CREATE,
          PermissionAction.UPDATE,
          PermissionAction.DELETE
        ]
      },
      {
        resource: 'manage-account',
        actions: [
          PermissionAction.READ,
          PermissionAction.CREATE,
          PermissionAction.UPDATE,
          PermissionAction.DELETE
        ]
      }
    ],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'pg-2',
    name: '訂單管理權限',
    permissions: [
      {
        resource: 'manage-order',
        actions: [
          PermissionAction.READ,
          PermissionAction.CREATE,
          PermissionAction.UPDATE,
          PermissionAction.DELETE
        ]
      },
      {
        resource: 'order-search',
        actions: [PermissionAction.READ]
      }
    ],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'pg-3',
    name: '報表查詢權限',
    permissions: [
      {
        resource: 'report',
        actions: [PermissionAction.READ]
      },
      {
        resource: 'report-detail',
        actions: [PermissionAction.READ]
      }
    ],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'pg-4',
    name: '一般使用者權限',
    permissions: [
      {
        resource: 'account-settings',
        actions: [PermissionAction.READ, PermissionAction.UPDATE]
      },
      {
        resource: 'order-search',
        actions: [PermissionAction.READ]
      }
    ],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'pg-5',
    name: '經銷商管理權限',
    permissions: [
      {
        resource: 'manage-distributor',
        actions: [
          PermissionAction.READ,
          PermissionAction.CREATE,
          PermissionAction.UPDATE,
          PermissionAction.DELETE
        ]
      }
    ],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
]

/**
 * Mock 資料 - 角色
 */
export const MOCK_ROLES: Role[] = [
  {
    id: 'role-1',
    name: '系統管理員',
    organizationId: 'org-2',
    loginRoute: '/dashboard',
    hasBackendAccess: true,
    permissionGroupIds: ['pg-1', 'pg-2', 'pg-3', 'pg-5'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'role-2',
    name: '訂單管理員',
    organizationId: 'org-1',
    loginRoute: '/order-search',
    hasBackendAccess: true,
    permissionGroupIds: ['pg-2', 'pg-4'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'role-3',
    name: '一般使用者',
    organizationId: 'org-1',
    loginRoute: '/dashboard',
    hasBackendAccess: false,
    permissionGroupIds: ['pg-4'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'role-4',
    name: '報表查詢員',
    organizationId: 'org-1',
    loginRoute: '/report',
    hasBackendAccess: true,
    permissionGroupIds: ['pg-3', 'pg-4'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'role-5',
    name: '經銷商管理員',
    organizationId: 'org-1',
    loginRoute: '/dashboard',
    hasBackendAccess: true,
    permissionGroupIds: ['pg-4', 'pg-5'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
]

/**
 * Mock 資料 - 帳戶
 */
export const MOCK_ACCOUNTS: Account[] = [
  {
    id: 'acc-1',
    username: 'admin',
    name: '系統管理員帳號',
    contactPerson: '王小明',
    contactPhone: '0912-345-678',
    organizationId: 'org-2',
    roleId: 'role-1',
    verified: true,
    availableTicketTypes: ['ticket-1', 'ticket-2', 'ticket-3'],
    ticketPriceSettings: [
      {
        id: 'price-1-1',
        ticketTypeId: 'ticket-1',
        customPrice: 230,
        effectiveDate: '2024-01-01',
        createdAt: '2024-01-01T00:00:00Z'
      },
      {
        id: 'price-1-2',
        ticketTypeId: 'ticket-2',
        customPrice: 115,
        effectiveDate: '2024-01-01',
        createdAt: '2024-01-01T00:00:00Z'
      },
      {
        id: 'price-1-3',
        ticketTypeId: 'ticket-3',
        customPrice: 185,
        effectiveDate: '2024-01-01',
        createdAt: '2024-01-01T00:00:00Z'
      }
    ],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'acc-2',
    username: 'order_manager',
    name: '訂單管理員帳號',
    contactPerson: '李美華',
    contactPhone: '0923-456-789',
    organizationId: 'org-1',
    roleId: 'role-2',
    verified: true,
    availableTicketTypes: ['ticket-1', 'ticket-2'],
    ticketPriceSettings: [
      {
        id: 'price-2-1',
        ticketTypeId: 'ticket-1',
        customPrice: 230,
        effectiveDate: '2024-01-01',
        createdAt: '2024-01-01T00:00:00Z'
      },
      {
        id: 'price-2-2',
        ticketTypeId: 'ticket-2',
        customPrice: 115,
        effectiveDate: '2024-01-01',
        createdAt: '2024-01-01T00:00:00Z'
      }
    ],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'acc-3',
    username: 'user001',
    name: '一般使用者帳號',
    contactPerson: '張志明',
    contactPhone: '0934-567-890',
    organizationId: 'org-1',
    roleId: 'role-3',
    verified: true,
    availableTicketTypes: ['ticket-1'],
    ticketPriceSettings: [
      {
        id: 'price-3-1',
        ticketTypeId: 'ticket-1',
        customPrice: 200,
        effectiveDate: '2024-01-01',
        createdAt: '2024-01-01T00:00:00Z'
      }
    ],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'acc-4',
    username: 'distributor001',
    name: '經銷商A',
    contactPerson: '陳大同',
    contactPhone: '0945-678-901',
    organizationId: 'org-1',
    roleId: 'role-5',
    verified: true,
    availableTicketTypes: ['ticket-1', 'ticket-2', 'ticket-3'],
    ticketPriceSettings: [
      {
        id: 'price-4-1',
        ticketTypeId: 'ticket-1',
        customPrice: 210,
        effectiveDate: '2024-01-01',
        createdAt: '2024-01-01T00:00:00Z'
      },
      {
        id: 'price-4-2',
        ticketTypeId: 'ticket-2',
        customPrice: 105,
        effectiveDate: '2024-01-01',
        createdAt: '2024-01-01T00:00:00Z'
      },
      {
        id: 'price-4-3',
        ticketTypeId: 'ticket-3',
        customPrice: 175,
        effectiveDate: '2024-01-01',
        createdAt: '2024-01-01T00:00:00Z'
      }
    ],
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z'
  },
  {
    id: 'acc-5',
    username: 'distributor002',
    name: '經銷商B',
    contactPerson: '林小芳',
    contactPhone: '0956-789-012',
    organizationId: 'org-1',
    roleId: 'role-5',
    verified: false,
    availableTicketTypes: ['ticket-1', 'ticket-3'],
    ticketPriceSettings: [
      {
        id: 'price-5-1',
        ticketTypeId: 'ticket-1',
        customPrice: 215,
        effectiveDate: '2024-01-01',
        createdAt: '2024-01-01T00:00:00Z'
      },
      {
        id: 'price-5-2',
        ticketTypeId: 'ticket-3',
        customPrice: 180,
        effectiveDate: '2024-01-01',
        createdAt: '2024-01-01T00:00:00Z'
      }
    ],
    createdAt: '2024-01-03T00:00:00Z',
    updatedAt: '2024-01-03T00:00:00Z'
  }
]
