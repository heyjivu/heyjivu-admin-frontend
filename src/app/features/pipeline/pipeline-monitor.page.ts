import { Component, inject, OnInit, OnDestroy, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { PipelineStore } from './state/pipeline.store';
import { AdminPipelineJob } from './models/pipeline.model';
import { AdminPipelineService } from './services/admin-pipeline.service';
import { DialogService } from '../../core/dialogs/dialog.service';
import { TriggerJobDialogComponent } from './dialogs/trigger-job-dialog/trigger-job-dialog.component';

@Component({
  selector: 'app-pipeline-monitor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pipeline-monitor.page.html',
  styleUrl: './pipeline-monitor.page.scss'
})
export class PipelineMonitorPage implements OnInit, OnDestroy {
  private readonly store = inject(PipelineStore);
  private readonly api = inject(AdminPipelineService);
  private readonly route = inject(ActivatedRoute);
  private readonly dialog = inject(DialogService);

  readonly jobs = this.store.jobs;
  Math = Math;
  readonly isLoading = this.store.isLoading;
  readonly totalCount = this.store.totalCount;
  readonly page = this.store.page;
  readonly pageSize = this.store.pageSize;
  readonly totalPages = this.store.totalPages;
  readonly stats = this.store.stats;

  activeTab = signal<'queued' | 'processing' | 'failed' | 'done'>('processing');
  selectedType = signal<string | undefined>(undefined);
  searchQuery = signal('');
  selectedUserId = signal<string>('');
  users = signal<{ id: string; username: string; email: string }[]>([]);
  showUserDropdown = signal(false);
  selectedUserName = signal('All Users');
  jobIdWithError = signal('');
  expandedJobId = signal('');

  private searchSubject = new Subject<string>();
  private searchSubscription!: Subscription;

  readonly typeOptions = [
    { value: '', label: 'All Pipelines', icon: 'fas fa-tasks' },
    { value: 'Trend', label: 'Trend', icon: 'fas fa-chart-line' },
    { value: 'Processing', label: 'Processing', icon: 'fas fa-video' },
    { value: 'SmartVideo', label: 'Smart Video', icon: 'fas fa-film' },
    { value: 'SocialPost', label: 'Post Generation', icon: 'fas fa-bullhorn' },
  ];

  filteredJobs = computed(() => {
    const all = this.jobs();
    const tab = this.activeTab();
    const type = this.selectedType();
    return all.filter(j => {
      if (type && j.type !== type) return false;
      const s = j.status.toLowerCase();
      switch (tab) {
        case 'queued': return s === 'queued' || s === 'draft' || s === 'pending' || s === 'scheduled';
        case 'processing': return s === 'processing' || s === 'generating';
        case 'failed': return s === 'failed' || s === 'rejected';
        case 'done': return s === 'completed' || s === 'published' || s === 'cancelled';
        default: return true;
      }
    });
  });

  getTypeIcon(type: string): string {
    switch (type) {
      case 'Processing': return 'fas fa-video';
      case 'Trend': return 'fas fa-chart-line';
      case 'SmartVideo': return 'fas fa-film';
      case 'SocialPost': return 'fas fa-bullhorn';
      default: return 'fas fa-tasks';
    }
  }

  getTypeColor(type: string): string {
    switch (type) {
      case 'Processing': return 'indigo';
      case 'Trend': return 'emerald';
      case 'SmartVideo': return 'purple';
      case 'SocialPost': return 'amber';
      default: return 'gray';
    }
  }

  getStatusColor(status: string): string {
    const s = status.toLowerCase();
    if (s === 'processing' || s === 'generating') return 'processing';
    if (s === 'queued' || s === 'draft' || s === 'pending' || s === 'scheduled') return 'queued';
    if (s === 'failed' || s === 'rejected') return 'failed';
    if (s === 'completed' || s === 'published') return 'done';
    return 'muted';
  }

  getStatusBadge(status: string): string {
    const s = status.toLowerCase();
    if (s === 'processing' || s === 'generating') return 'PROCESSING';
    if (s === 'queued') return 'QUEUED';
    if (s === 'draft' || s === 'pending') return 'PENDING';
    if (s === 'scheduled') return 'SCHEDULED';
    if (s === 'failed') return 'FAILED';
    if (s === 'rejected') return 'REJECTED';
    if (s === 'completed') return 'DONE';
    if (s === 'published') return 'PUBLISHED';
    if (s === 'cancelled') return 'CANCELLED';
    return status.toUpperCase();
  }

  switchTab(tab: 'queued' | 'processing' | 'failed' | 'done') {
    this.activeTab.set(tab);
  }

  onSearch() {
    this.store.setSearchFilter(this.searchQuery() || undefined);
  }

  onUserSelect(userId: string) {
    this.selectedUserId.set(userId);
    this.showUserDropdown.set(false);
    if (userId) {
      const user = this.users().find(u => u.id === userId);
      this.selectedUserName.set(user ? user.username : 'All Users');
    } else {
      this.selectedUserName.set('All Users');
    }
    this.store.setUserFilter(userId || undefined);
  }

  toggleJobDetails(job: AdminPipelineJob) {
    this.expandedJobId.set(this.expandedJobId() === job.id ? '' : job.id);
    this.jobIdWithError.set('');
  }

  isJobExpanded(jobId: string): boolean {
    return this.expandedJobId() === jobId;
  }

  goToPage(p: number) {
    if (p >= 1 && p <= this.totalPages()) {
      this.store.setPage(p);
    }
  }

  refresh() {
    this.store.loadJobs();
    this.store.loadStats();
  }

  openRunDialog() {
    this.dialog.open(TriggerJobDialogComponent, {
      header: 'Trigger Run',
      width: '450px',
      data: { activeTab: 'DashboardTrend' }
    });
  }

  get pages(): number[] {
    const total = this.totalPages();
    const current = this.page();
    const maxVisible = 5;
    const pages: number[] = [];
    let start = Math.max(1, current - Math.floor(maxVisible / 2));
    let end = Math.min(total, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  ngOnInit() {
    this.searchSubscription = this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(term => {
      this.store.setSearchFilter(term || undefined);
    });

    this.route.queryParams.subscribe(params => {
      const type = params['type'] || undefined;
      this.selectedType.set(type);
      this.store.setTypeFilter(type);
      const status = params['status'];
      if (status) this.activeTab.set(status);
    });
    this.api.getUsers().subscribe({
      next: (u) => this.users.set(u)
    });
  }

  onSearchInput(value: string) {
    this.searchQuery.set(value);
    this.searchSubject.next(value);
  }

  ngOnDestroy() {
    if (this.searchSubscription) {
      this.searchSubscription.unsubscribe();
    }
  }
}



