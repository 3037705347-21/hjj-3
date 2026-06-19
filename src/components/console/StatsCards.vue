<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useScheduleStore } from '../../stores/schedule';
import {
  Ship,
  Clock,
  Activity,
  Boxes,
  TrendingUp,
  TrendingDown,
  Hourglass,
  Ship as ShipIcon,
  AlertTriangle,
  TimerReset,
  Repeat,
} from 'lucide-vue-next';
import type { Component } from 'vue';

type StatKey =
  | 'shipsInPort'
  | 'shipsWaiting'
  | 'utilization'
  | 'operations'
  | 'avgWaiting'
  | 'todayDeparted'
  | 'conflictShips'
  | 'overtimeOps'
  | 'turnover';

interface StatCard {
  key: StatKey;
  label: string;
  value: number;
  animatedKey: keyof typeof animatedValues.value;
  icon: Component;
  color: string;
  glowClass: string;
  suffix?: string;
  trend?: 'up' | 'down';
  trendValue?: string;
  progressDenominator?: number;
}

const emit = defineEmits<{
  (e: 'card-click', key: StatKey): void;
}>();

const store = useScheduleStore();

const animatedValues = ref({
  shipsInPort: 0,
  shipsWaiting: 0,
  utilization: 0,
  operations: 0,
  avgWaiting: 0,
  todayDeparted: 0,
  conflictShips: 0,
  overtimeOps: 0,
  turnover: 0,
});

const stats = computed(
  () =>
    [
      {
        key: 'shipsInPort',
        label: '在港船舶',
        value: store.shipsInPort,
        animatedKey: 'shipsInPort',
        icon: Ship,
        color: 'text-harbor-cyan',
        glowClass: 'shadow-glow-cyan',
        trend: 'up',
        trendValue: '+2',
        progressDenominator: 15,
      },
      {
        key: 'shipsWaiting',
        label: '待泊船舶',
        value: store.shipsWaiting,
        animatedKey: 'shipsWaiting',
        icon: Clock,
        color: 'text-harbor-orange',
        glowClass: 'shadow-glow-orange',
        trend: 'down',
        trendValue: '-1',
        progressDenominator: 15,
      },
      {
        key: 'utilization',
        label: '泊位利用率',
        value: store.berthUtilization,
        animatedKey: 'utilization',
        icon: Activity,
        color: 'text-harbor-purple',
        suffix: '%',
        trend: 'up',
        trendValue: '+5%',
        progressDenominator: 100,
      },
      {
        key: 'operations',
        label: '今日作业量',
        value: store.todayOperations,
        animatedKey: 'operations',
        icon: Boxes,
        color: 'text-harbor-yellow',
        trend: 'up',
        trendValue: '+3',
        progressDenominator: 15,
      },
      {
        key: 'avgWaiting',
        label: '平均待泊时长',
        value: store.avgWaitingMinutes,
        animatedKey: 'avgWaiting',
        icon: Hourglass,
        color: 'text-harbor-blue',
        suffix: 'min',
        trend: 'down',
        trendValue: '-8min',
        progressDenominator: 240,
      },
      {
        key: 'todayDeparted',
        label: '今日离泊船次',
        value: store.todayDeparted,
        animatedKey: 'todayDeparted',
        icon: ShipIcon,
        color: 'text-harbor-green',
        trend: 'up',
        trendValue: '+1',
        progressDenominator: 10,
      },
      {
        key: 'conflictShips',
        label: '冲突船舶数',
        value: store.conflictShipCount,
        animatedKey: 'conflictShips',
        icon: AlertTriangle,
        color: 'text-harbor-red',
        trend: store.conflictShipCount > 0 ? 'up' : 'down',
        trendValue: store.conflictShipCount > 0 ? `+${store.conflictShipCount}` : '0',
        progressDenominator: 10,
      },
      {
        key: 'overtimeOps',
        label: '超时作业数',
        value: store.overtimeOperationsCount,
        animatedKey: 'overtimeOps',
        icon: TimerReset,
        color: 'text-harbor-red',
        trend: store.overtimeOperationsCount > 0 ? 'up' : 'down',
        trendValue: store.overtimeOperationsCount > 0 ? `+${store.overtimeOperationsCount}` : '0',
        progressDenominator: 10,
      },
      {
        key: 'turnover',
        label: '泊位周转率',
        value: Math.round(store.berthTurnoverRate * 100),
        animatedKey: 'turnover',
        icon: Repeat,
        color: 'text-harbor-cyan',
        suffix: '%',
        trend: 'up',
        trendValue: '+12%',
        progressDenominator: 100,
      },
    ] as StatCard[],
);

function animateValue(key: keyof typeof animatedValues.value, target: number, duration = 1000) {
  const start = animatedValues.value[key];
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

function handleCardClick(key: StatKey) {
  emit('card-click', key);
}

onMounted(() => {
  setTimeout(() => {
    stats.value.forEach((s) => {
      animateValue(s.animatedKey, s.value);
    });
  }, 100);
});

watch(
  () => stats.value.map((s) => s.value),
  () => {
    stats.value.forEach((s) => {
      animateValue(s.animatedKey, s.value, 600);
    });
  },
);
</script>

<template>
  <div class="grid grid-cols-3 md:grid-cols-5 xl:grid-cols-9 gap-3">
    <div
      v-for="stat in stats"
      :key="stat.key"
      @click="handleCardClick(stat.key)"
      :class="[
        'panel-border rounded-lg p-3 transition-all duration-300 hover:scale-[1.03] cursor-pointer',
        'hover:shadow-glow-blue active:scale-[0.98]',
      ]"
    >
      <div class="flex items-start justify-between">
        <div class="min-w-0 flex-1">
          <p class="text-[10px] text-console-300 font-mono tracking-wider uppercase truncate">
            {{ stat.label }}
          </p>
          <div class="mt-1.5 flex items-baseline gap-1 flex-wrap">
            <span
              :class="['text-2xl font-bold font-mono animate-count-up', stat.color]"
              :style="{ textShadow: stat.color.includes('cyan') ? '0 0 20px rgba(0,212,170,0.4)' : undefined }"
            >
              {{ animatedValues[stat.animatedKey] }}{{ stat.suffix || '' }}
            </span>
            <span
              v-if="stat.trend && stat.trendValue"
              :class="[
                'inline-flex items-center gap-0.5 text-[10px] font-mono',
                stat.trend === 'up' ? 'text-harbor-cyan' : 'text-harbor-red',
              ]"
            >
              <TrendingUp v-if="stat.trend === 'up'" :size="10" />
              <TrendingDown v-else :size="10" />
              {{ stat.trendValue }}
            </span>
          </div>
        </div>
        <div
          :class="[
            'w-9 h-9 rounded-lg flex items-center justify-center ml-2 flex-shrink-0',
            'bg-console-700/50 border border-console-500/50',
          ]"
        >
          <component :is="stat.icon" :class="['w-4 h-4', stat.color]" />
        </div>
      </div>
      <div class="mt-2.5 h-1 bg-console-700 rounded-full overflow-hidden">
        <div
          :class="['h-full rounded-full transition-all duration-1000', stat.color.replace('text-', 'bg-')]"
          :style="{ width: `${Math.min(100, (stat.value / (stat.progressDenominator || 100)) * 100)}%` }"
        />
      </div>
    </div>
  </div>
</template>
