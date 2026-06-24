import { Injectable, OnDestroy, computed, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { AdminService, UserManagementDto } from '../../users/services/admin.service';

const CLOUD_USER_PAGE_SIZE = 20;

@Injectable({ providedIn: 'root' })
export class AdminCloudUserStore implements OnDestroy {
  private readonly adminService = inject(AdminService);
  private searchTimer: ReturnType<typeof setTimeout> | null = null;
  private userRequestId = 0;

  readonly users = signal<UserManagementDto[]>([]);
  readonly selectedUser = signal<UserManagementDto | null>(null);
  readonly userSearch = signal('');
  readonly loadingUsers = signal(false);
  readonly loadingMoreUsers = signal(false);
  readonly userPageNumber = signal(1);
  readonly totalUsers = signal(0);
  readonly userPageSize = CLOUD_USER_PAGE_SIZE;
  readonly hasMoreUsers = computed(() => this.users().length < this.totalUsers());

  ngOnDestroy(): void {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
  }

  ensureLoaded(): void {
    if (this.users().length > 0 || this.loadingUsers() || this.loadingMoreUsers()) return;
    this.loadUsers();
  }

  onUserSearchChange(value: string): void {
    this.userSearch.set(value);
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
    this.searchTimer = setTimeout(() => this.loadUsers(value), 250);
  }

  loadMoreUsers(): void {
    this.loadUsers(this.userSearch(), true);
  }

  onUsersScroll(event: Event): void {
    const target = event.target as HTMLElement | null;
    if (!target || this.loadingUsers() || this.loadingMoreUsers() || !this.hasMoreUsers()) return;

    const remaining = target.scrollHeight - target.scrollTop - target.clientHeight;
    if (remaining <= 80) {
      this.loadMoreUsers();
    }
  }

  selectUser(user: UserManagementDto): void {
    this.selectedUser.set(user);
  }

  loadUsers(searchTerm = this.userSearch(), append = false): void {
    if (append && (this.loadingUsers() || this.loadingMoreUsers() || !this.hasMoreUsers())) return;

    const pageNumber = append ? this.userPageNumber() + 1 : 1;
    const requestId = ++this.userRequestId;
    if (append) {
      this.loadingMoreUsers.set(true);
    } else {
      this.userPageNumber.set(1);
      this.totalUsers.set(0);
      this.loadingUsers.set(true);
      this.loadingMoreUsers.set(false);
    }

    this.adminService.getUsers({
      pageNumber,
      pageSize: CLOUD_USER_PAGE_SIZE,
      searchTerm: searchTerm.trim() || undefined,
      sortBy: 'email',
      includeQuotaSummary: false
    }).pipe(
      finalize(() => {
        if (requestId === this.userRequestId) {
          if (append) {
            this.loadingMoreUsers.set(false);
          } else {
            this.loadingUsers.set(false);
          }
        }
      })
    ).subscribe({
      next: result => {
        if (requestId !== this.userRequestId) return;
        const items = result.items || [];
        this.totalUsers.set(result.totalCount || items.length);
        this.userPageNumber.set(result.pageNumber || pageNumber);

        if (append) {
          this.users.update(existing => this.mergeUsers(existing, items));
        } else {
          this.users.set(items);
        }

        if (!this.selectedUser() && this.users().length) {
          this.selectUser(this.users()[0]);
        }
      },
      error: () => {
        if (requestId !== this.userRequestId || append) return;
        this.users.set([]);
        this.totalUsers.set(0);
      }
    });
  }

  private mergeUsers(existing: UserManagementDto[], incoming: UserManagementDto[]): UserManagementDto[] {
    const seen = new Set(existing.map(user => user.id));
    const merged = [...existing];
    for (const user of incoming) {
      if (seen.has(user.id)) continue;
      seen.add(user.id);
      merged.push(user);
    }
    return merged;
  }
}
