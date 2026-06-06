// ════════════════════════════════════════════════════════════════
//  LOCAL DEVELOPMENT ENVIRONMENT
//  Run: ng serve  (uses this file by default)
//  API: http://localhost:5000
// ════════════════════════════════════════════════════════════════
const localApiHost =
  typeof window !== 'undefined' && window.location?.hostname
    ? window.location.hostname
    : 'localhost';

export const environment = {
  production: false,
  envName: 'local',

  // ── API & SignalR ──────────────────────────────────────────────
  apiUrl: `http://${localApiHost}:5100/api`,          // Admin API — admin data endpoints
  authApiUrl: `http://${localApiHost}:5000/api`,      // Main API — auth endpoints (login, me, etc.)
  hubUrl: `http://${localApiHost}:5100/hubs/dashboard`,

  // ── Storage — R2 direct playback (staging bucket, shared with local) ──
  // When a file is in R2 (server storage users), the frontend can play
  // directly from R2 using presigned URLs returned by GET /api/drive/direct-url
  // Leave r2PublicDomain blank — presigned URLs from API are used instead
  r2PublicDomain: '',
  useDirectVideoUrls: true,
  presignedUrlExpiryMinutes: 60,

  // ── Auth ───────────────────────────────────────────────────────
  // Must match GoogleOAuth.ClientId in appsettings.Development.json
  googleClientId: '579233474156-9dpbpojf1k3nop0884sniru752e6s4q6.apps.googleusercontent.com',

  // ── Encryption ─────────────────────────────────────────────────
  // Must match EncryptionKey in appsettings.Development.json (exactly 32 chars)
  masterEncryptionKey: '',

  // ── Feature Flags ─────────────────────────────────────────────
  enableMockData: false,
  enableDevtools: true,
  showEnvironmentBadge: true,   // shows "LOCAL" badge in the UI corner
};
