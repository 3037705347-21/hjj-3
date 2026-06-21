<script setup lang="ts">
import { computed } from 'vue';
import { useScheduleStore } from '../../stores/schedule';
import { useShipTideAdaptation } from '../../composables/useShipTideAdaptation';
import type { ShipTideAnalysis, RecommendedWindow } from '../../composables/useShipTideAdaptation';
import { Waves, AlertTriangle, CheckCircle2, ArrowUp, ArrowDown, Clock, Ship, Anchor, Navigation, TrendingUp, TrendingDown } from 'lucide-vue-next';
import { format, differenceInMinutes } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const store = useScheduleStore();
const { analyzeShipTide, getDepthStatus, calculateAvailableDepth } = useShipTideAdaptation();

const tideAnalysis = computed<ShipTideAnalysis | null>(() => {
  if (!store.selectedSchedule || !store.selectedShip || !store.selectedBerth) return null;
  return analyzeShipTide(
    store.selectedSchedule,
    store.selectedShip,
    store.selectedBerth,
    store.tides,
  );
});

const hasTideConflict = computed(() => {
  if (!store.selectedScheduleId) return false;
  return store.conflicts.some(
    (c) => c.scheduleId === store.selectedScheduleId && c.type === 'tide_window',
  );
});

const tideConflictMessage = computed(() => {
  if (!store.selectedScheduleId) return null;
  const conflict = store.conflicts.find(
    (c) => c.scheduleId === store.selectedScheduleId && c.type === 'tide_window',
  );
  return conflict?.message || null;
});

const displayTides = computed(() => {
  if (!store.selectedSchedule || !tideAnalysis.value) return [];
  const eta = new Date(store.selectedSchedule.eta);
  const etd = new Date(store.selectedSchedule.etd);
  return store.tides.filter((t) => t.time >= eta && t.time <= etd).slice(0, 24);
});

const chartMaxDepth = computed(() => {
  if (!tideAnalysis.value) return 20;
  return Math.ceil(Math.max(tideAnalysis.value.maxAvailableDepth + 1, 16));
});

const chartMinDepth = computed(() => {
  if (!tideAnalysis.value) return 10;
  return Math.floor(Math.min(tideAnalysis.value.minAvailableDepth - 1, 10));
});

function getChartY(depth: number) {
  const range = chartMaxDepth.value - chartMinDepth.value || 1;
  return 80 - ((depth - chartMinDepth.value) / range) * 70;
}

function getChartX(index: number, total: number) {
  if (total <= 1) return 50;
  return 20 + (index / (total - 1)) * 260;
}

function formatTime(date: Date) {
  return format(new Date(date), 'MM-dd HH:mm', { locale: zhCN });
}

function formatDuration(start: Date, end: Date) {
  const mins = differenceInMinutes(end, start);
  const hours = Math.floor(mins / 60);
  const minutes = mins % 60;
  if (hours > 0) {
    return `${hours}小时${minutes > 0 ? minutes + '分钟' : ''}`;
  }
  return `${minutes}分钟`;
}

function getWindowTypeLabel(type: RecommendedWindow['type']) {
  switch (type) {
    case 'berthing': return '靠泊窗口';
    case 'departure': return '离泊窗口';
    case 'operation': return '作业窗口';
  }
}

function getWindowTypeIcon(type: RecommendedWindow['type']) {
  switch (type) {
    case 'berthing': return Anchor;
    case 'departure': return Navigation;
    case 'operation': return Ship;
  }
}

function getStatusColorClass(status: 'safe' | 'warning' | 'danger') {
  switch (status) {
    case 'safe': return 'text-harbor-green';
    case 'warning': return 'text-harbor-yellow';
    case 'danger': return 'text-harbor-red';
  }
}


</script>

<template>
  <div v-if="tideAnalysis && store.selectedShip && store.selectedBerth" class="panel-border rounded-lg p-4">
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2">
        <Waves class="w-4 h-4 text-harbor-cyan" />
        <h3 class="font-mono text-sm font-semibold text-console-100">
          本船潮窗适配
        </h3>
      </div>
      <div class="flex items-center gap-2">
        <span
          v-if="hasTideConflict"
          class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-harbor-red/15 text-harbor-red border border-harbor-red/30 text-[9px] font-mono"
        >
          <AlertTriangle class="w-2.5 h-2.5" />
          潮汐告警
        </span>
        <span
          v-else-if="tideAnalysis.hasRisk"
          class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-harbor-yellow/15 text-harbor-yellow border border-harbor-yellow/30 text-[9px] font-mono"
        >
          <AlertTriangle class="w-2.5 h-2.5" />
          存在风险
        </span>
        <span
          v-else
          class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-harbor-green/15 text-harbor-green border border-harbor-green/30 text-[9px] font-mono"
        >
          <CheckCircle2 class="w-2.5 h-2.5" />
          潮窗良好
        </span>
      </div>
    </div>

    <div
      v-if="hasTideConflict && tideConflictMessage"
      class="mb-3 p-2 rounded bg-harbor-red/10 border border-harbor-red/30"
    >
      <p class="text-[10px] font-mono text-harbor-red">{{ tideConflictMessage }}</p>
    </div>

    <div class="grid grid-cols-2 gap-2 mb-3">
      <div class="p-2 rounded bg-console-800/60 border border-console-600/30">
        <p class="text-[9px] font-mono text-console-400 uppercase tracking-wider">船舶吃水</p>
        <p class="text-xs font-mono text-console-200">{{ store.selectedShip.draft.toFixed(1) }}m</p>
      </div>
      <div class="p-2 rounded bg-console-800/60 border border-console-600/30">
        <p class="text-[9px] font-mono text-console-400 uppercase tracking-wider">泊位水深</p>
        <p class="text-xs font-mono text-console-200">{{ store.selectedBerth.maxDraft.toFixed(1) }}m</p>
      </div>
      <div class="p-2 rounded bg-console-800/60 border border-console-600/30">
        <p class="text-[9px] font-mono text-console-400 uppercase tracking-wider">所需水深</p>
        <p class="text-xs font-mono text-harbor-cyan">{{ tideAnalysis.requiredDepth.toFixed(1) }}m</p>
        <p class="text-[8px] font-mono text-console-500">吃水+0.5m余量</p>
      </div>
      <div class="p-2 rounded bg-console-800/60 border border-console-600/30">
        <p class="text-[9px] font-mono text-console-400 uppercase tracking-wider">最低可用</p>
        <p
          class="text-xs font-mono"
          :class="getStatusColorClass(getDepthStatus(tideAnalysis.minAvailableDepth, tideAnalysis.requiredDepth))"
        >
          {{ tideAnalysis.minAvailableDepth.toFixed(1) }}m
        </p>
        <p class="text-[8px] font-mono text-console-500">
          最高 {{ tideAnalysis.maxAvailableDepth.toFixed(1) }}m
        </p>
      </div>
    </div>

    <div v-if="displayTides.length > 0" class="mb-3">
      <div class="flex items-center gap-1.5 mb-2">
        <Clock class="w-3.5 h-3.5 text-harbor-cyan" />
        <h4 class="font-mono text-[11px] font-semibold text-console-100">
          作业窗口水深变化
        </h4>
      </div>
      <div class="relative overflow-x-auto">
        <svg :width="300" height="110" class="min-w-full">
          <defs>
            <linearGradient id="shipTideGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#00d4aa" stop-opacity="0.3" />
              <stop offset="100%" stop-color="#00d4aa" stop-opacity="0.02" />
            </linearGradient>
          </defs>

          <line
            v-for="y in [20, 45, 70]"
            :key="y"
            :x1="20"
            :x2="280"
            :y1="y"
            :y2="y"
            stroke="rgba(74,122,176,0.15)"
            stroke-width="1"
          />

          <line
            :x1="20"
            :x2="280"
            :y1="getChartY(tideAnalysis.requiredDepth)"
            :y2="getChartY(tideAnalysis.requiredDepth)"
            stroke="#ff6b35"
            stroke-width="1"
            stroke-dasharray="4 2"
          />
          <text
            x="282"
            :y="getChartY(tideAnalysis.requiredDepth) + 3"
            class="fill-harbor-orange"
            style="font-size: 8px; font-family: 'JetBrains Mono', monospace"
          >
            {{ tideAnalysis.requiredDepth.toFixed(1) }}m
          </text>

          <path
            v-if="displayTides.length > 1"
            :d="displayTides.map((t, i) => {
              const depth = calculateAvailableDepth(t.height, store.selectedBerth!.maxDraft);
              return `${i === 0 ? 'M' : 'L'} ${getChartX(i, displayTides.length)} ${getChartY(depth)}`;
            }).join(' ')"
            fill="none"
            :stroke="tideAnalysis.hasRisk ? '#ffc107' : '#00d4aa'"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />

          <template v-for="(tide, idx) in displayTides" :key="tide.time.toISOString()">
            <circle
              v-if="idx % 3 === 0 || tide.type === 'high' || tide.type === 'low'"
              :cx="getChartX(idx, displayTides.length)"
              :cy="getChartY(calculateAvailableDepth(tide.height, store.selectedBerth!.maxDraft))"
              r="3"
              :fill="tide.type === 'high' || tide.type === 'low' ? '#ff6b35' : '#00d4aa'"
            />
            <text
              v-if="idx % 4 === 0"
              :x="getChartX(idx, displayTides.length)"
              y="100"
              text-anchor="middle"
              class="fill-console-400"
              style="font-size: 8px; font-family: 'JetBrains Mono', monospace"
            >
              {{ format(tide.time, 'HH:mm') }}
            </text>
          </template>
        </svg>
      </div>
      <div class="mt-1 flex items-center justify-between text-[8px] font-mono text-console-400">
        <span>最低: {{ tideAnalysis.minAvailableDepth.toFixed(1) }}m</span>
        <span>最高: {{ tideAnalysis.maxAvailableDepth.toFixed(1) }}m</span>
        <span>平均: {{ tideAnalysis.avgAvailableDepth.toFixed(1) }}m</span>
      </div>
    </div>

    <div v-if="tideAnalysis.riskPeriods.length > 0" class="mb-3">
      <div class="flex items-center gap-1.5 mb-2">
        <AlertTriangle class="w-3.5 h-3.5 text-harbor-yellow" />
        <h4 class="font-mono text-[11px] font-semibold text-console-100">
          风险时段 ({{ tideAnalysis.riskPeriods.length }})
        </h4>
      </div>
      <div class="space-y-1.5">
        <div
          v-for="(risk, idx) in tideAnalysis.riskPeriods"
          :key="idx"
          class="p-2 rounded bg-harbor-yellow/10 border border-harbor-yellow/30"
        >
          <div class="flex items-center justify-between mb-1">
            <span class="text-[10px] font-mono text-harbor-yellow font-medium">
              水深不足 {{ risk.deficit.toFixed(1) }}m
            </span>
            <span class="text-[9px] font-mono text-console-400">
              {{ formatDuration(risk.startTime, risk.endTime) }}
            </span>
          </div>
          <div class="text-[9px] font-mono text-console-300">
            {{ formatTime(risk.startTime) }} ~ {{ formatTime(risk.endTime) }}
          </div>
          <div class="text-[9px] font-mono text-console-400 mt-0.5">
            最低 {{ risk.minDepth.toFixed(1) }}m / 需 {{ risk.requiredDepth.toFixed(1) }}m
          </div>
        </div>
      </div>
    </div>

    <div v-if="tideAnalysis.recommendedWindows.length > 0" class="mb-3">
      <div class="flex items-center gap-1.5 mb-2">
        <CheckCircle2 class="w-3.5 h-3.5 text-harbor-green" />
        <h4 class="font-mono text-[11px] font-semibold text-console-100">
          推荐窗口 ({{ tideAnalysis.recommendedWindows.length }})
        </h4>
      </div>
      <div class="space-y-1.5">
        <div
          v-for="(window, idx) in tideAnalysis.recommendedWindows"
          :key="idx"
          class="p-2 rounded bg-harbor-green/10 border border-harbor-green/30"
        >
          <div class="flex items-center justify-between mb-1">
            <span class="inline-flex items-center gap-1 text-[10px] font-mono text-harbor-green font-medium">
              <component :is="getWindowTypeIcon(window.type)" class="w-3 h-3" />
              {{ getWindowTypeLabel(window.type) }}
            </span>
            <span class="text-[9px] font-mono text-console-400">
              最大 {{ window.maxDepth.toFixed(1) }}m
            </span>
          </div>
          <div class="text-[9px] font-mono text-console-300">
            {{ formatTime(window.startTime) }} ~ {{ formatTime(window.endTime) }}
          </div>
          <div class="text-[9px] font-mono text-console-400 mt-0.5">
            持续 {{ formatDuration(window.startTime, window.endTime) }}
          </div>
        </div>
      </div>
    </div>

    <div class="space-y-2">
      <div
        class="p-2.5 rounded border"
        :class="tideAnalysis.berthingRecommendation.canBerth
          ? 'bg-harbor-green/5 border-harbor-green/30'
          : 'bg-harbor-red/5 border-harbor-red/30'"
      >
        <div class="flex items-start gap-2">
          <Anchor
            class="w-3.5 h-3.5 mt-0.5 flex-shrink-0"
            :class="tideAnalysis.berthingRecommendation.canBerth ? 'text-harbor-green' : 'text-harbor-red'"
          />
          <div class="flex-1 min-w-0">
            <p class="text-[10px] font-mono font-medium" :class="tideAnalysis.berthingRecommendation.canBerth ? 'text-harbor-green' : 'text-harbor-red'">
              {{ tideAnalysis.berthingRecommendation.canBerth ? '可靠泊' : '不可靠泊' }}
              <span v-if="tideAnalysis.berthingRecommendation.suggestedTime" class="ml-1">
                (建议 {{ format(tideAnalysis.berthingRecommendation.suggestedTime, 'HH:mm') }})
              </span>
            </p>
            <p class="text-[9px] font-mono text-console-400 mt-0.5 leading-tight">
              {{ tideAnalysis.berthingRecommendation.reason }}
            </p>
          </div>
        </div>
      </div>

      <div
        class="p-2.5 rounded border"
        :class="tideAnalysis.departureRecommendation.canDepart
          ? 'bg-harbor-green/5 border-harbor-green/30'
          : 'bg-harbor-red/5 border-harbor-red/30'"
      >
        <div class="flex items-start gap-2">
          <Navigation
            class="w-3.5 h-3.5 mt-0.5 flex-shrink-0"
            :class="tideAnalysis.departureRecommendation.canDepart ? 'text-harbor-green' : 'text-harbor-red'"
          />
          <div class="flex-1 min-w-0">
            <p class="text-[10px] font-mono font-medium" :class="tideAnalysis.departureRecommendation.canDepart ? 'text-harbor-green' : 'text-harbor-red'">
              {{ tideAnalysis.departureRecommendation.canDepart ? '可离泊' : '不可离泊' }}
              <span v-if="tideAnalysis.departureRecommendation.suggestedTime" class="ml-1">
                (建议 {{ format(tideAnalysis.departureRecommendation.suggestedTime, 'HH:mm') }})
              </span>
            </p>
            <p class="text-[9px] font-mono text-console-400 mt-0.5 leading-tight">
              {{ tideAnalysis.departureRecommendation.reason }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
