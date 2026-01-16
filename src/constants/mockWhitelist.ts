import type { WhitelistEntry } from '@/types/whitelist'

/**
 * 白名單 Mock 資料
 */
export const MOCK_WHITELIST: WhitelistEntry[] = [
  // 敬老票白名單
  {
    id: 'wl-001',
    ticketTypeId: 'ticket-001',
    passengerName: '王大明',
    phone: '0912345678',
    idNumber: 'A123456789',
    createdAt: '2025-01-10T10:00:00',
    updatedAt: '2025-01-10T10:00:00',
    createdBy: '系統管理員',
    remark: '65歲以上長者'
  },
  {
    id: 'wl-002',
    ticketTypeId: 'ticket-001',
    passengerName: '李小華',
    phone: '0923456789',
    idNumber: 'B234567890',
    createdAt: '2025-01-11T14:30:00',
    updatedAt: '2025-01-11T14:30:00',
    createdBy: '系統管理員'
  },
  {
    id: 'wl-003',
    ticketTypeId: 'ticket-001',
    passengerName: '陳美玲',
    phone: '0934567890',
    idNumber: 'C345678901',
    createdAt: '2025-01-12T09:15:00',
    updatedAt: '2025-01-12T09:15:00',
    createdBy: '客服人員'
  },

  // 愛心票白名單
  {
    id: 'wl-004',
    ticketTypeId: 'ticket-002',
    passengerName: '張志明',
    phone: '0945678901',
    idNumber: 'D456789012',
    createdAt: '2025-01-08T11:20:00',
    updatedAt: '2025-01-08T11:20:00',
    createdBy: '系統管理員',
    remark: '持有身心障礙手冊'
  },
  {
    id: 'wl-005',
    ticketTypeId: 'ticket-002',
    passengerName: '劉春梅',
    phone: '0956789012',
    idNumber: 'E567890123',
    createdAt: '2025-01-09T16:45:00',
    updatedAt: '2025-01-09T16:45:00',
    createdBy: '客服人員'
  },

  // 陪伴票白名單
  {
    id: 'wl-006',
    ticketTypeId: 'ticket-003',
    passengerName: '黃建國',
    phone: '0967890123',
    idNumber: 'F678901234',
    createdAt: '2025-01-10T13:00:00',
    updatedAt: '2025-01-10T13:00:00',
    createdBy: '系統管理員',
    remark: '陪伴張志明'
  },

  // 榮民票白名單
  {
    id: 'wl-007',
    ticketTypeId: 'ticket-004',
    passengerName: '林國雄',
    phone: '0978901234',
    idNumber: 'G789012345',
    createdAt: '2025-01-07T10:30:00',
    updatedAt: '2025-01-07T10:30:00',
    createdBy: '系統管理員',
    remark: '持有榮民證'
  },
  {
    id: 'wl-008',
    ticketTypeId: 'ticket-004',
    passengerName: '吳文龍',
    phone: '0989012345',
    idNumber: 'H890123456',
    createdAt: '2025-01-08T15:20:00',
    updatedAt: '2025-01-08T15:20:00',
    createdBy: '客服人員'
  },

  // 離島居民票白名單
  {
    id: 'wl-009',
    ticketTypeId: 'ticket-005',
    passengerName: '蔡依琳',
    phone: '0990123456',
    idNumber: 'I901234567',
    createdAt: '2025-01-09T12:00:00',
    updatedAt: '2025-01-09T12:00:00',
    createdBy: '系統管理員',
    remark: '設籍蘭嶼'
  },
  {
    id: 'wl-010',
    ticketTypeId: 'ticket-005',
    passengerName: '周杰倫',
    phone: '0901234567',
    idNumber: 'J012345678',
    createdAt: '2025-01-10T08:45:00',
    updatedAt: '2025-01-10T08:45:00',
    createdBy: '客服人員',
    remark: '設籍綠島'
  },
  {
    id: 'wl-011',
    ticketTypeId: 'ticket-005',
    passengerName: '鄭秀文',
    phone: '0912345670',
    idNumber: 'K123456780',
    createdAt: '2025-01-11T10:30:00',
    updatedAt: '2025-01-11T10:30:00',
    createdBy: '系統管理員'
  }
]
