<script setup lang="ts">
import { computed } from 'vue';
import { useScheduleStore } from '../../stores/schedule';
import type { AffectedSchedule } from '../../types';
import { MapPin, Ship, Clock, AlertTriangle, ArrowRight } from 'lucide-vue-next';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const props = defineProps<{
  affectedSchedules: AffectedSchedule[];
  affectedBerthIds: string[];
  affectedShipIds: string[];
}>();

const scheduleStore = useScheduleStore();

const berthStats = computed(() => {
  return props.affectedBerthIds.map((id) => {
    const berth = scheduleStore.getBerthById(id);
    return {
      id,
      name: berth?.name || id,
      status: berth?.status || 'unknown',
    };
  });
});

const shipStats = computed(() => {
  return props.affectedShipIds.map((id) => {
    const ship = scheduleStore.getShipById(id);
    return {
      id,
      name: ship?.name || id,
    };
  });
});

function formatDateTime(date?: Date): string {
  if (!date) return '-';
  return format(new Date(date), 'MM-dd HH:mm', { locale: zhCN });
}

function getScheduleById(scheduleId: string) {
  return scheduleStore.schedules.find((s) => s.id === scheduleId);
}
</script>

<template>
  <div class="space-y-4">
    <div class="grid grid-cols-3 gap-3">
      <div class="panel-border rounded-lg p-3 bg-console-800/30">
        <div class="flex items-center gap-2 mb-2">
          <MapPin class="w-4 h-4 text-harbor-cyan" />
          <span class="text-xs font-mono text-console-300">影响泊位</span>
        </div>
        <div class="text-2xl font-bold font-mono text-harbor-cyan">
          {{ affectedBerthIds.length }}
        </div>
      </div>

      <div class="panel-border rounded-lg p-3 bg-console-800/30">
        <div class="flex items-center gap-2 mb-2">
          <Ship class="w-4 h-4 text-harbor-orange" />
          <span class="text-xs font-mono text-console-300">影响船舶</span>
        </div>
        <div class="text-2xl font-bold font-mono text-harbor-orange">
          {{ affectedShipIds.length }}
        </div>
      </div>

      <div class="panel-border rounded-lg p-3 bg-console-800/30">
        <div class="flex items-center gap-2 mb-2">
          <AlertTriangle class="w-4 h-4 text-harbor-yellow" />
          <span class="text-xs font-mono text-console-300">影响计划</span>
        </div>
        <div class="text-2xl font-bold font-mono text-harbor-yellow">
          {{ affectedSchedules.length }}
        </div>
      </div>
    </div>

    <div v-if="affectedSchedules.length > 0" class="panel-border rounded-lg overflow-hidden">
      <div class="px-4 py-3 border-b border-console-500/20 bg-console-800/30">
        <h4 class="text-xs font-mono font-medium text-console-200 flex items-center gap-2">
          <Clock class="w-3.5 h-3.5 text-harbor-cyan" />
          受影响调度计划
        </h4>
      </div>
      <div class="divide-y divide-console-500/10">
        <div
          v-for="as in affectedSchedules"
          :key="as.scheduleId"
          class="px-4 py-3 hover:bg-console-700/20 transition-colors"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1.5">
                <Ship class="w-3.5 h-3.5 text-harbor-orange shrink-0" />
                <span class="text-xs font-medium text-console-100 truncate">
                  {{ as.shipName }}
                </span>
                <span class="text-[10px] font-mono text-console-500">
                  {{ as.scheduleId }}
                </span>
              </div>
              <div class="flex items-center gap-2 text-[11px] text-console-400 mb-2">
                <MapPin class="w-3 h-3" />
                <span>{{ as.berthName }}</span>
              </div>
              <div class="flex items-center gap-2 text-[11px]">
                <span class="text-console-400">影响:</span>
                <span class="text-harbor-yellow">{{ as.impact }}</span>
              </div>
            </div>

            <div class="flex flex-col items-end gap-1 ml-4 shrink-0">
              <div
                v-if="as.etaAdjusted || as.etdAdjusted"
                class="flex items-center gap-1 text-[10px] font-mono text-harbor-orange"
              >
                <ArrowRight class="w-3 h-3" />
                <span>时间调整</span>
              </div>
              <div v-if="as.etaAdjusted" class="text-[10px] font-mono text-console-400">
                ETA: {{ formatDateTime(as.etaAdjusted) }}
              </div>
              <div v-if="as.etdAdjusted" class="text-[10px] font-mono text-console-400">
                ETD: {{ formatDateTime(as.etdAdjusted) }}
              </div>
              <div
                v-if="getScheduleById(as.scheduleId)"
                class="text-[10px] font-mono text-console-500"
              >
                原ETA: {{ formatDateTime(getScheduleById(as.scheduleId)?.eta) }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="berthStats.length > 0" class="panel-border rounded-lg overflow-hidden">
      <div class="px-4 py-3 border-b border-console-500/20 bg-console-800/30">
        <h4 class="text-xs font-mono font-medium text-console-200 flex items-center gap-2">
          <MapPin class="w-3.5 h-3.5 text-harbor-cyan" />
          受影响泊位列表
        </h4>
      </div>
      <div class="p-3 flex flex-wrap gap-2">
        <div
          v-for="berth in berthStats"
          :key="berth.id"
          class="px-3 py-1.5 rounded bg-console-800/60 border border-console-500/30 text-xs font-mono text-console-200"
        >
          {{ berth.name }}
        </div>
      </div>
    </div>

    <div v-if="shipStats.length > 0" class="panel-border rounded-lg overflow-hidden">
      <div class="px-4 py-3 border-b border-console-500/20 bg-console-800/30">
        <h4 class="text-xs font-mono font-medium text-console-200 flex items-center gap-2">
          <Ship class="w-3.5 h-3.5 text-harbor-orange" />
          受影响船舶列表
        </h4>
      </div>
      <div class="p-3 flex flex-wrap gap-2">
        <div
          v-for="ship in shipStats"
          :key="ship.id"
          class="px-3 py-1.5 rounded bg-console-800/60 border border-console-500/30 text-xs font-mono text-console-200"
        >
          {{ ship.name }}
        </div>
      </div>
    </div>
  </div>
</template>
