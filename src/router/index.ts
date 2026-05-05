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
      path: '/create-order',
      name: 'create-order',
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
    {
      path: '/order-management',
      name: 'order-management',
      component: () => import('../views/OrderManagement.vue'),
    },
    {
      path: '/special-ticket-whitelist',
      name: 'special-ticket-whitelist',
      component: () => import('../views/SpecialTicketWhitelist.vue'),
    },
    {
      path: '/special-ticket-whitelist/:ticketTypeId',
      name: 'whitelist-detail',
      component: () => import('../views/WhitelistDetail.vue'),
    },
    {
      path: '/cash-report',
      name: 'cash-report',
      component: () => import('../views/CashReport.vue'),
    },
    {
      path: '/dealer-report',
      name: 'dealer-report',
      component: () => import('../views/DealerReport.vue'),
    },
    {
      path: '/transport-analysis',
      name: 'transport-analysis',
      component: () => import('../views/TransportAnalysis.vue'),
    },
    {
      path: '/ship-management',
      name: 'ship-management',
      component: () => import('../views/ShipManagement.vue'),
    },
    {
      path: '/schedule-management',
      name: 'schedule-management',
      component: () => import('../views/ScheduleManagement.vue'),
    },
    {
      path: '/schedule-management/:id',
      name: 'flight-detail',
      component: () => import('../views/FlightDetail.vue'),
    },
    {
      path: '/passenger-list',
      name: 'passenger-list',
      component: () => import('../views/PassengerList.vue'),
    },
    {
      path: '/audit-log',
      name: 'audit-log',
      component: () => import('../views/AuditLogView.vue'),
    },
    {
      path: '/route-management',
      name: 'route-management',
      component: () => import('../views/RouteManagement.vue'),
    },
    {
      path: '/organization-management',
      name: 'organization-management',
      component: () => import('../views/OrganizationManagement.vue'),
    },
    {
      path: '/ticket-config',
      name: 'ticket-config',
      component: () => import('../views/TicketConfigView.vue'),
    },
    {
      path: '/dashboard',
      name: 'dashboard-overview',
      component: () => import('../views/DashboardOverview.vue'),
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('../views/NotFound.vue'),
    },
  ],
})

export default router
