<script setup lang="ts">
import { useScheduleStore } from '../../stores/schedule';
import { useScheduleLogger } from '../../composables/useScheduleLogger';
import type { LogType, ScheduleLog } from '../../types';
import { computed, ref } from 'vue';
import {
  Clock,
  PlusCircle,
  Pencil,
  Trash2,
  AlertTriangle,
  Activity,
  RotateCcw,
  AlertCircle,
  User,
  ChevronRight,
  Search,
  Filter,
} from 'lucide-vue-next';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const props = withDefaults(
  defineProps<{
    compact?: boolean;
    limit?: number;
  }>(),
  {
    compact: false,
    limit: 50,
  },
);

const store = useScheduleStore();
useScheduleLogger();

const typeFilter = ref<LogType | 'all'>('all');
const searchQuery = ref('');

const logTypeMeta: Record<LogType, { label: string; icon: typeof Clock; color: string; bgClass: string }> = {
  create: { label: '创建', icon: PlusCircle, color: 'text-harbor-green', bgClass: 'bg-harbor-green/15 border-harbor-green/30' },
  update: { label: '更新', icon: Pencil, color: 'text-harbor-cyan', bgClass: 'bg-harbor-cyan/15 border-harbor-cyan/30' },
  delete: { label: '删除', icon: Trash2, color: 'text-harbor-red', bgClass: 'bg-harbor-red/15 border-harbor-red/30' },
  status_change: { label: '状态变更', icon: RotateCcw, color: 'text-harbor-purple', bgClass: 'bg-harbor-purple/15 border-harbor-purple/30' },
  conflict: { label: '冲突', icon: AlertTriangle, color: 'text-harbor-red', bgClass: 'bg-harbor-red/15 border-harbor-red/30' },
  warning: { label: '警告', icon: AlertCircle, color: 'text-harbor-yellow', bgClass: 'bg-harbor-yellow/15 border-harbor-yellow/30' },
};

const displayedLogs = computed<ScheduleLog[]>(() => {
  let result = [...store.logs];

  if (typeFilter.value !== 'all') {
    result = result.filter((l) => l.type === typeFilter.value);
  }

  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    result = result.filter(
      (l) =>
        l.description.toLowerCase().includes(q) ||
        l.operator.toLowerCase().includes(q) ||
        (l.scheduleId && l.scheduleId.toLowerCase().includes(q)) ||
        (l.shipId && l.shipId.toLowerCase().includes(q)),
    );
  }

  if (props.limit && props.limit > 0) {
    result = result.slice(0, props.limit);
  }

  return result;
});

function formatTimestamp(ts: Date) {
  return format(new Date(ts), 'MM-dd HH:mm:ss', { locale: zhCN });
}

function selectSchedule(id: string | undefined) {
  if (id) {
    store.setSelectedSchedule(id);
  }
}
</script>

<template>
  <div class="panel-border rounded-lg overflow-hidden h-full flex flex-col">
    <div class="flex items-center gap-2 px-4 py-3 border-b border-console-500/30">
      <Activity class="w-4 h-4 text-harbor-cyan" />
      <h3 class="font-mono text-sm font-semibold text-console-100">
        调度操作日志
      </h3>
      <span class="ml-auto text-[10px] font-mono text-console-400">
        共 {{ displayedLogs.length }} 条
      </span>
    </div>

    <div v-if="!compact" class="px-4 py-2 border-b border-console-500/20 flex items-center gap-2">
      <div class="relative flex-1">
        <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-console-400" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索日志..."
          class="w-full pl-8 pr-3 py-1.5 text-xs font-mono bg-console-800/80 border border-console-500/40 rounded text-console-100 placeholder:text-console-400 focus:outline-none focus:border-harbor-cyan/50"
        />
      </div>
      <div class="flex items-center gap-1.5">
        <Filter class="w-3.5 h-3.5 text-console-400" />
        <select
          v-model="typeFilter"
          class="px-2 py-1.5 text-xs font-mono bg-console-800/80 border border-console-500/40 rounded text-console-100 focus:outline-none focus:border-harbor-cyan/50"
        >
          <option value="all">全部类型</option>
          <option value="create">创建</option>
          <option value="update">更新</option>
          <option value="delete">删除</option>
          <option value="status_change">状态变更</option>
          <option value="conflict">冲突</option>
          <option value="warning">警告</option>
        </select>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto">
      <div v-if="displayedLogs.length === 0" class="flex flex-col items-center justify-center h-full text-console-400 py-8">
        <Clock class="w-8 h-8 mb-2 opacity-50" />
        <p class="text-xs font-mono">暂无日志记录</p>
      </div>
      <div
        v-for="log in displayedLogs"
        :key="log.id"
        class="flex items-start gap-3 px-4 py-3 border-b border-console-500/15 hover:bg-console-700/30 transition-colors cursor-pointer"
        @click="selectSchedule(log.scheduleId)"
      >
        <div
          :class="[
            'w-7 h-7 rounded border flex items-center justify-center shrink-0 mt-0.5',
            logTypeMeta[log.type]?.bgClass || 'bg-console-600 border-console-500',
          ]"
        >
          <component
            :is="logTypeMeta[log.type]?.icon || Clock"
            :class="['w-3.5 h-3.5', logTypeMeta[log.type]?.color || 'text-console-300']"
          />
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <span
              :class="[
                'text-[10px] font-mono px-1.5 py-0.5 rounded',
                logTypeMeta[log.type]?.bgClass || 'bg-console-600',
                logTypeMeta[log.type]?.color || 'text-console-300',
              ]"
            >
              {{ logTypeMeta[log.type]?.label || log.type }}
            </span>
            <span class="text-[10px] font-mono text-console-400">
              {{ formatTimestamp(log.timestamp) }}
            </span>
          </div>
          <p class="text-xs font-mono text-console-200 mt-1">
            {{ log.description }}
          </p>
          <div class="flex items-center gap-3 mt-1.5">
            <div class="flex items-center gap-1">
              <User class="w-3 h-3 text-console-400" />
              <span class="text-[10px] font-mono text-console-400">{{ log.operator }}</span>
            </div>
            <div v-if="log.scheduleId" class="flex items-center gap-1 text-[10px] font-mono text-console-400">
              <ChevronRight class="w-3 h-3" />
              <span>{{ log.scheduleId }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
