import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { ToastService } from '../services/toast.service';
import { retry, throwError, timer } from 'rxjs';
import { switchMap } from 'rxjs/operators';

export const retryInterceptor: HttpInterceptorFn = (req, next) => {
  const toastService = inject(ToastService);

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