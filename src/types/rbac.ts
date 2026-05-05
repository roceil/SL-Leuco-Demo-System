/**
 * RBAC 系統類型定義
 */

import type { SegmentDiscount } from './ticket'

// 權限操作枚舉
export enum PermissionAction {
  READ = 'read',
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete'
}

// 權限項目
export interface Permission {
  resource: string // 資源標識符，如 'manage-member', 'manage-order'
  actions: PermissionAction[] // 允許的操作列表
}

// 權限組
export interface PermissionGroup {
  id: string
  name: string // 如 "系統管理權限"
  permissions: Permission[]
  createdAt: string
  updatedAt: string
}

// 角色
export interface Role {
  id: string
  name: string // 如 "東琉聯營處管理者"
  organizationId: string // 所屬機構
  roleTemplate: RoleTemplate // 角色範本類型
  loginRoute: string // 登入預設路徑，如 "/dashboard"
  hasBackendAccess: boolean // 是否可登入後台
  permissionGroupIds: string[] // 包含的權限組 ID 列表
  /** §3.14.4 啟用/停用：停用後綁定此角色的帳號無法登入，但既有資料不影響 */
  isActive?: boolean
  createdAt: string
  updatedAt: string
}

// 角色範本類型
export type RoleTemplate = 'super_admin' | 'operator_admin' | 'maritime_staff' | 'ticket_staff' | 'partner'

// 機構
export interface Organization {
  id: string
  name: string // 如 "東琉聯營處"
  /**
   * 公司代號（單一英文字母 A-Z）
   * - 帶入訂單編號開頭（例如 K → K20260224-7299）
   * - 建立後不可修改（避免影響既有訂單）
   * - 系統管理組織可不填
   */
  code?: string
  contactEmail?: string   // 聯絡信箱
  contactPhone?: string   // 聯絡電話
  createdAt: string
  updatedAt: string
}

// 票種價格設定（針對特定帳號）
// 同一個票種可以有多個價格設定，每個設定有不同的生效日期
export interface TicketPriceSetting {
  id: string // 價格設定 ID
  ticketTypeId: string // 票種 ID
  segmentDiscounts: SegmentDiscount[] // 每航段數量的折扣金額（與 TicketType.segmentDiscounts 結構相同）
  effectiveDate: string // 價格啟用日期 (ISO date string, e.g., '2026-01-01')
  createdAt: string // 記錄何時建立這個價格設定
}

// 帳戶
export interface Account {
  id: string
  username: string // 登入帳號
  name: string // 帳號名稱
  contactPerson: string // 聯絡人
  contactPhone: string // 聯絡電話
  organizationId: string // 所屬機構
  roleId: string // 綁定的角色 ID
  verified: boolean // 是否已驗證
  availableTicketTypes: string[] // 可販售票種 ID 列表
  ticketPriceSettings: TicketPriceSetting[] // 票種價格設定
  createdAt: string
  updatedAt: string
}

// 資源定義（用於權限矩陣配置）
export interface ResourceDefinition {
  key: string // 資源標識符
  label: string // 顯示名稱
  description?: string // 描述
  category?: string // 分類
}

/**
 * 根據訂單日期查詢對應的價格設定
 * @param priceSettings 該票種的所有價格設定（按 effectiveDate 排序）
 * @param orderDate 訂單日期 (ISO date string)
 * @returns 適用的價格設定，如果沒有則返回 null
 */
export function getPriceForDate(
  priceSettings: TicketPriceSetting[],
  orderDate: string
): TicketPriceSetting | null {
  if (!priceSettings || priceSettings.length === 0) {
    return null
  }

  // 過濾出生效日期在訂單日期之前或當天的價格設定
  const validSettings = priceSettings.filter(
    setting => setting.effectiveDate <= orderDate
  )

  if (validSettings.length === 0) {
    return null
  }

  // 返回生效日期最接近訂單日期的價格設定（最新的價格）
  return validSettings.reduce((latest, current) =>
    current.effectiveDate > latest.effectiveDate ? current : latest
  )
}
