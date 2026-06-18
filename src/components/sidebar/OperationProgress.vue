<script setup lang="ts">
import { ref, watch } from 'vue';
import type { BerthSchedule, Ship } from '../../types';
import { useScheduleStore } from '../../stores/schedule';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Clock, Users, ClipboardList, ArrowUpFromLine, ArrowDownToLine } from 'lucide-vue-next';

const props = defineProps<{
  schedule: BerthSchedule;
  ship: Ship;
}>();

const store = useScheduleStore();

const progress = ref(props.schedule.operationProgress);
const team = ref(props.schedule.operationTeam || '');

watch(
  () => props.schedule.operationProgress,
  (v) => (progress.value = v),
);

function updateProgress(value: number) {
  progress.value = value;
  store.updateOperationProgress(props.schedule.id, value);
}
</script>

<template>
  <div class="panel-border rounded-lg p-4">
    <div class="flex items-center gap-2 mb-4">
      <ClipboardList class="w-4 h-4 text-harbor-orange" />
      <h3 class="font-mono text-sm font-semibold text-console-100">作业进度</h3>
    </div>

    <div class="mb-4">
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2">
          <component
            :is="schedule.status === 'loading' ? ArrowUpFromLine : ArrowDownToLine"
            class="w-4 h-4 text-harbor-cyan"
          />
          <span class="text-xs font-mono text-console-200">
            {{ schedule.status === 'loading' ? '装货作业' : schedule.status === 'unloading' ? '卸货作业' : '作业状态' }}
          </span>
        </div>
        <span class="text-lg font-mono font-bold text-harbor-cyan glow-text-cyan">
          {{ progress }}%
        </span>
      </div>
      <div class="relative w-full h-4 bg-console-700 rounded-full overflow-hidden border border-console-500/50">
        <div
          class="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
          :class="{
            'bg-gradient-to-r from-harbor-cyan to-harbor-cyan/60': progress < 70,
            'bg-gradient-to-r from-harbor-yellow to-harbor-orange': progress >= 70 && progress < 100,
            'bg-gradient-to-r from-harbor-cyan to-harbor-cyan': progress >= 100,
          }"
          :style="{ width: `${progress}%` }"
        />
        <div
          class="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent pointer-events-none"
        />
      </div>
      <input
        type="range"
        min="0"
        max="100"
        :value="progress"
        @input="(e) => updateProgress(Number((e.target as HTMLInputElement).value))"
        class="w-full mt-2 h-1 bg-console-600 rounded-full appearance-none cursor-pointer accent-harbor-cyan"
      />
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div class="flex items-start gap-2 p-2 rounded bg-console-800/60 border border-console-600/30">
        <Clock class="w-3.5 h-3.5 text-console-400 mt-0.5" />
        <div>
          <p class="text-[9px] font-mono text-console-400 uppercase tracking-wider">ETA / ETD</p>
          <p class="text-[11px] font-mono text-console-100">
            {{ format(new Date(schedule.eta), 'MM-dd HH:mm', { locale: zhCN }) }}
          </p>
          <p class="text-[11px] font-mono text-console-300">
            {{ format(new Date(schedule.etd), 'MM-dd HH:mm', { locale: zhCN }) }}
          </p>
        </div>
      </div>
      <div class="flex items-start gap-2 p-2 rounded bg-console-800/60 border border-console-600/30">
        <Users class="w-3.5 h-3.5 text-console-400 mt-0.5" />
        <div>
          <p class="text-[9px] font-mono text-console-400 uppercase tracking-wider">作业班组</p>
          <input
            v-model="team"
            @change="store.updateSchedule(schedule.id, { operationTeam: team })"
            class="text-[11px] font-mono text-console-100 bg-transparent border-none p-0 outline-none w-full"
            placeholder="分配班组"
          />
        </div>
      </div>
    </div>

    <div v-if="schedule.remarks" class="mt-3 p-2 rounded bg-harbor-orange/10 border border-harbor-orange/30">
      <p class="text-[9px] font-mono text-harbor-orange uppercase tracking-wider mb-1">备注</p>
      <p class="text-[11px] font-mono text-console-100">{{ schedule.remarks }}</p>
    </div>
  </div>
</template>
