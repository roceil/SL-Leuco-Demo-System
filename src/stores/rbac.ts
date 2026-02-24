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
    selectAccount,
    createAccount,
    updateAccount,
    deleteAccount,
    hasPermission,
    getAccountPermissions
  }
})
