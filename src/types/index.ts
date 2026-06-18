export type ShipPriority = 'critical' | 'high' | 'normal' | 'low';

export type OperationStatus =
  | 'anchored'
  | 'approaching'
  | 'berthing'
  | 'loading'
  | 'unloading'
  | 'departing'
  | 'departed';

export type CargoType = 'container' | 'bulk' | 'liquid' | 'general' | 'ro-ro';

export interface Ship {
  id: string;
  name: string;
  imo: string;
  callSign: string;
  length: number;
  width: number;
  draft: number;
  maxDraft: number;
  cargoType: CargoType;
  cargoWeight: number;
  priority: ShipPriority;
  flag?: string;
  buildYear?: number;
}

export interface Berth {
  id: string;
  name: string;
  length: number;
  maxDraft: number;
  allowedCargo: CargoType[];
  position: number;
  status: 'available' | 'occupied' | 'maintenance';
}

export interface BerthSchedule {
  id: string;
  shipId: string;
  berthId: string;
  eta: Date;
  etd: Date;
  actualBerthing?: Date;
  actualDeparture?: Date;
  status: OperationStatus;
  operationProgress: number;
  operationTeam?: string;
  remarks?: string;
}

export interface TideRecord {
  time: Date;
  height: number;
  type: 'high' | 'low' | 'rising' | 'falling';
}

export type LogType =
  | 'create'
  | 'update'
  | 'delete'
  | 'status_change'
  | 'conflict'
  | 'warning';

export interface ScheduleLog {
  id: string;
  timestamp: Date;
  type: LogType;
  operator: string;
  scheduleId?: string;
  shipId?: string;
  description: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}

export interface ScheduleConflict {
  id: string;
  type:
    | 'time_overlap'
    | 'draft_exceed'
    | 'length_exceed'
    | 'cargo_mismatch'
    | 'tide_window';
  severity: 'error' | 'warning';
  scheduleId: string;
  relatedScheduleId?: string;
  message: string;
}
