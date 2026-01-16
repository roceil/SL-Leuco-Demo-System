# 藍白航運系統 - 設計指南

## 設計理念

本系統採用**深藍+青色扁平化設計風格**，具有以下特點：
- 純色背景、清晰邊界
- Heroicons 專業圖標庫
- 支援亮色/深色模式切換
- 流暢的過渡動畫
- 響應式設計

---

## 色彩系統

### 主色調 (Primary) - 青色
```css
primary-50: #ecfeff
primary-500: #06b6d4  /* 主色 */
primary-600: #0891b2
primary-950: #083344
```

### 輔助色 (Secondary) - 深藍色
```css
secondary-700: #1e40af  /* 輔助主色 */
secondary-800: #1e3a8a
secondary-900: #1e293b
secondary-950: #0f172a
```

### 中性色 (Neutral)
```css
neutral-100: #f1f5f9
neutral-200: #e2e8f0
neutral-600: #475569
neutral-700: #334155
```

### 語意色
```css
成功: #10b981 (green)
警告: #f59e0b (amber)
錯誤: #ef4444 (red)
資訊: #06b6d4 (cyan)
```

---

## 核心組件使用

### 1. PageContainer - 頁面容器

```vue
<script setup lang="ts">
import PageContainer from '@/components/ui/PageContainer.vue'
import { ClipboardDocumentListIcon } from '@heroicons/vue/24/outline'
</script>

<template>
  <PageContainer
    title="訂單管理"
    subtitle="查詢和管理所有訂單"
    :icon="ClipboardDocumentListIcon"
    max-width="xl"
  >
    <!-- 頁面內容 -->
  </PageContainer>
</template>
```

**Props:**
- `title`: 頁面標題
- `subtitle`: 副標題
- `icon`: Heroicons 圖標組件
- `maxWidth`: 最大寬度 ('sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full')

### 2. BaseCard - 卡片容器

```vue
<script setup lang="ts">
import BaseCard from '@/components/ui/BaseCard.vue'
</script>

<template>
  <BaseCard title="基本資訊" padding="md" :hover="false">
    <!-- 卡片內容 -->
  </BaseCard>
</template>
```

**Props:**
- `title`: 卡片標題
- `padding`: 內邊距 ('none' | 'sm' | 'md' | 'lg')
- `hover`: 是否顯示 hover 效果

### 3. BaseButton - 按鈕

```vue
<script setup lang="ts">
import BaseButton from '@/components/ui/BaseButton.vue'
import { PlusIcon } from '@heroicons/vue/24/outline'
</script>

<template>
  <BaseButton
    variant="primary"
    size="md"
    :icon="PlusIcon"
    icon-position="left"
  >
    新增訂單
  </BaseButton>
</template>
```

**Props:**
- `variant`: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
- `size`: 'sm' | 'md' | 'lg'
- `icon`: Heroicons 圖標組件
- `iconPosition`: 'left' | 'right'
- `disabled`: 是否禁用
- `loading`: 載入狀態

### 4. BaseInput - 輸入框

```vue
<script setup lang="ts">
import BaseInput from '@/components/ui/BaseInput.vue'
import { MagnifyingGlassIcon } from '@heroicons/vue/24/outline'

const searchQuery = ref('')
const error = ref('')
</script>

<template>
  <BaseInput
    v-model="searchQuery"
    label="搜尋訂單"
    placeholder="輸入訂單編號或姓名"
    :icon="MagnifyingGlassIcon"
    :error="error"
  />
</template>
```

**Props:**
- `modelValue`: v-model 綁定值
- `type`: 輸入類型 ('text' | 'password' | 'email' | 'number' | 'tel' | 'date' | 'time')
- `label`: 標籤文字
- `placeholder`: 佔位文字
- `icon`: Heroicons 圖標組件
- `error`: 錯誤訊息

---

## 主題系統

### 使用 useTheme Composable

```vue
<script setup lang="ts">
import { useTheme } from '@/composables/useTheme'

const { theme, toggleTheme, isDark } = useTheme()
</script>

<template>
  <div
    :class="[
      theme === 'dark'
        ? 'bg-secondary-900 text-white'
        : 'bg-white text-neutral-900'
    ]"
  >
    內容
  </div>
</template>
```

### CSS 變數使用

```vue
<style scoped>
.custom-element {
  background-color: var(--bg-primary);
  color: var(--text-primary);
  border-color: var(--border-color);
}
</style>
```

---

## 頁面重新設計模板

### 列表頁面模板

```vue
<script setup lang="ts">
import { ref } from 'vue'
import Navbar from '@/components/Navbar.vue'
import Sidebar from '@/components/Sidebar.vue'
import PageContainer from '@/components/ui/PageContainer.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import { useSidebar } from '@/composables/useSidebar'
import { useTheme } from '@/composables/useTheme'
import {
  MagnifyingGlassIcon,
  PlusIcon,
  FunnelIcon
} from '@heroicons/vue/24/outline'

const { isCollapsed } = useSidebar()
const { theme } = useTheme()

const searchQuery = ref('')
const items = ref([])
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
          title="頁面標題"
          subtitle="頁面描述"
          :icon="MagnifyingGlassIcon"
          max-width="xl"
        >
          <!-- 搜尋和操作列 -->
          <div class="flex gap-4 mb-6">
            <div class="flex-1">
              <BaseInput
                v-model="searchQuery"
                placeholder="搜尋..."
                :icon="MagnifyingGlassIcon"
              />
            </div>
            <BaseButton variant="outline" :icon="FunnelIcon">
              篩選
            </BaseButton>
            <BaseButton variant="primary" :icon="PlusIcon">
              新增
            </BaseButton>
          </div>

          <!-- 列表卡片 -->
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
                    <th class="text-left py-4 px-6">欄位 1</th>
                    <th class="text-left py-4 px-6">欄位 2</th>
                    <th class="text-right py-4 px-6">操作</th>
                  </tr>
                </thead>
                <tbody class="divide-y" :class="theme === 'dark' ? 'divide-secondary-800' : 'divide-neutral-200'">
                  <tr v-for="item in items" :key="item.id" class="hover:bg-opacity-50" :class="theme === 'dark' ? 'hover:bg-secondary-800' : 'hover:bg-neutral-50'">
                    <td class="py-4 px-6">{{ item.field1 }}</td>
                    <td class="py-4 px-6">{{ item.field2 }}</td>
                    <td class="py-4 px-6 text-right">
                      <BaseButton variant="ghost" size="sm">
                        查看
                      </BaseButton>
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
```

### 表單頁面模板

```vue
<script setup lang="ts">
import { ref } from 'vue'
import Navbar from '@/components/Navbar.vue'
import Sidebar from '@/components/Sidebar.vue'
import PageContainer from '@/components/ui/PageContainer.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import { useSidebar } from '@/composables/useSidebar'
import { useTheme } from '@/composables/useTheme'
import { DocumentTextIcon, CheckIcon, XMarkIcon } from '@heroicons/vue/24/outline'

const { isCollapsed } = useSidebar()
const { theme } = useTheme()

const formData = ref({
  field1: '',
  field2: '',
  field3: ''
})

const errors = ref({
  field1: '',
  field2: '',
  field3: ''
})

const handleSubmit = () => {
  // 處理表單提交
}

const handleCancel = () => {
  // 處理取消
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
          title="表單標題"
          subtitle="填寫表單資訊"
          :icon="DocumentTextIcon"
          max-width="lg"
        >
          <BaseCard padding="lg">
            <form @submit.prevent="handleSubmit" class="space-y-6">
              <!-- 表單欄位 -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <BaseInput
                  v-model="formData.field1"
                  label="欄位 1"
                  placeholder="請輸入..."
                  :error="errors.field1"
                />

                <BaseInput
                  v-model="formData.field2"
                  label="欄位 2"
                  placeholder="請輸入..."
                  :error="errors.field2"
                />
              </div>

              <BaseInput
                v-model="formData.field3"
                label="欄位 3"
                placeholder="請輸入..."
                :error="errors.field3"
              />

              <!-- 操作按鈕 -->
              <div class="flex justify-end gap-3 pt-4 border-t" :class="theme === 'dark' ? 'border-secondary-800' : 'border-neutral-200'">
                <BaseButton
                  type="button"
                  variant="ghost"
                  :icon="XMarkIcon"
                  @click="handleCancel"
                >
                  取消
                </BaseButton>
                <BaseButton
                  type="submit"
                  variant="primary"
                  :icon="CheckIcon"
                >
                  確認
                </BaseButton>
              </div>
            </form>
          </BaseCard>
        </PageContainer>
      </main>
    </div>
  </div>
</template>
```

---

## Heroicons 常用圖標

### 通用操作
- `PlusIcon` - 新增
- `PencilIcon` - 編輯
- `TrashIcon` - 刪除
- `MagnifyingGlassIcon` - 搜尋
- `FunnelIcon` - 篩選
- `ArrowPathIcon` - 重新載入
- `CheckIcon` - 確認
- `XMarkIcon` - 取消/關閉

### 導航與資訊
- `HomeIcon` - 首頁
- `UserIcon` - 用戶
- `UsersIcon` - 用戶群組
- `Cog6ToothIcon` - 設定
- `BellIcon` - 通知
- `ChartBarIcon` - 圖表
- `DocumentTextIcon` - 文件
- `ClipboardDocumentListIcon` - 清單

### 狀態與提示
- `ExclamationTriangleIcon` - 警告
- `CheckCircleIcon` - 成功
- `XCircleIcon` - 錯誤
- `InformationCircleIcon` - 資訊

---

## 動畫效果

### 頁面進入動畫

在頁面根元素添加 `fade-in` class：

```vue
<template>
  <PageContainer class="fade-in">
    <!-- 內容 -->
  </PageContainer>
</template>
```

### 自訂過渡效果

```vue
<style scoped>
.custom-transition {
  transition: all 0.3s ease;
}

.custom-transition:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}
</style>
```

---

## 響應式設計

### 斷點系統

```
sm: 640px
md: 768px
lg: 1024px
xl: 1280px
2xl: 1536px
```

### 使用範例

```vue
<template>
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    <!-- 手機：1 列，平板：2 列，桌面：3 列 -->
  </div>
</template>
```

---

## 完整頁面範例

參考以下已重新設計的頁面：
1. `src/views/Login.vue` - 登入頁面
2. `src/components/Navbar.vue` - 導航欄
3. `src/components/Sidebar.vue` - 側邊欄

使用這些組件和模板，您可以快速將新設計應用到其他 19 個頁面。

---

## 快速開始檢查清單

重新設計一個頁面時，請遵循以下步驟：

- [ ] 引入必要的組件（Navbar、Sidebar、PageContainer）
- [ ] 使用 `useTheme` composable 支援深色模式
- [ ] 將所有 emoji 替換為 Heroicons
- [ ] 使用 BaseCard、BaseButton、BaseInput 等基礎組件
- [ ] 應用主題相關的條件 class
- [ ] 添加 `fade-in` 動畫 class
- [ ] 測試亮色/深色模式切換
- [ ] 測試響應式佈局（手機、平板、桌面）

---

## 支援

如有問題，請參考：
- Tailwind CSS 文檔: https://tailwindcss.com/docs
- Heroicons 圖標庫: https://heroicons.com
- Vue 3 文檔: https://vuejs.org
