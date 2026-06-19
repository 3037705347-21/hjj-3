import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
  Resource,
  ResourceAllocation,
  ResourceConflict,
  ResourceType,
  ResourceStatus,
  BerthSchedule,
} from '../types';
import {
  mockResources,
  mockResourceAllocations,
  mockResourceConflicts,
} from '../data/mock';
import { useScheduleStore } from './schedule';
import { useAuthStore } from './auth';
import { usePermissionStore } from './permission';

export const useResourceStore = defineStore('resource', () => {
  const resources = ref<Resource[]>(mockResources);
  const allocations = ref<ResourceAllocation[]>(mockResourceAllocations);
  const conflicts = ref<ResourceConflict[]>(mockResourceConflicts);
  const selectedResourceId = ref<string | null>(null);
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

  const selectedResource = computed(() =>
    resources.value.find((r) => r.id === selectedResourceId.value) || null,
  );

  const teamResources = computed(() =>
    resources.value.filter((r) => r.type === 'team'),
  );

  const equipmentResources = computed(() =>
    resources.value.filter((r) => r.type === 'equipment'),
  );

  const berthResources = computed(() =>
    resources.value.filter((r) => r.type === 'berth'),
  );

  const activeConflicts = computed(() =>
    conflicts.value.filter((c) => !c.resolved),
  );

  const resolvedConflicts = computed(() =>
    conflicts.value.filter((c) => c.resolved),
  );

  const resourcesByType = computed(() => {
    const map: Record<ResourceType, Resource[]> = {
      berth: [],
      team: [],
      equipment: [],
    };
    resources.value.forEach((r) => {
      map[r.type].push(r);
    });
    return map;
  });

  const resourcesByBerth = computed(() => {
    const map: Record<string, Resource[]> = {};
    resources.value.forEach((r) => {
      if (r.berthId) {
        if (!map[r.berthId]) map[r.berthId] = [];
        map[r.berthId].push(r);
      }
    });
    return map;
  });

  const allocationsByResource = computed(() => {
    const map: Record<string, ResourceAllocation[]> = {};
    allocations.value.forEach((a) => {
      if (!map[a.resourceId]) map[a.resourceId] = [];
      map[a.resourceId].push(a);
    });
    return map;
  });

  const allocationsBySchedule = computed(() => {
    const map: Record<string, ResourceAllocation[]> = {};
    allocations.value.forEach((a) => {
      if (!map[a.scheduleId]) map[a.scheduleId] = [];
      map[a.scheduleId].push(a);
    });
    return map;
  });

  const conflictsByResource = computed(() => {
    const map: Record<string, ResourceConflict[]> = {};
    conflicts.value.forEach((c) => {
      if (!map[c.resourceId]) map[c.resourceId] = [];
      map[c.resourceId].push(c);
    });
    return map;
  });

  const conflictsBySchedule = computed(() => {
    const map: Record<string, ResourceConflict[]> = {};
    conflicts.value.forEach((c) => {
      if (!map[c.scheduleId]) map[c.scheduleId] = [];
      map[c.scheduleId].push(c);
      if (c.relatedScheduleId) {
        if (!map[c.relatedScheduleId]) map[c.relatedScheduleId] = [];
        map[c.relatedScheduleId].push(c);
      }
    });
    return map;
  });

  function setSelectedResource(id: string | null) {
    selectedResourceId.value = id;
  }

  function createResource(data: Omit<Resource, 'id' | 'createdAt' | 'updatedAt'>) {
    const newId = `res-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date();
    const newResource: Resource = {
      ...data,
      id: newId,
      createdAt: now,
      updatedAt: now,
    } as Resource;
    resources.value.push(newResource);
    const scheduleStore = useScheduleStore();
    scheduleStore.addLog({
      type: 'create',
      description: `新增资源: ${data.name} (${data.type})`,
    });
    recordAudit('schedule_write', newId, `新增资源: ${data.name}`);
    return newResource;
  }

  function updateResource(id: string, updates: Partial<Resource>) {
    const resource = resources.value.find((r) => r.id === id);
    if (!resource) return;
    const before = { ...resource };
    Object.assign(resource, updates, { updatedAt: new Date() });
    const scheduleStore = useScheduleStore();
    scheduleStore.addLog({
      type: 'update',
      description: `更新资源: ${resource.name}`,
      before: before as unknown as Record<string, unknown>,
      after: updates as Record<string, unknown>,
    });
    recordAudit('schedule_write', id, `更新资源: ${resource.name}`, before as unknown as Record<string, unknown>, updates as Record<string, unknown>);
  }

  function updateResourceStatus(id: string, status: ResourceStatus, disableReason?: string) {
    const resource = resources.value.find((r) => r.id === id);
    if (!resource) return;
    const beforeStatus = resource.status;
    resource.status = status;
    resource.updatedAt = new Date();
    if (disableReason !== undefined) {
      resource.disableReason = disableReason;
    }
    const scheduleStore = useScheduleStore();
    scheduleStore.addLog({
      type: 'update',
      description: `资源 ${resource.name} 状态由 ${beforeStatus} 变更为 ${status}${disableReason ? `，原因: ${disableReason}` : ''}`,
    });
  }

  function deleteResource(id: string) {
    const idx = resources.value.findIndex((r) => r.id === id);
    if (idx === -1) return;
    const resource = resources.value[idx];
    resources.value.splice(idx, 1);
    const scheduleStore = useScheduleStore();
    scheduleStore.addLog({
      type: 'delete',
      description: `删除资源: ${resource.name}`,
    });
    allocations.value = allocations.value.filter((a) => a.resourceId !== id);
    recordAudit('schedule_write', id, `删除资源: ${resource.name}`);
  }

  function allocateResource(
    resourceId: string,
    scheduleId: string,
    startTime: Date,
    endTime: Date,
    remarks?: string,
  ) {
    const resource = resources.value.find((r) => r.id === resourceId);
    const scheduleStore = useScheduleStore();
    if (!resource) return null;

    const newAllocation: ResourceAllocation = {
      id: `alloc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      resourceId,
      resourceName: resource.name,
      resourceType: resource.type,
      scheduleId,
      startTime,
      endTime,
      allocatedBy: currentOperator.value,
      allocatedAt: new Date(),
      remarks,
    };
    allocations.value.push(newAllocation);

    if (!resource.scheduleIds.includes(scheduleId)) {
      resource.scheduleIds.push(scheduleId);
    }

    const activeAllocs = allocations.value.filter(
      (a) => a.resourceId === resourceId && new Date(a.endTime) > new Date(),
    );
    resource.status = activeAllocs.length > 0 ? 'occupied' : 'available';
    resource.updatedAt = new Date();

    const schedule = scheduleStore.schedules.find((s) => s.id === scheduleId);
    const ship = schedule ? scheduleStore.getShipById(schedule.shipId) : null;
    scheduleStore.addLog({
      type: 'update',
      scheduleId,
      shipId: schedule?.shipId,
      berthId: schedule?.berthId,
      description: `分配资源 ${resource.name} 给 ${ship?.name || scheduleId}，时段 ${startTime.toLocaleString()} - ${endTime.toLocaleString()}`,
    });

    detectResourceConflicts();

    return newAllocation;
  }

  function deallocateResource(allocationId: string) {
    const idx = allocations.value.findIndex((a) => a.id === allocationId);
    if (idx === -1) return;
    const allocation = allocations.value[idx];
    allocations.value.splice(idx, 1);

    const resource = resources.value.find((r) => r.id === allocation.resourceId);
    if (resource) {
      const remainingAllocs = allocations.value.filter(
        (a) => a.resourceId === allocation.resourceId,
      );
      resource.scheduleIds = resource.scheduleIds.filter(
        (sid) => sid !== allocation.scheduleId || remainingAllocs.some((a) => a.scheduleId === sid),
      );
      const activeAllocs = remainingAllocs.filter(
        (a) => new Date(a.endTime) > new Date(),
      );
      resource.status = resource.status === 'disabled' || resource.status === 'maintenance'
        ? resource.status
        : activeAllocs.length > 0 ? 'occupied' : 'available';
      resource.updatedAt = new Date();
    }

    const scheduleStore = useScheduleStore();
    scheduleStore.addLog({
      type: 'update',
      scheduleId: allocation.scheduleId,
      description: `取消资源分配 ${allocationId}`,
    });
  }

  function deallocateScheduleResources(scheduleId: string) {
    const scheduleStore = useScheduleStore();
    const toRemove = allocations.value.filter((a) => a.scheduleId === scheduleId);
    toRemove.forEach((a) => {
      const resource = resources.value.find((r) => r.id === a.resourceId);
      if (resource) {
        resource.scheduleIds = resource.scheduleIds.filter((sid) => sid !== scheduleId);
        const remainingAllocs = allocations.value.filter(
          (al) => al.resourceId === a.resourceId && al.scheduleId !== scheduleId,
        );
        const activeAllocs = remainingAllocs.filter(
          (al) => new Date(al.endTime) > new Date(),
        );
        resource.status = resource.status === 'disabled' || resource.status === 'maintenance'
          ? resource.status
          : activeAllocs.length > 0 ? 'occupied' : 'available';
        resource.updatedAt = new Date();
      }
    });
    allocations.value = allocations.value.filter((a) => a.scheduleId !== scheduleId);
    scheduleStore.addLog({
      type: 'update',
      scheduleId,
      description: `取消计划 ${scheduleId} 的所有资源分配`,
    });
  }

  function detectResourceConflicts(): ResourceConflict[] {
    const newConflicts: ResourceConflict[] = [];
    const scheduleStore = useScheduleStore();

    resources.value.forEach((resource) => {
      if (resource.status === 'disabled' || resource.status === 'maintenance') {
        const activeAllocs = allocations.value.filter(
          (a) => a.resourceId === resource.id && new Date(a.endTime) > new Date(),
        );
        activeAllocs.forEach((alloc) => {
          const conflict: ResourceConflict = {
            id: `rconf-${resource.id}-${alloc.scheduleId}-disabled`,
            type: resource.status === 'disabled' ? 'resource_disabled' : 'resource_maintenance',
            severity: 'error',
            resourceId: resource.id,
            resourceName: resource.name,
            resourceType: resource.type,
            scheduleId: alloc.scheduleId,
            message: `${resource.name} 当前状态为${resource.status === 'disabled' ? '停用' : '维护中'}，分配给计划 ${alloc.scheduleId} 将无法使用`,
            detectedAt: new Date(),
            resolved: false,
          };
          newConflicts.push(conflict);
        });
        return;
      }

      const resourceAllocs = allocations.value
        .filter((a) => a.resourceId === resource.id)
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

      for (let i = 0; i < resourceAllocs.length; i++) {
        for (let j = i + 1; j < resourceAllocs.length; j++) {
          const a1 = resourceAllocs[i];
          const a2 = resourceAllocs[j];
          const a1Start = new Date(a1.startTime).getTime();
          const a1End = new Date(a1.endTime).getTime();
          const a2Start = new Date(a2.startTime).getTime();
          const a2End = new Date(a2.endTime).getTime();

          if (a1Start < a2End && a2Start < a1End) {
            const overlapStart = new Date(Math.max(a1Start, a2Start));
            const overlapEnd = new Date(Math.min(a1End, a2End));
            const overlapHours = Math.round((overlapEnd.getTime() - overlapStart.getTime()) / 3600000);

            const s1 = scheduleStore.schedules.find((s) => s.id === a1.scheduleId);
            const s2 = scheduleStore.schedules.find((s) => s.id === a2.scheduleId);
            const ship1 = s1 ? scheduleStore.getShipById(s1.shipId) : null;
            const ship2 = s2 ? scheduleStore.getShipById(s2.shipId) : null;

            const conflict: ResourceConflict = {
              id: `rconf-${resource.id}-${a1.scheduleId}-${a2.scheduleId}`,
              type: resource.type === 'team' ? 'team_time_overlap' : 'equipment_time_overlap',
              severity: 'error',
              resourceId: resource.id,
              resourceName: resource.name,
              resourceType: resource.type,
              scheduleId: a1.scheduleId,
              relatedScheduleId: a2.scheduleId,
              message: `${resource.name} 同时被 ${ship1?.name || a1.scheduleId} 和 ${ship2?.name || a2.scheduleId} 占用，冲突时长约 ${overlapHours} 小时`,
              overlapStart,
              overlapEnd,
              detectedAt: new Date(),
              resolved: false,
            };
            newConflicts.push(conflict);
          }
        }
      }
    });

    const existingIds = new Set(conflicts.value.map((c) => c.id));
    const trulyNew = newConflicts.filter((c) => !existingIds.has(c.id));
    trulyNew.forEach((c) => {
      conflicts.value.push(c);
      const scheduleStore = useScheduleStore();
      scheduleStore.addLog({
        type: 'conflict',
        scheduleId: c.scheduleId,
        description: `[资源冲突] ${c.message}`,
      });
    });

    return newConflicts;
  }

  function resolveConflict(conflictId: string, resolutionNote: string) {
    const conflict = conflicts.value.find((c) => c.id === conflictId);
    if (!conflict) return;
    conflict.resolved = true;
    conflict.resolvedAt = new Date();
    conflict.resolvedBy = currentOperator.value;
    conflict.resolutionNote = resolutionNote;
    const scheduleStore = useScheduleStore();
    scheduleStore.addLog({
      type: 'update',
      scheduleId: conflict.scheduleId,
      description: `解决资源冲突 ${conflictId}: ${resolutionNote}`,
    });
    recordAudit('conflict_resolve', conflictId, resolutionNote);
  }

  function checkScheduleResourceAllocation(scheduleId: string): { sufficient: boolean; missingResources: string[] } {
    const scheduleStore = useScheduleStore();
    const schedule = scheduleStore.schedules.find((s) => s.id === scheduleId);
    if (!schedule) return { sufficient: true, missingResources: [] };

    const scheduleAllocs = allocations.value.filter((a) => a.scheduleId === scheduleId);
    const hasTeam = scheduleAllocs.some((a) => {
      const r = resources.value.find((res) => res.id === a.resourceId);
      return r?.type === 'team';
    });
    const hasEquipment = scheduleAllocs.some((a) => {
      const r = resources.value.find((res) => res.id === a.resourceId);
      return r?.type === 'equipment';
    });

    const missing: string[] = [];
    if (!hasTeam && schedule.operationTeam) {
      missing.push(`作业班组 ${schedule.operationTeam} 未完成资源分配`);
    } else if (!schedule.operationTeam) {
      missing.push('未指定作业班组');
    }
    if (!hasEquipment) {
      missing.push('未分配作业设备');
    }

    return {
      sufficient: missing.length === 0,
      missingResources: missing,
    };
  }

  function canTransitionToOperation(scheduleId: string): { allowed: boolean; reason?: string } {
    const scheduleStore = useScheduleStore();
    const schedule = scheduleStore.schedules.find((s) => s.id === scheduleId);
    if (!schedule) return { allowed: false, reason: '计划不存在' };

    const { sufficient, missingResources } = checkScheduleResourceAllocation(scheduleId);
    if (!sufficient) {
      return {
        allowed: false,
        reason: `资源分配未完成: ${missingResources.join('; ')}`,
      };
    }

    const resourceConflicts = conflicts.value.filter(
      (c) => !c.resolved && (c.scheduleId === scheduleId || c.relatedScheduleId === scheduleId),
    );
    if (resourceConflicts.length > 0) {
      return {
        allowed: false,
        reason: `存在 ${resourceConflicts.length} 个资源冲突需要处理`,
      };
    }

    return { allowed: true };
  }

  function getResourceById(id: string) {
    return resources.value.find((r) => r.id === id);
  }

  function getAllocationsForSchedule(scheduleId: string): ResourceAllocation[] {
    return allocations.value.filter((a) => a.scheduleId === scheduleId);
  }

  function getConflictsForSchedule(scheduleId: string): ResourceConflict[] {
    return conflicts.value.filter(
      (c) => c.scheduleId === scheduleId || c.relatedScheduleId === scheduleId,
    );
  }

  function getAvailableResources(
    type: ResourceType,
    startTime: Date,
    endTime: Date,
    berthId?: string,
  ): Resource[] {
    const startMs = new Date(startTime).getTime();
    const endMs = new Date(endTime).getTime();

    return resources.value.filter((r) => {
      if (r.type !== type) return false;
      if (berthId && r.berthId !== berthId) return false;
      if (r.status === 'disabled' || r.status === 'maintenance') return false;

      const resourceAllocs = allocations.value.filter((a) => a.resourceId === r.id);
      const hasConflict = resourceAllocs.some((a) => {
        const aStart = new Date(a.startTime).getTime();
        const aEnd = new Date(a.endTime).getTime();
        return startMs < aEnd && aStart < endMs;
      });

      return !hasConflict;
    });
  }

  return {
    resources,
    allocations,
    conflicts,
    selectedResourceId,
    currentOperator,
    selectedResource,
    teamResources,
    equipmentResources,
    berthResources,
    activeConflicts,
    resolvedConflicts,
    resourcesByType,
    resourcesByBerth,
    allocationsByResource,
    allocationsBySchedule,
    conflictsByResource,
    conflictsBySchedule,
    setSelectedResource,
    createResource,
    updateResource,
    updateResourceStatus,
    deleteResource,
    allocateResource,
    deallocateResource,
    deallocateScheduleResources,
    detectResourceConflicts,
    resolveConflict,
    checkScheduleResourceAllocation,
    canTransitionToOperation,
    getResourceById,
    getAllocationsForSchedule,
    getConflictsForSchedule,
    getAvailableResources,
  };
});
