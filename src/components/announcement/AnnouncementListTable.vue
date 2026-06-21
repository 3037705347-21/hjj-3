<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAnnouncementStore } from '../../stores/announcement';
import { useScheduleStore } from '../../stores/schedule';
import type { AnnouncementType, AnnouncementScope, AnnouncementStatus } from '../../types';
import {
  ANNOUNCEMENT_TYPE_LABELS,
  ANNOUNCEMENT_SCOPE_LABELS,
  ANNOUNCEMENT_STATUS_LABELS,
} from '../../types';
import AnnouncementStatusBadge from './AnnouncementStatusBadge.vue';
import {
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Eye,
  Pin,
  Clock,
  User,
  MapPin,
  Megaphone,
} from 'lucide-vue-next';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const emit = defineEmits<{
  (e: 'view-detail', id: string): void;
}>();

const announcementStore = useAnnouncementStore();
const scheduleStore = useScheduleStore();

const searchQuery = ref('');
const filterType = ref<AnnouncementType | 'all'>('all');
const filterScope = ref<AnnouncementScope | 'all'>('all');
const filterStatus = ref<AnnouncementStatus | 'all'>('all');
const sortField = ref<'effectiveTime' | 'createdAt'>('createdAt');
const sortOrder = ref<'asc' | 'desc'>('desc');
const showFilters = ref(false);

const filteredAnnouncements = computed(() => {
  let result = announcementStore.filterAnnouncements({
    keyword: searchQuery.value || undefined,
    type: filterType.value === 'all' ? undefined : filterType.value,
    scope: filterScope.value === 'all' ? undefined : filterScope.value,
    status: filterStatus.value === 'all' ? undefined : filterStatus.value,
  });

  result.sort((a, b) => {
    const aTime = new Date(a[sortField.value]).getTime();
    const bTime = new Date(b[sortField.value]).getTime();
    return sortOrder.value === 'desc' ? bTime - aTime : aTime - bTime;
  });

  return result;
});

const typeOptions = computed(() => [
  { key: 'all', label: '全部类型' },
  ...Object.entries(ANNOUNCEMENT_TYPE_LABELS).map(([key, label]) => ({ key, label })),
]);

const scopeOptions = computed(() => [
  { key: 'all', label: '全部范围' },
  ...Object.entries(ANNOUNCEMENT_SCOPE_LABELS).map(([key, label]) => ({ key, label })),
]);

const statusOptions = computed(() => [
  { key: 'all', label: '全部状态' },
  ...Object.entries(ANNOUNCEMENT_STATUS_LABELS).map(([key, label]) => ({ key, label })),
]);

function toggleSort(field: 'effectiveTime' | 'createdAt') {
  if (sortField.value === field) {
    sortOrder.value = sortOrder.value === 'desc' ? 'asc' : 'desc';
  } else {
    sortField.value = field;
    sortOrder.value = 'desc';
  }
}

function getBerthNames(berthIds: string[]): string {
  if (berthIds.length === 0) return '-';
  const names = berthIds.map((id) => {
    const berth = scheduleStore.getBerthById(id);
    return berth?.name || id;
  });
  if (names.length <= 2) return names.join('、');
  return `${names.slice(0, 2).join('、')} 等${names.length}个泊位`;
}

function viewDetail(id: string) {
  emit('view-detail', id);
}

function formatTime(date: Date | string): string {
  return format(new Date(date), 'MM-dd HH:mm', { locale: zhCN });
}
</script>

<template>
  <div class="panel-border rounded-lg overflow-hidden">
    <div class="px-4 py-3 border-b border-console-500/20 bg-console-800/30">
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-2 flex-1">
          <div class="relative flex-1 max-w-md">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-console-400" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="搜索公告编号、标题、内容、发布人..."
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
          共 {{ filteredAnnouncements.length }} 条记录
        </div>
      </div>

      <div
        v-if="showFilters"
        class="mt-3 pt-3 border-t border-console-500/20 flex items-center gap-3 flex-wrap"
      >
        <div>
          <select
            v-model="filterType"
            class="px-3 py-1.5 rounded bg-console-900/60 border border-console-500/30 text-xs font-mono text-console-100 focus:outline-none focus:border-harbor-cyan/50"
          >
            <option v-for="opt in typeOptions" :key="opt.key" :value="opt.key">
              {{ opt.label }}
            </option>
          </select>
        </div>
        <div>
          <select
            v-model="filterScope"
            class="px-3 py-1.5 rounded bg-console-900/60 border border-console-500/30 text-xs font-mono text-console-100 focus:outline-none focus:border-harbor-cyan/50"
          >
            <option v-for="opt in scopeOptions" :key="opt.key" :value="opt.key">
              {{ opt.label }}
            </option>
          </select>
        </div>
        <div>
          <select
            v-model="filterStatus"
            class="px-3 py-1.5 rounded bg-console-900/60 border border-console-500/30 text-xs font-mono text-console-100 focus:outline-none focus:border-harbor-cyan/50"
          >
            <option v-for="opt in statusOptions" :key="opt.key" :value="opt.key">
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
            <th class="px-4 py-2.5 text-[10px] font-mono text-console-400 uppercase tracking-wider font-medium">
              编号
            </th>
            <th class="px-4 py-2.5 text-[10px] font-mono text-console-400 uppercase tracking-wider font-medium">
              标题
            </th>
            <th class="px-4 py-2.5 text-[10px] font-mono text-console-400 uppercase tracking-wider font-medium">
              类型
            </th>
            <th class="px-4 py-2.5 text-[10px] font-mono text-console-400 uppercase tracking-wider font-medium">
              适用范围
            </th>
            <th class="px-4 py-2.5 text-[10px] font-mono text-console-400 uppercase tracking-wider font-medium">
              状态
            </th>
            <th
              class="px-4 py-2.5 text-[10px] font-mono text-console-400 uppercase tracking-wider font-medium cursor-pointer hover:text-console-200 transition-colors"
              @click="toggleSort('effectiveTime')"
            >
              <span class="flex items-center gap-1">
                生效时间
                <component
                  :is="sortField === 'effectiveTime' ? (sortOrder === 'desc' ? ChevronDown : ChevronUp) : null"
                  class="w-3 h-3"
                />
              </span>
            </th>
            <th class="px-4 py-2.5 text-[10px] font-mono text-console-400 uppercase tracking-wider font-medium">
              关联泊位
            </th>
            <th class="px-4 py-2.5 text-[10px] font-mono text-console-400 uppercase tracking-wider font-medium">
              发布人
            </th>
            <th class="px-4 py-2.5 text-[10px] font-mono text-console-400 uppercase tracking-wider font-medium text-right">
              操作
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-console-500/10">
          <tr
            v-for="announcement in filteredAnnouncements"
            :key="announcement.id"
            class="hover:bg-console-700/30 transition-colors cursor-pointer"
            @click="viewDetail(announcement.id)"
          >
            <td class="px-4 py-3">
              <span class="text-xs font-mono text-harbor-cyan font-medium">
                {{ announcement.announcementNo }}
              </span>
            </td>
            <td class="px-4 py-3">
              <div class="flex items-center gap-2">
                <Pin
                  v-if="announcement.isPinned"
                  class="w-3.5 h-3.5 text-harbor-orange shrink-0"
                />
                <span class="text-xs font-medium text-console-100 truncate max-w-xs">
                  {{ announcement.title }}
                </span>
              </div>
            </td>
            <td class="px-4 py-3">
              <AnnouncementStatusBadge type="type" :announcement-type="announcement.type" size="sm" />
            </td>
            <td class="px-4 py-3">
              <AnnouncementStatusBadge type="scope" :scope="announcement.scope" size="sm" />
            </td>
            <td class="px-4 py-3">
              <AnnouncementStatusBadge type="status" :status="announcement.status" size="sm" />
            </td>
            <td class="px-4 py-3">
              <div class="flex items-center gap-1.5">
                <Clock class="w-3 h-3 text-console-500" />
                <span class="text-xs font-mono text-console-300">
                  {{ formatTime(announcement.effectiveTime) }}
                </span>
              </div>
            </td>
            <td class="px-4 py-3">
              <div class="flex items-center gap-1.5">
                <MapPin class="w-3 h-3 text-console-500 shrink-0" />
                <span class="text-xs text-console-300">
                  {{ getBerthNames(announcement.relatedBerthIds) }}
                </span>
              </div>
            </td>
            <td class="px-4 py-3">
              <div class="flex items-center gap-1.5">
                <User class="w-3 h-3 text-console-500 shrink-0" />
                <span class="text-xs text-console-300">
                  {{ announcement.publisher || '-' }}
                </span>
              </div>
            </td>
            <td class="px-4 py-3 text-right">
              <button
                @click.stop="viewDetail(announcement.id)"
                class="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-mono text-harbor-cyan border border-harbor-cyan/30 hover:bg-harbor-cyan/10 transition-all"
              >
                <Eye class="w-3 h-3" />
                详情
              </button>
            </td>
          </tr>
          <tr v-if="filteredAnnouncements.length === 0">
            <td colspan="9" class="px-4 py-12 text-center">
              <Megaphone class="w-10 h-10 text-console-600 mx-auto mb-3" />
              <p class="text-sm text-console-500 font-mono">暂无公告</p>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
