<script setup lang="ts">
import { ref, computed } from 'vue';
import { useSnapshotStore } from '../../stores/snapshot';
import { useScheduleStore } from '../../stores/schedule';
import type { SnapshotStatus, SnapshotCreateMethod, Snapshot } from '../../types';
import {
  SNAPSHOT_STATUS_LABELS,
  SNAPSHOT_CREATE_METHOD_LABELS,
} from '../../types';
import {
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Eye,
  Camera,
  Clock,
  Handshake,
  AlertTriangle,
  CheckCircle,
  Play,
  Trash2,
  Archive,
  FileText,
  GitCompare,
  User,
  Ship,
  Anchor,
  X,
} from 'lucide-vue-next';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const emit = defineEmits<{
  (e: 'view-detail', id: string): void;
  (e: 'compare', id: string): void;
  (e: 'delete', id: string): void;
  (e: 'archive', id: string): void;
  (e: 'unarchive', id: string): void;
}>();

const snapshotStore = useSnapshotStore();
const scheduleStore = useScheduleStore();

const searchQuery = ref('');
const filterStatus = ref<SnapshotStatus | 'all'>('all');
const filterMethod = ref<SnapshotCreateMethod | 'all'>('all');
const sortField = ref<'snapshotTime' | 'createdAt'>('snapshotTime');
const sortOrder = ref<'asc' | 'desc'>('desc');
const showFilters = ref(false);

const filteredSnapshots = computed(() => {
  let result = snapshotStore.filterSnapshots({
    keyword: searchQuery.value || undefined,
    status: filterStatus.value === 'all' ? undefined : filterStatus.value,
    createMethod: filterMethod.value === 'all' ? undefined : filterMethod.value,
  });

  result.sort((a, b) => {
    const aTime = new Date(a[sortField.value]).getTime();
    const bTime = new Date(b[sortField.value]).getTime();
    return sortOrder.value === 'desc' ? bTime - aTime : aTime - bTime;
  });

  return result;
});

const statusOptions = computed(() => [
  { key: 'all', label: '全部状态' },
  ...Object.entries(SNAPSHOT_STATUS_LABELS).map(([key, label]) => ({ key, label })),
]);

const methodOptions = computed(() => [
  { key: 'all', label: '全部方式' },
  ...Object.entries(SNAPSHOT_CREATE_METHOD_LABELS).map(([key, label]) => ({ key, label })),
]);

function toggleSort(field: 'snapshotTime' | 'createdAt') {
  if (sortField.value === field) {
    sortOrder.value = sortOrder.value === 'desc' ? 'asc' : 'desc';
  } else {
    sortField.value = field;
    sortOrder.value = 'desc';
  }
}

function getStatusColor(status: SnapshotStatus): string {
  const colorMap: Record<SnapshotStatus, string> = {
    active: 'bg-harbor-green/15 text-harbor-green border-harbor-green/30',
    archived: 'bg-harbor-orange/15 text-harbor-orange border-harbor-orange/30',
    deleted: 'bg-console-500/30 text-console-300 border-console-500/30',
  };
  return colorMap[status];
}

function getMethodIcon(method: SnapshotCreateMethod) {
  const iconMap: Record<SnapshotCreateMethod, typeof Camera> = {
    manual: Camera,
    auto: Clock,
    handover: Handshake,
    incident: AlertTriangle,
    approval: CheckCircle,
    scenario_apply: Play,
  };
  return iconMap[method];
}

function getMethodColor(method: SnapshotCreateMethod): string {
  return snapshotStore.getMethodColor(method);
}

function getMethodBgClass(method: SnapshotCreateMethod): string {
  return snapshotStore.getMethodBgClass(method);
}

function getKeyPlansPreview(snapshot: Snapshot): string {
  const keyShips = snapshotStore.getKeyShipsFromSnapshot(snapshot.id);
  const names = keyShips.slice(0, 3).map((s) => s.shipName);
  const more = keyShips.length - 3;
  return more > 0 ? `${names.join('、')} 等${more + 3}艘` : names.join('、') || '无';
}
</script>

<template>
  <div class="bg-console-800/50 rounded-xl border border-console-500/30 overflow-hidden">
    <div class="px-4 py-3 border-b border-console-500/30 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="relative">
          <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-console-400" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索快照名称、创建人..."
            class="w-64 h-9 pl-9 pr-4 bg-console-900/80 border border-console-500/40 rounded-lg text-sm text-console-100 placeholder-console-400 focus:outline-none focus:border-harbor-cyan/50 focus:ring-1 focus:ring-harbor-cyan/30"
          />
        </div>
        <button
          @click="showFilters = !showFilters"
          class="flex items-center gap-1.5 h-9 px-3 bg-console-900/80 border border-console-500/40 rounded-lg text-sm text-console-200 hover:border-console-400/50 transition-colors"
        >
          <Filter class="w-4 h-4" />
          <span>筛选</span>
          <ChevronDown v-if="!showFilters" class="w-4 h-4" />
          <ChevronUp v-else class="w-4 h-4" />
        </button>
      </div>
      <div class="text-sm text-console-400">
        共 <span class="text-console-100 font-medium">{{ filteredSnapshots.length }}</span> 个快照
      </div>
    </div>

    <div v-if="showFilters" class="px-4 py-3 border-b border-console-500/30 bg-console-900/30">
      <div class="flex items-center gap-6">
        <div class="flex items-center gap-2">
          <span class="text-sm text-console-400">状态：</span>
          <select
            v-model="filterStatus"
            class="h-8 px-3 bg-console-800 border border-console-500/40 rounded-md text-sm text-console-100 focus:outline-none focus:border-harbor-cyan/50"
          >
            <option v-for="opt in statusOptions" :key="opt.key" :value="opt.key">
              {{ opt.label }}
            </option>
          </select>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-sm text-console-400">创建方式：</span>
          <select
            v-model="filterMethod"
            class="h-8 px-3 bg-console-800 border border-console-500/40 rounded-md text-sm text-console-100 focus:outline-none focus:border-harbor-cyan/50"
          >
            <option v-for="opt in methodOptions" :key="opt.key" :value="opt.key">
              {{ opt.label }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <div class="overflow-x-auto">
      <table class="w-full">
        <thead>
          <tr class="text-left text-xs text-console-400 bg-console-900/50">
            <th class="px-4 py-3 font-medium">
              <button
                @click="toggleSort('snapshotTime')"
                class="flex items-center gap-1 hover:text-console-200"
              >
                快照时间
                <ChevronDown v-if="sortField === 'snapshotTime' && sortOrder === 'desc'" class="w-3 h-3" />
                <ChevronUp v-else-if="sortField === 'snapshotTime' && sortOrder === 'asc'" class="w-3 h-3" />
              </button>
            </th>
            <th class="px-4 py-3 font-medium">快照名称</th>
            <th class="px-4 py-3 font-medium">创建方式</th>
            <th class="px-4 py-3 font-medium">状态</th>
            <th class="px-4 py-3 font-medium">创建人</th>
            <th class="px-4 py-3 font-medium">在港/待泊</th>
            <th class="px-4 py-3 font-medium">冲突数</th>
            <th class="px-4 py-3 font-medium">重点计划</th>
            <th class="px-4 py-3 font-medium">复盘结论</th>
            <th class="px-4 py-3 font-medium text-right">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="snapshot in filteredSnapshots"
            :key="snapshot.id"
            class="border-t border-console-500/20 hover:bg-console-700/30 transition-colors"
          >
            <td class="px-4 py-3 text-sm text-console-300">
              {{ format(new Date(snapshot.snapshotTime), 'yyyy-MM-dd HH:mm', { locale: zhCN }) }}
            </td>
            <td class="px-4 py-3">
              <div class="flex items-center gap-2">
                <div
                  :class="[
                    'w-8 h-8 rounded-lg flex items-center justify-center',
                    getMethodBgClass(snapshot.createMethod),
                  ]"
                >
                  <component :is="getMethodIcon(snapshot.createMethod)" :class="['w-4 h-4', getMethodColor(snapshot.createMethod)]" />
                </div>
                <div>
                  <div class="text-sm font-medium text-console-100">{{ snapshot.name }}</div>
                  <div v-if="snapshot.description" class="text-xs text-console-400 max-w-48 truncate">
                    {{ snapshot.description }}
                  </div>
                </div>
              </div>
            </td>
            <td class="px-4 py-3">
              <span
                :class="[
                  'inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-md border',
                  getMethodBgClass(snapshot.createMethod),
                ]"
              >
                <component :is="getMethodIcon(snapshot.createMethod)" :class="['w-3 h-3', getMethodColor(snapshot.createMethod)]" />
                <span :class="getMethodColor(snapshot.createMethod)">
                  {{ SNAPSHOT_CREATE_METHOD_LABELS[snapshot.createMethod] }}
                </span>
              </span>
            </td>
            <td class="px-4 py-3">
              <span
                :class="[
                  'inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-md border',
                  getStatusColor(snapshot.status),
                ]"
              >
                {{ SNAPSHOT_STATUS_LABELS[snapshot.status] }}
              </span>
            </td>
            <td class="px-4 py-3">
              <div class="flex items-center gap-1.5 text-sm text-console-300">
                <User class="w-3.5 h-3.5 text-console-400" />
                {{ snapshot.creator }}
              </div>
            </td>
            <td class="px-4 py-3">
              <div class="flex items-center gap-2 text-sm">
                <span class="text-harbor-cyan">{{ snapshot.summary.shipsInPort }}</span>
                <span class="text-console-500">/</span>
                <span class="text-harbor-orange">{{ snapshot.summary.shipsWaiting }}</span>
              </div>
            </td>
            <td class="px-4 py-3">
              <div class="flex items-center gap-1">
                <AlertTriangle v-if="snapshot.summary.conflictCount > 0" class="w-3.5 h-3.5 text-harbor-red" />
                <span :class="['text-sm', snapshot.summary.conflictCount > 0 ? 'text-harbor-red' : 'text-console-300']">
                  {{ snapshot.summary.conflictCount }}
                </span>
              </div>
            </td>
            <td class="px-4 py-3">
              <div class="text-sm text-console-300 max-w-32 truncate" :title="getKeyPlansPreview(snapshot)">
                {{ snapshot.summary.keyPlanCount }} 个
              </div>
            </td>
            <td class="px-4 py-3">
              <div v-if="snapshot.reviewConclusion" class="flex items-center gap-1">
                <FileText class="w-3.5 h-3.5 text-harbor-green" />
                <span class="text-xs text-harbor-green">已复盘</span>
              </div>
              <span v-else class="text-xs text-console-500">未复盘</span>
            </td>
            <td class="px-4 py-3">
              <div class="flex items-center justify-end gap-1">
                <button
                  @click="emit('view-detail', snapshot.id)"
                  class="p-1.5 text-console-400 hover:text-harbor-cyan hover:bg-harbor-cyan/10 rounded-md transition-colors"
                  title="查看详情"
                >
                  <Eye class="w-4 h-4" />
                </button>
                <button
                  @click="emit('compare', snapshot.id)"
                  class="p-1.5 text-console-400 hover:text-harbor-purple hover:bg-harbor-purple/10 rounded-md transition-colors"
                  title="盘面对比"
                >
                  <GitCompare class="w-4 h-4" />
                </button>
                <button
                  v-if="snapshot.status === 'active'"
                  @click="emit('archive', snapshot.id)"
                  class="p-1.5 text-console-400 hover:text-harbor-orange hover:bg-harbor-orange/10 rounded-md transition-colors"
                  title="归档"
                >
                  <Archive class="w-4 h-4" />
                </button>
                <button
                  v-else-if="snapshot.status === 'archived'"
                  @click="emit('unarchive', snapshot.id)"
                  class="p-1.5 text-console-400 hover:text-harbor-green hover:bg-harbor-green/10 rounded-md transition-colors"
                  title="取消归档"
                >
                  <Archive class="w-4 h-4" />
                </button>
                <button
                  @click="emit('delete', snapshot.id)"
                  class="p-1.5 text-console-400 hover:text-harbor-red hover:bg-harbor-red/10 rounded-md transition-colors"
                  title="删除"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="filteredSnapshots.length === 0">
            <td colspan="10" class="px-4 py-12 text-center">
              <div class="flex flex-col items-center gap-2">
                <Camera class="w-12 h-12 text-console-600" />
                <div class="text-sm text-console-400">暂无快照记录</div>
                <div class="text-xs text-console-500">点击右上角"创建快照"保存当前调度盘面</div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
