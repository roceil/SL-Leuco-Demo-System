<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { UserIcon, LockClosedIcon, ArrowRightOnRectangleIcon, SunIcon, MoonIcon, ExclamationCircleIcon } from '@heroicons/vue/24/outline'
import { useTheme } from '../composables/useTheme'
import { useAuth } from '../composables/useAuth'

const router = useRouter()
const { theme, toggleTheme, initTheme } = useTheme()
const { login, isAccountLocked } = useAuth()

const username = ref('')
const password = ref('')
const remember = ref(false)
const usernameError = ref(false)
const passwordError = ref(false)
const loginError = ref('')
const isLoading = ref(false)
const lockInfo = ref<{ locked: boolean; lockUntil?: string } | null>(null)

onMounted(() => {
  initTheme()
})

// 檢查帳戶鎖定狀態
const checkAccountLock = () => {
  if (username.value.trim()) {
    lockInfo.value = isAccountLocked(username.value.trim())
  }
}

const handleSubmit = () => {
  usernameError.value = false
  passwordError.value = false
  loginError.value = ''

  let isValid = true

  if (username.value.trim() === '') {
    usernameError.value = true
    isValid = false
  }

  if (password.value.trim() === '') {
    passwordError.value = true
    isValid = false
  }

  if (!isValid) return

  // 執行登入
  isLoading.value = true

  // 模擬網路延遲
  setTimeout(() => {
    const result = login(username.value.trim(), password.value)

    if (result.success) {
      router.push('/create-order')
    } else {
      loginError.value = result.message
      passwordError.value = true

      // 如果帳戶被鎖定，更新鎖定資訊
      if (result.lockUntil) {
        lockInfo.value = { locked: true, lockUntil: result.lockUntil }
      }
    }

    isLoading.value = false
  }, 500)
}

const clearError = (field: 'username' | 'password') => {
  if (field === 'username') {
    usernameError.value = false
    loginError.value = ''
  } else {
    passwordError.value = false
    loginError.value = ''
  }
}
</script>

<template>
  <div
    class="min-h-screen flex items-center justify-center p-5 transition-colors duration-200"
    :class="theme === 'dark' ? 'bg-secondary-950' : 'bg-gradient-to-br from-primary-500 via-secondary-600 to-secondary-700'"
  >
    <!-- 主題切換按鈕 -->
    <button
      @click="toggleTheme"
      class="fixed top-6 right-6 p-3 rounded-full transition-all duration-200 hover:scale-110 z-10"
      :class="[
        theme === 'dark'
          ? 'bg-secondary-800 text-yellow-400 hover:bg-secondary-700'
          : 'bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm'
      ]"
      :title="theme === 'dark' ? '切換至亮色模式' : '切換至深色模式'"
    >
      <SunIcon
        v-if="theme === 'dark'"
        class="w-6 h-6"
      />
      <MoonIcon
        v-else
        class="w-6 h-6"
      />
    </button>

    <div
      class="rounded-2xl p-10 w-full max-w-md fade-in"
      :class="theme === 'dark' ? 'bg-secondary-900 border border-secondary-800' : 'bg-white shadow-2xl'"
    >
      <!-- Logo -->
      <div class="text-center mb-8">
        <div class="flex items-center justify-center mb-4">
          <svg
            class="w-16 h-16 text-primary-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M3 15s3-3 9-3 9 3 9 3M3 15v5a2 2 0 002 2h14a2 2 0 002-2v-5M3 15l3-6m15 6l-3-6m-6-3v3m0 0H9m3 0h3"
            />
          </svg>
        </div>
        <h1
          class="text-3xl font-bold mb-2"
          :class="theme === 'dark' ? 'text-white' : 'text-secondary-900'"
        >
          航運管理系統
        </h1>
        <p
          class="text-sm tracking-wider"
          :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'"
        >
          Ferry Management System
        </p>
      </div>

      <!-- 登入錯誤訊息 -->
      <div
        v-if="loginError"
        :class="[
          'mb-5 p-4 rounded-lg border flex items-start gap-3',
          theme === 'dark'
            ? 'bg-red-950/30 border-red-900 text-red-400'
            : 'bg-red-50 border-red-200 text-red-700'
        ]"
      >
        <ExclamationCircleIcon class="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div class="flex-1">
          <p class="font-medium">{{ loginError }}</p>
          <p
            v-if="lockInfo?.locked && lockInfo.lockUntil"
            class="text-sm mt-1"
            :class="theme === 'dark' ? 'text-red-300' : 'text-red-600'"
          >
            鎖定至：{{ new Date(lockInfo.lockUntil).toLocaleString('zh-TW') }}
          </p>
        </div>
      </div>

      <!-- Login Form -->
      <form
        @submit.prevent="handleSubmit"
        class="space-y-5"
      >
        <!-- 帳號欄位 -->
        <div>
          <label
            for="username"
            class="block text-sm font-medium mb-2"
            :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
          >
            帳號
          </label>
          <div class="relative">
            <UserIcon
              class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5"
              :class="[
                usernameError
                  ? 'text-red-500'
                  : theme === 'dark' ? 'text-neutral-500' : 'text-neutral-400'
              ]"
            />
            <input
              type="text"
              id="username"
              v-model="username"
              @input="clearError('username')"
              @blur="checkAccountLock"
              :disabled="isLoading"
              :class="[
                'w-full py-3 px-4 pl-11 rounded-lg text-base transition-all outline-none border',
                usernameError
                  ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                  : theme === 'dark'
                    ? 'bg-secondary-800 border-secondary-700 text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-900'
                    : 'bg-white border-neutral-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-100',
                isLoading ? 'opacity-50 cursor-not-allowed' : ''
              ]"
              placeholder="請輸入帳號"
              required
            />
          </div>
          <p
            v-if="usernameError && !loginError"
            class="text-red-500 text-sm mt-1.5 flex items-center gap-1"
          >
            <svg
              class="w-4 h-4"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fill-rule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clip-rule="evenodd"
              />
            </svg>
            請輸入有效的帳號
          </p>
        </div>

        <!-- 密碼欄位 -->
        <div>
          <label
            for="password"
            class="block text-sm font-medium mb-2"
            :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
          >
            密碼
          </label>
          <div class="relative">
            <LockClosedIcon
              class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5"
              :class="[
                passwordError
                  ? 'text-red-500'
                  : theme === 'dark' ? 'text-neutral-500' : 'text-neutral-400'
              ]"
            />
            <input
              type="password"
              id="password"
              v-model="password"
              @input="clearError('password')"
              :disabled="isLoading || lockInfo?.locked"
              :class="[
                'w-full py-3 px-4 pl-11 rounded-lg text-base transition-all outline-none border',
                passwordError
                  ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                  : theme === 'dark'
                    ? 'bg-secondary-800 border-secondary-700 text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-900'
                    : 'bg-white border-neutral-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-100',
                isLoading || lockInfo?.locked ? 'opacity-50 cursor-not-allowed' : ''
              ]"
              placeholder="請輸入密碼"
              required
            />
          </div>
          <p
            v-if="passwordError && !loginError"
            class="text-red-500 text-sm mt-1.5 flex items-center gap-1"
          >
            <svg
              class="w-4 h-4"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fill-rule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clip-rule="evenodd"
              />
            </svg>
            請輸入密碼
          </p>
        </div>

        <!-- 記住我 -->
        <div class="flex items-center">
          <input
            type="checkbox"
            id="remember"
            v-model="remember"
            class="w-4 h-4 mr-2 rounded cursor-pointer transition-all"
            :class="theme === 'dark' ? 'accent-primary-500' : 'accent-primary-600'"
          />
          <label
            for="remember"
            class="text-sm cursor-pointer select-none"
            :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-600'"
          >
            記住我
          </label>
        </div>

        <!-- 登入按鈕 -->
        <button
          type="submit"
          :disabled="isLoading || lockInfo?.locked"
          class="w-full py-3.5 px-6 rounded-lg text-base font-semibold transition-all focus:outline-none focus:ring-4 flex items-center justify-center gap-2 mt-6"
          :class="[
            isLoading || lockInfo?.locked
              ? 'bg-neutral-400 cursor-not-allowed opacity-60'
              : theme === 'dark'
                ? 'bg-primary-600 hover:bg-primary-700 text-white focus:ring-primary-900 cursor-pointer'
                : 'bg-primary-500 hover:bg-primary-600 text-white focus:ring-primary-200 shadow-lg hover:shadow-xl cursor-pointer'
          ]"
        >
          <svg
            v-if="isLoading"
            class="animate-spin h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            ></circle>
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <span>{{ isLoading ? '登入中...' : lockInfo?.locked ? '帳戶已鎖定' : '登入' }}</span>
          <ArrowRightOnRectangleIcon
            v-if="!isLoading"
            class="w-5 h-5"
          />
        </button>
      </form>

      <!-- 底部資訊 -->
      <div class="mt-6 text-center">
        <p
          class="text-xs"
          :class="theme === 'dark' ? 'text-neutral-500' : 'text-neutral-500'"
        >
          © 2026 星宸數位. All rights reserved.
        </p>
      </div>
    </div>
  </div>
</template>
