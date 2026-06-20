import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
  Ship,
  Berth,
  BerthSchedule,
  TideRecord,
  ScheduleLog,
  ScheduleConflict,
  OperationStatus,
  OperationMilestone,
  MilestoneKey,
  ProgressMode,
} from '../types';
import {
  mockShips,
  mockBerths,
  mockSchedules,
  generateTideRecords,
  mockLogs,
} from '../data/mock';
import { useScheduleLogger } from '../composables/useScheduleLogger';
import { usePermissionStore } from './permission';
import { useAuthStore } from './auth';

export const useScheduleStore = defineStore('schedule', () => {
  const ships = ref<Ship[]>(mockShips);
  const berths = ref<Berth[]>(mockBerths);
  const schedules = ref<BerthSchedule[]>(mockSchedules);
  const tides = ref<TideRecord[]>(generateTideRecords());
  const logs = ref<ScheduleLog[]>(mockLogs);
  const conflicts = ref<ScheduleConflict[]>([]);
  const selectedScheduleId = ref<string | null>(null);
  const currentOperator = ref('张伟');
  const logger = useScheduleLogger();

  function recordAudit(action: 'schedule_write' | 'conflict_resolve' | 'log_export', targetId: string, description: string, before: Record<string, unknown> | null = null, after: Record<string, unknown> | null = null) {
    try {
      const permStore = usePermissionStore();
      const auth = useAuthStore();
      if (auth.currentUser) {
        permStore.addAuditLog(action, targetId, 'schedule', description, before, after);
      }
    } catch {
      // permission store may not be initialized yet
    }
  }

  const DEFAULT_DELAY_THRESHOLD = 30;

  const sortedBerths = computed(() =>
    [...berths.value].sort((a, b) => a.position - b.position),
  );

  const selectedSchedule = computed(() =>
    schedules.value.find((s) => s.id === selectedScheduleId.value) || null,
  );

  const selectedShip = computed(() => {
    if (!selectedSchedule.value) return null;
    return ships.value.find((s) => s.id === selectedSchedule.value!.shipId) || null;
  });

  const selectedBerth = computed(() => {
    if (!selectedSchedule.value) return null;
    return berths.value.find((b) => b.id === selectedSchedule.value!.berthId) || null;
  });

  const shipsInPort = computed(() =>
    schedules.value.filter(
      (s) =>
        s.status === 'berthing' ||
        s.status === 'loading' ||
        s.status === 'unloading',
    ).length,
  );

  const shipsWaiting = computed(() =>
    schedules.value.filter((s) => s.status === 'anchored' || s.status === 'approaching')
      .length,
  );

  const berthUtilization = computed(() => {
    const totalHours = 24;
    let occupiedHours = 0;
    const now = Date.now();
    const dayStart = now;
    const dayEnd = now + 24 * 3600 * 1000;
    sortedBerths.value.forEach(() => {
      schedules.value.forEach((s) => {
        const start = Math.max(dayStart, new Date(s.eta).getTime());
        const end = Math.min(dayEnd, new Date(s.etd).getTime());
        if (end > start) {
          occupiedHours += (end - start) / 3600000;
        }
      });
    });
    const totalPossible = sortedBerths.value.length * totalHours;
    return Math.min(100, Math.round((occupiedHours / totalPossible) * 100));
  });

  const todayOperations = computed(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today.getTime() + 24 * 3600 * 1000);
    return schedules.value.filter(
      (s) =>
        new Date(s.eta) >= today && new Date(s.eta) < tomorrow,
    ).length;
  });

  const avgWaitingMinutes = computed(() => {
    const now = new Date();
    const waitingShips = schedules.value.filter(
      (s) => s.status === 'anchored' || s.status === 'approaching',
    );
    if (waitingShips.length === 0) return 0;
    let totalMinutes = 0;
    let count = 0;
    waitingShips.forEach((s) => {
      const eta = new Date(s.eta);
      if (eta < now) {
        totalMinutes += (now.getTime() - eta.getTime()) / 60000;
        count++;
      }
    });
    if (count === 0) return 0;
    return Math.round(totalMinutes / count);
  });

  const todayDeparted = computed(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today.getTime() + 24 * 3600 * 1000);
    return schedules.value.filter((s) => {
      if (s.status !== 'departed' || !s.actualDeparture) return false;
      const dep = new Date(s.actualDeparture);
      return dep >= today && dep < tomorrow;
    }).length;
  });

  const conflictShipCount = computed(() => {
    const scheduleIds = new Set(conflicts.value.map((c) => c.scheduleId));
    return scheduleIds.size;
  });

  const overtimeOperationsCount = computed(() => {
    const now = new Date();
    return schedules.value.filter((s) => {
      if (s.status === 'departed') return false;
      if (s.status !== 'loading' && s.status !== 'unloading' && s.status !== 'berthing') {
        return false;
      }
      const etd = new Date(s.etd);
      const threshold = (s.delayThresholdMinutes ?? DEFAULT_DELAY_THRESHOLD) * 60000;
      return now.getTime() > etd.getTime() + threshold;
    }).length;
  });

  const berthTurnoverRate = computed(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today.getTime() + 24 * 3600 * 1000);
    const completedToday = schedules.value.filter((s) => {
      if (s.status !== 'departed' || !s.actualDeparture) return false;
      const dep = new Date(s.actualDeparture);
      return dep >= today && dep < tomorrow;
    }).length;
    const berthCount = sortedBerths.value.length || 1;
    return Math.round((completedToday / berthCount) * 100) / 100;
  });

  const todayHighRiskOperations = computed(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today.getTime() + 24 * 3600 * 1000);
    return logs.value.filter((l) => {
      const ts = new Date(l.timestamp).getTime();
      return ts >= today.getTime() && ts < tomorrow.getTime() && 
             (l.type === 'conflict' || l.type === 'warning' || l.type === 'delete');
    }).length;
  });

  const duplicateScheduleModifications = computed(() => {
    const scheduleUpdateCounts: Record<string, number> = {};
    const oneHourAgo = Date.now() - 3600 * 1000;
    
    logs.value.forEach((l) => {
      if (l.type === 'update' && l.scheduleId) {
        const ts = new Date(l.timestamp).getTime();
        if (ts >= oneHourAgo) {
          scheduleUpdateCounts[l.scheduleId] = (scheduleUpdateCounts[l.scheduleId] || 0) + 1;
        }
      }
    });
    
    return Object.values(scheduleUpdateCounts).filter((count) => count >= 2).length;
  });

  const conflictResolutionRate = computed(() => {
    const totalConflicts = conflicts.value.length;
    if (totalConflicts === 0) return 100;
    
    const resolvedConflictIds = new Set<string>();
    logs.value.forEach((l) => {
      if (l.type === 'update' && l.description && l.description.includes('冲突')) {
        conflicts.value.forEach((c) => {
          if (l.scheduleId === c.scheduleId) {
            resolvedConflictIds.add(c.id);
          }
        });
      }
    });
    
    const resolvedCount = resolvedConflictIds.size;
    return Math.round((resolvedCount / totalConflicts) * 100);
  });

  const schedulesByBerth = computed(() => {
    const map: Record<string, BerthSchedule[]> = {};
    sortedBerths.value.forEach((b) => {
      map[b.id] = schedules.value.filter((s) => s.berthId === b.id);
    });
    return map;
  });

  const sortedSchedules = computed(() =>
    [...schedules.value].sort((a, b) => new Date(a.eta).getTime() - new Date(b.eta).getTime()),
  );

  function setSelectedSchedule(id: string | null) {
    selectedScheduleId.value = id;
  }

  function updateSchedule(id: string, updates: Partial<BerthSchedule>) {
    const schedule = schedules.value.find((s) => s.id === id);
    if (!schedule) return;
    const before = { ...schedule };
    Object.assign(schedule, updates);
    addLog({
      type: 'update',
      scheduleId: id,
      shipId: schedule.shipId,
      description: `更新调度计划 ${id}`,
      before: before as unknown as Record<string, unknown>,
      after: { ...updates } as Record<string, unknown>,
    });
    recordAudit('schedule_write', id, `更新调度计划 ${id}`, before as unknown as Record<string, unknown>, { ...updates } as Record<string, unknown>);
  }

  function checkAndWarnDelay(
    schedule: BerthSchedule,
    milestoneKey: MilestoneKey,
    actualTime: Date,
    plannedTime: Date,
  ) {
    const threshold = schedule.delayThresholdMinutes ?? DEFAULT_DELAY_THRESHOLD;
    const diffMinutes = (actualTime.getTime() - plannedTime.getTime()) / (1000 * 60);
    if (diffMinutes > threshold) {
      const milestoneLabels: Record<MilestoneKey, string> = {
        arrival: '抵达',
        berthing: '靠泊',
        operation_start: '开工',
        operation_mid: '作业中点',
        operation_end: '完工',
        departure: '离泊',
      };
      const ship = ships.value.find((s) => s.id === schedule.shipId);
      const shipName = ship?.name || schedule.shipId;
      logger.logWarning(
        schedule.id,
        `${shipName} ${milestoneLabels[milestoneKey]}延误 ${Math.round(diffMinutes)} 分钟，超过阈值 ${threshold} 分钟`,
      );
    }
  }

  function updateMilestone(schedule: BerthSchedule, key: MilestoneKey, actualTime: Date) {
    if (!schedule.milestones) return;
    const milestone = schedule.milestones.find((m) => m.key === key);
    if (milestone && !milestone.actualTime) {
      milestone.actualTime = actualTime;
      milestone.completed = true;
      if (milestone.plannedTime) {
        checkAndWarnDelay(schedule, key, actualTime, milestone.plannedTime);
      }
    }
  }

  function updateScheduleStatus(id: string, status: OperationStatus) {
    const schedule = schedules.value.find((s) => s.id === id);
    if (!schedule) return;
    const beforeStatus = schedule.status;
    schedule.status = status;

    const now = new Date();

    if (status === 'approaching') {
      updateMilestone(schedule, 'arrival', now);
    }

    if (status === 'berthing' && !schedule.actualBerthing) {
      schedule.actualBerthing = now;
      updateMilestone(schedule, 'berthing', now);
    }

    if ((status === 'loading' || status === 'unloading') && !schedule.actualOperationStart) {
      schedule.actualOperationStart = now;
      updateMilestone(schedule, 'operation_start', now);
    }

    if (status === 'departing') {
      if (!schedule.actualOperationEnd && schedule.operationProgress >= 100) {
        schedule.actualOperationEnd = now;
        updateMilestone(schedule, 'operation_end', now);
      }
    }

    if (status === 'departed' && !schedule.actualDeparture) {
      schedule.actualDeparture = now;
      updateMilestone(schedule, 'departure', now);
      if (schedule.operationProgress >= 100 && !schedule.actualOperationEnd) {
        schedule.actualOperationEnd = now;
        updateMilestone(schedule, 'operation_end', now);
      }
    }

    addLog({
      type: 'status_change',
      scheduleId: id,
      shipId: schedule.shipId,
      description: `状态由 ${beforeStatus} 变更为 ${status}`,
      before: { status: beforeStatus },
      after: { status },
    });
  }

  function updateOperationProgress(id: string, progress: number) {
    const schedule = schedules.value.find((s) => s.id === id);
    if (!schedule) return;
    const oldProgress = schedule.operationProgress;
    schedule.operationProgress = Math.max(0, Math.min(100, progress));

    if (schedule.milestones) {
      const now = new Date();
      if (schedule.operationProgress >= 50 && oldProgress < 50) {
        updateMilestone(schedule, 'operation_mid', now);
      }
      if (schedule.operationProgress >= 100 && oldProgress < 100) {
        if (!schedule.actualOperationEnd) {
          schedule.actualOperationEnd = now;
        }
        updateMilestone(schedule, 'operation_end', now);
      }
    }
  }

  function setProgressMode(id: string, mode: ProgressMode) {
    const schedule = schedules.value.find((s) => s.id === id);
    if (!schedule) return;
    schedule.progressMode = mode;
    if (mode === 'milestone' && !schedule.milestones) {
      schedule.milestones = generateDefaultMilestones(schedule);
    }
  }

  function generateDefaultMilestones(schedule: BerthSchedule): OperationMilestone[] {
    const eta = new Date(schedule.eta);
    const etd = new Date(schedule.etd);
    const totalDuration = etd.getTime() - eta.getTime();

    return [
      {
        key: 'arrival',
        label: '抵达锚地',
        plannedTime: new Date(eta.getTime() - totalDuration * 0.1),
        completed: false,
        progressWeight: 10,
      },
      {
        key: 'berthing',
        label: '靠泊完成',
        plannedTime: eta,
        completed: !!schedule.actualBerthing,
        actualTime: schedule.actualBerthing,
        progressWeight: 20,
      },
      {
        key: 'operation_start',
        label: '作业开始',
        plannedTime: new Date(eta.getTime() + totalDuration * 0.1),
        completed: !!schedule.actualOperationStart,
        actualTime: schedule.actualOperationStart,
        progressWeight: 30,
      },
      {
        key: 'operation_mid',
        label: '作业中点',
        plannedTime: new Date(eta.getTime() + totalDuration * 0.5),
        completed: false,
        progressWeight: 50,
      },
      {
        key: 'operation_end',
        label: '作业完成',
        plannedTime: new Date(etd.getTime() - totalDuration * 0.1),
        completed: !!schedule.actualOperationEnd,
        actualTime: schedule.actualOperationEnd,
        progressWeight: 90,
      },
      {
        key: 'departure',
        label: '离泊完成',
        plannedTime: etd,
        completed: !!schedule.actualDeparture,
        actualTime: schedule.actualDeparture,
        progressWeight: 100,
      },
    ];
  }

  function updateCargoCompleted(id: string, value: number) {
    const schedule = schedules.value.find((s) => s.id === id);
    if (!schedule) return;
    schedule.cargoCompleted = Math.max(0, value);
  }

  function updateDelayReason(id: string, reason: string) {
    const schedule = schedules.value.find((s) => s.id === id);
    if (!schedule) return;
    schedule.delayReason = reason;
  }

  function moveSchedule(id: string, berthId: string, eta: Date, etd: Date) {
    const schedule = schedules.value.find((s) => s.id === id);
    if (!schedule) return;
    const before = { berthId: schedule.berthId, eta: schedule.eta, etd: schedule.etd };
    schedule.berthId = berthId;
    schedule.eta = eta;
    schedule.etd = etd;
    addLog({
      type: 'update',
      scheduleId: id,
      shipId: schedule.shipId,
      description: `调整泊位与时间窗口`,
      before: before as unknown as Record<string, unknown>,
      after: { berthId, eta, etd } as unknown as Record<string, unknown>,
    });
  }

  function setConflicts(newConflicts: ScheduleConflict[]) {
    conflicts.value = newConflicts;
    newConflicts.forEach((c) => {
      if (!logs.value.find((l) => l.description === c.message)) {
        addLog({
          type: c.severity === 'error' ? 'conflict' : 'warning',
          scheduleId: c.scheduleId,
          description: c.message,
        });
      }
      recordAudit('conflict_resolve', c.scheduleId, c.message, null, { severity: c.severity, type: c.type });
    });
  }

  function addLog(log: Partial<ScheduleLog>) {
    let berthId = log.berthId;
    if (!berthId && log.scheduleId) {
      const schedule = schedules.value.find((s) => s.id === log.scheduleId);
      if (schedule) {
        berthId = schedule.berthId;
      }
    }
    const newLog: ScheduleLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date(),
      operator: currentOperator.value,
      type: log.type || 'update',
      description: log.description || '',
      scheduleId: log.scheduleId,
      shipId: log.shipId,
      berthId,
      before: log.before,
      after: log.after,
    };
    logs.value.unshift(newLog);
  }

  function getShipById(id: string) {
    return ships.value.find((s) => s.id === id);
  }

  function getBerthById(id: string) {
    return berths.value.find((b) => b.id === id);
  }

  function createSchedule(data: Omit<BerthSchedule, 'id'>) {
    const newId = `sched-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newSchedule: BerthSchedule = {
      ...data,
      id: newId,
    };
    schedules.value.push(newSchedule);
    addLog({
      type: 'create',
      scheduleId: newId,
      shipId: data.shipId,
      description: `新增调度计划 ${newId}`,
      after: { ...newSchedule } as unknown as Record<string, unknown>,
    });
    recordAudit('schedule_write', newId, `新增调度计划 ${newId}`, null, { shipId: data.shipId, berthId: data.berthId } as unknown as Record<string, unknown>);
    return newSchedule;
  }

  function deleteSchedule(id: string) {
    const idx = schedules.value.findIndex((s) => s.id === id);
    if (idx === -1) return;
    const schedule = schedules.value[idx];
    const before = { ...schedule };
    schedules.value.splice(idx, 1);
    if (selectedScheduleId.value === id) {
      selectedScheduleId.value = null;
    }
    addLog({
      type: 'delete',
      scheduleId: id,
      shipId: schedule.shipId,
      description: `删除调度计划 ${id}`,
      before: before as unknown as Record<string, unknown>,
    });
    recordAudit('schedule_write', id, `删除调度计划 ${id}`, before as unknown as Record<string, unknown>, null);
  }

  function copySchedule(id: string) {
    const schedule = schedules.value.find((s) => s.id === id);
    if (!schedule) return null;
    const eta = new Date(schedule.eta);
    const etd = new Date(schedule.etd);
    const newSchedule: Omit<BerthSchedule, 'id'> = {
      shipId: schedule.shipId,
      berthId: schedule.berthId,
      eta,
      etd,
      status: 'anchored',
      operationProgress: 0,
      progressMode: schedule.progressMode || 'percentage',
      milestones: schedule.progressMode === 'milestone'
        ? generateDefaultMilestones({ ...schedule, eta, etd, operationProgress: 0 })
        : undefined,
      operationTeam: schedule.operationTeam,
      remarks: schedule.remarks,
      source: schedule.source,
      priorityAdjustReason: schedule.priorityAdjustReason,
      estimatedDuration: schedule.estimatedDuration,
      delayThresholdMinutes: schedule.delayThresholdMinutes,
    };
    return createSchedule(newSchedule);
  }

  function getAvailableShips() {
    const scheduledShipIds = new Set(schedules.value.map((s) => s.shipId));
    return ships.value.filter((s) => !scheduledShipIds.has(s.id));
  }

  function batchUpdateStatus(ids: string[], status: OperationStatus) {
    ids.forEach((id) => {
      updateScheduleStatus(id, status);
    });
  }

  function batchAssignTeam(ids: string[], team: string) {
    ids.forEach((id) => {
      const schedule = schedules.value.find((s) => s.id === id);
      if (!schedule) return;
      const beforeTeam = schedule.operationTeam;
      schedule.operationTeam = team;
      addLog({
        type: 'update',
        scheduleId: id,
        shipId: schedule.shipId,
        description: beforeTeam
          ? `作业班组由 ${beforeTeam} 变更为 ${team}`
          : `分配作业班组: ${team}`,
        before: { operationTeam: beforeTeam },
        after: { operationTeam: team },
      });
    });
  }

  function batchAddRemarks(ids: string[], remarks: string, append = true) {
    ids.forEach((id) => {
      const schedule = schedules.value.find((s) => s.id === id);
      if (!schedule) return;
      const beforeRemarks = schedule.remarks;
      const newRemarks = append && beforeRemarks
        ? `${beforeRemarks}\n${remarks}`
        : remarks;
      schedule.remarks = newRemarks;
      addLog({
        type: 'update',
        scheduleId: id,
        shipId: schedule.shipId,
        description: append ? '追加备注信息' : '更新备注信息',
        before: { remarks: beforeRemarks },
        after: { remarks: newRemarks },
      });
    });
  }

  const ROLLBACK_FIELDS = ['berthId', 'eta', 'etd', 'status', 'operationProgress', 'operationTeam', 'remarks'] as const;

  function getLatestRollbackableLog(scheduleId: string): ScheduleLog | null {
    const scheduleLogs = logs.value.filter(
      (l) => l.scheduleId === scheduleId && (l.type === 'update' || l.type === 'status_change' || l.type === 'rollback'),
    );

    let rollbackCredit = 0;

    for (const log of scheduleLogs) {
      if (log.type === 'rollback') {
        rollbackCredit++;
      } else if (log.type === 'update' || log.type === 'status_change') {
        if (rollbackCredit > 0) {
          rollbackCredit--;
        } else {
          if (log.before && log.after) {
            return log;
          }
        }
      }
    }

    return null;
  }

  function canRollbackLog(logId: string): { canRollback: boolean; reason?: string } {
    const targetLog = logs.value.find((l) => l.id === logId);
    if (!targetLog) {
      return { canRollback: false, reason: '日志记录不存在' };
    }
    if (targetLog.type !== 'update' && targetLog.type !== 'status_change') {
      return { canRollback: false, reason: '仅更新和状态变更类型的日志支持回退' };
    }
    if (!targetLog.before || !targetLog.after) {
      return { canRollback: false, reason: '该日志缺少变更前后数据' };
    }
    if (!targetLog.scheduleId) {
      return { canRollback: false, reason: '该日志未关联调度计划' };
    }
    const schedule = schedules.value.find((s) => s.id === targetLog.scheduleId);
    if (!schedule) {
      return { canRollback: false, reason: '关联的调度计划已不存在' };
    }
    const latest = getLatestRollbackableLog(targetLog.scheduleId);
    if (!latest || latest.id !== logId) {
      return { canRollback: false, reason: '仅允许回退最近一次有效变更记录' };
    }
    return { canRollback: true };
  }

  function rollbackSchedule(logId: string): { success: boolean; reason?: string } {
    const check = canRollbackLog(logId);
    if (!check.canRollback) {
      return { success: false, reason: check.reason };
    }

    const targetLog = logs.value.find((l) => l.id === logId)!;
    const schedule = schedules.value.find((s) => s.id === targetLog.scheduleId!)!;
    const before = targetLog.before!;

    const rollbackUpdates: Partial<BerthSchedule> = {};
    const rollbackBefore: Record<string, unknown> = {};
    const rollbackAfter: Record<string, unknown> = {};
    const changedFields: string[] = [];

    for (const field of ROLLBACK_FIELDS) {
      if (field in before) {
        const originalValue = before[field];
        const currentFieldValue = (schedule as unknown as Record<string, unknown>)[field];
        if (JSON.stringify(currentFieldValue) !== JSON.stringify(originalValue)) {
          changedFields.push(field);
          rollbackBefore[field] = currentFieldValue;
          rollbackAfter[field] = originalValue;
          if (field === 'eta' || field === 'etd') {
            (rollbackUpdates as Record<string, unknown>)[field] = originalValue ? new Date(originalValue as string | number) : originalValue;
          } else {
            (rollbackUpdates as Record<string, unknown>)[field] = originalValue;
          }
        }
      }
    }

    if (changedFields.length === 0) {
      return { success: false, reason: '无可回退的变更字段' };
    }

    const currentValues = { ...schedule } as unknown as Record<string, unknown>;
    Object.assign(schedule, rollbackUpdates);

    const fieldLabels: Record<string, string> = {
      berthId: '泊位',
      eta: '预计到港时间',
      etd: '预计离港时间',
      status: '状态',
      operationProgress: '作业进度',
      operationTeam: '作业班组',
      remarks: '备注',
    };

    const changeDesc = changedFields.map((f) => fieldLabels[f] || f).join('、');

    addLog({
      type: 'rollback',
      scheduleId: schedule.id,
      shipId: schedule.shipId,
      description: `回退调度计划: 恢复${changeDesc}（基于日志 ${logId}）`,
      before: rollbackBefore,
      after: rollbackAfter,
    });

    recordAudit('schedule_write', schedule.id, `回退调度计划: 恢复${changeDesc}`, currentValues, { ...rollbackUpdates } as unknown as Record<string, unknown>);

    return { success: true };
  }

  function scheduleHasConflicts(scheduleId: string): boolean {
    return conflicts.value.some((c) => c.scheduleId === scheduleId);
  }

  function getAllOperationTeams(): string[] {
    const teams = new Set<string>();
    schedules.value.forEach((s) => {
      if (s.operationTeam) teams.add(s.operationTeam);
    });
    return Array.from(teams);
  }

  return {
    ships,
    berths,
    schedules,
    tides,
    logs,
    conflicts,
    selectedScheduleId,
    currentOperator,
    DEFAULT_DELAY_THRESHOLD,
    sortedBerths,
    selectedSchedule,
    selectedShip,
    selectedBerth,
    shipsInPort,
    shipsWaiting,
    berthUtilization,
    todayOperations,
    avgWaitingMinutes,
    todayDeparted,
    conflictShipCount,
    overtimeOperationsCount,
    berthTurnoverRate,
    todayHighRiskOperations,
    duplicateScheduleModifications,
    conflictResolutionRate,
    schedulesByBerth,
    sortedSchedules,
    setSelectedSchedule,
    updateSchedule,
    updateScheduleStatus,
    updateOperationProgress,
    setProgressMode,
    generateDefaultMilestones,
    updateCargoCompleted,
    updateDelayReason,
    moveSchedule,
    setConflicts,
    addLog,
    getShipById,
    getBerthById,
    createSchedule,
    deleteSchedule,
    copySchedule,
    getAvailableShips,
    batchUpdateStatus,
    batchAssignTeam,
    batchAddRemarks,
    scheduleHasConflicts,
    getAllOperationTeams,
    canRollbackLog,
    rollbackSchedule,
  };
});
