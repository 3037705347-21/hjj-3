<script setup lang="ts">
import { ref, computed } from 'vue';
import { useIncidentStore } from '../../stores/incident';
import { useScheduleStore } from '../../stores/schedule';
import {
  INCIDENT_TYPE_LABELS,
  INCIDENT_SEVERITY_LABELS,
} from '../../types';
import type { IncidentType, IncidentSeverity } from '../../types';
import { X, Send, AlertTriangle, MapPin, Ship } from 'lucide-vue-next';

const props = defineProps<{
  visible: boolean;
  prefillType?: IncidentType;
  prefillBerthId?: string;
  prefillShipId?: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'submitted', incidentId: string): void;
}>();

const incidentStore = useIncidentStore();
const scheduleStore = useScheduleStore();

const selectedType = ref<IncidentType>(props.prefillType || 'weather');
const selectedSeverity = ref<IncidentSeverity>('major');
const title = ref('');
const description = ref('');
const occurTime = ref(new Date().toISOString().slice(0, 16));
const expectedRecoveryTime = ref('');
const selectedBerthIds = ref<string[]>(props.prefillBerthId ? [props.prefillBerthId] : []);
const selectedShipIds = ref<string[]>(props.prefillShipId ? [props.prefillShipId] : []);
const submitting = ref(false);

const typeOptions = computed(() =>
  Object.entries(INCIDENT_TYPE_LABELS).map(([key, label]) => ({
    key: key as IncidentType,
    label,
  })),
);

const severityOptions = computed(() =>
  Object.entries(INCIDENT_SEVERITY_LABELS).map(([key, label]) => ({
    key: key as IncidentSeverity,
    label,
  })),
);

const canSubmit = computed(() =>
  title.value.trim().length > 0 &&
  description.value.trim().length > 0 &&
  occurTime.value &&
  (selectedBerthIds.value.length > 0 || selectedShipIds.value.length > 0),
);

function toggleBerth(berthId: string) {
  const idx = selectedBerthIds.value.indexOf(berthId);
  if (idx >= 0) {
    selectedBerthIds.value.splice(idx, 1);
  } else {
    selectedBerthIds.value.push(berthId);
  }
}

function toggleShip(shipId: string) {
  const idx = selectedShipIds.value.indexOf(shipId);
  if (idx >= 0) {
    selectedShipIds.value.splice(idx, 1);
  } else {
    selectedShipIds.value.push(shipId);
  }
}

function handleSubmit() {
  if (!canSubmit.value) return;
  submitting.value = true;

  try {
    const incident = incidentStore.createIncident({
      type: selectedType.value,
      severity: selectedSeverity.value,
      title: title.value.trim(),
      description: description.value.trim(),
      occurTime: new Date(occurTime.value),
      expectedRecoveryTime: expectedRecoveryTime.value
        ? new Date(expectedRecoveryTime.value)
        : undefined,
      affectedBerthIds: selectedBerthIds.value,
      affectedShipIds: selectedShipIds.value,
    });

    emit('submitted', incident.id);
    handleClose();
  } finally {
    submitting.value = false;
  }
}

function handleClose() {
  selectedType.value = props.prefillType || 'weather';
  selectedSeverity.value = 'major';
  title.value = '';
  description.value = '';
  occurTime.value = new Date().toISOString().slice(0, 16);
  expectedRecoveryTime.value = '';
  selectedBerthIds.value = props.prefillBerthId ? [props.prefillBerthId] : [];
  selectedShipIds.value = props.prefillShipId ? [props.prefillShipId] : [];
  emit('close');
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="fixed inset-0 z-50 flex items-center justify-center"
    >
      <div
        class="absolute inset-0 bg-console-900/80 backdrop-blur-sm"
        @click="handleClose"
      />
      <div class="relative w-full max-w-2xl panel-border rounded-xl shadow-2xl z-10 max-h-[90vh] overflow-hidden flex flex-col">
        <div class="flex items-center justify-between px-5 py-4 border-b border-console-500/20">
          <h3 class="font-mono text-sm font-semibold text-console-100 flex items-center gap-2">
            <AlertTriangle class="w-4 h-4 text-harbor-red" />
            事件上报
          </h3>
          <button
            class="w-7 h-7 rounded flex items-center justify-center text-console-400 hover:text-console-100 hover:bg-console-700/50 transition-all"
            @click="handleClose"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <div class="p-5 space-y-4 overflow-y-auto flex-1">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-mono text-console-300 mb-1.5">事件类型</label>
              <select
                v-model="selectedType"
                class="w-full px-3 py-2 rounded bg-console-800/60 border border-console-500/30 text-xs font-mono text-console-100 focus:outline-none focus:border-harbor-cyan/50"
              >
                <option
                  v-for="opt in typeOptions"
                  :key="opt.key"
                  :value="opt.key"
                >
                  {{ opt.label }}
                </option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-mono text-console-300 mb-1.5">严重级别</label>
              <select
                v-model="selectedSeverity"
                class="w-full px-3 py-2 rounded bg-console-800/60 border border-console-500/30 text-xs font-mono text-console-100 focus:outline-none focus:border-harbor-cyan/50"
              >
                <option
                  v-for="opt in severityOptions"
                  :key="opt.key"
                  :value="opt.key"
                >
                  {{ opt.label }}
                </option>
              </select>
            </div>
          </div>

          <div>
            <label class="block text-xs font-mono text-console-300 mb-1.5">事件标题</label>
            <input
              v-model="title"
              type="text"
              placeholder="请输入事件标题"
              class="w-full px-3 py-2 rounded bg-console-800/60 border border-console-500/30 text-xs font-mono text-console-100 placeholder:text-console-500 focus:outline-none focus:border-harbor-cyan/50"
            />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-mono text-console-300 mb-1.5">发生时间</label>
              <input
                v-model="occurTime"
                type="datetime-local"
                class="w-full px-3 py-2 rounded bg-console-800/60 border border-console-500/30 text-xs font-mono text-console-100 focus:outline-none focus:border-harbor-cyan/50"
              />
            </div>

            <div>
              <label class="block text-xs font-mono text-console-300 mb-1.5">预计恢复时间</label>
              <input
                v-model="expectedRecoveryTime"
                type="datetime-local"
                class="w-full px-3 py-2 rounded bg-console-800/60 border border-console-500/30 text-xs font-mono text-console-100 focus:outline-none focus:border-harbor-cyan/50"
              />
            </div>
          </div>

          <div>
            <label class="block text-xs font-mono text-console-300 mb-1.5">事件描述</label>
            <textarea
              v-model="description"
              rows="3"
              placeholder="请详细描述事件情况..."
              class="w-full px-3 py-2 rounded bg-console-800/60 border border-console-500/30 text-xs font-mono text-console-100 placeholder:text-console-500 focus:outline-none focus:border-harbor-cyan/50 resize-none"
            />
          </div>

          <div>
            <label class="block text-xs font-mono text-console-300 mb-2 flex items-center gap-1.5">
              <MapPin class="w-3.5 h-3.5" />
              影响泊位
            </label>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="berth in scheduleStore.sortedBerths"
                :key="berth.id"
                @click="toggleBerth(berth.id)"
                :class="[
                  'px-3 py-1.5 rounded text-xs font-mono border transition-all',
                  selectedBerthIds.includes(berth.id)
                    ? 'bg-harbor-cyan/20 text-harbor-cyan border-harbor-cyan/40'
                    : 'bg-console-800/60 text-console-300 border-console-500/30 hover:border-console-400/50',
                ]"
              >
                {{ berth.name }}
              </button>
            </div>
          </div>

          <div>
            <label class="block text-xs font-mono text-console-300 mb-2 flex items-center gap-1.5">
              <Ship class="w-3.5 h-3.5" />
              影响船舶
            </label>
            <div class="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
              <button
                v-for="ship in scheduleStore.ships"
                :key="ship.id"
                @click="toggleShip(ship.id)"
                :class="[
                  'px-3 py-1.5 rounded text-xs font-mono border transition-all',
                  selectedShipIds.includes(ship.id)
                    ? 'bg-harbor-orange/20 text-harbor-orange border-harbor-orange/40'
                    : 'bg-console-800/60 text-console-300 border-console-500/30 hover:border-console-400/50',
                ]"
              >
                {{ ship.name }}
              </button>
            </div>
          </div>

          <div
            v-if="selectedBerthIds.length > 0 || selectedShipIds.length > 0"
            class="p-3 rounded bg-harbor-yellow/10 border border-harbor-yellow/30"
          >
            <div class="flex items-start gap-2">
              <AlertTriangle class="w-4 h-4 text-harbor-yellow shrink-0 mt-0.5" />
              <span class="text-xs font-mono text-harbor-yellow">
                系统将自动分析受影响的调度计划，并在事件创建后打上异常标记
              </span>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-end gap-3 px-5 py-4 border-t border-console-500/20">
          <button
            class="px-4 py-1.5 rounded text-xs font-mono font-medium text-console-300 border border-console-500/30 hover:bg-console-700/50 hover:text-console-100 transition-all"
            @click="handleClose"
          >
            取消
          </button>
          <button
            :disabled="!canSubmit || submitting"
            class="px-4 py-1.5 rounded text-xs font-mono font-medium bg-harbor-red/20 text-harbor-red border border-harbor-red/30 hover:bg-harbor-red/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
            @click="handleSubmit"
          >
            <Send class="w-3 h-3" />
            提交上报
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
