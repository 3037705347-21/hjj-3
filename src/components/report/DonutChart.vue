<script setup lang="ts">
import { computed } from 'vue';
import type { AbnormalReasonCategory } from '../../types';
import { ABNORMAL_REASON_CATEGORY_LABELS } from '../../types';

interface DonutDatum {
  category: AbnormalReasonCategory;
  count: number;
  percentage: number;
}

const CATEGORY_COLORS: Record<AbnormalReasonCategory, string> = {
  weather: '#3b82f6',
  equipment_failure: '#ff4757',
  tide_window: '#a855f7',
  ship_delay: '#ff6b35',
  labor_shortage: '#ffc107',
  cargo_issue: '#00d4aa',
  berth_maintenance: '#7aa5d4',
  other: '#4a7ab0',
};

const props = defineProps<{
  data: DonutDatum[];
  size?: number;
  thickness?: number;
}>();

const size = computed(() => props.size ?? 200);
const thickness = computed(() => props.thickness ?? 28);
const radius = computed(() => (size.value - thickness.value) / 2);
const circumference = computed(() => 2 * Math.PI * radius.value);
const center = computed(() => size.value / 2);

const total = computed(() => props.data.reduce((s, d) => s + d.count, 0) || 1);

const segments = computed(() => {
  let accumulated = 0;
  return props.data.map((d) => {
    const fraction = d.count / total.value;
    const dashArray = `${fraction * circumference.value} ${circumference.value}`;
    const dashOffset = -accumulated * circumference.value;
    accumulated += fraction;
    return {
      ...d,
      color: CATEGORY_COLORS[d.category],
      dashArray,
      dashOffset,
      label: ABNORMAL_REASON_CATEGORY_LABELS[d.category],
    };
  });
});
</script>

<template>
  <div class="flex items-center gap-6">
    <div class="relative flex-shrink-0" :style="{ width: `${size}px`, height: `${size}px` }">
      <svg :width="size" :height="size" class="-rotate-90">
        <circle
          :cx="center"
          :cy="center"
          :r="radius"
          fill="none"
          stroke="#162a47"
          :stroke-width="thickness"
        />
        <circle
          v-for="seg in segments"
          :key="seg.category"
          :cx="center"
          :cy="center"
          :r="radius"
          fill="none"
          :stroke="seg.color"
          :stroke-width="thickness"
          :stroke-dasharray="seg.dashArray"
          :stroke-dashoffset="seg.dashOffset"
          stroke-linecap="butt"
          class="transition-all duration-700"
          :style="{ filter: `drop-shadow(0 0 6px ${seg.color}55)` }"
        />
      </svg>
      <div class="absolute inset-0 flex flex-col items-center justify-center">
        <span class="font-mono text-3xl font-bold text-console-100 tabular-nums glow-text-cyan">
          {{ total }}
        </span>
        <span class="text-[10px] font-mono text-console-400 uppercase tracking-wider mt-0.5">
          异常总数
        </span>
      </div>
    </div>

    <div class="flex-1 space-y-2 min-w-0">
      <div
        v-for="seg in segments"
        :key="seg.category"
        class="flex items-center justify-between gap-2"
      >
        <div class="flex items-center gap-2 min-w-0">
          <span
            class="w-2.5 h-2.5 rounded-sm flex-shrink-0"
            :style="{ backgroundColor: seg.color, boxShadow: `0 0 6px ${seg.color}88` }"
          />
          <span class="text-[11px] font-mono text-console-200 truncate">
            {{ seg.label }}
          </span>
        </div>
        <div class="flex items-center gap-2 flex-shrink-0">
          <span class="text-[11px] font-mono font-bold text-console-100 tabular-nums">
            {{ seg.count }}
          </span>
          <span class="text-[10px] font-mono text-console-400 tabular-nums w-10 text-right">
            {{ seg.percentage }}%
          </span>
        </div>
      </div>
      <div v-if="segments.length === 0" class="text-[11px] font-mono text-console-500 py-4 text-center">
        暂无异常数据
      </div>
    </div>
  </div>
</template>
