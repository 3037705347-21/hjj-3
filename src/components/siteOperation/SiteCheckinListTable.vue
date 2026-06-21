<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useScheduleStore } from '../../stores/schedule';
import { useSiteCheckinStore } from '../../stores/siteCheckin';
import { SITE_CHECKIN_STATUS_LABELS, SITE_CHECKIN_STATUS_COLORS, ABNORMAL_CATEGORY_LABELS } from '../../types';
import type { SiteCheckinRecord, SiteCheckinStatus } from '../../types';
import {
  Clock,
  Users,
  MapPin,
  AlertTriangle,
  ChevronRight,
  CheckCircle2,
  Play,
  XCircle,
  Search,
  Filter,
} from 'lucide-vue-next';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const router = useRouter();
const scheduleStore = useScheduleStore();
const siteCheckinStore = useSiteCheckinStore();

const statusFilter = ref<SiteCheckinStatus | 'all'>('all');
const searchQuery = ref('');

const emit = defineEmits<{
  reportAbnormal: [checkinId: string];
}>();

const filteredRecords = computed(() => {
  let result = [...siteCheckinStore.records];

  if (statusFilter.value !== 'all') {
    result = result.filter((r) => r.status === statusFilter.value);
  }

  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter((r) => {
      const ship = scheduleStore.getShipById(
        scheduleStore.schedules.find((s) => s.id === r.scheduleId)?.shipId || '',
      );
      const berth = scheduleStore.getBerthById(
        scheduleStore.schedules.find((s) => s.id === r.scheduleId)?.berthId || '',
      );
      const teamName = siteCheckinStore.getTeamNameForRecord(r);
      return (
        teamName.toLowerCase().includes(query) ||
        ship?.name.toLowerCase().includes(query) ||
        berth?.name.toLowerCase().includes(query)
      );
    });
  }

  return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
});

function getScheduleInfo(scheduleId: string) {
  const schedule = scheduleStore.schedules.find((s) => s.id === scheduleId);
  if (!schedule) return { shipName: '-', berthName: '-', cargoType: '-' };

  const ship = scheduleStore.getShipById(schedule.shipId);
  const berth = scheduleStore.getBerthById(schedule.berthId);

  return {
    shipName: ship?.name || '-',
    berthName: berth?.name || '-',
    cargoType: ship?.cargoType || '-',
    status: schedule.status,
  };
}

function formatTime(date?: Date) {
  if (!date) return '-';
  return format(new Date(date), 'MM-dd HH:mm', { locale: zhCN });
}

function formatDuration(start?: Date, end?: Date) {
  if (!start || !end) return '-';
  const diffMs = new Date(end).getTime() - new Date(start).getTime();
  const hours = Math.floor(diffMs / 3600000);
  const minutes = Math.floor((diffMs % 3600000) / 60000);
  return `${hours}小时${minutes}分钟`;
}

function getUnresolvedAbnormalCount(record: SiteCheckinRecord) {
  return record.abnormalRecords.filter((a) => !a.handled).length;
}

function goToOperation(checkinId: string) {
  router.push(`/site-operation/confirm/${checkinId}`);
}

function goToDetail(checkinId: string) {
  router.push(`/site-operation/${checkinId}`);
}

function handleCheckin(checkinId: string) {
  siteCheckinStore.teamCheckin(checkinId);
}

function handleStartWork(checkinId: string) {
  siteCheckinStore.confirmStartWork(checkinId);
}

function handleReportAbnormal(checkinId: string) {
  emit('reportAbnormal', checkinId);
}

const statusOptions: (SiteCheckinStatus | 'all')[] = ['all', 'pending', 'checked_in', 'in_progress', 'completed', 'abnormal'];
</script>

<template>
  <div class="panel-border rounded-xl overflow-hidden">
    <div class="p-4 border-b border-console-500/20">
      <div class="flex items-center justify-between gap-4">
        <div class="flex items-center gap-3 flex-1">
          <div class="relative flex-1 max-w-md">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-console-400" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="搜索班组、船舶、泊位..."
              class="w-full pl-9 pr-4 py-2 text-xs font-mono bg-console-800/60 border border-console-500/30 rounded text-console-100 placeholder:text-console-500 focus:outline-none focus:border-harbor-cyan/50"
            />
          </div>
          <div class="flex items-center gap-1">
            <Filter class="w-3.5 h-3.5 text-console-400" />
            <select
              v-model="statusFilter"
              class="px-3 py-2 text-xs font-mono bg-console-800/60 border border-console-500/30 rounded text-console-100 focus:outline-none focus:border-harbor-cyan/50"
            >
              <option value="all">全部状态</option>
              <option v-for="opt in statusOptions.filter(o => o !== 'all')" :key="opt" :value="opt">
                {{ SITE_CHECKIN_STATUS_LABELS[opt] }}
              </option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <div class="overflow-x-auto">
      <table class="w-full">
        <thead>
          <tr class="border-b border-console-500/20">
            <th class="text-left px-4 py-3 text-[10px] font-mono font-medium text-console-400 uppercase tracking-wider">
              关联计划
            </th>
            <th class="text-left px-4 py-3 text-[10px] font-mono font-medium text-console-400 uppercase tracking-wider">
              作业班组
            </th>
            <th class="text-left px-4 py-3 text-[10px] font-mono font-medium text-console-400 uppercase tracking-wider">
              签到时间
            </th>
            <th class="text-left px-4 py-3 text-[10px] font-mono font-medium text-console-400 uppercase tracking-wider">
              开工时间
            </th>
            <th class="text-left px-4 py-3 text-[10px] font-mono font-medium text-console-400 uppercase tracking-wider">
              完工时间
            </th>
            <th class="text-left px-4 py-3 text-[10px] font-mono font-medium text-console-400 uppercase tracking-wider">
              作业时长
            </th>
            <th class="text-left px-4 py-3 text-[10px] font-mono font-medium text-console-400 uppercase tracking-wider">
              确认人
            </th>
            <th class="text-left px-4 py-3 text-[10px] font-mono font-medium text-console-400 uppercase tracking-wider">
              状态
            </th>
            <th class="text-left px-4 py-3 text-[10px] font-mono font-medium text-console-400 uppercase tracking-wider">
              异常
            </th>
            <th class="text-right px-4 py-3 text-[10px] font-mono font-medium text-console-400 uppercase tracking-wider">
              操作
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="record in filteredRecords"
            :key="record.id"
            class="border-b border-console-500/10 hover:bg-console-700/20 transition-colors"
          >
            <td class="px-4 py-3">
              <div class="flex items-center gap-2">
                <MapPin class="w-3.5 h-3.5 text-console-400" />
                <div>
                  <p class="text-xs font-mono font-medium text-console-100">
                    {{ getScheduleInfo(record.scheduleId).shipName }}
                  </p>
                  <p class="text-[10px] font-mono text-console-400">
                    {{ getScheduleInfo(record.scheduleId).berthName }}
                  </p>
                </div>
              </div>
            </td>
            <td class="px-4 py-3">
              <div class="flex items-center gap-2">
                <Users class="w-3.5 h-3.5 text-harbor-cyan" />
                <span class="text-xs font-mono text-console-100">{{ siteCheckinStore.getTeamNameForRecord(record) }}</span>
              </div>
            </td>
            <td class="px-4 py-3">
              <div class="flex items-center gap-2">
                <Clock class="w-3.5 h-3.5 text-console-400" />
                <span class="text-xs font-mono text-console-200">{{ formatTime(record.checkinTime) }}</span>
              </div>
            </td>
            <td class="px-4 py-3">
              <span class="text-xs font-mono text-console-200">{{ formatTime(record.startTime) }}</span>
            </td>
            <td class="px-4 py-3">
              <span class="text-xs font-mono text-console-200">{{ formatTime(record.endTime) }}</span>
            </td>
            <td class="px-4 py-3">
              <span class="text-xs font-mono text-console-200">
                {{ formatDuration(record.startTime, record.endTime) }}
              </span>
            </td>
            <td class="px-4 py-3">
              <span class="text-xs font-mono text-console-200">{{ record.confirmedBy || '-' }}</span>
            </td>
            <td class="px-4 py-3">
              <span
                :class="[
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium border',
                  SITE_CHECKIN_STATUS_COLORS[record.status].bg,
                  SITE_CHECKIN_STATUS_COLORS[record.status].text,
                  SITE_CHECKIN_STATUS_COLORS[record.status].border,
                ]"
              >
                <component
                  :is="
                    record.status === 'completed'
                      ? CheckCircle2
                      : record.status === 'in_progress'
                        ? Play
                        : record.status === 'abnormal'
                          ? AlertTriangle
                          : Clock
                  "
                  class="w-3 h-3"
                />
                {{ SITE_CHECKIN_STATUS_LABELS[record.status] }}
              </span>
            </td>
            <td class="px-4 py-3">
              <div v-if="record.abnormalRecords.length > 0" class="flex items-center gap-1">
                <AlertTriangle
                  v-if="getUnresolvedAbnormalCount(record) > 0"
                  class="w-3.5 h-3.5 text-harbor-red"
                />
                <CheckCircle2
                  v-else
                  class="w-3.5 h-3.5 text-harbor-green"
                />
                <span
                  :class="[
                    'text-[10px] font-mono',
                    getUnresolvedAbnormalCount(record) > 0 ? 'text-harbor-red' : 'text-harbor-green',
                  ]"
                >
                  {{ record.abnormalRecords.length }} 项
                  ({{ getUnresolvedAbnormalCount(record) }} 待处理)
                </span>
              </div>
              <span v-else class="text-[10px] font-mono text-console-500">无</span>
            </td>
            <td class="px-4 py-3">
              <div class="flex items-center justify-end gap-1">
                <button
                  v-if="record.status === 'pending'"
                  @click="handleCheckin(record.id)"
                  class="px-2 py-1 rounded text-[10px] font-mono bg-harbor-blue/20 text-harbor-blue border border-harbor-blue/30 hover:bg-harbor-blue/30 transition-all"
                >
                  签到
                </button>
                <button
                  v-if="record.status === 'checked_in' || record.status === 'abnormal'"
                  @click="handleStartWork(record.id)"
                  class="px-2 py-1 rounded text-[10px] font-mono bg-harbor-cyan/20 text-harbor-cyan border border-harbor-cyan/30 hover:bg-harbor-cyan/30 transition-all"
                >
                  开工
                </button>
                <button
                  v-if="record.status === 'in_progress' || record.status === 'abnormal'"
                  @click="handleReportAbnormal(record.id)"
                  class="px-2 py-1 rounded text-[10px] font-mono bg-harbor-red/20 text-harbor-red border border-harbor-red/30 hover:bg-harbor-red/30 transition-all"
                >
                  异常
                </button>
                <button
                  v-if="record.status === 'in_progress' || record.status === 'abnormal'"
                  @click="goToOperation(record.id)"
                  class="px-2 py-1 rounded text-[10px] font-mono bg-harbor-green/20 text-harbor-green border border-harbor-green/30 hover:bg-harbor-green/30 transition-all"
                >
                  完工
                </button>
                <button
                  @click="goToDetail(record.id)"
                  class="px-2 py-1 rounded text-[10px] font-mono text-console-300 border border-console-500/30 hover:bg-console-700/50 hover:text-console-100 transition-all flex items-center gap-1"
                >
                  详情
                  <ChevronRight class="w-3 h-3" />
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="filteredRecords.length === 0">
            <td colspan="10" class="px-4 py-12 text-center">
              <XCircle class="w-12 h-12 text-console-500 mx-auto mb-3" />
              <p class="text-xs font-mono text-console-400">暂无签到记录</p>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
