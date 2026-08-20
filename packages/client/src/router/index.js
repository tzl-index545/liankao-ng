
import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '../store/user'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('../views/Register.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    redirect: '/contests'
  },
  {
    path: '/contests',
    name: 'ContestList',
    component: () => import('../views/ContestList.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/problems',
    name: 'ProblemList',
    component: () => import('../views/ProblemList.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/problems/:id',
    name: 'ProblemDetail',
    component: () => import('../views/ProblemDetail.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/yuantiji',
    name: 'Yuantiji',
    component: () => import('../views/Yuantiji.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/contests/:id',
    name: 'ContestDetail',
    component: () => import('../views/ContestDetail.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/users',
    name: 'UserList',
    component: () => import('../views/UserList.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/users/:id',
    name: 'UserDetail',
    component: () => import('../views/UserDetail.vue'),
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const userStore = useUserStore()

  if (to.meta.requiresAuth && !userStore.isLoggedIn) {
    next('/login')
  } else if ((to.path === '/login' || to.path === '/register') && userStore.isLoggedIn) {
    next('/contests')
  } else {
    next()
  }
})

export default router
