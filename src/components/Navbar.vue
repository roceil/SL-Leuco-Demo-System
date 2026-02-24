<script setup lang="ts">
import { UserCircleIcon, SunIcon, MoonIcon } from '@heroicons/vue/24/outline'
import { useTheme } from '../composables/useTheme'

defineProps<{
  username?: string
}>()

const { theme, toggleTheme } = useTheme()
</script>

<template>
  <nav
    class="h-16 px-6 flex items-center justify-between sticky top-0 z-50 border-b transition-all duration-200"
    :class="[
      theme === 'dark'
        ? 'bg-secondary-900 border-secondary-800'
        : 'bg-white border-neutral-200'
    ]"
  >
    <!-- Logo 區域 -->
    <div class="flex items-center gap-3">
      <div class="flex items-center gap-3 text-xl font-bold">
        <svg class="w-8 h-8 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M3 15s3-3 9-3 9 3 9 3M3 15v5a2 2 0 002 2h14a2 2 0 002-2v-5M3 15l3-6m15 6l-3-6m-6-3v3m0 0H9m3 0h3" />
        </svg>
        <span :class="theme === 'dark' ? 'text-white' : 'text-secondary-900'">
          航運管理系統
        </span>
      </div>
    </div>

    <!-- 右側功能區 -->
    <div class="flex items-center gap-3">
      <!-- 主題切換按鈕 -->
      <button
        @click="toggleTheme"
        class="p-2 rounded-lg transition-all duration-200 hover:scale-110"
        :class="[
          theme === 'dark'
            ? 'bg-secondary-800 text-yellow-400 hover:bg-secondary-700'
            : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
        ]"
        :title="theme === 'dark' ? '切換至亮色模式' : '切換至深色模式'"
      >
        <SunIcon v-if="theme === 'dark'" class="w-5 h-5" />
        <MoonIcon v-else class="w-5 h-5" />
      </button>

      <!-- 用戶資訊 -->
      <div
        class="flex items-center gap-2 px-4 py-2 rounded-lg transition-all cursor-pointer"
        :class="[
          theme === 'dark'
            ? 'bg-secondary-800 hover:bg-secondary-700'
            : 'bg-neutral-100 hover:bg-neutral-200'
        ]"
      >
        <UserCircleIcon class="w-5 h-5" :class="theme === 'dark' ? 'text-primary-400' : 'text-primary-600'" />
        <span class="text-sm font-medium" :class="theme === 'dark' ? 'text-white' : 'text-neutral-700'">
          {{ username || '管理員_測試帳號' }}
        </span>
      </div>
    </div>
  </nav>
</template>
