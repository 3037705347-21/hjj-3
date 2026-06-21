<script setup lang="ts">
import { computed } from 'vue';
import type { BerthSchedule, Ship, ShipTag } from '../../types';
import PriorityBadge from '../common/PriorityBadge.vue';
import CargoTypeIcon from '../common/CargoTypeIcon.vue';
import { SHIP_TAG_COLORS } from '../../types';
import { format } from 'date-fns';

const props = defineProps<{
  schedule: BerthSchedule;
  ship: Ship | undefined;
  left: number;
  width: number;
  top: number;
  height: number;
  hasConflict: boolean;
  errorCount?: number;
  warningCount?: number;
  readonly?: boolean;
}>();

const emit = defineEmits<{
  (e: 'click', scheduleId: string): void;
}>();

const getTagDotColor = (tag: ShipTag) => {
  return SHIP_TAG_COLORS[tag].text.replace('text-', 'bg-');
};

const statusColors: Record<string, string> = {
  anchored: 'from-console-500 to-console-600',
  approaching: 'from-harbor-yellow/70 to-harbor-yellow/50',
  berthing: 'from-harbor-purple/70 to-harbor-purple/50',
  loading: 'from-harbor-cyan/70 to-harbor-cyan/50',
  unloading: 'from-harbor-cyan/70 to-harbor-cyan/50',
  departing: 'from-harbor-orange/70 to-harbor-orange/50',
  departed: 'from-console-400/50 to-console-400/30',
};
</script>

<template>
  <div
    @click="emit('click', schedule.id)"
    :class="[
      'absolute rounded cursor-pointer overflow-hidden transition-all duration-150',
      'border border-opacity-40 hover:border-opacity-100',
      'bg-gradient-to-r shadow-lg hover:shadow-glow-blue',
      hasConflict ? 'animate-pulse-red border-harbor-red' : 'border-console-300',
      statusColors[schedule.status],
    ]"
    :style="{
      left: `${left}px`,
      width: `${width}px`,
      top: `${top}px`,
      height: `${height}px`,
    }"
  >
    <div v-if="ship?.tags && ship.tags.length > 0" class="absolute top-0 left-0 right-0 flex gap-0.5 px-1.5 pt-1">
      <span
        v-for="tag in ship.tags.slice(0, 5)"
        :key="tag"
        class="w-1.5 h-1.5 rounded-full shadow-sm"
        :class="getTagDotColor(tag)"
      />
    </div>
    <div class="h-full p-2 flex flex-col justify-center min-w-0">
      <div class="flex items-center gap-1.5 min-w-0">
        <CargoTypeIcon v-if="ship" :type="ship.cargoType" :size="12" />
        <span class="text-[11px] font-mono font-semibold text-white truncate">
          {{ ship?.name || 'Unknown' }}
        </span>
        <div v-if="errorCount && errorCount > 0" class="flex items-center gap-0.5 ml-auto">
          <span
            class="min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-harbor-red text-white text-[9px] font-mono font-bold"
          >
            {{ errorCount }}
          </span>
        </div>
        <div v-else-if="warningCount && warningCount > 0" class="flex items-center gap-0.5 ml-auto">
          <span
            class="min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-harbor-yellow text-console-900 text-[9px] font-mono font-bold"
          >
            {{ warningCount }}
          </span>
        </div>
      </div>
      <div class="flex items-center justify-between gap-1 mt-1">
        <PriorityBadge v-if="ship" :priority="ship.priority" size="sm" />
        <span class="text-[10px] font-mono text-white/70">
          {{ format(new Date(schedule.eta), 'HH:mm') }} - {{ format(new Date(schedule.etd), 'HH:mm') }}
        </span>
      </div>
      <div
        v-if="schedule.operationProgress > 0"
        class="mt-1 h-1 bg-black/30 rounded-full overflow-hidden"
      >
        <div
          class="h-full bg-white/80 rounded-full transition-all duration-500"
          :style="{ width: `${schedule.operationProgress}%` }"
        />
      </div>
    </div>
  </div>
</template>
