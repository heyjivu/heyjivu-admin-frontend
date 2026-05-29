import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { patchState, signalStore, withMethods, withState, withComputed } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap, catchError, of } from 'rxjs';
import { AuthUser, GoogleLoginRequest, LoginRequest, RegisterRequest } from '../models/auth.model';
import { AuthService } from '../services/auth.service';
import { computed } from '@angular/core';
import { HttpCancelService } from '../../services/http-cancel.service';

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  registrationMessage: string | null;
}

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  loading: false,
  error: null,
  registrationMessage: null,
};

export const AuthStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((state) => ({
    displayName: computed(() => state.user()?.displayName || state.user()?.username || 'User'),
    isSuperAdmin: computed(() => state.user()?.isSuperAdmin || false),
    rights: computed(() => state.user()?.rights || []),
    hasRight: computed(() => (right: string) => {
      if (state.user()?.isSuperAdmin) return true;
      return state.user()?.rights?.includes(right) || false;
    }),
    userInitials: computed(() => {
      const name = state.user()?.displayName || state.user()?.username || '';
      return name.charAt(0).toUpperCase();
    })
  })),
  withMethods((store, authService = inject(AuthService), router = inject(Router), httpCancelService = inject(HttpCancelService)) => ({
    initializeFromStorage() {
      const token = localStorage.getItem('ai-content-token');
      const userJson = localStorage.getItem('ai-content-user');
      
      if (token && userJson) {
        try {
          const user = JSON.parse(userJson);
          patchState(store, { token, user, isAuthenticated: true });
        } catch (e) {
          localStorage.removeItem('ai-content-token');
          localStorage.removeItem('ai-content-user');
        }
      }
    },

    refreshUser(callback?: () => void) {
      authService.getMe().subscribe({
        next: (user) => {
          localStorage.setItem('ai-content-user', JSON.stringify(user));
          patchState(store, { user });
          if (callback) callback();
        },
        error: (err) => {
          console.error('Failed to refresh user profile:', err);
        }
      });
    },

    login: rxMethod<LoginRequest>(
      pipe(
        tap(() => patchState(store, { loading: true, error: null })),
        switchMap((req) =>
          authService.login(req).pipe(
            tap((res) => {
              localStorage.setItem('ai-content-token', res.token);
              const user: AuthUser = { 
                userId: res.userId, 
                username: res.username, 
                displayName: res.displayName,
                isSuperAdmin: res.isSuperAdmin,
                rights: res.rights,
                onboardingStep: res.onboardingStep,
                byokRequested: res.byokRequested,
                useServerStorage: res.useServerStorage
              };
              localStorage.setItem('ai-content-user', JSON.stringify(user));
              
              patchState(store, { 
                token: res.token, 
                user, 
                isAuthenticated: true, 
                loading: false 
              });
              
              if (res.onboardingStep === 5) {
                router.navigate(['/dashboard']);
              } else {
                router.navigate(['/onboarding']);
              }
            }),
            catchError((err) => {
              patchState(store, { 
                loading: false, 
                error: err.error?.message || 'Invalid credentials. Please try again.' 
              });
              return of(null);
            })
          )
        )
      )
    ),

    register: rxMethod<RegisterRequest>(
      pipe(
        tap(() => patchState(store, { loading: true, error: null, registrationMessage: null })),
        switchMap((req) =>
          authService.register(req).pipe(
            tap((res) => {
              patchState(store, { 
                loading: false, 
                registrationMessage: res.message || 'Please check your email to confirm your account.' 
              });
            }),
            catchError((err) => {
              patchState(store, { 
                loading: false, 
                error: err.error?.message || 'Registration failed. Please try again.' 
              });
              return of(null);
            })
          )
        )
      )
    ),

    confirmEmail: rxMethod<string>(
      pipe(
        tap(() => patchState(store, { loading: true, error: null })),
        switchMap((token) =>
          authService.confirmEmail(token).pipe(
            tap((res) => {
              localStorage.setItem('ai-content-token', res.token);
              const user: AuthUser = { 
                userId: res.userId, 
                username: res.username, 
                displayName: res.displayName,
                isSuperAdmin: res.isSuperAdmin,
                rights: res.rights,
                onboardingStep: res.onboardingStep,
                byokRequested: res.byokRequested,
                useServerStorage: res.useServerStorage
              };
              localStorage.setItem('ai-content-user', JSON.stringify(user));
              
              patchState(store, { 
                token: res.token, 
                user, 
                isAuthenticated: true, 
                loading: false 
              });
              
              if (res.onboardingStep === 5) {
                router.navigate(['/dashboard']);
              } else {
                router.navigate(['/onboarding']);
              }
            }),
            catchError((err) => {
              patchState(store, { 
                loading: false, 
                error: err.error?.message || 'Email confirmation failed. The token may have expired.' 
              });
              return of(null);
            })
          )
        )
      )
    ),

    googleLogin: rxMethod<GoogleLoginRequest>(
      pipe(
        tap(() => patchState(store, { loading: true, error: null })),
        switchMap((req) =>
          authService.googleLogin(req).pipe(
            tap((res) => {
              localStorage.setItem('ai-content-token', res.token);
              const user: AuthUser = { 
                userId: res.userId, 
                username: res.username, 
                displayName: res.displayName,
                isSuperAdmin: res.isSuperAdmin,
                rights: res.rights,
                onboardingStep: res.onboardingStep,
                byokRequested: res.byokRequested,
                useServerStorage: res.useServerStorage
              };
              localStorage.setItem('ai-content-user', JSON.stringify(user));
              
              patchState(store, { 
                token: res.token, 
                user, 
                isAuthenticated: true, 
                loading: false 
              });
              
              // Simple Onboarding State Machine Router
              // 0=NotStarted, 1=GoogleConnected, 2=PlanSelected, 3=PaymentCompleted, 4=DriveInitialized, 5=Completed
              if (res.onboardingStep === 5) {
                router.navigate(['/dashboard']);
              } else {
                router.navigate(['/onboarding']); // Or wherever plan selection is
              }
            }),
            catchError((err) => {
              patchState(store, { 
                loading: false, 
                error: err.error?.message || 'Authentication failed. Please try again.' 
              });
              return of(null);
            })
          )
        )
      )
    ),

    logout() {
      httpCancelService.cancelPendingRequests();
      localStorage.removeItem('ai-content-token');
      localStorage.removeItem('ai-content-user');
      patchState(store, initialState);
      router.navigate(['/login']);
    },

    updateByokRequested(requested: boolean) {
      const user = store.user();
      if (user) {
        const newUser = { ...user, byokRequested: requested };
        localStorage.setItem('ai-content-user', JSON.stringify(newUser));
        patchState(store, { user: newUser });
      }
    }
  }))
);

