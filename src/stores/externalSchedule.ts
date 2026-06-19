import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
  ExternalVesselSchedule,
  ExternalImportRecord,
  ExternalSyncLog,
  ExternalSyncStatus,
  ExternalDataSource,
  Ship,
  BerthSchedule,
} from '../types';
import {
  mockExternalSchedules,
  mockImportRecords,
  mockExternalSyncLogs,
} from '../data/mock';
import { useScheduleStore } from './schedule';
import { useAuthStore } from './auth';
import { usePermissionStore } from './permission';

export const useExternalScheduleStore = defineStore('externalSchedule', () => {
  const externalSchedules = ref<ExternalVesselSchedule[]>(mockExternalSchedules);
  const importRecords = ref<ExternalImportRecord[]>(mockImportRecords);
  const syncLogs = ref<ExternalSyncLog[]>(mockExternalSyncLogs);
  const selectedExternalId = ref<string | null>(null);

  function recordAudit(
    action: 'schedule_write' | 'conflict_resolve' | 'log_export',
    targetId: string,
    description: string,
    before: Record<string, unknown> | null = null,
    after: Record<string, unknown> | null = null,
  ) {
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

  const selectedExternalSchedule = computed(() =>
    externalSchedules.value.find((s) => s.id === selectedExternalId.value) || null,
  );

  const pendingCount = computed(() =>
    externalSchedules.value.filter((s) => s.syncStatus === 'pending').length,
  );

  const unmatchedCount = computed(() =>
    externalSchedules.value.filter((s) => s.syncStatus === 'unmatched').length,
  );

  const conflictCount = computed(() =>
    externalSchedules.value.filter((s) => s.syncStatus === 'conflict').length,
  );

  const syncedCount = computed(() =>
    externalSchedules.value.filter((s) => s.syncStatus === 'synced').length,
  );

  const failedCount = computed(() =>
    externalSchedules.value.filter((s) => s.syncStatus === 'failed').length,
  );

  const matchedCount = computed(() =>
    externalSchedules.value.filter((s) => s.syncStatus === 'matched').length,
  );

  const pendingOrConflictCount = computed(() =>
    externalSchedules.value.filter(
      (s) => s.syncStatus === 'pending' || s.syncStatus === 'conflict' || s.syncStatus === 'matched',
    ).length,
  );

  function getExternalById(id: string) {
    return externalSchedules.value.find((s) => s.id === id);
  }

  function getImportRecordById(id: string) {
    return importRecords.value.find((r) => r.id === id);
  }

  function getSyncLogsByExternalId(externalId: string) {
    return syncLogs.value
      .filter((l) => l.externalScheduleId === externalId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  function getExternalSchedulesByBatch(batchId: string) {
    return externalSchedules.value.filter((s) => s.importBatchId === batchId);
  }

  function addSyncLog(
    externalScheduleId: string,
    action: ExternalSyncLog['action'],
    description: string,
    before?: Record<string, unknown>,
    after?: Record<string, unknown>,
  ) {
    const authStore = useAuthStore();
    const operator = authStore.currentUser?.displayName || '系统';

    const newLog: ExternalSyncLog = {
      id: `eslog-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      externalScheduleId,
      action,
      timestamp: new Date(),
      operator,
      description,
      before,
      after,
    };
    syncLogs.value.unshift(newLog);
  }

  function matchExternalSchedule(externalId: string, shipId: string) {
    const scheduleStore = useScheduleStore();
    const external = externalSchedules.value.find((s) => s.id === externalId);
    if (!external) return null;

    const ship = scheduleStore.getShipById(shipId);
    if (!ship) return null;

    const before = { ...external };

    external.matchedShipId = shipId;
    external.matchedShipName = ship.name;
    external.syncStatus = 'matched';
    external.updatedAt = new Date();

    addSyncLog(
      externalId,
      'match',
      `手动匹配到船舶：${ship.name} (${shipId})`,
      before as unknown as Record<string, unknown>,
      { matchedShipId: shipId, matchedShipName: ship.name, syncStatus: 'matched' },
    );

    return external;
  }

  function confirmAndSync(externalId: string) {
    const scheduleStore = useScheduleStore();
    const external = externalSchedules.value.find((s) => s.id === externalId);
    if (!external || !external.matchedShipId) return null;

    const existingSchedule = scheduleStore.schedules.find(
      (s) => s.shipId === external.matchedShipId,
    );

    const before = { ...external };

    if (existingSchedule) {
      const updates: Partial<BerthSchedule> = {};
      const changeFields: string[] = [];

      if (external.eta && new Date(existingSchedule.eta).getTime() !== new Date(external.eta).getTime()) {
        updates.eta = external.eta;
        changeFields.push('ETA');
      }
      if (external.etd && new Date(existingSchedule.etd).getTime() !== new Date(external.etd).getTime()) {
        updates.etd = external.etd;
        changeFields.push('ETD');
      }

      if (changeFields.length > 0) {
        scheduleStore.updateSchedule(existingSchedule.id, updates);
      }
    } else if (external.eta && external.etd) {
      const berthId = findSuitableBerth(external);
      const newSchedule = scheduleStore.createSchedule({
        shipId: external.matchedShipId,
        berthId,
        eta: external.eta,
        etd: external.etd,
        status: 'anchored',
        operationProgress: 0,
        progressMode: 'percentage',
        source: 'api',
        estimatedDuration: Math.round(
          (new Date(external.etd).getTime() - new Date(external.eta).getTime()) / 3600000,
        ),
        delayThresholdMinutes: 30,
      });
    }

    external.syncStatus = 'synced';
    external.lastSyncTime = new Date();
    external.confirmedBy = useAuthStore().currentUser?.displayName || '系统';
    external.confirmedAt = new Date();
    external.updatedAt = new Date();
    external.errorReason = undefined;

    addSyncLog(
      externalId,
      'confirm',
      `人工确认并同步到调度计划`,
      before as unknown as Record<string, unknown>,
      { syncStatus: 'synced', confirmedBy: external.confirmedBy },
    );

    return external;
  }

  function findSuitableBerth(external: ExternalVesselSchedule): string {
    const scheduleStore = useScheduleStore();
    const suitableBerths = scheduleStore.sortedBerths.filter((b) => {
      if (external.cargoType && !b.allowedCargo.includes(external.cargoType)) return false;
      if (external.draft && b.maxDraft < external.draft) return false;
      if (external.shipLength && b.length < external.shipLength) return false;
      return true;
    });

    if (suitableBerths.length === 0) {
      return scheduleStore.sortedBerths[0]?.id || 'berth-01';
    }

    return suitableBerths[0].id;
  }

  function ignoreExternalSchedule(externalId: string) {
    const external = externalSchedules.value.find((s) => s.id === externalId);
    if (!external) return;

    const before = { ...external };

    external.syncStatus = 'ignored';
    external.updatedAt = new Date();

    addSyncLog(
      externalId,
      'ignore',
      `忽略该条外部船期记录`,
      before as unknown as Record<string, unknown>,
      { syncStatus: 'ignored' },
    );
  }

  function retrySync(externalId: string) {
    const external = externalSchedules.value.find((s) => s.id === externalId);
    if (!external) return;

    if (external.matchedShipId) {
      return confirmAndSync(externalId);
    }

    return null;
  }

  function autoMatchByIMO(externalId: string): Ship | null {
    const scheduleStore = useScheduleStore();
    const external = externalSchedules.value.find((s) => s.id === externalId);
    if (!external) return null;

    const matchedShip = scheduleStore.ships.find(
      (ship) => ship.imo === external.imo || ship.name === external.externalShipName,
    );

    if (matchedShip) {
      matchExternalSchedule(externalId, matchedShip.id);
      return matchedShip;
    }

    return null;
  }

  function batchSync(externalIds: string[]) {
    const results: { id: string; success: boolean; message: string }[] = [];

    externalIds.forEach((id) => {
      const external = externalSchedules.value.find((s) => s.id === id);
      if (!external) {
        results.push({ id, success: false, message: '记录不存在' });
        return;
      }

      if (external.syncStatus === 'matched' || external.syncStatus === 'conflict') {
        confirmAndSync(id);
        results.push({ id, success: true, message: '同步成功' });
      } else if (external.syncStatus === 'pending') {
        const matched = autoMatchByIMO(id);
        if (matched) {
          confirmAndSync(id);
          results.push({ id, success: true, message: '自动匹配并同步成功' });
        } else {
          results.push({ id, success: false, message: '无法自动匹配船舶' });
        }
      } else {
        results.push({ id, success: false, message: `当前状态(${external.syncStatus})不支持同步` });
      }
    });

    return results;
  }

  function importExternalData(
    sourceSystem: ExternalDataSource,
    schedules: Omit<ExternalVesselSchedule, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus'>[],
  ) {
    const authStore = useAuthStore();
    const operator = authStore.currentUser?.displayName || '系统';

    const batchId = `batch-${Date.now()}`;
    const batchNo = `IMP-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;

    let matchedCount = 0;
    let unmatchedCount = 0;
    let conflictCount = 0;
    let successCount = 0;
    let failedCount = 0;

    const scheduleStore = useScheduleStore();

    schedules.forEach((sched, index) => {
      const id = `ext-${Date.now()}-${index}`;
      const external: ExternalVesselSchedule = {
        ...sched,
        id,
        importBatchId: batchId,
        syncStatus: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const matchedShip = scheduleStore.ships.find(
        (ship) => ship.imo === external.imo || ship.name === external.externalShipName,
      );

      if (matchedShip) {
        external.matchedShipId = matchedShip.id;
        external.matchedShipName = matchedShip.name;

        const existingSchedule = scheduleStore.schedules.find(
          (s) => s.shipId === matchedShip.id,
        );

        if (existingSchedule && external.eta) {
          const timeDiff = Math.abs(
            new Date(existingSchedule.eta).getTime() - new Date(external.eta).getTime(),
          );
          if (timeDiff > 3600000) {
            external.syncStatus = 'conflict';
            external.errorReason = 'ETA时间存在差异，需人工确认';
            conflictCount++;
          } else {
            external.syncStatus = 'matched';
            matchedCount++;
          }
        } else {
          external.syncStatus = 'matched';
          matchedCount++;
        }
      } else {
        external.syncStatus = 'unmatched';
        external.errorReason = '未找到匹配船舶';
        unmatchedCount++;
      }

      successCount++;
      externalSchedules.value.unshift(external);
    });

    const importRecord: ExternalImportRecord = {
      id: batchId,
      batchNo,
      sourceSystem,
      totalCount: schedules.length,
      successCount,
      failedCount,
      matchedCount,
      unmatchedCount,
      conflictCount,
      importTime: new Date(),
      operator,
    };

    importRecords.value.unshift(importRecord);

    recordAudit(
      'schedule_write',
      batchId,
      `导入 ${schedules.length} 条外部船期数据`,
      null,
      { count: schedules.length, sourceSystem },
    );

    return { batchId, batchNo, successCount, failedCount, matchedCount, unmatchedCount, conflictCount };
  }

  function filterExternalSchedules(filters: {
    status?: ExternalSyncStatus | 'all';
    source?: ExternalDataSource | 'all';
    search?: string;
    dateStart?: Date | null;
    dateEnd?: Date | null;
  } = {}) {
    let result = [...externalSchedules.value];

    if (filters.status && filters.status !== 'all') {
      result = result.filter((s) => s.syncStatus === filters.status);
    }

    if (filters.source && filters.source !== 'all') {
      result = result.filter((s) => s.sourceSystem === filters.source);
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(
        (s) =>
          s.externalShipName.toLowerCase().includes(searchLower) ||
          s.imo.toLowerCase().includes(searchLower) ||
          s.externalId.toLowerCase().includes(searchLower) ||
          (s.matchedShipName && s.matchedShipName.toLowerCase().includes(searchLower)),
      );
    }

    if (filters.dateStart) {
      result = result.filter((s) => new Date(s.createdAt) >= filters.dateStart!);
    }

    if (filters.dateEnd) {
      const endOfDay = new Date(filters.dateEnd);
      endOfDay.setHours(23, 59, 59, 999);
      result = result.filter((s) => new Date(s.createdAt) <= endOfDay);
    }

    return result;
  }

  function setSelectedExternal(id: string | null) {
    selectedExternalId.value = id;
  }

  return {
    externalSchedules,
    importRecords,
    syncLogs,
    selectedExternalId,
    selectedExternalSchedule,
    pendingCount,
    unmatchedCount,
    conflictCount,
    syncedCount,
    failedCount,
    matchedCount,
    pendingOrConflictCount,
    getExternalById,
    getImportRecordById,
    getSyncLogsByExternalId,
    getExternalSchedulesByBatch,
    matchExternalSchedule,
    confirmAndSync,
    ignoreExternalSchedule,
    retrySync,
    autoMatchByIMO,
    batchSync,
    importExternalData,
    filterExternalSchedules,
    addSyncLog,
    setSelectedExternal,
  };
});
