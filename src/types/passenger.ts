/**
 * 乘客清單系統類型定義
 */

// 乘客資訊
export interface Passenger {
  id: string
  scheduleId: string // 船班編號
  scheduleName: string // 船班名稱（船名 + 時間）
  scheduleDate: string // 航行日期 (YYYY-MM-DD)
  departureTime: string // 出發時間
  route: string // 航線
  name: string // 乘客姓名
  idNumber: string // 身分證字號
  phone: string // 聯絡電話
  ticketType: string // 票種
  seatNumber?: string // 座位號碼
  boardingStatus: BoardingStatus // 登船狀態
  createdAt: string
  updatedAt: string
}

// 登船狀態
export enum BoardingStatus {
  PENDING = 'pending', // 待登船
  BOARDED = 'boarded', // 已登船
  CANCELLED = 'cancelled' // 已取消
}

// 上傳記錄
export interface UploadRecord {
  id: string
  scheduleId: string
  scheduleName: string
  scheduleDate: string
  passengerCount: number
  uploadTime: string
  uploadType: UploadType
  status: UploadStatus
  errorMessage?: string
}

// 上傳類型
export enum UploadType {
  MANUAL = 'manual', // 手動上傳
  AUTO = 'auto' // 自動上傳
}

// 上傳狀態
export enum UploadStatus {
  SUCCESS = 'success', // 上傳成功
  FAILED = 'failed', // 上傳失敗
  PENDING = 'pending' // 上傳中
}

// 自動上傳配置
export interface AutoUploadConfig {
  enabled: boolean // 是否啟用自動上傳
  intervalMinutes: number // 上傳間隔（分鐘）
  lastUploadTime?: string // 最後上傳時間
}

// 乘客清單篩選條件
export interface PassengerFilter {
  date?: string
  scheduleId?: string
  route?: string
  searchQuery?: string
}

// 乘客清單統計資訊
export interface PassengerStatistics {
  totalPassengers: number
  pendingCount: number
  boardedCount: number
  cancelledCount: number
}
