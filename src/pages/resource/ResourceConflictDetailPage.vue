<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
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
  ArrowLeft,
  Building2,
  HardHat,
  Cpu,
  Save,
  Ship,
  Calendar,
} from 'lucide-vue-next';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import {
  RESOURCE_CONFLICT_TYPE_LABELS,
  RESOURCE_TYPE_LABELS,
  RESOURCE_STATUS_LABELS,
  type ResourceType,
} from '../../types';
import { USER_ROLE_LABELS } from '../../types';

const resourceStore = useResourceStore();
const scheduleStore = useScheduleStore();
const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();

const currentTime = ref(new Date());
const conflictCount = computed(() => resourceStore.activeConflicts.length);
const resolutionNote = ref('');

const conflictId = computed(() => route.params.id as string);

const conflict = computed(() =>
  resourceStore.conflicts.find((c) => c.id === conflictId.value) || null,
);

const resource = computed(() =>
  conflict.value ? resourceStore.getResourceById(conflict.value.resourceId) : null,
);

const schedule = computed(() =>
  conflict.value ? scheduleStore.schedules.find((s) => s.id === conflict.value!.scheduleId) : null,
);

const relatedSchedule = computed(() =>
  conflict.value?.relatedScheduleId
    ? scheduleStore.schedules.find((s) => s.id === conflict.value!.relatedScheduleId)
    : null,
);

const ship = computed(() =>
  schedule.value ? scheduleStore.getShipById(schedule.value.shipId) : null,
);

const relatedShip = computed(() =>
  relatedSchedule.value ? scheduleStore.getShipById(relatedSchedule.value.shipId) : null,
);

watch(
  () => conflict.value?.resolutionNote,
  (val) => {
    if (val) resolutionNote.value = val;
  },
  { immediate: true },
);

onMounted(() => {
  setInterval(() => {
    currentTime.value = new Date();
  }, 1000);
  resourceStore.detectResourceConflicts();
});

function getResourceTypeIcon(type: ResourceType) {
  switch (type) {
    case 'berth':
      return Building2;
    case 'team':
      return HardHat;
    case 'equipment':
      return Cpu;
  }
}

function getSeverityClass(severity: 'error' | 'warning') {
  return severity === 'error'
    ? 'bg-harbor-red/15 text-harbor-red border-harbor-red/30'
    : 'bg-harbor-yellow/15 text-harbor-yellow border-harbor-yellow/30';
}

function resolveConflict() {
  if (!conflict.value || !resolutionNote.value.trim()) {
    alert('请输入解决说明');
    return;
  }
  resourceStore.resolveConflict(conflict.value.id, resolutionNote.value.trim());
}

function goBack() {
  router.push('/resources/conflicts');
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
          @click="goBack"
          class="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-mono font-medium text-console-300 border border-console-500/30 hover:bg-console-700/50 hover:text-console-100 transition-all"
        >
          <ArrowLeft class="w-3.5 h-3.5" />
          返回冲突列表
        </button>
      </div>

      <div v-if="!conflict" class="panel-border rounded-lg p-12 text-center">
        <AlertCircle class="w-10 h-10 text-console-500 mx-auto mb-3" />
        <p class="text-sm font-mono text-console-400">冲突记录不存在或已被删除</p>
      </div>

      <template v-else>
        <div class="panel-border rounded-lg overflow-hidden">
          <div class="flex items-center justify-between px-5 py-4 border-b border-console-500/30 bg-console-800/30">
            <div class="flex items-center gap-3">
              <div :class="['w-10 h-10 rounded-lg flex items-center justify-center border', conflict.resolved ? 'bg-harbor-green/15 border-harbor-green/30' : 'bg-harbor-red/15 border-harbor-red/30']">
                <AlertTriangle v-if="!conflict.resolved" class="w-5 h-5 text-harbor-red" />
                <CheckCircle v-else class="w-5 h-5 text-harbor-green" />
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <h2 class="font-mono text-base font-semibold text-console-100">
                    资源冲突详情
                  </h2>
                  <span :class="['inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-mono', getSeverityClass(conflict.severity)]">
                    {{ conflict.severity === 'error' ? '严重' : '警告' }}
                  </span>
                  <span
                    :class="[
                      'inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-mono',
                      conflict.resolved
                        ? 'bg-harbor-green/15 text-harbor-green border-harbor-green/30'
                        : 'bg-harbor-red/15 text-harbor-red border-harbor-red/30',
                    ]"
                  >
                    <span
                      v-if="!conflict.resolved"
                      class="w-1.5 h-1.5 rounded-full bg-harbor-red animate-pulse"
                    />
                    {{ conflict.resolved ? '已解决' : '未解决' }}
                  </span>
                </div>
                <p class="text-[10px] font-mono text-console-400 mt-0.5">
                  冲突ID: {{ conflict.id }} · 检测于 {{ format(new Date(conflict.detectedAt), 'yyyy-MM-dd HH:mm:ss', { locale: zhCN }) }}
                </p>
              </div>
            </div>
          </div>

          <div class="p-5 space-y-5">
            <div class="panel-border rounded-lg p-4 bg-harbor-red/5 border-harbor-red/20">
              <div class="flex items-start gap-2">
                <AlertTriangle class="w-4 h-4 text-harbor-red mt-0.5 flex-shrink-0" />
                <div>
                  <p class="text-xs font-mono font-medium text-harbor-red mb-1">
                    {{ RESOURCE_CONFLICT_TYPE_LABELS[conflict.type] }}
                  </p>
                  <p class="text-xs font-mono text-console-200">{{ conflict.message }}</p>
                  <p v-if="conflict.overlapStart && conflict.overlapEnd" class="text-[10px] font-mono text-harbor-orange mt-2">
                    <Calendar class="w-3 h-3 inline mr-1" />
                    重叠时段: {{ format(new Date(conflict.overlapStart), 'yyyy-MM-dd HH:mm', { locale: zhCN }) }} - {{ format(new Date(conflict.overlapEnd), 'yyyy-MM-dd HH:mm', { locale: zhCN }) }}
                  </p>
                </div>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div class="panel-border rounded-lg p-4">
                <h3 class="text-[10px] font-mono text-console-400 uppercase tracking-wider mb-3">资源信息</h3>
                <div v-if="resource" class="space-y-3">
                  <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-lg bg-console-700/50 flex items-center justify-center border border-console-500/30">
                      <component :is="getResourceTypeIcon(resource.type)" class="w-4 h-4 text-console-300" />
                    </div>
                    <div>
                      <p class="text-sm font-mono font-medium text-console-100">{{ resource.name }}</p>
                      <p class="text-[10px] font-mono text-console-400">{{ RESOURCE_TYPE_LABELS[resource.type] }}</p>
                    </div>
                  </div>
                  <div class="grid grid-cols-2 gap-3 pt-2 border-t border-console-500/20">
                    <div>
                      <p class="text-[10px] font-mono text-console-500">状态</p>
                      <p class="text-xs font-mono text-console-200 mt-0.5">{{ RESOURCE_STATUS_LABELS[resource.status] }}</p>
                    </div>
                    <div>
                      <p class="text-[10px] font-mono text-console-500">所属泊位</p>
                      <p class="text-xs font-mono text-console-200 mt-0.5">
                        {{ resource.berthId ? scheduleStore.getBerthById(resource.berthId)?.name || resource.berthId : '-' }}
                      </p>
                    </div>
                    <div>
                      <p class="text-[10px] font-mono text-console-500">操作班组</p>
                      <p class="text-xs font-mono text-console-200 mt-0.5">{{ resource.operationTeam || '-' }}</p>
                    </div>
                    <div>
                      <p class="text-[10px] font-mono text-console-500">绑定计划数</p>
                      <p class="text-xs font-mono text-console-200 mt-0.5">{{ resource.scheduleIds.length }}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div class="panel-border rounded-lg p-4">
                <h3 class="text-[10px] font-mono text-console-400 uppercase tracking-wider mb-3">涉及计划</h3>
                <div class="space-y-3">
                  <div v-if="schedule" class="panel-border rounded-lg p-3 bg-console-800/30">
                    <div class="flex items-center gap-2 mb-2">
                      <Ship class="w-3.5 h-3.5 text-harbor-cyan" />
                      <span class="text-xs font-mono font-medium text-console-100">{{ ship?.name || schedule.shipId }}</span>
                    </div>
                    <div class="grid grid-cols-2 gap-2 text-[10px] font-mono">
                      <div>
                        <span class="text-console-500">计划ID:</span>
                        <span class="text-console-300 ml-1">{{ schedule.id }}</span>
                      </div>
                      <div>
                        <span class="text-console-500">泊位:</span>
                        <span class="text-console-300 ml-1">{{ scheduleStore.getBerthById(schedule.berthId)?.name }}</span>
                      </div>
                      <div>
                        <span class="text-console-500">ETA:</span>
                        <span class="text-console-300 ml-1">{{ format(new Date(schedule.eta), 'MM/dd HH:mm', { locale: zhCN }) }}</span>
                      </div>
                      <div>
                        <span class="text-console-500">ETD:</span>
                        <span class="text-console-300 ml-1">{{ format(new Date(schedule.etd), 'MM/dd HH:mm', { locale: zhCN }) }}</span>
                      </div>
                    </div>
                  </div>

                  <div v-if="relatedSchedule" class="panel-border rounded-lg p-3 bg-console-800/30">
                    <div class="flex items-center gap-2 mb-2">
                      <Ship class="w-3.5 h-3.5 text-harbor-orange" />
                      <span class="text-xs font-mono font-medium text-console-100">{{ relatedShip?.name || relatedSchedule.shipId }}</span>
                      <span class="px-1.5 py-0.5 rounded bg-harbor-orange/15 text-[9px] font-mono text-harbor-orange border border-harbor-orange/30">关联冲突</span>
                    </div>
                    <div class="grid grid-cols-2 gap-2 text-[10px] font-mono">
                      <div>
                        <span class="text-console-500">计划ID:</span>
                        <span class="text-console-300 ml-1">{{ relatedSchedule.id }}</span>
                      </div>
                      <div>
                        <span class="text-console-500">泊位:</span>
                        <span class="text-console-300 ml-1">{{ scheduleStore.getBerthById(relatedSchedule.berthId)?.name }}</span>
                      </div>
                      <div>
                        <span class="text-console-500">ETA:</span>
                        <span class="text-console-300 ml-1">{{ format(new Date(relatedSchedule.eta), 'MM/dd HH:mm', { locale: zhCN }) }}</span>
                      </div>
                      <div>
                        <span class="text-console-500">ETD:</span>
                        <span class="text-console-300 ml-1">{{ format(new Date(relatedSchedule.etd), 'MM/dd HH:mm', { locale: zhCN }) }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="conflict.resolved" class="panel-border rounded-lg p-4 bg-harbor-green/5 border-harbor-green/20">
              <div class="flex items-start gap-2">
                <CheckCircle class="w-4 h-4 text-harbor-green mt-0.5 flex-shrink-0" />
                <div>
                  <p class="text-xs font-mono font-medium text-harbor-green mb-1">
                    已解决
                  </p>
                  <p class="text-xs font-mono text-console-200">{{ conflict.resolutionNote }}</p>
                  <p class="text-[10px] font-mono text-console-400 mt-2">
                    解决人: {{ conflict.resolvedBy }} · 解决时间: {{ conflict.resolvedAt ? format(new Date(conflict.resolvedAt), 'yyyy-MM-dd HH:mm:ss', { locale: zhCN }) : '-' }}
                  </p>
                </div>
              </div>
            </div>

            <div v-if="!conflict.resolved && authStore.canHandleConflict" class="panel-border rounded-lg p-4">
              <h3 class="text-[10px] font-mono text-console-400 uppercase tracking-wider mb-3">解决冲突</h3>
              <div class="space-y-3">
                <textarea
                  v-model="resolutionNote"
                  rows="3"
                  placeholder="请输入冲突解决说明，例如：调整作业时间、更换资源等..."
                  class="w-full px-3 py-2 text-xs font-mono bg-console-800/80 border border-console-500/40 rounded text-console-100 placeholder:text-console-500 focus:outline-none focus:border-harbor-cyan/50 resize-none"
                />
                <div class="flex items-center justify-end">
                  <button
                    @click="resolveConflict"
                    :disabled="!resolutionNote.trim()"
                    class="flex items-center gap-1.5 px-4 py-2 text-xs font-mono text-console-900 bg-gradient-to-r from-harbor-green to-harbor-green/80 rounded shadow-glow-cyan hover:shadow-glow-blue transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save class="w-3.5 h-3.5" />
                    标记为已解决
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </main>
  </div>
</template>
