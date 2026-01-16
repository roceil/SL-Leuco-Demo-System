<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useSidebar } from '@/composables/useSidebar'
import { useTheme } from '@/composables/useTheme'
import Navbar from '@/components/Navbar.vue'
import Sidebar from '@/components/Sidebar.vue'
import PageContainer from '@/components/ui/PageContainer.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import { SPECIAL_TICKET_TYPES } from '@/constants/mockTickets'
import type { SpecialTicketType } from '@/types/whitelist'
import {
  TicketIcon,
  MagnifyingGlassIcon,
  UsersIcon,
  ArrowRightIcon,
  FaceFrownIcon
} from '@heroicons/vue/24/outline'

const router = useRouter()
const { isCollapsed } = useSidebar()
const { theme } = useTheme()
const searchQuery = ref('')

// 計算售價
const calculateSalePrice = (basePrice: number, discount: number) => {
  return Math.max(0, basePrice - discount)
}

// 搜尋過濾
const filteredTicketTypes = computed(() => {
  if (!searchQuery.value.trim()) {
    return SPECIAL_TICKET_TYPES
  }

  const query = searchQuery.value.toLowerCase()
  return SPECIAL_TICKET_TYPES.filter(
    (ticket) =>
      ticket.name.toLowerCase().includes(query) ||
      ticket.description?.toLowerCase().includes(query)
  )
})

// 前往白名單詳細頁面
const goToWhitelistDetail = (ticketType: SpecialTicketType) => {
  router.push({
    name: 'whitelist-detail',
    params: { ticketTypeId: ticketType.id }
  })
}
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
          title="特殊票種白名單管理"
          subtitle="管理各類特殊票種的乘客白名單"
          :icon="TicketIcon"
          max-width="2xl"
        >
          <!-- 搜尋欄 -->
          <div class="mb-6">
            <BaseInput
              v-model="searchQuery"
              placeholder="搜尋票種名稱或說明..."
              :icon="MagnifyingGlassIcon"
            />
          </div>

          <!-- 票種卡片列表 -->
          <div v-if="filteredTicketTypes.length > 0" class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div
              v-for="ticketType in filteredTicketTypes"
              :key="ticketType.id"
              class="group cursor-pointer rounded-2xl shadow-lg transition-[transform,shadow] duration-1000 ease-in-out"
              :class="
                theme === 'dark'
                  ? 'bg-secondary-900 border border-secondary-800'
                  : 'bg-white'
              "
              @click="goToWhitelistDetail(ticketType)"
            >
              <!-- 卡片頭部 -->
              <div
                class="p-6 text-white rounded-t-2xl overflow-hidden"
                :class="
                  theme === 'dark'
                    ? 'bg-gradient-to-r from-primary-800 to-primary-700'
                    : 'bg-gradient-to-r from-indigo-600 to-indigo-700'
                "
              >
                <div class="mb-3 flex items-center justify-between">
                  <h3 class="text-2xl font-bold">{{ ticketType.name }}</h3>
                  <div
                    class="rounded-full bg-white/20 px-3 py-1 text-sm font-semibold backdrop-blur-sm"
                  >
                    特殊票種
                  </div>
                </div>
                <p
                  :class="
                    theme === 'dark'
                      ? 'text-primary-100'
                      : 'text-indigo-100'
                  "
                >
                  {{ ticketType.description }}
                </p>
              </div>

              <!-- 卡片內容 -->
              <div class="p-6">
                <!-- 價格資訊 -->
                <div class="mb-6 grid grid-cols-2 gap-4">
                  <div
                    class="rounded-lg p-4"
                    :class="
                      theme === 'dark'
                        ? 'bg-secondary-800'
                        : 'bg-neutral-50'
                    "
                  >
                    <p
                      class="mb-1 text-sm"
                      :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-500'"
                    >
                      定價
                    </p>
                    <p
                      class="text-xl font-bold"
                      :class="theme === 'dark' ? 'text-white' : 'text-neutral-900'"
                    >
                      NT$ {{ ticketType.basePrice }}
                    </p>
                  </div>
                  <div
                    class="rounded-lg p-4"
                    :class="
                      theme === 'dark'
                        ? 'bg-secondary-800'
                        : 'bg-neutral-50'
                    "
                  >
                    <p
                      class="mb-1 text-sm"
                      :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-500'"
                    >
                      優惠價
                    </p>
                    <p
                      class="text-xl font-bold"
                      :class="
                        theme === 'dark'
                          ? 'text-primary-400'
                          : 'text-indigo-600'
                      "
                    >
                      NT$ {{ calculateSalePrice(ticketType.basePrice, ticketType.discount) }}
                    </p>
                  </div>
                </div>

                <!-- 折扣金額 -->
                <div class="mb-6">
                  <div
                    class="flex items-center justify-between rounded-lg p-4"
                    :class="
                      theme === 'dark'
                        ? 'bg-amber-900/30'
                        : 'bg-amber-50'
                    "
                  >
                    <span
                      class="text-sm font-medium"
                      :class="
                        theme === 'dark'
                          ? 'text-amber-300'
                          : 'text-amber-800'
                      "
                    >
                      折扣金額
                    </span>
                    <span
                      class="text-lg font-bold"
                      :class="
                        theme === 'dark'
                          ? 'text-amber-400'
                          : 'text-amber-600'
                      "
                    >
                      - NT$ {{ ticketType.discount }}
                    </span>
                  </div>
                </div>

                <!-- 白名單人數 -->
                <div class="mb-4">
                  <div class="flex items-center justify-between">
                    <span
                      class="text-sm font-medium"
                      :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'"
                    >
                      白名單人數
                    </span>
                    <div class="flex items-center">
                      <UsersIcon
                        class="mr-2 h-5 w-5"
                        :class="
                          theme === 'dark'
                            ? 'text-primary-400'
                            : 'text-indigo-500'
                        "
                      />
                      <span
                        class="text-lg font-bold"
                        :class="
                          theme === 'dark'
                            ? 'text-primary-400'
                            : 'text-indigo-600'
                        "
                      >
                        {{ ticketType.whitelistCount }}
                      </span>
                      <span
                        class="ml-1 text-sm"
                        :class="theme === 'dark' ? 'text-neutral-500' : 'text-neutral-500'"
                      >
                        人
                      </span>
                    </div>
                  </div>
                </div>

                <!-- 操作按鈕 -->
                <div
                  class="mt-6 border-t pt-4"
                  :class="
                    theme === 'dark'
                      ? 'border-secondary-800'
                      : 'border-neutral-200'
                  "
                >
                  <button
                    class="flex w-full items-center justify-center rounded-lg px-6 py-3 font-semibold text-white transition-all duration-300 group-hover:shadow-lg"
                    :class="
                      theme === 'dark'
                        ? 'bg-primary-600 hover:bg-primary-700'
                        : 'bg-indigo-600 hover:bg-indigo-700'
                    "
                  >
                    <span>查看與管理白名單</span>
                    <ArrowRightIcon
                      class="ml-2 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1"
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- 無結果提示 -->
          <BaseCard v-else padding="lg" class="text-center">
            <FaceFrownIcon
              class="mx-auto mb-4 h-16 w-16"
              :class="theme === 'dark' ? 'text-neutral-600' : 'text-neutral-400'"
            />
            <h3
              class="mb-2 text-xl font-semibold"
              :class="theme === 'dark' ? 'text-white' : 'text-neutral-900'"
            >
              找不到符合的票種
            </h3>
            <p
              :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-500'"
            >
              請嘗試其他搜尋關鍵字
            </p>
          </BaseCard>
        </PageContainer>
      </main>
    </div>
  </div>
</template>
