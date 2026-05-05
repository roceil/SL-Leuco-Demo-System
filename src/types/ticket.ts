/**
 * 票種管理系統類型定義
 */

import type { RouteInfo } from './route'

// 航段折扣設定
export interface SegmentDiscount {
  segmentCount: number // 航段數量
  discountAmount: number // 折扣金額
}

// 票種
export interface TicketType {
  id: string
  name: string // 票種名稱，如 "全票"、"半票"、"優待票"
  passengerType: string // 乘客類型，例如："全票"、"半票"、"居民票"
  organizationId?: string // 所屬航商 ID（可選；不設定代表通用票種）
  facePrice: number // 票面價（原價）
  // 根據航段數量的折扣設定（彈性陣列）
  segmentDiscounts: SegmentDiscount[]
  route: RouteInfo // 航段資訊
  suggestedNextRoutes?: string[] // 建議後續航段（票種 ID 列表）
  isSpecial: boolean // 是否為特殊票種
  validFrom?: string // 有效期開始日期（ISO 8601 格式）
  validUntil?: string // 有效期結束日期（ISO 8601 格式）
  createdAt: string
  updatedAt: string
}

/**
 * 票種名稱選項（§3.14.2 票種配置）
 * 集中管理三家聯營航商共用的票種名稱清單，避免命名不一致
 */
export interface TicketNameOption {
  id: string
  name: string // 例如：現場全票、民宿全票、居民票、愛心票
  isActive: boolean
  createdAt: string
  updatedAt: string
}

/**
 * 票種類型選項（§3.14.2 票種配置）
 * 集中管理票種類型清單（全票、半票、居民票…）
 */
export interface TicketTypeOption {
  id: string
  name: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// 票價歷史記錄
export interface TicketPriceHistory {
  id: string
  ticketTypeId: string // 票種 ID
  facePrice: number // 票面價
  segmentDiscounts: SegmentDiscount[]
  effectiveDate: string // 生效日期（ISO 8601 格式）
  createdAt: string
  createdBy: string // 建立者帳號 ID
  note?: string // 備註
}

// 計算售價的輔助函數
export function calculateSalePrice(facePrice: number, discount: number): number {
  const price = facePrice - discount
  return Math.max(0, price) // 確保售價不為負數
}

// 根據航段數量取得折扣金額
export function getDiscountBySegmentCount(
  segmentDiscounts: SegmentDiscount[],
  segmentCount: number
): number {
  const discount = segmentDiscounts.find((d) => d.segmentCount === segmentCount)
  return discount ? discount.discountAmount : 0
}
