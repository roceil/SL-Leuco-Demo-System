<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import Navbar from '../components/Navbar.vue'
import Sidebar from '../components/Sidebar.vue'
import { useSidebar } from '../composables/useSidebar'
import { useOrders } from '../composables/useOrders'

const router = useRouter()
const { isCollapsed } = useSidebar()
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
  if (!bookerName.value.trim()) {
    return '請輸入訂票人姓名'
  }
  if (!bookerPhone.value.trim()) {
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
    bookingType: '經銷商代訂',
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
    `✅ 訂票成功！\n\n` +
    `📋 訂單編號：${orderNumber}\n` +
    `👤 訂票人：${bookerName.value}\n` +
    `📅 去程日期：${outboundDate.value} ${outboundTime.value}\n` +
    `🎫 票種：全票 x${fullTicket.value}、半票 x${halfTicket.value}\n` +
    `💰 折扣後總金額：${discountedTotal()} 元\n\n` +
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
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <Navbar />
    <Sidebar active-route="dashboard" />

    <!-- 主要內容區 -->
    <main :class="['p-8 min-h-[calc(100vh-4rem)] transition-all duration-300', isCollapsed ? 'ml-20' : 'ml-64']">
      <!-- 麵包屑 -->
      <div class="flex items-center gap-2 text-gray-600 text-sm mb-6">
        <a
          href="#"
          class="text-blue-600 hover:underline"
        >首頁</a>
        <span>→</span>
        <a
          href="#"
          class="text-blue-600 hover:underline"
        >訂位作業</a>
        <span>→</span>
        <span>訂票</span>
      </div>

      <!-- 頁面標題 -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-800 mb-2">訂票</h1>
        <p class="text-gray-600">選擇航程並填寫乘客資訊</p>
      </div>

      <!-- 警告訊息 -->
      <div
        v-show="false"
        class="flex items-start gap-3 p-4 rounded-lg mb-6 bg-orange-50 border-l-4 border-orange-500"
      >
        <span class="text-xl">⚠️</span>
        <span class="text-orange-800 text-sm">OCR 套件未安裝，請聯絡管理員啟用身分證自動識別功能</span>
      </div>

      <!-- 訂票資訊卡片 -->
      <div class="bg-white rounded-xl p-8 shadow-md mb-6">
        <h2 class="text-xl font-semibold text-gray-800 mb-6 pb-4 border-b-2 border-gray-200">訂票資訊</h2>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div class="space-y-2">
            <label
              for="departure"
              class="block text-gray-700 text-sm font-medium"
            >出發地點</label>
            <select
              id="departure"
              v-model="departure"
              class="w-full p-3 border-2 border-gray-300 rounded-lg text-base transition-all outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            >
              <option value="donggang">東港出發</option>
              <option value="xiaoliuqiu">小琉球出發</option>
            </select>
          </div>

          <div class="space-y-2">
            <label
              for="bookingType"
              class="block text-gray-700 text-sm font-medium"
            >訂票類型</label>
            <select
              id="bookingType"
              v-model="bookingType"
              class="w-full p-3 border-2 border-gray-300 rounded-lg text-base transition-all outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            >
              <option value="distributor">經銷商代訂</option>
            </select>
          </div>

          <div class="space-y-2">
            <label
              for="distributor"
              class="block text-gray-700 text-sm font-medium"
            >經銷名稱</label>
            <input
              type="text"
              id="distributor"
              v-model="distributor"
              disabled
              class="w-full p-3 border-2 border-gray-300 rounded-lg text-base bg-gray-100 cursor-not-allowed"
            >
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="space-y-2">
            <label
              for="bookerName"
              class="block text-gray-700 text-sm font-medium"
            >
              訂票人<span class="text-red-500 ml-1">*</span>
            </label>
            <input
              type="text"
              id="bookerName"
              v-model="bookerName"
              placeholder="請掃描或手動輸入"
              class="w-full p-3 border-2 border-gray-300 rounded-lg text-base transition-all outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            >
          </div>

          <div class="space-y-2">
            <label
              for="bookerPhone"
              class="block text-gray-700 text-sm font-medium"
            >
              訂票人聯絡方式<span class="text-red-500 ml-1">*</span>
            </label>
            <input
              type="text"
              id="bookerPhone"
              v-model="bookerPhone"
              placeholder="行動電話"
              class="w-full p-3 border-2 border-gray-300 rounded-lg text-base transition-all outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            >
          </div>
        </div>
      </div>

      <!-- 去回程日期設定 -->
      <div class="bg-white rounded-xl p-8 shadow-md mb-6">
        <h2 class="text-xl font-semibold text-gray-800 mb-6 pb-4 border-b-2 border-gray-200">去回程日期設定</h2>

        <div class="flex flex-col md:flex-row gap-6">
          <!-- 去程 -->
          <div class="flex-1 rounded-xl p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-500">
            <div class="flex items-center gap-3 mb-5 flex-wrap">
              <h3 class="text-lg font-semibold text-blue-800">去程日期</h3>
              <span
                class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-green-500 text-white"
              >訂 0</span>
              <span
                class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500 text-white"
              >取 0</span>
              <span
                class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-orange-500 text-white"
              >登 0</span>
            </div>

            <div class="space-y-4">
              <div class="space-y-2">
                <label
                  for="outboundDate"
                  class="block text-gray-700 text-sm font-medium"
                >
                  去程日期<span class="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="date"
                  id="outboundDate"
                  v-model="outboundDate"
                  class="w-full p-3 border-2 border-gray-300 rounded-lg text-base transition-all outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                >
              </div>

              <div class="space-y-2">
                <label
                  for="outboundTime"
                  class="block text-gray-700 text-sm font-medium"
                >
                  去程船班時間<span class="text-red-500 ml-1">*</span>
                </label>
                <select
                  id="outboundTime"
                  v-model="outboundTime"
                  class="w-full p-3 border-2 border-gray-300 rounded-lg text-base transition-all outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
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
          <div class="flex-1 rounded-xl p-6 bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-500">
            <div class="flex items-center gap-3 mb-5 flex-wrap">
              <h3 class="text-lg font-semibold text-orange-800">回程日期</h3>
              <span
                class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-green-500 text-white"
              >訂 0</span>
              <span
                class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500 text-white"
              >取 0</span>
              <span
                class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-orange-500 text-white"
              >登 0</span>
            </div>

            <div class="space-y-4">
              <div class="space-y-2">
                <label
                  for="returnDate"
                  class="block text-gray-700 text-sm font-medium"
                >回程日期</label>
                <input
                  type="date"
                  id="returnDate"
                  v-model="returnDate"
                  class="w-full p-3 border-2 border-gray-300 rounded-lg text-base transition-all outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                >
              </div>

              <div class="space-y-2">
                <label
                  for="returnTime"
                  class="block text-gray-700 text-sm font-medium"
                >回程船班時間</label>
                <select
                  id="returnTime"
                  v-model="returnTime"
                  class="w-full p-3 border-2 border-gray-300 rounded-lg text-base transition-all outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
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
      </div>

      <!-- 票種數量與價格資訊 -->
      <div class="flex flex-col lg:flex-row gap-6 mb-6">
        <!-- 票種選擇 -->
        <div class="flex-1 bg-white rounded-xl p-8 shadow-md">
          <h2 class="text-xl font-semibold text-gray-800 mb-6 pb-4 border-b-2 border-gray-200">票種與數量</h2>

          <div class="flex items-center justify-between p-4 border-2 border-gray-300 rounded-lg mb-4">
            <div class="flex-1">
              <div class="font-semibold text-gray-800 mb-1">民宿全票來回數量</div>
              <div class="text-sm text-gray-600">票面價格: 450元 / 折扣後價格: 370元</div>
            </div>
            <div class="flex items-center gap-3">
              <button
                @click="changeQuantity('full', -1)"
                class="w-10 h-10 border-2 border-blue-600 bg-white text-blue-600 rounded-lg text-xl font-bold cursor-pointer transition-all hover:bg-blue-600 hover:text-white"
                type="button"
              >
                −
              </button>
              <div class="w-16 text-center text-lg font-bold text-gray-800">{{ fullTicket }}</div>
              <button
                @click="changeQuantity('full', 1)"
                class="w-10 h-10 border-2 border-blue-600 bg-white text-blue-600 rounded-lg text-xl font-bold cursor-pointer transition-all hover:bg-blue-600 hover:text-white"
                type="button"
              >
                +
              </button>
            </div>
          </div>

          <div class="flex items-center justify-between p-4 border-2 border-gray-300 rounded-lg">
            <div class="flex-1">
              <div class="font-semibold text-gray-800 mb-1">民宿半票來回數量</div>
              <div class="text-sm text-gray-600">票面價格: 225元 / 折扣後價格: 200元</div>
            </div>
            <div class="flex items-center gap-3">
              <button
                @click="changeQuantity('half', -1)"
                class="w-10 h-10 border-2 border-blue-600 bg-white text-blue-600 rounded-lg text-xl font-bold cursor-pointer transition-all hover:bg-blue-600 hover:text-white"
                type="button"
              >
                −
              </button>
              <div class="w-16 text-center text-lg font-bold text-gray-800">{{ halfTicket }}</div>
              <button
                @click="changeQuantity('half', 1)"
                class="w-10 h-10 border-2 border-blue-600 bg-white text-blue-600 rounded-lg text-xl font-bold cursor-pointer transition-all hover:bg-blue-600 hover:text-white"
                type="button"
              >
                +
              </button>
            </div>
          </div>
        </div>

        <!-- 價格資訊 -->
        <div class="flex-1 bg-white rounded-xl p-8 shadow-md">
          <h2 class="text-xl font-semibold text-gray-800 mb-6 pb-4 border-b-2 border-gray-200">價格資訊</h2>

          <div class="p-6 rounded-lg bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-500 mb-4">
            <div class="text-sm text-green-800 font-medium mb-2">票面總金額</div>
            <div class="text-4xl font-bold text-green-700">{{ originalTotal() }} 元</div>
          </div>

          <div class="p-6 rounded-lg bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-500">
            <div class="text-sm text-orange-800 font-medium mb-2">折扣後總金額</div>
            <div class="text-4xl font-bold text-orange-700">{{ discountedTotal() }} 元</div>
          </div>
        </div>
      </div>

      <!-- 操作按鈕 -->
      <div class="flex gap-4 justify-end">
        <button
          @click="handleCancel"
          type="button"
          class="py-3 px-8 bg-white text-gray-700 border-2 border-gray-300 rounded-lg text-base font-semibold cursor-pointer transition-all hover:bg-gray-50 hover:border-gray-400"
        >
          取消
        </button>
        <button
          @click="handleSubmit"
          type="button"
          class="py-3 px-8 bg-blue-600 text-white rounded-lg text-base font-semibold cursor-pointer transition-all shadow-lg hover:bg-blue-700 hover:-translate-y-0.5 hover:shadow-xl"
        >
          確認訂票
        </button>
      </div>
    </main>
  </div>
</template>
