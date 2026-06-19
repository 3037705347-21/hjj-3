import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
  SystemUser,
  Role,
  AuditLog,
  AuditAction,
  UserRole,
  UserStatus,
  DataScope,
  Permission,
  PermissionModule,
  PermissionAction,
} from '../types';
import { mockUsers, mockRoles, mockAuditLogs } from '../data/mock';
import { useAuthStore } from './auth';

export const usePermissionStore = defineStore('permission', () => {
  const users = ref<SystemUser[]>([...mockUsers]);
  const roles = ref<Role[]>([...mockRoles]);
  const auditLogs = ref<AuditLog[]>([...mockAuditLogs]);

  const activeUsers = computed(() => users.value.filter((u) => u.status === 'active'));
  const disabledUsers = computed(() => users.value.filter((u) => u.status !== 'active'));

  function getUserById(id: string): SystemUser | undefined {
    return users.value.find((u) => u.id === id);
  }

  function getRoleByKey(key: UserRole): Role | undefined {
    return roles.value.find((r) => r.key === key);
  }

  function addAuditLog(
    action: AuditAction,
    targetId: string,
    targetType: AuditLog['targetType'],
    description: string,
    before: Record<string, unknown> | null = null,
    after: Record<string, unknown> | null = null,
  ) {
    const authStore = useAuthStore();
    const operator = authStore.currentUser;
    const entry: AuditLog = {
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date(),
      operatorId: operator?.id || 'system',
      operatorName: operator?.displayName || '系统',
      action,
      targetId,
      targetType,
      description,
      before,
      after,
    };
    auditLogs.value.unshift(entry);
  }

  function createUser(data: {
    username: string;
    displayName: string;
    role: UserRole;
    status: UserStatus;
    dataScope: DataScope;
  }): SystemUser {
    const roleObj = roles.value.find((r) => r.key === data.role);
    const newUser: SystemUser = {
      id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      username: data.username,
      displayName: data.displayName,
      role: data.role,
      status: data.status,
      permissions: roleObj ? [...roleObj.permissions] : [],
      accessibleRoutes: roleObj ? [...roleObj.accessibleRoutes] : [],
      dataScope: data.dataScope,
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    users.value.push(newUser);
    addAuditLog('user_create', newUser.id, 'user', `创建用户 ${data.username} (${data.displayName})`, null, {
      username: data.username,
      role: data.role,
    });
    return newUser;
  }

  function updateUser(
    id: string,
    data: Partial<Pick<SystemUser, 'displayName' | 'role' | 'status' | 'dataScope'>>,
  ): SystemUser | null {
    const user = users.value.find((u) => u.id === id);
    if (!user) return null;
    const before = { displayName: user.displayName, role: user.role, status: user.status, dataScope: user.dataScope };
    if (data.displayName !== undefined) user.displayName = data.displayName;
    if (data.role !== undefined) {
      user.role = data.role;
      const roleObj = roles.value.find((r) => r.key === data.role);
      if (roleObj) {
        user.permissions = [...roleObj.permissions];
        user.accessibleRoutes = [...roleObj.accessibleRoutes];
      }
    }
    if (data.status !== undefined) user.status = data.status;
    if (data.dataScope !== undefined) user.dataScope = data.dataScope;
    user.updatedAt = new Date();
    addAuditLog('user_update', id, 'user', `更新用户 ${user.username}`, before as unknown as Record<string, unknown>, {
      displayName: user.displayName,
      role: user.role,
      status: user.status,
      dataScope: user.dataScope,
    });
    return user;
  }

  function deleteUser(id: string): boolean {
    const idx = users.value.findIndex((u) => u.id === id);
    if (idx === -1) return false;
    const user = users.value[idx];
    users.value.splice(idx, 1);
    addAuditLog('user_delete', id, 'user', `删除用户 ${user.username}`, {
      username: user.username,
      role: user.role,
    } as unknown as Record<string, unknown>, null);
    return true;
  }

  function updateRole(
    key: UserRole,
    data: { permissions?: Permission[]; accessibleRoutes?: string[]; dataScope?: DataScope; description?: string },
  ): Role | null {
    const role = roles.value.find((r) => r.key === key);
    if (!role) return null;
    const before = {
      permissions: role.permissions.map((p) => p.module),
      dataScope: role.dataScope,
    };
    if (data.permissions) role.permissions = data.permissions;
    if (data.accessibleRoutes) role.accessibleRoutes = data.accessibleRoutes;
    if (data.dataScope) role.dataScope = data.dataScope;
    if (data.description) role.description = data.description;
    users.value
      .filter((u) => u.role === key)
      .forEach((u) => {
        u.permissions = [...role.permissions];
        u.accessibleRoutes = [...role.accessibleRoutes];
        u.dataScope = role.dataScope;
        u.updatedAt = new Date();
      });
    addAuditLog('role_update', role.id, 'role', `更新角色 ${role.name}`, before as Record<string, unknown>, {
      permissions: role.permissions.map((p) => p.module),
      dataScope: role.dataScope,
    });
    return role;
  }

  function updateRolePermissions(
    key: UserRole,
    permissions: Permission[],
  ): Role | null {
    const role = roles.value.find((r) => r.key === key);
    if (!role) return null;
    const beforeModules = role.permissions.map((p) => p.module);
    role.permissions = permissions;
    users.value
      .filter((u) => u.role === key)
      .forEach((u) => {
        u.permissions = [...permissions];
        u.updatedAt = new Date();
      });
    addAuditLog('permission_change', role.id, 'role', `变更角色 ${role.name} 权限`, {
      modules: beforeModules,
    }, {
      modules: permissions.map((p) => p.module),
    });
    return role;
  }

  function getAuditLogsByTarget(targetId: string): AuditLog[] {
    return auditLogs.value.filter((l) => l.targetId === targetId);
  }

  function getAuditLogsByAction(action: AuditAction): AuditLog[] {
    return auditLogs.value.filter((l) => l.action === action);
  }

  function getAuditLogsByOperator(operatorId: string): AuditLog[] {
    return auditLogs.value.filter((l) => l.operatorId === operatorId);
  }

  const ALL_PERMISSION_MODULES: PermissionModule[] = [
    'berth_schedule',
    'conflict_handle',
    'log_export',
    'status_change',
    'user_manage',
    'role_manage',
    'audit_view',
  ];

  const ALL_PERMISSION_ACTIONS: PermissionAction[] = [
    'read',
    'create',
    'update',
    'delete',
    'export',
    'approve',
  ];

  const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
    admin: [
      { module: 'berth_schedule', actions: ['read', 'create', 'update', 'delete'] },
      { module: 'conflict_handle', actions: ['read', 'update', 'approve'] },
      { module: 'log_export', actions: ['read', 'export'] },
      { module: 'status_change', actions: ['read', 'update'] },
      { module: 'user_manage', actions: ['read', 'create', 'update', 'delete'] },
      { module: 'role_manage', actions: ['read', 'update'] },
      { module: 'audit_view', actions: ['read'] },
    ],
    duty_chief: [
      { module: 'berth_schedule', actions: ['read', 'create', 'update'] },
      { module: 'conflict_handle', actions: ['read', 'update', 'approve'] },
      { module: 'log_export', actions: ['read', 'export'] },
      { module: 'status_change', actions: ['read', 'update'] },
      { module: 'audit_view', actions: ['read'] },
    ],
    dispatcher: [
      { module: 'berth_schedule', actions: ['read', 'create', 'update'] },
      { module: 'conflict_handle', actions: ['read'] },
      { module: 'status_change', actions: ['read', 'update'] },
    ],
    readonly: [
      { module: 'berth_schedule', actions: ['read'] },
      { module: 'conflict_handle', actions: ['read'] },
      { module: 'status_change', actions: ['read'] },
    ],
  };

  return {
    users,
    roles,
    auditLogs,
    activeUsers,
    disabledUsers,
    getUserById,
    getRoleByKey,
    addAuditLog,
    createUser,
    updateUser,
    deleteUser,
    updateRole,
    updateRolePermissions,
    getAuditLogsByTarget,
    getAuditLogsByAction,
    getAuditLogsByOperator,
    ALL_PERMISSION_MODULES,
    ALL_PERMISSION_ACTIONS,
    DEFAULT_ROLE_PERMISSIONS,
  };
});
