import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  Role,
  PermissionGroup,
  Organization,
  Account,
  Permission
} from '@/types/rbac'
import { PermissionAction } from '@/types/rbac'
import { apiGet, apiPut } from '@/composables/useLocalStorage'

export const useRbacStore = defineStore('rbac', () => {
  const isLoading = ref(false)
  const roles = ref<Role[]>([])
  const permissionGroups = ref<PermissionGroup[]>([])
  const organizations = ref<Organization[]>([])
  const accounts = ref<Account[]>([])

  const selectedRoleId = ref<string | null>(null)
  const selectedPermissionGroupId = ref<string | null>(null)
  const selectedAccountId = ref<string | null>(null)

  async function init() {
    isLoading.value = true
    try {
      ;[roles.value, permissionGroups.value, organizations.value, accounts.value] =
        await Promise.all([
          apiGet<Role[]>('rbac_roles'),
          apiGet<PermissionGroup[]>('rbac_permission_groups'),
          apiGet<Organization[]>('rbac_organizations'),
          apiGet<Account[]>('rbac_accounts')
        ])
    } finally {
      isLoading.value = false
    }
  }

  // Getters
  const selectedRole = computed(() => {
    if (!selectedRoleId.value) return null
    return roles.value.find((r) => r.id === selectedRoleId.value) || null
  })

  const selectedPermissionGroup = computed(() => {
    if (!selectedPermissionGroupId.value) return null
    return permissionGroups.value.find((pg) => pg.id === selectedPermissionGroupId.value) || null
  })

  const selectedAccount = computed(() => {
    if (!selectedAccountId.value) return null
    return accounts.value.find((a) => a.id === selectedAccountId.value) || null
  })

  const getRolesByOrganization = computed(() => {
    return (orgId: string) => roles.value.filter((r) => r.organizationId === orgId)
  })

  // Actions - 角色管理
  function selectRole(roleId: string | null) {
    selectedRoleId.value = roleId
  }

  function createRole(role: Omit<Role, 'id' | 'createdAt' | 'updatedAt'>): Role {
    const newRole: Role = {
      ...role,
      id: `role-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    roles.value.push(newRole)
    apiPut('rbac_roles', roles.value)
    return newRole
  }

  function updateRole(roleId: string, updates: Partial<Omit<Role, 'id' | 'createdAt'>>) {
    const index = roles.value.findIndex((r) => r.id === roleId)
    if (index !== -1) {
      roles.value[index] = {
        ...roles.value[index],
        ...updates,
        updatedAt: new Date().toISOString()
      } as Role
      apiPut('rbac_roles', roles.value)
    }
  }

  function deleteRole(roleId: string) {
    const index = roles.value.findIndex((r) => r.id === roleId)
    if (index !== -1) {
      roles.value.splice(index, 1)
      if (selectedRoleId.value === roleId) selectedRoleId.value = null
      apiPut('rbac_roles', roles.value)
    }
  }

  // Actions - 權限組管理
  function selectPermissionGroup(groupId: string | null) {
    selectedPermissionGroupId.value = groupId
  }

  function createPermissionGroup(
    group: Omit<PermissionGroup, 'id' | 'createdAt' | 'updatedAt'>
  ): PermissionGroup {
    const newGroup: PermissionGroup = {
      ...group,
      id: `pg-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    permissionGroups.value.push(newGroup)
    apiPut('rbac_permission_groups', permissionGroups.value)
    return newGroup
  }

  function updatePermissionGroup(
    groupId: string,
    updates: Partial<Omit<PermissionGroup, 'id' | 'createdAt'>>
  ) {
    const index = permissionGroups.value.findIndex((pg) => pg.id === groupId)
    if (index !== -1) {
      permissionGroups.value[index] = {
        ...permissionGroups.value[index],
        ...updates,
        updatedAt: new Date().toISOString()
      } as PermissionGroup
      apiPut('rbac_permission_groups', permissionGroups.value)
    }
  }

  function deletePermissionGroup(groupId: string) {
    const index = permissionGroups.value.findIndex((pg) => pg.id === groupId)
    if (index !== -1) {
      permissionGroups.value.splice(index, 1)
      if (selectedPermissionGroupId.value === groupId) selectedPermissionGroupId.value = null

      roles.value.forEach((role) => {
        const pgIndex = role.permissionGroupIds.indexOf(groupId)
        if (pgIndex !== -1) {
          role.permissionGroupIds.splice(pgIndex, 1)
        }
      })
      apiPut('rbac_permission_groups', permissionGroups.value)
      apiPut('rbac_roles', roles.value)
    }
  }

  // 權限檢查工具
  function hasPermission(
    accountId: string,
    resource: string,
    action: PermissionAction
  ): boolean {
    const account = accounts.value.find((a) => a.id === accountId)
    if (!account) return false

    const role = roles.value.find((r) => r.id === account.roleId)
    if (!role) return false

    const groups = permissionGroups.value.filter((pg) =>
      role.permissionGroupIds.includes(pg.id)
    )

    return groups.some((group) =>
      group.permissions.some(
        (permission) =>
          permission.resource === resource && permission.actions.includes(action)
      )
    )
  }

  function getAccountPermissions(accountId: string): Permission[] {
    const account = accounts.value.find((a) => a.id === accountId)
    if (!account) return []

    const role = roles.value.find((r) => r.id === account.roleId)
    if (!role) return []

    const groups = permissionGroups.value.filter((pg) =>
      role.permissionGroupIds.includes(pg.id)
    )

    const permissionsMap = new Map<string, Set<PermissionAction>>()

    groups.forEach((group) => {
      group.permissions.forEach((permission) => {
        if (!permissionsMap.has(permission.resource)) {
          permissionsMap.set(permission.resource, new Set())
        }
        permission.actions.forEach((action) => {
          permissionsMap.get(permission.resource)!.add(action)
        })
      })
    })

    return Array.from(permissionsMap.entries()).map(([resource, actionsSet]) => ({
      resource,
      actions: Array.from(actionsSet)
    }))
  }

  // Actions - 組織管理
  async function createOrganization(
    data: Omit<Organization, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Organization> {
    const newOrg: Organization = {
      ...data,
      id: `org-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    organizations.value.push(newOrg)
    await apiPut('rbac_organizations', organizations.value)
    return newOrg
  }

  async function updateOrganization(
    id: string,
    data: Partial<Omit<Organization, 'id' | 'code' | 'createdAt'>>
  ): Promise<void> {
    const index = organizations.value.findIndex((o) => o.id === id)
    if (index !== -1) {
      // code 為不可修改欄位，刻意忽略 caller 傳入的 code（雙重保險）
      organizations.value[index] = {
        ...organizations.value[index],
        ...data,
        updatedAt: new Date().toISOString()
      } as Organization
      await apiPut('rbac_organizations', organizations.value)
    }
  }

  async function deleteOrganization(id: string): Promise<void> {
    const hasAccounts = accounts.value.some((a) => a.organizationId === id)
    if (hasAccounts) {
      throw new Error('此航商仍有關聯帳號，無法刪除')
    }
    const index = organizations.value.findIndex((o) => o.id === id)
    if (index !== -1) {
      organizations.value.splice(index, 1)
      await apiPut('rbac_organizations', organizations.value)
    }
  }

  /**
   * 判斷某個帳號是否可對特定資源（含組織歸屬）執行操作
   * manage-schedule 的 READ 為唯一允許跨組織的資源
   */
  function canAccessResource(
    accountId: string,
    resource: string,
    action: PermissionAction,
    resourceOrgId?: string
  ): boolean {
    if (!hasPermission(accountId, resource, action)) return false
    if (!resourceOrgId) return true

    const account = accounts.value.find((a) => a.id === accountId)
    if (!account) return false

    // manage-schedule 的 READ 允許跨組織
    if (resource === 'manage-schedule' && action === PermissionAction.READ) return true

    // super_admin 無組織限制
    const role = roles.value.find((r) => r.id === account.roleId)
    if (role?.roleTemplate === 'super_admin') return true

    // 其他角色只能存取本組織資源
    return account.organizationId === resourceOrgId
  }

  /**
   * 判斷帳號是否為 super_admin
   */
  function isSuperAdmin(accountId: string): boolean {
    const account = accounts.value.find((a) => a.id === accountId)
    if (!account) return false
    const role = roles.value.find((r) => r.id === account.roleId)
    return role?.roleTemplate === 'super_admin'
  }

  /**
   * 取得帳號所屬組織 ID
   */
  function getAccountOrgId(accountId: string): string | null {
    const account = accounts.value.find((a) => a.id === accountId)
    return account?.organizationId ?? null
  }

  // Actions - 帳號管理
  function selectAccount(accountId: string | null) {
    selectedAccountId.value = accountId
  }

  function createAccount(account: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>): Account {
    const newAccount: Account = {
      ...account,
      id: `acc-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    accounts.value.push(newAccount)
    apiPut('rbac_accounts', accounts.value)
    return newAccount
  }

  function updateAccount(accountId: string, updates: Partial<Omit<Account, 'id' | 'createdAt'>>) {
    const index = accounts.value.findIndex((a) => a.id === accountId)
    if (index !== -1) {
      accounts.value[index] = {
        ...accounts.value[index],
        ...updates,
        updatedAt: new Date().toISOString()
      } as Account
      apiPut('rbac_accounts', accounts.value)
    }
  }

  function deleteAccount(accountId: string) {
    const index = accounts.value.findIndex((a) => a.id === accountId)
    if (index !== -1) {
      accounts.value.splice(index, 1)
      if (selectedAccountId.value === accountId) selectedAccountId.value = null
      apiPut('rbac_accounts', accounts.value)
    }
  }

  return {
    // State
    isLoading,
    roles,
    permissionGroups,
    organizations,
    accounts,
    selectedRoleId,
    selectedPermissionGroupId,
    selectedAccountId,

    // Getters
    selectedRole,
    selectedPermissionGroup,
    selectedAccount,
    getRolesByOrganization,

    // Actions
    init,
    selectRole,
    createRole,
    updateRole,
    deleteRole,
    selectPermissionGroup,
    createPermissionGroup,
    updatePermissionGroup,
    deletePermissionGroup,
    createOrganization,
    updateOrganization,
    deleteOrganization,
    selectAccount,
    createAccount,
    updateAccount,
    deleteAccount,
    hasPermission,
    canAccessResource,
    isSuperAdmin,
    getAccountOrgId,
    getAccountPermissions
  }
})
