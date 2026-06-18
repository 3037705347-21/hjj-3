<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useScheduleStore } from '../../stores/schedule';
import { Ship, Clock, Activity, Boxes, TrendingUp, TrendingDown } from 'lucide-vue-next';

const store = useScheduleStore();

const animatedValues = ref({
  shipsInPort: 0,
  shipsWaiting: 0,
  utilization: 0,
  operations: 0,
});

const stats = computed(() => [
  {
    label: '在港船舶',
    value: store.shipsInPort,
    animatedKey: 'shipsInPort' as const,
    icon: Ship,
    color: 'text-harbor-cyan',
    glowClass: 'shadow-glow-cyan',
    trend: 'up' as const,
    trendValue: '+2',
  },
  {
    label: '待泊船舶',
    value: store.shipsWaiting,
    animatedKey: 'shipsWaiting' as const,
    icon: Clock,
    color: 'text-harbor-orange',
    glowClass: 'shadow-glow-orange',
    trend: 'down' as const,
    trendValue: '-1',
  },
  {
    label: '泊位利用率',
    value: store.berthUtilization,
    animatedKey: 'utilization' as const,
    icon: Activity,
    color: 'text-harbor-purple',
    suffix: '%',
    trend: 'up' as const,
    trendValue: '+5%',
  },
  {
    label: '今日作业量',
    value: store.todayOperations,
    animatedKey: 'operations' as const,
    icon: Boxes,
    color: 'text-harbor-yellow',
    trend: 'up' as const,
    trendValue: '+3',
  },
]);

function animateValue(key: keyof typeof animatedValues.value, target: number, duration = 1000) {
  const start = 0;
  const startTime = performance.now();
  const step = (currentTime: number) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easeOut = 1 - Math.pow(1 - progress, 3);
    animatedValues.value[key] = Math.round(start + (target - start) * easeOut);
    if (progress < 1) {
      requestAnimationFrame(step);
    }
  };
  requestAnimationFrame(step);
}

onMounted(() => {
  setTimeout(() => {
    stats.value.forEach((s) => {
      animateValue(s.animatedKey, s.value);
    });
  }, 100);
});
</script>

<template>
  <div class="grid grid-cols-4 gap-4">
    <div
      v-for="stat in stats"
      :key="stat.label"
      :class="[
        'panel-border rounded-lg p-4 transition-all duration-300 hover:scale-[1.02]',
        'hover:shadow-glow-blue',
      ]"
    >
      <div class="flex items-start justify-between">
        <div>
          <p class="text-xs text-console-300 font-mono tracking-wider uppercase">
            {{ stat.label }}
          </p>
          <div class="mt-2 flex items-baseline gap-2">
            <span
              :class="['text-3xl font-bold font-mono animate-count-up', stat.color]"
              :style="{ textShadow: stat.color.includes('cyan') ? '0 0 20px rgba(0,212,170,0.4)' : undefined }"
            >
              {{ animatedValues[stat.animatedKey] }}{{ stat.suffix || '' }}
            </span>
            <span
              :class="[
                'inline-flex items-center gap-0.5 text-xs font-mono',
                stat.trend === 'up' ? 'text-harbor-cyan' : 'text-harbor-red',
              ]"
            >
              <TrendingUp v-if="stat.trend === 'up'" :size="12" />
              <TrendingDown v-else :size="12" />
              {{ stat.trendValue }}
            </span>
          </div>
        </div>
        <div
          :class="[
            'w-10 h-10 rounded-lg flex items-center justify-center',
            'bg-console-700/50 border border-console-500/50',
          ]"
        >
          <component :is="stat.icon" :class="['w-5 h-5', stat.color]" />
        </div>
      </div>
      <div class="mt-3 h-1 bg-console-700 rounded-full overflow-hidden">
        <div
          :class="['h-full rounded-full transition-all duration-1000', stat.color.replace('text-', 'bg-')]"
          :style="{ width: `${Math.min(100, (stat.value / (stat.suffix ? 100 : 15)) * 100)}%` }"
        />
      </div>
    </div>
  </div>
</template>
