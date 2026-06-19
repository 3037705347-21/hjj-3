<script setup lang="ts">
import type { ExternalSyncLog } from '../../types';
import {
  Check,
  X,
  AlertTriangle,
  RefreshCw,
  User,
  Clock,
  FileCheck,
} from 'lucide-vue-next';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface Props {
  logs: ExternalSyncLog[];
}

defineProps<Props>();

function formatTime(date: Date | string): string {
  return format(new Date(date), 'MM-dd HH:mm:ss', { locale: zhCN });
}

const actionIcons: Record<ExternalSyncLog['action'], any> = {
  match: FileCheck,
  sync: RefreshCw,
  confirm: Check,
  ignore: X,
  error: AlertTriangle,
};

const actionColors: Record<ExternalSyncLog['action'], string> = {
  match: 'text-harbor-cyan bg-harbor-cyan/20 border-harbor-cyan/30',
  sync: 'text-harbor-green bg-harbor-green/20 border-harbor-green/30',
  confirm: 'text-harbor-cyan bg-harbor-cyan/20 border-harbor-cyan/30',
  ignore: 'text-console-400 bg-console-600/20 border-console-500/30',
  error: 'text-harbor-red bg-harbor-red/20 border-harbor-red/30',
};

const actionLabels: Record<ExternalSyncLog['action'], string> = {
  match: '匹配',
  sync: '同步',
  confirm: '确认',
  ignore: '忽略',
  error: '错误',
};
</script>

<template>
  <div class="space-y-1">
    <div
      v-for="(log, index) in logs"
      :key="log.id"
      class="relative pl-6"
    >
      <div
        v-if="index < logs.length - 1"
        class="absolute left-[11px] top-5 bottom-0 w-px bg-console-500/30"
      />
      <div
        :class="[
          'absolute left-0 top-0.5 w-6 h-6 rounded-full border flex items-center justify-center',
          actionColors[log.action],
        ]"
      >
        <component :is="actionIcons[log.action]" class="w-3 h-3" />
      </div>
      <div class="pb-3">
        <div class="flex items-center gap-2 mb-1">
          <span class="text-xs font-medium text-console-200">
            {{ actionLabels[log.action] }}
          </span>
          <span class="text-[10px] font-mono text-console-500">
            {{ formatTime(log.timestamp) }}
          </span>
        </div>
        <p class="text-xs text-console-300 leading-relaxed">
          {{ log.description }}
        </p>
        <div class="flex items-center gap-3 mt-1">
          <div class="flex items-center gap-1">
            <User class="w-3 h-3 text-console-500" />
            <span class="text-[10px] text-console-500">{{ log.operator }}</span>
          </div>
        </div>
        <div v-if="log.before || log.after" class="mt-2 p-2 rounded bg-console-900/40 border border-console-500/20">
          <div v-if="log.before" class="mb-1">
            <span class="text-[10px] font-mono text-harbor-orange">变更前：</span>
            <span class="text-[10px] font-mono text-console-400 ml-1">
              {{ JSON.stringify(log.before).slice(0, 80) }}{{ JSON.stringify(log.before).length > 80 ? '...' : '' }}
            </span>
          </div>
          <div v-if="log.after">
            <span class="text-[10px] font-mono text-harbor-green">变更后：</span>
            <span class="text-[10px] font-mono text-console-400 ml-1">
              {{ JSON.stringify(log.after).slice(0, 80) }}{{ JSON.stringify(log.after).length > 80 ? '...' : '' }}
            </span>
          </div>
        </div>
      </div>
    </div>
    <div v-if="logs.length === 0" class="text-center py-6">
      <Clock class="w-8 h-8 text-console-600 mx-auto mb-2" />
      <p class="text-xs text-console-500">暂无同步日志</p>
    </div>
  </div>
</template>
