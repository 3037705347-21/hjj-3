<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useScheduleStore } from '../../stores/schedule';
import { useAuthStore } from '../../stores/auth';
import { mockUsers } from '../../data/mock';
import type { KeyShipInfo } from '../../types';
import {
  X,
  Handshake,
  User,
  Calendar,
  Ship,
  FileText,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  XCircle,
  Star,
  AlertOctagon,
} from 'lucide-vue-next';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'submitted', handoverId: string): void;
}>();

const store = useScheduleStore();
const authStore = useAuthStore();

const outgoingOperator = ref(authStore.currentUser?.displayName || store.currentOperator || '');
const incomingOperator = ref('');
const remarks = ref('');
const handoverTime = ref(format(new Date(), "yyyy-MM-dd'T'HH:mm", { locale: zhCN }));
const expandedKeyShips = ref(true);
const submitting = ref(false);

const unfinishedPlanCount = computed(() => store.unfinishedPlanCount);
const currentConflictCount = computed(() => store.totalConflictCount);
const keyShips = computed<KeyShipInfo[]>(() => store.keyShipsSnapshot);

const availableOperators = computed(() => {
  return mockUsers
    .filter((u) => u.status === 'active' && u.displayName !== outgoingOperator.value)
    .map((u) => u.displayName);
});

const canSubmit = computed(() => {
  return (
    outgoingOperator.value.trim().length > 0 &&
    incomingOperator.value.trim().length > 0 &&
    incomingOperator.value !== outgoingOperator.value
  );
});

watch(
  () => props.visible,
  (v) => {
    if (v) {
      outgoingOperator.value = authStore.currentUser?.displayName || store.currentOperator || '';
      incomingOperator.value = '';
      remarks.value = '';
      handoverTime.value = format(new Date(), "yyyy-MM-dd'T'HH:mm", { locale: zhCN });
      expandedKeyShips.value = true;
      submitting.value = false;
    }
  },
);

function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'critical':
      return 'text-harbor-red';
    case 'high':
      return 'text-harbor-orange';
    case 'normal':
      return 'text-harbor-cyan';
    default:
      return 'text-console-400';
  }
}

function getPriorityLabel(priority: string): string {
  switch (priority) {
    case 'critical':
      return '特级';
    case 'high':
      return '重点';
    case 'normal':
      return '普通';
    default:
      return '低';
  }
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    anchored: '锚地待泊',
    approaching: '进港中',
    berthing: '靠泊中',
    loading: '装货中',
    unloading: '卸货中',
    departing: '离泊中',
    departed: '已离港',
  };
  return labels[status] || status;
}

function handleSubmit() {
  if (!canSubmit.value || submitting.value) return;
  submitting.value = true;

  try {
    const record = store.createHandover({
      handoverTime: new Date(handoverTime.value),
      outgoingOperator: outgoingOperator.value.trim(),
      incomingOperator: incomingOperator.value.trim(),
      unfinishedPlanCount: unfinishedPlanCount.value,
      currentConflictCount: currentConflictCount.value,
      keyShips: keyShips.value,
      pendingIncidents: [],
      remarks: remarks.value.trim(),
      confirmed: false,
    });

    store.currentOperator = incomingOperator.value.trim();

    emit('submitted', record.id);
    handleClose();
  } finally {
    submitting.value = false;
  }
}

function handleClose() {
  emit('close');
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="visible" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-console-900/80 backdrop-blur-sm" @click="handleClose" />
        <div class="relative w-full max-w-2xl panel-border rounded-xl shadow-2xl z-10 max-h-[90vh] flex flex-col">
          <div class="flex items-center justify-between px-5 py-4 border-b border-console-500/20 shrink-0">
            <h3 class="font-mono text-sm font-semibold text-console-100 flex items-center gap-2">
              <Handshake class="w-4 h-4 text-harbor-cyan" />
              值班交接记录
            </h3>
            <button
              class="w-7 h-7 rounded flex items-center justify-center text-console-400 hover:text-console-100 hover:bg-console-700/50 transition-all"
              @click="handleClose"
            >
              <X class="w-4 h-4" />
            </button>
          </div>

          <div class="p-5 space-y-4 overflow-y-auto flex-1">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-mono text-console-300 mb-1.5 flex items-center gap-1">
                  <User class="w-3 h-3 text-harbor-orange" />
                  交班人
                </label>
                <select
                  v-model="outgoingOperator"
                  class="w-full px-3 py-2 rounded bg-console-800/60 border border-console-500/30 text-xs font-mono text-console-100 focus:outline-none focus:border-harbor-cyan/50"
                >
                  <option v-for="u in mockUsers.filter(u => u.status === 'active')" :key="u.id" :value="u.displayName">
                    {{ u.displayName }}
                  </option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-mono text-console-300 mb-1.5 flex items-center gap-1">
                  <User class="w-3 h-3 text-harbor-green" />
                  接班人
                </label>
                <select
                  v-model="incomingOperator"
                  class="w-full px-3 py-2 rounded bg-console-800/60 border border-console-500/30 text-xs font-mono text-console-100 focus:outline-none focus:border-harbor-cyan/50"
                >
                  <option value="" disabled>请选择接班人</option>
                  <option v-for="name in availableOperators" :key="name" :value="name">
                    {{ name }}
                  </option>
                </select>
              </div>
            </div>

            <div>
              <label class="block text-xs font-mono text-console-300 mb-1.5 flex items-center gap-1">
                <Calendar class="w-3 h-3 text-harbor-purple" />
                交接时间
              </label>
              <input
                v-model="handoverTime"
                type="datetime-local"
                class="w-full px-3 py-2 rounded bg-console-800/60 border border-console-500/30 text-xs font-mono text-console-100 focus:outline-none focus:border-harbor-cyan/50"
              />
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div
                class="flex items-center justify-between p-4 rounded-lg bg-harbor-yellow/10 border border-harbor-yellow/30"
              >
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-lg bg-harbor-yellow/20 flex items-center justify-center">
                    <Clock class="w-5 h-5 text-harbor-yellow" />
                  </div>
                  <div>
                    <p class="text-[10px] font-mono text-console-400 uppercase tracking-wider">未完成计划数</p>
                    <p class="text-xl font-bold font-mono text-harbor-yellow tabular-nums mt-0.5">
                      {{ unfinishedPlanCount }}
                    </p>
                  </div>
                </div>
              </div>
              <div
                class="flex items-center justify-between p-4 rounded-lg bg-harbor-red/10 border border-harbor-red/30"
              >
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-lg bg-harbor-red/20 flex items-center justify-center">
                    <AlertOctagon class="w-5 h-5 text-harbor-red" />
                  </div>
                  <div>
                    <p class="text-[10px] font-mono text-console-400 uppercase tracking-wider">当前冲突数</p>
                    <p class="text-xl font-bold font-mono text-harbor-red tabular-nums mt-0.5">
                      {{ currentConflictCount }}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div class="panel-border rounded-lg overflow-hidden">
              <button
                class="w-full flex items-center justify-between px-4 py-3 hover:bg-console-700/30 transition-colors"
                @click="expandedKeyShips = !expandedKeyShips"
              >
                <div class="flex items-center gap-2">
                  <Star class="w-4 h-4 text-harbor-orange" />
                  <span class="text-xs font-mono font-semibold text-console-100">
                    重点船舶 ({{ keyShips.length }})
                  </span>
                  <span
                    v-if="keyShips.length === 0"
                    class="text-[10px] font-mono text-console-500"
                  >
                    暂无重点船舶
                  </span>
                </div>
                <component
                  :is="expandedKeyShips ? ChevronUp : ChevronDown"
                  class="w-4 h-4 text-console-400"
                />
              </button>

              <Transition name="collapse">
                <div v-if="expandedKeyShips && keyShips.length > 0" class="border-t border-console-500/20">
                  <div class="divide-y divide-console-500/15">
                    <div
                      v-for="ship in keyShips"
                      :key="ship.shipId"
                      class="flex items-center justify-between px-4 py-3 hover:bg-console-700/20 transition-colors"
                    >
                      <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded bg-console-700/50 border border-console-500/30 flex items-center justify-center">
                          <Ship class="w-4 h-4 text-console-300" />
                        </div>
                        <div>
                          <p class="text-xs font-mono font-medium text-console-100 flex items-center gap-1.5">
                            {{ ship.shipName }}
                            <span
                              :class="[
                                'text-[9px] font-mono px-1.5 py-0.5 rounded border',
                                getPriorityColor(ship.priority),
                                ship.priority === 'critical' ? 'border-harbor-red/30 bg-harbor-red/10' :
                                ship.priority === 'high' ? 'border-harbor-orange/30 bg-harbor-orange/10' :
                                'border-harbor-cyan/30 bg-harbor-cyan/10',
                              ]"
                            >
                              {{ getPriorityLabel(ship.priority) }}
                            </span>
                          </p>
                          <p class="text-[10px] font-mono text-console-400 mt-0.5">
                            <span v-if="ship.berthName">{{ ship.berthName }} · </span>
                            {{ getStatusLabel(ship.status) }}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Transition>
            </div>

            <div>
              <label class="block text-xs font-mono text-console-300 mb-1.5 flex items-center gap-1">
                <FileText class="w-3 h-3 text-harbor-purple" />
                交接备注
              </label>
              <textarea
                v-model="remarks"
                rows="4"
                placeholder="请输入交接过程中的注意事项、待跟进问题等备注信息..."
                class="w-full px-3 py-2 rounded bg-console-800/60 border border-console-500/30 text-xs font-mono text-console-100 placeholder:text-console-500 focus:outline-none focus:border-harbor-cyan/50 resize-none"
              />
            </div>
          </div>

          <div class="flex items-center justify-end gap-3 px-5 py-4 border-t border-console-500/20 shrink-0">
            <button
              class="px-4 py-1.5 rounded text-xs font-mono font-medium text-console-300 border border-console-500/30 hover:bg-console-700/50 hover:text-console-100 transition-all flex items-center gap-1.5"
              @click="handleClose"
            >
              <XCircle class="w-3 h-3" />
              取消
            </button>
            <button
              :disabled="!canSubmit || submitting"
              class="px-4 py-1.5 rounded text-xs font-mono font-medium bg-harbor-cyan/20 text-harbor-cyan border border-harbor-cyan/30 hover:bg-harbor-cyan/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
              @click="handleSubmit"
            >
              <CheckCircle2 class="w-3 h-3" />
              {{ submitting ? '提交中...' : '确认交接' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.collapse-enter-active,
.collapse-leave-active {
  transition: all 0.25s ease;
  overflow: hidden;
}
.collapse-enter-from,
.collapse-leave-to {
  opacity: 0;
  max-height: 0;
}
.collapse-enter-to,
.collapse-leave-from {
  max-height: 500px;
}

.modal-enter-active,
.modal-leave-active {
  transition: all 0.25s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-from > div:last-child,
.modal-leave-to > div:last-child {
  transform: scale(0.95) translateY(-10px);
  opacity: 0;
}
</style>
