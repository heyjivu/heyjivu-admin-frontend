import { Component, OnInit, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';

import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { NgApexchartsModule } from 'ng-apexcharts';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { AppIcons } from '../../../core/constants/icons.constants';
import { DashboardService } from '../../dashboard/services/dashboard.service';
import { AiCostRecord, CombinedAdminReport } from '../../dashboard/models/dashboard.model';

@Component({
  selector: 'app-reports-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, CardModule, NgApexchartsModule, SelectModule, SelectButtonModule],
  templateUrl: './reports.page.html',
  styleUrl: './reports.page.scss'
})
export class ReportsPage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  
  private readonly dashboardService = inject(DashboardService);
  readonly Icons = AppIcons;
  readonly isSuperAdmin = signal(true);

  

  activeTab = signal<'combined' | 'byok' | 'company' | 'egress'>('combined');
  
  loading = signal(false);
  error = signal<string | null>(null);
  searchQuery = '';

  // Admin Filtering
  fromDate = signal<string>('');
  toDate = signal<string>('');
  selectedRole = signal<string>('');
  selectedUser = signal<string>('');
  
  roles = [{ label: 'All Roles', value: '' }, { label: 'ExpertBYOK', value: 'ExpertBYOK' }, { label: 'FreeGuest', value: 'FreeGuest' }, { label: 'Company', value: 'Company' }];
  users = signal<any[]>([{ label: 'All Users', value: '' }]);

  // Data
  combinedReport = signal<CombinedAdminReport | null>(null);

  // Chart configs
  chartViewOptions = [{ label: 'Area', value: 'area' }, { label: 'Bar', value: 'bar' }];
  chartView = signal<'area' | 'bar'>('area');
  
  costBreakdownViewOptions = [{ label: 'Donut', value: 'donut' }, { label: 'Pie', value: 'pie' }];
  costBreakdownView = signal<'donut' | 'pie'>('donut');

  adminTimelineChartOptions: any;
  adminBreakdownChartOptions: any;
  egressComparisonChartOptions: any;

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
    this.route.queryParams.subscribe(params => {
       const view = params['view'];
       if (view === 'combined' || view === 'egress') {
         this.activeTab.set(view);
       } else {
         this.activeTab.set('combined');
       }
    });
    this.loadReports();
    this.loadUsers();
  }

  loadUsers() {
    // For demo purposes, fetch some distinct user IDs from API if needed, or mock it
    this.users.set([
       { label: 'All Users', value: '' },
       { label: 'System Admin', value: 'admin-123' },
       { label: 'Demo User', value: 'demo-456' }
    ]);
  }

  loadReports() {
    
    this.loading.set(true);
    this.error.set(null);

    this.dashboardService.getCombinedAdminReports(
        this.fromDate(), this.toDate(), this.selectedUser(), this.selectedRole()
    ).subscribe({
      next: (report: any) => {
        if (!report) {
           this.error.set('Received empty report payload.');
           this.loading.set(false);
           return;
        }
        this.combinedReport.set(report);
        this.updateCharts(report);
        this.loading.set(false);
      },
      error: (err: any) => {
        this.error.set('Failed to load Combined Admin reports: ' + (err.error?.message || err.message));
        this.loading.set(false);
      }
    });
  }

  initChartOptions() {
    const themeColors = ['#a78bfa', '#ff6673', '#27d6b6', '#54a6ff'];

    this.adminTimelineChartOptions = {
      series: [
        { name: 'Company Cost', data: [] },
        { name: 'BYOK Cost', data: [] }
      ],
      chart: { type: this.chartView(), height: 320, toolbar: { show: false }, background: 'transparent', foreColor: '#8d9caf' },
      colors: ['#a78bfa', '#ff6673'],
      dataLabels: { enabled: false },
      stroke: { curve: 'smooth', width: 2 },
      fill: { opacity: 0.8 },
      xaxis: { categories: [], axisBorder: { show: false }, axisTicks: { show: false } },
      yaxis: { title: { text: 'USD', style: { color: '#8d9caf' } } },
      tooltip: { theme: 'dark' },
      grid: { borderColor: 'rgba(148, 163, 184, 0.1)', strokeDashArray: 4 }
    };

    this.adminBreakdownChartOptions = {
      series: [50, 50],
      labels: ['Company Driven', 'BYOK Driven'],
      chart: { type: this.costBreakdownView(), height: 320, background: 'transparent', foreColor: '#8d9caf' },
      colors: ['#a78bfa', '#ff6673'],
      dataLabels: { enabled: true, formatter: (val: any) => `${val?.toFixed(0) || 0}%` },
      legend: { position: 'bottom', labels: { colors: '#8d9caf' } },
      tooltip: { theme: 'dark' },
      stroke: { colors: ['#0f141c'] }
    };
    
    // Egress Drive vs R2 comparison
    this.egressComparisonChartOptions = {
      series: [
        { name: 'Drive Upload (Egress Free)', data: [0, 0, 0, 0, 0, 0, 0] },
        { name: 'R2 (Egress Free)', data: [0, 0, 0, 0, 0, 0, 0] },
        { name: 'Standard S3 (Simulated Paid Egress)', data: [1.2, 1.8, 1.5, 2.1, 2.8, 2.4, 3.2] }
      ],
      chart: { type: 'bar', height: 320, toolbar: { show: false }, background: 'transparent', foreColor: '#8d9caf' },
      colors: ['#27d6b6', '#54a6ff', '#ff6673'],
      plotOptions: { bar: { horizontal: false, columnWidth: '55%', borderRadius: 4 } },
      dataLabels: { enabled: false },
      stroke: { show: true, width: 2, colors: ['transparent'] },
      xaxis: { categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], axisBorder: { show: false }, axisTicks: { show: false } },
      yaxis: { title: { text: 'Egress Cost (USD)', style: { color: '#8d9caf' } } },
      fill: { opacity: 0.9 },
      tooltip: { theme: 'dark' },
      grid: { borderColor: 'rgba(148, 163, 184, 0.1)', strokeDashArray: 4 }
    };
  }

  updateCharts(report: CombinedAdminReport) {
    let companyCost = report.companyCost || 0;
    let byokCost = report.byokCost || 0;

    const dailyData: Record<string, { company: number; byok: number }> = {};
    const days: string[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      days.push(key);
      dailyData[key] = { company: 0, byok: 0 };
    }

    if (report.records) {
       report.records.forEach((r: AiCostRecord) => {
          const dateKey = new Date(r.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
          if (dailyData[dateKey]) {
             if (r.reportType === 0) dailyData[dateKey].company += r.calculatedCostUsd;
             else dailyData[dateKey].byok += r.calculatedCostUsd;
          }
       });
    }

    const companySeries = days.map(d => Number(dailyData[d].company.toFixed(2)));
    const byokSeries = days.map(d => Number(dailyData[d].byok.toFixed(2)));

    this.adminTimelineChartOptions = {
       ...this.adminTimelineChartOptions,
       series: [
          { name: 'Company Cost', data: companySeries },
          { name: 'BYOK Cost', data: byokSeries }
       ],
       xaxis: { ...this.adminTimelineChartOptions.xaxis, categories: days }
    };

    if (companyCost === 0 && byokCost === 0) { companyCost = 1; byokCost = 1; }
    
    this.adminBreakdownChartOptions = {
       ...this.adminBreakdownChartOptions,
       series: [companyCost, byokCost]
    };
  }

  filteredRecords = computed(() => {
    const report = this.combinedReport();
    if (!report || !report.records) return [];
    let records = [...report.records];
    
    const query = this.searchQuery.toLowerCase().trim();
    if (query) {
       records = records.filter(r => 
          (r.jobId && r.jobId.toLowerCase().includes(query)) ||
          (r.aiProvider && r.aiProvider.toLowerCase().includes(query)) ||
          (r.roleName && r.roleName.toLowerCase().includes(query))
       );
    }
    return records;
  });

  clearError() { this.error.set(null); }
}


