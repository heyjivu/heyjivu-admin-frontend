import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

const ADMIN_API = environment.apiUrl;

export interface AssetDto {
  id: string;
  name: string;
  description: string;
  type: string;
  fileUrl4k: string;
  fileUrl2k: string;
  fileUrl1k: string;
  isActive: boolean;
  allowedRoles: string[];
}

@Injectable({ providedIn: 'root' })
export class AssetsApiService {
  private http = inject(HttpClient);

  getAssetsAdmin(): Observable<AssetDto[]> {
    return this.http.get<AssetDto[]>(`${ADMIN_API}/admin/assets`);
  }

  saveAsset(asset: any): Observable<AssetDto> {
    return this.http.post<AssetDto>(`${ADMIN_API}/admin/assets`, asset);
  }

  deleteAsset(id: string): Observable<void> {
    return this.http.delete<void>(`${ADMIN_API}/admin/assets/${id}`);
  }
}
