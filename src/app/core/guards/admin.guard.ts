import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthStore } from '../../core/auth/state/auth.store';

export const hasRight = (requiredRight: string): CanActivateFn => {
  return (route, state) => {
    const authStore = inject(AuthStore);
    const router = inject(Router);

    if (!authStore.isAuthenticated()) {
      router.navigate(['/login']);
      return false;
    }

    if (authStore.isSuperAdmin()) {
      return true;
    }

    if (authStore.hasRight()(requiredRight)) {
      return true;
    }

    router.navigate(['/admin/dashboard']);
    return false;
  };
};
