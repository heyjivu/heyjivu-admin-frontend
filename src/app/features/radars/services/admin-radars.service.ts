import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export type AdminRadarType = 'trend' | 'dashboard' | 'store';
export type AdminRadarAudience = 'byok' | 'non-byok';

export interface AdminRadarJob {
  id: string;
  radarType: AdminRadarType;
  title: string;
  status: string;
  progress: number;
  errorMessage?: string | null;
  createdAt: string;
  userId: string;
  userName?: string | null;
  userEmail?: string | null;
  roleName: string;
  isByok: boolean;
  detail?: string | null;
}

export interface AdminRadarJobs {
  runningJobs: AdminRadarJob[];
  recentJobs: AdminRadarJob[];
  failedJobs: AdminRadarJob[];
}

export interface AdminRadarUser {
  id: string;
  username: string;
  email: string;
  roleId?: string | null;
  roleName: string;
  isByok: boolean;
}

export interface AdminRadarSkippedUser {
  userId: string;
  username: string;
  reason: string;
}

export interface AdminRadarTriggerResult {
  success: boolean;
  radarType: AdminRadarType;
  audience: AdminRadarAudience;
  targetUsers: AdminRadarUser[];
  jobsCount: number;
  skippedUsers: AdminRadarSkippedUser[];
  errorMessage?: string | null;
}

@Injectable({ providedIn: 'root' })
export class AdminRadarsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/admin/radars`;

  getJobs(radarType: AdminRadarType, audience: AdminRadarAudience): Observable<AdminRadarJobs> {
    return this.http.get<AdminRadarJobs>(`${this.baseUrl}/${radarType}/jobs`, {
      params: { audience, take: 60 }
    });
  }

  trigger(
    radarType: AdminRadarType,
    payload: {
      audience: AdminRadarAudience;
      roleIds: string[];
      userIds: string[];
    }
  ): Observable<AdminRadarTriggerResult> {
    return this.http.post<AdminRadarTriggerResult>(`${this.baseUrl}/${radarType}/trigger`, payload);
  }
}
