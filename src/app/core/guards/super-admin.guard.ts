import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthStore } from '../../core/auth/state/auth.store';

export const superAdminGuard: CanActivateFn = () => {
  const authStore = inject(AuthStore);
  const router = inject(Router);

  if (authStore.isAuthenticated() && authStore.isSuperAdmin()) {
    return true;
  }

  router.navigate(['/dashboard']);
  return false;
};

