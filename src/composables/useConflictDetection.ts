import type {
  BerthSchedule,
  Ship,
  Berth,
  ScheduleConflict,
  TideRecord,
  CargoType,
  BerthMaintenancePeriod,
  MaintenanceImpactScope,
  ForbiddenBerthCategory,
} from '../types';
import {
  MAINTENANCE_TYPE_LABELS,
  MAINTENANCE_IMPACT_SCOPE_LABELS,
  SHIP_TAG_LABELS,
  FORBIDDEN_BERTH_CATEGORY_LABELS,
} from '../types';

const BERTH_CATEGORY_MAP: Record<string, ForbiddenBerthCategory> = {
  container: 'container',
  bulk: 'bulk',
  liquid: 'liquid',
  general: 'general',
  'ro-ro': 'ro-ro',
};

export function useConflictDetection() {
  function getAffectedBerthIdsForMaintenance(
    period: BerthMaintenancePeriod,
    berths: Berth[],
  ): string[] {
    const sorted = [...berths].sort((a, b) => a.position - b.position);
    const baseBerth = sorted.find((b) => b.id === period.berthId);
    if (!baseBerth) return [period.berthId];

    if (period.impactScope === 'full_terminal') {
      return sorted.map((b) => b.id);
    }

    if (period.impactScope === 'berth_and_adjacent') {
      const affected: string[] = [baseBerth.id];
      const basePosition = baseBerth.position;
      const prev = sorted.find((b) => b.position === basePosition - 1);
      if (prev) affected.push(prev.id);
      const next = sorted.find((b) => b.position === basePosition + 1);
      if (next) affected.push(next.id);
      return affected;
    }

    return [baseBerth.id];
  }
  function detectAllConflicts(
    schedules: BerthSchedule[],
    ships: Ship[],
    berths: Berth[],
    tides: TideRecord[],
    maintenancePeriods: BerthMaintenancePeriod[] = [],
  ): ScheduleConflict[] {
    const conflicts: ScheduleConflict[] = [];

    for (let i = 0; i < schedules.length; i++) {
      for (let j = i + 1; j < schedules.length; j++) {
        const timeConflict = checkTimeOverlap(schedules[i], schedules[j]);
        if (timeConflict) {
          conflicts.push(timeConflict);
        }

        const bufferConflict = checkBufferTime(schedules[i], schedules[j]);
        if (bufferConflict) {
          conflicts.push(bufferConflict);
        }

        const teamConflict = checkTeamConflict(schedules[i], schedules[j]);
        if (teamConflict) {
          conflicts.push(teamConflict);
        }

        const dangerousCargoConflict = checkDangerousCargoIsolation(
          schedules[i],
          schedules[j],
          ships,
        );
        if (dangerousCargoConflict) {
          conflicts.push(dangerousCargoConflict);
        }
      }
    }

    schedules.forEach((schedule) => {
      const ship = ships.find((s) => s.id === schedule.shipId);
      const berth = berths.find((b) => b.id === schedule.berthId);

      if (ship && berth) {
        const draftConflict = checkDraftLimit(schedule, ship, berth);
        if (draftConflict) conflicts.push(draftConflict);

        const lengthConflict = checkLengthLimit(schedule, ship, berth);
        if (lengthConflict) conflicts.push(lengthConflict);

        const cargoConflict = checkCargoMatch(schedule, ship, berth);
        if (cargoConflict) conflicts.push(cargoConflict);

        const tideConflict = checkTideWindow(schedule, ship, berth, tides);
        if (tideConflict) conflicts.push(tideConflict);

        const maintenanceConflict = checkBerthMaintenance(schedule, berth);
        if (maintenanceConflict) conflicts.push(maintenanceConflict);

        const nightConflict = checkNightOperation(schedule, ship);
        if (nightConflict) conflicts.push(nightConflict);

        const earliestTimeConflict = checkTagEarliestOperationTime(schedule, ship);
        if (earliestTimeConflict) conflicts.push(earliestTimeConflict);

        const forbiddenBerthConflict = checkTagForbiddenBerth(schedule, ship, berth);
        if (forbiddenBerthConflict) conflicts.push(forbiddenBerthConflict);

        const missingRemarksConflict = checkTagMissingRemarks(schedule, ship);
        if (missingRemarksConflict) conflicts.push(missingRemarksConflict);

        const tagNightConflict = checkTagNightRestricted(schedule, ship);
        if (tagNightConflict) conflicts.push(tagNightConflict);
      }
    });

    schedules.forEach((schedule) => {
      const ship = ships.find((s) => s.id === schedule.shipId);
      if (!ship) return;
      const priorityConflict = checkTagPriorityBerth(schedule, ship, schedules, ships);
      if (priorityConflict) conflicts.push(priorityConflict);
    });

    const activeMaintenance = maintenancePeriods.filter(
      (m) => m.status === 'planned' || m.status === 'in_progress',
    );
    schedules.forEach((schedule) => {
      const berth = berths.find((b) => b.id === schedule.berthId);
      if (!berth) return;
      const mConflict = checkMaintenancePeriodOverlap(schedule, berth, activeMaintenance, berths);
      if (mConflict) conflicts.push(mConflict);
    });

    return conflicts;
  }

  function checkTimeOverlap(
    s1: BerthSchedule,
    s2: BerthSchedule,
  ): ScheduleConflict | null {
    if (s1.berthId !== s2.berthId) return null;

    const s1Start = new Date(s1.eta).getTime();
    const s1End = new Date(s1.etd).getTime();
    const s2Start = new Date(s2.eta).getTime();
    const s2End = new Date(s2.etd).getTime();

    if (s1Start < s2End && s2Start < s1End) {
      const overlapHours = Math.round((Math.min(s1End, s2End) - Math.max(s1Start, s2Start)) / 3600000);
      return {
        id: `conflict-time-${s1.id}-${s2.id}`,
        type: 'time_overlap',
        severity: 'error',
        scheduleId: s1.id,
        relatedScheduleId: s2.id,
        message: `时间冲突: 与另一艘船舶泊位占用时间重叠${overlapHours}小时`,
        suggestedAction: `建议延后${overlapHours}小时靠泊，或更换至其他可用泊位`,
      };
    }
    return null;
  }

  function checkDraftLimit(
    schedule: BerthSchedule,
    ship: Ship,
    berth: Berth,
  ): ScheduleConflict | null {
    if (ship.draft > berth.maxDraft) {
      const exceed = (ship.draft - berth.maxDraft).toFixed(1);
      return {
        id: `conflict-draft-${schedule.id}`,
        type: 'draft_exceed',
        severity: 'error',
        scheduleId: schedule.id,
        message: `吃水超限: 船舶吃水(${ship.draft}m)超过泊位最大吃水(${berth.maxDraft}m)${exceed}m`,
        suggestedAction: `建议更换至吃水不小于${ship.draft}m的泊位，或等待下一可用潮窗`,
      };
    }
    if (ship.draft > berth.maxDraft * 0.95) {
      return {
        id: `conflict-draft-warn-${schedule.id}`,
        type: 'draft_exceed',
        severity: 'warning',
        scheduleId: schedule.id,
        message: `吃水接近限制: 船舶吃水(${ship.draft}m)接近泊位上限(${berth.maxDraft}m)`,
        suggestedAction: `建议调整靠泊时间至高潮时段，或更换至更大吃水泊位`,
      };
    }
    return null;
  }

  function checkLengthLimit(
    schedule: BerthSchedule,
    ship: Ship,
    berth: Berth,
  ): ScheduleConflict | null {
    if (ship.length > berth.length) {
      const exceed = Math.round(ship.length - berth.length);
      return {
        id: `conflict-length-${schedule.id}`,
        type: 'length_exceed',
        severity: 'error',
        scheduleId: schedule.id,
        message: `船长超限: 船舶长度(${ship.length}m)超过泊位长度(${berth.length}m)${exceed}m`,
        suggestedAction: `建议更换至长度不小于${ship.length}m的泊位`,
      };
    }
    return null;
  }

  function checkCargoMatch(
    schedule: BerthSchedule,
    ship: Ship,
    berth: Berth,
  ): ScheduleConflict | null {
    if (!berth.allowedCargo.includes(ship.cargoType)) {
      return {
        id: `conflict-cargo-${schedule.id}`,
        type: 'cargo_mismatch',
        severity: 'error',
        scheduleId: schedule.id,
        message: `货物不匹配: 泊位不支持 ${ship.cargoType} 类型货物作业`,
        suggestedAction: `建议更换至支持${ship.cargoType}货种的专业泊位`,
      };
    }
    return null;
  }

  function checkTideWindow(
    schedule: BerthSchedule,
    ship: Ship,
    berth: Berth,
    tides: TideRecord[],
  ): ScheduleConflict | null {
    const requiredDepth = ship.draft + 0.5;
    const eta = new Date(schedule.eta);
    const etd = new Date(schedule.etd);

    const relevantTides = tides.filter(
      (t) => t.time >= eta && t.time <= etd,
    );

    if (relevantTides.length === 0) return null;

    const minHeight = Math.min(...relevantTides.map((t) => t.height));
    const availableDepth = minHeight + (berth.maxDraft - 4);

    if (availableDepth < requiredDepth) {
      const deficit = (requiredDepth - availableDepth).toFixed(1);
      return {
        id: `conflict-tide-${schedule.id}`,
        type: 'tide_window',
        severity: 'warning',
        scheduleId: schedule.id,
        message: `潮汐窗口告警: 低潮时段水深(${availableDepth.toFixed(1)}m)可能不足，缺${deficit}m`,
        suggestedAction: `建议等待下一可用潮窗，或调整作业时间避开低潮时段`,
      };
    }
    return null;
  }

  function checkBerthMaintenance(
    schedule: BerthSchedule,
    berth: Berth,
  ): ScheduleConflict | null {
    if (berth.status !== 'maintenance') return null;

    const sStart = new Date(schedule.eta).getTime();
    const sEnd = new Date(schedule.etd).getTime();
    const now = Date.now();
    const maintenanceEnd = now + 48 * 3600000;

    if (sStart < maintenanceEnd && sEnd > now) {
      const conflictHours = Math.round((Math.min(sEnd, maintenanceEnd) - Math.max(sStart, now)) / 3600000);
      return {
        id: `conflict-maintenance-${schedule.id}`,
        type: 'berth_maintenance',
        severity: 'error',
        scheduleId: schedule.id,
        message: `泊位维修冲突: ${berth.name}正在维修中，冲突时长约${conflictHours}小时`,
        suggestedAction: `建议更换至其他可用泊位，或延后48小时待维修完成后靠泊`,
      };
    }
    return null;
  }

  function checkBufferTime(
    s1: BerthSchedule,
    s2: BerthSchedule,
    bufferHours = 2,
  ): ScheduleConflict | null {
    if (s1.berthId !== s2.berthId) return null;

    const s1End = new Date(s1.etd).getTime();
    const s2Start = new Date(s2.eta).getTime();
    const s2End = new Date(s2.etd).getTime();
    const s1Start = new Date(s1.eta).getTime();

    const bufferMs = bufferHours * 3600000;

    if (s2Start > s1End && s2Start - s1End < bufferMs) {
      const deficit = Math.round((bufferMs - (s2Start - s1End)) / 3600000);
      return {
        id: `conflict-buffer-${s1.id}-${s2.id}`,
        type: 'buffer_time_insufficient',
        severity: 'warning',
        scheduleId: s2.id,
        relatedScheduleId: s1.id,
        message: `缓冲时间不足: 两船靠离泊间隔仅${Math.round((s2Start - s1End) / 3600000)}小时，建议${bufferHours}小时`,
        suggestedAction: `建议延后${deficit}小时靠泊，确保充足的靠离泊缓冲时间`,
      };
    }

    if (s1Start > s2End && s1Start - s2End < bufferMs) {
      const deficit = Math.round((bufferMs - (s1Start - s2End)) / 3600000);
      return {
        id: `conflict-buffer-${s2.id}-${s1.id}`,
        type: 'buffer_time_insufficient',
        severity: 'warning',
        scheduleId: s1.id,
        relatedScheduleId: s2.id,
        message: `缓冲时间不足: 两船靠离泊间隔仅${Math.round((s1Start - s2End) / 3600000)}小时，建议${bufferHours}小时`,
        suggestedAction: `建议延后${deficit}小时靠泊，确保充足的靠离泊缓冲时间`,
      };
    }

    return null;
  }

  function checkTeamConflict(
    s1: BerthSchedule,
    s2: BerthSchedule,
  ): ScheduleConflict | null {
    if (!s1.operationTeam || !s2.operationTeam) return null;
    if (s1.operationTeam !== s2.operationTeam) return null;

    const s1Start = new Date(s1.eta).getTime();
    const s1End = new Date(s1.etd).getTime();
    const s2Start = new Date(s2.eta).getTime();
    const s2End = new Date(s2.etd).getTime();

    if (s1Start < s2End && s2Start < s1End) {
      const overlapHours = Math.round((Math.min(s1End, s2End) - Math.max(s1Start, s2Start)) / 3600000);
      return {
        id: `conflict-team-${s1.id}-${s2.id}`,
        type: 'team_conflict',
        severity: 'error',
        scheduleId: s1.id,
        relatedScheduleId: s2.id,
        message: `作业班组冲突: ${s1.operationTeam}同时被两艘船舶占用，冲突${overlapHours}小时`,
        suggestedAction: `建议为其中一艘船舶更换作业班组，或调整作业时间错开`,
      };
    }
    return null;
  }

  const DANGEROUS_CARGO_TYPES: CargoType[] = ['liquid'];
  const ISOLATION_HOURS = 4;

  function checkDangerousCargoIsolation(
    s1: BerthSchedule,
    s2: BerthSchedule,
    ships: Ship[],
  ): ScheduleConflict | null {
    if (s1.berthId !== s2.berthId) return null;

    const ship1 = ships.find((s) => s.id === s1.shipId);
    const ship2 = ships.find((s) => s.id === s2.shipId);
    if (!ship1 || !ship2) return null;

    const isDangerous1 = DANGEROUS_CARGO_TYPES.includes(ship1.cargoType);
    const isDangerous2 = DANGEROUS_CARGO_TYPES.includes(ship2.cargoType);

    if (!isDangerous1 && !isDangerous2) return null;

    const s1End = new Date(s1.etd).getTime();
    const s2Start = new Date(s2.eta).getTime();
    const s2End = new Date(s2.etd).getTime();
    const s1Start = new Date(s1.eta).getTime();
    const isolationMs = ISOLATION_HOURS * 3600000;

    if (isDangerous1 && isDangerous2) {
      if (s2Start > s1End && s2Start - s1End < isolationMs) {
        const deficit = Math.round((isolationMs - (s2Start - s1End)) / 3600000);
        return {
          id: `conflict-dangerous-${s1.id}-${s2.id}`,
          type: 'dangerous_cargo_isolation',
          severity: 'error',
          scheduleId: s2.id,
          relatedScheduleId: s1.id,
          message: `危险货种隔离不足: 连续危险货种作业间隔仅${Math.round((s2Start - s1End) / 3600000)}小时，需${ISOLATION_HOURS}小时`,
          suggestedAction: `建议延后${deficit}小时靠泊，或更换至其他泊位作业`,
        };
      }
      if (s1Start > s2End && s1Start - s2End < isolationMs) {
        const deficit = Math.round((isolationMs - (s1Start - s2End)) / 3600000);
        return {
          id: `conflict-dangerous-${s2.id}-${s1.id}`,
          type: 'dangerous_cargo_isolation',
          severity: 'error',
          scheduleId: s1.id,
          relatedScheduleId: s2.id,
          message: `危险货种隔离不足: 连续危险货种作业间隔仅${Math.round((s1Start - s2End) / 3600000)}小时，需${ISOLATION_HOURS}小时`,
          suggestedAction: `建议延后${deficit}小时靠泊，或更换至其他泊位作业`,
        };
      }
    }

    return null;
  }

  const NIGHT_START_HOUR = 22;
  const NIGHT_END_HOUR = 6;
  const NIGHT_OPERATION_ALLOWED = false;

  function checkNightOperation(
    schedule: BerthSchedule,
    ship: Ship,
  ): ScheduleConflict | null {
    if (NIGHT_OPERATION_ALLOWED) return null;

    const isDangerous = DANGEROUS_CARGO_TYPES.includes(ship.cargoType);
    if (!isDangerous) return null;

    const eta = new Date(schedule.eta);
    const etd = new Date(schedule.etd);

    const current = new Date(eta);
    let hasNightConflict = false;
    let conflictHours = 0;

    while (current < etd) {
      const hour = current.getHours();
      if (hour >= NIGHT_START_HOUR || hour < NIGHT_END_HOUR) {
        hasNightConflict = true;
        conflictHours++;
      }
      current.setHours(current.getHours() + 1);
    }

    if (hasNightConflict) {
      return {
        id: `conflict-night-${schedule.id}`,
        type: 'night_operation_limit',
        severity: 'error',
        scheduleId: schedule.id,
        message: `夜间作业限制: 危险货种船舶禁止夜间作业，冲突时长约${conflictHours}小时`,
        suggestedAction: `建议调整作业时间至${NIGHT_END_HOUR}:00-${NIGHT_START_HOUR}:00之间，或更换至支持夜间作业的泊位`,
      };
    }

    return null;
  }

  function hasConflicts(scheduleId: string, conflicts: ScheduleConflict[]) {
    return conflicts.filter((c) => c.scheduleId === scheduleId);
  }

  function checkMaintenancePeriodOverlap(
    schedule: BerthSchedule,
    berth: Berth,
    maintenancePeriods: BerthMaintenancePeriod[],
    berths: Berth[] = [],
  ): ScheduleConflict | null {
    const sStart = new Date(schedule.eta).getTime();
    const sEnd = new Date(schedule.etd).getTime();

    for (const m of maintenancePeriods) {
      const affectedBerthIds = getAffectedBerthIdsForMaintenance(m, berths.length > 0 ? berths : [berth]);
      if (!affectedBerthIds.includes(schedule.berthId)) continue;
      const mStart = new Date(m.startTime).getTime();
      const mEnd = new Date(m.endTime).getTime();
      if (sStart < mEnd && sEnd > mStart) {
        const overlapHours = Math.round((Math.min(sEnd, mEnd) - Math.max(sStart, mStart)) / 3600000);
        const affectedBerths = affectedBerthIds
          .map((id) => berths.find((b) => b.id === id)?.name || id)
          .join('、');
        return {
          id: `conflict-maint-period-${schedule.id}-${m.id}`,
          type: 'berth_maintenance',
          severity: 'error',
          scheduleId: schedule.id,
          message: `泊位维护冲突: ${MAINTENANCE_TYPE_LABELS[m.maintenanceType]} [影响:${MAINTENANCE_IMPACT_SCOPE_LABELS[m.impactScope]} - ${affectedBerths}]（${new Date(m.startTime).toLocaleString('zh-CN')} ~ ${new Date(m.endTime).toLocaleString('zh-CN')}），重叠${overlapHours}小时`,
          suggestedAction: `建议更换至未受影响的泊位，或调整作业时间避开维护时段`,
        };
      }
    }
    return null;
  }

  function checkTagEarliestOperationTime(
    schedule: BerthSchedule,
    ship: Ship,
  ): ScheduleConflict | null {
    const earliest = ship.guaranteeRequirements?.earliestOperationTime;
    if (!earliest) return null;

    const [earliestHour, earliestMinute] = earliest.split(':').map(Number);
    if (isNaN(earliestHour) || isNaN(earliestMinute)) return null;

    const eta = new Date(schedule.eta);
    const etaMinutes = eta.getHours() * 60 + eta.getMinutes();
    const earliestMinutes = earliestHour * 60 + earliestMinute;

    if (etaMinutes < earliestMinutes) {
      const diffMinutes = earliestMinutes - etaMinutes;
      const diffHours = Math.floor(diffMinutes / 60);
      const diffMins = diffMinutes % 60;
      return {
        id: `conflict-tag-earliest-${schedule.id}`,
        type: 'tag_earliest_time',
        severity: 'error',
        scheduleId: schedule.id,
        message: `最早作业时间限制: 该船(${SHIP_TAG_LABELS.key_customer || ship.name})最早可作业时间为${earliest}，当前靠泊时间${eta.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}提前了${diffHours > 0 ? diffHours + '小时' : ''}${diffMins > 0 ? diffMins + '分钟' : ''}`,
        suggestedAction: `建议将靠泊时间调整至${earliest}之后`,
      };
    }
    return null;
  }

  function checkTagForbiddenBerth(
    schedule: BerthSchedule,
    ship: Ship,
    berth: Berth,
  ): ScheduleConflict | null {
    const forbidden = ship.guaranteeRequirements?.forbiddenBerthCategories;
    if (!forbidden || forbidden.length === 0) return null;

    const berthCategory = BERTH_CATEGORY_MAP[berth.allowedCargo[0]];
    if (!berthCategory) return null;

    if (forbidden.includes(berthCategory)) {
      return {
        id: `conflict-tag-forbidden-berth-${schedule.id}`,
        type: 'tag_forbidden_berth',
        severity: 'error',
        scheduleId: schedule.id,
        message: `泊位类型禁止: 该船被禁止分配至【${FORBIDDEN_BERTH_CATEGORY_LABELS[berthCategory]}】泊位，当前泊位${berth.name}类型不匹配`,
        suggestedAction: `建议更换至非${forbidden.map((c) => FORBIDDEN_BERTH_CATEGORY_LABELS[c]).join('、')}类型的泊位`,
      };
    }
    return null;
  }

  function checkTagMissingRemarks(
    schedule: BerthSchedule,
    ship: Ship,
  ): ScheduleConflict | null {
    if (!ship.guaranteeRequirements?.requiresRemarks) return null;
    if (schedule.remarks && schedule.remarks.trim().length > 0) return null;

    return {
      id: `conflict-tag-missing-remarks-${schedule.id}`,
      type: 'tag_missing_remarks',
      severity: 'warning',
      scheduleId: schedule.id,
      message: `缺少备注信息: 该船舶要求必须填写作业备注，但当前调度计划备注为空`,
      suggestedAction: `建议在调度计划中补充作业备注，说明特殊保障要求`,
    };
  }

  function checkTagNightRestricted(
    schedule: BerthSchedule,
    ship: Ship,
  ): ScheduleConflict | null {
    if (!ship.tags?.includes('night_restricted')) return null;

    const eta = new Date(schedule.eta);
    const etd = new Date(schedule.etd);

    const current = new Date(eta);
    let conflictHours = 0;

    while (current < etd) {
      const hour = current.getHours();
      if (hour >= NIGHT_START_HOUR || hour < NIGHT_END_HOUR) {
        conflictHours++;
      }
      current.setHours(current.getHours() + 1);
    }

    if (conflictHours > 0) {
      return {
        id: `conflict-tag-night-${schedule.id}`,
        type: 'tag_night_restricted',
        severity: 'error',
        scheduleId: schedule.id,
        message: `夜间作业限制【${SHIP_TAG_LABELS.night_restricted}】: 该船禁止夜间作业，冲突时长约${conflictHours}小时`,
        suggestedAction: `建议调整作业时间至${NIGHT_END_HOUR}:00-${NIGHT_START_HOUR}:00之间的白天时段`,
      };
    }
    return null;
  }

  function checkTagPriorityBerth(
    schedule: BerthSchedule,
    ship: Ship,
    allSchedules: BerthSchedule[],
    allShips: Ship[],
  ): ScheduleConflict | null {
    if (!ship.guaranteeRequirements?.mustPriorityBerth) return null;

    const sameBerthSchedules = allSchedules.filter(
      (s) => s.berthId === schedule.berthId && s.id !== schedule.id,
    );

    for (const other of sameBerthSchedules) {
      const otherShip = allShips.find((s) => s.id === other.shipId);
      if (!otherShip) continue;

      const otherPriority = otherShip.guaranteeRequirements?.mustPriorityBerth;
      const otherEta = new Date(other.eta).getTime();
      const scheduleEta = new Date(schedule.eta).getTime();

      if (!otherPriority && otherEta < scheduleEta) {
        const diffHours = Math.round((scheduleEta - otherEta) / 3600000);
        return {
          id: `conflict-tag-priority-${schedule.id}-${other.id}`,
          type: 'tag_priority_berth',
          severity: 'warning',
          scheduleId: schedule.id,
          relatedScheduleId: other.id,
          message: `优先靠泊要求: 该船【${SHIP_TAG_LABELS.key_customer}】要求优先靠泊，但当前排在普通船舶${otherShip.name}之后${diffHours}小时`,
          suggestedAction: `建议将该船调整至普通船舶之前靠泊，或为普通船舶更换泊位`,
        };
      }
    }
    return null;
  }

  return {
    detectAllConflicts,
    checkTimeOverlap,
    checkDraftLimit,
    checkLengthLimit,
    checkCargoMatch,
    checkTideWindow,
    checkBerthMaintenance,
    checkBufferTime,
    checkTeamConflict,
    checkDangerousCargoIsolation,
    checkNightOperation,
    checkMaintenancePeriodOverlap,
    checkTagEarliestOperationTime,
    checkTagForbiddenBerth,
    checkTagMissingRemarks,
    checkTagNightRestricted,
    checkTagPriorityBerth,
    hasConflicts,
  };
}
