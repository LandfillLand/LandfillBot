import type { RouteRecordRaw } from 'vue-router'

const AuthRoutes: RouteRecordRaw = {
  path: '/auth',
  component: () => import('@/layouts/blank/BlankLayout.vue'),
  meta: {
    requiresAuth: false
  },
  children: [
    {
      name: 'Login',
      path: '/auth/login',
      component: () => import('@/views/authentication/auth/LoginPage.vue')
    }
  ]
};

export default AuthRoutes;
