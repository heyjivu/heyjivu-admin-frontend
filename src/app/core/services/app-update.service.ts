import { computed, Injectable, OnDestroy, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { APP_BUILD_INFO } from '../version/app-build-info';
import { AppPlatform, AppReleaseManifest, resolveAppUpdateState } from './app-update.helpers';

@Injectable({ providedIn: 'root' })
export class AppUpdateService implements OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly manifest = signal<AppReleaseManifest | null>(null);
  private readonly platform = signal<AppPlatform>(detectAppPlatform());
  private readonly pollIntervalMs = 20 * 60 * 1000;
  private pollTimer: number | undefined;

  readonly state = computed(() =>
    resolveAppUpdateState(APP_BUILD_INFO, this.manifest(), this.platform(), environment.apiUrl));
  readonly currentVersion = computed(() => this.state().currentVersion);
  readonly latestVersion = computed(() => this.state().latestVersion);
  readonly hasUpdate = computed(() => this.state().hasUpdate);
  readonly updateMode = computed(() => this.state().updateMode);
  readonly showVersion = computed(() => APP_BUILD_INFO.channel === 'production');

  constructor() {
    this.refresh();

    if (typeof window !== 'undefined') {
      this.pollTimer = window.setInterval(() => this.refresh(), this.pollIntervalMs);
    }
  }

  ngOnDestroy(): void {
    if (this.pollTimer !== undefined && typeof window !== 'undefined') {
      window.clearInterval(this.pollTimer);
      this.pollTimer = undefined;
    }
  }

  refresh(): void {
    const releaseApiUrl = (environment as { apiUrl: string; authApiUrl?: string }).authApiUrl || environment.apiUrl;
    const manifestUrl = `${trimTrailingSlash(releaseApiUrl)}/downloads/manifest`;
    this.http.get<AppReleaseManifest>(manifestUrl).pipe(
      catchError(() => of(null))
    ).subscribe((manifest) => {
      this.manifest.set(manifest);
    });
  }

  applyUpdate(): void {
    const state = this.state();
    if (!state.hasUpdate || typeof window === 'undefined') {
      return;
    }

    if (state.updateMode === 'download' && state.downloadUrl) {
      window.location.href = state.downloadUrl;
      return;
    }

    window.location.reload();
  }
}

function detectAppPlatform(): AppPlatform {
  return 'web';
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}
