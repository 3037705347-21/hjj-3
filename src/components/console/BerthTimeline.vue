<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useScheduleStore } from '../../stores/schedule';
import { useDragSchedule } from '../../composables/useDragSchedule';
import { useConflictDetection } from '../../composables/useConflictDetection';
import TimelineShipBlock from './TimelineShipBlock.vue';
import ScheduleEditDrawer from '../common/ScheduleEditDrawer.vue';
import BerthMaintenanceManager from './BerthMaintenanceManager.vue';
import { format, addHours, differenceInMinutes } from 'date-fns';
import { AlertTriangle, Wrench, GripVertical, Plus, X, Clock, Waves, Anchor, CheckCircle, XCircle, ShieldAlert, ChevronDown, ChevronUp, AlertCircle } from 'lucide-vue-next';
import type { BerthSchedule, ScheduleConflict } from '../../types';
import { MAINTENANCE_TYPE_LABELS, SHIP_TAG_LABELS } from '../../types';

const store = useScheduleStore();
const { detectAllConflicts } = useConflictDetection();

const showConflictPanel = ref(false);

const conflictTypeLabels: Record<string, string> = {
  time_overlap: '时间冲突',
  draft_exceed: '吃水超限',
  length_exceed: '船长超限',
  cargo_mismatch: '货种不匹配',
  tide_window: '潮汐窗口',
  berth_maintenance: '泊位维修',
  buffer_time_insufficient: '缓冲不足',
  team_conflict: '班组冲突',
  dangerous_cargo_isolation: '危货隔离',
  night_operation_limit: '夜间限制',
  tag_earliest_time: '最早作业时间',
  tag_priority_berth: '优先靠泊',
  tag_forbidden_berth: '禁止泊位类型',
  tag_missing_remarks: '缺少备注',
  tag_night_restricted: '标签-夜间限制',
};

const timelineRef = ref<HTMLElement | null>(null);
const rowHeight = 56;
const headerHeight = 44;
const berthLabelWidth = 180;

const showAddDrawer = ref(false);
const prefillSchedule = ref<Partial<BerthSchedule> | undefined>(undefined);
const showMaintenanceManager = ref(false);

const startTime = computed(() => addHours(new Date(), -6));
const endTime = computed(() => addHours(new Date(), 66));
const totalHours = computed(() =>
  (endTime.value.getTime() - startTime.value.getTime()) / 3600000,
);

function getPixelPerHour() {
  if (!timelineRef.value) return 60;
  return (timelineRef.value.clientWidth - berthLabelWidth) / totalHours.value;
}

function getTimeFromX(x: number): Date {
  const hours = (x - berthLabelWidth) / getPixelPerHour();
  return addHours(startTime.value, hours);
}

function getBerthFromY(y: number): string | null {
  const index = Math.floor((y - headerHeight) / rowHeight);
  if (index >= 0 && index < store.sortedBerths.length) {
    return store.sortedBerths[index].id;
  }
  return null;
}

function getStartTime(): Date {
  return startTime.value;
}

function getBerthLabelWidthFn(): number {
  return berthLabelWidth;
}

function getHeaderHeight(): number {
  return headerHeight;
}

function getRowHeight(): number {
  return rowHeight;
}

const {
  startDrag,
  onDragOver,
  onDragLeave,
  onDrop,
  previewState,
  dropFailures,
  dismissFailure,
  BUFFER_HOURS,
} = useDragSchedule(
  getTimeFromX,
  getBerthFromY,
  getStartTime,
  getBerthLabelWidthFn,
  timelineRef,
  getPixelPerHour,
  getHeaderHeight,
  getRowHeight,
);

const timeMarkers = computed(() => {
  const markers: { time: Date; major: boolean }[] = [];
  for (let h = 0; h <= totalHours.value; h += 2) {
    const time = addHours(startTime.value, h);
    markers.push({ time, major: h % 12 === 0 });
  }
  return markers;
});

const currentTimeX = computed(() => {
  const now = new Date();
  const hours = (now.getTime() - startTime.value.getTime()) / 3600000;
  return berthLabelWidth + hours * getPixelPerHour();
});

const conflictStats = computed(() => {
  const all = detectAllConflicts(
    store.schedules,
    store.ships,
    store.berths,
    store.tides,
    store.activeMaintenancePeriods,
  );
  store.setConflicts(all);

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
  const all = store.conflicts;
  const byShip: Array<{
    shipName: string;
    scheduleId: string;
    berthName: string;
    errors: ScheduleConflict[];
    warnings: ScheduleConflict[];
  }> = [];
  const seen = new Set<string>();
  all.forEach((c) => {
    const scheduleId = c.scheduleId;
    if (seen.has(scheduleId)) return;
    seen.add(scheduleId);
    const schedule = store.schedules.find((s) => s.id === scheduleId);
    if (!schedule) return;
    const ship = store.getShipById(schedule.shipId);
    const berth = store.getBerthById(schedule.berthId);
    const shipConflicts = all.filter(
      (x) => x.scheduleId === scheduleId || x.relatedScheduleId === scheduleId,
    );
    const uniqueConflicts: ScheduleConflict[] = [];
    const conflictIds = new Set<string>();
    shipConflicts.forEach((x) => {
      if (!conflictIds.has(x.id)) {
        conflictIds.add(x.id);
        uniqueConflicts.push(x);
      }
    });
    byShip.push({
      shipName: ship?.name || schedule.shipId,
      scheduleId,
      berthName: berth?.name || schedule.berthId,
      errors: uniqueConflicts.filter((x) => x.severity === 'error'),
      warnings: uniqueConflicts.filter((x) => x.severity === 'warning'),
    });
  });
  byShip.sort((a, b) => b.errors.length - a.errors.length || b.warnings.length - a.warnings.length);
  return byShip;
});

function getFailurePosition(failure: { berthId: string; eta: Date; etd: Date }) {
  const berthIndex = store.sortedBerths.findIndex((b) => b.id === failure.berthId);
  if (berthIndex === -1) return null;

  const pph = getPixelPerHour();
  const startMinutes = differenceInMinutes(failure.eta, startTime.value) / 60;
  const durationMinutes = differenceInMinutes(failure.etd, failure.eta) / 60;

  return {
    left: berthLabelWidth + startMinutes * pph,
    width: Math.max(40, durationMinutes * pph),
    top: headerHeight + berthIndex * rowHeight + 4,
    height: rowHeight - 8,
  };
}

function getSnapPointX(time: Date): number {
  const pph = getPixelPerHour();
  const minutes = differenceInMinutes(time, startTime.value) / 60;
  return berthLabelWidth + minutes * pph;
}

function getSnapPointY(berthId: string): number {
  const berthIndex = store.sortedBerths.findIndex((b) => b.id === berthId);
  return headerHeight + berthIndex * rowHeight + rowHeight / 2;
}

const snapPointColors: Record<string, string> = {
  hour: 'bg-harbor-cyan/40',
  half_hour: 'bg-harbor-cyan/20',
  high_tide: 'bg-harbor-orange/40',
  safe_interval: 'bg-harbor-green/40',
};

function getBlockPosition(scheduleId: string, berthId: string, eta: Date, etd: Date) {
  const berthIndex = store.sortedBerths.findIndex((b) => b.id === berthId);
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

function handleShipClick(scheduleId: string) {
  store.setSelectedSchedule(scheduleId);
}

function getMaintenanceBlockPosition(berthId: string, maintStart: Date, maintEnd: Date) {
  const berthIndex = store.sortedBerths.findIndex((b) => b.id === berthId);
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

function handleTimelineDoubleClick(e: MouseEvent) {
  if (!timelineRef.value) return;
  const rect = timelineRef.value.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const berthId = getBerthFromY(y);
  if (!berthId) return;
  const eta = getTimeFromX(x);
  const duration = 24;
  const etd = addHours(eta, duration);
  prefillSchedule.value = {
    berthId,
    eta,
    etd,
    status: 'anchored',
    operationProgress: 0,
  };
  showAddDrawer.value = true;
}

function openAddNew() {
  prefillSchedule.value = undefined;
  showAddDrawer.value = true;
}

function handleSaved(schedule: BerthSchedule) {
  store.setSelectedSchedule(schedule.id);
}

watch(
  () => store.schedules.map((s) => [s.berthId, s.eta, s.etd]),
  () => {
    detectAllConflicts(store.schedules, store.ships, store.berths, store.tides, store.activeMaintenancePeriods);
  },
  { deep: true },
);

watch(
  () => store.maintenancePeriods.map((m) => [m.berthId, m.startTime, m.endTime, m.impactScope, m.status]),
  () => {
    detectAllConflicts(store.schedules, store.ships, store.berths, store.tides, store.activeMaintenancePeriods);
  },
  { deep: true },
);

onMounted(() => {
  detectAllConflicts(store.schedules, store.ships, store.berths, store.tides, store.activeMaintenancePeriods);
});
</script>

<template>
  <div class="panel-border rounded-lg overflow-hidden">
    <div class="flex items-center justify-between px-4 py-3 border-b border-console-500/30">
      <div class="flex items-center gap-3">
        <GripVertical class="w-4 h-4 text-console-300" />
        <h3 class="font-mono text-sm font-semibold text-console-100 tracking-wide">
          泊位调度时间轴
        </h3>
        <span class="text-[10px] font-mono text-console-300">
          拖拽船舶方块调整调度 · 双击空白处快速新增
        </span>
      </div>
      <div class="flex items-center gap-2">
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
        <button
          @click="openAddNew"
          class="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono text-console-900 bg-gradient-to-r from-harbor-cyan to-harbor-cyan/80 rounded shadow-glow-cyan hover:shadow-glow-blue transition-all"
        >
          <Plus class="w-3.5 h-3.5" />
          新增计划
        </button>
        <button
          @click="showMaintenanceManager = true"
          class="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono text-harbor-orange bg-harbor-orange/15 border border-harbor-orange/30 rounded hover:bg-harbor-orange/25 transition-all"
        >
          <Wrench class="w-3.5 h-3.5" />
          维护排程
          <span
            v-if="store.activeMaintenancePeriods.length > 0"
            class="ml-0.5 min-w-[16px] h-[16px] px-0.5 rounded-full bg-harbor-orange text-console-900 text-[8px] font-mono font-bold flex items-center justify-center"
          >
            {{ store.activeMaintenancePeriods.length }}
          </span>
        </button>
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
              class="flex items-center gap-2 px-3 py-2 border-b cursor-pointer hover:brightness-110 transition-all"
              :class="
                group.errors.length > 0
                  ? 'border-harbor-red/20 bg-harbor-red/5'
                  : 'border-harbor-yellow/20 bg-harbor-yellow/5'
              "
              @click="handleShipClick(group.scheduleId)"
            >
              <Anchor
                class="w-3.5 h-3.5"
                :class="group.errors.length > 0 ? 'text-harbor-red' : 'text-harbor-yellow'"
              />
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
                  <p
                    v-if="conflict.suggestedAction"
                    class="text-[10px] font-mono text-harbor-cyan mt-0.5 flex items-center gap-1"
                  >
                    <span class="text-harbor-cyan/60">建议：</span>
                    {{ conflict.suggestedAction }}
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
                  <p
                    v-if="conflict.suggestedAction"
                    class="text-[10px] font-mono text-harbor-cyan mt-0.5 flex items-center gap-1"
                  >
                    <span class="text-harbor-cyan/60">建议：</span>
                    {{ conflict.suggestedAction }}
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
      @dragover="onDragOver"
      @dragleave="onDragLeave"
      @drop="onDrop"
      @dblclick="handleTimelineDoubleClick"
      :style="{ minHeight: `${headerHeight + store.sortedBerths.length * rowHeight}px` }"
    >
      <div
        class="absolute top-0 left-0 flex bg-console-800/80 border-b border-console-500/40 z-10"
        :style="{ height: `${headerHeight}px`, width: `${berthLabelWidth + totalHours * getPixelPerHour()}px` }"
      >
        <div
          class="flex items-center px-3 border-r border-console-500/40"
          :style="{ width: `${berthLabelWidth}px` }"
        >
          <span class="text-[11px] font-mono text-console-300 uppercase tracking-wider">泊位</span>
        </div>
        <div class="relative flex-1 h-full">
          <div
            v-for="marker in timeMarkers"
            :key="marker.time.toISOString()"
            class="absolute top-0 h-full border-l"
            :class="marker.major ? 'border-console-400/50' : 'border-console-500/25'"
            :style="{
              left: `${(differenceInMinutes(marker.time, startTime) / 60) * getPixelPerHour()}px`,
            }"
          >
            <span
              v-if="marker.major"
              class="absolute top-2 left-1 text-[10px] font-mono"
              :class="format(marker.time, 'HH') === '00' ? 'text-harbor-orange' : 'text-console-200'"
            >
              {{ format(marker.time, 'MM/dd HH:mm') }}
            </span>
          </div>
        </div>
      </div>

      <div
        class="absolute bg-harbor-red/20 border-x border-harbor-red/50 z-20 pointer-events-none"
        :style="{
          left: `${currentTimeX}px`,
          top: `${headerHeight}px`,
          width: '2px',
          height: `${store.sortedBerths.length * rowHeight}px`,
        }"
      >
        <div class="absolute -top-5 -left-8 bg-harbor-red text-white text-[10px] font-mono px-1.5 py-0.5 rounded whitespace-nowrap">
          {{ format(new Date(), 'HH:mm') }}
        </div>
      </div>

      <div class="pt-0">
        <div
          v-for="(berth, idx) in store.sortedBerths"
          :key="berth.id"
          class="flex border-b border-console-500/20 hover:bg-console-700/20 transition-colors"
          :style="{ height: `${rowHeight}px` }"
        >
          <div
            class="flex items-center gap-2 px-3 border-r border-console-500/30 bg-console-800/50"
            :style="{ width: `${berthLabelWidth}px`, marginTop: idx === 0 ? `${headerHeight}px` : 0 }"
          >
            <div
              v-if="berth.status === 'maintenance'"
              class="w-2 h-2 rounded-full bg-harbor-yellow animate-pulse"
            />
            <div
              v-else-if="store.schedulesByBerth[berth.id]?.length > 0"
              class="w-2 h-2 rounded-full bg-harbor-cyan"
            />
            <div v-else class="w-2 h-2 rounded-full bg-console-400" />
            <div class="min-w-0">
              <p class="text-xs font-mono font-medium text-console-100 truncate">
                {{ berth.name }}
              </p>
              <p class="text-[10px] font-mono text-console-400">
                {{ berth.length }}m / {{ berth.maxDraft }}m
                <Wrench v-if="berth.status === 'maintenance'" class="w-2.5 h-2.5 inline ml-1 text-harbor-yellow" />
              </p>
            </div>
          </div>
          <div
            class="relative flex-1"
            :style="{ minWidth: `${totalHours * getPixelPerHour()}px`, marginTop: idx === 0 ? `${headerHeight}px` : 0 }"
          >
            <div
              v-for="marker in timeMarkers.filter((m) => m.major)"
              :key="`${berth.id}-${marker.time.toISOString()}`"
              class="absolute top-0 h-full border-l border-console-500/15"
              :style="{
                left: `${(differenceInMinutes(marker.time, startTime) / 60) * getPixelPerHour()}px`,
              }"
            />
          </div>
        </div>
      </div>

      <div class="absolute top-0 left-0 pointer-events-none" style="margin-left: 0">
        <template v-for="period in store.activeMaintenancePeriods" :key="`maint-group-${period.id}`">
          <div
            v-for="berthId in store.getAffectedBerthIdsForMaintenance(period)"
            :key="`maint-${period.id}-${berthId}`"
            class="absolute rounded pointer-events-none z-15"
            v-bind="getMaintenanceBlockPosition(berthId, new Date(period.startTime), new Date(period.endTime)) || { left: 0, width: 0, top: 0, height: 0 }"
          >
            <div
              class="h-full border rounded-r flex items-center justify-center gap-1 px-1.5 overflow-hidden"
              :class="[
                berthId === period.berthId
                  ? 'bg-harbor-orange/15 border-harbor-orange/40'
                  : 'bg-harbor-orange/8 border-harbor-orange/20 border-dashed',
              ]"
            >
              <ShieldAlert
                class="flex-shrink-0"
                :class="[
                  berthId === period.berthId ? 'w-3 h-3 text-harbor-orange' : 'w-2.5 h-2.5 text-harbor-orange/60',
                ]"
              />
              <div class="flex flex-col min-w-0">
                <span
                  class="font-mono font-semibold truncate"
                  :class="[
                    berthId === period.berthId ? 'text-[9px] text-harbor-orange' : 'text-[8px] text-harbor-orange/70',
                  ]"
                >
                  {{ berthId === period.berthId ? '维护中' : '受影响' }}
                </span>
                <span
                  class="font-mono truncate"
                  :class="[
                    berthId === period.berthId ? 'text-[8px] text-harbor-orange/70' : 'text-[7px] text-harbor-orange/50',
                  ]"
                >
                  {{ MAINTENANCE_TYPE_LABELS[period.maintenanceType] }}
                </span>
              </div>
            </div>
          </div>
        </template>

        <TimelineShipBlock
          v-for="schedule in store.schedules"
          :key="schedule.id"
          :schedule="schedule"
          v-bind="
            getBlockPosition(
              schedule.id,
              schedule.berthId,
              new Date(schedule.eta),
              new Date(schedule.etd),
            ) || { left: 0, width: 0, top: 0, height: 0 }
          "
          :has-conflict="!!conflictsBySchedule[schedule.id]"
          :error-count="conflictStats.errorCounts[schedule.id] || 0"
          :warning-count="conflictStats.warningCounts[schedule.id] || 0"
          class="pointer-events-auto"
          @dragstart="startDrag"
          @click="handleShipClick"
        />

        <template v-if="previewState">
          <div
            v-for="point in previewState.snapPoints"
            :key="`${point.time.getTime()}-${point.type}`"
            class="absolute w-1 h-1 rounded-full pointer-events-none z-30"
            :class="snapPointColors[point.type]"
            :style="{
              left: `${getSnapPointX(point.time)}px`,
              top: `${getSnapPointY(previewState.berthId)}px`,
            }"
          />

          <div
            class="absolute rounded pointer-events-none z-40 border-2 border-dashed transition-all duration-100"
            :class="[
              previewState.validation.canPlace
                ? 'border-harbor-green bg-harbor-green/20'
                : 'border-harbor-red bg-harbor-red/20',
            ]"
            :style="{
              left: `${previewState.x}px`,
              top: `${previewState.y}px`,
              width: `${previewState.width}px`,
              height: `${rowHeight - 8}px`,
            }"
          >
            <div class="h-full flex items-center justify-center gap-2 px-2">
              <component
                :is="previewState.validation.canPlace ? CheckCircle : XCircle"
                class="w-4 h-4 flex-shrink-0"
                :class="previewState.validation.canPlace ? 'text-harbor-green' : 'text-harbor-red'"
              />
              <div class="flex flex-col gap-0.5 min-w-0">
                <div class="flex items-center gap-1.5 text-[10px] font-mono">
                  <span
                    :class="
                      previewState.validation.canPlace
                        ? 'text-harbor-green'
                        : 'text-harbor-red'
                    "
                  >
                    {{ format(previewState.eta, 'MM/dd HH:mm') }}
                  </span>
                  <span class="text-console-400">→</span>
                  <span class="text-console-300">
                    {{ format(previewState.etd, 'HH:mm') }}
                  </span>
                </div>
                <div class="flex items-center gap-2 text-[9px] font-mono">
                  <div
                    class="flex items-center gap-0.5"
                    :class="
                      previewState.validation.berthAvailable
                        ? 'text-harbor-green'
                        : 'text-harbor-red'
                    "
                  >
                    <Anchor class="w-2.5 h-2.5" />
                    <span>{{ store.getBerthById(previewState.berthId)?.name || 'Unknown' }}</span>
                  </div>
                  <div
                    class="flex items-center gap-0.5"
                    :class="
                      previewState.validation.tideSatisfied
                        ? 'text-harbor-green'
                        : 'text-harbor-yellow'
                    "
                  >
                    <Waves class="w-2.5 h-2.5" />
                    <span>{{ previewState.validation.tideSatisfied ? '潮汐满足' : '潮汐告警' }}</span>
                  </div>
                  <div
                    v-if="previewState.validation.minIntervalBefore > 0"
                    class="flex items-center gap-0.5"
                    :class="
                      previewState.validation.minIntervalBefore >= BUFFER_HOURS * 60
                        ? 'text-harbor-green'
                        : 'text-harbor-yellow'
                    "
                  >
                    <Clock class="w-2.5 h-2.5" />
                    <span>前间隔:{{ Math.round(previewState.validation.minIntervalBefore) }}m</span>
                  </div>
                  <div
                    v-if="previewState.validation.minIntervalAfter > 0"
                    class="flex items-center gap-0.5"
                    :class="
                      previewState.validation.minIntervalAfter >= BUFFER_HOURS * 60
                        ? 'text-harbor-green'
                        : 'text-harbor-yellow'
                    "
                  >
                    <Clock class="w-2.5 h-2.5" />
                    <span>后间隔:{{ Math.round(previewState.validation.minIntervalAfter) }}m</span>
                  </div>
                </div>
              </div>
            </div>

            <div
              v-if="previewState.validation.errors.length > 0 || previewState.validation.warnings.length > 0"
              class="absolute -top-1 left-1/2 -translate-x-1/2 -translate-y-full mb-1 bg-console-900 border border-console-500 rounded px-2 py-1.5 min-w-[200px] z-50 shadow-xl"
            >
              <div
                v-for="error in previewState.validation.errors"
                :key="error.id"
                class="flex items-start gap-1.5 text-[10px] font-mono text-harbor-red mb-1"
              >
                <XCircle class="w-3 h-3 flex-shrink-0 mt-0.5" />
                <span>{{ error.message }}</span>
              </div>
              <div
                v-for="warning in previewState.validation.warnings"
                :key="warning.id"
                class="flex items-start gap-1.5 text-[10px] font-mono text-harbor-yellow mb-1"
              >
                <AlertTriangle class="w-3 h-3 flex-shrink-0 mt-0.5" />
                <span>{{ warning.message }}</span>
              </div>
            </div>
          </div>
        </template>

        <template v-for="failure in dropFailures" :key="failure.id">
          <div
            v-if="getFailurePosition(failure)"
            class="absolute rounded pointer-events-auto z-50 border-2 border-harbor-red bg-harbor-red/30 animate-pulse"
            :style="{
              left: `${getFailurePosition(failure)!.left}px`,
              top: `${getFailurePosition(failure)!.top}px`,
              width: `${getFailurePosition(failure)!.width}px`,
              height: `${getFailurePosition(failure)!.height}px`,
            }"
          >
            <div class="h-full flex items-center justify-center gap-2 px-2">
              <XCircle class="w-4 h-4 text-harbor-red flex-shrink-0" />
              <div class="flex flex-col gap-0.5 min-w-0 flex-1">
                <div class="text-[10px] font-mono text-harbor-red font-semibold">
                  放置失败
                </div>
                <div class="text-[9px] font-mono text-harbor-red/80 truncate">
                  {{ failure.reasons[0] }}
                </div>
              </div>
              <button
                @click="dismissFailure(failure.id)"
                class="p-0.5 rounded hover:bg-harbor-red/30 transition-colors"
              >
                <X class="w-3 h-3 text-harbor-red" />
              </button>
            </div>

            <div
              class="absolute -top-1 left-1/2 -translate-x-1/2 -translate-y-full mb-1 bg-console-900 border border-harbor-red/50 rounded px-2 py-1.5 min-w-[220px] z-50 shadow-xl"
            >
              <div class="text-[10px] font-mono text-harbor-red font-semibold mb-1">
                无法放置原因:
              </div>
              <div
                v-for="(reason, idx) in failure.reasons"
                :key="idx"
                class="flex items-start gap-1.5 text-[10px] font-mono text-harbor-red/90 mb-1"
              >
                <span class="text-harbor-red">•</span>
                <span>{{ reason }}</span>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>

    <ScheduleEditDrawer
      :visible="showAddDrawer"
      mode="create"
      :prefill="prefillSchedule"
      @close="showAddDrawer = false"
      @saved="handleSaved"
    />

    <BerthMaintenanceManager
      :visible="showMaintenanceManager"
      @close="showMaintenanceManager = false"
    />
  </div>
</template>

<style scoped>
.slide-down-enter-active,
.slide-down-leave-active {
  transition: max-height 0.25s ease, opacity 0.25s ease, padding 0.25s ease;
  overflow: hidden;
}

.slide-down-enter-from,
.slide-down-leave-to {
  max-height: 0;
  opacity: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.slide-down-enter-to,
.slide-down-leave-from {
  max-height: 32rem;
  opacity: 1;
}
</style>
