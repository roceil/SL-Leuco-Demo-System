import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type {
  Role,
  PermissionGroup,
  Organization,
  Account,
  Permission
} from '@/types/rbac'
import { PermissionAction } from '@/types/rbac'
import {
  MOCK_ROLES,
  MOCK_PERMISSION_GROUPS,
  MOCK_ORGANIZATIONS,
  MOCK_ACCOUNTS
} from '@/constants/mockRBAC'
import { getFromStorage, saveToStorage, STORAGE_KEYS } from '@/composables/useLocalStorage'

export const useRbacStore = defineStore('rbac', () => {
  // State - 從 localStorage 讀取，如果沒有則使用 MOCK 資料
  const roles = ref<Role[]>(getFromStorage(STORAGE_KEYS.RBAC_ROLES, [...MOCK_ROLES]))
  const permissionGroups = ref<PermissionGroup[]>(
    getFromStorage(STORAGE_KEYS.RBAC_PERMISSION_GROUPS, [...MOCK_PERMISSION_GROUPS])
  )
  const organizations = ref<Organization[]>(
    getFromStorage(STORAGE_KEYS.RBAC_ORGANIZATIONS, [...MOCK_ORGANIZATIONS])
  )
  const accounts = ref<Account[]>(getFromStorage(STORAGE_KEYS.RBAC_ACCOUNTS, [...MOCK_ACCOUNTS]))

  // 當前選中的角色、權限組和帳號（用於編輯）
  const selectedRoleId = ref<string | null>(null)
  const selectedPermissionGroupId = ref<string | null>(null)
  const selectedAccountId = ref<string | null>(null)

  // Getters
  const selectedRole = computed(() => {
    if (!selectedRoleId.value) return null
    return roles.value.find((r) => r.id === selectedRoleId.value) || null
  })

  const selectedPermissionGroup = computed(() => {
    if (!selectedPermissionGroupId.value) return null
    return (
      permissionGroups.value.find((pg) => pg.id === selectedPermissionGroupId.value) || null
    )
  })

  const selectedAccount = computed(() => {
    if (!selectedAccountId.value) return null
    return accounts.value.find((a) => a.id === selectedAccountId.value) || null
  })

  // 根據機構 ID 獲取角色列表
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
    }
  }

  function deleteRole(roleId: string) {
    const index = roles.value.findIndex((r) => r.id === roleId)
    if (index !== -1) {
      roles.value.splice(index, 1)
      if (selectedRoleId.value === roleId) {
        selectedRoleId.value = null
      }
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
    }
  }

  function deletePermissionGroup(groupId: string) {
    const index = permissionGroups.value.findIndex((pg) => pg.id === groupId)
    if (index !== -1) {
      permissionGroups.value.splice(index, 1)
      if (selectedPermissionGroupId.value === groupId) {
        selectedPermissionGroupId.value = null
      }

      // 移除所有角色中對此權限組的引用
      roles.value.forEach((role) => {
        const pgIndex = role.permissionGroupIds.indexOf(groupId)
        if (pgIndex !== -1) {
          role.permissionGroupIds.splice(pgIndex, 1)
        }
      })
    }
  }

  // 權限檢查工具
  function hasPermission(
    accountId: string,
    resource: string,
    action: PermissionAction
  ): boolean {
    // 1. 獲取帳戶
    const account = accounts.value.find((a) => a.id === accountId)
    if (!account) return false

    // 2. 獲取角色
    const role = roles.value.find((r) => r.id === account.roleId)
    if (!role) return false

    // 3. 獲取所有權限組
    const groups = permissionGroups.value.filter((pg) =>
      role.permissionGroupIds.includes(pg.id)
    )

    // 4. 檢查是否有匹配的權限
    return groups.some((group) =>
      group.permissions.some(
        (permission) =>
          permission.resource === resource && permission.actions.includes(action)
      )
    )
  }

  // 獲取帳戶的所有權限
  function getAccountPermissions(accountId: string): Permission[] {
    const account = accounts.value.find((a) => a.id === accountId)
    if (!account) return []

    const role = roles.value.find((r) => r.id === account.roleId)
    if (!role) return []

    const groups = permissionGroups.value.filter((pg) =>
      role.permissionGroupIds.includes(pg.id)
    )

    // 合併所有權限組的權限
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
    }
  }

  function deleteAccount(accountId: string) {
    const index = accounts.value.findIndex((a) => a.id === accountId)
    if (index !== -1) {
      accounts.value.splice(index, 1)
      if (selectedAccountId.value === accountId) {
        selectedAccountId.value = null
      }
    }
  }

  // 自動持久化：監聽資料變化並儲存到 localStorage
  watch(
    roles,
    (newRoles) => {
      saveToStorage(STORAGE_KEYS.RBAC_ROLES, newRoles)
    },
    { deep: true }
  )

  watch(
    permissionGroups,
    (newGroups) => {
      saveToStorage(STORAGE_KEYS.RBAC_PERMISSION_GROUPS, newGroups)
    },
    { deep: true }
  )

  watch(
    organizations,
    (newOrgs) => {
      saveToStorage(STORAGE_KEYS.RBAC_ORGANIZATIONS, newOrgs)
    },
    { deep: true }
  )

  watch(
    accounts,
    (newAccounts) => {
      saveToStorage(STORAGE_KEYS.RBAC_ACCOUNTS, newAccounts)
    },
    { deep: true }
  )

  return {
    // State
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
