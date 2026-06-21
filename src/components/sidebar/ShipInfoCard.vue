<script setup lang="ts">
import type { Ship, ShipTag, ForbiddenBerthCategory } from '../../types';
import PriorityBadge from '../common/PriorityBadge.vue';
import CargoTypeIcon from '../common/CargoTypeIcon.vue';
import ShipTagBadge from '../common/ShipTagBadge.vue';
import { useScheduleStore } from '../../stores/schedule';
import { useAuthStore } from '../../stores/auth';
import { ref, computed, watch } from 'vue';
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
  Ban,
  FileText,
  Zap,
  Pencil,
  X,
  Check,
  RotateCcw,
} from 'lucide-vue-next';
import {
  SHIP_TAG_LABELS,
  SHIP_TAG_COLORS,
  FORBIDDEN_BERTH_CATEGORY_LABELS,
} from '../../types';

const props = defineProps<{
  ship: Ship;
}>();

const store = useScheduleStore();
const authStore = useAuthStore();

const isEditing = ref(false);

const availableTags: ShipTag[] = [
  'key_customer',
  'dangerous_operation',
  'super_draft',
  'night_restricted',
  'berthing_sensitive',
];

const availableBerthCategories: ForbiddenBerthCategory[] = [
  'container',
  'bulk',
  'liquid',
  'general',
  'ro-ro',
];

const editTags = ref<ShipTag[]>([]);
const editEarliestTime = ref<string>('');
const editPriority = ref(false);
const editForbiddenCategories = ref<ForbiddenBerthCategory[]>([]);
const editRequiresRemarks = ref(false);

function initEditState() {
  editTags.value = props.ship.tags ? [...props.ship.tags] : [];
  editEarliestTime.value = props.ship.guaranteeRequirements?.earliestOperationTime || '';
  editPriority.value = props.ship.guaranteeRequirements?.mustPriorityBerth || false;
  editForbiddenCategories.value = props.ship.guaranteeRequirements?.forbiddenBerthCategories
    ? [...props.ship.guaranteeRequirements.forbiddenBerthCategories]
    : [];
  editRequiresRemarks.value = props.ship.guaranteeRequirements?.requiresRemarks || false;
}

watch(
  () => props.ship.id,
  () => {
    isEditing.value = false;
    initEditState();
  },
  { immediate: true },
);

function startEditing() {
  initEditState();
  isEditing.value = true;
}

function cancelEditing() {
  initEditState();
  isEditing.value = false;
}

function saveEditing() {
  store.updateShipTags(props.ship.id, editTags.value);
  store.updateShipGuaranteeRequirements(props.ship.id, {
    earliestOperationTime: editEarliestTime.value || undefined,
    mustPriorityBerth: editPriority.value,
    forbiddenBerthCategories: editForbiddenCategories.value.length > 0 ? editForbiddenCategories.value : undefined,
    requiresRemarks: editRequiresRemarks.value,
  });
  isEditing.value = false;
}

function toggleTag(tag: ShipTag) {
  const idx = editTags.value.indexOf(tag);
  if (idx > -1) {
    editTags.value.splice(idx, 1);
  } else {
    editTags.value.push(tag);
  }
}

function toggleBerthCategory(cat: ForbiddenBerthCategory) {
  const idx = editForbiddenCategories.value.indexOf(cat);
  if (idx > -1) {
    editForbiddenCategories.value.splice(idx, 1);
  } else {
    editForbiddenCategories.value.push(cat);
  }
}

const hasAnyGuaranteeDisplay = computed(() => {
  if (isEditing.value) return true;
  const g = props.ship.guaranteeRequirements;
  if (!g) return false;
  return (
    !!g.earliestOperationTime ||
    !!g.mustPriorityBerth ||
    (!!g.forbiddenBerthCategories && g.forbiddenBerthCategories.length > 0) ||
    !!g.requiresRemarks
  );
});
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
      <div v-if="authStore.canChangeStatus" class="flex items-center gap-1">
        <template v-if="!isEditing">
          <button
            @click="startEditing"
            class="flex items-center gap-1 px-2 py-1 text-[10px] font-mono text-console-300 border border-console-500/40 rounded hover:text-harbor-cyan hover:border-harbor-cyan/50 transition-all"
            title="编辑标签与保障要求"
          >
            <Pencil class="w-3 h-3" />
            编辑
          </button>
        </template>
        <template v-else>
          <button
            @click="saveEditing"
            class="flex items-center gap-1 px-2 py-1 text-[10px] font-mono text-console-900 bg-harbor-green/90 border border-harbor-green/60 rounded hover:bg-harbor-green transition-all"
            title="保存修改"
          >
            <Check class="w-3 h-3" />
            保存
          </button>
          <button
            @click="cancelEditing"
            class="flex items-center gap-1 px-2 py-1 text-[10px] font-mono text-console-300 border border-console-500/40 rounded hover:text-harbor-red hover:border-harbor-red/50 transition-all"
            title="取消编辑"
          >
            <X class="w-3 h-3" />
            取消
          </button>
        </template>
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

    <div class="mt-4 pt-4 border-t border-console-600/30">
      <div class="flex items-center gap-2 mb-3">
        <Tag class="w-3.5 h-3.5 text-harbor-cyan" />
        <p class="text-[9px] font-mono text-console-400 uppercase tracking-wider">船舶标签</p>
        <span v-if="isEditing" class="ml-auto text-[9px] font-mono text-harbor-cyan flex items-center gap-1">
          <Pencil class="w-2.5 h-2.5" />
          编辑模式
        </span>
      </div>

      <div v-if="!isEditing">
        <div v-if="ship.tags && ship.tags.length > 0" class="flex flex-wrap gap-1.5">
          <ShipTagBadge
            v-for="tag in ship.tags"
            :key="tag"
            :tag="tag"
            size="sm"
          />
        </div>
        <p v-else class="text-[11px] font-mono text-console-500 italic">
          暂未设置标签
        </p>
      </div>

      <div v-else class="grid grid-cols-2 gap-1.5">
        <button
          v-for="tag in availableTags"
          :key="tag"
          @click="toggleTag(tag)"
          :class="[
            'flex items-center gap-1.5 px-2 py-1.5 rounded border text-[10px] font-mono transition-all',
            editTags.includes(tag)
              ? `${SHIP_TAG_COLORS[tag].bg} ${SHIP_TAG_COLORS[tag].text} ${SHIP_TAG_COLORS[tag].border}`
              : 'bg-console-800/40 text-console-400 border-console-500/30 hover:border-console-400/50 hover:text-console-200',
          ]"
        >
          <span
            class="w-1.5 h-1.5 rounded-full"
            :class="editTags.includes(tag) ? SHIP_TAG_COLORS[tag].text.replace('text-', 'bg-') : 'bg-console-500'"
          />
          {{ SHIP_TAG_LABELS[tag] }}
          <span v-if="editTags.includes(tag)" class="ml-auto">
            <Check class="w-2.5 h-2.5" />
          </span>
        </button>
      </div>
    </div>

    <div
      class="mt-4 pt-4 border-t border-console-600/30"
    >
      <div class="flex items-center gap-2 mb-3">
        <Shield class="w-3.5 h-3.5 text-harbor-orange" />
        <p class="text-[9px] font-mono text-console-400 uppercase tracking-wider">保障要求</p>
        <span v-if="isEditing" class="ml-auto text-[9px] font-mono text-harbor-cyan flex items-center gap-1">
          <Pencil class="w-2.5 h-2.5" />
          编辑模式
        </span>
      </div>

      <div v-if="!isEditing" class="space-y-2">
        <div
          v-if="hasAnyGuaranteeDisplay"
        >
          <div
            v-if="ship.guaranteeRequirements?.earliestOperationTime"
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
            v-if="ship.guaranteeRequirements?.mustPriorityBerth"
            class="flex items-start gap-2 p-2 rounded bg-console-800/60 border border-console-600/30 mt-2"
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
            v-if="ship.guaranteeRequirements?.forbiddenBerthCategories && ship.guaranteeRequirements.forbiddenBerthCategories.length > 0"
            class="flex items-start gap-2 p-2 rounded bg-console-800/60 border border-console-600/30 mt-2"
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
            v-if="ship.guaranteeRequirements?.requiresRemarks"
            class="flex items-start gap-2 p-2 rounded bg-console-800/60 border border-console-600/30 mt-2"
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
        <p v-else class="text-[11px] font-mono text-console-500 italic">
          暂未设置保障要求
        </p>
      </div>

      <div v-else class="space-y-3">
        <div class="p-2 rounded bg-console-800/60 border border-console-600/30">
          <div class="flex items-center gap-2 mb-1.5">
            <Clock class="w-3 h-3 text-harbor-cyan" />
            <label class="text-[10px] font-mono text-console-300 uppercase tracking-wider">
              最早可作业时间
            </label>
            <span class="ml-auto text-[9px] font-mono text-console-500">可选</span>
          </div>
          <div class="flex items-center gap-2">
            <input
              v-model="editEarliestTime"
              type="time"
              placeholder="HH:mm"
              class="flex-1 px-2 py-1 text-xs font-mono bg-console-900/80 border border-console-500/40 rounded text-console-100 focus:outline-none focus:border-harbor-cyan/50"
            />
            <button
              v-if="editEarliestTime"
              @click="editEarliestTime = ''"
              class="px-1.5 py-1 text-[9px] font-mono text-console-400 hover:text-harbor-red transition-colors"
              title="清除"
            >
              <X class="w-3 h-3" />
            </button>
          </div>
          <p v-if="editEarliestTime" class="text-[9px] font-mono text-harbor-cyan mt-1.5">
            生效后：{{ editEarliestTime }} 之前禁止安排靠泊/作业
          </p>
        </div>

        <div class="p-2 rounded bg-console-800/60 border border-console-600/30">
          <div class="flex items-center gap-2">
            <Zap class="w-3 h-3 text-harbor-orange" />
            <label class="text-[10px] font-mono text-console-300 uppercase tracking-wider">
              必须优先靠泊
            </label>
            <button
              @click="editPriority = !editPriority"
              :class="[
                'ml-auto w-10 h-5 rounded-full border transition-all relative',
                editPriority
                  ? 'bg-harbor-orange/30 border-harbor-orange/60'
                  : 'bg-console-700/60 border-console-500/40',
              ]"
            >
              <span
                :class="[
                  'absolute top-0.5 w-3.5 h-3.5 rounded-full transition-all',
                  editPriority
                    ? 'right-0.5 bg-harbor-orange shadow-glow-orange'
                    : 'left-0.5 bg-console-400',
                ]"
              />
            </button>
          </div>
          <p class="text-[9px] font-mono text-console-500 mt-1.5">
            开启后：该船在同泊位排序中不得排在普通船舶之后
          </p>
        </div>

        <div class="p-2 rounded bg-console-800/60 border border-console-600/30">
          <div class="flex items-center gap-2 mb-2">
            <Ban class="w-3 h-3 text-harbor-red" />
            <label class="text-[10px] font-mono text-console-300 uppercase tracking-wider">
              禁止分配泊位类型
            </label>
            <button
              v-if="editForbiddenCategories.length > 0"
              @click="editForbiddenCategories = []"
              class="ml-auto text-[9px] font-mono text-console-500 hover:text-harbor-red transition-colors flex items-center gap-0.5"
            >
              <RotateCcw class="w-2.5 h-2.5" />
              清空
            </button>
          </div>
          <div class="grid grid-cols-2 gap-1.5">
            <button
              v-for="cat in availableBerthCategories"
              :key="cat"
              @click="toggleBerthCategory(cat)"
              :class="[
                'flex items-center gap-1 px-2 py-1.5 rounded border text-[10px] font-mono transition-all',
                editForbiddenCategories.includes(cat)
                  ? 'bg-harbor-red/15 text-harbor-red border-harbor-red/40'
                  : 'bg-console-900/40 text-console-400 border-console-500/30 hover:border-console-400/50 hover:text-console-200',
              ]"
            >
              {{ FORBIDDEN_BERTH_CATEGORY_LABELS[cat] }}
              <span v-if="editForbiddenCategories.includes(cat)" class="ml-auto">
                <Check class="w-2.5 h-2.5" />
              </span>
            </button>
          </div>
          <p v-if="editForbiddenCategories.length > 0" class="text-[9px] font-mono text-harbor-red mt-1.5">
            当前禁止：{{ editForbiddenCategories.map((c) => FORBIDDEN_BERTH_CATEGORY_LABELS[c]).join('、') }}
          </p>
        </div>

        <div class="p-2 rounded bg-console-800/60 border border-console-600/30">
          <div class="flex items-center gap-2">
            <FileText class="w-3 h-3 text-harbor-blue" />
            <label class="text-[10px] font-mono text-console-300 uppercase tracking-wider">
              必须填写备注
            </label>
            <button
              @click="editRequiresRemarks = !editRequiresRemarks"
              :class="[
                'ml-auto w-10 h-5 rounded-full border transition-all relative',
                editRequiresRemarks
                  ? 'bg-harbor-blue/30 border-harbor-blue/60'
                  : 'bg-console-700/60 border-console-500/40',
              ]"
            >
              <span
                :class="[
                  'absolute top-0.5 w-3.5 h-3.5 rounded-full transition-all',
                  editRequiresRemarks
                    ? 'right-0.5 bg-harbor-blue shadow-glow-cyan'
                    : 'left-0.5 bg-console-400',
                ]"
              />
            </button>
          </div>
          <p class="text-[9px] font-mono text-console-500 mt-1.5">
            开启后：创建或保存调度计划时必须填写备注信息
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
