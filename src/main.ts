import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { useRouteStore } from './stores/route'
import { useTicketStore } from './stores/ticket'
import { useRbacStore } from './stores/rbac'
import { useOrderStore } from './stores/order'
import { initSchedules } from './composables/useSchedules'
import { initShips } from './composables/useShips'
import { initWhitelist } from './composables/useWhitelist'
import { initTicketConfig } from './composables/useTicketConfig'

async function bootstrap() {
  const app = createApp(App)
  const pinia = createPinia()
  app.use(pinia)
  app.use(router)

  // 初始化所有 stores（從 db.json 載入）
  const routeStore = useRouteStore()
  const ticketStore = useTicketStore()
  const rbacStore = useRbacStore()
  const orderStore = useOrderStore()

  await Promise.all([
    routeStore.init(),
    ticketStore.init(),
    rbacStore.init(),
    orderStore.init(),
    initTicketConfig(),
  ])

  // 初始化 composables（ships 需先於 schedules，因 schedules 依賴 ships）
  await initShips()
  await Promise.all([
    initSchedules(),
    initWhitelist(),
  ])

  app.mount('#app')
}

bootstrap()
