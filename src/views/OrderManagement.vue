<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import Navbar from '@/components/Navbar.vue'
import Sidebar from '@/components/Sidebar.vue'
import PageContainer from '@/components/ui/PageContainer.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import { useSidebar } from '@/composables/useSidebar'
import { useTheme } from '@/composables/useTheme'
import { useOrders } from '@/composables/useOrders'
import {
  ClipboardDocumentListIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  ArrowPathIcon
} from '@heroicons/vue/24/outline'

const router = useRouter()
const { isCollapsed } = useSidebar()
const { theme } = useTheme()
const { allOrders } = useOrders()

const searchQuery = ref('')
const statusFilter = ref('all')

// 訂單狀態選項
const statusOptions = [
  { value: 'all', label: '全部狀態' },
  { value: '未取票', label: '未取票' },
  { value: '已取票', label: '已取票' },
  { value: '已取消', label: '已取消' }
]

// 篩選和搜尋訂單
const filteredOrders = computed(() => {
  let result = allOrders.value

  // 狀態篩選
  if (statusFilter.value !== 'all') {
    result = result.filter(order => order.status === statusFilter.value)
  }

  // 搜尋篩選
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(order =>
      order.orderNumber.toLowerCase().includes(query) ||
      order.bookerName.toLowerCase().includes(query) ||
      order.bookerPhone.includes(query) ||
      order.orderOwnerName.toLowerCase().includes(query)
    )
  }

  return result
})

// 格式化日期
const formatDate = (dateString: string) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

// 查看訂單詳細
const viewOrder = (orderNumber: string) => {
  router.push(`/order-detail/${orderNumber}`)
}

// 重新整理
const handleRefresh = () => {
  searchQuery.value = ''
  statusFilter.value = 'all'
}

// 取得狀態樣式
const getStatusClass = (status: string) => {
  const baseClasses = 'px-3 py-1 rounded-full text-xs font-medium'
  switch (status) {
    case '未取票':
      return `${baseClasses} bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400`
    case '已取票':
      return `${baseClasses} bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400`
    case '已取消':
      return `${baseClasses} bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400`
    default:
      return `${baseClasses} bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300`
  }
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
          title="訂單管理"
          subtitle="查詢和管理所有訂單"
          :icon="ClipboardDocumentListIcon"
          max-width="2xl"
        >
          <!-- 搜尋和操作列 -->
          <div class="flex flex-col md:flex-row gap-4 mb-6">
            <div class="flex-1">
              <BaseInput
                v-model="searchQuery"
                placeholder="搜尋訂單編號、訂票人姓名、電話或訂票單位..."
                :icon="MagnifyingGlassIcon"
              />
            </div>
            <div class="flex gap-3">
              <select
                v-model="statusFilter"
                class="px-4 py-2 rounded-lg border transition-all outline-none"
                :class="
                  theme === 'dark'
                    ? 'bg-secondary-800 border-secondary-700 text-white focus:border-primary-500'
                    : 'bg-white border-neutral-300 text-neutral-900 focus:border-primary-500'
                "
              >
                <option
                  v-for="option in statusOptions"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </option>
              </select>
              <BaseButton
                variant="outline"
                :icon="ArrowPathIcon"
                @click="handleRefresh"
              >
                重置
              </BaseButton>
            </div>
          </div>

          <!-- 統計資訊 -->
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <BaseCard padding="md">
              <div
                class="text-sm font-medium mb-1"
                :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'"
              >
                總訂單數
              </div>
              <div
                class="text-2xl font-bold"
                :class="theme === 'dark' ? 'text-white' : 'text-neutral-900'"
              >
                {{ allOrders.length }}
              </div>
            </BaseCard>

            <BaseCard padding="md">
              <div
                class="text-sm font-medium mb-1"
                :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'"
              >
                未取票
              </div>
              <div class="text-2xl font-bold text-amber-500">
                {{ allOrders.filter(o => o.status === '未取票').length }}
              </div>
            </BaseCard>

            <BaseCard padding="md">
              <div
                class="text-sm font-medium mb-1"
                :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'"
              >
                已取票
              </div>
              <div class="text-2xl font-bold text-green-500">
                {{ allOrders.filter(o => o.status === '已取票').length }}
              </div>
            </BaseCard>

            <BaseCard padding="md">
              <div
                class="text-sm font-medium mb-1"
                :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'"
              >
                篩選結果
              </div>
              <div
                class="text-2xl font-bold"
                :class="theme === 'dark' ? 'text-primary-400' : 'text-primary-600'"
              >
                {{ filteredOrders.length }}
              </div>
            </BaseCard>
          </div>

          <!-- 訂單列表 -->
          <BaseCard padding="none">
            <div class="overflow-x-auto">
              <table
                class="w-full"
                :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
              >
                <thead
                  class="text-sm font-medium border-b"
                  :class="theme === 'dark' ? 'border-secondary-800' : 'border-neutral-200'"
                >
                  <tr>
                    <th class="text-left py-4 px-6">訂單編號</th>
                    <th class="text-left py-4 px-6">訂票人</th>
                    <th class="text-left py-4 px-6">訂票單位</th>
                    <th class="text-left py-4 px-6">去程日期</th>
                    <th class="text-left py-4 px-6">票數</th>
                    <th class="text-left py-4 px-6">金額</th>
                    <th class="text-left py-4 px-6">狀態</th>
                    <th class="text-right py-4 px-6">操作</th>
                  </tr>
                </thead>
                <tbody
                  v-if="filteredOrders.length > 0"
                  class="divide-y"
                  :class="theme === 'dark' ? 'divide-secondary-800' : 'divide-neutral-200'"
                >
                  <tr
                    v-for="order in filteredOrders"
                    :key="order.orderNumber"
                    class="hover:bg-opacity-50 transition-colors"
                    :class="theme === 'dark' ? 'hover:bg-secondary-800' : 'hover:bg-neutral-50'"
                  >
                    <td class="py-4 px-6 font-medium">
                      {{ order.orderNumber }}
                    </td>
                    <td class="py-4 px-6">
                      <div>{{ order.bookerName }}</div>
                      <div
                        class="text-sm"
                        :class="theme === 'dark' ? 'text-neutral-500' : 'text-neutral-500'"
                      >
                        {{ order.bookerPhone }}
                      </div>
                    </td>
                    <td class="py-4 px-6">
                      {{ order.orderOwnerName }}
                    </td>
                    <td class="py-4 px-6">
                      <div>{{ formatDate(order.outboundDate) }}</div>
                      <div
                        class="text-sm"
                        :class="theme === 'dark' ? 'text-neutral-500' : 'text-neutral-500'"
                      >
                        {{ order.outboundTime }}
                      </div>
                    </td>
                    <td class="py-4 px-6">
                      <div class="text-sm">
                        <div v-if="order.tickets.full">全票 x{{ order.tickets.full }}</div>
                        <div v-if="order.tickets.half">半票 x{{ order.tickets.half }}</div>
                      </div>
                    </td>
                    <td class="py-4 px-6">
                      <div class="font-medium">
                        ${{ order.pricing.discountedTotal.toLocaleString() }}
                      </div>
                      <div
                        v-if="order.pricing.originalTotal !== order.pricing.discountedTotal"
                        class="text-sm line-through"
                        :class="theme === 'dark' ? 'text-neutral-500' : 'text-neutral-500'"
                      >
                        ${{ order.pricing.originalTotal.toLocaleString() }}
                      </div>
                    </td>
                    <td class="py-4 px-6">
                      <span :class="getStatusClass(order.status)">
                        {{ order.status }}
                      </span>
                    </td>
                    <td class="py-4 px-6 text-right">
                      <BaseButton
                        variant="ghost"
                        size="sm"
                        :icon="EyeIcon"
                        @click="viewOrder(order.orderNumber)"
                      >
                        查看
                      </BaseButton>
                    </td>
                  </tr>
                </tbody>
                <tbody v-else>
                  <tr>
                    <td colspan="8" class="py-12 text-center">
                      <div
                        class="text-neutral-400"
                        :class="theme === 'dark' ? 'text-neutral-500' : 'text-neutral-400'"
                      >
                        <MagnifyingGlassIcon class="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p class="text-lg font-medium">沒有找到訂單</p>
                        <p class="text-sm mt-1">請嘗試調整搜尋條件或篩選條件</p>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </BaseCard>
        </PageContainer>
      </main>
    </div>
  </div>
</template>
