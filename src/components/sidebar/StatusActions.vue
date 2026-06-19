<script setup lang="ts">
import type { BerthSchedule, OperationStatus } from '../../types';
import { useScheduleStore } from '../../stores/schedule';
import { useAuthStore } from '../../stores/auth';
import {
  Anchor,
  Navigation,
  Ship,
  ArrowUpFromLine,
  ArrowDownToLine,
  LogOut,
  CheckCircle2,
  MessageSquare,
  AlertTriangle,
  Lock,
} from 'lucide-vue-next';
import { ref, watch } from 'vue';

const props = defineProps<{
  schedule: BerthSchedule;
}>();

const store = useScheduleStore();
const authStore = useAuthStore();
const remarkInput = ref(props.schedule.remarks || '');
const delayReasonInput = ref(props.schedule.delayReason || '');

watch(
  () => props.schedule.remarks,
  (v) => (remarkInput.value = v || ''),
);

watch(
  () => props.schedule.delayReason,
  (v) => (delayReasonInput.value = v || ''),
);

const statusActions: { status: OperationStatus; label: string; icon: typeof Anchor; color: string }[] = [
  { status: 'anchored', label: '锚泊', icon: Anchor, color: 'border-console-400 text-console-200 hover:bg-console-500/30' },
  { status: 'approaching', label: '进港', icon: Navigation, color: 'border-harbor-yellow text-harbor-yellow hover:bg-harbor-yellow/15' },
  { status: 'berthing', label: '靠泊', icon: Ship, color: 'border-harbor-purple text-harbor-purple hover:bg-harbor-purple/15' },
  { status: 'loading', label: '装货', icon: ArrowUpFromLine, color: 'border-harbor-cyan text-harbor-cyan hover:bg-harbor-cyan/15' },
  { status: 'unloading', label: '卸货', icon: ArrowDownToLine, color: 'border-harbor-cyan text-harbor-cyan hover:bg-harbor-cyan/15' },
  { status: 'departing', label: '离泊', icon: LogOut, color: 'border-harbor-orange text-harbor-orange hover:bg-harbor-orange/15' },
  { status: 'departed', label: '离港', icon: CheckCircle2, color: 'border-console-300 text-console-300 hover:bg-console-400/20' },
];

function updateStatus(status: OperationStatus) {
  if (!authStore.canChangeStatus) return;
  store.updateScheduleStatus(props.schedule.id, status);
}

function saveRemark() {
  if (!authStore.canEditSchedule) return;
  store.updateSchedule(props.schedule.id, { remarks: remarkInput.value });
}

function saveDelayReason() {
  if (!authStore.canEditSchedule) return;
  store.updateDelayReason(props.schedule.id, delayReasonInput.value);
}
</script>

<template>
  <div class="panel-border rounded-lg p-4">
    <div class="flex items-center justify-between mb-3">
      <h3 class="font-mono text-sm font-semibold text-console-100">状态控制</h3>
      <div v-if="!authStore.canChangeStatus" class="flex items-center gap-1 text-[10px] font-mono text-harbor-yellow">
        <Lock class="w-3 h-3" />
        <span>只读</span>
      </div>
    </div>

    <div class="grid grid-cols-4 gap-2 mb-4">
      <button
        v-for="action in statusActions"
        :key="action.status"
        @click="updateStatus(action.status)"
        :disabled="!authStore.canChangeStatus"
        :class="[
          'flex flex-col items-center gap-1 py-2 px-1 rounded border transition-all duration-150',
          authStore.canChangeStatus ? 'cursor-pointer' : 'cursor-not-allowed opacity-50',
          schedule.status === action.status
            ? action.color + ' bg-opacity-20 shadow-glow-blue scale-[1.02]'
            : 'border-console-600/50 text-console-400 hover:border-opacity-80',
        ]"
      >
        <component :is="action.icon" class="w-4 h-4" />
        <span class="text-[10px] font-mono">{{ action.label }}</span>
      </button>
    </div>

    <div class="border-t border-console-600/30 pt-3">
      <div class="flex items-center gap-2 mb-2">
        <AlertTriangle class="w-3.5 h-3.5 text-harbor-yellow" />
        <span class="text-[10px] font-mono text-console-400 uppercase tracking-wider">延误原因</span>
      </div>
      <textarea
        v-model="delayReasonInput"
        @blur="saveDelayReason"
        :readonly="!authStore.canEditSchedule"
        rows="2"
        placeholder="输入延误原因..."
        class="w-full px-3 py-2 text-xs font-mono bg-console-800/80 border border-console-500/40 rounded text-console-100 placeholder:text-console-500 focus:outline-none focus:border-harbor-yellow/50 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
      />
    </div>

    <div class="border-t border-console-600/30 pt-3 mt-3">
      <div class="flex items-center gap-2 mb-2">
        <MessageSquare class="w-3.5 h-3.5 text-console-400" />
        <span class="text-[10px] font-mono text-console-400 uppercase tracking-wider">调度备注</span>
      </div>
      <textarea
        v-model="remarkInput"
        @blur="saveRemark"
        :readonly="!authStore.canEditSchedule"
        rows="3"
        placeholder="输入调度备注..."
        class="w-full px-3 py-2 text-xs font-mono bg-console-800/80 border border-console-500/40 rounded text-console-100 placeholder:text-console-500 focus:outline-none focus:border-harbor-cyan/50 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
      />
    </div>
  </div>
</template>
