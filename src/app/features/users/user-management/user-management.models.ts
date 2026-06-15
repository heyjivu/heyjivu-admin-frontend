import { UserManagementDto } from '../services/admin.service';

export interface UserQuotaCard {
  label: 'Creation Wallet' | 'Processing / Whisper Minutes' | 'Voice Minutes' | 'AI Video Clips' | 'Storage' | 'Brain Talk' | 'Manual Scan';
  lines: Array<{ label: string; value: string }>;
  stack: Array<{ label: string; value: string }>;
}

export interface DailyQuotaDefinition {
  key: string;
  label: string;
  overrideLabel: string;
  description: string;
  unitLabel: string;
  defaultValue: number;
  min: number;
  max: number;
}

export type AdminAccountType = 'user' | 'admin_only' | 'both';

export interface PendingRoleGridChange {
  type: 'role';
  user: UserManagementDto;
  roleId: string;
  roleName: string;
}

export interface PendingAccountTypeGridChange {
  type: 'accountType';
  user: UserManagementDto;
  accountType: AdminAccountType;
  accountTypeLabel: string;
  requiresOnboarding: boolean;
}

export type PendingGridChange = PendingRoleGridChange | PendingAccountTypeGridChange;

export interface AccountOnboardingForm {
  planId: string;
  primaryNiche: string;
  customPrimaryNiche: string;
  targetAudience: string;
  mainFormats: string[];
  toneStyle: string;
}

export type AccountOnboardingField = keyof AccountOnboardingForm;
