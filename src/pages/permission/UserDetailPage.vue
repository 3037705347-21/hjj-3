<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router';
import { computed, onMounted, ref } from 'vue';
import { usePermissionStore } from '../../stores/permission';
import { useAuthStore } from '../../stores/auth';
import {
  USER_ROLE_LABELS,
  USER_STATUS_LABELS,
  DATA_SCOPE_LABELS,
  PERMISSION_MODULE_LABELS,
  PERMISSION_ACTION_LABELS,
  AUDIT_ACTION_LABELS,
} from '../../types';
import type { UserRole, UserStatus } from '../../types';
import {
  Anchor,
  User,
  Shield,
  Activity,
  FileText,
  Bell,
  RefreshCw,
  Settings,
  Users,
  ArrowLeft,
  Calendar,
  Lock,
  Unlock,
} from 'lucide-vue-next';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const route = useRoute();
const router = useRouter();
const permissionStore = usePermissionStore();
const authStore = useAuthStore();
const userId = route.params.id as string;

const currentTime = ref(new Date());

onMounted(() => {
  setInterval(() => {
    currentTime.value = new Date();
  }, 1000);
});

const user = computed(() => permissionStore.getUserById(userId));
const auditLogs = computed(() => permissionStore.getAuditLogsByTarget(userId));

const roleColorMap: Record<UserRole, string> = {
  admin: 'text-harbor-red bg-harbor-red/15 border-harbor-red/30',
  duty_chief: 'text-harbor-orange bg-harbor-orange/15 border-harbor-orange/30',
  dispatcher: 'text-harbor-cyan bg-harbor-cyan/15 border-harbor-cyan/30',
  readonly: 'text-console-300 bg-console-700/50 border-console-500/30',
};

const statusColorMap: Record<UserStatus, string> = {
  active: 'text-harbor-green bg-harbor-green/15 border-harbor-green/30',
  disabled: 'text-harbor-red bg-harbor-red/15 border-harbor-red/30',
  locked: 'text-harbor-yellow bg-harbor-yellow/15 border-harbor-yellow/30',
};

const auditActionColorMap: Record<string, string> = {
  user_create: 'text-harbor-green',
  user_update: 'text-harbor-orange',
  user_delete: 'text-harbor-red',
  user_login: 'text-harbor-cyan',
  role_update: 'text-harbor-purple',
  permission_change: 'text-harbor-yellow',
  schedule_write: 'text-harbor-cyan',
  conflict_resolve: 'text-harbor-orange',
  log_export: 'text-console-300',
};

const actionBadgeColorMap: Record<string, string> = {
  read: 'text-console-200 bg-console-700/50 border-console-500/30',
  create: 'text-harbor-green bg-harbor-green/15 border-harbor-green/30',
  update: 'text-harbor-orange bg-harbor-orange/15 border-harbor-orange/30',
  delete: 'text-harbor-red bg-harbor-red/15 border-harbor-red/30',
  export: 'text-harbor-cyan bg-harbor-cyan/15 border-harbor-cyan/30',
  approve: 'text-harbor-purple bg-harbor-purple/15 border-harbor-purple/30',
};
</script>

<template>
  <div class="min-h-screen bg-console-900 console-grid-bg">
    <header class="sticky top-0 z-40 bg-console-900/90 backdrop-blur-xl border-b border-console-500/30">
      <div class="flex items-center justify-between px-6 py-3">
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-2">
            <div class="w-9 h-9 rounded-lg bg-gradient-to-br from-harbor-cyan to-harbor-orange flex items-center justify-center shadow-glow-cyan">
              <Anchor class="w-5 h-5 text-console-900" />
            </div>
            <div>
              <h1 class="font-mono text-lg font-bold text-console-100 tracking-wider glow-text-cyan">
                PORTOS
              </h1>
              <p class="text-[9px] font-mono text-console-400 uppercase tracking-widest">
                Berth Operations Control System
              </p>
            </div>
          </div>
          <div class="h-8 w-px bg-console-500/30 mx-2" />
          <nav class="flex items-center gap-1">
            <button
              @click="router.push('/')"
              class="px-3 py-1.5 rounded text-xs font-mono font-medium text-console-300 border border-console-500/30 hover:bg-console-700/50 hover:text-console-100 transition-all flex items-center gap-1.5"
            >
              运营控制台
            </button>
            <button
              @click="router.push('/logs')"
              class="px-3 py-1.5 rounded text-xs font-mono font-medium text-console-300 border border-console-500/30 hover:bg-console-700/50 hover:text-console-100 transition-all flex items-center gap-1.5"
            >
              调度日志
            </button>
            <button
              @click="router.push('/permission/users')"
              class="px-3 py-1.5 rounded text-xs font-mono font-medium bg-harbor-cyan/15 text-harbor-cyan border border-harbor-cyan/30 shadow-glow-blue flex items-center gap-1.5"
            >
              <Users class="w-3.5 h-3.5" />
              用户管理
            </button>
          </nav>
        </div>

        <div class="flex items-center gap-4">
          <div class="text-right">
            <p class="font-mono text-sm text-console-100 tabular-nums">
              {{ format(currentTime, 'yyyy-MM-dd HH:mm:ss', { locale: zhCN }) }}
            </p>
            <p class="text-[10px] font-mono text-console-400 uppercase tracking-wider">
              系统运行中
            </p>
          </div>

          <div class="h-8 w-px bg-console-500/30" />

          <button class="relative w-9 h-9 rounded-lg bg-console-800/60 border border-console-500/40 flex items-center justify-center text-console-300 hover:text-harbor-cyan hover:border-harbor-cyan/40 transition-all">
            <Bell class="w-4 h-4" />
          </button>

          <button class="w-9 h-9 rounded-lg bg-console-800/60 border border-console-500/40 flex items-center justify-center text-console-300 hover:text-console-100 hover:border-console-400/50 transition-all">
            <RefreshCw class="w-4 h-4" />
          </button>

          <button class="w-9 h-9 rounded-lg bg-console-800/60 border border-console-500/40 flex items-center justify-center text-console-300 hover:text-console-100 hover:border-console-400/50 transition-all">
            <Settings class="w-4 h-4" />
          </button>

          <div class="flex items-center gap-2 pl-2 border-l border-console-500/30">
            <div class="w-8 h-8 rounded-full bg-gradient-to-br from-harbor-orange to-harbor-red flex items-center justify-center">
              <User class="w-4 h-4 text-white" />
            </div>
            <div>
              <p class="text-xs font-mono font-medium text-console-100">{{ authStore.currentUser?.displayName || '—' }}</p>
              <p class="text-[9px] font-mono text-console-400">{{ authStore.currentUser ? USER_ROLE_LABELS[authStore.currentUser.role] : '—' }}</p>
            </div>
          </div>
        </div>
      </div>
    </header>

    <main class="p-4">
      <div v-if="!user" class="flex flex-col items-center justify-center py-32">
        <div class="w-16 h-16 rounded-full bg-harbor-red/15 border border-harbor-red/30 flex items-center justify-center mb-4">
          <User class="w-8 h-8 text-harbor-red" />
        </div>
        <p class="font-mono text-lg text-console-100 mb-2">用户不存在</p>
        <p class="font-mono text-xs text-console-400 mb-6">无法找到ID为 {{ userId }} 的用户</p>
        <button
          @click="router.push('/permission/users')"
          class="px-4 py-2 rounded text-xs font-mono font-medium bg-harbor-cyan/15 text-harbor-cyan border border-harbor-cyan/30 hover:bg-harbor-cyan/25 transition-all flex items-center gap-2"
        >
          <ArrowLeft class="w-3.5 h-3.5" />
          返回用户列表
        </button>
      </div>

      <template v-else>
        <div class="flex items-center gap-3 mb-4">
          <button
            @click="router.push('/permission/users')"
            class="w-8 h-8 rounded-lg bg-console-800/60 border border-console-500/40 flex items-center justify-center text-console-300 hover:text-console-100 hover:border-console-400/50 transition-all"
          >
            <ArrowLeft class="w-4 h-4" />
          </button>
          <div>
            <h2 class="font-mono text-lg font-bold text-console-100 flex items-center gap-2">
              <User class="w-5 h-5 text-harbor-cyan" />
              {{ user.displayName }}
            </h2>
            <p class="text-xs font-mono text-console-400">@{{ user.username }}</p>
          </div>
        </div>

        <div class="grid grid-cols-12 gap-4">
          <div class="col-span-3 space-y-4">
            <div class="panel-border rounded-lg p-4">
              <h3 class="font-mono text-sm font-semibold text-console-100 mb-4 flex items-center gap-2">
                <span class="w-1 h-4 bg-harbor-cyan rounded-full" />
                用户信息
              </h3>
              <div class="space-y-3">
                <div class="flex items-center gap-3 pb-3 border-b border-console-500/20">
                  <div class="w-12 h-12 rounded-full bg-gradient-to-br from-harbor-cyan to-harbor-blue flex items-center justify-center">
                    <User class="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p class="font-mono text-sm font-semibold text-console-100">{{ user.displayName }}</p>
                    <p class="text-[10px] font-mono text-console-400">{{ user.username }}</p>
                  </div>
                </div>

                <div class="flex items-center justify-between">
                  <span class="text-xs font-mono text-console-400 flex items-center gap-1.5">
                    <Shield class="w-3.5 h-3.5" />
                    角色
                  </span>
                  <span
                    :class="['px-2 py-0.5 rounded text-[10px] font-mono font-medium border', roleColorMap[user.role]]"
                  >
                    {{ USER_ROLE_LABELS[user.role] }}
                  </span>
                </div>

                <div class="flex items-center justify-between">
                  <span class="text-xs font-mono text-console-400 flex items-center gap-1.5">
                    <Activity class="w-3.5 h-3.5" />
                    状态
                  </span>
                  <span
                    :class="['px-2 py-0.5 rounded text-[10px] font-mono font-medium border', statusColorMap[user.status]]"
                  >
                    {{ USER_STATUS_LABELS[user.status] }}
                  </span>
                </div>

                <div class="flex items-center justify-between">
                  <span class="text-xs font-mono text-console-400 flex items-center gap-1.5">
                    <Lock class="w-3.5 h-3.5" />
                    数据范围
                  </span>
                  <span class="text-xs font-mono text-console-200">
                    {{ DATA_SCOPE_LABELS[user.dataScope] }}
                  </span>
                </div>

                <div class="pt-2 border-t border-console-500/20 space-y-2">
                  <div class="flex items-center justify-between">
                    <span class="text-[10px] font-mono text-console-500 flex items-center gap-1">
                      <Calendar class="w-3 h-3" />
                      创建时间
                    </span>
                    <span class="text-[10px] font-mono text-console-300">
                      {{ format(user.createdAt, 'yyyy-MM-dd HH:mm', { locale: zhCN }) }}
                    </span>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-[10px] font-mono text-console-500 flex items-center gap-1">
                      <RefreshCw class="w-3 h-3" />
                      更新时间
                    </span>
                    <span class="text-[10px] font-mono text-console-300">
                      {{ format(user.updatedAt, 'yyyy-MM-dd HH:mm', { locale: zhCN }) }}
                    </span>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-[10px] font-mono text-console-500 flex items-center gap-1">
                      <Unlock class="w-3 h-3" />
                      最后登录
                    </span>
                    <span class="text-[10px] font-mono text-console-300">
                      {{ user.lastLoginAt ? format(user.lastLoginAt, 'yyyy-MM-dd HH:mm', { locale: zhCN }) : '—' }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="col-span-5">
            <div class="panel-border rounded-lg p-4 h-full">
              <h3 class="font-mono text-sm font-semibold text-console-100 mb-4 flex items-center gap-2">
                <span class="w-1 h-4 bg-harbor-orange rounded-full" />
                权限列表
              </h3>
              <div class="space-y-3">
                <div
                  v-for="perm in user.permissions"
                  :key="perm.module"
                  class="p-3 rounded-lg bg-console-800/40 border border-console-500/20"
                >
                  <div class="flex items-center justify-between mb-2">
                    <span class="text-xs font-mono font-semibold text-console-100">
                      {{ PERMISSION_MODULE_LABELS[perm.module] }}
                    </span>
                    <span class="text-[9px] font-mono text-console-500">
                      {{ perm.actions.length }} 项操作
                    </span>
                  </div>
                  <div class="flex flex-wrap gap-1.5">
                    <span
                      v-for="action in perm.actions"
                      :key="action"
                      :class="['px-2 py-0.5 rounded text-[10px] font-mono font-medium border', actionBadgeColorMap[action] || 'text-console-300 bg-console-700/50 border-console-500/30']"
                    >
                      {{ PERMISSION_ACTION_LABELS[action] }}
                    </span>
                  </div>
                </div>
                <div
                  v-if="user.permissions.length === 0"
                  class="text-center py-8"
                >
                  <Shield class="w-8 h-8 text-console-600 mx-auto mb-2" />
                  <p class="text-xs font-mono text-console-500">暂无权限</p>
                </div>
              </div>
            </div>
          </div>

          <div class="col-span-4">
            <div class="panel-border rounded-lg p-4 h-full">
              <h3 class="font-mono text-sm font-semibold text-console-100 mb-4 flex items-center gap-2">
                <span class="w-1 h-4 bg-harbor-purple rounded-full" />
                审计日志
              </h3>
              <div class="space-y-0">
                <div
                  v-for="(log, idx) in auditLogs"
                  :key="log.id"
                  class="relative pl-6 pb-4"
                >
                  <div
                    v-if="idx < auditLogs.length - 1"
                    class="absolute left-[7px] top-3 bottom-0 w-px bg-console-500/30"
                  />
                  <div class="absolute left-0 top-1 w-[15px] h-[15px] rounded-full border-2 border-console-500/50 bg-console-800" />
                  <div class="space-y-1">
                    <div class="flex items-center justify-between">
                      <span
                        :class="['text-[10px] font-mono font-semibold', auditActionColorMap[log.action] || 'text-console-300']"
                      >
                        {{ AUDIT_ACTION_LABELS[log.action] }}
                      </span>
                      <span class="text-[9px] font-mono text-console-500">
                        {{ format(log.timestamp, 'MM-dd HH:mm', { locale: zhCN }) }}
                      </span>
                    </div>
                    <p class="text-[10px] font-mono text-console-400 leading-relaxed">
                      {{ log.description }}
                    </p>
                    <p class="text-[9px] font-mono text-console-600">
                      操作人: {{ log.operatorName }}
                    </p>
                  </div>
                </div>
                <div
                  v-if="auditLogs.length === 0"
                  class="text-center py-8"
                >
                  <FileText class="w-8 h-8 text-console-600 mx-auto mb-2" />
                  <p class="text-xs font-mono text-console-500">暂无审计记录</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </main>
  </div>
</template>
