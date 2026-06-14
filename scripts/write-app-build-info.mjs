import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const packageJson = JSON.parse(readFileSync(resolve('package.json'), 'utf8'));
const refName = process.env.GITHUB_REF_NAME ?? '';
const tagVersion = refName.startsWith('v') ? refName.slice(1) : '';
const version = cleanVersion(process.env.HEYJIVU_APP_VERSION || tagVersion || packageJson.version || '0.0.0');
const buildNumber = process.env.HEYJIVU_BUILD_NUMBER || process.env.GITHUB_RUN_NUMBER || 'local';
const commitSha = (process.env.HEYJIVU_COMMIT_SHA || process.env.GITHUB_SHA || 'local').slice(0, 12);
const hasReleaseInput = Boolean(process.env.HEYJIVU_APP_VERSION || tagVersion || process.env.GITHUB_RUN_NUMBER);
const channel = process.env.HEYJIVU_RELEASE_CHANNEL || (hasReleaseInput ? (version.includes('-') ? 'staging' : 'production') : 'development');
const outputPath = resolve('src/app/core/version/app-build-info.ts');

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `export const APP_BUILD_INFO = {
  version: ${JSON.stringify(version)},
  buildNumber: ${JSON.stringify(buildNumber)},
  commitSha: ${JSON.stringify(commitSha)},
  channel: ${JSON.stringify(channel)}
} as const;
`);

function cleanVersion(value) {
  return String(value).trim().replace(/^v/i, '') || '0.0.0';
}
