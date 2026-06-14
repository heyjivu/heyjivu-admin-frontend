export type AppPlatform = 'web' | 'windows' | 'android';
export type AppUpdateMode = 'reload' | 'download';

export interface AppBuildInfo {
  version: string;
  buildNumber: string;
  commitSha: string;
  channel: string;
}

export interface AppReleasePlatformManifest {
  version: string;
  downloadUrl?: string;
  updateMode?: string;
  sha256?: string;
}

export interface AppReleaseManifest {
  channel: string;
  version: string;
  buildNumber: string;
  commitSha: string;
  releasedAtUtc?: string;
  minSupportedVersion: string;
  isAvailable: boolean;
  platforms: Partial<Record<AppPlatform, AppReleasePlatformManifest>>;
}

export interface AppUpdateState {
  platform: AppPlatform;
  currentVersion: string;
  latestVersion: string;
  buildNumber: string;
  channel: string;
  hasUpdate: boolean;
  updateMode: AppUpdateMode;
  downloadUrl?: string;
}

export function resolveAppUpdateState(
  current: AppBuildInfo,
  manifest: AppReleaseManifest | null,
  platform: AppPlatform,
  apiBaseUrl: string): AppUpdateState {
  const platformManifest = manifest?.platforms?.[platform];
  const latestVersion = normalizeVersion(platformManifest?.version || manifest?.version || current.version);
  const updateMode: AppUpdateMode = platform === 'web'
    ? 'reload'
    : 'download';
  const downloadUrl = updateMode === 'download'
    ? resolveDownloadUrl(platformManifest?.downloadUrl, apiBaseUrl)
    : undefined;

  return {
    platform,
    currentVersion: normalizeVersion(current.version),
    latestVersion,
    buildNumber: current.buildNumber,
    channel: manifest?.channel || current.channel,
    hasUpdate: compareAppVersions(latestVersion, current.version) > 0,
    updateMode,
    downloadUrl
  };
}

export function compareAppVersions(left: string, right: string): number {
  const a = parseAppVersion(left);
  const b = parseAppVersion(right);

  for (let index = 0; index < Math.max(a.parts.length, b.parts.length); index++) {
    const diff = (a.parts[index] ?? 0) - (b.parts[index] ?? 0);
    if (diff !== 0) {
      return diff;
    }
  }

  if (a.prerelease && !b.prerelease) return -1;
  if (!a.prerelease && b.prerelease) return 1;
  if (!a.prerelease && !b.prerelease) return 0;
  return a.prerelease.localeCompare(b.prerelease);
}

function resolveDownloadUrl(downloadUrl: string | undefined, apiBaseUrl: string): string | undefined {
  if (!downloadUrl) {
    return undefined;
  }

  if (/^https?:\/\//i.test(downloadUrl)) {
    return downloadUrl;
  }

  const apiOrigin = trimApiSuffix(apiBaseUrl);
  return `${apiOrigin}/${downloadUrl.replace(/^\/+/, '')}`;
}

function trimApiSuffix(apiBaseUrl: string): string {
  return trimTrailingSlash(apiBaseUrl).replace(/\/api$/i, '');
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function normalizeVersion(value: string): string {
  return value.trim().replace(/^v/i, '') || '0.0.0';
}

function parseAppVersion(value: string): { parts: number[]; prerelease: string } {
  const [core, prerelease = ''] = normalizeVersion(value).split('-', 2);
  const parts = core.split('.').map((part) => {
    const parsed = Number.parseInt(part, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  });

  return { parts, prerelease };
}
