/**
 * 付款管理 Composable
 * 提供付款相關的計算和驗證功能
 */

import type {
  PaymentInfo,
  PaymentRecord,
  PaymentMethod,
  PaymentStatus
} from '@/types/order'
import { calculatePaymentAmounts, getPaymentStatus } from '@/types/order'

export function usePayment() {
  /**
   * 建立新的付款記錄
   */
  function createPaymentRecord(
    amount: number,
    method: PaymentMethod,
    paidBy: string,
    note?: string
  ): PaymentRecord {
    return {
      id: `payment-${Date.now()}`,
      amount,
      method,
      paidAt: new Date().toISOString(),
      paidBy,
      note
    }
  }

  /**
   * 新增付款記錄到付款資訊
   */
  function addPaymentRecord(
    paymentInfo: PaymentInfo,
    record: PaymentRecord
  ): PaymentInfo {
    const newRecords = [...paymentInfo.paymentRecords, record]
    const amounts = calculatePaymentAmounts({
      ...paymentInfo,
      paymentRecords: newRecords
    })

    return {
      ...paymentInfo,
      paymentRecords: newRecords,
      paidAmount: amounts.paidAmount,
      remainingAmount: amounts.remainingAmount,
      paymentStatus: getPaymentStatus(amounts.paidAmount, amounts.totalAmount)
    }
  }

  /**
   * 計算訂單總金額
   */
  function calculateTotalAmount(
    deposit: number,
    balance: number,
    discount: number
  ): number {
    return Math.max(0, deposit + balance - discount)
  }

  /**
   * 計算已付金額
   */
  function calculatePaidAmount(records: PaymentRecord[]): number {
    return records.reduce((sum, record) => sum + record.amount, 0)
  }

  /**
   * 計算剩餘應付金額
   */
  function calculateRemainingAmount(totalAmount: number, paidAmount: number): number {
    return Math.max(0, totalAmount - paidAmount)
  }

  /**
   * 驗證付款金額是否有效
   */
  function validatePaymentAmount(
    amount: number,
    remainingAmount: number
  ): { isValid: boolean; error?: string } {
    if (amount <= 0) {
      return { isValid: false, error: '付款金額必須大於 0' }
    }

    if (amount > remainingAmount) {
      return {
        isValid: false,
        error: `付款金額不能超過剩餘應付金額 NT$ ${remainingAmount}`
      }
    }

    return { isValid: true }
  }

  /**
   * 初始化付款資訊
   */
  function initializePaymentInfo(
    deposit: number = 0,
    balance: number = 0,
    discount: number = 0,
    method: PaymentMethod = 'cash'
  ): PaymentInfo {
    const totalAmount = calculateTotalAmount(deposit, balance, discount)

    return {
      deposit,
      balance,
      discount,
      totalAmount,
      paidAmount: 0,
      remainingAmount: totalAmount,
      paymentMethod: method,
      paymentStatus: 'unpaid',
      paymentRecords: []
    }
  }

  /**
   * 更新付款資訊（重新計算所有金額）
   */
  function updatePaymentInfo(
    paymentInfo: PaymentInfo,
    updates: Partial<Pick<PaymentInfo, 'deposit' | 'balance' | 'discount' | 'paymentMethod'>>
  ): PaymentInfo {
    const updated = { ...paymentInfo, ...updates }
    const amounts = calculatePaymentAmounts(updated)

    return {
      ...updated,
      totalAmount: amounts.totalAmount,
      paidAmount: amounts.paidAmount,
      remainingAmount: amounts.remainingAmount,
      paymentStatus: getPaymentStatus(amounts.paidAmount, amounts.totalAmount)
    }
  }

  /**
   * 檢查是否可以出票
   */
  function canIssueTicket(paymentInfo: PaymentInfo): {
    canIssue: boolean
    reason?: string
  } {
    if (paymentInfo.paidAmount < paymentInfo.deposit) {
      return {
        canIssue: false,
        reason: `訂金尚未完全支付（已付 NT$ ${paymentInfo.paidAmount}，訂金 NT$ ${paymentInfo.deposit}）`
      }
    }

    return { canIssue: true }
  }

  /**
   * 格式化付款方式顯示文字
   */
  function formatPaymentMethod(method: PaymentMethod): string {
    const methodMap: Record<PaymentMethod, string> = {
      cash: '現金',
      credit_card: '信用卡',
      transfer: '轉帳',
      other: '其他'
    }
    return methodMap[method] || method
  }

  /**
   * 格式化付款狀態顯示文字
   */
  function formatPaymentStatus(status: PaymentStatus): string {
    const statusMap: Record<PaymentStatus, string> = {
      unpaid: '未付款',
      partial: '部分付款',
      paid: '已付款',
      refunded: '已退款'
    }
    return statusMap[status] || status
  }

  /**
   * 取得付款狀態顏色（用於 UI 顯示）
   */
  function getPaymentStatusColor(status: PaymentStatus): string {
    const colorMap: Record<PaymentStatus, string> = {
      unpaid: 'red',
      partial: 'amber',
      paid: 'green',
      refunded: 'gray'
    }
    return colorMap[status] || 'gray'
  }

  return {
    // 付款記錄相關
    createPaymentRecord,
    addPaymentRecord,

    // 金額計算
    calculateTotalAmount,
    calculatePaidAmount,
    calculateRemainingAmount,

    // 驗證
    validatePaymentAmount,
    canIssueTicket,

    // 付款資訊管理
    initializePaymentInfo,
    updatePaymentInfo,

    // 格式化與顯示
    formatPaymentMethod,
    formatPaymentStatus,
    getPaymentStatusColor
  }
}
