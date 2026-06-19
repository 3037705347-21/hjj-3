<script setup lang="ts">
import { computed, onMounted, ref, watch, type Component } from 'vue';
import { TrendingUp, TrendingDown } from 'lucide-vue-next';

const props = withDefaults(defineProps<{
  label: string;
  value: number;
  icon?: Component;
  color?: string;
  suffix?: string;
  trend?: 'up' | 'down';
  trendValue?: string;
  progressDenominator?: number;
}>(), {
  color: 'text-harbor-cyan',
  progressDenominator: 100,
});

const animatedValue = ref(0);

const bgGlowClass = computed(() => {
  if (props.color.includes('cyan')) return 'shadow-glow-cyan';
  if (props.color.includes('orange')) return 'shadow-glow-orange';
  if (props.color.includes('red')) return 'shadow-glow-red';
  return 'shadow-glow-blue';
});

const bgColorClass = computed(() => props.color.replace('text-', 'bg-'));

function animate(target: number, duration = 800) {
  const start = animatedValue.value;
  const startTime = performance.now();
  const step = (currentTime: number) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easeOut = 1 - Math.pow(1 - progress, 3);
    animatedValue.value = Math.round(start + (target - start) * easeOut);
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

onMounted(() => {
  setTimeout(() => animate(props.value), 100);
});

watch(
  () => props.value,
  (val) => animate(val, 500),
);
</script>

<template>
  <div
    :class="[
      'panel-border rounded-lg p-3 transition-all duration-300 hover:scale-[1.02]',
      bgGlowClass,
    ]"
  >
    <div class="flex items-start justify-between">
      <div class="min-w-0 flex-1">
        <p class="text-[10px] text-console-300 font-mono tracking-wider uppercase truncate">
          {{ label }}
        </p>
        <div class="mt-1.5 flex items-baseline gap-1 flex-wrap">
          <span
            :class="['text-2xl font-bold font-mono animate-count-up tabular-nums', color]"
            :style="{ textShadow: color.includes('cyan') ? '0 0 20px rgba(0,212,170,0.4)' : undefined }"
          >
            {{ animatedValue }}{{ suffix || '' }}
          </span>
          <span
            v-if="trend && trendValue"
            :class="[
              'inline-flex items-center gap-0.5 text-[10px] font-mono',
              trend === 'up' ? 'text-harbor-cyan' : 'text-harbor-red',
            ]"
          >
            <TrendingUp v-if="trend === 'up'" :size="10" />
            <TrendingDown v-else :size="10" />
            {{ trendValue }}
          </span>
        </div>
      </div>
      <div
        v-if="icon"
        class="w-9 h-9 rounded-lg flex items-center justify-center ml-2 flex-shrink-0 bg-console-700/50 border border-console-500/50"
      >
        <component :is="icon" :class="['w-4 h-4', color]" />
      </div>
    </div>
    <div class="mt-2.5 h-1 bg-console-700 rounded-full overflow-hidden">
      <div
        :class="['h-full rounded-full transition-all duration-1000', bgColorClass]"
        :style="{ width: `${Math.min(100, (value / (progressDenominator || 100)) * 100)}%` }"
      />
    </div>
  </div>
</template>
