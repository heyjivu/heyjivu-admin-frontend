import { Component, inject, computed, signal, DestroyRef } from '@angular/core';
import { NgFor, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, NavigationEnd } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { UIStore } from '../../core/services/ui.store';
import { AuthStore } from '../../core/auth/state/auth.store';
import { Rights } from '../../core/constants/rights.constants';
import { AppIcons } from '../../core/constants/icons.constants';
import { JivuCommandAdminStore } from '../../features/jivu-command/state/jivu-command-admin.store';
import { AdminCloudUserStore } from '../../features/cloud/state/admin-cloud-user.store';
import { UserManagementDto } from '../../features/users/services/admin.service';

type NavItem = {
  label: string;
  icon: string;
  route: string;
  queryParams?: Record<string, string>;
  badge?: string;
  right?: string;
  section?: string;
  isParent?: boolean;
  superAdminOnly?: boolean;
};

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [NgFor, CommonModule, FormsModule, RouterLink],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  uiStore = inject(UIStore);
  authStore = inject(AuthStore);
  jivuCommandStore = inject(JivuCommandAdminStore);
  cloudUsers = inject(AdminCloudUserStore);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  readonly Rights = Rights;
  readonly Icons = AppIcons;
  
  readonly currentPathSignal = signal(this.router.url);
  readonly currentPath = computed(() => this.currentPathSignal().split(/[?#]/)[0]);

  constructor() {
    this.ensureCloudUsersForUrl(this.router.url);
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((e: any) => {
      const url = e.urlAfterRedirects || e.url;
      this.currentPathSignal.set(url);
      this.ensureCloudUsersForUrl(url);
    });
  }

  readonly allNav: NavItem[] = [
    { label: 'User Management', icon: 'fas fa-users-cog', route: '/admin/users', queryParams: { tab: 'users' }, section: 'users' },
    { label: 'Device logs', icon: 'fas fa-desktop', route: '/admin/users/device-logs', section: 'users' },
    { label: 'Roles & Rights', icon: 'fas fa-shield-alt', route: '/admin/users', queryParams: { tab: 'roles' }, section: 'users', superAdminOnly: true },
    { label: 'Organizations', icon: 'fas fa-building', route: '/admin/users', queryParams: { tab: 'orgs' }, section: 'users', superAdminOnly: true },
    { label: 'User Quota', icon: 'fas fa-gauge-high', route: '/admin/users', queryParams: { tab: 'quotas' }, section: 'users', superAdminOnly: true },
    { label: 'Global Combined', icon: 'fas fa-globe', route: '/admin/metrics', queryParams: { view: 'combined' }, section: 'metrics' },
    { label: 'Audit Report', icon: 'fas fa-list-check', route: '/admin/metrics/audit', section: 'metrics' },
    { label: 'BYOK Usage', icon: 'fas fa-key', route: '/admin/metrics/byok', section: 'metrics' },
    { label: 'Payment Settings', icon: 'fas fa-credit-card', route: '/admin/payments', section: 'payments', superAdminOnly: true },
    { label: 'Manual Payments', icon: 'fas fa-qrcode', route: '/admin/payments', queryParams: { section: 'manual' }, section: 'payments', superAdminOnly: true },
    { label: 'Referral Code Users', icon: 'fas fa-user-tag', route: '/admin/payments', queryParams: { section: 'referrals' }, section: 'payments', superAdminOnly: true },
    { label: 'Company AI Keys', icon: 'fas fa-key', route: '/admin/ai-keys', right: Rights.Admin_AIKeys_View, section: 'ai-keys' },
    { label: 'Jivu Command', icon: 'fas fa-terminal', route: '/admin/jivu-command', section: 'pipeline' },
    { label: 'Trend Radar', icon: 'fas fa-share-nodes', route: '/admin/radars', queryParams: { radar: 'trend' }, section: 'radars' },
    { label: 'Dashboard Radar', icon: 'fas fa-chart-line', route: '/admin/radars', queryParams: { radar: 'dashboard' }, section: 'radars' },
    { label: 'Store Radar', icon: 'fas fa-store', route: '/admin/radars', queryParams: { radar: 'store' }, section: 'radars' },
    { label: 'Processing Config', icon: 'fas fa-cog', route: '/admin/processing', right: Rights.Admin_Config_View, section: 'config', superAdminOnly: true },
    { label: 'Model Configuration', icon: 'fas fa-sliders', route: '/admin/processing', queryParams: { tab: 'models' }, right: Rights.Admin_Config_View, section: 'config', superAdminOnly: true },
    { label: 'Templates', icon: 'fas fa-clone', route: '/admin/templates', queryParams: { section: 'templates' }, right: Rights.Admin_Config_View, section: 'templates', superAdminOnly: true },
    { label: 'Soundtracks', icon: 'fas fa-music', route: '/admin/templates', queryParams: { section: 'soundtracks' }, right: Rights.Admin_Config_View, section: 'templates', superAdminOnly: true },
    { label: 'Assets', icon: 'fas fa-photo-film', route: '/admin/templates', queryParams: { section: 'assets' }, right: Rights.Admin_Config_View, section: 'templates', superAdminOnly: true },
    { label: 'User Cloud', icon: 'fas fa-cloud', route: '/admin/cloud', right: Rights.Admin_Config_View, section: 'cloud', superAdminOnly: true },
    { label: 'Free', icon: 'fas fa-user', route: '/admin/plan-users', queryParams: { plan: 'free' }, section: 'plan-users', superAdminOnly: true },
    { label: 'Student', icon: 'fas fa-graduation-cap', route: '/admin/plan-users', queryParams: { plan: 'student' }, section: 'plan-users', superAdminOnly: true },
    { label: 'Merchant', icon: 'fas fa-store', route: '/admin/plan-users', queryParams: { plan: 'merchant' }, section: 'plan-users', superAdminOnly: true },
    { label: 'Premium', icon: 'fas fa-crown', route: '/admin/plan-users', queryParams: { plan: 'premium' }, section: 'plan-users', superAdminOnly: true },
    { label: 'BYOK', icon: 'fas fa-key', route: '/admin/plan-users', queryParams: { plan: 'byok' }, section: 'plan-users', superAdminOnly: true },
    { label: 'All Submissions', icon: 'fas fa-inbox', route: '/admin/template-submissions', section: 'template-submissions', superAdminOnly: true },
    { label: 'Pending', icon: 'fas fa-clock', route: '/admin/template-submissions', queryParams: { status: 'Pending' }, section: 'template-submissions', superAdminOnly: true },
    { label: 'Approved', icon: 'fas fa-check', route: '/admin/template-submissions', queryParams: { status: 'Approved' }, section: 'template-submissions', superAdminOnly: true },
    { label: 'Published', icon: 'fas fa-rocket', route: '/admin/template-submissions', queryParams: { status: 'Published' }, section: 'template-submissions', superAdminOnly: true },
  ];

  readonly currentSection = computed(() => {
    const path = this.currentPath();
    if (path.startsWith('/admin/metrics')) return 'metrics';
    if (path.startsWith('/admin/users')) return 'users';
    if (path.startsWith('/admin/payments')) return 'payments';
    if (path.startsWith('/admin/ai-keys') || path.startsWith('/admin/brain')) return 'ai-keys';
    if (path.startsWith('/admin/pipeline') || path.startsWith('/admin/jivu-command')) return 'pipeline';
    if (path.startsWith('/admin/radars') || path.startsWith('/admin/run-jobs')) return 'radars';
    if (path.startsWith('/admin/processing')) return 'config';
    if (path.startsWith('/admin/templates') || path.startsWith('/admin/assets')) return 'templates';
    if (path.startsWith('/admin/cloud')) return 'cloud';
    if (path.startsWith('/admin/plan-users')) return 'plan-users';
    if (path.startsWith('/admin/template-submissions')) return 'template-submissions';
    return null;
  });

  readonly navItems = computed(() => {
    const section = this.currentSection();
    return section ? this.allNav.filter(i => i.section === section && this.canViewNavItem(i)) : [];
  });

  getIconClass(icon: string): string {
    return icon;
  }

  displayLabel(item: NavItem): string {
    return item.section === 'ai-keys' && this.authStore.isTenantAdmin()
      ? 'Organization AI Keys'
      : item.label;
  }

  isActiveNavItem(item: NavItem): boolean {
    const url = this.router.url;
    const path = url.split('?')[0];
    if (path !== item.route) return false;
    const query = url.includes('?') ? url.split('?')[1].split('#')[0] : '';
    if (item.isParent) {
      return !query.includes('type=') && !query.includes('status=');
    }
    if (item.queryParams) {
      const params = new URLSearchParams(query);
      for (const key of Object.keys(item.queryParams)) {
        const value = item.queryParams[key];
        const actual = params.get(key);
        if (actual === value) continue;
        if (item.route === '/admin/templates' && key === 'section' && value === 'templates' && !actual) continue;
        return false;
      }
    } else if (query) {
      return false;
    }
    return true;
  }

  getBadge(item: NavItem): string | null {
    if (item.section !== 'pipeline') return null;
    const activeCount = this.jivuCommandStore.activeCount();
    return activeCount > 0 ? activeCount.toString() : null;
  }

  selectCloudUser(user: UserManagementDto): void {
    this.cloudUsers.selectUser(user);
    if (!this.currentPath().startsWith('/admin/cloud')) {
      this.router.navigate(['/admin/cloud']);
    }
  }

  cloudUserInitial(user: UserManagementDto): string {
    return (user.email || user.username || '?').charAt(0).toUpperCase();
  }

  cloudUserSubtitle(user: UserManagementDto): string {
    const name = user.displayName || user.username || 'User';
    const plan = user.planName || user.planCode || 'No plan';
    return `${name} - ${plan}`;
  }

  get currentModuleTitle(): string {
    const section = this.currentSection();
    if (section === 'metrics') return 'Metrics & Reports';
    if (section === 'users') return 'User Management';
    if (section === 'payments') return 'Payment Settings';
    if (section === 'ai-keys') return 'AI Keys';
    if (section === 'pipeline') return 'Jivu Command';
    if (section === 'radars') return 'Radars';
    if (section === 'config') return 'Processing Config';
    if (section === 'templates') return 'Assets Studio';
    if (section === 'cloud') return 'User Cloud';
    if (section === 'plan-users') return 'Plan Users';
    if (section === 'template-submissions') return 'Template Submissions';
    return 'Admin Portal';
  }

  private canViewNavItem(item: NavItem): boolean {
    if (item.superAdminOnly && !this.authStore.isSuperAdmin()) return false;
    return !item.right || this.authStore.isSuperAdmin() || this.authStore.hasRight()(item.right);
  }

  private ensureCloudUsersForUrl(url: string): void {
    const path = url.split(/[?#]/)[0];
    if (path.startsWith('/admin/cloud')) {
      this.cloudUsers.ensureLoaded();
    }
  }
}


