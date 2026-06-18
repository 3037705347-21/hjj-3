<script setup lang="ts">
import { computed } from 'vue';
import { useScheduleStore } from '../../stores/schedule';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Clock, Plus, Edit3, Trash2, AlertTriangle, AlertCircle } from 'lucide-vue-next';
import type { LogType } from '../../types';

const props = withDefaults(defineProps<{
  compact?: boolean;
  limit?: number;
}>(), {
  compact: false,
  limit: 50,
});

const store = useScheduleStore();

const logIcon: Record<LogType, typeof Clock> = {
  create: Plus,
  update: Edit3,
  delete: Trash2,
  status_change: Clock,
  conflict: AlertTriangle,
  warning: AlertCircle,
};

const logColor: Record<LogType, string> = {
  create: 'text-harbor-cyan',
  update: 'text-harbor-orange',
  delete: 'text-harbor-red',
  status_change: 'text-harbor-purple',
  conflict: 'text-harbor-red',
  warning: 'text-harbor-yellow',
};

const logBg: Record<LogType, string> = {
  create: 'bg-harbor-cyan/10',
  update: 'bg-harbor-orange/10',
  delete: 'bg-harbor-red/10',
  status_change: 'bg-harbor-purple/10',
  conflict: 'bg-harbor-red/10',
  warning: 'bg-harbor-yellow/10',
};

const displayedLogs = computed(() => {
  return store.logs.slice(0, props.limit);
});
</script>

<template>
  <div class="panel-border rounded-lg overflow-hidden h-full flex flex-col">
    <div class="flex items-center justify-between px-4 py-3 border-b border-console-500/30">
      <div class="flex items-center gap-2">
        <Clock class="w-4 h-4 text-harbor-cyan" />
        <h3 class="font-mono text-sm font-semibold text-console-100 tracking-wide">
          调度日志
        </h3>
      </div>
      <span class="text-[10px] font-mono text-console-400">
        {{ displayedLogs.length }} 条记录
      </span>
    </div>

    <div class="flex-1 overflow-auto">
      <div
        v-for="log in displayedLogs"
        :key="log.id"
        class="px-4 py-2.5 border-b border-console-500/15 hover:bg-console-700/20 transition-colors"
      >
        <div class="flex items-start gap-2">
          <div
            :class="[
              'w-6 h-6 rounded flex items-center justify-center flex-shrink-0 mt-0.5',
              logBg[log.type],
            ]"
          >
            <component :is="logIcon[log.type]" :class="['w-3.5 h-3.5', logColor[log.type]]" />
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-xs font-mono text-console-100 leading-relaxed">
              {{ log.description }}
            </p>
            <div class="flex items-center gap-3 mt-1">
              <span class="text-[10px] font-mono text-console-400">
                {{ format(new Date(log.timestamp), 'HH:mm:ss', { locale: zhCN }) }}
              </span>
              <span class="text-[10px] font-mono text-console-500">
                {{ log.operator }}
              </span>
              <span
                v-if="compact && log.shipId"
                class="text-[10px] font-mono text-console-500"
              >
                {{ log.shipId }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="displayedLogs.length === 0" class="p-8 text-center">
        <Clock class="w-8 h-8 text-console-500 mx-auto mb-2" />
        <p class="text-xs font-mono text-console-400">暂无日志记录</p>
      </div>
    </div>
  </div>
</template>
