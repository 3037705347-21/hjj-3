<script setup lang="ts">
import { ref, computed, watch, reactive } from 'vue';
import type { BerthSchedule, OperationStatus, ScheduleSource, ScheduleConflict, ProgressMode } from '../../types';
import { useScheduleStore } from '../../stores/schedule';
import { useConflictDetection } from '../../composables/useConflictDetection';
import {
  X,
  Save,
  Ship as ShipIcon,
  Anchor,
  Clock,
  Users,
  AlertTriangle,
  AlertCircle,
  FileText,
  BarChart3,
  Tag,
  Timer,
  Zap,
} from 'lucide-vue-next';
import PriorityBadge from '../common/PriorityBadge.vue';
import CargoTypeIcon from '../common/CargoTypeIcon.vue';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const props = defineProps<{
  visible: boolean;
  mode: 'create' | 'edit';
  scheduleId?: string;
  prefill?: Partial<BerthSchedule>;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'saved', schedule: BerthSchedule): void;
}>();

const store = useScheduleStore();
const {
  checkTimeOverlap,
  checkDraftLimit,
  checkLengthLimit,
  checkCargoMatch,
  checkTideWindow,
  checkBerthMaintenance,
  checkBufferTime,
  checkTeamConflict,
  checkDangerousCargoIsolation,
  checkNightOperation,
} = useConflictDetection();

type FormData = {
  shipId: string;
  berthId: string;
  eta: string;
  etd: string;
  status: OperationStatus;
  operationProgress: number;
  progressMode: ProgressMode;
  operationTeam: string;
  remarks: string;
  source: ScheduleSource;
  priorityAdjustReason: string;
  estimatedDuration: number | '';
};

const initialForm: FormData = {
  shipId: '',
  berthId: '',
  eta: '',
  etd: '',
  status: 'anchored',
  operationProgress: 0,
  progressMode: 'percentage',
  operationTeam: '',
  remarks: '',
  source: 'manual',
  priorityAdjustReason: '',
  estimatedDuration: '',
};

const form = reactive<FormData>({ ...initialForm });
const conflicts = ref<ScheduleConflict[]>([]);
const submitting = ref(false);
const errors = ref<Record<string, string>>({});

const title = computed(() => (props.mode === 'create' ? '新增调度计划' : '编辑调度计划'));

const allShips = computed(() => store.ships);
const allBerths = computed(() => store.berths.filter((b) => b.status !== 'maintenance'));

const selectedShip = computed(() => allShips.value.find((s) => s.id === form.shipId));
const selectedBerth = computed(() => allBerths.value.find((b) => b.id === form.berthId));

const statusOptions: OperationStatus[] = [
  'anchored',
  'approaching',
  'berthing',
  'loading',
  'unloading',
  'departing',
  'departed',
];

const statusLabels: Record<OperationStatus, string> = {
  anchored: '锚泊',
  approaching: '进港中',
  berthing: '靠泊中',
  loading: '装货中',
  unloading: '卸货中',
  departing: '离泊中',
  departed: '已离港',
};

const sourceOptions: ScheduleSource[] = ['manual', 'import', 'auto', 'api'];

const sourceLabels: Record<ScheduleSource, string> = {
  manual: '手动录入',
  import: '批量导入',
  auto: '自动生成',
  api: 'API对接',
};

function toLocalInput(date: Date | string): string {
  const d = new Date(date);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function resetForm() {
  Object.assign(form, { ...initialForm });
  conflicts.value = [];
  errors.value = {};
  submitting.value = false;
}

function loadSchedule(id: string) {
  const s = store.schedules.find((x) => x.id === id);
  if (!s) return;
  form.shipId = s.shipId;
  form.berthId = s.berthId;
  form.eta = toLocalInput(s.eta);
  form.etd = toLocalInput(s.etd);
  form.status = s.status;
  form.operationProgress = s.operationProgress;
  form.progressMode = s.progressMode || 'percentage';
  form.operationTeam = s.operationTeam || '';
  form.remarks = s.remarks || '';
  form.source = (s.source as ScheduleSource) || 'manual';
  form.priorityAdjustReason = s.priorityAdjustReason || '';
  form.estimatedDuration = s.estimatedDuration ?? '';
}

watch(
  () => props.visible,
  (v) => {
    if (!v) {
      resetForm();
      return;
    }
    resetForm();
    if (props.mode === 'edit' && props.scheduleId) {
      loadSchedule(props.scheduleId);
    } else if (props.prefill) {
      if (props.prefill.shipId) form.shipId = props.prefill.shipId;
      if (props.prefill.berthId) form.berthId = props.prefill.berthId;
      if (props.prefill.eta) form.eta = toLocalInput(props.prefill.eta);
      if (props.prefill.etd) form.etd = toLocalInput(props.prefill.etd);
      if (props.prefill.status) form.status = props.prefill.status;
      if (props.prefill.progressMode) form.progressMode = props.prefill.progressMode;
      if (props.prefill.operationTeam) form.operationTeam = props.prefill.operationTeam;
      if (props.prefill.remarks) form.remarks = props.prefill.remarks;
      if (props.prefill.source) form.source = props.prefill.source;
      if (props.prefill.priorityAdjustReason) form.priorityAdjustReason = props.prefill.priorityAdjustReason;
      if (props.prefill.estimatedDuration != null) form.estimatedDuration = props.prefill.estimatedDuration;
    }
    if (!form.eta || !form.etd) {
      const now = new Date();
      form.eta = toLocalInput(now);
      const etd = new Date(now.getTime() + 24 * 3600 * 1000);
      form.etd = toLocalInput(etd);
    }
  },
  { immediate: true },
);

function validate(): boolean {
  errors.value = {};
  if (!form.shipId) errors.value.shipId = '请选择船舶';
  if (!form.berthId) errors.value.berthId = '请选择泊位';
  if (!form.eta) errors.value.eta = '请选择ETA';
  if (!form.etd) errors.value.etd = '请选择ETD';
  if (form.eta && form.etd && new Date(form.etd) <= new Date(form.eta)) {
    errors.value.etd = 'ETD必须晚于ETA';
  }
  if (form.operationProgress < 0 || form.operationProgress > 100) {
    errors.value.operationProgress = '进度需在0-100之间';
  }
  return Object.keys(errors.value).length === 0;
}

function runConflictCheck(): ScheduleConflict[] {
  const result: ScheduleConflict[] = [];
  if (!form.shipId || !form.berthId || !form.eta || !form.etd) return result;

  const ship = store.getShipById(form.shipId);
  const berth = store.getBerthById(form.berthId);
  if (!ship || !berth) return result;

  const tempSchedule: BerthSchedule = {
    id: props.mode === 'edit' && props.scheduleId ? props.scheduleId : `tmp-${Date.now()}`,
    shipId: form.shipId,
    berthId: form.berthId,
    eta: new Date(form.eta),
    etd: new Date(form.etd),
    status: form.status,
    operationProgress: form.operationProgress,
    progressMode: form.progressMode,
    operationTeam: form.operationTeam,
    remarks: form.remarks,
  };

  store.schedules.forEach((s) => {
    if (props.mode === 'edit' && s.id === props.scheduleId) return;
    const c = checkTimeOverlap(tempSchedule, s);
    if (c) result.push(c);

    const bufferC = checkBufferTime(tempSchedule, s);
    if (bufferC) result.push(bufferC);

    const teamC = checkTeamConflict(tempSchedule, s);
    if (teamC) result.push(teamC);

    const dangerousC = checkDangerousCargoIsolation(tempSchedule, s, store.ships);
    if (dangerousC) result.push(dangerousC);
  });

  const draftC = checkDraftLimit(tempSchedule, ship, berth);
  if (draftC) result.push(draftC);

  const lengthC = checkLengthLimit(tempSchedule, ship, berth);
  if (lengthC) result.push(lengthC);

  const cargoC = checkCargoMatch(tempSchedule, ship, berth);
  if (cargoC) result.push(cargoC);

  const tideC = checkTideWindow(tempSchedule, ship, berth, store.tides);
  if (tideC) result.push(tideC);

  const maintenanceC = checkBerthMaintenance(tempSchedule, berth);
  if (maintenanceC) result.push(maintenanceC);

  const nightC = checkNightOperation(tempSchedule, ship);
  if (nightC) result.push(nightC);

  return result;
}

const errorConflicts = computed(() => conflicts.value.filter((c) => c.severity === 'error'));
const warningConflicts = computed(() => conflicts.value.filter((c) => c.severity === 'warning'));

const conflictTypeLabels: Record<string, string> = {
  time_overlap: '时间冲突',
  draft_exceed: '吃水超限',
  length_exceed: '船长超限',
  cargo_mismatch: '货种不匹配',
  tide_window: '潮汐窗口',
  berth_maintenance: '泊位维修',
  buffer_time_insufficient: '缓冲不足',
  team_conflict: '班组冲突',
  dangerous_cargo_isolation: '危货隔离',
  night_operation_limit: '夜间限制',
};

async function onSubmit() {
  if (!validate()) return;
  submitting.value = true;

  conflicts.value = runConflictCheck();
  if (errorConflicts.value.length > 0) {
    submitting.value = false;
    return;
  }

  const etaDate = new Date(form.eta);
  const etdDate = new Date(form.etd);

  const payload: Omit<BerthSchedule, 'id'> = {
    shipId: form.shipId,
    berthId: form.berthId,
    eta: etaDate,
    etd: etdDate,
    status: form.status,
    operationProgress: form.operationProgress,
    progressMode: form.progressMode,
    operationTeam: form.operationTeam || undefined,
    remarks: form.remarks || undefined,
    source: form.source,
    priorityAdjustReason: form.priorityAdjustReason || undefined,
    estimatedDuration: form.estimatedDuration === '' ? undefined : Number(form.estimatedDuration),
  };

  let saved: BerthSchedule | null = null;

  if (props.mode === 'create') {
    saved = store.createSchedule(payload);
  } else if (props.mode === 'edit' && props.scheduleId) {
    store.updateSchedule(props.scheduleId, payload as Partial<BerthSchedule>);
    saved = store.schedules.find((s) => s.id === props.scheduleId) || null;
  }

  submitting.value = false;
  if (saved) {
    emit('saved', saved);
    emit('close');
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="visible"
        class="fixed inset-0 z-[100] flex items-center justify-center"
      >
        <div
          class="absolute inset-0 bg-black/60 backdrop-blur-sm"
          @click="emit('close')"
        />
        <div
          class="relative w-full max-w-2xl mx-4 max-h-[90vh] bg-console-900 border border-console-500/40 rounded-xl shadow-2xl overflow-hidden flex flex-col animate-modal-in"
        >
          <div class="flex items-center justify-between px-5 py-3.5 border-b border-console-500/30 bg-console-800/50">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-harbor-cyan to-harbor-orange flex items-center justify-center">
                <Anchor class="w-4 h-4 text-console-900" />
              </div>
              <div>
                <h2 class="font-mono text-base font-bold text-console-100">
                  {{ title }}
                </h2>
                <p class="text-[10px] font-mono text-console-400">
                  {{ mode === 'create' ? '创建新的船舶调度计划' : '修改现有调度计划' }}
                </p>
              </div>
            </div>
            <button
              @click="emit('close')"
              class="w-8 h-8 flex items-center justify-center rounded border border-console-500/40 text-console-300 hover:text-harbor-red hover:border-harbor-red/50 hover:bg-harbor-red/10 transition-all"
            >
              <X class="w-4 h-4" />
            </button>
          </div>

          <div class="flex-1 overflow-y-auto p-5 space-y-5">
            <div v-if="conflicts.length > 0" class="space-y-2">
              <div class="flex items-center gap-2 text-[11px] font-mono text-console-300">
                <AlertTriangle class="w-3.5 h-3.5 text-harbor-red" />
                <span>检测到调度冲突</span>
                <span class="ml-2 flex items-center gap-2">
                  <span class="text-harbor-red">{{ errorConflicts.length }} 个错误</span>
                  <span v-if="warningConflicts.length > 0" class="text-harbor-yellow">
                    {{ warningConflicts.length }} 个警告
                  </span>
                </span>
              </div>
              <div
                v-for="c in conflicts"
                :key="c.id"
                :class="[
                  'flex items-start gap-2 px-3 py-2 rounded border',
                  c.severity === 'error'
                    ? 'bg-harbor-red/10 border-harbor-red/40'
                    : 'bg-harbor-yellow/10 border-harbor-yellow/40',
                ]"
              >
                <AlertCircle
                  :class="[
                    'w-4 h-4 mt-0.5 shrink-0',
                    c.severity === 'error' ? 'text-harbor-red' : 'text-harbor-yellow',
                  ]"
                />
                <div class="min-w-0">
                  <div class="flex items-center gap-2">
                    <span
                      :class="[
                        'text-[10px] font-mono px-1.5 py-0.5 rounded',
                        c.severity === 'error'
                          ? 'bg-harbor-red/20 text-harbor-red'
                          : 'bg-harbor-yellow/20 text-harbor-yellow',
                      ]"
                    >
                      {{ conflictTypeLabels[c.type] || c.type }}
                    </span>
                  </div>
                  <p class="text-xs font-mono text-console-200 mt-1">
                    {{ c.message }}
                  </p>
                  <p
                    v-if="c.suggestedAction"
                    class="text-[11px] font-mono text-harbor-cyan mt-1.5 flex items-center gap-1"
                  >
                    <span class="text-harbor-cyan/70">建议:</span>
                    {{ c.suggestedAction }}
                  </p>
                </div>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="flex items-center gap-1.5 text-[11px] font-mono text-console-300 uppercase tracking-wider mb-1.5">
                  <ShipIcon class="w-3.5 h-3.5 text-harbor-cyan" />
                  船舶 <span class="text-harbor-red">*</span>
                </label>
                <select
                  v-model="form.shipId"
                  :class="[
                    'w-full px-3 py-2 text-xs font-mono bg-console-800/80 border rounded text-console-100 focus:outline-none focus:shadow-glow-cyan transition-all',
                    errors.shipId ? 'border-harbor-red/50 focus:border-harbor-red/70' : 'border-console-500/40 focus:border-harbor-cyan/50',
                  ]"
                >
                  <option value="">-- 选择船舶 --</option>
                  <option v-for="s in allShips" :key="s.id" :value="s.id">
                    {{ s.name }} ({{ s.length }}m / {{ s.draft }}m)
                  </option>
                </select>
                <p v-if="errors.shipId" class="text-[10px] font-mono text-harbor-red mt-1">
                  {{ errors.shipId }}
                </p>
                <div v-if="selectedShip" class="mt-2 flex items-center gap-2 text-[11px] font-mono">
                  <CargoTypeIcon :type="selectedShip.cargoType" show-label :size="12" />
                  <PriorityBadge :priority="selectedShip.priority" size="sm" />
                </div>
              </div>

              <div>
                <label class="flex items-center gap-1.5 text-[11px] font-mono text-console-300 uppercase tracking-wider mb-1.5">
                  <Anchor class="w-3.5 h-3.5 text-harbor-cyan" />
                  泊位 <span class="text-harbor-red">*</span>
                </label>
                <select
                  v-model="form.berthId"
                  :class="[
                    'w-full px-3 py-2 text-xs font-mono bg-console-800/80 border rounded text-console-100 focus:outline-none focus:shadow-glow-cyan transition-all',
                    errors.berthId ? 'border-harbor-red/50 focus:border-harbor-red/70' : 'border-console-500/40 focus:border-harbor-cyan/50',
                  ]"
                >
                  <option value="">-- 选择泊位 --</option>
                  <option v-for="b in allBerths" :key="b.id" :value="b.id">
                    {{ b.name }} ({{ b.length }}m / {{ b.maxDraft }}m)
                  </option>
                </select>
                <p v-if="errors.berthId" class="text-[10px] font-mono text-harbor-red mt-1">
                  {{ errors.berthId }}
                </p>
                <div v-if="selectedBerth" class="mt-2 text-[10px] font-mono text-console-400">
                  支持货种: {{ selectedBerth.allowedCargo.join(', ') }}
                </div>
              </div>

              <div>
                <label class="flex items-center gap-1.5 text-[11px] font-mono text-console-300 uppercase tracking-wider mb-1.5">
                  <Clock class="w-3.5 h-3.5 text-harbor-cyan" />
                  预计到港 (ETA) <span class="text-harbor-red">*</span>
                </label>
                <input
                  v-model="form.eta"
                  type="datetime-local"
                  :class="[
                    'w-full px-3 py-2 text-xs font-mono bg-console-800/80 border rounded text-console-100 focus:outline-none focus:shadow-glow-cyan transition-all',
                    errors.eta ? 'border-harbor-red/50 focus:border-harbor-red/70' : 'border-console-500/40 focus:border-harbor-cyan/50',
                  ]"
                />
                <p v-if="errors.eta" class="text-[10px] font-mono text-harbor-red mt-1">
                  {{ errors.eta }}
                </p>
              </div>

              <div>
                <label class="flex items-center gap-1.5 text-[11px] font-mono text-console-300 uppercase tracking-wider mb-1.5">
                  <Clock class="w-3.5 h-3.5 text-harbor-orange" />
                  预计离港 (ETD) <span class="text-harbor-red">*</span>
                </label>
                <input
                  v-model="form.etd"
                  type="datetime-local"
                  :class="[
                    'w-full px-3 py-2 text-xs font-mono bg-console-800/80 border rounded text-console-100 focus:outline-none focus:shadow-glow-cyan transition-all',
                    errors.etd ? 'border-harbor-red/50 focus:border-harbor-red/70' : 'border-console-500/40 focus:border-harbor-cyan/50',
                  ]"
                />
                <p v-if="errors.etd" class="text-[10px] font-mono text-harbor-red mt-1">
                  {{ errors.etd }}
                </p>
              </div>

              <div>
                <label class="flex items-center gap-1.5 text-[11px] font-mono text-console-300 uppercase tracking-wider mb-1.5">
                  <Tag class="w-3.5 h-3.5 text-harbor-cyan" />
                  作业状态
                </label>
                <div class="flex items-center gap-1.5 flex-wrap">
                  <label
                    v-for="st in statusOptions"
                    :key="st"
                    :class="[
                      'cursor-pointer px-2 py-1 rounded border text-[10px] font-mono transition-all',
                      form.status === st
                        ? 'border-harbor-cyan/50 bg-harbor-cyan/10 text-harbor-cyan shadow-glow-blue'
                        : 'border-console-500/40 bg-console-800/50 text-console-300 hover:border-console-400/60',
                    ]"
                  >
                    <input v-model="form.status" :value="st" type="radio" class="hidden" />
                    {{ statusLabels[st] }}
                  </label>
                </div>
              </div>

              <div>
                <label class="flex items-center gap-1.5 text-[11px] font-mono text-console-300 uppercase tracking-wider mb-1.5">
                  <BarChart3 class="w-3.5 h-3.5 text-harbor-cyan" />
                  作业进度 (%)
                </label>
                <div class="flex items-center gap-2">
                  <input
                    v-model.number="form.operationProgress"
                    type="range"
                    min="0"
                    max="100"
                    class="flex-1 h-1.5 bg-console-600 rounded-full appearance-none cursor-pointer accent-harbor-cyan"
                  />
                  <span class="text-xs font-mono font-bold text-harbor-cyan w-10 text-right tabular-nums">
                    {{ form.operationProgress }}%
                  </span>
                </div>
                <p v-if="errors.operationProgress" class="text-[10px] font-mono text-harbor-red mt-1">
                  {{ errors.operationProgress }}
                </p>
              </div>

              <div>
                <label class="flex items-center gap-1.5 text-[11px] font-mono text-console-300 uppercase tracking-wider mb-1.5">
                  <Users class="w-3.5 h-3.5 text-harbor-cyan" />
                  作业班组
                </label>
                <input
                  v-model="form.operationTeam"
                  type="text"
                  placeholder="例如：A班组"
                  class="w-full px-3 py-2 text-xs font-mono bg-console-800/80 border border-console-500/40 rounded text-console-100 placeholder:text-console-500 focus:outline-none focus:border-harbor-cyan/50 focus:shadow-glow-cyan transition-all"
                />
              </div>

              <div>
                <label class="flex items-center gap-1.5 text-[11px] font-mono text-console-300 uppercase tracking-wider mb-1.5">
                  <Timer class="w-3.5 h-3.5 text-harbor-cyan" />
                  预估作业时长 (小时)
                </label>
                <input
                  v-model.number="form.estimatedDuration"
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="例如：24"
                  class="w-full px-3 py-2 text-xs font-mono bg-console-800/80 border border-console-500/40 rounded text-console-100 placeholder:text-console-500 focus:outline-none focus:border-harbor-cyan/50 focus:shadow-glow-cyan transition-all"
                />
              </div>

              <div>
                <label class="flex items-center gap-1.5 text-[11px] font-mono text-console-300 uppercase tracking-wider mb-1.5">
                  <Zap class="w-3.5 h-3.5 text-harbor-cyan" />
                  计划来源
                </label>
                <select
                  v-model="form.source"
                  class="w-full px-3 py-2 text-xs font-mono bg-console-800/80 border border-console-500/40 rounded text-console-100 focus:outline-none focus:border-harbor-cyan/50 focus:shadow-glow-cyan transition-all"
                >
                  <option v-for="src in sourceOptions" :key="src" :value="src">
                    {{ sourceLabels[src] }}
                  </option>
                </select>
              </div>

              <div>
                <label class="flex items-center gap-1.5 text-[11px] font-mono text-console-300 uppercase tracking-wider mb-1.5">
                  <AlertTriangle class="w-3.5 h-3.5 text-harbor-yellow" />
                  优先调整原因
                </label>
                <input
                  v-model="form.priorityAdjustReason"
                  type="text"
                  placeholder="如需优先调整请说明原因"
                  class="w-full px-3 py-2 text-xs font-mono bg-console-800/80 border border-console-500/40 rounded text-console-100 placeholder:text-console-500 focus:outline-none focus:border-harbor-cyan/50 focus:shadow-glow-cyan transition-all"
                />
              </div>
            </div>

            <div>
              <label class="flex items-center gap-1.5 text-[11px] font-mono text-console-300 uppercase tracking-wider mb-1.5">
                <FileText class="w-3.5 h-3.5 text-harbor-cyan" />
                调度备注
              </label>
              <textarea
                v-model="form.remarks"
                rows="3"
                placeholder="输入调度备注、特殊要求等..."
                class="w-full px-3 py-2 text-xs font-mono bg-console-800/80 border border-console-500/40 rounded text-console-100 placeholder:text-console-500 focus:outline-none focus:border-harbor-cyan/50 focus:shadow-glow-cyan transition-all resize-none"
              />
            </div>
          </div>

          <div class="flex items-center justify-between px-5 py-3.5 border-t border-console-500/30 bg-console-800/30">
            <div class="text-[10px] font-mono text-console-400">
              操作人: {{ store.currentOperator }} · {{ format(new Date(), 'yyyy-MM-dd HH:mm', { locale: zhCN }) }}
            </div>
            <div class="flex items-center gap-2">
              <button
                @click="emit('close')"
                class="px-4 py-2 text-xs font-mono text-console-200 border border-console-500/40 rounded hover:bg-console-700/50 transition-all"
              >
                取消
              </button>
              <button
                @click="onSubmit"
                :disabled="submitting"
                class="flex items-center gap-1.5 px-4 py-2 text-xs font-mono text-console-900 bg-gradient-to-r from-harbor-cyan to-harbor-cyan/80 rounded shadow-glow-cyan hover:shadow-glow-blue transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save class="w-3.5 h-3.5" />
                {{ submitting ? '提交中...' : '保存计划' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
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
