<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
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
  Camera,
  MoreHorizontal,
  Plus,
  Search,
  Layers,
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
  (e: 'snapshot-action', key: StatKey, action: 'find-nearest' | 'create-now' | 'view-all'): void;
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

const activeMenu = ref<StatKey | null>(null);
const statCardRefs = ref<Record<string, HTMLElement | null>>({});
const menuStyle = ref<{ left: string; top: string }>({ left: '0px', top: '0px' });

function positionMenu(key: StatKey) {
  const el = statCardRefs.value[key];
  if (!el) return;
  const rect = el.getBoundingClientRect();
  menuStyle.value = {
    left: `${rect.left}px`,
    top: `${rect.bottom + 6}px`,
  };
  nextTick(() => {
    const menu = document.getElementById('stat-snapshot-menu');
    if (menu) {
      const menuRect = menu.getBoundingClientRect();
      const vw = window.innerWidth;
      if (rect.left + menuRect.width > vw) {
        menuStyle.value.left = `${vw - menuRect.width - 12}px`;
      }
    }
  });
}

function toggleMenu(key: StatKey, ev: MouseEvent) {
  ev.stopPropagation();
  if (activeMenu.value === key) {
    activeMenu.value = null;
  } else {
    positionMenu(key);
    activeMenu.value = key;
  }
}

function handleSnapshotAction(key: StatKey, action: 'find-nearest' | 'create-now' | 'view-all', ev: MouseEvent) {
  ev.stopPropagation();
  activeMenu.value = null;
  emit('snapshot-action', key, action);
}

document.addEventListener('click', () => {
  activeMenu.value = null;
});
</script>

<template>
  <div class="grid grid-cols-3 md:grid-cols-5 xl:grid-cols-9 gap-3">
    <div
      v-for="stat in stats"
      :key="stat.key"
      @click="handleCardClick(stat.key)"
      :class="[
        'group panel-border rounded-lg p-3 transition-all duration-300 hover:scale-[1.03] cursor-pointer',
        'hover:shadow-glow-blue active:scale-[0.98]',
      ]"
      :data-stat-key="stat.key"
      ref="el => statCardRefs[stat.key] = el as HTMLElement"
    >
      <div class="flex items-start justify-between">
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-1">
            <p class="text-[10px] text-console-300 font-mono tracking-wider uppercase truncate">
              {{ stat.label }}
            </p>
            <div class="relative">
              <button
                @click="toggleMenu(stat.key, $event)"
                class="w-4 h-4 rounded flex items-center justify-center hover:bg-console-600/60 text-console-400 hover:text-harbor-cyan transition-all opacity-0 group-hover:opacity-100"
                :class="activeMenu === stat.key ? 'opacity-100 bg-console-600/60 text-harbor-cyan' : ''"
                title="快照操作"
              >
                <MoreHorizontal class="w-3 h-3" />
              </button>

              <Teleport to="body">
                <Transition name="dropdown">
                  <div
                    v-if="activeMenu === stat.key"
                    class="fixed z-[100] panel-border rounded-lg bg-console-800/98 backdrop-blur-xl shadow-2xl py-1.5 min-w-[180px] overflow-hidden"
                    :style="menuStyle"
                    id="stat-snapshot-menu"
                  >
                    <div class="px-3 py-1.5 border-b border-console-500/20 mb-1">
                      <p class="text-[9px] font-mono text-console-400 tracking-wider uppercase">
                        {{ stat.label }} · 快照操作
                      </p>
                    </div>
                    <button
                      @click="handleSnapshotAction(stat.key, 'find-nearest', $event)"
                      class="w-full px-3 py-2 text-left text-[11px] font-mono text-console-200 hover:bg-harbor-cyan/15 hover:text-harbor-cyan flex items-center gap-2 transition-all"
                    >
                      <Search class="w-3.5 h-3.5 text-harbor-cyan" />
                      查找最近快照
                    </button>
                    <button
                      @click="handleSnapshotAction(stat.key, 'create-now', $event)"
                      class="w-full px-3 py-2 text-left text-[11px] font-mono text-console-200 hover:bg-harbor-green/15 hover:text-harbor-green flex items-center gap-2 transition-all"
                    >
                      <Plus class="w-3.5 h-3.5 text-harbor-green" />
                      立即创建快照
                    </button>
                    <div class="h-px bg-console-500/20 my-1" />
                    <button
                      @click="handleSnapshotAction(stat.key, 'view-all', $event)"
                      class="w-full px-3 py-2 text-left text-[11px] font-mono text-console-200 hover:bg-harbor-orange/15 hover:text-harbor-orange flex items-center gap-2 transition-all"
                    >
                      <Layers class="w-3.5 h-3.5 text-harbor-orange" />
                      进入调度复盘
                    </button>
                  </div>
                </Transition>
              </Teleport>
            </div>
          </div>
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
            'w-9 h-9 rounded-lg flex items-center justify-center ml-2 flex-shrink-0 relative',
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
