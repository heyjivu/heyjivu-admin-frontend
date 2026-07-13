// ════════════════════════════════════════════════════════════════
//  PRODUCTION ENVIRONMENT
//  Build:  ng build --configuration=production
//  Deploy: Cloudflare Pages (heyjivu.com / www.heyjivu.com)
//
//  ⚠ NEVER use staging credentials here.
//  TODO: Fill in values marked ← FILL THIS before deploying
// ════════════════════════════════════════════════════════════════
export const environment = {
  production: true,
  envName: 'production',

  // ── API ────────────────────────────────────────────────────────
  // ← FILL THIS: your production Azure Function / App Service URL
  apiUrl: 'https://admin-api.heyjivu.com/api',
  authApiUrl: 'https://api.heyjivu.com/api',

  // ── Storage — R2 direct playback ──────────────────────────────
  // ← FILL THIS (optional): your production R2 public domain
  // If empty, presigned URLs from API are used (more secure)
  r2PublicDomain: '',
  useDirectVideoUrls: true,
  presignedUrlExpiryMinutes: 60,

  // ── Auth ───────────────────────────────────────────────────────
  // Add heyjivu.com to Google OAuth authorized redirect URIs
  googleClientId: '579233474156-9dpbpojf1k3nop0884sniru752e6s4q6.apps.googleusercontent.com',

  // ── Encryption ─────────────────────────────────────────────────
  // ← FILL THIS: must match EncryptionKey in appsettings.Production.json (exactly 32 chars)

  // ── Feature Flags ─────────────────────────────────────────────
  enableMockData: false,
  enableDevtools: false,
  showEnvironmentBadge: false,  // no badge in production
};
