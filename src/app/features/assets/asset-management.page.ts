import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AssetsApiService, AssetDto } from './services/assets-api.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-asset-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './asset-management.page.html',
  styleUrl: './asset-management.page.scss'
})
export class AssetManagementPage implements OnInit {
  private api = inject(AssetsApiService);
  private toast = inject(ToastService);

  assets = signal<AssetDto[]>([]);
  loading = signal(false);
  showForm = signal(false);
  editing = signal<AssetDto | null>(null);
  pendingDeleteAssetId = signal<string | null>(null);

  formName = '';
  formDescription = '';
  formType = 'Video';
  formFileUrl4k = '';
  formFileUrl2k = '';
  formFileUrl1k = '';
  formIsActive = true;

  ngOnInit() {
    this.loadAssets();
  }

  loadAssets() {
    this.loading.set(true);
    this.api.getAssetsAdmin().subscribe({
      next: (data) => this.assets.set(data),
      error: () => this.assets.set([]),
      complete: () => this.loading.set(false)
    });
  }

  openCreate() {
    this.editing.set(null);
    this.formName = '';
    this.formDescription = '';
    this.formType = 'Video';
    this.formFileUrl4k = '';
    this.formFileUrl2k = '';
    this.formFileUrl1k = '';
    this.formIsActive = true;
    this.showForm.set(true);
  }

  openEdit(asset: AssetDto) {
    this.editing.set(asset);
    this.formName = asset.name;
    this.formDescription = asset.description;
    this.formType = asset.type;
    this.formFileUrl4k = asset.fileUrl4k;
    this.formFileUrl2k = asset.fileUrl2k;
    this.formFileUrl1k = asset.fileUrl1k;
    this.formIsActive = asset.isActive;
    this.showForm.set(true);
  }

  cancelForm() {
    this.showForm.set(false);
    this.editing.set(null);
  }

  saveAsset() {
    const payload = {
      id: this.editing()?.id || null,
      name: this.formName,
      description: this.formDescription,
      type: this.formType,
      fileUrl4k: this.formFileUrl4k,
      fileUrl2k: this.formFileUrl2k,
      fileUrl1k: this.formFileUrl1k,
      isActive: this.formIsActive,
      allowedRoles: [] as string[]
    };

    this.api.saveAsset(payload).subscribe({
      next: () => {
        this.showForm.set(false);
        this.loadAssets();
      }
    });
  }

  deleteAsset(id: string) {
    if (this.pendingDeleteAssetId() !== id) {
      this.pendingDeleteAssetId.set(id);
      this.toast.show('Click delete again to remove this asset.', 'warning', 5000);
      setTimeout(() => {
        if (this.pendingDeleteAssetId() === id) {
          this.pendingDeleteAssetId.set(null);
        }
      }, 5000);
      return;
    }

    this.pendingDeleteAssetId.set(null);
    this.api.deleteAsset(id).subscribe({
      next: () => {
        this.toast.success('Asset deleted.');
        this.loadAssets();
      },
      error: () => this.toast.error('Failed to delete asset.')
    });
  }
}



