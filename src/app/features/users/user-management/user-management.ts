import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminService, UserManagementDto, RoleDto, OrganizationDto, RightDto } from '../services/admin.service';
import { FormsModule } from '@angular/forms';

import { Rights } from '../../../core/constants/rights.constants';

interface UserQuotaCard {
  label: 'Creation Wallet' | 'Video Creation Minutes' | 'Voice Minutes' | 'AI Video Clips' | 'Storage';
  lines: Array<{ label: string; value: string }>;
  stack: Array<{ label: string; value: string }>;
}

const PLAN_ROLE_LABELS: Record<string, string> = {
  freeguest: 'Free',
  free_guest: 'Free',
  socialmerchant: 'Student',
  social_merchant: 'Student',
  procreator: 'Merchant',
  pro_creator: 'Merchant',
  agencyadmin: 'Premium',
  agency_admin: 'Premium',
  agencypro: 'Premium',
  agency_pro: 'Premium',
  expertbyok: 'BYOK',
  expert_byok: 'BYOK',
  company: 'Premium'
};

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-management.component.html',
  styleUrl: './user-management.component.scss'
})
export class UserManagementComponent implements OnInit {
  private adminService = inject(AdminService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  public readonly Rights = Rights;
  
  activeTab = signal<'users' | 'orgs' | 'roles'>('users');
  Math = Math;
  users = signal<UserManagementDto[]>([]);
  
  // Filtering and Pagination state
  searchQuery = signal('');
  selectedRoleFilter = signal<string>('');
  selectedStatusFilter = signal<string>('');
  currentPage = signal(1);
  pageSize = signal(10);
  totalItems = signal(0);
  private searchTimeout: any;

  onSearchChange(value: string) {
    this.searchQuery.set(value);
    this.currentPage.set(1);
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.loadData();
    }, 300);
  }

  onFilterChange() {
    this.currentPage.set(1);
    this.loadData();
  }

  nextPage() {
    if ((this.currentPage() * this.pageSize()) < this.totalItems()) {
      this.currentPage.set(this.currentPage() + 1);
      this.loadData();
    }
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.set(this.currentPage() - 1);
      this.loadData();
    }
  }

  roles = signal<RoleDto[]>([]);
  availableRights = signal<RightDto[]>([]);
  organizations = signal<OrganizationDto[]>([]);
  loading = signal(false);
  
  selectedRole = signal<RoleDto | null>(null);
  editorTab = signal<'basic' | 'rights' | 'processing'>('basic');
  roleProcessingOptions = signal<any>(null);
  activeCategory = signal<string | null>(null);

  totalJobs = signal(0);

  editingUser = signal<UserManagementDto | null>(null);
  userProcessingOptions = signal<any>(null);
  setTab(tab: 'users' | 'orgs' | 'roles') {
    this.activeTab.set(tab);
    if (tab === 'roles' && this.availableRights().length === 0) {
      this.loadRolesAndRights();
    }
  }

  navigateTab(tab: 'users' | 'orgs' | 'roles') {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge'
    });
  }

  ngOnInit() {
    this.loadData();
    this.route.queryParams.subscribe(params => {
      const tab = params['tab'];
      if (tab === 'users' || tab === 'roles' || tab === 'orgs') {
        this.setTab(tab);
      } else {
        this.setTab('users');
      }
    });
  }

  loadData() {
    this.loading.set(true);
    
    let isActive: boolean | undefined = undefined;
    if (this.selectedStatusFilter() === 'active') isActive = true;
    if (this.selectedStatusFilter() === 'inactive') isActive = false;

    // Load Users
    this.adminService.getUsers({
      pageNumber: this.currentPage(),
      pageSize: this.pageSize(),
      searchTerm: this.searchQuery(),
      roleId: this.selectedRoleFilter() || undefined,
      isActive: isActive
    }).subscribe((res: any) => {
      // Handle both pure array or PagedResult format if the backend returns it
      const usersArray = Array.isArray(res) ? res : (res.items || []);
      const totalCount = Array.isArray(res) ? res.length : (res.totalCount || usersArray.length);
      this.users.set(usersArray);
      this.totalItems.set(totalCount);
      this.calculateStats(usersArray);
      this.loading.set(false);
    });

    // Load Roles
    this.adminService.getRoles().subscribe(roles => this.roles.set(roles));

    // Load Organizations
    this.adminService.getOrganizations().subscribe(orgs => this.organizations.set(orgs));
  }

  loadRolesAndRights() {
    this.adminService.getRights().subscribe(rights => {
      this.availableRights.set(rights);
      if (rights.length > 0 && !this.activeCategory()) {
        this.activeCategory.set(rights[0].category);
      }
    });
    this.adminService.getRoles().subscribe(roles => this.roles.set(roles));
  }

  private calculateStats(users: UserManagementDto[]) {
    const total = users.reduce((acc, u) => 
      acc + (u.usage?.processingJobs || 0) + (u.usage?.trendJobs || 0) + (u.usage?.smartVideoJobs || 0), 0);
    this.totalJobs.set(total);
  }

  displayRoleName(roleName: string | null | undefined): string {
    if (!roleName) return 'Unassigned';
    return PLAN_ROLE_LABELS[this.compactKey(roleName)] ?? roleName;
  }

  getUserPlanLabel(user: UserManagementDto): string {
    const explicitPlan = user.planName || user.planCode;
    if (explicitPlan) return this.displayRoleName(explicitPlan);

    const roleLabel = this.displayRoleName(user.roleName);
    return ['Free', 'Student', 'Merchant', 'Premium', 'BYOK'].includes(roleLabel)
      ? roleLabel
      : 'Plan not exposed';
  }

  getUserQuotaCards(user: UserManagementDto): UserQuotaCard[] {
    const buckets = this.extractQuotaBuckets(user.quotaBuckets ?? user.quotaSummary ?? user.quotas ?? user.quotaOverrides);
    return buckets.map(bucket => {
      const label = this.quotaLabel(this.firstString(bucket, ['label', 'name', 'displayName', 'key', 'bucket', 'type']));
      return {
        label,
        lines: [{ label: this.quotaDetailLabel(bucket, label), value: this.quotaValue(bucket) }],
        stack: this.quotaStack(bucket)
      };
    });
  }

  getQuotaPreview(quota: UserQuotaCard): string {
    return quota.lines.slice(0, 2).map(line => `${line.label}: ${line.value}`).join(' | ');
  }

  private extractQuotaBuckets(source: unknown): Array<Record<string, unknown>> {
    if (Array.isArray(source)) return source.filter(this.isRecord);
    if (!this.isRecord(source)) return [];

    for (const key of ['quotaBuckets', 'quotas', 'buckets', 'limits', 'wallets']) {
      const nestedBuckets = this.extractQuotaBuckets(source[key]);
      if (nestedBuckets.length > 0) return nestedBuckets;
    }

    return Object.entries(source).map(([key, value]) => this.isRecord(value) ? { ...value, key: value['key'] ?? key } : { key, value });
  }

  private quotaStack(bucket: Record<string, unknown>): Array<{ label: string; value: string }> {
    const stack = ['stack', 'sources', 'components', 'segments', 'breakdown']
      .map(key => bucket[key])
      .find(Array.isArray);

    return stack
      ? stack.map(item => this.isRecord(item)
        ? { label: this.stackLabel(this.firstString(item, ['label', 'name', 'source', 'sourceType', 'type'])), value: this.quotaValue(item) }
        : { label: 'Stacked bucket', value: String(item ?? 'Available') })
      : [];
  }

  private quotaLabel(value: string | null): UserQuotaCard['label'] {
    const text = this.compactKey(value);
    if (text.includes('storage')) return 'Storage';
    if (text.includes('voice') || text.includes('tts') || text.includes('speech')) return 'Voice Minutes';
    if (text.includes('image') && text.includes('motion')) return 'Creation Wallet';
    if ((text.includes('ai') && text.includes('video')) || text.includes('providerclip')) return 'AI Video Clips';
    if (text.includes('video') || text.includes('smart') || text.includes('pipeline')) return 'Video Creation Minutes';
    return 'Creation Wallet';
  }

  private quotaDetailLabel(bucket: Record<string, unknown>, fallback: UserQuotaCard['label']): string {
    const text = this.compactKey(this.firstString(bucket, ['label', 'name', 'displayName', 'key', 'bucket', 'type']));
    if (text.includes('stockclipminute')) return 'Stock clip minutes';
    if (text.includes('stockclip')) return 'Stock clips';
    if (text.includes('stockimage')) return 'Stock images';
    if (text.includes('aiimage')) return 'AI images';
    if (fallback === 'AI Video Clips') return 'Provider clips';
    return 'Allowance';
  }

  private stackLabel(value: string | null): string {
    const text = this.compactKey(value);
    if (text.includes('base') || text.includes('plan')) return 'Base plan';
    if (text.includes('override') || text.includes('admin') || text.includes('user')) return 'Override';
    if (text.includes('addon') || text.includes('topup')) return 'Add-on';
    return 'Stacked bucket';
  }

  private quotaValue(bucket: Record<string, unknown>): string {
    const unit = this.firstString(bucket, ['unit', 'units']);
    const display = this.firstString(bucket, ['displayValue', 'summary', 'text']);
    if (display) return display;

    const parts = [
      this.quotaValuePart('Limit', bucket['limit'] ?? bucket['total'] ?? bucket['allowed'] ?? bucket['allowance'], unit),
      this.quotaValuePart('Used', bucket['used'] ?? bucket['consumed'], unit),
      this.quotaValuePart('Remaining', bucket['remaining'] ?? bucket['available'], unit)
    ].filter(Boolean);

    return parts.length > 0 ? parts.join(' / ') : this.quotaPrimitive(bucket['value'] ?? bucket['amount'], unit);
  }

  private quotaValuePart(label: string, value: unknown, unit: string | null): string | null {
    return value === undefined ? null : `${label} ${this.quotaPrimitive(value, unit)}`;
  }

  private quotaPrimitive(value: unknown, unit: string | null): string {
    if (typeof value === 'number') {
      const formatted = new Intl.NumberFormat('en-PK', { maximumFractionDigits: 2 }).format(value);
      return unit ? `${formatted} ${unit}` : formatted;
    }
    if (typeof value === 'string') return unit ? `${value} ${unit}` : value;
    if (value === null) return 'Inherited';
    return 'Available';
  }

  private firstString(record: Record<string, unknown>, keys: string[]): string | null {
    for (const key of keys) {
      const value = record[key];
      if (typeof value === 'string' && value.trim()) return value;
    }
    return null;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private compactKey(value: unknown): string {
    return String(value ?? '').toLowerCase().replace(/[^a-z0-9_]/g, '');
  }

  editUserProcessingSettings(user: UserManagementDto) {
    this.editingUser.set(user);
    this.adminService.getUserProcessingOptions(user.id).subscribe({
      next: (options) => {
        if (options && Object.keys(options).length > 0) {
          this.userProcessingOptions.set(options);
        } else {
          // Defaults if none exist
          this.userProcessingOptions.set({
            createMainVideo: null,
            createShorts: null,
            maxShorts: null,
            minShortDuration: null,
            maxShortDuration: null,
            removeSilence: null,
            silenceThresholdSeconds: null,
            targetLanguage: null,
            burnSubtitles: null,
            subtitleStyle: null,
            generateAIThumbnail: null,
            thumbnailEngine: null,
            maxParallelVideos: null,
            pipelineIntervalMinutes: null,
            executionEnvironment: null
          });
        }
      },
      error: (err) => {
        console.error('Failed to load user processing options', err);
        this.userProcessingOptions.set({
          createMainVideo: null,
          createShorts: null,
          maxShorts: null,
          minShortDuration: null,
          maxShortDuration: null,
          removeSilence: null,
          silenceThresholdSeconds: null,
          targetLanguage: null,
          burnSubtitles: null,
          subtitleStyle: null,
          generateAIThumbnail: null,
          thumbnailEngine: null,
          maxParallelVideos: null,
          pipelineIntervalMinutes: null,
          executionEnvironment: null
        });
      }
    });
  }

  saveUserProcessingSettings() {
    const user = this.editingUser();
    if (!user || !this.userProcessingOptions()) return;

    this.adminService.updateUserProcessingOptions(user.id, this.userProcessingOptions()).subscribe({
      next: () => {
        alert('User processing options updated successfully!');
        this.editingUser.set(null);
        this.userProcessingOptions.set(null);
      },
      error: (err) => {
        console.error('Failed to update user processing options', err);
        alert('Failed to save settings.');
      }
    });
  }

  onRoleChange(userId: string, roleId: string) {
    this.adminService.updateUserRole(userId, roleId).subscribe(() => {
      this.loadData();
    });
  }

  toggleStatus(user: UserManagementDto) {
    this.adminService.updateUserStatus(user.id, !user.isActive).subscribe(() => {
      this.loadData();
    });
  }

  toggleByok(user: UserManagementDto, field: 'isByokProcessing' | 'isByokTrend' | 'isByokVideoGeneration' | 'isByokPosts') {
    const updatedByok = {
      isByokProcessing: user.isByokProcessing,
      isByokTrend: user.isByokTrend,
      isByokVideoGeneration: user.isByokVideoGeneration,
      isByokPosts: user.isByokPosts,
      [field]: !user[field]
    };
    
    this.adminService.updateUserByok(user.id, updatedByok).subscribe(() => {
      this.loadData();
    });
  }

  createNewRole() {
    this.selectedRole.set({
      id: '',
      name: 'New Plan Role',
      description: '',
      scope: 1,
      rights: []
    });
    this.editorTab.set('basic');
    this.roleProcessingOptions.set({
      createMainVideo: true,
      createShorts: true,
      maxShorts: 10,
      minShortDuration: 30,
      maxShortDuration: 60,
      removeSilence: true,
      silenceThresholdSeconds: 0.5,
      targetLanguage: 'English',
      burnSubtitles: true,
      subtitleStyle: 'NeonHighlight',
      generateAIThumbnail: true,
      thumbnailEngine: 'SDXL',
      maxParallelVideos: 5,
      pipelineIntervalMinutes: 180,
      executionEnvironment: 'Development'
    });
  }

  selectRole(role: RoleDto) {
    this.selectedRole.set({ ...role, rights: [...role.rights] });
    this.editorTab.set('basic');
    if (role.id) {
      this.adminService.getRoleProcessingOptions(role.id).subscribe({
        next: (options) => {
          this.roleProcessingOptions.set(options);
        },
        error: (err) => {
          console.error('Failed to load role processing options', err);
        }
      });
    } else {
      this.roleProcessingOptions.set(null);
    }
  }

  isRightSelected(rightKey: string): boolean {
    const role = this.selectedRole();
    return role ? role.rights.includes(rightKey) : false;
  }

  toggleRight(rightKey: string) {
    const role = this.selectedRole();
    if (!role) return;

    const rights = [...role.rights];
    const index = rights.indexOf(rightKey);
    
    if (index > -1) {
      rights.splice(index, 1);
    } else {
      rights.push(rightKey);
    }

    this.selectedRole.set({ ...role, rights });
  }

  saveRole() {
    const role = this.selectedRole();
    if (!role) return;

    if (!role.id) {
      this.adminService.createRole(role).subscribe((newRole: any) => {
        const roleId = newRole.id || newRole;
        if (roleId && this.roleProcessingOptions()) {
          this.adminService.updateRoleProcessingOptions(roleId, this.roleProcessingOptions()).subscribe(() => {
            alert('Role created successfully!');
            this.loadRolesAndRights();
            this.selectedRole.set(null);
          });
        } else {
          alert('Role created successfully!');
          this.loadRolesAndRights();
          this.selectedRole.set(null);
        }
      });
    } else {
      this.adminService.updateRole(role.id, role).subscribe(() => {
        this.adminService.updateRoleRights(role.id, role.rights).subscribe(() => {
          if (this.roleProcessingOptions()) {
            this.adminService.updateRoleProcessingOptions(role.id, this.roleProcessingOptions()).subscribe(() => {
              alert('Role updated successfully!');
              this.loadRolesAndRights();
              this.selectedRole.set(null);
            });
          } else {
            alert('Role updated successfully!');
            this.loadRolesAndRights();
            this.selectedRole.set(null);
          }
        });
      });
    }
  }

  getCategories() {
    const cats = new Set(this.availableRights().map(r => r.category));
    return Array.from(cats).sort();
  }

  getRightsForCategory(category: string) {
    return this.availableRights().filter(r => r.category === category);
  }

  addSection() {
    const name = prompt('Enter new section name:');
    if (name) {
      this.activeCategory.set(name);
    }
  }

  addRightToSection(category: string) {
    const name = prompt('Enter Right Display Name:');
    if (!name) return;
    const key = prompt('Enter Right Key (e.g. Category_Action):');
    if (!key) return;

    this.adminService.createRight({
      name,
      key,
      category,
      description: ''
    }).subscribe(() => {
      this.loadRolesAndRights();
    });
  }
}



