import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BASE_API_URL } from '../constants/api.constants';

@Injectable({
  providedIn: 'root'
})
export class GenericService {
  protected http = inject(HttpClient);
  protected baseUrl = BASE_API_URL;

  get<T>(endpoint: string, path: string = ''): Observable<T> {
    const url = path ? `${this.baseUrl}/${endpoint}/${path}` : `${this.baseUrl}/${endpoint}`;
    return this.http.get<T>(url);
  }

  post<T>(endpoint: string, body: any, path: string = ''): Observable<T> {
    const url = path ? `${this.baseUrl}/${endpoint}/${path}` : `${this.baseUrl}/${endpoint}`;
    return this.http.post<T>(url, body);
  }

  put<T>(endpoint: string, body: any, path: string = ''): Observable<T> {
    const url = path ? `${this.baseUrl}/${endpoint}/${path}` : `${this.baseUrl}/${endpoint}`;
    return this.http.put<T>(url, body);
  }

  delete<T>(endpoint: string, path: string = ''): Observable<T> {
    const url = path ? `${this.baseUrl}/${endpoint}/${path}` : `${this.baseUrl}/${endpoint}`;
    return this.http.delete<T>(url);
  }
}
