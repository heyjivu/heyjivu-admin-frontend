import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
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
export class TemplateStudioDialogComponent {
  @Input() kind: TemplateStudioDialogKind = 'template';
  @Input() editing = false;
  @Input() saving = false;
  @Input() loadingRoles = false;
  @Input() itemName = '';
  @Input() category = '';
  @Input() isActive = true;
  @Input() attachmentFile: File | null = null;
  @Input() attachmentName = '';
  @Input() planOptions: TemplateStudioDialogPlan[] = [];
  @Input() roles: RoleDto[] = [];
  @Input() allowedPlanCodes: string[] = [];
  @Input() allowedRoleIds: string[] = [];

  @Output() itemNameChange = new EventEmitter<string>();
  @Output() categoryChange = new EventEmitter<string>();
  @Output() isActiveChange = new EventEmitter<boolean>();
  @Output() attachmentFileChange = new EventEmitter<File | null>();
  @Output() attachmentNameChange = new EventEmitter<string>();
  @Output() allowedPlanCodesChange = new EventEmitter<string[]>();
  @Output() allowedRoleIdsChange = new EventEmitter<string[]>();
  @Output() save = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

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

  get attachmentAccept(): string {
    return this.kind === 'soundtrack' ? 'audio/*' : 'image/*,video/*,.json,.lottie,.riv';
  }

  get canSave(): boolean {
    return !this.saving && !!this.itemName.trim() && (this.editing || !!this.attachmentName);
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
}
