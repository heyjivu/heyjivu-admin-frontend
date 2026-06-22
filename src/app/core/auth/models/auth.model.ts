export interface GoogleLoginRequest {
  idToken: string;
}

export interface LoginRequest {
  username: string; // can be email or username
  password: string;
}

export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  challengeId?: string;
  turnstileToken?: string;
}

export interface RegisterResponse {
  success?: boolean;
  userId?: string;
  email: string;
  message: string;
  challengeId?: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  email: string;
  otp: string;
  newPassword: string;
}

export interface AuthMessageResponse {
  message: string;
  email?: string;
}

export interface AuthResponse {
  token: string;
  userId: string;
  username: string;
  displayName: string;
  isSuperAdmin: boolean;
  rights: string[];
  onboardingStep: number;
  byokRequested: boolean;
  accountType?: string;
  portal?: string;
}

export interface AuthUser {
  userId: string;
  username: string;
  displayName: string;
  isSuperAdmin: boolean;
  rights: string[];
  onboardingStep: number;
  byokRequested: boolean;
  accountType?: string;
  portal?: string;
}
