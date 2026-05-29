import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface PaymentSettingDto {
  id?: string;
  providerName: string;
  apiKey: string;
  webhookSecret?: string;
  checkoutUrl?: string;
  environment: string;
  isActive: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AdminPaymentService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/admin/payments`;

  getSettings(): Observable<PaymentSettingDto[]> {
    return this.http.get<PaymentSettingDto[]>(`${this.apiUrl}/settings`);
  }

  updateSetting(dto: PaymentSettingDto): Observable<PaymentSettingDto> {
    return this.http.post<PaymentSettingDto>(`${this.apiUrl}/settings`, dto);
  }

  getRecentPayments(limit: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/recent?limit=${limit}`);
  }
}


