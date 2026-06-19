<script setup lang="ts">
import type { ApprovalRecord } from '../../types';
import { CheckCircle2, XCircle } from 'lucide-vue-next';
import { format } from 'date-fns';

defineProps<{
  records: ApprovalRecord[];
}>();
</script>

<template>
  <div class="space-y-0">
    <div v-if="records.length === 0" class="text-center py-6 text-console-400 text-xs font-mono">
      暂无审批处理记录
    </div>
    <div
      v-for="(record, idx) in records"
      :key="record.id"
      class="flex gap-3"
    >
      <div class="flex flex-col items-center">
        <div
          :class="[
            'w-7 h-7 rounded-full flex items-center justify-center shrink-0',
            record.action === 'approve'
              ? 'bg-harbor-green/20 border border-harbor-green/50'
              : 'bg-harbor-red/20 border border-harbor-red/50',
          ]"
        >
          <CheckCircle2 v-if="record.action === 'approve'" class="w-3.5 h-3.5 text-harbor-green" />
          <XCircle v-else class="w-3.5 h-3.5 text-harbor-red" />
        </div>
        <div
          v-if="idx < records.length - 1"
          class="w-px flex-1 bg-console-500/30 my-1"
        />
      </div>
      <div class="pb-4 flex-1 min-w-0">
        <div class="flex items-center justify-between mb-1">
          <span class="text-xs font-mono font-medium text-console-100">
            {{ record.approverName }}
          </span>
          <span
            :class="[
              'px-1.5 py-0.5 rounded text-[10px] font-mono font-medium border',
              record.action === 'approve'
                ? 'bg-harbor-green/15 text-harbor-green border-harbor-green/30'
                : 'bg-harbor-red/15 text-harbor-red border-harbor-red/30',
            ]"
          >
            {{ record.action === 'approve' ? '通过' : '驳回' }}
          </span>
        </div>
        <p class="text-xs font-mono text-console-200 mb-1 break-words">
          {{ record.opinion }}
        </p>
        <p class="text-[10px] font-mono text-console-400">
          {{ format(record.timestamp, 'yyyy-MM-dd HH:mm:ss') }}
        </p>
      </div>
    </div>
  </div>
</template>
