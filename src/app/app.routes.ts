import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/guards/auth.guard';
import { hasRight, superAdminOnly } from './core/guards/admin.guard';
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
        path: 'forgot-password',
        canActivate: [guestGuard],
        loadComponent: () => import('./core/auth/pages/forgot-password/forgot-password.page').then((m) => m.ForgotPasswordPage),
      },
      {
        path: 'reset-password',
        canActivate: [guestGuard],
        loadComponent: () => import('./core/auth/pages/reset-password/reset-password.page').then((m) => m.ResetPasswordPage),
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
        pathMatch: 'full',
        canActivate: [authGuard, hasRight(Rights.Admin_Metrics_View)],
        loadComponent: () => import('./features/metrics/pages/reports.page').then((m) => m.ReportsPage),
      },
      {
        path: 'metrics/audit',
        canActivate: [authGuard, hasRight(Rights.Admin_Metrics_View)],
        data: {
          title: 'Audit Report',
          subtitle: 'Admin-key AI usage records with cost, token, provider, role, and category filters.',
          origin: 'Included'
        },
        loadComponent: () => import('./features/metrics/pages/audit-report.page').then((m) => m.AuditReportPage),
      },
      {
        path: 'metrics/byok',
        canActivate: [authGuard, hasRight(Rights.Admin_Metrics_View)],
        data: {
          title: 'BYOK Usage',
          subtitle: 'All user-supplied key usage records across users, providers, roles, and categories.',
          origin: 'BYOK'
        },
        loadComponent: () => import('./features/metrics/pages/audit-report.page').then((m) => m.AuditReportPage),
      },
      {
        path: 'users',
        canActivate: [authGuard, hasRight(Rights.Admin_Users_View)],
        loadComponent: () => import('./features/users/user-management/user-management').then((m) => m.UserManagementComponent),
      },
      {
        path: 'payments',
        canActivate: [authGuard, superAdminOnly, hasRight(Rights.Admin_Payments_View)],
        loadComponent: () => import('./features/payments/payment-management.page').then((m) => m.PaymentManagementPage),
      },
      {
        path: 'ai-keys',
        canActivate: [authGuard, hasRight(Rights.Admin_AIKeys_View)],
        loadComponent: () => import('./features/ai-keys/company-ai-keys.page').then((m) => m.CompanyAIKeysPage),
      },
      {
        path: 'brain',
        pathMatch: 'full',
        redirectTo: 'ai-keys',
      },
      {
        path: 'processing',
        canActivate: [authGuard, superAdminOnly, hasRight(Rights.Admin_Config_View)],
        loadComponent: () => import('./features/config/processing-config.page').then((m) => m.ProcessingConfigPage),
      },
      {
        path: 'templates',
        canActivate: [authGuard, superAdminOnly, hasRight(Rights.Admin_Config_View)],
        loadComponent: () => import('./features/templates/template-studio.page').then((m) => m.TemplateStudioPage),
      },
      {
        path: 'assets',
        pathMatch: 'full',
        redirectTo: 'templates',
      },
      {
        path: 'cloud',
        canActivate: [authGuard, superAdminOnly, hasRight(Rights.Admin_Config_View)],
        loadComponent: () => import('./features/cloud/admin-cloud.page').then((m) => m.AdminCloudPage),
      },
      {
        path: 'pipeline',
        pathMatch: 'full',
        redirectTo: 'jivu-command',
      },
      {
        path: 'jivu-command',
        canActivate: [authGuard, hasRight(Rights.Pipeline_View)],
        loadComponent: () => import('./features/jivu-command/jivu-command-control.page').then((m) => m.JivuCommandControlPage),
      },
      {
        path: 'radars',
        canActivate: [authGuard, hasRight(Rights.Pipeline_View)],
        loadComponent: () => import('./features/radars/admin-radars.page').then((m) => m.AdminRadarsPage),
      },
      {
        path: 'run-jobs',
        pathMatch: 'full',
        redirectTo: 'radars',
      },
      {
        path: 'plan-users',
        canActivate: [authGuard, superAdminOnly, hasRight(Rights.Admin_PlanUsers_View)],
        loadComponent: () => import('./features/plan-users/plan-users.page').then((m) => m.PlanUsersPage),
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'admin/dashboard'
  }
];
