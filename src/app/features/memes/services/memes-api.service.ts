import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

const ADMIN_API = environment.apiUrl;

export interface MemeDto {
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
export class MemesApiService {
  private http = inject(HttpClient);

  getMemesAdmin(): Observable<MemeDto[]> {
    return this.http.get<MemeDto[]>(`${ADMIN_API}/admin/memes`);
  }

  createMeme(meme: any): Observable<MemeDto> {
    return this.http.post<MemeDto>(`${ADMIN_API}/admin/memes`, meme);
  }

  deleteMeme(id: string): Observable<void> {
    return this.http.delete<void>(`${ADMIN_API}/admin/memes/${id}`);
  }
}
