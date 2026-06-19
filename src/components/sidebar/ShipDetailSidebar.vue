<script setup lang="ts">
import { useScheduleStore } from '../../stores/schedule';
import { X, ChevronRight, Pencil, Copy, Trash2, Clock, AlertTriangle, CheckCircle2 } from 'lucide-vue-next';
import ShipInfoCard from './ShipInfoCard.vue';
import OperationProgress from './OperationProgress.vue';
import StatusActions from './StatusActions.vue';
import StatusBadge from '../common/StatusBadge.vue';
import ConflictAlert from '../logs/ConflictAlert.vue';
import ScheduleEditDrawer from '../common/ScheduleEditDrawer.vue';
import { computed, ref } from 'vue';
import type { BerthSchedule } from '../../types';
import { format, differenceInMinutes } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const store = useScheduleStore();

const showEditDrawer = ref(false);
const showDeleteConfirm = ref(false);

const scheduleConflicts = computed(() =>
  store.conflicts.filter(
    (c) =>
      c.scheduleId === store.selectedScheduleId ||
      c.relatedScheduleId === store.selectedScheduleId,
  ),
);

interface TimeTrackingItem {
  label: string;
  plannedTime: Date;
  actualTime?: Date;
  key: string;
}

const timeTrackingItems = computed<TimeTrackingItem[]>(() => {
  const schedule = store.selectedSchedule;
  if (!schedule) return [];

  const items: TimeTrackingItem[] = [
    {
      label: '预计抵达 / 实际抵达',
      plannedTime: new Date(schedule.eta),
      actualTime: schedule.actualBerthing
        ? new Date(schedule.actualBerthing)
        : undefined,
      key: 'berthing',
    },
    {
      label: '预计开工 / 实际开工',
      plannedTime: new Date(schedule.eta),
      actualTime: schedule.actualOperationStart
        ? new Date(schedule.actualOperationStart)
        : undefined,
      key: 'operation_start',
    },
    {
      label: '预计完工 / 实际完工',
      plannedTime: new Date(schedule.etd),
      actualTime: schedule.actualOperationEnd
        ? new Date(schedule.actualOperationEnd)
        : undefined,
      key: 'operation_end',
    },
    {
      label: '预计离泊 / 实际离泊',
      plannedTime: new Date(schedule.etd),
      actualTime: schedule.actualDeparture
        ? new Date(schedule.actualDeparture)
        : undefined,
      key: 'departure',
    },
  ];

  return items;
});

function formatTime(date?: Date) {
  if (!date) return '--:--';
  return format(new Date(date), 'MM-dd HH:mm', { locale: zhCN });
}

function getTimeDeviation(planned: Date, actual?: Date) {
  if (!actual) return null;
  const diff = differenceInMinutes(actual, planned);
  return diff;
}

function formatDeviation(minutes: number | null) {
  if (minutes === null) return '';
  const abs = Math.abs(minutes);
  const hours = Math.floor(abs / 60);
  const mins = abs % 60;
  const sign = minutes >= 0 ? '+' : '-';
  if (hours > 0) {
    return `${sign}${hours}h${mins}m`;
  }
  return `${sign}${mins}m`;
}

function hasDelay(planned: Date, actual?: Date) {
  if (!actual) return false;
  const threshold = store.selectedSchedule?.delayThresholdMinutes ?? store.DEFAULT_DELAY_THRESHOLD;
  const diff = differenceInMinutes(actual, planned);
  return diff > threshold;
}

function closeSidebar() {
  store.setSelectedSchedule(null);
}

function openEdit() {
  showEditDrawer.value = true;
}

function handleCopy() {
  if (!store.selectedScheduleId) return;
  const newSched = store.copySchedule(store.selectedScheduleId);
  if (newSched) {
    store.setSelectedSchedule(newSched.id);
  }
}

function confirmDelete() {
  showDeleteConfirm.value = true;
}

function doDelete() {
  if (!store.selectedScheduleId) return;
  store.deleteSchedule(store.selectedScheduleId);
  showDeleteConfirm.value = false;
}

function handleSaved(schedule: BerthSchedule) {
  store.setSelectedSchedule(schedule.id);
}
</script>

<template>
  <Transition name="slide">
    <aside
      v-if="store.selectedSchedule && store.selectedShip"
      class="fixed right-0 top-0 h-full w-96 bg-console-900/95 backdrop-blur-xl border-l border-console-500/30 z-50 animate-slide-in shadow-2xl overflow-hidden flex flex-col"
    >
      <div class="flex items-center justify-between px-4 py-3 border-b border-console-500/30 bg-console-800/50">
        <div class="flex items-center gap-3">
          <ChevronRight class="w-4 h-4 text-harbor-cyan" />
          <h2 class="font-mono text-sm font-bold text-console-100 tracking-wide">
            船舶调度详情
          </h2>
        </div>
        <div class="flex items-center gap-1">
          <button
            @click.stop="openEdit"
            class="w-8 h-8 flex items-center justify-center rounded border border-console-500/40 text-console-300 hover:text-harbor-cyan hover:border-harbor-cyan/50 hover:bg-harbor-cyan/10 transition-all"
            title="编辑计划"
          >
            <Pencil class="w-4 h-4" />
          </button>
          <button
            @click.stop="handleCopy"
            class="w-8 h-8 flex items-center justify-center rounded border border-console-500/40 text-console-300 hover:text-harbor-orange hover:border-harbor-orange/50 hover:bg-harbor-orange/10 transition-all"
            title="复制计划"
          >
            <Copy class="w-4 h-4" />
          </button>
          <button
            @click.stop="confirmDelete"
            class="w-8 h-8 flex items-center justify-center rounded border border-console-500/40 text-console-300 hover:text-harbor-red hover:border-harbor-red/50 hover:bg-harbor-red/10 transition-all"
            title="删除计划"
          >
            <Trash2 class="w-4 h-4" />
          </button>
          <div class="w-px h-5 bg-console-500/40 mx-1" />
          <button
            @click="closeSidebar"
            class="w-8 h-8 flex items-center justify-center rounded border border-console-500/40 text-console-300 hover:text-harbor-red hover:border-harbor-red/50 hover:bg-harbor-red/10 transition-all"
          >
            <X class="w-4 h-4" />
          </button>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto p-4 space-y-4">
        <div class="flex items-center justify-between">
          <StatusBadge :status="store.selectedSchedule.status" />
          <div v-if="store.selectedBerth" class="text-xs font-mono text-console-300">
            <span class="text-console-400">泊位:</span> {{ store.selectedBerth.name }}
          </div>
        </div>

        <ConflictAlert
          v-if="scheduleConflicts.length > 0"
          :conflicts="scheduleConflicts"
        />

        <ShipInfoCard :ship="store.selectedShip" />

        <div class="panel-border rounded-lg p-4">
          <div class="flex items-center gap-2 mb-3">
            <Clock class="w-4 h-4 text-harbor-cyan" />
            <h3 class="font-mono text-sm font-semibold text-console-100">时间跟踪</h3>
          </div>
          <div class="space-y-3">
            <div
              v-for="item in timeTrackingItems"
              :key="item.key"
              class="p-2 rounded bg-console-800/60 border border-console-600/30"
            >
              <div class="flex items-center justify-between mb-1.5">
                <span class="text-[10px] font-mono text-console-400">{{ item.label }}</span>
                <div
                  v-if="item.actualTime && hasDelay(item.plannedTime, item.actualTime)"
                  class="flex items-center gap-1"
                >
                  <AlertTriangle class="w-3 h-3 text-harbor-yellow" />
                  <span class="text-[10px] font-mono text-harbor-yellow">
                    {{ formatDeviation(getTimeDeviation(item.plannedTime, item.actualTime)) }}
                  </span>
                </div>
                <div
                  v-else-if="item.actualTime"
                  class="flex items-center gap-1"
                >
                  <CheckCircle2 class="w-3 h-3 text-harbor-cyan" />
                  <span class="text-[10px] font-mono text-harbor-cyan">
                    {{ formatDeviation(getTimeDeviation(item.plannedTime, item.actualTime)) }}
                  </span>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <p class="text-[9px] font-mono text-console-500 uppercase tracking-wider">计划</p>
                  <p class="text-[11px] font-mono text-console-300">
                    {{ formatTime(item.plannedTime) }}
                  </p>
                </div>
                <div>
                  <p class="text-[9px] font-mono text-console-500 uppercase tracking-wider">实际</p>
                  <p
                    class="text-[11px] font-mono"
                    :class="item.actualTime
                      ? hasDelay(item.plannedTime, item.actualTime)
                        ? 'text-harbor-yellow'
                        : 'text-console-100'
                      : 'text-console-500'"
                  >
                    {{ formatTime(item.actualTime) }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <OperationProgress
          :schedule="store.selectedSchedule"
          :ship="store.selectedShip"
        />

        <StatusActions :schedule="store.selectedSchedule" />
      </div>

      <ScheduleEditDrawer
        :visible="showEditDrawer"
        mode="edit"
        :schedule-id="store.selectedScheduleId || undefined"
        @close="showEditDrawer = false"
        @saved="handleSaved"
      />

      <Teleport to="body">
        <Transition name="fade">
          <div
            v-if="showDeleteConfirm"
            class="fixed inset-0 z-[200] flex items-center justify-center"
          >
            <div
              class="absolute inset-0 bg-black/60 backdrop-blur-sm"
              @click="showDeleteConfirm = false"
            />
            <div class="relative w-full max-w-sm mx-4 bg-console-900 border border-harbor-red/40 rounded-xl shadow-2xl overflow-hidden">
              <div class="px-5 py-4 border-b border-console-500/30">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-full bg-harbor-red/20 flex items-center justify-center">
                    <Trash2 class="w-5 h-5 text-harbor-red" />
                  </div>
                  <div>
                    <h3 class="font-mono text-sm font-bold text-console-100">确认删除</h3>
                    <p class="text-[11px] font-mono text-console-400">此操作不可撤销</p>
                  </div>
                </div>
              </div>
              <div class="px-5 py-4 border-b border-console-500/30">
                <p class="text-xs font-mono text-console-200">
                  确定要删除该调度计划吗？相关操作记录将保留在日志中。
                </p>
                <div v-if="store.selectedShip" class="mt-2 text-[11px] font-mono text-console-400">
                  船舶: <span class="text-console-200">{{ store.selectedShip.name }}</span>
                </div>
              </div>
              <div class="px-5 py-3 flex items-center justify-end gap-2 bg-console-800/30">
                <button
                  @click="showDeleteConfirm = false"
                  class="px-4 py-2 text-xs font-mono text-console-200 border border-console-500/40 rounded hover:bg-console-700/50 transition-all"
                >
                  取消
                </button>
                <button
                  @click="doDelete"
                  class="px-4 py-2 text-xs font-mono text-white bg-harbor-red rounded hover:bg-harbor-red/80 transition-all"
                >
                  确认删除
                </button>
              </div>
            </div>
          </div>
        </Transition>
      </Teleport>
    </aside>
  </Transition>
</template>

<style scoped>
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}
.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
  opacity: 0;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
