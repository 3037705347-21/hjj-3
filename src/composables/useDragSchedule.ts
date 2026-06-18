import { ref } from 'vue';
import { useScheduleStore } from '../stores/schedule';

interface DragState {
  isDragging: boolean;
  scheduleId: string | null;
  startX: number;
  startY: number;
  originalEta: Date | null;
  originalBerthId: string | null;
}

export function useDragSchedule(
  getTimeFromX: (x: number) => Date,
  getBerthFromY: (y: number) => string | null,
  getDuration: () => number,
  timelineRef: { value: HTMLElement | null },
) {
  const store = useScheduleStore();
  const dragState = ref<DragState>({
    isDragging: false,
    scheduleId: null,
    startX: 0,
    startY: 0,
    originalEta: null,
    originalBerthId: null,
  });

  const previewPosition = ref<{
    x: number;
    y: number;
    width: number;
    eta: Date;
    berthId: string;
    scheduleId: string;
  } | null>(null);

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
    if (!dragState.value.isDragging || !timelineRef.value) return;
    if (!e.dataTransfer) return;

    e.dataTransfer.dropEffect = 'move';

    const rect = timelineRef.value.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newEta = getTimeFromX(x);
    const newBerthId = getBerthFromY(y);

    if (dragState.value.scheduleId && newBerthId) {
      const duration = getDuration();
      const pixelPerHour = rect.width / 72;
      previewPosition.value = {
        x: x,
        y: y,
        width: duration * pixelPerHour,
        eta: newEta,
        berthId: newBerthId,
        scheduleId: dragState.value.scheduleId,
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
    if (!timelineRef.value || !dragState.value.scheduleId) {
      resetDrag(e);
      return;
    }

    const scheduleId = e.dataTransfer?.getData('text/plain') || dragState.value.scheduleId;
    const schedule = store.schedules.find((s) => s.id === scheduleId);
    if (!schedule) {
      resetDrag(e);
      return;
    }

    const rect = timelineRef.value.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newEta = getTimeFromX(x);
    const newBerthId = getBerthFromY(y);

    if (newBerthId) {
      const durationMs = new Date(schedule.etd).getTime() - new Date(schedule.eta).getTime();
      const newEtd = new Date(newEta.getTime() + durationMs);
      store.moveSchedule(scheduleId, newBerthId, newEta, newEtd);
    }

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
    previewPosition.value = null;
  }

  return {
    dragState,
    previewPosition,
    startDrag,
    onDragOver,
    onDragLeave,
    onDrop,
  };
}
