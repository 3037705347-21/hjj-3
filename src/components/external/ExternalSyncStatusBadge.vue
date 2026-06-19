<script setup lang="ts">
import type { ExternalSyncStatus } from '../../types';
import { EXTERNAL_SYNC_STATUS_LABELS } from '../../types';

interface Props {
  status: ExternalSyncStatus;
  size?: 'sm' | 'md';
}

defineProps<Props>();

const statusStyles: Record<ExternalSyncStatus, { bg: string; text: string; border: string; icon: string }> = {
  pending: {
    bg: 'bg-harbor-yellow/15',
    text: 'text-harbor-yellow',
    border: 'border-harbor-yellow/30',
    icon: '⏳',
  },
  matched: {
    bg: 'bg-harbor-cyan/15',
    text: 'text-harbor-cyan',
    border: 'border-harbor-cyan/30',
    icon: '✓',
  },
  unmatched: {
    bg: 'bg-harbor-orange/15',
    text: 'text-harbor-orange',
    border: 'border-harbor-orange/30',
    icon: '?',
  },
  conflict: {
    bg: 'bg-harbor-red/15',
    text: 'text-harbor-red',
    border: 'border-harbor-red/30',
    icon: '!',
  },
  synced: {
    bg: 'bg-harbor-green/15',
    text: 'text-harbor-green',
    border: 'border-harbor-green/30',
    icon: '✓',
  },
  failed: {
    bg: 'bg-harbor-red/15',
    text: 'text-harbor-red',
    border: 'border-harbor-red/30',
    icon: '✕',
  },
  ignored: {
    bg: 'bg-console-600/15',
    text: 'text-console-400',
    border: 'border-console-500/30',
    icon: '⊘',
  },
};
</script>

<template>
  <span
    :class="[
      'inline-flex items-center gap-1 rounded-full border font-mono font-medium',
      size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',
      statusStyles[status].bg,
      statusStyles[status].text,
      statusStyles[status].border,
    ]"
  >
    <span>{{ statusStyles[status].icon }}</span>
    <span>{{ EXTERNAL_SYNC_STATUS_LABELS[status] }}</span>
  </span>
</template>
