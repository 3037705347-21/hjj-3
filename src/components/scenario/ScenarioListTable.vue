<script setup lang="ts">
import { ref, computed } from 'vue';
import { useScenarioStore } from '../../stores/scenario';
import { useScheduleStore } from '../../stores/schedule';
import type { ScenarioStatus, Scenario } from '../../types';
import {
  SCENARIO_STATUS_LABELS,
} from '../../types';
import {
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Eye,
  Play,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Ship,
  Anchor,
  AlertTriangle,
  Trash2,
  Copy,
} from 'lucide-vue-next';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const emit = defineEmits<{
  (e: 'view-detail', id: string): void;
  (e: 'apply', id: string): void;
  (e: 'delete', id: string): void;
  (e: 'copy', id: string): void;
}>();

const scenarioStore = useScenarioStore();
const scheduleStore = useScheduleStore();

const searchQuery = ref('');
const filterStatus = ref<ScenarioStatus | 'all'>('all');
const sortField = ref<'createdAt' | 'baseTime'>('createdAt');
const sortOrder = ref<'asc' | 'desc'>('desc');
const showFilters = ref(false);

const filteredScenarios = computed(() => {
  let result = scenarioStore.filterScenarios({
    keyword: searchQuery.value || undefined,
    status: filterStatus.value === 'all' ? undefined : filterStatus.value,
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
  ...Object.entries(SCENARIO_STATUS_LABELS).map(([key, label]) => ({ key, label })),
]);

function toggleSort(field: 'createdAt' | 'baseTime') {
  if (sortField.value === field) {
    sortOrder.value = sortOrder.value === 'desc' ? 'asc' : 'desc';
  } else {
    sortField.value = field;
    sortOrder.value = 'desc';
  }
}

function getStatusColor(status: ScenarioStatus): string {
  const colorMap: Record<ScenarioStatus, string> = {
    draft: 'bg-harbor-blue/15 text-harbor-blue border-harbor-blue/30',
    completed: 'bg-harbor-green/15 text-harbor-green border-harbor-green/30',
    applied: 'bg-harbor-purple/15 text-harbor-purple border-harbor-purple/30',
    cancelled: 'bg-console-500/30 text-console-300 border-console-500/30',
  };
  return colorMap[status];
}

function getShipNames(scenario: Scenario): string {
  const shipNames = scenario.involvedShipIds
    .slice(0, 3)
    .map((id) => {
      const ship = scenario.snapshot.ships.find((s) => s.id === id);
      return ship?.name || id;
    });
  const more = scenario.involvedShipIds.length - 3;
  return more > 0 ? `${shipNames.join('、')} 等${more + 3}艘` : shipNames.join('、');
}

function getBerthNames(scenario: Scenario): string {
  const berthNames = scenario.involvedBerthIds
    .slice(0, 2)
    .map((id) => {
      const berth = scenario.snapshot.berths.find((b) => b.id === id);
      return berth?.name || id;
    });
  const more = scenario.involvedBerthIds.length - 2;
  return more > 0 ? `${berthNames.join('、')} 等${more + 2}个` : berthNames.join('、');
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
            placeholder="搜索推演名称、创建人..."
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
        共 <span class="text-console-100 font-medium">{{ filteredScenarios.length }}</span> 个推演场景
      </div>
    </div>

    <div v-if="showFilters" class="px-4 py-3 border-b border-console-500/30 bg-console-900/30">
      <div class="flex items-center gap-4">
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
      </div>
    </div>

    <div class="overflow-x-auto">
      <table class="w-full">
        <thead>
          <tr class="text-left text-xs text-console-400 bg-console-900/50">
            <th class="px-4 py-3 font-medium">
              <button
                @click="toggleSort('createdAt')"
                class="flex items-center gap-1 hover:text-console-200"
              >
                创建时间
                <ChevronDown v-if="sortField === 'createdAt' && sortOrder === 'desc'" class="w-3 h-3" />
                <ChevronUp v-else-if="sortField === 'createdAt' && sortOrder === 'asc'" class="w-3 h-3" />
              </button>
            </th>
            <th class="px-4 py-3 font-medium">推演名称</th>
            <th class="px-4 py-3 font-medium">状态</th>
            <th class="px-4 py-3 font-medium">创建人</th>
            <th class="px-4 py-3 font-medium">
              <button
                @click="toggleSort('baseTime')"
                class="flex items-center gap-1 hover:text-console-200"
              >
                基准时间
                <ChevronDown v-if="sortField === 'baseTime' && sortOrder === 'desc'" class="w-3 h-3" />
                <ChevronUp v-else-if="sortField === 'baseTime' && sortOrder === 'asc'" class="w-3 h-3" />
              </button>
            </th>
            <th class="px-4 py-3 font-medium">涉及船舶</th>
            <th class="px-4 py-3 font-medium">涉及泊位</th>
            <th class="px-4 py-3 font-medium">冲突/告警</th>
            <th class="px-4 py-3 font-medium text-right">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="scenario in filteredScenarios"
            :key="scenario.id"
            class="border-t border-console-500/20 hover:bg-console-700/30 transition-colors"
          >
            <td class="px-4 py-3 text-sm text-console-300">
              {{ format(new Date(scenario.createdAt), 'yyyy-MM-dd HH:mm', { locale: zhCN }) }}
            </td>
            <td class="px-4 py-3">
              <div class="flex items-center gap-2">
                <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-harbor-purple/30 to-harbor-blue/30 flex items-center justify-center">
                  <Play class="w-4 h-4 text-harbor-purple" />
                </div>
                <div>
                  <div class="text-sm font-medium text-console-100">{{ scenario.name }}</div>
                  <div v-if="scenario.sourceScenarioName" class="text-xs text-console-400">
                    复制自：{{ scenario.sourceScenarioName }}
                  </div>
                </div>
              </div>
            </td>
            <td class="px-4 py-3">
              <span
                :class="[
                  'inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-md border',
                  getStatusColor(scenario.status),
                ]"
              >
                {{ SCENARIO_STATUS_LABELS[scenario.status] }}
              </span>
            </td>
            <td class="px-4 py-3">
              <div class="flex items-center gap-1.5 text-sm text-console-300">
                <User class="w-3.5 h-3.5 text-console-400" />
                {{ scenario.creator }}
              </div>
            </td>
            <td class="px-4 py-3 text-sm text-console-300">
              {{ format(new Date(scenario.baseTime), 'yyyy-MM-dd HH:mm', { locale: zhCN }) }}
            </td>
            <td class="px-4 py-3">
              <div class="flex items-center gap-1.5 text-sm text-console-300">
                <Ship class="w-3.5 h-3.5 text-console-400" />
                <span class="max-w-32 truncate" :title="getShipNames(scenario)">
                  {{ getShipNames(scenario) }}
                </span>
              </div>
            </td>
            <td class="px-4 py-3">
              <div class="flex items-center gap-1.5 text-sm text-console-300">
                <Anchor class="w-3.5 h-3.5 text-console-400" />
                <span class="max-w-24 truncate" :title="getBerthNames(scenario)">
                  {{ getBerthNames(scenario) }}
                </span>
              </div>
            </td>
            <td class="px-4 py-3">
              <div class="flex items-center gap-3">
                <div v-if="scenario.resultSummary" class="flex items-center gap-1">
                  <AlertTriangle class="w-3.5 h-3.5 text-harbor-red" />
                  <span class="text-sm text-harbor-red">{{ scenario.resultSummary.conflictCount }}</span>
                </div>
                <div v-if="scenario.resultSummary" class="flex items-center gap-1">
                  <Clock class="w-3.5 h-3.5 text-harbor-yellow" />
                  <span class="text-sm text-harbor-yellow">{{ scenario.resultSummary.warningCount }}</span>
                </div>
              </div>
            </td>
            <td class="px-4 py-3">
              <div class="flex items-center justify-end gap-1">
                <button
                  @click="emit('view-detail', scenario.id)"
                  class="p-1.5 text-console-400 hover:text-harbor-cyan hover:bg-harbor-cyan/10 rounded-md transition-colors"
                  title="查看详情"
                >
                  <Eye class="w-4 h-4" />
                </button>
                <button
                  @click="emit('copy', scenario.id)"
                  class="p-1.5 text-console-400 hover:text-harbor-green hover:bg-harbor-green/10 rounded-md transition-colors"
                  title="复制推演"
                >
                  <Copy class="w-4 h-4" />
                </button>
                <button
                  v-if="scenario.status === 'draft' || scenario.status === 'completed'"
                  @click="emit('apply', scenario.id)"
                  class="p-1.5 text-console-400 hover:text-harbor-green hover:bg-harbor-green/10 rounded-md transition-colors"
                  title="应用到正式计划"
                >
                  <CheckCircle class="w-4 h-4" />
                </button>
                <button
                  @click="emit('delete', scenario.id)"
                  class="p-1.5 text-console-400 hover:text-harbor-red hover:bg-harbor-red/10 rounded-md transition-colors"
                  title="删除"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="filteredScenarios.length === 0">
            <td colspan="9" class="px-4 py-12 text-center">
              <div class="flex flex-col items-center gap-2">
                <Play class="w-12 h-12 text-console-600" />
                <div class="text-sm text-console-400">暂无推演场景</div>
                <div class="text-xs text-console-500">点击右上角"新建推演"创建第一个推演场景</div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
