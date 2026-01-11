<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useSidebar } from '../composables/useSidebar'

defineProps<{
  activeRoute: string
}>()

const { isCollapsed, toggleSidebar } = useSidebar()
</script>

<template>
  <aside :class="[
    'bg-white shadow-lg pt-3 transition-all duration-300 fixed left-0 top-16 h-[calc(100vh-4rem)] flex flex-col z-40',
    isCollapsed ? 'w-20' : 'w-64'
  ]">


    <ul class="list-none space-y-1 flex-1 overflow-y-auto">
      <li>
        <RouterLink
          to="/dashboard"
          :class="[
            'flex items-center gap-3 py-3.5 text-base transition-all border-l-4',
            isCollapsed ? 'px-4 justify-center' : 'px-6',
            activeRoute === 'dashboard'
              ? 'text-blue-700 bg-blue-50 border-blue-700 font-semibold'
              : 'text-gray-600 border-transparent hover:bg-gray-50 hover:text-blue-700'
          ]"
          :title="isCollapsed ? '訂位作業' : ''"
        >
          <span class="text-xl w-6 text-center shrink-0">🎫</span>
          <span
            v-show="!isCollapsed"
            class="whitespace-nowrap"
          >訂位作業</span>
        </RouterLink>
      </li>
      <li>
        <RouterLink
          to="/order-search"
          :class="[
            'flex items-center gap-3 py-3.5 text-base transition-all border-l-4',
            isCollapsed ? 'px-4 justify-center' : 'px-6',
            activeRoute === 'order-search'
              ? 'text-blue-700 bg-blue-50 border-blue-700 font-semibold'
              : 'text-gray-600 border-transparent hover:bg-gray-50 hover:text-blue-700'
          ]"
          :title="isCollapsed ? '訂單查詢' : ''"
        >
          <span class="text-xl w-6 text-center shrink-0">🔍</span>
          <span
            v-show="!isCollapsed"
            class="whitespace-nowrap"
          >訂單查詢</span>
        </RouterLink>
      </li>
      <li>
        <RouterLink
          to="/report"
          :class="[
            'flex items-center gap-3 py-3.5 text-base transition-all border-l-4',
            isCollapsed ? 'px-4 justify-center' : 'px-6',
            activeRoute === 'report'
              ? 'text-blue-700 bg-blue-50 border-blue-700 font-semibold'
              : 'text-gray-600 border-transparent hover:bg-gray-50 hover:text-blue-700'
          ]"
          :title="isCollapsed ? '報表總覽' : ''"
        >
          <span class="text-xl w-6 text-center shrink-0">📊</span>
          <span
            v-show="!isCollapsed"
            class="whitespace-nowrap"
          >報表總覽</span>
        </RouterLink>
      </li>
      <li>
        <RouterLink
          to="/account-management"
          :class="[
            'flex items-center gap-3 py-3.5 text-base transition-all border-l-4',
            isCollapsed ? 'px-4 justify-center' : 'px-6',
            activeRoute === 'account-management'
              ? 'text-blue-700 bg-blue-50 border-blue-700 font-semibold'
              : 'text-gray-600 border-transparent hover:bg-gray-50 hover:text-blue-700'
          ]"
          :title="isCollapsed ? '帳號管理' : ''"
        >
          <span class="text-xl w-6 text-center shrink-0">👤</span>
          <span
            v-show="!isCollapsed"
            class="whitespace-nowrap"
          >帳號管理</span>
        </RouterLink>
      </li>
      <li>
        <RouterLink
          to="/role-management"
          :class="[
            'flex items-center gap-3 py-3.5 text-base transition-all border-l-4',
            isCollapsed ? 'px-4 justify-center' : 'px-6',
            activeRoute === 'role-management'
              ? 'text-blue-700 bg-blue-50 border-blue-700 font-semibold'
              : 'text-gray-600 border-transparent hover:bg-gray-50 hover:text-blue-700'
          ]"
          :title="isCollapsed ? '角色管理' : ''"
        >
          <span class="text-xl w-6 text-center shrink-0">👥</span>
          <span
            v-show="!isCollapsed"
            class="whitespace-nowrap"
          >角色管理</span>
        </RouterLink>
      </li>
      <li>
        <RouterLink
          to="/permission-management"
          :class="[
            'flex items-center gap-3 py-3.5 text-base transition-all border-l-4',
            isCollapsed ? 'px-4 justify-center' : 'px-6',
            activeRoute === 'permission-management'
              ? 'text-blue-700 bg-blue-50 border-blue-700 font-semibold'
              : 'text-gray-600 border-transparent hover:bg-gray-50 hover:text-blue-700'
          ]"
          :title="isCollapsed ? '權限管理' : ''"
        >
          <span class="text-xl w-6 text-center shrink-0">🔐</span>
          <span
            v-show="!isCollapsed"
            class="whitespace-nowrap"
          >權限管理</span>
        </RouterLink>
      </li>
      <li>
        <RouterLink
          to="/ticket-management"
          :class="[
            'flex items-center gap-3 py-3.5 text-base transition-all border-l-4',
            isCollapsed ? 'px-4 justify-center' : 'px-6',
            activeRoute === 'ticket-management'
              ? 'text-blue-700 bg-blue-50 border-blue-700 font-semibold'
              : 'text-gray-600 border-transparent hover:bg-gray-50 hover:text-blue-700'
          ]"
          :title="isCollapsed ? '票種管理' : ''"
        >
          <span class="text-xl w-6 text-center shrink-0">🎟️</span>
          <span
            v-show="!isCollapsed"
            class="whitespace-nowrap"
          >票種管理</span>
        </RouterLink>
      </li>

      <li>
        <RouterLink
          to="/account-settings"
          :class="[
            'flex items-center gap-3 py-3.5 text-base transition-all border-l-4',
            isCollapsed ? 'px-4 justify-center' : 'px-6',
            activeRoute === 'account-settings'
              ? 'text-blue-700 bg-blue-50 border-blue-700 font-semibold'
              : 'text-gray-600 border-transparent hover:bg-gray-50 hover:text-blue-700'
          ]"
          :title="isCollapsed ? '帳號設定' : ''"
        >
          <span class="text-xl w-6 text-center shrink-0">⚙️</span>
          <span
            v-show="!isCollapsed"
            class="whitespace-nowrap"
          >帳號設定</span>
        </RouterLink>
      </li>
      <li>
        <RouterLink
          to="/"
          :class="[
            'flex items-center gap-3 py-3.5 text-base text-gray-600 border-l-4 border-transparent transition-all hover:bg-gray-50 hover:text-blue-700',
            isCollapsed ? 'px-4 justify-center' : 'px-6'
          ]"
          :title="isCollapsed ? '登出' : ''"
        >
          <span class="text-xl w-6 text-center shrink-0">🚪</span>
          <span
            v-show="!isCollapsed"
            class="whitespace-nowrap"
          >登出</span>
        </RouterLink>
      </li>
    </ul>

    <!-- 切換按鈕 -->
    <div class="flex justify-end ">
      <button
        @click="toggleSidebar"
        class="bg-blue-600 hover:bg-blue-700 text-white w-full h-10 flex items-center justify-center shadow-md transition-colors"
        :title="isCollapsed ? '展開側邊欄' : '收起側邊欄'"
      >
        <span class="text-xl">{{ isCollapsed ? '›' : '‹' }}</span>
      </button>
    </div>
  </aside>
</template>
