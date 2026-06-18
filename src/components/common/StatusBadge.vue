<script setup lang="ts">
import type { OperationStatus } from '../../types';
import {
  Anchor,
  Navigation,
  Ship,
  ArrowUpFromLine,
  ArrowDownToLine,
  LogOut,
  CheckCircle2,
} from 'lucide-vue-next';

defineProps<{
  status: OperationStatus;
  size?: 'sm' | 'md';
}>();

const statusConfig: Record<
  OperationStatus,
  { label: string; bg: string; text: string; border: string; icon: typeof Anchor; pulse?: boolean }
> = {
  anchored: {
    label: '锚泊',
    bg: 'bg-console-500/30',
    text: 'text-console-200',
    border: 'border-console-400/50',
    icon: Anchor,
  },
  approaching: {
    label: '进港中',
    bg: 'bg-harbor-yellow/20',
    text: 'text-harbor-yellow',
    border: 'border-harbor-yellow/50',
    icon: Navigation,
    pulse: true,
  },
  berthing: {
    label: '靠泊中',
    bg: 'bg-harbor-purple/20',
    text: 'text-harbor-purple',
    border: 'border-harbor-purple/50',
    icon: Ship,
    pulse: true,
  },
  loading: {
    label: '装货中',
    bg: 'bg-harbor-cyan/20',
    text: 'text-harbor-cyan',
    border: 'border-harbor-cyan/50',
    icon: ArrowUpFromLine,
  },
  unloading: {
    label: '卸货中',
    bg: 'bg-harbor-cyan/20',
    text: 'text-harbor-cyan',
    border: 'border-harbor-cyan/50',
    icon: ArrowDownToLine,
  },
  departing: {
    label: '离泊中',
    bg: 'bg-harbor-orange/20',
    text: 'text-harbor-orange',
    border: 'border-harbor-orange/50',
    icon: LogOut,
    pulse: true,
  },
  departed: {
    label: '已离港',
    bg: 'bg-console-400/20',
    text: 'text-console-300',
    border: 'border-console-400/30',
    icon: CheckCircle2,
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
