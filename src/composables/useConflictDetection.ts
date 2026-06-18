import type {
  BerthSchedule,
  Ship,
  Berth,
  ScheduleConflict,
  TideRecord,
} from '../types';

export function useConflictDetection() {
  function detectAllConflicts(
    schedules: BerthSchedule[],
    ships: Ship[],
    berths: Berth[],
    tides: TideRecord[],
  ): ScheduleConflict[] {
    const conflicts: ScheduleConflict[] = [];

    for (let i = 0; i < schedules.length; i++) {
      for (let j = i + 1; j < schedules.length; j++) {
        const timeConflict = checkTimeOverlap(schedules[i], schedules[j]);
        if (timeConflict) {
          conflicts.push(timeConflict);
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
      }
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
      return {
        id: `conflict-time-${s1.id}-${s2.id}`,
        type: 'time_overlap',
        severity: 'error',
        scheduleId: s1.id,
        relatedScheduleId: s2.id,
        message: `时间冲突: 与另一艘船舶泊位占用时间重叠`,
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
      return {
        id: `conflict-draft-${schedule.id}`,
        type: 'draft_exceed',
        severity: 'error',
        scheduleId: schedule.id,
        message: `吃水超限: 船舶吃水(${ship.draft}m)超过泊位最大吃水(${berth.maxDraft}m)`,
      };
    }
    if (ship.draft > berth.maxDraft * 0.95) {
      return {
        id: `conflict-draft-warn-${schedule.id}`,
        type: 'draft_exceed',
        severity: 'warning',
        scheduleId: schedule.id,
        message: `吃水接近限制: 船舶吃水(${ship.draft}m)接近泊位上限(${berth.maxDraft}m)`,
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
      return {
        id: `conflict-length-${schedule.id}`,
        type: 'length_exceed',
        severity: 'error',
        scheduleId: schedule.id,
        message: `船长超限: 船舶长度(${ship.length}m)超过泊位长度(${berth.length}m)`,
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
      return {
        id: `conflict-tide-${schedule.id}`,
        type: 'tide_window',
        severity: 'warning',
        scheduleId: schedule.id,
        message: `潮汐窗口告警: 低潮时段水深(${availableDepth.toFixed(1)}m)可能不足`,
      };
    }
    return null;
  }

  function hasConflicts(scheduleId: string, conflicts: ScheduleConflict[]) {
    return conflicts.filter((c) => c.scheduleId === scheduleId);
  }

  return {
    detectAllConflicts,
    checkTimeOverlap,
    checkDraftLimit,
    checkLengthLimit,
    checkCargoMatch,
    checkTideWindow,
    hasConflicts,
  };
}
