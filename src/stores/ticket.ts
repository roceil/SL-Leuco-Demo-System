import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { TicketType, TicketPriceHistory } from '@/types/ticket'
import { apiGet, apiPut } from '@/composables/useLocalStorage'

export const useTicketStore = defineStore('ticket', () => {
  const isLoading = ref(false)
  const ticketTypes = ref<TicketType[]>([])
  const priceHistory = ref<TicketPriceHistory[]>([])
  const selectedTicketTypeId = ref<string | null>(null)

  async function init() {
    isLoading.value = true
    try {
      ;[ticketTypes.value, priceHistory.value] = await Promise.all([
        apiGet<TicketType[]>('ticket_types'),
        apiGet<TicketPriceHistory[]>('ticket_price_history')
      ])
    } finally {
      isLoading.value = false
    }
  }

  // Getters
  const selectedTicketType = computed(() => {
    if (!selectedTicketTypeId.value) return null
    return ticketTypes.value.find((t) => t.id === selectedTicketTypeId.value) || null
  })

  function getTicketsByRoute(fromPortId: string, toPortId: string): TicketType[] {
    return ticketTypes.value.filter(
      (t) => t.route.from === fromPortId && t.route.to === toPortId
    )
  }

  function getPriceHistory(ticketTypeId: string): TicketPriceHistory[] {
    return priceHistory.value
      .filter((h) => h.ticketTypeId === ticketTypeId)
      .sort((a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime())
  }

  function getEffectivePrice(ticketTypeId: string, date: Date): TicketPriceHistory | null {
    const history = priceHistory.value
      .filter((h) => h.ticketTypeId === ticketTypeId)
      .filter((h) => new Date(h.effectiveDate) <= date)
      .sort((a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime())

    return history[0] || null
  }

  // Actions - TicketType
  function selectTicketType(ticketTypeId: string | null) {
    selectedTicketTypeId.value = ticketTypeId
  }

  function createTicketType(
    ticketType: Omit<TicketType, 'id' | 'createdAt' | 'updatedAt'>,
    createHistory: boolean = true,
    createdBy?: string
  ): TicketType {
    const newTicketType: TicketType = {
      ...ticketType,
      id: `ticket-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    ticketTypes.value.push(newTicketType)
    apiPut('ticket_types', ticketTypes.value)

    if (createHistory && createdBy) {
      createPriceHistory({
        ticketTypeId: newTicketType.id,
        facePrice: ticketType.facePrice,
        segmentDiscounts: ticketType.segmentDiscounts,
        effectiveDate: new Date().toISOString(),
        createdBy,
        note: '建立票種'
      })
    }

    return newTicketType
  }

  function updateTicketType(
    ticketTypeId: string,
    updates: Partial<Omit<TicketType, 'id' | 'createdAt'>>,
    createHistory: boolean = false,
    updatedBy?: string
  ) {
    const index = ticketTypes.value.findIndex((t) => t.id === ticketTypeId)
    if (index !== -1) {
      const oldTicket = ticketTypes.value[index]

      ticketTypes.value[index] = {
        ...oldTicket,
        ...updates,
        updatedAt: new Date().toISOString()
      } as TicketType
      apiPut('ticket_types', ticketTypes.value)

      const updatedTicket = ticketTypes.value[index]
      const priceChanged =
        (updates.facePrice !== undefined && updates.facePrice !== oldTicket!.facePrice) ||
        updates.segmentDiscounts !== undefined

      if (createHistory && priceChanged && updatedBy) {
        createPriceHistory({
          ticketTypeId,
          facePrice: updatedTicket.facePrice,
          segmentDiscounts: updatedTicket.segmentDiscounts,
          effectiveDate: new Date().toISOString(),
          createdBy: updatedBy,
          note: '更新票價'
        })
      }
    }
  }

  function deleteTicketType(ticketTypeId: string) {
    const index = ticketTypes.value.findIndex((t) => t.id === ticketTypeId)
    if (index !== -1) {
      ticketTypes.value.splice(index, 1)
      if (selectedTicketTypeId.value === ticketTypeId) selectedTicketTypeId.value = null
      priceHistory.value = priceHistory.value.filter((h) => h.ticketTypeId !== ticketTypeId)
      apiPut('ticket_types', ticketTypes.value)
      apiPut('ticket_price_history', priceHistory.value)
    }
  }

  // Actions - PriceHistory
  function createPriceHistory(
    history: Omit<TicketPriceHistory, 'id' | 'createdAt'>
  ): TicketPriceHistory {
    const newHistory: TicketPriceHistory = {
      ...history,
      id: `price-history-${Date.now()}`,
      createdAt: new Date().toISOString()
    }
    priceHistory.value.push(newHistory)
    apiPut('ticket_price_history', priceHistory.value)
    return newHistory
  }

  return {
    // State
    isLoading,
    ticketTypes,
    priceHistory,
    selectedTicketTypeId,

    // Getters
    selectedTicketType,
    getTicketsByRoute,
    getPriceHistory,
    getEffectivePrice,

    // Actions
    init,
    selectTicketType,
    createTicketType,
    updateTicketType,
    deleteTicketType,
    createPriceHistory
  }
})
