<script setup lang="ts">
import { ref, watch } from 'vue';
import { XCircle, AlertTriangle, Send, MessageSquare } from 'lucide-vue-next';
import type { AbnormalCategory } from '../../types';
import { ABNORMAL_CATEGORY_LABELS } from '../../types';
import { useSiteCheckinStore } from '../../stores/siteCheckin';
import { useAuthStore } from '../../stores/auth';

const props = defineProps<{
  visible: boolean;
  checkinId: string | null;
}>();

const emit = defineEmits<{
  close: [];
  submitted: [checkinId: string];
}>();

const siteCheckinStore = useSiteCheckinStore();
const authStore = useAuthStore();

const category = ref<AbnormalCategory>('other');
const description = ref('');

watch(
  () => props.visible,
  (v) => {
    if (v) {
      category.value = 'other';
      description.value = '';
    }
  },
);

function handleClose() {
  emit('close');
}

function handleSubmit() {
  if (!props.checkinId || !description.value.trim()) return;

  siteCheckinStore.reportAbnormal(
    props.checkinId,
    category.value,
    description.value.trim(),
  );

  emit('submitted', props.checkinId);
  handleClose();
}

const categoryOptions: AbnormalCategory[] = [
  'weather',
  'equipment_failure',
  'tide_window',
  'ship_delay',
  'labor_shortage',
  'cargo_issue',
  'berth_maintenance',
  'other',
];
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="visible" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-console-900/80 backdrop-blur-sm" @click="handleClose" />
        <div class="relative w-full max-w-lg panel-border rounded-xl shadow-2xl z-10">
          <div class="flex items-center justify-between px-5 py-4 border-b border-console-500/20">
            <h3 class="font-mono text-sm font-semibold text-console-100 flex items-center gap-2">
              <AlertTriangle class="w-4 h-4 text-harbor-red" />
              异常登记
            </h3>
            <button
              @click="handleClose"
              class="w-7 h-7 rounded flex items-center justify-center text-console-400 hover:text-console-100 hover:bg-console-700/50 transition-all"
            >
              <XCircle class="w-4 h-4" />
            </button>
          </div>

          <div class="p-5 space-y-4">
            <div>
              <label class="block text-xs font-mono text-console-300 mb-1.5">
                异常类型 <span class="text-harbor-red">*</span>
              </label>
              <div class="grid grid-cols-2 gap-2">
                <button
                  v-for="opt in categoryOptions"
                  :key="opt"
                  @click="category = opt"
                  :class="[
                    'px-3 py-2 rounded text-xs font-mono border transition-all text-left',
                    category === opt
                      ? 'bg-harbor-red/20 text-harbor-red border-harbor-red/40'
                      : 'bg-console-800/60 text-console-300 border-console-500/30 hover:border-console-400/50',
                  ]"
                >
                  {{ ABNORMAL_CATEGORY_LABELS[opt] }}
                </button>
              </div>
            </div>

            <div>
              <label class="block text-xs font-mono text-console-300 mb-1.5">
                异常说明 <span class="text-harbor-red">*</span>
              </label>
              <textarea
                v-model="description"
                rows="4"
                placeholder="请详细描述异常情况..."
                class="w-full px-3 py-2 text-xs font-mono bg-console-800/80 border border-console-500/40 rounded text-console-100 placeholder:text-console-500 focus:outline-none focus:border-harbor-red/50 resize-none"
              />
            </div>

            <div class="p-3 rounded bg-console-800/30 border border-console-500/20">
              <div class="flex items-start gap-2">
                <MessageSquare class="w-3.5 h-3.5 text-console-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p class="text-[10px] font-mono text-console-400">
                    填报人：<span class="text-console-200">{{ authStore.currentUser?.displayName || '系统' }}</span>
                  </p>
                  <p class="text-[10px] font-mono text-console-500 mt-0.5">
                    填报后将自动记录操作日志，并通知相关调度人员
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div class="flex items-center justify-end gap-2 px-5 py-4 border-t border-console-500/20">
            <button
              @click="handleClose"
              class="px-4 py-1.5 rounded text-xs font-mono text-console-300 border border-console-500/30 hover:bg-console-700/50 transition-all"
            >
              取消
            </button>
            <button
              @click="handleSubmit"
              :disabled="!description.trim()"
              class="px-4 py-1.5 rounded text-xs font-mono bg-harbor-red/20 text-harbor-red border border-harbor-red/30 hover:bg-harbor-red/30 transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send class="w-3 h-3" />
              提交异常
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
