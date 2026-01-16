<script setup lang="ts">
import { useSidebar } from '@/composables/useSidebar'
import { useTheme } from '@/composables/useTheme'
import Navbar from '@/components/Navbar.vue'
import Sidebar from '@/components/Sidebar.vue'
import PageContainer from '@/components/ui/PageContainer.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import { ChartBarIcon } from '@heroicons/vue/24/outline'

const { isCollapsed } = useSidebar()
const { theme } = useTheme()
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
          title="載運分析"
          subtitle="分析船舶載運數據與效率"
          :icon="ChartBarIcon"
          max-width="lg"
        >
          <BaseCard padding="lg" class="text-center">
            <ChartBarIcon
              class="w-24 h-24 mx-auto mb-6 opacity-30"
              :class="theme === 'dark' ? 'text-neutral-600' : 'text-neutral-300'"
            />
            <h2
              class="text-2xl font-semibold mb-3"
              :class="theme === 'dark' ? 'text-white' : 'text-neutral-700'"
            >
              載運分析功能開發中
            </h2>
            <p
              class="text-lg"
              :class="theme === 'dark' ? 'text-neutral-400' : 'text-neutral-500'"
            >
              此頁面正在建置中，敬請期待
            </p>
          </BaseCard>
        </PageContainer>
      </main>
    </div>
  </div>
</template>
