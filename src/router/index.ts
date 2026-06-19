import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';
import ConsolePage from '@/pages/ConsolePage.vue';
import LogsPage from '@/pages/LogsPage.vue';
import { useAuthStore } from '../stores/auth';
import type { PermissionModule } from '../types';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'console',
    component: ConsolePage,
    meta: { title: '运营控制台', requireAuth: true },
  },
  {
    path: '/logs',
    name: 'logs',
    component: LogsPage,
    meta: { title: '调度日志', requireAuth: true },
  },
  {
    path: '/resources',
    name: 'resource-list',
    component: () => import('@/pages/resource/ResourceListPage.vue'),
    meta: { title: '资源列表', requireAuth: true, permission: 'resource_manage' as PermissionModule },
  },
  {
    path: '/resources/board',
    name: 'resource-board',
    component: () => import('@/pages/resource/ResourceBoardPage.vue'),
    meta: { title: '资源占用看板', requireAuth: true, permission: 'resource_manage' as PermissionModule },
  },
  {
    path: '/resources/conflicts',
    name: 'resource-conflict-list',
    component: () => import('@/pages/resource/ResourceConflictListPage.vue'),
    meta: { title: '资源冲突列表', requireAuth: true, permission: 'resource_manage' as PermissionModule },
  },
  {
    path: '/resources/conflicts/:id',
    name: 'resource-conflict-detail',
    component: () => import('@/pages/resource/ResourceConflictDetailPage.vue'),
    meta: { title: '资源冲突详情', requireAuth: true, permission: 'resource_manage' as PermissionModule },
  },
  {
    path: '/permission/users',
    name: 'user-list',
    component: () => import('@/pages/permission/UserListPage.vue'),
    meta: { title: '用户列表', requireAuth: true, permission: 'user_manage' as PermissionModule },
  },
  {
    path: '/permission/roles',
    name: 'role-config',
    component: () => import('@/pages/permission/RoleConfigPage.vue'),
    meta: { title: '角色配置', requireAuth: true, permission: 'role_manage' as PermissionModule },
  },
  {
    path: '/permission/users/:id',
    name: 'user-detail',
    component: () => import('@/pages/permission/UserDetailPage.vue'),
    meta: { title: '用户详情', requireAuth: true, permission: 'user_manage' as PermissionModule },
  },
  {
    path: '/permission/assign',
    name: 'permission-assign',
    component: () => import('@/pages/permission/PermissionAssignPage.vue'),
    meta: { title: '权限分配', requireAuth: true, permission: 'role_manage' as PermissionModule },
  },
  {
    path: '/approval',
    name: 'approval-list',
    component: () => import('@/pages/approval/ApprovalListPage.vue'),
    meta: { title: '调度审批', requireAuth: true },
  },
  {
    path: '/approval/:id',
    name: 'approval-detail',
    component: () => import('@/pages/approval/ApprovalDetailPage.vue'),
    meta: { title: '审批详情', requireAuth: true },
  },
  {
    path: '/incidents',
    name: 'incident-list',
    component: () => import('@/pages/incident/IncidentListPage.vue'),
    meta: { title: '异常事件', requireAuth: true },
  },
  {
    path: '/incidents/:id',
    name: 'incident-detail',
    component: () => import('@/pages/incident/IncidentDetailPage.vue'),
    meta: { title: '事件详情', requireAuth: true },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore();

  if (!authStore.isLoggedIn) {
    authStore.loginAsDefault();
  }

  if (to.meta.requireAuth && !authStore.isLoggedIn) {
    next({ name: 'console' });
    return;
  }

  if (to.meta.permission) {
    const module = to.meta.permission as PermissionModule;
    if (!authStore.hasPermission(module, 'read')) {
      next({ name: 'console' });
      return;
    }
  }

  if (!authStore.canAccessRoute(to.path)) {
    next({ name: 'console' });
    return;
  }

  next();
});

export default router;
