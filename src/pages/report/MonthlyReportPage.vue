<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import ReportLayout from '@/components/report/ReportLayout.vue';
import ReportFilterBar from '@/components/report/ReportFilterBar.vue';
import ReportMetricCard from '@/components/report/ReportMetricCard.vue';
import * as ReportCharts from '@/components/report/ReportCharts.vue';
import type { ReportFilterCriteria, MonthlyReportData, CoreMetrics, AbnormalReasonCategory } from '@/types';
import { calculateMonthlyReport, CORE_METRIC_LABELS, CORE_METRIC_UNITS, startOfMonth } from '@/utils/analytics';
import { ABNORMAL_REASON_CATEGORY_LABELS } from '@/types';
import {
  Ship,
  Activity,
  CheckCircle,
  Repeat,
  AlertTriangle,
  Anchor,
  ChevronLeft,
  ChevronRight,
  Download,
  TrendingUp,
  TrendingDown,
  AlertOctagon,
  Flag,
  Gauge,
  CalendarDays,
} from 'lucide-vue-next';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { h } from 'vue';

const selectedMonth = ref(new Date());
const filterCriteria = ref<ReportFilterCriteria>({
  startDate: null,
  endDate: null,
  berthIds: [],
  cargoTypes: [],
  priorities: [],
  operationTeams: [],
});

const reportData = ref<MonthlyReportData>(calculateMonthlyReport(selectedMonth.value, filterCriteria.value));

watch(
  [selectedMonth, filterCriteria],
  () => {
    reportData.value = calculateMonthlyReport(selectedMonth.value, filterCriteria.value);
  },
  { deep: true },
);

const monthDate = computed(() => startOfMonth(selectedMonth.value));
const monthLabel = computed(() => format(selectedMonth.value, 'yyyy年MM月', { locale: zhCN }));

function goPrevMonth() {
  const d = new Date(selectedMonth.value);
  d.setMonth(d.getMonth() - 1);
  selectedMonth.value = d;
}

function goNextMonth() {
  const d = new Date(selectedMonth.value);
  d.setMonth(d.getMonth() + 1);
  selectedMonth.value = d;
}

function getGuaranteeRate(): number {
  const m = reportData.value.monthlyMetrics;
  if (m.criticalShipsTotal === 0) return 100;
  return Math.round((m.criticalShipsGuaranteed / m.criticalShipsTotal) * 100);
}

function getTrend(key: keyof CoreMetrics): { trend: 'up' | 'down'; trendValue: string } | undefined {
  const change = reportData.value.monthOverMonthChange[key];
  if (change === undefined) return undefined;
  const positiveKeys: (keyof CoreMetrics)[] = ['berthUtilization', 'planFulfillmentRate', 'turnoverRate', 'criticalShipsGuaranteed', 'todayOperations', 'todayDeparted', 'shipsInPort'];
  const isPositive = positiveKeys.includes(key);
  const trendUp = isPositive ? change >= 0 : change <= 0;
  return {
    trend: trendUp ? 'up' : 'down',
    trendValue: `${change >= 0 ? '+' : ''}${change}%`,
  };
}

function getGuaranteeTrend(): { trend: 'up' | 'down'; trendValue: string } | undefined {
  const m = reportData.value.monthlyMetrics;
  const change = reportData.value.monthOverMonthChange;
  const prevTotal = (m.criticalShipsTotal - (change.criticalShipsTotal || 0)) || 1;
  const prevGuaranteed = Math.max(0, m.criticalShipsGuaranteed - (change.criticalShipsGuaranteed || 0));
  const prevRate = Math.round((prevGuaranteed / prevTotal) * 100);
  const currRate = getGuaranteeRate();
  const diff = currRate - prevRate;
  return {
    trend: diff >= 0 ? 'up' : 'down',
    trendValue: `${diff >= 0 ? '+' : ''}${diff}%`,
  };
}

const metricConfigs = computed(() => {
  const m = reportData.value.monthlyMetrics;
  const guaranteeRate = getGuaranteeRate();
  return [
    { key: 'shipsInPort', label: CORE_METRIC_LABELS.shipsInPort, value: m.shipsInPort, icon: Ship, color: 'text-harbor-cyan', progressDenominator: 50, suffix: undefined },
    { key: 'berthUtilization', label: CORE_METRIC_LABELS.berthUtilization, value: m.berthUtilization, icon: Activity, color: 'text-harbor-purple', suffix: CORE_METRIC_UNITS.berthUtilization, progressDenominator: 100 },
    { key: 'planFulfillmentRate', label: CORE_METRIC_LABELS.planFulfillmentRate, value: m.planFulfillmentRate, icon: CheckCircle, color: 'text-harbor-green', suffix: CORE_METRIC_UNITS.planFulfillmentRate, progressDenominator: 100 },
    { key: 'turnoverRate', label: CORE_METRIC_LABELS.turnoverRate, value: m.turnoverRate, icon: Repeat, color: 'text-harbor-blue', suffix: CORE_METRIC_UNITS.turnoverRate, progressDenominator: 100 },
    { key: 'conflictCount', label: CORE_METRIC_LABELS.conflictCount, value: m.conflictCount, icon: AlertTriangle, color: 'text-harbor-red', progressDenominator: 50, suffix: undefined },
    { key: 'guaranteeRate', label: '重点保障率', value: guaranteeRate, icon: Flag, color: 'text-harbor-orange', suffix: '%', progressDenominator: 100 },
  ];
});

const weeklyChartData = computed(() => {
  const data = reportData.value.weeklyBreakdown;
  if (data.length === 0) return null;

  const utilizationLine = data.map((w) => ({ date: w.weekStart, value: w.metrics.berthUtilization }));
  const operationsLine = data.map((w) => ({ date: w.weekStart, value: w.metrics.todayOperations }));
  const departedLine = data.map((w) => ({ date: w.weekStart, value: w.metrics.todayDeparted }));

  const allValues = [
    ...utilizationLine.map((d) => d.value),
    ...operationsLine.map((d) => d.value),
    ...departedLine.map((d) => d.value),
  ];
  const maxVal = Math.max(...allValues, 1);
  const minVal = Math.min(...allValues, 0);
  const range = maxVal - minVal || 1;

  const height = 260;
  const padding = { top: 30, right: 20, bottom: 40, left: 40 };
  const count = data.length;
  const innerWidth = Math.max(count * 80, 400);
  const innerHeight = height - padding.top - padding.bottom;
  const svgWidth = innerWidth + padding.left + padding.right;

  function getX(i: number): number {
    if (count <= 1) return padding.left + innerWidth / 2;
    return padding.left + (i / (count - 1)) * innerWidth;
  }

  function getY(v: number): number {
    const normalized = (v - minVal) / range;
    return padding.top + (1 - normalized) * innerHeight;
  }

  function buildPath(points: { x: number; y: number }[]): string {
    if (points.length === 0) return '';
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');
  }

  const series = [
    { key: 'utilization', label: '泊位利用率(%)', color: '#00D4AA', data: utilizationLine },
    { key: 'operations', label: '作业船次', color: '#F59E0B', data: operationsLine },
    { key: 'departed', label: '离泊船次', color: '#8B5CF6', data: departedLine },
  ];

  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((ratio) => {
    const y = padding.top + ratio * innerHeight;
    const val = Math.round(maxVal - ratio * range);
    return { y, val };
  });

  const pointGroups = data.map((w, i) => {
    const x = getX(i);
    return {
      x,
      weekLabel: format(w.weekStart, 'MM/dd', { locale: zhCN }),
      points: series.map((s) => ({
        color: s.color,
        y: getY(s.data[i].value),
        value: s.data[i].value,
      })),
    };
  });

  const paths = series.map((s) => ({
    color: s.color,
    label: s.label,
    key: s.key,
    path: buildPath(s.data.map((d, i) => ({ x: getX(i), y: getY(d.value) }))),
  }));

  return { height, svgWidth, viewBox: `0 0 ${svgWidth} ${height}`, gridLines, pointGroups, paths, series };
});

const abnormalTop5 = computed(() => {
  const colors = ['#00D4AA', '#F59E0B', '#8B5CF6', '#EF4444', '#3B82F6'];
  return reportData.value.abnormalTrend.slice(0, 5).map((a, i) => ({
    label: ABNORMAL_REASON_CATEGORY_LABELS[a.category],
    value: a.count,
    color: colors[i % colors.length],
  }));
});

const sortedTopIssues = computed(() => {
  const severityOrder: Record<string, number> = { 严重: 0, 较大: 1, 一般: 2 };
  return [...reportData.value.topIssues].sort((a, b) => {
    const sa = severityOrder[a.impact] ?? 99;
    const sb = severityOrder[b.impact] ?? 99;
    if (sa !== sb) return sa - sb;
    return b.count - a.count;
  });
});

function getIssueStyle(impact: string) {
  switch (impact) {
    case '严重':
      return {
        bg: 'bg-harbor-red/15',
        border: 'border-harbor-red/50',
        text: 'text-harbor-red',
        icon: AlertOctagon,
        iconBg: 'bg-harbor-red/20',
      };
    case '较大':
      return {
        bg: 'bg-harbor-orange/15',
        border: 'border-harbor-orange/50',
        text: 'text-harbor-orange',
        icon: AlertTriangle,
        iconBg: 'bg-harbor-orange/20',
      };
    case '一般':
    default:
      return {
        bg: 'bg-harbor-yellow/10',
        border: 'border-harbor-yellow/40',
        text: 'text-harbor-yellow',
        icon: Flag,
        iconBg: 'bg-harbor-yellow/20',
      };
  }
}

function getScoreClass(score: number): string {
  if (score >= 80) return 'text-harbor-green';
  if (score >= 60) return 'text-harbor-yellow';
  return 'text-harbor-red';
}

function getScoreBgClass(score: number): string {
  if (score >= 80) return 'bg-harbor-green/10';
  if (score >= 60) return 'bg-harbor-yellow/10';
  return 'bg-harbor-red/10';
}

function exportSnapshot() {
  const snapshot = {
    exportTime: new Date().toISOString(),
    reportMonth: selectedMonth.value.toISOString(),
    filterCriteria: filterCriteria.value,
    data: reportData.value,
  };
  const json = JSON.stringify(snapshot, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `monthly-report-${format(selectedMonth.value, 'yyyyMM')}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
</script>

<template>
  <ReportLayout title="经营月报" subtitle="月度综合分析与趋势洞察">
    <div class="space-y-4">
      <div class="flex flex-wrap items-center gap-3">
        <div class="flex items-center gap-2 panel-border rounded-lg px-3 py-2">
          <button
            @click="goPrevMonth"
            class="w-8 h-8 rounded bg-console-700/50 border border-console-500/40 flex items-center justify-center text-console-300 hover:text-harbor-cyan hover:border-harbor-cyan/50 transition-all"
          >
            <ChevronLeft class="w-4 h-4" />
          </button>

          <div class="flex items-center gap-2 px-2">
            <CalendarDays class="w-4 h-4 text-harbor-cyan" />
            <input
              v-model="selectedMonth"
              type="month"
              class="bg-transparent text-sm font-mono text-console-100 outline-none cursor-pointer"
            />
            <span class="text-xs font-mono text-console-400 hidden md:inline">
              {{ monthLabel }}
            </span>
          </div>

          <button
            @click="goNextMonth"
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
          导出月报快照
        </button>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-3">
        <ReportMetricCard
          v-for="cfg in metricConfigs"
          :key="cfg.key"
          :label="cfg.label"
          :value="cfg.value"
          :icon="cfg.icon"
          :color="cfg.color"
          :suffix="cfg.suffix"
          :progress-denominator="cfg.progressDenominator"
          :trend="cfg.key === 'guaranteeRate' ? getGuaranteeTrend()?.trend : getTrend(cfg.key as keyof CoreMetrics)?.trend"
          :trend-value="cfg.key === 'guaranteeRate' ? getGuaranteeTrend()?.trendValue : getTrend(cfg.key as keyof CoreMetrics)?.trendValue"
        />
      </div>

      <div class="panel-border rounded-lg p-4">
        <div class="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 class="font-mono text-sm font-semibold text-console-100 flex items-center gap-2">
            <span class="w-1 h-4 bg-harbor-cyan rounded-full" />
            周维度指标分解
          </h3>
          <div v-if="weeklyChartData" class="flex flex-wrap items-center gap-4">
            <div
              v-for="s in weeklyChartData.series"
              :key="s.key"
              class="flex items-center gap-1.5 text-[10px] font-mono text-console-300"
            >
              <span
                class="w-3 h-0.5 rounded"
                :style="{ backgroundColor: s.color, boxShadow: `0 0 4px ${s.color}` }"
              />
              {{ s.label }}
            </div>
          </div>
        </div>
        <div v-if="weeklyChartData" class="overflow-x-auto">
          <svg
            :viewBox="weeklyChartData.viewBox"
            :style="{ height: `${weeklyChartData.height}px`, width: '100%', minWidth: `${weeklyChartData.svgWidth}px` }"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="none"
          >
            <line
              v-for="(g, gi) in weeklyChartData.gridLines"
              :key="`grid-${gi}`"
              :x1="40"
              :y1="g.y"
              :x2="weeklyChartData.svgWidth - 20"
              :y2="g.y"
              stroke="rgba(255,255,255,0.05)"
              stroke-width="1"
            />
            <text
              v-for="(g, gi) in weeklyChartData.gridLines"
              :key="`grid-label-${gi}`"
              :x="35"
              :y="g.y + 3"
              text-anchor="end"
              font-size="9"
              font-family="monospace"
              fill="rgba(255,255,255,0.4)"
            >
              {{ g.val }}
            </text>
            <path
              v-for="p in weeklyChartData.paths"
              :key="`path-${p.key}`"
              :d="p.path"
              fill="none"
              :stroke="p.color"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              :style="{ filter: `drop-shadow(0 0 4px ${p.color}80)` }"
            />
            <template v-for="(pg, pgi) in weeklyChartData.pointGroups" :key="`pg-${pgi}`">
              <text
                :x="pg.x"
                :y="weeklyChartData.height - 12"
                text-anchor="middle"
                font-size="9"
                font-family="monospace"
                fill="rgba(255,255,255,0.5)"
              >
                {{ pg.weekLabel }}
              </text>
              <g v-for="(pt, pti) in pg.points" :key="`pt-${pgi}-${pti}`">
                <circle
                  :cx="pg.x"
                  :cy="pt.y"
                  r="3"
                  fill="#0f172a"
                  :stroke="pt.color"
                  stroke-width="2"
                />
                <text
                  :x="pg.x"
                  :y="pt.y - 7"
                  text-anchor="middle"
                  font-size="9"
                  font-family="monospace"
                  font-weight="bold"
                  :fill="pt.color"
                >
                  {{ pt.value }}
                </text>
              </g>
            </template>
          </svg>
        </div>
        <div v-else class="py-16 text-center text-console-500 font-mono text-xs">
          暂无周维度数据
        </div>
      </div>

      <div class="grid grid-cols-12 gap-4">
        <div class="col-span-12 lg:col-span-7 panel-border rounded-lg p-4">
          <h3 class="font-mono text-sm font-semibold text-console-100 mb-4 flex items-center gap-2">
            <span class="w-1 h-4 bg-harbor-orange rounded-full" />
            本月异常原因分布 TOP 5
          </h3>
          <component
            v-if="abnormalTop5.length > 0"
            :is="ReportCharts.BarChart"
            :data="abnormalTop5"
            :height="280"
          />
          <div v-else class="py-16 text-center text-console-500 font-mono text-xs">
            暂无异常数据
          </div>
        </div>

        <div class="col-span-12 lg:col-span-5 panel-border rounded-lg overflow-hidden">
          <div class="p-4 border-b border-console-500/20">
            <h3 class="font-mono text-sm font-semibold text-console-100 flex items-center gap-2">
              <span class="w-1 h-4 bg-harbor-red rounded-full" />
              月度核心问题看板
            </h3>
          </div>
          <div class="p-4 space-y-3 max-h-[380px] overflow-y-auto">
            <div
              v-for="(issue, idx) in sortedTopIssues"
              :key="issue.title"
              :class="[
                'rounded-lg border p-3 transition-all',
                getIssueStyle(issue.impact).bg,
                getIssueStyle(issue.impact).border,
              ]"
            >
              <div class="flex items-start gap-3">
                <div
                  :class="[
                    'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                    getIssueStyle(issue.impact).iconBg,
                  ]"
                >
                  <component :is="getIssueStyle(issue.impact).icon" :class="['w-4 h-4', getIssueStyle(issue.impact).text]" />
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between gap-2">
                    <span class="font-mono text-sm font-semibold text-console-100 truncate">
                      {{ issue.title }}
                    </span>
                    <span
                      :class="[
                        'inline-flex items-center rounded px-2 py-0.5 text-[10px] font-mono font-bold border',
                        getIssueStyle(issue.impact).bg,
                        getIssueStyle(issue.impact).text,
                        getIssueStyle(issue.impact).border,
                      ]"
                    >
                      {{ issue.impact }}
                    </span>
                  </div>
                  <div class="mt-2 flex items-center gap-4 text-[11px] font-mono">
                    <span class="text-console-400">
                      发生次数:
                      <span :class="['font-bold tabular-nums', getIssueStyle(issue.impact).text]">
                        {{ issue.count }}
                      </span>
                    </span>
                    <span class="text-console-500">
                      排名 #{{ idx + 1 }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div v-if="sortedTopIssues.length === 0" class="py-12 text-center text-console-500 font-mono text-xs">
              暂无核心问题
            </div>
          </div>
        </div>
      </div>

      <div class="panel-border rounded-lg overflow-hidden">
        <div class="p-4 border-b border-console-500/20 flex items-center justify-between flex-wrap gap-2">
          <h3 class="font-mono text-sm font-semibold text-console-100 flex items-center gap-2">
            <span class="w-1 h-4 bg-harbor-green rounded-full" />
            班组月度综合评估
          </h3>
          <div class="flex items-center gap-3 text-[10px] font-mono">
            <span class="flex items-center gap-1 text-console-400">
              <span class="w-3 h-3 rounded bg-harbor-green/20 border border-harbor-green/40" />
              ≥80 优秀
            </span>
            <span class="flex items-center gap-1 text-console-400">
              <span class="w-3 h-3 rounded bg-harbor-yellow/20 border border-harbor-yellow/40" />
              60-79 合格
            </span>
            <span class="flex items-center gap-1 text-console-400">
              <span class="w-3 h-3 rounded bg-harbor-red/20 border border-harbor-red/40" />
              <60 待改进
            </span>
          </div>
        </div>
        <div class="overflow-auto">
          <table class="w-full text-xs font-mono">
            <thead>
              <tr class="bg-console-800 text-harbor-cyan">
                <th class="px-4 py-2.5 text-left font-semibold">排名</th>
                <th class="px-4 py-2.5 text-left font-semibold">班组名称</th>
                <th class="px-4 py-2.5 text-right font-semibold">完成作业</th>
                <th class="px-4 py-2.5 text-right font-semibold">货物处理量</th>
                <th class="px-4 py-2.5 text-right font-semibold">平均时长(h)</th>
                <th class="px-4 py-2.5 text-right font-semibold">延误率</th>
                <th class="px-4 py-2.5 text-right font-semibold">效率评分</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(team, idx) in reportData.teamMonthlySummary"
                :key="team.teamName"
                :class="[
                  'border-t border-console-500/20 transition-colors hover:bg-console-700/30',
                ]"
              >
                <td class="px-4 py-2.5">
                  <span
                    :class="[
                      'w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center border',
                      idx === 0 ? 'bg-harbor-yellow/20 text-harbor-yellow border-harbor-yellow/40' :
                      idx === 1 ? 'bg-console-300/20 text-console-200 border-console-400/40' :
                      idx === 2 ? 'bg-harbor-orange/20 text-harbor-orange border-harbor-orange/40' :
                      'bg-console-700/30 text-console-400 border-console-500/30',
                    ]"
                  >
                    {{ idx + 1 }}
                  </span>
                </td>
                <td class="px-4 py-2.5 text-console-100 font-medium">{{ team.teamName }}</td>
                <td class="px-4 py-2.5 text-right text-console-100 tabular-nums">{{ team.completedOperations }}</td>
                <td class="px-4 py-2.5 text-right text-console-200 tabular-nums">{{ team.totalCargoHandled.toLocaleString() }}</td>
                <td class="px-4 py-2.5 text-right text-console-200 tabular-nums">{{ team.avgOperationHours }}</td>
                <td class="px-4 py-2.5 text-right tabular-nums" :class="team.delayRate > 20 ? 'text-harbor-red' : team.delayRate > 10 ? 'text-harbor-orange' : 'text-harbor-green'">
                  {{ team.delayRate }}%
                </td>
                <td class="px-4 py-2.5 text-right tabular-nums">
                  <span
                    :class="[
                      'inline-flex items-center gap-2 px-2.5 py-1 rounded border font-bold',
                      getScoreClass(team.efficiencyScore),
                      getScoreBgClass(team.efficiencyScore),
                      `border-${team.efficiencyScore >= 80 ? 'harbor-green' : team.efficiencyScore >= 60 ? 'harbor-yellow' : 'harbor-red'}/40`,
                    ]"
                  >
                    <Gauge class="w-3 h-3" />
                    {{ team.efficiencyScore }}
                  </span>
                </td>
              </tr>
              <tr v-if="reportData.teamMonthlySummary.length === 0">
                <td colspan="7" class="px-4 py-8 text-center text-console-500">
                  暂无班组数据
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="panel-border rounded-lg overflow-hidden">
        <div class="p-4 border-b border-console-500/20">
          <h3 class="font-mono text-sm font-semibold text-console-100 flex items-center gap-2">
            <span class="w-1 h-4 bg-harbor-blue rounded-full" />
            泊位月度绩效总览
          </h3>
        </div>
        <div class="overflow-auto">
          <table class="w-full text-xs font-mono">
            <thead>
              <tr class="bg-console-800 text-harbor-cyan">
                <th class="px-4 py-2.5 text-left font-semibold">泊位名称</th>
                <th class="px-4 py-2.5 text-right font-semibold">利用率</th>
                <th class="px-4 py-2.5 text-right font-semibold">作业次数</th>
                <th class="px-4 py-2.5 text-right font-semibold">平均周转(h)</th>
                <th class="px-4 py-2.5 text-right font-semibold">冲突次数</th>
                <th class="px-4 py-2.5 text-left font-semibold">状态评级</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="berth in reportData.berthMonthlySummary"
                :key="berth.berthId"
                class="border-t border-console-500/20 hover:bg-console-700/30 transition-colors"
              >
                <td class="px-4 py-2.5 text-console-100">
                  <div class="flex items-center gap-2">
                    <Anchor class="w-3.5 h-3.5 text-harbor-cyan" />
                    <span class="font-medium">{{ berth.berthName }}</span>
                  </div>
                </td>
                <td class="px-4 py-2.5 text-right tabular-nums">
                  <div class="inline-flex items-center gap-2">
                    <div class="w-24 h-1.5 bg-console-700 rounded-full overflow-hidden">
                      <div
                        class="h-full rounded-full transition-all"
                        :class="berth.utilization >= 80 ? 'bg-harbor-green' : berth.utilization >= 50 ? 'bg-harbor-cyan' : berth.utilization >= 30 ? 'bg-harbor-orange' : 'bg-harbor-red'"
                        :style="{ width: `${berth.utilization}%`, boxShadow: `0 0 6px currentColor` }"
                      />
                    </div>
                    <span
                      :class="[
                        'font-semibold tabular-nums',
                        berth.utilization >= 80 ? 'text-harbor-green' : berth.utilization >= 50 ? 'text-harbor-cyan' : berth.utilization >= 30 ? 'text-harbor-orange' : 'text-harbor-red',
                      ]"
                    >
                      {{ berth.utilization }}%
                    </span>
                  </div>
                </td>
                <td class="px-4 py-2.5 text-right text-console-100 tabular-nums">{{ berth.operationsCount }}</td>
                <td class="px-4 py-2.5 text-right text-console-200 tabular-nums">{{ berth.avgTurnaroundHours }}</td>
                <td class="px-4 py-2.5 text-right tabular-nums" :class="berth.conflictCount > 0 ? 'text-harbor-red font-semibold' : 'text-console-300'">
                  {{ berth.conflictCount }}
                </td>
                <td class="px-4 py-2.5">
                  <span
                    :class="[
                      'inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-mono font-bold border',
                      berth.utilization >= 80 && berth.conflictCount === 0
                        ? 'bg-harbor-green/15 text-harbor-green border-harbor-green/40'
                        : berth.utilization >= 50
                        ? 'bg-harbor-cyan/15 text-harbor-cyan border-harbor-cyan/40'
                        : berth.utilization >= 30
                        ? 'bg-harbor-yellow/15 text-harbor-yellow border-harbor-yellow/40'
                        : 'bg-harbor-red/15 text-harbor-red border-harbor-red/40',
                    ]"
                  >
                    {{ berth.utilization >= 80 && berth.conflictCount === 0 ? '优秀' : berth.utilization >= 50 ? '良好' : berth.utilization >= 30 ? '一般' : '待改进' }}
                  </span>
                </td>
              </tr>
              <tr v-if="reportData.berthMonthlySummary.length === 0">
                <td colspan="6" class="px-4 py-8 text-center text-console-500">
                  暂无泊位数据
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </ReportLayout>
</template>
