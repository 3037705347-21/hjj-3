import { useScheduleStore } from '../stores/schedule';
import type { ScheduleLog, LogType } from '../types';

export function useScheduleLogger() {
  const store = useScheduleStore();

  function log(
    type: LogType,
    description: string,
    options?: {
      scheduleId?: string;
      shipId?: string;
      berthId?: string;
      before?: Record<string, unknown>;
      after?: Record<string, unknown>;
    },
  ) {
    store.addLog({
      type,
      description,
      scheduleId: options?.scheduleId,
      shipId: options?.shipId,
      berthId: options?.berthId,
      before: options?.before,
      after: options?.after,
    });
  }

  function logCreate(scheduleId: string, shipId: string, after: Record<string, unknown>) {
    log('create', `新增调度计划 ${scheduleId}`, { scheduleId, shipId, after });
  }

  function logUpdate(
    scheduleId: string,
    shipId: string,
    before: Record<string, unknown>,
    after: Record<string, unknown>,
  ) {
    const changes = Object.keys(after)
      .filter((k) => JSON.stringify(before[k]) !== JSON.stringify(after[k]))
      .join(', ');
    log('update', `更新调度计划: ${changes || '字段变更'}`, {
      scheduleId,
      shipId,
      before,
      after,
    });
  }

  function logDelete(scheduleId: string, shipId: string, before: Record<string, unknown>) {
    log('delete', `删除调度计划 ${scheduleId}`, { scheduleId, shipId, before });
  }

  function logStatusChange(
    scheduleId: string,
    shipId: string,
    before: string,
    after: string,
  ) {
    log('status_change', `状态由 ${before} 变更为 ${after}`, {
      scheduleId,
      shipId,
      before: { status: before },
      after: { status: after },
    });
  }

  function logConflict(scheduleId: string, message: string) {
    log('conflict', message, { scheduleId });
  }

  function logWarning(scheduleId: string, message: string) {
    log('warning', message, { scheduleId });
  }

  function filterLogs(options?: {
    type?: LogType;
    scheduleId?: string;
    limit?: number;
  }): ScheduleLog[] {
    let result = [...store.logs];
    if (options?.type) {
      result = result.filter((l) => l.type === options.type);
    }
    if (options?.scheduleId) {
      result = result.filter(
        (l) => l.scheduleId === options.scheduleId || l.shipId === options.scheduleId,
      );
    }
    if (options?.limit) {
      result = result.slice(0, options.limit);
    }
    return result;
  }

  function getConflictLogs(limit = 10): ScheduleLog[] {
    return filterLogs({ type: 'conflict', limit }).concat(
      filterLogs({ type: 'warning', limit }),
    );
  }

  function logRollback(
    scheduleId: string,
    shipId: string,
    before: Record<string, unknown>,
    after: Record<string, unknown>,
    sourceLogId: string,
  ) {
    const changes = Object.keys(after)
      .filter((k) => JSON.stringify(before[k]) !== JSON.stringify(after[k]))
      .join(', ');
    log('rollback', `回退调度计划: ${changes || '恢复字段'}（基于日志 ${sourceLogId}）`, {
      scheduleId,
      shipId,
      before,
      after,
    });
  }

  return {
    log,
    logCreate,
    logUpdate,
    logDelete,
    logStatusChange,
    logConflict,
    logWarning,
    logRollback,
    filterLogs,
    getConflictLogs,
  };
}
