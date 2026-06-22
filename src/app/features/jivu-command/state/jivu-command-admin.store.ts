import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { finalize, forkJoin } from 'rxjs';
import { AuthStore } from '../../../core/auth/state/auth.store';
import { Rights } from '../../../core/constants/rights.constants';
import { AdminJivuCommandDto, AdminJivuCommandStatsDto } from '../models/jivu-command-admin.model';
import { AdminJivuCommandService } from '../services/admin-jivu-command.service';

const POLL_INTERVAL_MS = 60_000;
const ACTIVE_COMMAND_STATUS_FILTER = 'queued,claimed,running';

const emptyStats = (): AdminJivuCommandStatsDto => ({
  totalCommands: 0,
  activeCommands: 0,
  queuedCommands: 0,
  runningCommands: 0,
  pausedCommands: 0,
  expiredCommands: 0,
  activeTempFiles: 0,
  activeTempBytes: 0,
  byType: {},
  byStatus: {}
});

@Injectable({ providedIn: 'root' })
export class JivuCommandAdminStore {
  private readonly api = inject(AdminJivuCommandService);
  private readonly authStore = inject(AuthStore);
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private refreshInFlight = false;
  private generation = 0;

  private readonly _stats = signal<AdminJivuCommandStatsDto>(emptyStats());
  private readonly _activeCommands = signal<AdminJivuCommandDto[]>([]);
  private readonly _loading = signal(false);
  private readonly _refreshing = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly stats = computed(() => this._stats());
  readonly activeCommands = computed(() => this._activeCommands());
  readonly loading = computed(() => this._loading());
  readonly refreshing = computed(() => this._refreshing());
  readonly error = computed(() => this._error());
  readonly activeCount = computed(() => this._stats().activeCommands ?? 0);
  readonly hasActiveCommands = computed(() => this.activeCount() > 0);

  constructor() {
    effect(() => {
      const canPoll = this.authStore.isAuthenticated()
        && (this.authStore.isSuperAdmin() || this.authStore.hasRight()(Rights.Pipeline_View));

      queueMicrotask(() => {
        if (canPoll) {
          this.start();
        } else {
          this.stop(true);
        }
      });
    });
  }

  start(): void {
    if (this.pollTimer) {
      return;
    }

    this.refresh(true);
    this.pollTimer = setInterval(() => this.refresh(true), POLL_INTERVAL_MS);
  }

  stop(clearState = false): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }

    this.generation++;
    this.refreshInFlight = false;
    this._loading.set(false);
    this._refreshing.set(false);

    if (clearState) {
      this._stats.set(emptyStats());
      this._activeCommands.set([]);
      this._error.set(null);
    }
  }

  refresh(silent = true): void {
    if (this.refreshInFlight) {
      return;
    }

    const requestGeneration = this.generation;
    this.refreshInFlight = true;
    this._error.set(null);
    if (silent) {
      this._refreshing.set(true);
    } else {
      this._loading.set(true);
    }

    forkJoin({
      stats: this.api.getStats(),
      active: this.api.listCommands({
        status: ACTIVE_COMMAND_STATUS_FILTER,
        page: 1,
        pageSize: 6
      })
    })
      .pipe(finalize(() => {
        if (requestGeneration === this.generation) {
          this.refreshInFlight = false;
          this._loading.set(false);
          this._refreshing.set(false);
        }
      }))
      .subscribe({
        next: ({ stats, active }) => {
          if (requestGeneration !== this.generation) {
            return;
          }

          this._stats.set(stats ?? emptyStats());
          this._activeCommands.set(active.commands ?? []);
        },
        error: err => {
          if (requestGeneration !== this.generation) {
            return;
          }

          this._error.set(this.readError(err));
        }
      });
  }

  private readError(err: unknown): string {
    const error = err as { error?: { message?: string }; message?: string };
    return error?.error?.message || error?.message || 'Could not load Jivu Command status.';
  }
}
