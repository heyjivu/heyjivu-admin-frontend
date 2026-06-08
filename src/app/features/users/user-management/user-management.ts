import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AdminCreateContentProfileRequest,
  AdminPlanDto,
  AdminService,
  UserManagementDto,
  RoleDto,
  OrganizationDto,
  RightDto
} from '../services/admin.service';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../../core/services/toast.service';
import { forkJoin } from 'rxjs';
import { DialogService } from '../../../core/dialogs/dialog.service';
import { AddUserDialogComponent } from '../dialogs/add-user-dialog/add-user-dialog.component';

import { Rights } from '../../../core/constants/rights.constants';

interface UserQuotaCard {
  label: 'Creation Wallet' | 'Processing / Whisper Minutes' | 'Voice Minutes' | 'AI Video Clips' | 'Storage' | 'Brain Talk' | 'Manual Scan';
  lines: Array<{ label: string; value: string }>;
  stack: Array<{ label: string; value: string }>;
}

interface DailyQuotaDefinition {
  key: string;
  label: string;
  overrideLabel: string;
  description: string;
  unitLabel: string;
  defaultValue: number;
  min: number;
  max: number;
}

type AdminAccountType = 'user' | 'admin_only' | 'both';

interface PendingRoleGridChange {
  type: 'role';
  user: UserManagementDto;
  roleId: string;
  roleName: string;
}

interface PendingAccountTypeGridChange {
  type: 'accountType';
  user: UserManagementDto;
  accountType: AdminAccountType;
  accountTypeLabel: string;
  requiresOnboarding: boolean;
}

type PendingGridChange = PendingRoleGridChange | PendingAccountTypeGridChange;

interface AccountOnboardingForm {
  planId: string;
  primaryNiche: string;
  customPrimaryNiche: string;
  targetAudience: string;
  mainFormats: string[];
  toneStyle: string;
}

type AccountOnboardingField = keyof AccountOnboardingForm;

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

const ACCOUNT_TYPE_LABELS: Record<AdminAccountType, string> = {
  user: 'User Only',
  both: 'Admin + User',
  admin_only: 'Admin Only'
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
  private toast = inject(ToastService);
  private dialog = inject(DialogService);
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
  editorTab = signal<'basic' | 'rights' | 'processing' | 'quotas'>('basic');
  roleProcessingOptions = signal<any>(null);
  activeCategory = signal<string | null>(null);
  showSectionForm = signal(false);
  showRightForm = signal(false);
  newSectionName = '';
  newRightName = '';
  newRightKey = '';

  totalJobs = signal(0);

  editingUser = signal<UserManagementDto | null>(null);
  userProcessingOptions = signal<any>(null);
  readonly roleQuotaDefinitions: DailyQuotaDefinition[] = [
    {
      key: 'BrainTalkDaily',
      label: 'Brain Talk Daily',
      overrideLabel: 'Brain Talk Daily Override',
      description: 'Daily Jivu Talk messages for this role. Use -1 for unlimited BYOK roles.',
      unitLabel: 'per day',
      defaultValue: 100,
      min: -1,
      max: 10000
    },
    {
      key: 'ManualScanDaily',
      label: 'Manual Scan Daily',
      overrideLabel: 'Manual Scan Daily Override',
      description: 'Daily manual dashboard, review, and social scans. Use -1 for unlimited BYOK roles.',
      unitLabel: 'per day',
      defaultValue: 3,
      min: -1,
      max: 10000
    },
    {
      key: 'SocialPostMaxVideoSeconds',
      label: 'Social Post Video Max Seconds',
      overrideLabel: 'Social Post Video Max Override',
      description: 'Maximum uploaded or generated social-post video length. Current product max is 60 seconds.',
      unitLabel: 'seconds max',
      defaultValue: 60,
      min: 1,
      max: 60
    }
  ];
  userQuotaOverrides = signal<Record<string, number | null>>(this.emptyDailyQuotaOverrides());
  readonly accountTypeOptions: Array<{ value: AdminAccountType; label: string }> = [
    { value: 'user', label: ACCOUNT_TYPE_LABELS.user },
    { value: 'both', label: ACCOUNT_TYPE_LABELS.both },
    { value: 'admin_only', label: ACCOUNT_TYPE_LABELS.admin_only }
  ];
  readonly primaryNicheOptions = ['finance', 'fitness', 'education', 'ecommerce', 'gaming', 'beauty', 'news', 'custom'];
  readonly formatOptions = ['short videos', 'carousel posts', 'reels/shorts', 'image posts'];
  readonly toneOptions = ['funny', 'premium', 'educational', 'bold', 'calm'];
  readonly audienceSuggestions = ['beginners', 'buyers', 'students', 'creators', 'local audience'];
  plans = signal<AdminPlanDto[]>([]);
  loadingPlans = signal(false);
  pendingGridChange = signal<PendingGridChange | null>(null);
  accountOnboarding = signal<PendingAccountTypeGridChange | null>(null);
  accountOnboardingForm = signal<AccountOnboardingForm>(this.createEmptyAccountOnboardingForm());
  accountOnboardingTouched = signal<Set<AccountOnboardingField>>(new Set());
  accountOnboardingError = signal<string | null>(null);
  savingGridChange = signal(false);

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

  openAddUserModal() {
    const ref = this.dialog.open(AddUserDialogComponent, {
      width: '920px',
      closable: false,
      closeOnEscape: false,
      dismissableMask: false
    });

    ref.onClose.subscribe((created) => {
      if (created) {
        this.currentPage.set(1);
        this.loadData();
      }
    });
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

  getQuotaDisplayLabel(quota: UserQuotaCard): string {
    return quota.lines[0]?.label || quota.label;
  }

  getQuotaPreviewValue(quota: UserQuotaCard): string {
    return quota.lines[0]?.value || this.getQuotaPreview(quota);
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
    if (text.includes('manualscan')) return 'Manual Scan';
    if (text.includes('braintalk') || text.includes('assistanttalk')) return 'Brain Talk';
    if (text.includes('storage')) return 'Storage';
    if (text.includes('voice') || text.includes('tts') || text.includes('speech')) return 'Voice Minutes';
    if (text.includes('image') && text.includes('motion')) return 'Creation Wallet';
    if ((text.includes('ai') && text.includes('video')) || text.includes('providerclip')) return 'AI Video Clips';
    if (text.includes('processing') || text.includes('whisper') || text.includes('pipeline') || text.includes('videocreation')) return 'Processing / Whisper Minutes';
    return 'Creation Wallet';
  }

  private quotaDetailLabel(bucket: Record<string, unknown>, fallback: UserQuotaCard['label']): string {
    const text = this.compactKey(this.firstString(bucket, ['label', 'name', 'displayName', 'key', 'bucket', 'type']));
    if (text.includes('manualscan')) return 'Manual scans';
    if (text.includes('braintalk') || text.includes('assistanttalk')) return 'Talk messages';
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
      if (value < 0 || value === 2147483647) return 'Unlimited';
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

  private findQuotaLimit(source: unknown, key: string): number | null {
    const normalizedKey = this.compactKey(key);
    const match = this.extractQuotaBuckets(source).find(bucket => {
      const label = this.firstString(bucket, ['key', 'type', 'name', 'label', 'displayName']);
      return this.compactKey(label).includes(normalizedKey);
    });

    if (!match) return null;
    const value = match['limit'] ?? match['overrideLimit'] ?? match['value'] ?? match['amount'];
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  }

  private emptyDailyQuotaOverrides(): Record<string, number | null> {
    return this.roleQuotaDefinitions.reduce<Record<string, number | null>>((acc, quota) => {
      acc[quota.key] = null;
      return acc;
    }, {});
  }

  editUserProcessingSettings(user: UserManagementDto) {
    this.editingUser.set(user);
    this.userQuotaOverrides.set(this.emptyDailyQuotaOverrides());
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

    this.adminService.getUserQuotaOverview(user.id).subscribe({
      next: (overview) => {
        const overrides = this.emptyDailyQuotaOverrides();
        this.roleQuotaDefinitions.forEach(quota => {
          overrides[quota.key] = this.findQuotaLimit(overview?.quotaOverrides, quota.key);
        });
        this.userQuotaOverrides.set(overrides);
      },
      error: (err) => {
        console.error('Failed to load user quota overview', err);
        this.userQuotaOverrides.set(this.emptyDailyQuotaOverrides());
      }
    });
  }

  saveUserProcessingSettings() {
    const user = this.editingUser();
    if (!user || !this.userProcessingOptions()) return;

    const updates = [this.adminService.updateUserProcessingOptions(user.id, this.userProcessingOptions())];
    this.roleQuotaDefinitions.forEach(quota => {
      const overrideLimit = this.userQuotaOverrides()[quota.key];
      if (overrideLimit !== null && overrideLimit !== undefined) {
        updates.push(this.adminService.updateUserQuota(user.id, quota.key, overrideLimit));
      }
    });

    forkJoin(updates).subscribe({
      next: () => {
        this.toast.success('User defaults updated successfully.');
        this.editingUser.set(null);
        this.userProcessingOptions.set(null);
        this.userQuotaOverrides.set(this.emptyDailyQuotaOverrides());
      },
      error: (err) => {
        console.error('Failed to update user processing options', err);
        this.toast.error('Failed to save settings.');
      }
    });
  }

  requestRoleChange(user: UserManagementDto, roleId: string | null) {
    if (!roleId || roleId === user.roleId) {
      this.resetGridSelects();
      return;
    }

    const role = this.roles().find(item => item.id === roleId);
    this.pendingGridChange.set({
      type: 'role',
      user,
      roleId,
      roleName: this.displayRoleName(role?.name ?? 'Selected role')
    });
  }

  requestAccountTypeChange(user: UserManagementDto, accountType: AdminAccountType) {
    const current = this.normalizeAccountType(user.accountType);
    const next = this.normalizeAccountType(accountType);
    if (next === current) {
      this.resetGridSelects();
      return;
    }

    this.pendingGridChange.set({
      type: 'accountType',
      user,
      accountType: next,
      accountTypeLabel: this.accountTypeLabel(next),
      requiresOnboarding: this.requiresOnboardingForAccountType(user, next)
    });
  }

  cancelPendingGridChange() {
    this.pendingGridChange.set(null);
    this.resetGridSelects();
  }

  confirmPendingGridChange() {
    const change = this.pendingGridChange();
    if (!change || this.savingGridChange()) return;

    if (change.type === 'role') {
      this.savingGridChange.set(true);
      this.adminService.updateUserRole(change.user.id, change.roleId).subscribe({
        next: () => {
          this.toast.success('Role updated. Role quota defaults are now applied.');
          this.pendingGridChange.set(null);
          this.savingGridChange.set(false);
          this.loadData();
        },
        error: (err) => {
          this.toast.error(this.readApiError(err, 'Failed to update role.'));
          this.savingGridChange.set(false);
          this.cancelPendingGridChange();
        }
      });
      return;
    }

    if (change.requiresOnboarding) {
      this.pendingGridChange.set(null);
      this.openAccountOnboarding(change);
      return;
    }

    this.saveAccountTypeChange(change);
  }

  pendingGridChangeTitle(change: PendingGridChange): string {
    return change.type === 'role' ? 'Confirm role change' : 'Confirm account type change';
  }

  pendingGridChangeBody(change: PendingGridChange): string {
    if (change.type === 'role') {
      return 'This will update role permissions and role quota defaults. Existing user-specific quota overrides remain attached to the user.';
    }

    if (change.requiresOnboarding) {
      return 'This account is gaining user-app access, so plan and onboarding profile must be completed before saving.';
    }

    return 'This will update which portals this account can access. Plan, quota buckets, and user-specific overrides remain in place.';
  }

  pendingGridChangeTarget(change: PendingGridChange): string {
    return change.type === 'role' ? change.roleName : change.accountTypeLabel;
  }

  closeAccountOnboarding() {
    if (this.savingGridChange()) return;
    this.accountOnboarding.set(null);
    this.accountOnboardingError.set(null);
    this.accountOnboardingTouched.set(new Set());
    this.resetGridSelects();
  }

  patchAccountOnboardingForm(patch: Partial<AccountOnboardingForm>): void {
    this.accountOnboardingForm.update(form => ({ ...form, ...patch }));
    this.accountOnboardingError.set(null);
  }

  markAccountOnboardingField(field: AccountOnboardingField): void {
    this.accountOnboardingTouched.update(fields => {
      const next = new Set(fields);
      next.add(field);
      return next;
    });
  }

  showAccountOnboardingValidation(field: AccountOnboardingField): boolean {
    return this.accountOnboardingTouched().has(field);
  }

  isAccountOnboardingFieldInvalid(field: AccountOnboardingField): boolean {
    const form = this.accountOnboardingForm();
    switch (field) {
      case 'planId':
        return !form.planId;
      case 'primaryNiche':
        return !form.primaryNiche;
      case 'customPrimaryNiche':
        return form.primaryNiche === 'custom' && !form.customPrimaryNiche.trim();
      case 'targetAudience':
        return !form.targetAudience.trim();
      case 'mainFormats':
        return form.mainFormats.length === 0;
      case 'toneStyle':
        return !form.toneStyle;
      default:
        return false;
    }
  }

  isAccountOnboardingValid(): boolean {
    return !this.isAccountOnboardingFieldInvalid('planId') &&
      !this.isAccountOnboardingFieldInvalid('primaryNiche') &&
      !this.isAccountOnboardingFieldInvalid('customPrimaryNiche') &&
      !this.isAccountOnboardingFieldInvalid('targetAudience') &&
      !this.isAccountOnboardingFieldInvalid('mainFormats') &&
      !this.isAccountOnboardingFieldInvalid('toneStyle');
  }

  selectAccountPlan(planId: string): void {
    this.patchAccountOnboardingForm({ planId });
    this.markAccountOnboardingField('planId');
  }

  selectAccountNiche(niche: string): void {
    this.patchAccountOnboardingForm({
      primaryNiche: niche,
      customPrimaryNiche: niche === 'custom' ? this.accountOnboardingForm().customPrimaryNiche : ''
    });
    this.markAccountOnboardingField('primaryNiche');
  }

  setAccountAudienceSuggestion(audience: string): void {
    this.patchAccountOnboardingForm({ targetAudience: audience });
    this.markAccountOnboardingField('targetAudience');
  }

  toggleAccountFormat(format: string): void {
    const form = this.accountOnboardingForm();
    this.patchAccountOnboardingForm({
      mainFormats: form.mainFormats.includes(format)
        ? form.mainFormats.filter(item => item !== format)
        : [...form.mainFormats, format]
    });
    this.markAccountOnboardingField('mainFormats');
  }

  selectAccountTone(tone: string): void {
    this.patchAccountOnboardingForm({ toneStyle: tone });
    this.markAccountOnboardingField('toneStyle');
  }

  selectedAccountPlan(): AdminPlanDto | undefined {
    return this.plans().find(plan => plan.id === this.accountOnboardingForm().planId);
  }

  formatPlanPrice(plan: AdminPlanDto): string {
    if (plan.pricePkr <= 0) return 'Free';
    return `Rs. ${new Intl.NumberFormat('en-PK', { maximumFractionDigits: 0 }).format(plan.pricePkr)} / mo`;
  }

  accountOnboardingNicheLabel(): string {
    const form = this.accountOnboardingForm();
    return form.primaryNiche === 'custom'
      ? form.customPrimaryNiche.trim() || 'custom niche'
      : form.primaryNiche || 'niche';
  }

  saveAccountOnboarding() {
    const change = this.accountOnboarding();
    if (!change || this.savingGridChange()) return;

    if (!this.isAccountOnboardingValid()) {
      this.markAllAccountOnboardingFields();
      this.accountOnboardingError.set('Complete the plan and onboarding profile before saving.');
      return;
    }

    const form = this.accountOnboardingForm();
    const contentProfile: AdminCreateContentProfileRequest = {
      primaryNiche: form.primaryNiche,
      customNiche: form.primaryNiche === 'custom' ? form.customPrimaryNiche.trim() : null,
      targetAudience: form.targetAudience.trim(),
      mainFormats: form.mainFormats,
      toneStyle: form.toneStyle
    };

    this.saveAccountTypeChange(change, {
      planId: form.planId,
      contentProfile
    });
  }

  normalizeAccountType(value: unknown): AdminAccountType {
    const normalized = String(value ?? '').trim().toLowerCase().replace('-', '_');
    if (normalized === 'admin_only' || normalized === 'adminonly') return 'admin_only';
    if (normalized === 'both') return 'both';
    return 'user';
  }

  accountTypeLabel(value: unknown): string {
    return ACCOUNT_TYPE_LABELS[this.normalizeAccountType(value)];
  }

  private saveAccountTypeChange(
    change: PendingAccountTypeGridChange,
    onboarding?: { planId: string; contentProfile: AdminCreateContentProfileRequest }
  ) {
    this.savingGridChange.set(true);
    this.accountOnboardingError.set(null);

    this.adminService.updateUserAccountType(change.user.id, {
      accountType: change.accountType,
      planId: onboarding?.planId ?? null,
      contentProfile: onboarding?.contentProfile ?? null
    }).subscribe({
      next: () => {
        this.toast.success('Account type updated.');
        this.pendingGridChange.set(null);
        this.accountOnboarding.set(null);
        this.savingGridChange.set(false);
        this.accountOnboardingTouched.set(new Set());
        this.loadData();
      },
      error: (err) => {
        const message = this.readApiError(err, 'Failed to update account type.');
        if (this.accountOnboarding()) {
          this.accountOnboardingError.set(message);
        } else {
          this.toast.error(message);
          this.pendingGridChange.set(null);
          this.resetGridSelects();
        }
        this.savingGridChange.set(false);
      }
    });
  }

  private openAccountOnboarding(change: PendingAccountTypeGridChange) {
    this.accountOnboarding.set(change);
    this.accountOnboardingTouched.set(new Set());
    this.accountOnboardingError.set(null);
    this.accountOnboardingForm.set(this.createEmptyAccountOnboardingForm());
    this.loadPlansForAccountOnboarding();
  }

  private loadPlansForAccountOnboarding() {
    if (this.plans().length > 0) {
      this.patchAccountOnboardingForm({ planId: this.defaultPlanId(this.plans()) });
      return;
    }

    this.loadingPlans.set(true);
    this.adminService.getPlans().subscribe({
      next: (plans) => {
        this.plans.set(plans);
        this.loadingPlans.set(false);
        this.patchAccountOnboardingForm({ planId: this.defaultPlanId(plans) });
      },
      error: (err) => {
        console.error('Failed to load plans', err);
        this.loadingPlans.set(false);
        this.accountOnboardingError.set('Failed to load plans.');
      }
    });
  }

  private createEmptyAccountOnboardingForm(): AccountOnboardingForm {
    return {
      planId: '',
      primaryNiche: '',
      customPrimaryNiche: '',
      targetAudience: '',
      mainFormats: [],
      toneStyle: ''
    };
  }

  private defaultPlanId(plans: AdminPlanDto[]): string {
    const freePlan = plans.find(plan => this.compactKey(plan.id).includes('free'));
    return freePlan?.id ?? plans[0]?.id ?? '';
  }

  private requiresOnboardingForAccountType(user: UserManagementDto, next: AdminAccountType): boolean {
    const current = this.normalizeAccountType(user.accountType);
    const gainsUserAccess = current === 'admin_only' && next !== 'admin_only';
    const missingUserSetup = this.canAccessUserApp(next) && (!user.planCode || user.onboardingStep !== 8);
    return gainsUserAccess || missingUserSetup;
  }

  private canAccessUserApp(accountType: AdminAccountType): boolean {
    return accountType === 'user' || accountType === 'both';
  }

  private markAllAccountOnboardingFields() {
    this.accountOnboardingTouched.set(new Set([
      'planId',
      'primaryNiche',
      'customPrimaryNiche',
      'targetAudience',
      'mainFormats',
      'toneStyle'
    ]));
  }

  private resetGridSelects() {
    this.loadData();
  }

  private readApiError(error: unknown, fallback: string): string {
    if (typeof error === 'object' && error !== null && 'error' in error) {
      const body = (error as { error?: unknown }).error;
      if (typeof body === 'string') return body;
      if (typeof body === 'object' && body !== null) {
        const record = body as Record<string, unknown>;
        if (typeof record['error'] === 'string') return record['error'];
        if (typeof record['message'] === 'string') return record['message'];
      }
    }
    return fallback;
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
      rights: [],
      quotas: this.defaultDailyQuotasForRole('New Plan Role')
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
    this.selectedRole.set({
      ...role,
      rights: [...role.rights],
      quotas: { ...(role.quotas || {}) }
    });
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

  getSelectedRoleQuota(key: string): number {
    const role = this.selectedRole();
    return role?.quotas?.[key] ?? this.defaultDailyQuotaForRole(key, role?.name);
  }

  setSelectedRoleQuota(key: string, value: string | number | null) {
    const role = this.selectedRole();
    if (!role) return;

    const parsed = typeof value === 'number' ? value : Number(value ?? 0);
    const definition = this.roleQuotaDefinitions.find(quota => quota.key === key);
    const min = definition?.min ?? 0;
    const safeValue = Number.isFinite(parsed)
      ? Math.max(min, Math.floor(parsed))
      : this.defaultDailyQuotaForRole(key, role.name);
    this.selectedRole.set({
      ...role,
      quotas: {
        ...(role.quotas || {}),
        [key]: safeValue
      }
    });
  }

  private defaultDailyQuotasForRole(roleName: string | null | undefined): Record<string, number> {
    return this.roleQuotaDefinitions.reduce<Record<string, number>>((acc, quota) => {
      acc[quota.key] = this.defaultDailyQuotaForRole(quota.key, roleName);
      return acc;
    }, {});
  }

  private defaultDailyQuotaForRole(key: string, roleName: string | null | undefined): number {
    const roleKey = this.compactKey(roleName);
    if (key === 'SocialPostMaxVideoSeconds') return 60;
    if (key === 'BrainTalkDaily') {
      if (roleKey.includes('byok') || roleKey.includes('expert')) return -1;
      if (roleKey.includes('free')) return 0;
      return 100;
    }
    if (roleKey.includes('free')) return 0;

    if (key === 'ManualScanDaily') {
      if (roleKey.includes('byok') || roleKey.includes('expert')) return -1;
      if (roleKey.includes('premium') || roleKey.includes('agency')) return 5;
      return 3;
    }

    const definition = this.roleQuotaDefinitions.find(quota => quota.key === key);
    return definition?.defaultValue ?? 0;
  }

  getUserQuotaOverride(key: string): number | null {
    return this.userQuotaOverrides()[key] ?? null;
  }

  setUserQuotaOverride(key: string, value: string | number | null) {
    const parsed = value === '' || value === null || value === undefined
      ? null
      : Number(value);
    const definition = this.roleQuotaDefinitions.find(quota => quota.key === key);
    const min = definition?.min ?? 0;
    this.userQuotaOverrides.set({
      ...this.userQuotaOverrides(),
      [key]: parsed === null || !Number.isFinite(parsed)
        ? null
        : Math.max(min, Math.floor(parsed))
    });
  }

  saveRole() {
    const role = this.selectedRole();
    if (!role) return;

    if (!role.id) {
      this.adminService.createRole(role).subscribe((newRole: any) => {
        const roleId = newRole.id || newRole;
        if (roleId && this.roleProcessingOptions()) {
          this.adminService.updateRoleProcessingOptions(roleId, this.roleProcessingOptions()).subscribe(() => {
            this.toast.success('Role created successfully.');
            this.loadRolesAndRights();
            this.selectedRole.set(null);
          });
        } else {
          this.toast.success('Role created successfully.');
          this.loadRolesAndRights();
          this.selectedRole.set(null);
        }
      });
    } else {
      this.adminService.updateRole(role.id, role).subscribe(() => {
        this.adminService.updateRoleRights(role.id, role.rights).subscribe(() => {
          if (this.roleProcessingOptions()) {
            this.adminService.updateRoleProcessingOptions(role.id, this.roleProcessingOptions()).subscribe(() => {
              this.toast.success('Role updated successfully.');
              this.loadRolesAndRights();
              this.selectedRole.set(null);
            });
          } else {
            this.toast.success('Role updated successfully.');
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
    this.newSectionName = '';
    this.showSectionForm.set(true);
  }

  saveSection() {
    const name = this.newSectionName.trim();
    if (!name) {
      this.toast.show('Enter a section name first.', 'warning');
      return;
    }

    this.activeCategory.set(name);
    this.showSectionForm.set(false);
    this.toast.show('Section selected. Add a right to save it.', 'info');
  }

  cancelSectionForm() {
    this.newSectionName = '';
    this.showSectionForm.set(false);
  }

  addRightToSection(category: string) {
    this.activeCategory.set(category);
    this.newRightName = '';
    this.newRightKey = '';
    this.showRightForm.set(true);
  }

  saveRightToSection(category: string) {
    const name = this.newRightName.trim();
    const key = this.newRightKey.trim();
    if (!name || !key) {
      this.toast.show('Enter a right name and key first.', 'warning');
      return;
    }

    this.adminService.createRight({
      name,
      key,
      category,
      description: ''
    }).subscribe({
      next: () => {
        this.toast.success('Right created successfully.');
        this.showRightForm.set(false);
        this.loadRolesAndRights();
      },
      error: () => {
        this.toast.error('Failed to create right.');
      }
    });
  }

  cancelRightForm() {
    this.newRightName = '';
    this.newRightKey = '';
    this.showRightForm.set(false);
  }
}



