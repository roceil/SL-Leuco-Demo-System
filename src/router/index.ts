import { createRouter, createWebHistory } from 'vue-router'
import Login from '../views/Login.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'login',
      component: Login,
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('../views/Dashboard.vue'),
    },
    {
      path: '/order-search',
      name: 'order-search',
      component: () => import('../views/OrderSearch.vue'),
    },
    {
      path: '/order-detail/:orderNumber',
      name: 'order-detail',
      component: () => import('../views/OrderDetail.vue'),
    },
    {
      path: '/report',
      name: 'report',
      component: () => import('../views/Report.vue'),
    },
    {
      path: '/report/:year/:month',
      name: 'report-detail',
      component: () => import('../views/ReportDetail.vue'),
    },
    {
      path: '/distributor/:distributorId',
      name: 'distributor-detail',
      component: () => import('../views/DistributorDetail.vue'),
    },
    {
      path: '/account-settings',
      name: 'account-settings',
      component: () => import('../views/AccountSettings.vue'),
    },
    {
      path: '/role-management',
      name: 'role-management',
      component: () => import('../views/RoleManagement.vue'),
    },
    {
      path: '/permission-management',
      name: 'permission-management',
      component: () => import('../views/PermissionManagement.vue'),
    },
    {
      path: '/ticket-management',
      name: 'ticket-management',
      component: () => import('../views/TicketManagement.vue'),
    },
    {
      path: '/account-management',
      name: 'account-management',
      component: () => import('../views/AccountManagement.vue'),
    },
  ],
})

export default router
