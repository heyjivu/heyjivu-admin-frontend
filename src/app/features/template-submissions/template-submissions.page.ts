import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, finalize, of } from 'rxjs';
import { ToastService } from '../../core/services/toast.service';
import {
  PublishTemplateSubmissionRequest,
  SubmissionStatus,
  TemplateSubmissionDto,
  TemplateSubmissionsApiService
} from './services/template-submissions-api.service';
import {
  AdminTemplateDto,
  TemplateStudioApiService
} from '../templates/services/template-studio-api.service';

interface StatusFilter {
  value: SubmissionStatus | '';
  label: string;
  icon: string;
}

interface SubmissionDefaultMedia {
  label?: string;
  name?: string;
  kind?: string;
  type?: string;
  assetId?: string;
  defaultAssetId?: string;
  previewUrl?: string;
  url?: string;
  defaultPreviewUrl?: string;
  placeholderUrl?: string;
  [key: string]: unknown;
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
  private readonly templateStudioApi = inject(TemplateStudioApiService);
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

  // Publish modal state. Replacing an original always creates a new immutable
  // version on the backend; the previous row is retained for pinned projects.
  readonly publishTarget = signal<TemplateSubmissionDto | null>(null);
  readonly publishMode = signal<'new' | 'replaceOriginal'>('new');
  readonly replaceTemplateId = signal('');
  readonly adminTemplates = signal<AdminTemplateDto[]>([]);
  readonly adminTemplatesLoading = signal(false);
  readonly isPublishing = signal(false);

  private readonly parsedPayloadCache = new Map<string, Record<string, any>>();

  readonly isBusy = computed(() =>
    this.loading() || !!this.actionBusyId() || this.isRejecting() || this.isPublishing()
  );

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

  openPublishModal(submission: TemplateSubmissionDto): void {
    if (this.isBusy()) return;
    const sourceTemplateId = this.sourceTemplateId(submission);
    this.publishTarget.set(submission);
    this.replaceTemplateId.set(sourceTemplateId ?? '');
    this.publishMode.set(sourceTemplateId ? 'replaceOriginal' : 'new');
    this.loadAdminTemplates();
  }

  closePublishModal(): void {
    if (this.isPublishing()) return;
    this.publishTarget.set(null);
    this.publishMode.set('new');
    this.replaceTemplateId.set('');
  }

  confirmPublish(): void {
    const submission = this.publishTarget();
    if (!submission || this.isPublishing()) return;
    const mode = this.publishMode();
    const sourceTemplateId = this.replaceTemplateId().trim();
    if (mode === 'replaceOriginal' && !sourceTemplateId) {
      this.toast.error('Select the original template to replace.');
      return;
    }

    const request: PublishTemplateSubmissionRequest = {
      mode,
      ...(mode === 'replaceOriginal' ? { sourceTemplateId } : {})
    };

    this.isPublishing.set(true);
    this.actionBusyId.set(submission.id);
    this.api.publishSubmission(submission.id, request).pipe(
      finalize(() => {
        this.isPublishing.set(false);
        if (this.actionBusyId() === submission.id) this.actionBusyId.set(null);
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: () => {
        this.toast.success(
          mode === 'replaceOriginal'
            ? `"${submission.name}" published as a new replacement version.`
            : `"${submission.name}" published.`
        );
        this.patchStatus(submission.id, 'Published');
        this.publishTarget.set(null);
        this.publishMode.set('new');
        this.replaceTemplateId.set('');
      },
      error: (error: unknown) => {
        const message = (error as { error?: { error?: string; message?: string } })?.error?.error
          ?? (error as { error?: { message?: string } })?.error?.message
          ?? 'Failed to publish submission.';
        this.toast.error(message);
      }
    });
  }

  setPublishMode(mode: 'new' | 'replaceOriginal'): void {
    this.publishMode.set(mode);
    if (mode === 'replaceOriginal' && !this.replaceTemplateId()) {
      this.replaceTemplateId.set(this.sourceTemplateId(this.publishTarget()) ?? '');
    }
  }

  previewFor(submission: TemplateSubmissionDto): { url: string; kind: 'video' | 'image' } | null {
    const payload = this.payload(submission);
    const candidates = [
      submission.previewUrl,
      payload['previewUrl'],
      payload['previewVideoUrl'],
      payload['coverUrl'],
      payload['thumbnailUrl'],
      payload['templateContract']?.['previewUrl'],
      payload['templateContract']?.['previewAsset']?.['previewUrl'],
      ...this.defaultMedia(submission).map(item => item.previewUrl || item.url)
    ].filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
    const url = candidates[0];
    if (!url) return null;
    const explicitKind = String(
      payload['previewKind'] || payload['templateContract']?.['previewAsset']?.['kind'] || ''
    ).toLowerCase();
    const isImage = explicitKind === 'image' || /\.(png|jpe?g|webp|gif)(\?|$)/i.test(url);
    return { url, kind: isImage ? 'image' : 'video' };
  }

  defaultMedia(submission: TemplateSubmissionDto): SubmissionDefaultMedia[] {
    const payload = this.payload(submission);
    const contract = payload['templateContract'] ?? {};
    const direct = payload['defaultMedia'] ?? contract['defaultMedia'];
    if (Array.isArray(direct)) {
      return direct.filter(item => item && typeof item === 'object') as SubmissionDefaultMedia[];
    }

    const slots = payload['replaceableSlots'] ?? contract['replaceableSlots'];
    if (!Array.isArray(slots)) return [];
    return slots.map((slot: Record<string, any>, index: number): SubmissionDefaultMedia => ({
      ...slot,
      label: slot['label'] || slot['name'] || `Slot ${index + 1}`,
      kind: slot['kind'] || slot['type'] || 'image',
      assetId: slot['defaultAssetId'],
      previewUrl: slot['defaultPreviewUrl'] || slot['previewUrl'] || slot['placeholderUrl']
    }));
  }

  mediaPreviewFor(item: SubmissionDefaultMedia): { url: string; kind: 'video' | 'image' } | null {
    const url = [item.previewUrl, item.url, item.defaultPreviewUrl, item.placeholderUrl]
      .find(value => typeof value === 'string' && value.trim().length > 0);
    if (!url) return null;
    const kind = String(item.kind || item.type || '').toLowerCase();
    return { url, kind: kind === 'video' || /\.(mp4|webm|mov)(\?|$)/i.test(url) ? 'video' : 'image' };
  }

  submissionDescription(submission: TemplateSubmissionDto): string {
    const payload = this.payload(submission);
    return String(payload['description'] || payload['templateContract']?.['description'] || '').trim();
  }

  submissionTags(submission: TemplateSubmissionDto): string[] {
    const payload = this.payload(submission);
    const tags = payload['tags'] ?? payload['templateContract']?.['tags'];
    return Array.isArray(tags) ? tags.map(String).filter(Boolean) : [];
  }

  sourceTemplateId(submission: TemplateSubmissionDto | null): string | null {
    if (!submission) return null;
    const payload = this.payload(submission);
    const value = payload['sourceTemplateId']
      ?? payload['revisionOfTemplateId']
      ?? payload['sourceAdminTemplateId']
      ?? payload['templateVersion']?.['sourceTemplateId']
      ?? payload['templateContract']?.['templateVersion']?.['sourceTemplateId'];
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  versionLabel(submission: TemplateSubmissionDto): string {
    const payload = this.payload(submission);
    const value = payload['revisionNumber']
      ?? payload['templateVersion']?.['versionNumber']
      ?? payload['templateContract']?.['templateVersion']?.['versionNumber'];
    const version = Number(value);
    return Number.isFinite(version) && version > 0 ? `Version ${version}` : 'New template';
  }

  slotKindIcon(item: SubmissionDefaultMedia): string {
    const kind = String(item.kind || item.type || '').toLowerCase();
    if (kind === 'video') return 'fa-video';
    if (kind === 'audio') return 'fa-music';
    return 'fa-image';
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

  private loadAdminTemplates(): void {
    if (this.adminTemplatesLoading() || this.adminTemplates().length) return;
    this.adminTemplatesLoading.set(true);
    this.templateStudioApi.getTemplates({ status: 'all' }).pipe(
      catchError(() => of([] as AdminTemplateDto[])),
      finalize(() => this.adminTemplatesLoading.set(false)),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(items => this.adminTemplates.set(items));
  }

  private payload(submission: TemplateSubmissionDto): Record<string, any> {
    const cached = this.parsedPayloadCache.get(submission.id);
    if (cached && cached['__source'] === submission.dataJson) return cached;
    try {
      const parsed = JSON.parse(submission.dataJson || '{}');
      const value = parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? { ...parsed, __source: submission.dataJson }
        : { __source: submission.dataJson };
      this.parsedPayloadCache.set(submission.id, value);
      return value;
    } catch {
      const value = { __source: submission.dataJson };
      this.parsedPayloadCache.set(submission.id, value);
      return value;
    }
  }
}
