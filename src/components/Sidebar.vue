<script setup lang="ts">
import { ref, watch, onMounted, type Component } from 'vue'
import { RouterLink } from 'vue-router'
import { useSidebar } from '../composables/useSidebar'
import { useTheme } from '../composables/useTheme'
import {
  TicketIcon,
  PlusCircleIcon,
  ClipboardDocumentListIcon,
  MagnifyingGlassIcon,
  UserIcon,
  UsersIcon,
  LockClosedIcon,
  DocumentTextIcon,
  ChartBarIcon,
  ChartPieIcon,
  CurrencyDollarIcon,
  BuildingStorefrontIcon,
  TruckIcon,
  CalendarDaysIcon,
  UserGroupIcon,
  CogIcon,
  ArrowRightOnRectangleIcon,
  ChevronRightIcon,
  Bars3Icon,
  MapIcon
} from '@heroicons/vue/24/outline'

const props = defineProps<{
  activeRoute: string
}>()

const { isCollapsed, toggleSidebar } = useSidebar()
const { theme } = useTheme()

interface MenuItem {
  label: string
  icon: Component
  route?: string
  children?: MenuItem[]
}

const menuItems: MenuItem[] = [
  {
    label: '售票作業',
    icon: TicketIcon,
    children: [
      { label: '建立訂單', icon: PlusCircleIcon, route: '/create-order' },
      { label: '訂單管理', icon: ClipboardDocumentListIcon, route: '/order-search' },
      { label: '網單查詢', icon: MagnifyingGlassIcon, route: '/order-management' }
    ]
  },
  {
    label: '帳號管理',
    icon: UserIcon,
    route: '/account-management'
  },
  {
    label: '角色管理',
    icon: UsersIcon,
    route: '/role-management'
  },
  {
    label: '權限管理',
    icon: LockClosedIcon,
    route: '/permission-management'
  },
  {
    label: '票務管理',
    icon: TicketIcon,
    children: [
      { label: '票種管理', icon: TicketIcon, route: '/ticket-management' },
      { label: '航點與航段管理', icon: MapIcon, route: '/route-management' },
      { label: '特殊票種白名單', icon: DocumentTextIcon, route: '/special-ticket-whitelist' }
    ]
  },
  {
    label: '報表管理',
    icon: ChartBarIcon,
    children: [
      { label: '報表總覽', icon: ChartPieIcon, route: '/report' },
      { label: '票口現金報表', icon: CurrencyDollarIcon, route: '/cash-report' },
      { label: '經銷商報表', icon: BuildingStorefrontIcon, route: '/dealer-report' }
    ]
  },
  {
    label: '船務管理',
    icon: TruckIcon,
    children: [
      { label: '載運分析', icon: ChartBarIcon, route: '/transport-analysis' },
      { label: '船隻管理', icon: TruckIcon, route: '/ship-management' },
      { label: '船班管理', icon: CalendarDaysIcon, route: '/schedule-management' }
    ]
  },
  {
    label: '乘客清單',
    icon: UserGroupIcon,
    route: '/passenger-list'
  },
  {
    label: '個人帳號設定',
    icon: CogIcon,
    route: '/account-settings'
  }
]

// 儲存展開狀態，使用選單 label 作為 key
const expandedMenus = ref<Record<string, boolean>>({})

const toggleMenu = (label: string) => {
  expandedMenus.value[label] = !expandedMenus.value[label]
}

const isMenuExpanded = (label: string) => {
  return expandedMenus.value[label] || false
}

// 檢查子選單項目是否為當前活動路由
const isChildActive = (item: MenuItem) => {
  if (!item.children) return false
  return item.children.some(child => child.route === `/${props.activeRoute}`)
}

// 根據當前路由自動展開對應的父選單
const updateExpandedMenus = () => {
  const currentRoute = `/${props.activeRoute}`

  // 遍歷所有選單項目
  menuItems.forEach(item => {
    if (item.children) {
      // 檢查當前路由是否屬於這個父選單
      const isCurrentMenuActive = item.children.some(child => child.route === currentRoute)

      if (isCurrentMenuActive) {
        // 如果當前路由屬於這個父選單，展開它
        expandedMenus.value[item.label] = true
      } else {
        // 如果當前路由不屬於這個父選單，折疊它
        expandedMenus.value[item.label] = false
      }
    }
  })
}

// 初始化時自動展開
onMounted(() => {
  updateExpandedMenus()
})

// 監聽路由變化，自動更新展開狀態
watch(() => props.activeRoute, () => {
  updateExpandedMenus()
})
</script>

<template>
  <aside :class="[
    'pt-3 transition-all duration-300 fixed left-0 top-16 h-[calc(100vh-4rem)] flex flex-col z-40 border-r',
    isCollapsed ? 'w-20' : 'w-64',
    theme === 'dark'
      ? 'bg-secondary-900 border-secondary-800'
      : 'bg-white border-neutral-200'
  ]">
    <ul class="list-none space-y-1 flex-1 overflow-y-auto px-2">
      <li v-for="item in menuItems" :key="item.label">
        <!-- 有子選單的項目 -->
        <template v-if="item.children">
          <button
            @click="toggleMenu(item.label)"
            :class="[
              'flex items-center gap-3 py-3 text-sm transition-all rounded-lg w-full font-medium',
              isCollapsed ? 'px-3 justify-center' : 'px-4',
              isChildActive(item)
                ? theme === 'dark'
                  ? 'text-primary-400 bg-primary-950'
                  : 'text-primary-600 bg-primary-50'
                : theme === 'dark'
                  ? 'text-neutral-300 hover:bg-secondary-800 hover:text-white'
                  : 'text-neutral-700 hover:bg-neutral-100 hover:text-primary-600'
            ]"
            :title="isCollapsed ? item.label : ''"
          >
            <component :is="item.icon" class="w-5 h-5 shrink-0" />
            <span v-show="!isCollapsed" class="whitespace-nowrap flex-1 text-left">{{ item.label }}</span>
            <ChevronRightIcon
              v-show="!isCollapsed"
              class="w-4 h-4 transition-transform"
              :class="{ 'rotate-90': isMenuExpanded(item.label) }"
            />
          </button>

          <!-- 子選單 -->
          <ul v-show="isMenuExpanded(item.label) && !isCollapsed" class="mt-1 space-y-1 mb-2">
            <li v-for="child in item.children" :key="child.label">
              <RouterLink
                :to="child.route!"
                :class="[
                  'flex items-center gap-3 py-2.5 text-sm transition-all rounded-lg pl-11 pr-4',
                  props.activeRoute === child.route?.slice(1)
                    ? theme === 'dark'
                      ? 'text-primary-300 bg-primary-950 font-medium'
                      : 'text-primary-700 bg-primary-100 font-medium'
                    : theme === 'dark'
                      ? 'text-neutral-400 hover:bg-secondary-800 hover:text-white'
                      : 'text-neutral-600 hover:bg-neutral-50 hover:text-primary-600'
                ]"
              >
                <component :is="child.icon" class="w-4 h-4 shrink-0" />
                <span class="whitespace-nowrap">{{ child.label }}</span>
              </RouterLink>
            </li>
          </ul>
        </template>

        <!-- 沒有子選單的項目 -->
        <RouterLink
          v-else
          :to="item.route!"
          :class="[
            'flex items-center gap-3 py-3 text-sm transition-all rounded-lg font-medium',
            isCollapsed ? 'px-3 justify-center' : 'px-4',
            props.activeRoute === item.route?.slice(1)
              ? theme === 'dark'
                ? 'text-primary-400 bg-primary-950'
                : 'text-primary-600 bg-primary-50'
              : theme === 'dark'
                ? 'text-neutral-300 hover:bg-secondary-800 hover:text-white'
                : 'text-neutral-700 hover:bg-neutral-100 hover:text-primary-600'
          ]"
          :title="isCollapsed ? item.label : ''"
        >
          <component :is="item.icon" class="w-5 h-5 shrink-0" />
          <span v-show="!isCollapsed" class="whitespace-nowrap">{{ item.label }}</span>
        </RouterLink>
      </li>

      <!-- 登出按鈕 -->
      <li>
        <RouterLink
          to="/"
          :class="[
            'flex items-center gap-3 py-3 text-sm transition-all rounded-lg font-medium',
            isCollapsed ? 'px-3 justify-center' : 'px-4',
            theme === 'dark'
              ? 'text-red-400 hover:bg-red-950 hover:text-red-300'
              : 'text-red-600 hover:bg-red-50 hover:text-red-700'
          ]"
          :title="isCollapsed ? '登出' : ''"
        >
          <ArrowRightOnRectangleIcon class="w-5 h-5 shrink-0" />
          <span v-show="!isCollapsed" class="whitespace-nowrap">登出</span>
        </RouterLink>
      </li>
    </ul>

    <!-- 切換按鈕 -->
    <div class="border-t p-2" :class="theme === 'dark' ? 'border-secondary-800' : 'border-neutral-200'">
      <button
        @click="toggleSidebar"
        :class="[
          'w-full h-10 flex items-center justify-center rounded-lg transition-all font-medium',
          theme === 'dark'
            ? 'bg-primary-900 hover:bg-primary-800 text-primary-300'
            : 'bg-primary-500 hover:bg-primary-600 text-white'
        ]"
        :title="isCollapsed ? '展開側邊欄' : '收起側邊欄'"
      >
        <Bars3Icon v-if="isCollapsed" class="w-5 h-5" />
        <ChevronRightIcon v-else class="w-5 h-5 rotate-180" />
      </button>
    </div>
  </aside>
</template>
