<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import ReportLayout from '@/components/report/ReportLayout.vue';
import ReportFilterBar from '@/components/report/ReportFilterBar.vue';
import ReportMetricCard from '@/components/report/ReportMetricCard.vue';
import * as ReportCharts from '@/components/report/ReportCharts.vue';
import PriorityBadge from '@/components/common/PriorityBadge.vue';
import type { ReportFilterCriteria, WeeklyReportData, CoreMetrics, AbnormalReasonCategory } from '@/types';
import { ABNORMAL_REASON_CATEGORY_LABELS } from '@/types';
import { calculateWeeklyReport, CORE_METRIC_LABELS, CORE_METRIC_UNITS, startOfWeek, endOfWeek } from '@/utils/analytics';
import { Ship, Activity, CheckCircle, AlertTriangle, Boxes, Anchor, ChevronLeft, ChevronRight, Download, TrendingUp, TrendingDown } from 'lucide-vue-next';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const weekDate = ref(new Date());
const filterCriteria = ref<ReportFilterCriteria>({
  startDate: null,
  endDate: null,
  berthIds: [],
  cargoTypes: [],
  priorities: [],
  operationTeams: [],
});

const weekStart = computed(() => startOfWeek(weekDate.value));
const weekEnd = computed(() => endOfWeek(weekDate.value));

const reportData = computed<WeeklyReportData>(() =>
  calculateWeeklyReport(weekDate.value, filterCriteria.value),
);

const weekRangeDisplay = computed(() =>
  format(weekStart.value, 'yyyy-MM-dd') + ' ~ ' + format(weekEnd.value, 'yyyy-MM-dd'),
);

function goPrevWeek() {
  const d = new Date(weekDate.value);
  d.setDate(d.getDate() - 7);
  weekDate.value = d;
}

function goNextWeek() {
  const d = new Date(weekDate.value);
  d.setDate(d.getDate() + 7);
  weekDate.value = d;
}

function getGuaranteeRate(metrics: CoreMetrics) {
  if (metrics.criticalShipsTotal === 0) return 100;
  return Math.round((metrics.criticalShipsGuaranteed / metrics.criticalShipsTotal) * 100);
}

const metricConfigs = computed(() => {
  const m = reportData.value.weeklyMetrics;
  const wow = reportData.value.weekOverWeekChange;
  return [
    { key: 'shipsInPort', label: CORE_METRIC_LABELS.shipsInPort, value: m.shipsInPort, icon: Ship, color: 'text-harbor-cyan', progressDenominator: 50, wow: wow.shipsInPort ?? 0 },
    { key: 'berthUtilization', label: CORE_METRIC_LABELS.berthUtilization, value: m.berthUtilization, icon: Activity, color: 'text-harbor-purple', suffix: CORE_METRIC_UNITS.berthUtilization, progressDenominator: 100, wow: wow.berthUtilization ?? 0 },
    { key: 'planFulfillmentRate', label: CORE_METRIC_LABELS.planFulfillmentRate, value: m.planFulfillmentRate, icon: CheckCircle, color: 'text-harbor-green', suffix: CORE_METRIC_UNITS.planFulfillmentRate, progressDenominator: 100, wow: wow.planFulfillmentRate ?? 0 },
    { key: 'conflictCount', label: CORE_METRIC_LABELS.conflictCount, value: m.conflictCount, icon: AlertTriangle, color: 'text-harbor-red', progressDenominator: 30, wow: wow.conflictCount ?? 0 },
    { key: 'todayOperations', label: CORE_METRIC_LABELS.todayOperations, value: m.todayOperations, icon: Boxes, color: 'text-harbor-yellow', progressDenominator: 80, wow: wow.todayOperations ?? 0 },
    { key: 'guaranteeRate', label: '重点保障率', value: getGuaranteeRate(m), icon: Anchor, color: 'text-harbor-blue', suffix: '%', progressDenominator: 100, wow: ((wow.criticalShipsGuaranteed ?? 0) + (wow.criticalShipsTotal ?? 0)) / 2 },
  ];
});

const utilizationLineData = computed(() =>
  reportData.value.dailyBreakdown.map((d) => ({ date: d.date, value: d.metrics.berthUtilization })),
);
const fulfillmentLineData = computed(() =>
  reportData.value.dailyBreakdown.map((d) => ({ date: d.date, value: d.metrics.planFulfillmentRate })),
);
const operationsLineData = computed(() =>
  reportData.value.dailyBreakdown.map((d) => ({ date: d.date, value: d.metrics.todayOperations })),
);

const multiLineChartData = computed(() => [
  { label: '泊位利用率', color: '#a855f7', data: utilizationLineData.value, unit: '%' },
  { label: '计划兑现率', color: '#22c55e', data: fulfillmentLineData.value, unit: '%' },
  { label: '作业船次', color: '#f59e0b', data: operationsLineData.value, unit: '次' },
]);

const abnormalCategoryColors: Record<AbnormalReasonCategory, string> = {
  weather: '#3b82f6',
  equipment_failure: '#ef4444',
  tide_window: '#06b6d4',
  ship_delay: '#f59e0b',
  labor_shortage: '#8b5cf6',
  cargo_issue: '#ec4899',
  berth_maintenance: '#14b8a6',
  other: '#64748b',
};

const abnormalBarChartData = computed(() => {
  const trend = reportData.value.abnormalTrend;
  const days = reportData.value.dailyBreakdown.map((d) => d.date);
  const categories = trend.slice(0, 5);
  return { days, categories };
});

const maxTeamScore = computed(() => {
  if (reportData.value.teamRanking.length === 0) return 0;
  return Math.max(...reportData.value.teamRanking.map((t) => t.efficiencyScore));
});

const maxBerthUtil = computed(() => {
  if (reportData.value.berthRanking.length === 0) return 0;
  return Math.max(...reportData.value.berthRanking.map((b) => b.utilization));
});

function formatTime(date?: Date): string {
  if (!date) return '-';
  return format(date, 'MM-dd HH:mm', { locale: zhCN });
}

function getGuaranteeBadge(status: 'guaranteed' | 'delayed' | 'pending') {
  switch (status) {
    case 'guaranteed':
      return { label: '已保障', bg: 'bg-harbor-green/20', text: 'text-harbor-green', border: 'border-harbor-green/40', icon: CheckCircle };
    case 'delayed':
      return { label: '已延误', bg: 'bg-harbor-red/20', text: 'text-harbor-red', border: 'border-harbor-red/40', icon: AlertTriangle };
    case 'pending':
    default:
      return { label: '待确认', bg: 'bg-harbor-yellow/20', text: 'text-harbor-yellow', border: 'border-harbor-yellow/40', icon: Activity };
  }
}

function getRankEmoji(idx: number) {
  if (idx === 0) return '🥇';
  if (idx === 1) return '🥈';
  if (idx === 2) return '🥉';
  return '';
}

function exportSnapshot() {
  const snapshot = {
    exportTime: new Date().toISOString(),
    weekStart: weekStart.value.toISOString(),
    weekEnd: weekEnd.value.toISOString(),
    filterCriteria: filterCriteria.value,
    data: reportData.value,
  };
  const json = JSON.stringify(snapshot, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `weekly-report-${format(weekStart.value, 'yyyyMMdd')}-${format(weekEnd.value, 'yyyyMMdd')}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
</script>

<template>
  <ReportLayout title="经营周报" subtitle="每周运营汇总与环比分析">
    <div class="space-y-4">
      <div class="flex flex-wrap items-center gap-3">
        <div class="flex items-center gap-2 panel-border rounded-lg px-3 py-2">
          <button
            @click="goPrevWeek"
            class="w-8 h-8 rounded bg-console-700/50 border border-console-500/40 flex items-center justify-center text-console-300 hover:text-harbor-cyan hover:border-harbor-cyan/50 transition-all"
          >
            <ChevronLeft class="w-4 h-4" />
          </button>

          <div class="flex items-center gap-2 px-2">
            <Anchor class="w-4 h-4 text-harbor-cyan" />
            <span class="text-sm font-mono text-console-100 tabular-nums">
              {{ weekRangeDisplay }}
            </span>
          </div>

          <button
            @click="goNextWeek"
            class="w-8 h-8 rounded bg-console-700/50 border border-console-500/40 flex items-center justify-center text-console-300 hover:text-harbor-cyan hover:border-harbor-cyan/50 transition-all"
          >
            <ChevronRight class="w-4 h-4" />
          </button>
        </div>

        <div class="flex-1 min-w-[300px]">
          <ReportFilterBar v-model="filterCriteria" />
        </div>

        <button
          @click="exportSnapshot"
          class="flex items-center gap-2 px-4 py-2 rounded-lg bg-harbor-cyan/15 text-harbor-cyan border border-harbor-cyan/40 hover:bg-harbor-cyan/25 transition-all font-mono text-sm shadow-glow-blue"
        >
          <Download class="w-4 h-4" />
          导出周报快照
        </button>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <div
          v-for="cfg in metricConfigs"
          :key="cfg.key"
          class="relative"
        >
          <ReportMetricCard
            :label="cfg.label"
            :value="cfg.value"
            :icon="cfg.icon"
            :color="cfg.color"
            :suffix="cfg.suffix"
            :progress-denominator="cfg.progressDenominator"
          />
          <div
            v-if="cfg.wow !== 0"
            class="mt-1 flex items-center justify-center gap-1 text-[10px] font-mono"
          >
            <span class="text-console-400">周环比</span>
            <TrendingUp v-if="cfg.wow > 0" class="w-3 h-3 text-harbor-green" />
            <TrendingDown v-else class="w-3 h-3 text-harbor-red" />
            <span :class="cfg.wow > 0 ? 'text-harbor-green' : 'text-harbor-red'">
              {{ cfg.wow > 0 ? '+' : '' }}{{ cfg.wow }}%
            </span>
          </div>
        </div>
      </div>

      <div class="panel-border rounded-lg p-4">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-mono text-sm font-semibold text-console-100 flex items-center gap-2">
            <span class="w-1 h-4 bg-harbor-cyan rounded-full" />
            每日指标分解
          </h3>
          <div class="flex items-center gap-4">
            <div
              v-for="series in multiLineChartData"
              :key="series.label"
              class="flex items-center gap-1.5"
            >
              <span class="w-3 h-3 rounded-sm" :style="{ backgroundColor: series.color, boxShadow: `0 0 6px ${series.color}60` }" />
              <span class="text-[10px] font-mono text-console-300">{{ series.label }}</span>
            </div>
          </div>
        </div>
        <div class="relative">
          <svg
            viewBox="0 0 500 220"
            class="w-full h-[220px]"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient v-for="(series, idx) in multiLineChartData" :key="'grad-' + idx" :id="'areaGradient-' + idx" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" :stop-color="series.color" stop-opacity="0.25" />
                <stop offset="100%" :stop-color="series.color" stop-opacity="0" />
              </linearGradient>
            </defs>
            <g v-for="i in 5" :key="'grid-' + i">
              <line
                x1="40"
                :y1="20 + ((200 - 20) / 4) * (i - 1)"
                x2="490"
                :y2="20 + ((200 - 20) / 4) * (i - 1)"
                stroke="rgba(255,255,255,0.05)"
                stroke-width="1"
              />
            </g>
            <template v-for="(series, sIdx) in multiLineChartData" :key="'series-' + sIdx">
              <path
                v-if="series.data.length > 0"
                :d="(() => {
                  const padding = { left: 40, right: 10, top: 20, bottom: 40 };
                  const w = 500 - padding.left - padding.right;
                  const h = 200 - padding.top - padding.bottom;
                  const maxVal = Math.max(...series.data.map(d => d.value), 1);
                  const step = w / Math.max(series.data.length - 1, 1);
                  const pts = series.data.map((d, i) => {
                    const x = padding.left + i * step;
                    const y = padding.top + h - (d.value / maxVal) * h;
                    return { x, y };
                  });
                  const first = pts[0];
                  const last = pts[pts.length - 1];
                  let areaPath = `M ${first.x} ${padding.top + h} `;
                  pts.forEach(p => { areaPath += `L ${p.x} ${p.y} `; });
                  areaPath += `L ${last.x} ${padding.top + h} Z`;
                  return areaPath;
                })()"
                :fill="`url(#areaGradient-${sIdx})`"
              />
              <path
                v-if="series.data.length > 0"
                :d="(() => {
                  const padding = { left: 40, right: 10, top: 20, bottom: 40 };
                  const w = 500 - padding.left - padding.right;
                  const h = 200 - padding.top - padding.bottom;
                  const maxVal = Math.max(...series.data.map(d => d.value), 1);
                  const step = w / Math.max(series.data.length - 1, 1);
                  return series.data.map((d, i) => {
                    const x = padding.left + i * step;
                    const y = padding.top + h - (d.value / maxVal) * h;
                    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
                  }).join(' ');
                })()"
                fill="none"
                :stroke="series.color"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                :style="{ filter: `drop-shadow(0 0 4px ${series.color}80)` }"
              />
              <g v-for="(d, i) in series.data" :key="'pt-' + sIdx + '-' + i">
                <circle
                  v-if="series.data.length > 0"
                  :cx="(() => {
                    const padding = { left: 40, right: 10, top: 20, bottom: 40 };
                    const w = 500 - padding.left - padding.right;
                    const step = w / Math.max(series.data.length - 1, 1);
                    return padding.left + i * step;
                  })()"
                  :cy="(() => {
                    const padding = { left: 40, right: 10, top: 20, bottom: 40 };
                    const w = 500 - padding.left - padding.right;
                    const h = 200 - padding.top - padding.bottom;
                    const maxVal = Math.max(...series.data.map(x => x.value), 1);
                    return padding.top + h - (d.value / maxVal) * h;
                  })()"
                  r="3"
                  fill="#0f172a"
                  :stroke="series.color"
                  stroke-width="1.5"
                />
                <text
                  v-if="sIdx === multiLineChartData.length - 1"
                  :x="(() => {
                    const padding = { left: 40, right: 10, top: 20, bottom: 40 };
                    const w = 500 - padding.left - padding.right;
                    const step = w / Math.max(series.data.length - 1, 1);
                    return padding.left + i * step;
                  })()"
                  y="210"
                  text-anchor="middle"
                  font-size="9"
                  font-family="monospace"
                  fill="rgba(255,255,255,0.4)"
                >
                  {{ format(d.date, 'MM-dd') }}
                </text>
              </g>
            </template>
          </svg>
        </div>
      </div>

      <div class="grid grid-cols-12 gap-4">
        <div class="col-span-12 lg:col-span-7 panel-border rounded-lg p-4">
          <h3 class="font-mono text-sm font-semibold text-console-100 mb-4 flex items-center gap-2">
            <span class="w-1 h-4 bg-harbor-orange rounded-full" />
            异常原因周趋势
          </h3>
          <div class="space-y-2">
            <div class="flex items-center gap-1 mb-2">
              <div class="w-28 shrink-0" />
              <div class="flex-1 grid grid-cols-7 gap-1">
                <div
                  v-for="day in abnormalBarChartData.days"
                  :key="day.getTime()"
                  class="text-center text-[9px] font-mono text-console-400"
                >
                  {{ format(day, 'MM-dd') }}
                </div>
              </div>
            </div>
            <div
              v-for="cat in abnormalBarChartData.categories"
              :key="cat.category"
              class="flex items-center gap-1"
            >
              <div class="w-28 shrink-0 flex items-center gap-1.5">
                <span class="w-2.5 h-2.5 rounded-sm shrink-0" :style="{ backgroundColor: abnormalCategoryColors[cat.category], boxShadow: `0 0 4px ${abnormalCategoryColors[cat.category]}60` }" />
                <span class="text-[10px] font-mono text-console-300 truncate">{{ ABNORMAL_REASON_CATEGORY_LABELS[cat.category] }}</span>
              </div>
              <div class="flex-1 grid grid-cols-7 gap-1">
                <div
                  v-for="(day, dIdx) in cat.dailyCounts"
                  :key="dIdx"
                  class="h-5 bg-console-700/40 rounded-sm overflow-hidden flex items-end justify-center"
                >
                  <div
                    v-if="day.count > 0"
                    class="w-full rounded-sm transition-all"
                    :style="{
                      height: `${Math.min(100, (day.count / Math.max(...cat.dailyCounts.map(x => x.count), 1)) * 100)}%`,
                      backgroundColor: abnormalCategoryColors[cat.category],
                      boxShadow: `0 0 6px ${abnormalCategoryColors[cat.category]}40`,
                    }"
                    :title="`${ABNORMAL_REASON_CATEGORY_LABELS[cat.category]}: ${day.count}次`"
                  />
                </div>
              </div>
              <div class="w-12 shrink-0 text-right text-[10px] font-mono text-console-200 tabular-nums">
                {{ cat.dailyCounts.reduce((a, b) => a + b.count, 0) }}
              </div>
            </div>
            <div v-if="abnormalBarChartData.categories.length === 0" class="py-8 text-center text-console-500 text-xs font-mono">
              暂无异常数据
            </div>
          </div>
        </div>

        <div class="col-span-12 lg:col-span-5 panel-border rounded-lg overflow-hidden">
          <div class="p-4 border-b border-console-500/20">
            <h3 class="font-mono text-sm font-semibold text-console-100 flex items-center gap-2">
              <span class="w-1 h-4 bg-harbor-green rounded-full" />
              班组周效率排行榜
            </h3>
          </div>
          <div class="overflow-auto max-h-[340px]">
            <table class="w-full text-xs font-mono">
              <thead class="sticky top-0 z-10">
                <tr class="bg-console-800 text-harbor-cyan">
                  <th class="px-3 py-2.5 text-left font-semibold w-12">排名</th>
                  <th class="px-3 py-2.5 text-left font-semibold">班组名称</th>
                  <th class="px-3 py-2.5 text-right font-semibold">完成</th>
                  <th class="px-3 py-2.5 text-right font-semibold">延误率</th>
                  <th class="px-3 py-2.5 text-right font-semibold">评分</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(team, idx) in reportData.teamRanking"
                  :key="team.teamName"
                  :class="[
                    'border-t border-console-500/20 transition-colors',
                    team.efficiencyScore === maxTeamScore && maxTeamScore > 0
                      ? 'bg-harbor-cyan/10'
                      : 'hover:bg-console-700/30',
                  ]"
                >
                  <td class="px-3 py-2.5">
                    <span v-if="getRankEmoji(idx)" class="text-base">{{ getRankEmoji(idx) }}</span>
                    <span v-else class="text-[10px] font-mono text-console-400 w-5 h-5 rounded-full bg-console-700/30 border border-console-500/30 flex items-center justify-center">
                      {{ idx + 1 }}
                    </span>
                  </td>
                  <td class="px-3 py-2.5 text-console-100">{{ team.teamName }}</td>
                  <td class="px-3 py-2.5 text-right text-console-100 tabular-nums">{{ team.completedOperations }}</td>
                  <td class="px-3 py-2.5 text-right tabular-nums" :class="team.delayRate > 20 ? 'text-harbor-red' : team.delayRate > 10 ? 'text-harbor-orange' : 'text-harbor-green'">
                    {{ team.delayRate }}%
                  </td>
                  <td class="px-3 py-2.5 text-right tabular-nums">
                    <span
                      :class="[
                        'font-bold',
                        team.efficiencyScore === maxTeamScore && maxTeamScore > 0 ? 'text-harbor-cyan glow-text-cyan' : 'text-console-100',
                      ]"
                    >
                      {{ team.efficiencyScore }}
                    </span>
                  </td>
                </tr>
                <tr v-if="reportData.teamRanking.length === 0">
                  <td colspan="5" class="px-4 py-8 text-center text-console-500">
                    暂无班组数据
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="panel-border rounded-lg overflow-hidden">
        <div class="p-4 border-b border-console-500/20">
          <h3 class="font-mono text-sm font-semibold text-console-100 flex items-center gap-2">
            <span class="w-1 h-4 bg-harbor-purple rounded-full" />
            泊位周绩效排名
          </h3>
        </div>
        <div class="overflow-auto">
          <table class="w-full text-xs font-mono">
            <thead>
              <tr class="bg-console-800 text-harbor-cyan">
                <th class="px-4 py-2.5 text-left font-semibold w-12">排名</th>
                <th class="px-4 py-2.5 text-left font-semibold">泊位名称</th>
                <th class="px-4 py-2.5 text-right font-semibold">利用率</th>
                <th class="px-4 py-2.5 text-right font-semibold">作业次数</th>
                <th class="px-4 py-2.5 text-right font-semibold">平均周转(h)</th>
                <th class="px-4 py-2.5 text-right font-semibold">冲突次数</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(berth, idx) in reportData.berthRanking"
                :key="berth.berthId"
                :class="[
                  'border-t border-console-500/20 transition-colors',
                  berth.utilization === maxBerthUtil && maxBerthUtil > 0
                    ? 'bg-harbor-green/10'
                    : 'hover:bg-console-700/30',
                ]"
              >
                <td class="px-4 py-2.5">
                  <span v-if="getRankEmoji(idx)" class="text-base">{{ getRankEmoji(idx) }}</span>
                  <span v-else class="text-[10px] font-mono text-console-400 w-5 h-5 rounded-full bg-console-700/30 border border-console-500/30 flex items-center justify-center">
                    {{ idx + 1 }}
                  </span>
                </td>
                <td class="px-4 py-2.5 text-console-100">{{ berth.berthName }}</td>
                <td class="px-4 py-2.5 text-right tabular-nums">
                  <div class="inline-flex items-center gap-2">
                    <div class="w-24 h-1.5 bg-console-700 rounded-full overflow-hidden">
                      <div
                        class="h-full rounded-full transition-all"
                        :class="berth.utilization >= 80 ? 'bg-harbor-green' : berth.utilization >= 50 ? 'bg-harbor-cyan' : berth.utilization >= 30 ? 'bg-harbor-orange' : 'bg-harbor-red'"
                        :style="{ width: `${berth.utilization}%` }"
                      />
                    </div>
                    <span
                      :class="[
                        'font-semibold',
                        berth.utilization === maxBerthUtil && maxBerthUtil > 0 ? 'text-harbor-green' : 'text-console-100',
                      ]"
                    >
                      {{ berth.utilization }}%
                    </span>
                  </div>
                </td>
                <td class="px-4 py-2.5 text-right text-console-100 tabular-nums">{{ berth.operationsCount }}</td>
                <td class="px-4 py-2.5 text-right text-console-200 tabular-nums">{{ berth.avgTurnaroundHours }}</td>
                <td class="px-4 py-2.5 text-right tabular-nums" :class="berth.conflictCount > 0 ? 'text-harbor-red' : 'text-console-300'">
                  {{ berth.conflictCount }}
                </td>
              </tr>
              <tr v-if="reportData.berthRanking.length === 0">
                <td colspan="6" class="px-4 py-8 text-center text-console-500">
                  暂无泊位数据
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="panel-border rounded-lg overflow-hidden">
        <div class="p-4 border-b border-console-500/20">
          <h3 class="font-mono text-sm font-semibold text-console-100 flex items-center gap-2">
            <span class="w-1 h-4 bg-harbor-red rounded-full" />
            本周重点船舶保障摘要
          </h3>
        </div>
        <div class="overflow-auto">
          <table class="w-full text-xs font-mono">
            <thead>
              <tr class="bg-console-800 text-harbor-cyan">
                <th class="px-4 py-2.5 text-left font-semibold">船舶名称</th>
                <th class="px-4 py-2.5 text-left font-semibold">优先级</th>
                <th class="px-4 py-2.5 text-left font-semibold">泊位</th>
                <th class="px-4 py-2.5 text-left font-semibold">计划靠泊</th>
                <th class="px-4 py-2.5 text-left font-semibold">实际靠泊</th>
                <th class="px-4 py-2.5 text-left font-semibold">计划离泊</th>
                <th class="px-4 py-2.5 text-left font-semibold">实际离泊</th>
                <th class="px-4 py-2.5 text-left font-semibold">保障状态</th>
                <th class="px-4 py-2.5 text-left font-semibold">备注</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="ship in reportData.keyShipsSummary"
                :key="ship.scheduleId"
                class="border-t border-console-500/20 hover:bg-console-700/30 transition-colors"
              >
                <td class="px-4 py-2.5 text-console-100 font-medium">{{ ship.shipName }}</td>
                <td class="px-4 py-2.5">
                  <PriorityBadge :priority="ship.priority" size="sm" />
                </td>
                <td class="px-4 py-2.5 text-console-200">{{ ship.berthName }}</td>
                <td class="px-4 py-2.5 text-console-200 tabular-nums">{{ formatTime(ship.plannedBerthing) }}</td>
                <td class="px-4 py-2.5 tabular-nums" :class="ship.actualBerthing ? 'text-console-100' : 'text-console-500'">
                  {{ formatTime(ship.actualBerthing) }}
                </td>
                <td class="px-4 py-2.5 text-console-200 tabular-nums">{{ formatTime(ship.plannedDeparture) }}</td>
                <td class="px-4 py-2.5 tabular-nums" :class="ship.actualDeparture ? 'text-console-100' : 'text-console-500'">
                  {{ formatTime(ship.actualDeparture) }}
                </td>
                <td class="px-4 py-2.5">
                  <span
                    :class="[
                      'inline-flex items-center gap-1 rounded border font-mono font-medium px-2 py-1 text-[10px]',
                      getGuaranteeBadge(ship.guaranteeStatus).bg,
                      getGuaranteeBadge(ship.guaranteeStatus).text,
                      getGuaranteeBadge(ship.guaranteeStatus).border,
                    ]"
                  >
                    <component :is="getGuaranteeBadge(ship.guaranteeStatus).icon" :size="10" />
                    {{ getGuaranteeBadge(ship.guaranteeStatus).label }}
                  </span>
                </td>
                <td class="px-4 py-2.5 text-console-400 max-w-[200px] truncate" :title="ship.remarks">
                  {{ ship.remarks || '-' }}
                </td>
              </tr>
              <tr v-if="reportData.keyShipsSummary.length === 0">
                <td colspan="9" class="px-4 py-8 text-center text-console-500">
                  暂无重点船舶数据
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </ReportLayout>
</template>
