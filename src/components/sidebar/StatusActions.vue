<script setup lang="ts">
import type { BerthSchedule, OperationStatus } from '../../types';
import { useScheduleStore } from '../../stores/schedule';
import { useAuthStore } from '../../stores/auth';
import { useResourceStore } from '../../stores/resource';
import { useRouter } from 'vue-router';
import {
  Anchor,
  Navigation,
  Ship,
  ArrowUpFromLine,
  ArrowDownToLine,
  LogOut,
  CheckCircle2,
  MessageSquare,
  AlertTriangle,
  Lock,
  Layers,
  Shield,
  Clock,
  Ban,
  FileText,
  Zap,
} from 'lucide-vue-next';
import { ref, watch, computed } from 'vue';
import { SHIP_TAG_LABELS, FORBIDDEN_BERTH_CATEGORY_LABELS } from '../../types';

const props = defineProps<{
  schedule: BerthSchedule;
}>();

const store = useScheduleStore();
const authStore = useAuthStore();
const resourceStore = useResourceStore();
const router = useRouter();
const remarkInput = ref(props.schedule.remarks || '');
const delayReasonInput = ref(props.schedule.delayReason || '');

const ship = computed(() => store.getShipById(props.schedule.shipId));
const hasTags = computed(() => ship.value?.tags && ship.value.tags.length > 0);
const hasGuarantees = computed(() => {
  const g = ship.value?.guaranteeRequirements;
  if (!g) return false;
  return g.earliestOperationTime || g.mustPriorityBerth || (g.forbiddenBerthCategories && g.forbiddenBerthCategories.length > 0) || g.requiresRemarks;
});

interface TagValidationResult {
  type: 'error' | 'warning';
  icon: typeof AlertTriangle;
  iconColor: string;
  title: string;
  message: string;
}

function validateTagsForStatus(status: OperationStatus): TagValidationResult[] {
  const results: TagValidationResult[] = [];
  if (!ship.value) return results;

  const tags = ship.value.tags || [];
  const guarantees = ship.value.guaranteeRequirements || {};
  const now = new Date();

  if (status === 'berthing' || status === 'loading' || status === 'unloading') {
    if (guarantees.earliestOperationTime) {
      const [h, m] = guarantees.earliestOperationTime.split(':').map(Number);
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const earliestMinutes = h * 60 + m;
      if (nowMinutes < earliestMinutes) {
        results.push({
          type: 'error',
          icon: Clock,
          iconColor: 'text-harbor-cyan',
          title: '最早作业时间未到',
          message: `该船要求最早${guarantees.earliestOperationTime}后方可开始作业，当前时间${now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}尚早`,
        });
      }
    }

    if (tags.includes('night_restricted')) {
      const hour = now.getHours();
      if (hour >= 22 || hour < 6) {
        results.push({
          type: 'error',
          icon: AlertTriangle,
          iconColor: 'text-harbor-red',
          title: `夜间作业限制【${SHIP_TAG_LABELS.night_restricted}】`,
          message: '该船禁止在夜间(22:00-06:00)进行作业，请等待至白天时段',
        });
      }
    }

    if (tags.includes('dangerous_operation')) {
      const hour = now.getHours();
      if (hour >= 22 || hour < 6) {
        results.push({
          type: 'error',
          icon: AlertTriangle,
          iconColor: 'text-harbor-red',
          title: `夜间作业限制【${SHIP_TAG_LABELS.dangerous_operation}】`,
          message: '危险作业船舶禁止在夜间(22:00-06:00)进行作业，请等待至白天时段',
        });
      }
    }

    if (guarantees.requiresRemarks && (!props.schedule.remarks || props.schedule.remarks.trim().length === 0)) {
      results.push({
        type: 'warning',
        icon: FileText,
        iconColor: 'text-harbor-blue',
        title: '缺少作业备注',
        message: '该船舶要求必须填写作业备注，请先在下方"调度备注"中补充说明',
      });
    }
  }

  if (status === 'berthing' && guarantees.mustPriorityBerth) {
    const sameBerthSchedules = store.schedules.filter(
      (s) => s.berthId === props.schedule.berthId && s.id !== props.schedule.id && s.status !== 'departed',
    );
    const hasNonPriorityBefore = sameBerthSchedules.some((s) => {
      const otherShip = store.getShipById(s.shipId);
      return !otherShip?.guaranteeRequirements?.mustPriorityBerth && new Date(s.eta).getTime() < new Date(props.schedule.eta).getTime();
    });
    if (hasNonPriorityBefore) {
      results.push({
        type: 'warning',
        icon: Zap,
        iconColor: 'text-harbor-orange',
        title: `优先靠泊要求【${SHIP_TAG_LABELS.key_customer}】`,
        message: '该船要求优先靠泊，但同泊位有普通船舶排在前面，建议调整顺序',
      });
    }
  }

  if (status === 'berthing' && guarantees.forbiddenBerthCategories && guarantees.forbiddenBerthCategories.length > 0) {
    const berth = store.getBerthById(props.schedule.berthId);
    if (berth && berth.allowedCargo[0]) {
      const categoryMap: Record<string, string> = { container: 'container', bulk: 'bulk', liquid: 'liquid', general: 'general', 'ro-ro': 'ro-ro' };
      const berthCategory = categoryMap[berth.allowedCargo[0]];
      if (berthCategory && guarantees.forbiddenBerthCategories.includes(berthCategory as any)) {
        results.push({
          type: 'error',
          icon: Ban,
          iconColor: 'text-harbor-red',
          title: '泊位类型禁止',
          message: `该船被禁止分配至【${FORBIDDEN_BERTH_CATEGORY_LABELS[berthCategory as keyof typeof FORBIDDEN_BERTH_CATEGORY_LABELS]}】泊位(当前：${berth.name})，请更换泊位`,
        });
      }
    }
  }

  return results;
}

watch(
  () => props.schedule.remarks,
  (v) => (remarkInput.value = v || ''),
);

watch(
  () => props.schedule.delayReason,
  (v) => (delayReasonInput.value = v || ''),
);

const statusActions: { status: OperationStatus; label: string; icon: typeof Anchor; color: string }[] = [
  { status: 'anchored', label: '锚泊', icon: Anchor, color: 'border-console-400 text-console-200 hover:bg-console-500/30' },
  { status: 'approaching', label: '进港', icon: Navigation, color: 'border-harbor-yellow text-harbor-yellow hover:bg-harbor-yellow/15' },
  { status: 'berthing', label: '靠泊', icon: Ship, color: 'border-harbor-purple text-harbor-purple hover:bg-harbor-purple/15' },
  { status: 'loading', label: '装货', icon: ArrowUpFromLine, color: 'border-harbor-cyan text-harbor-cyan hover:bg-harbor-cyan/15' },
  { status: 'unloading', label: '卸货', icon: ArrowDownToLine, color: 'border-harbor-cyan text-harbor-cyan hover:bg-harbor-cyan/15' },
  { status: 'departing', label: '离泊', icon: LogOut, color: 'border-harbor-orange text-harbor-orange hover:bg-harbor-orange/15' },
  { status: 'departed', label: '离港', icon: CheckCircle2, color: 'border-console-300 text-console-300 hover:bg-console-400/20' },
];

const OPERATION_STATUSES: OperationStatus[] = ['berthing', 'loading', 'unloading'];

function isOperationStatus(status: OperationStatus): boolean {
  return OPERATION_STATUSES.includes(status);
}

function getResourceCheckResult(status: OperationStatus) {
  if (!isOperationStatus(status)) return { allowed: true };
  return resourceStore.canTransitionToOperation(props.schedule.id);
}

function updateStatus(status: OperationStatus) {
  if (!authStore.canChangeStatus) return;

  if (isOperationStatus(status)) {
    const check = resourceStore.canTransitionToOperation(props.schedule.id);
    if (!check.allowed) {
      if (confirm(`资源分配检查未通过：${check.reason}\n\n是否前往资源协同页面进行分配？`)) {
        router.push('/resources');
      }
      return;
    }
  }

  const tagValidations = validateTagsForStatus(status);
  const errors = tagValidations.filter((v) => v.type === 'error');
  const warnings = tagValidations.filter((v) => v.type === 'warning');

  if (errors.length > 0) {
    const errorMsg = errors.map((e) => `【${e.title}】${e.message}`).join('\n\n');
    alert(`标签规则校验失败（${errors.length}项错误）：\n\n${errorMsg}`);
    return;
  }

  if (warnings.length > 0) {
    const warnMsg = warnings.map((w) => `【${w.title}】${w.message}`).join('\n\n');
    if (!confirm(`标签规则提醒（${warnings.length}项警告）：\n\n${warnMsg}\n\n是否仍然继续？`)) {
      return;
    }
  }

  store.updateScheduleStatus(props.schedule.id, status);
}

function saveRemark() {
  if (!authStore.canEditSchedule) return;
  store.updateSchedule(props.schedule.id, { remarks: remarkInput.value });
}

function saveDelayReason() {
  if (!authStore.canEditSchedule) return;
  store.updateDelayReason(props.schedule.id, delayReasonInput.value);
}
</script>

<template>
  <div class="panel-border rounded-lg p-4">
    <div class="flex items-center justify-between mb-3">
      <h3 class="font-mono text-sm font-semibold text-console-100">状态控制</h3>
      <div v-if="!authStore.canChangeStatus" class="flex items-center gap-1 text-[10px] font-mono text-harbor-yellow">
        <Lock class="w-3 h-3" />
        <span>只读</span>
      </div>
    </div>

    <div class="grid grid-cols-4 gap-2 mb-4">
      <button
        v-for="action in statusActions"
        :key="action.status"
        @click="updateStatus(action.status)"
        :disabled="!authStore.canChangeStatus"
        :class="[
          'flex flex-col items-center gap-1 py-2 px-1 rounded border transition-all duration-150 relative',
          authStore.canChangeStatus ? 'cursor-pointer' : 'cursor-not-allowed opacity-50',
          schedule.status === action.status
            ? action.color + ' bg-opacity-20 shadow-glow-blue scale-[1.02]'
            : 'border-console-600/50 text-console-400 hover:border-opacity-80',
        ]"
        :title="
          isOperationStatus(action.status)
            ? getResourceCheckResult(action.status).allowed
              ? action.label
              : '资源分配未完成：' + (getResourceCheckResult(action.status).reason || '')
            : action.label
        "
      >
        <component :is="action.icon" class="w-4 h-4" />
        <span class="text-[10px] font-mono">{{ action.label }}</span>
        <span
          v-if="
            isOperationStatus(action.status) &&
            schedule.status !== action.status &&
            !getResourceCheckResult(action.status).allowed
          "
          class="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-harbor-red flex items-center justify-center"
          title="资源分配检查未通过"
        >
          <AlertTriangle class="w-2 h-2 text-white" />
        </span>
      </button>
    </div>

    <div
      v-if="
        isOperationStatus('berthing') &&
        !resourceStore.canTransitionToOperation(schedule.id).allowed
      "
      class="mb-4 p-3 rounded-lg bg-harbor-yellow/10 border border-harbor-yellow/30"
    >
      <div class="flex items-start gap-2">
        <Layers class="w-3.5 h-3.5 text-harbor-yellow mt-0.5 flex-shrink-0" />
        <div class="flex-1">
          <p class="text-[10px] font-mono font-medium text-harbor-yellow mb-1">资源分配提醒</p>
          <p class="text-[10px] font-mono text-console-300">
            {{ resourceStore.canTransitionToOperation(schedule.id).reason }}
          </p>
          <button
            @click="router.push('/resources')"
            class="mt-2 text-[10px] font-mono text-harbor-cyan hover:underline flex items-center gap-1"
          >
            前往资源协同 →
          </button>
        </div>
      </div>
    </div>

    <div v-if="hasTags || hasGuarantees" class="mb-4">
      <div v-for="validation in validateTagsForStatus('berthing')" :key="validation.title" class="mb-2 last:mb-0">
        <div
          :class="[
            'flex items-start gap-2 p-2 rounded border',
            validation.type === 'error'
              ? 'bg-harbor-red/10 border-harbor-red/30'
              : 'bg-harbor-yellow/10 border-harbor-yellow/30',
          ]"
        >
          <component
            :is="validation.icon"
            :class="['w-3.5 h-3.5 mt-0.5 flex-shrink-0', validation.iconColor]"
          />
          <div class="flex-1 min-w-0">
            <p
              :class="[
                'text-[10px] font-mono font-medium mb-0.5',
                validation.type === 'error' ? 'text-harbor-red' : 'text-harbor-yellow',
              ]"
            >
              {{ validation.title }}
            </p>
            <p class="text-[10px] font-mono text-console-300 leading-relaxed">
              {{ validation.message }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <div v-if="hasGuarantees" class="mb-4 p-3 rounded-lg bg-harbor-orange/5 border border-harbor-orange/20">
      <div class="flex items-center gap-2 mb-2">
        <Shield class="w-3.5 h-3.5 text-harbor-orange" />
        <p class="text-[10px] font-mono font-medium text-harbor-orange uppercase tracking-wider">
          保障要求提醒
        </p>
      </div>
      <div class="space-y-1.5">
        <div v-if="ship?.guaranteeRequirements?.earliestOperationTime" class="flex items-center gap-1.5 text-[10px] font-mono text-console-300">
          <Clock class="w-3 h-3 text-harbor-cyan flex-shrink-0" />
          <span>最早作业时间：</span>
          <span class="text-harbor-cyan font-semibold">{{ ship.guaranteeRequirements.earliestOperationTime }}</span>
        </div>
        <div v-if="ship?.guaranteeRequirements?.mustPriorityBerth" class="flex items-center gap-1.5 text-[10px] font-mono text-console-300">
          <Zap class="w-3 h-3 text-harbor-orange flex-shrink-0" />
          <span class="text-harbor-orange font-semibold">必须优先靠泊</span>
        </div>
        <div v-if="ship?.guaranteeRequirements?.forbiddenBerthCategories?.length" class="flex items-start gap-1.5 text-[10px] font-mono text-console-300">
          <Ban class="w-3 h-3 text-harbor-red flex-shrink-0 mt-0.5" />
          <span>禁止泊位类型：</span>
          <span class="text-harbor-red font-semibold">
            {{ ship.guaranteeRequirements.forbiddenBerthCategories.map(c => FORBIDDEN_BERTH_CATEGORY_LABELS[c]).join('、') }}
          </span>
        </div>
        <div v-if="ship?.guaranteeRequirements?.requiresRemarks" class="flex items-center gap-1.5 text-[10px] font-mono text-console-300">
          <FileText class="w-3 h-3 text-harbor-blue flex-shrink-0" />
          <span class="text-harbor-blue font-semibold">必须填写备注</span>
          <span v-if="!schedule.remarks || schedule.remarks.trim().length === 0" class="text-harbor-yellow">
            ⚠ 未填写
          </span>
        </div>
      </div>
    </div>

    <div class="border-t border-console-600/30 pt-3">
      <div class="flex items-center gap-2 mb-2">
        <AlertTriangle class="w-3.5 h-3.5 text-harbor-yellow" />
        <span class="text-[10px] font-mono text-console-400 uppercase tracking-wider">延误原因</span>
      </div>
      <textarea
        v-model="delayReasonInput"
        @blur="saveDelayReason"
        :readonly="!authStore.canEditSchedule"
        rows="2"
        placeholder="输入延误原因..."
        class="w-full px-3 py-2 text-xs font-mono bg-console-800/80 border border-console-500/40 rounded text-console-100 placeholder:text-console-500 focus:outline-none focus:border-harbor-yellow/50 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
      />
    </div>

    <div class="border-t border-console-600/30 pt-3 mt-3">
      <div class="flex items-center gap-2 mb-2">
        <MessageSquare class="w-3.5 h-3.5 text-console-400" />
        <span class="text-[10px] font-mono text-console-400 uppercase tracking-wider">调度备注</span>
      </div>
      <textarea
        v-model="remarkInput"
        @blur="saveRemark"
        :readonly="!authStore.canEditSchedule"
        rows="3"
        placeholder="输入调度备注..."
        class="w-full px-3 py-2 text-xs font-mono bg-console-800/80 border border-console-500/40 rounded text-console-100 placeholder:text-console-500 focus:outline-none focus:border-harbor-cyan/50 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
      />
    </div>
  </div>
</template>
