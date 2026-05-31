import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/guards/auth.guard';
import { hasRight } from './core/guards/admin.guard';
import { Rights } from './core/constants/rights.constants';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'admin/dashboard'
  },
  {
    path: '',
    loadComponent: () => import('./layout/shell/auth-layout/auth-layout').then(m => m.AuthLayout),
    children: [
      {
        path: 'privacy',
        loadComponent: () => import('./core/legal/pages/legal-page').then((m) => m.LegalPageComponent),
        data: { page: 'privacy' },
      },
      {
        path: 'terms',
        loadComponent: () => import('./core/legal/pages/legal-page').then((m) => m.LegalPageComponent),
        data: { page: 'terms' },
      },
      {
        path: 'google-oauth-disclosure',
        loadComponent: () => import('./core/legal/pages/legal-page').then((m) => m.LegalPageComponent),
        data: { page: 'oauth' },
      },
      {
        path: 'login',
        canActivate: [guestGuard],
        loadComponent: () => import('./core/auth/pages/login/login.page').then((m) => m.LoginPage),
      },
      {
        path: 'register',
        canActivate: [guestGuard],
        loadComponent: () => import('./core/auth/pages/register/register.page').then((m) => m.RegisterPage),
      },
      {
        path: 'confirm-email',
        loadComponent: () => import('./core/auth/pages/confirm-email/confirm-email.page').then((m) => m.ConfirmEmailPage),
      }
    ]
  },
  {
    path: 'admin',
    loadComponent: () => import('./layout/shell/admin-layout/admin-layout').then(m => m.AdminLayout),
    children: [
      {
        path: 'dashboard',
        canActivate: [authGuard, hasRight(Rights.Dashboard_View)],
        loadComponent: () => import('./features/dashboard/admin-dashboard.page').then((m) => m.AdminDashboardPage),
      },
      {
        path: 'metrics',
        canActivate: [authGuard, hasRight(Rights.Admin_Metrics_View)],
        loadComponent: () => import('./features/metrics/pages/reports.page').then((m) => m.ReportsPage),
      },
      {
        path: 'users',
        canActivate: [authGuard, hasRight(Rights.Admin_Users_View)],
        loadComponent: () => import('./features/users/user-management/user-management').then((m) => m.UserManagementComponent),
      },
      {
        path: 'payments',
        canActivate: [authGuard, hasRight(Rights.Admin_Payments_View)],
        loadComponent: () => import('./features/payments/payment-management.page').then((m) => m.PaymentManagementPage),
      },
      {
        path: 'brain',
        canActivate: [authGuard, hasRight(Rights.Admin_Brain_View)],
        loadComponent: () => import('./features/brain/brain-config.page').then((m) => m.BrainConfigPage),
      },
      {
        path: 'processing',
        canActivate: [authGuard, hasRight(Rights.Admin_Config_View)],
        loadComponent: () => import('./features/config/processing-config.page').then((m) => m.ProcessingConfigPage),
      },
      {
        path: 'templates',
        canActivate: [authGuard, hasRight(Rights.Admin_Config_View)],
        loadComponent: () => import('./features/templates/template-studio.page').then((m) => m.TemplateStudioPage),
      },
      {
        path: 'memes',
        canActivate: [authGuard, hasRight(Rights.Memes_View)],
        loadComponent: () => import('./features/memes/meme-management.page').then((m) => m.MemeManagementPage),
      },
      {
        path: 'pipeline',
        canActivate: [authGuard, hasRight(Rights.Pipeline_View)],
        loadComponent: () => import('./features/pipeline/pipeline-monitor.page').then((m) => m.PipelineMonitorPage),
      },
      {
        path: 'run-jobs',
        canActivate: [authGuard, hasRight(Rights.Pipeline_Manage)],
        loadComponent: () => import('./features/pipeline/run-jobs/run-jobs.page').then((m) => m.RunJobsPage),
      },
      {
        path: 'plan-users',
        canActivate: [authGuard, hasRight(Rights.Admin_PlanUsers_View)],
        loadComponent: () => import('./features/plan-users/plan-users.page').then((m) => m.PlanUsersPage),
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'admin/dashboard'
  }
];
