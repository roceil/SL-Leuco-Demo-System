import type { SpecialTicketType } from '@/types/whitelist'

/**
 * 特殊票種 Mock 資料
 * 這些票種需要白名單管理
 */
export const SPECIAL_TICKET_TYPES: SpecialTicketType[] = [
  {
    id: 'ticket-001',
    name: '敬老票',
    basePrice: 500,
    discount: 250,
    description: '65歲以上長者優惠票',
    isSpecial: true,
    whitelistCount: 15
  },
  {
    id: 'ticket-002',
    name: '愛心票',
    basePrice: 500,
    discount: 250,
    description: '持有身心障礙手冊者優惠票',
    isSpecial: true,
    whitelistCount: 8
  },
  {
    id: 'ticket-003',
    name: '陪伴票',
    basePrice: 500,
    discount: 250,
    description: '身心障礙者之必要陪伴者優惠票',
    isSpecial: true,
    whitelistCount: 5
  },
  {
    id: 'ticket-004',
    name: '榮民票',
    basePrice: 500,
    discount: 200,
    description: '持有榮民證者優惠票',
    isSpecial: true,
    whitelistCount: 12
  },
  {
    id: 'ticket-005',
    name: '離島居民票',
    basePrice: 500,
    discount: 150,
    description: '設籍離島之居民優惠票',
    isSpecial: true,
    whitelistCount: 20
  }
]
