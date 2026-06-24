import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, map, switchMap } from 'rxjs';
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

interface AdminLibraryUploadUrlResponse {
  url: string;
  filePath: string;
  folder: string;
  itemId: string;
  verb: string;
  contentType?: string | null;
  expiresAtUtc: string;
  expiresInMinutes: number;
}

@Injectable({ providedIn: 'root' })
export class AssetsApiService {
  private http = inject(HttpClient);
  private readonly adminSocialUrl = `${ADMIN_API}/admin/social`;

  getAssetsAdmin(): Observable<AssetDto[]> {
    return this.http.get<AssetDto[]>(`${ADMIN_API}/admin/assets`);
  }

  saveAsset(asset: any): Observable<AssetDto> {
    if (asset.file instanceof File) {
      return this.uploadAdminAssetFile(asset).pipe(
        switchMap(filePath => this.http.post<AssetDto>(`${ADMIN_API}/admin/assets`, {
          id: asset.id ?? null,
          name: asset.name ?? '',
          description: asset.description ?? '',
          type: asset.type ?? '',
          fileUrl4k: filePath,
          fileUrl2k: filePath,
          fileUrl1k: filePath,
          isActive: asset.isActive ?? true,
          allowedRoles: Array.isArray(asset.allowedRoles) ? asset.allowedRoles : []
        }))
      );
    }

    return this.http.post<AssetDto>(`${ADMIN_API}/admin/assets`, asset);
  }

  deleteAsset(id: string): Observable<void> {
    return this.http.delete<void>(`${ADMIN_API}/admin/assets/${id}`);
  }

  private uploadAdminAssetFile(asset: any): Observable<string> {
    const file = asset.file as File;
    const contentType = file.type || 'application/octet-stream';
    return this.http.post<AdminLibraryUploadUrlResponse>(`${this.adminSocialUrl}/storage/upload-url`, {
      section: 'assets',
      category: asset.type || 'general',
      itemName: asset.name || file.name,
      fileName: file.name,
      contentType
    }).pipe(
      switchMap(signed => from(this.putSignedFile(signed.url, file, signed.contentType || contentType)).pipe(
        map(() => signed.filePath)
      ))
    );
  }

  private async putSignedFile(url: string, file: File, contentType: string): Promise<void> {
    const response = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: file
    });

    if (!response.ok) {
      throw new Error(`R2 upload failed with status ${response.status}.`);
    }
  }
}
