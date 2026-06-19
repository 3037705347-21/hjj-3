<script setup lang="ts">
import { ref } from 'vue';
import { useIncidentStore } from '../../stores/incident';
import type { IncidentRecord } from '../../types';
import {
  Clock,
  User,
  MessageSquare,
  Plus,
  Send,
  FileText,
} from 'lucide-vue-next';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const props = defineProps<{
  records: IncidentRecord[];
  incidentId: string;
  canEdit?: boolean;
}>();

const incidentStore = useIncidentStore();

const showAddForm = ref(false);
const newAction = ref('');
const newDescription = ref('');

const actionOptions = [
  '现场处置',
  '原因调查',
  '资源调配',
  '协调沟通',
  '技术支持',
  '上级汇报',
  '恢复作业',
  '其他',
];

function formatTime(date: Date | string): string {
  return format(new Date(date), 'MM-dd HH:mm', { locale: zhCN });
}

function addRecord() {
  if (!newAction.value || !newDescription.value.trim()) return;

  incidentStore.addRecord(
    props.incidentId,
    newAction.value,
    newDescription.value.trim(),
  );

  newAction.value = '';
  newDescription.value = '';
  showAddForm.value = false;
}

function getActionIcon(action: string) {
  if (action.includes('上报') || action.includes('提交')) return MessageSquare;
  if (action.includes('调查') || action.includes('分析')) return FileText;
  if (action.includes('处置') || action.includes('处理')) return Send;
  return Clock;
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h4 class="text-xs font-mono font-medium text-console-200 flex items-center gap-2">
        <Clock class="w-3.5 h-3.5 text-harbor-cyan" />
        处置记录 ({{ records.length }})
      </h4>
      <button
        v-if="canEdit"
        @click="showAddForm = !showAddForm"
        class="flex items-center gap-1 px-2 py-1 rounded text-xs font-mono text-harbor-cyan border border-harbor-cyan/30 hover:bg-harbor-cyan/10 transition-all"
      >
        <Plus class="w-3 h-3" />
        添加记录
      </button>
    </div>

    <div
      v-if="showAddForm && canEdit"
      class="p-4 rounded-lg bg-console-800/30 border border-console-500/20 space-y-3"
    >
      <div>
        <label class="block text-xs font-mono text-console-300 mb-1.5">动作类型</label>
        <select
          v-model="newAction"
          class="w-full px-3 py-2 rounded bg-console-900/60 border border-console-500/30 text-xs font-mono text-console-100 focus:outline-none focus:border-harbor-cyan/50"
        >
          <option value="" disabled>请选择动作类型</option>
          <option v-for="opt in actionOptions" :key="opt" :value="opt">
            {{ opt }}
          </option>
        </select>
      </div>
      <div>
        <label class="block text-xs font-mono text-console-300 mb-1.5">描述内容</label>
        <textarea
          v-model="newDescription"
          rows="2"
          placeholder="请输入处置记录描述..."
          class="w-full px-3 py-2 rounded bg-console-900/60 border border-console-500/30 text-xs font-mono text-console-100 placeholder:text-console-500 focus:outline-none focus:border-harbor-cyan/50 resize-none"
        />
      </div>
      <div class="flex items-center justify-end gap-2">
        <button
          @click="showAddForm = false"
          class="px-3 py-1.5 rounded text-xs font-mono text-console-300 border border-console-500/30 hover:bg-console-700/50 transition-all"
        >
          取消
        </button>
        <button
          :disabled="!newAction || !newDescription.trim()"
          @click="addRecord"
          class="px-3 py-1.5 rounded text-xs font-mono bg-harbor-cyan/20 text-harbor-cyan border border-harbor-cyan/30 hover:bg-harbor-cyan/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
        >
          <Send class="w-3 h-3" />
          提交
        </button>
      </div>
    </div>

    <div class="relative">
      <div class="absolute left-3 top-0 bottom-0 w-px bg-console-600/50" />

      <div class="space-y-4">
        <div
          v-for="(record, index) in records"
          :key="record.id"
          class="relative pl-8"
        >
          <div
            :class="[
              'absolute left-1.5 top-1 w-3 h-3 rounded-full border-2',
              index === 0
                ? 'bg-harbor-cyan border-harbor-cyan shadow-glow-blue'
                : 'bg-console-700 border-console-500',
            ]"
          />

          <div class="panel-border rounded-lg p-3 bg-console-800/30">
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <component
                  :is="getActionIcon(record.action)"
                  class="w-3.5 h-3.5 text-harbor-cyan"
                />
                <span class="text-xs font-medium text-console-100">
                  {{ record.action }}
                </span>
              </div>
              <div class="flex items-center gap-1 text-[10px] font-mono text-console-500">
                <Clock class="w-3 h-3" />
                {{ formatTime(record.timestamp) }}
              </div>
            </div>

            <p class="text-xs text-console-300 leading-relaxed">
              {{ record.description }}
            </p>

            <div class="mt-2 flex items-center gap-1 text-[10px] text-console-500">
              <User class="w-3 h-3" />
              <span>{{ record.operator }}</span>
            </div>
          </div>
        </div>

        <div v-if="records.length === 0" class="text-center py-8">
          <Clock class="w-8 h-8 text-console-600 mx-auto mb-2" />
          <p class="text-xs text-console-500 font-mono">暂无处置记录</p>
        </div>
      </div>
    </div>
  </div>
</template>
