import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Observable, catchError, finalize, of } from 'rxjs';
import { ToastService } from '../../core/services/toast.service';
import { AdminService, RoleDto } from '../users/services/admin.service';
import {
  AdminSoundtrackDto,
  AdminSoundtrackPayload,
  AdminTemplateDto,
  AdminTemplatePayload,
  StudioStatusFilter,
  TemplateStudioApiService
} from './services/template-studio-api.service';

type StudioKind = 'template' | 'soundtrack';
type PlanCode = 'free' | 'student' | 'merchant' | 'premium' | 'byok';

interface PlanOption {
  code: PlanCode;
  label: string;
  icon: string;
}

interface VisibilityItem {
  allowedPlanCodes?: string[] | null;
  allowedRoleIds?: string[] | null;
  allowedRoles?: string[] | null;
}

@Component({
  selector: 'app-template-studio',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './template-studio.page.html',
  styleUrl: './template-studio.page.scss'
})
export class TemplateStudioPage implements OnInit {
  private readonly api = inject(TemplateStudioApiService);
  private readonly adminService = inject(AdminService);
  private readonly toast = inject(ToastService);

  readonly statusFilters: Array<{ code: StudioStatusFilter; label: string; icon: string }> = [
    { code: 'all', label: 'All', icon: 'fas fa-layer-group' },
    { code: 'active', label: 'Active', icon: 'fas fa-toggle-on' },
    { code: 'inactive', label: 'Inactive', icon: 'fas fa-toggle-off' }
  ];

  readonly planOptions: PlanOption[] = [
    { code: 'free', label: 'Free', icon: 'fas fa-user' },
    { code: 'student', label: 'Student', icon: 'fas fa-graduation-cap' },
    { code: 'merchant', label: 'Merchant', icon: 'fas fa-store' },
    { code: 'premium', label: 'Premium', icon: 'fas fa-crown' },
    { code: 'byok', label: 'BYOK', icon: 'fas fa-key' }
  ];

  readonly templateTypeOptions = ['Campaign', 'Short-form', 'Thumbnail', 'Prompt', 'Workflow'];
  readonly soundtrackMoodOptions = ['Upbeat', 'Calm', 'Cinematic', 'Corporate', 'Dramatic', 'Playful'];

  templates = signal<AdminTemplateDto[]>([]);
  soundtracks = signal<AdminSoundtrackDto[]>([]);
  roles = signal<RoleDto[]>([]);
  loadingTemplates = signal(false);
  loadingSoundtracks = signal(false);
  loadingRoles = signal(false);
  saving = signal(false);
  templateError = signal(false);
  soundtrackError = signal(false);

  templateSearch = signal('');
  soundtrackSearch = signal('');
  templateStatusFilter = signal<StudioStatusFilter>('all');
  soundtrackStatusFilter = signal<StudioStatusFilter>('all');
  templatePlanFilter = signal<string>('all');
  soundtrackPlanFilter = signal<string>('all');

  showForm = signal(false);
  editingItemId = signal<string | null>(null);
  pendingDelete = signal<{ kind: StudioKind; id: string } | null>(null);

  formKind: StudioKind = 'template';
  formName = '';
  formDescription = '';
  formIsActive = true;
  formAllowedPlanCodes: string[] = [];
  formAllowedRoleIds: string[] = [];
  formTags = '';

  formTemplateType = 'Campaign';
  formCategory = '';
  formThumbnailUrl = '';
  formPreviewUrl = '';
  formTemplatePayload = '';

  formSoundtrackGenre = '';
  formSoundtrackMood = 'Upbeat';
  formSoundtrackUrl = '';
  formDurationSeconds: number | null = null;
  formBpm: number | null = null;

  templateStats = computed(() => this.buildStats(this.templates()));
  soundtrackStats = computed(() => this.buildStats(this.soundtracks()));

  filteredTemplates = computed(() => {
    const term = this.templateSearch().trim().toLowerCase();
    const status = this.templateStatusFilter();
    const plan = this.templatePlanFilter();
    return this.templates().filter(item =>
      this.matchesStatus(item.isActive, status) &&
      this.matchesPlan(item, plan) &&
      this.matchesText(term, [item.name, item.description, item.category, item.templateType, ...(item.tags ?? [])])
    );
  });

  filteredSoundtracks = computed(() => {
    const term = this.soundtrackSearch().trim().toLowerCase();
    const status = this.soundtrackStatusFilter();
    const plan = this.soundtrackPlanFilter();
    return this.soundtracks().filter(item =>
      this.matchesStatus(item.isActive, status) &&
      this.matchesPlan(item, plan) &&
      this.matchesText(term, [item.name, item.description, item.genre, item.mood, ...(item.tags ?? [])])
    );
  });

  ngOnInit() {
    this.loadRoles();
    this.loadTemplates();
    this.loadSoundtracks();
  }

  loadAll() {
    this.loadTemplates();
    this.loadSoundtracks();
  }

  loadRoles() {
    this.loadingRoles.set(true);
    this.adminService.getRoles().pipe(
      catchError(() => of([] as RoleDto[])),
      finalize(() => this.loadingRoles.set(false))
    ).subscribe(roles => this.roles.set(roles));
  }

  loadTemplates() {
    this.loadingTemplates.set(true);
    this.templateError.set(false);
    this.api.getTemplates({
      status: this.templateStatusFilter(),
      planCode: this.templatePlanFilter(),
      search: this.templateSearch()
    }).pipe(
      catchError(() => {
        this.templateError.set(true);
        return of([] as AdminTemplateDto[]);
      }),
      finalize(() => this.loadingTemplates.set(false))
    ).subscribe(items => this.templates.set(items));
  }

  loadSoundtracks() {
    this.loadingSoundtracks.set(true);
    this.soundtrackError.set(false);
    this.api.getSoundtracks({
      status: this.soundtrackStatusFilter(),
      planCode: this.soundtrackPlanFilter(),
      search: this.soundtrackSearch()
    }).pipe(
      catchError(() => {
        this.soundtrackError.set(true);
        return of([] as AdminSoundtrackDto[]);
      }),
      finalize(() => this.loadingSoundtracks.set(false))
    ).subscribe(items => this.soundtracks.set(items));
  }

  setStatusFilter(kind: StudioKind, status: StudioStatusFilter) {
    if (kind === 'template') {
      this.templateStatusFilter.set(status);
      this.loadTemplates();
      return;
    }

    this.soundtrackStatusFilter.set(status);
    this.loadSoundtracks();
  }

  setPlanFilter(kind: StudioKind, planCode: string) {
    if (kind === 'template') {
      this.templatePlanFilter.set(planCode);
      this.loadTemplates();
      return;
    }

    this.soundtrackPlanFilter.set(planCode);
    this.loadSoundtracks();
  }

  openCreate(kind: StudioKind) {
    this.resetForm(kind);
    this.showForm.set(true);
  }

  openEditTemplate(template: AdminTemplateDto) {
    this.resetForm('template');
    this.editingItemId.set(template.id);
    this.formName = template.name;
    this.formDescription = template.description ?? '';
    this.formIsActive = template.isActive;
    this.formAllowedPlanCodes = this.selectedPlans(template.allowedPlanCodes);
    this.formAllowedRoleIds = this.selectedRoles(template.allowedRoleIds);
    this.formTags = (template.tags ?? []).join(', ');
    this.formTemplateType = template.templateType ?? 'Campaign';
    this.formCategory = template.category ?? '';
    this.formThumbnailUrl = template.thumbnailUrl ?? '';
    this.formPreviewUrl = template.previewUrl ?? '';
    this.formTemplatePayload = template.payloadJson ?? '';
    this.showForm.set(true);
  }

  openEditSoundtrack(soundtrack: AdminSoundtrackDto) {
    this.resetForm('soundtrack');
    this.editingItemId.set(soundtrack.id);
    this.formName = soundtrack.name;
    this.formDescription = soundtrack.description ?? '';
    this.formIsActive = soundtrack.isActive;
    this.formAllowedPlanCodes = this.selectedPlans(soundtrack.allowedPlanCodes);
    this.formAllowedRoleIds = this.selectedRoles(soundtrack.allowedRoleIds);
    this.formTags = (soundtrack.tags ?? []).join(', ');
    this.formSoundtrackGenre = soundtrack.genre ?? '';
    this.formSoundtrackMood = soundtrack.mood ?? 'Upbeat';
    this.formSoundtrackUrl = soundtrack.audioUrl ?? '';
    this.formDurationSeconds = soundtrack.durationSeconds ?? null;
    this.formBpm = soundtrack.bpm ?? null;
    this.showForm.set(true);
  }

  cancelForm() {
    this.showForm.set(false);
    this.editingItemId.set(null);
  }

  saveItem() {
    if (!this.formName.trim()) {
      this.toast.error('Name is required.');
      return;
    }

    this.saving.set(true);
    const request: Observable<AdminTemplateDto | AdminSoundtrackDto> = this.formKind === 'template'
      ? this.saveTemplateRequest()
      : this.saveSoundtrackRequest();
    request.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        this.toast.success(`${this.kindLabel()} saved.`);
        this.showForm.set(false);
        this.editingItemId.set(null);
        if (this.formKind === 'template') {
          this.loadTemplates();
        } else {
          this.loadSoundtracks();
        }
      },
      error: () => this.toast.error(`Failed to save ${this.kindLabel().toLowerCase()}.`)
    });
  }

  toggleItemStatus(kind: StudioKind, item: AdminTemplateDto | AdminSoundtrackDto) {
    const nextStatus = !item.isActive;
    const request: Observable<AdminTemplateDto | AdminSoundtrackDto> = kind === 'template'
      ? this.api.updateTemplateStatus(item.id, nextStatus)
      : this.api.updateSoundtrackStatus(item.id, nextStatus);

    request.subscribe({
      next: () => {
        this.toast.success(`${this.kindLabel(kind)} ${nextStatus ? 'activated' : 'deactivated'}.`);
        if (kind === 'template') {
          this.patchTemplate(item.id, { isActive: nextStatus });
        } else {
          this.patchSoundtrack(item.id, { isActive: nextStatus });
        }
      },
      error: () => this.toast.error(`Failed to update ${this.kindLabel(kind).toLowerCase()} status.`)
    });
  }

  deleteItem(kind: StudioKind, id: string) {
    const pending = this.pendingDelete();
    if (!pending || pending.kind !== kind || pending.id !== id) {
      this.pendingDelete.set({ kind, id });
      this.toast.show(`Click delete again to remove this ${this.kindLabel(kind).toLowerCase()}.`, 'warning', 5000);
      setTimeout(() => {
        const current = this.pendingDelete();
        if (current?.kind === kind && current.id === id) {
          this.pendingDelete.set(null);
        }
      }, 5000);
      return;
    }

    this.pendingDelete.set(null);
    const request = kind === 'template' ? this.api.deleteTemplate(id) : this.api.deleteSoundtrack(id);
    request.subscribe({
      next: () => {
        this.toast.success(`${this.kindLabel(kind)} deleted.`);
        if (kind === 'template') {
          this.templates.update(items => items.filter(item => item.id !== id));
        } else {
          this.soundtracks.update(items => items.filter(item => item.id !== id));
        }
      },
      error: () => this.toast.error(`Failed to delete ${this.kindLabel(kind).toLowerCase()}.`)
    });
  }

  pendingDeleteMatches(kind: StudioKind, id: string): boolean {
    const pending = this.pendingDelete();
    return pending?.kind === kind && pending.id === id;
  }

  togglePlan(code: string) {
    this.formAllowedPlanCodes = this.toggleValue(this.formAllowedPlanCodes, code);
  }

  toggleRole(id: string) {
    this.formAllowedRoleIds = this.toggleValue(this.formAllowedRoleIds, id);
  }

  selectAllPlans() {
    this.formAllowedPlanCodes = this.planOptions.map(plan => plan.code);
  }

  selectAllRoles() {
    this.formAllowedRoleIds = this.roles().map(role => role.id);
  }

  isPlanSelected(code: string): boolean {
    return this.formAllowedPlanCodes.includes(code);
  }

  isRoleSelected(id: string): boolean {
    return this.formAllowedRoleIds.includes(id);
  }

  allPlansSelected(): boolean {
    return this.planOptions.every(plan => this.formAllowedPlanCodes.includes(plan.code));
  }

  allRolesSelected(): boolean {
    const roles = this.roles();
    return roles.length === 0 || roles.every(role => this.formAllowedRoleIds.includes(role.id));
  }

  planVisibilityLabel(item: VisibilityItem): string {
    const codes = this.visiblePlanCodes(item);
    if (codes.length === 0 || this.allKnownPlans(codes)) return 'All plans';
    return codes.map(code => this.planLabel(code)).join(', ');
  }

  roleVisibilityLabel(item: VisibilityItem): string {
    const roleNames = item.allowedRoles ?? [];
    if (roleNames.length > 0) return roleNames.join(', ');

    const roleIds = item.allowedRoleIds ?? [];
    if (roleIds.length === 0 || this.allKnownRoles(roleIds)) return 'All roles';
    return roleIds.map(id => this.roleLabel(id)).join(', ');
  }

  planLabel(code: string): string {
    return this.planOptions.find(plan => plan.code === code)?.label ?? code;
  }

  roleLabel(id: string): string {
    return this.roles().find(role => role.id === id)?.name ?? id;
  }

  formatDuration(seconds?: number | null): string {
    if (seconds === null || seconds === undefined || Number.isNaN(seconds)) return '--';
    const minutes = Math.floor(seconds / 60);
    const remainder = Math.round(seconds % 60).toString().padStart(2, '0');
    return `${minutes}:${remainder}`;
  }

  toNullableNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  kindLabel(kind: StudioKind = this.formKind): string {
    return kind === 'template' ? 'Template' : 'Soundtrack';
  }

  dialogTitle(): string {
    const action = this.editingItemId() ? 'Edit' : 'Create';
    return `${action} ${this.kindLabel()}`;
  }

  trackTemplate(_: number, item: AdminTemplateDto): string {
    return item.id;
  }

  trackSoundtrack(_: number, item: AdminSoundtrackDto): string {
    return item.id;
  }

  trackRole(_: number, role: RoleDto): string {
    return role.id;
  }

  private saveTemplateRequest(): Observable<AdminTemplateDto> {
    const payload: AdminTemplatePayload = {
      scope: 'admin',
      name: this.formName.trim(),
      description: this.emptyToNull(this.formDescription),
      category: this.emptyToNull(this.formCategory),
      templateType: this.formTemplateType,
      thumbnailUrl: this.emptyToNull(this.formThumbnailUrl),
      previewUrl: this.emptyToNull(this.formPreviewUrl),
      payloadJson: this.emptyToNull(this.formTemplatePayload),
      isActive: this.formIsActive,
      allowedPlanCodes: [...this.formAllowedPlanCodes],
      allowedRoleIds: [...this.formAllowedRoleIds],
      allowedRoles: [],
      tags: this.parseTags(this.formTags)
    };

    const id = this.editingItemId();
    return id ? this.api.updateTemplate(id, payload) : this.api.createTemplate(payload);
  }

  private saveSoundtrackRequest(): Observable<AdminSoundtrackDto> {
    const payload: AdminSoundtrackPayload = {
      scope: 'admin',
      name: this.formName.trim(),
      description: this.emptyToNull(this.formDescription),
      genre: this.emptyToNull(this.formSoundtrackGenre),
      mood: this.emptyToNull(this.formSoundtrackMood),
      audioUrl: this.emptyToNull(this.formSoundtrackUrl),
      durationSeconds: this.formDurationSeconds,
      bpm: this.formBpm,
      isActive: this.formIsActive,
      allowedPlanCodes: [...this.formAllowedPlanCodes],
      allowedRoleIds: [...this.formAllowedRoleIds],
      allowedRoles: [],
      tags: this.parseTags(this.formTags)
    };

    const id = this.editingItemId();
    return id ? this.api.updateSoundtrack(id, payload) : this.api.createSoundtrack(payload);
  }

  private resetForm(kind: StudioKind) {
    this.formKind = kind;
    this.editingItemId.set(null);
    this.formName = '';
    this.formDescription = '';
    this.formIsActive = true;
    this.formAllowedPlanCodes = this.planOptions.map(plan => plan.code);
    this.formAllowedRoleIds = this.roles().map(role => role.id);
    this.formTags = '';
    this.formTemplateType = 'Campaign';
    this.formCategory = '';
    this.formThumbnailUrl = '';
    this.formPreviewUrl = '';
    this.formTemplatePayload = '';
    this.formSoundtrackGenre = '';
    this.formSoundtrackMood = 'Upbeat';
    this.formSoundtrackUrl = '';
    this.formDurationSeconds = null;
    this.formBpm = null;
  }

  private buildStats(items: Array<{ isActive: boolean }>): { total: number; active: number; inactive: number } {
    const active = items.filter(item => item.isActive).length;
    return { total: items.length, active, inactive: items.length - active };
  }

  private matchesStatus(isActive: boolean, status: StudioStatusFilter): boolean {
    if (status === 'all') return true;
    return status === 'active' ? isActive : !isActive;
  }

  private matchesPlan(item: VisibilityItem, planCode: string): boolean {
    if (planCode === 'all') return true;
    const codes = this.visiblePlanCodes(item);
    return codes.length === 0 || codes.includes(planCode);
  }

  private matchesText(term: string, values: Array<string | null | undefined>): boolean {
    if (!term) return true;
    return values.some(value => String(value ?? '').toLowerCase().includes(term));
  }

  private selectedPlans(codes?: string[] | null): string[] {
    return codes && codes.length > 0 ? [...codes] : this.planOptions.map(plan => plan.code);
  }

  private selectedRoles(ids?: string[] | null): string[] {
    return ids && ids.length > 0 ? [...ids] : this.roles().map(role => role.id);
  }

  private visiblePlanCodes(item: VisibilityItem): string[] {
    return item.allowedPlanCodes?.filter(Boolean) ?? [];
  }

  private allKnownPlans(codes: string[]): boolean {
    return this.planOptions.every(plan => codes.includes(plan.code));
  }

  private allKnownRoles(ids: string[]): boolean {
    const roles = this.roles();
    return roles.length > 0 && roles.every(role => ids.includes(role.id));
  }

  private toggleValue(values: string[], value: string): string[] {
    return values.includes(value) ? values.filter(item => item !== value) : [...values, value];
  }

  private parseTags(value: string): string[] {
    return value.split(',').map(tag => tag.trim()).filter(Boolean);
  }

  private emptyToNull(value: string): string | null {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  private patchTemplate(id: string, patch: Partial<AdminTemplateDto>) {
    this.templates.update(items => items.map(item => item.id === id ? { ...item, ...patch } : item));
  }

  private patchSoundtrack(id: string, patch: Partial<AdminSoundtrackDto>) {
    this.soundtracks.update(items => items.map(item => item.id === id ? { ...item, ...patch } : item));
  }
}
