import { Component, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Topbar } from '../../topbar/topbar';
import { Sidebar } from '../../sidebar/sidebar';

@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, Topbar, Sidebar, CommonModule],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.scss',
})
export class AdminLayout {
  private readonly router = inject(Router);

  protected showSidebar(): boolean {
    const path = this.router.url.split(/[?#]/)[0];
    return path.startsWith('/admin') && path !== '/admin/dashboard' && path !== '/admin';
  }
}
