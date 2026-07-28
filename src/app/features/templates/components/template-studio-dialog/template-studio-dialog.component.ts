import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RoleDto } from '../../../users/services/admin.service';

export type TemplateStudioDialogKind = 'template' | 'soundtrack';

export interface TemplateStudioDialogPlan {
  code: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-template-studio-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './template-studio-dialog.component.html',
  styleUrl: '../../template-studio.page.scss'
})
export class TemplateStudioDialogComponent implements OnChanges {
  readonly newCategoryValue = '__new_category__';
  useCustomCategory = false;
  durationReading = false;
  durationError: string | null = null;
  private durationRequestId = 0;
  private durationInitialized = false;
  private originalDurationSeconds: number | null = null;

  @Input() kind: TemplateStudioDialogKind = 'template';
  @Input() editing = false;
  @Input() saving = false;
  @Input() loadingRoles = false;
  @Input() itemName = '';
  @Input() category = '';
  @Input() categoryOptions: string[] = [];
  @Input() isActive = true;
  @Input() attachmentFile: File | null = null;
  @Input() attachmentName = '';
  @Input() durationSeconds: number | null = null;
  @Input() planOptions: TemplateStudioDialogPlan[] = [];
  @Input() roles: RoleDto[] = [];
  @Input() allowedPlanCodes: string[] = [];
  @Input() allowedRoleIds: string[] = [];

  @Output() itemNameChange = new EventEmitter<string>();
  @Output() categoryChange = new EventEmitter<string>();
  @Output() isActiveChange = new EventEmitter<boolean>();
  @Output() attachmentFileChange = new EventEmitter<File | null>();
  @Output() attachmentNameChange = new EventEmitter<string>();
  @Output() durationSecondsChange = new EventEmitter<number | null>();
  @Output() allowedPlanCodesChange = new EventEmitter<string[]>();
  @Output() allowedRoleIdsChange = new EventEmitter<string[]>();
  @Output() save = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['durationSeconds'] && !this.durationInitialized) {
      this.originalDurationSeconds = this.durationSeconds;
      this.durationInitialized = true;
    }

    if (!changes['category'] && !changes['categoryOptions']) return;

    const matchesExisting = this.categoryOptions.some(
      option => option.toLowerCase() === this.category.trim().toLowerCase());
    if (this.category.trim() && !matchesExisting) {
      this.useCustomCategory = true;
    } else if (matchesExisting) {
      this.useCustomCategory = false;
    }
  }

  get title(): string {
    return `${this.editing ? 'Edit' : 'Create'} ${this.kind === 'template' ? 'Template' : 'Soundtrack'}`;
  }

  get iconClass(): string {
    return this.kind === 'template' ? 'fa-clone' : 'fa-music';
  }

  get categoryPlaceholder(): string {
    return this.kind === 'template'
      ? 'e.g. Commerce, Launch, Thumbnail'
      : 'e.g. Ambient, Launch, Corporate';
  }

  get selectedCategoryOption(): string {
    if (this.useCustomCategory || this.categoryOptions.length === 0) {
      return this.newCategoryValue;
    }

    return this.categoryOptions.find(
      option => option.toLowerCase() === this.category.trim().toLowerCase()) ?? '';
  }

  get showCustomCategoryInput(): boolean {
    return this.useCustomCategory || this.categoryOptions.length === 0;
  }

  get attachmentAccept(): string {
    return this.kind === 'soundtrack' ? 'audio/*' : 'image/*,video/*,.json,.lottie,.riv';
  }

  get canSave(): boolean {
    const baseReady = !this.saving && !!this.itemName.trim() && (this.editing || !!this.attachmentName);
    if (!baseReady || this.kind !== 'soundtrack') return baseReady;

    return !this.durationReading
      && !this.durationError
      && Number.isFinite(this.durationSeconds)
      && Number(this.durationSeconds) > 0;
  }

  onAttachmentSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.attachmentFileChange.emit(file);
    this.attachmentNameChange.emit(file?.name ?? '');
    if (this.kind === 'soundtrack' && file) {
      this.detectAudioDuration(file);
    }
  }

  clearAttachment(input: HTMLInputElement) {
    this.durationRequestId += 1;
    this.durationReading = false;
    this.durationError = null;
    input.value = '';
    this.attachmentFileChange.emit(null);
    this.attachmentNameChange.emit('');
    this.durationSecondsChange.emit(this.editing ? this.originalDurationSeconds : null);
  }

  formatDuration(seconds: number | null | undefined): string {
    const value = Number(seconds);
    if (!Number.isFinite(value) || value <= 0) return '--';
    const totalSeconds = Math.max(1, Math.round(value));
    const minutes = Math.floor(totalSeconds / 60);
    return `${minutes}:${String(totalSeconds % 60).padStart(2, '0')}`;
  }

  onCategoryOptionSelected(value: string): void {
    this.useCustomCategory = value === this.newCategoryValue;
    this.categoryChange.emit(this.useCustomCategory ? '' : value);
  }

  togglePlan(code: string) {
    this.allowedPlanCodesChange.emit(this.toggleValue(this.allowedPlanCodes, code));
  }

  toggleRole(id: string) {
    this.allowedRoleIdsChange.emit(this.toggleValue(this.allowedRoleIds, id));
  }

  selectAllPlans() {
    this.allowedPlanCodesChange.emit(this.planOptions.map(plan => plan.code));
  }

  selectAllRoles() {
    this.allowedRoleIdsChange.emit(this.roles.map(role => role.id));
  }

  isPlanSelected(code: string): boolean {
    return this.allowedPlanCodes.includes(code);
  }

  isRoleSelected(id: string): boolean {
    return this.allowedRoleIds.includes(id);
  }

  allPlansSelected(): boolean {
    return this.planOptions.every(plan => this.allowedPlanCodes.includes(plan.code));
  }

  allRolesSelected(): boolean {
    return this.roles.length === 0 || this.roles.every(role => this.allowedRoleIds.includes(role.id));
  }

  private toggleValue(values: string[], value: string): string[] {
    return values.includes(value) ? values.filter(item => item !== value) : [...values, value];
  }

  private detectAudioDuration(file: File): void {
    const requestId = ++this.durationRequestId;
    this.durationReading = true;
    this.durationError = null;
    this.durationSecondsChange.emit(null);

    const objectUrl = URL.createObjectURL(file);
    const audio = new Audio();
    const timeoutId = window.setTimeout(
      () => finish(null, 'Could not detect the audio duration. Choose a valid audio file.'),
      15_000
    );
    let settled = false;

    const cleanup = () => {
      window.clearTimeout(timeoutId);
      audio.onloadedmetadata = null;
      audio.onerror = null;
      audio.pause();
      audio.removeAttribute('src');
      URL.revokeObjectURL(objectUrl);
    };
    const finish = (duration: number | null, error: string | null) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (requestId !== this.durationRequestId) return;

      this.durationReading = false;
      this.durationError = error;
      this.durationSecondsChange.emit(duration);
    };

    audio.preload = 'metadata';
    audio.onloadedmetadata = () => {
      const duration = audio.duration;
      finish(
        Number.isFinite(duration) && duration > 0 ? duration : null,
        Number.isFinite(duration) && duration > 0
          ? null
          : 'Could not detect the audio duration. Choose a valid audio file.'
      );
    };
    audio.onerror = () => finish(null, 'Could not read this audio file.');
    audio.src = objectUrl;
    audio.load();
  }
}
