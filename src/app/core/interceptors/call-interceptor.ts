import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject, Injector } from '@angular/core';
import { finalize, catchError, throwError, takeUntil } from 'rxjs';
import { AuthStore } from '../../core/auth/state/auth.store';
import { HttpCancelService } from '../services/http-cancel.service';

export const callInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const injector = inject(Injector);
  const cancelService = injector.get(HttpCancelService);

  // Bypass interceptor entirely for external API calls (e.g. Pexels API)
  const isExternalUrl = req.url.startsWith('http') && !req.url.includes('localhost') && !req.url.includes(window.location.host);
  if (isExternalUrl) {
    return next(req);
  }

  const token = localStorage.getItem('ai-content-token');
  
  const isPublicAuthEndpoint = req.url.includes('/api/auth/login') || 
                               req.url.includes('/api/auth/google') || 
                               req.url.includes('/api/auth/register') || 
                               req.url.includes('/api/auth/confirm-email') || 
                               req.url.includes('/api/auth/resend-confirmation');

  const isStreamEndpoint = req.url.includes('/stream');

  // Prevent making protected local API calls if there is no token
  if (!token && !isPublicAuthEndpoint && !isStreamEndpoint && req.url.includes('/api/')) {
    console.warn(`Blocked protected API call because user is not authenticated: ${req.url}`);
    return throwError(() => new HttpErrorResponse({
      status: 401,
      statusText: 'Unauthorized (No Token)',
      url: req.url
    }));
  }

  let authReq = req;
  
  if (!isStreamEndpoint) {
    const headers: { [name: string]: string } = {
      'X-App-Version': '21.0.0'
    };

    if (token && !isPublicAuthEndpoint) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    authReq = req.clone({ setHeaders: headers });
  }

  return next(authReq).pipe(
    takeUntil(cancelService.getCancelObservable()),
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !req.url.includes('/api/auth/login')) {
        const authStore = injector.get(AuthStore);
        authStore.logout();
      }
      return throwError(() => error);
    }),
    finalize(() => {
      // Logic for after the call completes
    })
  );
};

