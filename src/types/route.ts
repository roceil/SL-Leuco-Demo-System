/**
 * 航點與航段管理系統類型定義
 */

// 航點（港口）
export interface Port {
  id: string
  name: string // 航點名稱，如 "台東"、"綠島"、"蘭嶼"、"後壁湖"
  code: string // 航點代碼，如 "TT"、"GI"、"LY"、"HBH"
  isActive: boolean // 是否啟用
  order: number // 排序順序
  createdAt: string
  updatedAt: string
}

// 航段（航線區段）
export interface RouteSegment {
  id: string
  fromPortId: string // 出發航點 ID
  toPortId: string // 抵達航點 ID
  allowedNextSegments: string[] // 允許的下一航段 ID 列表（用於串連行程）
  estimatedDuration: number // 預計航行時間（分鐘）
  isActive: boolean // 是否啟用
  createdAt: string
  updatedAt: string
}

// 航段詳細資訊（包含航點資訊）
export interface RouteSegmentWithPorts extends RouteSegment {
  fromPort: Port
  toPort: Port
  allowedNextSegmentsInfo?: RouteSegmentWithPorts[] // 允許的下一航段詳細資訊
}

// 航線資訊（用於票種）
export interface RouteInfo {
  from: string // 出發航點 ID
  to: string // 抵達航點 ID
}
