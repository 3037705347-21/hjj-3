<script setup lang="ts">
import { computed } from 'vue';
import { useScheduleStore } from '../../stores/schedule';
import { format, differenceInHours, differenceInMinutes } from 'date-fns';
import { Waves, ArrowUp, ArrowDown, TrendingUp, TrendingDown, Clock, Ship } from 'lucide-vue-next';

const store = useScheduleStore();

const displayRange = computed(() => {
  const now = new Date();
  return store.tides.filter((t) => {
    const diff = differenceInHours(t.time, now);
    return diff >= -3 && diff <= 24;
  });
});

const hasData = computed(() => displayRange.value.length > 0);

const currentTide = computed(() => {
  if (!hasData.value) return null;
  const now = new Date();
  let closest = displayRange.value[0];
  let minDiff = Infinity;
  displayRange.value.forEach((t) => {
    const diff = Math.abs(differenceInMinutes(t.time, now));
    if (diff < minDiff) {
      minDiff = diff;
      closest = t;
    }
  });
  return closest;
});

interface KeyTideWindow {
  time: Date;
  height: number;
  type: 'high' | 'low';
}

const keyTideWindows = computed<KeyTideWindow[]>(() => {
  if (!hasData.value) return [];
  const now = new Date();
  return store.tides
    .filter((t): t is KeyTideWindow => {
      const diff = differenceInHours(t.time, now);
      return diff >= 0 && diff <= 24 && (t.type === 'high' || t.type === 'low');
    })
    .slice(0, 6);
});

function getWindowLabel(type: 'high' | 'low') {
  return type === 'high' ? '高潮窗' : '低潮窗';
}

function getWindowDescription(type: 'high' | 'low', height: number) {
  if (type === 'high') {
    if (height >= 4.5) return '大型深吃水船舶可通航';
    if (height >= 3.5) return '中型船舶通航窗口';
    return '小型船舶可通行';
  }
  if (height <= 2.0) return '需注意浅水区作业限制';
  return '吃水受限船舶需评估';
}

function formatHoursFromNow(time: Date) {
  const diff = differenceInHours(time, new Date());
  if (diff === 0) return '即将到来';
  if (diff === 1) return '1小时后';
  return `${diff}小时后`;
}

const maxHeight = computed(() => {
  if (!hasData.value) return 5;
  return Math.max(...displayRange.value.map((t) => t.height));
});

const minHeight = computed(() => {
  if (!hasData.value) return 2;
  return Math.min(...displayRange.value.map((t) => t.height));
});

const chartWidth = computed(() => Math.max(100, displayRange.value.length * 8));

function getX(t: Date) {
  if (!hasData.value) return 0;
  const first = displayRange.value[0].time;
  return (differenceInMinutes(t, first) / 30) * 8;
}

function getY(h: number) {
  const range = maxHeight.value - minHeight.value || 1;
  return 60 - ((h - minHeight.value) / range) * 50;
}

const pathD = computed(() => {
  if (!hasData.value) return '';
  return displayRange.value
    .map((t, i) => `${i === 0 ? 'M' : 'L'} ${getX(t.time)} ${getY(t.height)}`)
    .join(' ');
});

const areaD = computed(() => {
  if (!hasData.value) return '';
  const last = displayRange.value[displayRange.value.length - 1];
  const first = displayRange.value[0];
  return `${pathD.value} L ${getX(last.time)} 70 L ${getX(first.time)} 70 Z`;
});

const typeIcon = {
  high: ArrowUp,
  low: ArrowDown,
  rising: TrendingUp,
  falling: TrendingDown,
};
</script>

<template>
  <div class="panel-border rounded-lg p-4">
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2">
        <Waves class="w-4 h-4 text-harbor-cyan" />
        <h3 class="font-mono text-sm font-semibold text-console-100 tracking-wide">
          潮汐窗口
        </h3>
      </div>
      <div class="flex items-center gap-3">
        <div v-if="currentTide" class="flex items-center gap-2">
          <component :is="typeIcon[currentTide.type]" class="w-3.5 h-3.5 text-harbor-cyan" />
          <span class="text-xs font-mono text-console-200">
            当前: {{ currentTide.height.toFixed(1) }}m
          </span>
          <span class="text-[10px] font-mono text-console-400 uppercase">
            {{
              currentTide.type === 'high' ? '高潮' :
              currentTide.type === 'low' ? '低潮' :
              currentTide.type === 'rising' ? '涨潮' : '落潮'
            }}
          </span>
        </div>
      </div>
    </div>

    <div class="relative overflow-x-auto">
      <svg
        v-if="hasData"
        :width="chartWidth + 40"
        height="85"
        class="min-w-full"
      >
        <defs>
          <linearGradient id="tideGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#00d4aa" stop-opacity="0.4" />
            <stop offset="100%" stop-color="#00d4aa" stop-opacity="0.02" />
          </linearGradient>
        </defs>

        <line
          v-for="y in [20, 40, 60]"
          :key="y"
          :x1="20"
          :x2="chartWidth + 20"
          :y1="y"
          :y2="y"
          stroke="rgba(74,122,176,0.15)"
          stroke-width="1"
        />

        <path :d="areaD" fill="url(#tideGradient)" transform="translate(20, 0)" />
        <path
          :d="pathD"
          fill="none"
          stroke="#00d4aa"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          transform="translate(20, 0)"
        />

        <template v-for="tide in displayRange.filter((t, i) => i % 4 === 0)" :key="tide.time.toISOString()">
          <circle
            :cx="getX(tide.time) + 20"
            :cy="getY(tide.height)"
            r="3"
            :fill="tide.type === 'high' || tide.type === 'low' ? '#ff6b35' : '#00d4aa'"
          />
          <text
            :x="getX(tide.time) + 20"
            y="78"
            text-anchor="middle"
            class="fill-console-400"
            style="font-size: 9px; font-family: 'JetBrains Mono', monospace"
          >
            {{ format(tide.time, 'HH:mm') }}
          </text>
          <text
            v-if="tide.type === 'high' || tide.type === 'low'"
            :x="getX(tide.time) + 20"
            :y="getY(tide.height) - 6"
            text-anchor="middle"
            :class="tide.type === 'high' ? 'fill-harbor-orange' : 'fill-harbor-cyan'"
            style="font-size: 9px; font-family: 'JetBrains Mono', monospace; font-weight: 600"
          >
            {{ tide.height.toFixed(1) }}m
          </text>
        </template>

        <line
          x1="20"
          :x2="20"
          y1="5"
          y2="70"
          stroke="#ff4757"
          stroke-width="1.5"
          stroke-dasharray="3 2"
          :transform="`translate(${getX(new Date())}, 0)`"
        />
        <text
          :x="getX(new Date()) + 24"
          y="12"
          class="fill-harbor-red"
          style="font-size: 9px; font-family: 'JetBrains Mono', monospace"
        >
          现在
        </text>
      </svg>
    </div>

    <div class="mt-2 flex items-center justify-between text-[10px] font-mono text-console-400">
      <span>最高: {{ maxHeight.toFixed(1) }}m</span>
      <span>最低: {{ minHeight.toFixed(1) }}m</span>
      <span>范围: 过去3小时 + 未来24小时</span>
    </div>

    <div v-if="keyTideWindows.length > 0" class="mt-3 pt-3 border-t border-console-500/20">
      <div class="flex items-center gap-1.5 mb-2.5">
        <Clock class="w-3.5 h-3.5 text-harbor-cyan" />
        <h4 class="font-mono text-[11px] font-semibold text-console-100 tracking-wide">
          未来 24 小时关键潮窗
        </h4>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <div
          v-for="tide in keyTideWindows"
          :key="tide.time.toISOString()"
          :class="[
            'rounded-lg px-2.5 py-2 border transition-colors',
            tide.type === 'high'
              ? 'bg-harbor-orange/5 border-harbor-orange/20 hover:bg-harbor-orange/10'
              : 'bg-harbor-cyan/5 border-harbor-cyan/20 hover:bg-harbor-cyan/10',
          ]"
        >
          <div class="flex items-center justify-between mb-1">
            <span
              :class="[
                'inline-flex items-center gap-1 font-mono text-[10px] font-semibold',
                tide.type === 'high' ? 'text-harbor-orange' : 'text-harbor-cyan',
              ]"
            >
              <ArrowUp v-if="tide.type === 'high'" :size="10" />
              <ArrowDown v-else :size="10" />
              {{ getWindowLabel(tide.type) }}
            </span>
            <span class="font-mono text-[10px] text-console-400">
              {{ formatHoursFromNow(tide.time) }}
            </span>
          </div>
          <div class="flex items-center gap-2">
            <span
              :class="[
                'font-mono text-sm font-bold',
                tide.type === 'high' ? 'text-harbor-orange' : 'text-harbor-cyan',
              ]"
            >
              {{ tide.height.toFixed(1) }}m
            </span>
            <span class="font-mono text-[10px] text-console-200">
              {{ format(tide.time, 'HH:mm') }}
            </span>
          </div>
          <p class="mt-1 font-mono text-[9px] text-console-400 leading-tight flex items-center gap-1">
            <Ship :size="9" class="flex-shrink-0" />
            {{ getWindowDescription(tide.type, tide.height) }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
