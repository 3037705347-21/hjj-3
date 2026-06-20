import { ref, computed } from 'vue';
import { useScheduleStore } from '../stores/schedule';
import { useConflictDetection } from './useConflictDetection';
import type { BerthSchedule, ScheduleConflict, TideRecord } from '../types';
import { differenceInMinutes, startOfHour, addHours } from 'date-fns';

interface DragState {
  isDragging: boolean;
  scheduleId: string | null;
  startX: number;
  startY: number;
  originalEta: Date | null;
  originalBerthId: string | null;
}

interface ValidationResult {
  isValid: boolean;
  errors: ScheduleConflict[];
  warnings: ScheduleConflict[];
  canPlace: boolean;
  minIntervalBefore: number;
  minIntervalAfter: number;
  tideSatisfied: boolean;
  berthAvailable: boolean;
}

interface SnapPoint {
  time: Date;
  type: 'hour' | 'half_hour' | 'high_tide' | 'safe_interval';
  priority: number;
}

interface PreviewState {
  x: number;
  y: number;
  width: number;
  eta: Date;
  etd: Date;
  berthId: string;
  scheduleId: string;
  validation: ValidationResult;
  snapPoints: SnapPoint[];
}

interface DropFailure {
  id: string;
  scheduleId: string;
  berthId: string;
  eta: Date;
  etd: Date;
  reasons: string[];
  timestamp: number;
}

const BUFFER_HOURS = 2;
const SNAP_THRESHOLD_MINUTES = 15;

export function useDragSchedule(
  getTimeFromX: (x: number) => Date,
  getBerthFromY: (y: number) => string | null,
  getStartTime: () => Date,
  getBerthLabelWidth: () => number,
  timelineRef: { value: HTMLElement | null },
  getPixelPerHour: () => number,
  getHeaderHeight: () => number,
  getRowHeight: () => number,
) {
  const store = useScheduleStore();
  const { checkTimeOverlap, checkBufferTime, checkDraftLimit, checkLengthLimit, checkCargoMatch, checkTideWindow, checkBerthMaintenance } = useConflictDetection();

  const dragState = ref<DragState>({
    isDragging: false,
    scheduleId: null,
    startX: 0,
    startY: 0,
    originalEta: null,
    originalBerthId: null,
  });

  const previewState = ref<PreviewState | null>(null);
  const dropFailures = ref<DropFailure[]>([]);

  const currentSchedule = computed(() => {
    if (!dragState.value.scheduleId) return null;
    return store.schedules.find((s) => s.id === dragState.value.scheduleId) || null;
  });

  function getActualDurationMs(): number {
    if (!currentSchedule.value) return 0;
    return new Date(currentSchedule.value.etd).getTime() - new Date(currentSchedule.value.eta).getTime();
  }

  function getActualDurationHours(): number {
    return getActualDurationMs() / 3600000;
  }

  function generateSnapPoints(berthId: string, eta: Date): SnapPoint[] {
    const points: SnapPoint[] = [];
    const startWindow = addHours(eta, -2);
    const endWindow = addHours(eta, 2);

    let current = startOfHour(startWindow);
    while (current <= endWindow) {
      points.push({ time: new Date(current), type: 'hour', priority: 1 });
      const halfHour = new Date(current.getTime() + 30 * 60000);
      if (halfHour <= endWindow) {
        points.push({ time: halfHour, type: 'half_hour', priority: 2 });
      }
      current = addHours(current, 1);
    }

    const berthSchedules = store.schedulesByBerth[berthId] || [];
    berthSchedules.forEach((s) => {
      if (s.id === dragState.value.scheduleId) return;
      const etd = new Date(s.etd);
      const safeInterval = new Date(etd.getTime() + BUFFER_HOURS * 3600000);
      if (safeInterval >= startWindow && safeInterval <= endWindow) {
        points.push({ time: safeInterval, type: 'safe_interval', priority: 0 });
      }
    });

    store.tides.forEach((tide: TideRecord) => {
      if (tide.type === 'high' && tide.time >= startWindow && tide.time <= endWindow) {
        points.push({ time: new Date(tide.time), type: 'high_tide', priority: 0 });
      }
    });

    return points.sort((a, b) => a.priority - b.priority);
  }

  function snapToNearestPoint(eta: Date, snapPoints: SnapPoint[]): Date {
    let bestSnap = eta;
    let minDiff = Infinity;

    snapPoints.forEach((point) => {
      const diff = Math.abs(differenceInMinutes(eta, point.time));
      if (diff <= SNAP_THRESHOLD_MINUTES && diff < minDiff) {
        minDiff = diff;
        bestSnap = new Date(point.time);
      }
    });

    return bestSnap;
  }

  function validatePlacement(
    schedule: BerthSchedule,
    berthId: string,
    eta: Date,
    etd: Date,
  ): ValidationResult {
    const errors: ScheduleConflict[] = [];
    const warnings: ScheduleConflict[] = [];
    let minIntervalBefore = Infinity;
    let minIntervalAfter = Infinity;
    let tideSatisfied = true;
    let berthAvailable = true;

    const tempSchedule: BerthSchedule = {
      ...schedule,
      berthId,
      eta,
      etd,
    };

    const ship = store.getShipById(schedule.shipId);
    const berth = store.getBerthById(berthId);

    if (ship && berth) {
      const draftConflict = checkDraftLimit(tempSchedule, ship, berth);
      if (draftConflict) {
        if (draftConflict.severity === 'error') errors.push(draftConflict);
        else warnings.push(draftConflict);
      }

      const lengthConflict = checkLengthLimit(tempSchedule, ship, berth);
      if (lengthConflict) {
        if (lengthConflict.severity === 'error') errors.push(lengthConflict);
        else warnings.push(lengthConflict);
      }

      const cargoConflict = checkCargoMatch(tempSchedule, ship, berth);
      if (cargoConflict) {
        if (cargoConflict.severity === 'error') errors.push(cargoConflict);
        else warnings.push(cargoConflict);
      }

      const tideConflict = checkTideWindow(tempSchedule, ship, berth, store.tides);
      if (tideConflict) {
        tideSatisfied = false;
        if (tideConflict.severity === 'error') errors.push(tideConflict);
        else warnings.push(tideConflict);
      }

      const maintenanceConflict = checkBerthMaintenance(tempSchedule, berth);
      if (maintenanceConflict) {
        berthAvailable = false;
        if (maintenanceConflict.severity === 'error') errors.push(maintenanceConflict);
        else warnings.push(maintenanceConflict);
      }
    }

    const otherSchedules = store.schedules.filter((s) => s.id !== schedule.id);
    otherSchedules.forEach((other) => {
      if (other.berthId !== berthId) return;

      const otherEta = new Date(other.eta);
      const otherEtd = new Date(other.etd);
      const scheduleEta = new Date(eta);
      const scheduleEtd = new Date(etd);

      const timeConflict = checkTimeOverlap(tempSchedule, other);
      if (timeConflict) {
        if (timeConflict.severity === 'error') errors.push(timeConflict);
        else warnings.push(timeConflict);
      }

      const bufferConflict = checkBufferTime(tempSchedule, other);
      if (bufferConflict) {
        if (bufferConflict.severity === 'error') errors.push(bufferConflict);
        else warnings.push(bufferConflict);
      }

      if (scheduleEta >= otherEtd) {
        const interval = differenceInMinutes(scheduleEta, otherEtd);
        if (interval < minIntervalBefore) minIntervalBefore = interval;
      }
      if (scheduleEtd <= otherEta) {
        const interval = differenceInMinutes(otherEta, scheduleEtd);
        if (interval < minIntervalAfter) minIntervalAfter = interval;
      }
    });

    const canPlace = errors.length === 0;

    return {
      isValid: canPlace,
      errors,
      warnings,
      canPlace,
      minIntervalBefore: minIntervalBefore === Infinity ? 0 : minIntervalBefore,
      minIntervalAfter: minIntervalAfter === Infinity ? 0 : minIntervalAfter,
      tideSatisfied,
      berthAvailable,
    };
  }

  function startDrag(e: DragEvent, scheduleId: string) {
    if (!e.dataTransfer) return;
    const schedule = store.schedules.find((s) => s.id === scheduleId);
    if (!schedule) return;

    e.dataTransfer.setData('text/plain', scheduleId);
    e.dataTransfer.effectAllowed = 'move';

    dragState.value = {
      isDragging: true,
      scheduleId,
      startX: e.clientX,
      startY: e.clientY,
      originalEta: new Date(schedule.eta),
      originalBerthId: schedule.berthId,
    };

    const target = e.currentTarget as HTMLElement;
    target.classList.add('dragging');
  }

  function onDragOver(e: DragEvent) {
    e.preventDefault();
    if (!dragState.value.isDragging || !timelineRef.value || !currentSchedule.value) return;
    if (!e.dataTransfer) return;

    e.dataTransfer.dropEffect = 'move';

    const rect = timelineRef.value.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const rawEta = getTimeFromX(x);
    const newBerthId = getBerthFromY(y);

    if (dragState.value.scheduleId && newBerthId) {
      const durationMs = getActualDurationMs();
      const durationHours = getActualDurationHours();
      const pph = getPixelPerHour();
      const width = durationHours * pph;

      const snapPoints = generateSnapPoints(newBerthId, rawEta);
      const snappedEta = snapToNearestPoint(rawEta, snapPoints);
      const snappedEtd = new Date(snappedEta.getTime() + durationMs);

      const validation = validatePlacement(
        currentSchedule.value,
        newBerthId,
        snappedEta,
        snappedEtd,
      );

      const berthIndex = store.sortedBerths.findIndex((b) => b.id === newBerthId);
      const headerHeight = getHeaderHeight();
      const rowHeight = getRowHeight();
      const startTime = getStartTime();
      const berthLabelWidth = getBerthLabelWidth();
      const snappedX = (differenceInMinutes(snappedEta, startTime) / 60) * pph + berthLabelWidth;

      previewState.value = {
        x: snappedX,
        y: headerHeight + berthIndex * rowHeight + 4,
        width,
        eta: snappedEta,
        etd: snappedEtd,
        berthId: newBerthId,
        scheduleId: dragState.value.scheduleId,
        validation,
        snapPoints,
      };
    }

    const target = e.currentTarget as HTMLElement;
    target.classList.add('drag-over');
  }

  function onDragLeave(e: DragEvent) {
    const target = e.currentTarget as HTMLElement;
    target.classList.remove('drag-over');
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    if (!timelineRef.value || !dragState.value.scheduleId || !previewState.value || !currentSchedule.value) {
      resetDrag(e);
      return;
    }

    const { berthId, eta: snappedEta, etd: snappedEtd, validation } = previewState.value;

    if (!validation.canPlace) {
      const failureId = `failure-${Date.now()}`;
      dropFailures.value.push({
        id: failureId,
        scheduleId: dragState.value.scheduleId,
        berthId,
        eta: snappedEta,
        etd: snappedEtd,
        reasons: validation.errors.map((e) => e.message),
        timestamp: Date.now(),
      });

      store.addLog({
        type: 'warning',
        scheduleId: dragState.value.scheduleId,
        shipId: currentSchedule.value.shipId,
        berthId,
        description: `拖拽放置失败: ${validation.errors.map((e) => e.message).join('; ')}`,
        before: { berthId: currentSchedule.value.berthId, eta: currentSchedule.value.eta, etd: currentSchedule.value.etd },
        after: { berthId, eta: snappedEta, etd: snappedEtd },
      });

      setTimeout(() => {
        dropFailures.value = dropFailures.value.filter((f) => f.id !== failureId);
      }, 5000);

      resetDrag(e);
      return;
    }

    const scheduleId = dragState.value.scheduleId;
    store.moveSchedule(scheduleId, berthId, snappedEta, snappedEtd);

    resetDrag(e);
  }

  function resetDrag(e: DragEvent) {
    const target = e.currentTarget as HTMLElement;
    target.classList.remove('drag-over');
    document.querySelectorAll('.dragging').forEach((el) => el.classList.remove('dragging'));

    dragState.value = {
      isDragging: false,
      scheduleId: null,
      startX: 0,
      startY: 0,
      originalEta: null,
      originalBerthId: null,
    };
    previewState.value = null;
  }

  function dismissFailure(failureId: string) {
    dropFailures.value = dropFailures.value.filter((f) => f.id !== failureId);
  }

  return {
    dragState,
    previewState,
    dropFailures,
    startDrag,
    onDragOver,
    onDragLeave,
    onDrop,
    dismissFailure,
    BUFFER_HOURS,
  };
}
