<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
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
import { useRouteStore } from '@/stores/route'
import { useTicketStore } from '@/stores/ticket'
import { useOrderStore } from '@/stores/order'
import { useAuthStore } from '@/stores/auth'
import { usePayment } from '@/composables/usePayment'
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
const routeStore = useRouteStore()
const ticketStore = useTicketStore()
const orderStore = useOrderStore()
const authStore = useAuthStore()
const { initializePaymentInfo } = usePayment()

// 票種數量（使用票種名稱作為 key，因為跨航段可能有相同名稱的票種）
interface TicketQuantity {
  ticketName: string
  quantity: number
}

const ticketQuantities = ref<TicketQuantity[]>([])

const bookerName = ref('')
const bookerPhone = ref('')

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

// 取得所有已選航段的唯一票種（合併所有航段的票種，去除重複）
const availableTickets = computed(() => {
  const ticketMap = new Map()

  // 遍歷所有已選擇的航段
  for (const segment of segments.value) {
    if (!segment.routeSegmentId) continue

    const routeSegment = routeStore.getRouteSegmentWithPorts(segment.routeSegmentId)
    if (!routeSegment) continue

    // 找到該航段的所有票種
    const segmentTickets = ticketStore.ticketTypes.filter(ticket => {
      return ticket.route.from === routeSegment.fromPortId &&
             ticket.route.to === routeSegment.toPortId
    })

    // 將票種加入 Map（使用票種名稱作為 key，確保同名票種只出現一次）
    for (const ticket of segmentTickets) {
      if (!ticketMap.has(ticket.name)) {
        ticketMap.set(ticket.name, ticket)
      }
    }
  }

  return Array.from(ticketMap.values())
})

// 取得票種數量
const getTicketQuantity = (ticketName: string): number => {
  const found = ticketQuantities.value.find((tq) => tq.ticketName === ticketName)
  return found ? found.quantity : 0
}

// 設定票種數量
const setTicketQuantity = (ticketName: string, quantity: number) => {
  const index = ticketQuantities.value.findIndex((tq) => tq.ticketName === ticketName)
  if (index !== -1) {
    const item = ticketQuantities.value[index]
    if (item) {
      item.quantity = Math.max(0, quantity)
    }
  } else {
    ticketQuantities.value.push({ ticketName, quantity: Math.max(0, quantity) })
  }
}

// 根據票種名稱和航段，取得該航段的票種價格
const getTicketPriceForSegment = (ticketName: string, segmentIndex: number): number => {
  const segment = segments.value[segmentIndex]
  if (!segment || !segment.routeSegmentId) return 0

  const routeSegment = routeStore.getRouteSegmentWithPorts(segment.routeSegmentId)
  if (!routeSegment) return 0

  // 找到該航段對應的票種
  const ticket = ticketStore.ticketTypes.find(t =>
    t.name === ticketName &&
    t.route.from === routeSegment.fromPortId &&
    t.route.to === routeSegment.toPortId
  )

  return ticket ? ticket.facePrice : 0
}

// 計算某個票種在所有航段的總價
const getTotalPriceForTicket = (ticketName: string): number => {
  let total = 0
  for (let i = 0; i < segments.value.length; i++) {
    total += getTicketPriceForSegment(ticketName, i)
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
const changeTicketQuantity = (ticketName: string, delta: number) => {
  const currentQuantity = getTicketQuantity(ticketName)
  setTicketQuantity(ticketName, currentQuantity + delta)
}

// 計算總售價（所有航段的總票價）
const totalPrice = () => {
  let total = 0
  for (const tq of ticketQuantities.value) {
    const pricePerPerson = getTotalPriceForTicket(tq.ticketName)
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

  // 構建票種摘要
  const ticketsSummary: string[] = []
  for (const tq of ticketQuantities.value) {
    if (tq.quantity > 0) {
      ticketsSummary.push(`${tq.ticketName} x${tq.quantity}`)
    }
  }

  // 構建航班名稱（從航段資訊組合）
  const scheduleName = segments.value.map(seg => {
    const routeSegment = routeStore.getRouteSegmentWithPorts(seg.routeSegmentId)
    if (routeSegment) {
      return `${seg.date} ${routeSegment.fromPort.name}→${routeSegment.toPort.name} ${seg.time}`
    }
    return `${seg.date} ${seg.time}`
  }).join(' + ')

  // 建立 Order 格式的訂單（存入 orderStore，OrderDetail 才能讀到）
  const userId = authStore.currentUser?.id || 'system'
  const createdOrder = orderStore.createOrder(
    {
      customerName: bookerName.value,
      customerPhone: bookerPhone.value,
      scheduleId: `${segments.value[0]?.routeSegmentId}-${segments.value[0]?.date}-${segments.value[0]?.time}`,
      scheduleName,
      passengers: [],
      paymentInfo: initializePaymentInfo(0, totalPrice(), 0, 'cash'),
      status: 'pending',
      notes: ticketsSummary.join('、'),
      createdBy: userId
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
              <!-- 提示訊息：未選擇航段 -->
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
                  請先選擇航段以顯示可用票種
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
                    {{ ticket.name }}
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
                      單價: {{ getTotalPriceForTicket(ticket.name) }}元
                    </span>
                    <span v-else>
                      總價: {{ getTotalPriceForTicket(ticket.name) }}元
                      <span class="text-xs ml-1">({{ segments.length }} 個航段)</span>
                    </span>
                  </div>
                </div>
                <div class="flex items-center gap-3">
                  <button
                    @click="changeTicketQuantity(ticket.name, -1)"
                    class="w-10 h-10 border-2 border-primary-500 text-primary-500 rounded-lg text-xl font-bold cursor-pointer transition-all hover:bg-primary-500 hover:text-white"
                    type="button"
                  >
                    <MinusIcon class="w-5 h-5 mx-auto" />
                  </button>
                  <div
                    class="w-16 text-center text-lg font-bold"
                    :class="theme === 'dark' ? 'text-white' : 'text-neutral-800'"
                  >
                    {{ getTicketQuantity(ticket.name) }}
                  </div>
                  <button
                    @click="changeTicketQuantity(ticket.name, 1)"
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

          <!-- 操作按鈕 -->
          <div class="flex gap-3 justify-end pt-4">
            <BaseButton
              type="button"
              variant="primary"
              :icon="CheckIcon"
              @click="handleSubmit"
            >
              確認訂票
            </BaseButton>
          </div>
        </PageContainer>
      </main>
    </div>
  </div>
</template>
