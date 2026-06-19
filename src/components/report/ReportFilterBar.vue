<script setup lang="ts">
import { computed } from 'vue';
import type { ReportFilterCriteria, CargoType, ShipPriority } from '../../types';
import { ABNORMAL_REASON_CATEGORY_LABELS } from '../../types';
import { mockBerths } from '../../data/mock';
import { getAllOperationTeams } from '../../utils/analytics';
import { Filter, X } from 'lucide-vue-next';

const props = defineProps<{
  modelValue: ReportFilterCriteria;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: ReportFilterCriteria): void;
}>();

const cargoTypeOptions: { value: CargoType; label: string }[] = [
  { value: 'container', label: '集装箱' },
  { value: 'bulk', label: '散货' },
  { value: 'liquid', label: '液体货' },
  { value: 'general', label: '杂货' },
  { value: 'ro-ro', label: '滚装' },
];

const priorityOptions: { value: ShipPriority; label: string }[] = [
  { value: 'critical', label: '紧急' },
  { value: 'high', label: '高优' },
  { value: 'normal', label: '普通' },
  { value: 'low', label: '低优' },
];

const operationTeams = computed(() => getAllOperationTeams());

function toggleBerth(id: string) {
  const current = props.modelValue.berthIds;
  const next = current.includes(id) ? current.filter((b) => b !== id) : [...current, id];
  emit('update:modelValue', { ...props.modelValue, berthIds: next });
}

function toggleCargo(type: CargoType) {
  const current = props.modelValue.cargoTypes;
  const next = current.includes(type) ? current.filter((c) => c !== type) : [...current, type];
  emit('update:modelValue', { ...props.modelValue, cargoTypes: next });
}

function togglePriority(p: ShipPriority) {
  const current = props.modelValue.priorities;
  const next = current.includes(p) ? current.filter((x) => x !== p) : [...current, p];
  emit('update:modelValue', { ...props.modelValue, priorities: next });
}

function toggleTeam(team: string) {
  const current = props.modelValue.operationTeams;
  const next = current.includes(team) ? current.filter((t) => t !== team) : [...current, team];
  emit('update:modelValue', { ...props.modelValue, operationTeams: next });
}

function clearFilters() {
  emit('update:modelValue', {
    startDate: null,
    endDate: null,
    berthIds: [],
    cargoTypes: [],
    priorities: [],
    operationTeams: [],
  });
}

const activeFilterCount = computed(() => {
  return (
    props.modelValue.berthIds.length +
    props.modelValue.cargoTypes.length +
    props.modelValue.priorities.length +
    props.modelValue.operationTeams.length
  );
});
</script>

<template>
  <div class="panel-border rounded-lg p-4 space-y-3">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <Filter class="w-4 h-4 text-harbor-cyan" />
        <span class="font-mono text-sm font-semibold text-console-100">筛选条件</span>
        <span
          v-if="activeFilterCount > 0"
          class="ml-1 min-w-[18px] h-[18px] px-1 rounded-full bg-harbor-cyan/20 text-harbor-cyan text-[10px] font-mono font-bold flex items-center justify-center border border-harbor-cyan/40"
        >
          {{ activeFilterCount }}
        </span>
      </div>
      <button
        v-if="activeFilterCount > 0"
        @click="clearFilters"
        class="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono text-console-300 border border-console-500/40 hover:text-harbor-red hover:border-harbor-red/50 transition-all"
      >
        <X class="w-3 h-3" />
        清空
      </button>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
      <div class="space-y-1.5">
        <label class="text-[10px] font-mono text-console-400 uppercase tracking-wider">泊位</label>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="berth in mockBerths"
            :key="berth.id"
            @click="toggleBerth(berth.id)"
            :class="[
              'px-2 py-1 rounded text-[10px] font-mono border transition-all',
              modelValue.berthIds.includes(berth.id)
                ? 'bg-harbor-cyan/15 text-harbor-cyan border-harbor-cyan/40'
                : 'bg-console-700/30 text-console-300 border-console-500/30 hover:border-console-400/50',
            ]"
          >
            {{ berth.name }}
          </button>
        </div>
      </div>

      <div class="space-y-1.5">
        <label class="text-[10px] font-mono text-console-400 uppercase tracking-wider">货种</label>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="opt in cargoTypeOptions"
            :key="opt.value"
            @click="toggleCargo(opt.value)"
            :class="[
              'px-2 py-1 rounded text-[10px] font-mono border transition-all',
              modelValue.cargoTypes.includes(opt.value)
                ? 'bg-harbor-purple/15 text-harbor-purple border-harbor-purple/40'
                : 'bg-console-700/30 text-console-300 border-console-500/30 hover:border-console-400/50',
            ]"
          >
            {{ opt.label }}
          </button>
        </div>
      </div>

      <div class="space-y-1.5">
        <label class="text-[10px] font-mono text-console-400 uppercase tracking-wider">优先级</label>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="opt in priorityOptions"
            :key="opt.value"
            @click="togglePriority(opt.value)"
            :class="[
              'px-2 py-1 rounded text-[10px] font-mono border transition-all',
              modelValue.priorities.includes(opt.value)
                ? 'bg-harbor-orange/15 text-harbor-orange border-harbor-orange/40'
                : 'bg-console-700/30 text-console-300 border-console-500/30 hover:border-console-400/50',
            ]"
          >
            {{ opt.label }}
          </button>
        </div>
      </div>

      <div class="space-y-1.5">
        <label class="text-[10px] font-mono text-console-400 uppercase tracking-wider">作业班组</label>
        <div v-if="operationTeams.length > 0" class="flex flex-wrap gap-1.5">
          <button
            v-for="team in operationTeams"
            :key="team"
            @click="toggleTeam(team)"
            :class="[
              'px-2 py-1 rounded text-[10px] font-mono border transition-all',
              modelValue.operationTeams.includes(team)
                ? 'bg-harbor-blue/15 text-harbor-blue border-harbor-blue/40'
                : 'bg-console-700/30 text-console-300 border-console-500/30 hover:border-console-400/50',
            ]"
          >
            {{ team }}
          </button>
        </div>
        <p v-else class="text-[10px] font-mono text-console-500">暂无班组数据</p>
      </div>
    </div>
  </div>
</template>
