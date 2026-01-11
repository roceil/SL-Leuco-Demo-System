import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { TicketType } from '@/types/ticket'
import { getFromStorage, saveToStorage, STORAGE_KEYS } from '@/composables/useLocalStorage'

// Mock 資料
const MOCK_TICKET_TYPES: TicketType[] = [
  {
    id: 'ticket-1',
    name: '全票',
    basePrice: 230,
    discount: 0,
    createdAt: '2024-01-10T00:00:00.000Z',
    updatedAt: '2024-01-10T00:00:00.000Z'
  },
  {
    id: 'ticket-2',
    name: '半票',
    basePrice: 230,
    discount: 115,
    createdAt: '2024-01-10T00:00:00.000Z',
    updatedAt: '2024-01-10T00:00:00.000Z'
  },
  {
    id: 'ticket-3',
    name: '優待票',
    basePrice: 230,
    discount: 45,
    createdAt: '2024-01-10T00:00:00.000Z',
    updatedAt: '2024-01-10T00:00:00.000Z'
  }
]

export const useTicketStore = defineStore('ticket', () => {
  // State - 從 localStorage 讀取，如果沒有則使用 MOCK 資料
  const ticketTypes = ref<TicketType[]>(
    getFromStorage(STORAGE_KEYS.TICKET_TYPES, [...MOCK_TICKET_TYPES])
  )
  const selectedTicketTypeId = ref<string | null>(null)

  // Getters
  const selectedTicketType = computed(() => {
    if (!selectedTicketTypeId.value) return null
    return ticketTypes.value.find((t) => t.id === selectedTicketTypeId.value) || null
  })

  // Actions
  function selectTicketType(ticketTypeId: string | null) {
    selectedTicketTypeId.value = ticketTypeId
  }

  function createTicketType(
    ticketType: Omit<TicketType, 'id' | 'createdAt' | 'updatedAt'>
  ): TicketType {
    const newTicketType: TicketType = {
      ...ticketType,
      id: `ticket-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    ticketTypes.value.push(newTicketType)
    return newTicketType
  }

  function updateTicketType(
    ticketTypeId: string,
    updates: Partial<Omit<TicketType, 'id' | 'createdAt'>>
  ) {
    const index = ticketTypes.value.findIndex((t) => t.id === ticketTypeId)
    if (index !== -1) {
      ticketTypes.value[index] = {
        ...ticketTypes.value[index],
        ...updates,
        updatedAt: new Date().toISOString()
      } as TicketType
    }
  }

  function deleteTicketType(ticketTypeId: string) {
    const index = ticketTypes.value.findIndex((t) => t.id === ticketTypeId)
    if (index !== -1) {
      ticketTypes.value.splice(index, 1)
      if (selectedTicketTypeId.value === ticketTypeId) {
        selectedTicketTypeId.value = null
      }
    }
  }

  // 自動持久化：監聽資料變化並儲存到 localStorage
  watch(
    ticketTypes,
    (newTicketTypes) => {
      saveToStorage(STORAGE_KEYS.TICKET_TYPES, newTicketTypes)
    },
    { deep: true }
  )

  return {
    // State
    ticketTypes,
    selectedTicketTypeId,

    // Getters
    selectedTicketType,

    // Actions
    selectTicketType,
    createTicketType,
    updateTicketType,
    deleteTicketType
  }
})
