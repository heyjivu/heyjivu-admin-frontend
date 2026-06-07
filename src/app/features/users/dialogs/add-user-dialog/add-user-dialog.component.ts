import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DynamicDialogRef } from 'primeng/dynamicdialog';
import {
  AdminCreateUserRequest,
  AdminPlanDto,
  AdminService,
  RoleDto
} from '../../services/admin.service';
import { ToastService } from '../../../../core/services/toast.service';

type AddUserStep = 'account' | 'plan' | 'profile';
type AdminAccountType = 'user' | 'admin_only' | 'both';

interface AddUserForm {
  accountType: AdminAccountType;
  displayName: string;
  email: string;
  roleId: string | null;
  planId: string;
  password: string;
  confirmPassword: string;
  primaryNiche: string;
  customPrimaryNiche: string;
  targetAudience: string;
  mainFormats: string[];
  toneStyle: string;
}

type AddUserField = keyof AddUserForm;

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
  selector: 'app-add-user-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-user-dialog.component.html',
  styleUrl: './add-user-dialog.component.scss'
})
export class AddUserDialogComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly toast = inject(ToastService);
  private readonly ref = inject(DynamicDialogRef);

  readonly steps: Array<{ id: AddUserStep; label: string; icon: string }> = [
    { id: 'account', label: 'Account', icon: 'fas fa-user-plus' },
    { id: 'plan', label: 'Plan', icon: 'fas fa-layer-group' },
    { id: 'profile', label: 'Onboarding', icon: 'fas fa-bullseye' }
  ];
  readonly accountTypeOptions: Array<{ value: AdminAccountType; label: string; description: string; icon: string }> = [
    {
      value: 'user',
      label: 'User only',
      description: 'User app access with plan and onboarding.',
      icon: 'fas fa-user'
    },
    {
      value: 'both',
      label: 'Admin + user',
      description: 'Admin portal plus user app access with plan.',
      icon: 'fas fa-user-shield'
    },
    {
      value: 'admin_only',
      label: 'Admin only',
      description: 'Admin portal account. No user onboarding.',
      icon: 'fas fa-shield-alt'
    }
  ];
  readonly primaryNicheOptions = ['finance', 'fitness', 'education', 'ecommerce', 'gaming', 'beauty', 'news', 'custom'];
  readonly formatOptions = ['short videos', 'carousel posts', 'reels/shorts', 'image posts'];
  readonly toneOptions = ['funny', 'premium', 'educational', 'bold', 'calm'];
  readonly audienceSuggestions = ['beginners', 'buyers', 'students', 'creators', 'local audience'];

  roles = signal<RoleDto[]>([]);
  plans = signal<AdminPlanDto[]>([]);
  loadingPlans = signal(false);
  loadingRoles = signal(false);
  step = signal<AddUserStep>('account');
  form = signal<AddUserForm>(this.createEmptyForm());
  touched = signal<Set<AddUserField>>(new Set());
  error = signal<string | null>(null);
  creating = signal(false);
  showPassword = false;
  showConfirmPassword = false;

  passwordValue = computed(() => this.form().password || '');
  passwordStrength = computed(() => {
    const password = this.passwordValue();
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[0-9]/.test(password)) strength += 25;
    if (/[^A-Za-z0-9]/.test(password)) strength += 25;
    return strength;
  });
  passwordStrengthLevel = computed(() => {
    const strength = this.passwordStrength();
    if (strength <= 25) return 'weak';
    if (strength <= 50) return 'fair';
    if (strength <= 75) return 'good';
    return 'strong';
  });
  passwordStrengthText = computed(() => {
    const levels: Record<string, string> = {
      weak: 'Weak',
      fair: 'Fair',
      good: 'Good',
      strong: 'Strong'
    };
    return levels[this.passwordStrengthLevel()];
  });
  passwordRules = computed(() => {
    const password = this.passwordValue();
    return {
      hasMinLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecialChar: /[^A-Za-z0-9]/.test(password)
    };
  });
  passwordAllRulesPassed = computed(() => {
    const rules = this.passwordRules();
    return rules.hasMinLength && rules.hasUppercase && rules.hasNumber && rules.hasSpecialChar;
  });
  visibleSteps = computed(() => this.isAdminOnlyAccount()
    ? this.steps.filter(item => item.id === 'account')
    : this.steps);

  ngOnInit(): void {
    this.loadRoles();
    this.loadPlans();
  }

  close(): void {
    if (!this.creating()) {
      this.ref.close(false);
    }
  }

  patchForm(patch: Partial<AddUserForm>): void {
    this.form.update(form => ({ ...form, ...patch }));
    if (patch.accountType === 'admin_only') {
      this.step.set('account');
    }
    this.error.set(null);
  }

  markField(field: AddUserField): void {
    this.touched.update(fields => {
      const next = new Set(fields);
      next.add(field);
      return next;
    });
  }

  showValidation(field: AddUserField): boolean {
    return this.touched().has(field);
  }

  isFieldInvalid(field: AddUserField): boolean {
    const form = this.form();
    switch (field) {
      case 'displayName':
        return form.displayName.trim().length < 2;
      case 'email':
        return !this.isValidEmail(form.email);
      case 'roleId':
        return this.requiresAdminRole() && (!form.roleId || !this.selectedRoleHasAdminRights());
      case 'password':
        return form.password.length < 8;
      case 'confirmPassword':
        return !form.confirmPassword || form.password !== form.confirmPassword;
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

  isAccountValid(): boolean {
    return !this.isFieldInvalid('displayName') &&
      !this.isFieldInvalid('email') &&
      !this.isFieldInvalid('roleId') &&
      !this.isFieldInvalid('password') &&
      !this.isFieldInvalid('confirmPassword');
  }

  isPlanValid(): boolean {
    if (this.isAdminOnlyAccount()) return true;
    return !this.isFieldInvalid('planId');
  }

  isProfileValid(): boolean {
    if (this.isAdminOnlyAccount()) return true;
    return !this.isFieldInvalid('primaryNiche') &&
      !this.isFieldInvalid('customPrimaryNiche') &&
      !this.isFieldInvalid('targetAudience') &&
      !this.isFieldInvalid('mainFormats') &&
      !this.isFieldInvalid('toneStyle');
  }

  canOpenStep(target: AddUserStep): boolean {
    if (target === 'account') return true;
    if (this.isAdminOnlyAccount()) return false;
    if (target === 'plan') return this.isAccountValid();
    return this.isAccountValid() && this.isPlanValid();
  }

  goToStep(target: AddUserStep): void {
    if (!this.canOpenStep(target)) {
      this.markStepFields(this.step());
      return;
    }
    this.step.set(target);
    this.error.set(null);
  }

  next(): void {
    if (this.step() === 'account') {
      if (!this.isAccountValid()) {
        this.markStepFields('account');
        this.error.set(this.requiresAdminRole()
          ? 'Complete the account fields and select an admin-capable role.'
          : 'Complete the account fields first.');
        return;
      }
      if (this.isAdminOnlyAccount()) {
        this.save();
        return;
      }
      this.step.set('plan');
      this.error.set(null);
      return;
    }

    if (!this.isPlanValid()) {
      this.markStepFields('plan');
      this.error.set('Select a plan for this user.');
      return;
    }

    this.step.set('profile');
    this.error.set(null);
  }

  back(): void {
    if (this.step() === 'profile') {
      this.step.set('plan');
      return;
    }
    if (this.step() === 'plan') {
      this.step.set('account');
    }
  }

  selectPlan(planId: string): void {
    this.patchForm({ planId });
    this.markField('planId');
  }

  selectNiche(niche: string): void {
    this.patchForm({
      primaryNiche: niche,
      customPrimaryNiche: niche === 'custom' ? this.form().customPrimaryNiche : ''
    });
    this.markField('primaryNiche');
  }

  setAudienceSuggestion(audience: string): void {
    this.patchForm({ targetAudience: audience });
    this.markField('targetAudience');
  }

  toggleFormat(format: string): void {
    const form = this.form();
    this.patchForm({
      mainFormats: form.mainFormats.includes(format)
        ? form.mainFormats.filter(item => item !== format)
        : [...form.mainFormats, format]
    });
    this.markField('mainFormats');
  }

  selectTone(tone: string): void {
    this.patchForm({ toneStyle: tone });
    this.markField('toneStyle');
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  profileNicheLabel(): string {
    const form = this.form();
    return form.primaryNiche === 'custom'
      ? form.customPrimaryNiche.trim() || 'custom niche'
      : form.primaryNiche || 'niche';
  }

  selectedPlan(): AdminPlanDto | undefined {
    return this.plans().find(plan => plan.id === this.form().planId);
  }

  formatPlanPrice(plan: AdminPlanDto): string {
    if (plan.pricePkr <= 0) return 'Free';
    return `Rs. ${new Intl.NumberFormat('en-PK', { maximumFractionDigits: 0 }).format(plan.pricePkr)} / mo`;
  }

  displayRoleName(roleName: string | null | undefined): string {
    if (!roleName) return 'Unassigned';
    return PLAN_ROLE_LABELS[this.compactKey(roleName)] ?? roleName;
  }

  save(): void {
    if (!this.isAccountValid()) {
      this.markStepFields('account');
      this.step.set('account');
      this.error.set(this.requiresAdminRole()
        ? 'Complete the account fields and select an admin-capable role.'
        : 'Complete the account fields first.');
      return;
    }

    if (!this.isAdminOnlyAccount() && !this.isPlanValid()) {
      this.markStepFields('plan');
      this.step.set('plan');
      this.error.set('Select a plan for this user.');
      return;
    }

    if (!this.isAdminOnlyAccount() && !this.isProfileValid()) {
      this.markStepFields('profile');
      this.error.set('Complete all onboarding profile fields.');
      return;
    }

    const form = this.form();
    const request: AdminCreateUserRequest = {
      email: form.email.trim(),
      displayName: form.displayName.trim(),
      password: form.password,
      confirmPassword: form.confirmPassword,
      accountType: form.accountType,
      roleId: form.roleId || null,
      planId: this.isAdminOnlyAccount() ? null : form.planId,
      contentProfile: this.isAdminOnlyAccount()
        ? null
        : {
            primaryNiche: form.primaryNiche,
            customNiche: form.primaryNiche === 'custom' ? form.customPrimaryNiche.trim() : null,
            targetAudience: form.targetAudience.trim(),
            mainFormats: form.mainFormats,
            toneStyle: form.toneStyle
          }
    };

    this.creating.set(true);
    this.error.set(null);
    this.adminService.createUser(request).subscribe({
      next: () => {
        this.creating.set(false);
        this.toast.success(this.isAdminOnlyAccount()
          ? 'Admin account created.'
          : 'User created active and ready.');
        this.ref.close(true);
      },
      error: (err) => {
        this.creating.set(false);
        this.error.set(this.readApiError(err, 'Failed to create user.'));
      }
    });
  }

  private loadRoles(): void {
    this.loadingRoles.set(true);
    this.adminService.getRoles().subscribe({
      next: (roles) => {
        this.roles.set(roles);
        this.loadingRoles.set(false);
      },
      error: (err) => {
        console.error('Failed to load roles', err);
        this.loadingRoles.set(false);
        this.toast.error('Failed to load roles.');
      }
    });
  }

  private loadPlans(): void {
    this.loadingPlans.set(true);
    this.adminService.getPlans().subscribe({
      next: (plans) => {
        this.plans.set(plans);
        this.loadingPlans.set(false);
        this.patchForm({ planId: this.defaultPlanId(plans) });
      },
      error: (err) => {
        console.error('Failed to load plans', err);
        this.loadingPlans.set(false);
        this.toast.error('Failed to load plans.');
      }
    });
  }

  private createEmptyForm(): AddUserForm {
    return {
      accountType: 'user',
      displayName: '',
      email: '',
      roleId: null,
      planId: '',
      password: '',
      confirmPassword: '',
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

  private isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  }

  private markStepFields(step: AddUserStep): void {
    const fieldsByStep: Record<AddUserStep, AddUserField[]> = {
      account: ['accountType', 'displayName', 'email', 'roleId', 'password', 'confirmPassword'],
      plan: ['planId'],
      profile: ['primaryNiche', 'customPrimaryNiche', 'targetAudience', 'mainFormats', 'toneStyle']
    };

    this.touched.update(fields => {
      const next = new Set(fields);
      fieldsByStep[step].forEach(field => next.add(field));
      return next;
    });
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

  private compactKey(value: unknown): string {
    return String(value ?? '').toLowerCase().replace(/[^a-z0-9_]/g, '');
  }

  isAdminOnlyAccount(): boolean {
    return this.form().accountType === 'admin_only';
  }

  requiresAdminRole(): boolean {
    return this.form().accountType === 'admin_only' || this.form().accountType === 'both';
  }

  selectedRoleHasAdminRights(): boolean {
    const roleId = this.form().roleId;
    if (!roleId) return false;
    const role = this.roles().find(item => item.id === roleId);
    return role?.rights?.some(right => right.startsWith('Admin_')) ?? false;
  }
}
