<script setup lang="ts">
import { useTheme } from '../../composables/useTheme'
import type { Component } from 'vue'

withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
    size?: 'sm' | 'md' | 'lg'
    disabled?: boolean
    loading?: boolean
    icon?: Component
    iconPosition?: 'left' | 'right'
  }>(),
  {
    variant: 'primary',
    size: 'md',
    disabled: false,
    loading: false,
    iconPosition: 'left'
  }
)

const { theme } = useTheme()
</script>

<template>
  <button
    :disabled="disabled || loading"
    :class="[
      'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-200',
      'focus:outline-none focus:ring-2 focus:ring-offset-2',
      'disabled:opacity-50 disabled:cursor-not-allowed',

      // 大小
      size === 'sm' && 'px-3 py-1.5 text-sm',
      size === 'md' && 'px-4 py-2 text-base',
      size === 'lg' && 'px-6 py-3 text-lg',

      // 變體 - 主色
      variant === 'primary' && theme === 'dark'
        ? 'bg-primary-600 hover:bg-primary-700 text-white focus:ring-primary-900'
        : variant === 'primary'
        ? 'bg-primary-500 hover:bg-primary-600 text-white focus:ring-primary-200 shadow-sm hover:shadow'

        // 變體 - 次色
        : variant === 'secondary' && theme === 'dark'
        ? 'bg-secondary-700 hover:bg-secondary-800 text-white focus:ring-secondary-900'
        : variant === 'secondary'
        ? 'bg-secondary-700 hover:bg-secondary-800 text-white focus:ring-secondary-200 shadow-sm hover:shadow'

        // 變體 - 外框
        : variant === 'outline' && theme === 'dark'
        ? 'border-2 border-primary-500 text-primary-400 hover:bg-primary-950 focus:ring-primary-900'
        : variant === 'outline'
        ? 'border-2 border-primary-500 text-primary-600 hover:bg-primary-50 focus:ring-primary-200'

        // 變體 - 幽靈
        : variant === 'ghost' && theme === 'dark'
        ? 'hover:bg-secondary-800 text-neutral-300 hover:text-white focus:ring-secondary-900'
        : variant === 'ghost'
        ? 'hover:bg-neutral-100 text-neutral-700 hover:text-neutral-900 focus:ring-neutral-200'

        // 變體 - 危險
        : variant === 'danger' && theme === 'dark'
        ? 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-900'
        : variant === 'danger'
        ? 'bg-red-500 hover:bg-red-600 text-white focus:ring-red-200 shadow-sm hover:shadow'
        : ''
    ]"
  >
    <component
      v-if="icon && iconPosition === 'left'"
      :is="icon"
      :class="[
        size === 'sm' && 'w-4 h-4',
        size === 'md' && 'w-5 h-5',
        size === 'lg' && 'w-6 h-6'
      ]"
    />

    <svg
      v-if="loading"
      class="animate-spin"
      :class="[
        size === 'sm' && 'w-4 h-4',
        size === 'md' && 'w-5 h-5',
        size === 'lg' && 'w-6 h-6'
      ]"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>

    <slot />

    <component
      v-if="icon && iconPosition === 'right'"
      :is="icon"
      :class="[
        size === 'sm' && 'w-4 h-4',
        size === 'md' && 'w-5 h-5',
        size === 'lg' && 'w-6 h-6'
      ]"
    />
  </button>
</template>
