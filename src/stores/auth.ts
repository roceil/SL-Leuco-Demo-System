import { defineStore } from 'pinia'
import { ref } from 'vue'

interface CurrentUser {
  id: string
  username: string
}

export const useAuthStore = defineStore('auth', () => {
  // 暫時使用固定的管理員帳號，待後續實作完整登入功能
  const currentUser = ref<CurrentUser | null>({
    id: 'admin',
    username: '管理員'
  })

  return { currentUser }
})
