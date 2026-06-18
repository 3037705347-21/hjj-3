<script setup lang="ts">
import type { CargoType } from '../types';
import { Boxes, Mountain, Droplets, Package, Car } from 'lucide-vue-next';

defineProps<{
  type: CargoType;
  showLabel?: boolean;
  size?: number;
}>();

const cargoConfig: Record<CargoType, { label: string; color: string; icon: typeof Boxes }> = {
  container: { label: '集装箱', color: 'text-harbor-cyan', icon: Boxes },
  bulk: { label: '散货', color: 'text-amber-400', icon: Mountain },
  liquid: { label: '液体', color: 'text-blue-400', icon: Droplets },
  general: { label: '杂货', color: 'text-console-200', icon: Package },
  'ro-ro': { label: '滚装', color: 'text-harbor-orange', icon: Car },
};
</script>

<template>
  <span class="inline-flex items-center gap-1" :class="cargoConfig[type].color">
    <component :is="cargoConfig[type].icon" :size="size || 14" />
    <span v-if="showLabel" class="font-mono text-xs">{{ cargoConfig[type].label }}</span>
  </span>
</template>
