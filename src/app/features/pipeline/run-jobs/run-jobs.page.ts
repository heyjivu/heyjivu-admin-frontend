import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MultiSelectModule } from 'primeng/multiselect';
import { AdminService, UserManagementDto } from '../../users/services/admin.service';
import { AdminPipelineService, OpenRouterPricingStatusDto, OpenRouterPricingSyncResultDto } from '../services/admin-pipeline.service';
import { ToastService } from '../../../core/services/toast.service';
import { DialogService } from '../../../core/dialogs/dialog.service';
import { TriggerJobDialogComponent } from '../dialogs/trigger-job-dialog/trigger-job-dialog.component';

type PipelineRunTab = 'DashboardTrend' | 'Processing' | 'Trend';
type RunJobsTab = PipelineRunTab | 'PricingSync';

@Component({
  selector: 'app-run-jobs',
  standalone: true,
  imports: [CommonModule, FormsModule, MultiSelectModule],
  templateUrl: './run-jobs.page.html',
  styleUrl: './run-jobs.page.scss'
})
export class RunJobsPage implements OnInit {
  private adminService = inject(AdminService);
  private pipelineService = inject(AdminPipelineService);
  private toastService = inject(ToastService);
  private dialog = inject(DialogService);

  // Lists from backend
  roles = signal<{ id: string; name: string }[]>([]);
  users = signal<{ id: string; username: string; email: string }[]>([]);
  isLoading = signal(false);
  pricingStatus = signal<OpenRouterPricingStatusDto | null>(null);
  lastSyncResult = signal<OpenRouterPricingSyncResultDto | null>(null);
  isPricingLoading = signal(false);
  isPricingSyncing = signal(false);

  activeTab = signal<RunJobsTab>('DashboardTrend');

  // Dialog selections (kept for initial values if needed)

  ngOnInit() {
    this.loadData();
    this.loadPricingStatus();
  }

  loadData() {
    this.isLoading.set(true);
    this.adminService.getRoles().subscribe({
      next: (r) => this.roles.set(r.map(role => ({ id: role.id, name: role.name }))),
      error: () => this.toastService.show('Failed to load roles.', 'error')
    });
    this.adminService.getUsers().subscribe({
      next: (res) => {
        this.users.set(res.items.map((user: UserManagementDto) => ({ id: user.id, username: user.username, email: user.email })));
        this.isLoading.set(false);
      },
      error: () => {
        this.toastService.show('Failed to load users.', 'error');
        this.isLoading.set(false);
      }
    });
  }

  switchTab(tab: RunJobsTab) {
    this.activeTab.set(tab);
    if (tab === 'PricingSync') {
      this.loadPricingStatus();
    }
  }

  openRunDialog() {
    if (this.activeTab() === 'PricingSync') {
      this.runPricingSync();
      return;
    }

    const activeTab = this.activeTab() as PipelineRunTab;
    this.dialog.open(TriggerJobDialogComponent, {
      header: 'Trigger ' + (activeTab === 'DashboardTrend' ? 'Dashboard Trend' : activeTab) + ' Run',
      width: '450px',
      data: { activeTab }
    });
  }

  loadPricingStatus() {
    this.isPricingLoading.set(true);
    this.pipelineService.getOpenRouterPricingStatus().subscribe({
      next: (status) => {
        this.pricingStatus.set(status);
        this.isPricingLoading.set(false);
      },
      error: () => {
        this.toastService.show('Failed to load OpenRouter pricing status.', 'error');
        this.isPricingLoading.set(false);
      }
    });
  }

  runPricingSync() {
    this.isPricingSyncing.set(true);
    this.pipelineService.runOpenRouterPricingSync().subscribe({
      next: (result) => {
        this.lastSyncResult.set(result);
        this.isPricingSyncing.set(false);
        this.toastService.show(`Synced ${result.totalModels} OpenRouter model prices.`, 'success');
        this.loadPricingStatus();
      },
      error: () => {
        this.toastService.show('OpenRouter pricing sync failed.', 'error');
        this.isPricingSyncing.set(false);
      }
    });
  }

  formatDate(value?: string | null): string {
    if (!value) return 'Not synced yet';
    return new Date(value).toLocaleString();
  }

  formatUsd(value: number | null | undefined, digits = 4): string {
    return `$${(value || 0).toLocaleString(undefined, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    })}`;
  }

  perTokenPrice(perMillion: number | null | undefined): string {
    return this.formatUsd((perMillion || 0) / 1_000_000, 8);
  }

  refreshedRows(result: OpenRouterPricingSyncResultDto): number {
    return result.refreshed ?? result.totalModels ?? 0;
  }

  isPricingTab(): boolean {
    return this.activeTab() === 'PricingSync';
  }
}





