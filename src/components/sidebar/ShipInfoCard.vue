<script setup lang="ts">
import type { Ship } from '../../types';
import PriorityBadge from '../common/PriorityBadge.vue';
import CargoTypeIcon from '../common/CargoTypeIcon.vue';
import ShipTagBadge from '../common/ShipTagBadge.vue';
import {
  Ship as ShipIcon,
  Ruler,
  Waves,
  Hash,
  Flag,
  Calendar,
  Gauge,
  Tag,
  Shield,
  Clock,
  AlertTriangle,
  Ban,
  FileText,
  Zap,
} from 'lucide-vue-next';
import { FORBIDDEN_BERTH_CATEGORY_LABELS } from '../../types';

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

    <div v-if="ship.tags && ship.tags.length > 0" class="mt-4 pt-4 border-t border-console-600/30">
      <div class="flex items-center gap-2 mb-3">
        <Tag class="w-3.5 h-3.5 text-harbor-cyan" />
        <p class="text-[9px] font-mono text-console-400 uppercase tracking-wider">船舶标签</p>
      </div>
      <div class="flex flex-wrap gap-1.5">
        <ShipTagBadge
          v-for="tag in ship.tags"
          :key="tag"
          :tag="tag"
          size="sm"
        />
      </div>
    </div>

    <div
      v-if="ship.guaranteeRequirements && (ship.guaranteeRequirements.earliestOperationTime || ship.guaranteeRequirements.mustPriorityBerth || (ship.guaranteeRequirements.forbiddenBerthCategories && ship.guaranteeRequirements.forbiddenBerthCategories.length > 0) || ship.guaranteeRequirements.requiresRemarks)"
      class="mt-4 pt-4 border-t border-console-600/30"
    >
      <div class="flex items-center gap-2 mb-3">
        <Shield class="w-3.5 h-3.5 text-harbor-orange" />
        <p class="text-[9px] font-mono text-console-400 uppercase tracking-wider">保障要求</p>
      </div>
      <div class="space-y-2">
        <div
          v-if="ship.guaranteeRequirements.earliestOperationTime"
          class="flex items-start gap-2 p-2 rounded bg-console-800/60 border border-console-600/30"
        >
          <Clock class="w-3.5 h-3.5 text-harbor-cyan mt-0.5 flex-shrink-0" />
          <div>
            <p class="text-[9px] font-mono text-console-400 uppercase tracking-wider">最早可作业时间</p>
            <p class="text-xs font-mono text-console-100">
              <span class="text-harbor-cyan font-semibold">{{ ship.guaranteeRequirements.earliestOperationTime }}</span> 之后方可开始作业
            </p>
          </div>
        </div>
        <div
          v-if="ship.guaranteeRequirements.mustPriorityBerth"
          class="flex items-start gap-2 p-2 rounded bg-console-800/60 border border-console-600/30"
        >
          <Zap class="w-3.5 h-3.5 text-harbor-orange mt-0.5 flex-shrink-0" />
          <div>
            <p class="text-[9px] font-mono text-console-400 uppercase tracking-wider">靠泊要求</p>
            <p class="text-xs font-mono text-console-100">
              <span class="text-harbor-orange font-semibold">必须优先靠泊</span>，不得安排在普通船舶之后
            </p>
          </div>
        </div>
        <div
          v-if="ship.guaranteeRequirements.forbiddenBerthCategories && ship.guaranteeRequirements.forbiddenBerthCategories.length > 0"
          class="flex items-start gap-2 p-2 rounded bg-console-800/60 border border-console-600/30"
        >
          <Ban class="w-3.5 h-3.5 text-harbor-red mt-0.5 flex-shrink-0" />
          <div>
            <p class="text-[9px] font-mono text-console-400 uppercase tracking-wider">禁止泊位类型</p>
            <div class="flex flex-wrap gap-1 mt-0.5">
              <span
                v-for="cat in ship.guaranteeRequirements.forbiddenBerthCategories"
                :key="cat"
                class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-harbor-red/15 text-harbor-red border border-harbor-red/40"
              >
                {{ FORBIDDEN_BERTH_CATEGORY_LABELS[cat] }}
              </span>
            </div>
          </div>
        </div>
        <div
          v-if="ship.guaranteeRequirements.requiresRemarks"
          class="flex items-start gap-2 p-2 rounded bg-console-800/60 border border-console-600/30"
        >
          <FileText class="w-3.5 h-3.5 text-harbor-blue mt-0.5 flex-shrink-0" />
          <div>
            <p class="text-[9px] font-mono text-console-400 uppercase tracking-wider">备注要求</p>
            <p class="text-xs font-mono text-console-100">
              <span class="text-harbor-blue font-semibold">必须填写备注</span>，记录作业特殊说明
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
