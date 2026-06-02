import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';

import { DashboardService } from '../../dashboard/services/dashboard.service';
import { AIUsageAuditReport, AIUsageReportRecord } from '../../dashboard/models/dashboard.model';

const USD_TO_PKR_RATE = 278;
const PAGE_SIZE = 15;

@Component({
  selector: 'app-audit-report-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, SelectModule],
  templateUrl: './audit-report.page.html',
  styleUrl: './audit-report.page.scss'
})
export class AuditReportPage implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly usdToPkrRate = USD_TO_PKR_RATE;

  readonly pageTitle = signal('Audit Report');
  readonly pageSubtitle = signal('Paginated AI usage records with cost, token, provider, role, and category filters.');
  readonly fixedOrigin = signal('');
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly report = signal<AIUsageAuditReport | null>(null);

  readonly pageNumber = signal(1);
  readonly pageSize = PAGE_SIZE;
  readonly fromDate = signal('');
  readonly toDate = signal('');
  readonly selectedRole = signal('');
  readonly selectedUser = signal('');
  readonly selectedCategory = signal('');
  readonly selectedProvider = signal('');
  readonly searchQuery = signal('');

  readonly roleOptions = computed(() => [
    { label: 'All Roles', value: '' },
    ...(this.report()?.roles || [])
  ]);

  readonly userOptions = computed(() => [
    { label: 'All Users', value: '' },
    ...(this.report()?.users || [])
  ]);

  readonly categoryOptions = computed(() => [
    { label: 'All Categories', value: '' },
    ...(this.report()?.categories || [])
  ]);

  readonly providerOptions = computed(() => [
    { label: 'All Providers', value: '' },
    ...(this.report()?.providers || [])
  ]);

  readonly records = computed(() => this.report()?.records.items || []);
  readonly totals = computed(() => this.report()?.totals || {
    calls: 0,
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    totalCostUsd: 0
  });

  readonly totalCount = computed(() => this.report()?.records.totalCount || 0);
  readonly totalPages = computed(() => Math.max(this.report()?.records.totalPages || 1, 1));
  readonly pageStart = computed(() => this.totalCount() === 0 ? 0 : ((this.pageNumber() - 1) * this.pageSize) + 1);
  readonly pageEnd = computed(() => Math.min(this.pageNumber() * this.pageSize, this.totalCount()));
  readonly showOriginColumn = computed(() => this.fixedOrigin() !== 'Included');
  readonly originModeLabel = computed(() => this.fixedOrigin() === 'BYOK' ? 'BYOK only' : 'Included only');
  readonly originModeClass = computed(() => this.fixedOrigin() === 'BYOK' ? 'mode-byok' : 'mode-included');
  readonly emptyMessage = computed(() => {
    if (this.fixedOrigin() === 'BYOK') {
      return 'No BYOK usage records match the selected filters.';
    }

    return 'No included/admin-key usage records match the selected filters.';
  });

  ngOnInit(): void {
    this.route.data
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(data => {
        const nextOrigin = data['origin'] || '';
        const modeChanged = this.fixedOrigin() !== nextOrigin;

        this.pageTitle.set(data['title'] || 'Audit Report');
        this.pageSubtitle.set(data['subtitle'] || 'Paginated AI usage records with cost, token, provider, role, and category filters.');
        this.fixedOrigin.set(nextOrigin);

        if (modeChanged) {
          this.resetFilters();
        }

        this.pageNumber.set(1);
        this.loadReport();
      });
  }

  loadReport(): void {
    this.loading.set(true);
    this.error.set(null);

    this.dashboardService.getAIUsageAuditReport({
      startDate: this.fromDate() || undefined,
      endDate: this.toDate() || undefined,
      targetUserId: this.selectedUser() || undefined,
      roleName: this.selectedRole() || undefined,
      category: this.selectedCategory() || undefined,
      provider: this.selectedProvider() || undefined,
      origin: this.fixedOrigin() || undefined,
      searchTerm: this.searchQuery().trim() || undefined,
      pageNumber: this.pageNumber(),
      pageSize: this.pageSize
    }).subscribe({
      next: report => {
        this.report.set(report);
        this.loading.set(false);
      },
      error: (err: any) => {
        this.error.set('Failed to load audit report: ' + (err.error?.message || err.message));
        this.loading.set(false);
      }
    });
  }

  applyFilters(): void {
    this.pageNumber.set(1);
    this.loadReport();
  }

  clearFilters(): void {
    this.resetFilters();
    this.applyFilters();
  }

  private resetFilters(): void {
    this.fromDate.set('');
    this.toDate.set('');
    this.selectedRole.set('');
    this.selectedUser.set('');
    this.selectedCategory.set('');
    this.selectedProvider.set('');
    this.searchQuery.set('');
  }

  nextPage(): void {
    if (this.pageNumber() >= this.totalPages()) return;
    this.pageNumber.update(page => page + 1);
    this.loadReport();
  }

  previousPage(): void {
    if (this.pageNumber() <= 1) return;
    this.pageNumber.update(page => page - 1);
    this.loadReport();
  }

  recordTokens(record: AIUsageReportRecord): number {
    return Number(record.inputTokens || 0) + Number(record.outputTokens || 0);
  }

  originLabel(record: AIUsageReportRecord): string {
    return record.isAdminKey ? 'Included' : 'BYOK';
  }

  originClass(record: AIUsageReportRecord): string {
    return record.isAdminKey ? 'badge-indigo' : 'badge-accent2';
  }

  categoryClass(record: AIUsageReportRecord): string {
    return `category-${(record.category || 'Other').toLowerCase()}`;
  }

  clearError(): void {
    this.error.set(null);
  }

  formatNumber(value: number | null | undefined, digits = 0): string {
    return Number(value || 0).toLocaleString(undefined, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    });
  }

  formatPkr(valueUsd: number | null | undefined): string {
    return `Rs ${this.formatNumber(Number(valueUsd || 0) * this.usdToPkrRate, 2)}`;
  }

  formatUsd(valueUsd: number | null | undefined): string {
    return `$${this.formatNumber(Number(valueUsd || 0), 4)} USD`;
  }
}
