<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const username = ref('')
const password = ref('')
const remember = ref(false)
const usernameError = ref(false)
const passwordError = ref(false)

const handleSubmit = () => {
  usernameError.value = false
  passwordError.value = false

  let isValid = true

  if (username.value.trim() === '') {
    usernameError.value = true
    isValid = false
  }

  if (password.value.trim() === '') {
    passwordError.value = true
    isValid = false
  }

  if (isValid) {
    router.push('/dashboard')
  }
}

const clearError = (field: 'username' | 'password') => {
  if (field === 'username') {
    usernameError.value = false
  } else {
    passwordError.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-700 to-blue-600 flex items-center justify-center p-5">
    <div class="bg-white rounded-2xl shadow-2xl p-12 w-full max-w-md animate-fadeIn">
      <!-- Logo -->
      <div class="text-center mb-10">
        <div class="flex items-center justify-center gap-3 text-blue-600 text-2xl font-bold">
          <div>
            <div class="text-2xl">藍白航運</div>
            <div class="text-sm text-gray-600 font-normal">LEUCO SAPPHIRE SHIPPING</div>
          </div>
        </div>
      </div>

      <!-- Login Form -->
      <form
        @submit.prevent="handleSubmit"
        class="space-y-6"
      >
        <div>
          <label
            for="username"
            class="block text-gray-700 text-sm font-medium mb-2"
          >帳號</label>
          <div class="relative">
            <span class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">👤</span>
            <input
              type="text"
              id="username"
              v-model="username"
              @input="clearError('username')"
              :class="[
                'w-full py-3.5 px-4 pl-12 border-2 rounded-lg text-base transition-all outline-none',
                usernameError ? 'border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-100' : 'border-gray-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'
              ]"
              placeholder="請輸入帳號"
              required
            >
          </div>
          <div
            v-if="usernameError"
            class="text-red-500 text-sm mt-2"
          >請輸入有效的帳號</div>
        </div>

        <div>
          <label
            for="password"
            class="block text-gray-700 text-sm font-medium mb-2"
          >密碼</label>
          <div class="relative">
            <span class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">🔒</span>
            <input
              type="password"
              id="password"
              v-model="password"
              @input="clearError('password')"
              :class="[
                'w-full py-3.5 px-4 pl-12 border-2 rounded-lg text-base transition-all outline-none',
                passwordError ? 'border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-100' : 'border-gray-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'
              ]"
              placeholder="請輸入密碼"
              required
            >
          </div>
          <div
            v-if="passwordError"
            class="text-red-500 text-sm mt-2"
          >請輸入密碼</div>
        </div>

        <div class="flex items-center">
          <input
            type="checkbox"
            id="remember"
            v-model="remember"
            class="w-4 h-4 mr-2 cursor-pointer accent-blue-600"
          >
          <label
            for="remember"
            class="text-gray-600 text-sm cursor-pointer select-none"
          >記住我</label>
        </div>

        <button
          type="submit"
          class="w-full py-4 px-6 bg-blue-600 text-white rounded-lg text-base font-semibold cursor-pointer transition-all shadow-lg hover:bg-blue-700 hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0 focus:outline-none focus:ring-4 focus:ring-blue-300"
        >
          登入
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fadeIn {
  animation: fadeIn 0.5s ease-in-out;
}
</style>
