<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useApprovalStore } from '../../stores/approval';
import { useScheduleStore } from '../../stores/schedule';
import type { ApprovalType, ApprovalStatus } from '../../types';
import { APPROVAL_TYPE_LABELS } from '../../types';
import ApprovalStatusBadge from './ApprovalStatusBadge.vue';
import { format } from 'date-fns';
import { Search, Filter, FileText } from 'lucide-vue-next';

const router = useRouter();
const approvalStore = useApprovalStore();
const scheduleStore = useScheduleStore();

const typeFilter = ref<ApprovalType | 'all'>('all');
const statusFilter = ref<ApprovalStatus | 'all'>('all');
const keyword = ref('');

const filteredOrders = computed(() =>
  approvalStore.filterOrders({
    type: typeFilter.value === 'all' ? undefined : typeFilter.value,
    status: statusFilter.value === 'all' ? undefined : statusFilter.value,
    keyword: keyword.value || undefined,
  }),
);

function getShipName(scheduleId: string): string {
  const schedule = scheduleStore.schedules.find((s) => s.id === scheduleId);
  if (!schedule) return '-';
  const ship = scheduleStore.getShipById(schedule.shipId);
  return ship?.name || schedule.shipId;
}

function getBerthName(scheduleId: string): string {
  const schedule = scheduleStore.schedules.find((s) => s.id === scheduleId);
  if (!schedule) return '-';
  const berth = scheduleStore.getBerthById(schedule.berthId);
  return berth?.name || schedule.berthId;
}

function goToDetail(orderId: string) {
  router.push(`/approval/${orderId}`);
}
</script>

<template>
  <div class="panel-border rounded-lg overflow-hidden">
    <div class="p-4 border-b border-console-500/20">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-mono text-sm font-semibold text-console-100 flex items-center gap-2">
          <span class="w-1 h-4 bg-harbor-cyan rounded-full" />
          审批单列表
        </h3>
        <span class="text-xs font-mono text-console-400">
          共 {{ filteredOrders.length }} 条
        </span>
      </div>
      <div class="flex items-center gap-3">
        <div class="flex-1 relative">
          <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-console-400" />
          <input
            v-model="keyword"
            type="text"
            placeholder="搜索审批单号、发起人、审批意见..."
            class="w-full pl-8 pr-3 py-1.5 rounded bg-console-800/60 border border-console-500/30 text-xs font-mono text-console-100 placeholder:text-console-500 focus:outline-none focus:border-harbor-cyan/50"
          />
        </div>
        <div class="flex items-center gap-2">
          <Filter class="w-3.5 h-3.5 text-console-400" />
          <select
            v-model="typeFilter"
            class="px-2 py-1.5 rounded bg-console-800/60 border border-console-500/30 text-xs font-mono text-console-200 focus:outline-none focus:border-harbor-cyan/50"
          >
            <option value="all">全部类型</option>
            <option v-for="(label, key) in APPROVAL_TYPE_LABELS" :key="key" :value="key">
              {{ label }}
            </option>
          </select>
          <select
            v-model="statusFilter"
            class="px-2 py-1.5 rounded bg-console-800/60 border border-console-500/30 text-xs font-mono text-console-200 focus:outline-none focus:border-harbor-cyan/50"
          >
            <option value="all">全部状态</option>
            <option value="pending">待审批</option>
            <option value="approved">已通过</option>
            <option value="rejected">已驳回</option>
            <option value="cancelled">已撤销</option>
          </select>
        </div>
      </div>
    </div>

    <div class="overflow-auto" style="max-height: 600px">
      <table class="w-full text-xs font-mono">
        <thead>
          <tr class="border-b border-console-500/20 bg-console-800/40">
            <th class="text-left px-4 py-2.5 text-console-400 font-medium">审批单号</th>
            <th class="text-left px-4 py-2.5 text-console-400 font-medium">关联计划</th>
            <th class="text-left px-4 py-2.5 text-console-400 font-medium">船舶</th>
            <th class="text-left px-4 py-2.5 text-console-400 font-medium">泊位</th>
            <th class="text-left px-4 py-2.5 text-console-400 font-medium">审批类型</th>
            <th class="text-left px-4 py-2.5 text-console-400 font-medium">发起人</th>
            <th class="text-left px-4 py-2.5 text-console-400 font-medium">状态</th>
            <th class="text-left px-4 py-2.5 text-console-400 font-medium">提交时间</th>
            <th class="text-left px-4 py-2.5 text-console-400 font-medium">处理时间</th>
            <th class="text-center px-4 py-2.5 text-console-400 font-medium">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="order in filteredOrders"
            :key="order.id"
            class="border-b border-console-500/10 hover:bg-console-700/30 transition-colors cursor-pointer"
            @click="goToDetail(order.id)"
          >
            <td class="px-4 py-3 text-harbor-cyan">{{ order.approvalNo }}</td>
            <td class="px-4 py-3 text-console-200">{{ order.scheduleId }}</td>
            <td class="px-4 py-3 text-console-100">{{ getShipName(order.scheduleId) }}</td>
            <td class="px-4 py-3 text-console-200">{{ getBerthName(order.scheduleId) }}</td>
            <td class="px-4 py-3">
              <span class="px-1.5 py-0.5 rounded bg-harbor-purple/20 text-harbor-purple border border-harbor-purple/30 text-[10px]">
                {{ APPROVAL_TYPE_LABELS[order.type] }}
              </span>
            </td>
            <td class="px-4 py-3 text-console-200">{{ order.initiatorName }}</td>
            <td class="px-4 py-3">
              <ApprovalStatusBadge :status="order.status" size="sm" />
            </td>
            <td class="px-4 py-3 text-console-300">{{ format(order.submitTime, 'MM-dd HH:mm') }}</td>
            <td class="px-4 py-3 text-console-300">
              {{ order.processTime ? format(order.processTime, 'MM-dd HH:mm') : '-' }}
            </td>
            <td class="px-4 py-3 text-center">
              <button
                class="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] bg-harbor-cyan/10 text-harbor-cyan border border-harbor-cyan/30 hover:bg-harbor-cyan/20 transition-all"
                @click.stop="goToDetail(order.id)"
              >
                <FileText class="w-3 h-3" />
                详情
              </button>
            </td>
          </tr>
          <tr v-if="filteredOrders.length === 0">
            <td colspan="10" class="text-center py-8 text-console-400 text-sm">
              暂无审批记录
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
