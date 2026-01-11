<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import Navbar from '../components/Navbar.vue'
import Sidebar from '../components/Sidebar.vue'
import { useSidebar } from '../composables/useSidebar'

const router = useRouter()
const { isCollapsed } = useSidebar()

// 密碼相關
const oldPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const showOldPassword = ref(false)
const showNewPassword = ref(false)
const showConfirmPassword = ref(false)

// 預設搜尋條件
const defaultDateRange = ref('today')
const defaultSearchField = ref('id')
const defaultStatusFilter = ref('none')
const defaultEntriesPerPage = ref(30)

const requirements = computed(() => {
  return {
    length: newPassword.value.length >= 8,
    lowercase: /[a-z]/.test(newPassword.value),
    uppercase: /[A-Z]/.test(newPassword.value),
    number: /[0-9]/.test(newPassword.value)
  }
})

const isAllRequirementsMet = computed(() => {
  return Object.values(requirements.value).every(val => val === true)
})

const passwordStrength = computed(() => {
  if (newPassword.value.length === 0) return { level: '', text: '', class: '' }

  let strength = 0

  if (newPassword.value.length >= 8) strength++
  if (newPassword.value.length >= 12) strength++
  if (/[a-z]/.test(newPassword.value)) strength++
  if (/[A-Z]/.test(newPassword.value)) strength++
  if (/[0-9]/.test(newPassword.value)) strength++
  if (/[^a-zA-Z0-9]/.test(newPassword.value)) strength++

  if (strength <= 2) {
    return { level: 'weak', text: '弱', class: 'w-1/3 bg-red-500' }
  } else if (strength <= 4) {
    return { level: 'medium', text: '中', class: 'w-2/3 bg-orange-500' }
  } else {
    return { level: 'strong', text: '強', class: 'w-full bg-green-500' }
  }
})

const isPasswordMatch = computed(() => {
  if (confirmPassword.value === '') return null
  return newPassword.value === confirmPassword.value
})

const isFormValid = computed(() => {
  return oldPassword.value.length > 0 &&
    isAllRequirementsMet.value &&
    isPasswordMatch.value === true
})

const handleSubmit = () => {
  if (isFormValid.value) {
    alert('密碼重設成功！')
    router.push('/')
  }
}

const handleCancel = () => {
  router.push('/dashboard')
}

// 預設搜尋條件相關函數
const loadDefaultSearchSettings = () => {
  const settings = localStorage.getItem('defaultSearchSettings')
  if (settings) {
    try {
      const parsed = JSON.parse(settings)
      defaultDateRange.value = parsed.dateRange || 'today'
      defaultSearchField.value = parsed.searchField || 'id'
      defaultStatusFilter.value = parsed.statusFilter || 'none'
      defaultEntriesPerPage.value = parsed.entriesPerPage || 30
    } catch (error) {
      console.error('讀取預設搜尋條件失敗:', error)
    }
  }
}

const saveDefaultSearchSettings = () => {
  const settings = {
    dateRange: defaultDateRange.value,
    searchField: defaultSearchField.value,
    statusFilter: defaultStatusFilter.value,
    entriesPerPage: defaultEntriesPerPage.value
  }
  localStorage.setItem('defaultSearchSettings', JSON.stringify(settings))
  alert('預設搜尋條件已儲存！')
}

const resetDefaultSearchSettings = () => {
  if (confirm('確定要重置為預設值嗎？')) {
    defaultDateRange.value = 'today'
    defaultSearchField.value = 'id'
    defaultStatusFilter.value = 'none'
    defaultEntriesPerPage.value = 30
  }
}

onMounted(() => {
  loadDefaultSearchSettings()
})
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <Navbar />
    <Sidebar active-route="account-settings" />

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
        >帳號設定</a>
      </div>

      <!-- 頁面標題 -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-800">帳號設定</h1>
      </div>

      <!-- 設定區塊容器 -->
      <div class="flex flex-col lg:flex-row gap-6">
        <!-- 預設搜尋條件設定 -->
        <div class="bg-white rounded-xl p-8 shadow-md flex-1">
          <h2 class="text-xl font-semibold text-gray-800 mb-6 pb-4 border-b-2 border-gray-200">預設搜尋條件</h2>

          <div class="space-y-6">
            <!-- 預設日期範圍 -->
            <div class="space-y-2">
              <label class="block text-gray-700 text-sm font-medium">預設日期範圍</label>
              <div class="flex flex-wrap gap-3">
                <button
                  @click="defaultDateRange = 'today'"
                  type="button"
                  :class="[
                    'px-4 py-2 border-2 rounded-lg text-sm font-medium cursor-pointer transition-all',
                    defaultDateRange === 'today'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                      : 'bg-white text-blue-600 border-blue-600 hover:bg-blue-50'
                  ]"
                >
                  今日
                </button>
                <button
                  @click="defaultDateRange = 'thisMonth'"
                  type="button"
                  :class="[
                    'px-4 py-2 border-2 rounded-lg text-sm font-medium cursor-pointer transition-all',
                    defaultDateRange === 'thisMonth'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                      : 'bg-white text-blue-600 border-blue-600 hover:bg-blue-50'
                  ]"
                >
                  本月
                </button>
              </div>
            </div>

            <!-- 預設搜尋欄位 -->
            <div class="space-y-2">
              <label class="block text-gray-700 text-sm font-medium">預設搜尋欄位</label>
              <div class="flex flex-wrap gap-3">
                <button
                  @click="defaultSearchField = 'id'"
                  type="button"
                  :class="[
                    'px-4 py-2 border-2 rounded-lg text-sm font-medium cursor-pointer transition-all',
                    defaultSearchField === 'id'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                      : 'bg-white text-blue-600 border-blue-600 hover:bg-blue-50'
                  ]"
                >
                  訂票人身分證字號
                </button>
                <button
                  @click="defaultSearchField = 'name'"
                  type="button"
                  :class="[
                    'px-4 py-2 border-2 rounded-lg text-sm font-medium cursor-pointer transition-all',
                    defaultSearchField === 'name'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                      : 'bg-white text-blue-600 border-blue-600 hover:bg-blue-50'
                  ]"
                >
                  訂票人姓名
                </button>
                <button
                  @click="defaultSearchField = 'phone'"
                  type="button"
                  :class="[
                    'px-4 py-2 border-2 rounded-lg text-sm font-medium cursor-pointer transition-all',
                    defaultSearchField === 'phone'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                      : 'bg-white text-blue-600 border-blue-600 hover:bg-blue-50'
                  ]"
                >
                  訂票人電話
                </button>
                <button
                  @click="defaultSearchField = 'orderNo'"
                  type="button"
                  :class="[
                    'px-4 py-2 border-2 rounded-lg text-sm font-medium cursor-pointer transition-all',
                    defaultSearchField === 'orderNo'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                      : 'bg-white text-blue-600 border-blue-600 hover:bg-blue-50'
                  ]"
                >
                  訂單編號
                </button>
                <button
                  @click="defaultSearchField = 'distributor'"
                  type="button"
                  :class="[
                    'px-4 py-2 border-2 rounded-lg text-sm font-medium cursor-pointer transition-all',
                    defaultSearchField === 'distributor'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                      : 'bg-white text-blue-600 border-blue-600 hover:bg-blue-50'
                  ]"
                >
                  經銷商名稱
                </button>
              </div>
            </div>

            <!-- 預設票卷狀態篩選 -->
            <div class="space-y-2">
              <label class="block text-gray-700 text-sm font-medium">預設票卷狀態篩選</label>
              <div class="flex flex-wrap gap-3">
                <button
                  @click="defaultStatusFilter = 'none'"
                  type="button"
                  :class="[
                    'px-4 py-2 border-2 rounded-lg text-sm font-medium cursor-pointer transition-all',
                    defaultStatusFilter === 'none'
                      ? 'bg-gray-600 text-white border-gray-600 shadow-md'
                      : 'bg-white text-gray-600 border-gray-600 hover:bg-gray-50'
                  ]"
                >
                  全部
                </button>
                <button
                  @click="defaultStatusFilter = 'unpicked'"
                  type="button"
                  :class="[
                    'px-4 py-2 border-2 rounded-lg text-sm font-medium cursor-pointer transition-all',
                    defaultStatusFilter === 'unpicked'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                      : 'bg-white text-blue-600 border-blue-600 hover:bg-blue-50'
                  ]"
                >
                  未取票
                </button>
                <button
                  @click="defaultStatusFilter = 'picked'"
                  type="button"
                  :class="[
                    'px-4 py-2 border-2 rounded-lg text-sm font-medium cursor-pointer transition-all',
                    defaultStatusFilter === 'picked'
                      ? 'bg-orange-600 text-white border-orange-600 shadow-md'
                      : 'bg-white text-orange-600 border-orange-600 hover:bg-orange-50'
                  ]"
                >
                  已取票
                </button>
                <button
                  @click="defaultStatusFilter = 'boarded'"
                  type="button"
                  :class="[
                    'px-4 py-2 border-2 rounded-lg text-sm font-medium cursor-pointer transition-all',
                    defaultStatusFilter === 'boarded'
                      ? 'bg-green-600 text-white border-green-600 shadow-md'
                      : 'bg-white text-green-600 border-green-600 hover:bg-green-50'
                  ]"
                >
                  已登船
                </button>
                <button
                  @click="defaultStatusFilter = 'cancelled'"
                  type="button"
                  :class="[
                    'px-4 py-2 border-2 rounded-lg text-sm font-medium cursor-pointer transition-all',
                    defaultStatusFilter === 'cancelled'
                      ? 'bg-red-600 text-white border-red-600 shadow-md'
                      : 'bg-white text-red-600 border-red-600 hover:bg-red-50'
                  ]"
                >
                  已取消
                </button>
              </div>
            </div>

            <!-- 預設每頁顯示筆數 -->
            <div class="space-y-2">
              <label
                for="defaultEntriesPerPage"
                class="block text-gray-700 text-sm font-medium"
              >預設每頁顯示筆數</label>
              <select
                v-model.number="defaultEntriesPerPage"
                id="defaultEntriesPerPage"
                class="w-full p-3 border-2 border-gray-300 rounded-lg text-base transition-all outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              >
                <option :value="30">30 筆</option>
                <option :value="50">50 筆</option>
                <option :value="100">100 筆</option>
              </select>
            </div>

            <!-- 按鈕群組 -->
            <div class="flex gap-4 pt-4">
              <button
                @click="saveDefaultSearchSettings"
                type="button"
                class="py-3 px-8 bg-green-600 text-white border-2 border-green-600 rounded-lg text-base font-semibold cursor-pointer transition-all shadow-lg hover:bg-green-700 hover:border-green-700 hover:-translate-y-0.5 hover:shadow-xl"
              >
                儲存設定
              </button>
              <button
                @click="resetDefaultSearchSettings"
                type="button"
                class="py-3 px-8 bg-white text-gray-600 border-2 border-gray-400 rounded-lg text-base font-semibold cursor-pointer transition-all hover:bg-gray-50"
              >
                重置為預設值
              </button>
            </div>
          </div>
        </div>

        <!-- 重設密碼表單 -->
        <div class="bg-white rounded-xl p-8 shadow-md flex-1">
          <h2 class="text-xl font-semibold text-gray-800 mb-6 pb-4 border-b-2 border-gray-200">重設密碼</h2>

          <form
            @submit.prevent="handleSubmit"
            class="space-y-6"
          >
            <!-- 舊密碼 -->
            <div class="space-y-2">
              <label
                for="oldPassword"
                class="block text-gray-700 text-sm font-medium"
              >
                舊密碼<span class="text-red-500 ml-1">*</span>
              </label>
              <div class="relative">
                <input
                  :type="showOldPassword ? 'text' : 'password'"
                  id="oldPassword"
                  v-model="oldPassword"
                  required
                  class="w-full p-3 pr-12 border-2 border-gray-300 rounded-lg text-base transition-all outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                >
                <span
                  @click="showOldPassword = !showOldPassword"
                  class="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer text-xl select-none"
                >
                  {{ showOldPassword ? '👁️' : '👁️' }}
                </span>
              </div>
            </div>

            <!-- 新密碼 -->
            <div class="space-y-2">
              <label
                for="newPassword"
                class="block text-gray-700 text-sm font-medium"
              >
                新密碼<span class="text-red-500 ml-1">*</span>
              </label>
              <div class="relative">
                <input
                  :type="showNewPassword ? 'text' : 'password'"
                  id="newPassword"
                  v-model="newPassword"
                  required
                  class="w-full p-3 pr-12 border-2 border-gray-300 rounded-lg text-base transition-all outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                >
                <span
                  @click="showNewPassword = !showNewPassword"
                  class="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer text-xl select-none"
                >
                  {{ showNewPassword ? '👁️' : '👁️' }}
                </span>
              </div>

              <!-- 密碼強度指示器 -->
              <div
                v-if="newPassword.length > 0"
                class="mt-3 space-y-2"
              >
                <div class="text-sm text-gray-600">密碼強度: <span class="font-medium">{{ passwordStrength.text }}</span>
                </div>
                <div class="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div :class="['h-full transition-all rounded-full', passwordStrength.class]"></div>
                </div>
              </div>

              <!-- 密碼要求 -->
              <div class="bg-gray-50 p-4 rounded-lg mt-3 space-y-2">
                <div class="text-sm font-semibold text-gray-700 mb-2">密碼必須符合以下條件：</div>
                <ul class="list-none space-y-1">
                  <li
                    :class="['text-sm flex items-center gap-2', requirements.length ? 'text-green-600' : 'text-gray-600']"
                  >
                    <span>{{ requirements.length ? '✓' : '○' }}</span>
                    <span>至少 8 個字元</span>
                  </li>
                  <li
                    :class="['text-sm flex items-center gap-2', requirements.lowercase ? 'text-green-600' : 'text-gray-600']"
                  >
                    <span>{{ requirements.lowercase ? '✓' : '○' }}</span>
                    <span>包含小寫英文字母</span>
                  </li>
                  <li
                    :class="['text-sm flex items-center gap-2', requirements.uppercase ? 'text-green-600' : 'text-gray-600']"
                  >
                    <span>{{ requirements.uppercase ? '✓' : '○' }}</span>
                    <span>包含大寫英文字母</span>
                  </li>
                  <li
                    :class="['text-sm flex items-center gap-2', requirements.number ? 'text-green-600' : 'text-gray-600']"
                  >
                    <span>{{ requirements.number ? '✓' : '○' }}</span>
                    <span>包含數字</span>
                  </li>
                </ul>
              </div>
            </div>

            <!-- 確認新密碼 -->
            <div class="space-y-2">
              <label
                for="confirmPassword"
                class="block text-gray-700 text-sm font-medium"
              >
                再次輸入新密碼<span class="text-red-500 ml-1">*</span>
              </label>
              <div class="relative">
                <input
                  :type="showConfirmPassword ? 'text' : 'password'"
                  id="confirmPassword"
                  v-model="confirmPassword"
                  required
                  :class="[
                    'w-full p-3 pr-12 border-2 rounded-lg text-base transition-all outline-none',
                    isPasswordMatch === null
                      ? 'border-gray-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'
                      : isPasswordMatch
                        ? 'border-green-500 focus:border-green-500 focus:ring-4 focus:ring-green-100'
                        : 'border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                  ]"
                >
                <span
                  @click="showConfirmPassword = !showConfirmPassword"
                  class="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer text-xl select-none"
                >
                  {{ showConfirmPassword ? '👁️' : '👁️' }}
                </span>
              </div>
              <div
                v-if="isPasswordMatch === false"
                class="text-red-500 text-sm mt-2"
              >密碼不一致</div>
              <div
                v-if="isPasswordMatch === true"
                class="text-green-600 text-sm mt-2"
              >密碼一致 ✓</div>
            </div>

            <!-- 按鈕群組 -->
            <div class="flex gap-4 pt-4">
              <button
                type="submit"
                :disabled="!isFormValid"
                class="py-3 px-8 bg-green-600 text-white border-2 border-green-600 rounded-lg text-base font-semibold cursor-pointer transition-all shadow-lg hover:bg-green-700 hover:border-green-700 hover:-translate-y-0.5 hover:shadow-xl disabled:bg-gray-300 disabled:border-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
              >
                重設密碼
              </button>
              <button
                type="button"
                @click="handleCancel"
                class="py-3 px-8 bg-white text-red-600 border-2 border-red-600 rounded-lg text-base font-semibold cursor-pointer transition-all hover:bg-red-600 hover:text-white"
              >
                取消
              </button>
            </div>
          </form>
        </div>


      </div>
    </main>
  </div>
</template>
