import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { initializeOrders } from './composables/useOrders'

// 初始化訂單資料（從 localStorage 讀取，如果沒有則使用 mock 資料）
initializeOrders()

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
