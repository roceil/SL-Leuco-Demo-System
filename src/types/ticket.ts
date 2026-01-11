/**
 * 票種管理系統類型定義
 */

// 票種
export interface TicketType {
  id: string
  name: string // 票種名稱，如 "全票"、"半票"、"優待票"
  basePrice: number // 定價
  discount: number // 折扣金額（最多小數點後一位）
  createdAt: string
  updatedAt: string
}

// 計算售價的輔助函數
export function calculateSalePrice(basePrice: number, discount: number): number {
  const price = basePrice - discount
  return Math.max(0, price) // 確保售價不為負數
}
