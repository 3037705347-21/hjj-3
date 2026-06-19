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
    });
  }

  function addLog(log: Partial<ScheduleLog>) {
    const newLog: ScheduleLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date(),
      operator: currentOperator.value,
      type: log.type || 'update',
      description: log.description || '',
      scheduleId: log.scheduleId,
      shipId: log.shipId,
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
  };
});
