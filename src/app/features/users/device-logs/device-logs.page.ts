import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { ToastService } from '../../../core/services/toast.service';
import {
  AdminService,
  DeviceLoginHistoryDto,
  DeviceLoginPlatform,
  DeviceLoginUserSummaryDto
} from '../services/admin.service';

type HistorySelection = {
  user: DeviceLoginUserSummaryDto;
  platform: DeviceLoginPlatform;
};

@Component({
  selector: 'app-device-logs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './device-logs.page.html',
  styleUrl: './device-logs.page.scss'
})
export class DeviceLogsPage implements OnInit, OnDestroy {
  private readonly adminService = inject(AdminService);
  private readonly toast = inject(ToastService);
  private searchTimeout?: ReturnType<typeof setTimeout>;

  readonly pageSize = 50;
  readonly historyPageSize = 50;
  readonly users = signal<DeviceLoginUserSummaryDto[]>([]);
  readonly loading = signal(false);
  readonly searchQuery = signal('');
  readonly currentPage = signal(1);
  readonly totalItems = signal(0);
  readonly pageStart = computed(() => this.totalItems() === 0 ? 0 : ((this.currentPage() - 1) * this.pageSize) + 1);
  readonly pageEnd = computed(() => Math.min(this.currentPage() * this.pageSize, this.totalItems()));

  readonly historySelection = signal<HistorySelection | null>(null);
  readonly history = signal<DeviceLoginHistoryDto[]>([]);
  readonly historyLoading = signal(false);
  readonly historyPage = signal(1);
  readonly historyTotal = signal(0);
  readonly historyStart = computed(() => this.historyTotal() === 0 ? 0 : ((this.historyPage() - 1) * this.historyPageSize) + 1);
  readonly historyEnd = computed(() => Math.min(this.historyPage() * this.historyPageSize, this.historyTotal()));

  ngOnInit(): void {
    this.loadUsers();
  }

  ngOnDestroy(): void {
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
  }

  onSearchChange(value: string): void {
    this.searchQuery.set(value);
    this.currentPage.set(1);
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => this.loadUsers(), 300);
  }

  loadUsers(): void {
    this.loading.set(true);
    this.adminService.getDeviceLoginUsers({
      pageNumber: this.currentPage(),
      pageSize: this.pageSize,
      searchTerm: this.searchQuery().trim() || undefined
    }).pipe(
      finalize(() => this.loading.set(false))
    ).subscribe({
      next: result => {
        this.users.set(result.items ?? []);
        this.totalItems.set(result.totalCount ?? 0);
      },
      error: error => {
        console.error('Failed to load device login users', error);
        this.users.set([]);
        this.totalItems.set(0);
        this.toast.error('Failed to load device login information.');
      }
    });
  }

  previousPage(): void {
    if (this.currentPage() <= 1) return;
    this.currentPage.update(page => page - 1);
    this.loadUsers();
  }

  nextPage(): void {
    if (this.currentPage() * this.pageSize >= this.totalItems()) return;
    this.currentPage.update(page => page + 1);
    this.loadUsers();
  }

  loginCount(user: DeviceLoginUserSummaryDto, platform: DeviceLoginPlatform): number {
    if (platform === 'mobile') return user.mobileLogins;
    if (platform === 'desktop') return user.desktopLogins;
    return user.webLogins;
  }

  openHistory(user: DeviceLoginUserSummaryDto, platform: DeviceLoginPlatform): void {
    if (this.loginCount(user, platform) === 0) return;
    this.historySelection.set({ user, platform });
    this.historyPage.set(1);
    this.history.set([]);
    this.loadHistory();
  }

  closeHistory(): void {
    this.historySelection.set(null);
    this.history.set([]);
    this.historyTotal.set(0);
  }

  previousHistoryPage(): void {
    if (this.historyPage() <= 1) return;
    this.historyPage.update(page => page - 1);
    this.loadHistory();
  }

  nextHistoryPage(): void {
    if (this.historyPage() * this.historyPageSize >= this.historyTotal()) return;
    this.historyPage.update(page => page + 1);
    this.loadHistory();
  }

  platformLabel(platform: DeviceLoginPlatform): string {
    return platform.charAt(0).toUpperCase() + platform.slice(1);
  }

  private loadHistory(): void {
    const selection = this.historySelection();
    if (!selection) return;

    this.historyLoading.set(true);
    this.adminService.getDeviceLoginHistory(
      selection.user.userId,
      selection.platform,
      this.historyPage(),
      this.historyPageSize
    ).pipe(
      finalize(() => this.historyLoading.set(false))
    ).subscribe({
      next: result => {
        this.history.set(result.items ?? []);
        this.historyTotal.set(result.totalCount ?? 0);
      },
      error: error => {
        console.error('Failed to load device login history', error);
        this.history.set([]);
        this.historyTotal.set(0);
        this.toast.error('Failed to load login history.');
      }
    });
  }
}
