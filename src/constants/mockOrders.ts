// 訂票單位類型
export enum DistributorType {
  BNB = '民宿',
  TRAVEL_AGENCY = '旅行同業',
  BEE = '小蜜蜂',
  DIRECT = '直客',
  ONLINE = '線上訂票'
}

// 訂票單位資料
export interface Distributor {
  id: string
  name: string
  type: DistributorType
  contact: string
  phone: string
}

// 訂票單位列表
export const distributors: Distributor[] = [
  // 民宿
  {
    id: 'BNB001',
    name: '海景民宿',
    type: DistributorType.BNB,
    contact: '王小明',
    phone: '0912-345-678'
  },
  {
    id: 'BNB002',
    name: '星空民宿',
    type: DistributorType.BNB,
    contact: '李小華',
    phone: '0923-456-789'
  },
  {
    id: 'BNB003',
    name: '藍白小屋',
    type: DistributorType.BNB,
    contact: '陳美玲',
    phone: '0934-567-890'
  },
  // 旅行同業
  {
    id: 'TA001',
    name: '環島旅行社',
    type: DistributorType.TRAVEL_AGENCY,
    contact: '張志明',
    phone: '0945-678-901'
  },
  {
    id: 'TA002',
    name: '悠遊旅行社',
    type: DistributorType.TRAVEL_AGENCY,
    contact: '林秀英',
    phone: '0956-789-012'
  },
  {
    id: 'TA003',
    name: '快樂假期',
    type: DistributorType.TRAVEL_AGENCY,
    contact: '黃建國',
    phone: '0967-890-123'
  },
  // 小蜜蜂
  {
    id: 'BEE001',
    name: '阿明票務',
    type: DistributorType.BEE,
    contact: '阿明',
    phone: '0978-901-234'
  },
  {
    id: 'BEE002',
    name: '小美代購',
    type: DistributorType.BEE,
    contact: '小美',
    phone: '0989-012-345'
  },
  {
    id: 'BEE003',
    name: '阿華服務站',
    type: DistributorType.BEE,
    contact: '阿華',
    phone: '0990-123-456'
  }
]

// 訂票類型枚舉
export enum BookingType {
  COUNTER_DIRECT = '票口現場售票', // 情境1: 票口人員直接售票
  COUNTER_PROXY = '票口現場代訂', // 情境2: 票口人員代表經銷商訂票
  DISTRIBUTOR = '經銷商訂票', // 情境3: 經銷商自己訂票
  RESERVATION = '預約訂票' // 預約訂票
}

// 特殊票種類型
export enum SpecialTicketType {
  RESIDENT = '居民票', // 情境4: 居民票（需鄉公所驗證）
  WORK = '工作票' // 情境5: 工作票（需白名單驗證）
}

// 乘客資料（用於特殊票種）
export interface PassengerInfo {
  name: string
  idNumber: string // 身分證字號
  ticketType: string // 票種類型
  specialTicketType?: SpecialTicketType // 特殊票種類型
  verified?: boolean // 是否已驗證
  verificationSource?: 'township' | 'whitelist' // 驗證來源：鄉公所或白名單
}

// 票券乘客資訊（用於訂單詳情）
export interface TicketPassenger {
  ticketId: string
  passengerName: string
  passengerId: string
}

// 票券狀態（用於訂單詳情）
export interface TicketStatus {
  ticketId: string
  status: '未取票' | '已取票' | '已登船' | '已取消'
}

// 訂單資料介面
export interface SavedOrder {
  orderNumber: string
  departure: string
  bookingType: BookingType // 使用枚舉類型

  // 訂票單位資訊
  orderOwnerId: string // 訂單歸屬單位 ID（航商 ID 或經銷商 ID）
  orderOwnerName: string // 訂單歸屬單位名稱
  orderOwnerType: 'shipping_company' | DistributorType // 訂單歸屬單位類型

  // 建立者資訊（情境2: 票口人員代訂時使用）
  creatorId?: string // 建立者 ID（票口人員 ID）
  creatorName?: string // 建立者姓名

  // 經銷商資訊（情境2, 3使用）
  distributor?: string
  distributorId?: string
  distributorType?: DistributorType

  bookerName: string
  bookerPhone: string
  outboundDate: string
  outboundTime: string
  returnDate: string
  returnTime: string

  // 一般票種數量（彈性格式，key 為票種 ID，value 為數量）
  tickets: Record<string, number> | {
    full: number
    half: number
  }

  // 乘客清單（用於特殊票種，情境4, 5）
  passengers?: PassengerInfo[]

  // 票券乘客資訊（用於訂單詳情）
  ticketPassengers?: TicketPassenger[]

  // 票券狀態（用於訂單詳情）
  ticketStatuses?: TicketStatus[]

  pricing: {
    originalTotal: number
    discountedTotal: number
  }
  status: string
  createdAt: string
}


// 假訂單資料
export const mockOrders: SavedOrder[] = []


// 初始化假資料到 localStorage
export const initializeMockOrders = () => {
  // 強制更新 localStorage 中的訂單資料
  localStorage.setItem('orders', JSON.stringify(mockOrders))
  console.log('已初始化假訂單資料')
}

// 取得特定訂票單位的訂單
export const getOrdersByDistributor = (distributorId: string): SavedOrder[] => {
  return mockOrders.filter(order => order.distributorId === distributorId)
}

// 取得特定類型的訂單
export const getOrdersByType = (type: DistributorType): SavedOrder[] => {
  return mockOrders.filter(order => order.distributorType === type)
}

// 統計各訂票單位的訂單數量和金額
export interface DistributorStats {
  distributor: Distributor
  totalOrders: number
  totalAmount: number
  totalFullTickets: number
  totalHalfTickets: number
}

export const getDistributorStats = (): DistributorStats[] => {
  return distributors.map(distributor => {
    const orders = getOrdersByDistributor(distributor.id)
    return {
      distributor,
      totalOrders: orders.length,
      totalAmount: orders.reduce((sum, order) => sum + order.pricing.discountedTotal, 0),
      totalFullTickets: orders.reduce((sum, order) => sum + order.tickets.full, 0),
      totalHalfTickets: orders.reduce((sum, order) => sum + order.tickets.half, 0)
    }
  })
}

// 統計各類型的訂單數量和金額
export interface TypeStats {
  type: DistributorType
  totalOrders: number
  totalAmount: number
  totalFullTickets: number
  totalHalfTickets: number
}

export const getTypeStats = (): TypeStats[] => {
  const types = Object.values(DistributorType)
  return types.map(type => {
    const orders = getOrdersByType(type)
    return {
      type,
      totalOrders: orders.length,
      totalAmount: orders.reduce((sum, order) => sum + order.pricing.discountedTotal, 0),
      totalFullTickets: orders.reduce((sum, order) => sum + order.tickets.full, 0),
      totalHalfTickets: orders.reduce((sum, order) => sum + order.tickets.half, 0)
    }
  })
}
