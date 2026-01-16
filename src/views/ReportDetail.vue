<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSidebar } from '@/composables/useSidebar'
import { useTheme } from '@/composables/useTheme'
import { useOrders } from '@/composables/useOrders'
import type { SavedOrder } from '@/constants/mockOrders'
import Navbar from '@/components/Navbar.vue'
import Sidebar from '@/components/Sidebar.vue'
import PageContainer from '@/components/ui/PageContainer.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import {
  DocumentTextIcon,
  ArrowDownTrayIcon,
  ArrowLeftIcon,
  ClipboardDocumentListIcon
} from '@heroicons/vue/24/outline'

const { isCollapsed } = useSidebar()
const { theme } = useTheme()
const route = useRoute()
const router = useRouter()
const { allOrders: storedOrders } = useOrders()

const monthKey = ref('')
const orders = ref<SavedOrder[]>([])
const totalAmount = computed(() => orders.value.reduce((sum, order) => sum + order.pricing.discountedTotal, 0))
const totalOrders = computed(() => orders.value.length)

// 載入該月份的訂單資料
const loadMonthOrders = () => {
  const year = route.params.year as string
  const month = route.params.month as string
  monthKey.value = `${year}年${month}月`

  try {
    // 篩選出該月份的訂單
    orders.value = storedOrders.value.filter(order => {
      const orderDate = new Date(order.outboundDate)
      const orderYear = orderDate.getFullYear()
      const orderMonth = orderDate.getMonth() + 1
      return orderYear === parseInt(year) && orderMonth === parseInt(month)
    })
  } catch (error) {
    console.error('載入訂單資料失敗:', error)
  }
}

// 返回列表頁
const goBack = () => {
  router.push('/report')
}

// 下載明細（CSV 格式）
const downloadDetails = () => {
  const headers = ['訂單編號', '出發地', '訂票方式', '經銷商', '訂票人', '聯絡電話', '出發日期', '出發時間', '回程日期', '回程時間', '全票', '半票', '金額']
  const rows = orders.value.map(order => [
    order.orderNumber,
    order.departure,
    order.bookingType,
    order.distributor || '-',
    order.bookerName,
    order.bookerPhone,
    order.outboundDate,
    order.outboundTime,
    order.returnDate || '-',
    order.returnTime || '-',
    order.tickets.full,
    order.tickets.half,
    order.pricing.discountedTotal
  ])

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n')

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `帳單明細_${monthKey.value}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

onMounted(() => {
  loadMonthOrders()
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
          :title="`${monthKey} 帳單明細`"
          :subtitle="`共 ${totalOrders} 筆訂單，總金額 NT$ ${totalAmount.toLocaleString()}`"
          :icon="DocumentTextIcon"
          max-width="full"
        >
          <template #actions>
            <div class="flex gap-3">
              <BaseButton
                variant="primary"
                :icon="ArrowDownTrayIcon"
                @click="downloadDetails"
              >
                下載 CSV
              </BaseButton>
              <BaseButton
                variant="secondary"
                :icon="ArrowLeftIcon"
                @click="goBack"
              >
                返回列表
              </BaseButton>
            </div>
          </template>

          <!-- 明細列表 -->
          <BaseCard padding="none">
            <div class="overflow-x-auto">
              <table class="w-full">
                <thead
                  :class="theme === 'dark' ? 'bg-secondary-800' : 'bg-neutral-50'"
                >
                  <tr>
                    <th
                      class="p-4 text-left font-semibold text-sm"
                      :class="theme === 'dark' ? 'text-neutral-300 border-b-2 border-secondary-700' : 'text-neutral-700 border-b-2 border-neutral-200'"
                    >
                      訂單編號
                    </th>
                    <th
                      class="p-4 text-left font-semibold text-sm"
                      :class="theme === 'dark' ? 'text-neutral-300 border-b-2 border-secondary-700' : 'text-neutral-700 border-b-2 border-neutral-200'"
                    >
                      訂票人
                    </th>
                    <th
                      class="p-4 text-left font-semibold text-sm"
                      :class="theme === 'dark' ? 'text-neutral-300 border-b-2 border-secondary-700' : 'text-neutral-700 border-b-2 border-neutral-200'"
                    >
                      聯絡電話
                    </th>
                    <th
                      class="p-4 text-left font-semibold text-sm"
                      :class="theme === 'dark' ? 'text-neutral-300 border-b-2 border-secondary-700' : 'text-neutral-700 border-b-2 border-neutral-200'"
                    >
                      出發地
                    </th>
                    <th
                      class="p-4 text-left font-semibold text-sm"
                      :class="theme === 'dark' ? 'text-neutral-300 border-b-2 border-secondary-700' : 'text-neutral-700 border-b-2 border-neutral-200'"
                    >
                      訂票方式
                    </th>
                    <th
                      class="p-4 text-left font-semibold text-sm"
                      :class="theme === 'dark' ? 'text-neutral-300 border-b-2 border-secondary-700' : 'text-neutral-700 border-b-2 border-neutral-200'"
                    >
                      經銷商
                    </th>
                    <th
                      class="p-4 text-left font-semibold text-sm"
                      :class="theme === 'dark' ? 'text-neutral-300 border-b-2 border-secondary-700' : 'text-neutral-700 border-b-2 border-neutral-200'"
                    >
                      出發日期
                    </th>
                    <th
                      class="p-4 text-left font-semibold text-sm"
                      :class="theme === 'dark' ? 'text-neutral-300 border-b-2 border-secondary-700' : 'text-neutral-700 border-b-2 border-neutral-200'"
                    >
                      出發時間
                    </th>
                    <th
                      class="p-4 text-left font-semibold text-sm"
                      :class="theme === 'dark' ? 'text-neutral-300 border-b-2 border-secondary-700' : 'text-neutral-700 border-b-2 border-neutral-200'"
                    >
                      回程日期
                    </th>
                    <th
                      class="p-4 text-left font-semibold text-sm"
                      :class="theme === 'dark' ? 'text-neutral-300 border-b-2 border-secondary-700' : 'text-neutral-700 border-b-2 border-neutral-200'"
                    >
                      回程時間
                    </th>
                    <th
                      class="p-4 text-center font-semibold text-sm"
                      :class="theme === 'dark' ? 'text-neutral-300 border-b-2 border-secondary-700' : 'text-neutral-700 border-b-2 border-neutral-200'"
                    >
                      全票
                    </th>
                    <th
                      class="p-4 text-center font-semibold text-sm"
                      :class="theme === 'dark' ? 'text-neutral-300 border-b-2 border-secondary-700' : 'text-neutral-700 border-b-2 border-neutral-200'"
                    >
                      半票
                    </th>
                    <th
                      class="p-4 text-right font-semibold text-sm"
                      :class="theme === 'dark' ? 'text-neutral-300 border-b-2 border-secondary-700' : 'text-neutral-700 border-b-2 border-neutral-200'"
                    >
                      金額
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="order in orders"
                    :key="order.orderNumber"
                    :class="[
                      'border-b',
                      theme === 'dark'
                        ? 'hover:bg-secondary-800 border-secondary-800'
                        : 'hover:bg-neutral-50 border-neutral-100'
                    ]"
                  >
                    <td
                      class="p-4 font-mono text-xs"
                      :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-800'"
                    >
                      {{ order.orderNumber }}
                    </td>
                    <td
                      class="p-4"
                      :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-800'"
                    >
                      {{ order.bookerName }}
                    </td>
                    <td
                      class="p-4"
                      :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-800'"
                    >
                      {{ order.bookerPhone }}
                    </td>
                    <td
                      class="p-4"
                      :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-800'"
                    >
                      {{ order.departure }}
                    </td>
                    <td
                      class="p-4"
                      :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-800'"
                    >
                      {{ order.bookingType }}
                    </td>
                    <td
                      class="p-4"
                      :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-800'"
                    >
                      {{ order.distributor || '-' }}
                    </td>
                    <td
                      class="p-4"
                      :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-800'"
                    >
                      {{ order.outboundDate }}
                    </td>
                    <td
                      class="p-4"
                      :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-800'"
                    >
                      {{ order.outboundTime }}
                    </td>
                    <td
                      class="p-4"
                      :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-800'"
                    >
                      {{ order.returnDate || '-' }}
                    </td>
                    <td
                      class="p-4"
                      :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-800'"
                    >
                      {{ order.returnTime || '-' }}
                    </td>
                    <td
                      class="p-4 text-center"
                      :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-800'"
                    >
                      {{ order.tickets.full }}
                    </td>
                    <td
                      class="p-4 text-center"
                      :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-800'"
                    >
                      {{ order.tickets.half }}
                    </td>
                    <td
                      class="p-4 text-right font-semibold"
                      :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-800'"
                    >
                      NT$ {{ order.pricing.discountedTotal.toLocaleString() }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div
              v-if="orders.length === 0"
              class="text-center py-12"
              :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-500'"
            >
              <ClipboardDocumentListIcon
                class="w-24 h-24 mx-auto mb-4 opacity-30"
                :class="theme === 'dark' ? 'text-neutral-600' : 'text-neutral-300'"
              />
              <div class="text-lg mb-2">此月份無訂單資料</div>
            </div>
          </BaseCard>
        </PageContainer>
      </main>
    </div>
  </div>
</template>
