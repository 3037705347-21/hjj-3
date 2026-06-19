<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useScheduleStore } from '../../stores/schedule';
import { useAuthStore } from '../../stores/auth';
import { useIncidentStore } from '../../stores/incident';
import { USER_ROLE_LABELS } from '../../types';
import IncidentListTable from '../../components/incident/IncidentListTable.vue';
import IncidentCreateModal from '../../components/incident/IncidentCreateModal.vue';
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
  AlertTriangle,
  Clock,
  Activity,
} from 'lucide-vue-next';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const store = useScheduleStore();
const authStore = useAuthStore();
const incidentStore = useIncidentStore();
const router = useRouter();

const currentTime = ref(new Date());
const showCreateModal = ref(false);

onMounted(() => {
  setInterval(() => {
    currentTime.value = new Date();
  }, 1000);
});

const statsCards = computed(() => [
  {
    label: '进行中事件',
    value: incidentStore.activeIncidents.length,
    color: 'text-harbor-red',
    bgClass: 'bg-harbor-red/15',
    borderClass: 'border-harbor-red/30',
    icon: AlertTriangle,
  },
  {
    label: '特别重大',
    value: incidentStore.criticalIncidents.length,
    color: 'text-harbor-orange',
    bgClass: 'bg-harbor-orange/15',
    borderClass: 'border-harbor-orange/30',
    icon: Activity,
  },
  {
    label: '今日上报',
    value: incidentStore.filterIncidents().filter((i) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return new Date(i.createdAt) >= today;
    }).length,
    color: 'text-harbor-yellow',
    bgClass: 'bg-harbor-yellow/15',
    borderClass: 'border-harbor-yellow/30',
    icon: Clock,
  },
  {
    label: '累计事件',
    value: incidentStore.incidents.length,
    color: 'text-harbor-cyan',
    bgClass: 'bg-harbor-cyan/15',
    borderClass: 'border-harbor-cyan/30',
    icon: AlertTriangle,
  },
]);

function viewDetail(id: string) {
  router.push(`/incidents/${id}`);
}

function handleCreated(incidentId: string) {
  router.push(`/incidents/${incidentId}`);
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
              class="px-3 py-1.5 rounded text-xs font-mono font-medium bg-harbor-red/15 text-harbor-red border border-harbor-red/30 shadow-glow-red flex items-center gap-1.5"
            >
              <AlertTriangle class="w-3.5 h-3.5" />
              异常事件
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
            <span
              v-if="incidentStore.openIncidentCount > 0"
              class="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-harbor-red text-white text-[9px] font-mono font-bold flex items-center justify-center animate-pulse-red"
            >
              {{ incidentStore.openIncidentCount }}
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
          <AlertTriangle class="w-5 h-5 text-harbor-red" />
          <h2 class="font-mono text-lg font-bold text-console-100">异常事件与应急处置</h2>
          <span
            v-if="incidentStore.openIncidentCount > 0"
            class="px-2 py-0.5 rounded-full bg-harbor-red/20 text-harbor-red text-xs font-mono font-medium border border-harbor-red/40 animate-pulse"
          >
            {{ incidentStore.openIncidentCount }} 件进行中
          </span>
        </div>
        <button
          class="px-4 py-1.5 rounded text-xs font-mono font-medium bg-harbor-red/20 text-harbor-red border border-harbor-red/30 hover:bg-harbor-red/30 transition-all flex items-center gap-1.5"
          @click="showCreateModal = true"
        >
          <Plus class="w-3.5 h-3.5" />
          事件上报
        </button>
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

      <IncidentListTable @view-detail="viewDetail" />
    </main>

    <IncidentCreateModal
      :visible="showCreateModal"
      @close="showCreateModal = false"
      @submitted="handleCreated"
    />
  </div>
</template>
