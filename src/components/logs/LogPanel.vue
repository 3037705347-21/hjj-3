<script setup lang="ts">
import { useScheduleStore } from '../../stores/schedule';
import { useScheduleLogger } from '../../composables/useScheduleLogger';
import type { LogType, ScheduleLog } from '../../types';
import { computed, ref } from 'vue';
import {
  Clock,
  PlusCircle,
  Pencil,
  Trash2,
  AlertTriangle,
  Activity,
  RotateCcw,
  AlertCircle,
  User,
  Search,
  Filter,
  Download,
  RotateCcw as ResetIcon,
  ChevronDown,
  Ship,
  Anchor,
  Calendar,
  Eye,
  Undo2,
  XCircle,
  CheckCircle2,
  AlertCircle as AlertCircleIcon,
  Handshake,
} from 'lucide-vue-next';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import LogDetailModal from './LogDetailModal.vue';

const props = withDefaults(
  defineProps<{
    compact?: boolean;
    limit?: number;
  }>(),
  {
    compact: false,
    limit: 50,
  },
);

const store = useScheduleStore();
useScheduleLogger();

const typeFilter = ref<LogType | 'all'>('all');
const searchQuery = ref('');
const operatorFilter = ref<string | 'all'>('all');
const scheduleIdFilter = ref<string | 'all'>('all');
const shipIdFilter = ref<string | 'all'>('all');
const berthIdFilter = ref<string | 'all'>('all');
const timeStart = ref<string | null>(null);
const timeEnd = ref<string | null>(null);
const showAdvancedFilter = ref(false);
const selectedLog = ref<ScheduleLog | null>(null);
const showDetailModal = ref(false);
const showRollbackConfirm = ref(false);
const rollbackTargetLog = ref<ScheduleLog | null>(null);
const rollbackResult = ref<{ success: boolean; message: string } | null>(null);

const logTypeMeta: Record<LogType, { label: string; icon: typeof Clock; color: string; bgClass: string }> = {
  create: { label: '创建', icon: PlusCircle, color: 'text-harbor-green', bgClass: 'bg-harbor-green/15 border-harbor-green/30' },
  update: { label: '更新', icon: Pencil, color: 'text-harbor-cyan', bgClass: 'bg-harbor-cyan/15 border-harbor-cyan/30' },
  delete: { label: '删除', icon: Trash2, color: 'text-harbor-red', bgClass: 'bg-harbor-red/15 border-harbor-red/30' },
  status_change: { label: '状态变更', icon: RotateCcw, color: 'text-harbor-purple', bgClass: 'bg-harbor-purple/15 border-harbor-purple/30' },
  conflict: { label: '冲突', icon: AlertTriangle, color: 'text-harbor-red', bgClass: 'bg-harbor-red/15 border-harbor-red/30' },
  warning: { label: '警告', icon: AlertCircle, color: 'text-harbor-yellow', bgClass: 'bg-harbor-yellow/15 border-harbor-yellow/30' },
  rollback: { label: '回退', icon: ResetIcon, color: 'text-harbor-orange', bgClass: 'bg-harbor-orange/15 border-harbor-orange/30' },
  handover: { label: '交接', icon: Handshake, color: 'text-harbor-blue', bgClass: 'bg-harbor-blue/15 border-harbor-blue/30' },
};

const allOperators = computed(() => {
  const set = new Set<string>();
  store.logs.forEach((l) => set.add(l.operator));
  return Array.from(set);
});

const allScheduleIds = computed(() => {
  const set = new Set<string>();
  store.logs.forEach((l) => l.scheduleId && set.add(l.scheduleId));
  return Array.from(set).sort();
});

const allShipIds = computed(() => {
  const set = new Set<string>();
  store.logs.forEach((l) => l.shipId && set.add(l.shipId));
  return Array.from(set).sort();
});

const allBerthIds = computed(() => {
  const set = new Set<string>();
  store.logs.forEach((l) => l.berthId && set.add(l.berthId));
  return Array.from(set).sort();
});

function getBerthName(berthId: string): string {
  const berth = store.getBerthById(berthId);
  return berth?.name || berthId;
}

function getShipName(shipId: string): string {
  const ship = store.getShipById(shipId);
  return ship?.name || shipId;
}

const activeFilterCount = computed(() => {
  let count = 0;
  if (typeFilter.value !== 'all') count++;
  if (searchQuery.value) count++;
  if (operatorFilter.value !== 'all') count++;
  if (scheduleIdFilter.value !== 'all') count++;
  if (shipIdFilter.value !== 'all') count++;
  if (berthIdFilter.value !== 'all') count++;
  if (timeStart.value) count++;
  if (timeEnd.value) count++;
  return count;
});

const displayedLogs = computed<ScheduleLog[]>(() => {
  let result = [...store.logs];

  if (typeFilter.value !== 'all') {
    result = result.filter((l) => l.type === typeFilter.value);
  }

  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    result = result.filter(
      (l) =>
        l.description.toLowerCase().includes(q) ||
        l.operator.toLowerCase().includes(q) ||
        (l.scheduleId && l.scheduleId.toLowerCase().includes(q)) ||
        (l.shipId && l.shipId.toLowerCase().includes(q)) ||
        (l.berthId && l.berthId.toLowerCase().includes(q)),
    );
  }

  if (operatorFilter.value !== 'all') {
    result = result.filter((l) => l.operator === operatorFilter.value);
  }

  if (scheduleIdFilter.value !== 'all') {
    result = result.filter((l) => l.scheduleId === scheduleIdFilter.value);
  }

  if (shipIdFilter.value !== 'all') {
    result = result.filter((l) => l.shipId === shipIdFilter.value);
  }

  if (berthIdFilter.value !== 'all') {
    result = result.filter((l) => l.berthId === berthIdFilter.value);
  }

  if (timeStart.value) {
    const start = new Date(timeStart.value).getTime();
    result = result.filter((l) => new Date(l.timestamp).getTime() >= start);
  }
  if (timeEnd.value) {
    const end = new Date(timeEnd.value).getTime();
    result = result.filter((l) => new Date(l.timestamp).getTime() <= end);
  }

  if (props.limit && props.limit > 0) {
    result = result.slice(0, props.limit);
  }

  return result;
});

function formatTimestamp(ts: Date) {
  return format(new Date(ts), 'MM-dd HH:mm:ss', { locale: zhCN });
}

function selectSchedule(id: string | undefined) {
  if (id) {
    store.setSelectedSchedule(id);
  }
}

function openLogDetail(log: ScheduleLog) {
  selectedLog.value = log;
  showDetailModal.value = true;
}

function closeDetailModal() {
  showDetailModal.value = false;
  selectedLog.value = null;
}

function isRollbackable(log: ScheduleLog): boolean {
  if (log.type !== 'update' && log.type !== 'status_change') return false;
  if (!log.before || !log.after) return false;
  if (!log.scheduleId) return false;
  return store.canRollbackLog(log.id).canRollback;
}

function requestRollback(log: ScheduleLog) {
  rollbackTargetLog.value = log;
  rollbackResult.value = null;
  showRollbackConfirm.value = true;
}

function cancelRollback() {
  showRollbackConfirm.value = false;
  rollbackTargetLog.value = null;
  rollbackResult.value = null;
}

function executeRollback() {
  if (!rollbackTargetLog.value) return;
  const result = store.rollbackSchedule(rollbackTargetLog.value.id);
  if (result.success) {
    rollbackResult.value = { success: true, message: '回退成功，已恢复变更前的字段值' };
  } else {
    rollbackResult.value = { success: false, message: result.reason || '回退失败' };
  }
}

function resetFilters() {
  typeFilter.value = 'all';
  searchQuery.value = '';
  operatorFilter.value = 'all';
  scheduleIdFilter.value = 'all';
  shipIdFilter.value = 'all';
  berthIdFilter.value = 'all';
  timeStart.value = null;
  timeEnd.value = null;
}

function exportLogs() {
  const rows = displayedLogs.value.map((l) => ({
    日志ID: l.id,
    时间: format(new Date(l.timestamp), 'yyyy-MM-dd HH:mm:ss', { locale: zhCN }),
    类型: logTypeMeta[l.type]?.label || l.type,
    操作人: l.operator,
    描述: l.description,
    计划编号: l.scheduleId || '',
    船舶: l.shipId ? getShipName(l.shipId) : '',
    泊位: l.berthId ? getBerthName(l.berthId) : '',
  }));
  if (rows.length === 0) return;
  const csvContent = [
    Object.keys(rows[0]).join(','),
    ...rows.map((row) =>
      Object.values(row)
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(','),
    ),
  ].join('\n');
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `调度日志_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
</script>

<template>
  <div class="panel-border rounded-lg overflow-hidden h-full flex flex-col">
    <div class="flex items-center gap-2 px-4 py-3 border-b border-console-500/30">
      <Activity class="w-4 h-4 text-harbor-cyan" />
      <h3 class="font-mono text-sm font-semibold text-console-100">
        调度操作日志
      </h3>
      <span
        v-if="activeFilterCount > 0"
        class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-harbor-cyan/20 text-harbor-cyan"
      >
        {{ activeFilterCount }} 个筛选
      </span>
      <span class="ml-auto text-[10px] font-mono text-console-400">
        共 {{ displayedLogs.length }} 条
      </span>
      <div v-if="!compact" class="flex items-center gap-1.5 ml-2">
        <button
          v-if="activeFilterCount > 0"
          @click="resetFilters"
          class="flex items-center gap-1 px-2 py-1 text-[11px] font-mono text-console-300 border border-console-500/40 rounded hover:text-harbor-cyan hover:border-harbor-cyan/50 transition-all"
        >
          <ResetIcon class="w-3 h-3" />
          重置
        </button>
        <button
          @click="exportLogs"
          class="flex items-center gap-1 px-2 py-1 text-[11px] font-mono text-console-300 border border-console-500/40 rounded hover:text-harbor-cyan hover:border-harbor-cyan/50 transition-all"
        >
          <Download class="w-3 h-3" />
          导出
        </button>
        <button
          @click="showAdvancedFilter = !showAdvancedFilter"
          :class="[
            'flex items-center gap-1 px-2 py-1 text-[11px] font-mono border rounded transition-all',
            showAdvancedFilter || activeFilterCount > 2
              ? 'text-harbor-cyan border-harbor-cyan/50 bg-harbor-cyan/10'
              : 'text-console-300 border-console-500/40 hover:text-harbor-cyan hover:border-harbor-cyan/50',
          ]"
        >
          <Filter class="w-3 h-3" />
          高级
          <ChevronDown class="w-3 h-3" />
        </button>
      </div>
    </div>

    <div v-if="!compact" class="px-4 py-2 border-b border-console-500/20 space-y-2">
      <div class="flex items-center gap-2">
        <div class="relative flex-1">
          <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-console-400" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索日志描述/操作人/计划ID/船舶ID..."
            class="w-full pl-8 pr-3 py-1.5 text-xs font-mono bg-console-800/80 border border-console-500/40 rounded text-console-100 placeholder:text-console-400 focus:outline-none focus:border-harbor-cyan/50"
          />
        </div>
        <div class="flex items-center gap-1.5">
          <Filter class="w-3.5 h-3.5 text-console-400" />
          <select
            v-model="typeFilter"
            class="px-2 py-1.5 text-xs font-mono bg-console-800/80 border border-console-500/40 rounded text-console-100 focus:outline-none focus:border-harbor-cyan/50"
          >
            <option value="all">全部类型</option>
            <option value="create">创建</option>
            <option value="update">更新</option>
            <option value="delete">删除</option>
            <option value="status_change">状态变更</option>
            <option value="conflict">冲突</option>
            <option value="warning">警告</option>
            <option value="rollback">回退</option>
            <option value="handover">交接记录</option>
          </select>
        </div>
      </div>

      <div v-if="showAdvancedFilter" class="pt-2 border-t border-console-500/15 grid grid-cols-2 md:grid-cols-3 gap-2">
        <div>
          <label class="text-[10px] font-mono text-console-400 mb-1 block">操作人</label>
          <select
            v-model="operatorFilter"
            class="w-full px-2 py-1.5 text-xs font-mono bg-console-800/80 border border-console-500/40 rounded text-console-100 focus:outline-none focus:border-harbor-cyan/50"
          >
            <option value="all">全部</option>
            <option v-for="op in allOperators" :key="op" :value="op">
              {{ op }}
            </option>
          </select>
        </div>
        <div>
          <label class="text-[10px] font-mono text-console-400 mb-1 block">计划编号</label>
          <select
            v-model="scheduleIdFilter"
            class="w-full px-2 py-1.5 text-xs font-mono bg-console-800/80 border border-console-500/40 rounded text-console-100 focus:outline-none focus:border-harbor-cyan/50"
          >
            <option value="all">全部</option>
            <option v-for="id in allScheduleIds" :key="id" :value="id">
              {{ id }}
            </option>
          </select>
        </div>
        <div>
          <label class="text-[10px] font-mono text-console-400 mb-1 block">船舶编号</label>
          <select
            v-model="shipIdFilter"
            class="w-full px-2 py-1.5 text-xs font-mono bg-console-800/80 border border-console-500/40 rounded text-console-100 focus:outline-none focus:border-harbor-cyan/50"
          >
            <option value="all">全部</option>
            <option v-for="id in allShipIds" :key="id" :value="id">
              {{ getShipName(id) }}
            </option>
          </select>
        </div>
        <div>
          <label class="text-[10px] font-mono text-console-400 mb-1 block">泊位</label>
          <select
            v-model="berthIdFilter"
            class="w-full px-2 py-1.5 text-xs font-mono bg-console-800/80 border border-console-500/40 rounded text-console-100 focus:outline-none focus:border-harbor-cyan/50"
          >
            <option value="all">全部</option>
            <option v-for="id in allBerthIds" :key="id" :value="id">
              {{ getBerthName(id) }}
            </option>
          </select>
        </div>
        <div>
          <label class="text-[10px] font-mono text-console-400 mb-1 block">起始时间</label>
          <input
            v-model="timeStart"
            type="datetime-local"
            class="w-full px-2 py-1.5 text-xs font-mono bg-console-800/80 border border-console-500/40 rounded text-console-100 focus:outline-none focus:border-harbor-cyan/50"
          />
        </div>
        <div>
          <label class="text-[10px] font-mono text-console-400 mb-1 block">结束时间</label>
          <input
            v-model="timeEnd"
            type="datetime-local"
            class="w-full px-2 py-1.5 text-xs font-mono bg-console-800/80 border border-console-500/40 rounded text-console-100 focus:outline-none focus:border-harbor-cyan/50"
          />
        </div>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto">
      <div v-if="displayedLogs.length === 0" class="flex flex-col items-center justify-center h-full text-console-400 py-8">
        <Clock class="w-8 h-8 mb-2 opacity-50" />
        <p class="text-xs font-mono">暂无日志记录</p>
      </div>
      <div
        v-for="log in displayedLogs"
        :key="log.id"
        class="flex items-start gap-3 px-4 py-3 border-b border-console-500/15 hover:bg-console-700/30 transition-colors group"
      >
        <div
          :class="[
            'w-7 h-7 rounded border flex items-center justify-center shrink-0 mt-0.5',
            logTypeMeta[log.type]?.bgClass || 'bg-console-600 border-console-500',
          ]"
        >
          <component
            :is="logTypeMeta[log.type]?.icon || Clock"
            :class="['w-3.5 h-3.5', logTypeMeta[log.type]?.color || 'text-console-300']"
          />
        </div>
        <div class="flex-1 min-w-0 cursor-pointer" @click="selectSchedule(log.scheduleId)">
          <div class="flex items-center gap-2 flex-wrap">
            <span
              :class="[
                'text-[10px] font-mono px-1.5 py-0.5 rounded',
                logTypeMeta[log.type]?.bgClass || 'bg-console-600',
                logTypeMeta[log.type]?.color || 'text-console-300',
              ]"
            >
              {{ logTypeMeta[log.type]?.label || log.type }}
            </span>
            <span class="text-[10px] font-mono text-console-400">
              {{ formatTimestamp(log.timestamp) }}
            </span>
          </div>
          <p class="text-xs font-mono text-console-200 mt-1">
            {{ log.description }}
          </p>
          <div class="flex items-center gap-3 mt-1.5 flex-wrap">
            <div class="flex items-center gap-1">
              <User class="w-3 h-3 text-console-400" />
              <span class="text-[10px] font-mono text-console-400">{{ log.operator }}</span>
            </div>
            <div v-if="log.scheduleId" class="flex items-center gap-1 text-[10px] font-mono text-console-400">
              <Calendar class="w-3 h-3" />
              <span>{{ log.scheduleId }}</span>
            </div>
            <div v-if="log.shipId" class="flex items-center gap-1 text-[10px] font-mono text-console-400">
              <Ship class="w-3 h-3" />
              <span>{{ getShipName(log.shipId) }}</span>
            </div>
            <div v-if="log.berthId" class="flex items-center gap-1 text-[10px] font-mono text-console-400">
              <Anchor class="w-3 h-3" />
              <span>{{ getBerthName(log.berthId) }}</span>
            </div>
          </div>
        </div>
        <div class="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all shrink-0">
          <button
            v-if="log.before || log.after"
            @click.stop="openLogDetail(log)"
            class="flex items-center gap-1 px-2 py-1 text-[10px] font-mono text-console-400 border border-console-500/40 rounded hover:text-harbor-cyan hover:border-harbor-cyan/50 transition-all"
          >
            <Eye class="w-3 h-3" />
            查看变更
          </button>
          <button
            v-if="(log.type === 'update' || log.type === 'status_change') && isRollbackable(log)"
            @click.stop="requestRollback(log)"
            class="flex items-center gap-1 px-2 py-1 text-[10px] font-mono text-harbor-orange border border-harbor-orange/30 rounded hover:bg-harbor-orange/10 transition-all"
          >
            <Undo2 class="w-3 h-3" />
            回退
          </button>
        </div>
      </div>
    </div>
  </div>
  <LogDetailModal
    :log="selectedLog"
    :visible="showDetailModal"
    @close="closeDetailModal"
    @rollback="requestRollback"
  />

  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="showRollbackConfirm && rollbackTargetLog"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @click.self="cancelRollback"
      >
        <div class="absolute inset-0 bg-console-900/80 backdrop-blur-sm" />
        <div class="relative panel-border rounded-xl bg-console-800/95 w-full max-w-md shadow-2xl z-10">
          <div class="flex items-center justify-between px-5 py-4 border-b border-console-500/20">
            <h3 class="font-mono text-sm font-semibold text-console-100 flex items-center gap-2">
              <Undo2 class="w-4 h-4 text-harbor-orange" />
              确认回退变更
            </h3>
            <button
              @click="cancelRollback"
              class="w-7 h-7 rounded flex items-center justify-center text-console-400 hover:text-console-100 hover:bg-console-700/50 transition-all"
            >
              <XCircle class="w-4 h-4" />
            </button>
          </div>

          <div class="p-5 space-y-4">
            <div v-if="!rollbackResult" class="space-y-3">
              <div class="flex items-start gap-2 p-3 rounded-lg bg-harbor-orange/10 border border-harbor-orange/30">
                <AlertCircleIcon class="w-4 h-4 text-harbor-orange shrink-0 mt-0.5" />
                <div class="text-xs font-mono text-console-200 leading-relaxed">
                  <p class="font-medium text-harbor-orange mb-1">此操作将回退以下变更</p>
                  <p>{{ rollbackTargetLog.description }}</p>
                  <p class="mt-1 text-console-400">
                    操作人: {{ rollbackTargetLog.operator }} |
                    {{ formatTimestamp(rollbackTargetLog.timestamp) }}
                  </p>
                </div>
              </div>
              <p class="text-xs font-mono text-console-300">
                将恢复以下字段至变更前的值: berthId、eta、etd、status、operationProgress、operationTeam、remarks。回退后将自动生成一条回退日志记录，保证日志链完整。
              </p>
            </div>

            <div v-else :class="['flex items-center gap-2 p-3 rounded-lg', rollbackResult.success ? 'bg-harbor-green/10 border border-harbor-green/30' : 'bg-harbor-red/10 border border-harbor-red/30']">
              <component :is="rollbackResult.success ? CheckCircle2 : AlertCircleIcon" :class="['w-4 h-4 shrink-0', rollbackResult.success ? 'text-harbor-green' : 'text-harbor-red']" />
              <span :class="['text-xs font-mono', rollbackResult.success ? 'text-harbor-green' : 'text-harbor-red']">
                {{ rollbackResult.message }}
              </span>
            </div>
          </div>

          <div class="px-5 py-4 border-t border-console-500/20 flex justify-end gap-2">
            <button
              @click="cancelRollback"
              class="px-4 py-1.5 text-xs font-mono text-console-300 border border-console-500/40 rounded hover:text-console-100 hover:border-console-400/50 transition-all"
            >
              {{ rollbackResult ? '关闭' : '取消' }}
            </button>
            <button
              v-if="!rollbackResult"
              @click="executeRollback"
              class="px-4 py-1.5 text-xs font-mono bg-harbor-orange/20 text-harbor-orange border border-harbor-orange/30 rounded hover:bg-harbor-orange/30 transition-all flex items-center gap-1.5"
            >
              <Undo2 class="w-3 h-3" />
              确认回退
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
