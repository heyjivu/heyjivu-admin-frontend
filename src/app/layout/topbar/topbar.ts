import { Component, inject, signal, OnInit, HostListener, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Rights } from '../../core/constants/rights.constants';
import { UIStore } from '../../core/services/ui.store';
import { AuthStore } from '../../core/auth/state/auth.store';
import { PipelineStore } from '../../features/pipeline/state/pipeline.store';

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
  pipelineStore = inject(PipelineStore);
  private readonly router = inject(Router);
  readonly Rights = Rights;

  showUserMenu = signal(false);
  showPipelineMenu = signal(false);
  private mobileWidth = 768;

  activeJobs = computed(() => this.pipelineStore.activeJobs());
  hasActiveJobs = computed(() => this.activeJobs().length > 0);

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

  private checkMobile() {}

  toggleUserMenu() {
    this.showUserMenu.update(v => !v);
    this.showPipelineMenu.set(false);
  }

  togglePipelineMenu(event: Event) {
    event.stopPropagation();
    this.showPipelineMenu.update(v => !v);
    this.showUserMenu.set(false);
  }

  @HostListener('document:click')
  closeMenus() {
    this.showUserMenu.set(false);
    this.showPipelineMenu.set(false);
  }

  logout() {
    this.authStore.logout();
  }

  refreshJobs() {
    this.pipelineStore.loadJobs();
  }
}


