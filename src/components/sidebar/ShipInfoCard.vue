<script setup lang="ts">
import type { Ship } from '../../types';
import PriorityBadge from '../common/PriorityBadge.vue';
import CargoTypeIcon from '../common/CargoTypeIcon.vue';
import { Ship as ShipIcon, Ruler, Waves, Hash, Flag, Calendar, Gauge } from 'lucide-vue-next';

defineProps<{
  ship: Ship;
}>();
</script>

<template>
  <div class="panel-border rounded-lg p-4">
    <div class="flex items-start justify-between mb-4">
      <div class="flex items-center gap-3">
        <div class="w-12 h-12 rounded-lg bg-console-700/70 border border-console-500/50 flex items-center justify-center shadow-glow-blue">
          <ShipIcon class="w-6 h-6 text-harbor-cyan" />
        </div>
        <div>
          <h3 class="font-mono text-lg font-bold text-console-100 glow-text-cyan">
            {{ ship.name }}
          </h3>
          <div class="flex items-center gap-2 mt-1">
            <PriorityBadge :priority="ship.priority" size="sm" />
            <CargoTypeIcon :type="ship.cargoType" show-label />
          </div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div class="space-y-3">
        <div class="flex items-center gap-2 p-2 rounded bg-console-800/60 border border-console-600/30">
          <Hash class="w-3.5 h-3.5 text-console-400" />
          <div>
            <p class="text-[9px] font-mono text-console-400 uppercase tracking-wider">IMO编号</p>
            <p class="text-xs font-mono text-console-100">{{ ship.imo }}</p>
          </div>
        </div>
        <div class="flex items-center gap-2 p-2 rounded bg-console-800/60 border border-console-600/30">
          <Flag class="w-3.5 h-3.5 text-console-400" />
          <div>
            <p class="text-[9px] font-mono text-console-400 uppercase tracking-wider">船旗国</p>
            <p class="text-xs font-mono text-console-100">{{ ship.flag || '未知' }}</p>
          </div>
        </div>
        <div class="flex items-center gap-2 p-2 rounded bg-console-800/60 border border-console-600/30">
          <Calendar class="w-3.5 h-3.5 text-console-400" />
          <div>
            <p class="text-[9px] font-mono text-console-400 uppercase tracking-wider">建造年份</p>
            <p class="text-xs font-mono text-console-100">{{ ship.buildYear || '-' }}</p>
          </div>
        </div>
      </div>

      <div class="space-y-3">
        <div class="flex items-center gap-2 p-2 rounded bg-console-800/60 border border-console-600/30">
          <Ruler class="w-3.5 h-3.5 text-console-400" />
          <div>
            <p class="text-[9px] font-mono text-console-400 uppercase tracking-wider">尺寸 (长×宽)</p>
            <p class="text-xs font-mono text-console-100">{{ ship.length }}m × {{ ship.width }}m</p>
          </div>
        </div>
        <div class="flex items-center gap-2 p-2 rounded bg-console-800/60 border border-console-600/30">
          <Waves class="w-3.5 h-3.5 text-harbor-cyan" />
          <div>
            <p class="text-[9px] font-mono text-console-400 uppercase tracking-wider">吃水 / 最大吃水</p>
            <p class="text-xs font-mono text-console-100">
              <span class="text-harbor-cyan">{{ ship.draft }}m</span>
              <span class="text-console-400"> / {{ ship.maxDraft }}m</span>
            </p>
            <div class="mt-1 w-full h-1 bg-console-600 rounded-full overflow-hidden">
              <div
                class="h-full rounded-full transition-all"
                :class="ship.draft / ship.maxDraft > 0.9 ? 'bg-harbor-red' : 'bg-harbor-cyan'"
                :style="{ width: `${(ship.draft / ship.maxDraft) * 100}%` }"
              />
            </div>
          </div>
        </div>
        <div class="flex items-center gap-2 p-2 rounded bg-console-800/60 border border-console-600/30">
          <Gauge class="w-3.5 h-3.5 text-console-400" />
          <div>
            <p class="text-[9px] font-mono text-console-400 uppercase tracking-wider">载货量</p>
            <p class="text-xs font-mono text-console-100">{{ ship.cargoWeight.toLocaleString() }} 吨</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
