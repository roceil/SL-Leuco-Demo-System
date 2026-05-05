/**
 * §3.7.1 日結支出 + 手動關帳
 */

import { ref } from 'vue'
import { apiGet, apiPut } from './useLocalStorage'
import { useAuditLog } from './useAuditLog'
import type { DailySettlement, DailyExpense, ExpenseCategory } from '@/types/settlement'

const settlements = ref<DailySettlement[]>([])

export async function initDailySettlement(): Promise<void> {
  try {
    settlements.value = await apiGet<DailySettlement[]>('daily_settlements')
  } catch (e) {
    console.warn('[daily-settlement] init failed:', e)
    settlements.value = []
  }
}

export function useDailySettlement() {
  const { logCrud } = useAuditLog()

  function getOrInit(date: string): DailySettlement {
    let s = settlements.value.find((x) => x.date === date)
    if (!s) {
      const now = new Date().toISOString()
      s = {
        id: date,
        date,
        expenses: [],
        isClosed: false,
        createdAt: now,
        updatedAt: now,
      }
      settlements.value.push(s)
      apiPut('daily_settlements', settlements.value)
    }
    return s
  }

  function isDateClosed(date: string): boolean {
    return settlements.value.find((s) => s.date === date)?.isClosed === true
  }

  function listExpenses(date: string): DailyExpense[] {
    return getOrInit(date).expenses
  }

  function totalExpenses(date: string): number {
    return listExpenses(date).reduce((sum, e) => sum + e.amount, 0)
  }

  function addExpense(
    date: string,
    category: ExpenseCategory,
    amount: number,
    note: string,
    createdBy: string
  ): DailyExpense | null {
    const s = getOrInit(date)
    if (s.isClosed) return null

    const exp: DailyExpense = {
      id: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      category,
      amount,
      note: note?.trim() || undefined,
      createdBy,
      createdAt: new Date().toISOString(),
    }
    s.expenses.push(exp)
    s.updatedAt = new Date().toISOString()
    apiPut('daily_settlements', settlements.value)

    void logCrud({
      entityType: 'order',
      entityId: `settlement-${date}-${exp.id}`,
      entityName: `${date} ${category} ${amount}`,
      action: 'create',
      note: '日結支出新增',
    })
    return exp
  }

  function removeExpense(date: string, expenseId: string) {
    const s = settlements.value.find((x) => x.date === date)
    if (!s || s.isClosed) return
    const i = s.expenses.findIndex((e) => e.id === expenseId)
    if (i === -1) return
    const removed = s.expenses[i]!
    s.expenses.splice(i, 1)
    s.updatedAt = new Date().toISOString()
    apiPut('daily_settlements', settlements.value)
    void logCrud({
      entityType: 'order',
      entityId: `settlement-${date}-${expenseId}`,
      entityName: `${date} 刪除支出 ${removed.amount}`,
      action: 'delete',
    })
  }

  function closeDate(date: string, closedBy: string): boolean {
    const s = getOrInit(date)
    if (s.isClosed) return false
    s.isClosed = true
    s.closedAt = new Date().toISOString()
    s.closedBy = closedBy
    s.updatedAt = new Date().toISOString()
    apiPut('daily_settlements', settlements.value)
    void logCrud({
      entityType: 'order',
      entityId: `settlement-${date}`,
      entityName: `${date} 關帳`,
      action: 'update',
      note: '手動關帳',
    })
    return true
  }

  function reopenDate(date: string, reopenedBy: string): boolean {
    const s = settlements.value.find((x) => x.date === date)
    if (!s || !s.isClosed) return false
    s.isClosed = false
    s.closedAt = undefined
    s.closedBy = undefined
    s.updatedAt = new Date().toISOString()
    apiPut('daily_settlements', settlements.value)
    void logCrud({
      entityType: 'order',
      entityId: `settlement-${date}`,
      entityName: `${date} 重開帳`,
      action: 'update',
      note: `重開帳 by ${reopenedBy}`,
    })
    return true
  }

  return {
    settlements,
    getOrInit,
    isDateClosed,
    listExpenses,
    totalExpenses,
    addExpense,
    removeExpense,
    closeDate,
    reopenDate,
  }
}
