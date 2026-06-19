<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useScheduleStore } from '../../stores/schedule';
import { useAuthStore } from '../../stores/auth';
import { useExternalScheduleStore } from '../../stores/externalSchedule';
import {
  USER_ROLE_LABELS,
  EXTERNAL_DATA_SOURCE_LABELS,
} from '../../types';
import type { ExternalDataSource } from '../../types';
import ExternalSyncStatusBadge from '../../components/external/ExternalSyncStatusBadge.vue';
import {
  Anchor,
  History,
  User,
  RefreshCw,
  Settings,
  Bell,
  ArrowLeft,
  FileText,
  Database,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Upload,
  Eye,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  Users,
} from 'lucide-vue-next';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const store = useScheduleStore();
const authStore = useAuthStore();
const externalStore = useExternalScheduleStore();
const router = useRouter();

const currentTime = ref(new Date());
const filterSource = ref<ExternalDataSource | 'all'>('all');
const searchQuery = ref('');
const sortField = ref<'importTime' | 'totalCount'>('importTime');
const sortOrder = ref<'asc' | 'desc'>('desc');
const showFilters = ref(false);
const expandedBatchId = ref<string | null>(null);

onMounted(() => {
  setInterval(() => {
    currentTime.value = new Date();
  }, 1000);
});

const filteredRecords = computed(() => {
  let result = [...externalStore.importRecords];

  if (filterSource.value !== 'all') {
    result = result.filter((r) => r.sourceSystem === filterSource.value);
  }

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(
      (r) =>
        r.batchNo.toLowerCase().includes(query) ||
        r.operator.toLowerCase().includes(query) ||
        (r.fileName && r.fileName.toLowerCase().includes(query)),
    );
  }

  result.sort((a, b) => {
    if (sortField.value === 'importTime') {
      const aTime = new Date(a.importTime).getTime();
      const bTime = new Date(b.importTime).getTime();
      return sortOrder.value === 'desc' ? bTime - aTime : aTime - bTime;
    } else {
      return sortOrder.value === 'desc' ? b.totalCount - a.totalCount : a.totalCount - b.totalCount;
    }
  });

  return result;
});

const sourceOptions = computed(() => [
  { key: 'all', label: '全部来源' },
  ...Object.entries(EXTERNAL_DATA_SOURCE_LABELS).map(([key, label]) => ({ key, label })),
]);

function toggleSort(field: 'importTime' | 'totalCount') {
  if (sortField.value === field) {
    sortOrder.value = sortOrder.value === 'desc' ? 'asc' : 'desc';
  } else {
    sortField.value = field;
    sortOrder.value = 'desc';
  }
}

function formatDateTime(date: Date | string): string {
  return format(new Date(date), 'yyyy-MM-dd HH:mm', { locale: zhCN });
}

function goBack() {
  router.push('/external-schedules');
}

function toggleExpand(batchId: string) {
  expandedBatchId.value = expandedBatchId.value === batchId ? null : batchId;
}

function viewExternalDetail(id: string) {
  router.push(`/external-schedules/${id}`);
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
              class="px-3 py-1.5 rounded text-xs font-mono font-medium bg-harbor-cyan/15 text-harbor-cyan border border-harbor-cyan/30 shadow-glow-cyan flex items-center gap-1.5"
            >
              <Database class="w-3.5 h-3.5" />
              外部船期接入
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

          <button class="w-9 h-9 rounded-lg bg-console-800/60 border border-console-500/40 flex items-center justify-center text-console-300 hover:text-console-100 hover:border-console-400/50 transition-all">
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
          <button
            @click="goBack"
            class="w-8 h-8 rounded flex items-center justify-center text-console-300 border border-console-500/30 hover:bg-console-700/50 hover:text-console-100 transition-all"
          >
            <ArrowLeft class="w-4 h-4" />
          </button>
          <div>
            <div class="flex items-center gap-2">
              <FileText class="w-5 h-5 text-harbor-cyan" />
              <h2 class="font-mono text-lg font-bold text-console-100">导入记录</h2>
            </div>
            <p class="text-xs text-console-500 mt-1">查看所有外部船期数据的导入历史</p>
          </div>
        </div>
      </div>

      <div class="panel-border rounded-lg overflow-hidden">
        <div class="px-4 py-3 border-b border-console-500/20 bg-console-800/30">
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-2 flex-1">
              <div class="relative flex-1 max-w-md">
                <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-console-400" />
                <input
                  v-model="searchQuery"
                  type="text"
                  placeholder="搜索批次号、操作人、文件名..."
                  class="w-full pl-9 pr-3 py-1.5 rounded bg-console-900/60 border border-console-500/30 text-xs font-mono text-console-100 placeholder:text-console-500 focus:outline-none focus:border-harbor-cyan/50"
                />
              </div>
              <button
                @click="showFilters = !showFilters"
                :class="[
                  'flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono border transition-all',
                  showFilters
                    ? 'bg-harbor-cyan/20 text-harbor-cyan border-harbor-cyan/40'
                    : 'bg-console-800/60 text-console-300 border-console-500/30 hover:border-console-400/50',
                ]"
              >
                <Filter class="w-3.5 h-3.5" />
                筛选
              </button>
            </div>
            <div class="text-xs font-mono text-console-400">
              共 {{ filteredRecords.length }} 条记录
            </div>
          </div>

          <div
            v-if="showFilters"
            class="mt-3 pt-3 border-t border-console-500/20 flex items-center gap-3 flex-wrap"
          >
            <div>
              <select
                v-model="filterSource"
                class="px-3 py-1.5 rounded bg-console-900/60 border border-console-500/30 text-xs font-mono text-console-100 focus:outline-none focus:border-harbor-cyan/50"
              >
                <option v-for="opt in sourceOptions" :key="opt.key" :value="opt.key">
                  {{ opt.label }}
                </option>
              </select>
            </div>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left">
            <thead>
              <tr class="border-b border-console-500/20 bg-console-800/20">
                <th class="px-4 py-2.5 w-10"></th>
                <th class="px-4 py-2.5 text-[10px] font-mono text-console-400 uppercase tracking-wider font-medium">
                  批次号
                </th>
                <th class="px-4 py-2.5 text-[10px] font-mono text-console-400 uppercase tracking-wider font-medium">
                  来源系统
                </th>
                <th
                  class="px-4 py-2.5 text-[10px] font-mono text-console-400 uppercase tracking-wider font-medium cursor-pointer hover:text-console-200 transition-colors"
                  @click="toggleSort('importTime')"
                >
                  <span class="flex items-center gap-1">
                    导入时间
                    <component
                      :is="sortField === 'importTime' ? (sortOrder === 'desc' ? ChevronDown : ChevronUp) : null"
                      class="w-3 h-3"
                    />
                  </span>
                </th>
                <th class="px-4 py-2.5 text-[10px] font-mono text-console-400 uppercase tracking-wider font-medium">
                  操作人
                </th>
                <th class="px-4 py-2.5 text-[10px] font-mono text-console-400 uppercase tracking-wider font-medium text-center">
                  总数
                </th>
                <th class="px-4 py-2.5 text-[10px] font-mono text-console-400 uppercase tracking-wider font-medium text-center">
                  已匹配
                </th>
                <th class="px-4 py-2.5 text-[10px] font-mono text-console-400 uppercase tracking-wider font-medium text-center">
                  已同步
                </th>
                <th class="px-4 py-2.5 text-[10px] font-mono text-console-400 uppercase tracking-wider font-medium text-center">
                  未匹配
                </th>
                <th class="px-4 py-2.5 text-[10px] font-mono text-console-400 uppercase tracking-wider font-medium text-center">
                  有冲突
                </th>
                <th class="px-4 py-2.5 text-[10px] font-mono text-console-400 uppercase tracking-wider font-medium text-center">
                  失败
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-console-500/10">
              <template v-for="record in filteredRecords" :key="record.id">
                <tr
                  class="hover:bg-console-700/30 transition-colors cursor-pointer"
                  @click="toggleExpand(record.id)"
                >
                  <td class="px-4 py-3">
                    <component
                      :is="expandedBatchId === record.id ? ChevronUp : ChevronDown"
                      class="w-4 h-4 text-console-500"
                    />
                  </td>
                  <td class="px-4 py-3">
                    <span class="text-xs font-mono text-harbor-cyan font-medium">
                      {{ record.batchNo }}
                    </span>
                    <p v-if="record.fileName" class="text-[10px] text-console-500 mt-0.5 truncate max-w-[150px]" :title="record.fileName">
                      {{ record.fileName }}
                    </p>
                  </td>
                  <td class="px-4 py-3">
                    <div class="flex items-center gap-1.5">
                      <Database class="w-3 h-3 text-console-500 shrink-0" />
                      <span class="text-xs text-console-300">
                        {{ EXTERNAL_DATA_SOURCE_LABELS[record.sourceSystem] }}
                      </span>
                    </div>
                  </td>
                  <td class="px-4 py-3">
                    <div class="flex items-center gap-1.5">
                      <Clock class="w-3 h-3 text-console-500" />
                      <span class="text-xs font-mono text-console-300">
                        {{ formatDateTime(record.importTime) }}
                      </span>
                    </div>
                  </td>
                  <td class="px-4 py-3">
                    <div class="flex items-center gap-1.5">
                      <Users class="w-3 h-3 text-console-500 shrink-0" />
                      <span class="text-xs text-console-300">{{ record.operator }}</span>
                    </div>
                  </td>
                  <td class="px-4 py-3 text-center">
                    <span class="text-sm font-mono font-medium text-console-200">
                      {{ record.totalCount }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-center">
                    <span class="text-sm font-mono text-harbor-green">
                      {{ record.matchedCount }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-center">
                    <span class="text-sm font-mono text-harbor-cyan">
                      {{ record.syncedCount || 0 }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-center">
                    <span class="text-sm font-mono text-harbor-orange">
                      {{ record.unmatchedCount }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-center">
                    <span class="text-sm font-mono text-harbor-red">
                      {{ record.conflictCount }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-center">
                    <span class="text-sm font-mono text-console-500">
                      {{ record.failedCount }}
                    </span>
                  </td>
                </tr>
                <tr v-if="expandedBatchId === record.id" class="bg-console-800/20">
                  <td colspan="11" class="px-4 py-3">
                    <div class="pl-4">
                      <h4 class="text-xs font-mono font-medium text-console-200 mb-3 flex items-center gap-2">
                        <FileText class="w-3.5 h-3.5 text-harbor-cyan" />
                        本批次外部船期 ({{ externalStore.getExternalSchedulesByBatch(record.id).length }} 条)
                      </h4>
                      <div class="grid grid-cols-2 gap-2">
                        <div
                          v-for="ext in externalStore.getExternalSchedulesByBatch(record.id)"
                          :key="ext.id"
                          class="flex items-center justify-between p-2 rounded bg-console-900/40 border border-console-500/20"
                        >
                          <div class="flex items-center gap-2">
                            <ExternalSyncStatusBadge :status="ext.syncStatus" size="sm" />
                            <span class="text-xs text-console-200">{{ ext.externalShipName }}</span>
                            <span class="text-[10px] font-mono text-console-500">{{ ext.imo }}</span>
                          </div>
                          <button
                            @click.stop="viewExternalDetail(ext.id)"
                            class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono text-harbor-cyan border border-harbor-cyan/30 hover:bg-harbor-cyan/10 transition-all"
                          >
                            <Eye class="w-2.5 h-2.5" />
                            详情
                          </button>
                        </div>
                      </div>
                      <div v-if="record.remark" class="mt-3 p-2 rounded bg-console-700/20 border border-console-500/20">
                        <p class="text-[11px] text-console-400">
                          <span class="text-console-300">备注：</span>{{ record.remark }}
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              </template>
              <tr v-if="filteredRecords.length === 0">
                <td colspan="10" class="px-4 py-12 text-center">
                  <FileText class="w-10 h-10 text-console-600 mx-auto mb-3" />
                  <p class="text-sm text-console-500 font-mono">暂无导入记录</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>
  </div>
</template>
