import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MultiSelectModule } from 'primeng/multiselect';
import { AdminService, UserManagementDto } from '../../users/services/admin.service';
import { AdminPipelineService } from '../services/admin-pipeline.service';
import { ToastService } from '../../../core/services/toast.service';
import { DialogService } from '../../../core/dialogs/dialog.service';
import { TriggerJobDialogComponent } from '../dialogs/trigger-job-dialog/trigger-job-dialog.component';

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

  // Tabs: 'DashboardTrend' | 'Processing' | 'Trend'
  activeTab = signal<'DashboardTrend' | 'Processing' | 'Trend'>('DashboardTrend');

  // Dialog selections (kept for initial values if needed)

  ngOnInit() {
    this.loadData();
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

  switchTab(tab: 'DashboardTrend' | 'Processing' | 'Trend') {
    this.activeTab.set(tab);
  }

  openRunDialog() {
    this.dialog.open(TriggerJobDialogComponent, {
      header: 'Trigger ' + (this.activeTab() === 'DashboardTrend' ? 'Dashboard Trend' : this.activeTab()) + ' Run',
      width: '450px',
      data: { activeTab: this.activeTab() }
    });
  }
}





