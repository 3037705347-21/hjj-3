<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useScheduleStore } from '../../stores/schedule';
import { useAuthStore } from '../../stores/auth';
import { useScenarioStore } from '../../stores/scenario';
import { USER_ROLE_LABELS, SCENARIO_STATUS_LABELS } from '../../types';
import ScenarioListTable from '../../components/scenario/ScenarioListTable.vue';
import CreateScenarioModal from '../../components/scenario/CreateScenarioModal.vue';
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
  Play,
  Clock,
  Activity,
  CheckCircle,
  AlertTriangle,
} from 'lucide-vue-next';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const store = useScheduleStore();
const authStore = useAuthStore();
const scenarioStore = useScenarioStore();
const router = useRouter();

const currentTime = ref(new Date());
const showCreateModal = ref(false);
const showApplyConfirm = ref(false);
const applyScenarioId = ref<string | null>(null);
const copySourceId = ref<string | undefined>(undefined);

onMounted(() => {
  setInterval(() => {
    currentTime.value = new Date();
  }, 1000);
});

const statsCards = computed(() => [
  {
    label: '推演中',
    value: scenarioStore.draftScenarios.length,
    color: 'text-harbor-blue',
    bgClass: 'bg-harbor-blue/15',
    borderClass: 'border-harbor-blue/30',
    icon: Play,
  },
  {
    label: '已完成',
    value: scenarioStore.scenarios.filter((s) => s.status === 'completed').length,
    color: 'text-harbor-green',
    bgClass: 'bg-harbor-green/15',
    borderClass: 'border-harbor-green/30',
    icon: CheckCircle,
  },
  {
    label: '已应用',
    value: scenarioStore.appliedScenarios.length,
    color: 'text-harbor-purple',
    bgClass: 'bg-harbor-purple/15',
    borderClass: 'border-harbor-purple/30',
    icon: Activity,
  },
  {
    label: '累计推演',
    value: scenarioStore.scenarios.length,
    color: 'text-harbor-cyan',
    bgClass: 'bg-harbor-cyan/15',
    borderClass: 'border-harbor-cyan/30',
    icon: Clock,
  },
]);

function viewDetail(id: string) {
  router.push(`/scenarios/${id}`);
}

function handleCreated(scenarioId: string) {
  router.push(`/scenarios/${scenarioId}`);
}

function handleApply(id: string) {
  applyScenarioId.value = id;
  showApplyConfirm.value = true;
}

function confirmApply() {
  if (!applyScenarioId.value) return;
  const result = scenarioStore.applyScenario(applyScenarioId.value);
  if (result.success) {
    showApplyConfirm.value = false;
    applyScenarioId.value = null;
  }
}

function handleDelete(id: string) {
  if (confirm('确定要删除此推演场景吗？删除后无法恢复。')) {
    scenarioStore.deleteScenario(id);
  }
}

function handleCopy(id: string) {
  copySourceId.value = id;
  showCreateModal.value = true;
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
              <p class="text-[10px] text-console-400 tracking-widest">PORT OPERATING SYSTEM</p>
            </div>
          </div>
          <div class="h-8 w-px bg-console-500/50" />
          <nav class="flex items-center gap-1">
            <router-link
              to="/"
              class="px-3 py-1.5 text-sm text-console-300 hover:text-console-100 hover:bg-console-700/50 rounded-lg transition-colors"
            >
              运营控制台
            </router-link>
            <router-link
              to="/scenarios"
              class="px-3 py-1.5 text-sm font-medium text-harbor-cyan bg-harbor-cyan/10 rounded-lg"
            >
              调度推演
            </router-link>
          </nav>
        </div>

        <div class="flex items-center gap-4">
          <div class="text-right">
            <div class="text-sm font-mono text-console-200">
              {{ format(currentTime, 'yyyy-MM-dd HH:mm:ss', { locale: zhCN }) }}
            </div>
            <div class="text-xs text-console-400">
              {{ format(currentTime, 'EEEE', { locale: zhCN }) }}
            </div>
          </div>

          <div class="h-8 w-px bg-console-500/50" />

          <button class="relative p-2 text-console-300 hover:text-console-100 hover:bg-console-700/50 rounded-lg transition-colors">
            <Bell class="w-5 h-5" />
            <span class="absolute top-1.5 right-1.5 w-2 h-2 bg-harbor-red rounded-full" />
          </button>

          <div class="flex items-center gap-2 pl-2">
            <div class="w-8 h-8 rounded-full bg-gradient-to-br from-harbor-cyan to-harbor-green flex items-center justify-center">
              <User class="w-4 h-4 text-console-900" />
            </div>
            <div>
              <div class="text-sm font-medium text-console-100">{{ authStore.currentUser?.displayName || '张伟' }}</div>
              <div class="text-xs text-console-400">{{ authStore.currentUser ? USER_ROLE_LABELS[authStore.currentUser.role] : '调度员' }}</div>
            </div>
          </div>
        </div>
      </div>
    </header>

    <main class="p-6">
      <div class="max-w-7xl mx-auto space-y-6">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-xl font-bold text-console-100">调度场景推演</h2>
            <p class="text-sm text-console-400 mt-1">在独立环境中模拟调度方案，验证后再应用到正式计划</p>
          </div>
          <button
            @click="showCreateModal = true"
            class="h-9 px-4 bg-gradient-to-r from-harbor-purple to-harbor-blue text-white text-sm font-medium rounded-lg hover:shadow-glow-cyan transition-all flex items-center gap-2"
          >
            <Plus class="w-4 h-4" />
            新建推演
          </button>
        </div>

        <div class="grid grid-cols-4 gap-4">
          <div
            v-for="card in statsCards"
            :key="card.label"
            :class="[
              'p-4 rounded-xl border backdrop-blur-sm transition-all hover:scale-[1.02]',
              card.bgClass,
              card.borderClass,
            ]"
          >
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm text-console-300">{{ card.label }}</span>
              <div :class="['p-1.5 rounded-lg', card.bgClass]">
                <component :is="card.icon" :class="['w-4 h-4', card.color]" />
              </div>
            </div>
            <div :class="['text-2xl font-bold font-mono', card.color]">
              {{ card.value }}
            </div>
          </div>
        </div>

        <ScenarioListTable
          @view-detail="viewDetail"
          @apply="handleApply"
          @delete="handleDelete"
          @copy="handleCopy"
        />
      </div>
    </main>

    <CreateScenarioModal
      :visible="showCreateModal"
      :source-scenario-id="copySourceId"
      @close="showCreateModal = false; copySourceId = undefined"
      @created="handleCreated"
    />

    <Teleport to="body">
      <div
        v-if="showApplyConfirm"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div
          class="absolute inset-0 bg-black/60 backdrop-blur-sm"
          @click="showApplyConfirm = false"
        />
        <div class="relative w-full max-w-md bg-console-800 rounded-xl border border-console-500/40 shadow-2xl overflow-hidden">
          <div class="p-5">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-10 h-10 rounded-full bg-harbor-purple/20 flex items-center justify-center">
                <AlertTriangle class="w-5 h-5 text-harbor-purple" />
              </div>
              <div>
                <h3 class="text-base font-semibold text-console-100">确认应用到正式计划？</h3>
                <p class="text-sm text-console-400 mt-0.5">此操作将覆盖当前正式计划数据</p>
              </div>
            </div>
            <div class="p-3 bg-console-900/50 rounded-lg border border-console-500/30">
              <p class="text-sm text-console-300">
                应用推演场景后，推演中的所有调度计划、船舶、泊位调整将同步到正式计划，并生成完整的操作日志。
              </p>
            </div>
          </div>
          <div class="flex items-center justify-end gap-3 px-5 py-4 border-t border-console-500/30 bg-console-900/30">
            <button
              @click="showApplyConfirm = false"
              class="h-9 px-4 text-sm text-console-300 hover:text-console-100 bg-console-700/50 hover:bg-console-700 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              @click="confirmApply"
              class="h-9 px-5 text-sm font-medium text-white bg-gradient-to-r from-harbor-purple to-harbor-blue rounded-lg hover:shadow-glow-cyan transition-all flex items-center gap-2"
            >
              <CheckCircle class="w-4 h-4" />
              确认应用
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
