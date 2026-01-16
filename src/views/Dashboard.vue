<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import Navbar from '@/components/Navbar.vue'
import Sidebar from '@/components/Sidebar.vue'
import PageContainer from '@/components/ui/PageContainer.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import { useSidebar } from '@/composables/useSidebar'
import { useTheme } from '@/composables/useTheme'
import { useOrders } from '@/composables/useOrders'
import { BookingType } from '@/constants/mockOrders'
import {
  TicketIcon,
  MinusIcon,
  PlusIcon,
  CheckIcon,
  XMarkIcon,
  ExclamationTriangleIcon
} from '@heroicons/vue/24/outline'

const router = useRouter()
const { isCollapsed } = useSidebar()
const { theme } = useTheme()
const { addOrder } = useOrders()

const fullTicket = ref(0)
const halfTicket = ref(0)
const departure = ref('donggang')
const bookingType = ref('distributor')
const distributor = ref('管理員_測試帳號')
const bookerName = ref('')
const bookerPhone = ref('')
const outboundDate = ref('')
const outboundTime = ref('')
const returnDate = ref('')
const returnTime = ref('')

// 錯誤訊息
const errors = ref({
  bookerName: '',
  bookerPhone: ''
})

// 船班時間選項
const timeSlots = [
  '07:00',
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00'
]

const prices = {
  full: { original: 450, discounted: 370 },
  half: { original: 225, discounted: 200 }
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
  outboundDate.value = formatDate(today)

  const returnDay = new Date(today)
  returnDay.setDate(returnDay.getDate() + 7)
  returnDate.value = formatDate(returnDay)
})

// 當去程日期改變時，自動調整回程日期
watch(outboundDate, (newDate) => {
  if (newDate) {
    const outbound = new Date(newDate)
    const returnDay = new Date(outbound)
    returnDay.setDate(returnDay.getDate() + 7)
    returnDate.value = formatDate(returnDay)
  }
})

const changeQuantity = (type: 'full' | 'half', delta: number) => {
  if (type === 'full') {
    fullTicket.value = Math.max(0, fullTicket.value + delta)
  } else {
    halfTicket.value = Math.max(0, halfTicket.value + delta)
  }
}

const originalTotal = () => {
  return fullTicket.value * prices.full.original + halfTicket.value * prices.half.original
}

const discountedTotal = () => {
  return fullTicket.value * prices.full.discounted + halfTicket.value * prices.half.discounted
}

// 生成訂單編號
const generateOrderNumber = (): string => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  return `ORD${year}${month}${day}${hours}${minutes}${seconds}${random}`
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
  if (!outboundDate.value) {
    return '請選擇去程日期'
  }
  if (!outboundTime.value) {
    return '請選擇去程船班時間'
  }
  if (fullTicket.value === 0 && halfTicket.value === 0) {
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

  // 生成訂單編號
  const orderNumber = generateOrderNumber()

  // 建立訂單資料
  const order = {
    orderNumber,
    departure: departure.value === 'donggang' ? '東港' : '小琉球',
    bookingType: BookingType.COUNTER_PROXY,
    orderOwnerId: 'SHIPPING001',
    orderOwnerName: '藍白航運',
    orderOwnerType: 'shipping_company' as const,
    distributor: distributor.value,
    bookerName: bookerName.value,
    bookerPhone: bookerPhone.value,
    outboundDate: outboundDate.value,
    outboundTime: outboundTime.value,
    returnDate: returnDate.value,
    returnTime: returnTime.value,
    tickets: {
      full: fullTicket.value,
      half: halfTicket.value
    },
    pricing: {
      originalTotal: originalTotal(),
      discountedTotal: discountedTotal()
    },
    status: '未取票',
    createdAt: new Date().toISOString()
  }

  // 使用 useOrders composable 新增訂單
  addOrder(order)

  // 顯示成功訊息並詢問是否跳轉
  const goToOrderSearch = confirm(
    `訂票成功！\n\n` +
    `訂單編號：${orderNumber}\n` +
    `訂票人：${bookerName.value}\n` +
    `去程日期：${outboundDate.value} ${outboundTime.value}\n` +
    `票種：全票 x${fullTicket.value}、半票 x${halfTicket.value}\n` +
    `折扣後總金額：${discountedTotal()} 元\n\n` +
    `是否前往訂單查詢頁面查看詳細資訊？`
  )

  // 重置表單
  fullTicket.value = 0
  halfTicket.value = 0
  bookerName.value = ''
  bookerPhone.value = ''
  const today = new Date()
  outboundDate.value = formatDate(today)
  const returnDay = new Date(today)
  returnDay.setDate(returnDay.getDate() + 7)
  returnDate.value = formatDate(returnDay)
  outboundTime.value = ''
  returnTime.value = ''

  // 如果用戶選擇跳轉，則導航到訂單查詢頁面
  if (goToOrderSearch) {
    router.push('/order-search')
  }
}

const handleCancel = () => {
  if (confirm('確定要取消嗎？')) {
    fullTicket.value = 0
    halfTicket.value = 0
    bookerName.value = ''
    bookerPhone.value = ''
    const today = new Date()
    outboundDate.value = formatDate(today)
    const returnDay = new Date(today)
    returnDay.setDate(returnDay.getDate() + 7)
    returnDate.value = formatDate(returnDay)
    outboundTime.value = ''
    returnTime.value = ''
    errors.value = {
      bookerName: '',
      bookerPhone: ''
    }
  }
}
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <Navbar username="管理員" />

    <div class="flex flex-1">
      <Sidebar :active-route="$route.path.slice(1)" />

      <main
        :class="[
          'flex-1 transition-all duration-300',
          isCollapsed ? 'ml-20' : 'ml-64'
        ]"
      >
        <PageContainer
          title="訂票作業"
          subtitle="選擇航程並填寫乘客資訊"
          :icon="TicketIcon"
          max-width="2xl"
        >
          <!-- 警告訊息 -->
          <div
            v-show="false"
            class="flex items-start gap-3 p-4 rounded-lg mb-6 border-l-4"
            :class="
              theme === 'dark'
                ? 'bg-amber-950 border-amber-500 text-amber-200'
                : 'bg-amber-50 border-amber-500 text-amber-800'
            "
          >
            <ExclamationTriangleIcon class="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span class="text-sm">OCR 套件未安裝，請聯絡管理員啟用身分證自動識別功能</span>
          </div>

          <!-- 訂票資訊 -->
          <BaseCard title="訂票資訊" padding="lg" class="mb-6">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div class="space-y-2">
                <label
                  for="departure"
                  class="block text-sm font-medium"
                  :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                >
                  出發地點
                </label>
                <select
                  id="departure"
                  v-model="departure"
                  class="w-full px-3 py-2 rounded-lg border transition-all outline-none"
                  :class="
                    theme === 'dark'
                      ? 'bg-secondary-800 border-secondary-700 text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/50'
                      : 'bg-white border-neutral-300 text-neutral-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/50'
                  "
                >
                  <option value="donggang">東港出發</option>
                  <option value="xiaoliuqiu">小琉球出發</option>
                </select>
              </div>

              <div class="space-y-2">
                <label
                  for="bookingType"
                  class="block text-sm font-medium"
                  :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                >
                  訂票類型
                </label>
                <select
                  id="bookingType"
                  v-model="bookingType"
                  class="w-full px-3 py-2 rounded-lg border transition-all outline-none"
                  :class="
                    theme === 'dark'
                      ? 'bg-secondary-800 border-secondary-700 text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/50'
                      : 'bg-white border-neutral-300 text-neutral-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/50'
                  "
                >
                  <option value="distributor">經銷商代訂</option>
                </select>
              </div>

              <div class="space-y-2">
                <label
                  for="distributor"
                  class="block text-sm font-medium"
                  :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                >
                  經銷名稱
                </label>
                <input
                  type="text"
                  id="distributor"
                  v-model="distributor"
                  disabled
                  class="w-full px-3 py-2 rounded-lg border cursor-not-allowed"
                  :class="
                    theme === 'dark'
                      ? 'bg-secondary-900 border-secondary-800 text-neutral-400'
                      : 'bg-neutral-100 border-neutral-300 text-neutral-500'
                  "
                >
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <BaseInput
                v-model="bookerName"
                label="訂票人"
                placeholder="請掃描或手動輸入"
                :error="errors.bookerName"
                required
              />

              <BaseInput
                v-model="bookerPhone"
                type="tel"
                label="訂票人聯絡方式"
                placeholder="行動電話"
                :error="errors.bookerPhone"
                required
              />
            </div>
          </BaseCard>

          <!-- 去回程日期設定 -->
          <BaseCard title="去回程日期設定" padding="lg" class="mb-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- 去程 -->
              <div
                class="rounded-lg p-6 border-2"
                :class="
                  theme === 'dark'
                    ? 'bg-primary-950/30 border-primary-600'
                    : 'bg-primary-50 border-primary-500'
                "
              >
                <div class="flex items-center gap-3 mb-5 flex-wrap">
                  <h3
                    class="text-lg font-semibold"
                    :class="theme === 'dark' ? 'text-primary-400' : 'text-primary-700'"
                  >
                    去程日期
                  </h3>
                  <span
                    class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-green-500 text-white"
                  >
                    訂 0
                  </span>
                  <span
                    class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-primary-500 text-white"
                  >
                    取 0
                  </span>
                  <span
                    class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500 text-white"
                  >
                    登 0
                  </span>
                </div>

                <div class="space-y-4">
                  <div class="space-y-2">
                    <label
                      for="outboundDate"
                      class="block text-sm font-medium"
                      :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                    >
                      去程日期<span class="text-red-500 ml-1">*</span>
                    </label>
                    <input
                      type="date"
                      id="outboundDate"
                      v-model="outboundDate"
                      class="w-full px-3 py-2 rounded-lg border transition-all outline-none"
                      :class="
                        theme === 'dark'
                          ? 'bg-secondary-800 border-secondary-700 text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/50'
                          : 'bg-white border-neutral-300 text-neutral-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/50'
                      "
                    >
                  </div>

                  <div class="space-y-2">
                    <label
                      for="outboundTime"
                      class="block text-sm font-medium"
                      :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                    >
                      去程船班時間<span class="text-red-500 ml-1">*</span>
                    </label>
                    <select
                      id="outboundTime"
                      v-model="outboundTime"
                      class="w-full px-3 py-2 rounded-lg border transition-all outline-none"
                      :class="
                        theme === 'dark'
                          ? 'bg-secondary-800 border-secondary-700 text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/50'
                          : 'bg-white border-neutral-300 text-neutral-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/50'
                      "
                    >
                      <option value="">請選擇船班時間</option>
                      <option
                        v-for="time in timeSlots"
                        :key="time"
                        :value="time"
                      >
                        {{ time }}
                      </option>
                    </select>
                  </div>
                </div>
              </div>

              <!-- 回程 -->
              <div
                class="rounded-lg p-6 border-2"
                :class="
                  theme === 'dark'
                    ? 'bg-amber-950/30 border-amber-600'
                    : 'bg-amber-50 border-amber-500'
                "
              >
                <div class="flex items-center gap-3 mb-5 flex-wrap">
                  <h3
                    class="text-lg font-semibold"
                    :class="theme === 'dark' ? 'text-amber-400' : 'text-amber-700'"
                  >
                    回程日期
                  </h3>
                  <span
                    class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-green-500 text-white"
                  >
                    訂 0
                  </span>
                  <span
                    class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-primary-500 text-white"
                  >
                    取 0
                  </span>
                  <span
                    class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500 text-white"
                  >
                    登 0
                  </span>
                </div>

                <div class="space-y-4">
                  <div class="space-y-2">
                    <label
                      for="returnDate"
                      class="block text-sm font-medium"
                      :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                    >
                      回程日期
                    </label>
                    <input
                      type="date"
                      id="returnDate"
                      v-model="returnDate"
                      class="w-full px-3 py-2 rounded-lg border transition-all outline-none"
                      :class="
                        theme === 'dark'
                          ? 'bg-secondary-800 border-secondary-700 text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/50'
                          : 'bg-white border-neutral-300 text-neutral-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/50'
                      "
                    >
                  </div>

                  <div class="space-y-2">
                    <label
                      for="returnTime"
                      class="block text-sm font-medium"
                      :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                    >
                      回程船班時間
                    </label>
                    <select
                      id="returnTime"
                      v-model="returnTime"
                      class="w-full px-3 py-2 rounded-lg border transition-all outline-none"
                      :class="
                        theme === 'dark'
                          ? 'bg-secondary-800 border-secondary-700 text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/50'
                          : 'bg-white border-neutral-300 text-neutral-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/50'
                      "
                    >
                      <option value="">請選擇船班時間</option>
                      <option
                        v-for="time in timeSlots"
                        :key="time"
                        :value="time"
                      >
                        {{ time }}
                      </option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </BaseCard>

          <!-- 票種數量與價格資訊 -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <!-- 票種選擇 -->
            <BaseCard title="票種與數量" padding="lg">
              <div
                class="flex items-center justify-between p-4 border-2 rounded-lg mb-4"
                :class="
                  theme === 'dark' ? 'border-secondary-700' : 'border-neutral-300'
                "
              >
                <div class="flex-1">
                  <div
                    class="font-semibold mb-1"
                    :class="theme === 'dark' ? 'text-white' : 'text-neutral-800'"
                  >
                    民宿全票來回數量
                  </div>
                  <div
                    class="text-sm"
                    :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'"
                  >
                    票面價格: 450元 / 折扣後價格: 370元
                  </div>
                </div>
                <div class="flex items-center gap-3">
                  <button
                    @click="changeQuantity('full', -1)"
                    class="w-10 h-10 border-2 border-primary-500 text-primary-500 rounded-lg text-xl font-bold cursor-pointer transition-all hover:bg-primary-500 hover:text-white"
                    type="button"
                  >
                    <MinusIcon class="w-5 h-5 mx-auto" />
                  </button>
                  <div
                    class="w-16 text-center text-lg font-bold"
                    :class="theme === 'dark' ? 'text-white' : 'text-neutral-800'"
                  >
                    {{ fullTicket }}
                  </div>
                  <button
                    @click="changeQuantity('full', 1)"
                    class="w-10 h-10 border-2 border-primary-500 text-primary-500 rounded-lg text-xl font-bold cursor-pointer transition-all hover:bg-primary-500 hover:text-white"
                    type="button"
                  >
                    <PlusIcon class="w-5 h-5 mx-auto" />
                  </button>
                </div>
              </div>

              <div
                class="flex items-center justify-between p-4 border-2 rounded-lg"
                :class="
                  theme === 'dark' ? 'border-secondary-700' : 'border-neutral-300'
                "
              >
                <div class="flex-1">
                  <div
                    class="font-semibold mb-1"
                    :class="theme === 'dark' ? 'text-white' : 'text-neutral-800'"
                  >
                    民宿半票來回數量
                  </div>
                  <div
                    class="text-sm"
                    :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'"
                  >
                    票面價格: 225元 / 折扣後價格: 200元
                  </div>
                </div>
                <div class="flex items-center gap-3">
                  <button
                    @click="changeQuantity('half', -1)"
                    class="w-10 h-10 border-2 border-primary-500 text-primary-500 rounded-lg text-xl font-bold cursor-pointer transition-all hover:bg-primary-500 hover:text-white"
                    type="button"
                  >
                    <MinusIcon class="w-5 h-5 mx-auto" />
                  </button>
                  <div
                    class="w-16 text-center text-lg font-bold"
                    :class="theme === 'dark' ? 'text-white' : 'text-neutral-800'"
                  >
                    {{ halfTicket }}
                  </div>
                  <button
                    @click="changeQuantity('half', 1)"
                    class="w-10 h-10 border-2 border-primary-500 text-primary-500 rounded-lg text-xl font-bold cursor-pointer transition-all hover:bg-primary-500 hover:text-white"
                    type="button"
                  >
                    <PlusIcon class="w-5 h-5 mx-auto" />
                  </button>
                </div>
              </div>
            </BaseCard>

            <!-- 價格資訊 -->
            <BaseCard title="價格資訊" padding="lg">
              <div
                class="p-6 rounded-lg border-2 mb-4"
                :class="
                  theme === 'dark'
                    ? 'bg-green-950/30 border-green-600'
                    : 'bg-green-50 border-green-500'
                "
              >
                <div
                  class="text-sm font-medium mb-2"
                  :class="theme === 'dark' ? 'text-green-400' : 'text-green-800'"
                >
                  票面總金額
                </div>
                <div
                  class="text-4xl font-bold"
                  :class="theme === 'dark' ? 'text-green-500' : 'text-green-700'"
                >
                  {{ originalTotal() }} 元
                </div>
              </div>

              <div
                class="p-6 rounded-lg border-2"
                :class="
                  theme === 'dark'
                    ? 'bg-amber-950/30 border-amber-600'
                    : 'bg-amber-50 border-amber-500'
                "
              >
                <div
                  class="text-sm font-medium mb-2"
                  :class="theme === 'dark' ? 'text-amber-400' : 'text-amber-800'"
                >
                  折扣後總金額
                </div>
                <div
                  class="text-4xl font-bold"
                  :class="theme === 'dark' ? 'text-amber-500' : 'text-amber-700'"
                >
                  {{ discountedTotal() }} 元
                </div>
              </div>
            </BaseCard>
          </div>

          <!-- 操作按鈕 -->
          <div class="flex gap-3 justify-end pt-4">
            <BaseButton
              type="button"
              variant="ghost"
              :icon="XMarkIcon"
              @click="handleCancel"
            >
              取消
            </BaseButton>
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
