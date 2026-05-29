import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PostGenApiService } from './services/post-gen-api.service';
import { AdminService } from '../users/services/admin.service';

@Component({
  selector: 'app-processing-config',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './processing-config.page.html',
  styleUrl: './processing-config.page.scss'
})
export class ProcessingConfigPage implements OnInit {
  private api = inject(PostGenApiService);
  private adminService = inject(AdminService);

  loading = signal(false);
  companyOptions = signal<any>(null);
  saved = signal(false);

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.api.getCompanyProcessingOptions().subscribe({
      next: (data) => this.companyOptions.set(data),
      complete: () => this.loading.set(false)
    });
  }

  save() {
    const opts = this.companyOptions();
    if (!opts) return;
    this.api.updateCompanyProcessingOptions(opts).subscribe({
      next: () => {
        this.saved.set(true);
        setTimeout(() => this.saved.set(false), 3000);
      }
    });
  }
}



