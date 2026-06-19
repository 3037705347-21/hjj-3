<template>
  <ReportLayout title="指标趋势分析" subtitle="多维度指标历史趋势可视化">
    <div class="panel-border rounded-lg bg-console-800/60 p-4">
      <div class="flex flex-col lg:flex-row lg:items-center gap-4">
        <div class="flex items-center gap-3">
          <button
            @click="goPrevDay"
            class="w-8 h-8 rounded bg-console-700/50 border border-console-500/40 flex items-center justify-center text-console-300 hover:text-harbor-cyan hover:border-harbor-cyan/50 transition-all"
          >
            <ChevronLeft class="w-4 h-4" />
          </button>

          <div class="flex items-center gap-2">
            <CalendarDays class="w-4 h-4 text-harbor-cyan" />
            <input
              v-model="startDateStr"
              type="date"
              class="bg-console-700/50 border border-console-500/40 rounded px-2 py-1 text-sm font-mono text-console-100 outline-none cursor-pointer focus:border-harbor-cyan/50 transition-all"
            />
            <span class="text-console-400 font-mono text-sm">至</span>
            <input
              v-model="endDateStr"
              type="date"
              class="bg-console-700/50 border border-console-500/40 rounded px-2 py-1 text-sm font-mono text-console-100 outline-none cursor-pointer focus:border-harbor-cyan/50 transition-all"
            />
          </div>

          <button
            @click="goNextDay"
            class="w-8 h-8 rounded bg-console-700/50 border border-console-500/40 flex items-center justify-center text-console-300 hover:text-harbor-cyan hover:border-harbor-cyan/50 transition-all"
          >
            <ChevronRight class="w-4 h-4" />
          </button>
        </div>

        <div class="flex items-center gap-2">
          <button
            v-for="btn in quickButtons"
            :key="btn.label"
            @click="setQuickRange(btn.days)"
            :class="[
              'px-3 py-1.5 rounded text-xs font-mono border transition-all',
              activeQuickDays === btn.days
                ? 'bg-harbor-cyan/15 text-harbor-cyan border-harbor-cyan/40'
                : 'bg-console-700/30 text-console-300 border-console-500/30 hover:border-console-400/50 hover:text-console-100',
            ]"
          >
            {{ btn.label }}
          </button>
        </div>

        <div class="flex-1 min-w-[300px]">
          <ReportFilterBar v-model="filterCriteria" />
        </div>
      </div>

      <div class="mt-4 pt-4 border-t border-console-500/20">
        <div class="flex items-center gap-2 mb-3">
          <Activity class="w-4 h-4 text-harbor-cyan" />
          <span class="text-xs font-mono text-console-400 uppercase tracking-wider">选择展示指标</span>
        </div>
        <div class="flex flex-wrap gap-2">
          <label
            v-for="metric in metricOptions"
            :key="metric.key"
            :class="[
              'flex items-center gap-2 px-3 py-1.5 rounded border cursor-pointer transition-all font-mono text-xs',
              selectedMetrics.includes(metric.key)
                ? 'bg-console-700/50 border-console-400/40'
                : 'bg-console-800/50 border-console-600/30 opacity-60 hover:opacity-100',
            ]"
          >
            <input
              type="checkbox"
              :value="metric.key"
              v-model="selectedMetrics"
              class="sr-only"
            />
            <span
              :class="[
                'w-4 h-4 rounded border flex items-center justify-center transition-all',
                selectedMetrics.includes(metric.key)
                  ? 'border-transparent'
                  : 'border-console-500/40 bg-transparent',
              ]"
              :style="selectedMetrics.includes(metric.key) ? { backgroundColor: metric.color } : {}"
            >
              <CheckCircle2 v-if="selectedMetrics.includes(metric.key)" class="w-3 h-3 text-console-900" />
            </span>
            <span class="w-3 h-3 rounded" :style="{ backgroundColor: metric.color, boxShadow: `0 0 6px ${metric.color}60` }" />
            <span :class="selectedMetrics.includes(metric.key) ? metric.textColor : 'text-console-400'">
              {{ metric.label }}
            </span>
          </label>
        </div>
      </div>
    </div>

    <div v-if="selectedMetrics.length === 0" class="panel-border rounded-lg bg-console-800/60 p-12 text-center">
      <Activity class="w-12 h-12 text-console-500 mx-auto mb-4" />
      <p class="font-mono text-sm text-console-400">请至少选择一个指标进行展示</p>
    </div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4">
      <div
        v-for="trend in trendResults"
        :key="trend.metricKey"
        class="panel-border rounded-lg bg-console-800/60 overflow-hidden"
      >
        <div class="px-4 py-3 border-b border-console-500/20 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="w-1 h-4 rounded-full" :style="{ backgroundColor: getMetricColor(trend.metricKey) }" />
            <h3 class="font-mono text-sm font-semibold text-console-100">
              {{ trend.metricLabel }}
              <span v-if="trend.unit" class="text-console-400 font-normal text-xs">({{ trend.unit }})</span>
            </h3>
          </div>
        </div>

        <div class="p-4">
          <component
            :is="ReportCharts.LineChart"
            :data="trend.dataPoints"
            :color="getMetricColor(trend.metricKey)"
            :height="180"
            :show-area="true"
          />
        </div>

        <div class="px-4 py-3 border-t border-console-500/20 grid grid-cols-3 gap-3">
          <div class="text-center">
            <div class="flex items-center justify-center gap-1 mb-1">
              <Maximize2 class="w-3 h-3 text-harbor-red" />
              <span class="text-[10px] font-mono text-console-400 uppercase tracking-wider">最大值</span>
            </div>
            <p class="font-mono text-base font-bold text-harbor-red tabular-nums">
              {{ getTrendStats(trend.metricKey).max }}
            </p>
          </div>
          <div class="text-center">
            <div class="flex items-center justify-center gap-1 mb-1">
              <Minimize2 class="w-3 h-3 text-harbor-cyan" />
              <span class="text-[10px] font-mono text-console-400 uppercase tracking-wider">最小值</span>
            </div>
            <p class="font-mono text-base font-bold text-harbor-cyan tabular-nums">
              {{ getTrendStats(trend.metricKey).min }}
            </p>
          </div>
          <div class="text-center">
            <div class="flex items-center justify-center gap-1 mb-1">
              <TrendingUp class="w-3 h-3 text-harbor-green" />
              <span class="text-[10px] font-mono text-console-400 uppercase tracking-wider">平均值</span>
            </div>
            <p class="font-mono text-base font-bold text-harbor-green tabular-nums">
              {{ getTrendStats(trend.metricKey).avg }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <div v-if="trendResults.length > 0" class="panel-border rounded-lg bg-console-800/60 overflow-hidden">
      <div class="px-4 py-3 border-b border-console-500/20 flex items-center gap-2">
        <span class="w-1 h-4 bg-harbor-purple rounded-full" />
        <h3 class="font-mono text-sm font-semibold text-console-100">数据汇总表</h3>
      </div>
      <div class="overflow-auto max-h-[500px]">
        <table class="w-full text-xs font-mono">
          <thead class="sticky top-0 z-10">
            <tr class="bg-console-900 text-harbor-cyan">
              <th class="px-4 py-2.5 text-left font-semibold border-b border-console-500/20 whitespace-nowrap">
                日期
              </th>
              <th
                v-for="trend in trendResults"
                :key="trend.metricKey"
                class="px-4 py-2.5 text-center font-semibold border-b border-console-500/20 whitespace-nowrap"
              >
                <span :style="{ color: getMetricColor(trend.metricKey) }">
                  {{ trend.metricLabel }}
                </span>
                <span v-if="trend.unit" class="text-console-500 font-normal ml-1">({{ trend.unit }})</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(row, idx) in pivotTableData"
              :key="row.dateStr"
              :class="[
                'border-t border-console-500/20 transition-colors',
                idx % 2 === 0 ? 'bg-console-800/30' : '',
                'hover:bg-console-700/30',
              ]"
            >
              <td class="px-4 py-2.5 text-console-200 whitespace-nowrap tabular-nums">
                {{ row.dateStr }}
              </td>
              <td
                v-for="trend in trendResults"
                :key="trend.metricKey"
                class="px-4 py-2.5 text-center tabular-nums text-console-100"
              >
                {{ row.values[trend.metricKey] ?? '-' }}
              </td>
            </tr>
            <tr v-if="pivotTableData.length === 0">
              <td :colspan="trendResults.length + 1" class="px-4 py-8 text-center text-console-500">
                暂无数据
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </ReportLayout>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import ReportLayout from '@/components/report/ReportLayout.vue';
import ReportFilterBar from '@/components/report/ReportFilterBar.vue';
import * as ReportCharts from '@/components/report/ReportCharts.vue';
import type { ReportFilterCriteria, CoreMetrics, MetricTrend } from '@/types';
import { calculateMetricTrends, CORE_METRIC_LABELS, CORE_METRIC_UNITS } from '@/utils/analytics';
import {
  TrendingUp,
  TrendingDown,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Activity,
  CheckCircle2,
} from 'lucide-vue-next';
import { format } from 'date-fns';

type MetricKey = keyof CoreMetrics;

interface MetricOption {
  key: MetricKey;
  label: string;
  color: string;
  textColor: string;
}

const metricOptions: MetricOption[] = [
  { key: 'berthUtilization', label: '泊位利用率', color: '#00d4aa', textColor: 'text-harbor-cyan' },
  { key: 'planFulfillmentRate', label: '计划兑现率', color: '#10b981', textColor: 'text-harbor-green' },
  { key: 'conflictCount', label: '冲突次数', color: '#ef4444', textColor: 'text-harbor-red' },
  { key: 'todayOperations', label: '作业船次', color: '#f59e0b', textColor: 'text-harbor-orange' },
  { key: 'todayDeparted', label: '离泊船次', color: '#8b5cf6', textColor: 'text-harbor-purple' },
  { key: 'avgWaitingMinutes', label: '平均待泊时长', color: '#3b82f6', textColor: 'text-harbor-blue' },
  { key: 'turnoverRate', label: '泊位周转率', color: '#eab308', textColor: 'text-harbor-yellow' },
];

function formatDateInput(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

const today = new Date();
const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000);

const startDate = ref<Date>(thirtyDaysAgo);
const endDate = ref<Date>(today);

const startDateStr = computed({
  get: () => formatDateInput(startDate.value),
  set: (v: string) => {
    if (v) startDate.value = new Date(v + 'T00:00:00');
  },
});

const endDateStr = computed({
  get: () => formatDateInput(endDate.value),
  set: (v: string) => {
    if (v) endDate.value = new Date(v + 'T23:59:59');
  },
});

const quickButtons = [
  { label: '近7天', days: 7 },
  { label: '近14天', days: 14 },
  { label: '近30天', days: 30 },
];

const activeQuickDays = ref<number | null>(30);

function setQuickRange(days: number) {
  activeQuickDays.value = days;
  endDate.value = new Date();
  startDate.value = new Date(Date.now() - days * 24 * 3600 * 1000);
}

function goPrevDay() {
  activeQuickDays.value = null;
  const s = new Date(startDate.value);
  const e = new Date(endDate.value);
  s.setDate(s.getDate() - 1);
  e.setDate(e.getDate() - 1);
  startDate.value = s;
  endDate.value = e;
}

function goNextDay() {
  activeQuickDays.value = null;
  const s = new Date(startDate.value);
  const e = new Date(endDate.value);
  s.setDate(s.getDate() + 1);
  e.setDate(e.getDate() + 1);
  startDate.value = s;
  endDate.value = e;
}

const filterCriteria = ref<ReportFilterCriteria>({
  startDate: null,
  endDate: null,
  berthIds: [],
  cargoTypes: [],
  priorities: [],
  operationTeams: [],
});

const selectedMetrics = ref<MetricKey[]>([
  'berthUtilization',
  'planFulfillmentRate',
  'conflictCount',
  'todayOperations',
]);

const trendResults = computed<MetricTrend[]>(() => {
  if (selectedMetrics.value.length === 0) return [];
  return calculateMetricTrends(
    selectedMetrics.value,
    startDate.value,
    endDate.value,
    filterCriteria.value,
  );
});

function getMetricColor(key: MetricKey): string {
  const opt = metricOptions.find((m) => m.key === key);
  return opt?.color ?? '#00d4aa';
}

interface TrendStats {
  max: number;
  min: number;
  avg: number;
}

const trendStatsMap = computed<Record<string, TrendStats>>(() => {
  const map: Record<string, TrendStats> = {};
  for (const trend of trendResults.value) {
    const points = trend.dataPoints;
    if (points.length === 0) {
      map[trend.metricKey] = { max: 0, min: 0, avg: 0 };
      continue;
    }
    const values = points.map((d) => d.value);
    const max = Math.max(...values);
    const min = Math.min(...values);
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = Math.round(sum / values.length);
    map[trend.metricKey] = { max, min, avg };
  }
  return map;
});

function getTrendStats(key: MetricKey): TrendStats {
  return trendStatsMap.value[key] ?? { max: 0, min: 0, avg: 0 };
}

interface PivotRow {
  dateStr: string;
  values: Record<string, number>;
}

const pivotTableData = computed<PivotRow[]>(() => {
  if (trendResults.value.length === 0) return [];
  const dateSet = new Set<string>();
  const valueMap: Record<string, Record<string, number>> = {};

  for (const trend of trendResults.value) {
    for (const dp of trend.dataPoints) {
      const dateStr = format(dp.date, 'yyyy-MM-dd');
      dateSet.add(dateStr);
      if (!valueMap[dateStr]) valueMap[dateStr] = {};
      valueMap[dateStr][trend.metricKey] = dp.value;
    }
  }

  const sortedDates = Array.from(dateSet).sort();
  return sortedDates.map((ds) => ({
    dateStr: ds,
    values: valueMap[ds] ?? {},
  }));
});
</script>
