import { Component, inject, computed, signal, DestroyRef } from '@angular/core';
import { NgFor, CommonModule } from '@angular/common';
import { Router, RouterLink, NavigationEnd } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { UIStore } from '../../core/services/ui.store';
import { AuthStore } from '../../core/auth/state/auth.store';
import { Rights } from '../../core/constants/rights.constants';
import { AppIcons } from '../../core/constants/icons.constants';
import { PipelineStore } from '../../features/pipeline/state/pipeline.store';

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
  pipelineStore = inject(PipelineStore);
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
    { label: 'Payment Settings', icon: 'fas fa-credit-card', route: '/admin/payments', section: 'payments' },
    { label: 'Brain Config', icon: 'fas fa-brain', route: '/admin/brain', right: Rights.Admin_Brain_View, section: 'brain' },
    { label: 'Run Jobs', icon: 'fas fa-play-circle', route: '/admin/run-jobs', section: 'pipeline' },
    { label: 'Queue', icon: 'fas fa-clock', route: '/admin/pipeline', queryParams: { status: 'queued' }, section: 'pipeline' },
    { label: 'Active Jobs', icon: 'fas fa-spinner', route: '/admin/pipeline', queryParams: { status: 'processing' }, section: 'pipeline' },
    { label: 'Failed Jobs', icon: 'fas fa-exclamation-triangle', route: '/admin/pipeline', queryParams: { status: 'failed' }, section: 'pipeline' },
    { label: 'Completed Jobs', icon: 'fas fa-check-circle', route: '/admin/pipeline', queryParams: { status: 'done' }, section: 'pipeline' },
    { label: 'Processing Config', icon: 'fas fa-cog', route: '/admin/processing', right: Rights.Admin_Config_View, section: 'config' },
    { label: 'Memes', icon: 'fas fa-laugh', route: '/admin/memes', right: Rights.Memes_Manage, section: 'memes' },
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
    if (path.startsWith('/admin/brain')) return 'brain';
    if (path.startsWith('/admin/pipeline') || path.startsWith('/admin/run-jobs')) return 'pipeline';
    if (path.startsWith('/admin/processing')) return 'config';
    if (path.startsWith('/admin/memes')) return 'memes';
    if (path.startsWith('/admin/plan-users')) return 'plan-users';
    return null;
  });

  readonly navItems = computed(() => {
    const section = this.currentSection();
    return section ? this.allNav.filter(i => i.section === section) : [];
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
    }
    return true;
  }

  getBadge(item: NavItem): string | null {
    if (item.section !== 'pipeline') return null;
    const counts = this.pipelineStore.pipelineCounts();
    if (item.isParent) {
      const total = this.pipelineStore.globalStats().totalJobs;
      return total > 0 ? total.toString() : null;
    }
    const type = item.queryParams?.['type'];
    if (type && counts[type]) {
      return counts[type].toString();
    }
    return null;
  }

  get currentModuleTitle(): string {
    const section = this.currentSection();
    if (section === 'metrics') return 'Metrics & Reports';
    if (section === 'users') return 'User Management';
    if (section === 'payments') return 'Payment Settings';
    if (section === 'brain') return 'Brain Config';
    if (section === 'pipeline') return 'Pipeline';
    if (section === 'config') return 'Processing Config';
    if (section === 'memes') return 'Meme Management';
    if (section === 'plan-users') return 'Plan Users';
    return 'Admin Portal';
  }
}


