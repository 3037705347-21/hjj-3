import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
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

function formatDate(date?: Date | string): string {
  if (!date) return '-';
  return format(new Date(date), 'MM-dd HH:mm', { locale: zhCN });
}

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

  function syncToSchedule(externalId: string, isAuto = false) {
    const scheduleStore = useScheduleStore();
    const external = externalSchedules.value.find((s) => s.id === externalId);
    if (!external || !external.matchedShipId) return null;

    const existingSchedule = scheduleStore.schedules.find(
      (s) => s.shipId === external.matchedShipId,
    );

    const before = { ...external };
    const ship = scheduleStore.getShipById(external.matchedShipId);
    const shipName = ship?.name || external.matchedShipName || external.externalShipName;
    let syncedScheduleId: string | null = null;
    const changeDetails: string[] = [];

    if (existingSchedule) {
      const updates: Partial<BerthSchedule> = {};
      const changeFields: string[] = [];
      const beforeFields: Record<string, unknown> = {};
      const afterFields: Record<string, unknown> = {};

      if (external.eta && new Date(existingSchedule.eta).getTime() !== new Date(external.eta).getTime()) {
        updates.eta = external.eta;
        changeFields.push('ETA');
        beforeFields.eta = existingSchedule.eta;
        afterFields.eta = external.eta;
        changeDetails.push(`ETA: ${formatDate(existingSchedule.eta)} → ${formatDate(external.eta)}`);
      }
      if (external.etd && new Date(existingSchedule.etd).getTime() !== new Date(external.etd).getTime()) {
        updates.etd = external.etd;
        changeFields.push('ETD');
        beforeFields.etd = existingSchedule.etd;
        afterFields.etd = external.etd;
        changeDetails.push(`ETD: ${formatDate(existingSchedule.etd)} → ${formatDate(external.etd)}`);
      }
      if (external.actualDynamicTime && !existingSchedule.actualBerthing) {
        updates.actualBerthing = external.actualDynamicTime;
        changeFields.push('实际动态时间');
        beforeFields.actualBerthing = existingSchedule.actualBerthing;
        afterFields.actualBerthing = external.actualDynamicTime;
        changeDetails.push(`实际动态时间: ${formatDate(external.actualDynamicTime)}`);
      }
      if (external.draft && existingSchedule.shipId) {
        const shipData = scheduleStore.getShipById(existingSchedule.shipId);
        if (shipData && Math.abs((shipData.draft || 0) - external.draft) > 0.1) {
          changeDetails.push(`吃水: ${shipData.draft}m → ${external.draft}m`);
        }
      }

      if (changeFields.length > 0) {
        scheduleStore.updateSchedule(existingSchedule.id, updates);
        const logDesc = `[外部同步${isAuto ? '(自动)' : '(人工)'}] ${shipName} 同步字段变更: ${changeFields.join('、')}。${changeDetails.join('; ')}`;
        scheduleStore.addLog({
          type: 'update',
          scheduleId: existingSchedule.id,
          shipId: external.matchedShipId,
          description: logDesc,
          before: beforeFields,
          after: afterFields,
        });
        syncedScheduleId = existingSchedule.id;
      } else {
        changeDetails.push('无字段变更');
      }
    } else if (external.eta && external.etd) {
      const berthId = findSuitableBerth(external);
      const berth = scheduleStore.getBerthById(berthId);
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
        actualBerthing: external.actualDynamicTime,
      });
      syncedScheduleId = newSchedule.id;
      changeDetails.push(`新建调度计划: 泊位=${berth?.name || berthId}, ETA=${formatDate(external.eta)}, ETD=${formatDate(external.etd)}`);
      const logDesc = `[外部同步${isAuto ? '(自动)' : '(人工)'}] ${shipName} 新建调度计划。${changeDetails.join('; ')}`;
      scheduleStore.addLog({
        type: 'create',
        scheduleId: newSchedule.id,
        shipId: external.matchedShipId,
        description: logDesc,
        after: {
          berthId,
          eta: external.eta,
          etd: external.etd,
          source: 'api',
        },
      });
    }

    external.syncStatus = 'synced';
    external.lastSyncTime = new Date();
    external.syncedScheduleId = syncedScheduleId || undefined;
    if (!isAuto) {
      external.confirmedBy = useAuthStore().currentUser?.displayName || '系统';
      external.confirmedAt = new Date();
    }
    external.updatedAt = new Date();
    external.errorReason = undefined;

    addSyncLog(
      externalId,
      isAuto ? 'sync' : 'confirm',
      isAuto
        ? `自动同步到调度计划。${changeDetails.join('; ')}`
        : `人工确认并同步到调度计划。${changeDetails.join('; ')}`,
      before as unknown as Record<string, unknown>,
      {
        syncStatus: 'synced',
        confirmedBy: external.confirmedBy,
        syncedScheduleId,
        changes: changeDetails,
      },
    );

    return external;
  }

  function confirmAndSync(externalId: string) {
    return syncToSchedule(externalId, false);
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
      return syncToSchedule(externalId, false);
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
        syncToSchedule(id, external.syncStatus === 'matched');
        results.push({ id, success: true, message: '同步成功' });
      } else if (external.syncStatus === 'pending') {
        const matched = autoMatchByIMO(id);
        if (matched) {
          syncToSchedule(id, true);
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
    let syncedCount = 0;

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

      let autoSynced = false;

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

        if (external.syncStatus === 'matched' && external.eta && external.etd) {
          externalSchedules.value.unshift(external);
          syncToSchedule(id, true);
          syncedCount++;
          autoSynced = true;
        }
      } else {
        external.syncStatus = 'unmatched';
        external.errorReason = '未找到匹配船舶';
        unmatchedCount++;
      }

      successCount++;
      if (!autoSynced && !externalSchedules.value.find((s) => s.id === id)) {
        externalSchedules.value.unshift(external);
      }
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
      syncedCount,
      importTime: new Date(),
      operator,
    };

    importRecords.value.unshift(importRecord);

    recordAudit(
      'schedule_write',
      batchId,
      `导入 ${schedules.length} 条外部船期数据，自动同步 ${syncedCount} 条`,
      null,
      { count: schedules.length, sourceSystem, syncedCount },
    );

    return { batchId, batchNo, successCount, failedCount, matchedCount, unmatchedCount, conflictCount, syncedCount };
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

  const pendingConfirmationList = computed(() =>
    externalSchedules.value.filter(
      (s) => s.syncStatus === 'unmatched' || s.syncStatus === 'conflict',
    ),
  );

  const pendingConfirmationCount = computed(() => pendingConfirmationList.value.length);

  const unmatchedList = computed(() =>
    externalSchedules.value.filter((s) => s.syncStatus === 'unmatched'),
  );

  const conflictList = computed(() =>
    externalSchedules.value.filter((s) => s.syncStatus === 'conflict'),
  );

  function getPendingConfirmationList(filters?: {
    type?: 'unmatched' | 'conflict' | 'all';
    search?: string;
  }) {
    let result = [...pendingConfirmationList.value];
    if (filters?.type && filters.type !== 'all') {
      result = result.filter((s) => s.syncStatus === filters.type);
    }
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(
        (s) =>
          s.externalShipName.toLowerCase().includes(searchLower) ||
          s.imo.toLowerCase().includes(searchLower) ||
          (s.matchedShipName && s.matchedShipName.toLowerCase().includes(searchLower)),
      );
    }
    return result.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
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
    pendingConfirmationList,
    pendingConfirmationCount,
    unmatchedList,
    conflictList,
    getPendingConfirmationList,
    getExternalById,
    getImportRecordById,
    getSyncLogsByExternalId,
    getExternalSchedulesByBatch,
    matchExternalSchedule,
    syncToSchedule,
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
