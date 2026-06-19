<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import ReportLayout from '@/components/report/ReportLayout.vue';
import ReportFilterBar from '@/components/report/ReportFilterBar.vue';
import ReportMetricCard from '@/components/report/ReportMetricCard.vue';
import { PieChart as DonutChart, BarChart, LineChart } from '@/components/report/ReportCharts.vue';
import PriorityBadge from '@/components/common/PriorityBadge.vue';
import type { ReportFilterCriteria, DailyReportData, KeyShipRecord } from '@/types';
import { calculateDailyReport, CORE_METRIC_LABELS, CORE_METRIC_UNITS } from '@/utils/analytics';
import { ABNORMAL_REASON_CATEGORY_LABELS } from '@/types';
import { ChevronLeft, ChevronRight, CalendarDays, Download, Ship, Clock, Activity, Target, AlertTriangle, Boxes, Repeat, Gauge, CheckCircle2, XCircle, Clock3 } from 'lucide-vue-next';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const ABNORMAL_COLORS: Record<string, string> = {
  weather: '#ef4444',
  equipment_failure: '#f59e0b',
  tide_window: '#3b82f6',
  ship_delay: '#8b5cf6',
  labor_shortage: '#ec4899',
  cargo_issue: '#eab308',
  berth_maintenance: '#64748b',
  other: '#06b6d4',
};

const selectedDate = ref(new Date());
const filterCriteria = ref<ReportFilterCriteria>({
  startDate: null,
  endDate: null,
  berthIds: [],
  cargoTypes: [],
  priorities: [],
  operationTeams: [],
});

const reportData = ref<DailyReportData>(calculateDailyReport(selectedDate.value, filterCriteria.value));

watch(
  [selectedDate, filterCriteria],
  () => {
    reportData.value = calculateDailyReport(selectedDate.value, filterCriteria.value);
  },
  { deep: true },
);

const dateDisplay = computed(() => format(selectedDate.value, 'yyyy年MM月dd日 EEEE', { locale: zhCN }));

const donutChartData = computed(() =>
  reportData.value.abnormalReasons.map((r) => ({
    label: ABNORMAL_REASON_CATEGORY_LABELS[r.category],
    value: r.count,
    color: ABNORMAL_COLORS[r.category] || '#64748b',
  })),
);

function goPrevDay() {
  const d = new Date(selectedDate.value);
  d.setDate(d.getDate() - 1);
  selectedDate.value = d;
}

function goNextDay() {
  const d = new Date(selectedDate.value);
  d.setDate(d.getDate() + 1);
  selectedDate.value = d;
}

function setToday() {
  selectedDate.value = new Date();
}

const metricConfigs = computed(() => {
  const m = reportData.value.metrics;
  return [
    { key: 'shipsInPort', label: CORE_METRIC_LABELS.shipsInPort, value: m.shipsInPort, icon: Ship, color: 'text-harbor-cyan', progressDenominator: 20 },
    { key: 'shipsWaiting', label: CORE_METRIC_LABELS.shipsWaiting, value: m.shipsWaiting, icon: Clock, color: 'text-harbor-orange', progressDenominator: 15 },
    { key: 'avgWaitingMinutes', label: CORE_METRIC_LABELS.avgWaitingMinutes, value: m.avgWaitingMinutes, icon: Clock3, color: 'text-harbor-blue', suffix: CORE_METRIC_UNITS.avgWaitingMinutes, progressDenominator: 240 },
    { key: 'berthUtilization', label: CORE_METRIC_LABELS.berthUtilization, value: m.berthUtilization, icon: Activity, color: 'text-harbor-purple', suffix: CORE_METRIC_UNITS.berthUtilization, progressDenominator: 100 },
    { key: 'planFulfillmentRate', label: CORE_METRIC_LABELS.planFulfillmentRate, value: m.planFulfillmentRate, icon: Target, color: 'text-harbor-green', suffix: CORE_METRIC_UNITS.planFulfillmentRate, progressDenominator: 100 },
    { key: 'conflictCount', label: CORE_METRIC_LABELS.conflictCount, value: m.conflictCount, icon: AlertTriangle, color: 'text-harbor-red', progressDenominator: 10 },
    { key: 'todayOperations', label: CORE_METRIC_LABELS.todayOperations, value: m.todayOperations, icon: Boxes, color: 'text-harbor-yellow', progressDenominator: 15 },
    { key: 'todayDeparted', label: CORE_METRIC_LABELS.todayDeparted, value: m.todayDeparted, icon: CheckCircle2, color: 'text-harbor-green', progressDenominator: 10 },
    { key: 'turnoverRate', label: CORE_METRIC_LABELS.turnoverRate, value: m.turnoverRate, icon: Repeat, color: 'text-harbor-cyan', suffix: CORE_METRIC_UNITS.turnoverRate, progressDenominator: 100 },
  ];
});

const maxTeamScore = computed(() => {
  if (reportData.value.teamEfficiencies.length === 0) return 0;
  return Math.max(...reportData.value.teamEfficiencies.map((t) => t.efficiencyScore));
});

const maxBerthUtil = computed(() => {
  if (reportData.value.berthPerformances.length === 0) return 0;
  return Math.max(...reportData.value.berthPerformances.map((b) => b.utilization));
});

function formatTime(date?: Date): string {
  if (!date) return '-';
  return format(date, 'MM-dd HH:mm', { locale: zhCN });
}

function getGuaranteeBadge(status: KeyShipRecord['guaranteeStatus']) {
  switch (status) {
    case 'guaranteed':
      return { label: '已保障', bg: 'bg-harbor-green/20', text: 'text-harbor-green', border: 'border-harbor-green/40', icon: CheckCircle2 };
    case 'delayed':
      return { label: '已延误', bg: 'bg-harbor-red/20', text: 'text-harbor-red', border: 'border-harbor-red/40', icon: XCircle };
    case 'pending':
    default:
      return { label: '待确认', bg: 'bg-harbor-yellow/20', text: 'text-harbor-yellow', border: 'border-harbor-yellow/40', icon: Clock3 };
  }
}

function exportSnapshot() {
  const snapshot = {
    exportTime: new Date().toISOString(),
    reportDate: selectedDate.value.toISOString(),
    filterCriteria: filterCriteria.value,
    data: reportData.value,
  };
  const json = JSON.stringify(snapshot, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `daily-report-${format(selectedDate.value, 'yyyyMMdd')}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
</script>

<template>
  <ReportLayout title="经营日报" subtitle="每日运营核心指标汇总">
    <div class="space-y-4">
      <div class="flex flex-wrap items-center gap-3">
        <div class="flex items-center gap-2 panel-border rounded-lg px-3 py-2">
          <button
            @click="goPrevDay"
            class="w-8 h-8 rounded bg-console-700/50 border border-console-500/40 flex items-center justify-center text-console-300 hover:text-harbor-cyan hover:border-harbor-cyan/50 transition-all"
          >
            <ChevronLeft class="w-4 h-4" />
          </button>

          <div class="flex items-center gap-2 px-2">
            <CalendarDays class="w-4 h-4 text-harbor-cyan" />
            <input
              v-model="selectedDate"
              type="date"
              class="bg-transparent text-sm font-mono text-console-100 outline-none cursor-pointer"
            />
            <button
              @click="setToday"
              class="text-[10px] font-mono px-2 py-0.5 rounded bg-harbor-cyan/15 text-harbor-cyan border border-harbor-cyan/30 hover:bg-harbor-cyan/25 transition-all"
            >
              今天
            </button>
            <span class="text-xs font-mono text-console-400 hidden md:inline">
              {{ dateDisplay }}
            </span>
          </div>

          <button
            @click="goNextDay"
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
          导出当日快照
        </button>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
        <ReportMetricCard
          v-for="cfg in metricConfigs"
          :key="cfg.key"
          :label="cfg.label"
          :value="cfg.value"
          :icon="cfg.icon"
          :color="cfg.color"
          :suffix="cfg.suffix"
          :progress-denominator="cfg.progressDenominator"
        />
      </div>

      <div class="grid grid-cols-12 gap-4">
        <div class="col-span-12 lg:col-span-6 panel-border rounded-lg p-4">
          <h3 class="font-mono text-sm font-semibold text-console-100 mb-4 flex items-center gap-2">
            <span class="w-1 h-4 bg-harbor-purple rounded-full" />
            异常原因分布
          </h3>
          <DonutChart
            :data="donutChartData"
            :size="220"
            :donut="true"
          />
        </div>

        <div class="col-span-12 lg:col-span-6 panel-border rounded-lg overflow-hidden">
          <div class="p-4 border-b border-console-500/20">
            <h3 class="font-mono text-sm font-semibold text-console-100 flex items-center gap-2">
              <span class="w-1 h-4 bg-harbor-orange rounded-full" />
              班组效率排行
            </h3>
          </div>
          <div class="overflow-auto max-h-[340px]">
            <table class="w-full text-xs font-mono">
              <thead class="sticky top-0 z-10">
                <tr class="bg-console-800 text-harbor-cyan">
                  <th class="px-4 py-2.5 text-left font-semibold">班组名称</th>
                  <th class="px-4 py-2.5 text-right font-semibold">完成作业</th>
                  <th class="px-4 py-2.5 text-right font-semibold">平均时长(h)</th>
                  <th class="px-4 py-2.5 text-right font-semibold">延误率</th>
                  <th class="px-4 py-2.5 text-right font-semibold">效率评分</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(team, idx) in reportData.teamEfficiencies"
                  :key="team.teamName"
                  :class="[
                    'border-t border-console-500/20 transition-colors',
                    team.efficiencyScore === maxTeamScore && maxTeamScore > 0
                      ? 'bg-harbor-cyan/10'
                      : 'hover:bg-console-700/30',
                  ]"
                >
                  <td class="px-4 py-2.5 text-console-100 flex items-center gap-2">
                    <span
                      :class="[
                        'w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center',
                        idx === 0 ? 'bg-harbor-yellow/20 text-harbor-yellow border border-harbor-yellow/40' :
                        idx === 1 ? 'bg-console-300/20 text-console-200 border border-console-400/40' :
                        idx === 2 ? 'bg-harbor-orange/20 text-harbor-orange border border-harbor-orange/40' :
                        'bg-console-700/30 text-console-400 border border-console-500/30',
                      ]"
                    >
                      {{ idx + 1 }}
                    </span>
                    {{ team.teamName }}
                  </td>
                  <td class="px-4 py-2.5 text-right text-console-100 tabular-nums">{{ team.completedOperations }}</td>
                  <td class="px-4 py-2.5 text-right text-console-200 tabular-nums">{{ team.avgOperationHours }}</td>
                  <td class="px-4 py-2.5 text-right tabular-nums" :class="team.delayRate > 20 ? 'text-harbor-red' : team.delayRate > 10 ? 'text-harbor-orange' : 'text-harbor-green'">
                    {{ team.delayRate }}%
                  </td>
                  <td class="px-4 py-2.5 text-right tabular-nums">
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
                <tr v-if="reportData.teamEfficiencies.length === 0">
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
            <span class="w-1 h-4 bg-harbor-cyan rounded-full" />
            泊位绩效
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
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="berth in reportData.berthPerformances"
                :key="berth.berthId"
                :class="[
                  'border-t border-console-500/20 transition-colors',
                  berth.utilization === maxBerthUtil && maxBerthUtil > 0
                    ? 'bg-harbor-green/10'
                    : 'hover:bg-console-700/30',
                ]"
              >
                <td class="px-4 py-2.5 text-console-100">{{ berth.berthName }}</td>
                <td class="px-4 py-2.5 text-right tabular-nums">
                  <div class="inline-flex items-center gap-2">
                    <div class="w-20 h-1.5 bg-console-700 rounded-full overflow-hidden">
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
              <tr v-if="reportData.berthPerformances.length === 0">
                <td colspan="5" class="px-4 py-8 text-center text-console-500">
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
            重点船舶保障情况
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
                v-for="ship in reportData.keyShips"
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
              <tr v-if="reportData.keyShips.length === 0">
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
