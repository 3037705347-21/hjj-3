<script setup lang="ts">
import { ref, computed } from 'vue';
import { useScheduleStore } from '../../stores/schedule';
import {
  MAINTENANCE_TYPE_LABELS,
  MAINTENANCE_IMPACT_SCOPE_LABELS,
  MAINTENANCE_STATUS_LABELS,
} from '../../types';
import type {
  MaintenanceType,
  MaintenanceImpactScope,
  BerthMaintenancePeriod,
} from '../../types';
import {
  X,
  Plus,
  Pencil,
  Trash2,
  Wrench,
  Clock,
  User,
  AlertTriangle,
  ChevronDown,
} from 'lucide-vue-next';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const store = useScheduleStore();

const activeTab = ref<'list' | 'add'>('list');
const editingId = ref<string | null>(null);

const formBerthId = ref('');
const formStartTime = ref('');
const formEndTime = ref('');
const formMaintenanceType = ref<MaintenanceType>('routine');
const formImpactScope = ref<MaintenanceImpactScope>('berth_only');
const formResponsiblePerson = ref('');
const formNotes = ref('');

const sortedPeriods = computed(() =>
  [...store.maintenancePeriods].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
  ),
);

const activePeriods = computed(() =>
  sortedPeriods.value.filter(
    (m) => m.status === 'planned' || m.status === 'in_progress',
  ),
);

const completedPeriods = computed(() =>
  sortedPeriods.value.filter(
    (m) => m.status === 'completed' || m.status === 'cancelled',
  ),
);

function resetForm() {
  formBerthId.value = '';
  formStartTime.value = '';
  formEndTime.value = '';
  formMaintenanceType.value = 'routine';
  formImpactScope.value = 'berth_only';
  formResponsiblePerson.value = '';
  formNotes.value = '';
  editingId.value = null;
}

function openAdd() {
  resetForm();
  const now = new Date();
  formStartTime.value = format(now, "yyyy-MM-dd'T'HH:mm");
  formEndTime.value = format(new Date(now.getTime() + 24 * 3600000), "yyyy-MM-dd'T'HH:mm");
  activeTab.value = 'add';
}

function openEdit(period: BerthMaintenancePeriod) {
  editingId.value = period.id;
  formBerthId.value = period.berthId;
  formStartTime.value = format(new Date(period.startTime), "yyyy-MM-dd'T'HH:mm");
  formEndTime.value = format(new Date(period.endTime), "yyyy-MM-dd'T'HH:mm");
  formMaintenanceType.value = period.maintenanceType;
  formImpactScope.value = period.impactScope;
  formResponsiblePerson.value = period.responsiblePerson;
  formNotes.value = period.notes;
  activeTab.value = 'add';
}

function submitForm() {
  if (!formBerthId.value || !formStartTime.value || !formEndTime.value || !formResponsiblePerson.value) return;

  const data = {
    berthId: formBerthId.value,
    startTime: new Date(formStartTime.value),
    endTime: new Date(formEndTime.value),
    maintenanceType: formMaintenanceType.value,
    impactScope: formImpactScope.value,
    responsiblePerson: formResponsiblePerson.value,
    notes: formNotes.value,
    status: 'planned' as const,
  };

  if (editingId.value) {
    store.updateMaintenancePeriod(editingId.value, data);
  } else {
    store.addMaintenancePeriod(data);
  }

  resetForm();
  activeTab.value = 'list';
}

function deletePeriod(id: string) {
  store.deleteMaintenancePeriod(id);
}

function updateStatus(id: string, status: BerthMaintenancePeriod['status']) {
  store.updateMaintenancePeriod(id, { status });
}

function getStatusColor(status: BerthMaintenancePeriod['status']) {
  switch (status) {
    case 'planned': return 'text-harbor-cyan bg-harbor-cyan/15 border-harbor-cyan/30';
    case 'in_progress': return 'text-harbor-yellow bg-harbor-yellow/15 border-harbor-yellow/30';
    case 'completed': return 'text-harbor-green bg-harbor-green/15 border-harbor-green/30';
    case 'cancelled': return 'text-console-400 bg-console-700/30 border-console-500/30';
  }
}

function getTypeColor(type: MaintenanceType) {
  switch (type) {
    case 'routine': return 'text-console-300';
    case 'emergency': return 'text-harbor-red';
    case 'equipment_upgrade': return 'text-harbor-cyan';
    case 'dredging': return 'text-harbor-orange';
    case 'structural_repair': return 'text-harbor-yellow';
    case 'safety_inspection': return 'text-harbor-green';
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="visible"
        class="fixed inset-0 z-[200] flex items-center justify-center"
      >
        <div
          class="absolute inset-0 bg-black/60 backdrop-blur-sm"
          @click="emit('close')"
        />
        <div class="relative w-full max-w-3xl mx-4 bg-console-900 border border-console-500/40 rounded-xl shadow-2xl overflow-hidden z-10 max-h-[85vh] flex flex-col">
          <div class="flex items-center justify-between px-5 py-4 border-b border-console-500/30">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-lg bg-harbor-orange/20 flex items-center justify-center border border-harbor-orange/30">
                <Wrench class="w-4 h-4 text-harbor-orange" />
              </div>
              <div>
                <h3 class="font-mono text-sm font-bold text-console-100">泊位维护计划排程</h3>
                <p class="text-[10px] font-mono text-console-400">
                  管理泊位维护时段，维护期间不可排班
                </p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span
                v-if="activePeriods.length > 0"
                class="px-2 py-0.5 rounded bg-harbor-yellow/20 text-harbor-yellow text-[10px] font-mono border border-harbor-yellow/40"
              >
                {{ activePeriods.length }} 项维护中/计划中
              </span>
              <button
                @click="emit('close')"
                class="w-7 h-7 rounded flex items-center justify-center text-console-400 hover:text-console-100 hover:bg-console-700/50 transition-all"
              >
                <X class="w-4 h-4" />
              </button>
            </div>
          </div>

          <div class="flex items-center gap-2 px-5 py-2 border-b border-console-500/20 bg-console-800/30">
            <button
              @click="activeTab = 'list'; resetForm()"
              :class="[
                'px-3 py-1.5 rounded text-xs font-mono transition-all',
                activeTab === 'list'
                  ? 'bg-harbor-cyan/20 text-harbor-cyan border border-harbor-cyan/30'
                  : 'text-console-300 hover:text-console-100 border border-transparent',
              ]"
            >
              维护列表 ({{ store.maintenancePeriods.length }})
            </button>
            <button
              @click="openAdd"
              :class="[
                'px-3 py-1.5 rounded text-xs font-mono transition-all',
                activeTab === 'add'
                  ? 'bg-harbor-cyan/20 text-harbor-cyan border border-harbor-cyan/30'
                  : 'text-console-300 hover:text-console-100 border border-transparent',
              ]"
            >
              <Plus class="w-3 h-3 inline mr-1" />
              新增维护
            </button>
          </div>

          <div class="flex-1 overflow-y-auto">
            <div v-if="activeTab === 'list'" class="p-4 space-y-3">
              <div v-if="activePeriods.length > 0">
                <p class="text-[10px] font-mono text-harbor-yellow mb-2 flex items-center gap-1">
                  <AlertTriangle class="w-3 h-3" />
                  当前生效 / 计划中
                </p>
                <div class="space-y-2">
                  <div
                    v-for="period in activePeriods"
                    :key="period.id"
                    class="p-3 rounded-lg bg-console-800/60 border border-harbor-yellow/20 hover:border-harbor-yellow/40 transition-all"
                  >
                    <div class="flex items-start justify-between gap-3">
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 mb-1.5">
                          <span class="font-mono text-xs font-semibold text-console-100">
                            {{ store.getBerthById(period.berthId)?.name || period.berthId }}
                          </span>
                          <span
                            class="px-1.5 py-0.5 rounded text-[9px] font-mono border"
                            :class="getStatusColor(period.status)"
                          >
                            {{ MAINTENANCE_STATUS_LABELS[period.status] }}
                          </span>
                          <span
                            class="px-1.5 py-0.5 rounded text-[9px] font-mono border border-console-500/30 text-console-300"
                            :class="getTypeColor(period.maintenanceType)"
                          >
                            {{ MAINTENANCE_TYPE_LABELS[period.maintenanceType] }}
                          </span>
                          <span class="text-[9px] font-mono text-console-400">
                            {{ MAINTENANCE_IMPACT_SCOPE_LABELS[period.impactScope] }}
                          </span>
                        </div>
                        <div class="flex items-center gap-3 text-[10px] font-mono text-console-300">
                          <span class="flex items-center gap-1">
                            <Clock class="w-3 h-3 text-console-400" />
                            {{ format(new Date(period.startTime), 'MM-dd HH:mm', { locale: zhCN }) }}
                            ~
                            {{ format(new Date(period.endTime), 'MM-dd HH:mm', { locale: zhCN }) }}
                          </span>
                          <span class="flex items-center gap-1">
                            <User class="w-3 h-3 text-console-400" />
                            {{ period.responsiblePerson }}
                          </span>
                        </div>
                        <p v-if="period.notes" class="text-[10px] font-mono text-console-400 mt-1 truncate">
                          {{ period.notes }}
                        </p>
                      </div>
                      <div class="flex items-center gap-1 flex-shrink-0">
                        <button
                          v-if="period.status === 'planned'"
                          @click="updateStatus(period.id, 'in_progress')"
                          class="px-2 py-1 text-[10px] font-mono text-harbor-yellow border border-harbor-yellow/30 rounded hover:bg-harbor-yellow/10 transition-all"
                        >
                          开始维护
                        </button>
                        <button
                          v-if="period.status === 'in_progress'"
                          @click="updateStatus(period.id, 'completed')"
                          class="px-2 py-1 text-[10px] font-mono text-harbor-green border border-harbor-green/30 rounded hover:bg-harbor-green/10 transition-all"
                        >
                          完成维护
                        </button>
                        <button
                          @click="openEdit(period)"
                          class="p-1 rounded text-console-400 hover:text-harbor-cyan hover:bg-harbor-cyan/10 transition-all"
                        >
                          <Pencil class="w-3 h-3" />
                        </button>
                        <button
                          @click="deletePeriod(period.id)"
                          class="p-1 rounded text-console-400 hover:text-harbor-red hover:bg-harbor-red/10 transition-all"
                        >
                          <Trash2 class="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div v-if="completedPeriods.length > 0">
                <p class="text-[10px] font-mono text-console-500 mb-2">已结束</p>
                <div class="space-y-1">
                  <div
                    v-for="period in completedPeriods"
                    :key="period.id"
                    class="p-2 rounded bg-console-800/30 border border-console-500/10"
                  >
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-2 text-[10px] font-mono">
                        <span class="text-console-400">
                          {{ store.getBerthById(period.berthId)?.name || period.berthId }}
                        </span>
                        <span class="text-console-500">|</span>
                        <span class="text-console-400">
                          {{ MAINTENANCE_TYPE_LABELS[period.maintenanceType] }}
                        </span>
                        <span class="text-console-500">|</span>
                        <span class="text-console-500">
                          {{ format(new Date(period.startTime), 'MM-dd HH:mm', { locale: zhCN }) }}
                          ~
                          {{ format(new Date(period.endTime), 'MM-dd HH:mm', { locale: zhCN }) }}
                        </span>
                        <span
                          class="px-1 py-0.5 rounded text-[9px] font-mono border"
                          :class="getStatusColor(period.status)"
                        >
                          {{ MAINTENANCE_STATUS_LABELS[period.status] }}
                        </span>
                      </div>
                      <button
                        @click="deletePeriod(period.id)"
                        class="p-1 rounded text-console-500 hover:text-harbor-red transition-all"
                      >
                        <Trash2 class="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div
                v-if="store.maintenancePeriods.length === 0"
                class="py-8 text-center"
              >
                <Wrench class="w-8 h-8 text-console-500 mx-auto mb-2" />
                <p class="text-xs font-mono text-console-400">暂无泊位维护记录</p>
                <p class="text-[10px] font-mono text-console-500 mt-1">点击"新增维护"添加维护时段</p>
              </div>
            </div>

            <div v-if="activeTab === 'add'" class="p-5 space-y-4">
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-mono text-console-300 mb-1.5">
                    泊位 <span class="text-harbor-red">*</span>
                  </label>
                  <select
                    v-model="formBerthId"
                    class="w-full px-3 py-2 rounded bg-console-800/60 border border-console-500/30 text-xs font-mono text-console-100 focus:outline-none focus:border-harbor-cyan/50"
                  >
                    <option value="">请选择泊位</option>
                    <option v-for="b in store.sortedBerths" :key="b.id" :value="b.id">
                      {{ b.name }} ({{ b.length }}m / {{ b.maxDraft }}m)
                    </option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-mono text-console-300 mb-1.5">
                    维护类型 <span class="text-harbor-red">*</span>
                  </label>
                  <select
                    v-model="formMaintenanceType"
                    class="w-full px-3 py-2 rounded bg-console-800/60 border border-console-500/30 text-xs font-mono text-console-100 focus:outline-none focus:border-harbor-cyan/50"
                  >
                    <option v-for="(label, key) in MAINTENANCE_TYPE_LABELS" :key="key" :value="key">
                      {{ label }}
                    </option>
                  </select>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-mono text-console-300 mb-1.5">
                    维护开始时间 <span class="text-harbor-red">*</span>
                  </label>
                  <input
                    v-model="formStartTime"
                    type="datetime-local"
                    class="w-full px-3 py-2 rounded bg-console-800/60 border border-console-500/30 text-xs font-mono text-console-100 focus:outline-none focus:border-harbor-cyan/50"
                  />
                </div>
                <div>
                  <label class="block text-xs font-mono text-console-300 mb-1.5">
                    维护结束时间 <span class="text-harbor-red">*</span>
                  </label>
                  <input
                    v-model="formEndTime"
                    type="datetime-local"
                    class="w-full px-3 py-2 rounded bg-console-800/60 border border-console-500/30 text-xs font-mono text-console-100 focus:outline-none focus:border-harbor-cyan/50"
                  />
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-mono text-console-300 mb-1.5">
                    影响范围 <span class="text-harbor-red">*</span>
                  </label>
                  <select
                    v-model="formImpactScope"
                    class="w-full px-3 py-2 rounded bg-console-800/60 border border-console-500/30 text-xs font-mono text-console-100 focus:outline-none focus:border-harbor-cyan/50"
                  >
                    <option v-for="(label, key) in MAINTENANCE_IMPACT_SCOPE_LABELS" :key="key" :value="key">
                      {{ label }}
                    </option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-mono text-console-300 mb-1.5">
                    负责人 <span class="text-harbor-red">*</span>
                  </label>
                  <input
                    v-model="formResponsiblePerson"
                    type="text"
                    placeholder="请输入负责人姓名"
                    class="w-full px-3 py-2 rounded bg-console-800/60 border border-console-500/30 text-xs font-mono text-console-100 placeholder:text-console-500 focus:outline-none focus:border-harbor-cyan/50"
                  />
                </div>
              </div>

              <div>
                <label class="block text-xs font-mono text-console-300 mb-1.5">备注</label>
                <textarea
                  v-model="formNotes"
                  rows="3"
                  placeholder="维护原因、注意事项等..."
                  class="w-full px-3 py-2 rounded bg-console-800/60 border border-console-500/30 text-xs font-mono text-console-100 placeholder:text-console-500 focus:outline-none focus:border-harbor-cyan/50 resize-none"
                />
              </div>

              <div class="p-3 rounded bg-harbor-yellow/10 border border-harbor-yellow/30">
                <p class="text-[11px] font-mono text-harbor-yellow flex items-center gap-1.5">
                  <AlertTriangle class="w-3.5 h-3.5 flex-shrink-0" />
                  维护时段内，该泊位将显示为不可排班区间，拖拽船舶至维护区间将被拒绝
                </p>
              </div>

              <div class="flex items-center justify-end gap-2 pt-2">
                <button
                  @click="activeTab = 'list'; resetForm()"
                  class="px-4 py-2 text-xs font-mono text-console-200 border border-console-500/40 rounded hover:bg-console-700/50 transition-all"
                >
                  取消
                </button>
                <button
                  @click="submitForm"
                  :disabled="!formBerthId || !formStartTime || !formEndTime || !formResponsiblePerson"
                  :class="[
                    'px-4 py-2 text-xs font-mono rounded transition-all flex items-center gap-1.5',
                    formBerthId && formStartTime && formEndTime && formResponsiblePerson
                      ? 'text-console-900 bg-harbor-cyan hover:bg-harbor-cyan/80'
                      : 'text-console-500 bg-console-700 cursor-not-allowed',
                  ]"
                >
                  <Wrench class="w-3 h-3" />
                  {{ editingId ? '更新维护' : '创建维护' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
