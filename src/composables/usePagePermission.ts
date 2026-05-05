/**
 * View 級權限 guard
 *
 * 用法：
 *   const { canCreate, canUpdate, canDelete } = usePagePermission('ticket-management')
 *   <BaseButton v-if="canCreate">新增</BaseButton>
 *   <BaseButton :disabled="!canUpdate">編輯</BaseButton>
 */

import { computed } from 'vue'
import { useAuth } from './useAuth'
import { useRbacStore } from '@/stores/rbac'
import { PermissionAction } from '@/types/rbac'

export function usePagePermission(resource: string) {
  const { currentUser } = useAuth()
  const rbacStore = useRbacStore()

  function check(action: PermissionAction): boolean {
    const username = currentUser.value
    if (!username) return false
    const account = rbacStore.accounts.find((a) => a.username === username)
    if (!account) return false
    return rbacStore.hasPermission(account.id, resource, action)
  }

  return {
    canRead: computed(() => check(PermissionAction.READ)),
    canCreate: computed(() => check(PermissionAction.CREATE)),
    canUpdate: computed(() => check(PermissionAction.UPDATE)),
    canDelete: computed(() => check(PermissionAction.DELETE)),
  }
}
