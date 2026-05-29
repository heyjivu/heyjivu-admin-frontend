import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
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

  // Check if token exists in storage but store is not initialized
  const token = localStorage.getItem('ai-content-token');
  if (token) {
    authStore.initializeFromStorage();
    if (authStore.isAuthenticated()) {
      return checkAccess();
    }
  }

  router.navigate(['/login']);
  return false;
};

export const guestGuard: CanActivateFn = (route, state) => {
  const authStore = inject(AuthStore);
  const router = inject(Router);

  if (authStore.isAuthenticated()) {
    router.navigate(['/dashboard']);
    return false;
  }

  // Check if token exists in storage but store is not initialized
  const token = localStorage.getItem('ai-content-token');
  if (token) {
    authStore.initializeFromStorage();
    if (authStore.isAuthenticated()) {
      router.navigate(['/dashboard']);
      return false;
    }
  }

  return true;
};
