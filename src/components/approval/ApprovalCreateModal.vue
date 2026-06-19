<script setup lang="ts">
import { ref, computed } from 'vue';
import { useApprovalStore } from '../../stores/approval';
import { useScheduleStore } from '../../stores/schedule';
import type { ApprovalType } from '../../types';
import { APPROVAL_TYPE_LABELS } from '../../types';
import { X, Send, AlertTriangle } from 'lucide-vue-next';

const props = defineProps<{
  visible: boolean;
  scheduleId?: string;
  prefillType?: ApprovalType;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'submitted', approvalNo: string): void;
}>();

const approvalStore = useApprovalStore();
const scheduleStore = useScheduleStore();

const selectedType = ref<ApprovalType>(props.prefillType || 'manual_adjust');
const opinion = ref('');
const submitting = ref(false);

const typeOptions = computed(() =>
  Object.entries(APPROVAL_TYPE_LABELS).map(([key, label]) => ({
    key: key as ApprovalType,
    label,
  })),
);

const availableSchedules = computed(() => scheduleStore.schedules);

const targetScheduleId = ref(props.scheduleId || '');

const canSubmit = computed(() =>
  targetScheduleId.value && opinion.value.trim().length > 0,
);

function getShipName(scheduleId: string): string {
  const schedule = scheduleStore.schedules.find((s) => s.id === scheduleId);
  if (!schedule) return '-';
  const ship = scheduleStore.getShipById(schedule.shipId);
  return ship?.name || schedule.shipId;
}

function handleSubmit() {
  if (!canSubmit.value) return;
  submitting.value = true;

  try {
    const schedule = scheduleStore.schedules.find(
      (s) => s.id === targetScheduleId.value,
    );
    const order = approvalStore.createOrder({
      scheduleId: targetScheduleId.value,
      type: selectedType.value,
      opinion: opinion.value.trim(),
      beforeSnapshot: schedule
        ? { berthId: schedule.berthId, eta: schedule.eta, etd: schedule.etd }
        : null,
      afterSnapshot: null,
    });

    scheduleStore.addLog({
      type: 'create',
      scheduleId: targetScheduleId.value,
      description: `发起审批 ${order.approvalNo}（${APPROVAL_TYPE_LABELS[selectedType.value]}）`,
    });

    emit('submitted', order.approvalNo);
    handleClose();
  } finally {
    submitting.value = false;
  }
}

function handleClose() {
  opinion.value = '';
  targetScheduleId.value = props.scheduleId || '';
  selectedType.value = props.prefillType || 'manual_adjust';
  emit('close');
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="fixed inset-0 z-50 flex items-center justify-center"
    >
      <div
        class="absolute inset-0 bg-console-900/80 backdrop-blur-sm"
        @click="handleClose"
      />
      <div class="relative w-full max-w-lg panel-border rounded-xl shadow-2xl z-10">
        <div class="flex items-center justify-between px-5 py-4 border-b border-console-500/20">
          <h3 class="font-mono text-sm font-semibold text-console-100 flex items-center gap-2">
            <Send class="w-4 h-4 text-harbor-cyan" />
            发起审批
          </h3>
          <button
            class="w-7 h-7 rounded flex items-center justify-center text-console-400 hover:text-console-100 hover:bg-console-700/50 transition-all"
            @click="handleClose"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <div class="p-5 space-y-4">
          <div>
            <label class="block text-xs font-mono text-console-300 mb-1.5">关联调度计划</label>
            <select
              v-model="targetScheduleId"
              class="w-full px-3 py-2 rounded bg-console-800/60 border border-console-500/30 text-xs font-mono text-console-100 focus:outline-none focus:border-harbor-cyan/50"
            >
              <option value="" disabled>选择调度计划</option>
              <option
                v-for="s in availableSchedules"
                :key="s.id"
                :value="s.id"
              >
                {{ s.id }} - {{ getShipName(s.id) }}
              </option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-mono text-console-300 mb-1.5">审批类型</label>
            <select
              v-model="selectedType"
              class="w-full px-3 py-2 rounded bg-console-800/60 border border-console-500/30 text-xs font-mono text-console-100 focus:outline-none focus:border-harbor-cyan/50"
            >
              <option
                v-for="opt in typeOptions"
                :key="opt.key"
                :value="opt.key"
              >
                {{ opt.label }}
              </option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-mono text-console-300 mb-1.5">审批意见</label>
            <textarea
              v-model="opinion"
              rows="3"
              placeholder="请输入审批事由和说明..."
              class="w-full px-3 py-2 rounded bg-console-800/60 border border-console-500/30 text-xs font-mono text-console-100 placeholder:text-console-500 focus:outline-none focus:border-harbor-cyan/50 resize-none"
            />
          </div>

          <div
            v-if="approvalStore.scheduleNeedsApproval(targetScheduleId)"
            class="flex items-start gap-2 p-3 rounded bg-harbor-yellow/10 border border-harbor-yellow/30"
          >
            <AlertTriangle class="w-4 h-4 text-harbor-yellow shrink-0 mt-0.5" />
            <span class="text-xs font-mono text-harbor-yellow">
              该计划已有待审批的审批单，无需重复提交
            </span>
          </div>
        </div>

        <div class="flex items-center justify-end gap-3 px-5 py-4 border-t border-console-500/20">
          <button
            class="px-4 py-1.5 rounded text-xs font-mono font-medium text-console-300 border border-console-500/30 hover:bg-console-700/50 hover:text-console-100 transition-all"
            @click="handleClose"
          >
            取消
          </button>
          <button
            :disabled="!canSubmit || approvalStore.scheduleNeedsApproval(targetScheduleId)"
            class="px-4 py-1.5 rounded text-xs font-mono font-medium bg-harbor-cyan/20 text-harbor-cyan border border-harbor-cyan/30 hover:bg-harbor-cyan/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
            @click="handleSubmit"
          >
            <Send class="w-3 h-3" />
            提交审批
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
