<script setup lang="ts">
import { useTheme } from '../../composables/useTheme'

defineProps<{
  title?: string
  padding?: 'none' | 'sm' | 'md' | 'lg'
  hover?: boolean
}>()

const { theme } = useTheme()
</script>

<template>
  <div
    :class="[
      'rounded-lg border transition-all duration-200',
      hover && 'hover:shadow-lg cursor-pointer',
      padding === 'none' ? '' :
      padding === 'sm' ? 'p-4' :
      padding === 'lg' ? 'p-8' :
      'p-6',
      theme === 'dark'
        ? 'bg-secondary-900 border-secondary-800'
        : 'bg-white border-neutral-200 shadow-sm'
    ]"
  >
    <div v-if="title || $slots.actions" :class="[
      'flex items-center justify-between mb-4 pb-3 border-b',
      theme === 'dark' ? 'border-secondary-800' : 'border-neutral-200'
    ]">
      <h3 v-if="title" :class="[
        'text-lg font-semibold',
        theme === 'dark' ? 'text-white' : 'text-secondary-900'
      ]">
        {{ title }}
      </h3>
      <div v-if="$slots.actions">
        <slot name="actions" />
      </div>
    </div>
    <slot />
  </div>
</template>
