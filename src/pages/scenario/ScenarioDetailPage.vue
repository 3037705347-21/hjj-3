<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useScenarioStore } from '../../stores/scenario';
import { useScheduleStore } from '../../stores/schedule';
import { useAuthStore } from '../../stores/auth';
import { useConflictDetection } from '../../composables/useConflictDetection';
import {
  SCENARIO_STATUS_LABELS,
  USER_ROLE_LABELS,
} from '../../types';
import type { BerthSchedule, ScheduleConflict, ScheduleLog } from '../../types';
import ScenarioComparePanel from '../../components/scenario/ScenarioComparePanel.vue';
import {
  Anchor,
  ArrowLeft,
  Play,
  User,
  Clock,
  Ship,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Settings,
  Bell,
  RefreshCw,
  Plus,
  Trash2,
  Edit3,
  Save,
  X,
  Copy,
  FileText,
  Calendar,
  Layers,
  Activity,
  ChevronDown,
  ChevronUp,
} from 'lucide-vue-next';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const route = useRoute();
const router = useRouter();
const scenarioStore = useScenarioStore();
const scheduleStore = useScheduleStore();
const authStore = useAuthStore();
const { detectAllConflicts } = useConflictDetection();

const scenarioId = computed(() => route.params.id as string);
const scenario = computed(() => scenarioStore.getScenarioById(scenarioId.value));

const currentTime = ref(new Date());
const activeTab = ref<'schedules' | 'conflicts' | 'logs'>('schedules');
const showApplyConfirm = ref(false);
const showEditSchedule = ref(false);
const editingSchedule = ref<BerthSchedule | null>(null);
const isEditing = ref(false);

const statusColorMap: Record<string, string> = {
  anchored: 'bg-harbor-blue/15 text-harbor-blue border-harbor-blue/30',
  approaching: 'bg-harbor-cyan/15 text-harbor-cyan border-harbor-cyan/30',
  berthing: 'bg-harbor-yellow/15 text-harbor-yellow border-harbor-yellow/30',
  loading: 'bg-harbor-green/15 text-harbor-green border-harbor-green/30',
  unloading: 'bg-harbor-green/15 text-harbor-green border-harbor-green/30',
  departing: 'bg-harbor-orange/15 text-harbor-orange border-harbor-orange/30',
  departed: 'bg-console-500/30 text-console-300 border-console-500/30',
};

const statusLabelMap: Record<string, string> = {
  anchored: '锚泊中',
  approaching: '进港中',
  berthing: '靠泊中',
  loading: '装货中',
  unloading: '卸货中',
  departing: '离港中',
  departed: '已离港',
};

onMounted(() => {
  setInterval(() => {
    currentTime.value = new Date();
  }, 1000);
});

const snapshotSchedules = computed(() => {
  if (!scenario.value) return [];
  return [...scenario.value.snapshot.schedules].sort(
    (a, b) => new Date(a.eta).getTime() - new Date(b.eta).getTime(),
  );
});

const snapshotConflicts = computed(() => {
  if (!scenario.value) return [];
  return scenario.value.snapshot.conflicts;
});

const snapshotLogs = computed(() => {
  if (!scenario.value) return [];
  return scenario.value.snapshot.logs;
});

const errorConflicts = computed(() =>
  snapshotConflicts.value.filter((c) => c.severity === 'error'),
);

const warningConflicts = computed(() =>
  snapshotConflicts.value.filter((c) => c.severity === 'warning'),
);

function getShipById(shipId: string) {
  return scenario.value?.snapshot.ships.find((s) => s.id === shipId);
}

function getBerthById(berthId: string) {
  return scenario.value?.snapshot.berths.find((b) => b.id === berthId);
}

function goBack() {
  router.push('/scenarios');
}

function handleApply() {
  showApplyConfirm.value = true;
}

function confirmApply() {
  const result = scenarioStore.applyScenario(scenarioId.value);
  if (result.success) {
    showApplyConfirm.value = false;
  }
}

function getConflictTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    time_overlap: '时间冲突',
    draft_exceed: '吃水超限',
    length_exceed: '船长超限',
    cargo_mismatch: '货种不匹配',
    tide_window: '潮汐窗口',
    berth_maintenance: '泊位维护',
    buffer_time_insufficient: '缓冲不足',
    team_conflict: '班组冲突',
    dangerous_cargo_isolation: '危货隔离',
    night_operation_limit: '夜间限制',
    tag_earliest_time: '最早作业时间',
    tag_priority_berth: '优先靠泊',
    tag_forbidden_berth: '禁止泊位类型',
    tag_missing_remarks: '缺少备注',
    tag_night_restricted: '夜间限制',
  };
  return labels[type] || type;
}

function getLogTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    create: '创建',
    update: '更新',
    delete: '删除',
    status_change: '状态变更',
    conflict: '冲突',
    warning: '告警',
    rollback: '回退',
    handover: '交接',
  };
  return labels[type] || type;
}

function getLogTypeColor(type: string): string {
  const colors: Record<string, string> = {
    create: 'text-harbor-green',
    update: 'text-harbor-blue',
    delete: 'text-harbor-red',
    status_change: 'text-harbor-purple',
    conflict: 'text-harbor-red',
    warning: 'text-harbor-yellow',
    rollback: 'text-harbor-orange',
    handover: 'text-harbor-cyan',
  };
  return colors[type] || 'text-console-400';
}

function getStatusColor(status: string): string {
  return statusColorMap[status] || 'bg-console-500/30 text-console-300';
}

function getStatusLabel(status: string): string {
  return statusLabelMap[status] || status;
}

function editSchedule(schedule: BerthSchedule) {
  editingSchedule.value = JSON.parse(JSON.stringify(schedule));
  isEditing.value = true;
  showEditSchedule.value = true;
}

function saveSchedule() {
  if (!editingSchedule.value) return;

  scenarioStore.updateScenarioSchedule(
    scenarioId.value,
    editingSchedule.value.id,
    {
      berthId: editingSchedule.value.berthId,
      eta: editingSchedule.value.eta,
      etd: editingSchedule.value.etd,
      status: editingSchedule.value.status,
      operationTeam: editingSchedule.value.operationTeam,
      remarks: editingSchedule.value.remarks,
    },
  );

  showEditSchedule.value = false;
  editingSchedule.value = null;
}

function cancelEdit() {
  showEditSchedule.value = false;
  editingSchedule.value = null;
}

function refreshConflicts() {
  scenarioStore.updateScenarioSnapshot(scenarioId.value);
}
</script>

<template>
  <div class="min-h-screen bg-console-900 console-grid-bg" v-if="scenario">
    <header class="sticky top-0 z-40 bg-console-900/90 backdrop-blur-xl border-b border-console-500/30">
      <div class="flex items-center justify-between px-6 py-3">
        <div class="flex items-center gap-4">
          <button
            @click="goBack"
            class="p-2 text-console-300 hover:text-console-100 hover:bg-console-700/50 rounded-lg transition-colors"
          >
            <ArrowLeft class="w-5 h-5" />
          </button>
          <div class="flex items-center gap-2">
            <div class="w-9 h-9 rounded-lg bg-gradient-to-br from-harbor-purple to-harbor-blue flex items-center justify-center">
              <Play class="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 class="font-mono text-lg font-bold text-console-100">
                {{ scenario.name }}
              </h1>
              <div class="flex items-center gap-2">
                <span
                  :class="[
                    'inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-md border',
                    scenario.status === 'draft' ? 'bg-harbor-blue/15 text-harbor-blue border-harbor-blue/30' :
                    scenario.status === 'completed' ? 'bg-harbor-green/15 text-harbor-green border-harbor-green/30' :
                    scenario.status === 'applied' ? 'bg-harbor-purple/15 text-harbor-purple border-harbor-purple/30' :
                    'bg-console-500/30 text-console-300 border-console-500/30'
                  ]"
                >
                  {{ SCENARIO_STATUS_LABELS[scenario.status] }}
                </span>
                <span class="text-xs text-console-500">
                  {{ scenario.id }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-4">
          <div class="text-right">
            <div class="text-sm font-mono text-console-200">
              {{ format(currentTime, 'yyyy-MM-dd HH:mm:ss', { locale: zhCN }) }}
            </div>
            <div class="text-xs text-console-400">
              {{ format(currentTime, 'EEEE', { locale: zhCN }) }}
            </div>
          </div>

          <div class="h-8 w-px bg-console-500/50" />

          <button
            @click="refreshConflicts"
            class="p-2 text-console-300 hover:text-console-100 hover:bg-console-700/50 rounded-lg transition-colors"
            title="刷新冲突检测"
          >
            <RefreshCw class="w-5 h-5" />
          </button>

          <button
            v-if="scenario.status !== 'applied' && scenario.status !== 'cancelled'"
            @click="handleApply"
            class="h-9 px-4 bg-gradient-to-r from-harbor-green to-harbor-cyan text-console-900 text-sm font-medium rounded-lg hover:shadow-glow-cyan transition-all flex items-center gap-2"
          >
            <CheckCircle class="w-4 h-4" />
            应用到正式计划
          </button>

          <div class="flex items-center gap-2 pl-2">
            <div class="w-8 h-8 rounded-full bg-gradient-to-br from-harbor-cyan to-harbor-green flex items-center justify-center">
              <User class="w-4 h-4 text-console-900" />
            </div>
            <div>
              <div class="text-sm font-medium text-console-100">{{ authStore.currentUser?.displayName || '张伟' }}</div>
              <div class="text-xs text-console-400">{{ authStore.currentUser ? USER_ROLE_LABELS[authStore.currentUser.role] : '调度员' }}</div>
            </div>
          </div>
        </div>
      </div>
    </header>

    <main class="p-6">
      <div class="max-w-7xl mx-auto">
        <div class="grid grid-cols-4 gap-6">
          <div class="col-span-3 space-y-6">
            <div class="bg-console-800/50 rounded-xl border border-console-500/30 p-4">
              <div class="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <div class="text-console-400 text-xs mb-1">创建人</div>
                  <div class="flex items-center gap-1.5 text-console-200">
                    <User class="w-3.5 h-3.5 text-console-400" />
                    {{ scenario.creator }}
                  </div>
                </div>
                <div>
                  <div class="text-console-400 text-xs mb-1">基准时间</div>
                  <div class="flex items-center gap-1.5 text-console-200">
                    <Clock class="w-3.5 h-3.5 text-console-400" />
                    {{ format(new Date(scenario.baseTime), 'yyyy-MM-dd HH:mm', { locale: zhCN }) }}
                  </div>
                </div>
                <div>
                  <div class="text-console-400 text-xs mb-1">创建时间</div>
                  <div class="flex items-center gap-1.5 text-console-200">
                    <Calendar class="w-3.5 h-3.5 text-console-400" />
                    {{ format(new Date(scenario.createdAt), 'yyyy-MM-dd HH:mm', { locale: zhCN }) }}
                  </div>
                </div>
                <div>
                  <div class="text-console-400 text-xs mb-1">涉及船舶/泊位</div>
                  <div class="flex items-center gap-1.5 text-console-200">
                    <Ship class="w-3.5 h-3.5 text-console-400" />
                    {{ scenario.involvedShipIds.length }} 艘 / {{ scenario.involvedBerthIds.length }} 个
                  </div>
                </div>
              </div>
              <div v-if="scenario.description" class="mt-3 pt-3 border-t border-console-500/20">
                <div class="text-console-400 text-xs mb-1">推演说明</div>
                <div class="text-sm text-console-300">{{ scenario.description }}</div>
              </div>
              <div v-if="scenario.sourceScenarioName" class="mt-3 pt-3 border-t border-console-500/20">
                <div class="text-console-400 text-xs mb-1">复制来源</div>
                <div class="flex items-center gap-1.5 text-sm text-harbor-purple">
                  <Copy class="w-3.5 h-3.5" />
                  {{ scenario.sourceScenarioName }}
                </div>
              </div>
            </div>

            <div class="bg-console-800/50 rounded-xl border border-console-500/30 overflow-hidden">
              <div class="flex items-center border-b border-console-500/30">
                <button
                  @click="activeTab = 'schedules'"
                  :class="[
                    'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                    activeTab === 'schedules'
                      ? 'text-harbor-cyan border-harbor-cyan'
                      : 'text-console-400 border-transparent hover:text-console-200',
                  ]"
                >
                  <Layers class="w-4 h-4" />
                  调度计划
                  <span class="text-xs">({{ snapshotSchedules.length }})</span>
                </button>
                <button
                  @click="activeTab = 'conflicts'"
                  :class="[
                    'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                    activeTab === 'conflicts'
                      ? 'text-harbor-red border-harbor-red'
                      : 'text-console-400 border-transparent hover:text-console-200',
                  ]"
                >
                  <AlertTriangle class="w-4 h-4" />
                  冲突检测
                  <span v-if="errorConflicts.length > 0" class="text-xs text-harbor-red">
                    {{ errorConflicts.length }}
                  </span>
                </button>
                <button
                  @click="activeTab = 'logs'"
                  :class="[
                    'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                    activeTab === 'logs'
                      ? 'text-harbor-purple border-harbor-purple'
                      : 'text-console-400 border-transparent hover:text-console-200',
                  ]"
                >
                  <Activity class="w-4 h-4" />
                  推演日志
                </button>
              </div>

              <div class="p-4 max-h-[500px] overflow-y-auto">
                <div v-if="activeTab === 'schedules'">
                  <div class="space-y-2">
                    <div
                      v-for="schedule in snapshotSchedules"
                      :key="schedule.id"
                      class="p-3 bg-console-900/50 rounded-lg border border-console-500/20 hover:border-console-500/40 transition-colors"
                    >
                      <div class="flex items-start justify-between">
                        <div class="flex items-center gap-3">
                          <div class="w-10 h-10 rounded-lg bg-harbor-blue/20 flex items-center justify-center">
                            <Ship class="w-5 h-5 text-harbor-blue" />
                          </div>
                          <div>
                            <div class="flex items-center gap-2">
                              <span class="font-medium text-console-100">
                                {{ getShipById(schedule.shipId)?.name || schedule.shipId }}
                              </span>
                              <span :class="['text-xs px-1.5 py-0.5 rounded border', getStatusColor(schedule.status)]">
                                {{ getStatusLabel(schedule.status) }}
                              </span>
                            </div>
                            <div class="text-xs text-console-400 mt-0.5">
                              泊位: {{ getBerthById(schedule.berthId)?.name || schedule.berthId }}
                            </div>
                          </div>
                        </div>
                        <button
                          v-if="scenario.status === 'draft'"
                          @click="editSchedule(schedule)"
                          class="p-1.5 text-console-400 hover:text-harbor-cyan hover:bg-harbor-cyan/10 rounded-md transition-colors"
                          title="编辑"
                        >
                          <Edit3 class="w-4 h-4" />
                        </button>
                      </div>
                      <div class="mt-2 grid grid-cols-3 gap-3 text-xs">
                        <div>
                          <span class="text-console-500">ETA: </span>
                          <span class="text-console-300">
                            {{ format(new Date(schedule.eta), 'MM-dd HH:mm', { locale: zhCN }) }}
                          </span>
                        </div>
                        <div>
                          <span class="text-console-500">ETD: </span>
                          <span class="text-console-300">
                            {{ format(new Date(schedule.etd), 'MM-dd HH:mm', { locale: zhCN }) }}
                          </span>
                        </div>
                        <div>
                          <span class="text-console-500">作业进度: </span>
                          <span class="text-console-300">{{ schedule.operationProgress }}%</span>
                        </div>
                      </div>
                      <div v-if="schedule.remarks" class="mt-2 text-xs text-console-400">
                        备注: {{ schedule.remarks }}
                      </div>
                    </div>
                  </div>
                </div>

                <div v-if="activeTab === 'conflicts'">
                  <div v-if="snapshotConflicts.length === 0" class="py-12 text-center">
                    <CheckCircle class="w-12 h-12 text-harbor-green mx-auto mb-3" />
                    <div class="text-sm text-console-300">未检测到冲突</div>
                    <div class="text-xs text-console-500 mt-1">所有调度计划均符合约束条件</div>
                  </div>
                  <div v-else class="space-y-3">
                    <div
                      v-for="conflict in snapshotConflicts"
                      :key="conflict.id"
                      :class="[
                        'p-3 rounded-lg border',
                        conflict.severity === 'error'
                          ? 'bg-harbor-red/10 border-harbor-red/30'
                          : 'bg-harbor-yellow/10 border-harbor-yellow/30',
                      ]"
                    >
                      <div class="flex items-start gap-3">
                        <AlertTriangle
                          :class="[
                            'w-5 h-5 flex-shrink-0 mt-0.5',
                            conflict.severity === 'error' ? 'text-harbor-red' : 'text-harbor-yellow',
                          ]"
                        />
                        <div class="flex-1 min-w-0">
                          <div class="flex items-center gap-2">
                            <span
                              :class="[
                                'text-xs px-1.5 py-0.5 rounded',
                                conflict.severity === 'error'
                                  ? 'bg-harbor-red/20 text-harbor-red'
                                  : 'bg-harbor-yellow/20 text-harbor-yellow',
                              ]"
                            >
                              {{ getConflictTypeLabel(conflict.type) }}
                            </span>
                            <span class="text-xs text-console-400">
                              {{ getShipById(
                                scenario.snapshot.schedules.find((s) => s.id === conflict.scheduleId)
                                  ?.shipId || '',
                              )?.name || conflict.scheduleId }}
                            </span>
                          </div>
                          <p class="text-sm text-console-200 mt-1">{{ conflict.message }}</p>
                          <p v-if="conflict.suggestedAction" class="text-xs text-console-400 mt-1">
                            建议: {{ conflict.suggestedAction }}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div v-if="activeTab === 'logs'">
                  <div class="space-y-2">
                    <div
                      v-for="log in snapshotLogs.slice(0, 50)"
                      :key="log.id"
                      class="flex items-start gap-3 py-2 border-b border-console-500/10 last:border-0"
                    >
                      <div
                        :class="[
                          'w-2 h-2 rounded-full mt-1.5 flex-shrink-0',
                          log.type === 'create'
                            ? 'bg-harbor-green'
                            : log.type === 'update'
                            ? 'bg-harbor-blue'
                            : log.type === 'delete'
                            ? 'bg-harbor-red'
                            : log.type === 'status_change'
                            ? 'bg-harbor-purple'
                            : log.type === 'conflict'
                            ? 'bg-harbor-red'
                            : log.type === 'warning'
                            ? 'bg-harbor-yellow'
                            : 'bg-console-500',
                        ]"
                      />
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2">
                          <span :class="['text-xs font-medium', getLogTypeColor(log.type)]">
                            {{ getLogTypeLabel(log.type) }}
                          </span>
                          <span class="text-xs text-console-500">
                            {{ format(new Date(log.timestamp), 'HH:mm:ss', { locale: zhCN }) }}
                          </span>
                          <span class="text-xs text-console-500">{{ log.operator }}</span>
                        </div>
                        <p class="text-sm text-console-300 mt-0.5">{{ log.description }}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="space-y-6">
            <ScenarioComparePanel :scenario-id="scenarioId" />

            <div class="bg-console-800/50 rounded-xl border border-console-500/30 overflow-hidden">
              <div class="px-4 py-3 border-b border-console-500/30">
                <div class="flex items-center gap-2">
                  <FileText class="w-5 h-5 text-harbor-orange" />
                  <h3 class="text-sm font-semibold text-console-100">推演结果摘要</h3>
                </div>
              </div>
              <div class="p-4">
                <div v-if="scenario.resultSummary" class="space-y-2 text-sm">
                  <div class="flex justify-between">
                    <span class="text-console-400">总计划数</span>
                    <span class="text-console-200">{{ scenario.resultSummary.totalSchedules }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-console-400">冲突数量</span>
                    <span :class="scenario.resultSummary.conflictCount > 0 ? 'text-harbor-red' : 'text-harbor-green'">
                      {{ scenario.resultSummary.conflictCount }}
                    </span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-console-400">告警数量</span>
                    <span :class="scenario.resultSummary.warningCount > 0 ? 'text-harbor-yellow' : 'text-harbor-green'">
                      {{ scenario.resultSummary.warningCount }}
                    </span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-console-400">调整计划数</span>
                    <span class="text-harbor-blue">{{ scenario.resultSummary.changedScheduleCount }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-console-400">泊位利用率</span>
                    <span class="text-console-200">{{ scenario.resultSummary.berthUtilization }}%</span>
                  </div>
                </div>
                <div v-else class="text-center py-4 text-console-400 text-sm">
                  暂无结果数据
                </div>
              </div>
            </div>

            <div class="bg-console-800/50 rounded-xl border border-console-500/30 overflow-hidden">
              <div class="px-4 py-3 border-b border-console-500/30">
                <div class="flex items-center gap-2">
                  <AlertTriangle class="w-5 h-5 text-harbor-red" />
                  <h3 class="text-sm font-semibold text-console-100">冲突概览</h3>
                </div>
              </div>
              <div class="p-4">
                <div class="grid grid-cols-2 gap-3">
                  <div class="text-center p-3 bg-harbor-red/10 rounded-lg border border-harbor-red/30">
                    <div class="text-xl font-bold text-harbor-red">{{ errorConflicts.length }}</div>
                    <div class="text-xs text-console-400 mt-0.5">严重冲突</div>
                  </div>
                  <div class="text-center p-3 bg-harbor-yellow/10 rounded-lg border border-harbor-yellow/30">
                    <div class="text-xl font-bold text-harbor-yellow">{{ warningConflicts.length }}</div>
                    <div class="text-xs text-console-400 mt-0.5">警告</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <Teleport to="body">
      <div
        v-if="showApplyConfirm"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div
          class="absolute inset-0 bg-black/60 backdrop-blur-sm"
          @click="showApplyConfirm = false"
        />
        <div class="relative w-full max-w-md bg-console-800 rounded-xl border border-console-500/40 shadow-2xl overflow-hidden">
          <div class="p-5">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-10 h-10 rounded-full bg-harbor-green/20 flex items-center justify-center">
                <CheckCircle class="w-5 h-5 text-harbor-green" />
              </div>
              <div>
                <h3 class="text-base font-semibold text-console-100">确认应用到正式计划？</h3>
                <p class="text-sm text-console-400 mt-0.5">此操作将覆盖当前正式计划数据</p>
              </div>
            </div>
            <div class="p-3 bg-console-900/50 rounded-lg border border-console-500/30">
              <p class="text-sm text-console-300">
                应用推演场景后，推演中的所有调度计划、船舶、泊位调整将同步到正式计划，并生成完整的操作日志。
              </p>
            </div>
          </div>
          <div class="flex items-center justify-end gap-3 px-5 py-4 border-t border-console-500/30 bg-console-900/30">
            <button
              @click="showApplyConfirm = false"
              class="h-9 px-4 text-sm text-console-300 hover:text-console-100 bg-console-700/50 hover:bg-console-700 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              @click="confirmApply"
              class="h-9 px-5 text-sm font-medium text-console-900 bg-gradient-to-r from-harbor-green to-harbor-cyan rounded-lg hover:shadow-glow-cyan transition-all flex items-center gap-2"
            >
              <CheckCircle class="w-4 h-4" />
              确认应用
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div
        v-if="showEditSchedule"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div
          class="absolute inset-0 bg-black/60 backdrop-blur-sm"
          @click="cancelEdit"
        />
        <div class="relative w-full max-w-lg bg-console-800 rounded-xl border border-console-500/40 shadow-2xl overflow-hidden">
          <div class="flex items-center justify-between px-5 py-4 border-b border-console-500/30">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg bg-harbor-blue/20 flex items-center justify-center">
                <Edit3 class="w-4 h-4 text-harbor-blue" />
              </div>
              <h3 class="text-base font-semibold text-console-100">编辑调度计划</h3>
            </div>
            <button
              @click="cancelEdit"
              class="p-1.5 text-console-400 hover:text-console-100 hover:bg-console-700 rounded-md transition-colors"
            >
              <X class="w-5 h-5" />
            </button>
          </div>

          <div v-if="editingSchedule" class="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-console-200 mb-1.5">船舶</label>
                <div class="h-9 px-3 bg-console-900/50 border border-console-500/30 rounded-lg text-sm text-console-200 flex items-center">
                  {{ getShipById(editingSchedule.shipId)?.name || editingSchedule.shipId }}
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-console-200 mb-1.5">泊位</label>
                <select
                  v-model="editingSchedule.berthId"
                  class="w-full h-9 px-3 bg-console-900/80 border border-console-500/40 rounded-lg text-sm text-console-100 focus:outline-none focus:border-harbor-cyan/50"
                >
                  <option
                    v-for="berth in scenario.snapshot.berths"
                    :key="berth.id"
                    :value="berth.id"
                  >
                    {{ berth.name }}
                  </option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-console-200 mb-1.5">ETA 到港时间</label>
                <input
                  v-model="editingSchedule.eta"
                  type="datetime-local"
                  class="w-full h-9 px-3 bg-console-900/80 border border-console-500/40 rounded-lg text-sm text-console-100 focus:outline-none focus:border-harbor-cyan/50"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-console-200 mb-1.5">ETD 离港时间</label>
                <input
                  v-model="editingSchedule.etd"
                  type="datetime-local"
                  class="w-full h-9 px-3 bg-console-900/80 border border-console-500/40 rounded-lg text-sm text-console-100 focus:outline-none focus:border-harbor-cyan/50"
                />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-console-200 mb-1.5">状态</label>
                <select
                  v-model="editingSchedule.status"
                  class="w-full h-9 px-3 bg-console-900/80 border border-console-500/40 rounded-lg text-sm text-console-100 focus:outline-none focus:border-harbor-cyan/50"
                >
                  <option value="anchored">锚泊中</option>
                  <option value="approaching">进港中</option>
                  <option value="berthing">靠泊中</option>
                  <option value="loading">装货中</option>
                  <option value="unloading">卸货中</option>
                  <option value="departing">离港中</option>
                  <option value="departed">已离港</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-console-200 mb-1.5">作业班组</label>
                <input
                  v-model="editingSchedule.operationTeam"
                  type="text"
                  placeholder="作业班组"
                  class="w-full h-9 px-3 bg-console-900/80 border border-console-500/40 rounded-lg text-sm text-console-100 placeholder-console-400 focus:outline-none focus:border-harbor-cyan/50"
                />
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-console-200 mb-1.5">备注</label>
              <textarea
                v-model="editingSchedule.remarks"
                rows="2"
                placeholder="添加备注信息..."
                class="w-full px-3 py-2 bg-console-900/80 border border-console-500/40 rounded-lg text-sm text-console-100 placeholder-console-400 focus:outline-none focus:border-harbor-cyan/50 resize-none"
              />
            </div>
          </div>

          <div class="flex items-center justify-end gap-3 px-5 py-4 border-t border-console-500/30 bg-console-900/30">
            <button
              @click="cancelEdit"
              class="h-9 px-4 text-sm text-console-300 hover:text-console-100 bg-console-700/50 hover:bg-console-700 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              @click="saveSchedule"
              class="h-9 px-5 text-sm font-medium text-white bg-gradient-to-r from-harbor-purple to-harbor-blue rounded-lg hover:shadow-glow-cyan transition-all flex items-center gap-2"
            >
              <Save class="w-4 h-4" />
              保存修改
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
