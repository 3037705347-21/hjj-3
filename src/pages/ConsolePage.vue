<script setup lang="ts">
import { useRouter } from 'vue-router';
import { computed, onMounted, ref } from 'vue';
import { useScheduleStore } from '../stores/schedule';
import { useAuthStore } from '../stores/auth';
import { USER_ROLE_LABELS } from '../types';
import StatsCards from '../components/console/StatsCards.vue';
import BerthTimeline from '../components/console/BerthTimeline.vue';
import ShipListTable from '../components/console/ShipListTable.vue';
import TideIndicator from '../components/console/TideIndicator.vue';
import ShipDetailSidebar from '../components/sidebar/ShipDetailSidebar.vue';
import LogPanel from '../components/logs/LogPanel.vue';
import { Anchor, History, User, RefreshCw, Settings, Bell, Shield, Users, ClipboardCheck, Layers, AlertTriangle } from 'lucide-vue-next';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { ScheduleFilterCriteria, OperationStatus } from '../types';
import { useApprovalStore } from '../stores/approval';
import { useResourceStore } from '../stores/resource';
import { useIncidentStore } from '../stores/incident';

type StatKey =
  | 'shipsInPort'
  | 'shipsWaiting'
  | 'utilization'
  | 'operations'
  | 'avgWaiting'
  | 'todayDeparted'
  | 'conflictShips'
  | 'overtimeOps'
  | 'turnover';

type ExternalFilter = Partial<ScheduleFilterCriteria> & { __token?: number };

const store = useScheduleStore();
const authStore = useAuthStore();
const approvalStore = useApprovalStore();
const resourceStore = useResourceStore();
const incidentStore = useIncidentStore();
const router = useRouter();

const currentTime = ref(new Date());
const tableFilter = ref<ExternalFilter | undefined>(undefined);
let filterToken = 0;

onMounted(() => {
  setInterval(() => {
    currentTime.value = new Date();
  }, 1000);
});

const conflictCount = computed(() =>
  store.conflicts.filter((c) => c.severity === 'error').length + resourceStore.activeConflicts.length,
);

const activeIncidentCount = computed(() =>
  incidentStore.activeIncidents.length,
);

const totalAlertCount = computed(() => conflictCount.value + activeIncidentCount.value);

function applyTableFilter(criteria: Partial<ScheduleFilterCriteria>) {
  filterToken++;
  tableFilter.value = { ...criteria, __token: filterToken };
}

function onStatCardClick(key: StatKey) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today.getTime() + 24 * 3600 * 1000);
  const todayStr = today.toISOString().slice(0, 16);
  const tomorrowStr = tomorrow.toISOString().slice(0, 16);

  switch (key) {
    case 'shipsInPort':
      applyTableFilter({ statusFilter: 'all' as OperationStatus | 'all' });
      setTimeout(() => {
        applyTableFilter({
          statusFilter: 'all',
          searchQuery: '',
        });
      }, 0);
      break;
    case 'shipsWaiting':
      applyTableFilter({ statusFilter: 'anchored' });
      break;
    case 'utilization':
      applyTableFilter({ statusFilter: 'all' });
      break;
    case 'operations':
      applyTableFilter({
        statusFilter: 'all',
        etaStart: todayStr,
        etaEnd: tomorrowStr,
      });
      break;
    case 'avgWaiting':
      applyTableFilter({ statusFilter: 'approaching' });
      break;
    case 'todayDeparted':
      applyTableFilter({ statusFilter: 'departed' });
      break;
    case 'conflictShips':
      applyTableFilter({ conflictFilter: 'has_conflict' });
      break;
    case 'overtimeOps':
      router.push({ path: '/logs', query: { type: 'warning' } });
      break;
    case 'turnover':
      applyTableFilter({ statusFilter: 'departed', etaStart: todayStr, etaEnd: tomorrowStr });
      break;
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
              class="px-3 py-1.5 rounded text-xs font-mono font-medium bg-harbor-cyan/15 text-harbor-cyan border border-harbor-cyan/30 shadow-glow-blue"
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
              @click="router.push('/approval')"
              class="px-3 py-1.5 rounded text-xs font-mono font-medium text-console-300 border border-console-500/30 hover:bg-console-700/50 hover:text-console-100 transition-all flex items-center gap-1.5 relative"
            >
              <ClipboardCheck class="w-3.5 h-3.5" />
              调度审批
              <span
                v-if="approvalStore.pendingCount > 0"
                class="ml-0.5 min-w-[16px] h-[16px] px-0.5 rounded-full bg-harbor-yellow text-console-900 text-[8px] font-mono font-bold flex items-center justify-center"
              >
                {{ approvalStore.pendingCount }}
              </span>
            </button>
            <button
              @click="router.push('/resources')"
              class="px-3 py-1.5 rounded text-xs font-mono font-medium text-console-300 border border-console-500/30 hover:bg-console-700/50 hover:text-console-100 transition-all flex items-center gap-1.5 relative"
            >
              <Layers class="w-3.5 h-3.5" />
              资源协同
              <span
                v-if="resourceStore.activeConflicts.length > 0"
                class="ml-0.5 min-w-[16px] h-[16px] px-0.5 rounded-full bg-harbor-red text-white text-[8px] font-mono font-bold flex items-center justify-center"
              >
                {{ resourceStore.activeConflicts.length }}
              </span>
            </button>
            <button
              @click="router.push('/incidents')"
              class="px-3 py-1.5 rounded text-xs font-mono font-medium text-console-300 border border-console-500/30 hover:bg-console-700/50 hover:text-console-100 transition-all flex items-center gap-1.5 relative"
            >
              <AlertTriangle class="w-3.5 h-3.5" />
              异常事件
              <span
                v-if="activeIncidentCount > 0"
                class="ml-0.5 min-w-[16px] h-[16px] px-0.5 rounded-full bg-harbor-red text-white text-[8px] font-mono font-bold flex items-center justify-center animate-pulse-red"
              >
                {{ activeIncidentCount }}
              </span>
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
            class="relative w-9 h-9 rounded-lg bg-console-800/60 border border-console-500/40 flex items-center justify-center text-console-300 hover:text-harbor-cyan hover:border-harbor-cyan/40 transition-all"
          >
            <Bell class="w-4 h-4" />
            <span
              v-if="totalAlertCount > 0"
              class="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-harbor-red text-white text-[9px] font-mono font-bold flex items-center justify-center animate-pulse-red"
            >
              {{ totalAlertCount }}
            </span>
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
              <p class="text-xs font-mono font-medium text-console-100">{{ authStore.currentUser?.displayName || store.currentOperator }}</p>
              <p class="text-[9px] font-mono text-console-400">{{ authStore.currentUser ? USER_ROLE_LABELS[authStore.currentUser.role] : '调度员' }}</p>
            </div>
          </div>
        </div>
      </div>
    </header>

    <main class="p-4 space-y-4">
      <StatsCards @card-click="onStatCardClick" />

      <div class="grid grid-cols-12 gap-4">
        <div class="col-span-8 space-y-4">
          <BerthTimeline />
          <div class="grid grid-cols-3 gap-4">
            <div class="col-span-2">
              <TideIndicator />
            </div>
            <div class="h-48">
              <LogPanel compact :limit="5" />
            </div>
          </div>
        </div>
        <div class="col-span-4 h-[640px]">
          <ShipListTable :external-filter="tableFilter" />
        </div>
      </div>
    </main>

    <ShipDetailSidebar />
  </div>
</template>
