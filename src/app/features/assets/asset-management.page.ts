import { Component, DestroyRef, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AssetsApiService, AssetDto } from './services/assets-api.service';
import { ToastService } from '../../core/services/toast.service';
import { AssetDialogComponent } from './components/asset-dialog/asset-dialog.component';

@Component({
  selector: 'app-asset-management',
  standalone: true,
  imports: [CommonModule, FormsModule, AssetDialogComponent],
  templateUrl: './asset-management.page.html',
  styleUrl: './asset-management.page.scss'
})
export class AssetManagementPage implements OnInit, OnDestroy {
  private api = inject(AssetsApiService);
  private toast = inject(ToastService);
  private destroyRef = inject(DestroyRef);
  private loadRequestId = 0;
  private pendingDeleteTimer: ReturnType<typeof setTimeout> | null = null;

  assets = signal<AssetDto[]>([]);
  loading = signal(false);
  saving = signal(false);
  assetError = signal(false);
  showForm = signal(false);
  editing = signal<AssetDto | null>(null);
  pendingDeleteAssetId = signal<string | null>(null);
  deletingAssetId = signal<string | null>(null);
  formSubmitted = signal(false);

  formName = '';
  formDescription = '';
  formType = 'Video';
  formFileUrl4k = '';
  formFileUrl2k = '';
  formFileUrl1k = '';
  formIsActive = true;
  formAttachmentFile: File | null = null;
  formAttachmentName = '';

  ngOnInit() {
    this.loadAssets();
  }

  ngOnDestroy() {
    this.clearPendingDeleteTimer();
  }

  loadAssets() {
    const requestId = ++this.loadRequestId;
    this.loading.set(true);
    this.assetError.set(false);
    this.api.getAssetsAdmin().pipe(
      finalize(() => {
        if (requestId === this.loadRequestId) {
          this.loading.set(false);
        }
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (data) => {
        if (requestId === this.loadRequestId) {
          this.assets.set(data);
        }
      },
      error: () => {
        if (requestId === this.loadRequestId) {
          this.assets.set([]);
          this.assetError.set(true);
          this.toast.error('Failed to load assets.');
        }
      }
    });
  }

  openCreate() {
    if (this.saving()) return;
    this.editing.set(null);
    this.formName = '';
    this.formDescription = '';
    this.formType = 'Video';
    this.formFileUrl4k = '';
    this.formFileUrl2k = '';
    this.formFileUrl1k = '';
    this.formIsActive = true;
    this.formAttachmentFile = null;
    this.formAttachmentName = '';
    this.formSubmitted.set(false);
    this.showForm.set(true);
  }

  openEdit(asset: AssetDto) {
    if (this.saving() || this.deletingAssetId()) return;
    this.editing.set(asset);
    this.formName = asset.name;
    this.formDescription = asset.description;
    this.formType = asset.type;
    this.formFileUrl4k = asset.fileUrl4k;
    this.formFileUrl2k = asset.fileUrl2k;
    this.formFileUrl1k = asset.fileUrl1k;
    this.formIsActive = asset.isActive;
    this.formAttachmentFile = null;
    this.formAttachmentName = '';
    this.formSubmitted.set(false);
    this.showForm.set(true);
  }

  cancelForm() {
    if (this.saving()) return;
    this.showForm.set(false);
    this.editing.set(null);
    this.formSubmitted.set(false);
  }

  saveAsset() {
    if (this.saving()) return;
    this.formSubmitted.set(true);
    const name = this.formName.trim();
    const type = this.formType.trim();
    if (!name || !type) {
      this.toast.error('Name and type are required.');
      return;
    }
    if (!this.editing() && !this.formAttachmentFile) {
      this.toast.error('Attachment is required.');
      return;
    }

    const payload = {
      id: this.editing()?.id || null,
      name,
      description: this.formDescription.trim(),
      type,
      fileUrl4k: this.formFileUrl4k.trim(),
      fileUrl2k: this.formFileUrl2k.trim(),
      fileUrl1k: this.formFileUrl1k.trim(),
      isActive: this.formIsActive,
      allowedRoles: [] as string[],
      file: this.formAttachmentFile
    };

    const isEditing = !!this.editing();
    this.saving.set(true);
    this.api.saveAsset(payload).pipe(
      finalize(() => this.saving.set(false)),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: () => {
        this.showForm.set(false);
        this.editing.set(null);
        this.formSubmitted.set(false);
        this.toast.success(isEditing ? 'Asset updated.' : 'Asset created.');
        this.loadAssets();
      },
      error: () => this.toast.error('Failed to save asset.')
    });
  }

  deleteAsset(id: string) {
    if (this.saving() || this.deletingAssetId()) return;

    if (this.pendingDeleteAssetId() !== id) {
      this.pendingDeleteAssetId.set(id);
      this.toast.show('Click delete again to remove this asset.', 'warning', 5000);
      this.clearPendingDeleteTimer();
      this.pendingDeleteTimer = setTimeout(() => {
        if (this.pendingDeleteAssetId() === id) {
          this.pendingDeleteAssetId.set(null);
        }
      }, 5000);
      return;
    }

    this.pendingDeleteAssetId.set(null);
    this.clearPendingDeleteTimer();
    this.deletingAssetId.set(id);
    this.api.deleteAsset(id).pipe(
      finalize(() => {
        if (this.deletingAssetId() === id) {
          this.deletingAssetId.set(null);
        }
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: () => {
        this.toast.success('Asset deleted.');
        this.loadAssets();
      },
      error: () => this.toast.error('Failed to delete asset.')
    });
  }

  canSaveAsset(): boolean {
    return !this.saving() && !!this.formName.trim() && !!this.formType.trim() && (!!this.editing() || !!this.formAttachmentFile);
  }

  isNameInvalid(): boolean {
    return this.formSubmitted() && !this.formName.trim();
  }

  isTypeInvalid(): boolean {
    return this.formSubmitted() && !this.formType.trim();
  }

  private clearPendingDeleteTimer() {
    if (this.pendingDeleteTimer) {
      clearTimeout(this.pendingDeleteTimer);
      this.pendingDeleteTimer = null;
    }
  }
}



