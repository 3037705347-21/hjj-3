<script setup lang="ts">
import type { ShipPriority } from '../../types';
import { AlertTriangle, Flame, Minus, ChevronDown } from 'lucide-vue-next';

defineProps<{
  priority: ShipPriority;
  size?: 'sm' | 'md';
}>();

const priorityConfig: Record<ShipPriority, { label: string; bg: string; text: string; border: string; icon: typeof Minus }> = {
  critical: {
    label: '紧急',
    bg: 'bg-harbor-red/20',
    text: 'text-harbor-red',
    border: 'border-harbor-red/50',
    icon: Flame,
  },
  high: {
    label: '高优',
    bg: 'bg-harbor-orange/20',
    text: 'text-harbor-orange',
    border: 'border-harbor-orange/50',
    icon: AlertTriangle,
  },
  normal: {
    label: '普通',
    bg: 'bg-harbor-cyan/15',
    text: 'text-harbor-cyan',
    border: 'border-harbor-cyan/40',
    icon: Minus,
  },
  low: {
    label: '低优',
    bg: 'bg-console-400/30',
    text: 'text-console-200',
    border: 'border-console-400/40',
    icon: ChevronDown,
  },
};
</script>

<template>
  <span
    :class="[
      'inline-flex items-center gap-1 rounded border font-mono font-medium',
      size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs',
      priorityConfig[priority].bg,
      priorityConfig[priority].text,
      priorityConfig[priority].border,
    ]"
  >
    <component :is="priorityConfig[priority].icon" :size="size === 'sm' ? 10 : 12" />
    {{ priorityConfig[priority].label }}
  </span>
</template>
