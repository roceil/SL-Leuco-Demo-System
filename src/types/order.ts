/**
 * 訂單與付款管理系統類型定義
 */

// 付款方式
export type PaymentMethod = 'cash' | 'credit_card' | 'transfer' | 'other'

// 付款類型
export type PaymentType = 'deposit' | 'balance'

// 付款狀態
export type PaymentStatus = 'unpaid' | 'partial' | 'paid' | 'refunded'

// 發票類型
export type InvoiceType = '二聯式' | '三聯式' | '電子發票'

// 載具類型
export type CarrierType = 'mobile' | 'natural_person' | 'none'

// 付款記錄
export interface PaymentRecord {
  id: string
  amount: number // 付款金額
  paymentType: PaymentType // 付款類型（訂金/尾款）
  method: PaymentMethod // 付款方式
  paidAt: string // 付款時間（ISO 8601 格式）
  paidBy: string // 收款者帳號 ID
  note?: string // 備註
}

// 付款資訊
export interface PaymentInfo {
  deposit: number // 訂金
  balance: number // 尾款
  discount: number // 折扣金額
  totalAmount: number // 總金額
  paidAmount: number // 已付金額
  remainingAmount: number // 剩餘應付金額
  paymentMethod: PaymentMethod // 付款方式
  paymentStatus: PaymentStatus // 付款狀態
  paymentRecords: PaymentRecord[] // 付款記錄列表
}

// 發票資訊
export interface InvoiceInfo {
  type: InvoiceType // 發票類型
  number?: string // 發票號碼
  taxId?: string // 統一編號（三聯式需要）
  companyName?: string // 公司名稱（三聯式需要）
  carrierType?: CarrierType // 載具類型
  carrierId?: string // 載具號碼
  issuedAt?: string // 開立時間（ISO 8601 格式）
  issuedBy?: string // 開立者帳號 ID
  editedBy?: string // 最後編輯者帳號 ID
  editedAt?: string // 最後編輯時間（ISO 8601 格式）
}

// 票種拆解（訂單建立時選擇的票種數量）
export interface TicketBreakdown {
  passengerType: string  // e.g., '全票', '半票'
  ticketTypeId: string   // 對應第一航段的票種 ID
  quantity: number
}

// 乘客資訊
export interface PassengerInfo {
  id: string
  name: string // 姓名
  idNumber?: string // 身份證字號
  birthday?: string // 生日（ISO 8601，YYYY-MM-DD）
  phone?: string // 電話
  isResident?: boolean // 是否為居民
  ticketTypeId: string // 票種 ID
  seatNumber?: string // 座位號碼
  hasBoarded: boolean // 是否已登船
  boardedAt?: string // 登船時間（ISO 8601 格式）
}

// 航段資訊
export interface ScheduleSegment {
  date: string  // 'YYYY-MM-DD'
  time: string  // 'HH:MM'
  route: string // '台東→綠島'
  organizationId?: string // 運行航商 ID
}

// 訂單
export interface Order {
  id: string
  orderNumber: string // 訂單編號
  organizationId?: string // 所屬航商 ID
  agentAccountId?: string // 代訂帳號 ID（partner 帳號）
  agentAccountName?: string // 代訂帳號名稱
  customerId?: string // 客戶 ID（如有客戶系統）
  customerName: string // 客戶姓名
  customerPhone: string // 客戶電話
  customerEmail?: string // 客戶 Email
  scheduleId: string // 航班 ID
  scheduleSegments: ScheduleSegment[] // 航段列表
  passengers: PassengerInfo[] // 乘客列表
  paymentInfo: PaymentInfo // 付款資訊
  invoiceInfo?: InvoiceInfo // 發票資訊
  ticketIssuedBy?: string // 出票人帳號 ID
  ticketIssuedAt?: string // 出票時間（ISO 8601 格式）
  ticketBreakdown?: TicketBreakdown[] // 票種拆解（訂單建立時選擇的票種數量）
  notes?: string // 備註
  /**
   * 訂單狀態
   * - pending: 已成立未取票
   * - confirmed: 已取票
   * - completed: 已登船完成
   * - cancelled: 已取消
   * - waitlist: 候補中（§3.2，等待轉正）
   */
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'waitlist'
  /** 候補序號（候補中時填入；先到先得） */
  waitlistOrder?: number
  createdAt: string // 建立時間（ISO 8601 格式）
  createdBy: string // 建立者帳號 ID
  updatedAt: string // 最後更新時間（ISO 8601 格式）
  updatedBy?: string // 最後更新者帳號 ID
}

// 計算付款相關金額的輔助函數
export function calculatePaymentAmounts(payment: Partial<PaymentInfo>): {
  totalAmount: number
  paidAmount: number
  remainingAmount: number
} {
  const deposit = payment.deposit || 0
  const balance = payment.balance || 0
  const discount = payment.discount || 0

  const totalAmount = deposit + balance - discount
  const paidAmount =
    payment.paymentRecords?.reduce((sum, record) => sum + record.amount, 0) || 0
  const remainingAmount = Math.max(0, totalAmount - paidAmount)

  return {
    totalAmount,
    paidAmount,
    remainingAmount
  }
}

// 判斷付款狀態
export function getPaymentStatus(paidAmount: number, totalAmount: number): PaymentStatus {
  if (paidAmount === 0) return 'unpaid'
  if (paidAmount >= totalAmount) return 'paid'
  return 'partial'
}

// 驗證出票條件
export interface IssueTicketValidation {
  isValid: boolean
  errors: string[]
}

export function validateIssueTicket(order: Order): IssueTicketValidation {
  const errors: string[] = []

  // 檢查訂金是否已付
  if (order.paymentInfo.paidAmount < order.paymentInfo.deposit) {
    errors.push('訂金尚未完全支付')
  }

  // 檢查乘客資訊是否完整
  if (order.passengers.length === 0) {
    errors.push('尚未新增乘客資訊')
  }

  order.passengers.forEach((passenger, index) => {
    if (!passenger.name) {
      errors.push(`乘客 ${index + 1} 姓名未填寫`)
    }
    if (!passenger.ticketTypeId) {
      errors.push(`乘客 ${index + 1} 未選擇票種`)
    }
  })

  return {
    isValid: errors.length === 0,
    errors
  }
}
