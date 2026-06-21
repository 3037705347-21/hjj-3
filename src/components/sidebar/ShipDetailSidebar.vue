<script setup lang="ts">
import { useScheduleStore } from '../../stores/schedule';
import { X, ChevronRight, Pencil, Copy, Trash2, Clock, AlertTriangle, CheckCircle2, Layers, Building2, HardHat, Cpu, Wrench } from 'lucide-vue-next';
import ShipInfoCard from './ShipInfoCard.vue';
import ShipTideWindowCard from './ShipTideWindowCard.vue';
import OperationProgress from './OperationProgress.vue';
import StatusActions from './StatusActions.vue';
import StatusBadge from '../common/StatusBadge.vue';
import ConflictAlert from '../logs/ConflictAlert.vue';
import ScheduleEditDrawer from '../common/ScheduleEditDrawer.vue';
import { computed, ref } from 'vue';
import type { BerthSchedule, ResourceType } from '../../types';
import {
  RESOURCE_TYPE_LABELS,
  RESOURCE_STATUS_LABELS,
  MAINTENANCE_TYPE_LABELS,
  MAINTENANCE_IMPACT_SCOPE_LABELS,
} from '../../types';
import { format, differenceInMinutes } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useResourceStore } from '../../stores/resource';

const store = useScheduleStore();
const resourceStore = useResourceStore();

const showEditDrawer = ref(false);
const showDeleteConfirm = ref(false);

const scheduleConflicts = computed(() =>
  store.conflicts.filter(
    (c) =>
      c.scheduleId === store.selectedScheduleId ||
      c.relatedScheduleId === store.selectedScheduleId,
  ),
);

const scheduleAllocations = computed(() =>
  store.selectedScheduleId
    ? resourceStore.getAllocationsForSchedule(store.selectedScheduleId)
    : [],
);

const scheduleResourceConflicts = computed(() =>
  store.selectedScheduleId
    ? resourceStore.conflicts.filter(
        (c) =>
          c.scheduleId === store.selectedScheduleId ||
          c.relatedScheduleId === store.selectedScheduleId,
      )
    : [],
);

const resourceAllocationCheck = computed(() =>
  store.selectedScheduleId
    ? resourceStore.canTransitionToOperation(store.selectedScheduleId)
    : { allowed: true },
);

const maintenanceConflicts = computed(() =>
  store.selectedScheduleId
    ? store.getMaintenanceConflictsForSchedule(store.selectedScheduleId)
    : [],
);

function getResourceTypeIcon(type: ResourceType) {
  switch (type) {
    case 'berth':
      return Building2;
    case 'team':
      return HardHat;
    case 'equipment':
      return Cpu;
  }
}

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

        <div
          v-if="maintenanceConflicts.length > 0"
          class="panel-border rounded-lg p-4"
        >
          <div class="flex items-center gap-2 mb-3">
            <Wrench class="w-4 h-4 text-harbor-orange" />
            <h3 class="font-mono text-sm font-semibold text-console-100">泊位维护影响</h3>
          </div>
          <div class="space-y-2">
            <div
              v-for="m in maintenanceConflicts"
              :key="m.id"
              class="p-2.5 rounded bg-harbor-orange/10 border border-harbor-orange/30"
            >
              <div class="flex items-start gap-2">
                <Wrench class="w-3.5 h-3.5 text-harbor-orange mt-0.5 flex-shrink-0" />
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-1">
                    <span class="text-xs font-mono font-medium text-harbor-orange">
                      {{ MAINTENANCE_TYPE_LABELS[m.maintenanceType] }}
                    </span>
                    <span class="text-[9px] font-mono text-console-400">
                      {{ MAINTENANCE_IMPACT_SCOPE_LABELS[m.impactScope] }}
                    </span>
                  </div>
                  <div class="text-[10px] font-mono text-console-300">
                    {{ format(new Date(m.startTime), 'MM-dd HH:mm', { locale: zhCN }) }}
                    ~
                    {{ format(new Date(m.endTime), 'MM-dd HH:mm', { locale: zhCN }) }}
                  </div>
                  <div class="text-[10px] font-mono text-console-400 mt-0.5">
                    负责人: {{ m.responsiblePerson }}
                  </div>
                  <p v-if="m.notes" class="text-[10px] font-mono text-console-500 mt-1 truncate">
                    {{ m.notes }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <ShipInfoCard :ship="store.selectedShip" />

        <ShipTideWindowCard />

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

        <div class="panel-border rounded-lg p-4">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <Layers class="w-4 h-4 text-harbor-orange" />
              <h3 class="font-mono text-sm font-semibold text-console-100">资源分配</h3>
            </div>
            <span
              v-if="!resourceAllocationCheck.allowed"
              class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-harbor-yellow/15 text-harbor-yellow border border-harbor-yellow/30 text-[9px] font-mono"
            >
              <AlertTriangle class="w-2.5 h-2.5" />
              未就绪
            </span>
            <span
              v-else-if="scheduleAllocations.length > 0"
              class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-harbor-green/15 text-harbor-green border border-harbor-green/30 text-[9px] font-mono"
            >
              <CheckCircle2 class="w-2.5 h-2.5" />
              已就绪
            </span>
          </div>

          <div
            v-if="!resourceAllocationCheck.allowed"
            class="mb-3 p-2 rounded bg-harbor-yellow/10 border border-harbor-yellow/30"
          >
            <p class="text-[10px] font-mono text-harbor-yellow">{{ resourceAllocationCheck.reason }}</p>
          </div>

          <div v-if="scheduleResourceConflicts.length > 0" class="mb-3 space-y-1.5">
            <div
              v-for="conflict in scheduleResourceConflicts"
              :key="conflict.id"
              class="p-2 rounded bg-harbor-red/10 border border-harbor-red/30"
            >
              <div class="flex items-start gap-1.5">
                <AlertTriangle class="w-3 h-3 text-harbor-red mt-0.5 flex-shrink-0" />
                <div>
                  <p class="text-[10px] font-mono text-harbor-red font-medium">{{ conflict.resourceName }}</p>
                  <p class="text-[9px] font-mono text-console-300">{{ conflict.message }}</p>
                </div>
              </div>
            </div>
          </div>

          <div v-if="scheduleAllocations.length === 0" class="py-4 text-center">
            <p class="text-[10px] font-mono text-console-400">暂无资源分配记录</p>
            <p class="text-[9px] font-mono text-console-500 mt-1">请前往资源协同页面分配资源</p>
          </div>

          <div v-else class="space-y-2">
            <div
              v-for="alloc in scheduleAllocations"
              :key="alloc.id"
              class="p-2.5 rounded bg-console-800/60 border border-console-600/30"
            >
              <div class="flex items-start gap-2">
                <div class="w-7 h-7 rounded bg-console-700/50 flex items-center justify-center border border-console-500/30 flex-shrink-0">
                  <component :is="getResourceTypeIcon(alloc.resourceType)" class="w-3.5 h-3.5 text-console-300" />
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between">
                    <p class="text-xs font-mono font-medium text-console-100 truncate">{{ alloc.resourceName }}</p>
                    <span class="px-1 py-0.5 rounded bg-console-700/50 text-[9px] font-mono text-console-400">
                      {{ RESOURCE_TYPE_LABELS[alloc.resourceType] }}
                    </span>
                  </div>
                  <p class="text-[10px] font-mono text-console-400 mt-0.5">
                    {{ format(new Date(alloc.startTime), 'MM-dd HH:mm', { locale: zhCN }) }} -
                    {{ format(new Date(alloc.endTime), 'MM-dd HH:mm', { locale: zhCN }) }}
                  </p>
                  <p v-if="alloc.remarks" class="text-[10px] font-mono text-console-500 mt-1 truncate">
                    {{ alloc.remarks }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

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
