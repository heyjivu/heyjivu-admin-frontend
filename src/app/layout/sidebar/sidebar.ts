import { Component, inject, computed, signal, DestroyRef } from '@angular/core';
import { NgFor, CommonModule } from '@angular/common';
import { Router, RouterLink, NavigationEnd } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { UIStore } from '../../core/services/ui.store';
import { AuthStore } from '../../core/auth/state/auth.store';
import { Rights } from '../../core/constants/rights.constants';
import { AppIcons } from '../../core/constants/icons.constants';
import { JivuCommandAdminStore } from '../../features/jivu-command/state/jivu-command-admin.store';

type NavItem = {
  label: string;
  icon: string;
  route: string;
  queryParams?: Record<string, string>;
  badge?: string;
  right?: string;
  section?: string;
  isParent?: boolean;
};

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [NgFor, CommonModule, RouterLink],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  uiStore = inject(UIStore);
  authStore = inject(AuthStore);
  jivuCommandStore = inject(JivuCommandAdminStore);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  readonly Rights = Rights;
  readonly Icons = AppIcons;
  
  readonly currentPathSignal = signal(this.router.url);
  readonly currentPath = computed(() => this.currentPathSignal().split(/[?#]/)[0]);

  constructor() {
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((e: any) => {
      this.currentPathSignal.set(e.urlAfterRedirects || e.url);
    });
  }

  readonly allNav: NavItem[] = [
    { label: 'User Management', icon: 'fas fa-users-cog', route: '/admin/users', queryParams: { tab: 'users' }, section: 'users' },
    { label: 'Roles & Rights', icon: 'fas fa-shield-alt', route: '/admin/users', queryParams: { tab: 'roles' }, section: 'users' },
    { label: 'Organizations', icon: 'fas fa-building', route: '/admin/users', queryParams: { tab: 'orgs' }, section: 'users' },
    { label: 'Global Combined', icon: 'fas fa-globe', route: '/admin/metrics', queryParams: { view: 'combined' }, section: 'metrics' },
    { label: 'Audit Report', icon: 'fas fa-list-check', route: '/admin/metrics/audit', section: 'metrics' },
    { label: 'BYOK Usage', icon: 'fas fa-key', route: '/admin/metrics/byok', section: 'metrics' },
    { label: 'Payment Settings', icon: 'fas fa-credit-card', route: '/admin/payments', section: 'payments' },
    { label: 'Company AI Keys', icon: 'fas fa-key', route: '/admin/ai-keys', right: Rights.Admin_AIKeys_View, section: 'ai-keys' },
    { label: 'Jivu Command', icon: 'fas fa-terminal', route: '/admin/jivu-command', section: 'pipeline' },
    { label: 'Trend Radar', icon: 'fas fa-share-nodes', route: '/admin/radars', queryParams: { radar: 'trend' }, section: 'radars' },
    { label: 'Dashboard Radar', icon: 'fas fa-chart-line', route: '/admin/radars', queryParams: { radar: 'dashboard' }, section: 'radars' },
    { label: 'Store Radar', icon: 'fas fa-store', route: '/admin/radars', queryParams: { radar: 'store' }, section: 'radars' },
    { label: 'Processing Config', icon: 'fas fa-cog', route: '/admin/processing', right: Rights.Admin_Config_View, section: 'config' },
    { label: 'Model Configuration', icon: 'fas fa-sliders', route: '/admin/processing', queryParams: { tab: 'models' }, right: Rights.Admin_Config_View, section: 'config' },
    { label: 'Assets Studio', icon: 'fas fa-wand-magic-sparkles', route: '/admin/templates', right: Rights.Admin_Config_View, section: 'templates' },
    { label: 'Assets', icon: 'fas fa-photo-film', route: '/admin/assets', right: Rights.Admin_Config_View, section: 'assets' },
    { label: 'User Cloud', icon: 'fas fa-cloud', route: '/admin/cloud', right: Rights.Admin_Config_View, section: 'cloud' },
    { label: 'Free', icon: 'fas fa-user', route: '/admin/plan-users', queryParams: { plan: 'free' }, section: 'plan-users' },
    { label: 'Student', icon: 'fas fa-graduation-cap', route: '/admin/plan-users', queryParams: { plan: 'student' }, section: 'plan-users' },
    { label: 'Merchant', icon: 'fas fa-store', route: '/admin/plan-users', queryParams: { plan: 'merchant' }, section: 'plan-users' },
    { label: 'Premium', icon: 'fas fa-crown', route: '/admin/plan-users', queryParams: { plan: 'premium' }, section: 'plan-users' },
    { label: 'BYOK', icon: 'fas fa-key', route: '/admin/plan-users', queryParams: { plan: 'byok' }, section: 'plan-users' },
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
    if (path.startsWith('/admin/templates')) return 'templates';
    if (path.startsWith('/admin/assets')) return 'assets';
    if (path.startsWith('/admin/cloud')) return 'cloud';
    if (path.startsWith('/admin/plan-users')) return 'plan-users';
    return null;
  });

  readonly navItems = computed(() => {
    const section = this.currentSection();
    return section ? this.allNav.filter(i => i.section === section && this.canViewNavItem(i)) : [];
  });

  getIconClass(icon: string): string {
    return icon;
  }

  isActiveNavItem(item: NavItem): boolean {
    const url = this.router.url;
    const path = url.split('?')[0];
    if (path !== item.route) return false;
    const query = url.includes('?') ? url.split('?')[1] : '';
    if (item.isParent) {
      return !query.includes('type=') && !query.includes('status=');
    }
    if (item.queryParams) {
      for (const key of Object.keys(item.queryParams)) {
        const value = item.queryParams[key];
        const paramStr = `${key}=${value}`;
        if (!url.includes(paramStr)) return false;
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
    if (section === 'assets') return 'Asset Management';
    if (section === 'cloud') return 'User Cloud';
    if (section === 'plan-users') return 'Plan Users';
    return 'Admin Portal';
  }

  private canViewNavItem(item: NavItem): boolean {
    return !item.right || this.authStore.isSuperAdmin() || this.authStore.hasRight()(item.right);
  }
}


