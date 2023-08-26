/* eslint-disable import/prefer-default-export */
import { createRouter, createWebHistory } from 'vue-router';

import { useAuthStore, useAlertStore } from '@/stores';
import { Home, Engine, Public } from '@/views';
import Config from '@/lib/config';
import accountRoutes from './account.routes';
import messagesRoutes from './messages.routes';
import memoryRoutes from './memory.routes';
import profileRoutes from './profile.routes';

export const router = createRouter({
  history: createWebHistory(Config.BASE_URL),
  linkActiveClass: 'active',
  routes: [
    { path: '/', component: Public },
    { path: '/engine', component: Engine },
    { path: '/home', component: Home },
    { ...accountRoutes },
    { ...messagesRoutes },
    { ...memoryRoutes },
    { ...profileRoutes },
    // catch all redirect to home page
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
});

router.beforeEach(async (to) => {
  // clear alert on route change
  const alertStore = useAlertStore();
  alertStore.clear();

  // redirect to login page if not logged in and trying to access a restricted page
  const publicPages = ['/', '/engine', '/account/login', '/account/register'];
  const authRequired = !publicPages.includes(to.path);
  const authStore = useAuthStore();

  if (authRequired && !authStore.user) {
    authStore.logout();
  }
});
