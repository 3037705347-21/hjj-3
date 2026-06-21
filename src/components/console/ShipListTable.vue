<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useScheduleStore } from '../../stores/schedule';
import PriorityBadge from '../common/PriorityBadge.vue';
import StatusBadge from '../common/StatusBadge.vue';
import CargoTypeIcon from '../common/CargoTypeIcon.vue';
import ShipTagBadge from '../common/ShipTagBadge.vue';
import ScheduleEditDrawer from '../common/ScheduleEditDrawer.vue';
import { format, differenceInHours, differenceInMinutes } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import {
  Search,
  ArrowUpDown,
  Plus,
  MoreVertical,
  Pencil,
  Copy,
  Trash2,
  Filter,
  X,
  Download,
  Save,
  FolderOpen,
  RotateCcw,
  CheckSquare,
  Square,
  MinusSquare,
  Users,
  StickyNote,
  RefreshCw,
  AlertTriangle,
  ChevronDown,
  Wrench,
} from 'lucide-vue-next';
import type {
  OperationStatus,
  ShipPriority,
  BerthSchedule,
  CargoType,
  ScheduleFilterCriteria,
  SavedView,
} from '../../types';

interface ExternalFilter extends Partial<ScheduleFilterCriteria> {
  __token?: number;
}

const props = defineProps<{
  externalFilter?: ExternalFilter;
}>();

const store = useScheduleStore();
const searchQuery = ref('');
const statusFilter = ref<OperationStatus | 'all'>('all');
const priorityFilter = ref<ShipPriority | 'all'>('all');
const sortKey = ref<'eta' | 'priority'>('eta');
const sortAsc = ref(true);

const showAddDrawer = ref(false);
const showEditDrawer = ref(false);
const editingScheduleId = ref<string | null>(null);
const showDeleteConfirm = ref<string | null>(null);
const openMenuRow = ref<string | null>(null);

const showAdvancedFilter = ref(false);
const cargoTypeFilter = ref<CargoType | 'all'>('all');
const berthFilter = ref<string | 'all'>('all');
const conflictFilter = ref<'all' | 'has_conflict' | 'no_conflict'>('all');
const teamFilter = ref<string | 'all'>('all');
const etaStart = ref<string | null>(null);
const etaEnd = ref<string | null>(null);
const progressMin = ref<number | null>(null);
const progressMax = ref<number | null>(null);

const selectedIds = ref<Set<string>>(new Set());
const showBatchMenu = ref(false);
const showBatchStatusModal = ref(false);
const showBatchTeamModal = ref(false);
const showBatchRemarksModal = ref(false);
const batchNewStatus = ref<OperationStatus>('anchored');
const batchNewTeam = ref('');
const batchRemarks = ref('');
const batchAppendRemarks = ref(true);

watch(
  () => props.externalFilter,
  (criteria) => {
    if (!criteria) return;
    if (criteria.searchQuery !== undefined) searchQuery.value = criteria.searchQuery;
    if (criteria.statusFilter !== undefined) statusFilter.value = criteria.statusFilter;
    if (criteria.priorityFilter !== undefined) priorityFilter.value = criteria.priorityFilter;
    if (criteria.cargoTypeFilter !== undefined) cargoTypeFilter.value = criteria.cargoTypeFilter;
    if (criteria.berthFilter !== undefined) berthFilter.value = criteria.berthFilter;
    if (criteria.conflictFilter !== undefined) conflictFilter.value = criteria.conflictFilter;
    if (criteria.teamFilter !== undefined) teamFilter.value = criteria.teamFilter;
    if (criteria.etaStart !== undefined) etaStart.value = criteria.etaStart;
    if (criteria.etaEnd !== undefined) etaEnd.value = criteria.etaEnd;
    if (criteria.progressMin !== undefined) progressMin.value = criteria.progressMin;
    if (criteria.progressMax !== undefined) progressMax.value = criteria.progressMax;
    if (criteria.conflictFilter !== undefined || criteria.statusFilter !== undefined) {
      showAdvancedFilter.value = true;
    }
  },
  { deep: true, immediate: true },
);

const showSaveViewModal = ref(false);
const showViewList = ref(false);
const newViewName = ref('');
const savedViews = ref<SavedView[]>([]);

type TableRow = {
  scheduleId: string;
  ship: ReturnType<typeof store.getShipById>;
  berth: ReturnType<typeof store.getBerthById>;
  schedule: (typeof store.schedules)[number];
};

const allTeams = computed(() => store.getAllOperationTeams());
const availableTeams = computed(() => {
  const base = allTeams.value;
  if (batchNewTeam.value && !base.includes(batchNewTeam.value)) {
    return [batchNewTeam.value, ...base];
  }
  return base;
});

const activeFilterCount = computed(() => {
  let count = 0;
  if (searchQuery.value) count++;
  if (statusFilter.value !== 'all') count++;
  if (priorityFilter.value !== 'all') count++;
  if (cargoTypeFilter.value !== 'all') count++;
  if (berthFilter.value !== 'all') count++;
  if (conflictFilter.value !== 'all') count++;
  if (teamFilter.value !== 'all') count++;
  if (etaStart.value) count++;
  if (etaEnd.value) count++;
  if (progressMin.value !== null) count++;
  if (progressMax.value !== null) count++;
  return count;
});

const filteredSchedules = computed<TableRow[]>(() => {
  let result = store.sortedSchedules
    .map((s) => ({
      scheduleId: s.id,
      ship: store.getShipById(s.shipId),
      berth: store.getBerthById(s.berthId),
      schedule: s,
    }))
    .filter((row) => row.ship && row.berth) as TableRow[];

  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    result = result.filter(
      (r) =>
        r.ship!.name.toLowerCase().includes(q) ||
        r.ship!.imo.toLowerCase().includes(q) ||
        r.berth!.name.toLowerCase().includes(q),
    );
  }

  if (statusFilter.value !== 'all') {
    result = result.filter((r) => r.schedule.status === statusFilter.value);
  }

  if (priorityFilter.value !== 'all') {
    result = result.filter((r) => r.ship!.priority === priorityFilter.value);
  }

  if (cargoTypeFilter.value !== 'all') {
    result = result.filter((r) => r.ship!.cargoType === cargoTypeFilter.value);
  }

  if (berthFilter.value !== 'all') {
    result = result.filter((r) => r.schedule.berthId === berthFilter.value);
  }

  if (conflictFilter.value === 'has_conflict') {
    result = result.filter((r) => store.scheduleHasConflicts(r.scheduleId));
  } else if (conflictFilter.value === 'no_conflict') {
    result = result.filter((r) => !store.scheduleHasConflicts(r.scheduleId));
  }

  if (teamFilter.value !== 'all') {
    result = result.filter((r) => r.schedule.operationTeam === teamFilter.value);
  }

  if (etaStart.value) {
    const start = new Date(etaStart.value).getTime();
    result = result.filter((r) => new Date(r.schedule.eta).getTime() >= start);
  }
  if (etaEnd.value) {
    const end = new Date(etaEnd.value).getTime();
    result = result.filter((r) => new Date(r.schedule.eta).getTime() <= end);
  }

  if (progressMin.value !== null) {
    result = result.filter((r) => r.schedule.operationProgress >= progressMin.value!);
  }
  if (progressMax.value !== null) {
    result = result.filter((r) => r.schedule.operationProgress <= progressMax.value!);
  }

  result = [...result].sort((a, b) => {
    let diff = 0;
    if (sortKey.value === 'eta') {
      diff = new Date(a.schedule.eta).getTime() - new Date(b.schedule.eta).getTime();
    } else {
      const order: Record<ShipPriority, number> = { critical: 0, high: 1, normal: 2, low: 3 };
      diff = order[a.ship!.priority] - order[b.ship!.priority];
    }
    return sortAsc.value ? diff : -diff;
  });

  return result;
});

const allSelected = computed(() => {
  return filteredSchedules.value.length > 0 &&
    filteredSchedules.value.every((r) => selectedIds.value.has(r.scheduleId));
});

const someSelected = computed(() => {
  return filteredSchedules.value.some((r) => selectedIds.value.has(r.scheduleId));
});

const selectedCount = computed(() => selectedIds.value.size);

function formatDuration(eta: Date) {
  const now = new Date();
  const diffMin = differenceInMinutes(eta, now);
  if (diffMin < 0) {
    const hours = Math.abs(differenceInHours(eta, now));
    return `${hours}h前`;
  }
  const hours = Math.floor(diffMin / 60);
  const mins = diffMin % 60;
  if (hours > 0) return `${hours}h${mins}m后`;
  return `${mins}m后`;
}

function toggleSort(key: typeof sortKey.value) {
  if (sortKey.value === key) {
    sortAsc.value = !sortAsc.value;
  } else {
    sortKey.value = key;
    sortAsc.value = true;
  }
}

function selectSchedule(id: string) {
  store.setSelectedSchedule(id);
}

function openAdd() {
  showAddDrawer.value = true;
}

function openEdit(id: string) {
  editingScheduleId.value = id;
  showEditDrawer.value = true;
  openMenuRow.value = null;
}

function handleCopy(id: string) {
  store.copySchedule(id);
  openMenuRow.value = null;
}

function confirmDelete(id: string) {
  showDeleteConfirm.value = id;
  openMenuRow.value = null;
}

function doDelete() {
  if (showDeleteConfirm.value) {
    store.deleteSchedule(showDeleteConfirm.value);
    showDeleteConfirm.value = null;
  }
}

function toggleMenu(id: string, e: MouseEvent) {
  e.stopPropagation();
  openMenuRow.value = openMenuRow.value === id ? null : id;
}

function handleSaved(schedule: BerthSchedule) {
  store.setSelectedSchedule(schedule.id);
}

function toggleRowSelection(id: string, e: MouseEvent) {
  e.stopPropagation();
  if (selectedIds.value.has(id)) {
    selectedIds.value.delete(id);
  } else {
    selectedIds.value.add(id);
  }
}

function toggleSelectAll() {
  if (allSelected.value) {
    filteredSchedules.value.forEach((r) => selectedIds.value.delete(r.scheduleId));
  } else {
    filteredSchedules.value.forEach((r) => selectedIds.value.add(r.scheduleId));
  }
}

function resetFilters() {
  searchQuery.value = '';
  statusFilter.value = 'all';
  priorityFilter.value = 'all';
  cargoTypeFilter.value = 'all';
  berthFilter.value = 'all';
  conflictFilter.value = 'all';
  teamFilter.value = 'all';
  etaStart.value = null;
  etaEnd.value = null;
  progressMin.value = null;
  progressMax.value = null;
  selectedIds.value.clear();
}

function exportResults() {
  const rows = filteredSchedules.value.map((r) => ({
    计划ID: r.scheduleId,
    船名: r.ship?.name || '',
    IMO: r.ship?.imo || '',
    优先级: r.ship?.priority || '',
    状态: r.schedule.status,
    泊位: r.berth?.name || '',
    预计到港: format(new Date(r.schedule.eta), 'yyyy-MM-dd HH:mm', { locale: zhCN }),
    预计离港: format(new Date(r.schedule.etd), 'yyyy-MM-dd HH:mm', { locale: zhCN }),
    作业进度: `${r.schedule.operationProgress}%`,
    货物类型: r.ship?.cargoType || '',
    作业班组: r.schedule.operationTeam || '',
    备注: r.schedule.remarks || '',
    是否有冲突: store.scheduleHasConflicts(r.scheduleId) ? '是' : '否',
  }));
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
  link.download = `调度计划_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function openSaveView() {
  newViewName.value = '';
  showSaveViewModal.value = true;
}

function saveView() {
  if (!newViewName.value.trim()) return;
  const criteria: ScheduleFilterCriteria = {
    searchQuery: searchQuery.value,
    statusFilter: statusFilter.value,
    priorityFilter: priorityFilter.value,
    cargoTypeFilter: cargoTypeFilter.value,
    berthFilter: berthFilter.value,
    conflictFilter: conflictFilter.value,
    teamFilter: teamFilter.value,
    etaStart: etaStart.value,
    etaEnd: etaEnd.value,
    progressMin: progressMin.value,
    progressMax: progressMax.value,
  };
  savedViews.value.push({
    id: `view-${Date.now()}`,
    name: newViewName.value.trim(),
    criteria,
    createdAt: new Date(),
  });
  showSaveViewModal.value = false;
}

function applyView(view: SavedView) {
  searchQuery.value = view.criteria.searchQuery;
  statusFilter.value = view.criteria.statusFilter;
  priorityFilter.value = view.criteria.priorityFilter;
  cargoTypeFilter.value = view.criteria.cargoTypeFilter;
  berthFilter.value = view.criteria.berthFilter;
  conflictFilter.value = view.criteria.conflictFilter;
  teamFilter.value = view.criteria.teamFilter;
  etaStart.value = view.criteria.etaStart;
  etaEnd.value = view.criteria.etaEnd;
  progressMin.value = view.criteria.progressMin;
  progressMax.value = view.criteria.progressMax;
  showViewList.value = false;
}

function deleteView(id: string) {
  const idx = savedViews.value.findIndex((v) => v.id === id);
  if (idx >= 0) savedViews.value.splice(idx, 1);
}

function openBatchStatus() {
  batchNewStatus.value = 'anchored';
  showBatchStatusModal.value = true;
  showBatchMenu.value = false;
}

function confirmBatchStatus() {
  const ids = Array.from(selectedIds.value);
  store.batchUpdateStatus(ids, batchNewStatus.value);
  showBatchStatusModal.value = false;
}

function openBatchTeam() {
  batchNewTeam.value = '';
  showBatchTeamModal.value = true;
  showBatchMenu.value = false;
}

function confirmBatchTeam() {
  if (!batchNewTeam.value.trim()) return;
  const ids = Array.from(selectedIds.value);
  store.batchAssignTeam(ids, batchNewTeam.value.trim());
  showBatchTeamModal.value = false;
}

function openBatchRemarks() {
  batchRemarks.value = '';
  batchAppendRemarks.value = true;
  showBatchRemarksModal.value = true;
  showBatchMenu.value = false;
}

function confirmBatchRemarks() {
  if (!batchRemarks.value.trim()) return;
  const ids = Array.from(selectedIds.value);
  store.batchAddRemarks(ids, batchRemarks.value.trim(), batchAppendRemarks.value);
  showBatchRemarksModal.value = false;
}

function clearSelection() {
  selectedIds.value.clear();
}

watch(selectedIds, () => {
  if (selectedIds.value.size > 0 && !showBatchMenu.value) {
    showBatchMenu.value = true;
  }
  if (selectedIds.value.size === 0) {
    showBatchMenu.value = false;
  }
}, { deep: true });
</script>

<template>
  <div class="panel-border rounded-lg overflow-hidden h-full flex flex-col">
    <div class="px-4 py-3 border-b border-console-500/30">
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <h3 class="font-mono text-sm font-semibold text-console-100 tracking-wide">
            船舶调度计划
          </h3>
          <span class="text-[10px] font-mono text-console-400">
            {{ filteredSchedules.length }} 条记录
          </span>
          <span
            v-if="activeFilterCount > 0"
            class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-harbor-cyan/20 text-harbor-cyan"
          >
            {{ activeFilterCount }} 个筛选
          </span>
        </div>
        <div class="flex items-center gap-2">
          <button
            v-if="activeFilterCount > 0"
            @click="resetFilters"
            class="flex items-center gap-1 px-2 py-1.5 text-[11px] font-mono text-console-300 border border-console-500/40 rounded hover:text-harbor-cyan hover:border-harbor-cyan/50 transition-all"
          >
            <RotateCcw class="w-3 h-3" />
            重置
          </button>
          <button
            @click="showViewList = !showViewList"
            class="flex items-center gap-1 px-2 py-1.5 text-[11px] font-mono text-console-300 border border-console-500/40 rounded hover:text-harbor-cyan hover:border-harbor-cyan/50 transition-all relative"
          >
            <FolderOpen class="w-3 h-3" />
            视图
            <ChevronDown class="w-3 h-3" />
            <div
              v-if="showViewList"
              class="absolute right-0 top-full mt-1 w-56 bg-console-800 border border-console-500/40 rounded shadow-xl z-30 overflow-hidden"
              @click.stop
            >
              <div
                v-if="savedViews.length === 0"
                class="px-3 py-3 text-[11px] font-mono text-console-400"
              >
                暂无保存的视图
              </div>
              <div
                v-for="view in savedViews"
                :key="view.id"
                class="flex items-center justify-between px-3 py-2 hover:bg-console-700/60 transition-colors"
              >
                <button
                  @click="applyView(view)"
                  class="flex-1 text-left text-[11px] font-mono text-console-200"
                >
                  {{ view.name }}
                </button>
                <button
                  @click.stop="deleteView(view.id)"
                  class="text-console-400 hover:text-harbor-red transition-colors ml-2"
                >
                  <X class="w-3 h-3" />
                </button>
              </div>
              <div class="border-t border-console-500/20">
                <button
                  @click="openSaveView"
                  class="w-full flex items-center gap-1.5 px-3 py-2 text-[11px] font-mono text-harbor-cyan hover:bg-console-700/60 transition-colors"
                >
                  <Save class="w-3 h-3" />
                  保存当前筛选
                </button>
              </div>
            </div>
          </button>
          <button
            @click="exportResults"
            class="flex items-center gap-1 px-2 py-1.5 text-[11px] font-mono text-console-300 border border-console-500/40 rounded hover:text-harbor-cyan hover:border-harbor-cyan/50 transition-all"
          >
            <Download class="w-3 h-3" />
            导出
          </button>
          <button
            @click="showAdvancedFilter = !showAdvancedFilter"
            :class="[
              'flex items-center gap-1 px-2 py-1.5 text-[11px] font-mono border rounded transition-all',
              showAdvancedFilter || activeFilterCount > 0
                ? 'text-harbor-cyan border-harbor-cyan/50 bg-harbor-cyan/10'
                : 'text-console-300 border-console-500/40 hover:text-harbor-cyan hover:border-harbor-cyan/50',
            ]"
          >
            <Filter class="w-3 h-3" />
            高级筛选
          </button>
          <button
            @click="openAdd"
            class="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono text-console-900 bg-gradient-to-r from-harbor-cyan to-harbor-cyan/80 rounded shadow-glow-cyan hover:shadow-glow-blue transition-all"
          >
            <Plus class="w-3.5 h-3.5" />
            新增计划
          </button>
        </div>
      </div>

      <div class="mt-3 flex items-center gap-2 flex-wrap">
        <div class="relative flex-1 min-w-[200px]">
          <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-console-400" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索船名/IMO/泊位..."
            class="w-full pl-8 pr-3 py-1.5 text-xs font-mono bg-console-800/80 border border-console-500/40 rounded text-console-100 placeholder:text-console-400 focus:outline-none focus:border-harbor-cyan/50 focus:shadow-glow-cyan transition-all"
          />
        </div>
        <select
          v-model="statusFilter"
          class="px-2 py-1.5 text-xs font-mono bg-console-800/80 border border-console-500/40 rounded text-console-100 focus:outline-none focus:border-harbor-cyan/50"
        >
          <option value="all">全部状态</option>
          <option value="anchored">锚泊</option>
          <option value="approaching">进港中</option>
          <option value="berthing">靠泊中</option>
          <option value="loading">装货中</option>
          <option value="unloading">卸货中</option>
          <option value="departing">离泊中</option>
          <option value="departed">已离港</option>
        </select>
        <select
          v-model="priorityFilter"
          class="px-2 py-1.5 text-xs font-mono bg-console-800/80 border border-console-500/40 rounded text-console-100 focus:outline-none focus:border-harbor-cyan/50"
        >
          <option value="all">全部优先级</option>
          <option value="critical">紧急</option>
          <option value="high">高优</option>
          <option value="normal">普通</option>
          <option value="low">低优</option>
        </select>
      </div>

      <div v-if="showAdvancedFilter" class="mt-3 pt-3 border-t border-console-500/20 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        <div>
          <label class="text-[10px] font-mono text-console-400 mb-1 block">货物类型</label>
          <select
            v-model="cargoTypeFilter"
            class="w-full px-2 py-1.5 text-xs font-mono bg-console-800/80 border border-console-500/40 rounded text-console-100 focus:outline-none focus:border-harbor-cyan/50"
          >
            <option value="all">全部</option>
            <option value="container">集装箱</option>
            <option value="bulk">散货</option>
            <option value="liquid">液体</option>
            <option value="general">杂货</option>
            <option value="ro-ro">滚装</option>
          </select>
        </div>
        <div>
          <label class="text-[10px] font-mono text-console-400 mb-1 block">泊位</label>
          <select
            v-model="berthFilter"
            class="w-full px-2 py-1.5 text-xs font-mono bg-console-800/80 border border-console-500/40 rounded text-console-100 focus:outline-none focus:border-harbor-cyan/50"
          >
            <option value="all">全部</option>
            <option v-for="b in store.sortedBerths" :key="b.id" :value="b.id">
              {{ b.name }}
            </option>
          </select>
        </div>
        <div>
          <label class="text-[10px] font-mono text-console-400 mb-1 block">冲突状态</label>
          <select
            v-model="conflictFilter"
            class="w-full px-2 py-1.5 text-xs font-mono bg-console-800/80 border border-console-500/40 rounded text-console-100 focus:outline-none focus:border-harbor-cyan/50"
          >
            <option value="all">全部</option>
            <option value="has_conflict">存在冲突</option>
            <option value="no_conflict">无冲突</option>
          </select>
        </div>
        <div>
          <label class="text-[10px] font-mono text-console-400 mb-1 block">作业班组</label>
          <select
            v-model="teamFilter"
            class="w-full px-2 py-1.5 text-xs font-mono bg-console-800/80 border border-console-500/40 rounded text-console-100 focus:outline-none focus:border-harbor-cyan/50"
          >
            <option value="all">全部</option>
            <option v-for="t in allTeams" :key="t" :value="t">
              {{ t }}
            </option>
          </select>
        </div>
        <div>
          <label class="text-[10px] font-mono text-console-400 mb-1 block">到港起始</label>
          <input
            v-model="etaStart"
            type="datetime-local"
            class="w-full px-2 py-1.5 text-xs font-mono bg-console-800/80 border border-console-500/40 rounded text-console-100 focus:outline-none focus:border-harbor-cyan/50"
          />
        </div>
        <div>
          <label class="text-[10px] font-mono text-console-400 mb-1 block">到港结束</label>
          <input
            v-model="etaEnd"
            type="datetime-local"
            class="w-full px-2 py-1.5 text-xs font-mono bg-console-800/80 border border-console-500/40 rounded text-console-100 focus:outline-none focus:border-harbor-cyan/50"
          />
        </div>
        <div>
          <label class="text-[10px] font-mono text-console-400 mb-1 block">进度最小 (%)</label>
          <input
            v-model.number="progressMin"
            type="number"
            min="0"
            max="100"
            placeholder="0-100"
            class="w-full px-2 py-1.5 text-xs font-mono bg-console-800/80 border border-console-500/40 rounded text-console-100 placeholder:text-console-500 focus:outline-none focus:border-harbor-cyan/50"
          />
        </div>
        <div>
          <label class="text-[10px] font-mono text-console-400 mb-1 block">进度最大 (%)</label>
          <input
            v-model.number="progressMax"
            type="number"
            min="0"
            max="100"
            placeholder="0-100"
            class="w-full px-2 py-1.5 text-xs font-mono bg-console-800/80 border border-console-500/40 rounded text-console-100 placeholder:text-console-500 focus:outline-none focus:border-harbor-cyan/50"
          />
        </div>
      </div>
    </div>

    <div
      v-if="selectedCount > 0"
      class="px-4 py-2 bg-harbor-cyan/10 border-b border-harbor-cyan/30 flex items-center gap-3"
    >
      <span class="text-[11px] font-mono text-harbor-cyan">
        已选择 {{ selectedCount }} 条记录
      </span>
      <div class="flex items-center gap-1.5">
        <button
          @click="openBatchStatus"
          class="flex items-center gap-1 px-2.5 py-1 text-[11px] font-mono text-console-200 bg-console-800/80 border border-console-500/40 rounded hover:text-harbor-cyan hover:border-harbor-cyan/50 transition-all"
        >
          <RefreshCw class="w-3 h-3" />
          修改状态
        </button>
        <button
          @click="openBatchTeam"
          class="flex items-center gap-1 px-2.5 py-1 text-[11px] font-mono text-console-200 bg-console-800/80 border border-console-500/40 rounded hover:text-harbor-cyan hover:border-harbor-cyan/50 transition-all"
        >
          <Users class="w-3 h-3" />
          分配班组
        </button>
        <button
          @click="openBatchRemarks"
          class="flex items-center gap-1 px-2.5 py-1 text-[11px] font-mono text-console-200 bg-console-800/80 border border-console-500/40 rounded hover:text-harbor-cyan hover:border-harbor-cyan/50 transition-all"
        >
          <StickyNote class="w-3 h-3" />
          添加备注
        </button>
      </div>
      <button
        @click="clearSelection"
        class="ml-auto flex items-center gap-1 text-[11px] font-mono text-console-400 hover:text-harbor-red transition-colors"
      >
        <X class="w-3 h-3" />
        取消选择
      </button>
    </div>

    <div class="flex-1 overflow-auto">
      <table class="w-full text-xs font-mono">
        <thead class="sticky top-0 bg-console-800/95 backdrop-blur z-10">
          <tr class="text-console-300">
            <th class="text-left px-3 py-2 font-medium w-8">
              <button
                @click="toggleSelectAll"
                class="text-console-300 hover:text-harbor-cyan transition-colors"
              >
                <CheckSquare v-if="allSelected" class="w-4 h-4 text-harbor-cyan" />
                <MinusSquare v-else-if="someSelected" class="w-4 h-4 text-harbor-cyan" />
                <Square v-else class="w-4 h-4" />
              </button>
            </th>
            <th class="text-left px-3 py-2 font-medium">船舶</th>
            <th
              class="text-left px-3 py-2 font-medium cursor-pointer hover:text-harbor-cyan transition-colors"
              @click="toggleSort('priority')"
            >
              <span class="inline-flex items-center gap-1">
                优先级
                <ArrowUpDown class="w-3 h-3" />
              </span>
            </th>
            <th class="text-left px-3 py-2 font-medium">状态</th>
            <th class="text-left px-3 py-2 font-medium">泊位</th>
            <th class="text-left px-3 py-2 font-medium">班组</th>
            <th
              class="text-left px-3 py-2 font-medium cursor-pointer hover:text-harbor-cyan transition-colors"
              @click="toggleSort('eta')"
            >
              <span class="inline-flex items-center gap-1">
                预计到港
                <ArrowUpDown class="w-3 h-3" />
              </span>
            </th>
            <th class="text-left px-3 py-2 font-medium">预计离港</th>
            <th class="text-left px-3 py-2 font-medium">进度</th>
            <th class="text-left px-3 py-2 font-medium">货物</th>
            <th class="text-left px-3 py-2 font-medium">冲突</th>
            <th class="text-right px-3 py-2 font-medium">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, idx) in filteredSchedules"
            :key="row.scheduleId"
            :class="[
              'border-b border-console-500/15 hover:bg-console-600/40 cursor-pointer transition-colors relative',
              idx % 2 === 0 ? 'bg-console-800/30' : 'bg-console-800/10',
              store.selectedScheduleId === row.scheduleId ? 'bg-harbor-cyan/10 border-l-2 border-l-harbor-cyan' : '',
              selectedIds.has(row.scheduleId) ? 'bg-harbor-cyan/5' : '',
            ]"
            @click="selectSchedule(row.scheduleId)"
          >
            <td class="px-3 py-2">
              <button
                @click="toggleRowSelection(row.scheduleId, $event)"
                class="text-console-300 hover:text-harbor-cyan transition-colors"
              >
                <CheckSquare
                  v-if="selectedIds.has(row.scheduleId)"
                  class="w-4 h-4 text-harbor-cyan"
                />
                <Square v-else class="w-4 h-4" />
              </button>
            </td>
            <td class="px-3 py-2">
              <div class="flex items-center gap-2">
                <div
                  class="w-1 h-8 rounded-full"
                  :class="{
                    'bg-harbor-red': row.ship?.priority === 'critical',
                    'bg-harbor-orange': row.ship?.priority === 'high',
                    'bg-harbor-cyan': row.ship?.priority === 'normal',
                    'bg-console-400': row.ship?.priority === 'low',
                  }"
                />
                <div class="min-w-0">
                  <div class="flex items-center gap-1.5">
                    <p class="font-semibold text-console-100 truncate">{{ row.ship?.name }}</p>
                  </div>
                  <p class="text-[10px] text-console-400">
                    {{ row.ship?.imo }} · {{ row.ship?.length }}m/{{ row.ship?.draft }}m
                  </p>
                  <div v-if="row.ship?.tags && row.ship.tags.length > 0" class="flex flex-wrap gap-1 mt-1">
                    <ShipTagBadge
                      v-for="tag in row.ship.tags"
                      :key="tag"
                      :tag="tag"
                      size="xs"
                    />
                  </div>
                </div>
              </div>
            </td>
            <td class="px-3 py-2">
              <PriorityBadge v-if="row.ship" :priority="row.ship.priority" size="sm" />
            </td>
            <td class="px-3 py-2">
              <StatusBadge :status="row.schedule.status" size="sm" />
            </td>
            <td class="px-3 py-2">
              <span class="text-console-200">{{ row.berth?.name }}</span>
            </td>
            <td class="px-3 py-2">
              <span v-if="row.schedule.operationTeam" class="text-console-200">
                {{ row.schedule.operationTeam }}
              </span>
              <span v-else class="text-console-500">-</span>
            </td>
            <td class="px-3 py-2">
              <div>
                <span class="text-console-100">
                  {{ format(new Date(row.schedule.eta), 'MM-dd HH:mm', { locale: zhCN }) }}
                </span>
                <span class="ml-1 text-[10px] text-harbor-orange">
                  {{ formatDuration(new Date(row.schedule.eta)) }}
                </span>
              </div>
            </td>
            <td class="px-3 py-2 text-console-200">
              {{ format(new Date(row.schedule.etd), 'MM-dd HH:mm', { locale: zhCN }) }}
            </td>
            <td class="px-3 py-2">
              <div class="flex items-center gap-2">
                <div class="w-16 h-1.5 bg-console-600 rounded-full overflow-hidden">
                  <div
                    class="h-full rounded-full transition-all duration-500"
                    :class="{
                      'bg-harbor-cyan': row.schedule.operationProgress < 80,
                      'bg-harbor-orange': row.schedule.operationProgress >= 80 && row.schedule.operationProgress < 100,
                      'bg-harbor-green': row.schedule.operationProgress >= 100,
                    }"
                    :style="{ width: `${row.schedule.operationProgress}%` }"
                  />
                </div>
                <span class="text-[10px] text-console-300 w-8">{{ row.schedule.operationProgress }}%</span>
              </div>
            </td>
            <td class="px-3 py-2">
              <CargoTypeIcon v-if="row.ship" :type="row.ship.cargoType" show-label />
            </td>
            <td class="px-3 py-2">
              <div class="flex items-center gap-1">
                <AlertTriangle
                  v-if="store.scheduleHasConflicts(row.scheduleId)"
                  class="w-4 h-4 text-harbor-red"
                />
                <Wrench
                  v-if="store.isScheduleAffectedByMaintenance(row.scheduleId)"
                  class="w-4 h-4 text-harbor-orange"
                  title="受泊位维护影响"
                />
                <span
                  v-if="!store.scheduleHasConflicts(row.scheduleId) && !store.isScheduleAffectedByMaintenance(row.scheduleId)"
                  class="text-console-500 text-[10px]"
                >-</span>
              </div>
            </td>
            <td class="px-3 py-2 text-right">
              <div class="relative inline-block">
                <button
                  @click="toggleMenu(row.scheduleId, $event)"
                  class="w-7 h-7 flex items-center justify-center rounded border border-console-500/40 text-console-300 hover:text-harbor-cyan hover:border-harbor-cyan/50 hover:bg-harbor-cyan/10 transition-all"
                >
                  <MoreVertical class="w-3.5 h-3.5" />
                </button>
                <div
                  v-if="openMenuRow === row.scheduleId"
                  class="absolute right-0 top-full mt-1 w-32 bg-console-800 border border-console-500/40 rounded shadow-xl z-20 overflow-hidden"
                  @click.stop
                >
                  <button
                    @click="openEdit(row.scheduleId)"
                    class="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-mono text-console-200 hover:bg-console-700/60 transition-colors"
                  >
                    <Pencil class="w-3.5 h-3.5 text-harbor-cyan" />
                    编辑
                  </button>
                  <button
                    @click="handleCopy(row.scheduleId)"
                    class="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-mono text-console-200 hover:bg-console-700/60 transition-colors"
                  >
                    <Copy class="w-3.5 h-3.5 text-harbor-orange" />
                    复制
                  </button>
                  <button
                    @click="confirmDelete(row.scheduleId)"
                    class="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-mono text-console-200 hover:bg-harbor-red/10 hover:text-harbor-red transition-colors border-t border-console-500/20"
                  >
                    <Trash2 class="w-3.5 h-3.5" />
                    删除
                  </button>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <ScheduleEditDrawer
      :visible="showAddDrawer"
      mode="create"
      @close="showAddDrawer = false"
      @saved="handleSaved"
    />

    <ScheduleEditDrawer
      :visible="showEditDrawer"
      mode="edit"
      :schedule-id="editingScheduleId || undefined"
      @close="showEditDrawer = false"
      @saved="handleSaved"
    />

    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showDeleteConfirm"
          class="fixed inset-0 z-[200] flex items-center justify-center"
        >
          <div
            class="absolute inset-0 bg-black/60 backdrop-blur-sm"
            @click="showDeleteConfirm = null"
          />
          <div class="relative w-full max-w-sm mx-4 bg-console-900 border border-harbor-red/40 rounded-xl shadow-2xl overflow-hidden">
            <div class="px-5 py-4 border-b border-console-500/30">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-harbor-red/20 flex items-center justify-center">
                  <Trash2 class="w-5 h-5 text-harbor-red" />
                </div>
                <div>
                  <h3 class="font-mono text-sm font-bold text-console-100">确认删除</h3>
                  <p class="text-[11px] font-mono text-console-400">此操作不可撤销</p>
                </div>
              </div>
            </div>
            <div class="px-5 py-4 border-b border-console-500/30">
              <p class="text-xs font-mono text-console-200">
                确定要删除该调度计划吗？相关操作记录将保留在日志中。
              </p>
            </div>
            <div class="px-5 py-3 flex items-center justify-end gap-2 bg-console-800/30">
              <button
                @click="showDeleteConfirm = null"
                class="px-4 py-2 text-xs font-mono text-console-200 border border-console-500/40 rounded hover:bg-console-700/50 transition-all"
              >
                取消
              </button>
              <button
                @click="doDelete"
                class="px-4 py-2 text-xs font-mono text-white bg-harbor-red rounded hover:bg-harbor-red/80 transition-all"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      </Transition>

      <Transition name="fade">
        <div
          v-if="showBatchStatusModal"
          class="fixed inset-0 z-[200] flex items-center justify-center"
        >
          <div
            class="absolute inset-0 bg-black/60 backdrop-blur-sm"
            @click="showBatchStatusModal = false"
          />
          <div class="relative w-full max-w-sm mx-4 bg-console-900 border border-harbor-cyan/40 rounded-xl shadow-2xl overflow-hidden">
            <div class="px-5 py-4 border-b border-console-500/30">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-harbor-cyan/20 flex items-center justify-center">
                  <RefreshCw class="w-5 h-5 text-harbor-cyan" />
                </div>
                <div>
                  <h3 class="font-mono text-sm font-bold text-console-100">批量修改状态</h3>
                  <p class="text-[11px] font-mono text-console-400">将修改 {{ selectedCount }} 条记录</p>
                </div>
              </div>
            </div>
            <div class="px-5 py-4 border-b border-console-500/30">
              <label class="text-[11px] font-mono text-console-300 mb-2 block">选择新状态</label>
              <select
                v-model="batchNewStatus"
                class="w-full px-3 py-2 text-xs font-mono bg-console-800/80 border border-console-500/40 rounded text-console-100 focus:outline-none focus:border-harbor-cyan/50"
              >
                <option value="anchored">锚泊</option>
                <option value="approaching">进港中</option>
                <option value="berthing">靠泊中</option>
                <option value="loading">装货中</option>
                <option value="unloading">卸货中</option>
                <option value="departing">离泊中</option>
                <option value="departed">已离港</option>
              </select>
              <p class="mt-2 text-[10px] font-mono text-console-500">
                每条计划将分别写入独立的状态变更日志
              </p>
            </div>
            <div class="px-5 py-3 flex items-center justify-end gap-2 bg-console-800/30">
              <button
                @click="showBatchStatusModal = false"
                class="px-4 py-2 text-xs font-mono text-console-200 border border-console-500/40 rounded hover:bg-console-700/50 transition-all"
              >
                取消
              </button>
              <button
                @click="confirmBatchStatus"
                class="px-4 py-2 text-xs font-mono text-console-900 bg-harbor-cyan rounded hover:bg-harbor-cyan/80 transition-all"
              >
                确认修改
              </button>
            </div>
          </div>
        </div>
      </Transition>

      <Transition name="fade">
        <div
          v-if="showBatchTeamModal"
          class="fixed inset-0 z-[200] flex items-center justify-center"
        >
          <div
            class="absolute inset-0 bg-black/60 backdrop-blur-sm"
            @click="showBatchTeamModal = false"
          />
          <div class="relative w-full max-w-sm mx-4 bg-console-900 border border-harbor-cyan/40 rounded-xl shadow-2xl overflow-hidden">
            <div class="px-5 py-4 border-b border-console-500/30">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-harbor-cyan/20 flex items-center justify-center">
                  <Users class="w-5 h-5 text-harbor-cyan" />
                </div>
                <div>
                  <h3 class="font-mono text-sm font-bold text-console-100">批量分配班组</h3>
                  <p class="text-[11px] font-mono text-console-400">将分配 {{ selectedCount }} 条记录</p>
                </div>
              </div>
            </div>
            <div class="px-5 py-4 border-b border-console-500/30">
              <label class="text-[11px] font-mono text-console-300 mb-2 block">输入或选择班组名称</label>
              <input
                v-model="batchNewTeam"
                type="text"
                list="team-list"
                placeholder="例如：A班组"
                class="w-full px-3 py-2 text-xs font-mono bg-console-800/80 border border-console-500/40 rounded text-console-100 placeholder:text-console-500 focus:outline-none focus:border-harbor-cyan/50"
              />
              <datalist id="team-list">
                <option v-for="t in availableTeams" :key="t" :value="t" />
              </datalist>
              <p class="mt-2 text-[10px] font-mono text-console-500">
                每条计划将分别写入独立的班组分配日志
              </p>
            </div>
            <div class="px-5 py-3 flex items-center justify-end gap-2 bg-console-800/30">
              <button
                @click="showBatchTeamModal = false"
                class="px-4 py-2 text-xs font-mono text-console-200 border border-console-500/40 rounded hover:bg-console-700/50 transition-all"
              >
                取消
              </button>
              <button
                @click="confirmBatchTeam"
                :disabled="!batchNewTeam.trim()"
                :class="[
                  'px-4 py-2 text-xs font-mono rounded transition-all',
                  batchNewTeam.trim()
                    ? 'text-console-900 bg-harbor-cyan hover:bg-harbor-cyan/80'
                    : 'text-console-500 bg-console-700 cursor-not-allowed',
                ]"
              >
                确认分配
              </button>
            </div>
          </div>
        </div>
      </Transition>

      <Transition name="fade">
        <div
          v-if="showBatchRemarksModal"
          class="fixed inset-0 z-[200] flex items-center justify-center"
        >
          <div
            class="absolute inset-0 bg-black/60 backdrop-blur-sm"
            @click="showBatchRemarksModal = false"
          />
          <div class="relative w-full max-w-md mx-4 bg-console-900 border border-harbor-cyan/40 rounded-xl shadow-2xl overflow-hidden">
            <div class="px-5 py-4 border-b border-console-500/30">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-harbor-cyan/20 flex items-center justify-center">
                  <StickyNote class="w-5 h-5 text-harbor-cyan" />
                </div>
                <div>
                  <h3 class="font-mono text-sm font-bold text-console-100">批量添加备注</h3>
                  <p class="text-[11px] font-mono text-console-400">将添加到 {{ selectedCount }} 条记录</p>
                </div>
              </div>
            </div>
            <div class="px-5 py-4 border-b border-console-500/30 space-y-3">
              <div>
                <label class="text-[11px] font-mono text-console-300 mb-2 block">备注内容</label>
                <textarea
                  v-model="batchRemarks"
                  rows="4"
                  placeholder="请输入备注内容..."
                  class="w-full px-3 py-2 text-xs font-mono bg-console-800/80 border border-console-500/40 rounded text-console-100 placeholder:text-console-500 focus:outline-none focus:border-harbor-cyan/50 resize-none"
                />
              </div>
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  v-model="batchAppendRemarks"
                  class="w-3.5 h-3.5 accent-harbor-cyan"
                />
                <span class="text-[11px] font-mono text-console-300">追加到现有备注（否则覆盖）</span>
              </label>
              <p class="text-[10px] font-mono text-console-500">
                每条计划将分别写入独立的备注更新日志
              </p>
            </div>
            <div class="px-5 py-3 flex items-center justify-end gap-2 bg-console-800/30">
              <button
                @click="showBatchRemarksModal = false"
                class="px-4 py-2 text-xs font-mono text-console-200 border border-console-500/40 rounded hover:bg-console-700/50 transition-all"
              >
                取消
              </button>
              <button
                @click="confirmBatchRemarks"
                :disabled="!batchRemarks.trim()"
                :class="[
                  'px-4 py-2 text-xs font-mono rounded transition-all',
                  batchRemarks.trim()
                    ? 'text-console-900 bg-harbor-cyan hover:bg-harbor-cyan/80'
                    : 'text-console-500 bg-console-700 cursor-not-allowed',
                ]"
              >
                确认添加
              </button>
            </div>
          </div>
        </div>
      </Transition>

      <Transition name="fade">
        <div
          v-if="showSaveViewModal"
          class="fixed inset-0 z-[200] flex items-center justify-center"
        >
          <div
            class="absolute inset-0 bg-black/60 backdrop-blur-sm"
            @click="showSaveViewModal = false"
          />
          <div class="relative w-full max-w-sm mx-4 bg-console-900 border border-harbor-cyan/40 rounded-xl shadow-2xl overflow-hidden">
            <div class="px-5 py-4 border-b border-console-500/30">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-harbor-cyan/20 flex items-center justify-center">
                  <Save class="w-5 h-5 text-harbor-cyan" />
                </div>
                <div>
                  <h3 class="font-mono text-sm font-bold text-console-100">保存筛选视图</h3>
                  <p class="text-[11px] font-mono text-console-400">保存当前筛选条件以便快速调用</p>
                </div>
              </div>
            </div>
            <div class="px-5 py-4 border-b border-console-500/30">
              <label class="text-[11px] font-mono text-console-300 mb-2 block">视图名称</label>
              <input
                v-model="newViewName"
                type="text"
                placeholder="例如：今日紧急作业"
                class="w-full px-3 py-2 text-xs font-mono bg-console-800/80 border border-console-500/40 rounded text-console-100 placeholder:text-console-500 focus:outline-none focus:border-harbor-cyan/50"
              />
            </div>
            <div class="px-5 py-3 flex items-center justify-end gap-2 bg-console-800/30">
              <button
                @click="showSaveViewModal = false"
                class="px-4 py-2 text-xs font-mono text-console-200 border border-console-500/40 rounded hover:bg-console-700/50 transition-all"
              >
                取消
              </button>
              <button
                @click="saveView"
                :disabled="!newViewName.trim()"
                :class="[
                  'px-4 py-2 text-xs font-mono rounded transition-all',
                  newViewName.trim()
                    ? 'text-console-900 bg-harbor-cyan hover:bg-harbor-cyan/80'
                    : 'text-console-500 bg-console-700 cursor-not-allowed',
                ]"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
