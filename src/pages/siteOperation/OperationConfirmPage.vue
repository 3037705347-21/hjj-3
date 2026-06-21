<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useScheduleStore } from '../../stores/schedule';
import { useAuthStore } from '../../stores/auth';
import { useSiteCheckinStore } from '../../stores/siteCheckin';
import {
  Anchor, History, User, RefreshCw, Settings, Bell, Shield, Users, Database,
  Clock, CheckCircle2, AlertTriangle, Handshake, ChevronDown, ClipboardCheck,
  MapPin, Users as UsersIcon, ArrowLeft, MessageSquare, Package, Gauge
} from 'lucide-vue-next';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import HandoverDialog from '../../components/handover/HandoverDialog.vue';
import HandoverSummary from '../../components/handover/HandoverSummary.vue';
import AbnormalReportModal from '../../components/siteOperation/AbnormalReportModal.vue';
import {
  SITE_CHECKIN_STATUS_LABELS,
  SITE_CHECKIN_STATUS_COLORS,
  ABNORMAL_CATEGORY_LABELS,
  USER_ROLE_LABELS
} from '../../types';

const route = useRoute();
const router = useRouter();
const store = useScheduleStore();
const authStore = useAuthStore();
const siteCheckinStore = useSiteCheckinStore();

const checkinId = computed(() => route.params.id as string);
const currentTime = ref(new Date());
const showAbnormalModal = ref(false);
const showHandoverDialog = ref(false);
const showHandoverSummary = ref(false);
const showOperatorMenu = ref(false);
const siteRemark = ref('');
const isSubmitting = ref(false);
const handlingNote = ref('');
const handlingAbnormalId = ref<string | null>(null);

onMounted(() => {
  setInterval(() => {
    currentTime.value = new Date();
  }, 1000);
  const record = siteCheckinStore.records.find((r) => r.id === checkinId.value);
  if (record) {
    siteRemark.value = record.siteRemark || '';
  }
});

const checkinRecord = computed(() =>
  siteCheckinStore.records.find((r) => r.id === checkinId.value) || null
);

const schedule = computed(() => {
  if (!checkinRecord.value) return null;
  return store.schedules.find((s) => s.id === checkinRecord.value!.scheduleId) || null;
});

const ship = computed(() => {
  if (!schedule.value) return null;
  return store.getShipById(schedule.value.shipId);
});

const berth = computed(() => {
  if (!schedule.value) return null;
  return store.getBerthById(schedule.value.berthId);
});

const actionLogs = computed(() =>
  siteCheckinStore.getLogsByCheckinId(checkinId.value).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )
);

const unresolvedAbnormals = computed(() => {
  if (!checkinRecord.value) return [];
  return checkinRecord.value.abnormalRecords.filter((a) => !a.handled);
});

const canComplete = computed(() => {
  if (!checkinRecord.value) return false;
  return checkinRecord.value.status === 'in_progress' || checkinRecord.value.status === 'abnormal';
});

function formatTime(date?: Date) {
  if (!date) return '-';
  return format(new Date(date), 'MM-dd HH:mm', { locale: zhCN });
}

function formatFullTime(date?: Date) {
  if (!date) return '-';
  return format(new Date(date), 'yyyy-MM-dd HH:mm:ss', { locale: zhCN });
}

function formatDuration(start?: Date, end?: Date) {
  if (!start || !end) return '-';
  const diffMs = new Date(end).getTime() - new Date(start).getTime();
  const hours = Math.floor(diffMs / 3600000);
  const minutes = Math.floor((diffMs % 3600000) / 60000);
  return `${hours}小时${minutes}分钟`;
}

function getActionIcon(action: string) {
  const iconMap: Record<string, typeof Clock> = {
    checkin: UsersIcon,
    start_work: ClipboardCheck,
    complete_work: CheckCircle2,
    report_abnormal: AlertTriangle,
    handle_abnormal: CheckCircle2,
    add_remark: MessageSquare,
  };
  return iconMap[action] || Clock;
}

function getActionColor(action: string) {
  const colorMap: Record<string, string> = {
    checkin: 'text-harbor-blue',
    start_work: 'text-harbor-cyan',
    complete_work: 'text-harbor-green',
    report_abnormal: 'text-harbor-red',
    handle_abnormal: 'text-harbor-green',
    add_remark: 'text-harbor-orange',
  };
  return colorMap[action] || 'text-console-400';
}

function goBack() {
  router.push('/site-operation');
}

function handleReportAbnormal() {
  showAbnormalModal.value = true;
}

function handleCompleteWork() {
  if (!checkinRecord.value || !canComplete.value) return;
  isSubmitting.value = true;
  try {
    siteCheckinStore.confirmCompleteWork(checkinRecord.value.id, siteRemark.value);
    setTimeout(() => {
      router.push('/site-operation');
    }, 500);
  } finally {
    isSubmitting.value = false;
  }
}

function handleSaveRemark() {
  if (!checkinRecord.value) return;
  siteCheckinStore.updateSiteRemark(checkinRecord.value.id, siteRemark.value);
}

function handleAbnormalSubmitted() {
  console.log('Abnormal reported');
}

function startHandleAbnormal(abnormalId: string) {
  handlingAbnormalId.value = abnormalId;
  handlingNote.value = '';
}

function cancelHandleAbnormal() {
  handlingAbnormalId.value = null;
  handlingNote.value = '';
}

function confirmHandleAbnormal() {
  if (!checkinRecord.value || !handlingAbnormalId.value || !handlingNote.value.trim()) return;
  siteCheckinStore.handleAbnormal(checkinRecord.value.id, handlingAbnormalId.value, handlingNote.value);
  cancelHandleAbnormal();
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
              @click="router.push('/site-operation')"
              class="px-3 py-1.5 rounded text-xs font-mono font-medium bg-harbor-orange/15 text-harbor-orange border border-harbor-orange/30 shadow-glow-orange flex items-center gap-1.5"
            >
              <ClipboardCheck class="w-3.5 h-3.5" />
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
          <button
            @click="goBack"
            class="flex items-center gap-2 px-3 py-1.5 rounded text-xs font-mono text-console-300 border border-console-500/30 hover:bg-console-700/50 hover:text-console-100 transition-all"
          >
            <ArrowLeft class="w-3.5 h-3.5" />
            返回列表
          </button>
          <div class="h-6 w-px bg-console-500/30" />
          <ClipboardCheck class="w-5 h-5 text-harbor-green" />
          <h2 class="font-mono text-lg font-bold text-console-100">作业确认</h2>
        </div>
      </div>

      <div v-if="checkinRecord && schedule && ship && berth" class="grid grid-cols-3 gap-4">
        <div class="col-span-2 space-y-4">
          <div class="panel-border rounded-xl p-4">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-mono text-sm font-semibold text-console-100 flex items-center gap-2">
                <MapPin class="w-4 h-4 text-harbor-cyan" />
                作业信息
              </h3>
              <span
                :class="[
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium border',
                  SITE_CHECKIN_STATUS_COLORS[checkinRecord.status].bg,
                  SITE_CHECKIN_STATUS_COLORS[checkinRecord.status].text,
                  SITE_CHECKIN_STATUS_COLORS[checkinRecord.status].border,
                ]"
              >
                {{ SITE_CHECKIN_STATUS_LABELS[checkinRecord.status] }}
              </span>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-3">
                <div class="flex items-start gap-2">
                  <MapPin class="w-3.5 h-3.5 text-console-400 mt-0.5" />
                  <div>
                    <p class="text-[9px] font-mono text-console-400 uppercase tracking-wider">船舶</p>
                    <p class="text-xs font-mono font-medium text-console-100">{{ ship.name }}</p>
                  </div>
                </div>
                <div class="flex items-start gap-2">
                  <MapPin class="w-3.5 h-3.5 text-console-400 mt-0.5" />
                  <div>
                    <p class="text-[9px] font-mono text-console-400 uppercase tracking-wider">泊位</p>
                    <p class="text-xs font-mono font-medium text-console-100">{{ berth.name }}</p>
                  </div>
                </div>
                <div class="flex items-start gap-2">
                  <Package class="w-3.5 h-3.5 text-harbor-cyan mt-0.5" />
                  <div>
                    <p class="text-[9px] font-mono text-console-400 uppercase tracking-wider">货种</p>
                    <p class="text-xs font-mono font-medium text-console-100">{{ ship.cargoType }}</p>
                  </div>
                </div>
                <div class="flex items-start gap-2">
                  <Gauge class="w-3.5 h-3.5 text-harbor-orange mt-0.5" />
                  <div>
                    <p class="text-[9px] font-mono text-console-400 uppercase tracking-wider">作业进度</p>
                    <p class="text-xs font-mono font-medium text-console-100">{{ schedule.operationProgress }}%</p>
                  </div>
                </div>
              </div>
              <div class="space-y-3">
                <div class="flex items-start gap-2">
                  <UsersIcon class="w-3.5 h-3.5 text-harbor-cyan mt-0.5" />
                  <div>
                    <p class="text-[9px] font-mono text-console-400 uppercase tracking-wider">作业班组</p>
                    <p class="text-xs font-mono font-medium text-console-100">{{ siteCheckinStore.getTeamNameForRecord(checkinRecord) }}</p>
                  </div>
                </div>
                <div class="flex items-start gap-2">
                  <Clock class="w-3.5 h-3.5 text-harbor-blue mt-0.5" />
                  <div>
                    <p class="text-[9px] font-mono text-console-400 uppercase tracking-wider">签到时间</p>
                    <p class="text-xs font-mono font-medium text-console-100">{{ formatTime(checkinRecord.checkinTime) }}</p>
                  </div>
                </div>
                <div class="flex items-start gap-2">
                  <Clock class="w-3.5 h-3.5 text-harbor-cyan mt-0.5" />
                  <div>
                    <p class="text-[9px] font-mono text-console-400 uppercase tracking-wider">开工时间</p>
                    <p class="text-xs font-mono font-medium text-console-100">{{ formatTime(checkinRecord.startTime) }}</p>
                  </div>
                </div>
                <div class="flex items-start gap-2">
                  <User class="w-3.5 h-3.5 text-console-400 mt-0.5" />
                  <div>
                    <p class="text-[9px] font-mono text-console-400 uppercase tracking-wider">确认人</p>
                    <p class="text-xs font-mono font-medium text-console-100">{{ checkinRecord.confirmedBy || '-' }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-if="unresolvedAbnormals.length > 0" class="panel-border rounded-xl p-4 bg-harbor-red/5">
            <div class="flex items-center gap-2 mb-3">
              <AlertTriangle class="w-4 h-4 text-harbor-red" />
              <h3 class="font-mono text-sm font-semibold text-harbor-red">待处理异常</h3>
            </div>
            <div class="space-y-2">
              <div
                v-for="abnormal in unresolvedAbnormals"
                :key="abnormal.id"
                class="p-3 rounded-lg bg-console-800/60 border border-harbor-red/30"
              >
                <div class="flex items-start justify-between mb-1">
                  <span class="text-[10px] font-mono font-medium text-harbor-red">
                    {{ ABNORMAL_CATEGORY_LABELS[abnormal.category] }}
                  </span>
                  <span class="text-[9px] font-mono text-console-500">{{ formatTime(abnormal.reportedAt) }}</span>
                </div>
                <p class="text-xs font-mono text-console-200 mb-2">{{ abnormal.description }}</p>
                <p class="text-[10px] font-mono text-console-400">上报人：{{ abnormal.reportedBy }}</p>
                <template v-if="handlingAbnormalId === abnormal.id">
                  <div class="mt-2 pt-2 border-t border-console-500/20">
                    <input
                      v-model="handlingNote"
                      type="text"
                      placeholder="输入处理方案..."
                      class="w-full px-2 py-1 text-[10px] font-mono bg-console-700/60 border border-console-500/30 rounded text-console-100 placeholder:text-console-500 focus:outline-none focus:border-harbor-green/50"
                      @keyup.enter="confirmHandleAbnormal"
                    />
                    <div class="flex gap-2 mt-2">
                      <button
                        @click="confirmHandleAbnormal"
                        :disabled="!handlingNote.trim()"
                        class="flex-1 px-2 py-1 text-[10px] font-mono bg-harbor-green/20 text-harbor-green border border-harbor-green/30 hover:bg-harbor-green/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        确认处理
                      </button>
                      <button
                        @click="cancelHandleAbnormal"
                        class="flex-1 px-2 py-1 text-[10px] font-mono bg-console-600/20 text-console-300 border border-console-500/30 hover:bg-console-600/30 transition-all"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                </template>
                <template v-else>
                  <button
                    @click="startHandleAbnormal(abnormal.id)"
                    class="mt-2 w-full px-2 py-1 text-[10px] font-mono bg-harbor-cyan/15 text-harbor-cyan border border-harbor-cyan/30 hover:bg-harbor-cyan/25 transition-all"
                  >
                    处理异常
                  </button>
                </template>
              </div>
            </div>
          </div>

          <div class="panel-border rounded-xl p-4">
            <div class="flex items-center gap-2 mb-3">
              <MessageSquare class="w-4 h-4 text-harbor-orange" />
              <h3 class="font-mono text-sm font-semibold text-console-100">现场备注</h3>
            </div>
            <textarea
              v-model="siteRemark"
              @blur="handleSaveRemark"
              rows="4"
              placeholder="输入现场作业备注..."
              class="w-full px-3 py-2 text-xs font-mono bg-console-800/80 border border-console-500/40 rounded text-console-100 placeholder:text-console-500 focus:outline-none focus:border-harbor-cyan/50 resize-none"
            />
          </div>

          <div class="panel-border rounded-xl p-4">
            <div class="flex items-center gap-2 mb-3">
              <History class="w-4 h-4 text-console-400" />
              <h3 class="font-mono text-sm font-semibold text-console-100">操作日志</h3>
            </div>
            <div class="relative">
              <div class="absolute left-3 top-3 bottom-3 w-0.5 bg-console-600/50" />
              <div class="space-y-3 max-h-64 overflow-y-auto">
                <div
                  v-for="log in actionLogs"
                  :key="log.id"
                  class="relative flex items-start gap-3 pl-1"
                >
                  <div
                    class="relative z-10 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-console-700 border border-console-500/50"
                  >
                    <component :is="getActionIcon(log.action)" class="w-3 h-3" :class="getActionColor(log.action)" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between">
                      <span class="text-xs font-mono font-medium text-console-100">{{ log.description }}</span>
                      <span class="text-[9px] font-mono text-console-500">{{ formatFullTime(log.timestamp) }}</span>
                    </div>
                    <p class="text-[10px] font-mono text-console-400 mt-0.5">操作人：{{ log.operator }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="space-y-4">
          <div class="panel-border rounded-xl p-4">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-mono text-sm font-semibold text-console-100 flex items-center gap-2">
                <Gauge class="w-4 h-4 text-harbor-orange" />
                作业进度
              </h3>
            </div>
            <div class="mb-4">
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-mono text-console-200">当前进度</span>
                <span class="text-lg font-mono font-bold text-harbor-cyan glow-text-cyan">
                  {{ schedule.operationProgress }}%
                </span>
              </div>
              <div class="relative w-full h-4 bg-console-700 rounded-full overflow-hidden border border-console-500/50">
                <div
                  class="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                  :class="{
                    'bg-gradient-to-r from-harbor-cyan to-harbor-cyan/60': schedule.operationProgress < 70,
                    'bg-gradient-to-r from-harbor-yellow to-harbor-orange': schedule.operationProgress >= 70 && schedule.operationProgress < 100,
                    'bg-gradient-to-r from-harbor-cyan to-harbor-cyan': schedule.operationProgress >= 100,
                  }"
                  :style="{ width: schedule.operationProgress + '%' }"
                />
              </div>
            </div>
            <div v-if="schedule.milestones" class="mt-4">
              <div class="flex items-center justify-between mb-2">
                <h4 class="text-[10px] font-mono text-console-400 uppercase tracking-wider">里程碑</h4>
              </div>
              <div class="space-y-2">
                <div
                  v-for="milestone in schedule.milestones"
                  :key="milestone.key"
                  class="flex items-center gap-2"
                >
                  <div
                    class="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                    :class="{
                      'bg-harbor-cyan text-console-900': milestone.completed,
                      'bg-console-700 text-console-500': !milestone.completed,
                    }"
                  >
                    <component :is="milestone.completed ? CheckCircle2 : Clock" class="w-2.5 h-2.5" />
                  </div>
                  <span class="text-[11px] font-mono text-console-200 flex-1">{{ milestone.label }}</span>
                  <span class="text-[10px] font-mono text-console-500">{{ milestone.progressWeight }}%</span>
                </div>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <button
              @click="handleReportAbnormal"
              class="px-4 py-3 rounded-lg text-xs font-mono bg-harbor-red/20 text-harbor-red border border-harbor-red/30 hover:bg-harbor-red/30 transition-all flex items-center justify-center gap-2"
            >
              <AlertTriangle class="w-4 h-4" />
              登记异常
            </button>
            <button
              @click="handleCompleteWork"
              :disabled="!canComplete || isSubmitting"
              class="px-4 py-3 rounded-lg text-xs font-mono font-medium bg-harbor-green/20 text-harbor-green border border-harbor-green/30 hover:bg-harbor-green/30 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <CheckCircle2 class="w-4 h-4" />
              {{ isSubmitting ? '确认中...' : '确认完工' }}
            </button>
          </div>

          <div v-if="!canComplete" class="p-3 rounded-lg bg-harbor-yellow/10 border border-harbor-yellow/30">
            <div class="flex items-start gap-2">
              <AlertTriangle class="w-3.5 h-3.5 text-harbor-yellow mt-0.5 flex-shrink-0" />
              <p class="text-[10px] font-mono text-harbor-yellow">
                {{ checkinRecord?.status === 'completed' ? '该作业已确认完工' : '当前状态不允许确认完工' }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="panel-border rounded-xl p-12 text-center">
        <AlertTriangle class="w-12 h-12 text-console-500 mx-auto mb-3" />
        <p class="text-xs font-mono text-console-400">未找到签到记录</p>
      </div>
    </main>

    <AbnormalReportModal
      :visible="showAbnormalModal"
      :checkin-id="checkinId"
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
