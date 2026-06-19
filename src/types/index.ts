export type ShipPriority = 'critical' | 'high' | 'normal' | 'low';

export type OperationStatus =
  | 'anchored'
  | 'approaching'
  | 'berthing'
  | 'loading'
  | 'unloading'
  | 'departing'
  | 'departed';

export type MilestoneKey =
  | 'arrival'
  | 'berthing'
  | 'operation_start'
  | 'operation_mid'
  | 'operation_end'
  | 'departure';

export interface OperationMilestone {
  key: MilestoneKey;
  label: string;
  plannedTime?: Date;
  actualTime?: Date;
  completed: boolean;
  progressWeight: number;
}

export type ProgressMode = 'percentage' | 'milestone';

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

export type ScheduleSource = 'manual' | 'import' | 'auto' | 'api';

export interface BerthSchedule {
  id: string;
  shipId: string;
  berthId: string;
  eta: Date;
  etd: Date;
  actualBerthing?: Date;
  actualDeparture?: Date;
  actualOperationStart?: Date;
  actualOperationEnd?: Date;
  status: OperationStatus;
  operationProgress: number;
  progressMode: ProgressMode;
  milestones?: OperationMilestone[];
  cargoCompleted?: number;
  delayReason?: string;
  operationTeam?: string;
  remarks?: string;
  source?: ScheduleSource;
  priorityAdjustReason?: string;
  estimatedDuration?: number;
  delayThresholdMinutes?: number;
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
  berthId?: string;
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
    | 'tide_window'
    | 'berth_maintenance'
    | 'buffer_time_insufficient'
    | 'team_conflict'
    | 'dangerous_cargo_isolation'
    | 'night_operation_limit';
  severity: 'error' | 'warning';
  scheduleId: string;
  relatedScheduleId?: string;
  message: string;
  suggestedAction?: string;
}

export interface ScheduleFilterCriteria {
  searchQuery: string;
  statusFilter: OperationStatus | 'all';
  priorityFilter: ShipPriority | 'all';
  cargoTypeFilter: CargoType | 'all';
  berthFilter: string | 'all';
  conflictFilter: 'all' | 'has_conflict' | 'no_conflict';
  teamFilter: string | 'all';
  etaStart: string | null;
  etaEnd: string | null;
  progressMin: number | null;
  progressMax: number | null;
}

export interface SavedView {
  id: string;
  name: string;
  criteria: ScheduleFilterCriteria;
  createdAt: Date;
}
