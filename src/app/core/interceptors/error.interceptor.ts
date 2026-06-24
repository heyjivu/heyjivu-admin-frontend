import { HttpContextToken, HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { ToastService } from '../services/toast.service';

export const SUPPRESS_ERROR_TOAST = new HttpContextToken<boolean>(() => false);

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toastService = inject(ToastService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (req.context.get(SUPPRESS_ERROR_TOAST)) {
        return throwError(() => error);
      }

      let errorMsg = 'An unexpected error occurred.';
      
      if (error.error instanceof ErrorEvent) {
        errorMsg = `Error: ${error.error.message}`;
      } else {
        if (error.error && error.error.message) {
          errorMsg = error.error.message;
        } else if (error.status === 401) {
          errorMsg = 'Unauthorized. Please log in again.';
        } else if (error.status === 403) {
          errorMsg = 'You do not have permission to perform this action.';
        } else if (error.status === 500) {
          errorMsg = 'Internal server error. Please try again later.';
        } else {
          errorMsg = `Error ${error.status}: ${error.statusText}`;
        }
      }

      toastService.show(errorMsg, 'error');
      
      return throwError(() => error);
    })
  );
};
