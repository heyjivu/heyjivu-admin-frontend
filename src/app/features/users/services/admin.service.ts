import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface UserManagementDto {
  id: string;
  username: string;
  email: string;
  displayName: string;
  isActive: boolean;
  isSuperAdmin: boolean;
  isOrgAdmin: boolean;
  onboardingStep: number;
  accountType: 'user' | 'admin_only' | 'both';
  roleName: string;
  roleId: string | null;
  planCode?: string | null;
  planName?: string | null;
  organizationName: string;
  organizationId: string | null;
  usage?: {
    processingJobs: number;
    trendJobs: number;
    smartVideoJobs: number;
  } | null;
  quotas?: unknown;
  quotaBuckets?: unknown;
  quotaOverrides?: unknown;
  quotaSummary?: unknown;
  isByokProcessing: boolean;
  isByokTrend: boolean;
  isByokVideoGeneration: boolean;
  isByokPosts: boolean;
  byokRequested: boolean;
}

export interface RightDto {
  id: string;
  name: string;
  key: string;
  category: string;
}

export interface RoleDto {
  id: string;
  name: string;
  description: string;
  scope: number;
  rights: string[];
  quotas?: Record<string, number>;
}

export interface BypassFreeShellRoleResult {
  roleName: string;
  rightKeys: string[];
}

export interface OrganizationDto {
  id: string;
  name: string;
  description: string;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}

export interface PlanQuotaOverviewDto {
  planCode?: string | null;
  planName?: string | null;
  totalUsers?: number | null;
  usersWithOverrides?: number | null;
  activeQuotaBuckets?: number | null;
  storageAllocatedGb?: number | null;
  quotas?: unknown;
  quotaBuckets?: unknown;
  quotaSummary?: unknown;
}

export interface AdminPlanDto {
  id: string;
  name: string;
  tier: string;
  subscription: string;
  pricePkr: number;
  priceUsd: number;
  logic: string;
  description: string;
  highlights: string[];
  isWatermarked: boolean;
}

export interface AdminCreateContentProfileRequest {
  primaryNiche: string;
  customNiche?: string | null;
  targetAudience: string;
  mainFormats: string[];
  toneStyle: string;
}

export interface AdminCreateUserRequest {
  email: string;
  displayName: string;
  password: string;
  confirmPassword: string;
  accountType: 'user' | 'admin_only' | 'both';
  roleId?: string | null;
  planId?: string | null;
  contentProfile?: AdminCreateContentProfileRequest | null;
}

export interface AdminUpdateAccountTypeRequest {
  accountType: 'user' | 'admin_only' | 'both';
  planId?: string | null;
  contentProfile?: AdminCreateContentProfileRequest | null;
}

export interface UserQuotaOverviewDto {
  userId?: string;
  planCode?: string | null;
  planName?: string | null;
  quotas?: unknown;
  quotaBuckets?: unknown;
  quotaOverrides?: unknown;
  quotaSummary?: unknown;
}

export interface AdminAiUsageTotalsDto {
  totalCalls: number;
  platformCalls: number;
  byokCalls: number;
  successfulCalls: number;
  failedCalls: number;
  totalCostUsd: number;
  platformCostUsd: number;
  byokCostUsd: number;
  totalDurationMs: number;
  averageDurationMs: number;
}

export interface AdminAiUsageUserBreakdownDto {
  userId?: string | null;
  userName: string;
  userEmail?: string | null;
  roleName: string;
  totalCalls: number;
  platformCalls: number;
  byokCalls: number;
  totalCostUsd: number;
  platformCostUsd: number;
  byokCostUsd: number;
  totalDurationMs: number;
  averageDurationMs: number;
}

export interface AdminAiUsageRoleBreakdownDto {
  roleName: string;
  totalUsers: number;
  totalCalls: number;
  platformCalls: number;
  byokCalls: number;
  totalCostUsd: number;
  platformCostUsd: number;
  byokCostUsd: number;
  totalDurationMs: number;
  averageDurationMs: number;
}

export interface AdminAiUsageDashboardDto {
  totals: AdminAiUsageTotalsDto;
  topUsers: AdminAiUsageUserBreakdownDto[];
  topRoles: AdminAiUsageRoleBreakdownDto[];
  generatedAtUtc: string;
}

export interface AdminDashboardStatsDto {
  totalUsers: number;
  activeUsers: number;
  totalRevenue: number;
  pendingPayments: number;
  pendingReviews: number;
  aiUsage: AdminAiUsageDashboardDto;
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/admin/users`;

  getUsers(params?: { 
    pageNumber?: number, 
    pageSize?: number, 
    searchTerm?: string, 
    sortBy?: string, 
    isDescending?: boolean, 
    roleId?: string, 
    isActive?: boolean 
  }): Observable<PagedResult<UserManagementDto>> {
    let url = `${this.apiUrl}?`;
    if (params) {
      if (params.pageNumber) url += `PageNumber=${params.pageNumber}&`;
      if (params.pageSize) url += `PageSize=${params.pageSize}&`;
      if (params.searchTerm) url += `SearchTerm=${params.searchTerm}&`;
      if (params.sortBy) url += `SortBy=${params.sortBy}&`;
      if (params.isDescending !== undefined) url += `IsDescending=${params.isDescending}&`;
      if (params.roleId) url += `roleId=${params.roleId}&`;
      if (params.isActive !== undefined) url += `isActive=${params.isActive}&`;
    }
    return this.http.get<PagedResult<UserManagementDto>>(url);
  }

  getRoles(): Observable<RoleDto[]> {
    return this.http.get<RoleDto[]>(`${this.apiUrl}/roles`);
  }

  getRights(): Observable<RightDto[]> {
    return this.http.get<RightDto[]>(`${this.apiUrl}/rights`);
  }

  getOrganizations(): Observable<OrganizationDto[]> {
    return this.http.get<OrganizationDto[]>(`${environment.apiUrl}/admin/users/organizations`);
  }

  updateUserRole(userId: string, roleId: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${userId}/role`, { roleId });
  }

  updateUserAccountType(userId: string, request: AdminUpdateAccountTypeRequest): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${userId}/account-type`, request);
  }

  updateRoleRights(roleId: string, rightKeys: string[]): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/roles/${roleId}/rights`, { rightKeys });
  }

  bypassFreeShellRole(): Observable<BypassFreeShellRoleResult> {
    return this.http.post<BypassFreeShellRoleResult>(`${this.apiUrl}/roles/free-shell/bypass`, {});
  }

  updateUserStatus(userId: string, isActive: boolean): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${userId}/status`, { isActive });
  }

  createUser(request: AdminCreateUserRequest): Observable<string> {
    return this.http.post<string>(`${this.apiUrl}/create`, request);
  }

  createRole(role: { name: string, description: string, scope: number, quotas?: Record<string, number> }): Observable<string> {
    return this.http.post<string>(`${this.apiUrl}/roles`, role);
  }

  updateRole(roleId: string, role: { name: string, description: string, scope: number, quotas?: Record<string, number> }): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/roles/${roleId}`, role);
  }

  createRight(right: { name: string, key: string, category: string, description: string }): Observable<string> {
    return this.http.post<string>(`${this.apiUrl}/rights`, right);
  }

  updateUserByok(userId: string, byok: { isByokProcessing: boolean, isByokTrend: boolean, isByokVideoGeneration: boolean, isByokPosts: boolean }): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${userId}/byok`, byok);
  }

  getStats(): Observable<AdminDashboardStatsDto> {
    return this.http.get<AdminDashboardStatsDto>(`${environment.apiUrl}/admin/dashboard/stats`);
  }

  getRecentUsers(limit: number): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/admin/dashboard/recent-users?limit=${limit}`);
  }

  getRoleProcessingOptions(roleId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/roles/${roleId}/processing-options`);
  }

  updateRoleProcessingOptions(roleId: string, data: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/roles/${roleId}/processing-options`, data);
  }

  getUserProcessingOptions(userId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${userId}/processing-options`);
  }

  updateUserProcessingOptions(userId: string, data: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${userId}/processing-options`, data);
  }

  updateUserQuota(userId: string, quotaType: string, limit: number): Observable<void> {
    const encodedUser = encodeURIComponent(userId);
    return this.http.post<void>(`${this.apiUrl}/${encodedUser}/quotas`, { quotaType, limit });
  }

  getPlanQuotaOverview(planCode: string): Observable<PlanQuotaOverviewDto> {
    const encodedPlan = encodeURIComponent(planCode);
    return this.http.get<PlanQuotaOverviewDto>(`${environment.apiUrl}/admin/plans/${encodedPlan}/quota-overview`);
  }

  getPlans(): Observable<AdminPlanDto[]> {
    return this.http.get<AdminPlanDto[]>(`${environment.apiUrl}/admin/plans`);
  }

  getUserQuotaOverview(userId: string): Observable<UserQuotaOverviewDto> {
    const encodedUser = encodeURIComponent(userId);
    return this.http.get<UserQuotaOverviewDto>(`${this.apiUrl}/${encodedUser}/quota-overview`);
  }
}
