<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router';
import { computed, nextTick, onMounted, ref } from 'vue';
import { useScheduleStore } from '../stores/schedule';
import { useAuthStore } from '../stores/auth';
import { USER_ROLE_LABELS } from '../types';
import StatsCards from '../components/console/StatsCards.vue';
import BerthTimeline from '../components/console/BerthTimeline.vue';
import ShipListTable from '../components/console/ShipListTable.vue';
import TideIndicator from '../components/console/TideIndicator.vue';
import ShipDetailSidebar from '../components/sidebar/ShipDetailSidebar.vue';
import LogPanel from '../components/logs/LogPanel.vue';
import { Anchor, History, User, RefreshCw, Settings, Bell, Shield, Users, ClipboardCheck, Layers, AlertTriangle, BarChart3, CalendarDays, CalendarRange, TrendingUp, Download, Handshake, ChevronDown, Wrench, Clock, Zap, Ship, Hammer, X } from 'lucide-vue-next';
import HandoverDialog from '../components/handover/HandoverDialog.vue';
import HandoverSummary from '../components/handover/HandoverSummary.vue';
import BerthMaintenanceManager from '../components/console/BerthMaintenanceManager.vue';
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
const route = useRoute();

const currentTime = ref(new Date());
const tableFilter = ref<ExternalFilter | undefined>(undefined);
const showHandoverDialog = ref(false);
const showHandoverSummary = ref(false);
const showOperatorMenu = ref(false);
const showMaintenanceManager = ref(false);
let filterToken = 0;

type QuickViewKey =
  | 'arriving_6h'
  | 'has_conflict'
  | 'operating'
  | 'waiting_departure'
  | 'maintenance_affected';

interface QuickViewDefinition {
  key: QuickViewKey;
  label: string;
  icon: typeof Clock;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  activeBgClass: string;
  activeBorderClass: string;
}

const QUICK_VIEWS: QuickViewDefinition[] = [
  {
    key: 'arriving_6h',
    label: '6小时内到港',
    icon: Clock,
    colorClass: 'text-harbor-blue',
    bgClass: 'bg-harbor-blue/10',
    borderClass: 'border-harbor-blue/30',
    activeBgClass: 'bg-harbor-blue/25',
    activeBorderClass: 'border-harbor-blue/60',
  },
  {
    key: 'has_conflict',
    label: '当前有冲突',
    icon: AlertTriangle,
    colorClass: 'text-harbor-red',
    bgClass: 'bg-harbor-red/10',
    borderClass: 'border-harbor-red/30',
    activeBgClass: 'bg-harbor-red/25',
    activeBorderClass: 'border-harbor-red/60',
  },
  {
    key: 'operating',
    label: '正在作业',
    icon: Zap,
    colorClass: 'text-harbor-green',
    bgClass: 'bg-harbor-green/10',
    borderClass: 'border-harbor-green/30',
    activeBgClass: 'bg-harbor-green/25',
    activeBorderClass: 'border-harbor-green/60',
  },
  {
    key: 'waiting_departure',
    label: '待离泊',
    icon: Ship,
    colorClass: 'text-harbor-cyan',
    bgClass: 'bg-harbor-cyan/10',
    borderClass: 'border-harbor-cyan/30',
    activeBgClass: 'bg-harbor-cyan/25',
    activeBorderClass: 'border-harbor-cyan/60',
  },
  {
    key: 'maintenance_affected',
    label: '泊位维护影响中',
    icon: Hammer,
    colorClass: 'text-harbor-orange',
    bgClass: 'bg-harbor-orange/10',
    borderClass: 'border-harbor-orange/30',
    activeBgClass: 'bg-harbor-orange/25',
    activeBorderClass: 'border-harbor-orange/60',
  },
];

const activeQuickView = ref<QuickViewKey | null>(null);

const arriving6hCount = computed(() => {
  const now = Date.now();
  const in6h = now + 6 * 3600 * 1000;
  return store.schedules.filter((s) => {
    if (s.status === 'departed') return false;
    const eta = new Date(s.eta).getTime();
    return eta >= now && eta <= in6h;
  }).length;
});

const hasConflictCount = computed(() => {
  const ids = new Set(store.conflicts.map((c) => c.scheduleId));
  return store.schedules.filter((s) => ids.has(s.id) && s.status !== 'departed').length;
});

const operatingCount = computed(() => {
  return store.schedules.filter(
    (s) => s.status === 'loading' || s.status === 'unloading',
  ).length;
});

const waitingDepartureCount = computed(() => {
  return store.schedules.filter(
    (s) => s.status === 'berthing' || s.status === 'departing' ||
           ((s.status === 'loading' || s.status === 'unloading') && s.operationProgress >= 95),
  ).length;
});

const maintenanceAffectedCount = computed(() => {
  return store.schedules.filter(
    (s) => s.status !== 'departed' && store.isScheduleAffectedByMaintenance(s.id),
  ).length;
});

function getQuickViewCount(key: QuickViewKey): number {
  switch (key) {
    case 'arriving_6h': return arriving6hCount.value;
    case 'has_conflict': return hasConflictCount.value;
    case 'operating': return operatingCount.value;
    case 'waiting_departure': return waitingDepartureCount.value;
    case 'maintenance_affected': return maintenanceAffectedCount.value;
  }
}

function buildEmptyFilter(): ExternalFilter {
  filterToken++;
  return {
    __token: filterToken,
    searchQuery: '',
    statusFilter: 'all',
    priorityFilter: 'all',
    cargoTypeFilter: 'all',
    berthFilter: 'all',
    conflictFilter: 'all',
    teamFilter: 'all',
    etaStart: null,
    etaEnd: null,
    progressMin: null,
    progressMax: null,
    scheduleIds: null,
    maintenanceFilter: 'all',
  };
}

function applyQuickView(key: QuickViewKey) {
  if (activeQuickView.value === key) {
    clearQuickView();
    return;
  }

  tableFilter.value = buildEmptyFilter();

  nextTick(() => {
    activeQuickView.value = key;
    filterToken++;

    const now = Date.now();
    const base: ExternalFilter = {
      __token: filterToken,
      searchQuery: '',
      statusFilter: 'all',
      priorityFilter: 'all',
      cargoTypeFilter: 'all',
      berthFilter: 'all',
      conflictFilter: 'all',
      teamFilter: 'all',
      etaStart: null,
      etaEnd: null,
      progressMin: null,
      progressMax: null,
      scheduleIds: null,
      maintenanceFilter: 'all',
    };

    switch (key) {
      case 'arriving_6h': {
        const etaStart = new Date(now).toISOString().slice(0, 16);
        const etaEnd = new Date(now + 6 * 3600 * 1000).toISOString().slice(0, 16);
        tableFilter.value = {
          ...base,
          etaStart,
          etaEnd,
        };
        break;
      }
      case 'has_conflict': {
        tableFilter.value = {
          ...base,
          conflictFilter: 'has_conflict',
        };
        break;
      }
      case 'operating': {
        const loadingIds = store.schedules
          .filter((s) => s.status === 'loading' || s.status === 'unloading')
          .map((s) => s.id);
        tableFilter.value = {
          ...base,
          scheduleIds: loadingIds,
        };
        break;
      }
      case 'waiting_departure': {
        const ids = store.schedules
          .filter(
            (s) => s.status === 'berthing' || s.status === 'departing' ||
                   ((s.status === 'loading' || s.status === 'unloading') && s.operationProgress >= 95),
          )
          .map((s) => s.id);
        tableFilter.value = {
          ...base,
          scheduleIds: ids,
        };
        break;
      }
      case 'maintenance_affected': {
        tableFilter.value = {
          ...base,
          maintenanceFilter: 'affected',
        };
        break;
      }
    }
  });
}

function clearQuickView() {
  activeQuickView.value = null;
  tableFilter.value = buildEmptyFilter();
}

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
              @click="router.push('/reports/daily')"
              :class="['px-3 py-1.5 rounded text-xs font-mono font-medium transition-all flex items-center gap-1.5', route.path.startsWith('/reports') ? 'bg-harbor-cyan/15 text-harbor-cyan border border-harbor-cyan/30 shadow-glow-blue' : 'text-console-300 border border-console-500/30 hover:bg-console-700/50 hover:text-console-100']"
            >
              <BarChart3 class="w-3.5 h-3.5" />
              日报
            </button>
            <button
              @click="router.push('/reports/weekly')"
              :class="['px-3 py-1.5 rounded text-xs font-mono font-medium transition-all flex items-center gap-1.5', route.path.startsWith('/reports') ? 'bg-harbor-cyan/15 text-harbor-cyan border border-harbor-cyan/30 shadow-glow-blue' : 'text-console-300 border border-console-500/30 hover:bg-console-700/50 hover:text-console-100']"
            >
              <CalendarDays class="w-3.5 h-3.5" />
              周报
            </button>
            <button
              @click="router.push('/reports/monthly')"
              :class="['px-3 py-1.5 rounded text-xs font-mono font-medium transition-all flex items-center gap-1.5', route.path.startsWith('/reports') ? 'bg-harbor-cyan/15 text-harbor-cyan border border-harbor-cyan/30 shadow-glow-blue' : 'text-console-300 border border-console-500/30 hover:bg-console-700/50 hover:text-console-100']"
            >
              <CalendarRange class="w-3.5 h-3.5" />
              月报
            </button>
            <button
              @click="router.push('/reports/trends')"
              :class="['px-3 py-1.5 rounded text-xs font-mono font-medium transition-all flex items-center gap-1.5', route.path.startsWith('/reports') ? 'bg-harbor-cyan/15 text-harbor-cyan border border-harbor-cyan/30 shadow-glow-blue' : 'text-console-300 border border-console-500/30 hover:bg-console-700/50 hover:text-console-100']"
            >
              <TrendingUp class="w-3.5 h-3.5" />
              趋势
            </button>
            <button
              @click="router.push('/reports/export')"
              :class="['px-3 py-1.5 rounded text-xs font-mono font-medium transition-all flex items-center gap-1.5', route.path.startsWith('/reports') ? 'bg-harbor-cyan/15 text-harbor-cyan border border-harbor-cyan/30 shadow-glow-blue' : 'text-console-300 border border-console-500/30 hover:bg-console-700/50 hover:text-console-100']"
            >
              <Download class="w-3.5 h-3.5" />
              导出
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

          <div class="flex items-center gap-2 pl-2 border-l border-console-500/30 relative">
            <button
              @click="showMaintenanceManager = true"
              class="w-9 h-9 rounded-lg bg-harbor-orange/15 border border-harbor-orange/30 flex items-center justify-center text-harbor-orange hover:bg-harbor-orange/25 transition-all"
              title="泊位维护排程"
            >
              <Wrench class="w-4 h-4" />
            </button>
            <button
              @click="showHandoverDialog = true"
              class="w-9 h-9 rounded-lg bg-harbor-blue/15 border border-harbor-blue/30 flex items-center justify-center text-harbor-blue hover:bg-harbor-blue/25 transition-all"
              title="值班交接"
            >
              <Handshake class="w-4 h-4" />
            </button>
            <button
              class="flex items-center gap-2 hover:bg-console-700/40 rounded-lg px-2 py-1 transition-colors"
              @click="showOperatorMenu = !showOperatorMenu"
            >
              <div class="w-8 h-8 rounded-full bg-gradient-to-br from-harbor-orange to-harbor-red flex items-center justify-center">
                <User class="w-4 h-4 text-white" />
              </div>
              <div class="text-left">
                <p class="text-xs font-mono font-medium text-console-100">{{ authStore.currentUser?.displayName || store.currentOperator }}</p>
                <p class="text-[9px] font-mono text-console-400">{{ authStore.currentUser ? USER_ROLE_LABELS[authStore.currentUser.role] : '调度员' }}</p>
              </div>
              <ChevronDown class="w-3 h-3 text-console-400" />
            </button>

            <Teleport to="body">
              <Transition name="fade">
                <div
                  v-if="showOperatorMenu"
                  class="fixed z-50"
                  style="right: 24px; top: 64px;"
                  @click.self="showOperatorMenu = false"
                >
                  <div class="absolute inset-0" @click="showOperatorMenu = false" />
                  <div class="relative w-56 panel-border rounded-xl shadow-2xl overflow-hidden">
                    <div class="px-4 py-3 border-b border-console-500/20">
                      <p class="text-xs font-mono font-semibold text-console-100">{{ authStore.currentUser?.displayName || store.currentOperator }}</p>
                      <p class="text-[10px] font-mono text-console-400">{{ authStore.currentUser ? USER_ROLE_LABELS[authStore.currentUser.role] : '调度员' }}</p>
                    </div>
                    <div class="py-1">
                      <button
                        @click="showHandoverSummary = true; showOperatorMenu = false;"
                        class="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-mono text-console-200 hover:bg-console-700/50 hover:text-console-100 transition-all"
                      >
                        <Handshake class="w-3.5 h-3.5 text-harbor-blue" />
                        最近交接摘要
                      </button>
                      <button
                        @click="showHandoverDialog = true; showOperatorMenu = false;"
                        class="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-mono text-console-200 hover:bg-console-700/50 hover:text-console-100 transition-all"
                      >
                        <Handshake class="w-3.5 h-3.5 text-harbor-cyan" />
                        发起值班交接
                      </button>
                    </div>
                  </div>
                </div>
              </Transition>
            </Teleport>
          </div>
        </div>
      </div>
    </header>

    <main class="p-4 space-y-4">
      <StatsCards @card-click="onStatCardClick" />

      <div class="panel-border rounded-lg p-3 bg-console-800/30">
        <div class="flex items-center justify-between gap-3 mb-2">
          <div class="flex items-center gap-2">
            <Zap class="w-4 h-4 text-harbor-cyan" />
            <h3 class="font-mono text-xs font-semibold text-console-200 tracking-wide">
              高频场景快捷视图
            </h3>
            <span class="text-[10px] font-mono text-console-500">
              点击切换，再次点击取消筛选
            </span>
          </div>
          <button
            v-if="activeQuickView"
            @click="clearQuickView"
            class="flex items-center gap-1 px-2 py-1 text-[10px] font-mono text-console-400 border border-console-500/40 rounded hover:text-harbor-cyan hover:border-harbor-cyan/50 transition-all"
          >
            <X class="w-3 h-3" />
            清除筛选
          </button>
        </div>
        <div class="grid grid-cols-5 gap-2">
          <button
            v-for="view in QUICK_VIEWS"
            :key="view.key"
            @click="applyQuickView(view.key)"
            :class="[
              'flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border transition-all group',
              activeQuickView === view.key
                ? `${view.activeBgClass} ${view.activeBorderClass} shadow-lg`
                : `${view.bgClass} ${view.borderClass} hover:brightness-110`,
            ]"
          >
            <div class="flex items-center gap-2 min-w-0">
              <component
                :is="view.icon"
                :class="[
                  'w-4 h-4 flex-shrink-0',
                  activeQuickView === view.key ? view.colorClass : `${view.colorClass}/80 group-hover:${view.colorClass}`,
                ]"
              />
              <span
                :class="[
                  'text-xs font-mono font-medium truncate',
                  activeQuickView === view.key ? view.colorClass : 'text-console-200',
                ]"
              >
                {{ view.label }}
              </span>
            </div>
            <span
              :class="[
                'min-w-[22px] h-[22px] px-1.5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold flex-shrink-0',
                activeQuickView === view.key
                  ? `${view.colorClass} bg-console-900/50 border ${view.borderClass}`
                  : `${view.colorClass} bg-console-900/30 border ${view.borderClass}/60`,
              ]"
            >
              {{ getQuickViewCount(view.key) }}
            </span>
          </button>
        </div>
      </div>

      <div class="grid grid-cols-12 gap-4">
        <div class="col-span-8 space-y-4">
          <BerthTimeline :external-filter="tableFilter" />
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

    <HandoverDialog
      :visible="showHandoverDialog"
      @close="showHandoverDialog = false"
    />

    <HandoverSummary
      :visible="showHandoverSummary"
      @close="showHandoverSummary = false"
    />

    <BerthMaintenanceManager
      :visible="showMaintenanceManager"
      @close="showMaintenanceManager = false"
    />
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
