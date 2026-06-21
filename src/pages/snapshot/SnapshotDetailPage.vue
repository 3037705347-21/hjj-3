<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useSnapshotStore } from '../../stores/snapshot';
import { useScheduleStore } from '../../stores/schedule';
import { useAuthStore } from '../../stores/auth';
import { USER_ROLE_LABELS, SHIP_PRIORITY_LABELS } from '../../types';
import { SNAPSHOT_CREATE_METHOD_LABELS, SNAPSHOT_STATUS_LABELS } from '../../types';
import SnapshotNotesPanel from '../../components/snapshot/SnapshotNotesPanel.vue';
import {
  Camera,
  ArrowLeft,
  User,
  Clock,
  AlertTriangle,
  Ship,
  Anchor,
  FileText,
  Tag,
  Edit,
  Check,
  GitCompare,
  Archive,
  Trash2,
  X,
  Eye,
  LayoutDashboard,
  History,
  Bell,
  RefreshCw,
  Settings,
  Shield,
  Users,
  Plus,
} from 'lucide-vue-next';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const router = useRouter();
const route = useRoute();
const snapshotStore = useSnapshotStore();
const scheduleStore = useScheduleStore();
const authStore = useAuthStore();

const snapshotId = computed(() => route.params.id as string);
const currentTime = ref(new Date());

const activeTab = ref<'overview' | 'schedules' | 'conflicts' | 'logs'>('overview');
const showEditName = ref(false);
const editName = ref('');
const showEditDescription = ref(false);
const editDescription = ref('');
const showReviewEditor = ref(false);
const reviewConclusionInput = ref('');

const snapshot = computed(() => snapshotStore.getSnapshotById(snapshotId.value));

const keyShips = computed(() => snapshotStore.getKeyShipsFromSnapshot(snapshotId.value));

const tabs = [
  { key: 'overview', label: '概览', icon: FileText },
  { key: 'schedules', label: '调度计划', icon: Ship },
  { key: 'conflicts', label: '冲突告警', icon: AlertTriangle },
  { key: 'logs', label: '操作日志', icon: History },
];

const methodIconMap = {
  manual: Camera,
  auto: Clock,
  handover: History,
  incident: AlertTriangle,
  approval: Check,
  scenario_apply: Plus,
};

onMounted(() => {
  setInterval(() => {
    currentTime.value = new Date();
  }, 1000);

  if (snapshot.value) {
    editName.value = snapshot.value.name;
    editDescription.value = snapshot.value.description || '';
    reviewConclusionInput.value = snapshot.value.reviewConclusion || '';
  }
});

function startEditName() {
  editName.value = snapshot.value?.name || '';
  showEditName.value = true;
}

function saveName() {
  if (editName.value.trim()) {
    snapshotStore.updateSnapshot(snapshotId.value, { name: editName.value.trim() });
  }
  showEditName.value = false;
}

function startEditDescription() {
  editDescription.value = snapshot.value?.description || '';
  showEditDescription.value = true;
}

function saveDescription() {
  snapshotStore.updateSnapshot(snapshotId.value, { description: editDescription.value.trim() || undefined });
  showEditDescription.value = false;
}

function openReviewEditor() {
  reviewConclusionInput.value = snapshot.value?.reviewConclusion || '';
  showReviewEditor.value = true;
}

function saveReviewConclusion() {
  snapshotStore.setReviewConclusion(snapshotId.value, reviewConclusionInput.value.trim());
  showReviewEditor.value = false;
}

function goToCompare() {
  router.push({ path: '/snapshots/compare', query: { a: snapshotId.value } });
}

function getBerthName(berthId: string) {
  return snapshot.value?.data.berths.find((b) => b.id === berthId)?.name || berthId;
}

function getShipName(shipId: string) {
  return snapshot.value?.data.ships.find((s) => s.id === shipId)?.name || shipId;
}

function getPriorityLabel(priority: string) {
  return SHIP_PRIORITY_LABELS?.[priority as keyof typeof SHIP_PRIORITY_LABELS] || priority;
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
              <LayoutDashboard class="w-3.5 h-3.5" />
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
              @click="router.push('/snapshots')"
              class="px-3 py-1.5 rounded text-xs font-mono font-medium bg-harbor-cyan/15 text-harbor-cyan border border-harbor-cyan/30 shadow-glow-blue"
            >
              <Camera class="w-3.5 h-3.5" />
              调度复盘
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
            <div class="text-left">
              <p class="text-xs font-mono font-medium text-console-100">
                {{ authStore.currentUser?.displayName || scheduleStore.currentOperator }}
              </p>
              <p class="text-[9px] font-mono text-console-400">
                {{ authStore.currentUser ? USER_ROLE_LABELS[authStore.currentUser.role] : '调度员' }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>

    <main class="p-4" v-if="snapshot">
      <div class="max-w-7xl mx-auto space-y-4">
        <div class="flex items-center gap-4">
          <button
            @click="router.back()"
            class="flex items-center gap-1 text-sm text-console-400 hover:text-console-100 transition-colors"
          >
            <ArrowLeft class="w-4 h-4" />
            返回快照列表
          </button>
        </div>

        <div class="bg-console-800/50 rounded-xl border border-console-500/30 overflow-hidden">
          <div class="p-5 border-b border-console-500/30">
          <div class="flex items-start justify-between">
            <div class="flex items-center gap-4">
              <div class="w-14 h-14 rounded-xl bg-harbor-cyan/20 flex items-center justify-center">
                <Camera class="w-7 h-7 text-harbor-cyan" />
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <h2 v-if="!showEditName" class="text-xl font-bold text-console-100">
                    {{ snapshot.name }}
                  </h2>
                  <input
                    v-else
                    v-model="editName"
                    type="text"
                    class="h-8 px-2 bg-console-900/80 border border-harbor-cyan/50 rounded text-lg font-bold text-console-100 focus:outline-none"
                    @blur="saveName"
                    @keyup.enter="saveName"
                    @keyup.escape="showEditName = false"
                    autofocus
                  />
                  <button
                    v-if="!showEditName"
                    @click="startEditName"
                    class="p-1 text-console-400 hover:text-harbor-cyan hover:bg-harbor-cyan/10 rounded transition-colors"
                  >
                    <Edit class="w-4 h-4" />
                  </button>
                </div>
                <div class="flex items-center gap-3 mt-2">
                  <span
                    :class="[
                    'inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-md border',
                    snapshotStore.getMethodBgClass(snapshot.createMethod),
                  ]"
                  >
                    <component
                      :is="methodIconMap[snapshot.createMethod]"
                      :class="['w-3.5 h-3.5', snapshotStore.getMethodColor(snapshot.createMethod)]"
                    />
                    <span :class="snapshotStore.getMethodColor(snapshot.createMethod)">
                      {{ SNAPSHOT_CREATE_METHOD_LABELS[snapshot.createMethod] }}
                    </span>
                  </span>
                  <span
                    :class="[
                      'inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-md border',
                      snapshot.status === 'active'
                        ? 'bg-harbor-green/15 text-harbor-green border-harbor-green/30'
                        : 'bg-harbor-orange/15 text-harbor-orange border-harbor-orange/30',
                    ]"
                  >
                    {{ SNAPSHOT_STATUS_LABELS[snapshot.status] }}
                  </span>
                  <span v-if="snapshot.reviewConclusion" class="inline-flex items-center gap-1 text-xs text-harbor-green">
                    <Check class="w-3.5 h-3.5" />
                    已复盘
                  </span>
                </div>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button
                @click="goToCompare"
                class="h-8 px-3 bg-console-700/50 text-console-200 text-sm rounded-lg hover:bg-console-700 transition-colors flex items-center gap-1.5"
              >
                <GitCompare class="w-4 h-4" />
                盘面对比
              </button>
              <button
                v-if="snapshot.status === 'active'"
                @click="snapshotStore.archiveSnapshot(snapshot.id)"
                class="h-8 px-3 bg-console-700/50 text-console-200 text-sm rounded-lg hover:bg-console-700 transition-colors flex items-center gap-1.5"
              >
                <Archive class="w-4 h-4" />
                归档
              </button>
              <button
                v-else
                @click="snapshotStore.unarchiveSnapshot(snapshot.id)"
                class="h-8 px-3 bg-console-700/50 text-console-200 text-sm rounded-lg hover:bg-console-700 transition-colors flex items-center gap-1.5"
              >
                <Archive class="w-4 h-4" />
                取消归档
              </button>
            </div>
          </div>

          <div class="grid grid-cols-5 gap-4 mt-4 pt-4 border-t border-console-500/20">
            <div>
              <div class="text-xs text-console-400 mb-1">快照时间</div>
              <div class="text-sm text-console-200 font-mono">
                {{ format(new Date(snapshot.snapshotTime), 'yyyy-MM-dd HH:mm:ss', { locale: zhCN }) }}
              </div>
            </div>
            <div>
              <div class="text-xs text-console-400 mb-1">创建人</div>
              <div class="text-sm text-console-200 flex items-center gap-1.5">
                <User class="w-3.5 h-3.5 text-console-400" />
                {{ snapshot.creator }}
              </div>
            </div>
            <div>
              <div class="text-xs text-console-400 mb-1">在港 / 待泊</div>
              <div class="text-sm text-console-200">
                <span class="text-harbor-cyan font-mono">{{ snapshot.summary.shipsInPort }}</span>
                <span class="text-console-500 mx-1">/</span>
                <span class="text-harbor-orange font-mono">{{ snapshot.summary.shipsWaiting }}</span>
              </div>
            </div>
            <div>
              <div class="text-xs text-console-400 mb-1">冲突 / 告警</div>
              <div class="text-sm text-console-200">
                <span class="text-harbor-red font-mono">{{ snapshot.summary.conflictCount }}</span>
                <span class="text-console-500 mx-1">/</span>
                <span class="text-harbor-yellow font-mono">{{ snapshot.summary.warningCount }}</span>
              </div>
            </div>
            <div>
              <div class="text-xs text-console-400 mb-1">重点计划</div>
              <div class="text-sm text-console-200 font-mono">
                {{ snapshot.summary.keyPlanCount }} 个
              </div>
            </div>
          </div>
        </div>

        <div class="flex border-b border-console-500/30">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            @click="activeTab = tab.key as typeof activeTab"
            :class="[
              'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-all',
              activeTab === tab.key
                ? 'text-harbor-cyan border-harbor-cyan'
                : 'text-console-400 border-transparent hover:text-console-200',
            ]"
          >
            <component :is="tab.icon" class="w-4 h-4" />
            {{ tab.label }}
          </button>
        </div>

        <div class="grid grid-cols-12 gap-4 p-4">
          <div class="col-span-8 space-y-4">
            <div v-if="activeTab === 'overview'" class="space-y-4">
              <div class="bg-console-900/50 rounded-lg border border-console-500/20 p-4">
                <h4 class="text-sm font-semibold text-console-100 mb-3 flex items-center gap-2">
                  <FileText class="w-4 h-4 text-harbor-cyan" />
                  描述说明
                </h4>
                <div v-if="!showEditDescription" class="text-sm text-console-300">
                  <p v-if="snapshot.description">{{ snapshot.description }}</p>
                  <p v-else class="text-console-500">暂无描述</p>
                  <button
                    @click="startEditDescription"
                    class="mt-2 text-xs text-harbor-cyan hover:underline"
                  >
                    编辑描述
                  </button>
                </div>
                <div v-else>
                  <textarea
                    v-model="editDescription"
                    rows="3"
                    class="w-full px-3 py-2 bg-console-900/80 border border-harbor-cyan/50 rounded-lg text-sm text-console-100 focus:outline-none resize-none"
                    @blur="saveDescription"
                    @keyup.ctrl.enter="saveDescription"
                    autofocus
                  />
                  <div class="flex justify-end gap-2 mt-2">
                    <button
                      @click="showEditDescription = false"
                      class="px-3 py-1 text-xs text-console-400 hover:text-console-200"
                    >
                      取消
                    </button>
                    <button
                      @click="saveDescription"
                      class="px-3 py-1 text-xs text-harbor-cyan hover:text-harbor-cyan/80"
                    >
                      保存
                    </button>
                  </div>
                </div>
              </div>

              <div class="bg-console-900/50 rounded-lg border border-console-500/20 p-4">
                <div class="flex items-center justify-between mb-3">
                  <h4 class="text-sm font-semibold text-console-100 flex items-center gap-2">
                    <Check class="w-4 h-4 text-harbor-green" />
                    复盘结论
                  </h4>
                  <button
                    @click="openReviewEditor"
                    class="text-xs text-harbor-cyan hover:underline flex items-center gap-1"
                  >
                    <Edit class="w-3 h-3" />
                    编辑
                  </button>
                </div>
                <div v-if="snapshot.reviewConclusion" class="text-sm text-console-200 p-3 bg-harbor-green/10 border border-harbor-green/20 rounded-lg">
                  {{ snapshot.reviewConclusion }}
                </div>
                <div v-else class="text-sm text-console-500 p-3 bg-console-800/50 rounded-lg border border-dashed border-console-500/30">
                  暂无复盘结论
                </div>
                <div v-if="snapshot.reviewedBy" class="mt-2 text-xs text-console-400 flex items-center gap-2">
                  <User class="w-3 h-3" />
                  由 {{ snapshot.reviewedBy }} 在
                  {{ snapshot.reviewedAt ? format(new Date(snapshot.reviewedAt), 'yyyy-MM-dd HH:mm', { locale: zhCN }) : '-' }}
                  复盘
                </div>
              </div>

              <div class="bg-console-900/50 rounded-lg border border-console-500/20 p-4">
                <h4 class="text-sm font-semibold text-console-100 mb-3 flex items-center gap-2">
                  <Ship class="w-4 h-4 text-harbor-purple" />
                  重点计划（{{ keyShips.length }} 个）
                </h4>
                <div v-if="keyShips.length === 0" class="text-sm text-console-500">
                  暂无重点计划
                </div>
                <div v-else class="space-y-2">
                  <div
                    v-for="ship in keyShips"
                    :key="ship.shipId"
                    class="flex items-center justify-between p-2 bg-console-800/50 rounded-lg border border-console-500/20"
                  >
                    <div class="flex items-center gap-2">
                      <Ship class="w-4 h-4 text-console-400" />
                      <span class="text-sm text-console-200">{{ ship.shipName }}</span>
                      <span
                        :class="[
                          'text-[10px] px-1.5 py-0.5 rounded',
                          ship.priority === 'critical'
                            ? 'bg-harbor-red/20 text-harbor-red'
                            : 'bg-harbor-orange/20 text-harbor-orange',
                        ]"
                      >
                        {{ getPriorityLabel(ship.priority) }}
                      </span>
                    </div>
                    <div class="text-xs text-console-400">
                      {{ ship.berthName || '未分配' }}
                    </div>
                  </div>
                </div>
              </div>

              <div v-if="snapshot.tags && snapshot.tags.length > 0" class="bg-console-900/50 rounded-lg border border-console-500/20 p-4">
                <h4 class="text-sm font-semibold text-console-100 mb-3 flex items-center gap-2">
                  <Tag class="w-4 h-4 text-harbor-blue" />
                  标签
                </h4>
                <div class="flex flex-wrap gap-2">
                  <span
                    v-for="tag in snapshot.tags"
                    :key="tag"
                    class="inline-flex items-center px-2 py-0.5 bg-harbor-blue/15 text-harbor-blue text-xs rounded-md border border-harbor-blue/30"
                  >
                    {{ tag }}
                  </span>
                </div>
              </div>
            </div>

            <div v-if="activeTab === 'schedules'" class="bg-console-900/50 rounded-lg border border-console-500/20">
              <div class="px-4 py-3 border-b border-console-500/20">
                <h4 class="text-sm font-semibold text-console-100">调度计划列表</h4>
              </div>
              <div class="overflow-x-auto">
                <table class="w-full">
                  <thead>
                    <tr class="text-left text-xs text-console-400">
                    <th class="px-4 py-2 font-medium">船舶</th>
                    <th class="px-4 py-2 font-medium">泊位</th>
                    <th class="px-4 py-2 font-medium">到港时间</th>
                    <th class="px-4 py-2 font-medium">离港时间</th>
                    <th class="px-4 py-2 font-medium">状态</th>
                    <th class="px-4 py-2 font-medium">进度</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="sched in snapshot.data.schedules"
                    :key="sched.id"
                    class="border-t border-console-500/20"
                  >
                    <td class="px-4 py-2 text-sm text-console-200">
                      {{ getShipName(sched.shipId) }}
                    </td>
                    <td class="px-4 py-2 text-sm text-console-300">
                      {{ getBerthName(sched.berthId) }}
                    </td>
                    <td class="px-4 py-2 text-sm text-console-300 font-mono">
                      {{ format(new Date(sched.eta), 'MM-dd HH:mm', { locale: zhCN }) }}
                    </td>
                    <td class="px-4 py-2 text-sm text-console-300 font-mono">
                      {{ format(new Date(sched.etd), 'MM-dd HH:mm', { locale: zhCN }) }}
                    </td>
                    <td class="px-4 py-2">
                      <span class="text-xs text-console-300">{{ sched.status }}</span>
                    </td>
                    <td class="px-4 py-2 text-sm text-console-300">
                      {{ sched.operationProgress }}%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            </div>

            <div v-if="activeTab === 'conflicts'" class="bg-console-900/50 rounded-lg border border-console-500/20">
              <div class="px-4 py-3 border-b border-console-500/20">
                <h4 class="text-sm font-semibold text-console-100">冲突与告警</h4>
              </div>
              <div v-if="snapshot.data.conflicts.length === 0" class="p-8 text-center">
                <Check class="w-10 h-10 text-harbor-green mx-auto mb-2" />
                <p class="text-sm text-console-400">无冲突与告警</p>
              </div>
              <div v-else class="divide-y divide-console-500/20">
                <div
                  v-for="conflict in snapshot.data.conflicts"
                  :key="conflict.id"
                  class="p-3"
                >
                  <div class="flex items-start gap-2">
                    <AlertTriangle
                      :class="[
                        'w-4 h-4 mt-0.5',
                        conflict.severity === 'error' ? 'text-harbor-red' : 'text-harbor-yellow',
                      ]"
                    />
                    <div class="flex-1">
                      <p class="text-sm text-console-200">{{ conflict.message }}</p>
                      <p class="text-xs text-console-400 mt-1">
                        类型: {{ conflict.type }}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="activeTab === 'logs'" class="bg-console-900/50 rounded-lg border border-console-500/20">
              <div class="px-4 py-3 border-b border-console-500/20">
                <h4 class="text-sm font-semibold text-console-100">操作日志</h4>
              </div>
              <div class="divide-y divide-console-500/20 max-h-96 overflow-y-auto">
                <div
                  v-for="log in snapshot.data.logs.slice(0, 50)"
                  :key="log.id"
                  class="p-3"
                >
                  <div class="flex items-start gap-2 mb-1">
                    <span class="text-xs font-mono text-console-400">
                      {{ format(new Date(log.timestamp), 'MM-dd HH:mm:ss', { locale: zhCN }) }}
                    </span>
                    <span class="text-xs text-console-500">{{ log.operator }}</span>
                    <span
                      :class="[
                        'text-[10px] px-1.5 py-0.5 rounded',
                        log.type === 'conflict'
                          ? 'bg-harbor-red/20 text-harbor-red'
                          : log.type === 'warning'
                          ? 'bg-harbor-yellow/20 text-harbor-yellow'
                          : 'bg-console-600/30 text-console-300',
                      ]"
                    >
                      {{ log.type }}
                    </span>
                  </div>
                  <p class="text-sm text-console-200">{{ log.description }}</p>
                </div>
              </div>
            </div>
          </div>

          <div class="col-span-4 h-[600px]">
            <SnapshotNotesPanel :snapshot-id="snapshotId" />
          </div>
        </div>
      </div>
    </div>
    </main>

    <div v-else class="p-8 text-center">
      <Camera class="w-12 h-12 text-console-600 mx-auto mb-2" />
      <p class="text-sm text-console-400">快照不存在</p>
    </div>

    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showReviewEditor"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div
            class="absolute inset-0 bg-black/60 backdrop-blur-sm"
            @click="showReviewEditor = false"
          />
          <div class="relative w-full max-w-lg bg-console-800 rounded-xl border border-console-500/40 shadow-2xl overflow-hidden">
            <div class="px-5 py-4 border-b border-console-500/30 flex items-center justify-between">
              <h3 class="text-base font-semibold text-console-100">编辑复盘结论</h3>
              <button
                @click="showReviewEditor = false"
                class="p-1.5 text-console-400 hover:text-console-100 hover:bg-console-700/50 rounded-md transition-colors"
              >
                <X class="w-5 h-5" />
              </button>
            </div>
            <div class="p-5">
              <textarea
                v-model="reviewConclusionInput"
                rows="5"
                placeholder="请输入复盘结论..."
                class="w-full px-3 py-2 bg-console-900/80 border border-console-500/40 rounded-lg text-sm text-console-100 placeholder-console-400 focus:outline-none focus:border-harbor-cyan/50 focus:ring-1 focus:ring-harbor-cyan/30 resize-none"
              />
            </div>
            <div class="px-5 py-4 border-t border-console-500/30 bg-console-900/30 flex items-center justify-end gap-3">
              <button
                @click="showReviewEditor = false"
                class="h-9 px-4 text-sm text-console-300 hover:text-console-100 bg-console-700/50 hover:bg-console-700 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                @click="saveReviewConclusion"
                class="h-9 px-5 text-sm font-medium text-white bg-gradient-to-r from-harbor-green to-harbor-cyan rounded-lg hover:shadow-glow-cyan transition-all flex items-center gap-2"
              >
                <Check class="w-4 h-4" />
                保存结论
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
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
