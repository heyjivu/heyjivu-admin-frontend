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
  useServerStorage: boolean;
}

export interface AuthUser {
  userId: string;
  username: string;
  displayName: string;
  isSuperAdmin: boolean;
  rights: string[];
  onboardingStep: number;
  byokRequested: boolean;
  useServerStorage: boolean;
}
