<script setup lang="ts">
import type { ScheduleConflict } from '../../types';
import { AlertTriangle, AlertCircle } from 'lucide-vue-next';

defineProps<{
  conflicts: ScheduleConflict[];
}>();
</script>

<template>
  <div class="space-y-2">
    <div
      v-for="conflict in conflicts"
      :key="conflict.id"
      :class="[
        'rounded-lg border p-3',
        conflict.severity === 'error'
          ? 'bg-harbor-red/10 border-harbor-red/40'
          : 'bg-harbor-yellow/10 border-harbor-yellow/40',
      ]"
    >
      <div class="flex items-start gap-2">
        <AlertTriangle
          v-if="conflict.severity === 'error'"
          class="w-4 h-4 text-harbor-red flex-shrink-0 mt-0.5"
        />
        <AlertCircle
          v-else
          class="w-4 h-4 text-harbor-yellow flex-shrink-0 mt-0.5"
        />
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span
              :class="[
                'text-[10px] font-mono font-semibold uppercase tracking-wider',
                conflict.severity === 'error' ? 'text-harbor-red' : 'text-harbor-yellow',
              ]"
            >
              {{ conflict.severity === 'error' ? '错误' : '警告' }}
            </span>
            <span class="text-[9px] font-mono text-console-500">
              {{ conflict.type.replace(/_/g, ' ') }}
            </span>
          </div>
          <p class="text-xs font-mono text-console-100">
            {{ conflict.message }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
