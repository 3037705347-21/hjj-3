<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useAnnouncementStore } from '../../stores/announcement';
import { useScheduleStore } from '../../stores/schedule';
import {
  ANNOUNCEMENT_TYPE_LABELS,
  ANNOUNCEMENT_SCOPE_LABELS,
} from '../../types';
import type { AnnouncementType, AnnouncementScope } from '../../types';
import { X, Send, Megaphone, MapPin, Pin, Calendar } from 'lucide-vue-next';

const props = defineProps<{
  visible: boolean;
  editId?: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'submitted', announcementId: string): void;
}>();

const announcementStore = useAnnouncementStore();
const scheduleStore = useScheduleStore();

const selectedType = ref<AnnouncementType>('port_notice');
const selectedScope = ref<AnnouncementScope>('all');
const title = ref('');
const content = ref('');
const effectiveTime = ref(new Date().toISOString().slice(0, 16));
const expiryTime = ref('');
const selectedBerthIds = ref<string[]>([]);
const isPinned = ref(false);
const submitting = ref(false);

watch(
  () => props.editId,
  (newId) => {
    if (!newId) return;
    const announcement = announcementStore.getAnnouncementById(newId);
    if (!announcement) return;
    selectedType.value = announcement.type;
    selectedScope.value = announcement.scope;
    title.value = announcement.title;
    content.value = announcement.content;
    effectiveTime.value = new Date(announcement.effectiveTime).toISOString().slice(0, 16);
    expiryTime.value = new Date(announcement.expiryTime).toISOString().slice(0, 16);
    selectedBerthIds.value = [...announcement.relatedBerthIds];
    isPinned.value = announcement.isPinned;
  },
);

const typeOptions = computed(() =>
  Object.entries(ANNOUNCEMENT_TYPE_LABELS).map(([key, label]) => ({
    key: key as AnnouncementType,
    label,
  })),
);

const scopeOptions = computed(() =>
  Object.entries(ANNOUNCEMENT_SCOPE_LABELS).map(([key, label]) => ({
    key: key as AnnouncementScope,
    label,
  })),
);

const canSubmit = computed(() =>
  title.value.trim().length > 0 &&
  content.value.trim().length > 0 &&
  effectiveTime.value &&
  expiryTime.value &&
  new Date(expiryTime.value) > new Date(effectiveTime.value) &&
  (selectedScope.value !== 'specific_berths' || selectedBerthIds.value.length > 0),
);

function toggleBerth(berthId: string) {
  const idx = selectedBerthIds.value.indexOf(berthId);
  if (idx >= 0) {
    selectedBerthIds.value.splice(idx, 1);
  } else {
    selectedBerthIds.value.push(berthId);
  }
}

function handleSubmit() {
  if (!canSubmit.value) return;
  submitting.value = true;

  try {
    if (props.editId) {
      const result = announcementStore.updateAnnouncement(props.editId, {
        title: title.value.trim(),
        type: selectedType.value,
        scope: selectedScope.value,
        effectiveTime: new Date(effectiveTime.value),
        expiryTime: new Date(expiryTime.value),
        content: content.value.trim(),
        relatedBerthIds: selectedBerthIds.value,
        isPinned: isPinned.value,
      });
      if (result) emit('submitted', result.id);
    } else {
      const announcement = announcementStore.createAnnouncement({
        title: title.value.trim(),
        type: selectedType.value,
        scope: selectedScope.value,
        effectiveTime: new Date(effectiveTime.value),
        expiryTime: new Date(expiryTime.value),
        content: content.value.trim(),
        relatedBerthIds: selectedBerthIds.value,
        isPinned: isPinned.value,
      });
      emit('submitted', announcement.id);
    }
    handleClose();
  } finally {
    submitting.value = false;
  }
}

function handleClose() {
  selectedType.value = 'port_notice';
  selectedScope.value = 'all';
  title.value = '';
  content.value = '';
  effectiveTime.value = new Date().toISOString().slice(0, 16);
  expiryTime.value = '';
  selectedBerthIds.value = [];
  isPinned.value = false;
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
      <div class="relative w-full max-w-2xl panel-border rounded-xl shadow-2xl z-10 max-h-[90vh] overflow-hidden flex flex-col">
        <div class="flex items-center justify-between px-5 py-4 border-b border-console-500/20">
          <h3 class="font-mono text-sm font-semibold text-console-100 flex items-center gap-2">
            <Megaphone class="w-4 h-4 text-harbor-orange" />
            {{ editId ? '编辑公告' : '发布公告' }}
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
              <label class="block text-xs font-mono text-console-300 mb-1.5">公告类型</label>
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
              <label class="block text-xs font-mono text-console-300 mb-1.5">发布范围</label>
              <select
                v-model="selectedScope"
                class="w-full px-3 py-2 rounded bg-console-800/60 border border-console-500/30 text-xs font-mono text-console-100 focus:outline-none focus:border-harbor-cyan/50"
              >
                <option
                  v-for="opt in scopeOptions"
                  :key="opt.key"
                  :value="opt.key"
                >
                  {{ opt.label }}
                </option>
              </select>
            </div>
          </div>

          <div>
            <label class="block text-xs font-mono text-console-300 mb-1.5">公告标题</label>
            <input
              v-model="title"
              type="text"
              placeholder="请输入公告标题"
              class="w-full px-3 py-2 rounded bg-console-800/60 border border-console-500/30 text-xs font-mono text-console-100 placeholder:text-console-500 focus:outline-none focus:border-harbor-cyan/50"
            />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-mono text-console-300 mb-1.5 flex items-center gap-1.5">
                <Calendar class="w-3.5 h-3.5" />
                生效时间
              </label>
              <input
                v-model="effectiveTime"
                type="datetime-local"
                class="w-full px-3 py-2 rounded bg-console-800/60 border border-console-500/30 text-xs font-mono text-console-100 focus:outline-none focus:border-harbor-cyan/50"
              />
            </div>

            <div>
              <label class="block text-xs font-mono text-console-300 mb-1.5 flex items-center gap-1.5">
                <Calendar class="w-3.5 h-3.5" />
                失效时间
              </label>
              <input
                v-model="expiryTime"
                type="datetime-local"
                class="w-full px-3 py-2 rounded bg-console-800/60 border border-console-500/30 text-xs font-mono text-console-100 focus:outline-none focus:border-harbor-cyan/50"
              />
            </div>
          </div>

          <div>
            <label class="block text-xs font-mono text-console-300 mb-1.5">公告内容</label>
            <textarea
              v-model="content"
              rows="6"
              placeholder="请输入公告内容..."
              class="w-full px-3 py-2 rounded bg-console-800/60 border border-console-500/30 text-xs font-mono text-console-100 placeholder:text-console-500 focus:outline-none focus:border-harbor-cyan/50 resize-none"
            />
          </div>

          <div v-if="selectedScope === 'specific_berths'">
            <label class="block text-xs font-mono text-console-300 mb-2 flex items-center gap-1.5">
              <MapPin class="w-3.5 h-3.5" />
              关联泊位
            </label>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="berth in scheduleStore.sortedBerths"
                :key="berth.id"
                @click="toggleBerth(berth.id)"
                :class="[
                  'px-3 py-1.5 rounded text-xs font-mono border transition-all',
                  selectedBerthIds.includes(berth.id)
                    ? 'bg-harbor-cyan/20 text-harbor-cyan border-harbor-cyan/40'
                    : 'bg-console-800/60 text-console-300 border-console-500/30 hover:border-console-400/50',
                ]"
              >
                {{ berth.name }}
              </button>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <label class="flex items-center gap-2 cursor-pointer select-none">
              <div
                class="relative w-8 h-4 rounded-full transition-all"
                :class="isPinned ? 'bg-harbor-orange/60' : 'bg-console-600'"
                @click="isPinned = !isPinned"
              >
                <div
                  class="absolute top-0.5 w-3 h-3 rounded-full transition-all"
                  :class="isPinned ? 'left-4.5 bg-harbor-orange' : 'left-0.5 bg-console-400'"
                />
              </div>
              <span class="text-xs font-mono text-console-300 flex items-center gap-1.5">
                <Pin class="w-3.5 h-3.5" />
                置顶公告
              </span>
            </label>
          </div>

          <div
            v-if="selectedBerthIds.length > 0"
            class="p-3 rounded bg-harbor-yellow/10 border border-harbor-yellow/30"
          >
            <div class="flex items-start gap-2">
              <MapPin class="w-4 h-4 text-harbor-yellow shrink-0 mt-0.5" />
              <span class="text-xs font-mono text-harbor-yellow">
                已选择 {{ selectedBerthIds.length }} 个泊位，公告将仅对所选泊位的相关人员可见
              </span>
            </div>
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
            :disabled="!canSubmit || submitting"
            class="px-4 py-1.5 rounded text-xs font-mono font-medium bg-harbor-orange/20 text-harbor-orange border border-harbor-orange/30 hover:bg-harbor-orange/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
            @click="handleSubmit"
          >
            <Send class="w-3 h-3" />
            {{ editId ? '保存修改' : '发布公告' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
