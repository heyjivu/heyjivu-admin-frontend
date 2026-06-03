import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { retry, throwError, timer } from 'rxjs';

const isAuthSessionEndpoint = (url: string) =>
  url.includes('/api/auth/login') ||
  url.includes('/api/auth/google') ||
  url.includes('/api/auth/register') ||
  url.includes('/api/auth/confirm-email') ||
  url.includes('/api/auth/verify-otp') ||
  url.includes('/api/auth/forgot-password') ||
  url.includes('/api/auth/reset-password') ||
  url.includes('/api/auth/resend-confirmation') ||
  url.includes('/api/auth/refresh') ||
  url.includes('/api/auth/logout');

export const retryInterceptor: HttpInterceptorFn = (req, next) => {
  if (isAuthSessionEndpoint(req.url)) {
    return next(req);
  }

  return next(req).pipe(
    retry({
      count: 3,
      delay: (error: HttpErrorResponse, retryCount: number) => {
        const status = error.status;

        if (status === 429 || status === 503) {
          const retryAfter = error.headers.get('Retry-After');
          const delay = retryAfter ? parseInt(retryAfter, 10) * 1000 : Math.pow(2, retryCount) * 1000;

          console.log(`Retry attempt ${retryCount} for ${req.url} after ${delay}ms (status: ${status})`);
          return timer(delay);
        }

        if (status === 0 || status >= 500) {
          const delay = Math.pow(2, retryCount) * 1000;
          console.log(`Retry attempt ${retryCount} for ${req.url} after ${delay}ms (status: ${status})`);
          return timer(delay);
        }

        return throwError(() => error);
      }
    })
  );
};
