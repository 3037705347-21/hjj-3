<script setup lang="ts">
import { ref, computed } from 'vue';
import { useExternalScheduleStore } from '../../stores/externalSchedule';
import { useScheduleStore } from '../../stores/schedule';
import type { ExternalSyncStatus, ExternalDataSource } from '../../types';
import {
  EXTERNAL_SYNC_STATUS_LABELS,
  EXTERNAL_DATA_SOURCE_LABELS,
} from '../../types';
import ExternalSyncStatusBadge from './ExternalSyncStatusBadge.vue';
import {
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Eye,
  Ship,
  Clock,
  Database,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
} from 'lucide-vue-next';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const emit = defineEmits<{
  (e: 'view-detail', id: string): void;
}>();

const externalStore = useExternalScheduleStore();
const scheduleStore = useScheduleStore();

const searchQuery = ref('');
const filterStatus = ref<ExternalSyncStatus | 'all'>('all');
const filterSource = ref<ExternalDataSource | 'all'>('all');
const sortField = ref<'createdAt' | 'eta' | 'lastSyncTime'>('createdAt');
const sortOrder = ref<'asc' | 'desc'>('desc');
const showFilters = ref(false);

const filteredSchedules = computed(() => {
  let result = externalStore.filterExternalSchedules({
    status: filterStatus.value,
    source: filterSource.value,
    search: searchQuery.value || undefined,
  });

  result.sort((a, b) => {
    let aTime: number;
    let bTime: number;

    switch (sortField.value) {
      case 'eta':
        aTime = a.eta ? new Date(a.eta).getTime() : 0;
        bTime = b.eta ? new Date(b.eta).getTime() : 0;
        break;
      case 'lastSyncTime':
        aTime = a.lastSyncTime ? new Date(a.lastSyncTime).getTime() : 0;
        bTime = b.lastSyncTime ? new Date(b.lastSyncTime).getTime() : 0;
        break;
      default:
        aTime = new Date(a.createdAt).getTime();
        bTime = new Date(b.createdAt).getTime();
    }

    return sortOrder.value === 'desc' ? bTime - aTime : aTime - bTime;
  });

  return result;
});

const statusOptions = computed(() => [
  { key: 'all', label: '全部状态' },
  ...Object.entries(EXTERNAL_SYNC_STATUS_LABELS).map(([key, label]) => ({ key, label })),
]);

const sourceOptions = computed(() => [
  { key: 'all', label: '全部来源' },
  ...Object.entries(EXTERNAL_DATA_SOURCE_LABELS).map(([key, label]) => ({ key, label })),
]);

function toggleSort(field: 'createdAt' | 'eta' | 'lastSyncTime') {
  if (sortField.value === field) {
    sortOrder.value = sortOrder.value === 'desc' ? 'asc' : 'desc';
  } else {
    sortField.value = field;
    sortOrder.value = 'desc';
  }
}

function viewDetail(id: string) {
  emit('view-detail', id);
}

function formatTime(date?: Date | string): string {
  if (!date) return '-';
  return format(new Date(date), 'MM-dd HH:mm', { locale: zhCN });
}

function formatDateTime(date?: Date | string): string {
  if (!date) return '-';
  return format(new Date(date), 'yyyy-MM-dd HH:mm', { locale: zhCN });
}
</script>

<template>
  <div class="panel-border rounded-lg overflow-hidden">
    <div class="px-4 py-3 border-b border-console-500/20 bg-console-800/30">
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-2 flex-1">
          <div class="relative flex-1 max-w-md">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-console-400" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="搜索船名、IMO、外部编号..."
              class="w-full pl-9 pr-3 py-1.5 rounded bg-console-900/60 border border-console-500/30 text-xs font-mono text-console-100 placeholder:text-console-500 focus:outline-none focus:border-harbor-cyan/50"
            />
          </div>
          <button
            @click="showFilters = !showFilters"
            :class="[
              'flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono border transition-all',
              showFilters
                ? 'bg-harbor-cyan/20 text-harbor-cyan border-harbor-cyan/40'
                : 'bg-console-800/60 text-console-300 border-console-500/30 hover:border-console-400/50',
            ]"
          >
            <Filter class="w-3.5 h-3.5" />
            筛选
          </button>
        </div>
        <div class="text-xs font-mono text-console-400">
          共 {{ filteredSchedules.length }} 条记录
        </div>
      </div>

      <div
        v-if="showFilters"
        class="mt-3 pt-3 border-t border-console-500/20 flex items-center gap-3 flex-wrap"
      >
        <div>
          <select
            v-model="filterStatus"
            class="px-3 py-1.5 rounded bg-console-900/60 border border-console-500/30 text-xs font-mono text-console-100 focus:outline-none focus:border-harbor-cyan/50"
          >
            <option v-for="opt in statusOptions" :key="opt.key" :value="opt.key">
              {{ opt.label }}
            </option>
          </select>
        </div>
        <div>
          <select
            v-model="filterSource"
            class="px-3 py-1.5 rounded bg-console-900/60 border border-console-500/30 text-xs font-mono text-console-100 focus:outline-none focus:border-harbor-cyan/50"
          >
            <option v-for="opt in sourceOptions" :key="opt.key" :value="opt.key">
              {{ opt.label }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <div class="overflow-x-auto">
      <table class="w-full text-left">
        <thead>
          <tr class="border-b border-console-500/20 bg-console-800/20">
            <th class="px-4 py-2.5 text-[10px] font-mono text-console-400 uppercase tracking-wider font-medium">
              外部船名
            </th>
            <th class="px-4 py-2.5 text-[10px] font-mono text-console-400 uppercase tracking-wider font-medium">
              IMO
            </th>
            <th class="px-4 py-2.5 text-[10px] font-mono text-console-400 uppercase tracking-wider font-medium">
              来源系统
            </th>
            <th
              class="px-4 py-2.5 text-[10px] font-mono text-console-400 uppercase tracking-wider font-medium cursor-pointer hover:text-console-200 transition-colors"
              @click="toggleSort('eta')"
            >
              <span class="flex items-center gap-1">
                预计到港
                <component
                  :is="sortField === 'eta' ? (sortOrder === 'desc' ? ChevronDown : ChevronUp) : null"
                  class="w-3 h-3"
                />
              </span>
            </th>
            <th class="px-4 py-2.5 text-[10px] font-mono text-console-400 uppercase tracking-wider font-medium">
              匹配船舶
            </th>
            <th class="px-4 py-2.5 text-[10px] font-mono text-console-400 uppercase tracking-wider font-medium">
              同步状态
            </th>
            <th
              class="px-4 py-2.5 text-[10px] font-mono text-console-400 uppercase tracking-wider font-medium cursor-pointer hover:text-console-200 transition-colors"
              @click="toggleSort('lastSyncTime')"
            >
              <span class="flex items-center gap-1">
                最后同步
                <component
                  :is="sortField === 'lastSyncTime' ? (sortOrder === 'desc' ? ChevronDown : ChevronUp) : null"
                  class="w-3 h-3"
                />
              </span>
            </th>
            <th class="px-4 py-2.5 text-[10px] font-mono text-console-400 uppercase tracking-wider font-medium text-right">
              操作
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-console-500/10">
          <tr
            v-for="ext in filteredSchedules"
            :key="ext.id"
            class="hover:bg-console-700/30 transition-colors cursor-pointer"
            @click="viewDetail(ext.id)"
          >
            <td class="px-4 py-3">
              <div class="flex items-center gap-2">
                <Ship class="w-3.5 h-3.5 text-console-400 shrink-0" />
                <div>
                  <span class="text-xs font-medium text-console-100">
                    {{ ext.externalShipName }}
                  </span>
                  <p class="text-[10px] font-mono text-console-500 mt-0.5">
                    {{ ext.externalId }}
                  </p>
                </div>
              </div>
            </td>
            <td class="px-4 py-3">
              <span class="text-xs font-mono text-console-300">
                {{ ext.imo }}
              </span>
            </td>
            <td class="px-4 py-3">
              <div class="flex items-center gap-1.5">
                <Database class="w-3 h-3 text-console-500 shrink-0" />
                <span class="text-xs text-console-300">
                  {{ EXTERNAL_DATA_SOURCE_LABELS[ext.sourceSystem] }}
                </span>
              </div>
            </td>
            <td class="px-4 py-3">
              <div class="space-y-1">
                <div class="flex items-center gap-1.5">
                  <Clock class="w-3 h-3 text-console-500 shrink-0" />
                  <span class="text-xs font-mono text-console-300">
                    ETA: {{ formatTime(ext.eta) }}
                  </span>
                </div>
                <div v-if="ext.etd" class="flex items-center gap-1.5 pl-4.5">
                  <span class="text-[10px] font-mono text-console-500">
                    ETD: {{ formatTime(ext.etd) }}
                  </span>
                </div>
              </div>
            </td>
            <td class="px-4 py-3">
              <div v-if="ext.matchedShipName" class="flex items-center gap-1.5">
                <CheckCircle2 class="w-3 h-3 text-harbor-green shrink-0" />
                <span class="text-xs text-console-200">
                  {{ ext.matchedShipName }}
                </span>
              </div>
              <div v-else class="flex items-center gap-1.5">
                <XCircle class="w-3 h-3 text-console-500 shrink-0" />
                <span class="text-xs text-console-500">未匹配</span>
              </div>
            </td>
            <td class="px-4 py-3">
              <ExternalSyncStatusBadge :status="ext.syncStatus" size="sm" />
              <p v-if="ext.errorReason" class="text-[10px] text-harbor-orange mt-1 max-w-[150px] truncate" :title="ext.errorReason">
                {{ ext.errorReason }}
              </p>
            </td>
            <td class="px-4 py-3">
              <span class="text-xs font-mono text-console-400">
                {{ formatDateTime(ext.lastSyncTime) }}
              </span>
            </td>
            <td class="px-4 py-3 text-right">
              <button
                @click.stop="viewDetail(ext.id)"
                class="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-mono text-harbor-cyan border border-harbor-cyan/30 hover:bg-harbor-cyan/10 transition-all"
              >
                <Eye class="w-3 h-3" />
                详情
              </button>
            </td>
          </tr>
          <tr v-if="filteredSchedules.length === 0">
            <td colspan="8" class="px-4 py-12 text-center">
              <Database class="w-10 h-10 text-console-600 mx-auto mb-3" />
              <p class="text-sm text-console-500 font-mono">暂无外部船期数据</p>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
