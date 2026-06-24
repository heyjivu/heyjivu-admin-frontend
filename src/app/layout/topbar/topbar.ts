import { Component, inject, signal, OnInit, HostListener, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Rights } from '../../core/constants/rights.constants';
import { UIStore } from '../../core/services/ui.store';
import { AuthStore } from '../../core/auth/state/auth.store';
import { JivuCommandAdminStore } from '../../features/jivu-command/state/jivu-command-admin.store';
import { AppUpdateService } from '../../core/services/app-update.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './topbar.html',
  styleUrl: './topbar.scss'
})
export class Topbar implements OnInit {
  uiStore = inject(UIStore);
  authStore = inject(AuthStore);
  jivuCommandStore = inject(JivuCommandAdminStore);
  appUpdate = inject(AppUpdateService);
  private readonly router = inject(Router);
  readonly Rights = Rights;

  showUserMenu = signal(false);
  showCommandMenu = signal(false);
  private mobileWidth = 768;

  activeCommands = computed(() => this.jivuCommandStore.activeCommands());
  activeCommandCount = computed(() => this.jivuCommandStore.activeCount());
  commandStatusLoaded = computed(() => this.jivuCommandStore.hasLoaded());
  commandStatusRefreshing = computed(() => this.jivuCommandStore.refreshing() || this.jivuCommandStore.loading());
  hasActiveCommands = computed(() => this.activeCommandCount() > 0);

  @HostListener('window:resize')
  onResize() {
    this.checkMobile();
  }

  ngOnInit() {
    this.checkMobile();
  }

  isMobile(): boolean {
    return window.innerWidth < this.mobileWidth;
  }

  showSidebarToggle(): boolean {
    const path = this.router.url.split(/[?#]/)[0];
    return path.startsWith('/admin') && path !== '/admin/dashboard' && path !== '/admin';
  }

  private checkMobile() {}

  toggleUserMenu() {
    this.showUserMenu.update(v => !v);
    this.showCommandMenu.set(false);
  }

  toggleCommandMenu(event: Event) {
    event.stopPropagation();
    const nextOpen = !this.showCommandMenu();
    this.showCommandMenu.set(nextOpen);
    this.showUserMenu.set(false);
    if (nextOpen) {
      this.jivuCommandStore.refresh(false);
    }
  }

  @HostListener('document:click')
  closeMenus() {
    this.showUserMenu.set(false);
    this.showCommandMenu.set(false);
  }

  logout() {
    this.authStore.logout();
  }

  refreshCommands() {
    this.jivuCommandStore.refresh(false);
  }
}


