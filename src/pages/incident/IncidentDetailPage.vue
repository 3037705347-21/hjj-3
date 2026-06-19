<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useScheduleStore } from '../../stores/schedule';
import { useAuthStore } from '../../stores/auth';
import { useIncidentStore } from '../../stores/incident';
import {
  USER_ROLE_LABELS,
} from '../../types';
import type { IncidentStatus } from '../../types';
import IncidentStatusBadge from '../../components/incident/IncidentStatusBadge.vue';
import AffectedScopePanel from '../../components/incident/AffectedScopePanel.vue';
import IncidentRecordTimeline from '../../components/incident/IncidentRecordTimeline.vue';
import {
  Anchor,
  History,
  User,
  RefreshCw,
  Settings,
  Bell,
  ArrowLeft,
  AlertTriangle,
  Clock,
  User as UserIcon,
  MapPin,
  FileText,
  CheckCircle2,
  XCircle,
  Send,
  Edit3,
  MessageSquare,
  Users as UsersIcon,
  Search,
} from 'lucide-vue-next';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const store = useScheduleStore();
const authStore = useAuthStore();
const incidentStore = useIncidentStore();
const router = useRouter();
const route = useRoute();

const currentTime = ref(new Date());
const showStatusActions = ref(false);
const showAssignHandler = ref(false);
const newHandler = ref('');
const showReviewConclusion = ref(false);
const reviewConclusionText = ref('');
const delayHours = ref(2);

onMounted(() => {
  setInterval(() => {
    currentTime.value = new Date();
  }, 1000);
});

const incidentId = computed(() => route.params.id as string);
const incident = computed(() => incidentStore.getIncidentById(incidentId.value));

const canEdit = computed(() => {
  if (!incident.value) return false;
  return incident.value.status !== 'closed';
});

interface StatusAction {
  status: IncidentStatus;
  label: string;
  icon: typeof Search;
}

const statusActions = computed<StatusAction[]>(() => {
  if (!incident.value) return [];
  const current = incident.value.status;
  const actions: StatusAction[] = [];

  if (current === 'reported') {
    actions.push({ status: 'investigating', label: '开始调查', icon: Search });
    actions.push({ status: 'handling', label: '开始处置', icon: Send });
  }
  if (current === 'investigating') {
    actions.push({ status: 'handling', label: '开始处置', icon: Send });
    actions.push({ status: 'resolved', label: '事件解决', icon: CheckCircle2 });
  }
  if (current === 'handling') {
    actions.push({ status: 'resolved', label: '事件解决', icon: CheckCircle2 });
  }
  if (current === 'resolved') {
    actions.push({ status: 'closed', label: '关闭事件', icon: XCircle });
  }

  return actions;
});

function formatDateTime(date?: Date | string): string {
  if (!date) return '-';
  return format(new Date(date), 'yyyy-MM-dd HH:mm', { locale: zhCN });
}

function changeStatus(status: IncidentStatus) {
  incidentStore.updateIncidentStatus(incidentId.value, status);
  showStatusActions.value = false;
}

function assignHandler() {
  if (!newHandler.value.trim()) return;
  incidentStore.assignHandler(incidentId.value, newHandler.value.trim());
  newHandler.value = '';
  showAssignHandler.value = false;
}

function submitReviewConclusion() {
  if (!reviewConclusionText.value.trim()) return;
  incidentStore.updateReviewConclusion(incidentId.value, reviewConclusionText.value.trim());
  showReviewConclusion.value = false;
}

function batchUpdateETD() {
  incidentStore.batchUpdateScheduleETD(incidentId.value, delayHours.value);
}

function goBack() {
  router.push('/incidents');
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
              @click="router.push('/incidents')"
              class="px-3 py-1.5 rounded text-xs font-mono font-medium bg-harbor-red/15 text-harbor-red border border-harbor-red/30 shadow-glow-red flex items-center gap-1.5"
            >
              <AlertTriangle class="w-3.5 h-3.5" />
              异常事件
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

    <main class="p-4 space-y-4" v-if="incident">
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
              <AlertTriangle
                v-if="incident.severity === 'critical'"
                class="w-5 h-5 text-harbor-red animate-pulse"
              />
              <h2 class="font-mono text-lg font-bold text-console-100">
                {{ incident.title }}
              </h2>
            </div>
            <div class="flex items-center gap-3 mt-1">
              <span class="text-xs font-mono text-harbor-cyan">{{ incident.incidentNo }}</span>
              <IncidentStatusBadge type="type" :incident-type="incident.type" size="sm" />
              <IncidentStatusBadge type="severity" :severity="incident.severity" size="sm" />
              <IncidentStatusBadge type="status" :status="incident.status" size="sm" />
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <div class="relative" v-if="canEdit">
            <button
              @click="showStatusActions = !showStatusActions"
              class="px-3 py-1.5 rounded text-xs font-mono bg-harbor-cyan/20 text-harbor-cyan border border-harbor-cyan/30 hover:bg-harbor-cyan/30 transition-all flex items-center gap-1.5"
            >
              <Edit3 class="w-3 h-3" />
              状态变更
            </button>
            <div
              v-if="showStatusActions"
              class="absolute right-0 top-full mt-1 w-40 rounded-lg bg-console-800 border border-console-500/30 shadow-xl z-10 overflow-hidden"
            >
              <button
                v-for="action in statusActions"
                :key="action.status"
                @click="changeStatus(action.status)"
                class="w-full px-3 py-2 text-left text-xs font-mono text-console-200 hover:bg-console-700/50 flex items-center gap-2 transition-colors"
              >
                <component :is="action.icon" class="w-3.5 h-3.5" />
                {{ action.label }}
              </button>
            </div>
          </div>

          <button
            v-if="canEdit"
            @click="showAssignHandler = !showAssignHandler"
            class="px-3 py-1.5 rounded text-xs font-mono text-console-300 border border-console-500/30 hover:bg-console-700/50 hover:text-console-100 transition-all flex items-center gap-1.5"
          >
            <UserIcon class="w-3 h-3" />
            指派处置人
          </button>

          <button
            v-if="incident.status === 'resolved' && !incident.reviewConclusion"
            @click="showReviewConclusion = true"
            class="px-3 py-1.5 rounded text-xs font-mono text-harbor-yellow border border-harbor-yellow/30 hover:bg-harbor-yellow/10 transition-all flex items-center gap-1.5"
          >
            <FileText class="w-3 h-3" />
            填写复盘
          </button>
        </div>
      </div>

      <div class="grid grid-cols-3 gap-4">
        <div class="col-span-2 space-y-4">
          <div class="panel-border rounded-lg p-4 bg-console-800/20">
            <h3 class="text-xs font-mono font-medium text-console-200 mb-3 flex items-center gap-2">
              <FileText class="w-4 h-4 text-harbor-cyan" />
              事件描述
            </h3>
            <p class="text-sm text-console-300 leading-relaxed">
              {{ incident.description }}
            </p>
          </div>

          <div class="panel-border rounded-lg overflow-hidden">
            <div class="px-4 py-3 border-b border-console-500/20 bg-console-800/30">
              <h3 class="text-xs font-mono font-medium text-console-200 flex items-center gap-2">
                <MapPin class="w-4 h-4 text-harbor-cyan" />
                影响范围看板
              </h3>
            </div>
            <div class="p-4">
              <AffectedScopePanel
                :affected-schedules="incident.affectedSchedules"
                :affected-berth-ids="incident.affectedBerthIds"
                :affected-ship-ids="incident.affectedShipIds"
              />
            </div>
          </div>

          <div
            v-if="incident.status === 'handling' || incident.status === 'investigating'"
            class="panel-border rounded-lg p-4 bg-console-800/20"
          >
            <h3 class="text-xs font-mono font-medium text-console-200 mb-3 flex items-center gap-2">
              <Clock class="w-4 h-4 text-harbor-orange" />
              批量操作
            </h3>
            <div class="flex items-center gap-3">
              <span class="text-xs text-console-400">批量延后受影响计划 ETD:</span>
              <input
                v-model.number="delayHours"
                type="number"
                min="1"
                max="72"
                class="w-20 px-2 py-1.5 rounded bg-console-900/60 border border-console-500/30 text-xs font-mono text-console-100 focus:outline-none focus:border-harbor-cyan/50"
              />
              <span class="text-xs text-console-400">小时</span>
              <button
                @click="batchUpdateETD"
                class="px-3 py-1.5 rounded text-xs font-mono bg-harbor-orange/20 text-harbor-orange border border-harbor-orange/30 hover:bg-harbor-orange/30 transition-all"
              >
                应用调整
              </button>
            </div>
          </div>

          <div v-if="incident.reviewConclusion" class="panel-border rounded-lg p-4 bg-harbor-green/5 border-harbor-green/30">
            <h3 class="text-xs font-mono font-medium text-harbor-green mb-2 flex items-center gap-2">
              <CheckCircle2 class="w-4 h-4" />
              复盘结论
            </h3>
            <p class="text-sm text-console-300 leading-relaxed">
              {{ incident.reviewConclusion }}
            </p>
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
                <span class="text-console-500">发生时间</span>
                <span class="text-console-200 font-mono">{{ formatDateTime(incident.occurTime) }}</span>
              </div>
              <div class="flex justify-between text-xs">
                <span class="text-console-500">上报时间</span>
                <span class="text-console-200 font-mono">{{ formatDateTime(incident.reportTime) }}</span>
              </div>
              <div class="flex justify-between text-xs">
                <span class="text-console-500">预计恢复</span>
                <span
                  :class="[
                    'font-mono',
                    incident.expectedRecoveryTime && new Date(incident.expectedRecoveryTime) < new Date()
                      ? 'text-harbor-red'
                      : 'text-console-200',
                  ]"
                >
                  {{ formatDateTime(incident.expectedRecoveryTime) }}
                </span>
              </div>
              <div v-if="incident.actualRecoveryTime" class="flex justify-between text-xs">
                <span class="text-console-500">实际恢复</span>
                <span class="text-harbor-green font-mono">{{ formatDateTime(incident.actualRecoveryTime) }}</span>
              </div>
            </div>
          </div>

          <div class="panel-border rounded-lg p-4 bg-console-800/20">
            <h3 class="text-xs font-mono font-medium text-console-200 mb-3 flex items-center gap-2">
              <UsersIcon class="w-4 h-4 text-harbor-cyan" />
              人员信息
            </h3>
            <div class="space-y-2">
              <div class="flex justify-between text-xs">
                <span class="text-console-500">上报人</span>
                <span class="text-console-200">{{ incident.reporter }}</span>
              </div>
              <div class="flex justify-between text-xs">
                <span class="text-console-500">处置人</span>
                <span :class="incident.handler ? 'text-console-200' : 'text-console-500'">
                  {{ incident.handler || '未指派' }}
                </span>
              </div>
            </div>
          </div>

          <div class="panel-border rounded-lg overflow-hidden">
            <div class="px-4 py-3 border-b border-console-500/20 bg-console-800/30">
              <h3 class="text-xs font-mono font-medium text-console-200 flex items-center gap-2">
                <MessageSquare class="w-4 h-4 text-harbor-cyan" />
                处置记录
              </h3>
            </div>
            <div class="p-4 max-h-96 overflow-y-auto">
              <IncidentRecordTimeline
                :records="incident.records"
                :incident-id="incident.id"
                :can-edit="canEdit"
              />
            </div>
          </div>
        </div>
      </div>
    </main>

    <div v-if="showAssignHandler" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-console-900/80 backdrop-blur-sm" @click="showAssignHandler = false" />
      <div class="relative w-full max-w-md panel-border rounded-xl shadow-2xl z-10">
        <div class="flex items-center justify-between px-5 py-4 border-b border-console-500/20">
          <h3 class="font-mono text-sm font-semibold text-console-100 flex items-center gap-2">
            <UserIcon class="w-4 h-4 text-harbor-cyan" />
            指派处置人
          </h3>
          <button
            @click="showAssignHandler = false"
            class="w-7 h-7 rounded flex items-center justify-center text-console-400 hover:text-console-100 hover:bg-console-700/50 transition-all"
          >
            <XCircle class="w-4 h-4" />
          </button>
        </div>
        <div class="p-5 space-y-4">
          <div>
            <label class="block text-xs font-mono text-console-300 mb-1.5">处置人姓名</label>
            <input
              v-model="newHandler"
              type="text"
              placeholder="请输入处置人姓名"
              class="w-full px-3 py-2 rounded bg-console-800/60 border border-console-500/30 text-xs font-mono text-console-100 placeholder:text-console-500 focus:outline-none focus:border-harbor-cyan/50"
            />
          </div>
          <div class="flex items-center justify-end gap-2">
            <button
              @click="showAssignHandler = false"
              class="px-4 py-1.5 rounded text-xs font-mono text-console-300 border border-console-500/30 hover:bg-console-700/50 transition-all"
            >
              取消
            </button>
            <button
              :disabled="!newHandler.trim()"
              @click="assignHandler"
              class="px-4 py-1.5 rounded text-xs font-mono bg-harbor-cyan/20 text-harbor-cyan border border-harbor-cyan/30 hover:bg-harbor-cyan/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              确认指派
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showReviewConclusion" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-console-900/80 backdrop-blur-sm" @click="showReviewConclusion = false" />
      <div class="relative w-full max-w-lg panel-border rounded-xl shadow-2xl z-10">
        <div class="flex items-center justify-between px-5 py-4 border-b border-console-500/20">
          <h3 class="font-mono text-sm font-semibold text-console-100 flex items-center gap-2">
            <FileText class="w-4 h-4 text-harbor-yellow" />
            填写复盘结论
          </h3>
          <button
            @click="showReviewConclusion = false"
            class="w-7 h-7 rounded flex items-center justify-center text-console-400 hover:text-console-100 hover:bg-console-700/50 transition-all"
          >
            <XCircle class="w-4 h-4" />
          </button>
        </div>
        <div class="p-5 space-y-4">
          <div>
            <label class="block text-xs font-mono text-console-300 mb-1.5">复盘结论</label>
            <textarea
              v-model="reviewConclusionText"
              rows="5"
              placeholder="请输入复盘结论，包括事件原因、经验教训、改进措施等..."
              class="w-full px-3 py-2 rounded bg-console-800/60 border border-console-500/30 text-xs font-mono text-console-100 placeholder:text-console-500 focus:outline-none focus:border-harbor-cyan/50 resize-none"
            />
          </div>
          <div class="flex items-center justify-end gap-2">
            <button
              @click="showReviewConclusion = false"
              class="px-4 py-1.5 rounded text-xs font-mono text-console-300 border border-console-500/30 hover:bg-console-700/50 transition-all"
            >
              取消
            </button>
            <button
              :disabled="!reviewConclusionText.trim()"
              @click="submitReviewConclusion"
              class="px-4 py-1.5 rounded text-xs font-mono bg-harbor-yellow/20 text-harbor-yellow border border-harbor-yellow/30 hover:bg-harbor-yellow/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              提交复盘
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
