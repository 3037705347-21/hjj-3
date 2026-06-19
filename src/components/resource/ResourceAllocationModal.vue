<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useResourceStore } from '../../stores/resource';
import { useScheduleStore } from '../../stores/schedule';
import { useAuthStore } from '../../stores/auth';
import {
  X,
  Save,
  Calendar,
  Ship,
  Users,
  Building2,
} from 'lucide-vue-next';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { Resource } from '../../types';

const props = defineProps<{
  visible: boolean;
  resourceId: string | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const resourceStore = useResourceStore();
const scheduleStore = useScheduleStore();
const authStore = useAuthStore();

const form = ref({
  scheduleId: '',
  startTime: '',
  endTime: '',
  remarks: '',
});

const resource = computed(() =>
  props.resourceId ? resourceStore.getResourceById(props.resourceId) : null,
);

const availableSchedules = computed(() => {
  return scheduleStore.schedules.filter((s) =>
    s.status !== 'departed' && s.status !== 'departing',
  );
});

const canSubmit = computed(() => {
  if (!authStore.canAllocateResources) return false;
  if (!form.value.scheduleId) return false;
  if (!form.value.startTime || !form.value.endTime) return false;
  if (new Date(form.value.startTime) >= new Date(form.value.endTime)) return false;
  return true;
});

watch(
  () => props.visible,
  (val) => {
    if (val) {
      form.value = {
        scheduleId: '',
        startTime: '',
        endTime: '',
        remarks: '',
      };
    }
  },
);

function getShipName(scheduleId: string) {
  const schedule = scheduleStore.schedules.find((s) => s.id === scheduleId);
  if (!schedule) return scheduleId;
  const ship = scheduleStore.getShipById(schedule.shipId);
  return ship?.name || scheduleId;
}

function getScheduleLabel(schedule: typeof scheduleStore.schedules[0]) {
  const ship = scheduleStore.getShipById(schedule.shipId);
  const berth = scheduleStore.getBerthById(schedule.berthId);
  return `${ship?.name || schedule.shipId} - ${berth?.name || schedule.berthId} (${format(new Date(schedule.eta), 'MM/dd HH:mm', { locale: zhCN })})`;
}

function handleScheduleChange() {
  const schedule = scheduleStore.schedules.find((s) => s.id === form.value.scheduleId);
  if (schedule) {
    form.value.startTime = format(new Date(schedule.eta), "yyyy-MM-dd'T'HH:mm");
    form.value.endTime = format(new Date(schedule.etd), "yyyy-MM-dd'T'HH:mm");
  }
}

function handleSubmit() {
  if (!canSubmit.value || !props.resourceId) return;

  resourceStore.allocateResource(
    props.resourceId,
    form.value.scheduleId,
    new Date(form.value.startTime),
    new Date(form.value.endTime),
    form.value.remarks.trim() || undefined,
  );

  emit('close');
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="fixed inset-0 z-50 flex items-center justify-center bg-console-900/80 backdrop-blur-sm"
      @click.self="emit('close')"
    >
      <div class="panel-border rounded-xl w-full max-w-lg bg-console-850 shadow-2xl overflow-hidden">
        <div class="flex items-center justify-between px-5 py-4 border-b border-console-500/30">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-lg bg-harbor-cyan/15 flex items-center justify-center border border-harbor-cyan/30">
              <Users class="w-4 h-4 text-harbor-cyan" />
            </div>
            <div>
              <h2 class="font-mono text-sm font-semibold text-console-100">
                分配资源
              </h2>
              <p v-if="resource" class="text-[10px] font-mono text-console-400">
                {{ resource.name }}
              </p>
            </div>
          </div>
          <button
            @click="emit('close')"
            class="p-1.5 rounded text-console-400 hover:text-console-100 hover:bg-console-700/50 transition-all"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <div class="p-5 space-y-4">
          <div v-if="resource" class="panel-border rounded-lg p-3 bg-console-800/50">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-xs font-mono font-medium text-console-100">{{ resource.name }}</p>
                <p class="text-[10px] font-mono text-console-400 mt-0.5">
                  {{ resource.operationTeam ? `班组: ${resource.operationTeam}` : '' }}
                </p>
              </div>
              <div class="flex items-center gap-1 text-[10px] font-mono text-console-400">
                <Building2 class="w-3 h-3" />
                {{ scheduleStore.getBerthById(resource.berthId || '')?.name || '未绑定泊位' }}
              </div>
            </div>
          </div>

          <div>
            <label class="block text-[10px] font-mono text-console-400 uppercase tracking-wider mb-1.5">
              选择计划 <span class="text-harbor-red">*</span>
            </label>
            <div class="relative">
              <Ship class="w-3.5 h-3.5 text-console-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <select
                v-model="form.scheduleId"
                @change="handleScheduleChange"
                :disabled="!authStore.canAllocateResources"
                class="w-full pl-8 pr-3 py-2 text-xs font-mono bg-console-800/80 border border-console-500/40 rounded text-console-100 focus:outline-none focus:border-harbor-cyan/50 disabled:opacity-50 disabled:cursor-not-allowed appearance-none"
              >
                <option value="">请选择调度计划</option>
                <option v-for="s in availableSchedules" :key="s.id" :value="s.id">
                  {{ getScheduleLabel(s) }}
                </option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-[10px] font-mono text-console-400 uppercase tracking-wider mb-1.5">
                开始时间 <span class="text-harbor-red">*</span>
              </label>
              <div class="relative">
                <Calendar class="w-3.5 h-3.5 text-console-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  v-model="form.startTime"
                  type="datetime-local"
                  :disabled="!authStore.canAllocateResources"
                  class="w-full pl-8 pr-3 py-2 text-xs font-mono bg-console-800/80 border border-console-500/40 rounded text-console-100 focus:outline-none focus:border-harbor-cyan/50 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>
            <div>
              <label class="block text-[10px] font-mono text-console-400 uppercase tracking-wider mb-1.5">
                结束时间 <span class="text-harbor-red">*</span>
              </label>
              <div class="relative">
                <Calendar class="w-3.5 h-3.5 text-console-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  v-model="form.endTime"
                  type="datetime-local"
                  :disabled="!authStore.canAllocateResources"
                  class="w-full pl-8 pr-3 py-2 text-xs font-mono bg-console-800/80 border border-console-500/40 rounded text-console-100 focus:outline-none focus:border-harbor-cyan/50 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          <div>
            <label class="block text-[10px] font-mono text-console-400 uppercase tracking-wider mb-1.5">
              备注
            </label>
            <textarea
              v-model="form.remarks"
              :disabled="!authStore.canAllocateResources"
              rows="2"
              placeholder="输入分配备注..."
              class="w-full px-3 py-2 text-xs font-mono bg-console-800/80 border border-console-500/40 rounded text-console-100 placeholder:text-console-500 focus:outline-none focus:border-harbor-cyan/50 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          <div v-if="form.scheduleId" class="panel-border rounded-lg p-3 bg-harbor-cyan/5 border-harbor-cyan/20">
            <p class="text-[10px] font-mono text-console-300">
              将分配 <span class="text-harbor-cyan font-medium">{{ resource?.name }}</span> 给
              <span class="text-harbor-orange font-medium">{{ getShipName(form.scheduleId) }}</span>
            </p>
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 px-5 py-4 border-t border-console-500/30 bg-console-800/30">
          <button
            @click="emit('close')"
            class="px-4 py-2 text-xs font-mono text-console-300 border border-console-500/40 rounded hover:bg-console-700/50 hover:text-console-100 transition-all"
          >
            取消
          </button>
          <button
            @click="handleSubmit"
            :disabled="!canSubmit"
            class="flex items-center gap-1.5 px-4 py-2 text-xs font-mono text-console-900 bg-gradient-to-r from-harbor-cyan to-harbor-cyan/80 rounded shadow-glow-cyan hover:shadow-glow-blue transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save class="w-3.5 h-3.5" />
            确认分配
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
