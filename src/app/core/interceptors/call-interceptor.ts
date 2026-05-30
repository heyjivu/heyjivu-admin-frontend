import { HttpContextToken, HttpErrorResponse, HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject, Injector } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { takeUntil } from 'rxjs';
import { AuthStore } from '../../core/auth/state/auth.store';
import { HttpCancelService } from '../services/http-cancel.service';
import { environment } from '../../../environments/environment';

const REFRESH_RETRY_TOKEN = new HttpContextToken<boolean>(() => false);

const isAuthPublicEndpoint = (url: string) => {
  return url.includes('/api/auth/login') ||
    url.includes('/api/auth/google') ||
    url.includes('/api/auth/register') ||
    url.includes('/api/auth/confirm-email') ||
    url.includes('/api/auth/verify-otp') ||
    url.includes('/api/auth/forgot-password') ||
    url.includes('/api/auth/reset-password') ||
    url.includes('/api/auth/resend-confirmation') ||
    url.includes('/api/auth/refresh') ||
    url.includes('/api/auth/logout');
};

const knownApiHosts = [
  new URL(environment.apiUrl).host,
  new URL(environment.authApiUrl).host
];

const isKnownApiRequest = (url: string) => {
  if (!url.startsWith('http')) {
    return true;
  }

  try {
    return knownApiHosts.includes(new URL(url).host);
  } catch {
    return false;
  }
};

export const callInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const injector = inject(Injector);
  const cancelService = injector.get(HttpCancelService);
  const authStore = injector.get(AuthStore);
  const isStreamEndpoint = req.url.includes('/stream');
  const isExternalRequest = req.url.startsWith('http') && !isKnownApiRequest(req.url);
  const authAttempted = req.context.get(REFRESH_RETRY_TOKEN);
  const publicAuthEndpoint = isAuthPublicEndpoint(req.url);

  if (isExternalRequest) {
    return next(req);
  }

  const token = authStore.token();
  let authReq = req.clone({
    withCredentials: true
  });

  if (!isStreamEndpoint && !publicAuthEndpoint) {
    const headers: { [name: string]: string } = {
      'X-App-Version': '21.0.0'
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    authReq = req.clone({
      setHeaders: headers,
      withCredentials: true
    });
  }

  return next(authReq).pipe(
    takeUntil(cancelService.getCancelObservable()),
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401 || publicAuthEndpoint) {
        return throwError(() => error);
      }

      if (authAttempted) {
        authStore.logout();
        return throwError(() => error);
      }

      return authStore.refreshSession().pipe(
        switchMap((restored) => {
          if (!restored) {
            authStore.logout();
            return throwError(() => error);
          }

          const refreshToken = authStore.token();
          if (isStreamEndpoint) {
            const retryReq = req.clone({
              withCredentials: true,
              context: req.context.set(REFRESH_RETRY_TOKEN, true)
            });
            return next(retryReq);
          }

          const headers: { [name: string]: string } = {
            'X-App-Version': '21.0.0'
          };

          if (refreshToken) {
            headers['Authorization'] = `Bearer ${refreshToken}`;
          }

          const retryReq = req.clone({
            setHeaders: headers,
            withCredentials: true,
            context: req.context.set(REFRESH_RETRY_TOKEN, true)
          });

          return next(retryReq);
        }),
        catchError(() => {
          authStore.logout();
          return throwError(() => error);
        })
      );
    }),
  );
};
