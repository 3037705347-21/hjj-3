<script setup lang="ts">
import { ref, computed } from 'vue';
import { useSnapshotStore } from '../../stores/snapshot';
import type { SnapshotNoteRecord } from '../../types';
import {
  MessageSquare,
  Plus,
  Trash2,
  FileText,
  CheckSquare,
  Send,
  User,
  Clock,
} from 'lucide-vue-next';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const props = defineProps<{
  snapshotId: string;
}>();

const snapshotStore = useSnapshotStore();

const snapshot = computed(() => snapshotStore.getSnapshotById(props.snapshotId));

const noteContent = ref('');
const noteType = ref<SnapshotNoteRecord['type']>('comment');
const isSubmitting = ref(false);

const noteTypeOptions = [
  { key: 'comment', label: '备注', icon: MessageSquare, color: 'text-harbor-blue' },
  { key: 'conclusion', label: '复盘结论', icon: FileText, color: 'text-harbor-green' },
  { key: 'action_item', label: '行动项', icon: CheckSquare, color: 'text-harbor-orange' },
];

const sortedNotes = computed(() => {
  if (!snapshot.value) return [];
  return [...snapshot.value.notes].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
});

function getNoteTypeInfo(type: SnapshotNoteRecord['type']) {
  return noteTypeOptions.find((o) => o.key === type) || noteTypeOptions[0];
}

function submitNote() {
  if (!noteContent.value.trim() || !props.snapshotId) return;

  isSubmitting.value = true;

  setTimeout(() => {
    snapshotStore.addNote(props.snapshotId, noteContent.value.trim(), noteType.value);
    noteContent.value = '';
    isSubmitting.value = false;
  }, 300);
}

function handleDeleteNote(noteId: string) {
  if (confirm('确定要删除这条备注吗？')) {
    snapshotStore.deleteNote(props.snapshotId, noteId);
  }
}
</script>

<template>
  <div class="bg-console-800/50 rounded-xl border border-console-500/30 overflow-hidden h-full flex flex-col">
    <div class="px-4 py-3 border-b border-console-500/30 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <MessageSquare class="w-5 h-5 text-harbor-cyan" />
        <h3 class="text-sm font-semibold text-console-100">备注记录</h3>
        <span class="text-xs text-console-400">({{ sortedNotes.length }})</span>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto p-4 space-y-3">
      <div v-if="sortedNotes.length === 0" class="text-center py-8">
        <MessageSquare class="w-10 h-10 text-console-600 mx-auto mb-2" />
        <p class="text-sm text-console-400">暂无备注记录</p>
        <p class="text-xs text-console-500 mt-1">添加复盘备注和行动项</p>
      </div>

      <div
        v-for="note in sortedNotes"
        :key="note.id"
        class="p-3 bg-console-900/50 rounded-lg border border-console-500/20"
      >
        <div class="flex items-start justify-between gap-2 mb-2">
          <div class="flex items-center gap-2">
            <component
              :is="getNoteTypeInfo(note.type).icon"
              :class="['w-4 h-4', getNoteTypeInfo(note.type).color]"
            />
            <span :class="['text-xs font-medium', getNoteTypeInfo(note.type).color]">
              {{ getNoteTypeInfo(note.type).label }}
            </span>
          </div>
          <button
            @click="handleDeleteNote(note.id)"
            class="p-1 text-console-500 hover:text-harbor-red hover:bg-harbor-red/10 rounded transition-colors"
            title="删除"
          >
            <Trash2 class="w-3.5 h-3.5" />
          </button>
        </div>
        <p class="text-sm text-console-200 whitespace-pre-wrap">{{ note.content }}</p>
        <div class="flex items-center gap-3 mt-2 text-xs text-console-400">
          <div class="flex items-center gap-1">
            <User class="w-3 h-3" />
            {{ note.author }}
          </div>
          <div class="flex items-center gap-1">
            <Clock class="w-3 h-3" />
            {{ format(new Date(note.timestamp), 'MM-dd HH:mm', { locale: zhCN }) }}
          </div>
        </div>
      </div>
    </div>

    <div class="p-3 border-t border-console-500/30 bg-console-900/30">
      <div class="flex items-center gap-2 mb-2">
        <div class="flex gap-1">
          <button
            v-for="opt in noteTypeOptions"
            :key="opt.key"
            @click="noteType = opt.key as SnapshotNoteRecord['type']"
            :class="[
              'flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-all',
              noteType === opt.key
                ? `${opt.color} bg-current/10 border border-current/30`
                : 'text-console-400 hover:text-console-200',
            ]"
          >
            <component :is="opt.icon" class="w-3.5 h-3.5" />
            {{ opt.label }}
          </button>
        </div>
      </div>
      <div class="flex gap-2">
        <textarea
          v-model="noteContent"
          :placeholder="`输入${getNoteTypeInfo(noteType).label}内容...`"
          rows="2"
          class="flex-1 px-3 py-2 bg-console-900/80 border border-console-500/40 rounded-lg text-sm text-console-100 placeholder-console-400 focus:outline-none focus:border-harbor-cyan/50 focus:ring-1 focus:ring-harbor-cyan/30 resize-none"
          @keydown.ctrl.enter="submitNote"
        />
        <button
          @click="submitNote"
          :disabled="!noteContent.trim() || isSubmitting"
          class="self-end px-3 py-2 bg-gradient-to-r from-harbor-cyan to-harbor-blue text-white text-sm rounded-lg hover:shadow-glow-cyan transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send class="w-4 h-4" />
        </button>
      </div>
      <p class="text-[10px] text-console-500 mt-1.5">按 Ctrl+Enter 快速发送</p>
    </div>
  </div>
</template>
