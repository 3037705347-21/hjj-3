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
  HardHat,
  Cpu,
  Layers,
  History,
  AlertTriangle,
  GripVertical,
  ChevronDown,
  Calendar,
  Building2,
} from 'lucide-vue-next';
import { format, addHours, differenceInMinutes } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import {
  RESOURCE_TYPE_LABELS,
  type ResourceType,
  type Resource,
} from '../../types';
import { USER_ROLE_LABELS } from '../../types';

const resourceStore = useResourceStore();
const scheduleStore = useScheduleStore();
const authStore = useAuthStore();
const router = useRouter();

const currentTime = ref(new Date());
const typeFilter = ref<ResourceType | 'all'>('all');
const berthFilter = ref<string | 'all'>('all');
const showTypeDropdown = ref(false);
const showBerthDropdown = ref(false);

const timelineRef = ref<HTMLElement | null>(null);
const rowHeight = 48;
const headerHeight = 44;
const resourceLabelWidth = 200;

onMounted(() => {
  setInterval(() => {
    currentTime.value = new Date();
  }, 1000);
  resourceStore.detectResourceConflicts();
});

const conflictCount = computed(() => resourceStore.activeConflicts.length);

const startTime = computed(() => addHours(new Date(), -6));
const endTime = computed(() => addHours(new Date(), 66));
const totalHours = computed(() =>
  (endTime.value.getTime() - startTime.value.getTime()) / 3600000,
);

function getPixelPerHour() {
  if (!timelineRef.value) return 60;
  return (timelineRef.value.clientWidth - resourceLabelWidth) / totalHours.value;
}

const timeMarkers = computed(() => {
  const markers: { time: Date; major: boolean }[] = [];
  for (let h = 0; h <= totalHours.value; h += 2) {
    const time = addHours(startTime.value, h);
    markers.push({ time, major: h % 12 === 0 });
  }
  return markers;
});

const currentTimeX = computed(() => {
  const now = new Date();
  const hours = (now.getTime() - startTime.value.getTime()) / 3600000;
  return resourceLabelWidth + hours * getPixelPerHour();
});

const filteredResources = computed(() => {
  return resourceStore.resources.filter((r) => {
    if (typeFilter.value !== 'all' && r.type !== typeFilter.value) return false;
    if (berthFilter.value !== 'all' && r.berthId !== berthFilter.value) return false;
    return true;
  });
});

function getBerthName(berthId?: string) {
  if (!berthId) return '-';
  const berth = scheduleStore.getBerthById(berthId);
  return berth?.name || berthId;
}

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

function getShipName(scheduleId: string) {
  const schedule = scheduleStore.schedules.find((s) => s.id === scheduleId);
  if (!schedule) return scheduleId;
  const ship = scheduleStore.getShipById(schedule.shipId);
  return ship?.name || scheduleId;
}

function getBlockPosition(resource: Resource, scheduleId: string) {
  const resourceIndex = filteredResources.value.findIndex((r) => r.id === resource.id);
  if (resourceIndex === -1) return null;

  const allocation = resourceStore.allocations.find(
    (a) => a.resourceId === resource.id && a.scheduleId === scheduleId,
  );
  if (!allocation) return null;

  const pph = getPixelPerHour();
  const startMinutes = differenceInMinutes(new Date(allocation.startTime), startTime.value) / 60;
  const durationMinutes = differenceInMinutes(new Date(allocation.endTime), new Date(allocation.startTime)) / 60;

  return {
    left: resourceLabelWidth + startMinutes * pph,
    width: Math.max(40, durationMinutes * pph),
    top: headerHeight + resourceIndex * rowHeight + 4,
    height: rowHeight - 8,
  };
}

function getAllocationsForResource(resourceId: string) {
  return resourceStore.allocations.filter((a) => a.resourceId === resourceId);
}

function hasResourceConflict(resourceId: string) {
  return resourceStore.activeConflicts.some((c) => c.resourceId === resourceId);
}

function getScheduleColor(scheduleId: string) {
  const schedule = scheduleStore.schedules.find((s) => s.id === scheduleId);
  if (!schedule) return 'from-console-500 to-console-400';
  const statusColors: Record<string, string> = {
    anchored: 'from-console-500 to-console-400',
    approaching: 'from-harbor-yellow/60 to-harbor-yellow/40',
    berthing: 'from-harbor-purple/60 to-harbor-purple/40',
    loading: 'from-harbor-cyan/60 to-harbor-cyan/40',
    unloading: 'from-harbor-cyan/60 to-harbor-cyan/40',
    departing: 'from-harbor-orange/60 to-harbor-orange/40',
    departed: 'from-console-400 to-console-300',
  };
  return statusColors[schedule.status] || 'from-console-500 to-console-400';
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
      <div class="flex items-center justify-between px-2">
        <div class="flex items-center gap-2">
          <button
            @click="router.push('/resources')"
            class="px-3 py-1.5 rounded text-xs font-mono font-medium text-console-300 border border-console-500/30 hover:bg-console-700/50 hover:text-console-100 transition-all"
          >
            资源列表
          </button>
          <button
            @click="router.push('/resources/board')"
            class="px-3 py-1.5 rounded text-xs font-mono font-medium bg-harbor-cyan/15 text-harbor-cyan border border-harbor-cyan/30"
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

        <div class="flex items-center gap-2">
          <div class="relative">
            <button
              @click="showTypeDropdown = !showTypeDropdown"
              class="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-mono text-console-200 bg-console-800/80 border border-console-500/40 rounded hover:border-console-400/50 transition-all"
            >
              <Layers class="w-3 h-3" />
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
        </div>
      </div>

      <div class="panel-border rounded-lg overflow-hidden">
        <div class="flex items-center justify-between px-4 py-3 border-b border-console-500/30">
          <div class="flex items-center gap-3">
            <GripVertical class="w-4 h-4 text-console-300" />
            <h3 class="font-mono text-sm font-semibold text-console-100 tracking-wide">
              资源占用时间轴
            </h3>
            <span class="text-[10px] font-mono text-console-300">
              共 {{ filteredResources.length }} 个资源
            </span>
          </div>
          <div
            v-if="conflictCount > 0"
            class="flex items-center gap-1.5 px-2 py-1 rounded bg-harbor-red/20 border border-harbor-red/40"
          >
            <AlertTriangle class="w-3 h-3 text-harbor-red" />
            <span class="text-[11px] font-mono text-harbor-red">
              {{ conflictCount }} 个资源冲突
            </span>
          </div>
        </div>

        <div
          ref="timelineRef"
          class="relative overflow-x-auto console-grid-bg"
          :style="{ minHeight: `${headerHeight + filteredResources.length * rowHeight}px` }"
        >
          <div
            class="absolute top-0 left-0 flex bg-console-800/80 border-b border-console-500/40 z-10"
            :style="{ height: `${headerHeight}px`, width: `${resourceLabelWidth + totalHours * getPixelPerHour()}px` }"
          >
            <div
              class="flex items-center px-3 border-r border-console-500/40"
              :style="{ width: `${resourceLabelWidth}px` }"
            >
              <span class="text-[11px] font-mono text-console-300 uppercase tracking-wider">资源</span>
            </div>
            <div class="relative flex-1 h-full">
              <div
                v-for="marker in timeMarkers"
                :key="marker.time.toISOString()"
                class="absolute top-0 h-full border-l"
                :class="marker.major ? 'border-console-400/50' : 'border-console-500/25'"
                :style="{
                  left: `${(differenceInMinutes(marker.time, startTime) / 60) * getPixelPerHour()}px`,
                }"
              >
                <span
                  v-if="marker.major"
                  class="absolute top-2 left-1 text-[10px] font-mono"
                  :class="format(marker.time, 'HH') === '00' ? 'text-harbor-orange' : 'text-console-200'"
                >
                  {{ format(marker.time, 'MM/dd HH:mm') }}
                </span>
              </div>
            </div>
          </div>

          <div
            class="absolute bg-harbor-red/20 border-x border-harbor-red/50 z-20 pointer-events-none"
            :style="{
              left: `${currentTimeX}px`,
              top: `${headerHeight}px`,
              width: '2px',
              height: `${filteredResources.length * rowHeight}px`,
            }"
          >
            <div class="absolute -top-5 -left-8 bg-harbor-red text-white text-[10px] font-mono px-1.5 py-0.5 rounded whitespace-nowrap">
              {{ format(new Date(), 'HH:mm') }}
            </div>
          </div>

          <div class="pt-0">
            <div
              v-for="(resource, idx) in filteredResources"
              :key="resource.id"
              class="flex border-b border-console-500/20 hover:bg-console-700/20 transition-colors"
              :style="{ height: `${rowHeight}px` }"
            >
              <div
                class="flex items-center gap-2 px-3 border-r border-console-500/30 bg-console-800/50"
                :style="{ width: `${resourceLabelWidth}px`, marginTop: idx === 0 ? `${headerHeight}px` : 0 }"
              >
                <div
                  v-if="hasResourceConflict(resource.id)"
                  class="w-2 h-2 rounded-full bg-harbor-red animate-pulse"
                />
                <div
                  v-else-if="resource.status === 'occupied'"
                  class="w-2 h-2 rounded-full bg-harbor-orange"
                />
                <div
                  v-else-if="resource.status === 'maintenance'"
                  class="w-2 h-2 rounded-full bg-harbor-yellow animate-pulse"
                />
                <div
                  v-else-if="resource.status === 'disabled'"
                  class="w-2 h-2 rounded-full bg-harbor-red"
                />
                <div v-else class="w-2 h-2 rounded-full bg-harbor-green" />
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-1">
                    <component :is="getResourceTypeIcon(resource.type)" class="w-3 h-3 text-console-400 flex-shrink-0" />
                    <p class="text-xs font-mono font-medium text-console-100 truncate">
                      {{ resource.name }}
                    </p>
                  </div>
                  <p class="text-[10px] font-mono text-console-400 truncate">
                    {{ getBerthName(resource.berthId) }}
                  </p>
                </div>
              </div>
              <div
                class="relative flex-1"
                :style="{ minWidth: `${totalHours * getPixelPerHour()}px`, marginTop: idx === 0 ? `${headerHeight}px` : 0 }"
              >
                <div
                  v-for="marker in timeMarkers.filter((m) => m.major)"
                  :key="`${resource.id}-${marker.time.toISOString()}`"
                  class="absolute top-0 h-full border-l border-console-500/15"
                  :style="{
                    left: `${(differenceInMinutes(marker.time, startTime) / 60) * getPixelPerHour()}px`,
                  }"
                />
              </div>
            </div>
          </div>

          <div class="absolute top-0 left-0 pointer-events-none" style="margin-left: 0">
            <template v-for="resource in filteredResources" :key="resource.id">
              <div
                v-for="alloc in getAllocationsForResource(resource.id)"
                :key="alloc.id"
                class="absolute rounded-md border shadow-lg overflow-hidden pointer-events-auto cursor-pointer hover:scale-[1.02] transition-transform"
                :class="[
                  `bg-gradient-to-r ${getScheduleColor(alloc.scheduleId)}`,
                  hasResourceConflict(resource.id) ? 'border-harbor-red/60 shadow-harbor-red/20' : 'border-console-400/30',
                ]"
                v-bind="
                  getBlockPosition(resource, alloc.scheduleId) || { left: 0, width: 0, top: 0, height: 0 }
                "
              >
                <div class="h-full flex items-center px-2 overflow-hidden">
                  <span class="text-[10px] font-mono text-console-900 font-medium truncate">
                    {{ getShipName(alloc.scheduleId) }}
                  </span>
                </div>
                <div
                  v-if="hasResourceConflict(resource.id)"
                  class="absolute top-0 right-0 w-2 h-2 bg-harbor-red"
                />
              </div>
            </template>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
