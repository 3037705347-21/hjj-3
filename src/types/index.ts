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

export type UserRole = 'admin' | 'duty_chief' | 'dispatcher' | 'readonly';

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  admin: '管理员',
  duty_chief: '值班长',
  dispatcher: '调度员',
  readonly: '只读查看',
};

export type PermissionAction = 'read' | 'create' | 'update' | 'delete' | 'export' | 'approve';

export type PermissionModule =
  | 'berth_schedule'
  | 'conflict_handle'
  | 'log_export'
  | 'status_change'
  | 'user_manage'
  | 'role_manage'
  | 'audit_view'
  | 'resource_manage'
  | 'resource_allocate';

export const PERMISSION_MODULE_LABELS: Record<PermissionModule, string> = {
  berth_schedule: '泊位调度编辑',
  conflict_handle: '冲突处理',
  log_export: '日志导出',
  status_change: '状态变更',
  user_manage: '用户管理',
  role_manage: '角色管理',
  audit_view: '审计查看',
  resource_manage: '资源管理',
  resource_allocate: '资源分配',
};

export const PERMISSION_ACTION_LABELS: Record<PermissionAction, string> = {
  read: '查看',
  create: '新增',
  update: '修改',
  delete: '删除',
  export: '导出',
  approve: '审批',
};

export interface Permission {
  module: PermissionModule;
  actions: PermissionAction[];
}

export type UserStatus = 'active' | 'disabled' | 'locked';

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  active: '启用',
  disabled: '禁用',
  locked: '锁定',
};

export type DataScope = 'all' | 'berth_group' | 'self';

export const DATA_SCOPE_LABELS: Record<DataScope, string> = {
  all: '全部数据',
  berth_group: '所属泊位组',
  self: '仅本人',
};

export interface SystemUser {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
  status: UserStatus;
  permissions: Permission[];
  accessibleRoutes: string[];
  dataScope: DataScope;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Role {
  id: string;
  key: UserRole;
  name: string;
  description: string;
  permissions: Permission[];
  accessibleRoutes: string[];
  dataScope: DataScope;
}

export type AuditAction =
  | 'user_create'
  | 'user_update'
  | 'user_delete'
  | 'user_login'
  | 'role_update'
  | 'permission_change'
  | 'schedule_write'
  | 'conflict_resolve'
  | 'log_export';

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  user_create: '创建用户',
  user_update: '更新用户',
  user_delete: '删除用户',
  user_login: '用户登录',
  role_update: '更新角色',
  permission_change: '权限变更',
  schedule_write: '调度写入',
  conflict_resolve: '冲突处理',
  log_export: '日志导出',
};

export type ApprovalType =
  | 'key_schedule'
  | 'dangerous_cargo'
  | 'manual_adjust'
  | 'berth_change'
  | 'time_window_change'
  | 'conflict_ignore';

export const APPROVAL_TYPE_LABELS: Record<ApprovalType, string> = {
  key_schedule: '重点计划',
  dangerous_cargo: '危险货种计划',
  manual_adjust: '人工调整计划',
  berth_change: '泊位变更',
  time_window_change: '关键时间窗修改',
  conflict_ignore: '冲突忽略',
};

export type ApprovalStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'cancelled';

export const APPROVAL_STATUS_LABELS: Record<ApprovalStatus, string> = {
  pending: '待审批',
  approved: '已通过',
  rejected: '已驳回',
  cancelled: '已撤销',
};

export interface ApprovalRecord {
  id: string;
  approverId: string;
  approverName: string;
  action: 'approve' | 'reject';
  opinion: string;
  timestamp: Date;
}

export interface ApprovalOrder {
  id: string;
  approvalNo: string;
  scheduleId: string;
  initiatorId: string;
  initiatorName: string;
  type: ApprovalType;
  status: ApprovalStatus;
  opinion: string;
  submitTime: Date;
  processTime: Date | null;
  conclusion: string | null;
  records: ApprovalRecord[];
  beforeSnapshot: Record<string, unknown> | null;
  afterSnapshot: Record<string, unknown> | null;
}

export interface AuditLog {
  id: string;
  timestamp: Date;
  operatorId: string;
  operatorName: string;
  action: AuditAction;
  targetId: string;
  targetType: 'user' | 'role' | 'schedule' | 'conflict' | 'log';
  description: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
}

export type ResourceType = 'berth' | 'team' | 'equipment';

export const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  berth: '泊位',
  team: '作业班组',
  equipment: '设备',
};

export type ResourceStatus = 'available' | 'occupied' | 'maintenance' | 'disabled';

export const RESOURCE_STATUS_LABELS: Record<ResourceStatus, string> = {
  available: '可用',
  occupied: '占用中',
  maintenance: '维护中',
  disabled: '停用',
};

export interface AvailableTimeSlot {
  start: Date;
  end: Date;
}

export interface BerthResource {
  id: string;
  type: ResourceType;
  name: string;
  berthId?: string;
  availableSlots: AvailableTimeSlot[];
  status: ResourceStatus;
  scheduleIds: string[];
  operationTeam?: string;
  remarks?: string;
  disableReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TeamResource {
  id: string;
  type: ResourceType;
  name: string;
  berthId?: string;
  availableSlots: AvailableTimeSlot[];
  status: ResourceStatus;
  scheduleIds: string[];
  operationTeam?: string;
  members?: string[];
  remarks?: string;
  disableReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EquipmentResource {
  id: string;
  type: ResourceType;
  name: string;
  berthId?: string;
  equipmentCategory?: string;
  availableSlots: AvailableTimeSlot[];
  status: ResourceStatus;
  scheduleIds: string[];
  operationTeam?: string;
  remarks?: string;
  disableReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type Resource = BerthResource | TeamResource | EquipmentResource;

export interface ResourceAllocation {
  id: string;
  resourceId: string;
  resourceName: string;
  resourceType: ResourceType;
  scheduleId: string;
  startTime: Date;
  endTime: Date;
  allocatedBy: string;
  allocatedAt: Date;
  remarks?: string;
}

export type ResourceConflictType =
  | 'team_time_overlap'
  | 'equipment_time_overlap'
  | 'resource_unavailable'
  | 'resource_disabled'
  | 'resource_maintenance';

export const RESOURCE_CONFLICT_TYPE_LABELS: Record<ResourceConflictType, string> = {
  team_time_overlap: '班组时间冲突',
  equipment_time_overlap: '设备时间冲突',
  resource_unavailable: '资源不可用',
  resource_disabled: '资源已停用',
  resource_maintenance: '资源维护中',
};

export interface ResourceConflict {
  id: string;
  type: ResourceConflictType;
  severity: 'error' | 'warning';
  resourceId: string;
  resourceName: string;
  resourceType: ResourceType;
  scheduleId: string;
  relatedScheduleId?: string;
  message: string;
  overlapStart?: Date;
  overlapEnd?: Date;
  detectedAt: Date;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolutionNote?: string;
}

export type ResourcePermissionModule = 'resource_manage' | 'resource_allocate';
