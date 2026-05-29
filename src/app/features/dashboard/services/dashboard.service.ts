import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { DashboardStats, CombinedAdminReport } from '../models/dashboard.model';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/dashboard`;

  getDashboardStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(this.baseUrl);
  }

  getByokReports(startDate?: string, endDate?: string): Observable<any[]> {
    let params = new HttpParams();
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);
    return this.http.get<any[]>(`${environment.apiUrl}/reports/byok`, { params });
  }

  getCombinedAdminReports(startDate?: string, endDate?: string, userId?: string, roleName?: string): Observable<CombinedAdminReport> {
    let params = new HttpParams();
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);
    if (userId) params = params.set('userId', userId);
    if (roleName) params = params.set('roleName', roleName);
    return this.http.get<CombinedAdminReport>(`${environment.apiUrl}/reports/combined`, { params });
  }
}

