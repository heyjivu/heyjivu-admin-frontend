import { Rights } from '../../../core/constants/rights.constants';
import type { AdminAccountType } from './user-management.models';

export const PLAN_ROLE_LABELS: Record<string, string> = {
  freeshell: 'Free Shell',
  free_shell: 'Free Shell',
  freejivutalk: 'Free Shell',
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

export const FULL_APP_RIGHTS = [
  Rights.Dashboard_View,
  Rights.Dashboard_Manage,
  Rights.VideoGen_View,
  Rights.VideoGen_Manage,
  Rights.Pipeline_View,
  Rights.Pipeline_Manage,
  Rights.PostGen_View,
  Rights.PostGen_Manage,
  Rights.Review_View,
  Rights.Review_Manage,
  Rights.Social_View,
  Rights.Social_Manage,
  Rights.Ecommerce_View,
  Rights.Ecommerce_Manage,
  Rights.Drive_View,
  Rights.Drive_Manage,
  Rights.Memory_View,
  Rights.Memory_Manage,
  Rights.Settings_View,
  Rights.Settings_Manage
];

export const ACCOUNT_TYPE_LABELS: Record<AdminAccountType, string> = {
  user: 'User Only',
  both: 'Admin + User',
  admin_only: 'Admin Only'
};
