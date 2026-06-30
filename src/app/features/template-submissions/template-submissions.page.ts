import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, finalize, of } from 'rxjs';
import { ToastService } from '../../core/services/toast.service';
import {
  SubmissionStatus,
  TemplateSubmissionDto,
  TemplateSubmissionsApiService
} from './services/template-submissions-api.service';

interface StatusFilter {
  value: SubmissionStatus | '';
  label: string;
  icon: string;
}

@Component({
  selector: 'app-template-submissions-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './template-submissions.page.html',
  styleUrl: './template-submissions.page.scss'
})
export class TemplateSubmissionsPage implements OnInit {
  private readonly api = inject(TemplateSubmissionsApiService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);

  private loadRequestId = 0;
  private actionBusyId = signal<string | null>(null);

  readonly statusFilters: StatusFilter[] = [
    { value: '', label: 'All', icon: 'fas fa-layer-group' },
    { value: 'Pending', label: 'Pending', icon: 'fas fa-clock' },
    { value: 'Approved', label: 'Approved', icon: 'fas fa-check' },
    { value: 'Rejected', label: 'Rejected', icon: 'fas fa-times' },
    { value: 'Published', label: 'Published', icon: 'fas fa-rocket' }
  ];

  readonly submissions = signal<TemplateSubmissionDto[]>([]);
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly activeFilter = signal<SubmissionStatus | ''>('');

  // Reject modal state
  readonly rejectTarget = signal<TemplateSubmissionDto | null>(null);
  rejectReason = '';
  readonly isRejecting = signal(false);

  readonly isBusy = computed(() => this.loading() || !!this.actionBusyId() || this.isRejecting());

  ngOnInit(): void {
    this.route.queryParamMap.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(params => {
      const raw = params.get('status') ?? '';
      const valid: Array<SubmissionStatus | ''> = ['', 'Pending', 'Approved', 'Rejected', 'Published'];
      const status = valid.includes(raw as SubmissionStatus | '') ? (raw as SubmissionStatus | '') : '';
      this.activeFilter.set(status);
      this.loadSubmissions();
    });
  }

  setFilter(status: SubmissionStatus | ''): void {
    this.activeFilter.set(status);
    this.loadSubmissions();
  }

  loadSubmissions(): void {
    const requestId = ++this.loadRequestId;
    this.loading.set(true);
    this.error.set(false);
    this.api.listTemplateSubmissions(this.activeFilter()).pipe(
      catchError(() => {
        this.error.set(true);
        return of([] as TemplateSubmissionDto[]);
      }),
      finalize(() => {
        if (requestId === this.loadRequestId) {
          this.loading.set(false);
        }
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(items => {
      if (requestId === this.loadRequestId) {
        this.submissions.set(items);
      }
    });
  }

  approve(submission: TemplateSubmissionDto): void {
    if (this.isBusy() || this.actionBusyId() === submission.id) return;
    this.actionBusyId.set(submission.id);
    this.api.approveSubmission(submission.id).pipe(
      finalize(() => {
        if (this.actionBusyId() === submission.id) {
          this.actionBusyId.set(null);
        }
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: () => {
        this.toast.success(`"${submission.name}" approved.`);
        this.patchStatus(submission.id, 'Approved');
      },
      error: () => this.toast.error('Failed to approve submission.')
    });
  }

  openRejectModal(submission: TemplateSubmissionDto): void {
    if (this.isBusy()) return;
    this.rejectTarget.set(submission);
    this.rejectReason = '';
  }

  closeRejectModal(): void {
    if (this.isRejecting()) return;
    this.rejectTarget.set(null);
    this.rejectReason = '';
  }

  confirmReject(): void {
    const target = this.rejectTarget();
    if (!target || this.isRejecting()) return;
    if (!this.rejectReason.trim()) {
      this.toast.error('A rejection reason is required.');
      return;
    }
    this.isRejecting.set(true);
    this.api.rejectSubmission(target.id, this.rejectReason.trim()).pipe(
      finalize(() => this.isRejecting.set(false)),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: () => {
        this.toast.success(`"${target.name}" rejected.`);
        this.patchStatus(target.id, 'Rejected');
        this.rejectTarget.set(null);
        this.rejectReason = '';
      },
      error: () => this.toast.error('Failed to reject submission.')
    });
  }

  publish(submission: TemplateSubmissionDto): void {
    if (this.isBusy() || this.actionBusyId() === submission.id) return;
    this.actionBusyId.set(submission.id);
    this.api.publishSubmission(submission.id).pipe(
      finalize(() => {
        if (this.actionBusyId() === submission.id) {
          this.actionBusyId.set(null);
        }
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: () => {
        this.toast.success(`"${submission.name}" published.`);
        this.patchStatus(submission.id, 'Published');
      },
      error: () => this.toast.error('Failed to publish submission.')
    });
  }

  isActionBusy(id: string): boolean {
    return this.actionBusyId() === id;
  }

  statusTone(status: SubmissionStatus): string {
    if (status === 'Published') return 'success';
    if (status === 'Approved') return 'info';
    if (status === 'Rejected') return 'danger';
    return 'muted';
  }

  trackById(_: number, item: TemplateSubmissionDto): string {
    return item.id;
  }

  private patchStatus(id: string, status: SubmissionStatus): void {
    this.submissions.update(items =>
      items.map(item => item.id === id ? { ...item, status } : item)
    );
  }
}
