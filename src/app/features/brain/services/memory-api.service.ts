import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

const ADMIN_API = environment.apiUrl;

export interface BrainApiKeyDto {
  id: string;
  key: string;
  isBlocked: boolean;
  usageCount: number;
  provider: string;
  modelName: string | null;
  roleName: string | null;
  isFree: boolean;
  customLabel?: string | null;
}

export interface BrainSettingsDto {
  id: string;
  provider: string;
  model: string;
  isEnabled: boolean;
  type: string;
  apiKeys: BrainApiKeyDto[];
}

export interface SaveBrainSettingsRequest {
  provider: string;
  model: string;
  isEnabled: boolean;
  type: string;
  apiKeys: {
    id: string;
    key: string;
    isBlocked: boolean;
    usageCount: number;
    provider: string;
    modelName: string | null;
    roleName: string | null;
    isFree: boolean;
    customLabel?: string | null;
  }[];
}

export interface TestKeyResult {
  success: boolean;
  latencyMs?: number;
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class MemoryApiService {
  private http = inject(HttpClient);

  getBrainSettings(): Observable<BrainSettingsDto[]> {
    return this.http.get<BrainSettingsDto[]>(`${ADMIN_API}/admin/brain-settings`);
  }

  saveBrainSettings(settings: SaveBrainSettingsRequest): Observable<void> {
    return this.http.post<void>(`${ADMIN_API}/admin/brain-settings`, settings);
  }

  testKey(keyId: string): Observable<TestKeyResult> {
    return this.http.post<TestKeyResult>(`${ADMIN_API}/admin/brain-settings/keys/${keyId}/test`, {});
  }
}
