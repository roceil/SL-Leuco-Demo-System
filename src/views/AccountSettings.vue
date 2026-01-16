<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSidebar } from '@/composables/useSidebar'
import { useTheme } from '@/composables/useTheme'
import Navbar from '@/components/Navbar.vue'
import Sidebar from '@/components/Sidebar.vue'
import PageContainer from '@/components/ui/PageContainer.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import {
  Cog6ToothIcon,
  EyeIcon,
  EyeSlashIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/vue/24/outline'

const router = useRouter()
const { isCollapsed } = useSidebar()
const { theme } = useTheme()

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
    return { level: 'medium', text: '中', class: 'w-2/3 bg-amber-500' }
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
  router.push('/create-order')
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
          title="帳號設定"
          subtitle="管理個人帳號設定與偏好"
          :icon="Cog6ToothIcon"
          max-width="2xl"
        >
          <!-- 設定區塊容器 -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- 預設搜尋條件設定 -->
            <BaseCard title="預設搜尋條件" padding="lg">
              <div class="space-y-6">
                <!-- 預設日期範圍 -->
                <div class="space-y-2">
                  <label
                    class="block text-sm font-medium"
                    :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                  >
                    預設日期範圍
                  </label>
                  <div class="flex flex-wrap gap-3">
                    <button
                      @click="defaultDateRange = 'today'"
                      type="button"
                      :class="[
                        'px-4 py-2 border-2 rounded-lg text-sm font-medium cursor-pointer transition-all',
                        defaultDateRange === 'today'
                          ? theme === 'dark'
                            ? 'bg-primary-600 text-white border-primary-600 shadow-md'
                            : 'bg-primary-600 text-white border-primary-600 shadow-md'
                          : theme === 'dark'
                            ? 'bg-secondary-900 text-primary-400 border-primary-600 hover:bg-secondary-800'
                            : 'bg-white text-primary-600 border-primary-600 hover:bg-primary-50'
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
                          ? theme === 'dark'
                            ? 'bg-primary-600 text-white border-primary-600 shadow-md'
                            : 'bg-primary-600 text-white border-primary-600 shadow-md'
                          : theme === 'dark'
                            ? 'bg-secondary-900 text-primary-400 border-primary-600 hover:bg-secondary-800'
                            : 'bg-white text-primary-600 border-primary-600 hover:bg-primary-50'
                      ]"
                    >
                      本月
                    </button>
                  </div>
                </div>

                <!-- 預設搜尋欄位 -->
                <div class="space-y-2">
                  <label
                    class="block text-sm font-medium"
                    :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                  >
                    預設搜尋欄位
                  </label>
                  <div class="flex flex-wrap gap-3">
                    <button
                      v-for="field in [
                        { value: 'id', label: '訂票人身分證字號' },
                        { value: 'name', label: '訂票人姓名' },
                        { value: 'phone', label: '訂票人電話' },
                        { value: 'orderNo', label: '訂單編號' },
                        { value: 'distributor', label: '經銷商名稱' }
                      ]"
                      :key="field.value"
                      @click="defaultSearchField = field.value"
                      type="button"
                      :class="[
                        'px-4 py-2 border-2 rounded-lg text-sm font-medium cursor-pointer transition-all',
                        defaultSearchField === field.value
                          ? theme === 'dark'
                            ? 'bg-primary-600 text-white border-primary-600 shadow-md'
                            : 'bg-primary-600 text-white border-primary-600 shadow-md'
                          : theme === 'dark'
                            ? 'bg-secondary-900 text-primary-400 border-primary-600 hover:bg-secondary-800'
                            : 'bg-white text-primary-600 border-primary-600 hover:bg-primary-50'
                      ]"
                    >
                      {{ field.label }}
                    </button>
                  </div>
                </div>

                <!-- 預設票卷狀態篩選 -->
                <div class="space-y-2">
                  <label
                    class="block text-sm font-medium"
                    :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                  >
                    預設票卷狀態篩選
                  </label>
                  <div class="flex flex-wrap gap-3">
                    <button
                      v-for="status in [
                        { value: 'none', label: '全部', color: 'neutral' },
                        { value: 'unpicked', label: '未取票', color: 'primary' },
                        { value: 'picked', label: '已取票', color: 'amber' },
                        { value: 'boarded', label: '已登船', color: 'green' },
                        { value: 'cancelled', label: '已取消', color: 'red' }
                      ]"
                      :key="status.value"
                      @click="defaultStatusFilter = status.value"
                      type="button"
                      :class="[
                        'px-4 py-2 border-2 rounded-lg text-sm font-medium cursor-pointer transition-all',
                        defaultStatusFilter === status.value
                          ? `bg-${status.color}-600 text-white border-${status.color}-600 shadow-md`
                          : theme === 'dark'
                            ? `bg-secondary-900 text-${status.color}-400 border-${status.color}-600 hover:bg-secondary-800`
                            : `bg-white text-${status.color}-600 border-${status.color}-600 hover:bg-${status.color}-50`
                      ]"
                    >
                      {{ status.label }}
                    </button>
                  </div>
                </div>

                <!-- 預設每頁顯示筆數 -->
                <div class="space-y-2">
                  <label
                    for="defaultEntriesPerPage"
                    class="block text-sm font-medium"
                    :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                  >
                    預設每頁顯示筆數
                  </label>
                  <select
                    v-model.number="defaultEntriesPerPage"
                    id="defaultEntriesPerPage"
                    :class="[
                      'w-full p-3 border-2 rounded-lg text-base transition-all outline-none focus:ring-4',
                      theme === 'dark'
                        ? 'bg-secondary-900 border-secondary-700 text-white focus:border-primary-500 focus:ring-primary-900/30'
                        : 'border-neutral-300 focus:border-primary-500 focus:ring-primary-100'
                    ]"
                  >
                    <option :value="30">30 筆</option>
                    <option :value="50">50 筆</option>
                    <option :value="100">100 筆</option>
                  </select>
                </div>

                <!-- 按鈕群組 -->
                <div class="flex gap-4 pt-4">
                  <BaseButton
                    variant="primary"
                    @click="saveDefaultSearchSettings"
                  >
                    儲存設定
                  </BaseButton>
                  <BaseButton
                    variant="outline"
                    @click="resetDefaultSearchSettings"
                  >
                    重置為預設值
                  </BaseButton>
                </div>
              </div>
            </BaseCard>

            <!-- 重設密碼表單 -->
            <BaseCard title="重設密碼" padding="lg">
              <form @submit.prevent="handleSubmit" class="space-y-6">
                <!-- 舊密碼 -->
                <div class="space-y-2">
                  <label
                    for="oldPassword"
                    class="block text-sm font-medium"
                    :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                  >
                    舊密碼<span class="text-red-500 ml-1">*</span>
                  </label>
                  <div class="relative">
                    <input
                      :type="showOldPassword ? 'text' : 'password'"
                      id="oldPassword"
                      v-model="oldPassword"
                      required
                      :class="[
                        'w-full p-3 pr-12 border-2 rounded-lg text-base transition-all outline-none focus:ring-4',
                        theme === 'dark'
                          ? 'bg-secondary-900 border-secondary-700 text-white focus:border-primary-500 focus:ring-primary-900/30'
                          : 'border-neutral-300 focus:border-primary-500 focus:ring-primary-100'
                      ]"
                    />
                    <button
                      type="button"
                      @click="showOldPassword = !showOldPassword"
                      class="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer"
                      :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'"
                    >
                      <EyeIcon v-if="!showOldPassword" class="w-5 h-5" />
                      <EyeSlashIcon v-else class="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <!-- 新密碼 -->
                <div class="space-y-2">
                  <label
                    for="newPassword"
                    class="block text-sm font-medium"
                    :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                  >
                    新密碼<span class="text-red-500 ml-1">*</span>
                  </label>
                  <div class="relative">
                    <input
                      :type="showNewPassword ? 'text' : 'password'"
                      id="newPassword"
                      v-model="newPassword"
                      required
                      :class="[
                        'w-full p-3 pr-12 border-2 rounded-lg text-base transition-all outline-none focus:ring-4',
                        theme === 'dark'
                          ? 'bg-secondary-900 border-secondary-700 text-white focus:border-primary-500 focus:ring-primary-900/30'
                          : 'border-neutral-300 focus:border-primary-500 focus:ring-primary-100'
                      ]"
                    />
                    <button
                      type="button"
                      @click="showNewPassword = !showNewPassword"
                      class="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer"
                      :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'"
                    >
                      <EyeIcon v-if="!showNewPassword" class="w-5 h-5" />
                      <EyeSlashIcon v-else class="w-5 h-5" />
                    </button>
                  </div>

                  <!-- 密碼強度指示器 -->
                  <div v-if="newPassword.length > 0" class="mt-3 space-y-2">
                    <div
                      class="text-sm"
                      :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'"
                    >
                      密碼強度: <span class="font-medium">{{ passwordStrength.text }}</span>
                    </div>
                    <div
                      :class="[
                        'h-2 rounded-full overflow-hidden',
                        theme === 'dark' ? 'bg-secondary-800' : 'bg-neutral-200'
                      ]"
                    >
                      <div :class="['h-full transition-all rounded-full', passwordStrength.class]"></div>
                    </div>
                  </div>

                  <!-- 密碼要求 -->
                  <div
                    :class="[
                      'p-4 rounded-lg mt-3 space-y-2',
                      theme === 'dark' ? 'bg-secondary-950' : 'bg-neutral-50'
                    ]"
                  >
                    <div
                      class="text-sm font-semibold mb-2"
                      :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
                    >
                      密碼必須符合以下條件：
                    </div>
                    <ul class="list-none space-y-1">
                      <li
                        v-for="(req, key) in requirements"
                        :key="key"
                        :class="[
                          'text-sm flex items-center gap-2',
                          req
                            ? 'text-green-600'
                            : theme === 'dark'
                              ? 'text-neutral-400'
                              : 'text-neutral-600'
                        ]"
                      >
                        <CheckCircleIcon v-if="req" class="w-4 h-4" />
                        <XCircleIcon v-else class="w-4 h-4 opacity-50" />
                        <span>
                          {{
                            key === 'length' ? '至少 8 個字元' :
                            key === 'lowercase' ? '包含小寫英文字母' :
                            key === 'uppercase' ? '包含大寫英文字母' :
                            '包含數字'
                          }}
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>

                <!-- 確認新密碼 -->
                <div class="space-y-2">
                  <label
                    for="confirmPassword"
                    class="block text-sm font-medium"
                    :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
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
                        'w-full p-3 pr-12 border-2 rounded-lg text-base transition-all outline-none focus:ring-4',
                        isPasswordMatch === null
                          ? theme === 'dark'
                            ? 'bg-secondary-900 border-secondary-700 text-white focus:border-primary-500 focus:ring-primary-900/30'
                            : 'border-neutral-300 focus:border-primary-500 focus:ring-primary-100'
                          : isPasswordMatch
                            ? 'border-green-500 focus:border-green-500 focus:ring-green-100'
                            : 'border-red-500 focus:border-red-500 focus:ring-red-100',
                        theme === 'dark' && isPasswordMatch === null ? 'text-white' : ''
                      ]"
                    />
                    <button
                      type="button"
                      @click="showConfirmPassword = !showConfirmPassword"
                      class="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer"
                      :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'"
                    >
                      <EyeIcon v-if="!showConfirmPassword" class="w-5 h-5" />
                      <EyeSlashIcon v-else class="w-5 h-5" />
                    </button>
                  </div>
                  <div v-if="isPasswordMatch === false" class="text-red-500 text-sm mt-2">
                    密碼不一致
                  </div>
                  <div v-if="isPasswordMatch === true" class="text-green-600 text-sm mt-2 flex items-center gap-1">
                    <CheckCircleIcon class="w-4 h-4" />
                    密碼一致
                  </div>
                </div>

                <!-- 按鈕群組 -->
                <div class="flex gap-4 pt-4">
                  <BaseButton
                    type="submit"
                    variant="primary"
                    :disabled="!isFormValid"
                  >
                    重設密碼
                  </BaseButton>
                  <BaseButton
                    type="button"
                    variant="danger"
                    @click="handleCancel"
                  >
                    取消
                  </BaseButton>
                </div>
              </form>
            </BaseCard>
          </div>
        </PageContainer>
      </main>
    </div>
  </div>
</template>
