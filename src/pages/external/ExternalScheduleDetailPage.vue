<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useScheduleStore } from '../../stores/schedule';
import { useAuthStore } from '../../stores/auth';
import { useExternalScheduleStore } from '../../stores/externalSchedule';
import {
  USER_ROLE_LABELS,
  EXTERNAL_DATA_SOURCE_LABELS,
  EXTERNAL_SYNC_STATUS_LABELS,
} from '../../types';
import ExternalSyncStatusBadge from '../../components/external/ExternalSyncStatusBadge.vue';
import ExternalSyncLogTimeline from '../../components/external/ExternalSyncLogTimeline.vue';
import ExternalConfirmModal from '../../components/external/ExternalConfirmModal.vue';
import {
  Anchor,
  History,
  User,
  RefreshCw,
  Settings,
  Bell,
  ArrowLeft,
  Database,
  Ship,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Edit3,
  ArrowRight,
  RefreshCw as RefreshIcon,
  Eye,
  MapPin,
  Ruler,
  Gauge,
} from 'lucide-vue-next';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const store = useScheduleStore();
const authStore = useAuthStore();
const externalStore = useExternalScheduleStore();
const router = useRouter();
const route = useRoute();

const currentTime = ref(new Date());
const showConfirmModal = ref(false);
const confirmMode = ref<'confirm' | 'match' | 'resolve'>('confirm');

onMounted(() => {
  setInterval(() => {
    currentTime.value = new Date();
  }, 1000);
});

const externalId = computed(() => route.params.id as string);
const external = computed(() => externalStore.getExternalById(externalId.value));
const syncLogs = computed(() => externalStore.getSyncLogsByExternalId(externalId.value));

const matchedShip = computed(() => {
  if (!external.value?.matchedShipId) return null;
  return store.getShipById(external.value.matchedShipId);
});

const internalSchedule = computed(() => {
  if (!external.value?.matchedShipId) return null;
  return store.schedules.find((s) => s.shipId === external.value!.matchedShipId) || null;
});

const internalBerth = computed(() => {
  if (!internalSchedule.value) return null;
  return store.getBerthById(internalSchedule.value.berthId);
});

const hasTimeConflict = computed(() => {
  if (!external.value?.eta || !internalSchedule.value?.eta) return false;
  const diff = Math.abs(
    new Date(external.value.eta).getTime() - new Date(internalSchedule.value.eta).getTime(),
  );
  return diff > 3600000;
});

const canSync = computed(() => {
  if (!external.value) return false;
  return ['matched', 'conflict', 'pending'].includes(external.value.syncStatus);
});

const canRetry = computed(() => {
  if (!external.value) return false;
  return external.value.syncStatus === 'failed';
});

function formatDateTime(date?: Date | string): string {
  if (!date) return '-';
  return format(new Date(date), 'yyyy-MM-dd HH:mm', { locale: zhCN });
}

function formatDate(date?: Date | string): string {
  if (!date) return '-';
  return format(new Date(date), 'MM-dd HH:mm', { locale: zhCN });
}

function goBack() {
  router.push('/external-schedules');
}

function handleSync() {
  if (!external.value) return;
  confirmMode.value = 'confirm';
  showConfirmModal.value = true;
}

function handleResolve() {
  if (!external.value) return;
  confirmMode.value = 'resolve';
  showConfirmModal.value = true;
}

function handleMatch() {
  if (!external.value) return;
  confirmMode.value = 'match';
  showConfirmModal.value = true;
}

function handleRetry() {
  if (!external.value) return;
  externalStore.retrySync(external.value.id);
}

function handleIgnore() {
  if (!external.value) return;
  externalStore.ignoreExternalSchedule(external.value.id);
}

function handleConfirmed(id: string) {
  console.log('Confirmed:', id);
}

function goToScheduleDetail() {
  if (internalSchedule.value) {
    router.push(`/`);
  }
}
</script>

<template>
  <div class="min-h-screen bg-console-900 console-grid-bg">
    <header class="sticky top-0 z-40 bg-console-900/90 backdrop-blur-xl border-b border-console-500/30">
      <div class="flex items-center justify-between px-6 py-3">
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-2">
            <div class="w-9 h-9 rounded-lg bg-gradient-to-br from-harbor-cyan to-harbor-orange flex items-center justify-center shadow-glow-cyan">
              <Anchor class="w-5 h-5 text-console-900" />
            </div>
            <div>
              <h1 class="font-mono text-lg font-bold text-console-100 tracking-wider glow-text-cyan">
                PORTOS
              </h1>
              <p class="text-[9px] font-mono text-console-400 uppercase tracking-widest">
                Berth Operations Control System
              </p>
            </div>
          </div>
          <div class="h-8 w-px bg-console-500/30 mx-2" />
          <nav class="flex items-center gap-1">
            <button
              @click="router.push('/')"
              class="px-3 py-1.5 rounded text-xs font-mono font-medium text-console-300 border border-console-500/30 hover:bg-console-700/50 hover:text-console-100 transition-all flex items-center gap-1.5"
            >
              运营控制台
            </button>
            <button
              @click="router.push('/logs')"
              class="px-3 py-1.5 rounded text-xs font-mono font-medium text-console-300 border border-console-500/30 hover:bg-console-700/50 hover:text-console-100 transition-all flex items-center gap-1.5"
            >
              <History class="w-3.5 h-3.5" />
              调度日志
            </button>
            <button
              @click="router.push('/external-schedules')"
              class="px-3 py-1.5 rounded text-xs font-mono font-medium bg-harbor-cyan/15 text-harbor-cyan border border-harbor-cyan/30 shadow-glow-cyan flex items-center gap-1.5"
            >
              <Database class="w-3.5 h-3.5" />
              外部船期接入
            </button>
          </nav>
        </div>

        <div class="flex items-center gap-4">
          <div class="text-right">
            <p class="font-mono text-sm text-console-100 tabular-nums">
              {{ format(currentTime, 'yyyy-MM-dd HH:mm:ss', { locale: zhCN }) }}
            </p>
            <p class="text-[10px] font-mono text-console-400 uppercase tracking-wider">
              系统运行中
            </p>
          </div>

          <div class="h-8 w-px bg-console-500/30" />

          <button class="w-9 h-9 rounded-lg bg-console-800/60 border border-console-500/40 flex items-center justify-center text-console-300 hover:text-console-100 hover:border-console-400/50 transition-all">
            <Bell class="w-4 h-4" />
          </button>

          <button class="w-9 h-9 rounded-lg bg-console-800/60 border border-console-500/40 flex items-center justify-center text-console-300 hover:text-console-100 hover:border-console-400/50 transition-all">
            <RefreshCw class="w-4 h-4" />
          </button>

          <button class="w-9 h-9 rounded-lg bg-console-800/60 border border-console-500/40 flex items-center justify-center text-console-300 hover:text-console-100 hover:border-console-400/50 transition-all">
            <Settings class="w-4 h-4" />
          </button>

          <div class="flex items-center gap-2 pl-2 border-l border-console-500/30">
            <div class="w-8 h-8 rounded-full bg-gradient-to-br from-harbor-orange to-harbor-red flex items-center justify-center">
              <User class="w-4 h-4 text-white" />
            </div>
            <div>
              <p class="text-xs font-mono font-medium text-console-100">
                {{ authStore.currentUser?.displayName || store.currentOperator }}
              </p>
              <p class="text-[9px] font-mono text-console-400">
                {{ authStore.currentUser ? USER_ROLE_LABELS[authStore.currentUser.role] : '调度员' }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>

    <main class="p-4 space-y-4" v-if="external">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <button
            @click="goBack"
            class="w-8 h-8 rounded flex items-center justify-center text-console-300 border border-console-500/30 hover:bg-console-700/50 hover:text-console-100 transition-all"
          >
            <ArrowLeft class="w-4 h-4" />
          </button>
          <div>
            <div class="flex items-center gap-2">
              <Database class="w-5 h-5 text-harbor-cyan" />
              <h2 class="font-mono text-lg font-bold text-console-100">
                {{ external.externalShipName }}
              </h2>
              <ExternalSyncStatusBadge :status="external.syncStatus" size="sm" />
            </div>
            <div class="flex items-center gap-3 mt-1">
              <span class="text-xs font-mono text-console-500">{{ external.externalId }}</span>
              <span class="text-xs text-console-400">
                来源：{{ EXTERNAL_DATA_SOURCE_LABELS[external.sourceSystem] }}
              </span>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button
            v-if="external.syncStatus === 'unmatched'"
            @click="handleMatch"
            class="px-3 py-1.5 rounded text-xs font-mono text-console-300 border border-console-500/30 hover:bg-console-700/50 hover:text-console-100 transition-all flex items-center gap-1.5"
          >
            <Edit3 class="w-3 h-3" />
            手动匹配
          </button>
          <button
            v-if="canRetry"
            @click="handleRetry"
            class="px-3 py-1.5 rounded text-xs font-mono text-console-300 border border-console-500/30 hover:bg-console-700/50 hover:text-console-100 transition-all flex items-center gap-1.5"
          >
            <RefreshIcon class="w-3 h-3" />
            重试同步
          </button>
          <button
            v-if="canSync && external.syncStatus !== 'conflict'"
            @click="handleSync"
            class="px-4 py-1.5 rounded text-xs font-mono font-medium bg-harbor-cyan/20 text-harbor-cyan border border-harbor-cyan/30 hover:bg-harbor-cyan/30 transition-all flex items-center gap-1.5"
          >
            <ArrowRight class="w-3.5 h-3.5" />
            确认同步
          </button>
          <button
            v-if="external.syncStatus === 'conflict'"
            @click="handleResolve"
            class="px-4 py-1.5 rounded text-xs font-mono font-medium bg-harbor-orange/20 text-harbor-orange border border-harbor-orange/30 hover:bg-harbor-orange/30 transition-all flex items-center gap-1.5"
          >
            <AlertTriangle class="w-3.5 h-3.5" />
            冲突确认
          </button>
          <button
            v-if="external.syncStatus !== 'synced' && external.syncStatus !== 'ignored'"
            @click="handleIgnore"
            class="px-3 py-1.5 rounded text-xs font-mono text-console-400 border border-console-500/30 hover:bg-console-700/50 hover:text-console-300 transition-all"
          >
            忽略
          </button>
        </div>
      </div>

      <div class="grid grid-cols-3 gap-4">
        <div class="col-span-2 space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div class="panel-border rounded-lg p-4 bg-console-800/20">
              <h3 class="text-xs font-mono font-medium text-console-200 mb-3 flex items-center gap-2">
                <Database class="w-4 h-4 text-harbor-cyan" />
                外部船期信息
              </h3>
              <div class="space-y-2.5">
                <div class="flex justify-between text-xs">
                  <span class="text-console-500 flex items-center gap-1.5">
                    <Ship class="w-3 h-3" />
                    船名
                  </span>
                  <span class="text-console-200 font-medium">{{ external.externalShipName }}</span>
                </div>
                <div class="flex justify-between text-xs">
                  <span class="text-console-500 flex items-center gap-1.5">
                    <FileText class="w-3 h-3" />
                    IMO
                  </span>
                  <span class="text-console-200 font-mono">{{ external.imo }}</span>
                </div>
                <div class="flex justify-between text-xs">
                  <span class="text-console-500">呼号</span>
                  <span class="text-console-300 font-mono">{{ external.callSign || '-' }}</span>
                </div>
                <div class="flex justify-between text-xs">
                  <span class="text-console-500 flex items-center gap-1.5">
                    <Clock class="w-3 h-3" />
                    预计到港
                  </span>
                  <span class="text-console-200 font-mono">{{ formatDateTime(external.eta) }}</span>
                </div>
                <div class="flex justify-between text-xs">
                  <span class="text-console-500">预计离港</span>
                  <span class="text-console-300 font-mono">{{ formatDateTime(external.etd) }}</span>
                </div>
                <div class="flex justify-between text-xs">
                  <span class="text-console-500">实际动态</span>
                  <span class="text-console-300 font-mono">{{ formatDateTime(external.actualDynamicTime) }}</span>
                </div>
                <div class="flex justify-between text-xs">
                  <span class="text-console-500 flex items-center gap-1.5">
                    <Gauge class="w-3 h-3" />
                    载重
                  </span>
                  <span class="text-console-300">{{ external.cargoWeight ? external.cargoWeight.toLocaleString() + ' 吨' : '-' }}</span>
                </div>
                <div class="flex justify-between text-xs">
                  <span class="text-console-500 flex items-center gap-1.5">
                    <Ruler class="w-3 h-3" />
                    船长/型宽
                  </span>
                  <span class="text-console-300 font-mono">
                    {{ external.shipLength || '-' }} / {{ external.shipWidth || '-' }} m
                  </span>
                </div>
                <div class="flex justify-between text-xs">
                  <span class="text-console-500">吃水</span>
                  <span class="text-console-300 font-mono">{{ external.draft || '-' }} m</span>
                </div>
                <div class="flex justify-between text-xs">
                  <span class="text-console-500">航次</span>
                  <span class="text-console-300 font-mono">{{ external.voyageNo || '-' }}</span>
                </div>
              </div>
            </div>

            <div class="panel-border rounded-lg p-4 bg-console-800/20">
              <h3 class="text-xs font-mono font-medium text-console-200 mb-3 flex items-center gap-2">
                <Ship class="w-4 h-4 text-harbor-green" />
                匹配船舶信息
              </h3>
              <div v-if="matchedShip" class="space-y-2.5">
                <div class="flex justify-between text-xs">
                  <span class="text-console-500 flex items-center gap-1.5">
                    <CheckCircle2 class="w-3 h-3 text-harbor-green" />
                    船名
                  </span>
                  <span class="text-console-200 font-medium">{{ matchedShip.name }}</span>
                </div>
                <div class="flex justify-between text-xs">
                  <span class="text-console-500">IMO</span>
                  <span class="text-console-200 font-mono">{{ matchedShip.imo }}</span>
                </div>
                <div class="flex justify-between text-xs">
                  <span class="text-console-500">呼号</span>
                  <span class="text-console-300 font-mono">{{ matchedShip.callSign }}</span>
                </div>
                <div class="flex justify-between text-xs">
                  <span class="text-console-500">船长/型宽</span>
                  <span class="text-console-300 font-mono">{{ matchedShip.length }} / {{ matchedShip.width }} m</span>
                </div>
                <div class="flex justify-between text-xs">
                  <span class="text-console-500">吃水</span>
                  <span class="text-console-300 font-mono">{{ matchedShip.draft }} m</span>
                </div>
                <div class="flex justify-between text-xs">
                  <span class="text-console-500">载重吨</span>
                  <span class="text-console-300">{{ matchedShip.cargoWeight.toLocaleString() }} 吨</span>
                </div>
                <div class="flex justify-between text-xs">
                  <span class="text-console-500">船籍</span>
                  <span class="text-console-300">{{ matchedShip.flag || '-' }}</span>
                </div>
                <div class="flex justify-between text-xs">
                  <span class="text-console-500">建造年份</span>
                  <span class="text-console-300">{{ matchedShip.buildYear || '-' }}</span>
                </div>
              </div>
              <div v-else class="text-center py-8">
                <XCircle class="w-10 h-10 text-console-600 mx-auto mb-2" />
                <p class="text-xs text-console-500">未匹配到船舶</p>
                <button
                  @click="handleMatch"
                  class="mt-3 px-3 py-1 rounded text-[11px] font-mono text-harbor-cyan border border-harbor-cyan/30 hover:bg-harbor-cyan/10 transition-all"
                >
                  手动匹配
                </button>
              </div>
            </div>
          </div>

          <div class="panel-border rounded-lg overflow-hidden">
            <div class="px-4 py-3 border-b border-console-500/20 bg-console-800/30">
              <h3 class="text-xs font-mono font-medium text-console-200 flex items-center gap-2">
                <ArrowRight class="w-4 h-4 text-harbor-orange" />
                数据对照与差异
              </h3>
            </div>
            <div class="p-4">
              <div class="grid grid-cols-4 gap-2 text-center text-xs">
                <div class="p-2 rounded bg-console-700/30 font-medium text-console-300">
                  对比项
                </div>
                <div class="p-2 rounded bg-harbor-cyan/10 font-medium text-harbor-cyan">
                  外部数据
                </div>
                <div class="p-2 rounded bg-harbor-orange/10 font-medium text-harbor-orange">
                  内部调度
                </div>
                <div class="p-2 rounded bg-console-700/30 font-medium text-console-300">
                  状态
                </div>

                <div class="p-2 text-console-400 text-left">ETA</div>
                <div :class="['p-2 font-mono', hasTimeConflict ? 'text-harbor-red' : 'text-harbor-cyan']">
                  {{ formatDate(external.eta) }}
                </div>
                <div :class="['p-2 font-mono', hasTimeConflict ? 'text-harbor-red' : 'text-harbor-orange']">
                  {{ formatDate(internalSchedule?.eta) }}
                </div>
                <div class="p-2">
                  <span
                    v-if="hasTimeConflict"
                    class="text-[10px] px-2 py-0.5 rounded bg-harbor-red/15 text-harbor-red border border-harbor-red/30"
                  >
                    冲突
                  </span>
                  <span v-else class="text-[10px] px-2 py-0.5 rounded bg-harbor-green/15 text-harbor-green border border-harbor-green/30">
                    一致
                  </span>
                </div>

                <div class="p-2 text-console-400 text-left">ETD</div>
                <div class="p-2 font-mono text-harbor-cyan">
                  {{ formatDate(external.etd) }}
                </div>
                <div class="p-2 font-mono text-harbor-orange">
                  {{ formatDate(internalSchedule?.etd) }}
                </div>
                <div class="p-2">
                  <span class="text-[10px] px-2 py-0.5 rounded bg-harbor-yellow/15 text-harbor-yellow border border-harbor-yellow/30">
                    待确认
                  </span>
                </div>

                <div class="p-2 text-console-400 text-left">泊位</div>
                <div class="p-2 text-harbor-cyan">
                  {{ external.berthPreference || '-' }}
                </div>
                <div class="p-2 text-harbor-orange">
                  {{ internalBerth?.name || '-' }}
                </div>
                <div class="p-2">
                  <span class="text-[10px] px-2 py-0.5 rounded bg-console-600/30 text-console-400 border border-console-500/30">
                    参考
                  </span>
                </div>

                <div class="p-2 text-console-400 text-left">作业状态</div>
                <div class="p-2">
                  <ExternalSyncStatusBadge :status="external.syncStatus" size="sm" />
                </div>
                <div class="p-2">
                  <span class="text-[10px] font-mono text-console-300">
                    {{ internalSchedule?.status || '-' }}
                  </span>
                </div>
                <div class="p-2"></div>
              </div>

              <div v-if="hasTimeConflict" class="mt-4 p-3 rounded bg-harbor-red/10 border border-harbor-red/30">
                <p class="text-xs text-harbor-red flex items-start gap-2">
                  <AlertTriangle class="w-4 h-4 mt-0.5 shrink-0" />
                  <span>
                    检测到时间冲突：外部数据 ETA 与内部调度存在差异。确认同步后将使用外部数据更新内部调度计划，并写入变更日志。
                  </span>
                </p>
              </div>

              <div v-if="external.errorReason" class="mt-4 p-3 rounded bg-harbor-orange/10 border border-harbor-orange/30">
                <p class="text-xs text-harbor-orange flex items-start gap-2">
                  <AlertTriangle class="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{{ external.errorReason }}</span>
                </p>
              </div>

              <div v-if="external.remark" class="mt-4 p-3 rounded bg-console-700/20 border border-console-500/20">
                <p class="text-[11px] text-console-400 mb-1">备注：</p>
                <p class="text-xs text-console-300">{{ external.remark }}</p>
              </div>
            </div>
          </div>
        </div>

        <div class="space-y-4">
          <div class="panel-border rounded-lg p-4 bg-console-800/20">
            <h3 class="text-xs font-mono font-medium text-console-200 mb-3 flex items-center gap-2">
              <Clock class="w-4 h-4 text-harbor-cyan" />
              时间信息
            </h3>
            <div class="space-y-2">
              <div class="flex justify-between text-xs">
                <span class="text-console-500">导入时间</span>
                <span class="text-console-200 font-mono">{{ formatDateTime(external.createdAt) }}</span>
              </div>
              <div class="flex justify-between text-xs">
                <span class="text-console-500">更新时间</span>
                <span class="text-console-200 font-mono">{{ formatDateTime(external.updatedAt) }}</span>
              </div>
              <div class="flex justify-between text-xs">
                <span class="text-console-500">最后同步</span>
                <span class="text-console-200 font-mono">{{ formatDateTime(external.lastSyncTime) }}</span>
              </div>
              <div v-if="external.confirmedBy" class="flex justify-between text-xs">
                <span class="text-console-500">确认人</span>
                <span class="text-console-200">{{ external.confirmedBy }}</span>
              </div>
              <div v-if="external.confirmedAt" class="flex justify-between text-xs">
                <span class="text-console-500">确认时间</span>
                <span class="text-console-200 font-mono">{{ formatDateTime(external.confirmedAt) }}</span>
              </div>
            </div>
          </div>

          <div class="panel-border rounded-lg p-4 bg-console-800/20">
            <h3 class="text-xs font-mono font-medium text-console-200 mb-3 flex items-center gap-2">
              <Database class="w-4 h-4 text-harbor-cyan" />
              来源信息
            </h3>
            <div class="space-y-2">
              <div class="flex justify-between text-xs">
                <span class="text-console-500">来源系统</span>
                <span class="text-console-200">{{ EXTERNAL_DATA_SOURCE_LABELS[external.sourceSystem] }}</span>
              </div>
              <div class="flex justify-between text-xs">
                <span class="text-console-500">外部编号</span>
                <span class="text-console-300 font-mono text-right text-[10px]">{{ external.externalId }}</span>
              </div>
              <div class="flex justify-between text-xs">
                <span class="text-console-500">导入批次</span>
                <span class="text-console-300 font-mono text-[10px]">{{ external.importBatchId || '-' }}</span>
              </div>
            </div>
          </div>

          <div class="panel-border rounded-lg overflow-hidden">
            <div class="px-4 py-3 border-b border-console-500/20 bg-console-800/30">
              <h3 class="text-xs font-mono font-medium text-console-200 flex items-center gap-2">
                <FileText class="w-4 h-4 text-harbor-cyan" />
                同步日志
              </h3>
            </div>
            <div class="p-4 max-h-80 overflow-y-auto">
              <ExternalSyncLogTimeline :logs="syncLogs" />
            </div>
          </div>
        </div>
      </div>
    </main>

    <ExternalConfirmModal
      :visible="showConfirmModal"
      :external-id="externalId"
      :mode="confirmMode"
      @close="showConfirmModal = false"
      @confirmed="handleConfirmed"
    />
  </div>
</template>
