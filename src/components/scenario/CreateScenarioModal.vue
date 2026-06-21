<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useScenarioStore } from '../../stores/scenario';
import { useScheduleStore } from '../../stores/schedule';
import {
  X,
  Play,
  Ship,
  Anchor,
  FileText,
  Copy,
} from 'lucide-vue-next';

const props = defineProps<{
  visible: boolean;
  sourceScenarioId?: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'created', scenarioId: string): void;
}>();

const scenarioStore = useScenarioStore();
const scheduleStore = useScheduleStore();

const name = ref('');
const description = ref('');
const selectedShipIds = ref<string[]>([]);
const selectedBerthIds = ref<string[]>([]);
const submitting = ref(false);
const selectAllShips = ref(true);
const selectAllBerths = ref(true);

watch(
  () => props.visible,
  (val) => {
    if (val) {
      name.value = '';
      description.value = '';
      selectedShipIds.value = [];
      selectedBerthIds.value = [];
      selectAllShips.value = true;
      selectAllBerths.value = true;
    }
  },
);

const canSubmit = computed(() => name.value.trim().length > 0);

const shipOptions = computed(() =>
  scheduleStore.ships.map((s) => ({
    id: s.id,
    name: s.name,
  })),
);

const berthOptions = computed(() =>
  scheduleStore.sortedBerths.map((b) => ({
    id: b.id,
    name: b.name,
  })),
);

function toggleShip(shipId: string) {
  const idx = selectedShipIds.value.indexOf(shipId);
  if (idx >= 0) {
    selectedShipIds.value.splice(idx, 1);
  } else {
    selectedShipIds.value.push(shipId);
  }
  selectAllShips.value = selectedShipIds.value.length === shipOptions.value.length;
}

function toggleBerth(berthId: string) {
  const idx = selectedBerthIds.value.indexOf(berthId);
  if (idx >= 0) {
    selectedBerthIds.value.splice(idx, 1);
  } else {
    selectedBerthIds.value.push(berthId);
  }
  selectAllBerths.value = selectedBerthIds.value.length === berthOptions.value.length;
}

function toggleAllShips() {
  selectAllShips.value = !selectAllShips.value;
  if (selectAllShips.value) {
    selectedShipIds.value = shipOptions.value.map((s) => s.id);
  } else {
    selectedShipIds.value = [];
  }
}

function toggleAllBerths() {
  selectAllBerths.value = !selectAllBerths.value;
  if (selectAllBerths.value) {
    selectedBerthIds.value = berthOptions.value.map((b) => b.id);
  } else {
    selectedBerthIds.value = [];
  }
}

function handleSubmit() {
  if (!canSubmit.value) return;
  submitting.value = true;

  try {
    const involvedShipIds = selectAllShips.value ? [] : selectedShipIds.value;
    const involvedBerthIds = selectAllBerths.value ? [] : selectedBerthIds.value;

    const scenario = scenarioStore.createScenario({
      name: name.value.trim(),
      description: description.value.trim() || undefined,
      involvedShipIds,
      involvedBerthIds,
      sourceScenarioId: props.sourceScenarioId,
    });

    emit('created', scenario.id);
    emit('close');
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div
        class="absolute inset-0 bg-black/60 backdrop-blur-sm"
        @click="emit('close')"
      />
      <div class="relative w-full max-w-2xl bg-console-800 rounded-xl border border-console-500/40 shadow-2xl overflow-hidden">
        <div class="flex items-center justify-between px-5 py-4 border-b border-console-500/30">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-lg bg-gradient-to-br from-harbor-purple to-harbor-blue flex items-center justify-center">
              <Play class="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 class="text-base font-semibold text-console-100">新建推演场景</h2>
              <p class="text-xs text-console-400">创建一个独立的调度推演环境</p>
            </div>
          </div>
          <button
            @click="emit('close')"
            class="p-1.5 text-console-400 hover:text-console-100 hover:bg-console-700 rounded-md transition-colors"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
          <div>
            <label class="block text-sm font-medium text-console-200 mb-1.5">
              推演名称 <span class="text-harbor-red">*</span>
            </label>
            <input
              v-model="name"
              type="text"
              placeholder="请输入推演场景名称"
              class="w-full h-9 px-3 bg-console-900/80 border border-console-500/40 rounded-lg text-sm text-console-100 placeholder-console-400 focus:outline-none focus:border-harbor-cyan/50 focus:ring-1 focus:ring-harbor-cyan/30"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-console-200 mb-1.5">
              <span class="flex items-center gap-1.5">
                <FileText class="w-4 h-4 text-console-400" />
                推演说明
              </span>
            </label>
            <textarea
              v-model="description"
              rows="2"
              placeholder="可选：填写推演目的、预期调整等说明"
              class="w-full px-3 py-2 bg-console-900/80 border border-console-500/40 rounded-lg text-sm text-console-100 placeholder-console-400 focus:outline-none focus:border-harbor-cyan/50 focus:ring-1 focus:ring-harbor-cyan/30 resize-none"
            />
          </div>

          <div v-if="sourceScenarioId" class="px-3 py-2 bg-harbor-purple/10 border border-harbor-purple/30 rounded-lg">
            <div class="flex items-center gap-2 text-sm text-harbor-purple">
              <Copy class="w-4 h-4" />
              <span>将基于现有推演场景复制创建</span>
            </div>
          </div>

          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="text-sm font-medium text-console-200">
                <span class="flex items-center gap-1.5">
                  <Ship class="w-4 h-4 text-console-400" />
                  涉及船舶
                </span>
              </label>
              <label class="flex items-center gap-1.5 text-sm text-console-300 cursor-pointer">
                <input
                  type="checkbox"
                  :checked="selectAllShips"
                  @change="toggleAllShips"
                  class="w-3.5 h-3.5 rounded border-console-500 text-harbor-cyan focus:ring-harbor-cyan/50 bg-console-900"
                />
                全选
              </label>
            </div>
            <div class="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-2 bg-console-900/50 border border-console-500/30 rounded-lg">
              <label
                v-for="ship in shipOptions"
                :key="ship.id"
                class="flex items-center gap-2 p-2 rounded-md hover:bg-console-700/50 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  :checked="selectAllShips || selectedShipIds.includes(ship.id)"
                  @change="toggleShip(ship.id)"
                  class="w-3.5 h-3.5 rounded border-console-500 text-harbor-cyan focus:ring-harbor-cyan/50 bg-console-900"
                />
                <span class="text-sm text-console-200">{{ ship.name }}</span>
              </label>
            </div>
          </div>

          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="text-sm font-medium text-console-200">
                <span class="flex items-center gap-1.5">
                  <Anchor class="w-4 h-4 text-console-400" />
                  涉及泊位
                </span>
              </label>
              <label class="flex items-center gap-1.5 text-sm text-console-300 cursor-pointer">
                <input
                  type="checkbox"
                  :checked="selectAllBerths"
                  @change="toggleAllBerths"
                  class="w-3.5 h-3.5 rounded border-console-500 text-harbor-cyan focus:ring-harbor-cyan/50 bg-console-900"
                />
                全选
              </label>
            </div>
            <div class="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-2 bg-console-900/50 border border-console-500/30 rounded-lg">
              <label
                v-for="berth in berthOptions"
                :key="berth.id"
                class="flex items-center gap-2 p-2 rounded-md hover:bg-console-700/50 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  :checked="selectAllBerths || selectedBerthIds.includes(berth.id)"
                  @change="toggleBerth(berth.id)"
                  class="w-3.5 h-3.5 rounded border-console-500 text-harbor-cyan focus:ring-harbor-cyan/50 bg-console-900"
                />
                <span class="text-sm text-console-200">{{ berth.name }}</span>
              </label>
            </div>
          </div>

          <div class="px-3 py-2.5 bg-console-900/50 border border-console-500/30 rounded-lg">
            <div class="text-xs text-console-400">
              <p class="mb-1">💡 推演场景说明：</p>
              <ul class="space-y-0.5 list-disc list-inside">
                <li>系统将复制当前正式计划的所有数据作为推演基准</li>
                <li>在推演环境中进行的所有调整不会影响正式计划</li>
                <li>确认方案后可一键应用到正式计划并生成操作日志</li>
              </ul>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-end gap-3 px-5 py-4 border-t border-console-500/30 bg-console-900/30">
          <button
            @click="emit('close')"
            class="h-9 px-4 text-sm text-console-300 hover:text-console-100 bg-console-700/50 hover:bg-console-700 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            @click="handleSubmit"
            :disabled="!canSubmit || submitting"
            :class="[
              'h-9 px-5 text-sm font-medium rounded-lg transition-colors flex items-center gap-2',
              canSubmit && !submitting
                ? 'bg-gradient-to-r from-harbor-purple to-harbor-blue text-white hover:shadow-glow-cyan'
                : 'bg-console-600 text-console-400 cursor-not-allowed',
            ]"
          >
            <Play class="w-4 h-4" />
            {{ submitting ? '创建中...' : '创建推演' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
