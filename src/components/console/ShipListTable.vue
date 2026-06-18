<script setup lang="ts">
import { computed, ref } from 'vue';
import { useScheduleStore } from '../../stores/schedule';
import PriorityBadge from '../common/PriorityBadge.vue';
import StatusBadge from '../common/StatusBadge.vue';
import CargoTypeIcon from '../common/CargoTypeIcon.vue';
import { format, differenceInHours, differenceInMinutes } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Search, Filter, ArrowUpDown } from 'lucide-vue-next';
import type { OperationStatus, ShipPriority } from '../../types';

const store = useScheduleStore();
const searchQuery = ref('');
const statusFilter = ref<OperationStatus | 'all'>('all');
const priorityFilter = ref<ShipPriority | 'all'>('all');
const sortKey = ref<'eta' | 'priority'>('eta');
const sortAsc = ref(true);

type TableRow = {
  scheduleId: string;
  ship: ReturnType<typeof store.getShipById>;
  berth: ReturnType<typeof store.getBerthById>;
  schedule: (typeof store.schedules)[number];
};

const filteredSchedules = computed<TableRow[]>(() => {
  let result = store.sortedSchedules
    .map((s) => ({
      scheduleId: s.id,
      ship: store.getShipById(s.shipId),
      berth: store.getBerthById(s.berthId),
      schedule: s,
    }))
    .filter((row) => row.ship && row.berth) as TableRow[];

  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    result = result.filter(
      (r) =>
        r.ship!.name.toLowerCase().includes(q) ||
        r.ship!.imo.toLowerCase().includes(q) ||
        r.berth!.name.toLowerCase().includes(q),
    );
  }

  if (statusFilter.value !== 'all') {
    result = result.filter((r) => r.schedule.status === statusFilter.value);
  }

  if (priorityFilter.value !== 'all') {
    result = result.filter((r) => r.ship!.priority === priorityFilter.value);
  }

  result = [...result].sort((a, b) => {
    let diff = 0;
    if (sortKey.value === 'eta') {
      diff = new Date(a.schedule.eta).getTime() - new Date(b.schedule.eta).getTime();
    } else {
      const order: Record<ShipPriority, number> = { critical: 0, high: 1, normal: 2, low: 3 };
      diff = order[a.ship!.priority] - order[b.ship!.priority];
    }
    return sortAsc.value ? diff : -diff;
  });

  return result;
});

function formatDuration(eta: Date) {
  const now = new Date();
  const diffMin = differenceInMinutes(eta, now);
  if (diffMin < 0) {
    const hours = Math.abs(differenceInHours(eta, now));
    return `${hours}h前`;
  }
  const hours = Math.floor(diffMin / 60);
  const mins = diffMin % 60;
  if (hours > 0) return `${hours}h${mins}m后`;
  return `${mins}m后`;
}

function toggleSort(key: typeof sortKey.value) {
  if (sortKey.value === key) {
    sortAsc.value = !sortAsc.value;
  } else {
    sortKey.value = key;
    sortAsc.value = true;
  }
}

function selectSchedule(id: string) {
  store.setSelectedSchedule(id);
}
</script>

<template>
  <div class="panel-border rounded-lg overflow-hidden h-full flex flex-col">
    <div class="px-4 py-3 border-b border-console-500/30">
      <div class="flex items-center justify-between gap-3">
        <h3 class="font-mono text-sm font-semibold text-console-100 tracking-wide">
          船舶调度计划
        </h3>
        <span class="text-[10px] font-mono text-console-400">
          {{ filteredSchedules.length }} 条记录
        </span>
      </div>
      <div class="mt-3 flex items-center gap-2">
        <div class="relative flex-1">
          <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-console-400" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索船名/IMO/泊位..."
            class="w-full pl-8 pr-3 py-1.5 text-xs font-mono bg-console-800/80 border border-console-500/40 rounded text-console-100 placeholder:text-console-400 focus:outline-none focus:border-harbor-cyan/50 focus:shadow-glow-cyan transition-all"
          />
        </div>
        <select
          v-model="statusFilter"
          class="px-2 py-1.5 text-xs font-mono bg-console-800/80 border border-console-500/40 rounded text-console-100 focus:outline-none focus:border-harbor-cyan/50"
        >
          <option value="all">全部状态</option>
          <option value="anchored">锚泊</option>
          <option value="approaching">进港中</option>
          <option value="berthing">靠泊中</option>
          <option value="loading">装货中</option>
          <option value="unloading">卸货中</option>
          <option value="departing">离泊中</option>
          <option value="departed">已离港</option>
        </select>
        <select
          v-model="priorityFilter"
          class="px-2 py-1.5 text-xs font-mono bg-console-800/80 border border-console-500/40 rounded text-console-100 focus:outline-none focus:border-harbor-cyan/50"
        >
          <option value="all">全部优先级</option>
          <option value="critical">紧急</option>
          <option value="high">高优</option>
          <option value="normal">普通</option>
          <option value="low">低优</option>
        </select>
      </div>
    </div>

    <div class="flex-1 overflow-auto">
      <table class="w-full text-xs font-mono">
        <thead class="sticky top-0 bg-console-800/95 backdrop-blur z-10">
          <tr class="text-console-300">
            <th class="text-left px-3 py-2 font-medium">船舶</th>
            <th
              class="text-left px-3 py-2 font-medium cursor-pointer hover:text-harbor-cyan transition-colors"
              @click="toggleSort('priority')"
            >
              <span class="inline-flex items-center gap-1">
                优先级
                <ArrowUpDown class="w-3 h-3" />
              </span>
            </th>
            <th class="text-left px-3 py-2 font-medium">状态</th>
            <th class="text-left px-3 py-2 font-medium">泊位</th>
            <th
              class="text-left px-3 py-2 font-medium cursor-pointer hover:text-harbor-cyan transition-colors"
              @click="toggleSort('eta')"
            >
              <span class="inline-flex items-center gap-1">
                预计到港
                <ArrowUpDown class="w-3 h-3" />
              </span>
            </th>
            <th class="text-left px-3 py-2 font-medium">预计离港</th>
            <th class="text-left px-3 py-2 font-medium">进度</th>
            <th class="text-left px-3 py-2 font-medium">货物</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, idx) in filteredSchedules"
            :key="row.scheduleId"
            :class="[
              'border-b border-console-500/15 hover:bg-console-600/40 cursor-pointer transition-colors',
              idx % 2 === 0 ? 'bg-console-800/30' : 'bg-console-800/10',
              store.selectedScheduleId === row.scheduleId ? 'bg-harbor-cyan/10 border-l-2 border-l-harbor-cyan' : '',
            ]"
            @click="selectSchedule(row.scheduleId)"
          >
            <td class="px-3 py-2">
              <div class="flex items-center gap-2">
                <div
                  class="w-1 h-8 rounded-full"
                  :class="{
                    'bg-harbor-red': row.ship?.priority === 'critical',
                    'bg-harbor-orange': row.ship?.priority === 'high',
                    'bg-harbor-cyan': row.ship?.priority === 'normal',
                    'bg-console-400': row.ship?.priority === 'low',
                  }"
                />
                <div>
                  <p class="font-semibold text-console-100">{{ row.ship?.name }}</p>
                  <p class="text-[10px] text-console-400">
                    {{ row.ship?.imo }} · {{ row.ship?.length }}m/{{ row.ship?.draft }}m
                  </p>
                </div>
              </div>
            </td>
            <td class="px-3 py-2">
              <PriorityBadge v-if="row.ship" :priority="row.ship.priority" size="sm" />
            </td>
            <td class="px-3 py-2">
              <StatusBadge :status="row.schedule.status" size="sm" />
            </td>
            <td class="px-3 py-2">
              <span class="text-console-200">{{ row.berth?.name }}</span>
            </td>
            <td class="px-3 py-2">
              <div>
                <span class="text-console-100">
                  {{ format(new Date(row.schedule.eta), 'MM-dd HH:mm', { locale: zhCN }) }}
                </span>
                <span class="ml-1 text-[10px] text-harbor-orange">
                  {{ formatDuration(new Date(row.schedule.eta)) }}
                </span>
              </div>
            </td>
            <td class="px-3 py-2 text-console-200">
              {{ format(new Date(row.schedule.etd), 'MM-dd HH:mm', { locale: zhCN }) }}
            </td>
            <td class="px-3 py-2">
              <div class="flex items-center gap-2">
                <div class="w-16 h-1.5 bg-console-600 rounded-full overflow-hidden">
                  <div
                    class="h-full rounded-full transition-all duration-500"
                    :class="{
                      'bg-harbor-cyan': row.schedule.operationProgress < 80,
                      'bg-harbor-orange': row.schedule.operationProgress >= 80 && row.schedule.operationProgress < 100,
                      'bg-harbor-green': row.schedule.operationProgress >= 100,
                    }"
                    :style="{ width: `${row.schedule.operationProgress}%` }"
                  />
                </div>
                <span class="text-[10px] text-console-300 w-8">{{ row.schedule.operationProgress }}%</span>
              </div>
            </td>
            <td class="px-3 py-2">
              <CargoTypeIcon v-if="row.ship" :type="row.ship.cargoType" show-label />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
