<script setup lang="ts">
import type { ScheduleConflict } from '../../types';
import { AlertTriangle, AlertCircle, X } from 'lucide-vue-next';

defineProps<{
  conflicts: ScheduleConflict[];
}>();

const typeLabels: Record<ScheduleConflict['type'], string> = {
  time_overlap: '时间重叠',
  draft_exceed: '吃水超限',
  length_exceed: '船长超限',
  cargo_mismatch: '货物不匹配',
  tide_window: '潮汐窗口',
};
</script>

<template>
  <div class="panel-border rounded-lg p-3 border-harbor-red/40 bg-harbor-red/5">
    <div class="flex items-center gap-2 mb-2">
      <AlertTriangle class="w-4 h-4 text-harbor-red" />
      <span class="text-xs font-mono font-semibold text-harbor-red uppercase tracking-wider">
        检测到 {{ conflicts.length }} 个调度冲突
      </span>
    </div>
    <div class="space-y-2">
      <div
        v-for="conflict in conflicts"
        :key="conflict.id"
        :class="[
          'flex items-start gap-2 p-2 rounded border',
          conflict.severity === 'error'
            ? 'bg-harbor-red/10 border-harbor-red/30'
            : 'bg-harbor-yellow/10 border-harbor-yellow/30',
        ]"
      >
        <AlertCircle
          :class="['w-4 h-4 mt-0.5 flex-shrink-0', conflict.severity === 'error' ? 'text-harbor-red' : 'text-harbor-yellow']"
        />
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <span
              :class="[
                'inline-block px-1.5 py-0.5 rounded text-[9px] font-mono font-medium',
                conflict.severity === 'error'
                  ? 'bg-harbor-red/20 text-harbor-red'
                  : 'bg-harbor-yellow/20 text-harbor-yellow',
              ]"
            >
              {{ typeLabels[conflict.type] }}
            </span>
            <span
              :class="[
                'text-[9px] font-mono uppercase',
                conflict.severity === 'error' ? 'text-harbor-red' : 'text-harbor-yellow',
              ]"
            >
              {{ conflict.severity === 'error' ? '严重' : '警告' }}
            </span>
          </div>
          <p class="mt-1 text-[11px] font-mono text-console-100 leading-relaxed">
            {{ conflict.message }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
