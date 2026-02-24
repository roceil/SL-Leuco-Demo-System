/**
 * 白名單管理系統類型定義
 */

// 白名單項目
export interface WhitelistEntry {
  id: string
  ticketTypeId: string // 所屬票種 ID
  passengerName: string // 乘客姓名
  phone: string // 電話
  idNumber: string // 身分證字號
  createdAt: string
  updatedAt: string
  createdBy?: string // 建立人員
  remark?: string // 備註
}

// 特殊票種（用於白名單管理）
export interface SpecialTicketType {
  id: string
  name: string
  facePrice: number
  discount: number
  description?: string // 票種說明
  isSpecial: boolean // 是否為特殊票種
  whitelistCount?: number // 白名單人數
}
