import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthStore } from '../state/auth.store';

export const authGuard: CanActivateFn = (route, state) => {
  const authStore = inject(AuthStore);
  const router = inject(Router);

  // Helper to check access
  const checkAccess = (): boolean => {
    // Admin FE does not require onboarding checks.
    return true;
  };

  if (authStore.isAuthenticated()) {
    return checkAccess();
  }

  authStore.initializeFromStorage();

  return authStore.refreshSession().pipe(
    map(() => {
      if (authStore.isAuthenticated()) {
        return checkAccess();
      }
      router.navigate(['/login']);
      return false;
    }),
    catchError(() => {
      router.navigate(['/login']);
      return of(false);
    })
  );
};

export const guestGuard: CanActivateFn = (route, state) => {
  const authStore = inject(AuthStore);
  const router = inject(Router);

  if (authStore.isAuthenticated()) {
    router.navigate(['/admin/dashboard']);
    return false;
  }

  authStore.initializeFromStorage();

  return authStore.refreshSession().pipe(
    map(() => {
      if (authStore.isAuthenticated()) {
        router.navigate(['/admin/dashboard']);
        return false;
      }
      return true;
    }),
    catchError(() => of(true))
  );
};
