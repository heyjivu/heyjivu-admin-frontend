import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthResponse, GoogleLoginRequest, AuthUser, LoginRequest, RegisterRequest } from '../models/auth.model';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.authApiUrl}/auth`;
  private withCredentials = {
    withCredentials: true,
    headers: { 'X-HeyJivu-Portal': 'admin' }
  };

  googleLogin(request: GoogleLoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/google`, request, this.withCredentials);
  }

  login(request: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, request, this.withCredentials);
  }

  refresh(): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/refresh`, {}, this.withCredentials);
  }

  register(request: RegisterRequest): Observable<{ userId: string, email: string, message: string }> {
    return this.http.post<{ userId: string, email: string, message: string }>(`${this.apiUrl}/register`, request, this.withCredentials);
  }

  confirmEmail(token: string): Observable<AuthResponse> {
    return this.http.get<AuthResponse>(`${this.apiUrl}/confirm-email?token=${token}`, this.withCredentials);
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/logout`, {}, this.withCredentials);
  }

  getMe(): Observable<AuthUser> {
    return this.http.get<AuthUser>(`${this.apiUrl}/me`, this.withCredentials);
  }
}

