import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
  Incident,
  IncidentType,
  IncidentSeverity,
  IncidentStatus,
  IncidentRecord,
  AffectedSchedule,
} from '../types';
import { INCIDENT_TYPE_LABELS } from '../types';
import { mockIncidents } from '../data/mock';
import { useAuthStore } from './auth';
import { useScheduleStore } from './schedule';
import { usePermissionStore } from './permission';

export const useIncidentStore = defineStore('incident', () => {
  const incidents = ref<Incident[]>([...mockIncidents]);
  const selectedIncidentId = ref<string | null>(null);

  const activeIncidents = computed(() =>
    incidents.value.filter((i) => i.status !== 'closed' && i.status !== 'resolved'),
  );

  const openIncidentCount = computed(() => activeIncidents.value.length);

  const criticalIncidents = computed(() =>
    incidents.value.filter(
      (i) => i.severity === 'critical' && i.status !== 'closed',
    ),
  );

  const selectedIncident = computed(() =>
    incidents.value.find((i) => i.id === selectedIncidentId.value) || null,
  );

  function generateIncidentNo(): string {
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const existingToday = incidents.value.filter((i) =>
      i.incidentNo.includes(dateStr),
    ).length;
    const seq = String(existingToday + 1).padStart(3, '0');
    return `INC-${dateStr}-${seq}`;
  }

  function analyzeAffectedSchedules(
    affectedBerthIds: string[],
    affectedShipIds: string[],
    occurTime: Date,
    expectedRecoveryTime?: Date,
  ): AffectedSchedule[] {
    const scheduleStore = useScheduleStore();
    const affected: AffectedSchedule[] = [];
    const occurTimeMs = new Date(occurTime).getTime();
    const recoveryTimeMs = expectedRecoveryTime
      ? new Date(expectedRecoveryTime).getTime()
      : occurTimeMs + 24 * 3600 * 1000;

    scheduleStore.schedules.forEach((schedule) => {
      const scheduleEta = new Date(schedule.eta).getTime();
      const scheduleEtd = new Date(schedule.etd).getTime();

      const berthAffected = affectedBerthIds.includes(schedule.berthId);
      const shipAffected = affectedShipIds.includes(schedule.shipId);
      const timeOverlap = scheduleEtd > occurTimeMs && scheduleEta < recoveryTimeMs;

      if ((berthAffected || shipAffected) && timeOverlap) {
        const ship = scheduleStore.getShipById(schedule.shipId);
        const berth = scheduleStore.getBerthById(schedule.berthId);

        affected.push({
          scheduleId: schedule.id,
          shipId: schedule.shipId,
          shipName: ship?.name || schedule.shipId,
          berthId: schedule.berthId,
          berthName: berth?.name || schedule.berthId,
          impact: berthAffected ? '泊位受影响，作业可能延迟' : '船舶受影响',
        });
      }
    });

    return affected;
  }

  function createIncident(data: {
    type: IncidentType;
    severity: IncidentSeverity;
    title: string;
    description: string;
    occurTime: Date;
    expectedRecoveryTime?: Date;
    affectedBerthIds: string[];
    affectedShipIds: string[];
  }): Incident {
    const authStore = useAuthStore();
    const scheduleStore = useScheduleStore();
    const permStore = usePermissionStore();

    const affectedSchedules = analyzeAffectedSchedules(
      data.affectedBerthIds,
      data.affectedShipIds,
      data.occurTime,
      data.expectedRecoveryTime,
    );

    const incident: Incident = {
      id: `incident-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      incidentNo: generateIncidentNo(),
      type: data.type,
      severity: data.severity,
      status: 'reported',
      title: data.title,
      description: data.description,
      occurTime: new Date(data.occurTime),
      expectedRecoveryTime: data.expectedRecoveryTime
        ? new Date(data.expectedRecoveryTime)
        : undefined,
      affectedBerthIds: [...data.affectedBerthIds],
      affectedShipIds: [...data.affectedShipIds],
      affectedSchedules,
      reporter: authStore.currentUser?.displayName || '系统',
      reportTime: new Date(),
      records: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const initialRecord: IncidentRecord = {
      id: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      action: '事件上报',
      operator: authStore.currentUser?.displayName || '系统',
      timestamp: new Date(),
      description: data.description,
    };
    incident.records.push(initialRecord);

    incidents.value.unshift(incident);

    markSchedulesAbnormal(incident.id, affectedSchedules);

    scheduleStore.addLog({
      type: 'warning',
      description: `异常事件 ${incident.incidentNo}（${INCIDENT_TYPE_LABELS[data.type]}）已上报，影响 ${affectedSchedules.length} 个调度计划`,
      before: null,
      after: { incidentId: incident.id, incidentNo: incident.incidentNo },
    });

    try {
      permStore.addAuditLog(
        'schedule_write',
        incident.id,
        'schedule',
        `上报异常事件 ${incident.incidentNo}`,
        null,
        { type: data.type, severity: data.severity, title: data.title },
      );
    } catch {
      // permission store may not be initialized yet
    }

    return incident;
  }

  function markSchedulesAbnormal(
    incidentId: string,
    affectedSchedules: AffectedSchedule[],
  ) {
    const scheduleStore = useScheduleStore();
    affectedSchedules.forEach((as) => {
      const schedule = scheduleStore.schedules.find(
        (s) => s.id === as.scheduleId,
      );
      if (schedule) {
        const delayReason = schedule.delayReason
          ? `${schedule.delayReason}\n受事件 ${incidentId} 影响`
          : `受事件 ${incidentId} 影响`;
        scheduleStore.updateDelayReason(as.scheduleId, delayReason);
      }
    });
  }

  function updateIncidentStatus(
    incidentId: string,
    status: IncidentStatus,
    description?: string,
  ): Incident | null {
    const incident = incidents.value.find((i) => i.id === incidentId);
    if (!incident) return null;

    const authStore = useAuthStore();
    const scheduleStore = useScheduleStore();

    incident.status = status;
    incident.updatedAt = new Date();

    if (status === 'resolved' && !incident.actualRecoveryTime) {
      incident.actualRecoveryTime = new Date();
    }

    const record: IncidentRecord = {
      id: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      action: getStatusActionLabel(status),
      operator: authStore.currentUser?.displayName || '系统',
      timestamp: new Date(),
      description:
        description || `事件状态更新为 ${status}`,
    };
    incident.records.push(record);

    if (status === 'resolved' || status === 'closed') {
      incident.affectedSchedules.forEach((as) => {
        const schedule = scheduleStore.schedules.find(
          (s) => s.id === as.scheduleId,
        );
        if (schedule && schedule.delayReason?.includes(incidentId)) {
          scheduleStore.updateDelayReason(
            as.scheduleId,
            schedule.delayReason.replace(`\n受事件 ${incidentId} 影响`, '').replace(`受事件 ${incidentId} 影响`, ''),
          );
        }
      });
    }

    scheduleStore.addLog({
      type: status === 'resolved' || status === 'closed' ? 'update' : 'warning',
      description: `异常事件 ${incident.incidentNo} 状态变更为 ${status}`,
      before: { status: incident.status },
      after: { status },
    });

    return incident;
  }

  function getStatusActionLabel(status: IncidentStatus): string {
    const labels: Record<IncidentStatus, string> = {
      reported: '事件上报',
      investigating: '开始调查',
      handling: '开始处置',
      resolved: '事件解决',
      closed: '事件关闭',
    };
    return labels[status] || '状态更新';
  }

  function addRecord(
    incidentId: string,
    action: string,
    description: string,
  ): IncidentRecord | null {
    const incident = incidents.value.find((i) => i.id === incidentId);
    if (!incident) return null;

    const authStore = useAuthStore();

    const record: IncidentRecord = {
      id: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      action,
      operator: authStore.currentUser?.displayName || '系统',
      timestamp: new Date(),
      description,
    };

    incident.records.push(record);
    incident.updatedAt = new Date();

    return record;
  }

  function assignHandler(incidentId: string, handler: string): Incident | null {
    const incident = incidents.value.find((i) => i.id === incidentId);
    if (!incident) return null;

    incident.handler = handler;
    incident.updatedAt = new Date();

    addRecord(incidentId, '指派处置人', `指派 ${handler} 为事件处置人`);

    return incident;
  }

  function updateReviewConclusion(
    incidentId: string,
    conclusion: string,
  ): Incident | null {
    const incident = incidents.value.find((i) => i.id === incidentId);
    if (!incident) return null;

    incident.reviewConclusion = conclusion;
    incident.updatedAt = new Date();

    addRecord(incidentId, '复盘总结', conclusion);

    return incident;
  }

  function getIncidentById(id: string): Incident | undefined {
    return incidents.value.find((i) => i.id === id);
  }

  function filterIncidents(options?: {
    type?: IncidentType;
    severity?: IncidentSeverity;
    status?: IncidentStatus;
    keyword?: string;
    berthId?: string;
  }): Incident[] {
    let result = [...incidents.value];

    if (options?.type) {
      result = result.filter((i) => i.type === options.type);
    }
    if (options?.severity) {
      result = result.filter((i) => i.severity === options.severity);
    }
    if (options?.status) {
      result = result.filter((i) => i.status === options.status);
    }
    if (options?.berthId) {
      result = result.filter((i) => i.affectedBerthIds.includes(options.berthId!));
    }
    if (options?.keyword) {
      const kw = options.keyword.toLowerCase();
      result = result.filter(
        (i) =>
          i.incidentNo.toLowerCase().includes(kw) ||
          i.title.toLowerCase().includes(kw) ||
          i.description.toLowerCase().includes(kw) ||
          i.reporter.toLowerCase().includes(kw),
      );
    }

    return result.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  function getIncidentsByScheduleId(scheduleId: string): Incident[] {
    return incidents.value.filter((i) =>
      i.affectedSchedules.some((as) => as.scheduleId === scheduleId),
    );
  }

  function getActiveIncidentsByBerthId(berthId: string): Incident[] {
    return activeIncidents.value.filter((i) =>
      i.affectedBerthIds.includes(berthId),
    );
  }

  function batchUpdateScheduleETD(incidentId: string, delayHours: number): void {
    const incident = incidents.value.find((i) => i.id === incidentId);
    if (!incident) return;

    const scheduleStore = useScheduleStore();

    incident.affectedSchedules.forEach((as) => {
      const schedule = scheduleStore.schedules.find(
        (s) => s.id === as.scheduleId,
      );
      if (schedule) {
        const newEtd = new Date(
          new Date(schedule.etd).getTime() + delayHours * 3600 * 1000,
        );
        scheduleStore.updateSchedule(as.scheduleId, { etd: newEtd });
        as.etdAdjusted = newEtd;
      }
    });

    addRecord(
      incidentId,
      '批量更新时间',
      `受事件影响，${incident.affectedSchedules.length} 个计划预计离泊时间延后 ${delayHours} 小时`,
    );
  }

  return {
    incidents,
    selectedIncidentId,
    activeIncidents,
    openIncidentCount,
    criticalIncidents,
    selectedIncident,
    createIncident,
    updateIncidentStatus,
    addRecord,
    assignHandler,
    updateReviewConclusion,
    getIncidentById,
    filterIncidents,
    getIncidentsByScheduleId,
    getActiveIncidentsByBerthId,
    analyzeAffectedSchedules,
    batchUpdateScheduleETD,
  };
});
