import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class HttpCancelService {
  private cancelPendingRequests$ = new Subject<void>();

  cancelPendingRequests() {
    console.log('🛑 Cancelling all pending HTTP requests...');
    this.cancelPendingRequests$.next();
  }

  getCancelObservable() {
    return this.cancelPendingRequests$.asObservable();
  }
}
