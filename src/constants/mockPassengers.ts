import type { Passenger, UploadRecord } from '@/types/passenger'
import { BoardingStatus, UploadType, UploadStatus } from '@/types/passenger'

/**
 * Mock 乘客數據
 */
export const mockPassengers: Passenger[] = [
  // 今天的乘客 - SCH001 07:00 東港→小琉球
  {
    id: 'PASS001',
    scheduleId: 'SCH001',
    scheduleName: '小琉球之星 07:00',
    scheduleDate: new Date().toISOString().split('T')[0]!,
    departureTime: '07:00',
    route: '東港 → 小琉球',
    name: '王小明',
    idNumber: 'A123456789',
    phone: '0912-345-678',
    ticketType: '全票',
    seatNumber: 'A01',
    boardingStatus: BoardingStatus.BOARDED,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'PASS002',
    scheduleId: 'SCH001',
    scheduleName: '小琉球之星 07:00',
    scheduleDate: new Date().toISOString().split('T')[0]!,
    departureTime: '07:00',
    route: '東港 → 小琉球',
    name: '李美華',
    idNumber: 'B234567890',
    phone: '0923-456-789',
    ticketType: '敬老票',
    seatNumber: 'A02',
    boardingStatus: BoardingStatus.BOARDED,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'PASS003',
    scheduleId: 'SCH001',
    scheduleName: '小琉球之星 07:00',
    scheduleDate: new Date().toISOString().split('T')[0]!,
    departureTime: '07:00',
    route: '東港 → 小琉球',
    name: '陳志明',
    idNumber: 'C345678901',
    phone: '0934-567-890',
    ticketType: '全票',
    seatNumber: 'A03',
    boardingStatus: BoardingStatus.PENDING,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },

  // 今天的乘客 - SCH002 09:00 東港→小琉球
  {
    id: 'PASS004',
    scheduleId: 'SCH002',
    scheduleName: '海洋快艇 09:00',
    scheduleDate: new Date().toISOString().split('T')[0]!,
    departureTime: '09:00',
    route: '東港 → 小琉球',
    name: '張秀英',
    idNumber: 'D456789012',
    phone: '0945-678-901',
    ticketType: '愛心票',
    seatNumber: 'B01',
    boardingStatus: BoardingStatus.PENDING,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'PASS005',
    scheduleId: 'SCH002',
    scheduleName: '海洋快艇 09:00',
    scheduleDate: new Date().toISOString().split('T')[0]!,
    departureTime: '09:00',
    route: '東港 → 小琉球',
    name: '林建國',
    idNumber: 'E567890123',
    phone: '0956-789-012',
    ticketType: '全票',
    seatNumber: 'B02',
    boardingStatus: BoardingStatus.PENDING,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },

  // 今天的乘客 - SCH006 08:00 小琉球→東港
  {
    id: 'PASS006',
    scheduleId: 'SCH006',
    scheduleName: '小琉球之星 08:00',
    scheduleDate: new Date().toISOString().split('T')[0]!,
    departureTime: '08:00',
    route: '小琉球 → 東港',
    name: '黃雅婷',
    idNumber: 'F678901234',
    phone: '0967-890-123',
    ticketType: '離島居民票',
    seatNumber: 'C01',
    boardingStatus: BoardingStatus.BOARDED,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'PASS007',
    scheduleId: 'SCH006',
    scheduleName: '小琉球之星 08:00',
    scheduleDate: new Date().toISOString().split('T')[0]!,
    departureTime: '08:00',
    route: '小琉球 → 東港',
    name: '劉文傑',
    idNumber: 'G789012345',
    phone: '0978-901-234',
    ticketType: '全票',
    seatNumber: 'C02',
    boardingStatus: BoardingStatus.BOARDED,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'PASS008',
    scheduleId: 'SCH006',
    scheduleName: '小琉球之星 08:00',
    scheduleDate: new Date().toISOString().split('T')[0]!,
    departureTime: '08:00',
    route: '小琉球 → 東港',
    name: '吳佩珊',
    idNumber: 'H890123456',
    phone: '0989-012-345',
    ticketType: '半票',
    seatNumber: 'C03',
    boardingStatus: BoardingStatus.PENDING,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },

  // 今天的乘客 - SCH003 11:00 東港→小琉球
  {
    id: 'PASS009',
    scheduleId: 'SCH003',
    scheduleName: '藍色珊瑚號 11:00',
    scheduleDate: new Date().toISOString().split('T')[0]!,
    departureTime: '11:00',
    route: '東港 → 小琉球',
    name: '許志豪',
    idNumber: 'I901234567',
    phone: '0990-123-456',
    ticketType: '榮民票',
    seatNumber: 'D01',
    boardingStatus: BoardingStatus.PENDING,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'PASS010',
    scheduleId: 'SCH003',
    scheduleName: '藍色珊瑚號 11:00',
    scheduleDate: new Date().toISOString().split('T')[0]!,
    departureTime: '11:00',
    route: '東港 → 小琉球',
    name: '鄭佳慧',
    idNumber: 'J012345678',
    phone: '0901-234-567',
    ticketType: '全票',
    seatNumber: 'D02',
    boardingStatus: BoardingStatus.PENDING,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
]

/**
 * Mock 上傳記錄
 */
export const mockUploadRecords: UploadRecord[] = [
  {
    id: 'UPLOAD001',
    scheduleId: 'SCH001',
    scheduleName: '小琉球之星 07:00',
    scheduleDate: new Date().toISOString().split('T')[0]!,
    passengerCount: 3,
    uploadTime: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30分鐘前
    uploadType: UploadType.AUTO,
    status: UploadStatus.SUCCESS
  },
  {
    id: 'UPLOAD002',
    scheduleId: 'SCH006',
    scheduleName: '小琉球之星 08:00',
    scheduleDate: new Date().toISOString().split('T')[0]!,
    passengerCount: 3,
    uploadTime: new Date(Date.now() - 1000 * 60 * 20).toISOString(), // 20分鐘前
    uploadType: UploadType.MANUAL,
    status: UploadStatus.SUCCESS
  },
  {
    id: 'UPLOAD003',
    scheduleId: 'SCH002',
    scheduleName: '海洋快艇 09:00',
    scheduleDate: new Date().toISOString().split('T')[0]!,
    passengerCount: 2,
    uploadTime: new Date(Date.now() - 1000 * 60 * 10).toISOString(), // 10分鐘前
    uploadType: UploadType.AUTO,
    status: UploadStatus.FAILED,
    errorMessage: '網路連線逾時，請重新上傳'
  }
]
