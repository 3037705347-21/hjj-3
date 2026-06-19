<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useExternalScheduleStore } from '../../stores/externalSchedule';
import ExternalSyncStatusBadge from '../../components/external/ExternalSyncStatusBadge.vue';
import ExternalConfirmModal from '../../components/external/ExternalConfirmModal.vue';
import {
  ArrowLeft,
  Search,
  Filter,
  Ship,
  AlertTriangle,
  HelpCircle,
  Clock,
  Database,
  Eye,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-vue-next';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { EXTERNAL_DATA_SOURCE_LABELS } from '../../types';

const router = useRouter();
const externalStore = useExternalScheduleStore();

const searchQuery = ref('');
const filterType = ref<'all' | 'unmatched' | 'conflict'>('all');
const selectedIds = ref<Set<string>>(new Set());
const showConfirmModal = ref(false);
const confirmMode = ref<'confirm' | 'match' | 'resolve'>('confirm');
const selectedExternalId = ref<string | null>(null);

function formatDateTime(date?: Date | string): string {
  if (!date) return '-';
  return format(new Date(date), 'yyyy-MM-dd HH:mm', { locale: zhCN });
}

const filterOptions = [
  { key: 'all', label: '全部' },
  { key: 'unmatched', label: '未匹配' },
  { key: 'conflict', label: '有冲突' },
];

const pendingList = computed(() =>
  externalStore.getPendingConfirmationList({
    type: filterType.value,
    search: searchQuery.value.trim(),
  }),
);

const unmatchedCount = computed(() => externalStore.unmatchedCount);
const conflictCount = computed(() => externalStore.conflictCount);

const allSelected = computed(() => {
  if (pendingList.value.length === 0) return false;
  return pendingList.value.every((item) => selectedIds.value.has(item.id));
});

const selectedList = computed(() =>
  pendingList.value.filter((item) => selectedIds.value.has(item.id))
);

function toggleSelectAll() {
  if (allSelected.value) {
    selectedIds.value.clear();
  } else {
    pendingList.value.forEach((item) => selectedIds.value.add(item.id));
  }
}

function toggleSelect(id: string) {
  if (selectedIds.value.has(id)) {
    selectedIds.value.delete(id);
  } else {
    selectedIds.value.add(id);
  }
}

function handleViewDetail(id: string) {
  router.push(`/external-schedules/${id}`);
}

function handleMatchShip(id: string) {
  selectedExternalId.value = id;
  confirmMode.value = 'match';
  showConfirmModal.value = true;
}

function handleResolve(id: string) {
  selectedExternalId.value = id;
  confirmMode.value = 'resolve';
  showConfirmModal.value = true;
}

function handleIgnore(id: string) {
  externalStore.ignoreExternalSchedule(id);
  selectedIds.value.delete(id);
}

function handleConfirmed() {
  showConfirmModal.value = false;
  if (selectedExternalId.value) {
    selectedIds.value.delete(selectedExternalId.value);
  }
  selectedExternalId.value = null;
}

function handleCloseModal() {
  showConfirmModal.value = false;
  selectedExternalId.value = null;
}

onMounted(() => {
  searchQuery.value = '';
  filterType.value = 'all';
  selectedIds.value.clear();
});
</script>

<template>
  <div class="h-full flex flex-col bg-console-950">
    <div class="shrink-0 px-6 pt-6 pb-4 border-b border-console-700/50">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-3">
          <button
            @click="router.back()"
            class="w-8 h-8 rounded flex items-center justify-center text-console-400 hover:text-console-100 hover:bg-console-800 transition-all"
          >
            <ArrowLeft class="w-4 h-4" />
          </button>
          <div>
            <h1 class="font-mono text-sm font-semibold text-console-100 flex items-center gap-2">
              <AlertTriangle class="w-4 h-4 text-harbor-orange" />
              待确认处理中心
            </h1>
            <p class="text-xs text-console-500 mt-0.5">
              集中处理未匹配船舶与有时间冲突的外部船期数据
            </p>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-4 gap-3 mb-4">
        <div class="panel-border rounded-lg p-4 bg-console-900/50">
          <div class="flex items-center gap-2 mb-1">
            <HelpCircle class="w-3.5 h-3.5 text-console-500" />
            <span class="text-[10px] font-mono text-console-500">待处理总数</span>
          </div>
          <div class="text-xl font-mono font-bold text-console-100">
            {{ unmatchedCount + conflictCount }}
          </div>
        </div>
        <div class="panel-border rounded-lg p-4 bg-console-900/50">
          <div class="flex items-center gap-2 mb-1">
            <HelpCircle class="w-3.5 h-3.5 text-harbor-red" />
            <span class="text-[10px] font-mono text-console-500">未匹配船舶</span>
          </div>
          <div class="text-xl font-mono font-bold text-harbor-red">
            {{ unmatchedCount }}
          </div>
        </div>
        <div class="panel-border rounded-lg p-4 bg-console-900/50">
          <div class="flex items-center gap-2 mb-1">
            <AlertTriangle class="w-3.5 h-3.5 text-harbor-orange" />
            <span class="text-[10px] font-mono text-console-500">时间冲突</span>
          </div>
          <div class="text-xl font-mono font-bold text-harbor-orange">
            {{ conflictCount }}
          </div>
        </div>
        <div class="panel-border rounded-lg p-4 bg-console-900/50">
          <div class="flex items-center gap-2 mb-1">
            <CheckCircle2 class="w-3.5 h-3.5 text-harbor-cyan" />
            <span class="text-[10px] font-mono text-console-500">已选中</span>
          </div>
          <div class="text-xl font-mono font-bold text-harbor-cyan">
            {{ selectedIds.size }}
          </div>
        </div>
      </div>

      <div class="flex items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <div class="relative">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-console-500" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="搜索船名、IMO、匹配船舶..."
              class="w-72 pl-9 pr-3 py-2 rounded bg-console-900 border border-console-700/50 text-xs font-mono text-console-100 placeholder:text-console-500 focus:outline-none focus:border-harbor-cyan/50"
            />
          </div>
          <div class="flex items-center gap-1 panel-border rounded-lg overflow-hidden">
            <button
              v-for="opt in filterOptions"
              :key="opt.key"
              @click="filterType = opt.key as any"
              :class="[
                'px-3 py-1.5 text-xs font-mono transition-all',
                filterType === opt.key
                  ? 'bg-harbor-cyan/20 text-harbor-cyan border-r border-console-700/50 last:border-r-0'
                  : 'text-console-400 hover:bg-console-800/50 border-r border-console-700/50 last:border-r-0',
              ]"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>
        <div class="text-xs font-mono text-console-500">
          共 {{ pendingList.length }} 条记录
        </div>
      </div>
    </div>

    <div class="flex-1 overflow-auto">
      <table class="w-full">
        <thead class="sticky top-0 z-10 bg-console-950 border-b border-console-700/50">
          <tr>
            <th class="w-10 px-4 py-3 text-left">
              <input
                type="checkbox"
                :checked="allSelected"
                :indeterminate="selectedIds.size > 0 && !allSelected"
                @change="toggleSelectAll"
                class="w-3.5 h-3.5 rounded bg-console-900 border border-console-600 text-harbor-cyan focus:ring-harbor-cyan/50"
              />
            </th>
            <th class="px-3 py-3 text-left text-[10px] font-mono font-medium text-console-500 uppercase tracking-wider">外部船名/IMO
            </th>
            <th class="px-3 py-3 text-left text-[10px] font-mono font-medium text-console-500 uppercase tracking-wider">匹配船舶
            </th>
            <th class="px-3 py-3 text-left text-[10px] font-mono font-medium text-console-500 uppercase tracking-wider">状态
            </th>
            <th class="px-3 py-3 text-left text-[10px] font-mono font-medium text-console-500 uppercase tracking-wider">ETA/ETD
            </th>
            <th class="px-3 py-3 text-left text-[10px] font-mono font-medium text-console-500 uppercase tracking-wider">来源系统
            </th>
            <th class="px-3 py-3 text-left text-[10px] font-mono font-medium text-console-500 uppercase tracking-wider">导入时间
            </th>
            <th class="px-3 py-3 text-left text-[10px] font-mono font-medium text-console-500 uppercase tracking-wider">异常原因
            </th>
            <th class="px-3 py-3 text-right text-[10px] font-mono font-medium text-console-500 uppercase tracking-wider">操作
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in pendingList"
            :key="item.id"
            :class="[
              'border-b border-console-800/50 transition-colors',
              selectedIds.has(item.id) ? 'bg-harbor-cyan/5' : 'hover:bg-console-900/50',
            ]"
          >
            <td class="px-4 py-3">
              <input
                type="checkbox"
                :checked="selectedIds.has(item.id)"
                @change="toggleSelect(item.id)"
                class="w-3.5 h-3.5 rounded bg-console-900 border border-console-600 text-harbor-cyan focus:ring-harbor-cyan/50"
              />
            </td>
            <td class="px-3 py-3">
              <div class="flex flex-col">
                <div class="flex items-center gap-1.5">
                  <Ship class="w-3 h-3 text-console-400" />
                  <span class="text-xs font-medium text-console-100">{{ item.externalShipName }}</span>
                </div>
                <span class="text-[10px] font-mono text-console-500 ml-4.5">IMO: {{ item.imo }}
                </span>
              </div>
            </td>
            <td class="px-3 py-3">
              <div v-if="item.matchedShipName" class="text-xs text-console-200">{{ item.matchedShipName }}</div>
              <div v-else class="text-xs text-console-500 flex items-center gap-1">
                <HelpCircle class="w-3 h-3" />
                未匹配
              </div>
            </td>
            <td class="px-3 py-3">
              <ExternalSyncStatusBadge :status="item.syncStatus" size="sm" />
            </td>
            <td class="px-3 py-3">
              <div class="flex flex-col gap-0.5">
                <div class="flex items-center gap-1">
                  <Clock class="w-2.5 h-2.5 text-console-500" />
                  <span class="text-[11px] font-mono text-console-300">{{ formatDateTime(item.eta) }}
                  </span>
                </div>
                <span class="text-[10px] font-mono text-console-500 ml-3.5">~ {{ formatDateTime(item.etd) }}
                </span>
              </div>
            </td>
            <td class="px-3 py-3">
              <div class="flex items-center gap-1.5">
                <Database class="w-3 h-3 text-console-500" />
                <span class="text-xs text-console-300">{{ EXTERNAL_DATA_SOURCE_LABELS[item.sourceSystem] }}</span>
              </div>
            </td>
            <td class="px-3 py-3">
              <span class="text-[11px] font-mono text-console-400">{{ formatDateTime(item.createdAt) }}</span>
            </td>
            <td class="px-3 py-3">
              <div class="max-w-xs">
                <p class="text-[11px] text-harbor-orange flex items-start gap-1">
                  <AlertTriangle class="w-3 h-3 mt-0.5 shrink-0" />
                  <span>{{ item.errorReason || '-' }}</span>
                </p>
              </div>
            </td>
            <td class="px-3 py-3">
              <div class="flex items-center justify-end gap-1">
                <button
                  @click="handleViewDetail(item.id)"
                  class="px-2 py-1 rounded text-[11px] font-mono text-console-400 hover:bg-console-800 hover:text-console-100 transition-all flex items-center gap-1"
                >
                  <Eye class="w-3 h-3" />
                  详情
                </button>
                <button
                  v-if="item.syncStatus === 'unmatched'"
                  @click="handleMatchShip(item.id)"
                  class="px-2 py-1 rounded text-[11px] font-mono text-harbor-cyan border border-harbor-cyan/30 hover:bg-harbor-cyan/10 transition-all flex items-center gap-1"
                >
                  <CheckCircle2 class="w-3 h-3" />
                  匹配
                </button>
                <button
                  v-if="item.syncStatus === 'conflict'"
                  @click="handleResolve(item.id)"
                  class="px-2 py-1 rounded text-[11px] font-mono text-harbor-orange border border-harbor-orange/30 hover:bg-harbor-orange/10 transition-all flex items-center gap-1"
                >
                  <CheckCircle2 class="w-3 h-3" />
                  确认
                </button>
                <button
                  @click="handleIgnore(item.id)"
                  class="px-2 py-1 rounded text-[11px] font-mono text-console-500 hover:bg-console-800 hover:text-harbor-red transition-all flex items-center gap-1"
                >
                  <XCircle class="w-3 h-3" />
                  忽略
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="pendingList.length === 0">
            <td colspan="9" class="px-4 py-16 text-center">
              <div class="flex flex-col items-center gap-2">
                <CheckCircle2 class="w-10 h-10 text-console-700" />
                <p class="text-sm font-medium text-console-400">暂无待确认记录</p>
                <p class="text-xs text-console-600">所有外部船期数据已处理完毕
              </p>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <ExternalConfirmModal
      v-if="showConfirmModal"
      :visible="showConfirmModal"
      :external-id="selectedExternalId || undefined"
      :mode="confirmMode"
      @close="handleCloseModal"
      @confirmed="handleConfirmed"
    />
  </div>
</template>
