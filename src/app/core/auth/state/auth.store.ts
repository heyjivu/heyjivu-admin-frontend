import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { computed } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { catchError, finalize, map, Observable, of, pipe, shareReplay, switchMap, tap } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { AuthResponse, AuthUser, GoogleLoginRequest, LoginRequest, RegisterRequest } from '../models/auth.model';
import { HttpCancelService } from '../../services/http-cancel.service';

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  registrationMessage: string | null;
}

const USER_STORAGE_KEY = 'ai-content-user';
const LEGACY_TOKEN_STORAGE_KEY = 'ai-content-token';

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  loading: false,
  error: null,
  registrationMessage: null,
};

const hasStoredUser = () => Boolean(localStorage.getItem(USER_STORAGE_KEY));

const userFromAuthResponse = (response: AuthResponse): AuthUser => ({
  userId: response.userId,
  username: response.username,
  displayName: response.displayName,
  isSuperAdmin: response.isSuperAdmin,
  rights: response.rights,
  onboardingStep: response.onboardingStep,
  byokRequested: response.byokRequested,
  useServerStorage: response.useServerStorage,
  accountType: response.accountType,
  portal: response.portal,
});

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
  withMethods((store, authService = inject(AuthService), router = inject(Router), httpCancelService = inject(HttpCancelService)) => {
    let refreshInProgress: Observable<boolean> | null = null;
    let logoutInProgress: Observable<void> | null = null;

    const persistUser = (user: AuthUser) => {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    };

    const hydrateUserFromStorage = () => {
      localStorage.removeItem(LEGACY_TOKEN_STORAGE_KEY);
      const userJson = localStorage.getItem(USER_STORAGE_KEY);
      if (userJson) {
        try {
          const user = JSON.parse(userJson) as AuthUser;
          patchState(store, { user });
        } catch (error) {
          localStorage.removeItem(USER_STORAGE_KEY);
          localStorage.removeItem(LEGACY_TOKEN_STORAGE_KEY);
        }
      }
    };

    const clearSessionState = () => {
      patchState(store, { ...initialState, token: null, isAuthenticated: false });
      localStorage.removeItem(USER_STORAGE_KEY);
      localStorage.removeItem(LEGACY_TOKEN_STORAGE_KEY);
    };

    const applyAuthResponse = (response: AuthResponse) => {
      const user = userFromAuthResponse(response);
      persistUser(user);
      patchState(store, {
        token: response.token,
        user,
        isAuthenticated: true,
        error: null,
        loading: false
      });
    };

    const refreshSession = (): Observable<boolean> => {
      if (!store.user() && !hasStoredUser()) {
        return of(false);
      }

      if (refreshInProgress) {
        return refreshInProgress;
      }

      refreshInProgress = authService.refresh().pipe(
        tap((response) => {
          applyAuthResponse(response);
        }),
        map(() => true),
        catchError((error) => {
          patchState(store, { token: null, isAuthenticated: false, loading: false });
          patchState(store, { error: null });
          return of(false);
        }),
        finalize(() => {
          refreshInProgress = null;
        }),
        shareReplay({ bufferSize: 1, refCount: false })
      );

      return refreshInProgress;
    };

    const logoutInternal = () => {
      clearSessionState();
      router.navigate(['/login']);
      httpCancelService.cancelPendingRequests();
    };

    const executeLogout = () => {
      if (logoutInProgress) {
        return;
      }

      logoutInProgress = authService.logout().pipe(
        catchError(() => of(void 0)),
        finalize(() => {
          logoutInProgress = null;
          logoutInternal();
        })
      );

      logoutInProgress.subscribe();
    };

    return {
      initializeFromStorage() {
        hydrateUserFromStorage();
        if (!store.isAuthenticated()) {
          refreshSession().subscribe({
            error: () => {}
          });
        }
      },

      refreshSession,

      refreshUser(callback?: () => void) {
        authService.getMe().subscribe({
          next: (response: AuthUser & { token?: string }) => {
            const { token, ...user } = response;
            persistUser(user);
            patchState(store, {
              user,
              token: token || store.token(),
              isAuthenticated: Boolean(token || store.token())
            });
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
                applyAuthResponse(res);
                router.navigate(['/dashboard']);
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
                applyAuthResponse(res);
                router.navigate(['/dashboard']);
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
                applyAuthResponse(res);
                router.navigate(['/dashboard']);
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
        executeLogout();
      },

      updateByokRequested(requested: boolean) {
        const user = store.user();
        if (user) {
          const newUser = { ...user, byokRequested: requested };
          persistUser(newUser);
          patchState(store, { user: newUser });
        }
      }
    };
  })
);
