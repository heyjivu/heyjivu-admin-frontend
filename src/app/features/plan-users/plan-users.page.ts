import { Component, DestroyRef, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, finalize, of } from 'rxjs';
import { AdminService, PlanQuotaOverviewDto } from '../users/services/admin.service';

type AdminPlanCode = 'free' | 'student' | 'merchant' | 'premium' | 'byok';

interface QuotaLine {
  label: string;
  value: string;
}

interface QuotaStackItem {
  label: string;
  value: string;
}

interface QuotaCard {
  label: 'Creation Wallet' | 'Processing / Whisper Minutes' | 'Voice Minutes' | 'AI Video Clips' | 'Storage' | 'Platform Features';
  icon: string;
  lines: QuotaLine[];
  stack: QuotaStackItem[];
}

interface AdminPlan {
  code: AdminPlanCode;
  name: string;
  priceRs: number;
  icon: string;
  notes?: string;
  quotaCards: QuotaCard[];
}

interface PlanStats {
  totalUsers: number | null;
  usersWithOverrides: number | null;
  activeQuotaBuckets: number | null;
  storageAllocatedGb: number | null;
}

const FINAL_PLANS: AdminPlan[] = [
  {
    code: 'free',
    name: 'Free',
    priceRs: 0,
    icon: 'fas fa-user',
    quotaCards: [
      quotaCard('Creation Wallet', 'fas fa-wallet', [['AI images', '5'], ['Stock images', '50/mo'], ['Stock videos', '50/mo']]),
      quotaCard('Voice Minutes', 'fas fa-microphone', [['Allowance', '0 min']]),
      quotaCard('AI Video Clips', 'fas fa-film', [['Provider clips', '0']]),
      quotaCard('Processing / Whisper Minutes', 'fas fa-clock', [['Allowance', '0 min']]),
      quotaCard('Storage', 'fas fa-database', [['Allowance', '0.5 GB']])
    ]
  },
  {
    code: 'student',
    name: 'Student',
    priceRs: 1500,
    icon: 'fas fa-graduation-cap',
    quotaCards: [
      quotaCard('Creation Wallet', 'fas fa-wallet', [['AI images', '50'], ['Stock images', '100/day'], ['Stock videos', '50/day']]),
      quotaCard('Voice Minutes', 'fas fa-microphone', [['Allowance', '15 min']]),
      quotaCard('AI Video Clips', 'fas fa-film', [['Provider clips', '2']]),
      quotaCard('Processing / Whisper Minutes', 'fas fa-clock', [['Allowance', '30 min']]),
      quotaCard('Storage', 'fas fa-database', [['Allowance', '5 GB']])
    ]
  },
  {
    code: 'merchant',
    name: 'Merchant',
    priceRs: 2000,
    icon: 'fas fa-store',
    quotaCards: [
      quotaCard('Creation Wallet', 'fas fa-wallet', [['AI images', '90'], ['Stock images', '250/day'], ['Stock videos', '100/day']]),
      quotaCard('Voice Minutes', 'fas fa-microphone', [['Allowance', '35 min']]),
      quotaCard('AI Video Clips', 'fas fa-film', [['Provider clips', '4']]),
      quotaCard('Processing / Whisper Minutes', 'fas fa-clock', [['Allowance', '80 min']]),
      quotaCard('Storage', 'fas fa-database', [['Allowance', '15 GB']])
    ]
  },
  {
    code: 'premium',
    name: 'Premium',
    priceRs: 5000,
    icon: 'fas fa-crown',
    quotaCards: [
      quotaCard('Creation Wallet', 'fas fa-wallet', [['AI images', '280'], ['Stock images', '750/day'], ['Stock videos', '300/day']]),
      quotaCard('Voice Minutes', 'fas fa-microphone', [['Allowance', '160 min']]),
      quotaCard('AI Video Clips', 'fas fa-film', [['Provider clips', '12']]),
      quotaCard('Processing / Whisper Minutes', 'fas fa-clock', [['Allowance', '300 min']]),
      quotaCard('Storage', 'fas fa-database', [['Allowance', '50 GB']])
    ]
  },
  {
    code: 'byok',
    name: 'BYOK',
    priceRs: 1500,
    icon: 'fas fa-key',
    notes: 'Own keys / fair use',
    quotaCards: [
      quotaCard('Creation Wallet', 'fas fa-wallet', [['Allowance', 'Own keys / fair use']]),
      quotaCard('Voice Minutes', 'fas fa-microphone', [['Allowance', 'Own keys / fair use']]),
      quotaCard('AI Video Clips', 'fas fa-film', [['Provider clips', 'Own keys / fair use']]),
      quotaCard('Processing / Whisper Minutes', 'fas fa-clock', [['Allowance', 'Own keys / fair use']]),
      quotaCard('Storage', 'fas fa-database', [['Allowance', '30 GB']])
    ]
  }
];

const LEGACY_PLAN_CODES: Record<string, AdminPlanCode> = {
  freeguest: 'free',
  free_guest: 'free',
  free: 'free',
  student: 'student',
  socialmerchant: 'student',
  social_merchant: 'student',
  merchant: 'merchant',
  procreator: 'merchant',
  pro_creator: 'merchant',
  agencyadmin: 'premium',
  agency_admin: 'premium',
  agencypro: 'premium',
  agency_pro: 'premium',
  premium: 'premium',
  expertbyok: 'byok',
  expert_byok: 'byok',
  byok: 'byok'
};

function quotaCard(label: QuotaCard['label'], icon: string, lines: Array<[string, string]>): QuotaCard {
  return { label, icon, lines: lines.map(([lineLabel, value]) => ({ label: lineLabel, value })), stack: [] };
}

@Component({
  selector: 'app-plan-users',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './plan-users.page.html',
  styles: [`
    :host {
      display: contents;
    }

    .plan-tabs {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      margin-bottom: 1rem;
    }

    .plan-tab {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      border: 1px solid var(--border-subtle);
    }

    .plan-tab.active {
      color: var(--accent);
      border-color: color-mix(in srgb, var(--accent) 60%, transparent);
      background: color-mix(in srgb, var(--accent) 14%, transparent);
    }

    .plan-summary {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 1rem;
      align-items: center;
      margin-bottom: 1rem;
    }

    .price-value {
      font-size: clamp(1.75rem, 4vw, 2.5rem);
      line-height: 1;
      color: var(--accent);
      font-weight: 800;
    }

    .quota-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1rem;
      margin-top: 1rem;
    }

    .quota-card {
      min-height: 176px;
    }

    .quota-title {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      font-weight: 700;
      margin-bottom: 0.85rem;
    }

    .quota-title i {
      color: var(--accent);
    }

    .quota-line,
    .stack-line {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.35rem 0;
      color: var(--text2);
      font-size: 0.9rem;
    }

    .quota-line strong,
    .stack-line strong {
      color: var(--text);
      text-align: right;
      font-weight: 700;
    }

    .stack-list {
      margin-top: 0.75rem;
      padding-top: 0.75rem;
      border-top: 1px solid var(--border-subtle);
    }

    .stack-heading {
      color: var(--text2);
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.35rem;
    }

    .stat-value {
      font-size: 2.25rem;
      font-weight: 700;
      color: var(--accent);
      margin-bottom: 0.5rem;
    }

    .stat-label {
      color: var(--text2);
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .info-banner {
      margin: 1rem 0;
      color: var(--text2);
      line-height: 1.5;
    }

    @media (max-width: 720px) {
      .plan-summary {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class PlanUsersPage implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private adminService = inject(AdminService);
  private destroyRef = inject(DestroyRef);
  private overviewRequestId = 0;

  readonly plans = FINAL_PLANS;
  activePlan = signal<AdminPlanCode>('free');
  loading = signal(false);
  apiUnavailable = signal(false);
  overview = signal<PlanQuotaOverviewDto | null>(null);

  currentPlan = computed(() => this.plans.find(plan => plan.code === this.activePlan()) ?? this.plans[0]);
  planName = computed(() => this.currentPlan().name);
  quotaCards = computed(() => {
    const overview = this.overview();
    const apiCards = this.collectQuotaCards(overview?.quotaBuckets ?? overview?.quotaSummary ?? overview?.quotas);
    return apiCards.length > 0 ? apiCards : this.currentPlan().quotaCards;
  });
  stats = computed<PlanStats>(() => {
    const overview = this.overview();
    return {
      totalUsers: overview?.totalUsers ?? null,
      usersWithOverrides: overview?.usersWithOverrides ?? null,
      activeQuotaBuckets: overview?.activeQuotaBuckets ?? null,
      storageAllocatedGb: overview?.storageAllocatedGb ?? null
    };
  });

  ngOnInit() {
    this.route.queryParams
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        this.activePlan.set(this.normalizePlanCode(params['plan']));
        this.fetchPlanStats();
      });
  }

  selectPlan(planCode: AdminPlanCode) {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { plan: planCode },
      queryParamsHandling: 'merge'
    });
  }

  fetchPlanStats() {
    const requestId = ++this.overviewRequestId;
    this.loading.set(true);
    this.apiUnavailable.set(false);

    this.adminService.getPlanQuotaOverview(this.activePlan()).pipe(
      catchError(() => {
        this.apiUnavailable.set(true);
        return of(null);
      }),
      finalize(() => {
        if (requestId === this.overviewRequestId) {
          this.loading.set(false);
        }
      })
    ).subscribe((overview) => {
      if (requestId !== this.overviewRequestId) {
        return;
      }

      this.overview.set(overview);
    });
  }

  formatPrice(priceRs: number): string {
    return priceRs === 0 ? 'Rs 0' : `Rs ${new Intl.NumberFormat('en-PK').format(priceRs)}`;
  }

  formatStat(value: number | null, suffix = ''): string {
    if (value === null || value === undefined) return '--';
    return `${new Intl.NumberFormat('en-PK', { maximumFractionDigits: 2 }).format(value)}${suffix}`;
  }

  trackPlan(_: number, plan: { code: string }): string {
    return plan.code;
  }

  trackQuota(_: number, quota: QuotaCard): string {
    return quota.label;
  }

  private normalizePlanCode(value: unknown): AdminPlanCode {
    const key = String(value ?? '').toLowerCase().replace(/[^a-z0-9_]/g, '');
    return LEGACY_PLAN_CODES[key] ?? 'free';
  }

  private collectQuotaCards(source: unknown): QuotaCard[] {
    const buckets = this.extractBuckets(source);
    if (buckets.length === 0) return [];

    const cards = new Map<QuotaCard['label'], QuotaCard>();

    for (const bucket of buckets) {
      const label = this.normalizeQuotaLabel(this.firstString(bucket, ['label', 'name', 'displayName', 'key', 'bucket', 'type']));
      const card = cards.get(label) ?? { label, icon: this.quotaIcon(label), lines: [], stack: [] };

      card.lines.push({
        label: this.normalizeQuotaDetailLabel(bucket, label),
        value: this.formatQuotaValue(bucket)
      });
      card.stack.push(...this.extractStack(bucket));
      cards.set(label, card);
    }

    return Array.from(cards.values());
  }

  private extractBuckets(source: unknown): Array<Record<string, unknown>> {
    if (Array.isArray(source)) return source.filter(this.isRecord);
    if (!this.isRecord(source)) return [];

    for (const key of ['quotaBuckets', 'quotas', 'buckets', 'limits', 'wallets']) {
      const nested = source[key];
      const nestedBuckets = this.extractBuckets(nested);
      if (nestedBuckets.length > 0) return nestedBuckets;
    }

    return Object.entries(source).map(([key, value]) => this.isRecord(value) ? { ...value, key: value['key'] ?? key } : { key, value });
  }

  private extractStack(bucket: Record<string, unknown>): QuotaStackItem[] {
    const stack = ['stack', 'sources', 'components', 'segments', 'breakdown']
      .map(key => bucket[key])
      .find(Array.isArray);

    return stack
      ? stack.map(item => this.isRecord(item)
        ? { label: this.stackLabel(this.firstString(item, ['label', 'name', 'source', 'sourceType', 'type'])), value: this.formatQuotaValue(item) }
        : { label: 'Stacked bucket', value: String(item ?? 'Available') })
      : [];
  }

  private normalizeQuotaLabel(value: string | null): QuotaCard['label'] {
    const text = String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (text.includes('storage')) return 'Storage';
    if (text.includes('voice') || text.includes('tts') || text.includes('speech')) return 'Voice Minutes';
    if (text.includes('image') && text.includes('motion')) return 'Creation Wallet';
    if ((text.includes('ai') && text.includes('video')) || text.includes('providerclip')) return 'AI Video Clips';
    if (text.includes('processing') || text.includes('whisper') || text.includes('pipeline') || text.includes('videocreation')) return 'Processing / Whisper Minutes';
    if (text.includes('manualscan') || text.includes('template') || text.includes('soundtrack') || text.includes('ecommerce') || text.includes('runtime') || text.includes('maxseconds')) return 'Platform Features';
    return 'Creation Wallet';
  }

  private normalizeQuotaDetailLabel(bucket: Record<string, unknown>, fallback: QuotaCard['label']): string {
    const text = String(this.firstString(bucket, ['label', 'name', 'displayName', 'key', 'bucket', 'type']) ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (text.includes('stockclipminute')) return 'Stock clip minutes';
    if (text.includes('stockclip')) return 'Stock clips';
    if (text.includes('stockimage')) return 'Stock images';
    if (text.includes('aiimage')) return 'AI images';
    if (fallback === 'AI Video Clips') return 'Provider clips';
    if (text.includes('manualscan')) return 'Manual scans';
    if (text.includes('template')) return 'Templates';
    if (text.includes('soundtrack')) return 'Soundtracks';
    if (text.includes('ecommerce')) return 'Ecommerce stores';
    if (text.includes('socialpost') && text.includes('seconds')) return 'Social video max seconds';
    if (text.includes('browser') && text.includes('runtime')) return 'Browser runtime max seconds';
    if (text.includes('mobile') && text.includes('runtime')) return 'Mobile runtime max seconds';
    if (text.includes('desktop') && text.includes('runtime')) return 'Desktop runtime max seconds';
    return 'Allowance';
  }

  private quotaIcon(label: QuotaCard['label']): string {
    const icons: Record<QuotaCard['label'], string> = {
      'Creation Wallet': 'fas fa-wallet',
      'Processing / Whisper Minutes': 'fas fa-clock',
      'Voice Minutes': 'fas fa-microphone',
      'AI Video Clips': 'fas fa-film',
      Storage: 'fas fa-database',
      'Platform Features': 'fas fa-cubes'
    };
    return icons[label];
  }

  private stackLabel(value: string | null): string {
    const text = String(value ?? '').toLowerCase();
    if (text.includes('base') || text.includes('plan')) return 'Base plan';
    if (text.includes('override') || text.includes('admin') || text.includes('user')) return 'Override';
    if (text.includes('addon') || text.includes('topup')) return 'Add-on';
    return 'Stacked bucket';
  }

  private formatQuotaValue(bucket: Record<string, unknown>): string {
    const unit = this.firstString(bucket, ['unit', 'units']);
    const display = this.firstString(bucket, ['displayValue', 'summary', 'text']);
    if (display) return display;

    const parts = [
      this.formatQuotaPart('Limit', bucket['limit'] ?? bucket['total'] ?? bucket['allowed'] ?? bucket['allowance'], unit),
      this.formatQuotaPart('Used', bucket['used'] ?? bucket['consumed'], unit),
      this.formatQuotaPart('Remaining', bucket['remaining'] ?? bucket['available'], unit)
    ].filter(Boolean);

    return parts.length > 0 ? parts.join(' / ') : this.formatQuotaPrimitive(bucket['value'] ?? bucket['amount'], unit);
  }

  private formatQuotaPart(label: string, value: unknown, unit: string | null): string | null {
    return value === undefined ? null : `${label} ${this.formatQuotaPrimitive(value, unit)}`;
  }

  private formatQuotaPrimitive(value: unknown, unit: string | null): string {
    if (typeof value === 'number') {
      const formatted = new Intl.NumberFormat('en-PK', { maximumFractionDigits: 2 }).format(value);
      return unit ? `${formatted} ${unit}` : formatted;
    }
    if (typeof value === 'string') return unit ? `${value} ${unit}` : value;
    if (value === null) return 'Inherited';
    return 'Available';
  }

  private firstString(record: Record<string, unknown>, keys: string[]): string | null {
    for (const key of keys) {
      const value = record[key];
      if (typeof value === 'string' && value.trim()) return value;
    }
    return null;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
