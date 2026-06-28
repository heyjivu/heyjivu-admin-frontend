import { Component, computed, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { catchError, finalize, forkJoin, of } from 'rxjs';
import {
  AdminAiUsageDashboardDto,
  AdminAiUsageRoleBreakdownDto,
  AdminAiUsageUserBreakdownDto,
  AdminDashboardStatsDto,
  AdminService
} from '../users/services/admin.service';
import { AdminPaymentService } from '../payments/services/admin-payment.service';
import { AuthStore } from '../../core/auth/state/auth.store';

interface StatCard {
  label: string;
  value: string | number;
  hint?: string;
  icon: string;
  color: string;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-dashboard.page.html',
  styleUrl: './admin-dashboard.page.scss'
})
export class AdminDashboardPage implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly paymentService = inject(AdminPaymentService);
  readonly authStore = inject(AuthStore);
  private readonly usdToPkrRate = 278;

  loading = signal(false);
  stats = signal<StatCard[]>([]);
  recentUsers = signal<any[]>([]);
  recentPayments = signal<any[]>([]);
  aiUsage = signal<AdminAiUsageDashboardDto>(this.emptyAiUsage());

  topAiUsers = computed(() => this.aiUsage().topUsers ?? []);
  topAiRoles = computed(() => this.aiUsage().topRoles ?? []);

  ngOnInit() {
    this.loadDashboard();
  }

  loadDashboard() {
    this.loading.set(true);

    forkJoin({
      stats: this.adminService.getStats().pipe(catchError(() => of(null))),
      recentUsers: this.adminService.getRecentUsers(5).pipe(catchError(() => of([]))),
      recentPayments: this.authStore.isSuperAdmin()
        ? this.paymentService.getRecentPayments(5).pipe(catchError(() => of([])))
        : of([])
    }).pipe(
      finalize(() => this.loading.set(false))
    ).subscribe(({ stats, recentUsers, recentPayments }) => {
      this.applyStats(stats);
      this.recentUsers.set(recentUsers);
      this.recentPayments.set(recentPayments);
    });
  }

  private applyStats(data: AdminDashboardStatsDto | null): void {
    const aiUsage = data?.aiUsage ?? this.emptyAiUsage();
    this.aiUsage.set(aiUsage);
    const totals = aiUsage.totals;

    const cards: StatCard[] = [
      { label: 'Total Users', value: data?.totalUsers || 0, icon: 'fas fa-users', color: 'indigo' },
      { label: 'Active Users', value: data?.activeUsers || 0, icon: 'fas fa-user-check', color: 'emerald' },
      { label: 'Pending Reviews', value: data?.pendingReviews || 0, icon: 'fas fa-clipboard-list', color: 'violet' },
      {
        label: 'Platform AI Cost',
        value: this.formatPkr(totals.platformCostUsd),
        hint: this.formatUsd(totals.platformCostUsd),
        icon: 'fas fa-server',
        color: 'amber'
      },
      {
        label: 'Observed BYOK Cost',
        value: this.formatPkr(totals.byokCostUsd),
        hint: this.formatUsd(totals.byokCostUsd),
        icon: 'fas fa-key',
        color: 'violet'
      },
      {
        label: 'AI Calls',
        value: (totals.totalCalls || 0).toLocaleString(),
        hint: `${totals.platformCalls || 0} platform / ${totals.byokCalls || 0} BYOK`,
        icon: 'fas fa-bolt',
        color: 'emerald'
      },
      {
        label: 'Avg AI Time',
        value: this.formatDuration(totals.averageDurationMs),
        hint: `${this.formatDuration(totals.totalDurationMs)} total`,
        icon: 'fas fa-stopwatch',
        color: 'indigo'
      }
    ];

    if (this.authStore.isSuperAdmin()) {
      cards.splice(2, 0, { label: 'Total Revenue', value: `$${(data?.totalRevenue || 0).toLocaleString()}`, icon: 'fas fa-dollar-sign', color: 'amber' });
    }

    this.stats.set(cards);
  }

  formatPkr(amountUsd: number | null | undefined): string {
    const amount = Number(amountUsd || 0) * this.usdToPkrRate;
    return `Rs ${this.formatNumber(amount, 2)}`;
  }

  formatUsd(amountUsd: number | null | undefined): string {
    return `$${this.formatNumber(Number(amountUsd || 0), 4)} USD`;
  }

  formatDuration(durationMs: number | null | undefined): string {
    const ms = Math.max(0, Math.round(Number(durationMs || 0)));
    if (ms < 1000) return `${ms}ms`;

    const seconds = ms / 1000;
    if (seconds < 60) return `${this.formatNumber(seconds, 1)}s`;

    const minutes = seconds / 60;
    if (minutes < 60) return `${this.formatNumber(minutes, 1)}m`;

    return `${this.formatNumber(minutes / 60, 1)}h`;
  }

  userTrackBy(index: number, user: AdminAiUsageUserBreakdownDto): string {
    return user.userId || `${user.userName}-${index}`;
  }

  roleTrackBy(index: number, role: AdminAiUsageRoleBreakdownDto): string {
    return role.roleName || `role-${index}`;
  }

  private formatNumber(value: number, maximumFractionDigits: number): string {
    return new Intl.NumberFormat('en-PK', {
      minimumFractionDigits: maximumFractionDigits > 0 ? Math.min(maximumFractionDigits, 2) : 0,
      maximumFractionDigits
    }).format(value);
  }

  private emptyAiUsage(): AdminAiUsageDashboardDto {
    return {
      generatedAtUtc: new Date(0).toISOString(),
      totals: {
        totalCalls: 0,
        platformCalls: 0,
        byokCalls: 0,
        successfulCalls: 0,
        failedCalls: 0,
        totalCostUsd: 0,
        platformCostUsd: 0,
        byokCostUsd: 0,
        totalDurationMs: 0,
        averageDurationMs: 0
      },
      topUsers: [],
      topRoles: []
    };
  }
}

