<script setup lang="ts">
import { computed, ref } from 'vue';
import { useScheduleStore } from '../../stores/schedule';
import type { LogType } from '../../types';
import { format, differenceInMinutes } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import {
  FileText,
  Pencil,
  Trash2,
  RefreshCw,
  AlertTriangle,
  AlertCircle,
  History,
  Filter,
  Search,
} from 'lucide-vue-next';

defineProps<{
  compact?: boolean;
  limit?: number;
}>();

const store = useScheduleStore();
const searchQuery = ref('');
const typeFilter = ref<LogType | 'all'>('all');

const logIcons: Record<LogType, typeof FileText> = {
  create: FileText,
  update: Pencil,
  delete: Trash2,
  status_change: RefreshCw,
  conflict: AlertTriangle,
  warning: AlertCircle,
};

const logColors: Record<LogType, string> = {
  create: 'text-harbor-cyan bg-harbor-cyan/15 border-harbor-cyan/30',
  update: 'text-console-200 bg-console-500/30 border-console-400/30',
  delete: 'text-harbor-red bg-harbor-red/15 border-harbor-red/30',
  status_change: 'text-harbor-purple bg-harbor-purple/15 border-harbor-purple/30',
  conflict: 'text-harbor-red bg-harbor-red/20 border-harbor-red/40',
  warning: 'text-harbor-yellow bg-harbor-yellow/15 border-harbor-yellow/30',
};

const logLabels: Record<LogType, string> = {
  create: '创建',
  update: '更新',
  delete: '删除',
  status_change: '状态变更',
  conflict: '冲突',
  warning: '警告',
};

function formatTime(timestamp: Date) {
  const diff = Math.abs(differenceInMinutes(timestamp, new Date()));
  if (diff < 1) return '刚刚';
  if (diff < 60) return `${diff}分钟前`;
  const hours = Math.floor(diff / 60);
  if (hours < 24) return `${hours}小时前`;
  return format(new Date(timestamp), 'MM-dd HH:mm', { locale: zhCN });
}

const filteredLogs = computed(() => {
  let result = store.logs;

  if (typeFilter.value !== 'all') {
    result = result.filter((l) => l.type === typeFilter.value);
  }

  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    result = result.filter(
      (l) =>
        l.description.toLowerCase().includes(q) ||
        l.operator.toLowerCase().includes(q),
    );
  }

  return result;
});
</script>

<template>
  <div class="panel-border rounded-lg overflow-hidden h-full flex flex-col">
    <div class="px-4 py-3 border-b border-console-500/30">
      <div class="flex items-center justify-between gap-3 mb-3">
        <div class="flex items-center gap-2">
          <History class="w-4 h-4 text-harbor-cyan" />
          <h3 class="font-mono text-sm font-semibold text-console-100 tracking-wide">
            调度日志
          </h3>
        </div>
        <span class="text-[10px] font-mono text-console-400">
          共 {{ store.logs.length }} 条
        </span>
      </div>
      <div v-if="!compact" class="flex items-center gap-2">
        <div class="relative flex-1">
          <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-console-400" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索日志..."
            class="w-full pl-8 pr-3 py-1.5 text-xs font-mono bg-console-800/80 border border-console-500/40 rounded text-console-100 placeholder:text-console-400 focus:outline-none focus:border-harbor-cyan/50"
          />
        </div>
        <div class="relative">
          <Filter class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-console-400" />
          <select
            v-model="typeFilter"
            class="pl-8 pr-2 py-1.5 text-xs font-mono bg-console-800/80 border border-console-500/40 rounded text-console-100 focus:outline-none focus:border-harbor-cyan/50 appearance-none"
          >
            <option value="all">全部类型</option>
            <option value="create">创建</option>
            <option value="update">更新</option>
            <option value="status_change">状态变更</option>
            <option value="conflict">冲突</option>
            <option value="warning">警告</option>
          </select>
        </div>
      </div>
    </div>

    <div class="flex-1 overflow-auto">
      <div class="p-2 space-y-1">
        <div
          v-for="log in filteredLogs.slice(0, limit)"
          :key="log.id"
          :class="[
            'flex items-start gap-2 p-2 rounded border transition-colors',
            log.type === 'conflict' || log.type === 'warning'
              ? 'bg-harbor-red/5 border-harbor-red/20 hover:bg-harbor-red/10'
              : 'bg-console-800/40 border-console-600/20 hover:bg-console-700/40',
          ]"
        >
          <div
            :class="[
              'w-7 h-7 rounded flex items-center justify-center flex-shrink-0 border',
              logColors[log.type],
            ]"
          >
            <component :is="logIcons[log.type]" class="w-3.5 h-3.5" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <span class="text-[10px] font-mono text-console-100 font-medium">
                {{ log.operator }}
              </span>
              <span
                :class="[
                  'inline-block px-1 py-0.5 rounded text-[9px] font-mono uppercase',
                  logColors[log.type],
                ]"
              >
                {{ logLabels[log.type] }}
              </span>
              <span class="text-[9px] font-mono text-console-400 ml-auto">
                {{ formatTime(log.timestamp) }}
              </span>
            </div>
            <p class="mt-1 text-[11px] font-mono text-console-200 leading-relaxed">
              {{ log.description }}
            </p>
            <div
              v-if="log.before || log.after"
              class="mt-1.5 flex gap-3 text-[10px] font-mono"
            >
              <div v-if="log.before" class="text-console-400">
                <span class="text-console-500">变更前:</span>
                {{ Object.entries(log.before).map(([k, v]) => `${k}=${typeof v === 'string' && v.includes('T') ? format(new Date(v), 'HH:mm') : String(v).slice(0, 20)}`).join(', ') }}
              </div>
              <div v-if="log.after" class="text-harbor-cyan">
                <span class="text-console-500">变更后:</span>
                {{ Object.entries(log.after).map(([k, v]) => `${k}=${typeof v === 'string' && v.includes('T') ? format(new Date(v), 'HH:mm') : String(v).slice(0, 20)}`).join(', ') }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
