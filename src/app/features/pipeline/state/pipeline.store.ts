import { Injectable, signal, computed, inject, OnDestroy, effect, untracked } from '@angular/core';
import { AdminPipelineJob, PipelineStats } from '../models/pipeline.model';
import { AdminPipelineService } from '../services/admin-pipeline.service';
import { SignalRService } from '../../../core/services/signalr.service';

@Injectable({ providedIn: 'root' })
export class PipelineStore implements OnDestroy {
  private readonly api = inject(AdminPipelineService);
  private readonly signalR = inject(SignalRService);

  private readonly _jobs = signal<AdminPipelineJob[]>([]);
  private readonly _isLoading = signal(false);
  private readonly _totalCount = signal(0);
  private readonly _page = signal(1);
  private readonly _pageSize = signal(20);
  private readonly _userFilter = signal<string | undefined>(undefined);
  private readonly _statusFilter = signal<string | undefined>(undefined);
  private readonly _typeFilter = signal<string | undefined>(undefined);
  private readonly _searchFilter = signal<string | undefined>(undefined);

  readonly jobs = computed(() => this._jobs());
  readonly isLoading = computed(() => this._isLoading());
  readonly totalCount = computed(() => this._totalCount());
  readonly page = computed(() => this._page());
  readonly pageSize = computed(() => this._pageSize());
  readonly totalPages = computed(() => Math.ceil(this._totalCount() / this._pageSize()));
  readonly userFilter = computed(() => this._userFilter());
  readonly statusFilter = computed(() => this._statusFilter());

  readonly activeJobs = computed(() =>
    this._jobs().filter(j => j.status === 'Processing' || j.status === 'Queued')
  );
  readonly hasActiveJobs = computed(() => this.activeJobs().length > 0);

  readonly stats = signal<PipelineStats>({
    totalJobs: 0,
    byStatus: {}
  });

  readonly globalStats = signal<PipelineStats>({
    totalJobs: 0,
    byStatus: {},
    byType: {}
  });

  readonly pipelineCounts = computed(() => this.globalStats().byType ?? {});

  private readonly onReceiveJobUpdate = (updatedJob: any) => {
    const jobId = updatedJob.id || updatedJob.Id;
    this._jobs.update((jobs) => {
      const index = jobs.findIndex((j) => j.id === jobId);
      if (index === -1) return jobs;
      const newJobs = [...jobs];
      newJobs[index] = { ...newJobs[index], ...updatedJob, id: jobId };
      return newJobs;
    });
  };

  constructor() {
    this.signalR.on('ReceiveJobUpdate', this.onReceiveJobUpdate);
    this.loadJobs();
    this.loadStats();
    this.api.getStats().subscribe({
      next: (s) => this.globalStats.set(s),
      error: () => {}
    });
  }

  ngOnDestroy() {
    this.signalR.off('ReceiveJobUpdate', this.onReceiveJobUpdate);
  }

  setUserFilter(userId: string | undefined) {
    this._userFilter.set(userId);
    this._page.set(1);
    this.loadJobs();
  }

  setStatusFilter(status: string | undefined) {
    this._statusFilter.set(status);
    this._page.set(1);
    this.loadJobs();
  }

  setTypeFilter(type: string | undefined) {
    this._typeFilter.set(type);
    this._page.set(1);
    this.loadJobs();
    this.loadStats();
  }

  setSearchFilter(search: string | undefined) {
    this._searchFilter.set(search);
    this._page.set(1);
    this.loadJobs();
  }

  setPage(page: number) {
    this._page.set(page);
    this.loadJobs();
  }

  loadJobs() {
    this._isLoading.set(true);
    this.api.getJobs({
      userId: this._userFilter(),
      status: this._statusFilter(),
      type: this._typeFilter(),
      search: this._searchFilter(),
      page: this._page(),
      pageSize: this._pageSize()
    }).subscribe({
      next: (res) => {
        this._jobs.set(res.jobs);
        this._totalCount.set(res.totalCount);
        this._isLoading.set(false);
      },
      error: () => this._isLoading.set(false)
    });
  }

  loadStats() {
    this.api.getStats(this._typeFilter()).subscribe({
      next: (s) => this.stats.set(s),
      error: () => {}
    });
  }
}






