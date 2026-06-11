import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface AdminCloudFileEntry {
  name: string;
  path: string;
  size: number;
  createdAt: string;
  isDirectory: boolean;
}

export interface AdminCloudStorageInfo {
  totalSpace: number;
  usedSpace: number;
  remainingSpace: number;
}

export interface AdminCloudDirectUrl {
  url: string;
  expiresInMinutes: number;
}

@Injectable({ providedIn: 'root' })
export class AdminCloudApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/admin/storage`;

  getFiles(userId: string, folder = 'root'): Observable<AdminCloudFileEntry[]> {
    const params = new HttpParams().set('folder', folder || 'root');
    return this.http.get<AdminCloudFileEntry[]>(`${this.baseUrl}/users/${encodeURIComponent(userId)}/files`, { params });
  }

  getStorageInfo(userId: string): Observable<AdminCloudStorageInfo> {
    return this.http.get<AdminCloudStorageInfo>(`${this.baseUrl}/users/${encodeURIComponent(userId)}/storage`);
  }

  getDirectUrl(userId: string, filePath: string): Observable<AdminCloudDirectUrl> {
    const params = new HttpParams().set('filePath', filePath);
    return this.http.get<AdminCloudDirectUrl>(`${this.baseUrl}/users/${encodeURIComponent(userId)}/direct-url`, { params });
  }
}
