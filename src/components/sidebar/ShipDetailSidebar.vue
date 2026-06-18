<script setup lang="ts">
import { useScheduleStore } from '../../stores/schedule';
import { X, ChevronRight } from 'lucide-vue-next';
import ShipInfoCard from './ShipInfoCard.vue';
import OperationProgress from './OperationProgress.vue';
import StatusActions from './StatusActions.vue';
import StatusBadge from '../common/StatusBadge.vue';
import ConflictAlert from '../logs/ConflictAlert.vue';
import { computed } from 'vue';

const store = useScheduleStore();

const scheduleConflicts = computed(() =>
  store.conflicts.filter(
    (c) =>
      c.scheduleId === store.selectedScheduleId ||
      c.relatedScheduleId === store.selectedScheduleId,
  ),
);

function closeSidebar() {
  store.setSelectedSchedule(null);
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
        <button
          @click="closeSidebar"
          class="w-8 h-8 flex items-center justify-center rounded border border-console-500/40 text-console-300 hover:text-harbor-red hover:border-harbor-red/50 hover:bg-harbor-red/10 transition-all"
        >
          <X class="w-4 h-4" />
        </button>
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

        <OperationProgress
          :schedule="store.selectedSchedule"
          :ship="store.selectedShip"
        />

        <StatusActions :schedule="store.selectedSchedule" />
      </div>
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
</style>
