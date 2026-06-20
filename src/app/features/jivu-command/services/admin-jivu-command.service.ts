import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  AdminJivuCommandDeviceDto,
  AdminJivuCommandDto,
  AdminJivuCommandFilterOptions,
  AdminJivuCommandFilters,
  AdminJivuCommandListResponse,
  AdminJivuCommandMaintenanceResult,
  AdminJivuCommandStatsDto,
  AdminJivuCommandTempFileDto,
  AdminJivuCommandTempUsageDto,
  JivuCommandTempFileCleanupResult,
  JivuCommandActionResult
} from '../models/jivu-command-admin.model';

@Injectable({ providedIn: 'root' })
export class AdminJivuCommandService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/admin/jivu-command`;

  getStats(): Observable<AdminJivuCommandStatsDto> {
    return this.http.get<AdminJivuCommandStatsDto>(`${this.baseUrl}/stats`);
  }

  getFilterOptions(): Observable<AdminJivuCommandFilterOptions> {
    return this.http.get<AdminJivuCommandFilterOptions>(`${this.baseUrl}/filter-options`);
  }

  listCommands(filters: AdminJivuCommandFilters): Observable<AdminJivuCommandListResponse> {
    return this.http.get<AdminJivuCommandListResponse>(`${this.baseUrl}/commands`, {
      params: this.buildParams(filters)
    });
  }

  getCommand(id: string): Observable<AdminJivuCommandDto> {
    return this.http.get<AdminJivuCommandDto>(`${this.baseUrl}/commands/${id}`);
  }

  listDevices(userId?: string, search?: string): Observable<AdminJivuCommandDeviceDto[]> {
    return this.http.get<AdminJivuCommandDeviceDto[]>(`${this.baseUrl}/devices`, {
      params: this.buildParams({ userId, search })
    });
  }

  listTempFiles(commandId?: string, userId?: string, status?: string, take = 100): Observable<AdminJivuCommandTempFileDto[]> {
    return this.http.get<AdminJivuCommandTempFileDto[]>(`${this.baseUrl}/temp-files`, {
      params: this.buildParams({ commandId, userId, status, take })
    });
  }

  listTempUsage(filters: { userIds?: string[]; roleIds?: string[]; search?: string; take?: number }): Observable<AdminJivuCommandTempUsageDto[]> {
    return this.http.get<AdminJivuCommandTempUsageDto[]>(`${this.baseUrl}/temp-usage`, {
      params: this.buildParams(filters)
    });
  }

  cancelCommand(id: string, reason?: string): Observable<JivuCommandActionResult> {
    return this.http.post<JivuCommandActionResult>(`${this.baseUrl}/commands/${id}/cancel`, { reason });
  }

  moveCommand(id: string, targetDeviceInstanceId: string): Observable<JivuCommandActionResult> {
    return this.http.post<JivuCommandActionResult>(`${this.baseUrl}/commands/${id}/move-device`, { targetDeviceInstanceId });
  }

  resumeCommand(id: string): Observable<JivuCommandActionResult> {
    return this.http.post<JivuCommandActionResult>(`${this.baseUrl}/commands/${id}/resume`, {});
  }

  requeueCommand(id: string, reason?: string): Observable<JivuCommandActionResult> {
    return this.http.post<JivuCommandActionResult>(`${this.baseUrl}/commands/${id}/requeue`, { reason });
  }

  deleteTempFiles(request: { tempFileIds?: string[]; userIds?: string[] }): Observable<JivuCommandTempFileCleanupResult> {
    return this.http.post<JivuCommandTempFileCleanupResult>(`${this.baseUrl}/temp-files/delete`, request);
  }

  runMaintenance(userIds?: string[]): Observable<AdminJivuCommandMaintenanceResult> {
    return this.http.post<AdminJivuCommandMaintenanceResult>(`${this.baseUrl}/maintenance/run`, { userIds: userIds ?? [] });
  }

  private buildParams<T extends object>(values: T): HttpParams {
    let params = new HttpParams();
    Object.entries(values as Record<string, unknown>).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') {
        return;
      }

      if (Array.isArray(value)) {
        if (value.length > 0) {
          params = params.set(key, value.join(','));
        }
        return;
      }

      params = params.set(key, String(value));
    });
    return params;
  }
}
