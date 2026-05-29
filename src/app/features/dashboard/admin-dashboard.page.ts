import { Component, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AdminService } from '../users/services/admin.service';
import { AdminPaymentService } from '../payments/services/admin-payment.service';

interface StatCard {
  label: string;
  value: string | number;
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

  loading = signal(false);
  stats = signal<StatCard[]>([]);
  recentUsers = signal<any[]>([]);
  recentPayments = signal<any[]>([]);

  ngOnInit() {
    this.loadDashboard();
  }

  loadDashboard() {
    this.loading.set(true);

    this.adminService.getStats().subscribe({
      next: (data) => {
        this.stats.set([
          { label: 'Total Users', value: data.totalUsers || 0, icon: 'fas fa-users', color: 'indigo' },
          { label: 'Active Users', value: data.activeUsers || 0, icon: 'fas fa-user-check', color: 'emerald' },
          { label: 'Total Revenue', value: `$${(data.totalRevenue || 0).toLocaleString()}`, icon: 'fas fa-dollar-sign', color: 'amber' },
          { label: 'Pending Reviews', value: data.pendingReviews || 0, icon: 'fas fa-clipboard-list', color: 'violet' }
        ]);
      },
      error: () => {
        this.stats.set([
          { label: 'Total Users', value: 0, icon: 'fas fa-users', color: 'indigo' },
          { label: 'Active Users', value: 0, icon: 'fas fa-user-check', color: 'emerald' },
          { label: 'Total Revenue', value: '$0', icon: 'fas fa-dollar-sign', color: 'amber' },
          { label: 'Pending Reviews', value: 0, icon: 'fas fa-clipboard-list', color: 'violet' }
        ]);
      }
    });

    this.adminService.getRecentUsers(5).subscribe({
      next: (users) => this.recentUsers.set(users),
      error: () => this.recentUsers.set([])
    });

    this.paymentService.getRecentPayments(5).subscribe({
      next: (payments) => this.recentPayments.set(payments),
      error: () => this.recentPayments.set([])
    });

    this.loading.set(false);
  }
}

