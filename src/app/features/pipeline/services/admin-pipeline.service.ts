import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AdminPipelineResponse, AdminPipelineJob, PipelineStats } from '../models/pipeline.model';

export interface OpenRouterPricingModelDto {
  modelName: string;
  inputPricePerMillion: number;
  outputPricePerMillion: number;
  imagePricePerUnit: number;
  updatedAtUtc: string;
}

export interface OpenRouterPricingStatusDto {
  totalModels: number;
  lastSyncedAtUtc: string | null;
  adminOpenRouterKeys: number;
  byokOpenRouterKeys: number;
  recentModels: OpenRouterPricingModelDto[];
}

export interface OpenRouterPricingSyncResultDto {
  added: number;
  updated: number;
  unchanged: number;
  refreshed?: number;
  snapshotRowsAdded?: number;
  totalModels: number;
  syncedAtUtc: string;
}

@Injectable({ providedIn: 'root' })
export class AdminPipelineService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/admin/processing`;

  getJobs(params: {
    userId?: string;
    status?: string;
    type?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }): Observable<AdminPipelineResponse> {
    const cleanParams: Record<string, string | number> = {};
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        cleanParams[key] = value;
      }
    }
    return this.http.get<AdminPipelineResponse>(`${this.apiUrl}/jobs`, { params: cleanParams });
  }

  getUsers(): Observable<{ id: string; username: string; email: string }[]> {
    return this.http.get<{ id: string; username: string; email: string }[]>(`${this.apiUrl}/users`);
  }

  getStats(type?: string): Observable<PipelineStats> {
    const params: Record<string, string> = {};
    if (type) { params['type'] = type; }
    return this.http.get<PipelineStats>(`${this.apiUrl}/stats`, { params });
  }

  triggerRunJob(payload: {
    jobType: 'DashboardTrend' | 'Processing' | 'Trend';
    roleIds: string[];
    userIds: string[];
  }): Observable<{ triggeredUserIds: string[]; jobsCount: number }> {
    return this.http.post<{ triggeredUserIds: string[]; jobsCount: number }>(
      `${environment.apiUrl}/admin/run-jobs/trigger`,
      payload
    );
  }

  getOpenRouterPricingStatus(): Observable<OpenRouterPricingStatusDto> {
    return this.http.get<OpenRouterPricingStatusDto>(
      `${environment.apiUrl}/admin/run-jobs/pricing-sync/status`
    );
  }

  runOpenRouterPricingSync(): Observable<OpenRouterPricingSyncResultDto> {
    return this.http.post<OpenRouterPricingSyncResultDto>(
      `${environment.apiUrl}/admin/run-jobs/pricing-sync/run`,
      {}
    );
  }
}





