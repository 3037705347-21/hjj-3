<script setup lang="ts">
import type { ApprovalStatus } from '../../types';
import { APPROVAL_STATUS_LABELS } from '../../types';
import {
  Clock,
  CheckCircle2,
  XCircle,
  Ban,
} from 'lucide-vue-next';

defineProps<{
  status: ApprovalStatus;
  size?: 'sm' | 'md';
}>();

const statusConfig: Record<
  ApprovalStatus,
  { label: string; bg: string; text: string; border: string; icon: typeof Clock; pulse?: boolean }
> = {
  pending: {
    label: APPROVAL_STATUS_LABELS.pending,
    bg: 'bg-harbor-yellow/20',
    text: 'text-harbor-yellow',
    border: 'border-harbor-yellow/50',
    icon: Clock,
    pulse: true,
  },
  approved: {
    label: APPROVAL_STATUS_LABELS.approved,
    bg: 'bg-harbor-green/20',
    text: 'text-harbor-green',
    border: 'border-harbor-green/50',
    icon: CheckCircle2,
  },
  rejected: {
    label: APPROVAL_STATUS_LABELS.rejected,
    bg: 'bg-harbor-red/20',
    text: 'text-harbor-red',
    border: 'border-harbor-red/50',
    icon: XCircle,
  },
  cancelled: {
    label: APPROVAL_STATUS_LABELS.cancelled,
    bg: 'bg-console-500/30',
    text: 'text-console-300',
    border: 'border-console-400/30',
    icon: Ban,
  },
};
</script>

<template>
  <span
    :class="[
      'inline-flex items-center gap-1 rounded border font-mono font-medium',
      size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs',
      statusConfig[status].bg,
      statusConfig[status].text,
      statusConfig[status].border,
      statusConfig[status].pulse ? 'animate-pulse-orange' : '',
    ]"
  >
    <component :is="statusConfig[status].icon" :size="size === 'sm' ? 10 : 12" />
    {{ statusConfig[status].label }}
  </span>
</template>
