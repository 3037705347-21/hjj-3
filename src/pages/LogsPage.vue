<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router';
import { useScheduleStore } from '../stores/schedule';
import { useAuthStore } from '../stores/auth';
import { USER_ROLE_LABELS } from '../types';
import LogPanel from '../components/logs/LogPanel.vue';
import ConflictAlert from '../components/logs/ConflictAlert.vue';
import ShipDetailSidebar from '../components/sidebar/ShipDetailSidebar.vue';
import {
  Anchor,
  LayoutDashboard,
  User,
  RefreshCw,
  Settings,
  Bell,
  AlertTriangle,
  Repeat,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Shield,
  Users,
  ClipboardCheck,
  BarChart3,
  CalendarDays,
  CalendarRange,
  Download,
} from 'lucide-vue-next';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { computed, onMounted, ref } from 'vue';
import { useApprovalStore } from '../stores/approval';

const store = useScheduleStore();
const authStore = useAuthStore();
const approvalStore = useApprovalStore();
const router = useRouter();
const route = useRoute();
const currentTime = ref(new Date());

onMounted(() => {
  setInterval(() => {
    currentTime.value = new Date();
  }, 1000);
});

const conflictCount = computed(() => store.conflicts.filter((c) => c.severity === 'error').length);

const auditStats = computed(() => [
  {
    label: '今日高风险操作',
    value: store.todayHighRiskOperations,
    icon: AlertTriangle,
    color: 'text-harbor-red',
    bgClass: 'bg-harbor-red/15',
    borderClass: 'border-harbor-red/30',
    trend: store.todayHighRiskOperations > 0 ? 'up' : 'down',
  },
  {
    label: '重复修改计划',
    value: store.duplicateScheduleModifications,
    icon: Repeat,
    color: 'text-harbor-orange',
    bgClass: 'bg-harbor-orange/15',
    borderClass: 'border-harbor-orange/30',
    trend: store.duplicateScheduleModifications > 0 ? 'up' : 'down',
  },
  {
    label: '冲突处理闭环率',
    value: store.conflictResolutionRate,
    suffix: '%',
    icon: CheckCircle,
    color: 'text-harbor-green',
    bgClass: 'bg-harbor-green/15',
    borderClass: 'border-harbor-green/30',
    trend: store.conflictResolutionRate >= 80 ? 'up' : 'down',
  },
]);
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
              <LayoutDashboard class="w-3.5 h-3.5" />
              运营控制台
            </button>
            <button
              @click="router.push('/logs')"
              class="px-3 py-1.5 rounded text-xs font-mono font-medium bg-harbor-cyan/15 text-harbor-cyan border border-harbor-cyan/30 shadow-glow-blue"
            >
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

          <button class="relative w-9 h-9 rounded-lg bg-console-800/60 border border-console-500/40 flex items-center justify-center text-console-300 hover:text-harbor-cyan hover:border-harbor-cyan/40 transition-all">
            <Bell class="w-4 h-4" />
            <span
              v-if="conflictCount > 0"
              class="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-harbor-red text-white text-[9px] font-mono font-bold flex items-center justify-center animate-pulse-red"
            >
              {{ conflictCount }}
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

    <main class="p-4">
      <div class="grid grid-cols-12 gap-4" style="height: calc(100vh - 100px)">
        <div class="col-span-8 h-full">
          <LogPanel />
        </div>
        <div class="col-span-4 space-y-4 h-full overflow-auto">
          <ConflictAlert v-if="store.conflicts.length > 0" :conflicts="store.conflicts" />
          
          <div class="panel-border rounded-lg p-4">
            <h3 class="font-mono text-sm font-semibold text-console-100 mb-3 flex items-center gap-2">
              <span class="w-1 h-4 bg-harbor-cyan rounded-full" />
              审计指标
            </h3>
            <div class="space-y-2">
              <div
                v-for="stat in auditStats"
                :key="stat.label"
                :class="[
                  'flex items-center justify-between p-3 rounded-lg border transition-all',
                  stat.bgClass,
                  stat.borderClass,
                ]"
              >
                <div class="flex items-center gap-2">
                  <component :is="stat.icon" :class="['w-4 h-4', stat.color]" />
                  <span class="text-xs font-mono text-console-200">{{ stat.label }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <span :class="['text-sm font-bold font-mono', stat.color]">
                    {{ stat.value }}{{ stat.suffix || '' }}
                  </span>
                  <component
                    :is="stat.trend === 'up' ? TrendingUp : TrendingDown"
                    :class="['w-3 h-3', stat.trend === 'up' ? 'text-harbor-cyan' : 'text-harbor-red']"
                  />
                </div>
              </div>
            </div>
          </div>

          <div class="panel-border rounded-lg p-4">
            <h3 class="font-mono text-sm font-semibold text-console-100 mb-3 flex items-center gap-2">
              <span class="w-1 h-4 bg-harbor-purple rounded-full" />
              日志类型统计
            </h3>
            <div class="space-y-2">
              <div v-for="(label, type) in { create: '创建', update: '更新', status_change: '状态变更', conflict: '冲突', warning: '警告' }" :key="type" class="flex items-center justify-between text-xs font-mono">
                <span class="text-console-300">{{ label }}</span>
                <span class="text-console-100">{{ store.logs.filter(l => l.type === type).length }}</span>
              </div>
            </div>
          </div>
          <div class="panel-border rounded-lg p-4">
            <h3 class="font-mono text-sm font-semibold text-console-100 mb-3 flex items-center gap-2">
              <span class="w-1 h-4 bg-harbor-orange rounded-full" />
              操作人统计
            </h3>
            <div class="space-y-1.5">
              <div
                v-for="op in [...new Set(store.logs.map(l => l.operator))]"
                :key="op"
                class="flex items-center justify-between text-xs font-mono"
              >
                <span class="text-console-300">{{ op }}</span>
                <span class="text-harbor-cyan">{{ store.logs.filter(l => l.operator === op).length }} 条</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <ShipDetailSidebar />
  </div>
</template>
