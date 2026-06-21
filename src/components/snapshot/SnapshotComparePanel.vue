<script setup lang="ts">
import { computed } from 'vue';
import { useSnapshotStore } from '../../stores/snapshot';
import {
  GitCompare,
  ArrowRight,
  Ship,
  Anchor,
  AlertTriangle,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  Plus,
  X,
} from 'lucide-vue-next';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const props = defineProps<{
  snapshotIdA: string;
  snapshotIdB: string;
}>();

const snapshotStore = useSnapshotStore();

const snapshotA = computed(() => snapshotStore.getSnapshotById(props.snapshotIdA));
const snapshotB = computed(() => snapshotStore.getSnapshotById(props.snapshotIdB));

const comparison = computed(() =>
  snapshotStore.compareSnapshots(props.snapshotIdA, props.snapshotIdB),
);

const metricItems = computed(() => [
  { key: 'totalSchedules', label: '调度计划数', icon: Ship, isBetterWhenLower: false, unit: '' },
  { key: 'shipsInPort', label: '在港船舶', icon: Anchor, isBetterWhenLower: false, unit: '' },
  { key: 'shipsWaiting', label: '待泊船舶', icon: Clock, isBetterWhenLower: true, unit: '' },
  { key: 'conflictCount', label: '冲突数', icon: AlertTriangle, isBetterWhenLower: true, unit: '' },
  { key: 'warningCount', label: '告警数', icon: AlertTriangle, isBetterWhenLower: true, unit: '' },
  { key: 'berthUtilization', label: '泊位利用率', icon: Anchor, isBetterWhenLower: false, unit: '%' },
  { key: 'avgWaitingMinutes', label: '平均等待时间', icon: Clock, isBetterWhenLower: true, unit: '分' },
  { key: 'keyPlanCount', label: '重点计划数', icon: Ship, isBetterWhenLower: false, unit: '' },
]);

function getDiffClass(value: number, isBetterWhenLower = false) {
  if (value === 0) return 'text-console-400';
  const improved = isBetterWhenLower ? value < 0 : value > 0;
  return improved ? 'text-harbor-green' : 'text-harbor-red';
}

function getDiffIcon(value: number, isBetterWhenLower = false) {
  if (value === 0) return Minus;
  const improved = isBetterWhenLower ? value < 0 : value > 0;
  return improved ? TrendingUp : TrendingDown;
}

function getShipName(scheduleId: string, snapshotId: string) {
  const snapshot = snapshotStore.getSnapshotById(snapshotId);
  if (!snapshot) return scheduleId;
  const schedule = snapshot.data.schedules.find((s) => s.id === scheduleId);
  if (!schedule) return scheduleId;
  const ship = snapshot.data.ships.find((s) => s.id === schedule.shipId);
  return ship?.name || schedule.shipId;
}
</script>

<template>
  <div class="space-y-4">
    <div v-if="!comparison" class="text-center py-8">
      <GitCompare class="w-12 h-12 text-console-600 mx-auto mb-2" />
      <p class="text-sm text-console-400">请选择两个快照进行对比</p>
    </div>

    <template v-else>
      <div class="bg-console-800/50 rounded-xl border border-console-500/30 overflow-hidden">
        <div class="px-4 py-3 border-b border-console-500/30 flex items-center gap-2">
          <GitCompare class="w-5 h-5 text-harbor-purple" />
          <h3 class="text-sm font-semibold text-console-100">盘面指标对比</h3>
        </div>

        <div class="grid grid-cols-3 gap-4 p-4 border-b border-console-500/20">
          <div class="text-center">
            <div class="text-xs text-console-400 mb-1">快照 A</div>
            <div class="text-sm font-medium text-harbor-blue">
              {{ snapshotA?.name || '-' }}
            </div>
            <div class="text-xs text-console-500 mt-1">
              {{ snapshotA ? format(new Date(snapshotA.snapshotTime), 'MM-dd HH:mm', { locale: zhCN }) : '-' }}
            </div>
          </div>
          <div class="flex items-center justify-center">
            <ArrowRight class="w-5 h-5 text-console-500" />
          </div>
          <div class="text-center">
            <div class="text-xs text-console-400 mb-1">快照 B</div>
            <div class="text-sm font-medium text-harbor-purple">
              {{ snapshotB?.name || '-' }}
            </div>
            <div class="text-xs text-console-500 mt-1">
              {{ snapshotB ? format(new Date(snapshotB.snapshotTime), 'MM-dd HH:mm', { locale: zhCN }) : '-' }}
            </div>
          </div>
        </div>

        <div class="divide-y divide-console-500/20">
          <div
            v-for="item in metricItems"
            :key="item.key"
            class="flex items-center justify-between px-4 py-2.5"
          >
            <div class="flex items-center gap-2">
              <component :is="item.icon" class="w-4 h-4 text-console-400" />
              <span class="text-sm text-console-300">{{ item.label }}</span>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-sm text-console-200 w-14 text-right font-mono">
                {{ comparison.summaryA[item.key as keyof typeof comparison.summaryA] }}{{ item.unit }}
              </span>
              <span class="text-sm text-console-200 w-14 text-right font-mono">
                {{ comparison.summaryB[item.key as keyof typeof comparison.summaryB] }}{{ item.unit }}
              </span>
              <span
                :class="[
                  'text-xs w-16 text-right flex items-center justify-end gap-0.5 font-mono',
                  getDiffClass(comparison.diffs[item.key], item.isBetterWhenLower),
                ]"
              >
                <component
                  :is="getDiffIcon(comparison.diffs[item.key], item.isBetterWhenLower)"
                  class="w-3 h-3"
                />
                {{ comparison.diffs[item.key] > 0 ? '+' : '' }}{{ comparison.diffs[item.key] }}{{ item.unit }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-console-800/50 rounded-xl border border-console-500/30 overflow-hidden">
        <div class="px-4 py-3 border-b border-console-500/30">
          <h3 class="text-sm font-semibold text-console-100">调度计划变更</h3>
        </div>
        <div class="p-4 space-y-4">
          <div>
            <div class="flex items-center gap-2 mb-2">
              <Plus class="w-4 h-4 text-harbor-green" />
              <span class="text-sm text-console-200">新增计划</span>
              <span class="text-xs text-harbor-green font-mono">({{ comparison.addedSchedules.length }})</span>
            </div>
            <div v-if="comparison.addedSchedules.length === 0" class="text-xs text-console-500 pl-6">无新增</div>
            <div v-else class="space-y-1 pl-6">
              <div
                v-for="sched in comparison.addedSchedules"
                :key="sched.id"
                class="text-xs text-console-300"
              >
                {{ getShipName(sched.id, snapshotIdB) }}
              </div>
            </div>
          </div>

          <div>
            <div class="flex items-center gap-2 mb-2">
              <X class="w-4 h-4 text-harbor-red" />
              <span class="text-sm text-console-200">移除计划</span>
              <span class="text-xs text-harbor-red font-mono">({{ comparison.removedSchedules.length }})</span>
            </div>
            <div v-if="comparison.removedSchedules.length === 0" class="text-xs text-console-500 pl-6">无移除</div>
            <div v-else class="space-y-1 pl-6">
              <div
                v-for="sched in comparison.removedSchedules"
                :key="sched.id"
                class="text-xs text-console-300"
              >
                {{ getShipName(sched.id, snapshotIdA) }}
              </div>
            </div>
          </div>

          <div>
            <div class="flex items-center gap-2 mb-2">
              <ArrowRight class="w-4 h-4 text-harbor-yellow" />
              <span class="text-sm text-console-200">变更计划</span>
              <span class="text-xs text-harbor-yellow font-mono">({{ comparison.changedSchedules.length }})</span>
            </div>
            <div v-if="comparison.changedSchedules.length === 0" class="text-xs text-console-500 pl-6">无变更</div>
            <div v-else class="space-y-1 pl-6">
              <div
                v-for="change in comparison.changedSchedules"
                :key="change.id"
                class="text-xs text-console-300"
              >
                <span class="text-console-100">{{ getShipName(change.id, snapshotIdA) }}</span>
                <span class="text-console-500 mx-1">|</span>
                <span class="text-harbor-yellow">{{ change.changes.join('、') }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-console-800/50 rounded-xl border border-console-500/30 overflow-hidden">
        <div class="px-4 py-3 border-b border-console-500/30">
          <h3 class="text-sm font-semibold text-console-100">冲突变更</h3>
        </div>
        <div class="p-4 space-y-4">
          <div>
            <div class="flex items-center gap-2 mb-2">
              <Plus class="w-4 h-4 text-harbor-red" />
              <span class="text-sm text-console-200">新增冲突</span>
              <span class="text-xs text-harbor-red font-mono">({{ comparison.addedConflicts.length }})</span>
            </div>
            <div v-if="comparison.addedConflicts.length === 0" class="text-xs text-console-500 pl-6">无新增冲突</div>
            <div v-else class="space-y-1 pl-6">
              <div
                v-for="conflict in comparison.addedConflicts"
                :key="conflict.id"
                class="text-xs text-console-300"
              >
                <span
                  :class="[
                    'inline-block w-1.5 h-1.5 rounded-full mr-1.5',
                    conflict.severity === 'error' ? 'bg-harbor-red' : 'bg-harbor-yellow',
                  ]"
                />
                {{ conflict.message }}
              </div>
            </div>
          </div>

          <div>
            <div class="flex items-center gap-2 mb-2">
              <Minus class="w-4 h-4 text-harbor-green" />
              <span class="text-sm text-console-200">解决冲突</span>
              <span class="text-xs text-harbor-green font-mono">({{ comparison.removedConflicts.length }})</span>
            </div>
            <div v-if="comparison.removedConflicts.length === 0" class="text-xs text-console-500 pl-6">无已解决冲突</div>
            <div v-else class="space-y-1 pl-6">
              <div
                v-for="conflict in comparison.removedConflicts"
                :key="conflict.id"
                class="text-xs text-console-300"
              >
                {{ conflict.message }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
