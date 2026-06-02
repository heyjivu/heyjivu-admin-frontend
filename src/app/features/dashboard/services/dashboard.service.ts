import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  AIUsageAuditReport,
  AIUsageAuditReportParams,
  CombinedAdminReport,
  DashboardStats
} from '../models/dashboard.model';

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
    if (userId) params = params.set('targetUserId', userId);
    if (roleName) params = params.set('roleName', roleName);
    return this.http.get<CombinedAdminReport>(`${environment.apiUrl}/reports/combined`, { params });
  }

  getAIUsageAuditReport(filters: AIUsageAuditReportParams): Observable<AIUsageAuditReport> {
    let params = new HttpParams()
      .set('pageNumber', String(filters.pageNumber || 1))
      .set('pageSize', String(filters.pageSize || 15));

    if (filters.startDate) params = params.set('startDate', filters.startDate);
    if (filters.endDate) params = params.set('endDate', filters.endDate);
    if (filters.targetUserId) params = params.set('targetUserId', filters.targetUserId);
    if (filters.roleName) params = params.set('roleName', filters.roleName);
    if (filters.category) params = params.set('category', filters.category);
    if (filters.provider) params = params.set('provider', filters.provider);
    if (filters.origin) params = params.set('origin', filters.origin);
    if (filters.searchTerm) params = params.set('searchTerm', filters.searchTerm);

    return this.http.get<AIUsageAuditReport>(`${environment.apiUrl}/reports/audit`, { params });
  }
}

