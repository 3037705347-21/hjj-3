<script setup lang="ts">
import { useRouter } from 'vue-router';
import { computed, onMounted, ref, reactive } from 'vue';
import { usePermissionStore } from '../../stores/permission';
import { useAuthStore } from '../../stores/auth';
import {
  Anchor,
  Shield,
  Check,
  User,
  Settings,
  Bell,
  RefreshCw,
  History,
  Users,
  KeyRound,
  Lock,
  Save,
} from 'lucide-vue-next';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type {
  Permission,
  PermissionModule,
  PermissionAction,
  UserRole,
} from '../../types';
import {
  DATA_SCOPE_LABELS,
  PERMISSION_MODULE_LABELS,
  PERMISSION_ACTION_LABELS,
  USER_ROLE_LABELS,
} from '../../types';

const router = useRouter();
const permissionStore = usePermissionStore();
const authStore = useAuthStore();

const currentTime = ref(new Date());
const selectedRoleKey = ref<UserRole>('admin');
const saving = ref(false);

const editingPermissions = reactive<Partial<Record<UserRole, Permission[]>>>({});

onMounted(() => {
  setInterval(() => {
    currentTime.value = new Date();
  }, 1000);
  for (const role of permissionStore.roles) {
    editingPermissions[role.key] = role.permissions.map((p) => ({
      module: p.module,
      actions: [...p.actions],
    }));
  }
});

const canEdit = computed(() => authStore.hasPermission('role_manage', 'update'));

const roleBadgeColors: Record<UserRole, { bg: string; text: string; border: string }> = {
  admin: { bg: 'bg-harbor-red/15', text: 'text-harbor-red', border: 'border-harbor-red/30' },
  duty_chief: { bg: 'bg-harbor-orange/15', text: 'text-harbor-orange', border: 'border-harbor-orange/30' },
  dispatcher: { bg: 'bg-harbor-cyan/15', text: 'text-harbor-cyan', border: 'border-harbor-cyan/30' },
  readonly: { bg: 'bg-console-300/15', text: 'text-console-300', border: 'border-console-300/30' },
};

const roleIconColors: Record<UserRole, string> = {
  admin: 'from-harbor-red to-harbor-orange',
  duty_chief: 'from-harbor-orange to-harbor-yellow',
  dispatcher: 'from-harbor-cyan to-harbor-blue',
  readonly: 'from-console-400 to-console-300',
};

const selectedRole = computed(() =>
  permissionStore.roles.find((r) => r.key === selectedRoleKey.value),
);

function getPermissionCount(roleKey: UserRole): number {
  const perms = editingPermissions[roleKey];
  if (!perms) return 0;
  return perms.reduce((sum, p) => sum + p.actions.length, 0);
}

function hasAction(roleKey: UserRole, module: PermissionModule, action: PermissionAction): boolean {
  const perms = editingPermissions[roleKey];
  if (!perms) return false;
  const perm = perms.find((p) => p.module === module);
  return !!perm && perm.actions.includes(action);
}

function toggleAction(roleKey: UserRole, module: PermissionModule, action: PermissionAction) {
  if (!canEdit.value) return;
  const perms = editingPermissions[roleKey];
  if (!perms) return;
  let perm = perms.find((p) => p.module === module);
  if (!perm) {
    perm = { module, actions: [] };
    perms.push(perm);
  }
  const idx = perm.actions.indexOf(action);
  if (idx >= 0) {
    perm.actions.splice(idx, 1);
  } else {
    perm.actions.push(action);
  }
}

function moduleHasAnyAction(roleKey: UserRole, module: PermissionModule): boolean {
  const perms = editingPermissions[roleKey];
  if (!perms) return false;
  const perm = perms.find((p) => p.module === module);
  return !!perm && perm.actions.length > 0;
}

function toggleAllActions(roleKey: UserRole, module: PermissionModule) {
  if (!canEdit.value) return;
  const allActions = permissionStore.ALL_PERMISSION_ACTIONS;
  if (moduleHasAnyAction(roleKey, module)) {
    const perms = editingPermissions[roleKey];
    const perm = perms?.find((p) => p.module === module);
    if (perm) perm.actions = [];
  } else {
    let perms = editingPermissions[roleKey];
    let perm = perms.find((p) => p.module === module);
    if (!perm) {
      perm = { module, actions: [...allActions] };
      perms.push(perm);
    } else {
      perm.actions = [...allActions];
    }
  }
}

async function savePermissions() {
  if (!canEdit.value || !selectedRole.value) return;
  saving.value = true;
  try {
    const perms = editingPermissions[selectedRoleKey.value].filter(
      (p) => p.actions.length > 0,
    );
    permissionStore.updateRolePermissions(selectedRoleKey.value, perms);
  } finally {
    saving.value = false;
  }
}

const navItems = computed(() => [
  { label: '运营控制台', path: '/', icon: null },
  { label: '调度日志', path: '/logs', icon: History },
  { label: '用户管理', path: '/permission/users', icon: Users },
  { label: '角色配置', path: '/permission/roles', icon: Shield, active: true },
  { label: '权限分配', path: '/permission/assign', icon: KeyRound },
]);
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
              <h1 class="font-mono text-lg font-bold text-console-100 tracking-wider glow-text-cyan">PORTOS</h1>
              <p class="text-[9px] font-mono text-console-400 uppercase tracking-widest">Berth Operations Control System</p>
            </div>
          </div>
          <div class="h-8 w-px bg-console-500/30 mx-2" />
          <nav class="flex items-center gap-1">
            <button
              v-for="item in navItems"
              :key="item.path"
              @click="router.push(item.path)"
              :class="[
                'px-3 py-1.5 rounded text-xs font-mono font-medium transition-all flex items-center gap-1.5',
                item.active
                  ? 'bg-harbor-cyan/15 text-harbor-cyan border border-harbor-cyan/30 shadow-glow-blue'
                  : 'text-console-300 border border-console-500/30 hover:bg-console-700/50 hover:text-console-100',
              ]"
            >
              <component v-if="item.icon" :is="item.icon" class="w-3.5 h-3.5" />
              {{ item.label }}
            </button>
          </nav>
        </div>

        <div class="flex items-center gap-4">
          <div class="text-right">
            <p class="font-mono text-sm text-console-100 tabular-nums">
              {{ format(currentTime, 'yyyy-MM-dd HH:mm:ss', { locale: zhCN }) }}
            </p>
            <p class="text-[10px] font-mono text-console-400 uppercase tracking-wider">系统运行中</p>
          </div>

          <div class="h-8 w-px bg-console-500/30" />

          <button class="w-9 h-9 rounded-lg bg-console-800/60 border border-console-500/40 flex items-center justify-center text-console-300 hover:text-harbor-cyan hover:border-harbor-cyan/40 transition-all">
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
              <p class="text-[9px] font-mono text-console-400">{{ USER_ROLE_LABELS[authStore.currentUser?.role as UserRole] || '—' }}</p>
            </div>
          </div>
        </div>
      </div>
    </header>

    <main class="p-4">
      <div class="grid grid-cols-12 gap-4" style="height: calc(100vh - 100px)">
        <div class="col-span-4 flex flex-col gap-3 overflow-auto">
          <div class="flex items-center justify-between mb-1">
            <h2 class="font-mono text-sm font-semibold text-console-100 flex items-center gap-2">
              <Shield class="w-4 h-4 text-harbor-cyan" />
              系统角色
            </h2>
            <span class="text-[10px] font-mono text-console-400">{{ permissionStore.roles.length }} 个角色</span>
          </div>

          <button
            v-for="role in permissionStore.roles"
            :key="role.key"
            @click="selectedRoleKey = role.key"
            :class="[
              'panel-border rounded-lg p-4 text-left transition-all',
              selectedRoleKey === role.key
                ? 'ring-1 ring-harbor-cyan/50 shadow-glow-cyan'
                : 'hover:bg-console-700/30',
            ]"
          >
            <div class="flex items-start justify-between mb-2">
              <div class="flex items-center gap-2.5">
                <div
                  :class="[
                    'w-9 h-9 rounded-lg bg-gradient-to-br flex items-center justify-center',
                    roleIconColors[role.key],
                  ]"
                >
                  <Shield class="w-4.5 h-4.5 text-console-900" />
                </div>
                <div>
                  <p class="font-mono text-sm font-semibold text-console-100">{{ role.name }}</p>
                  <p class="text-[10px] font-mono text-console-400">{{ role.key }}</p>
                </div>
              </div>
              <Lock v-if="role.key === 'admin'" class="w-3.5 h-3.5 text-harbor-yellow" />
            </div>

            <p class="text-xs font-mono text-console-300 mb-3 leading-relaxed">{{ role.description }}</p>

            <div class="flex items-center justify-between">
              <span
                :class="[
                  'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium border',
                  roleBadgeColors[role.key].bg,
                  roleBadgeColors[role.key].text,
                  roleBadgeColors[role.key].border,
                ]"
              >
                {{ DATA_SCOPE_LABELS[role.dataScope] }}
              </span>
              <span class="text-[10px] font-mono text-console-400">
                {{ getPermissionCount(role.key) }} 项权限
              </span>
            </div>
          </button>
        </div>

        <div class="col-span-8 flex flex-col gap-4 overflow-auto">
          <div v-if="selectedRole" class="flex-1 flex flex-col gap-4">
            <div class="panel-border rounded-lg p-4">
              <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-3">
                  <div
                    :class="[
                      'w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center',
                      roleIconColors[selectedRole.key],
                    ]"
                  >
                    <Shield class="w-5 h-5 text-console-900" />
                  </div>
                  <div>
                    <h3 class="font-mono text-base font-bold text-console-100">{{ selectedRole.name }} — 权限配置</h3>
                    <p class="text-xs font-mono text-console-400">{{ selectedRole.description }}</p>
                  </div>
                </div>

                <div class="flex items-center gap-3">
                  <span
                    :class="[
                      'inline-flex items-center px-2.5 py-1 rounded text-[11px] font-mono font-medium border',
                      roleBadgeColors[selectedRole.key].bg,
                      roleBadgeColors[selectedRole.key].text,
                      roleBadgeColors[selectedRole.key].border,
                    ]"
                  >
                    数据范围: {{ DATA_SCOPE_LABELS[selectedRole.dataScope] }}
                  </span>

                  <button
                    @click="savePermissions"
                    :disabled="!canEdit || saving"
                    :class="[
                      'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-semibold transition-all',
                      canEdit && !saving
                        ? 'bg-harbor-cyan/20 text-harbor-cyan border border-harbor-cyan/40 hover:bg-harbor-cyan/30 shadow-glow-blue'
                        : 'bg-console-700/30 text-console-500 border border-console-500/20 cursor-not-allowed',
                    ]"
                  >
                    <Save class="w-3.5 h-3.5" />
                    {{ saving ? '保存中...' : '保存权限' }}
                  </button>
                </div>
              </div>

              <div v-if="!canEdit" class="mb-4 px-3 py-2 rounded-lg bg-harbor-yellow/10 border border-harbor-yellow/30 flex items-center gap-2">
                <Lock class="w-3.5 h-3.5 text-harbor-yellow" />
                <span class="text-xs font-mono text-harbor-yellow">当前用户无修改权限，仅可查看</span>
              </div>

              <div class="grid grid-cols-1 gap-3">
                <div
                  v-for="mod in permissionStore.ALL_PERMISSION_MODULES"
                  :key="mod"
                  class="rounded-lg border border-console-500/20 bg-console-800/40 p-3"
                >
                  <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center gap-2">
                      <button
                        @click="toggleAllActions(selectedRoleKey, mod)"
                        :disabled="!canEdit"
                        :class="[
                          'w-4 h-4 rounded border flex items-center justify-center transition-all',
                          moduleHasAnyAction(selectedRoleKey, mod)
                            ? 'bg-harbor-cyan border-harbor-cyan text-console-900'
                            : 'border-console-400/50',
                          !canEdit && 'cursor-not-allowed',
                        ]"
                      >
                        <Check v-if="moduleHasAnyAction(selectedRoleKey, mod)" class="w-3 h-3" />
                      </button>
                      <span class="font-mono text-xs font-semibold text-console-100">
                        {{ PERMISSION_MODULE_LABELS[mod] }}
                      </span>
                    </div>
                    <span class="text-[10px] font-mono text-console-500">{{ mod }}</span>
                  </div>

                  <div class="flex flex-wrap gap-2 ml-6">
                    <button
                      v-for="action in permissionStore.ALL_PERMISSION_ACTIONS"
                      :key="action"
                      @click="toggleAction(selectedRoleKey, mod, action)"
                      :disabled="!canEdit"
                      :class="[
                        'flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-mono transition-all border',
                        hasAction(selectedRoleKey, mod, action)
                          ? 'bg-harbor-cyan/15 text-harbor-cyan border-harbor-cyan/30'
                          : 'bg-console-700/30 text-console-500 border-console-500/20',
                        canEdit
                          ? 'hover:bg-console-600/30'
                          : 'cursor-not-allowed opacity-60',
                      ]"
                    >
                      <div
                        :class="[
                          'w-3 h-3 rounded-sm border flex items-center justify-center',
                          hasAction(selectedRoleKey, mod, action)
                            ? 'bg-harbor-cyan border-harbor-cyan'
                            : 'border-console-400/40',
                        ]"
                      >
                        <Check v-if="hasAction(selectedRoleKey, mod, action)" class="w-2 h-2 text-console-900" />
                      </div>
                      {{ PERMISSION_ACTION_LABELS[action] }}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="flex-1 panel-border rounded-lg flex items-center justify-center">
            <div class="text-center">
              <Shield class="w-12 h-12 text-console-500 mx-auto mb-3" />
              <p class="font-mono text-sm text-console-400">请从左侧选择一个角色</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
