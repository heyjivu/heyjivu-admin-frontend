import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { MultiSelectModule } from 'primeng/multiselect';
import { AdminService } from '../../../users/services/admin.service';
import { AdminPipelineService } from '../../services/admin-pipeline.service';
import { ToastService } from '../../../../core/services/toast.service';

interface TriggerData {
  activeTab: 'DashboardTrend' | 'Processing' | 'Trend';
}

@Component({
  selector: 'app-trigger-job-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MultiSelectModule],
  templateUrl: './trigger-job-dialog.component.html'
})
export class TriggerJobDialogComponent implements OnInit {
  private ref = inject(DynamicDialogRef);
  private config = inject(DynamicDialogConfig<TriggerData>);
  private adminService = inject(AdminService);
  private pipelineService = inject(AdminPipelineService);
  private toastService = inject(ToastService);

  data = this.config.data!;
  title = this.config.header ?? 'Trigger Run';

  roles = signal<{ id: string; name: string }[]>([]);
  users = signal<{ id: string; username: string; email: string }[]>([]);
  selectedRoles: string[] = [];
  selectedUsers: string[] = [];
  isSubmitting = signal(false);

  ngOnInit() {
    this.adminService.getRoles().subscribe({
      next: (r) => this.roles.set(r.map((role: any) => ({ id: role.id, name: role.name }))),
      error: () => this.toastService.show('Failed to load roles.', 'error')
    });
    this.adminService.getUsers().subscribe({
      next: (res: any) => {
        this.users.set(res.items.map((user: any) => ({ id: user.id, username: user.username, email: user.email })));
      },
      error: () => this.toastService.show('Failed to load users.', 'error')
    });
  }

  triggerJob() {
    if (this.selectedRoles.length === 0 && this.selectedUsers.length === 0) {
      this.toastService.show('Please select at least one role or user.', 'warning');
      return;
    }

    this.isSubmitting.set(true);
    this.pipelineService.triggerRunJob({
      jobType: this.data.activeTab,
      roleIds: this.selectedRoles,
      userIds: this.selectedUsers
    }).subscribe({
      next: (res: any) => {
        this.toastService.show(
          `Successfully triggered job! Enqueued ${res.jobsCount} tasks for ${res.triggeredUserIds.length} users.`,
          'success'
        );
        this.ref.close(true);
      },
      error: (err) => {
        this.toastService.show(err.error || 'Failed to trigger background job.', 'error');
        this.isSubmitting.set(false);
      }
    });
  }

  close() {
    this.ref.close();
  }
}
