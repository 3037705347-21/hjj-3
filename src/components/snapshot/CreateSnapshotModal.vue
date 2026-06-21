<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useSnapshotStore } from '../../stores/snapshot';
import { useScheduleStore } from '../../stores/schedule';
import type { SnapshotCreateMethod } from '../../types';
import { SNAPSHOT_CREATE_METHOD_LABELS } from '../../types';
import {
  Camera,
  X,
  Clock,
  Handshake,
  AlertTriangle,
  CheckCircle,
  Play,
  Tag,
  FileText,
  Check,
} from 'lucide-vue-next';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const props = defineProps<{
  visible: boolean;
  defaultMethod?: SnapshotCreateMethod;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'created', snapshotId: string): void;
}>();

const snapshotStore = useSnapshotStore();
const scheduleStore = useScheduleStore();

const name = ref('');
const description = ref('');
const createMethod = ref<SnapshotCreateMethod>('manual');
const tags = ref<string[]>([]);
const tagInput = ref('');
const isCreating = ref(false);

const methodOptions = computed(() =>
  (Object.keys(SNAPSHOT_CREATE_METHOD_LABELS) as SnapshotCreateMethod[]).map((key) => ({
    key,
    label: SNAPSHOT_CREATE_METHOD_LABELS[key],
  })),
);

const methodIconMap: Record<SnapshotCreateMethod, typeof Camera> = {
  manual: Camera,
  auto: Clock,
  handover: Handshake,
  incident: AlertTriangle,
  approval: CheckCircle,
  scenario_apply: Play,
};

const previewStats = computed(() => ({
  shipsInPort: scheduleStore.shipsInPort,
  shipsWaiting: scheduleStore.shipsWaiting,
  conflictCount: scheduleStore.totalConflictCount,
  totalSchedules: scheduleStore.schedules.length,
}));

watch(
  () => props.visible,
  (val) => {
    if (val) {
      const now = new Date();
      const method = props.defaultMethod || 'manual';
      name.value = `${format(now, 'yyyy-MM-dd HH:mm')} ${SNAPSHOT_CREATE_METHOD_LABELS[method]}快照`;
      description.value = '';
      createMethod.value = method;
      tags.value = [];
      isCreating.value = false;
    }
  },
);

function addTag() {
  const tag = tagInput.value.trim();
  if (tag && !tags.value.includes(tag)) {
    tags.value.push(tag);
  }
  tagInput.value = '';
}

function removeTag(tag: string) {
  const idx = tags.value.indexOf(tag);
  if (idx > -1) {
    tags.value.splice(idx, 1);
  }
}

function handleCreate() {
  if (!name.value.trim()) return;

  isCreating.value = true;

  setTimeout(() => {
    const snapshot = snapshotStore.createSnapshot({
      name: name.value.trim(),
      description: description.value.trim() || undefined,
      createMethod: createMethod.value,
      tags: tags.value.length > 0 ? tags.value : undefined,
    });

    isCreating.value = false;
    emit('created', snapshot.id);
    emit('close');
  }, 500);
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="visible"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div
          class="absolute inset-0 bg-black/60 backdrop-blur-sm"
          @click="emit('close')"
        />
        <div class="relative w-full max-w-lg bg-console-800 rounded-xl border border-console-500/40 shadow-2xl overflow-hidden">
          <div class="px-5 py-4 border-b border-console-500/30 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-lg bg-harbor-cyan/20 flex items-center justify-center">
                <Camera class="w-5 h-5 text-harbor-cyan" />
              </div>
              <div>
                <h3 class="text-base font-semibold text-console-100">创建调度快照</h3>
                <p class="text-xs text-console-400 mt-0.5">保存当前调度盘面的只读历史版本</p>
              </div>
            </div>
            <button
              @click="emit('close')"
              class="p-1.5 text-console-400 hover:text-console-100 hover:bg-console-700/50 rounded-md transition-colors"
            >
              <X class="w-5 h-5" />
            </button>
          </div>

          <div class="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
            <div>
              <label class="block text-sm font-medium text-console-200 mb-1.5">快照名称</label>
              <input
                v-model="name"
                type="text"
                placeholder="请输入快照名称"
                class="w-full h-10 px-3 bg-console-900/80 border border-console-500/40 rounded-lg text-sm text-console-100 placeholder-console-400 focus:outline-none focus:border-harbor-cyan/50 focus:ring-1 focus:ring-harbor-cyan/30"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-console-200 mb-1.5">创建方式</label>
              <div class="grid grid-cols-3 gap-2">
                <button
                  v-for="opt in methodOptions"
                  :key="opt.key"
                  @click="createMethod = opt.key"
                  :class="[
                    'flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all',
                    createMethod === opt.key
                      ? 'bg-harbor-cyan/15 border-harbor-cyan/40 text-harbor-cyan'
                      : 'bg-console-900/50 border-console-500/30 text-console-300 hover:border-console-400/50',
                  ]"
                >
                  <component :is="methodIconMap[opt.key]" class="w-5 h-5" />
                  <span class="text-xs font-medium">{{ opt.label }}</span>
                </button>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-console-200 mb-1.5">描述说明</label>
              <textarea
                v-model="description"
                rows="3"
                placeholder="可选：输入快照的描述说明..."
                class="w-full px-3 py-2 bg-console-900/80 border border-console-500/40 rounded-lg text-sm text-console-100 placeholder-console-400 focus:outline-none focus:border-harbor-cyan/50 focus:ring-1 focus:ring-harbor-cyan/30 resize-none"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-console-200 mb-1.5 flex items-center gap-1.5">
                <Tag class="w-4 h-4" />
                标签
              </label>
              <div class="flex flex-wrap gap-2 mb-2">
                <span
                  v-for="tag in tags"
                  :key="tag"
                  class="inline-flex items-center gap-1 px-2 py-0.5 bg-harbor-blue/15 text-harbor-blue text-xs rounded-md border border-harbor-blue/30"
                >
                  {{ tag }}
                  <button @click="removeTag(tag)" class="hover:text-harbor-cyan">
                    <X class="w-3 h-3" />
                  </button>
                </span>
              </div>
              <div class="flex gap-2">
                <input
                  v-model="tagInput"
                  type="text"
                  placeholder="输入标签后回车添加"
                  @keyup.enter="addTag"
                  class="flex-1 h-8 px-3 bg-console-900/80 border border-console-500/40 rounded-md text-sm text-console-100 placeholder-console-400 focus:outline-none focus:border-harbor-cyan/50"
                />
                <button
                  @click="addTag"
                  class="h-8 px-3 bg-console-700/50 text-console-200 text-sm rounded-md hover:bg-console-700 transition-colors"
                >
                  添加
                </button>
              </div>
            </div>

            <div class="p-3 bg-console-900/50 rounded-lg border border-console-500/30">
              <div class="text-xs text-console-400 mb-2 flex items-center gap-1.5">
                <FileText class="w-3.5 h-3.5" />
                当前盘面预览（将被保存）
              </div>
              <div class="grid grid-cols-4 gap-3">
                <div class="text-center">
                  <div class="text-lg font-bold text-harbor-cyan font-mono">{{ previewStats.shipsInPort }}</div>
                  <div class="text-[10px] text-console-400">在港船舶</div>
                </div>
                <div class="text-center">
                  <div class="text-lg font-bold text-harbor-orange font-mono">{{ previewStats.shipsWaiting }}</div>
                  <div class="text-[10px] text-console-400">待泊船舶</div>
                </div>
                <div class="text-center">
                  <div class="text-lg font-bold text-harbor-red font-mono">{{ previewStats.conflictCount }}</div>
                  <div class="text-[10px] text-console-400">冲突数量</div>
                </div>
                <div class="text-center">
                  <div class="text-lg font-bold text-harbor-green font-mono">{{ previewStats.totalSchedules }}</div>
                  <div class="text-[10px] text-console-400">调度计划</div>
                </div>
              </div>
            </div>
          </div>

          <div class="px-5 py-4 border-t border-console-500/30 bg-console-900/30 flex items-center justify-end gap-3">
            <button
              @click="emit('close')"
              class="h-9 px-4 text-sm text-console-300 hover:text-console-100 bg-console-700/50 hover:bg-console-700 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              @click="handleCreate"
              :disabled="!name.trim() || isCreating"
              class="h-9 px-5 text-sm font-medium text-white bg-gradient-to-r from-harbor-cyan to-harbor-blue rounded-lg hover:shadow-glow-cyan transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check v-if="!isCreating" class="w-4 h-4" />
              <span v-if="isCreating" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              {{ isCreating ? '创建中...' : '创建快照' }}
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
