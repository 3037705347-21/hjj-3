<script setup lang="ts">
import { ref, computed } from 'vue';
import {
  GripVertical,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Wrench,
  Camera,
} from 'lucide-vue-next';
import type {
  Ship,
  Berth,
  BerthSchedule,
  TideRecord,
  ScheduleConflict,
  BerthMaintenancePeriod,
} from '../../types';
import ScenarioTimelineShipBlock from '../scenario/ScenarioTimelineShipBlock.vue';
import { useConflictDetection } from '../../composables/useConflictDetection';
import { format, addHours, startOfHour, differenceInMinutes } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const props = defineProps<{
  snapshotTime: Date;
  ships: Ship[];
  berths: Berth[];
  schedules: BerthSchedule[];
  tides: TideRecord[];
  conflicts: ScheduleConflict[];
  maintenancePeriods: BerthMaintenancePeriod[];
}>();

const { detectAllConflicts } = useConflictDetection();

const timelineRef = ref<HTMLElement | null>(null);

const headerHeight = 56;
const rowHeight = 56;
const berthLabelWidth = 140;
const initialPixelPerHour = 50;
const pixelPerHour = ref(initialPixelPerHour);
const totalHours = ref(48);

const startTime = computed(() => startOfHour(addHours(props.snapshotTime, -12)));

const snapshotTimeX = computed(() => {
  const hours = (props.snapshotTime.getTime() - startTime.value.getTime()) / 3600000;
  return berthLabelWidth + hours * pixelPerHour.value;
});

const sortedBerths = computed(() =>
  [...props.berths].sort((a, b) => a.position - b.position),
);

function getBerthZoneColor(berthId: string): string {
  const berth = props.berths.find((b) => b.id === berthId);
  if (!berth) return 'border-console-400/30';
  const primaryCargo = berth.allowedCargo[0];
  const colorMap: Record<string, string> = {
    container: 'border-harbor-cyan/30',
    bulk: 'border-amber-400/30',
    liquid: 'border-blue-400/30',
    general: 'border-console-400/30',
    'ro-ro': 'border-harbor-orange/30',
  };
  return colorMap[primaryCargo] || 'border-console-400/30';
}

const showConflictPanel = ref(false);

function getPixelPerHour() {
  return pixelPerHour.value;
}

const timeMarkers = computed(() => {
  const markers: { time: Date; major: boolean }[] = [];
  for (let h = 0; h <= totalHours.value; h += 2) {
    const time = addHours(startTime.value, h);
    markers.push({ time, major: h % 12 === 0 });
  }
  return markers;
});

const conflictStats = computed(() => {
  const all = detectAllConflicts(
    props.schedules,
    props.ships,
    props.berths,
    props.tides,
    props.maintenancePeriods.filter((m) => m.status === 'planned' || m.status === 'in_progress'),
  );

  const scheduleConflicts: Record<string, typeof all> = {};
  const errorCounts: Record<string, number> = {};
  const warningCounts: Record<string, number> = {};
  let totalErrors = 0;
  let totalWarnings = 0;

  all.forEach((c) => {
    if (c.severity === 'error') totalErrors++;
    else totalWarnings++;

    if (!scheduleConflicts[c.scheduleId]) {
      scheduleConflicts[c.scheduleId] = [];
      errorCounts[c.scheduleId] = 0;
      warningCounts[c.scheduleId] = 0;
    }
    scheduleConflicts[c.scheduleId].push(c);
    if (c.severity === 'error') {
      errorCounts[c.scheduleId]++;
    } else {
      warningCounts[c.scheduleId]++;
    }

    if (c.relatedScheduleId) {
      if (!scheduleConflicts[c.relatedScheduleId]) {
        scheduleConflicts[c.relatedScheduleId] = [];
        errorCounts[c.relatedScheduleId] = 0;
        warningCounts[c.relatedScheduleId] = 0;
      }
      scheduleConflicts[c.relatedScheduleId].push(c);
      if (c.severity === 'error') {
        errorCounts[c.relatedScheduleId]++;
      } else {
        warningCounts[c.relatedScheduleId]++;
      }
    }
  });

  return {
    scheduleConflicts,
    errorCounts,
    warningCounts,
    totalErrors,
    totalWarnings,
  };
});

const conflictsBySchedule = computed(() => conflictStats.value.scheduleConflicts);

const groupedConflicts = computed(() => {
  const all = conflictStats.value.scheduleConflicts;
  const byShip: Array<{
    shipName: string;
    scheduleId: string;
    berthName: string;
    errors: ScheduleConflict[];
    warnings: ScheduleConflict[];
  }> = [];
  const seen = new Set<string>();

  Object.keys(all).forEach((scheduleId) => {
    if (seen.has(scheduleId)) return;
    seen.add(scheduleId);
    const schedule = props.schedules.find((s) => s.id === scheduleId);
    if (!schedule) return;
    const ship = props.ships.find((s) => s.id === schedule.shipId);
    const berth = props.berths.find((b) => b.id === schedule.berthId);
    const shipConflicts = all[scheduleId] || [];
    byShip.push({
      shipName: ship?.name || schedule.shipId,
      scheduleId,
      berthName: berth?.name || schedule.berthId,
      errors: shipConflicts.filter((x) => x.severity === 'error'),
      warnings: shipConflicts.filter((x) => x.severity === 'warning'),
    });
  });

  byShip.sort((a, b) => b.errors.length - a.errors.length || b.warnings.length - a.warnings.length);
  return byShip;
});

function getShipById(shipId: string): Ship | undefined {
  return props.ships.find((s) => s.id === shipId);
}

function getBerthById(berthId: string): Berth | undefined {
  return props.berths.find((b) => b.id === berthId);
}

function getBlockPosition(scheduleId: string, berthId: string, eta: Date, etd: Date) {
  const berthIndex = sortedBerths.value.findIndex((b) => b.id === berthId);
  if (berthIndex === -1) return null;

  const pph = getPixelPerHour();
  const startMinutes = differenceInMinutes(eta, startTime.value) / 60;
  const durationMinutes = differenceInMinutes(etd, eta) / 60;

  return {
    left: berthLabelWidth + startMinutes * pph,
    width: Math.max(40, durationMinutes * pph),
    top: headerHeight + berthIndex * rowHeight + 4,
    height: rowHeight - 8,
  };
}

function getMaintenanceBlockPosition(berthId: string, maintStart: Date, maintEnd: Date) {
  const berthIndex = sortedBerths.value.findIndex((b) => b.id === berthId);
  if (berthIndex === -1) return null;

  const pph = getPixelPerHour();
  const startMinutes = differenceInMinutes(maintStart, startTime.value) / 60;
  const durationMinutes = differenceInMinutes(maintEnd, maintStart) / 60;

  return {
    left: berthLabelWidth + startMinutes * pph,
    width: Math.max(20, durationMinutes * pph),
    top: headerHeight + berthIndex * rowHeight + 4,
    height: rowHeight - 8,
  };
}

const conflictTypeLabels: Record<string, string> = {
  time_overlap: '时间冲突',
  draft_exceed: '吃水超限',
  length_exceed: '船长超限',
  cargo_mismatch: '货种不匹配',
  tide_window: '潮汐窗口',
  berth_maintenance: '泊位维护',
  buffer_time_insufficient: '缓冲不足',
  team_conflict: '班组冲突',
  dangerous_cargo_isolation: '危货隔离',
  night_operation_limit: '夜间限制',
};

const activeMaintenancePeriods = computed(() =>
  props.maintenancePeriods.filter((m) => m.status === 'planned' || m.status === 'in_progress'),
);
</script>

<template>
  <div class="panel-border rounded-lg overflow-hidden">
    <div class="flex items-center justify-between px-4 py-3 border-b border-console-500/30">
      <div class="flex items-center gap-3">
        <GripVertical class="w-4 h-4 text-console-300" />
        <h3 class="font-mono text-sm font-semibold text-console-100 tracking-wide flex items-center gap-2">
          <Camera class="w-4 h-4 text-harbor-cyan" />
          历史时间轴复盘视图
        </h3>
        <span class="text-[10px] font-mono text-console-300">
          只读快照 · 基准时间 {{ format(snapshotTime, 'yyyy-MM-dd HH:mm', { locale: zhCN }) }}
        </span>
      </div>
      <div class="flex items-center gap-2">
        <span class="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono text-harbor-cyan bg-harbor-cyan/15 border border-harbor-cyan/30 rounded">
          <Camera class="w-3.5 h-3.5" />
          只读模式
        </span>
        <button
          v-if="conflictStats.totalErrors > 0 || conflictStats.totalWarnings > 0"
          @click="showConflictPanel = !showConflictPanel"
          class="flex items-center gap-2 px-2.5 py-1 rounded border transition-all hover:brightness-110"
          :class="[
            conflictStats.totalErrors > 0
              ? 'bg-harbor-red/20 border-harbor-red/40'
              : 'bg-harbor-yellow/20 border-harbor-yellow/40',
          ]"
        >
          <AlertTriangle
            class="w-3 h-3"
            :class="conflictStats.totalErrors > 0 ? 'text-harbor-red' : 'text-harbor-yellow'"
          />
          <span
            class="text-[11px] font-mono font-medium"
            :class="conflictStats.totalErrors > 0 ? 'text-harbor-red' : 'text-harbor-yellow'"
          >
            <span v-if="conflictStats.totalErrors > 0">{{ conflictStats.totalErrors }} 错误</span>
            <span v-if="conflictStats.totalErrors > 0 && conflictStats.totalWarnings > 0"> / </span>
            <span v-if="conflictStats.totalWarnings > 0">{{ conflictStats.totalWarnings }} 预警</span>
          </span>
          <component
            :is="showConflictPanel ? ChevronUp : ChevronDown"
            class="w-3 h-3"
            :class="conflictStats.totalErrors > 0 ? 'text-harbor-red' : 'text-harbor-yellow'"
          />
        </button>
        <span
          v-if="activeMaintenancePeriods.length > 0"
          class="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono text-harbor-orange bg-harbor-orange/15 border border-harbor-orange/30 rounded"
        >
          <Wrench class="w-3.5 h-3.5" />
          维护 {{ activeMaintenancePeriods.length }}
        </span>
      </div>
    </div>

    <Transition name="slide-down">
      <div
        v-if="showConflictPanel && groupedConflicts.length > 0"
        class="border-b border-console-500/30 bg-console-800/50 max-h-80 overflow-y-auto"
      >
        <div class="px-4 py-3 space-y-3">
          <div class="flex items-center gap-2">
            <AlertTriangle class="w-4 h-4 text-harbor-red" />
            <h4 class="font-mono text-xs font-semibold text-console-100">
              冲突与违规提示（点击船舶定位详情）
            </h4>
            <span class="ml-auto text-[10px] font-mono text-console-400">
              共 {{ groupedConflicts.length }} 艘船舶存在问题
            </span>
          </div>

          <div
            v-for="group in groupedConflicts"
            :key="group.scheduleId"
            class="rounded-lg border overflow-hidden"
            :class="
              group.errors.length > 0
                ? 'border-harbor-red/30 bg-harbor-red/5'
                : 'border-harbor-yellow/30 bg-harbor-yellow/5'
            "
          >
            <div
              class="flex items-center gap-2 px-3 py-2 border-b"
              :class="
                group.errors.length > 0
                  ? 'border-harbor-red/20 bg-harbor-red/5'
                  : 'border-harbor-yellow/20 bg-harbor-yellow/5'
              "
            >
              <span class="text-xs font-mono font-semibold text-console-100">
                {{ group.shipName }}
              </span>
              <span class="text-[10px] font-mono text-console-400">
                @ {{ group.berthName }}
              </span>
              <div class="ml-auto flex items-center gap-1.5">
                <span
                  v-if="group.errors.length > 0"
                  class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-harbor-red/20 text-harbor-red border border-harbor-red/40"
                >
                  {{ group.errors.length }} 错误
                </span>
                <span
                  v-if="group.warnings.length > 0"
                  class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-harbor-yellow/20 text-harbor-yellow border border-harbor-yellow/40"
                >
                  {{ group.warnings.length }} 预警
                </span>
              </div>
            </div>
            <div class="px-3 py-2 space-y-1.5">
              <div
                v-for="conflict in group.errors"
                :key="'err-' + conflict.id"
                class="flex items-start gap-2"
              >
                <AlertCircle class="w-3 h-3 text-harbor-red mt-0.5 flex-shrink-0" />
                <div class="min-w-0">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="text-[9px] font-mono px-1.5 py-0.5 rounded bg-harbor-red/20 text-harbor-red">
                      {{ conflictTypeLabels[conflict.type] || conflict.type }}
                    </span>
                  </div>
                  <p class="text-[11px] font-mono text-console-200 mt-0.5 leading-relaxed">
                    {{ conflict.message }}
                  </p>
                </div>
              </div>
              <div
                v-for="conflict in group.warnings"
                :key="'warn-' + conflict.id"
                class="flex items-start gap-2"
              >
                <AlertCircle class="w-3 h-3 text-harbor-yellow mt-0.5 flex-shrink-0" />
                <div class="min-w-0">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="text-[9px] font-mono px-1.5 py-0.5 rounded bg-harbor-yellow/20 text-harbor-yellow">
                      {{ conflictTypeLabels[conflict.type] || conflict.type }}
                    </span>
                  </div>
                  <p class="text-[11px] font-mono text-console-200 mt-0.5 leading-relaxed">
                    {{ conflict.message }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <div
      ref="timelineRef"
      class="relative overflow-x-auto console-grid-bg"
      :style="{ minHeight: `${headerHeight + sortedBerths.length * rowHeight}px` }"
    >
      <div
        class="absolute top-0 left-0 flex bg-console-800/80 border-b border-console-500/40 z-10"
        :style="{ height: `${headerHeight}px`, width: `${berthLabelWidth + totalHours * getPixelPerHour()}px` }"
      >
        <div
          class="flex items-center px-3 border-r border-console-500/40"
          :style="{ width: `${berthLabelWidth}px` }"
        >
          <span class="text-[10px] font-mono text-console-400 tracking-wider">泊位 / 时间</span>
        </div>
        <div class="flex flex-1">
          <div
            v-for="marker in timeMarkers"
            :key="marker.time.getTime()"
            class="border-r border-console-500/30 flex flex-col justify-center pl-1"
            :style="{
              width: `${2 * getPixelPerHour()}px`,
              borderLeftWidth: marker.major ? '1px' : '0px',
              borderLeftStyle: 'solid',
              borderLeftColor: marker.major ? 'rgba(100,116,139,0.3)' : 'transparent',
            }"
          >
            <span
              :class="[
                'font-mono font-semibold',
                marker.major ? 'text-sm text-console-100' : 'text-[10px] text-console-400',
              ]"
            >
              {{ format(marker.time, 'HH:mm', { locale: zhCN }) }}
            </span>
            <span v-if="marker.major" class="text-[9px] font-mono text-console-500">
              {{ format(marker.time, 'MM-dd', { locale: zhCN }) }}
            </span>
          </div>
        </div>
      </div>

      <div
        class="absolute z-20 pointer-events-none border-r-2 border-harbor-cyan/80"
        :style="{
          left: `${snapshotTimeX}px`,
          top: '0px',
          bottom: '0px',
          display: snapshotTimeX > berthLabelWidth && snapshotTimeX < berthLabelWidth + totalHours * getPixelPerHour() ? 'block' : 'none',
        }"
      >
        <div class="absolute -top-5 -left-10 bg-harbor-cyan text-console-900 text-[10px] font-mono font-bold px-2 py-0.5 rounded whitespace-nowrap flex items-center gap-1">
          <Camera class="w-3 h-3" />
          {{ format(snapshotTime, 'HH:mm', { locale: zhCN }) }}
        </div>
        <div class="absolute -left-[3px] -top-[1px] w-1.5 h-1.5 rounded-full bg-harbor-cyan border border-console-800" />
      </div>

      <div
        class="absolute left-0 bg-console-800/50 z-[5]"
        :style="{
          top: `${headerHeight}px`,
          width: `${berthLabelWidth}px`,
        }"
      >
        <div
          v-for="(berth, index) in sortedBerths"
          :key="berth.id"
          :class="[
            'flex items-center px-3 border-r border-b border-console-500/30',
            getBerthZoneColor(berth.id),
            index % 2 === 0 ? 'bg-console-800/30' : 'bg-console-800/60',
          ]"
          :style="{ height: `${rowHeight}px` }"
        >
          <div class="min-w-0">
            <div class="text-[11px] font-mono font-semibold text-console-100 truncate">
              {{ berth.name }}
            </div>
            <div class="text-[9px] font-mono text-console-500">
              D{{ berth.maxDraft }}m · L{{ berth.length }}m
            </div>
          </div>
        </div>
      </div>

      <div
        class="absolute"
        :style="{
          top: `${headerHeight}px`,
          left: `${berthLabelWidth}px`,
          width: `${totalHours * getPixelPerHour()}px`,
        }"
      >
        <svg
          class="absolute top-0 left-0 pointer-events-none"
          :width="totalHours * getPixelPerHour()"
          :height="sortedBerths.length * rowHeight"
        >
          <defs>
            <pattern
              id="grid-hours-snapshot"
              :width="getPixelPerHour()"
              :height="rowHeight"
              patternUnits="userSpaceOnUse"
            >
              <path :d="`M ${getPixelPerHour()} 0 L 0 0 0 ${rowHeight}`" fill="none" stroke="rgba(100,116,139,0.15)" stroke-width="1" />
            </pattern>
            <pattern
              id="grid-half-hours-snapshot"
              :width="getPixelPerHour() / 2"
              :height="rowHeight"
              patternUnits="userSpaceOnUse"
            >
              <path
                :d="`M ${getPixelPerHour() / 2} 0 L 0 0`"
                fill="none"
                stroke="rgba(100,116,139,0.08)"
                stroke-width="1"
              />
            </pattern>
          </defs>
          <rect
            x="0"
            y="0"
            :width="totalHours * getPixelPerHour()"
            :height="sortedBerths.length * rowHeight"
            fill="url(#grid-half-hours-snapshot)"
          />
          <rect
            x="0"
            y="0"
            :width="totalHours * getPixelPerHour()"
            :height="sortedBerths.length * rowHeight"
            fill="url(#grid-hours-snapshot)"
          />
        </svg>
      </div>

      <div
        class="absolute"
        :style="{
          top: `${headerHeight}px`,
          left: `${berthLabelWidth}px`,
          width: `${totalHours * getPixelPerHour()}px`,
          height: `${sortedBerths.length * rowHeight}px`,
        }"
      >
        <div
          v-for="(berth, index) in sortedBerths"
          :key="'row-' + berth.id"
          :class="[
            'w-full border-b border-console-500/20',
            index % 2 === 0 ? 'bg-transparent' : 'bg-console-600/10',
          ]"
          :style="{ height: `${rowHeight}px` }"
        />

        <template v-for="maintenance in activeMaintenancePeriods" :key="'maint-' + maintenance.id">
          <div
            v-if="getMaintenanceBlockPosition(maintenance.berthId, new Date(maintenance.startTime), new Date(maintenance.endTime))"
            :style="getMaintenanceBlockPosition(maintenance.berthId, new Date(maintenance.startTime), new Date(maintenance.endTime))!"
            class="absolute rounded border-2 border-dashed border-harbor-orange/50 bg-harbor-orange/10 flex items-center justify-center overflow-hidden z-[3]"
          >
            <div class="w-full h-full bg-[repeating-linear-gradient(45deg,transparent,transparent_6px,rgba(234,88,12,0.15)_6px,rgba(234,88,12,0.15)_12px)] absolute" />
            <span class="relative text-[9px] font-mono text-harbor-orange font-bold px-1 whitespace-nowrap">
              维护
            </span>
          </div>
        </template>

        <template v-for="schedule in schedules" :key="schedule.id">
          <ScenarioTimelineShipBlock
            v-if="getBlockPosition(schedule.id, schedule.berthId, new Date(schedule.eta), new Date(schedule.etd))"
            :schedule="schedule"
            :ship="getShipById(schedule.shipId)"
            :has-conflict="!!conflictsBySchedule[schedule.id]?.length"
            :error-count="conflictStats.errorCounts[schedule.id]"
            :warning-count="conflictStats.warningCounts[schedule.id]"
            readonly
            v-bind="getBlockPosition(schedule.id, schedule.berthId, new Date(schedule.eta), new Date(schedule.etd))!"
          />
        </template>
      </div>
    </div>
  </div>
</template>
