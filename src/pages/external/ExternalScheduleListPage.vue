<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useScheduleStore } from '../../stores/schedule';
import { useAuthStore } from '../../stores/auth';
import { useExternalScheduleStore } from '../../stores/externalSchedule';
import { USER_ROLE_LABELS, EXTERNAL_DATA_SOURCE_LABELS } from '../../types';
import type { ExternalDataSource } from '../../types';
import ExternalScheduleListTable from '../../components/external/ExternalScheduleListTable.vue';
import ExternalConfirmModal from '../../components/external/ExternalConfirmModal.vue';
import {
  Anchor,
  History,
  User,
  RefreshCw,
  Settings,
  Bell,
  Shield,
  Users,
  Plus,
  Database,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Upload,
  FileText,
  ArrowRight,
  AlertCircle,
} from 'lucide-vue-next';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const store = useScheduleStore();
const authStore = useAuthStore();
const externalStore = useExternalScheduleStore();
const router = useRouter();

const currentTime = ref(new Date());
const showConfirmModal = ref(false);
const selectedExternalId = ref<string | null>(null);
const confirmMode = ref<'confirm' | 'match' | 'resolve'>('confirm');
const showImportModal = ref(false);
const importSource = ref<ExternalDataSource>('manual_import');
const importFileName = ref('');

onMounted(() => {
  setInterval(() => {
    currentTime.value = new Date();
  }, 1000);
});

const statsCards = computed(() => [
  {
    label: '待处理',
    value: externalStore.pendingOrConflictCount,
    color: 'text-harbor-yellow',
    bgClass: 'bg-harbor-yellow/15',
    borderClass: 'border-harbor-yellow/30',
    icon: Clock,
  },
  {
    label: '已同步',
    value: externalStore.syncedCount,
    color: 'text-harbor-green',
    bgClass: 'bg-harbor-green/15',
    borderClass: 'border-harbor-green/30',
    icon: CheckCircle2,
  },
  {
    label: '未匹配',
    value: externalStore.unmatchedCount,
    color: 'text-harbor-orange',
    bgClass: 'bg-harbor-orange/15',
    borderClass: 'border-harbor-orange/30',
    icon: AlertTriangle,
  },
  {
    label: '同步失败',
    value: externalStore.failedCount,
    color: 'text-harbor-red',
    bgClass: 'bg-harbor-red/15',
    borderClass: 'border-harbor-red/30',
    icon: XCircle,
  },
]);

function viewDetail(id: string) {
  router.push(`/external-schedules/${id}`);
}

function handleBatchSync() {
  const pendingIds = externalStore.externalSchedules
    .filter((s) => s.syncStatus === 'matched' || s.syncStatus === 'conflict')
    .map((s) => s.id);
  if (pendingIds.length > 0) {
    externalStore.batchSync(pendingIds);
  }
}

function handleImport() {
  showImportModal.value = true;
}

function confirmImport() {
  const mockSchedules = [
    {
      externalId: `EXT-MOCK-${Date.now()}-01`,
      externalShipName: '新华远洋号',
      imo: 'IMO9912345',
      callSign: 'VRXZ9',
      eta: new Date(Date.now() + 36 * 3600 * 1000),
      etd: new Date(Date.now() + 60 * 3600 * 1000),
      actualDynamicTime: new Date(),
      sourceSystem: importSource.value,
      cargoType: 'container' as const,
      cargoWeight: 180000,
      shipLength: 366,
      shipWidth: 48,
      draft: 13.5,
      voyageNo: `VOY-${Date.now()}`,
      operator: authStore.currentUser?.displayName || '系统',
    },
    {
      externalId: `EXT-MOCK-${Date.now()}-02`,
      externalShipName: '南海明珠号',
      imo: 'IMO9923456',
      callSign: 'VRYA3',
      eta: new Date(Date.now() + 48 * 3600 * 1000),
      etd: new Date(Date.now() + 72 * 3600 * 1000),
      sourceSystem: importSource.value,
      cargoType: 'bulk' as const,
      cargoWeight: 280000,
      shipLength: 320,
      shipWidth: 54,
      draft: 20.5,
      voyageNo: `VOY-${Date.now()}-B`,
      operator: authStore.currentUser?.displayName || '系统',
    },
  ];

  externalStore.importExternalData(importSource.value, mockSchedules);
  showImportModal.value = false;
  importFileName.value = '';
}

function goToImportRecords() {
  router.push('/external-schedules/imports');
}

function goToPendingConfirmation() {
  router.push('/external-schedules/pending');
}

function handleConfirmConfirmed(id: string) {
  console.log('Confirmed:', id);
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
              class="px-3 py-1.5 rounded text-xs font-mono font-medium bg-harbor-cyan/15 text-harbor-cyan border border-harbor-cyan/30 shadow-glow-cyan flex items-center gap-1.5"
            >
              <Database class="w-3.5 h-3.5" />
              外部船期接入
            </button>
            <button
              v-if="authStore.canManageUsers"
              @click="router.push('/permission/users')"
              class="px-3 py-1.5 rounded text-xs font-mono font-medium text-console-300 border border-console-500/30 hover:bg-console-700/50 hover:text-console-100 transition-all flex items-center gap-1.5"
            >
              <Users class="w-3.5 h-3.5" />
              用户管理
            </button>
            <button
              v-if="authStore.canManageRoles"
              @click="router.push('/permission/roles')"
              class="px-3 py-1.5 rounded text-xs font-mono font-medium text-console-300 border border-console-500/30 hover:bg-console-700/50 hover:text-console-100 transition-all flex items-center gap-1.5"
            >
              <Shield class="w-3.5 h-3.5" />
              角色配置
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

          <button
            @click="router.push('/incidents')"
            class="relative w-9 h-9 rounded-lg bg-console-800/60 border border-console-500/40 flex items-center justify-center text-console-300 hover:text-harbor-red hover:border-harbor-red/40 transition-all"
          >
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

    <main class="p-4 space-y-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <Database class="w-5 h-5 text-harbor-cyan" />
          <h2 class="font-mono text-lg font-bold text-console-100">外部船期与动态接入</h2>
          <span
            v-if="externalStore.pendingOrConflictCount > 0"
            class="px-2 py-0.5 rounded-full bg-harbor-yellow/20 text-harbor-yellow text-xs font-mono font-medium border border-harbor-yellow/40 animate-pulse"
          >
            {{ externalStore.pendingOrConflictCount }} 条待处理
          </span>
        </div>
        <div class="flex items-center gap-2">
          <button
            v-if="externalStore.pendingConfirmationCount > 0"
            @click="goToPendingConfirmation"
            class="px-3 py-1.5 rounded text-xs font-mono bg-harbor-orange/15 text-harbor-orange border border-harbor-orange/30 hover:bg-harbor-orange/25 transition-all flex items-center gap-1.5 animate-pulse"
          >
            <AlertCircle class="w-3.5 h-3.5" />
            待确认处理 ({{ externalStore.pendingConfirmationCount }})
          </button>
          <button
            @click="goToImportRecords"
            class="px-3 py-1.5 rounded text-xs font-mono text-console-300 border border-console-500/30 hover:bg-console-700/50 hover:text-console-100 transition-all flex items-center gap-1.5"
          >
            <FileText class="w-3.5 h-3.5" />
            导入记录
          </button>
          <button
            @click="handleImport"
            class="px-3 py-1.5 rounded text-xs font-mono text-console-300 border border-console-500/30 hover:bg-console-700/50 hover:text-console-100 transition-all flex items-center gap-1.5"
          >
            <Upload class="w-3.5 h-3.5" />
            模拟导入
          </button>
          <button
            :disabled="externalStore.pendingOrConflictCount === 0"
            @click="handleBatchSync"
            class="px-4 py-1.5 rounded text-xs font-mono font-medium bg-harbor-cyan/20 text-harbor-cyan border border-harbor-cyan/30 hover:bg-harbor-cyan/30 transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ArrowRight class="w-3.5 h-3.5" />
            批量同步
          </button>
        </div>
      </div>

      <div class="grid grid-cols-4 gap-3">
        <div
          v-for="card in statsCards"
          :key="card.label"
          :class="[
            'flex items-center justify-between p-3 rounded-lg border transition-all',
            card.bgClass,
            card.borderClass,
          ]"
        >
          <div>
            <span class="text-xs font-mono text-console-200">{{ card.label }}</span>
            <span :class="['text-lg font-bold font-mono block mt-1', card.color]">
              {{ card.value }}
            </span>
          </div>
          <div
            :class="[
              'w-9 h-9 rounded-lg flex items-center justify-center',
              'bg-console-800/50 border border-console-500/50',
            ]"
          >
            <component :is="card.icon" :class="['w-4 h-4', card.color]" />
          </div>
        </div>
      </div>

      <ExternalScheduleListTable @view-detail="viewDetail" />
    </main>

    <ExternalConfirmModal
      :visible="showConfirmModal"
      :external-id="selectedExternalId || undefined"
      :mode="confirmMode"
      @close="showConfirmModal = false"
      @confirmed="handleConfirmConfirmed"
    />

    <div v-if="showImportModal" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-console-900/80 backdrop-blur-sm" @click="showImportModal = false" />
      <div class="relative w-full max-w-md panel-border rounded-xl shadow-2xl z-10">
        <div class="flex items-center justify-between px-5 py-4 border-b border-console-500/20">
          <h3 class="font-mono text-sm font-semibold text-console-100 flex items-center gap-2">
            <Upload class="w-4 h-4 text-harbor-cyan" />
            模拟导入外部船期
          </h3>
          <button
            @click="showImportModal = false"
            class="w-7 h-7 rounded flex items-center justify-center text-console-400 hover:text-console-100 hover:bg-console-700/50 transition-all"
          >
            <XCircle class="w-4 h-4" />
          </button>
        </div>
        <div class="p-5 space-y-4">
          <div>
            <label class="block text-xs font-mono text-console-300 mb-1.5">来源系统</label>
            <select
              v-model="importSource"
              class="w-full px-3 py-2 rounded bg-console-800/60 border border-console-500/30 text-xs font-mono text-console-100 focus:outline-none focus:border-harbor-cyan/50"
            >
              <option v-for="(label, key) in EXTERNAL_DATA_SOURCE_LABELS" :key="key" :value="key">
                {{ label }}
              </option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-mono text-console-300 mb-1.5">文件名 (模拟)</label>
            <input
              v-model="importFileName"
              type="text"
              placeholder="external_schedules_20260619.xlsx"
              class="w-full px-3 py-2 rounded bg-console-800/60 border border-console-500/30 text-xs font-mono text-console-100 placeholder:text-console-500 focus:outline-none focus:border-harbor-cyan/50"
            />
          </div>
          <div class="p-3 rounded bg-console-800/30 border border-console-500/20">
            <p class="text-[11px] text-console-400">
              <span class="text-harbor-yellow">提示：</span>
              这是一个模拟导入功能，将创建 2 条示例外部船期数据，用于测试匹配和同步流程。
            </p>
          </div>
          <div class="flex items-center justify-end gap-2">
            <button
              @click="showImportModal = false"
              class="px-4 py-1.5 rounded text-xs font-mono text-console-300 border border-console-500/30 hover:bg-console-700/50 transition-all"
            >
              取消
            </button>
            <button
              @click="confirmImport"
              class="px-4 py-1.5 rounded text-xs font-mono bg-harbor-cyan/20 text-harbor-cyan border border-harbor-cyan/30 hover:bg-harbor-cyan/30 transition-all flex items-center gap-1.5"
            >
              <Upload class="w-3 h-3" />
              确认导入
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
