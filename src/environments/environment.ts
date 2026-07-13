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

  // ── API ────────────────────────────────────────────────────────
  apiUrl: `http://${localApiHost}:5100/api`,          // Admin API — admin data endpoints
  authApiUrl: `http://${localApiHost}:5100/api`,      // Admin API — admin auth endpoints

  // ── Storage — R2 direct playback (staging bucket, shared with local) ──
  // When a file is in R2, the frontend can play it directly using presigned URLs.
  // Leave r2PublicDomain blank — presigned URLs from API are used instead
  r2PublicDomain: '',
  useDirectVideoUrls: true,
  presignedUrlExpiryMinutes: 60,

  // ── Auth ───────────────────────────────────────────────────────
  // Must match GoogleOAuth.ClientId in appsettings.Development.json
  googleClientId: '579233474156-9dpbpojf1k3nop0884sniru752e6s4q6.apps.googleusercontent.com',

  // ── Encryption ─────────────────────────────────────────────────

  // ── Feature Flags ─────────────────────────────────────────────
  enableMockData: false,
  enableDevtools: true,
  showEnvironmentBadge: true,   // shows "LOCAL" badge in the UI corner
};
