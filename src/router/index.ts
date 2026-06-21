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
    path: '/reports/daily',
    name: 'report-daily',
    component: () => import('@/pages/report/DailyReportPage.vue'),
    meta: { title: '经营日报', requireAuth: true },
  },
  {
    path: '/reports/weekly',
    name: 'report-weekly',
    component: () => import('@/pages/report/WeeklyReportPage.vue'),
    meta: { title: '经营周报', requireAuth: true },
  },
  {
    path: '/reports/monthly',
    name: 'report-monthly',
    component: () => import('@/pages/report/MonthlyReportPage.vue'),
    meta: { title: '经营月报', requireAuth: true },
  },
  {
    path: '/reports/trends',
    name: 'report-trends',
    component: () => import('@/pages/report/TrendAnalysisPage.vue'),
    meta: { title: '指标趋势', requireAuth: true },
  },
  {
    path: '/reports/export',
    name: 'report-export',
    component: () => import('@/pages/report/ExportConfigPage.vue'),
    meta: { title: '导出配置', requireAuth: true },
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
  {
    path: '/external-schedules',
    name: 'external-schedule-list',
    component: () => import('@/pages/external/ExternalScheduleListPage.vue'),
    meta: { title: '外部船期接入', requireAuth: true },
  },
  {
    path: '/external-schedules/pending',
    name: 'external-pending-confirmation',
    component: () => import('@/pages/external/PendingConfirmationListPage.vue'),
    meta: { title: '待确认处理中心', requireAuth: true },
  },
  {
    path: '/external-schedules/:id',
    name: 'external-schedule-detail',
    component: () => import('@/pages/external/ExternalScheduleDetailPage.vue'),
    meta: { title: '船期对照详情', requireAuth: true },
  },
  {
    path: '/external-schedules/imports',
    name: 'external-import-records',
    component: () => import('@/pages/external/ImportRecordsPage.vue'),
    meta: { title: '导入记录', requireAuth: true },
  },
  {
    path: '/site-operation',
    name: 'site-operation-list',
    component: () => import('@/pages/siteOperation/SiteCheckinListPage.vue'),
    meta: { title: '现场作业签到与确认', requireAuth: true },
  },
  {
    path: '/site-operation/confirm/:id',
    name: 'site-operation-confirm',
    component: () => import('@/pages/siteOperation/OperationConfirmPage.vue'),
    meta: { title: '作业确认', requireAuth: true },
  },
  {
    path: '/site-operation/:id',
    name: 'site-operation-detail',
    component: () => import('@/pages/siteOperation/SiteOperationDetailPage.vue'),
    meta: { title: '班组记录详情', requireAuth: true },
  },
  {
    path: '/scenarios',
    name: 'scenario-list',
    component: () => import('@/pages/scenario/ScenarioListPage.vue'),
    meta: { title: '调度场景推演', requireAuth: true },
  },
  {
    path: '/scenarios/:id',
    name: 'scenario-detail',
    component: () => import('@/pages/scenario/ScenarioDetailPage.vue'),
    meta: { title: '推演详情', requireAuth: true },
  },
  {
    path: '/snapshots',
    name: 'snapshot-list',
    component: () => import('@/pages/snapshot/SnapshotListPage.vue'),
    meta: { title: '调度复盘与历史快照', requireAuth: true },
  },
  {
    path: '/snapshots/compare',
    name: 'snapshot-compare',
    component: () => import('@/pages/snapshot/SnapshotComparePage.vue'),
    meta: { title: '盘面对比', requireAuth: true },
  },
  {
    path: '/snapshots/:id',
    name: 'snapshot-detail',
    component: () => import('@/pages/snapshot/SnapshotDetailPage.vue'),
    meta: { title: '快照详情', requireAuth: true },
  },
  {
    path: '/announcements',
    name: 'announcement-list',
    component: () => import('@/pages/announcement/AnnouncementListPage.vue'),
    meta: { title: '港区公告与值班提醒', requireAuth: true },
  },
  {
    path: '/announcements/new',
    name: 'announcement-new',
    component: () => import('@/pages/announcement/AnnouncementEditPage.vue'),
    meta: { title: '新建公告', requireAuth: true },
  },
  {
    path: '/announcements/:id',
    name: 'announcement-detail',
    component: () => import('@/pages/announcement/AnnouncementDetailPage.vue'),
    meta: { title: '公告详情', requireAuth: true },
  },
  {
    path: '/announcements/:id/edit',
    name: 'announcement-edit',
    component: () => import('@/pages/announcement/AnnouncementEditPage.vue'),
    meta: { title: '编辑公告', requireAuth: true },
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
