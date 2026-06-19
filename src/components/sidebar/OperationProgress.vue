<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import type { BerthSchedule, Ship, ProgressMode } from '../../types';
import { useScheduleStore } from '../../stores/schedule';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import {
  Clock,
  Users,
  ClipboardList,
  ArrowUpFromLine,
  ArrowDownToLine,
  Package,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Gauge,
  List,
} from 'lucide-vue-next';

const props = defineProps<{
  schedule: BerthSchedule;
  ship: Ship;
}>();

const store = useScheduleStore();

const progress = ref(props.schedule.operationProgress);
const team = ref(props.schedule.operationTeam || '');
const cargoCompleted = ref(props.schedule.cargoCompleted || 0);
const progressMode = ref<ProgressMode>(props.schedule.progressMode || 'percentage');

watch(
  () => props.schedule.operationProgress,
  (v) => (progress.value = v),
);

watch(
  () => props.schedule.cargoCompleted,
  (v) => (cargoCompleted.value = v || 0),
);

watch(
  () => props.schedule.progressMode,
  (v) => (progressMode.value = v || 'percentage'),
);

const cargoPercentage = computed(() => {
  if (!props.ship.cargoWeight) return 0;
  return Math.min(100, Math.round((cargoCompleted.value / props.ship.cargoWeight) * 100));
});

function updateProgress(value: number) {
  progress.value = value;
  store.updateOperationProgress(props.schedule.id, value);
}

function updateCargoCompleted(value: number) {
  cargoCompleted.value = value;
  store.updateCargoCompleted(props.schedule.id, value);
}

function toggleProgressMode() {
  const newMode: ProgressMode = progressMode.value === 'percentage' ? 'milestone' : 'percentage';
  progressMode.value = newMode;
  store.setProgressMode(props.schedule.id, newMode);
}

function formatTime(date?: Date) {
  if (!date) return '--';
  return format(new Date(date), 'MM-dd HH:mm', { locale: zhCN });
}

function getMilestoneStatus(index: number) {
  const milestones = props.schedule.milestones || [];
  if (!milestones[index]) return 'pending';
  if (milestones[index].completed) return 'completed';
  if (index > 0 && milestones[index - 1]?.completed) return 'current';
  return 'pending';
}
</script>

<template>
  <div class="panel-border rounded-lg p-4">
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <ClipboardList class="w-4 h-4 text-harbor-orange" />
        <h3 class="font-mono text-sm font-semibold text-console-100">作业进度</h3>
      </div>
      <button
        @click="toggleProgressMode"
        class="flex items-center gap-1 px-2 py-1 text-[10px] font-mono text-console-300 border border-console-500/40 rounded hover:border-harbor-cyan/50 hover:text-harbor-cyan transition-all"
      >
        <component :is="progressMode === 'milestone' ? List : Gauge" class="w-3 h-3" />
        {{ progressMode === 'milestone' ? '里程碑' : '百分比' }}
      </button>
    </div>

    <template v-if="progressMode === 'percentage'">
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
    </template>

    <template v-else>
      <div class="mb-4">
        <div class="relative">
          <div class="absolute left-3 top-3 bottom-3 w-0.5 bg-console-600/50" />
          <div class="space-y-3">
            <div
              v-for="(milestone, index) in schedule.milestones || []"
              :key="milestone.key"
              class="relative flex items-start gap-3 pl-1"
            >
              <div
                class="relative z-10 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                :class="{
                  'bg-harbor-cyan text-console-900': milestone.completed,
                  'bg-harbor-orange text-console-900 animate-pulse': getMilestoneStatus(index) === 'current',
                  'bg-console-700 text-console-500': getMilestoneStatus(index) === 'pending',
                }"
              >
                <component
                  :is="milestone.completed ? CheckCircle2 : Circle"
                  class="w-3.5 h-3.5"
                />
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between">
                  <span
                    class="text-xs font-mono font-medium"
                    :class="{
                      'text-console-100': milestone.completed,
                      'text-harbor-orange': getMilestoneStatus(index) === 'current',
                      'text-console-400': getMilestoneStatus(index) === 'pending',
                    }"
                  >
                    {{ milestone.label }}
                  </span>
                  <span class="text-[10px] font-mono text-console-500">
                    {{ milestone.progressWeight }}%
                  </span>
                </div>
                <div class="flex items-center gap-2 mt-0.5">
                  <span class="text-[10px] font-mono text-console-400">
                    计划: {{ formatTime(milestone.plannedTime) }}
                  </span>
                </div>
                <div v-if="milestone.actualTime" class="flex items-center gap-2 mt-0.5">
                  <span
                    class="text-[10px] font-mono"
                    :class="milestone.completed ? 'text-harbor-cyan' : 'text-console-500'"
                  >
                    实际: {{ formatTime(milestone.actualTime) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

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

    <div class="mt-3 p-2 rounded bg-console-800/60 border border-console-600/30">
      <div class="flex items-center gap-2 mb-2">
        <Package class="w-3.5 h-3.5 text-harbor-cyan" />
        <span class="text-[9px] font-mono text-console-400 uppercase tracking-wider">作业量</span>
      </div>
      <div class="flex items-center justify-between mb-1.5">
        <span class="text-[11px] font-mono text-console-300">已完成</span>
        <span class="text-[11px] font-mono text-harbor-cyan">
          {{ cargoCompleted.toLocaleString() }} / {{ ship.cargoWeight.toLocaleString() }} 吨
        </span>
      </div>
      <div class="relative w-full h-2 bg-console-700 rounded-full overflow-hidden">
        <div
          class="absolute inset-y-0 left-0 bg-gradient-to-r from-harbor-cyan to-harbor-cyan/70 rounded-full transition-all duration-300"
          :style="{ width: `${cargoPercentage}%` }"
        />
      </div>
      <input
        type="range"
        min="0"
        :max="ship.cargoWeight"
        :value="cargoCompleted"
        @input="(e) => updateCargoCompleted(Number((e.target as HTMLInputElement).value))"
        class="w-full mt-1.5 h-1 bg-console-600 rounded-full appearance-none cursor-pointer accent-harbor-cyan"
      />
    </div>

    <div v-if="schedule.delayReason" class="mt-3 p-2 rounded bg-harbor-yellow/10 border border-harbor-yellow/30">
      <div class="flex items-center gap-2 mb-1">
        <AlertTriangle class="w-3.5 h-3.5 text-harbor-yellow" />
        <p class="text-[9px] font-mono text-harbor-yellow uppercase tracking-wider">延误原因</p>
      </div>
      <p class="text-[11px] font-mono text-console-100">{{ schedule.delayReason }}</p>
    </div>

    <div v-if="schedule.remarks" class="mt-3 p-2 rounded bg-harbor-orange/10 border border-harbor-orange/30">
      <p class="text-[9px] font-mono text-harbor-orange uppercase tracking-wider mb-1">备注</p>
      <p class="text-[11px] font-mono text-console-100">{{ schedule.remarks }}</p>
    </div>
  </div>
</template>
