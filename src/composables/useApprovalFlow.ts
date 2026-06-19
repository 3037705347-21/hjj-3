import { useApprovalStore } from '../stores/approval';
import { useScheduleStore } from '../stores/schedule';
import type { ApprovalType, BerthSchedule, Ship } from '../types';

const DANGEROUS_CARGO_TYPES = ['liquid'];

export function useApprovalFlow() {
  const approvalStore = useApprovalStore();
  const scheduleStore = useScheduleStore();

  function shouldRequireApproval(schedule: BerthSchedule, ship?: Ship): ApprovalType | null {
    if (ship && ship.priority === 'critical') {
      return 'key_schedule';
    }
    if (ship && DANGEROUS_CARGO_TYPES.includes(ship.cargoType)) {
      return 'dangerous_cargo';
    }
    if (schedule.source === 'manual' && schedule.priorityAdjustReason) {
      return 'manual_adjust';
    }
    return null;
  }

  function submitForScheduleCreate(
    scheduleId: string,
    ship?: Ship,
  ): string | null {
    const schedule = scheduleStore.schedules.find((s) => s.id === scheduleId);
    if (!schedule) return null;

    const approvalType = shouldRequireApproval(schedule, ship);
    if (!approvalType) return null;

    if (approvalStore.scheduleNeedsApproval(scheduleId)) return null;

    const order = approvalStore.createOrder({
      scheduleId,
      type: approvalType,
      opinion: `新建调度计划需要审批（类型: ${approvalType}）`,
      afterSnapshot: {
        shipId: schedule.shipId,
        berthId: schedule.berthId,
        eta: schedule.eta,
        etd: schedule.etd,
        source: schedule.source,
      },
    });

    scheduleStore.addLog({
      type: 'create',
      scheduleId,
      shipId: schedule.shipId,
      description: `新建调度计划已提交审批 ${order.approvalNo}，等待审批后生效`,
    });

    return order.approvalNo;
  }

  function submitForTimeWindowChange(
    scheduleId: string,
    before: { eta: Date; etd: Date },
    after: { eta: Date; etd: Date },
    reason: string,
  ): string | null {
    if (approvalStore.scheduleNeedsApproval(scheduleId)) return null;

    const order = approvalStore.createOrder({
      scheduleId,
      type: 'time_window_change',
      opinion: reason || '修改关键时间窗口，需要审批',
      beforeSnapshot: { eta: before.eta, etd: before.etd },
      afterSnapshot: { eta: after.eta, etd: after.etd },
    });

    scheduleStore.addLog({
      type: 'update',
      scheduleId,
      description: `时间窗口变更已提交审批 ${order.approvalNo}`,
      before: { eta: before.eta, etd: before.etd } as unknown as Record<string, unknown>,
      after: { eta: after.eta, etd: after.etd } as unknown as Record<string, unknown>,
    });

    return order.approvalNo;
  }

  function submitForBerthChange(
    scheduleId: string,
    beforeBerthId: string,
    afterBerthId: string,
    reason: string,
  ): string | null {
    if (approvalStore.scheduleNeedsApproval(scheduleId)) return null;

    const order = approvalStore.createOrder({
      scheduleId,
      type: 'berth_change',
      opinion: reason || '变更泊位，需要审批',
      beforeSnapshot: { berthId: beforeBerthId },
      afterSnapshot: { berthId: afterBerthId },
    });

    scheduleStore.addLog({
      type: 'update',
      scheduleId,
      description: `泊位变更已提交审批 ${order.approvalNo}`,
      before: { berthId: beforeBerthId },
      after: { berthId: afterBerthId },
    });

    return order.approvalNo;
  }

  function submitForConflictIgnore(
    scheduleId: string,
    conflictId: string,
    conflictMessage: string,
    reason: string,
  ): string | null {
    if (approvalStore.scheduleNeedsApproval(scheduleId)) return null;

    const order = approvalStore.createOrder({
      scheduleId,
      type: 'conflict_ignore',
      opinion: reason || `手动忽略冲突: ${conflictMessage}`,
      afterSnapshot: { ignoredConflictId: conflictId, conflictMessage },
    });

    scheduleStore.addLog({
      type: 'conflict',
      scheduleId,
      description: `冲突忽略已提交审批 ${order.approvalNo}`,
    });

    return order.approvalNo;
  }

  function submitManualAdjust(
    scheduleId: string,
    reason: string,
    before?: Record<string, unknown>,
    after?: Record<string, unknown>,
  ): string | null {
    if (approvalStore.scheduleNeedsApproval(scheduleId)) return null;

    const order = approvalStore.createOrder({
      scheduleId,
      type: 'manual_adjust',
      opinion: reason || '人工调整计划，需要审批',
      beforeSnapshot: before || null,
      afterSnapshot: after || null,
    });

    scheduleStore.addLog({
      type: 'update',
      scheduleId,
      description: `人工调整已提交审批 ${order.approvalNo}`,
      before,
      after,
    });

    return order.approvalNo;
  }

  return {
    shouldRequireApproval,
    submitForScheduleCreate,
    submitForTimeWindowChange,
    submitForBerthChange,
    submitForConflictIgnore,
    submitManualAdjust,
  };
}
