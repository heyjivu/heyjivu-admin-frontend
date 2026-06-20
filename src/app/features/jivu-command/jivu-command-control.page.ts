import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MultiSelectModule } from 'primeng/multiselect';
import { finalize } from 'rxjs';
import { AuthStore } from '../../core/auth/state/auth.store';
import { Rights } from '../../core/constants/rights.constants';
import {
  AdminJivuCommandDeviceDto,
  AdminJivuCommandDto,
  AdminJivuCommandFilterOptions,
  AdminJivuCommandStatsDto,
  AdminJivuCommandTempFileDto,
  AdminJivuCommandTempUsageDto
} from './models/jivu-command-admin.model';
import { AdminJivuCommandService } from './services/admin-jivu-command.service';

type R2FileRef = {
  role: string;
  storageKey: string;
  contentType?: string;
  sizeBytes?: number;
};

type FilterOption = {
  id: string;
  label: string;
};

const ALL_FILTER_VALUE = '__all__';

@Component({
  selector: 'app-jivu-command-control',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MultiSelectModule],
  templateUrl: './jivu-command-control.page.html',
  styleUrl: './jivu-command-control.page.scss'
})
export class JivuCommandControlPage implements OnInit {
  private readonly api = inject(AdminJivuCommandService);
  private readonly authStore = inject(AuthStore);

  Math = Math;
  Rights = Rights;

  readonly commands = signal<AdminJivuCommandDto[]>([]);
  readonly devices = signal<AdminJivuCommandDeviceDto[]>([]);
  readonly userFilterOptions = signal<FilterOption[]>([{ id: ALL_FILTER_VALUE, label: 'All users' }]);
  readonly roleFilterOptions = signal<FilterOption[]>([{ id: ALL_FILTER_VALUE, label: 'All roles' }]);
  readonly tempFiles = signal<AdminJivuCommandTempFileDto[]>([]);
  readonly tempUsage = signal<AdminJivuCommandTempUsageDto[]>([]);
  readonly selectedCommand = signal<AdminJivuCommandDto | null>(null);
  readonly selectedTempUsageUserIds = signal<Set<string>>(new Set());
  readonly showMaintenanceDialog = signal(false);
  readonly loading = signal(false);
  readonly detailLoading = signal(false);
  readonly actionBusy = signal(false);
  readonly maintenanceLoading = signal(false);
  readonly maintenanceBusy = signal(false);
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);
  readonly page = signal(1);
  readonly pageSize = signal(20);
  readonly totalCount = signal(0);
  readonly totalPages = signal(1);
  readonly selectedMoveDevice = signal('');

  readonly stats = signal<AdminJivuCommandStatsDto>({
    totalCommands: 0,
    activeCommands: 0,
    queuedCommands: 0,
    runningCommands: 0,
    pausedCommands: 0,
    expiredCommands: 0,
    activeTempFiles: 0,
    activeTempBytes: 0,
    byType: {},
    byStatus: {}
  });

  search = '';
  selectedUserIds: string[] = [ALL_FILTER_VALUE];
  selectedRoleIds: string[] = [ALL_FILTER_VALUE];
  selectedMaintenanceUserIds: string[] = [ALL_FILTER_VALUE];
  selectedMaintenanceRoleIds: string[] = [ALL_FILTER_VALUE];
  maintenanceSearch = '';
  status = '';
  commandType = '';
  targetDeviceInstanceId = '';
  date = '';

  readonly canManage = computed(() =>
    this.authStore.isSuperAdmin() || this.authStore.hasRight()(Rights.Pipeline_Manage));

  readonly statusRows = computed(() =>
    Object.entries(this.stats().byStatus ?? {})
      .sort((a, b) => b[1] - a[1])
      .map(([label, count]) => ({ label, count })));

  readonly typeRows = computed(() =>
    Object.entries(this.stats().byType ?? {})
      .sort((a, b) => b[1] - a[1])
      .map(([label, count]) => ({ label, count })));

  readonly r2Refs = computed(() => this.extractR2Refs(this.selectedCommand()?.payload));
  readonly selectedTempUsageRows = computed(() => {
    const selected = this.selectedTempUsageUserIds();
    return this.tempUsage().filter(row => selected.has(row.userId));
  });
  readonly selectedTempUsageBytes = computed(() =>
    this.selectedTempUsageRows().reduce((total, row) => total + Math.max(0, row.activeBytes || 0), 0));

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.loadFilterOptions();
    this.loadStats();
    this.loadDevices();
    this.loadCommands();
  }

  loadCommands(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.listCommands({
      userIds: this.selectedFilterIds(this.selectedUserIds),
      roleIds: this.selectedFilterIds(this.selectedRoleIds),
      status: this.status,
      commandType: this.commandType,
      targetDeviceInstanceId: this.targetDeviceInstanceId,
      search: this.search,
      date: this.date,
      page: this.page(),
      pageSize: this.pageSize()
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: response => {
          this.commands.set(response.commands ?? []);
          this.totalCount.set(response.totalCount ?? 0);
          this.totalPages.set(Math.max(1, response.totalPages ?? 1));
        },
        error: err => this.error.set(this.readError(err, 'Could not load Jivu Commands.'))
      });
  }

  loadStats(): void {
    this.api.getStats().subscribe({
      next: stats => this.stats.set(stats),
      error: () => {}
    });
  }

  loadFilterOptions(): void {
    this.api.getFilterOptions().subscribe({
      next: options => this.applyFilterOptions(options),
      error: () => {
        this.userFilterOptions.set([{ id: ALL_FILTER_VALUE, label: 'All users' }]);
        this.roleFilterOptions.set([{ id: ALL_FILTER_VALUE, label: 'All roles' }]);
      }
    });
  }

  loadDevices(): void {
    const userIds = this.selectedFilterIds(this.selectedUserIds);
    const singleUserId = userIds.length === 1 ? userIds[0] : undefined;
    this.api.listDevices(singleUserId, this.search || undefined).subscribe({
      next: devices => this.devices.set(devices ?? []),
      error: () => {}
    });
  }

  applyFilters(): void {
    this.page.set(1);
    this.loadCommands();
    this.loadDevices();
  }

  clearFilters(): void {
    this.search = '';
    this.selectedUserIds = [ALL_FILTER_VALUE];
    this.selectedRoleIds = [ALL_FILTER_VALUE];
    this.status = '';
    this.commandType = '';
    this.targetDeviceInstanceId = '';
    this.date = '';
    this.page.set(1);
    this.refresh();
  }

  onRoleFilterChange(): void {
    this.selectedRoleIds = this.normalizeMultiSelection(this.selectedRoleIds);
    this.applyFilters();
  }

  onUserFilterChange(): void {
    this.selectedUserIds = this.normalizeMultiSelection(this.selectedUserIds);
    this.applyFilters();
  }

  goToPage(nextPage: number): void {
    if (nextPage < 1 || nextPage > this.totalPages()) {
      return;
    }

    this.page.set(nextPage);
    this.loadCommands();
  }

  openDetail(command: AdminJivuCommandDto): void {
    this.selectedCommand.set(command);
    this.selectedMoveDevice.set(command.targetDeviceInstanceId);
    this.detailLoading.set(true);
    this.tempFiles.set([]);

    this.api.getCommand(command.id)
      .pipe(finalize(() => this.detailLoading.set(false)))
      .subscribe({
        next: full => {
          this.selectedCommand.set(full);
          this.selectedMoveDevice.set(full.targetDeviceInstanceId);
          this.loadTempFiles(full);
        },
        error: err => this.error.set(this.readError(err, 'Could not load command details.'))
      });
  }

  closeDetail(): void {
    this.selectedCommand.set(null);
    this.tempFiles.set([]);
    this.selectedMoveDevice.set('');
  }

  cancelSelected(): void {
    const command = this.selectedCommand();
    if (!command || !this.canManage()) {
      return;
    }

    const reason = window.prompt('Cancel reason', 'Cancelled by admin.');
    if (reason === null) {
      return;
    }

    this.runAction(() => this.api.cancelCommand(command.id, reason || 'Cancelled by admin.'));
  }

  moveSelected(): void {
    const command = this.selectedCommand();
    const target = this.selectedMoveDevice();
    if (!command || !target || target === command.targetDeviceInstanceId || !this.canManage()) {
      return;
    }

    this.runAction(() => this.api.moveCommand(command.id, target));
  }

  resumeSelected(): void {
    const command = this.selectedCommand();
    if (!command || !command.resumeEligible || !this.canManage()) {
      return;
    }

    this.runAction(() => this.api.resumeCommand(command.id));
  }

  requeueSelected(): void {
    const command = this.selectedCommand();
    if (!command || !command.requeueEligible || !this.canManage()) {
      return;
    }

    const reason = window.prompt('Requeue reason', 'Requeued by admin.');
    if (reason === null) {
      return;
    }

    this.runAction(() => this.api.requeueCommand(command.id, reason || 'Requeued by admin.'));
  }

  runMaintenanceNow(): void {
    if (!this.canManage()) {
      return;
    }

    this.showMaintenanceDialog.set(true);
    this.notice.set(null);
    this.error.set(null);
    this.loadTempUsage();
  }

  closeMaintenanceDialog(): void {
    if (this.maintenanceBusy()) {
      return;
    }

    this.showMaintenanceDialog.set(false);
  }

  loadTempUsage(): void {
    this.maintenanceLoading.set(true);
    this.api.listTempUsage({
      userIds: this.selectedFilterIds(this.selectedMaintenanceUserIds),
      roleIds: this.selectedFilterIds(this.selectedMaintenanceRoleIds),
      search: this.maintenanceSearch,
      take: 200
    })
      .pipe(finalize(() => this.maintenanceLoading.set(false)))
      .subscribe({
        next: rows => {
          const sorted = [...(rows ?? [])].sort((a, b) => (b.activeBytes || 0) - (a.activeBytes || 0));
          this.tempUsage.set(sorted);
          this.selectedTempUsageUserIds.set(new Set(sorted.map(row => row.userId)));
        },
        error: err => this.error.set(this.readError(err, 'Could not load temp usage.'))
      });
  }

  onMaintenanceRoleFilterChange(): void {
    this.selectedMaintenanceRoleIds = this.normalizeMultiSelection(this.selectedMaintenanceRoleIds);
    this.loadTempUsage();
  }

  onMaintenanceUserFilterChange(): void {
    this.selectedMaintenanceUserIds = this.normalizeMultiSelection(this.selectedMaintenanceUserIds);
    this.loadTempUsage();
  }

  toggleTempUsageRow(userId: string, checked: boolean): void {
    this.selectedTempUsageUserIds.update(current => {
      const next = new Set(current);
      if (checked) {
        next.add(userId);
      } else {
        next.delete(userId);
      }
      return next;
    });
  }

  toggleAllTempUsageRows(checked: boolean): void {
    this.selectedTempUsageUserIds.set(checked
      ? new Set(this.tempUsage().map(row => row.userId))
      : new Set());
  }

  isTempUsageSelected(userId: string): boolean {
    return this.selectedTempUsageUserIds().has(userId);
  }

  allTempUsageSelected(): boolean {
    const rows = this.tempUsage();
    return rows.length > 0 && rows.every(row => this.selectedTempUsageUserIds().has(row.userId));
  }

  runMaintenanceForSelection(): void {
    if (!this.canManage()) {
      return;
    }

    const userIds = this.selectedTempUsageRows().map(row => row.userId);
    this.maintenanceBusy.set(true);
    this.notice.set(null);
    this.error.set(null);
    this.api.runMaintenance(userIds)
      .pipe(finalize(() => this.maintenanceBusy.set(false)))
      .subscribe({
        next: result => {
          this.notice.set(result.message || 'Maintenance completed.');
          this.refresh();
          this.loadTempUsage();
          const selected = this.selectedCommand();
          if (selected) {
            this.openDetail(selected);
          }
        },
        error: err => this.error.set(this.readError(err, 'Maintenance failed.'))
      });
  }

  deleteSelectedTempFiles(): void {
    if (!this.canManage()) {
      return;
    }

    const rows = this.selectedTempUsageRows();
    if (rows.length === 0) {
      this.error.set('Select at least one user temp folder first.');
      return;
    }

    const total = this.formatBytes(this.selectedTempUsageBytes());
    if (!window.confirm(`Remove active Jivu Command temp files for ${rows.length} selected user(s)? This will delete about ${total} from command temp storage only.`)) {
      return;
    }

    this.maintenanceBusy.set(true);
    this.notice.set(null);
    this.error.set(null);
    this.api.deleteTempFiles({ userIds: rows.map(row => row.userId) })
      .pipe(finalize(() => this.maintenanceBusy.set(false)))
      .subscribe({
        next: result => {
          this.notice.set(result.message || 'Temp files removed.');
          this.refresh();
          this.loadTempUsage();
        },
        error: err => this.error.set(this.readError(err, 'Could not remove temp files.'))
      });
  }

  statusClass(status: string | null | undefined): string {
    const value = (status || '').toLowerCase();
    if (['completed'].includes(value)) return 'done';
    if (['failed', 'expired', 'cancelled'].includes(value)) return 'failed';
    if (['queued', 'claimed'].includes(value)) return 'queued';
    if (['running'].includes(value)) return 'running';
    return 'muted';
  }

  commandLabel(type: string): string {
    return (type || '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase());
  }

  formatBytes(value?: number | null): string {
    if (!value || value <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = value;
    let unit = 0;
    while (size >= 1024 && unit < units.length - 1) {
      size /= 1024;
      unit += 1;
    }
    return `${size.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
  }

  queueAge(command: AdminJivuCommandDto): string {
    const created = Date.parse(command.createdAtUtc);
    if (!Number.isFinite(created)) return 'unknown';

    const elapsedSeconds = Math.max(0, Math.floor((Date.now() - created) / 1000));
    if (elapsedSeconds < 60) return `${elapsedSeconds}s`;

    const elapsedMinutes = Math.floor(elapsedSeconds / 60);
    if (elapsedMinutes < 60) return `${elapsedMinutes}m`;

    const elapsedHours = Math.floor(elapsedMinutes / 60);
    const minutes = elapsedMinutes % 60;
    if (elapsedHours < 24) return minutes ? `${elapsedHours}h ${minutes}m` : `${elapsedHours}h`;

    const days = Math.floor(elapsedHours / 24);
    const hours = elapsedHours % 24;
    return hours ? `${days}d ${hours}h` : `${days}d`;
  }

  payloadPreview(value: unknown): string {
    if (!value) return '{}';
    try {
      return JSON.stringify(value, null, 2).slice(0, 4000);
    } catch {
      return String(value);
    }
  }

  private loadTempFiles(command: AdminJivuCommandDto): void {
    this.api.listTempFiles(command.id, command.userId, undefined, 100).subscribe({
      next: files => this.tempFiles.set(files ?? []),
      error: () => this.tempFiles.set([])
    });
  }

  private applyFilterOptions(options: AdminJivuCommandFilterOptions): void {
    this.roleFilterOptions.set([
      { id: ALL_FILTER_VALUE, label: 'All roles' },
      ...(options.roles ?? []).map(role => ({
        id: role.id,
        label: role.name
      }))
    ]);

    this.userFilterOptions.set([
      { id: ALL_FILTER_VALUE, label: 'All users' },
      ...(options.users ?? []).map(user => {
        const details = [user.email, user.roleName]
          .filter((part): part is string => Boolean(part && part !== user.label));
        return {
          id: user.id,
          label: details.length ? `${user.label} - ${details.join(' - ')}` : user.label
        };
      })
    ]);

    this.selectedRoleIds = this.keepKnownSelection(this.selectedRoleIds, this.roleFilterOptions());
    this.selectedUserIds = this.keepKnownSelection(this.selectedUserIds, this.userFilterOptions());
    this.selectedMaintenanceRoleIds = this.keepKnownSelection(this.selectedMaintenanceRoleIds, this.roleFilterOptions());
    this.selectedMaintenanceUserIds = this.keepKnownSelection(this.selectedMaintenanceUserIds, this.userFilterOptions());
  }

  private keepKnownSelection(values: string[], options: FilterOption[]): string[] {
    const optionIds = new Set(options.map(option => option.id));
    const kept = (values ?? []).filter(value => value === ALL_FILTER_VALUE || optionIds.has(value));
    return this.normalizeMultiSelection(kept);
  }

  private normalizeMultiSelection(values: string[]): string[] {
    const selected = Array.from(new Set(values ?? [])).filter(Boolean);
    if (selected.length === 0) {
      return [ALL_FILTER_VALUE];
    }

    if (selected.includes(ALL_FILTER_VALUE) && selected.length > 1) {
      return selected[0] === ALL_FILTER_VALUE
        ? selected.filter(value => value !== ALL_FILTER_VALUE)
        : [ALL_FILTER_VALUE];
    }

    return selected;
  }

  private selectedFilterIds(values: string[]): string[] {
    const selected = this.normalizeMultiSelection(values);
    return selected.includes(ALL_FILTER_VALUE)
      ? []
      : selected;
  }

  private runAction(call: () => ReturnType<AdminJivuCommandService['cancelCommand']>): void {
    this.actionBusy.set(true);
    this.notice.set(null);
    this.error.set(null);
    call()
      .pipe(finalize(() => this.actionBusy.set(false)))
      .subscribe({
        next: result => {
          if (result.success) {
            this.notice.set(result.message || 'Command updated.');
            this.refresh();
            const selected = this.selectedCommand();
            if (selected) {
              this.openDetail(selected);
            }
          } else {
            this.error.set(result.message || 'Command action failed.');
          }
        },
        error: err => this.error.set(this.readError(err, 'Command action failed.'))
      });
  }

  private extractR2Refs(payload?: Record<string, unknown> | null): R2FileRef[] {
    const files = payload?.['r2Files'];
    if (!Array.isArray(files)) {
      return [];
    }

    return files
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
      .map(item => ({
        role: this.asString(item['role']) || 'file',
        storageKey: this.asString(item['storageKey'])
          || this.asString(item['fileKey'])
          || this.asString(item['filePath'])
          || this.asString(item['path'])
          || this.asString(item['url'])
          || '',
        contentType: this.asString(item['contentType']),
        sizeBytes: typeof item['sizeBytes'] === 'number' ? item['sizeBytes'] : undefined
      }))
      .filter(item => item.storageKey);
  }

  private asString(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  }

  private readError(err: unknown, fallback: string): string {
    const error = err as { error?: { message?: string }; message?: string };
    return error?.error?.message || error?.message || fallback;
  }
}
