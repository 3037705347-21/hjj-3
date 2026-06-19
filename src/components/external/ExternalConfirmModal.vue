<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useExternalScheduleStore } from '../../stores/externalSchedule';
import { useScheduleStore } from '../../stores/schedule';
import { type ExternalVesselSchedule, type Ship, EXTERNAL_DATA_SOURCE_LABELS } from '../../types';
import ExternalSyncStatusBadge from './ExternalSyncStatusBadge.vue';
import {
  X,
  Check,
  Ship as ShipIcon,
  Clock,
  Database,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Search,
  ArrowRight,
} from 'lucide-vue-next';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface Props {
  visible: boolean;
  externalId?: string;
  mode?: 'confirm' | 'match' | 'resolve';
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'confirm',
});

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'confirmed', externalId: string): void;
}>();

const externalStore = useExternalScheduleStore();
const scheduleStore = useScheduleStore();

const shipSearchQuery = ref('');
const selectedShipId = ref<string | null>(null);
const remark = ref('');

const external = computed<ExternalVesselSchedule | null>(() => {
  if (!props.externalId) return null;
  return externalStore.getExternalById(props.externalId) || null;
});

const matchedShip = computed<Ship | null>(() => {
  if (!external.value?.matchedShipId) return null;
  return scheduleStore.getShipById(external.value.matchedShipId) || null;
});

const searchResults = computed(() => {
  if (!shipSearchQuery.value.trim()) return [];
  const query = shipSearchQuery.value.toLowerCase();
  return scheduleStore.ships.filter(
    (s) =>
      s.name.toLowerCase().includes(query) ||
      s.imo.toLowerCase().includes(query) ||
      s.callSign.toLowerCase().includes(query),
  );
});

const internalSchedule = computed(() => {
  if (!external.value?.matchedShipId) return null;
  return scheduleStore.schedules.find((s) => s.shipId === external.value!.matchedShipId) || null;
});

const hasTimeConflict = computed(() => {
  if (!external.value?.eta || !internalSchedule.value?.eta) return false;
  const diff = Math.abs(
    new Date(external.value.eta).getTime() - new Date(internalSchedule.value.eta).getTime(),
  );
  return diff > 3600000;
});

function formatDateTime(date?: Date | string): string {
  if (!date) return '-';
  return format(new Date(date), 'yyyy-MM-dd HH:mm', { locale: zhCN });
}

function formatDate(date?: Date | string): string {
  if (!date) return '-';
  return format(new Date(date), 'MM-dd HH:mm', { locale: zhCN });
}

function selectShip(ship: Ship) {
  selectedShipId.value = ship.id;
  shipSearchQuery.value = ship.name;
}

function handleConfirm() {
  if (!props.externalId) return;

  if (props.mode === 'match' && selectedShipId.value) {
    externalStore.matchExternalSchedule(props.externalId, selectedShipId.value);
    emit('confirmed', props.externalId);
  } else if (props.mode === 'confirm' || props.mode === 'resolve') {
    externalStore.confirmAndSync(props.externalId);
    emit('confirmed', props.externalId);
  }

  emit('close');
}

function handleIgnore() {
  if (!props.externalId) return;
  externalStore.ignoreExternalSchedule(props.externalId);
  emit('close');
}

watch(
  () => props.visible,
  (val) => {
    if (val) {
      shipSearchQuery.value = '';
      selectedShipId.value = external.value?.matchedShipId || null;
      remark.value = '';
    }
  },
);
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-console-900/80 backdrop-blur-sm" @click="$emit('close')" />
      <div class="relative w-full max-w-2xl panel-border rounded-xl shadow-2xl z-10 max-h-[90vh] flex flex-col">
        <div class="flex items-center justify-between px-5 py-4 border-b border-console-500/20 shrink-0">
          <h3 class="font-mono text-sm font-semibold text-console-100 flex items-center gap-2">
            <AlertTriangle v-if="mode === 'resolve'" class="w-4 h-4 text-harbor-orange" />
            <CheckCircle2 v-else-if="mode === 'confirm'" class="w-4 h-4 text-harbor-cyan" />
            <Search v-else class="w-4 h-4 text-harbor-cyan" />
            <span v-if="mode === 'match'">手工匹配船舶</span>
            <span v-else-if="mode === 'resolve'">冲突确认与同步</span>
            <span v-else>确认并同步</span>
          </h3>
          <button
            @click="$emit('close')"
            class="w-7 h-7 rounded flex items-center justify-center text-console-400 hover:text-console-100 hover:bg-console-700/50 transition-all"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <div class="p-5 space-y-4 overflow-y-auto flex-1">
          <div v-if="external" class="panel-border rounded-lg p-4 bg-console-800/20">
            <h4 class="text-xs font-mono font-medium text-console-200 mb-3 flex items-center gap-2">
              <Database class="w-3.5 h-3.5 text-harbor-cyan" />
              外部船期信息
            </h4>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <span class="text-[10px] font-mono text-console-500 block mb-1">外部船名</span>
                <div class="flex items-center gap-1.5">
                  <ShipIcon class="w-3 h-3 text-console-400" />
                  <span class="text-xs font-medium text-console-100">{{ external.externalShipName }}</span>
                </div>
              </div>
              <div>
                <span class="text-[10px] font-mono text-console-500 block mb-1">IMO</span>
                <span class="text-xs font-mono text-console-200">{{ external.imo }}</span>
              </div>
              <div>
                <span class="text-[10px] font-mono text-console-500 block mb-1">来源系统</span>
                <span class="text-xs text-console-300">{{ EXTERNAL_DATA_SOURCE_LABELS[external.sourceSystem] }}</span>
              </div>
              <div>
                <span class="text-[10px] font-mono text-console-500 block mb-1">同步状态</span>
                <ExternalSyncStatusBadge :status="external.syncStatus" size="sm" />
              </div>
              <div>
                <span class="text-[10px] font-mono text-console-500 block mb-1">预计到港 (ETA)</span>
                <div class="flex items-center gap-1.5">
                  <Clock class="w-3 h-3 text-console-400" />
                  <span class="text-xs font-mono text-console-200">{{ formatDateTime(external.eta) }}</span>
                </div>
              </div>
              <div>
                <span class="text-[10px] font-mono text-console-500 block mb-1">预计离港 (ETD)</span>
                <span class="text-xs font-mono text-console-200">{{ formatDateTime(external.etd) }}</span>
              </div>
            </div>
            <div v-if="external.errorReason" class="mt-3 p-2 rounded bg-harbor-orange/10 border border-harbor-orange/30">
              <p class="text-[11px] text-harbor-orange flex items-start gap-1.5">
                <AlertTriangle class="w-3 h-3 mt-0.5 shrink-0" />
                <span>{{ external.errorReason }}</span>
              </p>
            </div>
          </div>

          <div v-if="mode === 'match'" class="panel-border rounded-lg p-4 bg-console-800/20">
            <h4 class="text-xs font-mono font-medium text-console-200 mb-3 flex items-center gap-2">
              <Search class="w-3.5 h-3.5 text-harbor-cyan" />
              选择匹配船舶
            </h4>
            <div class="relative">
              <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-console-400" />
              <input
                v-model="shipSearchQuery"
                type="text"
                placeholder="搜索船名、IMO、呼号..."
                class="w-full pl-9 pr-3 py-2 rounded bg-console-900/60 border border-console-500/30 text-xs font-mono text-console-100 placeholder:text-console-500 focus:outline-none focus:border-harbor-cyan/50"
              />
            </div>
            <div v-if="searchResults.length > 0" class="mt-2 max-h-40 overflow-y-auto rounded border border-console-500/20">
              <div
                v-for="ship in searchResults"
                :key="ship.id"
                @click="selectShip(ship)"
                :class="[
                  'px-3 py-2 cursor-pointer transition-colors border-b border-console-500/10 last:border-b-0',
                  selectedShipId === ship.id
                    ? 'bg-harbor-cyan/10 text-harbor-cyan'
                    : 'hover:bg-console-700/30 text-console-200',
                ]"
              >
                <div class="flex items-center justify-between">
                  <span class="text-xs font-medium">{{ ship.name }}</span>
                  <Check v-if="selectedShipId === ship.id" class="w-3.5 h-3.5" />
                </div>
                <p class="text-[10px] font-mono text-console-500 mt-0.5">{{ ship.imo }} · {{ ship.callSign }}</p>
              </div>
            </div>
            <p v-else-if="shipSearchQuery.trim()" class="mt-2 text-xs text-console-500 text-center py-3">
              未找到匹配的船舶
            </p>
          </div>

          <div v-if="mode !== 'match' && matchedShip" class="panel-border rounded-lg p-4 bg-console-800/20">
            <h4 class="text-xs font-mono font-medium text-console-200 mb-3 flex items-center gap-2">
              <ShipIcon class="w-3.5 h-3.5 text-harbor-cyan" />
              匹配船舶信息
            </h4>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <span class="text-[10px] font-mono text-console-500 block mb-1">船舶名称</span>
                <span class="text-xs font-medium text-console-100">{{ matchedShip.name }}</span>
              </div>
              <div>
                <span class="text-[10px] font-mono text-console-500 block mb-1">船籍/呼号</span>
                <span class="text-xs text-console-300">{{ matchedShip.flag || '-' }} / {{ matchedShip.callSign }}</span>
              </div>
              <div>
                <span class="text-[10px] font-mono text-console-500 block mb-1">船长/型宽</span>
                <span class="text-xs font-mono text-console-200">{{ matchedShip.length }}m / {{ matchedShip.width }}m</span>
              </div>
              <div>
                <span class="text-[10px] font-mono text-console-500 block mb-1">吃水</span>
                <span class="text-xs font-mono text-console-200">{{ matchedShip.draft }}m</span>
              </div>
            </div>
          </div>

          <div v-if="internalSchedule" class="panel-border rounded-lg overflow-hidden">
            <div class="px-4 py-3 border-b border-console-500/20 bg-console-800/30">
              <h4 class="text-xs font-mono font-medium text-console-200 flex items-center gap-2">
                <ArrowRight class="w-3.5 h-3.5 text-harbor-orange" />
                内部调度计划对比
              </h4>
            </div>
            <div class="p-4">
              <div class="grid grid-cols-3 gap-2 text-center">
                <div class="p-2 rounded bg-console-700/30">
                  <span class="text-[10px] font-mono text-console-500 block">字段</span>
                </div>
                <div class="p-2 rounded bg-harbor-cyan/10">
                  <span class="text-[10px] font-mono text-harbor-cyan block">外部数据</span>
                </div>
                <div class="p-2 rounded bg-harbor-orange/10">
                  <span class="text-[10px] font-mono text-harbor-orange block">内部调度</span>
                </div>

                <div class="p-2 text-[11px] text-console-400">ETA</div>
                <div :class="['p-2 text-[11px] font-mono', hasTimeConflict ? 'text-harbor-red' : 'text-harbor-cyan']">
                  {{ formatDate(external?.eta) }}
                </div>
                <div :class="['p-2 text-[11px] font-mono', hasTimeConflict ? 'text-harbor-red' : 'text-harbor-orange']">
                  {{ formatDate(internalSchedule.eta) }}
                </div>

                <div class="p-2 text-[11px] text-console-400">ETD</div>
                <div class="p-2 text-[11px] font-mono text-harbor-cyan">
                  {{ formatDate(external?.etd) }}
                </div>
                <div class="p-2 text-[11px] font-mono text-harbor-orange">
                  {{ formatDate(internalSchedule.etd) }}
                </div>

                <div class="p-2 text-[11px] text-console-400">泊位</div>
                <div class="p-2 text-[11px] text-harbor-cyan">
                  {{ external?.berthPreference || '-' }}
                </div>
                <div class="p-2 text-[11px] text-harbor-orange">
                  {{ scheduleStore.getBerthById(internalSchedule.berthId)?.name || '-' }}
                </div>

                <div class="p-2 text-[11px] text-console-400">状态</div>
                <div class="p-2">
                  <ExternalSyncStatusBadge :status="external!.syncStatus" size="sm" />
                </div>
                <div class="p-2">
                  <span class="text-[10px] font-mono text-console-300">{{ internalSchedule.status }}</span>
                </div>
              </div>

              <div v-if="hasTimeConflict" class="mt-3 p-2 rounded bg-harbor-red/10 border border-harbor-red/30">
                <p class="text-[11px] text-harbor-red flex items-start gap-1.5">
                  <AlertTriangle class="w-3 h-3 mt-0.5 shrink-0" />
                  <span>检测到时间冲突，确认后将使用外部数据更新内部调度计划</span>
                </p>
              </div>
            </div>
          </div>

          <div class="panel-border rounded-lg p-4 bg-console-800/20">
            <h4 class="text-xs font-mono font-medium text-console-200 mb-3">备注</h4>
            <textarea
              v-model="remark"
              rows="2"
              placeholder="可选：填写确认备注..."
              class="w-full px-3 py-2 rounded bg-console-900/60 border border-console-500/30 text-xs font-mono text-console-100 placeholder:text-console-500 focus:outline-none focus:border-harbor-cyan/50 resize-none"
            />
          </div>
        </div>

        <div class="flex items-center justify-between px-5 py-4 border-t border-console-500/20 shrink-0">
          <button
            v-if="mode !== 'match'"
            @click="handleIgnore"
            class="px-4 py-1.5 rounded text-xs font-mono text-console-400 border border-console-500/30 hover:bg-console-700/50 hover:text-console-300 transition-all"
          >
            忽略此条
          </button>
          <div v-else></div>
          <div class="flex items-center gap-2">
            <button
              @click="$emit('close')"
              class="px-4 py-1.5 rounded text-xs font-mono text-console-300 border border-console-500/30 hover:bg-console-700/50 transition-all"
            >
              取消
            </button>
            <button
              :disabled="(mode === 'match' && !selectedShipId) || (mode !== 'match' && !external?.matchedShipId)"
              @click="handleConfirm"
              class="px-4 py-1.5 rounded text-xs font-mono bg-harbor-cyan/20 text-harbor-cyan border border-harbor-cyan/30 hover:bg-harbor-cyan/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <Check class="w-3 h-3" />
              <span v-if="mode === 'match'">确认匹配</span>
              <span v-else-if="mode === 'resolve'">确认并同步</span>
              <span v-else>确认同步</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
