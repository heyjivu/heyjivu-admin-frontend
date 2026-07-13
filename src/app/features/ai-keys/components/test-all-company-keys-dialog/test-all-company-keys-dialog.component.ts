import { ChangeDetectorRef, Component, DestroyRef, afterNextRender, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { DynamicDialogRef } from 'primeng/dynamicdialog';
import { finalize, timeout } from 'rxjs';
import { AdminCompanyAIKeysApiService, PipelineTestResultDto } from '../../services/company-ai-keys-api.service';

export type KeyProbeStatus = 'verified' | 'free' | 'configured-only' | 'missing' | 'failed' | string;

export interface PipelineGroup {
  name: string;
  status: 'green' | 'yellow' | 'red';
  statusText: string;
  isOpen: boolean;
  results: PipelineTestResultDto[];
}

@Component({
  selector: 'app-test-all-company-keys-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './test-all-company-keys-dialog.component.html',
  styleUrl: './test-all-company-keys-dialog.component.scss'
})
export class TestAllCompanyKeysDialogComponent {
  private readonly api = inject(AdminCompanyAIKeysApiService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  public readonly ref = inject(DynamicDialogRef);

  results: PipelineTestResultDto[] = [];
  pipelineGroups: PipelineGroup[] = [];
  isLoading = true;
  error: string | null = null;

  constructor() {
    afterNextRender(() => this.runTests());
  }

  runTests() {
    this.isLoading = true;
    this.error = null;
    this.results = [];
    this.pipelineGroups = [];

    this.api.testAllKeys()
      .pipe(
        timeout({ first: 45000 }),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.isLoading = false;
          if (!this.destroyRef.destroyed) this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: data => {
          this.results = (data || []) as PipelineTestResultDto[];
          this.groupResults();
          this.cdr.detectChanges();
        },
        error: err => {
          console.error(err);
          this.error = 'Validation timed out or failed. Please try again.';
          this.cdr.detectChanges();
        }
      });
  }

  groupResults() {
    const groupsMap: Record<string, PipelineTestResultDto[]> = {};
    this.results.forEach(res => {
      const name = res.pipeline || 'Company Keys';
      groupsMap[name] ??= [];
      groupsMap[name].push(res);
    });

    this.pipelineGroups = Object.keys(groupsMap).map(name => {
      const groupResults = groupsMap[name];
      const hasConfiguredOnly = groupResults.some(r => r.status === 'configured-only');
      const hasHardFailure = groupResults.some(r => !r.success && r.status !== 'configured-only');
      const hasVerified = groupResults.some(r => r.success);

      let status: 'green' | 'yellow' | 'red' = 'red';
      let statusText = 'Not Configured';

      if (!hasHardFailure && !hasConfiguredOnly) {
        status = 'green';
        statusText = 'Fully Verified';
      } else if (!hasHardFailure && hasConfiguredOnly) {
        status = 'yellow';
        statusText = 'Configured, Not Verified';
      } else if (hasVerified || hasConfiguredOnly) {
        status = 'yellow';
        statusText = 'Partially Active';
      }

      return {
        name,
        status,
        statusText,
        isOpen: false,
        results: groupResults
      };
    });
  }

  toggleGroup(group: PipelineGroup) {
    group.isOpen = !group.isOpen;
  }

  get allPassed(): boolean {
    return this.results.length > 0 && this.results.every(r => r.success || r.status === 'configured-only');
  }

  get allVerified(): boolean {
    return this.results.length > 0 && this.results.every(r => r.success && r.status !== 'configured-only');
  }

  get hasConfiguredOnly(): boolean {
    return this.results.some(r => r.status === 'configured-only');
  }

  get summaryTitle(): string {
    if (!this.allPassed) return 'Some Tests Failed';
    if (this.hasConfiguredOnly) return 'Some Providers Are Configured Only';
    return 'All Company Keys Verified';
  }

  get summaryDescription(): string {
    if (!this.allPassed) return 'Review failed or missing company key settings below.';
    if (this.hasConfiguredOnly) return 'Safe non-generative checks passed where available; configured-only providers were not generated.';
    return 'Company providers accepted their keys using real non-generative API checks.';
  }

  get summaryClass(): 'success' | 'warning' {
    return this.allVerified ? 'success' : 'warning';
  }

  get summaryIconClass(): string {
    return this.allVerified ? 'fa-check-circle text-success' : 'fa-exclamation-circle text-warning';
  }

  statusClass(res: PipelineTestResultDto): 'passed' | 'warning' | 'failed' {
    if (res.status === 'configured-only') return 'warning';
    if (!res.success) return 'failed';
    return 'passed';
  }

  rowClass(res: PipelineTestResultDto): Record<string, boolean> {
    return {
      'row-failed': !res.success,
      'row-warning': res.success && res.status === 'configured-only'
    };
  }

  statusIcon(res: PipelineTestResultDto): string {
    if (!res.success) return 'fa-times-circle';
    if (res.status === 'configured-only') return 'fa-exclamation-circle';
    return 'fa-check-circle';
  }

  statusText(res: PipelineTestResultDto): string {
    if (!res.success) {
      return res.status === 'missing' ? 'Missing' : 'Failed';
    }

    switch (res.status) {
      case 'verified':
        return 'Verified';
      case 'free':
        return 'Free';
      case 'configured-only':
        return 'Configured';
      default:
        return 'Passed';
    }
  }

  categoryLabel(category: string): string {
    const normalized = (category || '').toLowerCase();
    if (normalized === 'stockmedia' || normalized === 'stock') return 'Stock Media';
    if (normalized === 'websearch' || normalized === 'web') return 'Web Search';
    if (normalized === 'imagegen') return 'Image Generation';
    if (normalized === 'videogen') return 'Video Generation';
    if (normalized === 'embedding' || normalized === 'embeddings' || normalized === 'vector') return 'Embedding';
    if (normalized === 'tts') return 'TTS';
    return category;
  }

  formatLatencySeconds(latencyMs?: number): string {
    if (latencyMs === undefined || latencyMs === null) return '-';
    return `${(latencyMs / 1000).toFixed(2)}s`;
  }

  close() {
    this.ref.close();
  }
}
