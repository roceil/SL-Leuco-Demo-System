<script setup lang="ts">
defineProps<{
  username?: string
}>()
</script>

<template>
  <nav
    class="bg-gradient-to-r from-blue-700 to-blue-600 text-white px-6 h-16 flex items-center justify-between shadow-lg sticky top-0 z-50"
  >
    <div class="flex items-center gap-3 text-xl font-bold cursor-pointer">
      <span class="text-2xl">🚢</span>
      <span>藍白航運訂票系統</span>
    </div>
    <div class="flex items-center gap-4">
      <div
        class="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/20 cursor-pointer hover:bg-white/30 transition-all"
      >
        <span class="text-lg">👤</span>
        <span class="text-sm">{{ username || '管理員_測試帳號' }}</span>
      </div>
    </div>
  </nav>
</template>
