<script setup lang="ts">
import { useTheme } from '../../composables/useTheme'
import type { Component } from 'vue'

withDefaults(
  defineProps<{
    modelValue?: string | number
    type?: 'text' | 'password' | 'email' | 'number' | 'tel' | 'date' | 'time'
    placeholder?: string
    label?: string
    error?: string
    disabled?: boolean
    icon?: Component
    iconPosition?: 'left' | 'right'
  }>(),
  {
    type: 'text',
    iconPosition: 'left'
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
}>()

const { theme } = useTheme()
</script>

<template>
  <div class="w-full">
    <label
      v-if="label"
      class="block text-sm font-medium mb-2"
      :class="theme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'"
    >
      {{ label }}
    </label>

    <div class="relative">
      <component
        v-if="icon && iconPosition === 'left'"
        :is="icon"
        class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5"
        :class="[
          error
            ? 'text-red-500'
            : theme === 'dark' ? 'text-neutral-500' : 'text-neutral-400'
        ]"
      />

      <input
        :type="type"
        :value="modelValue"
        @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        :placeholder="placeholder"
        :disabled="disabled"
        :class="[
          'w-full rounded-lg text-base transition-all outline-none border',
          'disabled:opacity-50 disabled:cursor-not-allowed',

          // Padding
          icon && iconPosition === 'left' ? 'py-2.5 px-4 pl-11' :
          icon && iconPosition === 'right' ? 'py-2.5 px-4 pr-11' :
          'py-2.5 px-4',

          // 錯誤狀態
          error
            ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200'
            : theme === 'dark'
            ? 'bg-secondary-800 border-secondary-700 text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-900'
            : 'bg-white border-neutral-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-100'
        ]"
      />

      <component
        v-if="icon && iconPosition === 'right'"
        :is="icon"
        class="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5"
        :class="[
          error
            ? 'text-red-500'
            : theme === 'dark' ? 'text-neutral-500' : 'text-neutral-400'
        ]"
      />
    </div>

    <p v-if="error" class="text-red-500 text-sm mt-1.5 flex items-center gap-1">
      <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
      </svg>
      {{ error }}
    </p>
  </div>
</template>
