// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  STAGING ENVIRONMENT
//  Build:  ng build --configuration=staging
//  Deploy: Cloudflare Pages (staging-admin.heyjivu.com)
//
//  TODO: Fill in values marked â† FILL THIS before deploying
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
export const environment = {
  production: false,
  envName: 'staging',

  // â”€â”€ API & SignalR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // â† FILL THIS: your staging Azure Function / App Service URL
  apiUrl: 'https://staging-admin-api.heyjivu.com/api',
  authApiUrl: 'https://staging-api.heyjivu.com/api',
  hubUrl: 'https://staging-admin-api.heyjivu.com/hubs/dashboard',

  // â”€â”€ Storage â€” R2 direct playback â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // â† FILL THIS (optional): your staging R2 public domain
  // If empty, presigned URLs from API are used (more secure)
  r2PublicDomain: '',
  useDirectVideoUrls: true,
  presignedUrlExpiryMinutes: 60,

  // â”€â”€ Auth â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Add staging.hyejivu.com to Google OAuth authorized redirect URIs
  googleClientId: '579233474156-9dpbpojf1k3nop0884sniru752e6s4q6.apps.googleusercontent.com',

  // â”€â”€ Encryption â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // â† FILL THIS: must match EncryptionKey in appsettings.Staging.json (exactly 32 chars)
  masterEncryptionKey: '',

  // â”€â”€ Feature Flags â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  enableMockData: false,
  enableDevtools: true,
  showEnvironmentBadge: true,   // shows "STAGING" badge in the UI corner
};

