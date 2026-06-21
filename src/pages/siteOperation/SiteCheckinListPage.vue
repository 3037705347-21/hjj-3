<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useScheduleStore } from '../../stores/schedule';
import { useAuthStore } from '../../stores/auth';
import { useSiteCheckinStore } from '../../stores/siteCheckin';
import {
  Anchor,
  History,
  User,
  RefreshCw,
  Settings,
  Bell,
  Shield,
  Users,
  Database,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Handshake,
  ChevronDown,
  ClipboardList,
  Plus,
} from 'lucide-vue-next';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import HandoverDialog from '../../components/handover/HandoverDialog.vue';
import HandoverSummary from '../../components/handover/HandoverSummary.vue';
import SiteCheckinListTable from '../../components/siteOperation/SiteCheckinListTable.vue';
import AbnormalReportModal from '../../components/siteOperation/AbnormalReportModal.vue';

const router = useRouter();
const store = useScheduleStore();
const authStore = useAuthStore();
const siteCheckinStore = useSiteCheckinStore();

const currentTime = ref(new Date());
const showAbnormalModal = ref(false);
const selectedCheckinId = ref<string | null>(null);
const showHandoverDialog = ref(false);
const showHandoverSummary = ref(false);
const showOperatorMenu = ref(false);

onMounted(() => {
  setInterval(() => {
    currentTime.value = new Date();
  }, 1000);
});

function handleReportAbnormal(checkinId: string) {
  selectedCheckinId.value = checkinId;
  showAbnormalModal.value = true;
}

function handleAbnormalSubmitted(checkinId: string) {
  console.log('Abnormal reported for:', checkinId);
}

function goToOperation(checkinId: string) {
  router.push(`/site-operation/confirm/${checkinId}`);
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
              class="px-3 py-1.5 rounded text-xs font-mono font-medium text-console-300 border border-console-500/30 hover:bg-console-700/50 hover:text-console-100 transition-all flex items-center gap-1.5"
            >
              <Database class="w-3.5 h-3.5" />
              外部船期接入
            </button>
            <button
              class="px-3 py-1.5 rounded text-xs font-mono font-medium bg-harbor-orange/15 text-harbor-orange border border-harbor-orange/30 shadow-glow-orange flex items-center gap-1.5"
            >
              <ClipboardList class="w-3.5 h-3.5" />
              现场作业签到
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

          <div class="flex items-center gap-2 pl-2 border-l border-console-500/30 relative">
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
                <p class="text-xs font-mono font-medium text-console-100">
                  {{ authStore.currentUser?.displayName || store.currentOperator }}
                </p>
                <p class="text-[9px] font-mono text-console-400">
                  {{ authStore.currentUser ? USER_ROLE_LABELS[authStore.currentUser.role] : '调度员' }}
                </p>
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
                      <p class="text-xs font-mono font-semibold text-console-100">
                        {{ authStore.currentUser?.displayName || store.currentOperator }}
                      </p>
                      <p class="text-[9px] font-mono text-console-400">
                        {{ authStore.currentUser ? USER_ROLE_LABELS[authStore.currentUser.role] : '调度员' }}
                      </p>
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
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <ClipboardList class="w-5 h-5 text-harbor-orange" />
          <h2 class="font-mono text-lg font-bold text-console-100">现场作业签到与确认</h2>
          <span
            v-if="siteCheckinStore.abnormalRecords.length > 0"
            class="px-2 py-0.5 rounded-full bg-harbor-red/20 text-harbor-red text-xs font-mono font-medium border border-harbor-red/40 animate-pulse"
          >
            {{ siteCheckinStore.abnormalRecords.length }} 条异常待处理
          </span>
        </div>
      </div>

      <div class="grid grid-cols-4 gap-3">
        <div
          v-for="card in siteCheckinStore.statsCards"
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
            class="w-9 h-9 rounded-lg flex items-center justify-center bg-console-800/50 border border-console-500/50"
          >
            <component
              :is="
                card.label === '作业中'
                  ? CheckCircle2
                  : card.label === '异常'
                    ? AlertTriangle
                    : Clock
              "
              :class="['w-4 h-4', card.color]"
            />
          </div>
        </div>
      </div>

      <SiteCheckinListTable @report-abnormal="handleReportAbnormal" />
    </main>

    <AbnormalReportModal
      :visible="showAbnormalModal"
      :checkin-id="selectedCheckinId"
      @close="showAbnormalModal = false"
      @submitted="handleAbnormalSubmitted"
    />

    <HandoverDialog
      :visible="showHandoverDialog"
      @close="showHandoverDialog = false"
    />

    <HandoverSummary
      :visible="showHandoverSummary"
      @close="showHandoverSummary = false"
    />
  </div>
</template>

<script lang="ts">
import { USER_ROLE_LABELS } from '../../types';
</script>

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
