import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
  Snapshot,
  SnapshotCreateMethod,
  SnapshotStatus,
  SnapshotData,
  SnapshotSummary,
  SnapshotNoteRecord,
  Ship,
  Berth,
  BerthSchedule,
  TideRecord,
  ScheduleLog,
  ScheduleConflict,
  BerthMaintenancePeriod,
  ShipPriority,
} from '../types';
import { useScheduleStore } from './schedule';
import { useAuthStore } from './auth';
import { SNAPSHOT_CREATE_METHOD_LABELS } from '../types';
import { format, subHours, subDays } from 'date-fns';

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

function generateSnapshotSummary(data: SnapshotData): SnapshotSummary {
  const { schedules, conflicts, ships, berths } = data;

  const shipsInPort = schedules.filter(
    (s) => s.status === 'berthing' || s.status === 'loading' || s.status === 'unloading',
  ).length;

  const shipsWaiting = schedules.filter(
    (s) => s.status === 'anchored' || s.status === 'approaching',
  ).length;

  const errorConflicts = conflicts.filter((c) => c.severity === 'error');
  const warningConflicts = conflicts.filter((c) => c.severity === 'warning');

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

  const keyPlanCount = schedules.filter((s) => {
    const ship = ships.find((sh) => sh.id === s.shipId);
    return ship && (ship.priority === 'critical' || ship.priority === 'high');
  }).length;

  return {
    shipsInPort,
    shipsWaiting,
    conflictCount: errorConflicts.length,
    warningCount: warningConflicts.length,
    berthUtilization,
    avgWaitingMinutes,
    totalSchedules: schedules.length,
    totalShips: ships.length,
    totalBerths: berths.length,
    keyPlanCount,
  };
}

function createSnapshotDataFromScheduleStore(): SnapshotData {
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

function createMockSnapshot(options: {
  id: string;
  name: string;
  description?: string;
  snapshotTime: Date;
  createMethod: SnapshotCreateMethod;
  creator: string;
  status: SnapshotStatus;
  data: SnapshotData;
  notes?: SnapshotNoteRecord[];
  reviewConclusion?: string;
  reviewedBy?: string;
  reviewedAt?: Date;
  tags?: string[];
}): Snapshot {
  const summary = generateSnapshotSummary(options.data);
  return {
    id: options.id,
    name: options.name,
    description: options.description,
    snapshotTime: options.snapshotTime,
    createMethod: options.createMethod,
    creator: options.creator,
    status: options.status,
    summary,
    data: options.data,
    notes: options.notes || [],
    reviewConclusion: options.reviewConclusion,
    reviewedBy: options.reviewedBy,
    reviewedAt: options.reviewedAt,
    tags: options.tags,
    createdAt: options.snapshotTime,
    updatedAt: options.snapshotTime,
  };
}

function generateMockSnapshots(): Snapshot[] {
  const scheduleStore = useScheduleStore();
  const now = new Date();

  const baseData = createSnapshotDataFromScheduleStore();

  const data1 = deepClone(baseData);
  const snapshot1 = createMockSnapshot({
    id: 'snapshot-001',
    name: '早班交接快照',
    description: '早班08:00交接时的完整盘面状态',
    snapshotTime: subHours(now, 4),
    createMethod: 'handover',
    creator: '张调度',
    status: 'active',
    data: data1,
    tags: ['交接', '早班'],
    notes: [
      {
        id: 'note-001',
        snapshotId: 'snapshot-001',
        content: '交接时一切正常，无重大冲突',
        author: '张调度',
        timestamp: subHours(now, 4),
        type: 'comment',
      },
    ],
  });

  const data2 = deepClone(baseData);
  if (data2.schedules.length > 0) {
    data2.schedules[0].status = 'departed';
    data2.conflicts = data2.conflicts.slice(0, Math.max(0, data2.conflicts.length - 1));
  }
  const snapshot2 = createMockSnapshot({
    id: 'snapshot-002',
    name: '午后巡检快照',
    description: '14:00 例行巡检时保存的盘面',
    snapshotTime: subHours(now, 2),
    createMethod: 'auto',
    creator: '系统',
    status: 'active',
    data: data2,
    tags: ['巡检', '定时'],
  });

  const data3 = deepClone(baseData);
  const snapshot3 = createMockSnapshot({
    id: 'snapshot-003',
    name: '异常事件快照 - 3#泊位冲突',
    description: '3#泊位发生作业冲突时自动保存的快照',
    snapshotTime: subHours(now, 6),
    createMethod: 'incident',
    creator: '系统',
    status: 'active',
    data: data3,
    tags: ['异常', '冲突', '3#泊位'],
    reviewConclusion: '经复盘，冲突原因为作业时间预估不足，已调整后续计划。建议优化ETA估算模型。',
    reviewedBy: '李调度长',
    reviewedAt: subHours(now, 3),
    notes: [
      {
        id: 'note-002',
        snapshotId: 'snapshot-003',
        content: '发现3#泊位有两条作业计划重叠',
        author: '王调度',
        timestamp: subHours(now, 6),
        type: 'comment',
      },
      {
        id: 'note-003',
        snapshotId: 'snapshot-003',
        content: '后续行动：优化ETA算法，增加缓冲时间',
        author: '李调度长',
        timestamp: subHours(now, 5),
        type: 'action_item',
      },
    ],
  });

  const data4 = deepClone(baseData);
  const snapshot4 = createMockSnapshot({
    id: 'snapshot-004',
    name: '昨日晚班快照',
    description: '2024-01-15 晚班交接',
    snapshotTime: subDays(now, 1),
    createMethod: 'handover',
    creator: '刘调度',
    status: 'archived',
    data: data4,
    tags: ['交接', '晚班', '归档'],
  });

  const data5 = deepClone(baseData);
  if (data5.schedules.length > 2) {
    data5.schedules = data5.schedules.slice(0, -2);
  }
  const snapshot5 = createMockSnapshot({
    id: 'snapshot-005',
    name: '推演应用快照 - 新船进港方案',
    description: '推演场景"新船进港方案"应用前的快照',
    snapshotTime: subDays(now, 2),
    createMethod: 'scenario_apply',
    creator: '陈调度',
    status: 'active',
    data: data5,
    tags: ['推演', '方案对比'],
  });

  return [snapshot1, snapshot2, snapshot3, snapshot4, snapshot5];
}

export const useSnapshotStore = defineStore('snapshot', () => {
  const snapshots = ref<Snapshot[]>([]);
  const selectedSnapshotId = ref<string | null>(null);
  let initialized = false;

  function ensureInitialized() {
    if (initialized) return;
    try {
      const mockData = generateMockSnapshots();
      snapshots.value = mockData;
    } catch (e) {
      snapshots.value = [];
    }
    initialized = true;
  }

  const selectedSnapshot = computed(() =>
    snapshots.value.find((s) => s.id === selectedSnapshotId.value) || null,
  );

  const activeSnapshots = computed(() => {
    ensureInitialized();
    return snapshots.value.filter((s) => s.status === 'active');
  });

  const archivedSnapshots = computed(() => {
    ensureInitialized();
    return snapshots.value.filter((s) => s.status === 'archived');
  });

  const totalCount = computed(() => {
    ensureInitialized();
    return snapshots.value.length;
  });

  function createSnapshot(options: {
    name?: string;
    description?: string;
    createMethod?: SnapshotCreateMethod;
    tags?: string[];
    relatedIncidentId?: string;
    relatedIncidentTitle?: string;
    relatedScenarioId?: string;
    relatedScenarioName?: string;
    relatedHandoverId?: string;
  } = {}): Snapshot {
    const authStore = useAuthStore();
    const scheduleStore = useScheduleStore();

    const data = createSnapshotDataFromScheduleStore();
    const summary = generateSnapshotSummary(data);

    const now = new Date();
    const createMethod = options.createMethod || 'manual';
    const defaultName = `${format(now, 'yyyy-MM-dd HH:mm')} ${SNAPSHOT_CREATE_METHOD_LABELS[createMethod]}快照`;

    const newSnapshot: Snapshot = {
      id: `snapshot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: options.name || defaultName,
      description: options.description,
      snapshotTime: now,
      createMethod,
      creator: authStore.currentUser?.displayName || scheduleStore.currentOperator,
      creatorId: authStore.currentUser?.id,
      status: 'active',
      summary,
      data,
      notes: [],
      tags: options.tags || [],
      relatedIncidentId: options.relatedIncidentId,
      relatedIncidentTitle: options.relatedIncidentTitle,
      relatedScenarioId: options.relatedScenarioId,
      relatedScenarioName: options.relatedScenarioName,
      relatedHandoverId: options.relatedHandoverId,
      createdAt: now,
      updatedAt: now,
    };

    snapshots.value.unshift(newSnapshot);
    return newSnapshot;
  }

  function getSnapshotById(id: string): Snapshot | undefined {
    ensureInitialized();
    return snapshots.value.find((s) => s.id === id);
  }

  function updateSnapshot(id: string, updates: Partial<Snapshot>) {
    ensureInitialized();
    const snapshot = snapshots.value.find((s) => s.id === id);
    if (!snapshot) return;
    Object.assign(snapshot, updates, { updatedAt: new Date() });
  }

  function deleteSnapshot(id: string) {
    ensureInitialized();
    const idx = snapshots.value.findIndex((s) => s.id === id);
    if (idx === -1) return;
    snapshots.value.splice(idx, 1);
    if (selectedSnapshotId.value === id) {
      selectedSnapshotId.value = null;
    }
  }

  function archiveSnapshot(id: string) {
    ensureInitialized();
    const snapshot = snapshots.value.find((s) => s.id === id);
    if (!snapshot) return;
    snapshot.status = 'archived';
    snapshot.updatedAt = new Date();
  }

  function unarchiveSnapshot(id: string) {
    ensureInitialized();
    const snapshot = snapshots.value.find((s) => s.id === id);
    if (!snapshot) return;
    snapshot.status = 'active';
    snapshot.updatedAt = new Date();
  }

  function setSelectedSnapshot(id: string | null) {
    selectedSnapshotId.value = id;
  }

  function addNote(snapshotId: string, content: string, type: SnapshotNoteRecord['type'] = 'comment'): SnapshotNoteRecord | null {
    ensureInitialized();
    const snapshot = snapshots.value.find((s) => s.id === snapshotId);
    if (!snapshot) return null;

    const authStore = useAuthStore();
    const scheduleStore = useScheduleStore();

    const note: SnapshotNoteRecord = {
      id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      snapshotId,
      content,
      author: authStore.currentUser?.displayName || scheduleStore.currentOperator,
      authorId: authStore.currentUser?.id,
      timestamp: new Date(),
      type,
    };

    snapshot.notes.push(note);
    snapshot.updatedAt = new Date();
    return note;
  }

  function deleteNote(snapshotId: string, noteId: string) {
    ensureInitialized();
    const snapshot = snapshots.value.find((s) => s.id === snapshotId);
    if (!snapshot) return;

    const idx = snapshot.notes.findIndex((n) => n.id === noteId);
    if (idx === -1) return;

    snapshot.notes.splice(idx, 1);
    snapshot.updatedAt = new Date();
  }

  function setReviewConclusion(snapshotId: string, conclusion: string) {
    ensureInitialized();
    const snapshot = snapshots.value.find((s) => s.id === snapshotId);
    if (!snapshot) return;

    const authStore = useAuthStore();
    const scheduleStore = useScheduleStore();

    snapshot.reviewConclusion = conclusion;
    snapshot.reviewedBy = authStore.currentUser?.displayName || scheduleStore.currentOperator;
    snapshot.reviewedAt = new Date();
    snapshot.updatedAt = new Date();

    addNote(snapshotId, `复盘结论已更新：${conclusion}`, 'conclusion');
  }

  function filterSnapshots(options?: {
    keyword?: string;
    status?: SnapshotStatus | 'all';
    createMethod?: SnapshotCreateMethod | 'all';
    creator?: string;
    startDate?: Date;
    endDate?: Date;
    tags?: string[];
  }): Snapshot[] {
    ensureInitialized();
    let result = [...snapshots.value];

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

    if (options?.createMethod && options.createMethod !== 'all') {
      result = result.filter((s) => s.createMethod === options.createMethod);
    }

    if (options?.creator) {
      result = result.filter((s) => s.creator === options.creator);
    }

    if (options?.startDate) {
      result = result.filter((s) => new Date(s.snapshotTime) >= options.startDate!);
    }

    if (options?.endDate) {
      const end = new Date(options.endDate);
      end.setHours(23, 59, 59, 999);
      result = result.filter((s) => new Date(s.snapshotTime) <= end);
    }

    if (options?.tags && options.tags.length > 0) {
      result = result.filter((s) =>
        options!.tags!.some((t) => s.tags?.includes(t)),
      );
    }

    return result.sort(
      (a, b) => new Date(b.snapshotTime).getTime() - new Date(a.snapshotTime).getTime(),
    );
  }

  function getMethodIcon(method: SnapshotCreateMethod): string {
    const iconMap: Record<SnapshotCreateMethod, string> = {
      manual: 'camera',
      auto: 'clock',
      handover: 'handshake',
      incident: 'alert-triangle',
      approval: 'check-circle',
      scenario_apply: 'play',
    };
    return iconMap[method];
  }

  function getMethodColor(method: SnapshotCreateMethod): string {
    const colorMap: Record<SnapshotCreateMethod, string> = {
      manual: 'text-harbor-cyan',
      auto: 'text-harbor-blue',
      handover: 'text-harbor-purple',
      incident: 'text-harbor-red',
      approval: 'text-harbor-green',
      scenario_apply: 'text-harbor-orange',
    };
    return colorMap[method];
  }

  function getMethodBgClass(method: SnapshotCreateMethod): string {
    const bgMap: Record<SnapshotCreateMethod, string> = {
      manual: 'bg-harbor-cyan/15 border-harbor-cyan/30',
      auto: 'bg-harbor-blue/15 border-harbor-blue/30',
      handover: 'bg-harbor-purple/15 border-harbor-purple/30',
      incident: 'bg-harbor-red/15 border-harbor-red/30',
      approval: 'bg-harbor-green/15 border-harbor-green/30',
      scenario_apply: 'bg-harbor-orange/15 border-harbor-orange/30',
    };
    return bgMap[method];
  }

  function compareSnapshots(
    snapshotIdA: string,
    snapshotIdB: string,
  ): {
    summaryA: SnapshotSummary;
    summaryB: SnapshotSummary;
    diffs: Record<string, number>;
    addedSchedules: BerthSchedule[];
    removedSchedules: BerthSchedule[];
    changedSchedules: { id: string; changes: string[] }[];
    addedConflicts: ScheduleConflict[];
    removedConflicts: ScheduleConflict[];
  } | null {
    ensureInitialized();
    const snapshotA = getSnapshotById(snapshotIdA);
    const snapshotB = getSnapshotById(snapshotIdB);
    if (!snapshotA || !snapshotB) return null;

    const summaryA = snapshotA.summary;
    const summaryB = snapshotB.summary;

    const diffs: Record<string, number> = {
      shipsInPort: summaryB.shipsInPort - summaryA.shipsInPort,
      shipsWaiting: summaryB.shipsWaiting - summaryA.shipsWaiting,
      conflictCount: summaryB.conflictCount - summaryA.conflictCount,
      warningCount: summaryB.warningCount - summaryA.warningCount,
      berthUtilization: summaryB.berthUtilization - summaryA.berthUtilization,
      avgWaitingMinutes: summaryB.avgWaitingMinutes - summaryA.avgWaitingMinutes,
      totalSchedules: summaryB.totalSchedules - summaryA.totalSchedules,
      keyPlanCount: summaryB.keyPlanCount - summaryA.keyPlanCount,
    };

    const schedulesA = new Map(snapshotA.data.schedules.map((s) => [s.id, s]));
    const schedulesB = new Map(snapshotB.data.schedules.map((s) => [s.id, s]));

    const addedSchedules: BerthSchedule[] = [];
    const removedSchedules: BerthSchedule[] = [];
    const changedSchedules: { id: string; changes: string[] }[] = [];

    schedulesB.forEach((schedB, id) => {
      if (!schedulesA.has(id)) {
        addedSchedules.push(schedB);
      }
    });

    schedulesA.forEach((schedA, id) => {
      if (!schedulesB.has(id)) {
        removedSchedules.push(schedA);
      }
    });

    schedulesB.forEach((schedB, id) => {
      const schedA = schedulesA.get(id);
      if (!schedA) return;

      const changes: string[] = [];
      if (schedA.berthId !== schedB.berthId) changes.push('泊位变更');
      if (new Date(schedA.eta).getTime() !== new Date(schedB.eta).getTime()) changes.push('到港时间变更');
      if (new Date(schedA.etd).getTime() !== new Date(schedB.etd).getTime()) changes.push('离港时间变更');
      if (schedA.status !== schedB.status) changes.push('状态变更');
      if (schedA.operationProgress !== schedB.operationProgress) changes.push('作业进度变更');
      if (schedA.operationTeam !== schedB.operationTeam) changes.push('作业班组变更');

      if (changes.length > 0) {
        changedSchedules.push({ id, changes });
      }
    });

    const conflictsA = new Map(snapshotA.data.conflicts.map((c) => [c.id, c]));
    const conflictsB = new Map(snapshotB.data.conflicts.map((c) => [c.id, c]));

    const addedConflicts: ScheduleConflict[] = [];
    const removedConflicts: ScheduleConflict[] = [];

    conflictsB.forEach((conflict, id) => {
      if (!conflictsA.has(id)) addedConflicts.push(conflict);
    });

    conflictsA.forEach((conflict, id) => {
      if (!conflictsB.has(id)) removedConflicts.push(conflict);
    });

    return {
      summaryA,
      summaryB,
      diffs,
      addedSchedules,
      removedSchedules,
      changedSchedules,
      addedConflicts,
      removedConflicts,
    };
  }

  function getKeyShipsFromSnapshot(snapshotId: string): { shipId: string; shipName: string; priority: ShipPriority; berthName?: string; status: string }[] {
    ensureInitialized();
    const snapshot = getSnapshotById(snapshotId);
    if (!snapshot) return [];

    const { ships, schedules, berths } = snapshot.data;
    return schedules
      .filter((s) => {
        const ship = ships.find((sh) => sh.id === s.shipId);
        return ship && (ship.priority === 'critical' || ship.priority === 'high');
      })
      .map((s) => {
        const ship = ships.find((sh) => sh.id === s.shipId)!;
        const berth = berths.find((b) => b.id === s.berthId);
        return {
          shipId: s.shipId,
          shipName: ship.name,
          priority: ship.priority,
          berthName: berth?.name,
          status: s.status,
        };
      });
  }

  return {
    snapshots,
    selectedSnapshotId,
    selectedSnapshot,
    activeSnapshots,
    archivedSnapshots,
    totalCount,
    createSnapshot,
    getSnapshotById,
    updateSnapshot,
    deleteSnapshot,
    archiveSnapshot,
    unarchiveSnapshot,
    setSelectedSnapshot,
    addNote,
    deleteNote,
    setReviewConclusion,
    filterSnapshots,
    getMethodIcon,
    getMethodColor,
    getMethodBgClass,
    compareSnapshots,
    getKeyShipsFromSnapshot,
  };
});
