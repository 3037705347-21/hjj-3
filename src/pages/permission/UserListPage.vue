<script setup lang="ts">
import { useRouter } from 'vue-router';
import { computed, onMounted, reactive, ref } from 'vue';
import { usePermissionStore } from '../../stores/permission';
import { useAuthStore } from '../../stores/auth';
import { useScheduleStore } from '../../stores/schedule';
import {
  USER_ROLE_LABELS,
  USER_STATUS_LABELS,
  DATA_SCOPE_LABELS,
} from '../../types';
import type { UserRole, UserStatus, DataScope, SystemUser } from '../../types';
import {
  Anchor,
  User,
  Search,
  Plus,
  X,
  Eye,
  Edit3,
  Trash2,
  Shield,
  Clock,
  History,
  RefreshCw,
  Settings,
  Bell,
  Users,
} from 'lucide-vue-next';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const router = useRouter();
const permissionStore = usePermissionStore();
const authStore = useAuthStore();
const scheduleStore = useScheduleStore();

const currentTime = ref(new Date());
onMounted(() => {
  setInterval(() => {
    currentTime.value = new Date();
  }, 1000);
});

const conflictCount = computed(() => scheduleStore.conflicts.filter((c) => c.severity === 'error').length);

const searchQuery = ref('');
const statusFilter = ref<UserStatus | 'all'>('all');
const roleFilter = ref<UserRole | 'all'>('all');

const filteredUsers = computed(() => {
  return permissionStore.users.filter((u) => {
    const matchesSearch =
      !searchQuery.value ||
      u.username.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      u.displayName.toLowerCase().includes(searchQuery.value.toLowerCase());
    const matchesStatus = statusFilter.value === 'all' || u.status === statusFilter.value;
    const matchesRole = roleFilter.value === 'all' || u.role === roleFilter.value;
    return matchesSearch && matchesStatus && matchesRole;
  });
});

const dialogVisible = ref(false);
const dialogMode = ref<'create' | 'edit'>('create');
const editingUserId = ref<string | null>(null);
const formErrors = ref<Record<string, string>>({});

const form = reactive({
  username: '',
  displayName: '',
  role: 'dispatcher' as UserRole,
  status: 'active' as UserStatus,
  dataScope: 'self' as DataScope,
});

function openCreateDialog() {
  dialogMode.value = 'create';
  editingUserId.value = null;
  form.username = '';
  form.displayName = '';
  form.role = 'dispatcher';
  form.status = 'active';
  form.dataScope = 'self';
  formErrors.value = {};
  dialogVisible.value = true;
}

function openEditDialog(user: SystemUser) {
  dialogMode.value = 'edit';
  editingUserId.value = user.id;
  form.username = user.username;
  form.displayName = user.displayName;
  form.role = user.role;
  form.status = user.status;
  form.dataScope = user.dataScope;
  formErrors.value = {};
  dialogVisible.value = true;
}

function closeDialog() {
  dialogVisible.value = false;
  formErrors.value = {};
}

function validateForm(): boolean {
  formErrors.value = {};
  if (!form.username.trim()) formErrors.value.username = '请输入用户名';
  if (!form.displayName.trim()) formErrors.value.displayName = '请输入显示名称';
  if (!form.role) formErrors.value.role = '请选择角色';
  if (!form.status) formErrors.value.status = '请选择状态';
  if (!form.dataScope) formErrors.value.dataScope = '请选择数据范围';

  if (dialogMode.value === 'create') {
    const exists = permissionStore.users.some(
      (u) => u.username.toLowerCase() === form.username.trim().toLowerCase(),
    );
    if (exists) formErrors.value.username = '用户名已存在';
  }

  return Object.keys(formErrors.value).length === 0;
}

function onSubmit() {
  if (!validateForm()) return;

  if (dialogMode.value === 'create') {
    permissionStore.createUser({
      username: form.username.trim(),
      displayName: form.displayName.trim(),
      role: form.role,
      status: form.status,
      dataScope: form.dataScope,
    });
  } else if (editingUserId.value) {
    permissionStore.updateUser(editingUserId.value, {
      displayName: form.displayName.trim(),
      role: form.role,
      status: form.status,
      dataScope: form.dataScope,
    });
  }

  closeDialog();
}

function onDeleteUser(user: SystemUser) {
  if (authStore.currentUser?.id === user.id) return;
  permissionStore.deleteUser(user.id);
}

function onViewUser(user: SystemUser) {
  router.push(`/permission/users/${user.id}`);
}

const roleOptions: UserRole[] = ['admin', 'duty_chief', 'dispatcher', 'readonly'];
const statusOptions: UserStatus[] = ['active', 'disabled', 'locked'];
const dataScopeOptions: DataScope[] = ['all', 'berth_group', 'self'];

const roleBadgeClass: Record<UserRole, string> = {
  admin: 'bg-harbor-red/15 text-harbor-red border-harbor-red/30',
  duty_chief: 'bg-harbor-orange/15 text-harbor-orange border-harbor-orange/30',
  dispatcher: 'bg-harbor-cyan/15 text-harbor-cyan border-harbor-cyan/30',
  readonly: 'bg-harbor-purple/15 text-harbor-purple border-harbor-purple/30',
};

const statusBadgeClass: Record<UserStatus, string> = {
  active: 'bg-harbor-green/15 text-harbor-green border-harbor-green/30',
  disabled: 'bg-console-400/15 text-console-400 border-console-400/30',
  locked: 'bg-harbor-yellow/15 text-harbor-yellow border-harbor-yellow/30',
};

const dialogTitle = computed(() =>
  dialogMode.value === 'create' ? '新增用户' : '编辑用户',
);

const dialogSubtitle = computed(() =>
  dialogMode.value === 'create' ? '创建新的系统用户账号' : '修改用户账号信息',
);

const canManageUsers = computed(() => authStore.canManageUsers);
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
              <History class="w-3.5 h-3.5" />
              调度日志
            </button>
            <button
              class="px-3 py-1.5 rounded text-xs font-mono font-medium bg-harbor-cyan/15 text-harbor-cyan border border-harbor-cyan/30 shadow-glow-blue flex items-center gap-1.5"
            >
              <Users class="w-3.5 h-3.5" />
              用户管理
            </button>
            <button
              @click="router.push('/permission/roles')"
              class="px-3 py-1.5 rounded text-xs font-mono font-medium text-console-300 border border-console-500/30 hover:bg-console-700/50 hover:text-console-100 transition-all flex items-center gap-1.5"
            >
              <Shield class="w-3.5 h-3.5" />
              角色配置
            </button>
            <button
              @click="router.push('/permission/assign')"
              class="px-3 py-1.5 rounded text-xs font-mono font-medium text-console-300 border border-console-500/30 hover:bg-console-700/50 hover:text-console-100 transition-all flex items-center gap-1.5"
            >
              权限分配
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
            <span
              v-if="conflictCount > 0"
              class="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-harbor-red text-white text-[9px] font-mono font-bold flex items-center justify-center animate-pulse-red"
            >
              {{ conflictCount }}
            </span>
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
              <p class="text-xs font-mono font-medium text-console-100">{{ authStore.currentUser?.displayName || '系统' }}</p>
              <p class="text-[9px] font-mono text-console-400">{{ authStore.currentUser ? USER_ROLE_LABELS[authStore.currentUser.role] : '' }}</p>
            </div>
          </div>
        </div>
      </div>
    </header>

    <main class="p-4 space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="font-mono text-xl font-bold text-console-100 flex items-center gap-2">
            <Users class="w-5 h-5 text-harbor-cyan" />
            用户管理
          </h2>
          <p class="text-xs font-mono text-console-400 mt-1">管理系统用户账号、角色分配与状态控制</p>
        </div>
        <button
          v-if="canManageUsers"
          @click="openCreateDialog"
          class="flex items-center gap-1.5 px-4 py-2 text-xs font-mono text-console-900 bg-gradient-to-r from-harbor-cyan to-harbor-cyan/80 rounded shadow-glow-cyan hover:shadow-glow-blue transition-all"
        >
          <Plus class="w-3.5 h-3.5" />
          新增用户
        </button>
      </div>

      <div class="panel-border rounded-lg p-3 flex items-center gap-3">
        <div class="flex-1 relative">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-console-400" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索用户名或显示名称..."
            class="w-full pl-9 pr-3 py-2 text-xs font-mono bg-console-800/80 border border-console-500/40 rounded text-console-100 placeholder:text-console-500 focus:outline-none focus:border-harbor-cyan/50 focus:shadow-glow-cyan transition-all"
          />
        </div>
        <select
          v-model="statusFilter"
          class="px-3 py-2 text-xs font-mono bg-console-800/80 border border-console-500/40 rounded text-console-100 focus:outline-none focus:border-harbor-cyan/50 transition-all"
        >
          <option value="all">全部状态</option>
          <option v-for="s in statusOptions" :key="s" :value="s">
            {{ USER_STATUS_LABELS[s] }}
          </option>
        </select>
        <select
          v-model="roleFilter"
          class="px-3 py-2 text-xs font-mono bg-console-800/80 border border-console-500/40 rounded text-console-100 focus:outline-none focus:border-harbor-cyan/50 transition-all"
        >
          <option value="all">全部角色</option>
          <option v-for="r in roleOptions" :key="r" :value="r">
            {{ USER_ROLE_LABELS[r] }}
          </option>
        </select>
      </div>

      <div class="panel-border rounded-lg overflow-hidden">
        <table class="w-full">
          <thead>
            <tr class="border-b border-console-500/30 bg-console-800/50">
              <th class="text-left px-4 py-2.5 text-[11px] font-mono font-semibold text-console-300 uppercase tracking-wider">用户名</th>
              <th class="text-left px-4 py-2.5 text-[11px] font-mono font-semibold text-console-300 uppercase tracking-wider">显示名称</th>
              <th class="text-left px-4 py-2.5 text-[11px] font-mono font-semibold text-console-300 uppercase tracking-wider">角色</th>
              <th class="text-left px-4 py-2.5 text-[11px] font-mono font-semibold text-console-300 uppercase tracking-wider">状态</th>
              <th class="text-left px-4 py-2.5 text-[11px] font-mono font-semibold text-console-300 uppercase tracking-wider">数据范围</th>
              <th class="text-left px-4 py-2.5 text-[11px] font-mono font-semibold text-console-300 uppercase tracking-wider">最近登录</th>
              <th class="text-right px-4 py-2.5 text-[11px] font-mono font-semibold text-console-300 uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="user in filteredUsers"
              :key="user.id"
              class="border-b border-console-500/20 hover:bg-console-800/30 transition-colors"
            >
              <td class="px-4 py-3 text-xs font-mono text-console-100">
                <div class="flex items-center gap-2">
                  <div class="w-7 h-7 rounded-full bg-gradient-to-br from-harbor-cyan/60 to-harbor-purple/60 flex items-center justify-center text-[10px] font-bold text-white">
                    {{ user.displayName.charAt(0) }}
                  </div>
                  <span>{{ user.username }}</span>
                </div>
              </td>
              <td class="px-4 py-3 text-xs font-mono text-console-200">{{ user.displayName }}</td>
              <td class="px-4 py-3">
                <span
                  :class="[
                    'inline-flex px-2 py-0.5 rounded text-[10px] font-mono font-medium border',
                    roleBadgeClass[user.role],
                  ]"
                >
                  {{ USER_ROLE_LABELS[user.role] }}
                </span>
              </td>
              <td class="px-4 py-3">
                <span
                  :class="[
                    'inline-flex px-2 py-0.5 rounded text-[10px] font-mono font-medium border',
                    statusBadgeClass[user.status],
                  ]"
                >
                  {{ USER_STATUS_LABELS[user.status] }}
                </span>
              </td>
              <td class="px-4 py-3 text-xs font-mono text-console-300">
                {{ DATA_SCOPE_LABELS[user.dataScope] }}
              </td>
              <td class="px-4 py-3 text-xs font-mono text-console-400">
                <div class="flex items-center gap-1">
                  <Clock class="w-3 h-3" />
                  <span v-if="user.lastLoginAt">
                    {{ format(new Date(user.lastLoginAt), 'MM-dd HH:mm', { locale: zhCN }) }}
                  </span>
                  <span v-else class="text-console-500">从未登录</span>
                </div>
              </td>
              <td class="px-4 py-3 text-right">
                <div class="flex items-center justify-end gap-1" v-if="canManageUsers">
                  <button
                    @click="onViewUser(user)"
                    class="p-1.5 rounded text-console-400 hover:text-harbor-cyan hover:bg-harbor-cyan/10 border border-transparent hover:border-harbor-cyan/30 transition-all"
                    title="查看"
                  >
                    <Eye class="w-3.5 h-3.5" />
                  </button>
                  <button
                    @click="openEditDialog(user)"
                    class="p-1.5 rounded text-console-400 hover:text-harbor-orange hover:bg-harbor-orange/10 border border-transparent hover:border-harbor-orange/30 transition-all"
                    title="编辑"
                  >
                    <Edit3 class="w-3.5 h-3.5" />
                  </button>
                  <button
                    v-if="authStore.currentUser?.id !== user.id"
                    @click="onDeleteUser(user)"
                    class="p-1.5 rounded text-console-400 hover:text-harbor-red hover:bg-harbor-red/10 border border-transparent hover:border-harbor-red/30 transition-all"
                    title="删除"
                  >
                    <Trash2 class="w-3.5 h-3.5" />
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="filteredUsers.length === 0">
              <td colspan="7" class="px-4 py-12 text-center text-xs font-mono text-console-500">
                <Users class="w-8 h-8 mx-auto mb-2 text-console-500/50" />
                没有找到匹配的用户
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="flex items-center justify-between px-1">
        <p class="text-[10px] font-mono text-console-500">
          共 {{ permissionStore.users.length }} 个用户，显示 {{ filteredUsers.length }} 条
        </p>
        <p class="text-[10px] font-mono text-console-500">
          启用 {{ permissionStore.activeUsers.length }} · 禁用 {{ permissionStore.disabledUsers.length }}
        </p>
      </div>
    </main>

    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="dialogVisible"
          class="fixed inset-0 z-[100] flex items-center justify-center"
        >
          <div
            class="absolute inset-0 bg-black/60 backdrop-blur-sm"
            @click="closeDialog"
          />
          <div
            class="relative w-full max-w-lg mx-4 max-h-[90vh] bg-console-900 border border-console-500/40 rounded-xl shadow-2xl overflow-hidden flex flex-col animate-modal-in"
          >
            <div class="flex items-center justify-between px-5 py-3.5 border-b border-console-500/30 bg-console-800/50">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-harbor-cyan to-harbor-orange flex items-center justify-center">
                  <User class="w-4 h-4 text-console-900" />
                </div>
                <div>
                  <h2 class="font-mono text-base font-bold text-console-100">
                    {{ dialogTitle }}
                  </h2>
                  <p class="text-[10px] font-mono text-console-400">
                    {{ dialogSubtitle }}
                  </p>
                </div>
              </div>
              <button
                @click="closeDialog"
                class="w-8 h-8 flex items-center justify-center rounded border border-console-500/40 text-console-300 hover:text-harbor-red hover:border-harbor-red/50 hover:bg-harbor-red/10 transition-all"
              >
                <X class="w-4 h-4" />
              </button>
            </div>

            <div class="flex-1 overflow-y-auto p-5 space-y-4">
              <div>
                <label class="flex items-center gap-1.5 text-[11px] font-mono text-console-300 uppercase tracking-wider mb-1.5">
                  <User class="w-3.5 h-3.5 text-harbor-cyan" />
                  用户名 <span class="text-harbor-red">*</span>
                </label>
                <input
                  v-model="form.username"
                  type="text"
                  :disabled="dialogMode === 'edit'"
                  :class="[
                    'w-full px-3 py-2 text-xs font-mono bg-console-800/80 border rounded text-console-100 focus:outline-none focus:shadow-glow-cyan transition-all',
                    dialogMode === 'edit' ? 'opacity-50 cursor-not-allowed' : '',
                    formErrors.username ? 'border-harbor-red/50 focus:border-harbor-red/70' : 'border-console-500/40 focus:border-harbor-cyan/50',
                  ]"
                />
                <p v-if="formErrors.username" class="text-[10px] font-mono text-harbor-red mt-1">
                  {{ formErrors.username }}
                </p>
              </div>

              <div>
                <label class="flex items-center gap-1.5 text-[11px] font-mono text-console-300 uppercase tracking-wider mb-1.5">
                  <User class="w-3.5 h-3.5 text-harbor-cyan" />
                  显示名称 <span class="text-harbor-red">*</span>
                </label>
                <input
                  v-model="form.displayName"
                  type="text"
                  :class="[
                    'w-full px-3 py-2 text-xs font-mono bg-console-800/80 border rounded text-console-100 placeholder:text-console-500 focus:outline-none focus:shadow-glow-cyan transition-all',
                    formErrors.displayName ? 'border-harbor-red/50 focus:border-harbor-red/70' : 'border-console-500/40 focus:border-harbor-cyan/50',
                  ]"
                />
                <p v-if="formErrors.displayName" class="text-[10px] font-mono text-harbor-red mt-1">
                  {{ formErrors.displayName }}
                </p>
              </div>

              <div>
                <label class="flex items-center gap-1.5 text-[11px] font-mono text-console-300 uppercase tracking-wider mb-1.5">
                  <Shield class="w-3.5 h-3.5 text-harbor-cyan" />
                  角色 <span class="text-harbor-red">*</span>
                </label>
                <select
                  v-model="form.role"
                  :class="[
                    'w-full px-3 py-2 text-xs font-mono bg-console-800/80 border rounded text-console-100 focus:outline-none focus:shadow-glow-cyan transition-all',
                    formErrors.role ? 'border-harbor-red/50 focus:border-harbor-red/70' : 'border-console-500/40 focus:border-harbor-cyan/50',
                  ]"
                >
                  <option v-for="r in roleOptions" :key="r" :value="r">
                    {{ USER_ROLE_LABELS[r] }}
                  </option>
                </select>
                <p v-if="formErrors.role" class="text-[10px] font-mono text-harbor-red mt-1">
                  {{ formErrors.role }}
                </p>
              </div>

              <div>
                <label class="flex items-center gap-1.5 text-[11px] font-mono text-console-300 uppercase tracking-wider mb-1.5">
                  状态 <span class="text-harbor-red">*</span>
                </label>
                <select
                  v-model="form.status"
                  :class="[
                    'w-full px-3 py-2 text-xs font-mono bg-console-800/80 border rounded text-console-100 focus:outline-none focus:shadow-glow-cyan transition-all',
                    formErrors.status ? 'border-harbor-red/50 focus:border-harbor-red/70' : 'border-console-500/40 focus:border-harbor-cyan/50',
                  ]"
                >
                  <option v-for="s in statusOptions" :key="s" :value="s">
                    {{ USER_STATUS_LABELS[s] }}
                  </option>
                </select>
                <p v-if="formErrors.status" class="text-[10px] font-mono text-harbor-red mt-1">
                  {{ formErrors.status }}
                </p>
              </div>

              <div>
                <label class="flex items-center gap-1.5 text-[11px] font-mono text-console-300 uppercase tracking-wider mb-1.5">
                  数据范围 <span class="text-harbor-red">*</span>
                </label>
                <select
                  v-model="form.dataScope"
                  :class="[
                    'w-full px-3 py-2 text-xs font-mono bg-console-800/80 border rounded text-console-100 focus:outline-none focus:shadow-glow-cyan transition-all',
                    formErrors.dataScope ? 'border-harbor-red/50 focus:border-harbor-red/70' : 'border-console-500/40 focus:border-harbor-cyan/50',
                  ]"
                >
                  <option v-for="d in dataScopeOptions" :key="d" :value="d">
                    {{ DATA_SCOPE_LABELS[d] }}
                  </option>
                </select>
                <p v-if="formErrors.dataScope" class="text-[10px] font-mono text-harbor-red mt-1">
                  {{ formErrors.dataScope }}
                </p>
              </div>
            </div>

            <div class="flex items-center justify-between px-5 py-3.5 border-t border-console-500/30 bg-console-800/30">
              <div class="text-[10px] font-mono text-console-400">
                {{ format(new Date(), 'yyyy-MM-dd HH:mm', { locale: zhCN }) }}
              </div>
              <div class="flex items-center gap-2">
                <button
                  @click="closeDialog"
                  class="px-4 py-2 text-xs font-mono text-console-200 border border-console-500/40 rounded hover:bg-console-700/50 transition-all"
                >
                  取消
                </button>
                <button
                  @click="onSubmit"
                  class="flex items-center gap-1.5 px-4 py-2 text-xs font-mono text-console-900 bg-gradient-to-r from-harbor-cyan to-harbor-cyan/80 rounded shadow-glow-cyan hover:shadow-glow-blue transition-all"
                >
                  {{ dialogMode === 'create' ? '创建用户' : '保存修改' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-active > div:last-child,
.modal-leave-active > div:last-child {
  transition: transform 0.25s ease, opacity 0.25s ease;
}
.modal-enter-from > div:last-child,
.modal-leave-to > div:last-child {
  transform: translateY(20px) scale(0.96);
  opacity: 0;
}
.animate-modal-in {
  animation: modalIn 0.25s ease-out;
}
@keyframes modalIn {
  from {
    transform: translateY(20px) scale(0.96);
    opacity: 0;
  }
  to {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
}
</style>
