import { ref, watch, onMounted } from 'vue'

type Theme = 'light' | 'dark'

const THEME_STORAGE_KEY = 'ferry-system-theme'

const theme = ref<Theme>('light')

export function useTheme() {
  const toggleTheme = () => {
    theme.value = theme.value === 'light' ? 'dark' : 'light'
  }

  const setTheme = (newTheme: Theme) => {
    theme.value = newTheme
  }

  const initTheme = () => {
    // 從 localStorage 讀取主題設定
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null

    if (savedTheme) {
      theme.value = savedTheme
    } else {
      // 如果沒有儲存的主題，檢查系統偏好
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      theme.value = prefersDark ? 'dark' : 'light'
    }

    applyTheme()
  }

  const applyTheme = () => {
    const root = document.documentElement

    if (theme.value === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }

  // 監聽主題變化並應用
  watch(theme, (newTheme) => {
    applyTheme()
    localStorage.setItem(THEME_STORAGE_KEY, newTheme)
  })

  // 初始化時載入主題
  onMounted(() => {
    initTheme()
  })

  return {
    theme,
    toggleTheme,
    setTheme,
    initTheme,
    isDark: () => theme.value === 'dark'
  }
}
