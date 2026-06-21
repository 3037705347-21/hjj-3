import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
  Scenario,
  ScenarioStatus,
  ScenarioShipSnapshot,
  ScenarioSummary,
  Ship,
  Berth,
  BerthSchedule,
  TideRecord,
  ScheduleLog,
  ScheduleConflict,
  BerthMaintenancePeriod,
} from '../types';
import { useScheduleStore } from './schedule';
import { useAuthStore } from './auth';
import { useConflictDetection } from '../composables/useConflictDetection';
import { format } from 'date-fns';

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

function generateScenarioSummary(
  snapshot: ScenarioShipSnapshot,
  originalSchedules: BerthSchedule[],
): ScenarioSummary {
  const { schedules, conflicts, ships, berths } = snapshot;
  const errorConflicts = conflicts.filter((c) => c.severity === 'error');
  const warningConflicts = conflicts.filter((c) => c.severity === 'warning');

  const originalIds = new Set(originalSchedules.map((s) => s.id));
  const currentIds = new Set(schedules.map((s) => s.id));

  const addedCount = schedules.filter((s) => !originalIds.has(s.id)).length;
  const deletedCount = originalSchedules.filter((s) => !currentIds.has(s.id)).length;

  let changedCount = 0;
  schedules.forEach((s) => {
    if (!originalIds.has(s.id)) return;
    const original = originalSchedules.find((o) => o.id === s.id);
    if (!original) return;
    if (
      original.berthId !== s.berthId ||
      new Date(original.eta).getTime() !== new Date(s.eta).getTime() ||
      new Date(original.etd).getTime() !== new Date(s.etd).getTime() ||
      original.status !== s.status ||
      original.operationTeam !== s.operationTeam
    ) {
      changedCount++;
    }
  });

  const totalHours = 24;
  let occupiedHours = 0;
  const now = Date.now();
  const dayStart = now;
  const dayEnd = now + 24 * 3600 * 1000;
  berths.forEach(() => {
    schedules.forEach((s) => {
      const start = Math.max(dayStart, new Date(s.eta).getTime());
      const end = Math.min(dayEnd, new Date(s.etd).getTime());
      if (end > start) {
        occupiedHours += (end - start) / 3600000;
      }
    });
  });
  const totalPossible = berths.length * totalHours || 1;
  const berthUtilization = Math.min(100, Math.round((occupiedHours / totalPossible) * 100));

  const currentTime = new Date();
  const waitingShips = schedules.filter(
    (s) => s.status === 'anchored' || s.status === 'approaching',
  );
  let totalMinutes = 0;
  let waitCount = 0;
  waitingShips.forEach((s) => {
    const eta = new Date(s.eta);
    if (eta < currentTime) {
      totalMinutes += (currentTime.getTime() - eta.getTime()) / 60000;
      waitCount++;
    }
  });
  const avgWaitingMinutes = waitCount > 0 ? Math.round(totalMinutes / waitCount) : 0;

  return {
    totalShips: ships.length,
    totalBerths: berths.length,
    totalSchedules: schedules.length,
    conflictCount: errorConflicts.length,
    warningCount: warningConflicts.length,
    changedScheduleCount: changedCount,
    addedScheduleCount: addedCount,
    deletedScheduleCount: deletedCount,
    berthUtilization,
    avgWaitingMinutes,
  };
}

const mockScenarios: Scenario[] = [];

export const useScenarioStore = defineStore('scenario', () => {
  const scenarios = ref<Scenario[]>(mockScenarios);
  const currentScenarioId = ref<string | null>(null);
  const { detectAllConflicts } = useConflictDetection();

  const currentScenario = computed(() =>
    scenarios.value.find((s) => s.id === currentScenarioId.value) || null,
  );

  const activeScenarios = computed(() =>
    scenarios.value.filter((s) => s.status !== 'cancelled'),
  );

  const draftScenarios = computed(() =>
    scenarios.value.filter((s) => s.status === 'draft'),
  );

  const appliedScenarios = computed(() =>
    scenarios.value.filter((s) => s.status === 'applied'),
  );

  function createSnapshotFromScheduleStore(): ScenarioShipSnapshot {
    const scheduleStore = useScheduleStore();
    return {
      ships: deepClone(scheduleStore.ships),
      berths: deepClone(scheduleStore.berths),
      schedules: deepClone(scheduleStore.schedules),
      tides: deepClone(scheduleStore.tides),
      logs: deepClone(scheduleStore.logs),
      conflicts: deepClone(scheduleStore.conflicts),
      maintenancePeriods: deepClone(scheduleStore.maintenancePeriods),
    };
  }

  function createScenario(data: {
    name: string;
    description?: string;
    involvedShipIds?: string[];
    involvedBerthIds?: string[];
    sourceScenarioId?: string;
  }): Scenario {
    const authStore = useAuthStore();
    const scheduleStore = useScheduleStore();

    let snapshot: ScenarioShipSnapshot;
    let sourceScenarioName: string | undefined;

    if (data.sourceScenarioId) {
      const sourceScenario = scenarios.value.find((s) => s.id === data.sourceScenarioId);
      if (sourceScenario) {
        snapshot = deepClone(sourceScenario.snapshot);
        sourceScenarioName = sourceScenario.name;
      } else {
        snapshot = createSnapshotFromScheduleStore();
      }
    } else {
      snapshot = createSnapshotFromScheduleStore();
    }

    const conflicts = detectAllConflicts(
      snapshot.schedules,
      snapshot.ships,
      snapshot.berths,
      snapshot.tides,
      snapshot.maintenancePeriods,
    );
    snapshot.conflicts = conflicts;

    const involvedShipIds = data.involvedShipIds?.length
      ? data.involvedShipIds
      : snapshot.schedules.map((s) => s.shipId);
    const involvedBerthIds = data.involvedBerthIds?.length
      ? data.involvedBerthIds
      : snapshot.berths.map((b) => b.id);

    const newId = `scenario-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date();

    const resultSummary = generateScenarioSummary(snapshot, scheduleStore.schedules);

    const scenario: Scenario = {
      id: newId,
      name: data.name,
      description: data.description,
      creator: authStore.currentUser?.displayName || '系统',
      creatorId: authStore.currentUser?.id,
      baseTime: now,
      sourceScenarioId: data.sourceScenarioId,
      sourceScenarioName,
      status: 'draft',
      involvedShipIds: [...new Set(involvedShipIds)],
      involvedBerthIds: [...new Set(involvedBerthIds)],
      snapshot,
      resultSummary,
      createdAt: now,
      updatedAt: now,
    };

    scenarios.value.unshift(scenario);
    return scenario;
  }

  function updateScenario(id: string, updates: Partial<Scenario>) {
    const scenario = scenarios.value.find((s) => s.id === id);
    if (!scenario) return;
    Object.assign(scenario, updates, { updatedAt: new Date() });
  }

  function updateScenarioSnapshot(id: string) {
    const scenario = scenarios.value.find((s) => s.id === id);
    if (!scenario) return;

    const conflicts = detectAllConflicts(
      scenario.snapshot.schedules,
      scenario.snapshot.ships,
      scenario.snapshot.berths,
      scenario.snapshot.tides,
      scenario.snapshot.maintenancePeriods,
    );
    scenario.snapshot.conflicts = conflicts;

    const scheduleStore = useScheduleStore();
    scenario.resultSummary = generateScenarioSummary(
      scenario.snapshot,
      scheduleStore.schedules,
    );
    scenario.updatedAt = new Date();
  }

  function setCurrentScenario(id: string | null) {
    currentScenarioId.value = id;
  }

  function deleteScenario(id: string) {
    const idx = scenarios.value.findIndex((s) => s.id === id);
    if (idx === -1) return;
    scenarios.value.splice(idx, 1);
    if (currentScenarioId.value === id) {
      currentScenarioId.value = null;
    }
  }

  function cancelScenario(id: string) {
    const scenario = scenarios.value.find((s) => s.id === id);
    if (!scenario) return;
    scenario.status = 'cancelled';
    scenario.updatedAt = new Date();
  }

  function completeScenario(id: string) {
    const scenario = scenarios.value.find((s) => s.id === id);
    if (!scenario) return;
    updateScenarioSnapshot(id);
    scenario.status = 'completed';
    scenario.updatedAt = new Date();
  }

  function applyScenario(id: string): { success: boolean; reason?: string } {
    const scenario = scenarios.value.find((s) => s.id === id);
    if (!scenario) {
      return { success: false, reason: '推演场景不存在' };
    }
    if (scenario.status === 'applied') {
      return { success: false, reason: '该推演场景已应用' };
    }

    const scheduleStore = useScheduleStore();
    const authStore = useAuthStore();

    const { ships, berths, schedules, tides, logs, conflicts, maintenancePeriods } = scenario.snapshot;

    scheduleStore.ships = deepClone(ships);
    scheduleStore.berths = deepClone(berths);
    scheduleStore.schedules = deepClone(schedules);
    scheduleStore.tides = deepClone(tides);
    scheduleStore.conflicts = deepClone(conflicts);
    scheduleStore.maintenancePeriods = deepClone(maintenancePeriods);

    const applyLog: ScheduleLog = {
      id: `log-apply-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date(),
      operator: authStore.currentUser?.displayName || '系统',
      type: 'update',
      description: `应用推演场景「${scenario.name}」到正式计划`,
      before: {},
      after: { scenarioId: id, scenarioName: scenario.name },
    };
    scheduleStore.logs.unshift(applyLog);

    logs.forEach((log) => {
      if (log.type === 'update' || log.type === 'create' || log.type === 'delete' || log.type === 'status_change') {
        const exists = scheduleStore.logs.some((l) => l.id === log.id);
        if (!exists) {
          scheduleStore.logs.push(deepClone(log));
        }
      }
    });

    scheduleStore.logs.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    scenario.status = 'applied';
    scenario.appliedAt = new Date();
    scenario.appliedBy = authStore.currentUser?.displayName || '系统';
    scenario.updatedAt = new Date();

    return { success: true };
  }

  function filterScenarios(options?: {
    keyword?: string;
    status?: ScenarioStatus | 'all';
    creator?: string;
    startDate?: Date;
    endDate?: Date;
  }): Scenario[] {
    let result = [...scenarios.value];

    if (options?.keyword) {
      const kw = options.keyword.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(kw) ||
          s.description?.toLowerCase().includes(kw) ||
          s.creator.toLowerCase().includes(kw),
      );
    }

    if (options?.status && options.status !== 'all') {
      result = result.filter((s) => s.status === options.status);
    }

    if (options?.creator) {
      result = result.filter((s) => s.creator === options.creator);
    }

    if (options?.startDate) {
      result = result.filter((s) => new Date(s.createdAt) >= options.startDate!);
    }

    if (options?.endDate) {
      const end = new Date(options.endDate);
      end.setHours(23, 59, 59, 999);
      result = result.filter((s) => new Date(s.createdAt) <= end);
    }

    return result.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  function getScenarioById(id: string): Scenario | undefined {
    return scenarios.value.find((s) => s.id === id);
  }

  function addScenarioLog(scenarioId: string, log: Partial<ScheduleLog>) {
    const scenario = scenarios.value.find((s) => s.id === scenarioId);
    if (!scenario) return;

    let berthId = log.berthId;
    if (!berthId && log.scheduleId) {
      const schedule = scenario.snapshot.schedules.find((s) => s.id === log.scheduleId);
      if (schedule) {
        berthId = schedule.berthId;
      }
    }

    const newLog: ScheduleLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date(),
      operator: scenario.creator,
      type: log.type || 'update',
      description: log.description || '',
      scheduleId: log.scheduleId,
      shipId: log.shipId,
      berthId,
      before: log.before,
      after: log.after,
    };
    scenario.snapshot.logs.unshift(newLog);
    scenario.updatedAt = new Date();
  }

  function updateScenarioSchedule(
    scenarioId: string,
    scheduleId: string,
    updates: Partial<BerthSchedule>,
  ) {
    const scenario = scenarios.value.find((s) => s.id === scenarioId);
    if (!scenario) return;

    const schedule = scenario.snapshot.schedules.find((s) => s.id === scheduleId);
    if (!schedule) return;

    const beforeFull = { ...schedule } as unknown as Record<string, unknown>;
    const afterFull = { ...updates } as unknown as Record<string, unknown>;
    const changedBefore: Record<string, unknown> = {};
    const changedAfter: Record<string, unknown> = {};
    for (const key of Object.keys(afterFull)) {
      if (JSON.stringify(beforeFull[key]) !== JSON.stringify(afterFull[key])) {
        changedBefore[key] = beforeFull[key];
        changedAfter[key] = afterFull[key];
      }
    }

    Object.assign(schedule, updates);

    if (Object.keys(changedBefore).length > 0) {
      addScenarioLog(scenarioId, {
        type: 'update',
        scheduleId,
        shipId: schedule.shipId,
        description: `更新调度计划 ${scheduleId}`,
        before: changedBefore,
        after: changedAfter,
      });
    }

    updateScenarioSnapshot(scenarioId);
  }

  function createScenarioSchedule(
    scenarioId: string,
    data: Omit<BerthSchedule, 'id'>,
  ): BerthSchedule | null {
    const scenario = scenarios.value.find((s) => s.id === scenarioId);
    if (!scenario) return null;

    const newId = `sched-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newSchedule: BerthSchedule = {
      ...data,
      id: newId,
    };
    scenario.snapshot.schedules.push(newSchedule);

    addScenarioLog(scenarioId, {
      type: 'create',
      scheduleId: newId,
      shipId: data.shipId,
      description: `新增调度计划 ${newId}`,
      after: { ...newSchedule } as unknown as Record<string, unknown>,
    });

    updateScenarioSnapshot(scenarioId);
    return newSchedule;
  }

  function deleteScenarioSchedule(scenarioId: string, scheduleId: string) {
    const scenario = scenarios.value.find((s) => s.id === scenarioId);
    if (!scenario) return;

    const idx = scenario.snapshot.schedules.findIndex((s) => s.id === scheduleId);
    if (idx === -1) return;

    const schedule = scenario.snapshot.schedules[idx];
    const before = { ...schedule };

    scenario.snapshot.schedules.splice(idx, 1);

    addScenarioLog(scenarioId, {
      type: 'delete',
      scheduleId,
      shipId: schedule.shipId,
      description: `删除调度计划 ${scheduleId}`,
      before: before as unknown as Record<string, unknown>,
    });

    updateScenarioSnapshot(scenarioId);
  }

  return {
    scenarios,
    currentScenarioId,
    currentScenario,
    activeScenarios,
    draftScenarios,
    appliedScenarios,
    createScenario,
    updateScenario,
    updateScenarioSnapshot,
    setCurrentScenario,
    deleteScenario,
    cancelScenario,
    completeScenario,
    applyScenario,
    filterScenarios,
    getScenarioById,
    addScenarioLog,
    updateScenarioSchedule,
    createScenarioSchedule,
    deleteScenarioSchedule,
    createSnapshotFromScheduleStore,
  };
});
