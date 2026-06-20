<script setup lang="ts">
import { computed } from 'vue';
import { useScheduleStore } from '../../stores/schedule';
import type { HandoverRecord } from '../../types';
import {
  X,
  Handshake,
  Calendar,
  AlertTriangle,
  Ship,
  FileText,
  Clock,
  Star,
  AlertOctagon,
  CheckCircle2,
  UserCheck,
  ArrowRight,
} from 'lucide-vue-next';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const props = defineProps<{
  visible: boolean;
  record?: HandoverRecord | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const store = useScheduleStore();

const displayRecord = computed<HandoverRecord | null>(() => {
  return props.record || store.latestHandover;
});

function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'critical':
      return 'text-harbor-red';
    case 'high':
      return 'text-harbor-orange';
    case 'normal':
      return 'text-harbor-cyan';
    default:
      return 'text-console-400';
  }
}

function getPriorityLabel(priority: string): string {
  switch (priority) {
    case 'critical':
      return '特级';
    case 'high':
      return '重点';
    case 'normal':
      return '普通';
    default:
      return '低';
  }
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    anchored: '锚地待泊',
    approaching: '进港中',
    berthing: '靠泊中',
    loading: '装货中',
    unloading: '卸货中',
    departing: '离泊中',
    departed: '已离港',
  };
  return labels[status] || status;
}

function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'critical':
      return 'text-harbor-red';
    case 'major':
      return 'text-harbor-orange';
    case 'minor':
      return 'text-harbor-yellow';
    case 'warning':
      return 'text-harbor-cyan';
    default:
      return 'text-console-400';
  }
}

function getSeverityLabel(severity: string): string {
  switch (severity) {
    case 'critical':
      return '特别重大';
    case 'major':
      return '重大';
    case 'minor':
      return '一般';
    case 'warning':
      return '预警';
    default:
      return severity;
  }
}

function getIncidentStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    reported: '已上报',
    investigating: '调查中',
    handling: '处置中',
    resolved: '已解决',
    closed: '已关闭',
  };
  return labels[status] || status;
}

function formatTime(ts: Date | string | undefined): string {
  if (!ts) return '-';
  return format(new Date(ts), 'yyyy-MM-dd HH:mm:ss', { locale: zhCN });
}

function handleClose() {
  emit('close');
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="visible" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-console-900/80 backdrop-blur-sm" @click="handleClose" />
        <div class="relative w-full max-w-xl panel-border rounded-xl shadow-2xl z-10 max-h-[85vh] flex flex-col">
          <div class="flex items-center justify-between px-5 py-4 border-b border-console-500/20 shrink-0">
            <h3 class="font-mono text-sm font-semibold text-console-100 flex items-center gap-2">
              <Handshake class="w-4 h-4 text-harbor-cyan" />
              最近值班交接摘要
            </h3>
            <button
              class="w-7 h-7 rounded flex items-center justify-center text-console-400 hover:text-console-100 hover:bg-console-700/50 transition-all"
              @click="handleClose"
            >
              <X class="w-4 h-4" />
            </button>
          </div>

          <div v-if="displayRecord" class="p-5 space-y-4 overflow-y-auto flex-1">
            <div
              class="p-4 rounded-lg bg-gradient-to-r from-harbor-cyan/10 to-harbor-purple/10 border border-harbor-cyan/30"
            >
              <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-xl bg-harbor-cyan/20 flex items-center justify-center">
                  <UserCheck class="w-6 h-6 text-harbor-cyan" />
                </div>
                <div class="flex-1">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="text-xs font-mono font-medium text-console-200">{{ displayRecord.outgoingOperator }}</span>
                    <ArrowRight class="w-3.5 h-3.5 text-harbor-cyan" />
                    <span class="text-xs font-mono font-bold text-harbor-cyan">{{ displayRecord.incomingOperator }}</span>
                  </div>
                  <p class="text-[10px] font-mono text-console-400 mt-1 flex items-center gap-1">
                    <Calendar class="w-2.5 h-2.5" />
                    交接时间：{{ formatTime(displayRecord.handoverTime) }}
                  </p>
                </div>
                <div
                  :class="[
                    'px-2.5 py-1 rounded text-[10px] font-mono font-medium border flex items-center gap-1',
                    displayRecord.confirmed
                      ? 'bg-harbor-green/15 text-harbor-green border-harbor-green/30'
                      : 'bg-harbor-yellow/15 text-harbor-yellow border-harbor-yellow/30',
                  ]"
                >
                  <CheckCircle2 v-if="displayRecord.confirmed" class="w-2.5 h-2.5" />
                  <AlertTriangle v-else class="w-2.5 h-2.5" />
                  {{ displayRecord.confirmed ? '已确认' : '待确认' }}
                </div>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div class="p-3 rounded-lg bg-harbor-yellow/10 border border-harbor-yellow/30">
                <div class="flex items-center gap-2">
                  <div class="w-8 h-8 rounded bg-harbor-yellow/20 flex items-center justify-center">
                    <Clock class="w-4 h-4 text-harbor-yellow" />
                  </div>
                  <div>
                    <p class="text-[9px] font-mono text-console-400 uppercase tracking-wider">未完成计划</p>
                    <p class="text-lg font-bold font-mono text-harbor-yellow tabular-nums">
                      {{ displayRecord.unfinishedPlanCount }}
                    </p>
                  </div>
                </div>
              </div>
              <div class="p-3 rounded-lg bg-harbor-red/10 border border-harbor-red/30">
                <div class="flex items-center gap-2">
                  <div class="w-8 h-8 rounded bg-harbor-red/20 flex items-center justify-center">
                    <AlertOctagon class="w-4 h-4 text-harbor-red" />
                  </div>
                  <div>
                    <p class="text-[9px] font-mono text-console-400 uppercase tracking-wider">当前冲突数</p>
                    <p class="text-lg font-bold font-mono text-harbor-red tabular-nums">
                      {{ displayRecord.currentConflictCount }}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div class="panel-border rounded-lg overflow-hidden">
              <div class="px-4 py-3 border-b border-console-500/20 flex items-center gap-2">
                <Star class="w-4 h-4 text-harbor-orange" />
                <span class="text-xs font-mono font-semibold text-console-100">
                  重点船舶 ({{ displayRecord.keyShips.length }})
                </span>
              </div>
              <div v-if="displayRecord.keyShips.length > 0" class="max-h-48 overflow-y-auto">
                <div class="divide-y divide-console-500/15">
                  <div
                    v-for="ship in displayRecord.keyShips"
                    :key="ship.shipId"
                    class="flex items-center justify-between px-4 py-2.5 hover:bg-console-700/20 transition-colors"
                  >
                    <div class="flex items-center gap-2.5">
                      <div class="w-7 h-7 rounded bg-console-700/50 border border-console-500/30 flex items-center justify-center">
                        <Ship class="w-3.5 h-3.5 text-console-300" />
                      </div>
                      <div>
                        <p class="text-[11px] font-mono font-medium text-console-100 flex items-center gap-1.5">
                          {{ ship.shipName }}
                          <span
                            :class="[
                              'text-[8px] font-mono px-1 py-0.5 rounded border',
                              getPriorityColor(ship.priority),
                              ship.priority === 'critical' ? 'border-harbor-red/30 bg-harbor-red/10' :
                              ship.priority === 'high' ? 'border-harbor-orange/30 bg-harbor-orange/10' :
                              'border-harbor-cyan/30 bg-harbor-cyan/10',
                            ]"
                          >
                            {{ getPriorityLabel(ship.priority) }}
                          </span>
                        </p>
                      </div>
                    </div>
                    <div class="text-right">
                      <p v-if="ship.berthName" class="text-[9px] font-mono text-harbor-cyan">{{ ship.berthName }}</p>
                      <p class="text-[9px] font-mono text-console-400">{{ getStatusLabel(ship.status) }}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div v-else class="p-6 text-center">
                <Ship class="w-8 h-8 mx-auto text-console-500 opacity-50 mb-2" />
                <p class="text-xs font-mono text-console-400">暂无重点船舶记录</p>
              </div>
            </div>

            <div class="panel-border rounded-lg overflow-hidden">
              <div class="px-4 py-3 border-b border-console-500/20 flex items-center gap-2">
                <AlertOctagon class="w-4 h-4 text-harbor-red" />
                <span class="text-xs font-mono font-semibold text-console-100">
                  待处理异常 ({{ displayRecord.pendingIncidents?.length || 0 }})
                </span>
              </div>
              <div v-if="displayRecord.pendingIncidents && displayRecord.pendingIncidents.length > 0" class="max-h-48 overflow-y-auto">
                <div class="divide-y divide-console-500/15">
                  <div
                    v-for="incident in displayRecord.pendingIncidents"
                    :key="incident.incidentId"
                    class="flex items-center justify-between px-4 py-2.5 hover:bg-console-700/20 transition-colors"
                  >
                    <div class="flex items-center gap-2.5">
                      <div
                        :class="[
                          'w-7 h-7 rounded border flex items-center justify-center',
                          incident.severity === 'critical' ? 'bg-harbor-red/10 border-harbor-red/30' :
                          incident.severity === 'major' ? 'bg-harbor-orange/10 border-harbor-orange/30' :
                          incident.severity === 'minor' ? 'bg-harbor-yellow/10 border-harbor-yellow/30' :
                          'bg-harbor-cyan/10 border-harbor-cyan/30',
                        ]"
                      >
                        <AlertOctagon
                          :class="[
                            'w-3.5 h-3.5',
                            getSeverityColor(incident.severity),
                          ]"
                        />
                      </div>
                      <div>
                        <p class="text-[11px] font-mono font-medium text-console-100 flex items-center gap-1.5">
                          {{ incident.title }}
                          <span
                            :class="[
                              'text-[8px] font-mono px-1 py-0.5 rounded border',
                              getSeverityColor(incident.severity),
                              incident.severity === 'critical' ? 'border-harbor-red/30 bg-harbor-red/10' :
                              incident.severity === 'major' ? 'border-harbor-orange/30 bg-harbor-orange/10' :
                              incident.severity === 'minor' ? 'border-harbor-yellow/30 bg-harbor-yellow/10' :
                              'border-harbor-cyan/30 bg-harbor-cyan/10',
                            ]"
                          >
                            {{ getSeverityLabel(incident.severity) }}
                          </span>
                        </p>
                        <p class="text-[9px] font-mono text-console-400 mt-0.5">
                          状态：{{ getIncidentStatusLabel(incident.status) }}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div v-else class="p-6 text-center">
                <AlertOctagon class="w-8 h-8 mx-auto text-console-500 opacity-50 mb-2" />
                <p class="text-xs font-mono text-console-400">暂无待处理异常记录</p>
              </div>
            </div>

            <div v-if="displayRecord.remarks" class="panel-border rounded-lg p-4">
              <div class="flex items-start gap-2.5">
                <FileText class="w-4 h-4 text-harbor-purple shrink-0 mt-0.5" />
                <div>
                  <p class="text-[10px] font-mono text-console-400 mb-1.5">交接备注</p>
                  <p class="text-xs font-mono text-console-200 leading-relaxed whitespace-pre-wrap">
                    {{ displayRecord.remarks }}
                  </p>
                </div>
              </div>
            </div>

            <div class="text-[10px] font-mono text-console-500 flex items-center justify-between pt-2 border-t border-console-500/15">
              <span>交接记录ID：{{ displayRecord.id }}</span>
              <span>创建时间：{{ formatTime(displayRecord.createdAt) }}</span>
            </div>
          </div>

          <div v-else class="p-12 flex flex-col items-center justify-center text-center flex-1">
            <Handshake class="w-12 h-12 text-console-500 opacity-40 mb-4" />
            <p class="text-xs font-mono text-console-400 mb-1">暂无值班交接记录</p>
            <p class="text-[10px] font-mono text-console-500">完成首次交接后将在此显示摘要信息</p>
          </div>

          <div class="flex items-center justify-end gap-2 px-5 py-3 border-t border-console-500/20 shrink-0">
            <button
              class="px-4 py-1.5 rounded text-xs font-mono font-medium text-console-300 border border-console-500/30 hover:bg-console-700/50 hover:text-console-100 transition-all"
              @click="handleClose"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: all 0.25s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-from > div:last-child,
.modal-leave-to > div:last-child {
  transform: scale(0.95) translateY(-10px);
  opacity: 0;
}
</style>
