<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useResourceStore } from '../../stores/resource';
import { useScheduleStore } from '../../stores/schedule';
import { useAuthStore } from '../../stores/auth';
import {
  X,
  Save,
  Building2,
  HardHat,
  Cpu,
} from 'lucide-vue-next';
import {
  RESOURCE_TYPE_LABELS,
  RESOURCE_STATUS_LABELS,
  type ResourceType,
  type ResourceStatus,
  type Resource,
} from '../../types';

const props = defineProps<{
  visible: boolean;
  isCreating: boolean;
  resource: Resource | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const resourceStore = useResourceStore();
const scheduleStore = useScheduleStore();
const authStore = useAuthStore();

const form = ref({
  type: 'team' as ResourceType,
  name: '',
  berthId: '' as string,
  operationTeam: '',
  remarks: '',
  status: 'available' as ResourceStatus,
  disableReason: '',
});

watch(
  () => props.resource,
  (val) => {
    if (val) {
      form.value = {
        type: val.type,
        name: val.name,
        berthId: val.berthId || '',
        operationTeam: val.operationTeam || '',
        remarks: val.remarks || '',
        status: val.status,
        disableReason: val.disableReason || '',
      };
    }
  },
  { immediate: true },
);

watch(
  () => props.visible,
  (val) => {
    if (val && props.isCreating) {
      form.value = {
        type: 'team',
        name: '',
        berthId: '',
        operationTeam: '',
        remarks: '',
        status: 'available',
        disableReason: '',
      };
    }
  },
);

const canSubmit = computed(() => {
  if (!authStore.canManageResources) return false;
  if (!form.value.name.trim()) return false;
  return true;
});

const resourceTypeOptions = computed(() =>
  (Object.keys(RESOURCE_TYPE_LABELS) as ResourceType[]).map((k) => ({
    value: k,
    label: RESOURCE_TYPE_LABELS[k],
  })),
);

const resourceStatusOptions = computed(() =>
  (Object.keys(RESOURCE_STATUS_LABELS) as ResourceStatus[]).map((k) => ({
    value: k,
    label: RESOURCE_STATUS_LABELS[k],
  })),
);

function getTypeIcon(type: ResourceType) {
  switch (type) {
    case 'berth':
      return Building2;
    case 'team':
      return HardHat;
    case 'equipment':
      return Cpu;
  }
}

function handleSubmit() {
  if (!canSubmit.value) return;

  const baseData = {
    type: form.value.type,
    name: form.value.name.trim(),
    berthId: form.value.berthId || undefined,
    operationTeam: form.value.operationTeam.trim() || undefined,
    remarks: form.value.remarks.trim() || undefined,
    status: form.value.status,
    disableReason: form.value.status === 'disabled' ? form.value.disableReason.trim() || undefined : undefined,
    availableSlots: props.resource?.availableSlots || [{
      start: new Date(),
      end: new Date(Date.now() + 7 * 24 * 3600 * 1000),
    }],
    scheduleIds: props.resource?.scheduleIds || [],
  };

  if (props.isCreating) {
    resourceStore.createResource(baseData as Omit<Resource, 'id' | 'createdAt' | 'updatedAt'>);
  } else if (props.resource) {
    resourceStore.updateResource(props.resource.id, baseData as Partial<Resource>);
  }

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
              <component :is="getTypeIcon(form.type)" class="w-4 h-4 text-harbor-cyan" />
            </div>
            <h2 class="font-mono text-sm font-semibold text-console-100">
              {{ isCreating ? '新增资源' : '编辑资源' }}
            </h2>
          </div>
          <button
            @click="emit('close')"
            class="p-1.5 rounded text-console-400 hover:text-console-100 hover:bg-console-700/50 transition-all"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <div class="p-5 space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-[10px] font-mono text-console-400 uppercase tracking-wider mb-1.5">
                资源类型 <span class="text-harbor-red">*</span>
              </label>
              <select
                v-model="form.type"
                :disabled="!isCreating || !authStore.canManageResources"
                class="w-full px-3 py-2 text-xs font-mono bg-console-800/80 border border-console-500/40 rounded text-console-100 focus:outline-none focus:border-harbor-cyan/50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option v-for="opt in resourceTypeOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </div>
            <div>
              <label class="block text-[10px] font-mono text-console-400 uppercase tracking-wider mb-1.5">
                资源名称 <span class="text-harbor-red">*</span>
              </label>
              <input
                v-model="form.name"
                type="text"
                :disabled="!authStore.canManageResources"
                placeholder="输入资源名称"
                class="w-full px-3 py-2 text-xs font-mono bg-console-800/80 border border-console-500/40 rounded text-console-100 placeholder:text-console-500 focus:outline-none focus:border-harbor-cyan/50 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-[10px] font-mono text-console-400 uppercase tracking-wider mb-1.5">
                所属泊位
              </label>
              <select
                v-model="form.berthId"
                :disabled="!authStore.canManageResources"
                class="w-full px-3 py-2 text-xs font-mono bg-console-800/80 border border-console-500/40 rounded text-console-100 focus:outline-none focus:border-harbor-cyan/50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">不指定</option>
                <option v-for="berth in scheduleStore.sortedBerths" :key="berth.id" :value="berth.id">
                  {{ berth.name }}
                </option>
              </select>
            </div>
            <div>
              <label class="block text-[10px] font-mono text-console-400 uppercase tracking-wider mb-1.5">
                操作班组
              </label>
              <input
                v-model="form.operationTeam"
                type="text"
                :disabled="!authStore.canManageResources"
                placeholder="如：A班组"
                class="w-full px-3 py-2 text-xs font-mono bg-console-800/80 border border-console-500/40 rounded text-console-100 placeholder:text-console-500 focus:outline-none focus:border-harbor-cyan/50 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label class="block text-[10px] font-mono text-console-400 uppercase tracking-wider mb-1.5">
              状态
            </label>
            <select
              v-model="form.status"
              :disabled="!authStore.canManageResources"
              class="w-full px-3 py-2 text-xs font-mono bg-console-800/80 border border-console-500/40 rounded text-console-100 focus:outline-none focus:border-harbor-cyan/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option v-for="opt in resourceStatusOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
          </div>

          <div v-if="form.status === 'disabled'">
            <label class="block text-[10px] font-mono text-console-400 uppercase tracking-wider mb-1.5">
              停用原因
            </label>
            <textarea
              v-model="form.disableReason"
              :disabled="!authStore.canManageResources"
              rows="2"
              placeholder="请输入停用原因"
              class="w-full px-3 py-2 text-xs font-mono bg-console-800/80 border border-console-500/40 rounded text-console-100 placeholder:text-console-500 focus:outline-none focus:border-harbor-red/50 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          <div>
            <label class="block text-[10px] font-mono text-console-400 uppercase tracking-wider mb-1.5">
              备注
            </label>
            <textarea
              v-model="form.remarks"
              :disabled="!authStore.canManageResources"
              rows="3"
              placeholder="输入备注信息..."
              class="w-full px-3 py-2 text-xs font-mono bg-console-800/80 border border-console-500/40 rounded text-console-100 placeholder:text-console-500 focus:outline-none focus:border-harbor-cyan/50 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
            />
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
            {{ isCreating ? '创建' : '保存' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
