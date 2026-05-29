import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { GenericService } from '../services/generic.service';
import { API_ENDPOINTS } from '../constants/api.constants';

@Injectable({ providedIn: 'root' })
export class SettingsApi {
  private readonly generic = inject(GenericService);
  private readonly endpoint = API_ENDPOINTS.SETTINGS;

  getSettings(): Observable<any> {
    return this.generic.get<any>(this.endpoint);
  }

  updateSettings(settings: any): Observable<any> {
    return this.generic.put<any>(this.endpoint, settings);
  }
}
