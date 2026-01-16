<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useTheme } from '@/composables/useTheme'
import BaseButton from '@/components/ui/BaseButton.vue'
import {
  ArrowLeftIcon,
  HomeIcon,
  TruckIcon
} from '@heroicons/vue/24/outline'

const router = useRouter()
const { theme } = useTheme()

const goBack = () => {
  router.back()
}

const goHome = () => {
  router.push('/create-order')
}
</script>

<template>
  <div
    class="min-h-screen flex items-center justify-center p-4"
    :class="
      theme === 'dark'
        ? 'bg-gradient-to-br from-secondary-950 to-secondary-900'
        : 'bg-gradient-to-br from-primary-50 to-neutral-100'
    "
  >
    <div class="max-w-2xl w-full text-center">
      <!-- 404 圖示 -->
      <div class="mb-8">
        <div
          class="text-9xl font-bold mb-4 animate-bounce"
          :class="
            theme === 'dark'
              ? 'text-primary-500'
              : 'text-primary-600'
          "
        >
          404
        </div>
        <TruckIcon
          class="w-24 h-24 mx-auto"
          :class="
            theme === 'dark'
              ? 'text-primary-400'
              : 'text-primary-500'
          "
        />
      </div>

      <!-- 錯誤訊息 -->
      <h1
        class="text-3xl font-bold mb-4"
        :class="theme === 'dark' ? 'text-white' : 'text-neutral-800'"
      >
        找不到頁面
      </h1>
      <p
        class="text-lg mb-8"
        :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'"
      >
        抱歉，您要找的頁面似乎已經航向未知的海域...
      </p>

      <!-- 操作按鈕 -->
      <div class="flex flex-col sm:flex-row gap-4 justify-center items-center">
        <BaseButton
          variant="outline"
          :icon="ArrowLeftIcon"
          @click="goBack"
          class="min-w-[160px]"
        >
          返回上一頁
        </BaseButton>
        <BaseButton
          variant="primary"
          :icon="HomeIcon"
          @click="goHome"
          class="min-w-[160px]"
        >
          回到首頁
        </BaseButton>
      </div>

      <!-- 常用連結 -->
      <div
        class="mt-12 pt-8 border-t"
        :class="
          theme === 'dark'
            ? 'border-secondary-800'
            : 'border-neutral-300'
        "
      >
        <p
          class="text-sm mb-4"
          :class="theme === 'dark' ? 'text-neutral-500' : 'text-neutral-500'"
        >
          您可能在尋找：
        </p>
        <div class="flex flex-wrap gap-3 justify-center">
          <RouterLink
            to="/create-order"
            class="px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm"
            :class="
              theme === 'dark'
                ? 'bg-secondary-800 hover:bg-secondary-700 text-primary-400 border border-secondary-700'
                : 'bg-white hover:bg-primary-50 text-primary-600'
            "
          >
            建立訂單
          </RouterLink>
          <RouterLink
            to="/order-search"
            class="px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm"
            :class="
              theme === 'dark'
                ? 'bg-secondary-800 hover:bg-secondary-700 text-primary-400 border border-secondary-700'
                : 'bg-white hover:bg-primary-50 text-primary-600'
            "
          >
            訂單查詢
          </RouterLink>
          <RouterLink
            to="/report"
            class="px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm"
            :class="
              theme === 'dark'
                ? 'bg-secondary-800 hover:bg-secondary-700 text-primary-400 border border-secondary-700'
                : 'bg-white hover:bg-primary-50 text-primary-600'
            "
          >
            報表總覽
          </RouterLink>
          <RouterLink
            to="/account-settings"
            class="px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm"
            :class="
              theme === 'dark'
                ? 'bg-secondary-800 hover:bg-secondary-700 text-primary-400 border border-secondary-700'
                : 'bg-white hover:bg-primary-50 text-primary-600'
            "
          >
            帳號設定
          </RouterLink>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-20px);
  }
}

.animate-bounce {
  animation: bounce 2s ease-in-out infinite;
}
</style>
