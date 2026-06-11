import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { AdminService, UserManagementDto } from '../users/services/admin.service';
import {
  AdminCloudApiService,
  AdminCloudFileEntry,
  AdminCloudStorageInfo
} from './services/admin-cloud-api.service';

type FolderShortcut = {
  label: string;
  folder: string;
  icon: string;
};

type FolderSection = {
  title: string;
  items: FolderShortcut[];
};

@Component({
  selector: 'app-admin-cloud',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-cloud.page.html',
  styleUrl: './admin-cloud.page.scss'
})
export class AdminCloudPage implements OnInit, OnDestroy {
  private readonly api = inject(AdminCloudApiService);
  private readonly adminService = inject(AdminService);
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  readonly users = signal<UserManagementDto[]>([]);
  readonly selectedUser = signal<UserManagementDto | null>(null);
  readonly userSearch = signal('');
  readonly loadingUsers = signal(false);

  readonly files = signal<AdminCloudFileEntry[]>([]);
  readonly loadingFiles = signal(false);
  readonly storageInfo = signal<AdminCloudStorageInfo | null>(null);
  readonly currentFolder = signal('root');
  readonly history = signal<{ name: string; id: string }[]>([{ name: 'Root', id: 'root' }]);

  readonly searchQuery = signal('');
  readonly viewMode = signal<'list' | 'grid'>('list');
  readonly previewFile = signal<AdminCloudFileEntry | null>(null);
  readonly previewUrl = signal('');
  readonly previewLoading = signal(false);

  readonly folderSections: FolderSection[] = [
    {
      title: 'Workspace',
      items: [
        { label: 'Root', folder: 'root', icon: 'fas fa-sitemap' },
        { label: 'Raw Files', folder: 'raw', icon: 'fas fa-folder-open' },
        { label: 'Assets Library', folder: 'assets-library', icon: 'fas fa-photo-film' },
        { label: 'Smart Video Workspace', folder: 'smartvideo-workspace', icon: 'fas fa-film' },
        { label: 'Runtime Temp', folder: 'client-runtime-temp', icon: 'fas fa-clock' }
      ]
    },
    {
      title: 'Review',
      items: [
        { label: 'Videos', folder: 'review/videos', icon: 'fas fa-video' },
        { label: 'Shorts', folder: 'review/shorts', icon: 'fas fa-mobile-screen' },
        { label: 'Images', folder: 'review/images', icon: 'fas fa-image' },
        { label: 'Posts', folder: 'review/posts', icon: 'fas fa-file-lines' }
      ]
    },
    {
      title: 'Processed',
      items: [
        { label: 'Videos', folder: 'processed/videos', icon: 'fas fa-video' },
        { label: 'Shorts', folder: 'processed/shorts', icon: 'fas fa-mobile-screen' },
        { label: 'Images', folder: 'processed/images', icon: 'fas fa-image' },
        { label: 'Posts', folder: 'processed/posts', icon: 'fas fa-file-lines' }
      ]
    },
    {
      title: 'Social',
      items: [
        { label: 'YouTube Videos', folder: 'social/youtube/videos', icon: 'fab fa-youtube' },
        { label: 'YouTube Shorts', folder: 'social/youtube/shorts', icon: 'fab fa-youtube' },
        { label: 'Facebook Videos', folder: 'social/facebook/videos', icon: 'fab fa-facebook' },
        { label: 'Instagram Shorts', folder: 'social/instagram/shorts', icon: 'fab fa-instagram' },
        { label: 'TikTok Shorts', folder: 'social/tiktok/shorts', icon: 'fab fa-tiktok' },
        { label: 'LinkedIn Videos', folder: 'social/linkedin/videos', icon: 'fab fa-linkedin' }
      ]
    }
  ];

  readonly filteredFiles = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const files = this.files();
    if (!query) return files;
    return files.filter(file => file.name.toLowerCase().includes(query) || file.path.toLowerCase().includes(query));
  });

  readonly folderChildren = computed(() => this.files().filter(file => file.isDirectory));

  readonly storagePercent = computed(() => {
    const info = this.storageInfo();
    if (!info || info.totalSpace <= 0) return 0;
    return Math.max(0, Math.min(100, (info.usedSpace / info.totalSpace) * 100));
  });

  ngOnInit(): void {
    this.loadUsers();
  }

  ngOnDestroy(): void {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
  }

  onUserSearchChange(value: string): void {
    this.userSearch.set(value);
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
    this.searchTimer = setTimeout(() => this.loadUsers(value), 250);
  }

  loadUsers(searchTerm = this.userSearch()): void {
    this.loadingUsers.set(true);
    this.adminService.getUsers({
      pageNumber: 1,
      pageSize: 50,
      searchTerm: searchTerm.trim() || undefined,
      sortBy: 'email'
    }).pipe(
      finalize(() => this.loadingUsers.set(false))
    ).subscribe({
      next: result => {
        this.users.set(result.items || []);
        if (!this.selectedUser() && result.items?.length) {
          this.selectUser(result.items[0]);
        }
      },
      error: () => this.users.set([])
    });
  }

  selectUser(user: UserManagementDto): void {
    this.selectedUser.set(user);
    this.currentFolder.set('root');
    this.history.set([{ name: 'Root', id: 'root' }]);
    this.searchQuery.set('');
    this.loadStorageInfo();
    this.loadFiles('root');
  }

  loadStorageInfo(): void {
    const user = this.selectedUser();
    if (!user) return;

    this.api.getStorageInfo(user.id).subscribe({
      next: info => this.storageInfo.set(info),
      error: () => this.storageInfo.set(null)
    });
  }

  loadFiles(folder = this.currentFolder(), folderName?: string): void {
    const user = this.selectedUser();
    if (!user) {
      this.files.set([]);
      return;
    }

    const normalizedFolder = (folder || 'root').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '') || 'root';
    this.currentFolder.set(normalizedFolder);
    this.updateHistory(normalizedFolder, folderName);
    this.loadingFiles.set(true);

    this.api.getFiles(user.id, normalizedFolder).pipe(
      finalize(() => this.loadingFiles.set(false))
    ).subscribe({
      next: files => this.files.set(files || []),
      error: () => this.files.set([])
    });
  }

  refresh(): void {
    this.loadStorageInfo();
    this.loadFiles(this.currentFolder());
  }

  openItem(file: AdminCloudFileEntry): void {
    if (file.isDirectory) {
      this.searchQuery.set('');
      this.loadFiles(file.path, file.name);
      return;
    }

    this.openPreview(file);
  }

  openPreview(file: AdminCloudFileEntry): void {
    const user = this.selectedUser();
    if (!user || file.isDirectory) return;

    this.previewFile.set(file);
    this.previewUrl.set('');
    this.previewLoading.set(true);
    this.api.getDirectUrl(user.id, file.path).pipe(
      finalize(() => this.previewLoading.set(false))
    ).subscribe({
      next: result => this.previewUrl.set(result.url),
      error: () => this.previewUrl.set('')
    });
  }

  closePreview(): void {
    this.previewFile.set(null);
    this.previewUrl.set('');
    this.previewLoading.set(false);
  }

  download(file: AdminCloudFileEntry, event?: Event): void {
    event?.stopPropagation();
    const user = this.selectedUser();
    if (!user || file.isDirectory) return;

    this.api.getDirectUrl(user.id, file.path).subscribe({
      next: result => {
        const anchor = document.createElement('a');
        anchor.href = result.url;
        anchor.download = file.name;
        anchor.target = '_blank';
        anchor.rel = 'noopener';
        anchor.click();
      }
    });
  }

  isActiveFolder(folder: string): boolean {
    return this.currentFolder().toLowerCase() === folder.toLowerCase();
  }

  fileIcon(file: AdminCloudFileEntry): string {
    if (file.isDirectory) return 'fas fa-folder text-indigo-400';
    const ext = this.extension(file.name);
    if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) return 'fas fa-file-video text-blue-400';
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) return 'fas fa-file-image text-orange-400';
    if (['mp3', 'wav', 'ogg', 'flac', 'aac'].includes(ext)) return 'fas fa-file-audio text-pink-400';
    if (['json', 'js', 'ts', 'py', 'html', 'css', 'txt', 'log'].includes(ext)) return 'fas fa-file-code text-green-400';
    if (ext === 'pdf') return 'fas fa-file-pdf text-red-400';
    return 'fas fa-file text-color-secondary';
  }

  previewKind(file: AdminCloudFileEntry | null): 'video' | 'image' | 'text' | 'download' {
    if (!file) return 'download';
    const ext = this.extension(file.name);
    if (['mp4', 'mov', 'webm'].includes(ext)) return 'video';
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) return 'image';
    if (['txt', 'json', 'log'].includes(ext)) return 'text';
    return 'download';
  }

  formatBytes(value: number | null | undefined): string {
    const bytes = Math.max(0, Number(value || 0));
    if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
    if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${bytes} B`;
  }

  private updateHistory(folder: string, folderName?: string): void {
    if (folder === 'root') {
      this.history.set([{ name: 'Root', id: 'root' }]);
      return;
    }

    const existingIndex = this.history().findIndex(crumb => crumb.id === folder);
    if (existingIndex >= 0) {
      this.history.update(history => history.slice(0, existingIndex + 1));
      return;
    }

    const label = folderName || this.shortFolderName(folder);
    const isShortcut = this.folderSections.some(section => section.items.some(item => item.folder === folder));
    if (isShortcut) {
      this.history.set([{ name: label, id: folder }]);
      return;
    }

    this.history.update(history => [...history, { name: label, id: folder }]);
  }

  private shortFolderName(path: string): string {
    return path.split('/').filter(Boolean).pop() || path;
  }

  private extension(name: string): string {
    return (name.split('.').pop() || '').toLowerCase();
  }
}
