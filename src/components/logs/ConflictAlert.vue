<script setup lang="ts">
import type { ScheduleConflict } from '../../types';
import { AlertTriangle, AlertCircle, X } from 'lucide-vue-next';
import { computed } from 'vue';
import { useScheduleStore } from '../../stores/schedule';

const props = defineProps<{
  conflicts: ScheduleConflict[];
}>();

const store = useScheduleStore();

const errorConflicts = computed(() =>
  props.conflicts.filter((c) => c.severity === 'error'),
);

const warningConflicts = computed(() =>
  props.conflicts.filter((c) => c.severity === 'warning'),
);

function dismissConflict(id: string) {
  const idx = store.conflicts.findIndex((c) => c.id === id);
  if (idx !== -1) {
    store.conflicts.splice(idx, 1);
  }
}

const conflictTypeLabels: Record<string, string> = {
  time_overlap: '时间冲突',
  draft_exceed: '吃水超限',
  length_exceed: '船长超限',
  cargo_mismatch: '货种不匹配',
  tide_window: '潮汐窗口',
  berth_maintenance: '泊位维修',
  buffer_time_insufficient: '缓冲不足',
  team_conflict: '班组冲突',
  dangerous_cargo_isolation: '危货隔离',
  night_operation_limit: '夜间限制',
  tag_earliest_time: '最早作业时间',
  tag_priority_berth: '优先靠泊',
  tag_forbidden_berth: '禁止泊位类型',
  tag_missing_remarks: '缺少备注',
  tag_night_restricted: '标签-夜间限制',
};
</script>

<template>
  <div class="panel-border rounded-lg overflow-hidden">
    <div class="flex items-center gap-2 px-4 py-3 border-b border-console-500/30">
      <AlertTriangle class="w-4 h-4 text-harbor-red" />
      <h3 class="font-mono text-sm font-semibold text-console-100">
        调度冲突告警
      </h3>
      <span class="ml-auto text-[10px] font-mono text-console-400">
        {{ errorConflicts.length }} 个错误 / {{ warningConflicts.length }} 个警告
      </span>
    </div>
    <div class="max-h-64 overflow-y-auto">
      <div
        v-for="conflict in conflicts"
        :key="conflict.id"
        :class="[
          'flex items-start gap-3 px-4 py-3 border-b border-console-500/20 last:border-b-0',
          conflict.severity === 'error' ? 'bg-harbor-red/5' : 'bg-harbor-yellow/5',
        ]"
      >
        <AlertCircle
          :class="[
            'w-4 h-4 mt-0.5 shrink-0',
            conflict.severity === 'error' ? 'text-harbor-red' : 'text-harbor-yellow',
          ]"
        />
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span
              :class="[
                'text-[10px] font-mono px-1.5 py-0.5 rounded',
                conflict.severity === 'error'
                  ? 'bg-harbor-red/20 text-harbor-red'
                  : 'bg-harbor-yellow/20 text-harbor-yellow',
              ]"
            >
              {{ conflictTypeLabels[conflict.type] || conflict.type }}
            </span>
            <span
              class="text-[10px] font-mono text-console-400"
            >
              {{ conflict.scheduleId }}
            </span>
          </div>
          <p class="text-xs font-mono text-console-200 mt-1">
            {{ conflict.message }}
          </p>
          <p
            v-if="conflict.suggestedAction"
            class="text-[11px] font-mono text-harbor-cyan mt-1.5 flex items-center gap-1"
          >
            <span class="text-harbor-cyan/70">建议:</span>
            {{ conflict.suggestedAction }}
          </p>
        </div>
        <button
          @click="dismissConflict(conflict.id)"
          class="w-6 h-6 shrink-0 flex items-center justify-center rounded text-console-400 hover:text-console-100 hover:bg-console-600/50 transition-colors"
        >
          <X class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  </div>
</template>
