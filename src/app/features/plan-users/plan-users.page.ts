import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { CardModule } from 'primeng/card';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface PlanStats {
  totalUsers: number;
  totalPipelineMinutes: number;
  activeJobs: number;
  apiCalls: number;
}

@Component({
  selector: 'app-plan-users',
  standalone: true,
  imports: [CommonModule, CardModule],
  templateUrl: './plan-users.page.html',
  styles: [`
    :host {
      display: contents;
    }
    .stat-value {
      font-size: 2.5rem;
      font-weight: 700;
      color: var(--accent);
      margin-bottom: 0.5rem;
    }
    .stat-label {
      color: var(--text2);
      font-size: 0.9rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
  `]
})
export class PlanUsersPage implements OnInit {
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);

  activePlan = signal('free_guest');
  loading = signal(false);
  stats = signal<PlanStats | null>(null);

  planName = computed(() => {
    switch (this.activePlan()) {
      case 'free_guest': return 'Free Guest';
      case 'social_merchant': return 'Social Merchant';
      case 'pro_creator': return 'Pro Creator';
      case 'agency_pro': return 'Agency Admin';
      case 'expert_byok': return 'Expert BYOK';
      default: return 'Plan Users';
    }
  });

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const plan = params['plan'] || 'free_guest';
      this.activePlan.set(plan);
      this.fetchPlanStats();
    });
  }

  fetchPlanStats() {
    this.loading.set(true);
    // In a real implementation, we would fetch from the backend.
    // For now, we simulate backend aggregation.
    setTimeout(() => {
      // Mock stats based on plan
      let multiplier = 1;
      if (this.activePlan() === 'social_merchant') multiplier = 5;
      if (this.activePlan() === 'pro_creator') multiplier = 15;
      if (this.activePlan() === 'agency_pro') multiplier = 50;
      if (this.activePlan() === 'expert_byok') multiplier = 100;

      this.stats.set({
        totalUsers: 120 * multiplier,
        totalPipelineMinutes: 5400 * multiplier,
        activeJobs: 3 * multiplier,
        apiCalls: 15200 * multiplier
      });
      this.loading.set(false);
    }, 500);
  }
}

