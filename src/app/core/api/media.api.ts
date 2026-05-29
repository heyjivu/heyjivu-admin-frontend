import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { GenericService } from '../services/generic.service';
import { API_ENDPOINTS } from '../constants/api.constants';

@Injectable({ providedIn: 'root' })
export class MediaApi {
  private readonly generic = inject(GenericService);
  private readonly endpoint = API_ENDPOINTS.MEDIA;

  getMedia(): Observable<any[]> {
    return this.generic.get<any[]>(this.endpoint);
  }
}
