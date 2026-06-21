<script setup lang="ts">
import type { ShipTag } from '../../types';
import { SHIP_TAG_LABELS, SHIP_TAG_COLORS } from '../../types';

type BadgeSize = 'xs' | 'sm' | 'md';

const props = withDefaults(defineProps<{
  tag: ShipTag;
  size?: BadgeSize;
  showLabel?: boolean;
}>(), {
  size: 'sm',
  showLabel: true,
});

const sizeClasses: Record<BadgeSize, string> = {
  xs: 'px-1 py-0.5 text-[9px]',
  sm: 'px-1.5 py-0.5 text-[10px]',
  md: 'px-2 py-1 text-[11px]',
};

const colors = SHIP_TAG_COLORS[props.tag];
const label = SHIP_TAG_LABELS[props.tag];
</script>

<template>
  <span
    :class="[
      'inline-flex items-center gap-1 rounded font-mono font-medium border transition-all',
      sizeClasses[size],
      colors.bg,
      colors.text,
      colors.border,
    ]"
  >
    <span class="w-1.5 h-1.5 rounded-full" :class="colors.text.replace('text-', 'bg-')" />
    <span v-if="showLabel">{{ label }}</span>
  </span>
</template>
