import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { SystemUser, PermissionModule, PermissionAction } from '../types';
import { mockUsers } from '../data/mock';

export const useAuthStore = defineStore('auth', () => {
  const currentUser = ref<SystemUser | null>(null);
  const isLoggedIn = computed(() => !!currentUser.value);

  function login(username: string): boolean {
    const user = mockUsers.find((u) => u.username === username && u.status === 'active');
    if (!user) return false;
    currentUser.value = { ...user, lastLoginAt: new Date() };
    return true;
  }

  function loginAsDefault() {
    const defaultUser = mockUsers.find((u) => u.username === 'zhangwei') || mockUsers[1];
    currentUser.value = { ...defaultUser, lastLoginAt: new Date() };
  }

  function logout() {
    currentUser.value = null;
  }

  function hasPermission(module: PermissionModule, action: PermissionAction): boolean {
    if (!currentUser.value) return false;
    if (currentUser.value.role === 'admin') return true;
    const perm = currentUser.value.permissions.find((p) => p.module === module);
    return !!perm && perm.actions.includes(action);
  }

  function canAccessRoute(path: string): boolean {
    if (!currentUser.value) return false;
    if (currentUser.value.role === 'admin') return true;
    return currentUser.value.accessibleRoutes.includes(path);
  }

  function getAccessibleRoutes(): string[] {
    if (!currentUser.value) return [];
    return currentUser.value.accessibleRoutes;
  }

  function hasAnyPermission(modules: PermissionModule[]): boolean {
    if (!currentUser.value) return false;
    if (currentUser.value.role === 'admin') return true;
    return modules.some((m) =>
      currentUser.value!.permissions.some((p) => p.module === m && p.actions.length > 0),
    );
  }

  const userRole = computed(() => currentUser.value?.role ?? null);

  const isAdmin = computed(() => currentUser.value?.role === 'admin');
  const isDutyChief = computed(() => currentUser.value?.role === 'duty_chief');
  const isDispatcher = computed(() => currentUser.value?.role === 'dispatcher');
  const isReadonly = computed(() => currentUser.value?.role === 'readonly');

  const canEditSchedule = computed(() =>
    hasPermission('berth_schedule', 'update'),
  );

  const canCreateSchedule = computed(() =>
    hasPermission('berth_schedule', 'create'),
  );

  const canDeleteSchedule = computed(() =>
    hasPermission('berth_schedule', 'delete'),
  );

  const canHandleConflict = computed(() =>
    hasPermission('conflict_handle', 'update'),
  );

  const canExportLog = computed(() =>
    hasPermission('log_export', 'export'),
  );

  const canChangeStatus = computed(() =>
    hasPermission('status_change', 'update'),
  );

  const canManageUsers = computed(() =>
    hasPermission('user_manage', 'read'),
  );

  const canManageRoles = computed(() =>
    hasPermission('role_manage', 'read'),
  );

  const canManageResources = computed(() =>
    hasPermission('resource_manage', 'read'),
  );

  const canAllocateResources = computed(() =>
    hasPermission('resource_allocate', 'update'),
  );

  return {
    currentUser,
    isLoggedIn,
    userRole,
    isAdmin,
    isDutyChief,
    isDispatcher,
    isReadonly,
    canEditSchedule,
    canCreateSchedule,
    canDeleteSchedule,
    canHandleConflict,
    canExportLog,
    canChangeStatus,
    canManageUsers,
    canManageRoles,
    canManageResources,
    canAllocateResources,
    login,
    loginAsDefault,
    logout,
    hasPermission,
    canAccessRoute,
    getAccessibleRoutes,
    hasAnyPermission,
  };
});
