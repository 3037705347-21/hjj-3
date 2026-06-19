<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useResourceStore } from '../../stores/resource';
import { useScheduleStore } from '../../stores/schedule';
import { useAuthStore } from '../../stores/auth';
import {
  Anchor,
  LayoutDashboard,
  User,
  RefreshCw,
  Settings,
  Bell,
  Users,
  ClipboardCheck,
  Shield,
  Plus,
  Search,
  Filter,
  Edit3,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Wrench,
  Ban,
  ChevronDown,
  Calendar,
  Building2,
  HardHat,
  Cpu,
  GripVertical,
  History,
  Layers,
} from 'lucide-vue-next';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import {
  RESOURCE_TYPE_LABELS,
  RESOURCE_STATUS_LABELS,
  type ResourceType,
  type ResourceStatus,
  type Resource,
} from '../../types';
import ResourceEditModal from '../../components/resource/ResourceEditModal.vue';
import ResourceAllocationModal from '../../components/resource/ResourceAllocationModal.vue';
import { USER_ROLE_LABELS } from '../../types';

const resourceStore = useResourceStore();
const scheduleStore = useScheduleStore();
const authStore = useAuthStore();
const router = useRouter();

const currentTime = ref(new Date());
const searchQuery = ref('');
const typeFilter = ref<ResourceType | 'all'>('all');
const statusFilter = ref<ResourceStatus | 'all'>('all');
const berthFilter = ref<string | 'all'>('all');
const showTypeDropdown = ref(false);
const showStatusDropdown = ref(false);
const showBerthDropdown = ref(false);

const showEditModal = ref(false);
const editingResource = ref<Resource | null>(null);
const isCreating = ref(false);

const showAllocationModal = ref(false);
const allocatingResourceId = ref<string | null>(null);

onMounted(() => {
  setInterval(() => {
    currentTime.value = new Date();
  }, 1000);
  resourceStore.detectResourceConflicts();
});

const conflictCount = computed(() => resourceStore.activeConflicts.length);

const filteredResources = computed(() => {
  return resourceStore.resources.filter((r) => {
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase();
      if (
        !r.name.toLowerCase().includes(query) &&
        !(r.operationTeam || '').toLowerCase().includes(query) &&
        !(r.remarks || '').toLowerCase().includes(query)
      ) {
        return false;
      }
    }
    if (typeFilter.value !== 'all' && r.type !== typeFilter.value) {
      return false;
    }
    if (statusFilter.value !== 'all' && r.status !== statusFilter.value) {
      return false;
    }
    if (berthFilter.value !== 'all' && r.berthId !== berthFilter.value) {
      return false;
    }
    return true;
  });
});

const resourceStats = computed(() => [
  {
    label: '总资源数',
    value: resourceStore.resources.length,
    icon: Layers,
    color: 'text-harbor-cyan',
    bgClass: 'bg-harbor-cyan/15',
    borderClass: 'border-harbor-cyan/30',
  },
  {
    label: '可用资源',
    value: resourceStore.resources.filter((r) => r.status === 'available').length,
    icon: CheckCircle,
    color: 'text-harbor-green',
    bgClass: 'bg-harbor-green/15',
    borderClass: 'border-harbor-green/30',
  },
  {
    label: '占用中',
    value: resourceStore.resources.filter((r) => r.status === 'occupied').length,
    icon: Users,
    color: 'text-harbor-orange',
    bgClass: 'bg-harbor-orange/15',
    borderClass: 'border-harbor-orange/30',
  },
  {
    label: '资源冲突',
    value: resourceStore.activeConflicts.length,
    icon: AlertTriangle,
    color: 'text-harbor-red',
    bgClass: 'bg-harbor-red/15',
    borderClass: 'border-harbor-red/30',
  },
]);

function getResourceTypeIcon(type: ResourceType) {
  switch (type) {
    case 'berth':
      return Building2;
    case 'team':
      return HardHat;
    case 'equipment':
      return Cpu;
  }
}

function getStatusClass(status: ResourceStatus) {
  switch (status) {
    case 'available':
      return 'bg-harbor-green/15 text-harbor-green border-harbor-green/30';
    case 'occupied':
      return 'bg-harbor-orange/15 text-harbor-orange border-harbor-orange/30';
    case 'maintenance':
      return 'bg-harbor-yellow/15 text-harbor-yellow border-harbor-yellow/30';
    case 'disabled':
      return 'bg-harbor-red/15 text-harbor-red border-harbor-red/30';
  }
}

function getBerthName(berthId?: string) {
  if (!berthId) return '-';
  const berth = scheduleStore.getBerthById(berthId);
  return berth?.name || berthId;
}

function openCreateResource() {
  isCreating.value = true;
  editingResource.value = null;
  showEditModal.value = true;
}

function openEditResource(resource: Resource) {
  isCreating.value = false;
  editingResource.value = resource;
  showEditModal.value = true;
}

function openAllocateResource(resourceId: string) {
  allocatingResourceId.value = resourceId;
  showAllocationModal.value = true;
}

function deleteResource(id: string) {
  if (!confirm('确定要删除该资源吗？')) return;
  resourceStore.deleteResource(id);
}

function toggleResourceStatus(resource: Resource) {
  if (resource.status === 'disabled') {
    resourceStore.updateResourceStatus(resource.id, 'available');
  } else if (resource.status === 'available' || resource.status === 'occupied') {
    const reason = prompt('请输入停用原因:');
    if (reason !== null) {
      resourceStore.updateResourceStatus(resource.id, 'disabled', reason || '手动停用');
    }
  }
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
              @click="router.push('/approval')"
              class="px-3 py-1.5 rounded text-xs font-mono font-medium text-console-300 border border-console-500/30 hover:bg-console-700/50 hover:text-console-100 transition-all flex items-center gap-1.5"
            >
              <ClipboardCheck class="w-3.5 h-3.5" />
              调度审批
            </button>
            <button
              @click="router.push('/resources')"
              class="px-3 py-1.5 rounded text-xs font-mono font-medium bg-harbor-cyan/15 text-harbor-cyan border border-harbor-cyan/30 shadow-glow-blue"
            >
              <Layers class="w-3.5 h-3.5 inline mr-1" />
              资源协同
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
              <p class="text-xs font-mono font-medium text-console-100">{{ authStore.currentUser?.displayName || resourceStore.currentOperator }}</p>
              <p class="text-[9px] font-mono text-console-400">{{ authStore.currentUser ? USER_ROLE_LABELS[authStore.currentUser.role] : '调度员' }}</p>
            </div>
          </div>
        </div>
      </div>
    </header>

    <main class="p-4 space-y-4">
      <div class="flex items-center gap-2 px-2">
        <button
          @click="router.push('/resources')"
          class="px-3 py-1.5 rounded text-xs font-mono font-medium bg-harbor-cyan/15 text-harbor-cyan border border-harbor-cyan/30"
        >
          资源列表
        </button>
        <button
          @click="router.push('/resources/board')"
          class="px-3 py-1.5 rounded text-xs font-mono font-medium text-console-300 border border-console-500/30 hover:bg-console-700/50 hover:text-console-100 transition-all"
        >
          资源占用看板
        </button>
        <button
          @click="router.push('/resources/conflicts')"
          class="px-3 py-1.5 rounded text-xs font-mono font-medium text-console-300 border border-console-500/30 hover:bg-console-700/50 hover:text-console-100 transition-all relative"
        >
          资源冲突
          <span
            v-if="conflictCount > 0"
            class="ml-1.5 min-w-[16px] h-[16px] px-0.5 rounded-full bg-harbor-red text-white text-[8px] font-mono font-bold inline-flex items-center justify-center"
          >
            {{ conflictCount }}
          </span>
        </button>
      </div>

      <div class="grid grid-cols-4 gap-4">
        <div
          v-for="stat in resourceStats"
          :key="stat.label"
          class="panel-border rounded-lg p-4"
        >
          <div class="flex items-center justify-between">
            <div>
              <p class="text-[10px] font-mono text-console-400 uppercase tracking-wider">{{ stat.label }}</p>
              <p class="text-2xl font-mono font-bold text-console-100 mt-1 tabular-nums">{{ stat.value }}</p>
            </div>
            <div :class="['w-10 h-10 rounded-lg flex items-center justify-center', stat.bgClass, 'border', stat.borderClass]">
              <component :is="stat.icon" :class="['w-5 h-5', stat.color]" />
            </div>
          </div>
        </div>
      </div>

      <div class="panel-border rounded-lg overflow-hidden">
        <div class="flex items-center justify-between px-4 py-3 border-b border-console-500/30">
          <div class="flex items-center gap-3">
            <GripVertical class="w-4 h-4 text-console-300" />
            <h3 class="font-mono text-sm font-semibold text-console-100 tracking-wide">
              泊位资源列表
            </h3>
            <span class="text-[10px] font-mono text-console-300">
              共 {{ filteredResources.length }} 条记录
            </span>
          </div>
          <div class="flex items-center gap-2">
            <div class="relative">
              <Search class="w-3.5 h-3.5 text-console-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                v-model="searchQuery"
                type="text"
                placeholder="搜索资源名称、班组、备注..."
                class="pl-8 pr-3 py-1.5 text-xs font-mono bg-console-800/80 border border-console-500/40 rounded text-console-100 placeholder:text-console-500 focus:outline-none focus:border-harbor-cyan/50 w-64"
              />
            </div>

            <div class="relative">
              <button
                @click="showTypeDropdown = !showTypeDropdown"
                class="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-mono text-console-200 bg-console-800/80 border border-console-500/40 rounded hover:border-console-400/50 transition-all"
              >
                <Filter class="w-3 h-3" />
                {{ typeFilter === 'all' ? '全部类型' : RESOURCE_TYPE_LABELS[typeFilter] }}
                <ChevronDown class="w-3 h-3" />
              </button>
              <div
                v-if="showTypeDropdown"
                class="absolute top-full right-0 mt-1 bg-console-800 border border-console-500/40 rounded-lg shadow-xl z-20 min-w-[120px] overflow-hidden"
              >
                <button
                  @click="typeFilter = 'all'; showTypeDropdown = false"
                  class="w-full px-3 py-2 text-left text-xs font-mono text-console-200 hover:bg-console-700/50 transition-colors"
                >
                  全部类型
                </button>
                <button
                  v-for="(label, key) in RESOURCE_TYPE_LABELS"
                  :key="key"
                  @click="typeFilter = key as ResourceType; showTypeDropdown = false"
                  class="w-full px-3 py-2 text-left text-xs font-mono text-console-200 hover:bg-console-700/50 transition-colors"
                >
                  {{ label }}
                </button>
              </div>
            </div>

            <div class="relative">
              <button
                @click="showStatusDropdown = !showStatusDropdown"
                class="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-mono text-console-200 bg-console-800/80 border border-console-500/40 rounded hover:border-console-400/50 transition-all"
              >
                <Filter class="w-3 h-3" />
                {{ statusFilter === 'all' ? '全部状态' : RESOURCE_STATUS_LABELS[statusFilter] }}
                <ChevronDown class="w-3 h-3" />
              </button>
              <div
                v-if="showStatusDropdown"
                class="absolute top-full right-0 mt-1 bg-console-800 border border-console-500/40 rounded-lg shadow-xl z-20 min-w-[120px] overflow-hidden"
              >
                <button
                  @click="statusFilter = 'all'; showStatusDropdown = false"
                  class="w-full px-3 py-2 text-left text-xs font-mono text-console-200 hover:bg-console-700/50 transition-colors"
                >
                  全部状态
                </button>
                <button
                  v-for="(label, key) in RESOURCE_STATUS_LABELS"
                  :key="key"
                  @click="statusFilter = key as ResourceStatus; showStatusDropdown = false"
                  class="w-full px-3 py-2 text-left text-xs font-mono text-console-200 hover:bg-console-700/50 transition-colors"
                >
                  {{ label }}
                </button>
              </div>
            </div>

            <div class="relative">
              <button
                @click="showBerthDropdown = !showBerthDropdown"
                class="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-mono text-console-200 bg-console-800/80 border border-console-500/40 rounded hover:border-console-400/50 transition-all"
              >
                <Building2 class="w-3 h-3" />
                {{ berthFilter === 'all' ? '全部泊位' : getBerthName(berthFilter) }}
                <ChevronDown class="w-3 h-3" />
              </button>
              <div
                v-if="showBerthDropdown"
                class="absolute top-full right-0 mt-1 bg-console-800 border border-console-500/40 rounded-lg shadow-xl z-20 min-w-[160px] overflow-hidden max-h-60 overflow-y-auto"
              >
                <button
                  @click="berthFilter = 'all'; showBerthDropdown = false"
                  class="w-full px-3 py-2 text-left text-xs font-mono text-console-200 hover:bg-console-700/50 transition-colors"
                >
                  全部泊位
                </button>
                <button
                  v-for="berth in scheduleStore.sortedBerths"
                  :key="berth.id"
                  @click="berthFilter = berth.id; showBerthDropdown = false"
                  class="w-full px-3 py-2 text-left text-xs font-mono text-console-200 hover:bg-console-700/50 transition-colors"
                >
                  {{ berth.name }}
                </button>
              </div>
            </div>

            <button
              v-if="authStore.canManageResources"
              @click="openCreateResource"
              class="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-mono text-console-900 bg-gradient-to-r from-harbor-cyan to-harbor-cyan/80 rounded shadow-glow-cyan hover:shadow-glow-blue transition-all"
            >
              <Plus class="w-3.5 h-3.5" />
              新增资源
            </button>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-console-800/50">
              <tr>
                <th class="px-4 py-3 text-left text-[10px] font-mono text-console-400 uppercase tracking-wider">资源类型</th>
                <th class="px-4 py-3 text-left text-[10px] font-mono text-console-400 uppercase tracking-wider">资源名称</th>
                <th class="px-4 py-3 text-left text-[10px] font-mono text-console-400 uppercase tracking-wider">所属泊位</th>
                <th class="px-4 py-3 text-left text-[10px] font-mono text-console-400 uppercase tracking-wider">可用时段</th>
                <th class="px-4 py-3 text-left text-[10px] font-mono text-console-400 uppercase tracking-wider">当前状态</th>
                <th class="px-4 py-3 text-left text-[10px] font-mono text-console-400 uppercase tracking-wider">绑定计划</th>
                <th class="px-4 py-3 text-left text-[10px] font-mono text-console-400 uppercase tracking-wider">操作班组</th>
                <th class="px-4 py-3 text-left text-[10px] font-mono text-console-400 uppercase tracking-wider">备注/停用原因</th>
                <th class="px-4 py-3 text-right text-[10px] font-mono text-console-400 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-console-500/20">
              <tr
                v-for="resource in filteredResources"
                :key="resource.id"
                class="hover:bg-console-700/20 transition-colors"
              >
                <td class="px-4 py-3">
                  <div class="flex items-center gap-2">
                    <div class="w-7 h-7 rounded bg-console-700/50 flex items-center justify-center">
                      <component :is="getResourceTypeIcon(resource.type)" class="w-3.5 h-3.5 text-console-300" />
                    </div>
                    <span class="text-xs font-mono text-console-200">{{ RESOURCE_TYPE_LABELS[resource.type] }}</span>
                  </div>
                </td>
                <td class="px-4 py-3">
                  <span class="text-xs font-mono font-medium text-console-100">{{ resource.name }}</span>
                </td>
                <td class="px-4 py-3">
                  <span class="text-xs font-mono text-console-300">{{ getBerthName(resource.berthId) }}</span>
                </td>
                <td class="px-4 py-3">
                  <div class="flex items-center gap-1.5">
                    <Calendar class="w-3 h-3 text-console-400" />
                    <span class="text-[10px] font-mono text-console-300">
                      {{ resource.availableSlots.length > 0 ? `${format(resource.availableSlots[0].start, 'MM/dd', { locale: zhCN })} - ${format(resource.availableSlots[0].end, 'MM/dd', { locale: zhCN })}` : '-' }}
                    </span>
                  </div>
                </td>
                <td class="px-4 py-3">
                  <span :class="['inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-mono', getStatusClass(resource.status)]">
                    <span
                      v-if="resource.status === 'occupied'"
                      class="w-1.5 h-1.5 rounded-full bg-harbor-orange animate-pulse"
                    />
                    <span
                      v-else-if="resource.status === 'maintenance'"
                      class="w-1.5 h-1.5 rounded-full bg-harbor-yellow animate-pulse"
                    />
                    {{ RESOURCE_STATUS_LABELS[resource.status] }}
                  </span>
                </td>
                <td class="px-4 py-3">
                  <div class="flex flex-wrap gap-1">
                    <span
                      v-for="sid in resource.scheduleIds.slice(0, 2)"
                      :key="sid"
                      class="px-1.5 py-0.5 rounded bg-console-700/50 text-[10px] font-mono text-console-300 border border-console-500/30"
                    >
                      {{ sid }}
                    </span>
                    <span
                      v-if="resource.scheduleIds.length > 2"
                      class="px-1.5 py-0.5 rounded bg-console-700/50 text-[10px] font-mono text-console-400"
                    >
                      +{{ resource.scheduleIds.length - 2 }}
                    </span>
                    <span v-if="resource.scheduleIds.length === 0" class="text-[10px] font-mono text-console-500">-</span>
                  </div>
                </td>
                <td class="px-4 py-3">
                  <span class="text-xs font-mono text-console-300">{{ resource.operationTeam || '-' }}</span>
                </td>
                <td class="px-4 py-3 max-w-[200px]">
                  <div v-if="resource.status === 'disabled' || resource.status === 'maintenance'">
                    <div class="flex items-start gap-1.5">
                      <Ban v-if="resource.status === 'disabled'" class="w-3 h-3 text-harbor-red mt-0.5 flex-shrink-0" />
                      <Wrench v-else class="w-3 h-3 text-harbor-yellow mt-0.5 flex-shrink-0" />
                      <span class="text-[10px] font-mono text-harbor-red line-clamp-2">{{ resource.disableReason || resource.remarks }}</span>
                    </div>
                  </div>
                  <span v-else class="text-[10px] font-mono text-console-400 line-clamp-2">{{ resource.remarks || '-' }}</span>
                </td>
                <td class="px-4 py-3">
                  <div class="flex items-center justify-end gap-1">
                    <button
                      v-if="authStore.canAllocateResources"
                      @click="openAllocateResource(resource.id)"
                      :disabled="resource.status === 'disabled' || resource.status === 'maintenance'"
                      class="p-1.5 rounded text-console-300 hover:bg-console-700/50 hover:text-harbor-cyan transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      title="分配资源"
                    >
                      <Users class="w-3.5 h-3.5" />
                    </button>
                    <button
                      v-if="authStore.canManageResources"
                      @click="openEditResource(resource)"
                      class="p-1.5 rounded text-console-300 hover:bg-console-700/50 hover:text-harbor-yellow transition-all"
                      title="编辑资源"
                    >
                      <Edit3 class="w-3.5 h-3.5" />
                    </button>
                    <button
                      v-if="authStore.canManageResources"
                      @click="toggleResourceStatus(resource)"
                      :class="['p-1.5 rounded transition-all', resource.status === 'disabled' ? 'text-harbor-green hover:bg-harbor-green/10' : 'text-console-300 hover:bg-console-700/50 hover:text-harbor-red']"
                      :title="resource.status === 'disabled' ? '启用资源' : '停用资源'"
                    >
                      <Ban v-if="resource.status !== 'disabled'" class="w-3.5 h-3.5" />
                      <CheckCircle v-else class="w-3.5 h-3.5" />
                    </button>
                    <button
                      v-if="authStore.canManageResources"
                      @click="deleteResource(resource.id)"
                      class="p-1.5 rounded text-console-300 hover:bg-console-700/50 hover:text-harbor-red transition-all"
                      title="删除资源"
                    >
                      <Trash2 class="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="filteredResources.length === 0">
                <td colspan="9" class="px-4 py-12 text-center">
                  <div class="flex flex-col items-center gap-2">
                    <Layers class="w-8 h-8 text-console-500" />
                    <p class="text-xs font-mono text-console-400">暂无匹配的资源记录</p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>

    <ResourceEditModal
      v-if="showEditModal"
      :visible="showEditModal"
      :is-creating="isCreating"
      :resource="editingResource"
      @close="showEditModal = false"
    />

    <ResourceAllocationModal
      v-if="showAllocationModal"
      :visible="showAllocationModal"
      :resource-id="allocatingResourceId"
      @close="showAllocationModal = false; allocatingResourceId = null"
    />
  </div>
</template>
