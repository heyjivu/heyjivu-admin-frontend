import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export type SubmissionStatus = 'Pending' | 'Approved' | 'Rejected' | 'Published';

export interface TemplateSubmissionDto {
  id: string;
  userId: string;
  status: SubmissionStatus;
  name: string;
  category?: string | null;
  aspectRatio?: string | null;
  slotCount?: number | null;
  dataJson?: string | null;
  mediaRefs?: string[] | null;
  musicRef?: string | null;
  previewUrl?: string | null;
  createdAt: string;
  reviewedByUserId?: string | null;
  reviewedAt?: string | null;
  rejectionReason?: string | null;
}

@Injectable({ providedIn: 'root' })
export class TemplateSubmissionsApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/admin/template-submissions`;

  listTemplateSubmissions(status?: SubmissionStatus | ''): Observable<TemplateSubmissionDto[]> {
    let params = new HttpParams();
    if (status) {
      params = params.set('status', status);
    }
    return this.http.get<TemplateSubmissionDto[]>(this.apiUrl, { params });
  }

  approveSubmission(id: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${encodeURIComponent(id)}/approve`, {});
  }

  rejectSubmission(id: string, reason: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${encodeURIComponent(id)}/reject`, { reason });
  }

  publishSubmission(id: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${encodeURIComponent(id)}/publish`, {});
  }
}
