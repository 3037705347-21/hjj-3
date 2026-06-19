<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useScheduleStore } from '../../stores/schedule';
import { useAuthStore } from '../../stores/auth';
import { useApprovalStore } from '../../stores/approval';
import {
  USER_ROLE_LABELS,
  APPROVAL_TYPE_LABELS,
  APPROVAL_STATUS_LABELS,
} from '../../types';
import ApprovalStatusBadge from '../../components/approval/ApprovalStatusBadge.vue';
import ApprovalRecordTimeline from '../../components/approval/ApprovalRecordTimeline.vue';
import ShipDetailSidebar from '../../components/sidebar/ShipDetailSidebar.vue';
import {
  Anchor,
  History,
  User,
  RefreshCw,
  Settings,
  Bell,
  Shield,
  Users,
  ArrowLeft,
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  Ban,
  FileText,
  Ship,
  MapPin,
} from 'lucide-vue-next';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const store = useScheduleStore();
const authStore = useAuthStore();
const approvalStore = useApprovalStore();
const router = useRouter();
const route = useRoute();

const currentTime = ref(new Date());
const approvalOpinion = ref('');
const processing = ref(false);

onMounted(() => {
  setInterval(() => {
    currentTime.value = new Date();
  }, 1000);
});

const orderId = computed(() => route.params.id as string);
const order = computed(() => approvalStore.getOrderById(orderId.value));

const schedule = computed(() => {
  if (!order.value) return null;
  return store.schedules.find((s) => s.id === order.value!.scheduleId) || null;
});

const ship = computed(() => {
  if (!schedule.value) return null;
  return store.getShipById(schedule.value.shipId) || null;
});

const berth = computed(() => {
  if (!schedule.value) return null;
  return store.getBerthById(schedule.value.berthId) || null;
});

const conflictCount = computed(() => store.conflicts.filter((c) => c.severity === 'error').length);

const canApprove = computed(() => {
  if (!order.value || order.value.status !== 'pending') return false;
  return authStore.isAdmin || authStore.isDutyChief;
});

const canCancel = computed(() => {
  if (!order.value || order.value.status !== 'pending') return false;
  return order.value.initiatorId === authStore.currentUser?.id || authStore.isAdmin;
});

function handleApprove() {
  if (!order.value || !approvalOpinion.value.trim()) return;
  processing.value = true;
  try {
    approvalStore.processOrder(order.value.id, 'approve', approvalOpinion.value.trim());
    approvalOpinion.value = '';
  } finally {
    processing.value = false;
  }
}

function handleReject() {
  if (!order.value || !approvalOpinion.value.trim()) return;
  processing.value = true;
  try {
    approvalStore.processOrder(order.value.id, 'reject', approvalOpinion.value.trim());
    approvalOpinion.value = '';
  } finally {
    processing.value = false;
  }
}

function handleCancel() {
  if (!order.value) return;
  approvalStore.cancelOrder(order.value.id);
}

function goToSchedule(scheduleId: string) {
  router.push({ path: '/', query: { schedule: scheduleId } });
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
              @click="router.push('/approval')"
              class="px-3 py-1.5 rounded text-xs font-mono font-medium text-console-300 border border-console-500/30 hover:bg-console-700/50 hover:text-console-100 transition-all flex items-center gap-1.5"
            >
              <ClipboardCheck class="w-3.5 h-3.5" />
              调度审批
            </button>
            <button
              v-if="authStore.canManageUsers"
              @click="router.push('/permission/users')"
              class="px-3 py-1.5 rounded text-xs font-mono font-medium text-console-300 border border-console-500/30 hover:bg-console-700/50 hover:text-console-100 transition-all flex items-center gap-1.5"
            >
              <Users class="w-3.5 h-3.5" />
              用户管理
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

    <main v-if="order" class="p-4 space-y-4">
      <div class="flex items-center gap-3">
        <button
          class="w-8 h-8 rounded-lg bg-console-800/60 border border-console-500/40 flex items-center justify-center text-console-300 hover:text-console-100 hover:border-console-400/50 transition-all"
          @click="router.push('/approval')"
        >
          <ArrowLeft class="w-4 h-4" />
        </button>
        <div>
          <h2 class="font-mono text-lg font-bold text-console-100 flex items-center gap-2">
            {{ order.approvalNo }}
            <ApprovalStatusBadge :status="order.status" />
          </h2>
          <p class="text-xs font-mono text-console-400">
            {{ APPROVAL_TYPE_LABELS[order.type] }} · 发起人: {{ order.initiatorName }}
          </p>
        </div>
      </div>

      <div class="grid grid-cols-12 gap-4">
        <div class="col-span-8 space-y-4">
          <div class="panel-border rounded-lg p-4">
            <h3 class="font-mono text-sm font-semibold text-console-100 mb-3 flex items-center gap-2">
              <span class="w-1 h-4 bg-harbor-cyan rounded-full" />
              审批基本信息
            </h3>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <p class="text-[10px] font-mono text-console-400 mb-1">审批单号</p>
                <p class="text-xs font-mono text-console-100">{{ order.approvalNo }}</p>
              </div>
              <div>
                <p class="text-[10px] font-mono text-console-400 mb-1">审批类型</p>
                <span class="px-1.5 py-0.5 rounded bg-harbor-purple/20 text-harbor-purple border border-harbor-purple/30 text-[10px] font-mono">
                  {{ APPROVAL_TYPE_LABELS[order.type] }}
                </span>
              </div>
              <div>
                <p class="text-[10px] font-mono text-console-400 mb-1">发起人</p>
                <p class="text-xs font-mono text-console-100">{{ order.initiatorName }}</p>
              </div>
              <div>
                <p class="text-[10px] font-mono text-console-400 mb-1">审批状态</p>
                <ApprovalStatusBadge :status="order.status" size="sm" />
              </div>
              <div>
                <p class="text-[10px] font-mono text-console-400 mb-1">提交时间</p>
                <p class="text-xs font-mono text-console-100">{{ format(order.submitTime, 'yyyy-MM-dd HH:mm:ss') }}</p>
              </div>
              <div>
                <p class="text-[10px] font-mono text-console-400 mb-1">处理时间</p>
                <p class="text-xs font-mono text-console-100">
                  {{ order.processTime ? format(order.processTime, 'yyyy-MM-dd HH:mm:ss') : '-' }}
                </p>
              </div>
              <div class="col-span-2">
                <p class="text-[10px] font-mono text-console-400 mb-1">审批意见</p>
                <p class="text-xs font-mono text-console-100">{{ order.opinion }}</p>
              </div>
              <div v-if="order.conclusion" class="col-span-2">
                <p class="text-[10px] font-mono text-console-400 mb-1">最终结论</p>
                <p
                  :class="[
                    'text-xs font-mono font-medium',
                    order.status === 'approved' ? 'text-harbor-green' : order.status === 'rejected' ? 'text-harbor-red' : 'text-console-100',
                  ]"
                >
                  {{ order.conclusion }}
                </p>
              </div>
            </div>
          </div>

          <div class="panel-border rounded-lg p-4">
            <h3 class="font-mono text-sm font-semibold text-console-100 mb-3 flex items-center gap-2">
              <span class="w-1 h-4 bg-harbor-orange rounded-full" />
              关联调度计划
            </h3>
            <div v-if="schedule" class="grid grid-cols-2 gap-4">
              <div>
                <p class="text-[10px] font-mono text-console-400 mb-1">计划编号</p>
                <button
                  class="text-xs font-mono text-harbor-cyan hover:underline"
                  @click="goToSchedule(schedule.id)"
                >
                  {{ schedule.id }}
                </button>
              </div>
              <div>
                <p class="text-[10px] font-mono text-console-400 mb-1">船舶</p>
                <p class="text-xs font-mono text-console-100 flex items-center gap-1">
                  <Ship class="w-3 h-3 text-console-400" />
                  {{ ship?.name || schedule.shipId }}
                </p>
              </div>
              <div>
                <p class="text-[10px] font-mono text-console-400 mb-1">泊位</p>
                <p class="text-xs font-mono text-console-100 flex items-center gap-1">
                  <MapPin class="w-3 h-3 text-console-400" />
                  {{ berth?.name || schedule.berthId }}
                </p>
              </div>
              <div>
                <p class="text-[10px] font-mono text-console-400 mb-1">计划状态</p>
                <p class="text-xs font-mono text-console-100">{{ schedule.status }}</p>
              </div>
              <div>
                <p class="text-[10px] font-mono text-console-400 mb-1">ETA</p>
                <p class="text-xs font-mono text-console-100">{{ format(schedule.eta, 'yyyy-MM-dd HH:mm') }}</p>
              </div>
              <div>
                <p class="text-[10px] font-mono text-console-400 mb-1">ETD</p>
                <p class="text-xs font-mono text-console-100">{{ format(schedule.etd, 'yyyy-MM-dd HH:mm') }}</p>
              </div>
            </div>
            <p v-else class="text-xs font-mono text-console-400">关联计划不存在</p>
          </div>

          <div v-if="order.beforeSnapshot || order.afterSnapshot" class="panel-border rounded-lg p-4">
            <h3 class="font-mono text-sm font-semibold text-console-100 mb-3 flex items-center gap-2">
              <span class="w-1 h-4 bg-harbor-purple rounded-full" />
              变更快照
            </h3>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <p class="text-[10px] font-mono text-console-400 mb-2">变更前</p>
                <div class="p-2 rounded bg-console-800/60 border border-console-500/20">
                  <pre class="text-[10px] font-mono text-console-300 whitespace-pre-wrap break-words">{{ JSON.stringify(order.beforeSnapshot, null, 2) }}</pre>
                </div>
              </div>
              <div>
                <p class="text-[10px] font-mono text-console-400 mb-2">变更后</p>
                <div class="p-2 rounded bg-console-800/60 border border-console-500/20">
                  <pre class="text-[10px] font-mono text-harbor-cyan whitespace-pre-wrap break-words">{{ JSON.stringify(order.afterSnapshot, null, 2) }}</pre>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="col-span-4 space-y-4">
          <div class="panel-border rounded-lg p-4">
            <h3 class="font-mono text-sm font-semibold text-console-100 mb-3 flex items-center gap-2">
              <span class="w-1 h-4 bg-harbor-green rounded-full" />
              审批处理记录
            </h3>
            <ApprovalRecordTimeline :records="order.records" />
          </div>

          <div v-if="order.status === 'pending'" class="panel-border rounded-lg p-4">
            <h3 class="font-mono text-sm font-semibold text-console-100 mb-3 flex items-center gap-2">
              <span class="w-1 h-4 bg-harbor-yellow rounded-full" />
              审批操作
            </h3>
            <div class="space-y-3">
              <textarea
                v-model="approvalOpinion"
                rows="3"
                placeholder="请输入审批意见..."
                class="w-full px-3 py-2 rounded bg-console-800/60 border border-console-500/30 text-xs font-mono text-console-100 placeholder:text-console-500 focus:outline-none focus:border-harbor-cyan/50 resize-none"
              />
              <div class="flex items-center gap-2">
                <button
                  v-if="canApprove"
                  :disabled="!approvalOpinion.trim() || processing"
                  class="flex-1 px-3 py-2 rounded text-xs font-mono font-medium bg-harbor-green/20 text-harbor-green border border-harbor-green/30 hover:bg-harbor-green/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                  @click="handleApprove"
                >
                  <CheckCircle2 class="w-3.5 h-3.5" />
                  通过
                </button>
                <button
                  v-if="canApprove"
                  :disabled="!approvalOpinion.trim() || processing"
                  class="flex-1 px-3 py-2 rounded text-xs font-mono font-medium bg-harbor-red/20 text-harbor-red border border-harbor-red/30 hover:bg-harbor-red/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                  @click="handleReject"
                >
                  <XCircle class="w-3.5 h-3.5" />
                  驳回
                </button>
                <button
                  v-if="canCancel"
                  class="px-3 py-2 rounded text-xs font-mono font-medium text-console-300 border border-console-500/30 hover:bg-console-700/50 hover:text-console-100 transition-all flex items-center gap-1.5"
                  @click="handleCancel"
                >
                  <Ban class="w-3.5 h-3.5" />
                  撤销
                </button>
              </div>
            </div>
          </div>

          <div v-else class="panel-border rounded-lg p-4">
            <div class="flex items-center gap-2 mb-2">
              <component
                :is="order.status === 'approved' ? CheckCircle2 : order.status === 'rejected' ? XCircle : Ban"
                :class="[
                  'w-5 h-5',
                  order.status === 'approved' ? 'text-harbor-green' : order.status === 'rejected' ? 'text-harbor-red' : 'text-console-400',
                ]"
              />
              <span
                :class="[
                  'text-sm font-mono font-medium',
                  order.status === 'approved' ? 'text-harbor-green' : order.status === 'rejected' ? 'text-harbor-red' : 'text-console-400',
                ]"
              >
                {{ APPROVAL_STATUS_LABELS[order.status] }}
              </span>
            </div>
            <p class="text-xs font-mono text-console-300">
              {{ order.conclusion }}
            </p>
          </div>
        </div>
      </div>
    </main>

    <main v-else class="p-4">
      <div class="flex items-center gap-3 mb-4">
        <button
          class="w-8 h-8 rounded-lg bg-console-800/60 border border-console-500/40 flex items-center justify-center text-console-300 hover:text-console-100 hover:border-console-400/50 transition-all"
          @click="router.push('/approval')"
        >
          <ArrowLeft class="w-4 h-4" />
        </button>
        <h2 class="font-mono text-lg font-bold text-console-100">审批单不存在</h2>
      </div>
      <div class="panel-border rounded-lg p-8 text-center">
        <FileText class="w-12 h-12 text-console-500 mx-auto mb-3" />
        <p class="text-sm font-mono text-console-400">未找到对应的审批单</p>
        <button
          class="mt-4 px-4 py-1.5 rounded text-xs font-mono font-medium bg-harbor-cyan/20 text-harbor-cyan border border-harbor-cyan/30 hover:bg-harbor-cyan/30 transition-all"
          @click="router.push('/approval')"
        >
          返回审批列表
        </button>
      </div>
    </main>
  </div>
</template>
