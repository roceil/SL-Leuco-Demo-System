/**
 * §3.14.2 票種配置
 * 集中管理票種名稱與票種類型兩張共用清單，作為各航商建立票種時的下拉來源
 */

import { computed, ref } from 'vue'
import { apiGet, apiPut } from './useLocalStorage'
import { useAuditLog } from './useAuditLog'
import type { TicketNameOption, TicketTypeOption } from '@/types/ticket'

const nameOptions = ref<TicketNameOption[]>([])
const typeOptions = ref<TicketTypeOption[]>([])

/** 啟動時呼叫一次（main.ts bootstrap） */
export async function initTicketConfig(): Promise<void> {
  try {
    ;[nameOptions.value, typeOptions.value] = await Promise.all([
      apiGet<TicketNameOption[]>('ticket_name_options'),
      apiGet<TicketTypeOption[]>('ticket_type_options'),
    ])
  } catch (e) {
    console.warn('[ticket-config] init failed:', e)
    nameOptions.value = []
    typeOptions.value = []
  }
}

export function useTicketConfig() {
  const { logCrud, generateChanges } = useAuditLog()

  // 給下拉用：只回傳啟用中的選項
  const activeNameOptions = computed(() =>
    nameOptions.value.filter((o) => o.isActive)
  )
  const activeTypeOptions = computed(() =>
    typeOptions.value.filter((o) => o.isActive)
  )

  // ---------- 票種名稱 CRUD ----------
  function addNameOption(name: string): TicketNameOption | null {
    const trimmed = name.trim()
    if (!trimmed) return null
    if (nameOptions.value.some((o) => o.name === trimmed)) return null
    const now = new Date().toISOString()
    const item: TicketNameOption = {
      id: `tno-${Date.now()}`,
      name: trimmed,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    }
    nameOptions.value.push(item)
    apiPut('ticket_name_options', nameOptions.value)

    void logCrud({
      entityType: 'ticket_name_option',
      entityId: item.id,
      entityName: item.name,
      action: 'create'
    })
    return item
  }

  function updateNameOption(id: string, updates: Partial<Pick<TicketNameOption, 'name' | 'isActive'>>) {
    const i = nameOptions.value.findIndex((o) => o.id === id)
    if (i === -1) return
    const oldOption = nameOptions.value[i]!
    nameOptions.value[i] = {
      ...nameOptions.value[i]!,
      ...updates,
      updatedAt: new Date().toISOString(),
    }
    apiPut('ticket_name_options', nameOptions.value)

    const updatedOption = nameOptions.value[i]!
    void logCrud({
      entityType: 'ticket_name_option',
      entityId: id,
      entityName: updatedOption.name,
      action: 'update',
      changes: generateChanges(oldOption, updatedOption)
    })
  }

  function toggleNameOptionActive(id: string) {
    const o = nameOptions.value.find((x) => x.id === id)
    if (o) updateNameOption(id, { isActive: !o.isActive })
  }

  function deleteNameOption(id: string) {
    const i = nameOptions.value.findIndex((o) => o.id === id)
    if (i !== -1) {
      const removed = nameOptions.value[i]!
      nameOptions.value.splice(i, 1)
      apiPut('ticket_name_options', nameOptions.value)

      void logCrud({
        entityType: 'ticket_name_option',
        entityId: id,
        entityName: removed.name,
        action: 'delete'
      })
    }
  }

  // ---------- 票種類型 CRUD ----------
  function addTypeOption(name: string): TicketTypeOption | null {
    const trimmed = name.trim()
    if (!trimmed) return null
    if (typeOptions.value.some((o) => o.name === trimmed)) return null
    const now = new Date().toISOString()
    const item: TicketTypeOption = {
      id: `tto-${Date.now()}`,
      name: trimmed,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    }
    typeOptions.value.push(item)
    apiPut('ticket_type_options', typeOptions.value)

    void logCrud({
      entityType: 'ticket_type_option',
      entityId: item.id,
      entityName: item.name,
      action: 'create'
    })
    return item
  }

  function updateTypeOption(id: string, updates: Partial<Pick<TicketTypeOption, 'name' | 'isActive'>>) {
    const i = typeOptions.value.findIndex((o) => o.id === id)
    if (i === -1) return
    const oldOption = typeOptions.value[i]!
    typeOptions.value[i] = {
      ...typeOptions.value[i]!,
      ...updates,
      updatedAt: new Date().toISOString(),
    }
    apiPut('ticket_type_options', typeOptions.value)

    const updatedOption = typeOptions.value[i]!
    void logCrud({
      entityType: 'ticket_type_option',
      entityId: id,
      entityName: updatedOption.name,
      action: 'update',
      changes: generateChanges(oldOption, updatedOption)
    })
  }

  function toggleTypeOptionActive(id: string) {
    const o = typeOptions.value.find((x) => x.id === id)
    if (o) updateTypeOption(id, { isActive: !o.isActive })
  }

  function deleteTypeOption(id: string) {
    const i = typeOptions.value.findIndex((o) => o.id === id)
    if (i !== -1) {
      const removed = typeOptions.value[i]!
      typeOptions.value.splice(i, 1)
      apiPut('ticket_type_options', typeOptions.value)

      void logCrud({
        entityType: 'ticket_type_option',
        entityId: id,
        entityName: removed.name,
        action: 'delete'
      })
    }
  }

  return {
    nameOptions,
    typeOptions,
    activeNameOptions,
    activeTypeOptions,
    addNameOption,
    updateNameOption,
    toggleNameOptionActive,
    deleteNameOption,
    addTypeOption,
    updateTypeOption,
    toggleTypeOptionActive,
    deleteTypeOption,
  }
}
