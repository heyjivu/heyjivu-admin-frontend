import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, catchError, finalize, forkJoin, of } from 'rxjs';
import { ToastService } from '../../core/services/toast.service';
import {
  AdminRadarsService,
  AdminRadarAudience,
  AdminRadarJob,
  AdminRadarJobs,
  AdminRadarType,
  AdminRadarTriggerResult
} from './services/admin-radars.service';
import { AdminService, RoleDto, UserManagementDto } from '../users/services/admin.service';

interface RadarMenuItem {
  id: AdminRadarType;
  label: string;
  icon: string;
  description: string;
}

@Component({
  selector: 'app-admin-radars-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-radars.page.html',
  styleUrl: './admin-radars.page.scss'
})
export class AdminRadarsPage implements OnInit, OnDestroy {
  private readonly radars = inject(AdminRadarsService);
  private readonly admin = inject(AdminService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly subscriptions = new Subscription();

  readonly radarMenus: RadarMenuItem[] = [
    {
      id: 'trend',
      label: 'Trend Radar',
      icon: 'fas fa-share-nodes',
      description: 'Processed media to social platform queues'
    },
    {
      id: 'dashboard',
      label: 'Dashboard Radar',
      icon: 'fas fa-chart-line',
      description: 'Dashboard recommendations and niche presets'
    },
    {
      id: 'store',
      label: 'Store Radar',
      icon: 'fas fa-store',
      description: 'Selected published stores and product opportunities'
    }
  ];

  readonly activeRadar = signal<AdminRadarType>('trend');
  readonly activeAudience = signal<AdminRadarAudience>('non-byok');
  readonly jobs = signal<AdminRadarJobs | null>(null);
  readonly roles = signal<RoleDto[]>([]);
  readonly users = signal<UserManagementDto[]>([]);
  readonly selectedRoleIds = signal<Set<string>>(new Set());
  readonly selectedUserIds = signal<Set<string>>(new Set());
  readonly isLoadingJobs = signal(false);
  readonly isLoadingTargets = signal(false);
  readonly isTriggerModalOpen = signal(false);
  readonly isTriggering = signal(false);
  readonly lastTriggerResult = signal<AdminRadarTriggerResult | null>(null);

  readonly activeRadarMenu = computed(() => this.radarMenus.find((item) => item.id === this.activeRadar()) || this.radarMenus[0]);
  readonly activeJobs = computed(() => this.jobs()?.runningJobs || []);
  readonly recentJobs = computed(() => this.jobs()?.recentJobs || []);
  readonly failedJobs = computed(() => this.jobs()?.failedJobs || []);
  readonly selectedRoles = computed(() => this.roles().filter((role) => this.selectedRoleIds().has(role.id)));
  readonly eligibleUsers = computed(() => {
    const selectedRoles = this.selectedRoleIds();
    if (selectedRoles.size === 0) {
      return [];
    }

    return this.users()
      .filter((user) => user.isActive)
      .filter((user) => !!user.roleId && selectedRoles.has(user.roleId))
      .filter((user) => this.userMatchesAudience(user, this.activeAudience()))
      .sort((left, right) => left.username.localeCompare(right.username));
  });
  readonly canTrigger = computed(() => this.selectedRoleIds().size > 0 && !this.isTriggering());

  ngOnInit(): void {
    this.loadTargets();
    this.subscriptions.add(
      this.route.queryParamMap.subscribe((params) => {
        const radar = this.normalizeRadar(params.get('radar'));
        if (radar && radar !== this.activeRadar()) {
          this.activeRadar.set(radar);
        }
        this.loadJobs();
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  selectRadar(radar: AdminRadarType): void {
    this.activeRadar.set(radar);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { radar },
      queryParamsHandling: 'merge'
    });
    this.loadJobs();
  }

  selectAudience(audience: AdminRadarAudience): void {
    this.activeAudience.set(audience);
    this.selectedUserIds.set(new Set());
    this.loadJobs();
  }

  openTriggerModal(): void {
    this.selectedRoleIds.set(new Set());
    this.selectedUserIds.set(new Set());
    this.lastTriggerResult.set(null);
    this.isTriggerModalOpen.set(true);
  }

  closeTriggerModal(): void {
    if (!this.isTriggering()) {
      this.isTriggerModalOpen.set(false);
    }
  }

  toggleRole(roleId: string, checked: boolean): void {
    this.selectedRoleIds.update((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(roleId);
      } else {
        next.delete(roleId);
      }
      return next;
    });
    this.pruneSelectedUsers();
  }

  toggleUser(userId: string, checked: boolean): void {
    this.selectedUserIds.update((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(userId);
      } else {
        next.delete(userId);
      }
      return next;
    });
  }

  roleSelected(roleId: string): boolean {
    return this.selectedRoleIds().has(roleId);
  }

  userSelected(userId: string): boolean {
    return this.selectedUserIds().has(userId);
  }

  submitTrigger(): void {
    if (!this.canTrigger()) {
      this.toast.show('Select at least one role before triggering a radar scan.', 'warning');
      return;
    }

    this.isTriggering.set(true);
    this.lastTriggerResult.set(null);
    this.radars.trigger(this.activeRadar(), {
      audience: this.activeAudience(),
      roleIds: [...this.selectedRoleIds()],
      userIds: [...this.selectedUserIds()]
    }).pipe(
      catchError((error) => {
        const result = error?.error as AdminRadarTriggerResult | undefined;
        if (result) {
          return of(result);
        }
        this.toast.error(error?.error?.message || error?.error?.error || 'Could not trigger radar scan.');
        return of(null);
      }),
      finalize(() => this.isTriggering.set(false))
    ).subscribe((result) => {
      if (!result) {
        return;
      }

      this.lastTriggerResult.set(result);
      if (!result.success) {
        this.toast.error(result.errorMessage || 'Radar trigger failed.');
        return;
      }

      this.toast.success(`${result.jobsCount} ${this.activeRadarMenu().label} job(s) queued.`);
      this.loadJobs();
    });
  }

  refresh(): void {
    this.loadJobs();
    this.loadTargets();
  }

  statusTone(status: string): string {
    const normalized = status.toLowerCase();
    if (normalized.includes('fail')) return 'danger';
    if (normalized.includes('complete')) return 'success';
    if (normalized.includes('process') || normalized.includes('queue')) return 'info';
    return 'muted';
  }

  audienceLabel(): string {
    return this.activeAudience() === 'byok' ? 'BYOK' : 'NON-BYOK';
  }

  targetSummary(): string {
    const roleCount = this.selectedRoleIds().size;
    const userCount = this.selectedUserIds().size;
    if (roleCount === 0) return 'Select roles';
    if (userCount > 0) return `${roleCount} role(s), ${userCount} user(s)`;
    return `${roleCount} role(s), all matching users`;
  }

  trackById(_: number, item: { id: string }): string {
    return item.id;
  }

  private loadJobs(): void {
    this.isLoadingJobs.set(true);
    this.radars.getJobs(this.activeRadar(), this.activeAudience()).pipe(
      catchError(() => of({ runningJobs: [], recentJobs: [], failedJobs: [] } as AdminRadarJobs)),
      finalize(() => this.isLoadingJobs.set(false))
    ).subscribe((jobs) => this.jobs.set(jobs));
  }

  private loadTargets(): void {
    this.isLoadingTargets.set(true);
    this.subscriptions.add(
      forkJoin({
        roles: this.admin.getRoles().pipe(
          catchError(() => of([] as RoleDto[]))
        ),
        users: this.admin.getUsers({
          pageNumber: 1,
          pageSize: 500,
          isActive: true,
          includeQuotaSummary: false
        }).pipe(
          catchError(() => of({ items: [], totalCount: 0, pageNumber: 1, pageSize: 500 }))
        )
      }).pipe(
        finalize(() => this.isLoadingTargets.set(false))
      ).subscribe(({ roles, users }) => {
        this.roles.set(roles);
        this.users.set(users.items || []);
        this.pruneSelectedUsers();
      })
    );
  }

  private pruneSelectedUsers(): void {
    const eligible = new Set(this.eligibleUsers().map((user) => user.id));
    this.selectedUserIds.update((current) => new Set([...current].filter((userId) => eligible.has(userId))));
  }

  private userMatchesAudience(user: UserManagementDto, audience: AdminRadarAudience): boolean {
    const isByok = !!(
      user.isByokProcessing ||
      user.isByokTrend ||
      user.isByokVideoGeneration ||
      user.isByokPosts ||
      user.roleName?.toLowerCase().includes('byok')
    );
    return audience === 'byok' ? isByok : !isByok;
  }

  private normalizeRadar(value: string | null): AdminRadarType | null {
    if (value === 'trend' || value === 'dashboard' || value === 'store') {
      return value;
    }
    return null;
  }
}
