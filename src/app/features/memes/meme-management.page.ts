import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MemesApiService, MemeDto } from './services/memes-api.service';

@Component({
  selector: 'app-meme-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './meme-management.page.html',
  styleUrl: './meme-management.page.scss'
})
export class MemeManagementPage implements OnInit {
  private api = inject(MemesApiService);

  memes = signal<MemeDto[]>([]);
  loading = signal(false);
  showForm = signal(false);
  editing = signal<MemeDto | null>(null);

  formName = '';
  formDescription = '';
  formType = 'Video';
  formFileUrl4k = '';
  formFileUrl2k = '';
  formFileUrl1k = '';
  formIsActive = true;

  ngOnInit() {
    this.loadMemes();
  }

  loadMemes() {
    this.loading.set(true);
    this.api.getMemesAdmin().subscribe({
      next: (data) => this.memes.set(data),
      error: () => this.memes.set([]),
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

  openEdit(meme: MemeDto) {
    this.editing.set(meme);
    this.formName = meme.name;
    this.formDescription = meme.description;
    this.formType = meme.type;
    this.formFileUrl4k = meme.fileUrl4k;
    this.formFileUrl2k = meme.fileUrl2k;
    this.formFileUrl1k = meme.fileUrl1k;
    this.formIsActive = meme.isActive;
    this.showForm.set(true);
  }

  cancelForm() {
    this.showForm.set(false);
    this.editing.set(null);
  }

  saveMeme() {
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

    this.api.createMeme(payload).subscribe({
      next: () => {
        this.showForm.set(false);
        this.loadMemes();
      }
    });
  }

  deleteMeme(id: string) {
    if (!confirm('Delete this meme?')) return;
    this.api.deleteMeme(id).subscribe({
      next: () => this.loadMemes()
    });
  }
}



