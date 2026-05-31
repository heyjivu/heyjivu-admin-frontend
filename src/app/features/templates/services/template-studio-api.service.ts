import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';

export type StudioStatusFilter = 'all' | 'active' | 'inactive';

export interface StudioListFilters {
  status?: StudioStatusFilter;
  planCode?: string;
  search?: string;
}

export interface AdminTemplateDto {
  id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  templateType?: string | null;
  thumbnailUrl?: string | null;
  previewUrl?: string | null;
  payloadJson?: string | null;
  isActive: boolean;
  allowedRoleIds?: string[] | null;
  allowedRoles?: string[] | null;
  allowedPlanCodes?: string[] | null;
  tags?: string[] | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

interface BackendAdminTemplateDto {
  id: string;
  name: string;
  type?: string | null;
  dataJson?: string | null;
  thumbnailFileId?: string | null;
  thumbnailUrl?: string | null;
  isActive: boolean;
  assignedRoleId?: string | null;
  createdAt?: string | null;
}

interface BackendAdminSoundtrackDto {
  id: string;
  name: string;
  genre?: string | null;
  duration?: string | null;
  metadataJson?: string | null;
  localFileName?: string | null;
  storageFileId?: string | null;
  mimeType?: string | null;
  assetUrl?: string | null;
  isActive: boolean;
  assignedRoleId?: string | null;
  createdAt?: string | null;
}

export interface AdminSoundtrackDto {
  id: string;
  name: string;
  description?: string | null;
  genre?: string | null;
  mood?: string | null;
  audioUrl?: string | null;
  durationSeconds?: number | null;
  bpm?: number | null;
  isActive: boolean;
  allowedRoleIds?: string[] | null;
  allowedRoles?: string[] | null;
  allowedPlanCodes?: string[] | null;
  tags?: string[] | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export type AdminTemplatePayload = Omit<AdminTemplateDto, 'id' | 'createdAt' | 'updatedAt'> & {
  scope: 'admin';
};

export type AdminSoundtrackPayload = Omit<AdminSoundtrackDto, 'id' | 'createdAt' | 'updatedAt'> & {
  scope: 'admin';
};

type ListResponse<T> = T[] | { items?: T[]; data?: T[]; results?: T[] };

@Injectable({ providedIn: 'root' })
export class TemplateStudioApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/admin/social`;

  getTemplates(filters: StudioListFilters = {}): Observable<AdminTemplateDto[]> {
    return this.http
      .get<ListResponse<BackendAdminTemplateDto>>(`${this.apiUrl}/templates`, { params: this.toParams(filters) })
      .pipe(map(response => this.filterTemplates(this.toItems(response).map(item => this.fromTemplate(item)), filters)));
  }

  createTemplate(payload: AdminTemplatePayload): Observable<AdminTemplateDto> {
    return this.http
      .post<BackendAdminTemplateDto>(`${this.apiUrl}/templates`, this.toTemplateRequest(payload))
      .pipe(map(item => this.fromTemplate(item)));
  }

  updateTemplate(id: string, payload: AdminTemplatePayload): Observable<AdminTemplateDto> {
    return this.http
      .put<BackendAdminTemplateDto>(`${this.apiUrl}/templates/${encodeURIComponent(id)}`, this.toTemplateRequest(payload))
      .pipe(map(item => this.fromTemplate(item)));
  }

  updateTemplateStatus(id: string, isActive: boolean): Observable<AdminTemplateDto> {
    const action = isActive ? 'activate' : 'deactivate';
    return this.http
      .post<BackendAdminTemplateDto>(`${this.apiUrl}/templates/${encodeURIComponent(id)}/${action}`, {})
      .pipe(map(item => this.fromTemplate(item)));
  }

  deleteTemplate(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/templates/${encodeURIComponent(id)}`);
  }

  getSoundtracks(filters: StudioListFilters = {}): Observable<AdminSoundtrackDto[]> {
    return this.http
      .get<ListResponse<BackendAdminSoundtrackDto>>(`${this.apiUrl}/soundtracks`, { params: this.toParams(filters) })
      .pipe(map(response => this.filterSoundtracks(this.toItems(response).map(item => this.fromSoundtrack(item)), filters)));
  }

  createSoundtrack(payload: AdminSoundtrackPayload): Observable<AdminSoundtrackDto> {
    return this.http
      .post<BackendAdminSoundtrackDto>(`${this.apiUrl}/soundtracks`, this.toSoundtrackRequest(payload))
      .pipe(map(item => this.fromSoundtrack(item)));
  }

  updateSoundtrack(id: string, payload: AdminSoundtrackPayload): Observable<AdminSoundtrackDto> {
    return this.http
      .put<BackendAdminSoundtrackDto>(`${this.apiUrl}/soundtracks/${encodeURIComponent(id)}`, this.toSoundtrackRequest(payload))
      .pipe(map(item => this.fromSoundtrack(item)));
  }

  updateSoundtrackStatus(id: string, isActive: boolean): Observable<AdminSoundtrackDto> {
    const action = isActive ? 'activate' : 'deactivate';
    return this.http
      .post<BackendAdminSoundtrackDto>(`${this.apiUrl}/soundtracks/${encodeURIComponent(id)}/${action}`, {})
      .pipe(map(item => this.fromSoundtrack(item)));
  }

  deleteSoundtrack(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/soundtracks/${encodeURIComponent(id)}`);
  }

  private toParams(filters: StudioListFilters): HttpParams {
    let params = new HttpParams();
    params = params.set('includeInactive', 'true');
    return params;
  }

  private toItems<T>(response: ListResponse<T>): T[] {
    if (Array.isArray(response)) return response;
    return response.items ?? response.data ?? response.results ?? [];
  }

  private fromTemplate(item: BackendAdminTemplateDto): AdminTemplateDto {
    const payload = this.parseJsonRecord(item.dataJson);
    return {
      id: item.id,
      name: item.name,
      description: this.stringFrom(payload, 'description'),
      category: this.stringFrom(payload, 'category', 'assetCategory', 'templateCategory'),
      templateType: item.type ?? this.stringFrom(payload, 'templateType') ?? 'text',
      thumbnailUrl: item.thumbnailUrl ?? this.stringFrom(payload, 'thumbnailUrl'),
      previewUrl: this.stringFrom(payload, 'previewUrl'),
      payloadJson: item.dataJson ?? null,
      isActive: item.isActive,
      allowedRoleIds: item.assignedRoleId ? [item.assignedRoleId] : [],
      allowedRoles: [],
      allowedPlanCodes: this.stringArrayFrom(payload, 'allowedPlanCodes'),
      tags: this.stringArrayFrom(payload, 'tags'),
      createdAt: item.createdAt ?? null,
      updatedAt: null
    };
  }

  private fromSoundtrack(item: BackendAdminSoundtrackDto): AdminSoundtrackDto {
    const metadata = this.parseJsonRecord(item.metadataJson);
    return {
      id: item.id,
      name: item.name,
      description: this.stringFrom(metadata, 'description'),
      genre: item.genre ?? this.stringFrom(metadata, 'genre'),
      mood: this.stringFrom(metadata, 'mood'),
      audioUrl: item.assetUrl ?? this.stringFrom(metadata, 'audioUrl', 'previewUrl', 'url'),
      durationSeconds: this.durationToSeconds(item.duration) ?? this.numberFrom(metadata, 'durationSeconds'),
      bpm: this.numberFrom(metadata, 'bpm'),
      isActive: item.isActive,
      allowedRoleIds: item.assignedRoleId ? [item.assignedRoleId] : [],
      allowedRoles: [],
      allowedPlanCodes: this.stringArrayFrom(metadata, 'allowedPlanCodes'),
      tags: this.stringArrayFrom(metadata, 'tags'),
      createdAt: item.createdAt ?? null,
      updatedAt: null
    };
  }

  private toTemplateRequest(payload: AdminTemplatePayload) {
    const parsedPayload = this.parseJsonRecord(payload.payloadJson);
    const dataJson = {
      ...parsedPayload,
      description: payload.description,
      category: payload.category,
      templateType: payload.templateType,
      thumbnailUrl: payload.thumbnailUrl,
      previewUrl: payload.previewUrl,
      allowedPlanCodes: payload.allowedPlanCodes ?? [],
      tags: payload.tags ?? []
    };

    return {
      name: payload.name,
      type: this.normalizeTemplateType(payload.templateType),
      dataJson: JSON.stringify(dataJson),
      assignedRoleId: this.singleRole(payload.allowedRoleIds),
      thumbnailFileId: null,
      isActive: payload.isActive
    };
  }

  private toSoundtrackRequest(payload: AdminSoundtrackPayload) {
    const duration = this.secondsToDuration(payload.durationSeconds);
    const metadata = {
      description: payload.description,
      mood: payload.mood,
      audioUrl: payload.audioUrl,
      durationSeconds: payload.durationSeconds,
      bpm: payload.bpm,
      allowedPlanCodes: payload.allowedPlanCodes ?? [],
      tags: payload.tags ?? []
    };

    return {
      name: payload.name,
      genre: payload.genre || payload.mood || 'Admin soundtrack',
      duration,
      localFileName: null,
      storageFileId: this.isStorageReference(payload.audioUrl) ? payload.audioUrl : null,
      mimeType: null,
      metadataJson: JSON.stringify(metadata),
      assignedRoleId: this.singleRole(payload.allowedRoleIds),
      isActive: payload.isActive
    };
  }

  private filterTemplates(items: AdminTemplateDto[], filters: StudioListFilters): AdminTemplateDto[] {
    return items.filter(item =>
      this.matchesStatus(item.isActive, filters.status) &&
      this.matchesPlan(item.allowedPlanCodes, filters.planCode) &&
      this.matchesSearch(filters.search, item.name, item.description, item.category, item.templateType, ...(item.tags ?? []))
    );
  }

  private filterSoundtracks(items: AdminSoundtrackDto[], filters: StudioListFilters): AdminSoundtrackDto[] {
    return items.filter(item =>
      this.matchesStatus(item.isActive, filters.status) &&
      this.matchesPlan(item.allowedPlanCodes, filters.planCode) &&
      this.matchesSearch(filters.search, item.name, item.description, item.genre, item.mood, ...(item.tags ?? []))
    );
  }

  private matchesStatus(isActive: boolean, status?: StudioStatusFilter): boolean {
    if (!status || status === 'all') return true;
    return status === 'active' ? isActive : !isActive;
  }

  private matchesPlan(codes?: string[] | null, planCode?: string): boolean {
    if (!planCode || planCode === 'all') return true;
    return !codes?.length || codes.includes(planCode);
  }

  private matchesSearch(term: string | undefined, ...values: Array<string | null | undefined>): boolean {
    const normalized = term?.trim().toLowerCase();
    if (!normalized) return true;
    return values.some(value => String(value ?? '').toLowerCase().includes(normalized));
  }

  private parseJsonRecord(value?: string | null): Record<string, any> {
    if (!value?.trim()) return {};
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }

  private stringFrom(source: Record<string, any>, ...keys: string[]): string | null {
    for (const key of keys) {
      const value = source[key];
      if (typeof value === 'string' && value.trim()) return value.trim();
    }
    return null;
  }

  private stringArrayFrom(source: Record<string, any>, key: string): string[] {
    const value = source[key];
    if (Array.isArray(value)) return value.map(item => String(item).trim()).filter(Boolean);
    if (typeof value === 'string' && value.trim()) return value.split(',').map(item => item.trim()).filter(Boolean);
    return [];
  }

  private numberFrom(source: Record<string, any>, key: string): number | null {
    const parsed = Number(source[key]);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private normalizeTemplateType(value?: string | null): string {
    const normalized = String(value || '').toLowerCase();
    if (normalized.includes('video') || normalized.includes('motion') || normalized.includes('animated')) return 'video';
    if (normalized.includes('image') || normalized.includes('static') || normalized.includes('thumbnail') || normalized.includes('banner')) return 'image';
    return 'text';
  }

  private singleRole(ids?: string[] | null): string | null {
    return ids?.length === 1 ? ids[0] : null;
  }

  private secondsToDuration(seconds?: number | null): string {
    const value = Number(seconds);
    if (!Number.isFinite(value) || value <= 0) return '0:30';
    const minutes = Math.floor(value / 60);
    const remainder = Math.round(value % 60).toString().padStart(2, '0');
    return `${minutes}:${remainder}`;
  }

  private durationToSeconds(value?: string | null): number | null {
    if (!value) return null;
    const parts = value.split(':').map(part => Number(part));
    if (parts.length === 2 && parts.every(Number.isFinite)) return parts[0] * 60 + parts[1];
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private isStorageReference(value?: string | null): boolean {
    return !!value?.trim() && !/^https?:\/\//i.test(value.trim());
  }
}
