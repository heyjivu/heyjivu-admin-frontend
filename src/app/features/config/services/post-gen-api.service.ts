import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

const ADMIN_API = environment.apiUrl;

export interface ModelCapabilityDto {
  id: string;
  provider: string;
  modelName: string;
  category: string;
  displayName?: string | null;
  description?: string | null;
  maxResolution?: string | null;
  supportedAspectRatios: string[];
  supportedDurations: string[];
  supportsImageToVideo: boolean;
  supportsTextToVideo: boolean;
  supportsAudio: boolean;
  supportedVoices: string[];
  supportedLanguages: string[];
  supportsVoiceClone: boolean;
  supportsStreaming: boolean;
  metadataSource: string;
  metadataQuality: string;
  skipAutoSync: boolean;
  pricingSource?: string | null;
  inputPricePerMillion: number;
  outputPricePerMillion: number;
  imagePricePerUnit: number;
  characterPricePerMillion: number;
  audioPricePerSecond: number;
  videoPricePerSecond: number;
  videoPricePerUnit: number;
  requestPricePerUnit: number;
  priceTiers: ModelCapabilityPriceTierDto[];
  lastReviewedAt: string;
  lastSeenAt: string;
  createdAt: string;
  modifiedAt?: string | null;
  createdBy?: string | null;
  modifiedBy?: string | null;
}

export interface ModelCapabilityPriceTierDto {
  id?: string | null;
  tierType: string;
  tierKey: string;
  label: string;
  nonByokPriceUsd?: number | null;
  byokPriceUsd?: number | null;
  quotaMultiplier: number;
  showForNonByok: boolean;
  showForByok: boolean;
  sortOrder: number;
}

export type SaveModelCapabilityRequest = Omit<ModelCapabilityDto,
  'id'
  | 'lastSeenAt'
  | 'createdAt'
  | 'modifiedAt'
  | 'createdBy'
  | 'modifiedBy'
  | 'pricingSource'
  | 'inputPricePerMillion'
  | 'outputPricePerMillion'
  | 'imagePricePerUnit'
  | 'characterPricePerMillion'
  | 'audioPricePerSecond'
  | 'videoPricePerSecond'
  | 'videoPricePerUnit'
  | 'requestPricePerUnit'> & {
  id?: string | null;
};

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}

@Injectable({ providedIn: 'root' })
export class PostGenApiService {
  private http = inject(HttpClient);

  getCompanyProcessingOptions(): Observable<any> {
    return this.http.get<any>(`${ADMIN_API}/admin/users/company/processing-options`);
  }

  updateCompanyProcessingOptions(options: any): Observable<any> {
    return this.http.put<any>(`${ADMIN_API}/admin/users/company/processing-options`, options);
  }

  getModelCapabilities(filters?: {
    provider?: string;
    category?: string;
    search?: string;
    pageNumber?: number;
    pageSize?: number;
  }): Observable<PagedResult<ModelCapabilityDto>> {
    const params = new URLSearchParams();
    if (filters?.provider) params.set('provider', filters.provider);
    if (filters?.category) params.set('category', filters.category);
    if (filters?.search) params.set('SearchTerm', filters.search);
    if (filters?.pageNumber) params.set('PageNumber', String(filters.pageNumber));
    if (filters?.pageSize) params.set('PageSize', String(filters.pageSize));
    const query = params.toString();
    return this.http.get<PagedResult<ModelCapabilityDto>>(`${ADMIN_API}/admin/run-jobs/model-capabilities${query ? `?${query}` : ''}`);
  }

  saveModelCapability(payload: SaveModelCapabilityRequest): Observable<ModelCapabilityDto> {
    if (payload.id) {
      return this.http.put<ModelCapabilityDto>(`${ADMIN_API}/admin/run-jobs/model-capabilities/${payload.id}`, payload);
    }
    return this.http.post<ModelCapabilityDto>(`${ADMIN_API}/admin/run-jobs/model-capabilities`, payload);
  }

  deleteModelCapability(id: string): Observable<void> {
    return this.http.delete<void>(`${ADMIN_API}/admin/run-jobs/model-capabilities/${id}`);
  }
}
