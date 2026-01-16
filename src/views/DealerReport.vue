<script setup lang="ts">
import { useSidebar } from '@/composables/useSidebar'
import { useTheme } from '@/composables/useTheme'
import Navbar from '@/components/Navbar.vue'
import Sidebar from '@/components/Sidebar.vue'
import PageContainer from '@/components/ui/PageContainer.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import { BuildingStorefrontIcon } from '@heroicons/vue/24/outline'

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
          title="經銷商報表"
          subtitle="查看各經銷商的銷售報表"
          :icon="BuildingStorefrontIcon"
          max-width="lg"
        >
          <BaseCard padding="lg" class="text-center">
            <BuildingStorefrontIcon
              class="w-24 h-24 mx-auto mb-6 opacity-30"
              :class="theme === 'dark' ? 'text-neutral-600' : 'text-neutral-300'"
            />
            <h2
              class="text-2xl font-semibold mb-3"
              :class="theme === 'dark' ? 'text-white' : 'text-neutral-700'"
            >
              經銷商報表功能開發中
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
