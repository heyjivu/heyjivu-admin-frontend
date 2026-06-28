import { Component, DestroyRef, OnInit, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription, catchError, finalize, forkJoin, of } from 'rxjs';

import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { NgApexchartsModule } from 'ng-apexcharts';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { AppIcons } from '../../../core/constants/icons.constants';
import { DashboardService } from '../../dashboard/services/dashboard.service';
import {
  AIUsageReportRecord,
  AiCostRecord,
  CombinedAdminReport
} from '../../dashboard/models/dashboard.model';
import { AdminService, PagedResult, UserManagementDto } from '../../users/services/admin.service';

const USD_TO_PKR_RATE = 278;

type CostCategoryKey = 'Text' | 'Image' | 'Video' | 'TTS' | 'Other';

interface CostCategoryCard {
  category: CostCategoryKey;
  label: string;
  icon: string;
  tone: string;
  totalCostUsd: number;
  byokCostUsd: number;
  companyCostUsd: number;
  calls: number;
  tokens: number;
}

interface ReportFilterOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-reports-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, CardModule, NgApexchartsModule, SelectModule, SelectButtonModule],
  templateUrl: './reports.page.html',
  styleUrl: './reports.page.scss'
})
export class ReportsPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  private readonly dashboardService = inject(DashboardService);
  private readonly adminService = inject(AdminService);
  readonly Icons = AppIcons;
  readonly isSuperAdmin = signal(true);
  private readonly usdToPkrRate = USD_TO_PKR_RATE;
  private filterRequestId = 0;
  private reportRequestId = 0;
  private filterRequest?: Subscription;
  private reportRequest?: Subscription;



  activeTab = signal<'combined' | 'byok' | 'company'>('combined');

  loading = signal(false);
  loadingFilters = signal(false);
  error = signal<string | null>(null);
  readonly reportsBusy = computed(() => this.loading() || this.loadingFilters());

  // Admin Filtering
  fromDate = signal<string>('');
  toDate = signal<string>('');
  selectedRole = signal<string>('');
  selectedUser = signal<string>('');

  roles = signal<ReportFilterOption[]>([{ label: 'All Roles', value: '' }]);
  users = signal<ReportFilterOption[]>([{ label: 'All Users', value: '' }]);

  // Data
  combinedReport = signal<CombinedAdminReport | null>(null);

  // Chart configs
  chartViewOptions = [{ label: 'Area', value: 'area' }, { label: 'Bar', value: 'bar' }];
  chartView = signal<'area' | 'bar'>('area');

  costBreakdownViewOptions = [{ label: 'Donut', value: 'donut' }, { label: 'Pie', value: 'pie' }];
  costBreakdownView = signal<'donut' | 'pie'>('donut');

  adminTimelineChartOptions: any;
  adminBreakdownChartOptions: any;
  adminCategoryStackChartOptions: any;
  adminCategoryMixChartOptions: any;

  private readonly categoryDefinitions: Array<{ category: CostCategoryKey; label: string; icon: string; tone: string; color: string }> = [
    { category: 'Text', label: 'Text', icon: 'fas fa-font', tone: 'amber', color: 'var(--warning)' },
    { category: 'Image', label: 'Image', icon: 'fas fa-image', tone: 'blue', color: 'var(--accent)' },
    { category: 'Video', label: 'Video', icon: 'fas fa-film', tone: 'rose', color: 'var(--danger)' },
    { category: 'TTS', label: 'TTS', icon: 'fas fa-microphone-lines', tone: 'violet', color: 'var(--purple)' },
    { category: 'Other', label: 'Other', icon: 'fas fa-layer-group', tone: 'teal', color: 'var(--accent2)' }
  ];

  readonly categoryCostCards = computed<CostCategoryCard[]>(() => this.buildCategoryCards(this.combinedReport()));

  constructor() {
    this.initChartOptions();

    effect(() => {
      if (this.chartView() && this.adminTimelineChartOptions) {
         this.adminTimelineChartOptions = {
           ...this.adminTimelineChartOptions,
           chart: { ...this.adminTimelineChartOptions.chart, type: this.chartView() }
         };
      }
      if (this.costBreakdownView() && this.adminBreakdownChartOptions) {
         this.adminBreakdownChartOptions = {
           ...this.adminBreakdownChartOptions,
           chart: { ...this.adminBreakdownChartOptions.chart, type: this.costBreakdownView() }
         };
      }
    });
  }

  ngOnInit() {
    this.route.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
       const view = params['view'];
       this.activeTab.set(view === 'combined' ? 'combined' : 'combined');
    });
    this.loadFilterOptions();
    this.loadReports();
  }

  loadFilterOptions() {
    const requestId = ++this.filterRequestId;
    this.filterRequest?.unsubscribe();
    this.loadingFilters.set(true);
    this.filterRequest = forkJoin({
      roles: this.adminService.getRoles().pipe(catchError(() => of([]))),
      users: this.adminService.getUsers({
        pageNumber: 1,
        pageSize: 100,
        isActive: true,
        includeQuotaSummary: false
      }).pipe(catchError(() => of(this.emptyUsersResult())))
    }).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => {
        if (requestId === this.filterRequestId) {
          this.loadingFilters.set(false);
        }
      })
    ).subscribe(({ roles, users }) => {
      if (requestId !== this.filterRequestId) return;
      this.roles.set([
        { label: 'All Roles', value: '' },
        ...roles.map(role => ({
          label: this.displayRoleName(role.name),
          value: role.name
        }))
      ]);

      this.users.set([
        { label: 'All Users', value: '' },
        ...users.items.map(user => ({
          label: this.displayUserName(user),
          value: user.id
        }))
      ]);
    });
  }

  loadReports() {
    const requestId = ++this.reportRequestId;
    this.reportRequest?.unsubscribe();

    this.loading.set(true);
    this.error.set(null);

    this.reportRequest = this.dashboardService.getCombinedAdminReports(
        this.fromDate(), this.toDate(), this.selectedUser(), this.selectedRole()
    ).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => {
        if (requestId === this.reportRequestId) {
          this.loading.set(false);
        }
      })
    ).subscribe({
      next: (report: any) => {
        if (requestId !== this.reportRequestId) return;
        if (!report) {
           this.error.set('Received empty report payload.');
           return;
        }
        this.combinedReport.set(report);
        this.updateCharts(report);
      },
      error: (err: any) => {
        if (requestId !== this.reportRequestId) return;
        this.error.set('Failed to load Combined Admin reports: ' + (err.error?.message || err.message));
      }
    });
  }

  initChartOptions() {
    this.adminTimelineChartOptions = {
      series: [
        { name: 'Included Usage', data: [] },
        { name: 'BYOK Usage', data: [] }
      ],
      chart: { type: this.chartView(), height: 320, toolbar: { show: false }, background: 'transparent', foreColor: 'var(--text3)' },
      colors: ['var(--purple)', 'var(--danger)'],
      dataLabels: { enabled: false },
      stroke: { curve: 'smooth', width: 2 },
      fill: { opacity: 0.8 },
      xaxis: { categories: [], axisBorder: { show: false }, axisTicks: { show: false } },
      yaxis: {
        title: { text: 'PKR', style: { color: 'var(--text3)' } },
        labels: { formatter: (value: number) => this.formatPkrCompactFromPkr(value) }
      },
      tooltip: {
        theme: 'dark',
        y: { formatter: (value: number) => this.formatPkrUsdFromPkr(value) }
      },
      grid: { borderColor: 'var(--text3-alpha-10)', strokeDashArray: 4 }
    };

    this.adminBreakdownChartOptions = {
      series: [50, 50],
      labels: ['Included', 'BYOK'],
      chart: { type: this.costBreakdownView(), height: 320, background: 'transparent', foreColor: 'var(--text3)' },
      colors: ['var(--purple)', 'var(--danger)'],
      dataLabels: { enabled: true, formatter: (val: any) => `${val?.toFixed(0) || 0}%` },
      legend: { position: 'bottom', labels: { colors: 'var(--text3)' } },
      tooltip: {
        theme: 'dark',
        y: { formatter: (value: number) => this.formatPkrUsdFromPkr(value) }
      },
      stroke: { colors: ['var(--bg2)'] }
    };

    this.adminCategoryStackChartOptions = {
      series: [
        { name: 'Included', data: [] },
        { name: 'BYOK', data: [] }
      ],
      chart: {
        type: 'bar',
        height: 320,
        stacked: true,
        toolbar: { show: false },
        background: 'transparent',
        foreColor: 'var(--text3)'
      },
      colors: ['var(--purple)', 'var(--danger)'],
      plotOptions: {
        bar: {
          borderRadius: 7,
          columnWidth: '48%'
        }
      },
      dataLabels: { enabled: false },
      xaxis: { categories: [], axisBorder: { show: false }, axisTicks: { show: false } },
      yaxis: {
        title: { text: 'PKR', style: { color: 'var(--text3)' } },
        labels: { formatter: (value: number) => this.formatPkrCompactFromPkr(value) }
      },
      tooltip: {
        theme: 'dark',
        y: { formatter: (value: number) => this.formatPkrUsdFromPkr(value) }
      },
      legend: { position: 'top', labels: { colors: 'var(--text3)' } },
      grid: { borderColor: 'var(--text3-alpha-10)', strokeDashArray: 4 }
    };

    this.adminCategoryMixChartOptions = {
      series: [1],
      labels: ['No cost yet'],
      chart: { type: 'donut', height: 320, background: 'transparent', foreColor: 'var(--text3)' },
      colors: ['var(--text3-alpha-24)'],
      dataLabels: { enabled: true, formatter: (val: any) => `${val?.toFixed(0) || 0}%` },
      legend: { position: 'bottom', labels: { colors: 'var(--text3)' } },
      tooltip: {
        theme: 'dark',
        y: { formatter: (value: number) => this.formatPkrUsdFromPkr(value) }
      },
      stroke: { colors: ['var(--bg2)'] }
    };

  }

  updateCharts(report: CombinedAdminReport) {
    let companyCost = this.displayCompanyCostUsd(report);
    let byokCost = this.displayByokCostUsd(report);

    const dailyData: Record<string, { company: number; byok: number }> = {};
    const days: string[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      days.push(key);
      dailyData[key] = { company: 0, byok: 0 };
    }

    const usageRecords = report.usageRecords || [];
    usageRecords.forEach((r: AIUsageReportRecord) => {
      const dateKey = new Date(r.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      if (dailyData[dateKey]) {
        if (r.isAdminKey) dailyData[dateKey].company += r.estimatedCostUsd;
        else dailyData[dateKey].byok += r.estimatedCostUsd;
      }
    });

    (report.records || []).forEach((r: AiCostRecord) => {
      const dateKey = new Date(r.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      if (dailyData[dateKey]) {
        if (this.isByokReportType(r.reportType)) dailyData[dateKey].byok += r.calculatedCostUsd;
        else dailyData[dateKey].company += r.calculatedCostUsd;
      }
    });

    const companySeries = days.map(d => Number(this.usdToPkr(dailyData[d].company).toFixed(2)));
    const byokSeries = days.map(d => Number(this.usdToPkr(dailyData[d].byok).toFixed(2)));

    this.adminTimelineChartOptions = {
       ...this.adminTimelineChartOptions,
       series: [
          { name: 'Included Usage', data: companySeries },
          { name: 'BYOK Usage', data: byokSeries }
       ],
       xaxis: { ...this.adminTimelineChartOptions.xaxis, categories: days }
    };

    const hasOriginCost = companyCost > 0 || byokCost > 0;

    this.adminBreakdownChartOptions = {
       ...this.adminBreakdownChartOptions,
       series: hasOriginCost ? [this.usdToPkr(companyCost), this.usdToPkr(byokCost)] : [1],
       labels: hasOriginCost ? ['Included', 'BYOK'] : ['No cost yet'],
       colors: hasOriginCost ? ['var(--purple)', 'var(--danger)'] : ['var(--text3-alpha-24)']
    };

    const categoryRows = this.categoryCostCards();
    const categoryLabels = categoryRows.map(row => row.label);
    const includedCategorySeries = categoryRows.map(row => Number(this.usdToPkr(row.companyCostUsd).toFixed(2)));
    const byokCategorySeries = categoryRows.map(row => Number(this.usdToPkr(row.byokCostUsd).toFixed(2)));
    const categoryTotals = categoryRows.map(row => Number(this.usdToPkr(row.totalCostUsd).toFixed(2)));
    const hasCategoryCost = categoryTotals.some(value => value > 0);

    this.adminCategoryStackChartOptions = {
       ...this.adminCategoryStackChartOptions,
       series: [
          { name: 'Included', data: includedCategorySeries },
          { name: 'BYOK', data: byokCategorySeries }
       ],
       xaxis: { ...this.adminCategoryStackChartOptions.xaxis, categories: categoryLabels }
    };

    this.adminCategoryMixChartOptions = {
       ...this.adminCategoryMixChartOptions,
       series: hasCategoryCost ? categoryTotals : [1],
       labels: hasCategoryCost ? categoryLabels : ['No cost yet'],
       colors: hasCategoryCost
          ? this.categoryDefinitions.map(category => category.color)
          : ['var(--text3-alpha-24)']
    };
  }

  displayTotalCostUsd(report: CombinedAdminReport | null = this.combinedReport()): number {
    if (!report) return 0;
    return this.hasUsageAccounting(report)
      ? Number(report.usageTotalCostUsd || 0)
      : Number(report.totalCombinedCost || 0);
  }

  displayByokCostUsd(report: CombinedAdminReport | null = this.combinedReport()): number {
    if (!report) return 0;
    return this.hasUsageAccounting(report)
      ? Number(report.usageByokCostUsd || 0)
      : Number(report.byokCost || 0);
  }

  displayCompanyCostUsd(report: CombinedAdminReport | null = this.combinedReport()): number {
    if (!report) return 0;
    return this.hasUsageAccounting(report)
      ? Number(report.usageCompanyCostUsd || 0)
      : Number(report.companyCost || 0);
  }

  formatNumber(value: number | null | undefined, digits = 0): string {
    return Number(value || 0).toLocaleString(undefined, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    });
  }

  formatPkr(valueUsd: number | null | undefined): string {
    return `Rs ${this.formatNumber(this.usdToPkr(valueUsd), 2)}`;
  }

  formatUsd(valueUsd: number | null | undefined): string {
    return `$${this.formatNumber(Number(valueUsd || 0), 4)} USD`;
  }

  formatCostPair(valueUsd: number | null | undefined): string {
    return `${this.formatPkr(valueUsd)} / ${this.formatUsd(valueUsd)}`;
  }

  formatPkrUsdFromPkr(valuePkr: number | null | undefined): string {
    const pkr = Number(valuePkr || 0);
    const usd = pkr / this.usdToPkrRate;
    return `Rs ${this.formatNumber(pkr, 2)} / ${this.formatUsd(usd)}`;
  }

  categoryToneClass(category: string): string {
    const match = this.categoryDefinitions.find(item => item.category === category);
    return match ? `tone-${match.tone}` : 'tone-teal';
  }

  clearError() { this.error.set(null); }

  private emptyUsersResult(): PagedResult<UserManagementDto> {
    return {
      items: [],
      totalCount: 0,
      pageNumber: 1,
      pageSize: 100
    };
  }

  private displayUserName(user: UserManagementDto): string {
    const name = user.displayName?.trim() || user.username || user.email;
    return `${name} (${user.email})`;
  }

  private displayRoleName(roleName: string): string {
    return roleName
      .replace(/^\[Custom\]\s*/i, 'Custom ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .trim();
  }

  private buildCategoryCards(report: CombinedAdminReport | null): CostCategoryCard[] {
    const rows = report?.categoryBreakdown || [];
    return this.categoryDefinitions.map(definition => {
      const match = rows.find(row => row.category === definition.category);
      return {
        category: definition.category,
        label: definition.label,
        icon: definition.icon,
        tone: definition.tone,
        totalCostUsd: Number(match?.totalCostUsd || 0),
        byokCostUsd: Number(match?.byokCostUsd || 0),
        companyCostUsd: Number(match?.companyCostUsd || 0),
        calls: Number(match?.calls || 0),
        tokens: Number((match?.inputTokens || 0) + (match?.outputTokens || 0))
      };
    });
  }

  private hasUsageAccounting(report: CombinedAdminReport): boolean {
    return Boolean((report.usageRecords?.length || 0) > 0 || (report.categoryBreakdown?.length || 0) > 0);
  }

  private isByokReportType(reportType: number): boolean {
    return Number(reportType) === 0;
  }

  private usdToPkr(valueUsd: number | null | undefined): number {
    return Number(valueUsd || 0) * this.usdToPkrRate;
  }

  private formatPkrCompactFromPkr(valuePkr: number | null | undefined): string {
    const value = Number(valuePkr || 0);
    if (Math.abs(value) >= 1_000_000) return `Rs ${this.formatNumber(value / 1_000_000, 1)}M`;
    if (Math.abs(value) >= 1_000) return `Rs ${this.formatNumber(value / 1_000, 1)}K`;
    return `Rs ${this.formatNumber(value, 0)}`;
  }
}
