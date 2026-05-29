import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

const ADMIN_API = environment.apiUrl;

@Injectable({ providedIn: 'root' })
export class PostGenApiService {
  private http = inject(HttpClient);

  getCompanyProcessingOptions(): Observable<any> {
    return this.http.get<any>(`${ADMIN_API}/admin/users/company/processing-options`);
  }

  updateCompanyProcessingOptions(options: any): Observable<any> {
    return this.http.put<any>(`${ADMIN_API}/admin/users/company/processing-options`, options);
  }
}
