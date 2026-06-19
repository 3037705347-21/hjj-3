import type {
  BerthSchedule,
  ScheduleLog,
  ScheduleConflict,
  Ship,
  Berth,
  ReportFilterCriteria,
  CoreMetrics,
  AbnormalReasonDistribution,
  AbnormalReasonCategory,
  TeamEfficiency,
  BerthPerformance,
  KeyShipRecord,
  DailyReportData,
  WeeklyReportData,
  MonthlyReportData,
  MetricTrend,
  TrendDataPoint,
} from '../types';
import { ABNORMAL_REASON_CATEGORY_LABELS } from '../types';
import { historicalData, mockShips, mockBerths } from '../data/mock';
import type { HistoricalSchedule, HistoricalLog, HistoricalConflict } from '../data/mock';

type AllSchedule = BerthSchedule | HistoricalSchedule;
type AllLog = ScheduleLog | HistoricalLog;
type AllConflict = ScheduleConflict | HistoricalConflict;

export const CORE_METRIC_LABELS: Record<keyof CoreMetrics, string> = {
  shipsInPort: '在港船数',
  shipsWaiting: '待泊船舶',
  avgWaitingMinutes: '平均待泊时长',
  berthUtilization: '泊位利用率',
  planFulfillmentRate: '计划兑现率',
  conflictCount: '冲突次数',
  todayOperations: '作业船次',
  todayDeparted: '离泊船次',
  turnoverRate: '泊位周转率',
  criticalShipsGuaranteed: '重点保障数',
  criticalShipsTotal: '重点船舶总数',
};

export const CORE_METRIC_UNITS: Partial<Record<keyof CoreMetrics, string>> = {
  avgWaitingMinutes: 'min',
  berthUtilization: '%',
  planFulfillmentRate: '%',
  turnoverRate: '%',
};

const ABNORMAL_CATEGORY_KEYS: AbnormalReasonCategory[] = [
  'weather', 'equipment_failure', 'tide_window', 'ship_delay',
  'labor_shortage', 'cargo_issue', 'berth_maintenance', 'other',
];

export function startOfDay(d: Date): Date {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function endOfDay(d: Date): Date {
  const date = new Date(d);
  date.setHours(23, 59, 59, 999);
  return date;
}

export function startOfWeek(d: Date): Date {
  const date = startOfDay(d);
  const day = date.getDay();
  const diff = day === 0 ? 6 : day - 1;
  date.setDate(date.getDate() - diff);
  return date;
}

export function endOfWeek(d: Date): Date {
  const date = startOfWeek(d);
  date.setDate(date.getDate() + 6);
  return endOfDay(date);
}

export function startOfMonth(d: Date): Date {
  const date = new Date(d);
  date.setDate(1);
  return startOfDay(date);
}

export function endOfMonth(d: Date): Date {
  const date = new Date(d);
  date.setMonth(date.getMonth() + 1);
  date.setDate(0);
  return endOfDay(date);
}

export function isInRange(date: Date, start: Date, end: Date): boolean {
  const t = date.getTime();
  return t >= start.getTime() && t <= end.getTime();
}

export function getShipById(id: string): Ship | undefined {
  return mockShips.find((s) => s.id === id);
}

export function getBerthById(id: string): Berth | undefined {
  return mockBerths.find((b) => b.id === id);
}

function getAllSchedules(): AllSchedule[] {
  const current = useScheduleStoreInternal();
  return [...current.schedules, ...historicalData.schedules];
}

function getAllLogs(): AllLog[] {
  const current = useScheduleStoreInternal();
  return [...current.logs, ...historicalData.logs];
}

function getAllConflicts(): AllConflict[] {
  const current = useScheduleStoreInternal();
  return [...current.conflicts, ...historicalData.conflicts];
}

import { useScheduleStore } from '../stores/schedule';

function useScheduleStoreInternal() {
  try {
    return useScheduleStore();
  } catch {
    return {
      schedules: [] as BerthSchedule[],
      logs: [] as ScheduleLog[],
      conflicts: [] as ScheduleConflict[],
    };
  }
}

export function filterSchedules(
  schedules: AllSchedule[],
  criteria: Partial<ReportFilterCriteria>,
  rangeStart: Date,
  rangeEnd: Date,
): AllSchedule[] {
  return schedules.filter((s) => {
    const scheduleDate = s.eta;
    if (!isInRange(scheduleDate, rangeStart, rangeEnd)) return false;

    if (criteria.berthIds?.length && !criteria.berthIds.includes(s.berthId)) return false;

    if (criteria.operationTeams?.length && s.operationTeam && !criteria.operationTeams.includes(s.operationTeam)) {
      return false;
    }

    const ship = getShipById(s.shipId);
    if (criteria.cargoTypes?.length && ship && !criteria.cargoTypes.includes(ship.cargoType)) return false;
    if (criteria.priorities?.length && ship && !criteria.priorities.includes(ship.priority)) return false;

    return true;
  });
}

export function filterLogs(logs: AllLog[], rangeStart: Date, rangeEnd: Date): AllLog[] {
  return logs.filter((l) => isInRange(new Date(l.timestamp), rangeStart, rangeEnd));
}

export function filterConflicts(
  conflicts: AllConflict[],
  schedules: AllSchedule[],
): AllConflict[] {
  const scheduleIds = new Set(schedules.map((s) => s.id));
  return conflicts.filter((c) => scheduleIds.has(c.scheduleId));
}

export function calculateCoreMetrics(
  schedules: AllSchedule[],
  conflicts: AllConflict[],
  rangeStart: Date,
  rangeEnd: Date,
): CoreMetrics {
  const dayMs = 24 * 3600 * 1000;
  const rangeDays = Math.max(1, Math.ceil((rangeEnd.getTime() - rangeStart.getTime()) / dayMs));
  const berthCount = mockBerths.length || 1;

  const inPortStatuses: AllSchedule['status'][] = ['berthing', 'loading', 'unloading'];
  const waitingStatuses: AllSchedule['status'][] = ['anchored', 'approaching'];

  const shipsInPort = schedules.filter((s) => inPortStatuses.includes(s.status)).length;
  const shipsWaiting = schedules.filter((s) => waitingStatuses.includes(s.status)).length;

  let totalWaitingMinutes = 0;
  let waitingCount = 0;
  schedules.forEach((s) => {
    if (waitingStatuses.includes(s.status) || s.actualBerthing) {
      const eta = new Date(s.eta);
      const actual = s.actualBerthing ? new Date(s.actualBerthing) : new Date();
      if (actual > eta) {
        totalWaitingMinutes += (actual.getTime() - eta.getTime()) / 60000;
        waitingCount++;
      }
    }
  });
  const avgWaitingMinutes = waitingCount > 0 ? Math.round(totalWaitingMinutes / waitingCount) : 0;

  let totalOccupiedHours = 0;
  const totalPossibleHours = berthCount * rangeDays * 24;
  schedules.forEach((s) => {
    const start = Math.max(rangeStart.getTime(), new Date(s.eta).getTime());
    const endSched = s.actualDeparture ? new Date(s.actualDeparture) : new Date(s.etd);
    const end = Math.min(rangeEnd.getTime(), endSched.getTime());
    if (end > start) {
      totalOccupiedHours += (end - start) / 3600000;
    }
  });
  const berthUtilization = Math.min(100, Math.round((totalOccupiedHours / totalPossibleHours) * 100));

  let fulfilled = 0;
  let totalDeparted = 0;
  schedules.forEach((s) => {
    if (s.status === 'departed' && s.actualDeparture) {
      totalDeparted++;
      const etd = new Date(s.etd).getTime();
      const actual = new Date(s.actualDeparture).getTime();
      const threshold = (s.delayThresholdMinutes ?? 30) * 60000;
      if (actual <= etd + threshold) {
        fulfilled++;
      }
    }
  });
  const planFulfillmentRate = totalDeparted > 0 ? Math.round((fulfilled / totalDeparted) * 100) : 100;

  const conflictCount = conflicts.length;
  const todayOperations = schedules.length;
  const todayDeparted = totalDeparted;

  const turnoverRate = berthCount > 0
    ? Math.min(100, Math.round((totalDeparted / (berthCount * rangeDays)) * 100))
    : 0;

  let criticalTotal = 0;
  let criticalGuaranteed = 0;
  schedules.forEach((s) => {
    const ship = getShipById(s.shipId);
    if (ship && (ship.priority === 'critical' || ship.priority === 'high')) {
      criticalTotal++;
      if (s.status === 'departed' && s.actualDeparture) {
        const etd = new Date(s.etd).getTime();
        const actual = new Date(s.actualDeparture).getTime();
        const threshold = (s.delayThresholdMinutes ?? 30) * 60000;
        if (actual <= etd + threshold) {
          criticalGuaranteed++;
        }
      } else if (s.status !== 'departed') {
        criticalGuaranteed++;
      }
    }
  });

  return {
    shipsInPort,
    shipsWaiting,
    avgWaitingMinutes,
    berthUtilization,
    planFulfillmentRate,
    conflictCount,
    todayOperations,
    todayDeparted,
    turnoverRate,
    criticalShipsGuaranteed: criticalGuaranteed,
    criticalShipsTotal: criticalTotal,
  };
}

export function calculateAbnormalDistribution(
  schedules: AllSchedule[],
  logs: AllLog[],
  conflicts: AllConflict[],
): AbnormalReasonDistribution[] {
  const counts: Record<AbnormalReasonCategory, number> = {
    weather: 0, equipment_failure: 0, tide_window: 0, ship_delay: 0,
    labor_shortage: 0, cargo_issue: 0, berth_maintenance: 0, other: 0,
  };

  schedules.forEach((s) => {
    if (s.delayReason) {
      const reason = s.delayReason;
      if (reason.includes('天气') || reason.includes('风') || reason.includes('雨') || reason.includes('台风')) counts.weather++;
      else if (reason.includes('设备') || reason.includes('故障') || reason.includes('维修')) counts.equipment_failure++;
      else if (reason.includes('潮汐') || reason.includes('潮位')) counts.tide_window++;
      else if (reason.includes('到港') || reason.includes('船期')) counts.ship_delay++;
      else if (reason.includes('班组') || reason.includes('人员') || reason.includes('人力')) counts.labor_shortage++;
      else if (reason.includes('货') || reason.includes('货物')) counts.cargo_issue++;
      else if (reason.includes('泊位')) counts.berth_maintenance++;
      else counts.other++;
    }
  });

  conflicts.forEach((c) => {
    switch (c.type) {
      case 'tide_window': counts.tide_window++; break;
      case 'berth_maintenance': counts.berth_maintenance++; break;
      case 'team_conflict': counts.labor_shortage++; break;
      case 'cargo_mismatch': counts.cargo_issue++; break;
      default: counts.other++;
    }
  });

  logs.forEach((l) => {
    if (l.type === 'warning' || l.type === 'conflict') {
      const desc = l.description;
      if (desc.includes('天气') || desc.includes('台风')) counts.weather++;
      else if (desc.includes('设备') || desc.includes('故障')) counts.equipment_failure++;
      else if (desc.includes('潮汐')) counts.tide_window++;
      else if (desc.includes('到港')) counts.ship_delay++;
    }
  });

  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;

  return ABNORMAL_CATEGORY_KEYS.map((cat) => ({
    category: cat,
    count: counts[cat],
    percentage: Math.round((counts[cat] / total) * 100),
  })).sort((a, b) => b.count - a.count);
}

export function calculateTeamEfficiency(schedules: AllSchedule[]): TeamEfficiency[] {
  const teamMap: Record<string, {
    completed: number; cargo: number; totalHours: number; delayed: number; total: number;
  }> = {};

  schedules.forEach((s) => {
    const team = s.operationTeam || '未分配';
    if (!teamMap[team]) {
      teamMap[team] = { completed: 0, cargo: 0, totalHours: 0, delayed: 0, total: 0 };
    }
    teamMap[team].total++;

    if (s.status === 'departed') {
      teamMap[team].completed++;
      if (s.cargoCompleted) teamMap[team].cargo += s.cargoCompleted;

      const start = s.actualBerthing ? new Date(s.actualBerthing) : new Date(s.eta);
      const end = s.actualDeparture ? new Date(s.actualDeparture) : new Date(s.etd);
      teamMap[team].totalHours += (end.getTime() - start.getTime()) / 3600000;

      const etd = new Date(s.etd).getTime();
      const actual = s.actualDeparture ? new Date(s.actualDeparture).getTime() : etd;
      const threshold = (s.delayThresholdMinutes ?? 30) * 60000;
      if (actual > etd + threshold) teamMap[team].delayed++;
    }
  });

  return Object.entries(teamMap).map(([teamName, data]) => {
    const completed = data.completed;
    const avgOperationHours = completed > 0 ? Math.round((data.totalHours / completed) * 10) / 10 : 0;
    const delayRate = data.total > 0 ? Math.round((data.delayed / data.total) * 100) : 0;
    const cargoScore = Math.min(100, (data.cargo / 1000000) * 50);
    const speedScore = completed > 0 ? Math.max(0, Math.min(30, 30 - (avgOperationHours - 18))) : 0;
    const onTimeScore = Math.max(0, Math.min(20, 20 - delayRate));
    const efficiencyScore = Math.round(cargoScore + speedScore + onTimeScore);

    return {
      teamName,
      completedOperations: completed,
      totalCargoHandled: data.cargo,
      avgOperationHours,
      delayRate,
      efficiencyScore,
    };
  }).sort((a, b) => b.efficiencyScore - a.efficiencyScore);
}

export function calculateBerthPerformance(
  schedules: AllSchedule[],
  conflicts: AllConflict[],
): BerthPerformance[] {
  return mockBerths.map((berth) => {
    const berthSchedules = schedules.filter((s) => s.berthId === berth.id);
    const berthConflicts = conflicts.filter((c) => {
      const sched = schedules.find((s) => s.id === c.scheduleId);
      return sched && sched.berthId === berth.id;
    });

    const completed = berthSchedules.filter((s) => s.status === 'departed');
    let totalTurnaround = 0;
    completed.forEach((s) => {
      const start = s.actualBerthing ? new Date(s.actualBerthing) : new Date(s.eta);
      const end = s.actualDeparture ? new Date(s.actualDeparture) : new Date(s.etd);
      totalTurnaround += (end.getTime() - start.getTime()) / 3600000;
    });

    const rangeDays = 30;
    const totalHours = rangeDays * 24;
    let occupiedHours = 0;
    berthSchedules.forEach((s) => {
      const start = new Date(s.eta).getTime();
      const end = s.actualDeparture ? new Date(s.actualDeparture).getTime() : new Date(s.etd).getTime();
      occupiedHours += Math.max(0, (end - start) / 3600000);
    });

    return {
      berthId: berth.id,
      berthName: berth.name,
      utilization: Math.min(100, Math.round((occupiedHours / totalHours) * 100)),
      operationsCount: berthSchedules.length,
      avgTurnaroundHours: completed.length > 0 ? Math.round((totalTurnaround / completed.length) * 10) / 10 : 0,
      conflictCount: berthConflicts.length,
    };
  }).sort((a, b) => b.utilization - a.utilization);
}

export function calculateKeyShips(schedules: AllSchedule[]): KeyShipRecord[] {
  return schedules
    .filter((s) => {
      const ship = getShipById(s.shipId);
      return ship && (ship.priority === 'critical' || ship.priority === 'high');
    })
    .map((s) => {
      const ship = getShipById(s.shipId)!;
      const berth = getBerthById(s.berthId);
      const etd = new Date(s.etd);
      const actualDep = s.actualDeparture ? new Date(s.actualDeparture) : null;
      const threshold = (s.delayThresholdMinutes ?? 30) * 60000;
      const onTime = actualDep ? actualDep.getTime() <= etd.getTime() + threshold : true;

      let guaranteeStatus: KeyShipRecord['guaranteeStatus'] = 'pending';
      if (s.status === 'departed') {
        guaranteeStatus = onTime ? 'guaranteed' : 'delayed';
      } else if (s.actualBerthing) {
        const eta = new Date(s.eta);
        const actual = new Date(s.actualBerthing);
        guaranteeStatus = actual.getTime() <= eta.getTime() + threshold ? 'guaranteed' : 'delayed';
      }

      return {
        scheduleId: s.id,
        shipId: ship.id,
        shipName: ship.name,
        priority: ship.priority,
        berthName: berth?.name || '未分配',
        plannedBerthing: new Date(s.eta),
        actualBerthing: s.actualBerthing ? new Date(s.actualBerthing) : undefined,
        plannedDeparture: etd,
        actualDeparture: actualDep || undefined,
        onTime,
        guaranteeStatus,
        remarks: s.delayReason || s.remarks,
      };
    })
    .sort((a, b) => a.plannedBerthing.getTime() - b.plannedBerthing.getTime());
}

export function calculateDailyReport(
  date: Date,
  criteria: Partial<ReportFilterCriteria> = {},
): DailyReportData {
  const rangeStart = startOfDay(date);
  const rangeEnd = endOfDay(date);

  const allSchedules = getAllSchedules();
  const allLogs = getAllLogs();
  const allConflicts = getAllConflicts();

  const filteredSchedules = filterSchedules(allSchedules, criteria, rangeStart, rangeEnd);
  const filteredLogs = filterLogs(allLogs, rangeStart, rangeEnd);
  const filteredConflicts = filterConflicts(allConflicts, filteredSchedules);

  return {
    date,
    metrics: calculateCoreMetrics(filteredSchedules, filteredConflicts, rangeStart, rangeEnd),
    abnormalReasons: calculateAbnormalDistribution(filteredSchedules, filteredLogs, filteredConflicts),
    teamEfficiencies: calculateTeamEfficiency(filteredSchedules),
    berthPerformances: calculateBerthPerformance(filteredSchedules, filteredConflicts),
    keyShips: calculateKeyShips(filteredSchedules),
  };
}

export function calculateWeeklyReport(
  weekDate: Date,
  criteria: Partial<ReportFilterCriteria> = {},
): WeeklyReportData {
  const weekStart = startOfWeek(weekDate);
  const weekEnd = endOfWeek(weekDate);
  const prevWeekStart = new Date(weekStart);
  prevWeekStart.setDate(prevWeekStart.getDate() - 7);
  const prevWeekEnd = new Date(weekStart);
  prevWeekEnd.setDate(prevWeekEnd.getDate() - 1);
  prevWeekEnd.setHours(23, 59, 59, 999);

  const allSchedules = getAllSchedules();
  const allLogs = getAllLogs();
  const allConflicts = getAllConflicts();

  const filteredSchedules = filterSchedules(allSchedules, criteria, weekStart, weekEnd);
  const filteredLogs = filterLogs(allLogs, weekStart, weekEnd);
  const filteredConflicts = filterConflicts(allConflicts, filteredSchedules);

  const dailyBreakdown: { date: Date; metrics: CoreMetrics }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    const dayStart = startOfDay(d);
    const dayEnd = endOfDay(d);
    const dayScheds = filterSchedules(allSchedules, criteria, dayStart, dayEnd);
    const dayConflicts = filterConflicts(allConflicts, dayScheds);
    dailyBreakdown.push({
      date: d,
      metrics: calculateCoreMetrics(dayScheds, dayConflicts, dayStart, dayEnd),
    });
  }

  const abnormalTrend = calculateAbnormalDistribution(filteredSchedules, filteredLogs, filteredConflicts)
    .map((dist) => {
      const dailyCounts: { date: Date; count: number }[] = dailyBreakdown.map(({ date }) => {
        const dayStart = startOfDay(date);
        const dayEnd = endOfDay(date);
        const dayScheds = filterSchedules(allSchedules, criteria, dayStart, dayEnd);
        const dayLogs = filterLogs(allLogs, dayStart, dayEnd);
        const dayConflicts = filterConflicts(allConflicts, dayScheds);
        const dayAbnormal = calculateAbnormalDistribution(dayScheds, dayLogs, dayConflicts);
        const found = dayAbnormal.find((a) => a.category === dist.category);
        return { date, count: found?.count || 0 };
      });
      return { category: dist.category, dailyCounts };
    });

  const weekMetrics = calculateCoreMetrics(filteredSchedules, filteredConflicts, weekStart, weekEnd);

  const prevScheds = filterSchedules(allSchedules, criteria, prevWeekStart, prevWeekEnd);
  const prevConflicts = filterConflicts(allConflicts, prevScheds);
  const prevMetrics = calculateCoreMetrics(prevScheds, prevConflicts, prevWeekStart, prevWeekEnd);

  const weekOverWeekChange: Partial<Record<keyof CoreMetrics, number>> = {};
  (Object.keys(weekMetrics) as (keyof CoreMetrics)[]).forEach((key) => {
    const curr = weekMetrics[key];
    const prev = prevMetrics[key];
    if (prev === 0) {
      weekOverWeekChange[key] = curr > 0 ? 100 : 0;
    } else {
      weekOverWeekChange[key] = Math.round(((curr - prev) / prev) * 100);
    }
  });

  return {
    weekStart,
    weekEnd,
    weeklyMetrics: weekMetrics,
    dailyBreakdown,
    abnormalTrend,
    teamRanking: calculateTeamEfficiency(filteredSchedules),
    berthRanking: calculateBerthPerformance(filteredSchedules, filteredConflicts),
    keyShipsSummary: calculateKeyShips(filteredSchedules),
    weekOverWeekChange,
  };
}

export function calculateMonthlyReport(
  monthDate: Date,
  criteria: Partial<ReportFilterCriteria> = {},
): MonthlyReportData {
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const prevMonth = new Date(monthStart);
  prevMonth.setMonth(prevMonth.getMonth() - 1);
  const prevStart = startOfMonth(prevMonth);
  const prevEnd = endOfMonth(prevMonth);

  const allSchedules = getAllSchedules();
  const allLogs = getAllLogs();
  const allConflicts = getAllConflicts();

  const filteredSchedules = filterSchedules(allSchedules, criteria, monthStart, monthEnd);
  const filteredLogs = filterLogs(allLogs, monthStart, monthEnd);
  const filteredConflicts = filterConflicts(allConflicts, filteredSchedules);

  const weeklyBreakdown: { weekStart: Date; metrics: CoreMetrics }[] = [];
  let cursor = new Date(monthStart);
  while (cursor <= monthEnd) {
    const ws = startOfWeek(cursor);
    const we = endOfWeek(cursor);
    const actualStart = ws < monthStart ? monthStart : ws;
    const actualEnd = we > monthEnd ? monthEnd : we;
    const weekScheds = filterSchedules(allSchedules, criteria, actualStart, actualEnd);
    const weekConflicts = filterConflicts(allConflicts, weekScheds);
    weeklyBreakdown.push({
      weekStart: actualStart,
      metrics: calculateCoreMetrics(weekScheds, weekConflicts, actualStart, actualEnd),
    });
    cursor = new Date(we);
    cursor.setDate(cursor.getDate() + 1);
  }

  const monthMetrics = calculateCoreMetrics(filteredSchedules, filteredConflicts, monthStart, monthEnd);
  const prevScheds = filterSchedules(allSchedules, criteria, prevStart, prevEnd);
  const prevConflicts = filterConflicts(allConflicts, prevScheds);
  const prevMetrics = calculateCoreMetrics(prevScheds, prevConflicts, prevStart, prevEnd);

  const monthOverMonthChange: Partial<Record<keyof CoreMetrics, number>> = {};
  (Object.keys(monthMetrics) as (keyof CoreMetrics)[]).forEach((key) => {
    const curr = monthMetrics[key];
    const prev = prevMetrics[key];
    if (prev === 0) {
      monthOverMonthChange[key] = curr > 0 ? 100 : 0;
    } else {
      monthOverMonthChange[key] = Math.round(((curr - prev) / prev) * 100);
    }
  });

  const abnormal = calculateAbnormalDistribution(filteredSchedules, filteredLogs, filteredConflicts);
  const topIssues = abnormal.slice(0, 5).map((a) => ({
    title: ABNORMAL_REASON_CATEGORY_LABELS[a.category],
    count: a.count,
    impact: a.count > 10 ? '严重' : a.count > 5 ? '较大' : '一般',
  }));

  return {
    month: monthStart,
    monthlyMetrics: monthMetrics,
    weeklyBreakdown,
    abnormalTrend: abnormal,
    teamMonthlySummary: calculateTeamEfficiency(filteredSchedules),
    berthMonthlySummary: calculateBerthPerformance(filteredSchedules, filteredConflicts),
    monthOverMonthChange,
    topIssues,
  };
}

export function calculateMetricTrends(
  metricKeys: (keyof CoreMetrics)[],
  startDate: Date,
  endDate: Date,
  criteria: Partial<ReportFilterCriteria> = {},
): MetricTrend[] {
  const allSchedules = getAllSchedules();
  const allConflicts = getAllConflicts();

  const dataPointsByMetric: Record<string, TrendDataPoint[]> = {};
  metricKeys.forEach((k) => { dataPointsByMetric[k] = []; });

  const dayMs = 24 * 3600 * 1000;
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / dayMs) + 1;

  for (let i = 0; i < totalDays; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const dayStart = startOfDay(d);
    const dayEnd = endOfDay(d);

    if (dayStart > endDate) break;

    const dayScheds = filterSchedules(allSchedules, criteria, dayStart, dayEnd);
    const dayConflicts = filterConflicts(allConflicts, dayScheds);
    const dayMetrics = calculateCoreMetrics(dayScheds, dayConflicts, dayStart, dayEnd);

    metricKeys.forEach((key) => {
      dataPointsByMetric[key].push({ date: d, value: dayMetrics[key] });
    });
  }

  return metricKeys.map((key) => ({
    metricKey: key,
    metricLabel: CORE_METRIC_LABELS[key],
    unit: CORE_METRIC_UNITS[key],
    dataPoints: dataPointsByMetric[key],
  }));
}

export function getAllOperationTeams(): string[] {
  const set = new Set<string>();
  getAllSchedules().forEach((s) => {
    if (s.operationTeam) set.add(s.operationTeam);
  });
  return Array.from(set).sort();
}
