<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { usePermissionStore } from '../../stores/permission';
import { useAuthStore } from '../../stores/auth';
import {
  Shield,
  Check,
  Anchor,
  ChevronRight,
  ChevronLeft,
  Save,
  User,
  Users,
  Lock,
  Eye,
  LayoutDashboard,
  History,
  CheckCircle,
  Plus,
  Minus,
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
  PERMISSION_MODULE_LABELS,
  PERMISSION_ACTION_LABELS,
  USER_ROLE_LABELS,
} from '../../types';

const router = useRouter();
const permissionStore = usePermissionStore();
const authStore = useAuthStore();

const currentStep = ref(1);
const selectedRole = ref<UserRole | null>(null);
const editingPermissions = reactive<Partial<Record<PermissionModule, PermissionAction[]>>>({});
const saveSuccess = ref(false);

const currentTime = ref(new Date());
onMounted(() => {
  setInterval(() => {
    currentTime.value = new Date();
  }, 1000);
});

const roleKeys: UserRole[] = ['admin', 'duty_chief', 'dispatcher', 'readonly'];

const roleDescriptions: Record<UserRole, string> = {
  admin: '系统管理员，拥有所有权限',
  duty_chief: '值班长，可处理冲突和审批调度变更',
  dispatcher: '调度员，可编辑泊位调度和变更状态',
  readonly: '只读人员，仅可查看调度和日志',
};

const roleColorMap: Record<UserRole, { text: string; bg: string; border: string; icon: typeof Shield }> = {
  admin: { text: 'text-harbor-red', bg: 'bg-harbor-red/15', border: 'border-harbor-red/30', icon: Shield },
  duty_chief: { text: 'text-harbor-orange', bg: 'bg-harbor-orange/15', border: 'border-harbor-orange/30', icon: Lock },
  dispatcher: { text: 'text-harbor-cyan', bg: 'bg-harbor-cyan/15', border: 'border-harbor-cyan/30', icon: Eye },
  readonly: { text: 'text-harbor-purple', bg: 'bg-harbor-purple/15', border: 'border-harbor-purple/30', icon: Users },
};

function getPermissionCount(roleKey: UserRole): number {
  const role = permissionStore.getRoleByKey(roleKey);
  if (!role) return 0;
  return role.permissions.reduce((sum, p) => sum + p.actions.length, 0);
}

function getUserCount(roleKey: UserRole): number {
  return permissionStore.users.filter((u) => u.role === roleKey).length;
}

function selectRole(roleKey: UserRole) {
  selectedRole.value = roleKey;
  const role = permissionStore.getRoleByKey(roleKey);
  if (role) {
    for (const mod of permissionStore.ALL_PERMISSION_MODULES) {
      const perm = role.permissions.find((p) => p.module === mod);
      editingPermissions[mod] = perm ? [...perm.actions] : [];
    }
  }
}

function isActionChecked(mod: PermissionModule, action: PermissionAction): boolean {
  return editingPermissions[mod]?.includes(action) ?? false;
}

function toggleAction(mod: PermissionModule, action: PermissionAction) {
  if (!editingPermissions[mod]) {
    editingPermissions[mod] = [];
  }
  const idx = editingPermissions[mod].indexOf(action);
  if (idx >= 0) {
    editingPermissions[mod].splice(idx, 1);
  } else {
    editingPermissions[mod].push(action);
  }
}

const addedPermissions = computed(() => {
  if (!selectedRole.value) return [];
  const role = permissionStore.getRoleByKey(selectedRole.value);
  if (!role) return [];
  const result: { module: PermissionModule; action: PermissionAction }[] = [];
  for (const mod of permissionStore.ALL_PERMISSION_MODULES) {
    const original = role.permissions.find((p) => p.module === mod);
    const originalActions = original ? original.actions : [];
    for (const act of editingPermissions[mod] || []) {
      if (!originalActions.includes(act)) {
        result.push({ module: mod, action: act });
      }
    }
  }
  return result;
});

const removedPermissions = computed(() => {
  if (!selectedRole.value) return [];
  const role = permissionStore.getRoleByKey(selectedRole.value);
  if (!role) return [];
  const result: { module: PermissionModule; action: PermissionAction }[] = [];
  for (const mod of permissionStore.ALL_PERMISSION_MODULES) {
    const original = role.permissions.find((p) => p.module === mod);
    const originalActions = original ? original.actions : [];
    for (const act of originalActions) {
      if (!(editingPermissions[mod] || []).includes(act)) {
        result.push({ module: mod, action: act });
      }
    }
  }
  return result;
});

const hasChanges = computed(() => addedPermissions.value.length > 0 || removedPermissions.value.length > 0);

function nextStep() {
  if (currentStep.value < 3) {
    currentStep.value++;
  }
}

function prevStep() {
  if (currentStep.value > 1) {
    currentStep.value--;
  }
}

function handleSave() {
  if (!selectedRole.value || !hasChanges.value) return;
  const permissions: Permission[] = [];
  for (const mod of permissionStore.ALL_PERMISSION_MODULES) {
    const actions = editingPermissions[mod];
    if (actions && actions.length > 0) {
      permissions.push({ module: mod, actions: [...actions] });
    }
  }
  permissionStore.updateRolePermissions(selectedRole.value, permissions);
  saveSuccess.value = true;
}

const steps = [
  { label: '选择角色', icon: Users },
  { label: '配置权限', icon: Shield },
  { label: '确认保存', icon: Save },
];

const navItems = [
  { label: '运营控制台', path: '/', icon: LayoutDashboard },
  { label: '调度日志', path: '/logs', icon: History },
  { label: '用户管理', path: '/permission/users', icon: Users },
  { label: '角色配置', path: '/permission/roles', icon: Shield },
  { label: '权限分配', path: '/permission/assign', icon: Lock },
];
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
              v-for="item in navItems"
              :key="item.path"
              @click="router.push(item.path)"
              :class="[
                'px-3 py-1.5 rounded text-xs font-mono font-medium transition-all flex items-center gap-1.5',
                item.path === '/permission/assign'
                  ? 'bg-harbor-cyan/15 text-harbor-cyan border border-harbor-cyan/30 shadow-glow-blue'
                  : 'text-console-300 border border-console-500/30 hover:bg-console-700/50 hover:text-console-100',
              ]"
            >
              <component :is="item.icon" class="w-3.5 h-3.5" />
              {{ item.label }}
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
          <div class="flex items-center gap-2 pl-2 border-l border-console-500/30">
            <div class="w-8 h-8 rounded-full bg-gradient-to-br from-harbor-orange to-harbor-red flex items-center justify-center">
              <User class="w-4 h-4 text-white" />
            </div>
            <div>
              <p class="text-xs font-mono font-medium text-console-100">{{ authStore.currentUser?.displayName || '—' }}</p>
              <p class="text-[9px] font-mono text-console-400">{{ authStore.currentUser ? USER_ROLE_LABELS[authStore.currentUser.role] : '' }}</p>
            </div>
          </div>
        </div>
      </div>
    </header>

    <main class="p-6">
      <div class="max-w-5xl mx-auto">
        <div class="panel-border rounded-lg p-6 mb-6">
          <div class="flex items-center justify-between mb-2">
            <h2 class="font-mono text-base font-bold text-console-100 flex items-center gap-2">
              <Shield class="w-5 h-5 text-harbor-cyan" />
              权限分配
            </h2>
            <span class="text-xs font-mono text-console-400">
              步骤 {{ currentStep }} / 3
            </span>
          </div>

          <div class="flex items-center gap-0 mt-4 mb-2">
            <template v-for="(step, idx) in steps" :key="idx">
              <div class="flex items-center gap-2">
                <div
                  :class="[
                    'w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono font-bold transition-all',
                    currentStep > idx + 1
                      ? 'bg-harbor-cyan text-console-900'
                      : currentStep === idx + 1
                        ? 'bg-harbor-cyan/20 text-harbor-cyan border-2 border-harbor-cyan shadow-glow-cyan'
                        : 'bg-console-700/50 text-console-400 border border-console-500/30',
                  ]"
                >
                  <Check v-if="currentStep > idx + 1" class="w-4 h-4" />
                  <component v-else :is="step.icon" class="w-4 h-4" />
                </div>
                <span
                  :class="[
                    'text-xs font-mono',
                    currentStep >= idx + 1 ? 'text-console-100' : 'text-console-400',
                  ]"
                >
                  {{ step.label }}
                </span>
              </div>
              <div
                v-if="idx < steps.length - 1"
                :class="[
                  'flex-1 h-px mx-3',
                  currentStep > idx + 1 ? 'bg-harbor-cyan' : 'bg-console-500/30',
                ]"
              />
            </template>
          </div>
        </div>

        <div v-if="currentStep === 1" class="grid grid-cols-2 gap-4">
          <button
            v-for="roleKey in roleKeys"
            :key="roleKey"
            @click="selectRole(roleKey)"
            :class="[
              'panel-border rounded-lg p-5 text-left transition-all',
              selectedRole === roleKey
                ? 'ring-2 ring-harbor-cyan shadow-glow-cyan'
                : 'hover:bg-console-700/30',
            ]"
          >
            <div class="flex items-start justify-between mb-3">
              <div class="flex items-center gap-3">
                <div
                  :class="[
                    'w-10 h-10 rounded-lg flex items-center justify-center',
                    roleColorMap[roleKey].bg,
                  ]"
                >
                  <component :is="roleColorMap[roleKey].icon" :class="['w-5 h-5', roleColorMap[roleKey].text]" />
                </div>
                <div>
                  <h3 :class="['font-mono text-sm font-bold', roleColorMap[roleKey].text]">
                    {{ USER_ROLE_LABELS[roleKey] }}
                  </h3>
                  <p class="text-[11px] font-mono text-console-400 mt-0.5">
                    {{ roleDescriptions[roleKey] }}
                  </p>
                </div>
              </div>
              <div
                v-if="selectedRole === roleKey"
                class="w-5 h-5 rounded-full bg-harbor-cyan flex items-center justify-center"
              >
                <Check class="w-3 h-3 text-console-900" />
              </div>
            </div>
            <div class="flex items-center gap-4 mt-2">
              <div class="flex items-center gap-1.5">
                <Lock class="w-3.5 h-3.5 text-console-400" />
                <span class="text-xs font-mono text-console-300">
                  {{ getPermissionCount(roleKey) }} 项权限
                </span>
              </div>
              <div class="flex items-center gap-1.5">
                <Users class="w-3.5 h-3.5 text-console-400" />
                <span class="text-xs font-mono text-console-300">
                  {{ getUserCount(roleKey) }} 名用户
                </span>
              </div>
            </div>
          </button>
        </div>

        <div v-if="currentStep === 2 && selectedRole" class="panel-border rounded-lg overflow-hidden">
          <div class="px-5 py-3 border-b border-console-500/20 flex items-center gap-2">
            <component :is="roleColorMap[selectedRole].icon" :class="['w-4 h-4', roleColorMap[selectedRole].text]" />
            <span :class="['font-mono text-sm font-bold', roleColorMap[selectedRole].text]">
              {{ USER_ROLE_LABELS[selectedRole] }}
            </span>
            <span class="text-xs font-mono text-console-400">— 权限配置矩阵</span>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="border-b border-console-500/20">
                  <th class="px-5 py-3 text-left text-xs font-mono font-semibold text-console-300 bg-console-800/50 w-40">
                    模块 \ 操作
                  </th>
                  <th
                    v-for="action in permissionStore.ALL_PERMISSION_ACTIONS"
                    :key="action"
                    class="px-3 py-3 text-center text-xs font-mono font-semibold text-console-300 bg-console-800/50"
                  >
                    {{ PERMISSION_ACTION_LABELS[action] }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(mod, modIdx) in permissionStore.ALL_PERMISSION_MODULES"
                  :key="mod"
                  :class="[
                    'border-b border-console-500/10',
                    modIdx % 2 === 0 ? 'bg-console-800/20' : '',
                  ]"
                >
                  <td class="px-5 py-3 text-xs font-mono text-console-200 font-medium">
                    {{ PERMISSION_MODULE_LABELS[mod] }}
                  </td>
                  <td
                    v-for="action in permissionStore.ALL_PERMISSION_ACTIONS"
                    :key="action"
                    class="px-3 py-3 text-center"
                  >
                    <button
                      @click="toggleAction(mod, action)"
                      :class="[
                        'w-7 h-7 rounded-md border transition-all flex items-center justify-center',
                        isActionChecked(mod, action)
                          ? 'bg-harbor-cyan/20 border-harbor-cyan/50 text-harbor-cyan'
                          : 'bg-console-800/40 border-console-500/20 text-console-500 hover:border-console-400/40',
                      ]"
                    >
                      <Check v-if="isActionChecked(mod, action)" class="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div v-if="currentStep === 3 && selectedRole" class="space-y-4">
          <div v-if="saveSuccess" class="panel-border rounded-lg p-8 text-center">
            <CheckCircle class="w-16 h-16 text-harbor-cyan mx-auto mb-4" />
            <h3 class="font-mono text-lg font-bold text-harbor-cyan mb-2">权限变更已保存</h3>
            <p class="text-sm font-mono text-console-300">
              角色「{{ USER_ROLE_LABELS[selectedRole] }}」的权限配置已成功更新
            </p>
            <button
              @click="router.push('/permission/roles')"
              class="mt-6 px-5 py-2 rounded-lg bg-harbor-cyan/15 text-harbor-cyan border border-harbor-cyan/30 font-mono text-sm hover:bg-harbor-cyan/25 transition-all"
            >
              返回角色配置
            </button>
          </div>

          <template v-else>
            <div class="panel-border rounded-lg p-5">
              <h3 class="font-mono text-sm font-semibold text-console-100 mb-4 flex items-center gap-2">
                <component :is="roleColorMap[selectedRole].icon" :class="['w-4 h-4', roleColorMap[selectedRole].text]" />
                {{ USER_ROLE_LABELS[selectedRole] }} — 变更摘要
              </h3>

              <div v-if="!hasChanges" class="text-center py-6">
                <p class="text-sm font-mono text-console-400">未检测到权限变更</p>
              </div>

              <template v-else>
                <div v-if="addedPermissions.length > 0" class="mb-4">
                  <div class="flex items-center gap-2 mb-2">
                    <Plus class="w-4 h-4 text-harbor-green" />
                    <span class="text-xs font-mono font-semibold text-harbor-green">新增权限 ({{ addedPermissions.length }})</span>
                  </div>
                  <div class="flex flex-wrap gap-2 ml-6">
                    <span
                      v-for="(p, idx) in addedPermissions"
                      :key="'add-' + idx"
                      class="px-2 py-1 rounded text-[11px] font-mono bg-harbor-green/10 text-harbor-green border border-harbor-green/20"
                    >
                      {{ PERMISSION_MODULE_LABELS[p.module] }} / {{ PERMISSION_ACTION_LABELS[p.action] }}
                    </span>
                  </div>
                </div>

                <div v-if="removedPermissions.length > 0">
                  <div class="flex items-center gap-2 mb-2">
                    <Minus class="w-4 h-4 text-harbor-red" />
                    <span class="text-xs font-mono font-semibold text-harbor-red">移除权限 ({{ removedPermissions.length }})</span>
                  </div>
                  <div class="flex flex-wrap gap-2 ml-6">
                    <span
                      v-for="(p, idx) in removedPermissions"
                      :key="'rm-' + idx"
                      class="px-2 py-1 rounded text-[11px] font-mono bg-harbor-red/10 text-harbor-red border border-harbor-red/20"
                    >
                      {{ PERMISSION_MODULE_LABELS[p.module] }} / {{ PERMISSION_ACTION_LABELS[p.action] }}
                    </span>
                  </div>
                </div>
              </template>
            </div>

            <div class="panel-border rounded-lg p-4">
              <div class="flex items-center gap-2 text-xs font-mono text-console-400">
                <Users class="w-3.5 h-3.5" />
                此变更将影响 {{ getUserCount(selectedRole) }} 名用户
              </div>
            </div>
          </template>
        </div>

        <div v-if="!(currentStep === 3 && saveSuccess)" class="flex items-center justify-between mt-6">
          <button
            @click="prevStep"
            :disabled="currentStep === 1"
            :class="[
              'px-5 py-2.5 rounded-lg font-mono text-sm flex items-center gap-2 transition-all',
              currentStep === 1
                ? 'bg-console-800/30 text-console-500 border border-console-500/20 cursor-not-allowed'
                : 'bg-console-800/60 text-console-200 border border-console-500/30 hover:bg-console-700/50 hover:text-console-100',
            ]"
          >
            <ChevronLeft class="w-4 h-4" />
            上一步
          </button>

          <div class="flex items-center gap-3">
            <button
              v-if="currentStep < 3"
              @click="nextStep"
              :disabled="currentStep === 1 && !selectedRole"
              :class="[
                'px-5 py-2.5 rounded-lg font-mono text-sm flex items-center gap-2 transition-all',
                currentStep === 1 && !selectedRole
                  ? 'bg-console-800/30 text-console-500 border border-console-500/20 cursor-not-allowed'
                  : 'bg-harbor-cyan/15 text-harbor-cyan border border-harbor-cyan/30 hover:bg-harbor-cyan/25 shadow-glow-blue',
              ]"
            >
              下一步
              <ChevronRight class="w-4 h-4" />
            </button>

            <button
              v-if="currentStep === 3"
              @click="handleSave"
              :disabled="!hasChanges || saveSuccess"
              :class="[
                'px-6 py-2.5 rounded-lg font-mono text-sm font-bold flex items-center gap-2 transition-all',
                !hasChanges || saveSuccess
                  ? 'bg-console-800/30 text-console-500 border border-console-500/20 cursor-not-allowed'
                  : 'bg-harbor-cyan text-console-900 border border-harbor-cyan shadow-glow-cyan hover:bg-harbor-cyan/90',
              ]"
            >
              <Save class="w-4 h-4" />
              确认保存
            </button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
