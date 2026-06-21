import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
  SiteCheckinRecord,
  SiteCheckinStatus,
  SiteCheckinActionLog,
  AbnormalRecord,
  AbnormalCategory,
} from '../types';
import { mockSiteCheckinRecords, mockSiteCheckinActionLogs } from '../data/mock';
import { useScheduleStore } from './schedule';
import { useAuthStore } from './auth';
import { usePermissionStore } from './permission';

export const useSiteCheckinStore = defineStore('siteCheckin', () => {
  const records = ref<SiteCheckinRecord[]>(mockSiteCheckinRecords);
  const actionLogs = ref<SiteCheckinActionLog[]>(mockSiteCheckinActionLogs);
  const selectedRecordId = ref<string | null>(null);
  const currentOperator = ref('张伟');

  function recordAudit(action: 'schedule_write' | 'conflict_resolve' | 'log_export', targetId: string, description: string, before: Record<string, unknown> | null = null, after: Record<string, unknown> | null = null) {
    try {
      const permStore = usePermissionStore();
      const auth = useAuthStore();
      if (auth.currentUser) {
        permStore.addAuditLog(action, targetId, 'schedule', description, before, after);
      }
    } catch {
    }
  }

  const selectedRecord = computed(() =>
    records.value.find((r) => r.id === selectedRecordId.value) || null,
  );

  const pendingRecords = computed(() =>
    records.value.filter((r) => r.status === 'pending'),
  );

  const checkedInRecords = computed(() =>
    records.value.filter((r) => r.status === 'checked_in'),
  );

  const inProgressRecords = computed(() =>
    records.value.filter((r) => r.status === 'in_progress'),
  );

  const completedRecords = computed(() =>
    records.value.filter((r) => r.status === 'completed'),
  );

  const abnormalRecords = computed(() =>
    records.value.filter((r) => r.status === 'abnormal' || r.abnormalRecords.some((a) => !a.handled)),
  );

  const statsCards = computed(() => [
    {
      label: '待签到',
      value: pendingRecords.value.length,
      color: 'text-console-300',
      bgClass: 'bg-console-500/15',
      borderClass: 'border-console-500/30',
    },
    {
      label: '已签到',
      value: checkedInRecords.value.length,
      color: 'text-harbor-blue',
      bgClass: 'bg-harbor-blue/15',
      borderClass: 'border-harbor-blue/30',
    },
    {
      label: '作业中',
      value: inProgressRecords.value.length,
      color: 'text-harbor-cyan',
      bgClass: 'bg-harbor-cyan/15',
      borderClass: 'border-harbor-cyan/30',
    },
    {
      label: '异常',
      value: abnormalRecords.value.length,
      color: 'text-harbor-red',
      bgClass: 'bg-harbor-red/15',
      borderClass: 'border-harbor-red/30',
    },
  ]);

  function addActionLog(
    checkinId: string,
    scheduleId: string,
    action: SiteCheckinActionLog['action'],
    description: string,
    details?: Record<string, unknown>,
  ) {
    const authStore = useAuthStore();
    const operator = authStore.currentUser?.displayName || currentOperator.value;
    const newLog: SiteCheckinActionLog = {
      id: `sitelog-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      checkinId,
      scheduleId,
      action,
      operator,
      timestamp: new Date(),
      description,
      details,
    };
    actionLogs.value.unshift(newLog);

    const scheduleStore = useScheduleStore();
    scheduleStore.addLog({
      type: 'update',
      scheduleId,
      description: `[现场作业] ${description}`,
      before: details ? { action } : undefined,
      after: details,
    });
  }

  function getRecordsByScheduleId(scheduleId: string): SiteCheckinRecord[] {
    return records.value.filter((r) => r.scheduleId === scheduleId);
  }

  function getLogsByCheckinId(checkinId: string): SiteCheckinActionLog[] {
    return actionLogs.value.filter((l) => l.checkinId === checkinId);
  }

  function getLogsByScheduleId(scheduleId: string): SiteCheckinActionLog[] {
    return actionLogs.value.filter((l) => l.scheduleId === scheduleId);
  }

  function createCheckinRecord(scheduleId: string, teamName: string): SiteCheckinRecord {
    const now = new Date();
    const newRecord: SiteCheckinRecord = {
      id: `checkin-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      scheduleId,
      teamName,
      status: 'pending',
      abnormalRecords: [],
      createdAt: now,
      updatedAt: now,
    };
    records.value.push(newRecord);

    addActionLog(
      newRecord.id,
      scheduleId,
      'checkin',
      `创建${teamName}签到记录，关联计划 ${scheduleId}`,
      { teamName, scheduleId },
    );

    recordAudit('schedule_write', newRecord.id, `创建现场签到记录: ${teamName}`);

    return newRecord;
  }

  function updateRecordStatus(id: string, status: SiteCheckinStatus) {
    const record = records.value.find((r) => r.id === id);
    if (!record) return;

    const beforeStatus = record.status;
    record.status = status;
    record.updatedAt = new Date();

    addActionLog(
      id,
      record.scheduleId,
      'add_remark',
      `状态由 ${beforeStatus} 变更为 ${status}`,
      { beforeStatus, afterStatus: status },
    );
  }

  function teamCheckin(id: string) {
    const record = records.value.find((r) => r.id === id);
    if (!record || record.status !== 'pending') return;

    const now = new Date();
    record.checkinTime = now;
    record.status = 'checked_in';
    record.updatedAt = now;

    addActionLog(
      id,
      record.scheduleId,
      'checkin',
      `${record.teamName}完成签到`,
      { checkinTime: now },
    );

    recordAudit('schedule_write', id, `${record.teamName}完成现场签到`);
  }

  function confirmStartWork(id: string) {
    const record = records.value.find((r) => r.id === id);
    if (!record || (record.status !== 'checked_in' && record.status !== 'abnormal')) return;

    const authStore = useAuthStore();
    const scheduleStore = useScheduleStore();
    const schedule = scheduleStore.schedules.find((s) => s.id === record.scheduleId);

    if (!schedule) return;

    const now = new Date();
    record.startTime = now;
    record.status = 'in_progress';
    record.confirmedBy = authStore.currentUser?.displayName || currentOperator.value;
    record.updatedAt = now;

    const operationType = schedule.status === 'loading' || schedule.status === 'unloading'
      ? schedule.status
      : 'loading';

    scheduleStore.updateScheduleStatus(record.scheduleId, operationType);
    scheduleStore.updateOperationProgress(record.scheduleId, Math.max(schedule.operationProgress, 1));

    addActionLog(
      id,
      record.scheduleId,
      'start_work',
      `${record.teamName}确认开工，开始${operationType === 'loading' ? '装货' : '卸货'}作业`,
      { startTime: now, operationType },
    );

    recordAudit(
      'schedule_write',
      id,
      `${record.teamName}确认开工，计划状态变更为${operationType === 'loading' ? '装货' : '卸货'}`,
    );
  }

  function confirmCompleteWork(id: string, siteRemark?: string) {
    const record = records.value.find((r) => r.id === id);
    if (!record || (record.status !== 'in_progress' && record.status !== 'abnormal')) return;

    const authStore = useAuthStore();
    const scheduleStore = useScheduleStore();
    const schedule = scheduleStore.schedules.find((s) => s.id === record.scheduleId);

    if (!schedule) return;

    const now = new Date();
    record.endTime = now;
    record.status = 'completed';
    record.confirmedBy = authStore.currentUser?.displayName || currentOperator.value;
    record.updatedAt = now;

    if (siteRemark) {
      record.siteRemark = siteRemark;
    }

    scheduleStore.updateOperationProgress(record.scheduleId, 100);

    const operationType = schedule.status;
    scheduleStore.updateScheduleStatus(record.scheduleId, 'departing');

    addActionLog(
      id,
      record.scheduleId,
      'complete_work',
      `${record.teamName}确认完工，${operationType === 'loading' ? '装货' : operationType === 'unloading' ? '卸货' : '作业'}完成，计划状态推进至离泊中`,
      { endTime: now, siteRemark, operationType, scheduleStatusBefore: operationType, scheduleStatusAfter: 'departing' },
    );

    recordAudit(
      'schedule_write',
      id,
      `${record.teamName}确认完工，作业进度更新为100%，计划状态推进至departing`,
    );
  }

  function reportAbnormal(
    id: string,
    category: AbnormalCategory,
    description: string,
  ): AbnormalRecord | null {
    const record = records.value.find((r) => r.id === id);
    if (!record) return null;

    const authStore = useAuthStore();
    const now = new Date();

    const abnormalRecord: AbnormalRecord = {
      id: `abnormal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      category,
      description,
      reportedBy: authStore.currentUser?.displayName || currentOperator.value,
      reportedAt: now,
      handled: false,
    };

    record.abnormalRecords.push(abnormalRecord);

    if (record.status === 'in_progress') {
      record.status = 'abnormal';
    }
    record.updatedAt = now;

    addActionLog(
      id,
      record.scheduleId,
      'report_abnormal',
      `报告异常：${description}`,
      { category, description, abnormalId: abnormalRecord.id },
    );

    recordAudit(
      'conflict_resolve',
      abnormalRecord.id,
      `报告现场异常: ${category} - ${description}`,
    );

    return abnormalRecord;
  }

  function handleAbnormal(
    id: string,
    abnormalId: string,
    handlingNote: string,
  ): boolean {
    const record = records.value.find((r) => r.id === id);
    if (!record) return false;

    const abnormal = record.abnormalRecords.find((a) => a.id === abnormalId);
    if (!abnormal) return false;

    const authStore = useAuthStore();
    const now = new Date();

    abnormal.handled = true;
    abnormal.handledBy = authStore.currentUser?.displayName || currentOperator.value;
    abnormal.handledAt = now;
    abnormal.handlingNote = handlingNote;

    const unhandledCount = record.abnormalRecords.filter((a) => !a.handled).length;
    if (unhandledCount === 0 && record.status === 'abnormal' && record.startTime) {
      record.status = 'in_progress';
    }
    record.updatedAt = now;

    addActionLog(
      id,
      record.scheduleId,
      'handle_abnormal',
      `处理异常：${handlingNote}`,
      { abnormalId, handlingNote, handled: true },
    );

    recordAudit(
      'conflict_resolve',
      abnormalId,
      `处理现场异常: ${handlingNote}`,
    );

    return true;
  }

  function updateSiteRemark(id: string, remark: string) {
    const record = records.value.find((r) => r.id === id);
    if (!record) return;

    const beforeRemark = record.siteRemark;
    record.siteRemark = remark;
    record.updatedAt = new Date();

    addActionLog(
      id,
      record.scheduleId,
      'add_remark',
      '更新现场备注',
      { beforeRemark, afterRemark: remark },
    );
  }

  function getUnresolvedAbnormals(scheduleId: string): AbnormalRecord[] {
    const scheduleRecords = records.value.filter((r) => r.scheduleId === scheduleId);
    const abnormals: AbnormalRecord[] = [];
    scheduleRecords.forEach((r) => {
      r.abnormalRecords.forEach((a) => {
        if (!a.handled) abnormals.push(a);
      });
    });
    return abnormals;
  }

  return {
    records,
    actionLogs,
    selectedRecordId,
    currentOperator,
    selectedRecord,
    pendingRecords,
    checkedInRecords,
    inProgressRecords,
    completedRecords,
    abnormalRecords,
    statsCards,
    getRecordsByScheduleId,
    getLogsByCheckinId,
    getLogsByScheduleId,
    createCheckinRecord,
    updateRecordStatus,
    teamCheckin,
    confirmStartWork,
    confirmCompleteWork,
    reportAbnormal,
    handleAbnormal,
    updateSiteRemark,
    getUnresolvedAbnormals,
  };
});
