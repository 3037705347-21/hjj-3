import { createRouter, createWebHistory } from 'vue-router';
import ConsolePage from '@/pages/ConsolePage.vue';
import LogsPage from '@/pages/LogsPage.vue';

const routes = [
  {
    path: '/',
    name: 'console',
    component: ConsolePage,
  },
  {
    path: '/logs',
    name: 'logs',
    component: LogsPage,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
