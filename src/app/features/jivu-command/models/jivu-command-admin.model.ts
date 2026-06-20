export interface AdminJivuCommandListResponse {
  commands: AdminJivuCommandDto[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AdminJivuCommandFilterOptions {
  users: AdminJivuCommandUserOption[];
  roles: AdminJivuCommandRoleOption[];
}

export interface AdminJivuCommandUserOption {
  id: string;
  label: string;
  email?: string | null;
  roleName?: string | null;
}

export interface AdminJivuCommandRoleOption {
  id: string;
  name: string;
}

export interface AdminJivuCommandStatsDto {
  totalCommands: number;
  activeCommands: number;
  queuedCommands: number;
  runningCommands: number;
  pausedCommands: number;
  expiredCommands: number;
  activeTempFiles: number;
  activeTempBytes: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
}

export interface AdminJivuCommandDto {
  id: string;
  userId: string;
  userName?: string | null;
  userEmail?: string | null;
  sourceDeviceInstanceId: string;
  targetDeviceInstanceId: string;
  commandType: string;
  status: string;
  title?: string | null;
  payload: Record<string, unknown>;
  result?: Record<string, unknown> | null;
  progress: number;
  message?: string | null;
  errorMessage?: string | null;
  linkedJobId?: string | null;
  createdAtUtc: string;
  updatedAtUtc: string;
  claimedAtUtc?: string | null;
  startedAtUtc?: string | null;
  completedAtUtc?: string | null;
  requeueEligible: boolean;
  resumeEligible: boolean;
}

export interface AdminJivuCommandDeviceDto {
  id: string;
  userId: string;
  userName?: string | null;
  userEmail?: string | null;
  deviceInstanceId: string;
  deviceType: string;
  displayName: string;
  capabilities: string[];
  appVersion?: string | null;
  lastHeartbeatAtUtc: string;
  isOnline: boolean;
}

export interface AdminJivuCommandTempFileDto {
  id: string;
  userId: string;
  userName?: string | null;
  userEmail?: string | null;
  commandId?: string | null;
  tempSessionId: string;
  storageKey: string;
  role: string;
  contentType?: string | null;
  sizeBytes?: number | null;
  status: string;
  expiresAtUtc: string;
  createdAtUtc: string;
  updatedAtUtc: string;
  deletedAtUtc?: string | null;
  deleteError?: string | null;
}

export interface AdminJivuCommandTempUsageDto {
  userId: string;
  userName?: string | null;
  userEmail?: string | null;
  roleId?: string | null;
  roleName?: string | null;
  activeFileCount: number;
  commandCount: number;
  activeBytes: number;
  oldestExpiresAtUtc?: string | null;
  newestCreatedAtUtc?: string | null;
}

export interface JivuCommandActionResult {
  success: boolean;
  message?: string | null;
  setupRequired?: boolean;
}

export interface JivuCommandTempFileCleanupResult {
  success: boolean;
  deletedCount: number;
  failedCount: number;
  deletedBytes: number;
  message: string;
  setupRequired?: boolean;
}

export interface AdminJivuCommandMaintenanceResult {
  success: boolean;
  message: string;
  ranAtUtc: string;
}

export interface AdminJivuCommandFilters {
  userIds?: string[];
  roleIds?: string[];
  status?: string;
  commandType?: string;
  targetDeviceInstanceId?: string;
  search?: string;
  date?: string;
  page?: number;
  pageSize?: number;
}
