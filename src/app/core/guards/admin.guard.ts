import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthStore } from '../../core/auth/state/auth.store';

export const hasRight = (requiredRight: string): CanActivateFn => {
  return (route, state) => {
    const authStore = inject(AuthStore);
    const router = inject(Router);

    const checkRight = (): boolean => {
      if (authStore.isSuperAdmin()) {
        return true;
      }

      if (authStore.hasRight()(requiredRight)) {
        return true;
      }

      router.navigate(['/admin/dashboard']);
      return false;
    };

    if (authStore.isAuthenticated()) {
      return checkRight();
    }

    authStore.initializeFromStorage();

    return authStore.refreshSession().pipe(
      map((restored) => {
        if (!restored || !authStore.isAuthenticated()) {
          router.navigate(['/login']);
          return false;
        }

        return checkRight();
      }),
      catchError(() => {
        router.navigate(['/login']);
        return of(false);
      })
    );
  };
};
