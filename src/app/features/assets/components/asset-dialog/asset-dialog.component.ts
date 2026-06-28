import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-asset-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './asset-dialog.component.html',
  styleUrl: '../../asset-management.page.scss'
})
export class AssetDialogComponent {
  readonly typeOptions = ['Video', 'Image'];

  @Input() editing = false;
  @Input() saving = false;
  @Input() submitted = false;
  @Input() assetTitle = '';
  @Input() category = '';
  @Input() description = '';
  @Input() isActive = true;
  @Input() attachmentFile: File | null = null;
  @Input() attachmentName = '';

  @Output() assetTitleChange = new EventEmitter<string>();
  @Output() categoryChange = new EventEmitter<string>();
  @Output() descriptionChange = new EventEmitter<string>();
  @Output() isActiveChange = new EventEmitter<boolean>();
  @Output() attachmentFileChange = new EventEmitter<File | null>();
  @Output() attachmentNameChange = new EventEmitter<string>();
  @Output() save = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  get canSave(): boolean {
    return !this.saving &&
      !!this.assetTitle.trim() &&
      !!this.category.trim() &&
      (this.editing || !!this.attachmentName);
  }

  get isTitleInvalid(): boolean {
    return this.submitted && !this.assetTitle.trim();
  }

  get isTypeInvalid(): boolean {
    return this.submitted && !this.category.trim();
  }

  onAttachmentSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.attachmentFileChange.emit(file);
    this.attachmentNameChange.emit(file?.name ?? '');
  }

  clearAttachment(input: HTMLInputElement) {
    input.value = '';
    this.attachmentFileChange.emit(null);
    this.attachmentNameChange.emit('');
  }
}
