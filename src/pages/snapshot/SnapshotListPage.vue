<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useSnapshotStore } from '../../stores/snapshot';
import { useScheduleStore } from '../../stores/schedule';
import { useAuthStore } from '../../stores/auth';
import { USER_ROLE_LABELS } from '../../types';
import SnapshotListTable from '../../components/snapshot/SnapshotListTable.vue';
import CreateSnapshotModal from '../../components/snapshot/CreateSnapshotModal.vue';
import {
  Camera,
  History,
  User,
  RefreshCw,
  Settings,
  Bell,
  Shield,
  Users,
  Plus,
  Archive,
  Clock,
  GitCompare,
  AlertTriangle,
  FileText,
  Anchor,
  LayoutDashboard,
} from 'lucide-vue-next';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const store = useScheduleStore();
const authStore = useAuthStore();
const snapshotStore = useSnapshotStore();
const router = useRouter();

const currentTime = ref(new Date());
const showCreateModal = ref(false);
const showDeleteConfirm = ref(false);
const deleteSnapshotId = ref<string | null>(null);
const showArchiveConfirm = ref(false);
const archiveSnapshotId = ref<string | null>(null);
const archiveAction = ref<'archive' | 'unarchive'>('archive');

onMounted(() => {
  setInterval(() => {
    currentTime.value = new Date();
  }, 1000);
});

const statsCards = computed(() => [
  {
    label: '总快照数',
    value: snapshotStore.totalCount,
    color: 'text-harbor-cyan',
    bgClass: 'bg-harbor-cyan/15',
    borderClass: 'border-harbor-cyan/30',
    icon: Camera,
  },
  {
    label: '正常状态',
    value: snapshotStore.activeSnapshots.length,
    color: 'text-harbor-green',
    bgClass: 'bg-harbor-green/15',
    borderClass: 'border-harbor-green/30',
    icon: FileText,
  },
  {
    label: '已归档',
    value: snapshotStore.archivedSnapshots.length,
    color: 'text-harbor-orange',
    bgClass: 'bg-harbor-orange/15',
    borderClass: 'border-harbor-orange/30',
    icon: Archive,
  },
  {
    label: '已复盘',
    value: computed(() => snapshotStore.snapshots.filter((s) => s.reviewConclusion).length).value,
    color: 'text-harbor-purple',
    bgClass: 'bg-harbor-purple/15',
    borderClass: 'border-harbor-purple/30',
    icon: Clock,
  },
]);

function viewDetail(id: string) {
  router.push(`/snapshots/${id}`);
}

function handleCompare(id: string) {
  if (snapshotStore.totalCount < 2) {
    alert('至少需要两个快照才能进行对比');
    return;
  }
  router.push({ path: '/snapshots/compare', query: { a: id } });
}

function handleDelete(id: string) {
  deleteSnapshotId.value = id;
  showDeleteConfirm.value = true;
}

function confirmDelete() {
  if (deleteSnapshotId.value) {
    snapshotStore.deleteSnapshot(deleteSnapshotId.value);
  }
  showDeleteConfirm.value = false;
  deleteSnapshotId.value = null;
}

function handleArchive(id: string) {
  archiveSnapshotId.value = id;
  archiveAction.value = 'archive';
  showArchiveConfirm.value = true;
}

function handleUnarchive(id: string) {
  archiveSnapshotId.value = id;
  archiveAction.value = 'unarchive';
  showArchiveConfirm.value = true;
}

function confirmArchive() {
  if (archiveSnapshotId.value) {
    if (archiveAction.value === 'archive') {
      snapshotStore.archiveSnapshot(archiveSnapshotId.value);
    } else {
      snapshotStore.unarchiveSnapshot(archiveSnapshotId.value);
    }
  }
  showArchiveConfirm.value = false;
  archiveSnapshotId.value = null;
}

function handleCreated(snapshotId: string) {
  router.push(`/snapshots/${snapshotId}`);
}

function goToCompare() {
  if (snapshotStore.totalCount < 2) {
    alert('至少需要两个快照才能进行对比');
    return;
  }
  router.push('/snapshots/compare');
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

    <main class="p-6">
      <div class="max-w-7xl mx-auto space-y-6">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-xl font-bold text-console-100 flex items-center gap-2">
              <Camera class="w-6 h-6 text-harbor-cyan" />
              调度复盘与历史快照
            </h2>
            <p class="text-sm text-console-400 mt-1">
              保存调度盘面的历史快照，用于培训、复盘和事件追踪
            </p>
          </div>
          <div class="flex items-center gap-2">
            <button
              @click="goToCompare"
              class="h-9 px-4 bg-console-800/60 text-console-200 text-sm font-medium rounded-lg border border-console-500/40 hover:border-harbor-purple/50 hover:text-harbor-purple transition-all flex items-center gap-2"
            >
              <GitCompare class="w-4 h-4" />
              盘面对比
            </button>
            <button
              @click="showCreateModal = true"
              class="h-9 px-4 bg-gradient-to-r from-harbor-cyan to-harbor-blue text-white text-sm font-medium rounded-lg hover:shadow-glow-cyan transition-all flex items-center gap-2"
            >
              <Plus class="w-4 h-4" />
              创建快照
            </button>
          </div>
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

        <SnapshotListTable
          @view-detail="viewDetail"
          @compare="handleCompare"
          @delete="handleDelete"
          @archive="handleArchive"
          @unarchive="handleUnarchive"
        />
      </div>
    </main>

    <CreateSnapshotModal
      :visible="showCreateModal"
      @close="showCreateModal = false"
      @created="handleCreated"
    />

    <Teleport to="body">
      <div
        v-if="showDeleteConfirm"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div
          class="absolute inset-0 bg-black/60 backdrop-blur-sm"
          @click="showDeleteConfirm = false"
        />
        <div class="relative w-full max-w-md bg-console-800 rounded-xl border border-console-500/40 shadow-2xl overflow-hidden">
          <div class="p-5">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-10 h-10 rounded-full bg-harbor-red/20 flex items-center justify-center">
                <AlertTriangle class="w-5 h-5 text-harbor-red" />
              </div>
              <div>
                <h3 class="text-base font-semibold text-console-100">确认删除快照？</h3>
                <p class="text-sm text-console-400 mt-0.5">删除后无法恢复</p>
              </div>
            </div>
            <div class="p-3 bg-console-900/50 rounded-lg border border-console-500/30">
              <p class="text-sm text-console-300">
                删除快照将永久移除该历史记录，包括所有调度数据、日志和备注信息。此操作不可撤销。
              </p>
            </div>
          </div>
          <div class="flex items-center justify-end gap-3 px-5 py-4 border-t border-console-500/30 bg-console-900/30">
            <button
              @click="showDeleteConfirm = false"
              class="h-9 px-4 text-sm text-console-300 hover:text-console-100 bg-console-700/50 hover:bg-console-700 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              @click="confirmDelete"
              class="h-9 px-5 text-sm font-medium text-white bg-gradient-to-r from-harbor-red to-harbor-orange rounded-lg hover:shadow-glow-orange transition-all flex items-center gap-2"
            >
              <AlertTriangle class="w-4 h-4" />
              确认删除
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div
        v-if="showArchiveConfirm"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div
          class="absolute inset-0 bg-black/60 backdrop-blur-sm"
          @click="showArchiveConfirm = false"
        />
        <div class="relative w-full max-w-md bg-console-800 rounded-xl border border-console-500/40 shadow-2xl overflow-hidden">
          <div class="p-5">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-10 h-10 rounded-full bg-harbor-orange/20 flex items-center justify-center">
                <Archive class="w-5 h-5 text-harbor-orange" />
              </div>
              <div>
                <h3 class="text-base font-semibold text-console-100">
                  {{ archiveAction === 'archive' ? '确认归档快照？' : '确认取消归档？' }}
                </h3>
                <p class="text-sm text-console-400 mt-0.5">
                  {{ archiveAction === 'archive' ? '归档后可在归档列表中查看' : '取消归档后恢复为正常状态' }}
                </p>
              </div>
            </div>
          </div>
          <div class="flex items-center justify-end gap-3 px-5 py-4 border-t border-console-500/30 bg-console-900/30">
            <button
              @click="showArchiveConfirm = false"
              class="h-9 px-4 text-sm text-console-300 hover:text-console-100 bg-console-700/50 hover:bg-console-700 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              @click="confirmArchive"
              class="h-9 px-5 text-sm font-medium text-white bg-gradient-to-r from-harbor-orange to-harbor-yellow rounded-lg hover:shadow-glow-orange transition-all flex items-center gap-2"
            >
              <Archive class="w-4 h-4" />
              {{ archiveAction === 'archive' ? '确认归档' : '取消归档' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
