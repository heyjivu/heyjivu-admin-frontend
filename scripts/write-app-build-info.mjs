import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const packageJson = JSON.parse(readFileSync(resolve('package.json'), 'utf8'));
const refName = process.env.GITHUB_REF_NAME ?? '';
const tagVersion = refName.startsWith('v') ? refName.slice(1) : '';
const versionFile = readVersionFile();
const version = cleanVersion(process.env.HEYJIVU_APP_VERSION || tagVersion || versionFile || packageJson.version || '0.0.0');
const buildNumber = process.env.HEYJIVU_BUILD_NUMBER || process.env.GITHUB_RUN_NUMBER || 'local';
const commitSha = (process.env.HEYJIVU_COMMIT_SHA || process.env.GITHUB_SHA || 'local').slice(0, 12);
const channel = process.env.HEYJIVU_RELEASE_CHANNEL || resolveChannel(refName);
const outputPath = resolve('src/app/core/version/app-build-info.ts');

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `export const APP_BUILD_INFO = {
  version: ${JSON.stringify(version)},
  buildNumber: ${JSON.stringify(buildNumber)},
  commitSha: ${JSON.stringify(commitSha)},
  channel: ${JSON.stringify(channel)} as string
} as const;
`);

function cleanVersion(value) {
  return String(value).trim().replace(/^v/i, '') || '0.0.0';
}

function readVersionFile() {
  const versionPath = resolve('VERSION');
  return existsSync(versionPath) ? readFileSync(versionPath, 'utf8').trim() : '';
}

function resolveChannel(refName) {
  if (refName.startsWith('v')) {
    return 'production';
  }

  if (refName === 'main') {
    return 'production';
  }

  if (refName === 'staging') {
    return 'staging';
  }

  return 'development';
}
