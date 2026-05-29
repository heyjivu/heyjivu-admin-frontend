// ════════════════════════════════════════════════════════════════
//  LOCAL PRODUCTION-MODE ENVIRONMENT
//  Build:  ng build --configuration=local-prod
//  API:    http://localhost:5100 / http://localhost:5000
// ════════════════════════════════════════════════════════════════
export const environment = {
  production: true,
  envName: 'local-prod',

  // ── API & SignalR ──────────────────────────────────────────────
  apiUrl: 'http://localhost:5100/api',          // Admin API — admin data endpoints
  authApiUrl: 'http://localhost:5000/api',      // Main API — auth endpoints (login, me, etc.)
  hubUrl: 'http://localhost:5100/hubs/dashboard',

  // ── Storage — R2 direct playback ──────────────────────────────
  r2PublicDomain: '',
  useDirectVideoUrls: true,
  presignedUrlExpiryMinutes: 60,

  // ── Auth ───────────────────────────────────────────────────────
  googleClientId: '579233474156-9dpbpojf1k3nop0884sniru752e6s4q6.apps.googleusercontent.com',

  // ── Encryption ─────────────────────────────────────────────────
  masterEncryptionKey: 'dev_super_secret_encryption_key_32',

  // ── Feature Flags ─────────────────────────────────────────────
  enableMockData: false,
  enableDevtools: false,
  showEnvironmentBadge: true,   // shows "LOCAL PROD" badge
};
