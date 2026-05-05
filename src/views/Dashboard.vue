<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import Navbar from '@/components/Navbar.vue'
import Sidebar from '@/components/Sidebar.vue'
import PageContainer from '@/components/ui/PageContainer.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import { useSidebar } from '@/composables/useSidebar'
import { useTheme } from '@/composables/useTheme'
import { useSchedules } from '@/composables/useSchedules'
import { useShips } from '@/composables/useShips'
import { useRouteStore } from '@/stores/route'
import { useTicketStore } from '@/stores/ticket'
import { useOrderStore } from '@/stores/order'
import { useAuthStore } from '@/stores/auth'
import { usePayment } from '@/composables/usePayment'
import { useRbacStore } from '@/stores/rbac'
import { useAuth } from '@/composables/useAuth'
import { getPriceForDate } from '@/types/rbac'
import { getDiscountBySegmentCount } from '@/types/ticket'
import {
  TicketIcon,
  MinusIcon,
  PlusIcon,
  CheckIcon,
  TrashIcon
} from '@heroicons/vue/24/outline'

const router = useRouter()
const { isCollapsed } = useSidebar()
const { theme } = useTheme()
const { schedules } = useSchedules()
const { ships } = useShips()
const routeStore = useRouteStore()
const ticketStore = useTicketStore()
const orderStore = useOrderStore()
const authStore = useAuthStore()
const { initializePaymentInfo } = usePayment()
const rbacStore = useRbacStore()
const { currentUser } = useAuth()

// 代訂相關狀態
const isProxyBooking = ref(false)
const selectedAgentAccountId = ref<string | null>(null)

// 票種數量（使用乘客類型作為 key，跨航段統一分組）
interface TicketQuantity {
  passengerType: string
  quantity: number
}

const ticketQuantities = ref<TicketQuantity[]>([])

const bookerName = ref('')
const bookerPhone = ref('')

// 乘客資訊（依票種分組）
interface PassengerFormInfo {
  name: string
  idNumber: string
  birthday: string
}

const passengersByType = ref<Record<string, PassengerFormInfo[]>>({})

// 切換代訂模式時，清空已選票種（可用票種可能改變）
watch(isProxyBooking, (val) => {
  if (!val) selectedAgentAccountId.value = null
  ticketQuantities.value = []
})

// 切換代訂帳號時，清空已選票種（可用票種可能改變）
watch(selectedAgentAccountId, () => {
  ticketQuantities.value = []
})

// 監聽票種數量變化，同步各票種的乘客欄位數量
watch(ticketQuantities, (newQuantities) => {
  for (const tq of newQuantities) {
    if (tq.quantity > 0) {
      const existing = passengersByType.value[tq.passengerType] ?? []
      if (existing.length < tq.quantity) {
        passengersByType.value[tq.passengerType] = [
          ...existing,
          ...Array.from({ length: tq.quantity - existing.length }, () => ({ name: '', idNumber: '', birthday: '' }))
        ]
      } else if (existing.length > tq.quantity) {
        passengersByType.value[tq.passengerType] = existing.slice(0, tq.quantity)
      }
    } else {
      delete passengersByType.value[tq.passengerType]
    }
  }
}, { deep: true })

// 航段資料結構
interface Segment {
  id: string
  label: string
  routeSegmentId: string // 航段 ID（對應 RouteSegment）
  date: string
  time: string
  canDelete: boolean
}

// 航段列表（預設1個航段，支援單程票）
const segments = ref<Segment[]>([
  { id: 'segment-1', label: '航段 1', routeSegmentId: '', date: '', time: '', canDelete: false }
])

// 最多允許3個航段
const canAddSegment = computed(() => segments.value.length < 3)

// 檢查某個航段是否有對應的票種
const hasTicketsForRoute = (routeSegmentId: string) => {
  const routeSegment = routeStore.getRouteSegmentWithPorts(routeSegmentId)
  if (!routeSegment) return false

  // 檢查是否有票種符合這個航段
  return ticketStore.ticketTypes.some(ticket => {
    return ticket.route.from === routeSegment.fromPortId &&
           ticket.route.to === routeSegment.toPortId
  })
}

// 取得每個航段可用的航線選項（只顯示有票種的航段）
const getAvailableRoutes = (segmentIndex: number) => {
  let candidateRoutes = []

  if (segmentIndex === 0) {
    // 第一個航段：顯示所有啟用的航段
    candidateRoutes = routeStore.activeRouteSegments
  } else {
    // 後續航段：根據前一個航段的選擇來過濾
    const prevSegment = segments.value[segmentIndex - 1]
    if (!prevSegment || !prevSegment.routeSegmentId) {
      return []
    }
    // 取得允許的下一航段
    candidateRoutes = routeStore.getAllowedNextSegments(prevSegment.routeSegmentId)
  }

  // 只返回有票種的航段
  return candidateRoutes.filter(route => hasTicketsForRoute(route.id))
}

// 當航段選擇改變時，清空後續航段的選擇及當前航段的時間
const onRouteSegmentChange = (segmentIndex: number) => {
  // 清空當前航段的時間選擇
  const currentSegment = segments.value[segmentIndex]
  if (currentSegment) {
    currentSegment.time = ''
  }

  // 清空後續所有航段的選擇
  for (let i = segmentIndex + 1; i < segments.value.length; i++) {
    const segment = segments.value[i]
    if (segment) {
      segment.routeSegmentId = ''
      segment.date = ''
      segment.time = ''
    }
  }
}

// 當日期選擇改變時，清空該航段的時間選擇
const onDateChange = (segmentIndex: number) => {
  const segment = segments.value[segmentIndex]
  if (segment) {
    segment.time = ''
  }
}

// 錯誤訊息
const errors = ref({
  bookerName: '',
  bookerPhone: ''
})

// 根據航段和日期取得可用的船班（包含座位資訊）
const getAvailableSchedules = (segmentIndex: number) => {
  const segment = segments.value[segmentIndex]
  if (!segment || !segment.routeSegmentId || !segment.date) {
    return []
  }

  // 篩選符合條件的船班
  const availableSchedules = schedules.value.filter(schedule => {
    // 1. 必須是相同的航段
    if (schedule.routeSegmentId !== segment.routeSegmentId) {
      return false
    }

    // 2. 必須在指定日期運行
    if (schedule.isDaily) {
      // 固定船班每天都有
      return true
    } else {
      // 機動船班只在指定日期
      return schedule.date === segment.date
    }
  })

  // 按時間排序
  return availableSchedules.sort((a, b) => a.departureTime.localeCompare(b.departureTime))
}

// 計算剩餘座位
const getRemainingSeats = (schedule: { maxCapacity: number; currentPassengers: number }) => {
  return schedule.maxCapacity - schedule.currentPassengers
}

/**
 * §3.2 容量檢查：判斷目前選擇的航段組合的訂位狀態
 * - normal: 每段座位都夠 → 正常下訂
 * - waitlist: 至少一段座位不足，但候補名額仍夠 → 走候補
 * - blocked: 連候補都不夠 → 阻擋（規格 §3.2「立即阻擋或警示」）
 */
const totalTicketsRequested = computed(() =>
  ticketQuantities.value.reduce((sum, tq) => sum + tq.quantity, 0)
)

type CapacityCheck = {
  status: 'normal' | 'waitlist' | 'blocked'
  blockedSegmentLabel?: string
}

const capacityCheck = computed<CapacityCheck>(() => {
  const want = totalTicketsRequested.value
  if (want === 0) return { status: 'normal' }

  let needsWaitlist = false
  let blockedLabel: string | undefined

  for (const seg of segments.value) {
    if (!seg.routeSegmentId || !seg.date || !seg.time) continue
    const sch = schedules.value.find(s =>
      s.routeSegmentId === seg.routeSegmentId &&
      s.departureTime === seg.time &&
      (s.isDaily || s.date === seg.date)
    )
    if (!sch) continue

    const remainingNormal = sch.maxCapacity - sch.currentPassengers
    if (remainingNormal >= want) continue

    // 正規座位不夠 → 看候補餘額
    const remainingWaitlist = (sch.waitlistCapacity ?? 0) - (sch.currentWaitlist ?? 0)
    if (remainingWaitlist >= want) {
      needsWaitlist = true
      continue
    }

    // 候補也不夠 → 阻擋
    blockedLabel = `${sch.shipName} ${sch.departureTime}`
    return { status: 'blocked', blockedSegmentLabel: blockedLabel }
  }

  return { status: needsWaitlist ? 'waitlist' : 'normal' }
})

const isAnyFullyBooked = computed(() => capacityCheck.value.status === 'waitlist')
const isBlocked = computed(() => capacityCheck.value.status === 'blocked')

// 取得座位狀態文字和顏色
const getSeatStatus = (remainingSeats: number, maxCapacity: number) => {
  const percentage = (remainingSeats / maxCapacity) * 100

  if (remainingSeats === 0) {
    return { text: '已滿', color: 'text-red-500' }
  } else if (percentage <= 20) {
    return { text: `僅剩 ${remainingSeats} 位`, color: 'text-orange-500' }
  } else {
    return { text: `剩餘 ${remainingSeats} 位`, color: 'text-green-500' }
  }
}

// 當前登入帳號的 RBAC 資料
const currentAccount = computed(() =>
  rbacStore.accounts.find(a => a.username === currentUser.value) ?? null
)

// 票種區塊為空時的提示文字
const noTicketHint = computed(() => {
  const hasSegment = segments.value.some(s => s.routeSegmentId)
  if (!hasSegment) return '請先選擇航段以顯示可用票種'
  if (isProxyBooking.value && !selectedAgentAccount.value) return '請先選擇代訂帳號以顯示可用票種'

  const account = isProxyBooking.value ? selectedAgentAccount.value : currentAccount.value
  if (!account) return '此帳號目前無可販售的票種'

  // 找出哪些航段在該帳號下完全沒有可販售的票種
  const allowedTypes = account.availableTicketTypes
  const blockedSegmentNames = segments.value
    .filter(s => s.routeSegmentId)
    .filter(seg => {
      const rs = routeStore.getRouteSegmentWithPorts(seg.routeSegmentId)
      if (!rs) return false
      return !ticketStore.ticketTypes.some(t =>
        t.route.from === rs.fromPortId &&
        t.route.to === rs.toPortId &&
        allowedTypes.includes(t.id)
      )
    })
    .map(seg => {
      const rs = routeStore.getRouteSegmentWithPorts(seg.routeSegmentId)
      const from = routeStore.getPortById(rs?.fromPortId ?? '')
      const to = routeStore.getPortById(rs?.toPortId ?? '')
      return from && to ? `${from.name}→${to.name}` : seg.label
    })

  if (blockedSegmentNames.length > 0) {
    return `此帳號在以下航段無可販售票種：${blockedSegmentNames.join('、')}`
  }
  return '此帳號目前無可販售的票種'
})

// 所有 partner 角色帳號
const allPartnerAccounts = computed(() => {
  return rbacStore.accounts.filter(acc => {
    const role = rbacStore.roles.find(r => r.id === acc.roleId)
    return role?.roleTemplate === 'partner' && acc.verified
  })
})

// 選中的代訂帳號物件
const selectedAgentAccount = computed(() => {
  if (!selectedAgentAccountId.value) return null
  return rbacStore.accounts.find(a => a.id === selectedAgentAccountId.value) ?? null
})

// 取得所有已選航段共同具備的乘客類型票種（交集）
const availableTickets = computed(() => {
  const validSegments = segments.value.filter(s => s.routeSegmentId)
  if (validSegments.length === 0) return []

  const firstRouteSegment = routeStore.getRouteSegmentWithPorts(validSegments[0]!.routeSegmentId)
  if (!firstRouteSegment) return []

  // 取得第一航段的運行航商
  const firstSegOrgId = getOrgIdForSegment(0)

  // 第一航段的所有票種（依航商篩選）
  const firstSegTickets = ticketStore.ticketTypes.filter(t =>
    t.route.from === firstRouteSegment.fromPortId &&
    t.route.to === firstRouteSegment.toPortId &&
    (firstSegOrgId ? (t.organizationId === firstSegOrgId) : !t.organizationId)
  )

  // 保留在所有後續航段都有對應 passengerType 的票種（同樣需符合各段航商）
  const tickets = firstSegTickets.filter(firstTicket =>
    validSegments.slice(1).every((seg, i) => {
      const rs = routeStore.getRouteSegmentWithPorts(seg.routeSegmentId)
      if (!rs) return false
      const segOrgId = getOrgIdForSegment(i + 1)
      return ticketStore.ticketTypes.some(t =>
        t.passengerType === firstTicket.passengerType &&
        t.route.from === rs.fromPortId &&
        t.route.to === rs.toPortId &&
        (segOrgId ? (t.organizationId === segOrgId) : !t.organizationId)
      )
    })
  )

  // 依帳號的 availableTicketTypes 過濾：每個航段對應的票種都必須被允許
  const filterByAllowedTypes = (allowedTypes: string[]) =>
    tickets.filter(firstTicket => {
      // 第一航段的票種必須在允許清單內
      if (!allowedTypes.includes(firstTicket.id)) return false
      // 後續每個航段對應的票種也必須在允許清單內（同時須符合該段運行航商）
      return validSegments.slice(1).every((seg, i) => {
        const rs = routeStore.getRouteSegmentWithPorts(seg.routeSegmentId)
        if (!rs) return false
        const segOrgId = getOrgIdForSegment(i + 1)
        const segTicket = ticketStore.ticketTypes.find(t =>
          t.passengerType === firstTicket.passengerType &&
          t.route.from === rs.fromPortId &&
          t.route.to === rs.toPortId &&
          (segOrgId ? (t.organizationId === segOrgId) : !t.organizationId)
        )
        return segTicket ? allowedTypes.includes(segTicket.id) : false
      })
    })

  // 代訂模式：票種以代訂帳號的 availableTicketTypes 為準
  if (isProxyBooking.value) {
    if (!selectedAgentAccount.value) return [] // 未選代訂帳號時不顯示任何票種
    return filterByAllowedTypes(selectedAgentAccount.value.availableTicketTypes)
  }

  // 非代訂模式：以當前登入帳號的 availableTicketTypes 為準
  if (currentAccount.value) {
    return filterByAllowedTypes(currentAccount.value.availableTicketTypes)
  }

  return tickets
})

// 取得票種數量
const getTicketQuantity = (passengerType: string): number => {
  const found = ticketQuantities.value.find((tq) => tq.passengerType === passengerType)
  return found ? found.quantity : 0
}

// 設定票種數量
const setTicketQuantity = (passengerType: string, quantity: number) => {
  const index = ticketQuantities.value.findIndex((tq) => tq.passengerType === passengerType)
  if (index !== -1) {
    const item = ticketQuantities.value[index]
    if (item) {
      item.quantity = Math.max(0, quantity)
    }
  } else {
    ticketQuantities.value.push({ passengerType, quantity: Math.max(0, quantity) })
  }
}

// 根據選定的班次時間，取得該航段運行船隻的所屬航商 ID
const getOrgIdForSegment = (segmentIndex: number): string | null => {
  const segment = segments.value[segmentIndex]
  if (!segment?.time) return null
  const schedule = getAvailableSchedules(segmentIndex).find(s => s.departureTime === segment.time)
  if (!schedule?.shipId) return null
  return ships.value.find(s => s.id === schedule.shipId)?.organizationId ?? null
}

// 根據乘客類型和航段，取得該航段的票種價格
const getTicketPriceForSegment = (passengerType: string, segmentIndex: number): number => {
  const segment = segments.value[segmentIndex]
  if (!segment || !segment.routeSegmentId) return 0

  const routeSegment = routeStore.getRouteSegmentWithPorts(segment.routeSegmentId)
  if (!routeSegment) return 0

  // 找到該航段對應的票種（以 passengerType + 路線 + 航商比對）
  const orgId = getOrgIdForSegment(segmentIndex)
  const ticket = ticketStore.ticketTypes.find(t =>
    t.passengerType === passengerType &&
    t.route.from === routeSegment.fromPortId &&
    t.route.to === routeSegment.toPortId &&
    (orgId ? (t.organizationId === orgId) : !t.organizationId)
  )

  if (!ticket) return 0

  // 決定要查詢哪個帳號的 ticketPriceSettings
  const priceAccount = selectedAgentAccount.value ?? currentAccount.value
  if (priceAccount) {
    const accountSettings = priceAccount.ticketPriceSettings.filter(
      s => s.ticketTypeId === ticket.id
    )
    const today = new Date().toISOString().split('T')[0]!
    const priceSetting = getPriceForDate(accountSettings, today)
    if (priceSetting?.segmentDiscounts) {
      const totalSegments = segments.value.length
      const discountAmount = getDiscountBySegmentCount(priceSetting.segmentDiscounts, totalSegments)
      return ticket.facePrice - discountAmount
    }
  }

  return ticket.facePrice
}

// 計算某個乘客類型在所有航段的總價
const getTotalPriceForTicket = (passengerType: string): number => {
  let total = 0
  for (let i = 0; i < segments.value.length; i++) {
    total += getTicketPriceForSegment(passengerType, i)
  }
  return total
}

// 格式化日期為 YYYY-MM-DD
const formatDate = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// 設定預設日期
onMounted(() => {
  const today = new Date()
  const firstSegment = segments.value[0]
  if (firstSegment) {
    firstSegment.date = formatDate(today)
  }
})

// 新增航段
const addSegment = () => {
  if (canAddSegment.value) {
    const nextNumber = segments.value.length + 1
    const newId = `segment-${nextNumber}`
    segments.value.push({
      id: newId,
      label: `航段 ${nextNumber}`,
      routeSegmentId: '',
      date: '',
      time: '',
      canDelete: true
    })
  }
}

// 刪除航段
const removeSegment = (id: string) => {
  const index = segments.value.findIndex(s => s.id === id)
  if (index !== -1) {
    const segment = segments.value[index]
    if (segment?.canDelete) {
      segments.value.splice(index, 1)
    }
  }
}

// 修改票種數量
const changeTicketQuantity = (passengerType: string, delta: number) => {
  const currentQuantity = getTicketQuantity(passengerType)
  setTicketQuantity(passengerType, currentQuantity + delta)
}

// 計算總售價（所有航段的總票價）
const totalPrice = () => {
  let total = 0
  for (const tq of ticketQuantities.value) {
    const pricePerPerson = getTotalPriceForTicket(tq.passengerType)
    total += pricePerPerson * tq.quantity
  }
  return total
}

// 表單驗證
const validateForm = (): string | null => {
  // 重置錯誤
  errors.value = {
    bookerName: '',
    bookerPhone: ''
  }

  if (!bookerName.value.trim()) {
    errors.value.bookerName = '請輸入訂票人姓名'
    return '請輸入訂票人姓名'
  }
  if (!bookerPhone.value.trim()) {
    errors.value.bookerPhone = '請輸入訂票人聯絡方式'
    return '請輸入訂票人聯絡方式'
  }

  // 驗證所有航段
  for (let i = 0; i < segments.value.length; i++) {
    const segment = segments.value[i]
    if (!segment) continue

    if (!segment.routeSegmentId) {
      return `請選擇${segment.label}航線`
    }
    if (!segment.date) {
      return `請選擇${segment.label}日期`
    }
    if (!segment.time) {
      return `請選擇${segment.label}船班時間`
    }
  }

  // 檢查是否至少選擇了一種票種
  const totalQuantity = ticketQuantities.value.reduce((sum, tq) => sum + tq.quantity, 0)
  if (totalQuantity === 0) {
    return '請至少選擇一種票種'
  }
  return null
}

const handleSubmit = () => {
  // 驗證表單
  const error = validateForm()
  if (error) {
    alert(error)
    return
  }

  // §3.2 超量阻擋：座位 + 候補名額都不夠時直接擋
  if (isBlocked.value) {
    alert(
      `${capacityCheck.value.blockedSegmentLabel ?? '航班'} 座位與候補名額皆不足，` +
      `請減少票數或更換船班。`
    )
    return
  }

  // 構建票種摘要
  const ticketsSummary: string[] = []
  for (const tq of ticketQuantities.value) {
    if (tq.quantity > 0) {
      ticketsSummary.push(`${tq.passengerType} x${tq.quantity}`)
    }
  }

  // 構建票種拆解（記錄第一航段的票種 ID）
  const ticketBreakdown = ticketQuantities.value
    .filter(tq => tq.quantity > 0)
    .map(tq => {
      const firstSeg = segments.value[0]
      const routeSegment = routeStore.getRouteSegmentWithPorts(firstSeg?.routeSegmentId || '')
      const ticket = ticketStore.ticketTypes.find(t =>
        t.passengerType === tq.passengerType &&
        t.route.from === routeSegment?.fromPortId &&
        t.route.to === routeSegment?.toPortId
      )
      return {
        passengerType: tq.passengerType,
        ticketTypeId: ticket?.id || '',
        quantity: tq.quantity
      }
    })

  // 構建航段陣列
  const scheduleSegments = segments.value.map((seg, i) => {
    const routeSegment = routeStore.getRouteSegmentWithPorts(seg.routeSegmentId)
    return {
      date: seg.date,
      time: seg.time,
      route: routeSegment ? `${routeSegment.fromPort.name}→${routeSegment.toPort.name}` : '',
      organizationId: getOrgIdForSegment(i) ?? undefined
    }
  })

  // 建立乘客資訊列表（所有票種）
  const firstSeg = segments.value[0]
  const firstRouteSegment = routeStore.getRouteSegmentWithPorts(firstSeg?.routeSegmentId || '')
  const passengers: Array<{
    id: string; name: string; idNumber?: string; birthday?: string
    ticketTypeId: string; hasBoarded: boolean
  }> = []
  let passengerCounter = 0
  for (const tq of ticketQuantities.value.filter(tq => tq.quantity > 0)) {
    const ticketType = ticketStore.ticketTypes.find(t =>
      t.passengerType === tq.passengerType &&
      t.route.from === firstRouteSegment?.fromPortId &&
      t.route.to === firstRouteSegment?.toPortId
    )
    const list = passengersByType.value[tq.passengerType] ?? []
    for (const p of list) {
      passengers.push({
        id: `passenger-${Date.now()}-${passengerCounter++}`,
        name: p.name,
        idNumber: p.idNumber || undefined,
        birthday: p.birthday || undefined,
        ticketTypeId: ticketType?.id || '',
        hasBoarded: false
      })
    }
  }

  // 建立 Order 格式的訂單（存入 orderStore，OrderDetail 才能讀到）
  const userId = authStore.currentUser?.id || 'system'
  // §3.2 候補：座位不足時整筆走候補；序號為現有候補數 + 1（先到先得）
  const isWaitlist = isAnyFullyBooked.value
  const waitlistOrder = isWaitlist
    ? orderStore.orders.filter(o => o.status === 'waitlist').length + 1
    : undefined
  const createdOrder = orderStore.createOrder(
    {
      customerName: bookerName.value,
      customerPhone: bookerPhone.value,
      scheduleId: `${segments.value[0]?.routeSegmentId}-${segments.value[0]?.date}-${segments.value[0]?.time}`,
      scheduleSegments,
      passengers,
      paymentInfo: initializePaymentInfo(0, totalPrice(), 0, 'cash'),
      status: isWaitlist ? 'waitlist' : 'pending',
      waitlistOrder,
      ticketBreakdown,
      notes: ticketsSummary.join('、'),
      createdBy: userId,
      agentAccountId: selectedAgentAccount.value?.id || undefined,
      agentAccountName: selectedAgentAccount.value?.name || undefined,
      organizationId: selectedAgentAccount.value?.organizationId
        ?? rbacStore.accounts.find(a => a.username === currentUser.value)?.organizationId
    },
    userId
  )

  // 構建航段資訊（顯示用）
  const segmentInfo = segments.value
    .map((seg) => `${seg.label}：${seg.date} ${seg.time}`)
    .join('\n')

  // 顯示成功訊息並詢問是否跳轉
  const goToDetail = confirm(
    `訂票成功！\n\n` +
    `訂單編號：${createdOrder.orderNumber}\n` +
    `訂票人：${bookerName.value}\n` +
    `${segmentInfo}\n` +
    `票種：${ticketsSummary.join('、')}\n` +
    `總金額：${totalPrice()} 元\n\n` +
    `是否前往訂單詳細頁面？`
  )

  // 重置表單
  resetForm()

  // 如果用戶選擇跳轉，導航到訂單詳細頁面
  if (goToDetail) {
    router.push(`/order-detail/${createdOrder.orderNumber}`)
  }
}

// 重置表單函數
const resetForm = () => {
  ticketQuantities.value = []
  bookerName.value = ''
  bookerPhone.value = ''
  passengersByType.value = {}
  isProxyBooking.value = false
  selectedAgentAccountId.value = null

  // 重置航段為預設一個（支援單程票）
  const today = new Date()

  segments.value = [
    { id: 'segment-1', label: '航段 1', routeSegmentId: '', date: formatDate(today), time: '', canDelete: false }
  ]

  errors.value = {
    bookerName: '',
    bookerPhone: ''
  }
}

</script>

<template>
  <div class="min-h-screen flex flex-col">
    <Navbar username="管理員" />

    <div class="flex flex-1">
      <Sidebar :active-route="$route.path.slice(1)" />

      <main :class="[
        'flex-1 transition-all duration-300',
        isCollapsed ? 'ml-20' : 'ml-64'
      ]">
        <PageContainer
          title="訂票作業"
          subtitle="選擇航程並填寫乘客資訊"
          :icon="TicketIcon"
          max-width="2xl"
        >
          <!-- 0. 代訂設定 -->
          <BaseCard
            title="代訂設定"
            padding="lg"
            class="mb-6"
          >
            <!-- 代訂模式開關 -->
            <label class="flex items-center gap-3 cursor-pointer select-none">
              <!-- Switch track -->
              <div class="relative">
                <input type="checkbox" v-model="isProxyBooking" class="sr-only" />
                <div
                  class="w-11 h-6 rounded-full transition-colors duration-200"
                  :class="isProxyBooking ? 'bg-secondary-500' : 'bg-neutral-300'"
                />
                <!-- Switch thumb -->
                <div
                  class="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200"
                  :class="isProxyBooking ? 'translate-x-5' : 'translate-x-0'"
                />
              </div>
              <span
                class="text-sm font-medium"
                :class="theme === 'dark' ? 'text-neutral-200' : 'text-neutral-700'"
              >
                代訂模式（以 partner 帳號名義建立訂單）
              </span>
            </label>

            <!-- 選擇代訂帳號 -->
            <div v-if="isProxyBooking" class="mt-4 space-y-3">
              <div>
                <label
                  class="block text-xs font-medium mb-1"
                  :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'"
                >
                  代訂帳號 <span class="text-red-500">*</span>
                </label>
                <select
                  v-model="selectedAgentAccountId"
                  class="w-full px-3 py-2 rounded-lg border transition-all outline-none"
                  :class="theme === 'dark'
                    ? 'bg-secondary-800 border-secondary-700 text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/50'
                    : 'bg-white border-neutral-300 text-neutral-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/50'
                  "
                >
                  <option :value="null">請選擇代訂帳號</option>
                  <option
                    v-for="acc in allPartnerAccounts"
                    :key="acc.id"
                    :value="acc.id"
                  >
                    {{ acc.name }}（{{ acc.contactPerson }} / {{ acc.contactPhone }}）
                  </option>
                </select>
              </div>

              <!-- 選中帳號資訊提示 -->
              <div
                v-if="selectedAgentAccount"
                class="rounded-md p-3"
                :class="theme === 'dark'
                  ? 'bg-primary-900/20 border border-primary-700'
                  : 'bg-primary-50 border border-primary-200'
                "
              >
                <p
                  class="text-sm"
                  :class="theme === 'dark' ? 'text-primary-300' : 'text-primary-800'"
                >
                  代訂對象：<strong>{{ selectedAgentAccount.name }}</strong>
                </p>
                <p
                  class="text-xs mt-1"
                  :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-500'"
                >
                  可販售 {{ selectedAgentAccount.availableTicketTypes.length }} 種票種，票價以代訂帳號設定為準
                </p>
              </div>
            </div>
          </BaseCard>

          <!-- 1. 航段設定 -->
          <BaseCard
            title="航段設定"
            padding="lg"
            class="mb-6"
          >
            <template #actions>
              <BaseButton
                v-if="canAddSegment"
                variant="primary"
                size="sm"
                :icon="PlusIcon"
                @click="addSegment"
              >
                新增航段
              </BaseButton>
            </template>

            <div class="space-y-4">
              <div
                v-for="(segment, index) in segments"
                :key="segment.id"
                class="flex items-start gap-4 p-4 rounded-lg border-2"
                :class="theme === 'dark'
                    ? 'bg-secondary-900 border-secondary-700'
                    : 'bg-neutral-50 border-neutral-200'
                  "
              >
                <!-- 航段標籤 -->
                <div class="flex-shrink-0 w-20 pt-8">
                  <span
                    class="text-sm font-semibold"
                    :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                  >
                    {{ segment.label }}
                  </span>
                </div>

                <div class="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <!-- 航線選擇 -->
                  <div>
                    <label
                      :for="`${segment.id}-route`"
                      class="block text-xs font-medium mb-1"
                      :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'"
                    >
                      航線 <span class="text-red-500">*</span>
                    </label>
                    <select
                      :id="`${segment.id}-route`"
                      v-model="segment.routeSegmentId"
                      @change="onRouteSegmentChange(index)"
                      :disabled="index > 0 && !segments[index - 1]?.routeSegmentId"
                      class="w-full px-3 py-2 rounded-lg border transition-all outline-none"
                      :class="theme === 'dark'
                          ? 'bg-secondary-800 border-secondary-700 text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/50 disabled:opacity-50 disabled:cursor-not-allowed'
                          : 'bg-white border-neutral-300 text-neutral-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/50 disabled:opacity-50 disabled:cursor-not-allowed'
                        "
                    >
                      <option value="">請選擇航線</option>
                      <option
                        v-for="route in getAvailableRoutes(index)"
                        :key="route.id"
                        :value="route.id"
                      >
                        {{ routeStore.getPortById(route.fromPortId)?.name }} → {{
                          routeStore.getPortById(route.toPortId)?.name }}
                      </option>
                    </select>
                  </div>

                  <!-- 出發日期 -->
                  <div>
                    <label
                      :for="`${segment.id}-date`"
                      class="block text-xs font-medium mb-1"
                      :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'"
                    >
                      出發日期 <span class="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      :id="`${segment.id}-date`"
                      v-model="segment.date"
                      @change="onDateChange(index)"
                      class="w-full px-3 py-2 rounded-lg border transition-all outline-none"
                      :class="theme === 'dark'
                          ? 'bg-secondary-800 border-secondary-700 text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/50'
                          : 'bg-white border-neutral-300 text-neutral-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/50'
                        "
                    >
                  </div>

                  <!-- 船班時間 -->
                  <div>
                    <label
                      :for="`${segment.id}-time`"
                      class="block text-xs font-medium mb-1"
                      :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'"
                    >
                      船班時間 <span class="text-red-500">*</span>
                    </label>
                    <select
                      :id="`${segment.id}-time`"
                      v-model="segment.time"
                      :disabled="!segment.routeSegmentId || !segment.date"
                      class="w-full px-3 py-2 rounded-lg border transition-all outline-none"
                      :class="theme === 'dark'
                          ? 'bg-secondary-800 border-secondary-700 text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/50 disabled:opacity-50 disabled:cursor-not-allowed'
                          : 'bg-white border-neutral-300 text-neutral-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/50 disabled:opacity-50 disabled:cursor-not-allowed'
                        "
                    >
                      <option value="">
                        {{ !segment.routeSegmentId ? '請先選擇航線' : !segment.date ? '請先選擇日期' : getAvailableSchedules(index).length === 0 ? '當日無船班' : '請選擇船班' }}
                      </option>
                      <option
                        v-for="schedule in getAvailableSchedules(index)"
                        :key="schedule.id"
                        :value="schedule.departureTime"
                        :disabled="getRemainingSeats(schedule) === 0"
                      >
                        {{ schedule.departureTime }} - {{ schedule.shipName }}
                      </option>
                    </select>

                    <!-- 座位狀態提示 -->
                    <div
                      v-if="segment.routeSegmentId && segment.date && segment.time"
                      class="mt-2 text-xs"
                    >
                      <div
                        v-for="schedule in getAvailableSchedules(index).filter(s => s.departureTime === segment.time)"
                        :key="schedule.id"
                        class="flex items-center gap-2"
                      >
                        <span
                          :class="[
                            'font-medium',
                            getSeatStatus(getRemainingSeats(schedule), schedule.maxCapacity).color
                          ]"
                        >
                          ● {{ getSeatStatus(getRemainingSeats(schedule), schedule.maxCapacity).text }}
                        </span>
                        <span :class="theme === 'dark' ? 'text-neutral-500' : 'text-neutral-400'">
                          / 總載客量 {{ schedule.maxCapacity }} 人
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 刪除按鈕 -->
                <button
                  v-if="segment.canDelete"
                  @click="removeSegment(segment.id)"
                  class="flex-shrink-0 p-2 rounded-lg transition-all mt-7"
                  :class="theme === 'dark'
                      ? 'hover:bg-red-900/30 text-red-400'
                      : 'hover:bg-red-100 text-red-600'
                    "
                  type="button"
                  title="刪除航段"
                >
                  <TrashIcon class="w-5 h-5" />
                </button>
                <div
                  v-else
                  class="flex-shrink-0 w-9"
                ></div>
              </div>
            </div>
          </BaseCard>

          <!-- 2. 訂票人資訊 -->
          <BaseCard
            title="訂票人資訊"
            padding="lg"
            class="mb-6"
          >
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <BaseInput
                v-model="bookerName"
                label="訂票人姓名"
                placeholder="請輸入訂票人姓名"
                :error="errors.bookerName"
                required
              />

              <BaseInput
                v-model="bookerPhone"
                type="tel"
                label="訂票人電話"
                placeholder="請輸入聯絡電話"
                :error="errors.bookerPhone"
                required
              />
            </div>
          </BaseCard>

          <!-- 3. 票種數量與價格資訊 -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <!-- 票種選擇 -->
            <BaseCard
              title="票種與數量"
              padding="lg"
            >
              <!-- 提示訊息：無可用票種 -->
              <div
                v-if="availableTickets.length === 0"
                class="text-center py-8"
              >
                <TicketIcon
                  class="w-16 h-16 mx-auto mb-4 opacity-30"
                  :class="theme === 'dark' ? 'text-neutral-600' : 'text-neutral-300'"
                />
                <p
                  class="text-sm"
                  :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-500'"
                >
                  {{ noTicketHint }}
                </p>
              </div>

              <!-- 動態顯示符合航段的票種 -->
              <div
                v-for="(ticket, index) in availableTickets"
                :key="ticket.id"
                class="flex items-center justify-between p-4 border-2 rounded-lg"
                :class="[
                  theme === 'dark' ? 'border-secondary-700' : 'border-neutral-300',
                  index < availableTickets.length - 1 ? 'mb-4' : ''
                ]"
              >
                <div class="flex-1">
                  <div
                    class="font-semibold mb-1"
                    :class="theme === 'dark' ? 'text-white' : 'text-neutral-800'"
                  >
                    {{ ticket.passengerType }}
                    <span
                      v-if="ticket.isSpecial"
                      class="ml-2 px-2 py-0.5 text-xs rounded"
                      :class="theme === 'dark' ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-100 text-amber-700'"
                    >
                      特殊票種
                    </span>
                  </div>
                  <div
                    class="text-sm"
                    :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'"
                  >
                    <span v-if="segments.length === 1">
                      單價: {{ getTotalPriceForTicket(ticket.passengerType) }}元
                    </span>
                    <span v-else>
                      總價: {{ getTotalPriceForTicket(ticket.passengerType) }}元
                      <span class="text-xs ml-1">({{ segments.length }} 個航段)</span>
                    </span>
                  </div>
                </div>
                <div class="flex items-center gap-3">
                  <button
                    @click="changeTicketQuantity(ticket.passengerType, -1)"
                    class="w-10 h-10 border-2 border-primary-500 text-primary-500 rounded-lg text-xl font-bold cursor-pointer transition-all hover:bg-primary-500 hover:text-white"
                    type="button"
                  >
                    <MinusIcon class="w-5 h-5 mx-auto" />
                  </button>
                  <div
                    class="w-16 text-center text-lg font-bold"
                    :class="theme === 'dark' ? 'text-white' : 'text-neutral-800'"
                  >
                    {{ getTicketQuantity(ticket.passengerType) }}
                  </div>
                  <button
                    @click="changeTicketQuantity(ticket.passengerType, 1)"
                    class="w-10 h-10 border-2 border-primary-500 text-primary-500 rounded-lg text-xl font-bold cursor-pointer transition-all hover:bg-primary-500 hover:text-white"
                    type="button"
                  >
                    <PlusIcon class="w-5 h-5 mx-auto" />
                  </button>
                </div>
              </div>

              <!-- 空狀態 -->
              <div
                v-if="ticketStore.ticketTypes.length === 0"
                class="text-center py-8"
                :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-500'"
              >
                <TicketIcon class="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>尚未設定票種</p>
                <p class="text-sm mt-1">請先到票種管理新增票種</p>
              </div>
            </BaseCard>

            <!-- 價格資訊 -->
            <BaseCard
              title="價格資訊"
              padding="lg"
            >
              <div
                class="p-6 rounded-lg border-2"
                :class="theme === 'dark'
                    ? 'bg-primary-950/30 border-primary-600'
                    : 'bg-primary-50 border-primary-500'
                  "
              >
                <div
                  class="text-sm font-medium mb-2"
                  :class="theme === 'dark' ? 'text-primary-400' : 'text-primary-800'"
                >
                  總金額（{{ segments.length }} 個航段）
                </div>
                <div
                  class="text-4xl font-bold"
                  :class="theme === 'dark' ? 'text-primary-500' : 'text-primary-700'"
                >
                  {{ totalPrice() }} 元
                </div>
                <div
                  v-if="segments.length > 1"
                  class="mt-3 text-xs"
                  :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'"
                >
                  包含所有航段的票價總和
                </div>
              </div>
            </BaseCard>
          </div>

          <!-- 4. 乘客資訊 -->
          <BaseCard
            v-if="ticketQuantities.some(tq => tq.quantity > 0)"
            title="乘客資訊"
            padding="lg"
            class="mb-6"
          >
            <p
              class="text-sm mb-5"
              :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-500'"
            >
              以下欄位為選填，可於後續在訂單詳情頁補填
            </p>

            <template
              v-for="(tq, typeIndex) in ticketQuantities.filter(tq => tq.quantity > 0)"
              :key="tq.passengerType"
            >
              <!-- 票種分隔線 -->
              <div
                v-if="typeIndex > 0"
                class="border-t my-6"
                :class="theme === 'dark' ? 'border-secondary-700' : 'border-neutral-200'"
              />

              <!-- 票種標題 -->
              <div
                class="text-sm font-semibold mb-4"
                :class="theme === 'dark' ? 'text-primary-400' : 'text-primary-700'"
              >
                {{ tq.passengerType }}
              </div>

              <!-- 該票種的每位乘客 -->
              <div
                v-for="(passenger, index) in (passengersByType[tq.passengerType] ?? [])"
                :key="index"
              >
                <div
                  v-if="index > 0"
                  class="border-t my-4"
                  :class="theme === 'dark' ? 'border-secondary-800' : 'border-neutral-100'"
                />

                <div
                  class="text-xs font-medium mb-3"
                  :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-500'"
                >
                  乘客 {{ index + 1 }}
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <BaseInput
                    v-model="passenger.name"
                    label="姓名"
                    placeholder="請輸入姓名"
                  />
                  <BaseInput
                    v-model="passenger.idNumber"
                    label="身分證字號"
                    placeholder="請輸入身分證字號"
                  />
                  <BaseInput
                    v-model="passenger.birthday"
                    type="date"
                    label="生日"
                  />
                </div>
              </div>
            </template>
          </BaseCard>

          <!-- 操作按鈕 -->
          <div class="flex gap-3 justify-end pt-4">
            <p
              v-if="isBlocked"
              class="text-sm self-center"
              :class="theme === 'dark' ? 'text-red-300' : 'text-red-700'"
            >
              {{ capacityCheck.blockedSegmentLabel }} 座位與候補名額皆不足，請減少票數
            </p>
            <p
              v-else-if="isAnyFullyBooked"
              class="text-sm self-center"
              :class="theme === 'dark' ? 'text-purple-300' : 'text-purple-700'"
            >
              此航班座位不足，將以候補方式建立訂單；轉正後另行通知付款
            </p>
            <BaseButton
              type="button"
              :variant="isBlocked ? 'danger' : isAnyFullyBooked ? 'secondary' : 'primary'"
              :icon="CheckIcon"
              :disabled="isBlocked"
              @click="handleSubmit"
            >
              {{ isBlocked ? '無法訂票（座位不足）' : isAnyFullyBooked ? '加入候補' : '確認訂票' }}
            </BaseButton>
          </div>
        </PageContainer>
      </main>
    </div>
  </div>
</template>
