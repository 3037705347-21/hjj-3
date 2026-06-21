<script setup lang="ts">
import { computed } from 'vue';
import { useScenarioStore } from '../../stores/scenario';
import { useScheduleStore } from '../../stores/schedule';
import {
  ArrowRight,
  Ship,
  Anchor,
  AlertTriangle,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  Users,
} from 'lucide-vue-next';

const props = defineProps<{
  scenarioId: string;
}>();

const scenarioStore = useScenarioStore();
const scheduleStore = useScheduleStore();

const scenario = computed(() => scenarioStore.getScenarioById(props.scenarioId));

const baselineMetrics = computed(() => {
  const schedules = scheduleStore.schedules;
  const ships = scheduleStore.ships;
  const berths = scheduleStore.sortedBerths;
  const conflicts = scheduleStore.conflicts;

  const totalHours = 24;
  let occupiedHours = 0;
  const now = Date.now();
  const dayStart = now;
  const dayEnd = now + 24 * 3600 * 1000;
  berths.forEach(() => {
    schedules.forEach((s) => {
      const start = Math.max(dayStart, new Date(s.eta).getTime());
      const end = Math.min(dayEnd, new Date(s.etd).getTime());
      if (end > start) {
        occupiedHours += (end - start) / 3600000;
      }
    });
  });
  const totalPossible = berths.length * totalHours || 1;
  const berthUtilization = Math.min(100, Math.round((occupiedHours / totalPossible) * 100));

  const currentTime = new Date();
  const waitingShips = schedules.filter(
    (s) => s.status === 'anchored' || s.status === 'approaching',
  );
  let totalMinutes = 0;
  let waitCount = 0;
  waitingShips.forEach((s) => {
    const eta = new Date(s.eta);
    if (eta < currentTime) {
      totalMinutes += (currentTime.getTime() - eta.getTime()) / 60000;
      waitCount++;
    }
  });
  const avgWaitingMinutes = waitCount > 0 ? Math.round(totalMinutes / waitCount) : 0;

  const errorConflicts = conflicts.filter((c) => c.severity === 'error');
  const warningConflicts = conflicts.filter((c) => c.severity === 'warning');

  return {
    totalShips: ships.length,
    totalBerths: berths.length,
    totalSchedules: schedules.length,
    conflictCount: errorConflicts.length,
    warningCount: warningConflicts.length,
    berthUtilization,
    avgWaitingMinutes,
  };
});

const scenarioMetrics = computed(() => {
  if (!scenario.value?.resultSummary) {
    return null;
  }
  return scenario.value.resultSummary;
});

const metricDiffs = computed(() => {
  if (!scenarioMetrics.value) return null;
  const base = baselineMetrics.value;
  const sc = scenarioMetrics.value;

  return {
    totalSchedules: sc.totalSchedules - base.totalSchedules,
    conflictCount: sc.conflictCount - base.conflictCount,
    warningCount: sc.warningCount - base.warningCount,
    berthUtilization: sc.berthUtilization - base.berthUtilization,
    avgWaitingMinutes: sc.avgWaitingMinutes - base.avgWaitingMinutes,
    changedScheduleCount: sc.changedScheduleCount,
    addedScheduleCount: sc.addedScheduleCount,
    deletedScheduleCount: sc.deletedScheduleCount,
  };
});

function getDiffClass(value: number, isBetterWhenLower = false) {
  if (value === 0) return 'text-console-400';
  const improved = isBetterWhenLower ? value < 0 : value > 0;
  return improved ? 'text-harbor-green' : 'text-harbor-red';
}

function getDiffIcon(value: number, isBetterWhenLower = false) {
  if (value === 0) return Minus;
  const improved = isBetterWhenLower ? value < 0 : value > 0;
  return improved ? TrendingUp : TrendingDown;
}
</script>

<template>
  <div class="bg-console-800/50 rounded-xl border border-console-500/30 overflow-hidden">
    <div class="px-4 py-3 border-b border-console-500/30">
      <div class="flex items-center gap-2">
        <BarChart3 class="w-5 h-5 text-harbor-cyan" />
        <h3 class="text-sm font-semibold text-console-100">方案对比</h3>
      </div>
    </div>

    <div class="p-4">
      <div class="grid grid-cols-3 gap-4 mb-4">
        <div class="text-center">
          <div class="text-xs text-console-400 mb-1">当前正式计划</div>
          <div class="text-sm font-medium text-console-200">基准方案</div>
        </div>
        <div class="flex items-center justify-center">
          <ArrowRight class="w-5 h-5 text-console-500" />
        </div>
        <div class="text-center">
          <div class="text-xs text-console-400 mb-1">推演场景</div>
          <div class="text-sm font-medium text-harbor-purple">推演方案</div>
        </div>
      </div>

      <div class="space-y-3">
        <div class="flex items-center justify-between py-2 border-b border-console-500/20">
          <div class="flex items-center gap-2">
            <Ship class="w-4 h-4 text-console-400" />
            <span class="text-sm text-console-300">调度计划数</span>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-sm text-console-200 w-12 text-right">{{ baselineMetrics.totalSchedules }}</span>
            <span v-if="metricDiffs" class="text-sm text-console-200 w-12 text-right">{{ scenarioMetrics?.totalSchedules }}</span>
            <span v-if="metricDiffs" :class="['text-xs w-14 text-right flex items-center justify-end gap-0.5', getDiffClass(metricDiffs.totalSchedules)]">
              <component :is="getDiffIcon(metricDiffs.totalSchedules)" class="w-3 h-3" />
              {{ metricDiffs.totalSchedules > 0 ? '+' : '' }}{{ metricDiffs.totalSchedules }}
            </span>
          </div>
        </div>

        <div class="flex items-center justify-between py-2 border-b border-console-500/20">
          <div class="flex items-center gap-2">
            <AlertTriangle class="w-4 h-4 text-harbor-red" />
            <span class="text-sm text-console-300">冲突数</span>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-sm text-console-200 w-12 text-right">{{ baselineMetrics.conflictCount }}</span>
            <span v-if="metricDiffs" class="text-sm text-console-200 w-12 text-right">{{ scenarioMetrics?.conflictCount }}</span>
            <span v-if="metricDiffs" :class="['text-xs w-14 text-right flex items-center justify-end gap-0.5', getDiffClass(metricDiffs.conflictCount, true)]">
              <component :is="getDiffIcon(metricDiffs.conflictCount, true)" class="w-3 h-3" />
              {{ metricDiffs.conflictCount > 0 ? '+' : '' }}{{ metricDiffs.conflictCount }}
            </span>
          </div>
        </div>

        <div class="flex items-center justify-between py-2 border-b border-console-500/20">
          <div class="flex items-center gap-2">
            <Clock class="w-4 h-4 text-harbor-yellow" />
            <span class="text-sm text-console-300">告警数</span>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-sm text-console-200 w-12 text-right">{{ baselineMetrics.warningCount }}</span>
            <span v-if="metricDiffs" class="text-sm text-console-200 w-12 text-right">{{ scenarioMetrics?.warningCount }}</span>
            <span v-if="metricDiffs" :class="['text-xs w-14 text-right flex items-center justify-end gap-0.5', getDiffClass(metricDiffs.warningCount, true)]">
              <component :is="getDiffIcon(metricDiffs.warningCount, true)" class="w-3 h-3" />
              {{ metricDiffs.warningCount > 0 ? '+' : '' }}{{ metricDiffs.warningCount }}
            </span>
          </div>
        </div>

        <div class="flex items-center justify-between py-2 border-b border-console-500/20">
          <div class="flex items-center gap-2">
            <Anchor class="w-4 h-4 text-console-400" />
            <span class="text-sm text-console-300">泊位利用率</span>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-sm text-console-200 w-12 text-right">{{ baselineMetrics.berthUtilization }}%</span>
            <span v-if="metricDiffs" class="text-sm text-console-200 w-12 text-right">{{ scenarioMetrics?.berthUtilization }}%</span>
            <span v-if="metricDiffs" :class="['text-xs w-14 text-right flex items-center justify-end gap-0.5', getDiffClass(metricDiffs.berthUtilization)]">
              <component :is="getDiffIcon(metricDiffs.berthUtilization)" class="w-3 h-3" />
              {{ metricDiffs.berthUtilization > 0 ? '+' : '' }}{{ metricDiffs.berthUtilization }}%
            </span>
          </div>
        </div>

        <div class="flex items-center justify-between py-2 border-b border-console-500/20">
          <div class="flex items-center gap-2">
            <Clock class="w-4 h-4 text-console-400" />
            <span class="text-sm text-console-300">平均等待时间</span>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-sm text-console-200 w-12 text-right">{{ baselineMetrics.avgWaitingMinutes }}分</span>
            <span v-if="metricDiffs" class="text-sm text-console-200 w-12 text-right">{{ scenarioMetrics?.avgWaitingMinutes }}分</span>
            <span v-if="metricDiffs" :class="['text-xs w-14 text-right flex items-center justify-end gap-0.5', getDiffClass(metricDiffs.avgWaitingMinutes, true)]">
              <component :is="getDiffIcon(metricDiffs.avgWaitingMinutes, true)" class="w-3 h-3" />
              {{ metricDiffs.avgWaitingMinutes > 0 ? '+' : '' }}{{ metricDiffs.avgWaitingMinutes }}分
            </span>
          </div>
        </div>
      </div>

      <div v-if="metricDiffs" class="mt-4 pt-4 border-t border-console-500/30">
        <div class="text-xs text-console-400 mb-3">变更统计</div>
        <div class="grid grid-cols-3 gap-2">
          <div class="text-center p-2 bg-console-900/50 rounded-lg">
            <div class="text-lg font-semibold text-harbor-green">{{ metricDiffs.addedScheduleCount }}</div>
            <div class="text-xs text-console-400">新增计划</div>
          </div>
          <div class="text-center p-2 bg-console-900/50 rounded-lg">
            <div class="text-lg font-semibold text-harbor-blue">{{ metricDiffs.changedScheduleCount }}</div>
            <div class="text-xs text-console-400">调整计划</div>
          </div>
          <div class="text-center p-2 bg-console-900/50 rounded-lg">
            <div class="text-lg font-semibold text-harbor-red">{{ metricDiffs.deletedScheduleCount }}</div>
            <div class="text-xs text-console-400">删除计划</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
