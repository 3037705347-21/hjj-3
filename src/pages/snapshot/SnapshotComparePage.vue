<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useSnapshotStore } from '../../stores/snapshot';
import { useScheduleStore } from '../../stores/schedule';
import { useAuthStore } from '../../stores/auth';
import { USER_ROLE_LABELS } from '../../types';
import SnapshotComparePanel from '../../components/snapshot/SnapshotComparePanel.vue';
import {
  GitCompare,
  ArrowLeft,
  User,
  Clock,
  Camera,
  ChevronDown,
  LayoutDashboard,
  History,
  Bell,
  RefreshCw,
  Settings,
  Anchor,
  ArrowRight,
} from 'lucide-vue-next';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const router = useRouter();
const route = useRoute();
const snapshotStore = useSnapshotStore();
const scheduleStore = useScheduleStore();
const authStore = useAuthStore();

const currentTime = ref(new Date());

const snapshotIdA = ref<string>('');
const snapshotIdB = ref<string>('');

const showSelectA = ref(false);
const showSelectB = ref(false);

onMounted(() => {
  setInterval(() => {
    currentTime.value = new Date();
  }, 1000);

  const queryA = route.query.a as string;
  const queryB = route.query.b as string;

  if (queryA) {
    snapshotIdA.value = queryA;
  } else if (snapshotStore.activeSnapshots.length > 0) {
    snapshotIdA.value = snapshotStore.activeSnapshots[0].id;
  }

  if (queryB) {
    snapshotIdB.value = queryB;
  } else if (snapshotStore.activeSnapshots.length > 1) {
    snapshotIdB.value = snapshotStore.activeSnapshots[1].id;
  } else if (snapshotStore.activeSnapshots.length > 0) {
    snapshotIdB.value = snapshotStore.activeSnapshots[0].id;
  }
});

const snapshotA = computed(() =>
  snapshotIdA.value ? snapshotStore.getSnapshotById(snapshotIdA.value) : null,
);

const snapshotB = computed(() =>
  snapshotIdB.value ? snapshotStore.getSnapshotById(snapshotIdB.value) : null,
);

const availableSnapshots = computed(() =>
  snapshotStore.filterSnapshots({ status: 'active' }),
);

function selectSnapshotA(id: string) {
  snapshotIdA.value = id;
  showSelectA.value = false;
  updateUrl();
}

function selectSnapshotB(id: string) {
  snapshotIdB.value = id;
  showSelectB.value = false;
  updateUrl();
}

function updateUrl() {
  router.replace({
    path: '/snapshots/compare',
    query: {
      a: snapshotIdA.value,
      b: snapshotIdB.value,
    },
  });
}

function swapSnapshots() {
  const temp = snapshotIdA.value;
  snapshotIdA.value = snapshotIdB.value;
  snapshotIdB.value = temp;
  updateUrl();
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

    <main class="p-6">
      <div class="max-w-5xl mx-auto space-y-6">
        <div class="flex items-center gap-4">
          <button
            @click="router.back()"
            class="flex items-center gap-1 text-sm text-console-400 hover:text-console-100 transition-colors"
          >
            <ArrowLeft class="w-4 h-4" />
            返回快照列表
          </button>
        </div>

        <div>
          <h2 class="text-xl font-bold text-console-100 flex items-center gap-2">
            <GitCompare class="w-6 h-6 text-harbor-purple" />
            盘面对比
          </h2>
          <p class="text-sm text-console-400 mt-1">
            选择两个历史快照进行对比，分析调度盘面变化
          </p>
        </div>

        <div class="bg-console-800/50 rounded-xl border border-console-500/30 p-4">
          <div class="flex items-center gap-4">
            <div class="flex-1 relative">
              <div class="text-xs text-console-400 mb-1.5">快照 A</div>
              <button
                @click="showSelectA = !showSelectA"
                class="w-full flex items-center justify-between px-3 py-2.5 bg-console-900/80 border border-console-500/40 rounded-lg text-left hover:border-harbor-blue/50 transition-colors"
              >
                <div class="flex items-center gap-2 min-w-0">
                  <div class="w-8 h-8 rounded-lg bg-harbor-blue/20 flex items-center justify-center flex-shrink-0">
                    <Camera class="w-4 h-4 text-harbor-blue" />
                  </div>
                  <div class="min-w-0">
                    <div class="text-sm font-medium text-console-100 truncate">
                      {{ snapshotA?.name || '请选择快照' }}
                    </div>
                    <div v-if="snapshotA" class="text-xs text-console-400">
                      {{ format(new Date(snapshotA.snapshotTime), 'yyyy-MM-dd HH:mm', { locale: zhCN }) }}
                    </div>
                  </div>
                </div>
                <ChevronDown class="w-4 h-4 text-console-400 flex-shrink-0" />
              </button>

              <Teleport to="body">
                <Transition name="fade">
                  <div
                    v-if="showSelectA"
                    class="fixed inset-0 z-50"
                    @click.self="showSelectA = false"
                  >
                    <div class="absolute inset-0" @click="showSelectA = false" />
                    <div
                      class="absolute w-80 max-h-80 overflow-y-auto bg-console-800 rounded-lg border border-console-500/40 shadow-2xl"
                      style="top: 200px; left: calc(50% - 300px);"
                    >
                      <div class="p-2 border-b border-console-500/30">
                        <div class="text-xs text-console-400">选择快照 A</div>
                      </div>
                      <div class="py-1">
                        <button
                          v-for="snap in availableSnapshots"
                          :key="snap.id"
                          @click="selectSnapshotA(snap.id)"
                          class="w-full px-3 py-2 text-left hover:bg-console-700/50 transition-colors"
                          :class="{ 'bg-harbor-blue/10': snap.id === snapshotIdA }"
                        >
                          <div class="text-sm text-console-100">{{ snap.name }}</div>
                          <div class="text-xs text-console-400">
                            {{ format(new Date(snap.snapshotTime), 'yyyy-MM-dd HH:mm', { locale: zhCN }) }}
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                </Transition>
              </Teleport>
            </div>

            <div class="pt-5">
              <button
                @click="swapSnapshots"
                class="p-2 bg-console-700/50 rounded-full hover:bg-console-700 transition-colors"
                title="交换"
              >
                <ArrowRight class="w-5 h-5 text-console-400 rotate-90" />
              </button>
            </div>

            <div class="flex-1 relative">
              <div class="text-xs text-console-400 mb-1.5">快照 B</div>
              <button
                @click="showSelectB = !showSelectB"
                class="w-full flex items-center justify-between px-3 py-2.5 bg-console-900/80 border border-console-500/40 rounded-lg text-left hover:border-harbor-purple/50 transition-colors"
              >
                <div class="flex items-center gap-2 min-w-0">
                  <div class="w-8 h-8 rounded-lg bg-harbor-purple/20 flex items-center justify-center flex-shrink-0">
                    <Camera class="w-4 h-4 text-harbor-purple" />
                  </div>
                  <div class="min-w-0">
                    <div class="text-sm font-medium text-console-100 truncate">
                      {{ snapshotB?.name || '请选择快照' }}
                    </div>
                    <div v-if="snapshotB" class="text-xs text-console-400">
                      {{ format(new Date(snapshotB.snapshotTime), 'yyyy-MM-dd HH:mm', { locale: zhCN }) }}
                    </div>
                  </div>
                </div>
                <ChevronDown class="w-4 h-4 text-console-400 flex-shrink-0" />
              </button>

              <Teleport to="body">
                <Transition name="fade">
                  <div
                    v-if="showSelectB"
                    class="fixed inset-0 z-50"
                    @click.self="showSelectB = false"
                  >
                    <div class="absolute inset-0" @click="showSelectB = false" />
                    <div
                      class="absolute w-80 max-h-80 overflow-y-auto bg-console-800 rounded-lg border border-console-500/40 shadow-2xl"
                      style="top: 200px; right: calc(50% - 300px);"
                    >
                      <div class="p-2 border-b border-console-500/30">
                        <div class="text-xs text-console-400">选择快照 B</div>
                      </div>
                      <div class="py-1">
                        <button
                          v-for="snap in availableSnapshots"
                          :key="snap.id"
                          @click="selectSnapshotB(snap.id)"
                          class="w-full px-3 py-2 text-left hover:bg-console-700/50 transition-colors"
                          :class="{ 'bg-harbor-purple/10': snap.id === snapshotIdB }"
                        >
                          <div class="text-sm text-console-100">{{ snap.name }}</div>
                          <div class="text-xs text-console-400">
                            {{ format(new Date(snap.snapshotTime), 'yyyy-MM-dd HH:mm', { locale: zhCN }) }}
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                </Transition>
              </Teleport>
            </div>
          </div>
        </div>

        <div v-if="snapshotIdA && snapshotIdB && snapshotIdA !== snapshotIdB">
          <SnapshotComparePanel
            :snapshot-id-a="snapshotIdA"
            :snapshot-id-b="snapshotIdB"
          />
        </div>

        <div
          v-else
          class="bg-console-800/50 rounded-xl border border-console-500/30 p-12 text-center"
        >
          <GitCompare class="w-16 h-16 text-console-600 mx-auto mb-4" />
          <h3 class="text-lg font-semibold text-console-200 mb-2">
            {{ snapshotIdA === snapshotIdB ? '请选择两个不同的快照' : '请选择要对比的快照' }}
          </h3>
          <p class="text-sm text-console-400">
            从上方下拉菜单中选择两个快照进行盘面指标和调度变化对比
          </p>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
