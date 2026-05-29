import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { GenericService } from '../services/generic.service';
import { API_ENDPOINTS } from '../constants/api.constants';

@Injectable({ providedIn: 'root' })
export class MemoryApi {
  private readonly generic = inject(GenericService);
  private readonly endpoint = API_ENDPOINTS.MEMORY;

  getMemory(): Observable<any[]> {
    return this.generic.get<any[]>(this.endpoint);
  }
}
