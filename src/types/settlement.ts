/**
 * §3.7.1 日報表 — 日結支出與關帳
 */

export type ExpenseCategory = 'misc' | 'fee' | 'occasional'

export interface DailyExpense {
  id: string
  category: ExpenseCategory // 雜支 / 手續費 / 臨時費用
  amount: number
  note?: string
  createdBy: string // 帳號 ID
  createdAt: string
}

export interface DailySettlement {
  /** 日期作為主鍵（YYYY-MM-DD） */
  id: string
  date: string // YYYY-MM-DD
  expenses: DailyExpense[]
  isClosed: boolean // 是否已關帳
  closedAt?: string
  closedBy?: string
  createdAt: string
  updatedAt: string
}

export const EXPENSE_CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  misc: '雜支',
  fee: '手續費',
  occasional: '臨時費用',
}
