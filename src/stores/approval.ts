import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
  ApprovalOrder,
  ApprovalRecord,
  ApprovalType,
  ApprovalStatus,
} from '../types';
import { mockApprovalOrders } from '../data/mock';
import { useAuthStore } from './auth';
import { useScheduleStore } from './schedule';
import { usePermissionStore } from './permission';

export const useApprovalStore = defineStore('approval', () => {
  const orders = ref<ApprovalOrder[]>([...mockApprovalOrders]);

  const pendingOrders = computed(() =>
    orders.value.filter((o) => o.status === 'pending'),
  );

  const approvedOrders = computed(() =>
    orders.value.filter((o) => o.status === 'approved'),
  );

  const rejectedOrders = computed(() =>
    orders.value.filter((o) => o.status === 'rejected'),
  );

  const pendingCount = computed(() => pendingOrders.value.length);

  function generateApprovalNo(): string {
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const existingToday = orders.value.filter((o) =>
      o.approvalNo.includes(dateStr),
    ).length;
    const seq = String(existingToday + 1).padStart(3, '0');
    return `AP-${dateStr}-${seq}`;
  }

  function createOrder(data: {
    scheduleId: string;
    type: ApprovalType;
    opinion: string;
    beforeSnapshot?: Record<string, unknown> | null;
    afterSnapshot?: Record<string, unknown> | null;
  }): ApprovalOrder {
    const authStore = useAuthStore();
    const order: ApprovalOrder = {
      id: `appr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      approvalNo: generateApprovalNo(),
      scheduleId: data.scheduleId,
      initiatorId: authStore.currentUser?.id || 'system',
      initiatorName: authStore.currentUser?.displayName || '系统',
      type: data.type,
      status: 'pending',
      opinion: data.opinion,
      submitTime: new Date(),
      processTime: null,
      conclusion: null,
      records: [],
      beforeSnapshot: data.beforeSnapshot || null,
      afterSnapshot: data.afterSnapshot || null,
    };
    orders.value.unshift(order);
    return order;
  }

  function processOrder(
    orderId: string,
    action: 'approve' | 'reject',
    opinion: string,
  ): ApprovalOrder | null {
    const order = orders.value.find((o) => o.id === orderId);
    if (!order || order.status !== 'pending') return null;

    const authStore = useAuthStore();
    const scheduleStore = useScheduleStore();
    const permStore = usePermissionStore();

    const record: ApprovalRecord = {
      id: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      approverId: authStore.currentUser?.id || 'system',
      approverName: authStore.currentUser?.displayName || '系统',
      action,
      opinion,
      timestamp: new Date(),
    };

    order.records.push(record);
    order.processTime = new Date();

    if (action === 'approve') {
      order.status = 'approved';
      order.conclusion = opinion || '审批通过';
      scheduleStore.addLog({
        type: 'update',
        scheduleId: order.scheduleId,
        description: `审批单 ${order.approvalNo} 已通过，计划正式生效`,
        after: { approvalStatus: 'approved', approvalNo: order.approvalNo },
      });
    } else {
      order.status = 'rejected';
      order.conclusion = opinion || '审批驳回';
      if (order.beforeSnapshot) {
        const schedule = scheduleStore.schedules.find(
          (s) => s.id === order.scheduleId,
        );
        if (schedule) {
          Object.assign(schedule, order.beforeSnapshot);
        }
      }
      scheduleStore.addLog({
        type: 'warning',
        scheduleId: order.scheduleId,
        description: `审批单 ${order.approvalNo} 已驳回，计划已回写`,
        before: order.afterSnapshot || undefined,
        after: order.beforeSnapshot || undefined,
      });
    }

    permStore.addAuditLog(
      'schedule_write',
      order.scheduleId,
      'schedule',
      `${action === 'approve' ? '审批通过' : '审批驳回'} ${order.approvalNo}`,
      { status: 'pending' },
      { status: order.status, conclusion: order.conclusion },
    );

    return order;
  }

  function cancelOrder(orderId: string): boolean {
    const order = orders.value.find((o) => o.id === orderId);
    if (!order || order.status !== 'pending') return false;
    order.status = 'cancelled';
    order.processTime = new Date();
    order.conclusion = '发起人撤销';
    return true;
  }

  function getOrderById(id: string): ApprovalOrder | undefined {
    return orders.value.find((o) => o.id === id);
  }

  function getOrdersByScheduleId(scheduleId: string): ApprovalOrder[] {
    return orders.value.filter((o) => o.scheduleId === scheduleId);
  }

  function getPendingByScheduleId(scheduleId: string): ApprovalOrder | undefined {
    return orders.value.find(
      (o) => o.scheduleId === scheduleId && o.status === 'pending',
    );
  }

  function filterOrders(options?: {
    type?: ApprovalType;
    status?: ApprovalStatus;
    scheduleId?: string;
    keyword?: string;
  }): ApprovalOrder[] {
    let result = [...orders.value];
    if (options?.type) {
      result = result.filter((o) => o.type === options.type);
    }
    if (options?.status) {
      result = result.filter((o) => o.status === options.status);
    }
    if (options?.scheduleId) {
      result = result.filter((o) => o.scheduleId === options.scheduleId);
    }
    if (options?.keyword) {
      const kw = options.keyword.toLowerCase();
      result = result.filter(
        (o) =>
          o.approvalNo.toLowerCase().includes(kw) ||
          o.initiatorName.toLowerCase().includes(kw) ||
          o.opinion.toLowerCase().includes(kw),
      );
    }
    return result.sort(
      (a, b) =>
        new Date(b.submitTime).getTime() - new Date(a.submitTime).getTime(),
    );
  }

  function scheduleNeedsApproval(scheduleId: string): boolean {
    return orders.value.some(
      (o) => o.scheduleId === scheduleId && o.status === 'pending',
    );
  }

  return {
    orders,
    pendingOrders,
    approvedOrders,
    rejectedOrders,
    pendingCount,
    createOrder,
    processOrder,
    cancelOrder,
    getOrderById,
    getOrdersByScheduleId,
    getPendingByScheduleId,
    filterOrders,
    scheduleNeedsApproval,
  };
});
