<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useResourceStore } from '../../stores/resource';
import { useScheduleStore } from '../../stores/schedule';
import { useAuthStore } from '../../stores/auth';
import {
  Anchor,
  LayoutDashboard,
  User,
  RefreshCw,
  Settings,
  Bell,
  Users,
  ClipboardCheck,
  Shield,
  Layers,
  History,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  GripVertical,
  Filter,
  ChevronDown,
  ExternalLink,
} from 'lucide-vue-next';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import {
  RESOURCE_CONFLICT_TYPE_LABELS,
  RESOURCE_TYPE_LABELS,
  type ResourceConflictType,
  type ResourceType,
} from '../../types';
import { USER_ROLE_LABELS } from '../../types';

const resourceStore = useResourceStore();
const scheduleStore = useScheduleStore();
const authStore = useAuthStore();
const router = useRouter();

const currentTime = ref(new Date());
const typeFilter = ref<ResourceConflictType | 'all'>('all');
const resourceTypeFilter = ref<ResourceType | 'all'>('all');
const statusFilter = ref<'all' | 'active' | 'resolved'>('active');
const showTypeDropdown = ref(false);
const showResourceTypeDropdown = ref(false);
const showStatusDropdown = ref(false);

onMounted(() => {
  setInterval(() => {
    currentTime.value = new Date();
  }, 1000);
  resourceStore.detectResourceConflicts();
});

const conflictCount = computed(() => resourceStore.activeConflicts.length);

const filteredConflicts = computed(() => {
  return resourceStore.conflicts.filter((c) => {
    if (typeFilter.value !== 'all' && c.type !== typeFilter.value) return false;
    if (resourceTypeFilter.value !== 'all' && c.resourceType !== resourceTypeFilter.value) return false;
    if (statusFilter.value === 'active' && c.resolved) return false;
    if (statusFilter.value === 'resolved' && !c.resolved) return false;
    return true;
  }).sort((a, b) => {
    if (a.resolved !== b.resolved) return a.resolved ? 1 : -1;
    return new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime();
  });
});

const conflictTypeOptions = computed(() =>
  (Object.keys(RESOURCE_CONFLICT_TYPE_LABELS) as ResourceConflictType[]).map((k) => ({
    value: k,
    label: RESOURCE_CONFLICT_TYPE_LABELS[k],
  })),
);

const resourceTypeOptions = computed(() =>
  (Object.keys(RESOURCE_TYPE_LABELS) as ResourceType[]).map((k) => ({
    value: k,
    label: RESOURCE_TYPE_LABELS[k],
  })),
);

function getShipName(scheduleId?: string) {
  if (!scheduleId) return '-';
  const schedule = scheduleStore.schedules.find((s) => s.id === scheduleId);
  if (!schedule) return scheduleId;
  const ship = scheduleStore.getShipById(schedule.shipId);
  return ship?.name || scheduleId;
}

function getSeverityClass(severity: 'error' | 'warning') {
  return severity === 'error'
    ? 'bg-harbor-red/15 text-harbor-red border-harbor-red/30'
    : 'bg-harbor-yellow/15 text-harbor-yellow border-harbor-yellow/30';
}

function getConflictStatusLabel(resolved: boolean) {
  return resolved ? '已解决' : '未解决';
}

function getConflictStatusClass(resolved: boolean) {
  return resolved
    ? 'bg-harbor-green/15 text-harbor-green border-harbor-green/30'
    : 'bg-harbor-red/15 text-harbor-red border-harbor-red/30';
}

function goToDetail(conflictId: string) {
  router.push(`/resources/conflicts/${conflictId}`);
}
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
              <LayoutDashboard class="w-3.5 h-3.5" />
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
              @click="router.push('/approval')"
              class="px-3 py-1.5 rounded text-xs font-mono font-medium text-console-300 border border-console-500/30 hover:bg-console-700/50 hover:text-console-100 transition-all flex items-center gap-1.5"
            >
              <ClipboardCheck class="w-3.5 h-3.5" />
              调度审批
            </button>
            <button
              @click="router.push('/resources')"
              class="px-3 py-1.5 rounded text-xs font-mono font-medium bg-harbor-cyan/15 text-harbor-cyan border border-harbor-cyan/30 shadow-glow-blue"
            >
              <Layers class="w-3.5 h-3.5 inline mr-1" />
              资源协同
            </button>
            <button
              v-if="authStore.canManageUsers"
              @click="router.push('/permission/users')"
              class="px-3 py-1.5 rounded text-xs font-mono font-medium text-console-300 border border-console-500/30 hover:bg-console-700/50 hover:text-console-100 transition-all flex items-center gap-1.5"
            >
              <Users class="w-3.5 h-3.5" />
              用户管理
            </button>
            <button
              v-if="authStore.canManageRoles"
              @click="router.push('/permission/roles')"
              class="px-3 py-1.5 rounded text-xs font-mono font-medium text-console-300 border border-console-500/30 hover:bg-console-700/50 hover:text-console-100 transition-all flex items-center gap-1.5"
            >
              <Shield class="w-3.5 h-3.5" />
              角色配置
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
              <p class="text-xs font-mono font-medium text-console-100">{{ authStore.currentUser?.displayName || resourceStore.currentOperator }}</p>
              <p class="text-[9px] font-mono text-console-400">{{ authStore.currentUser ? USER_ROLE_LABELS[authStore.currentUser.role] : '调度员' }}</p>
            </div>
          </div>
        </div>
      </div>
    </header>

    <main class="p-4 space-y-4">
      <div class="flex items-center gap-2 px-2">
        <button
          @click="router.push('/resources')"
          class="px-3 py-1.5 rounded text-xs font-mono font-medium text-console-300 border border-console-500/30 hover:bg-console-700/50 hover:text-console-100 transition-all"
        >
          资源列表
        </button>
        <button
          @click="router.push('/resources/board')"
          class="px-3 py-1.5 rounded text-xs font-mono font-medium text-console-300 border border-console-500/30 hover:bg-console-700/50 hover:text-console-100 transition-all"
        >
          资源占用看板
        </button>
        <button
          @click="router.push('/resources/conflicts')"
          class="px-3 py-1.5 rounded text-xs font-mono font-medium bg-harbor-cyan/15 text-harbor-cyan border border-harbor-cyan/30"
        >
          资源冲突
          <span
            v-if="conflictCount > 0"
            class="ml-1.5 min-w-[16px] h-[16px] px-0.5 rounded-full bg-harbor-red text-white text-[8px] font-mono font-bold inline-flex items-center justify-center"
          >
            {{ conflictCount }}
          </span>
        </button>
      </div>

      <div class="grid grid-cols-3 gap-4">
        <div class="panel-border rounded-lg p-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-[10px] font-mono text-console-400 uppercase tracking-wider">活动冲突</p>
              <p class="text-2xl font-mono font-bold text-harbor-red mt-1 tabular-nums">{{ resourceStore.activeConflicts.length }}</p>
            </div>
            <div class="w-10 h-10 rounded-lg bg-harbor-red/15 border border-harbor-red/30 flex items-center justify-center">
              <AlertTriangle class="w-5 h-5 text-harbor-red" />
            </div>
          </div>
        </div>
        <div class="panel-border rounded-lg p-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-[10px] font-mono text-console-400 uppercase tracking-wider">已解决</p>
              <p class="text-2xl font-mono font-bold text-harbor-green mt-1 tabular-nums">{{ resourceStore.resolvedConflicts.length }}</p>
            </div>
            <div class="w-10 h-10 rounded-lg bg-harbor-green/15 border border-harbor-green/30 flex items-center justify-center">
              <CheckCircle class="w-5 h-5 text-harbor-green" />
            </div>
          </div>
        </div>
        <div class="panel-border rounded-lg p-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-[10px] font-mono text-console-400 uppercase tracking-wider">冲突总数</p>
              <p class="text-2xl font-mono font-bold text-console-100 mt-1 tabular-nums">{{ resourceStore.conflicts.length }}</p>
            </div>
            <div class="w-10 h-10 rounded-lg bg-console-700/50 border border-console-500/30 flex items-center justify-center">
              <AlertCircle class="w-5 h-5 text-console-300" />
            </div>
          </div>
        </div>
      </div>

      <div class="panel-border rounded-lg overflow-hidden">
        <div class="flex items-center justify-between px-4 py-3 border-b border-console-500/30">
          <div class="flex items-center gap-3">
            <GripVertical class="w-4 h-4 text-console-300" />
            <h3 class="font-mono text-sm font-semibold text-console-100 tracking-wide">
              资源冲突记录
            </h3>
            <span class="text-[10px] font-mono text-console-300">
              共 {{ filteredConflicts.length }} 条
            </span>
          </div>
          <div class="flex items-center gap-2">
            <div class="relative">
              <button
                @click="showStatusDropdown = !showStatusDropdown"
                class="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-mono text-console-200 bg-console-800/80 border border-console-500/40 rounded hover:border-console-400/50 transition-all"
              >
                <Filter class="w-3 h-3" />
                {{ statusFilter === 'all' ? '全部状态' : statusFilter === 'active' ? '未解决' : '已解决' }}
                <ChevronDown class="w-3 h-3" />
              </button>
              <div
                v-if="showStatusDropdown"
                class="absolute top-full right-0 mt-1 bg-console-800 border border-console-500/40 rounded-lg shadow-xl z-20 min-w-[120px] overflow-hidden"
              >
                <button
                  @click="statusFilter = 'all'; showStatusDropdown = false"
                  class="w-full px-3 py-2 text-left text-xs font-mono text-console-200 hover:bg-console-700/50 transition-colors"
                >
                  全部状态
                </button>
                <button
                  @click="statusFilter = 'active'; showStatusDropdown = false"
                  class="w-full px-3 py-2 text-left text-xs font-mono text-console-200 hover:bg-console-700/50 transition-colors"
                >
                  未解决
                </button>
                <button
                  @click="statusFilter = 'resolved'; showStatusDropdown = false"
                  class="w-full px-3 py-2 text-left text-xs font-mono text-console-200 hover:bg-console-700/50 transition-colors"
                >
                  已解决
                </button>
              </div>
            </div>

            <div class="relative">
              <button
                @click="showTypeDropdown = !showTypeDropdown"
                class="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-mono text-console-200 bg-console-800/80 border border-console-500/40 rounded hover:border-console-400/50 transition-all"
              >
                <Filter class="w-3 h-3" />
                {{ typeFilter === 'all' ? '全部冲突类型' : RESOURCE_CONFLICT_TYPE_LABELS[typeFilter] }}
                <ChevronDown class="w-3 h-3" />
              </button>
              <div
                v-if="showTypeDropdown"
                class="absolute top-full right-0 mt-1 bg-console-800 border border-console-500/40 rounded-lg shadow-xl z-20 min-w-[160px] overflow-hidden"
              >
                <button
                  @click="typeFilter = 'all'; showTypeDropdown = false"
                  class="w-full px-3 py-2 text-left text-xs font-mono text-console-200 hover:bg-console-700/50 transition-colors"
                >
                  全部冲突类型
                </button>
                <button
                  v-for="opt in conflictTypeOptions"
                  :key="opt.value"
                  @click="typeFilter = opt.value; showTypeDropdown = false"
                  class="w-full px-3 py-2 text-left text-xs font-mono text-console-200 hover:bg-console-700/50 transition-colors"
                >
                  {{ opt.label }}
                </button>
              </div>
            </div>

            <div class="relative">
              <button
                @click="showResourceTypeDropdown = !showResourceTypeDropdown"
                class="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-mono text-console-200 bg-console-800/80 border border-console-500/40 rounded hover:border-console-400/50 transition-all"
              >
                <Filter class="w-3 h-3" />
                {{ resourceTypeFilter === 'all' ? '全部资源类型' : RESOURCE_TYPE_LABELS[resourceTypeFilter] }}
                <ChevronDown class="w-3 h-3" />
              </button>
              <div
                v-if="showResourceTypeDropdown"
                class="absolute top-full right-0 mt-1 bg-console-800 border border-console-500/40 rounded-lg shadow-xl z-20 min-w-[120px] overflow-hidden"
              >
                <button
                  @click="resourceTypeFilter = 'all'; showResourceTypeDropdown = false"
                  class="w-full px-3 py-2 text-left text-xs font-mono text-console-200 hover:bg-console-700/50 transition-colors"
                >
                  全部资源类型
                </button>
                <button
                  v-for="opt in resourceTypeOptions"
                  :key="opt.value"
                  @click="resourceTypeFilter = opt.value; showResourceTypeDropdown = false"
                  class="w-full px-3 py-2 text-left text-xs font-mono text-console-200 hover:bg-console-700/50 transition-colors"
                >
                  {{ opt.label }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-console-800/50">
              <tr>
                <th class="px-4 py-3 text-left text-[10px] font-mono text-console-400 uppercase tracking-wider">严重程度</th>
                <th class="px-4 py-3 text-left text-[10px] font-mono text-console-400 uppercase tracking-wider">冲突类型</th>
                <th class="px-4 py-3 text-left text-[10px] font-mono text-console-400 uppercase tracking-wider">资源信息</th>
                <th class="px-4 py-3 text-left text-[10px] font-mono text-console-400 uppercase tracking-wider">涉及计划</th>
                <th class="px-4 py-3 text-left text-[10px] font-mono text-console-400 uppercase tracking-wider">冲突描述</th>
                <th class="px-4 py-3 text-left text-[10px] font-mono text-console-400 uppercase tracking-wider">检测时间</th>
                <th class="px-4 py-3 text-left text-[10px] font-mono text-console-400 uppercase tracking-wider">状态</th>
                <th class="px-4 py-3 text-right text-[10px] font-mono text-console-400 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-console-500/20">
              <tr
                v-for="conflict in filteredConflicts"
                :key="conflict.id"
                class="hover:bg-console-700/20 transition-colors"
              >
                <td class="px-4 py-3">
                  <span :class="['inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-mono', getSeverityClass(conflict.severity)]">
                    <AlertTriangle v-if="conflict.severity === 'error'" class="w-3 h-3" />
                    <AlertCircle v-else class="w-3 h-3" />
                    {{ conflict.severity === 'error' ? '错误' : '警告' }}
                  </span>
                </td>
                <td class="px-4 py-3">
                  <span class="text-xs font-mono text-console-200">
                    {{ RESOURCE_CONFLICT_TYPE_LABELS[conflict.type] }}
                  </span>
                </td>
                <td class="px-4 py-3">
                  <div>
                    <p class="text-xs font-mono font-medium text-console-100">{{ conflict.resourceName }}</p>
                    <p class="text-[10px] font-mono text-console-400">
                      {{ RESOURCE_TYPE_LABELS[conflict.resourceType] }}
                    </p>
                  </div>
                </td>
                <td class="px-4 py-3">
                  <div class="space-y-0.5">
                    <span class="inline-block px-1.5 py-0.5 rounded bg-console-700/50 text-[10px] font-mono text-console-300 border border-console-500/30">
                      {{ getShipName(conflict.scheduleId) }}
                    </span>
                    <span v-if="conflict.relatedScheduleId" class="inline-block ml-1 px-1.5 py-0.5 rounded bg-console-700/50 text-[10px] font-mono text-console-300 border border-console-500/30">
                      {{ getShipName(conflict.relatedScheduleId) }}
                    </span>
                  </div>
                </td>
                <td class="px-4 py-3 max-w-[300px]">
                  <p class="text-xs font-mono text-console-300 line-clamp-2">{{ conflict.message }}</p>
                  <p v-if="conflict.overlapStart && conflict.overlapEnd" class="text-[10px] font-mono text-harbor-orange mt-1">
                    重叠时段: {{ format(new Date(conflict.overlapStart), 'MM/dd HH:mm', { locale: zhCN }) }} - {{ format(new Date(conflict.overlapEnd), 'MM/dd HH:mm', { locale: zhCN }) }}
                  </p>
                </td>
                <td class="px-4 py-3">
                  <span class="text-[10px] font-mono text-console-400">
                    {{ format(new Date(conflict.detectedAt), 'yyyy-MM-dd HH:mm', { locale: zhCN }) }}
                  </span>
                </td>
                <td class="px-4 py-3">
                  <span :class="['inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-mono', getConflictStatusClass(conflict.resolved)]">
                    <span
                      v-if="!conflict.resolved"
                      class="w-1.5 h-1.5 rounded-full bg-harbor-red animate-pulse"
                    />
                    {{ getConflictStatusLabel(conflict.resolved) }}
                  </span>
                </td>
                <td class="px-4 py-3">
                  <div class="flex items-center justify-end">
                    <button
                      @click="goToDetail(conflict.id)"
                      class="p-1.5 rounded text-console-300 hover:bg-console-700/50 hover:text-harbor-cyan transition-all"
                      title="查看详情"
                    >
                      <ExternalLink class="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="filteredConflicts.length === 0">
                <td colspan="8" class="px-4 py-12 text-center">
                  <div class="flex flex-col items-center gap-2">
                    <CheckCircle class="w-8 h-8 text-harbor-green" />
                    <p class="text-xs font-mono text-console-400">暂无资源冲突记录</p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>
  </div>
</template>
