<script setup lang="ts">
import { useTheme } from '../../composables/useTheme'
import type { Component } from 'vue'

defineProps<{
  title?: string
  subtitle?: string
  icon?: Component
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
}>()

const { theme } = useTheme()
</script>

<template>
  <div
    class="min-h-[calc(100vh-4rem)] p-6 transition-colors duration-200"
    :class="theme === 'dark' ? 'bg-secondary-950' : 'bg-neutral-50'"
  >
    <div
      :class="[
        'mx-auto fade-in',
        maxWidth === 'sm' ? 'max-w-2xl' :
        maxWidth === 'md' ? 'max-w-4xl' :
        maxWidth === 'lg' ? 'max-w-6xl' :
        maxWidth === 'xl' ? 'max-w-7xl' :
        maxWidth === '2xl' ? 'max-w-[1400px]' :
        'w-full'
      ]"
    >
      <!-- 頁面標題 -->
      <div v-if="title" class="mb-6">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-3">
            <component
              v-if="icon"
              :is="icon"
              :class="[
                'w-8 h-8',
                theme === 'dark' ? 'text-primary-400' : 'text-primary-600'
              ]"
            />
            <h1
              :class="[
                'text-3xl font-bold',
                theme === 'dark' ? 'text-white' : 'text-secondary-900'
              ]"
            >
              {{ title }}
            </h1>
          </div>
          <!-- Actions slot -->
          <div v-if="$slots.actions">
            <slot name="actions" />
          </div>
        </div>
        <p
          v-if="subtitle"
          :class="[
            'text-sm',
            theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'
          ]"
        >
          {{ subtitle }}
        </p>
      </div>

      <!-- 頁面內容 -->
      <slot />
    </div>
  </div>
</template>
