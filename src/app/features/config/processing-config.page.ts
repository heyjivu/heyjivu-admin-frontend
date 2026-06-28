import { Component, DestroyRef, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ModelCapabilityDto, ModelCapabilityPriceTierDto, PostGenApiService, SaveModelCapabilityRequest } from './services/post-gen-api.service';

@Component({
  selector: 'app-processing-config',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './processing-config.page.html',
  styleUrl: './processing-config.page.scss'
})
export class ProcessingConfigPage implements OnInit, OnDestroy {
  private api = inject(PostGenApiService);
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);
  private processingLoadRequestId = 0;
  private capabilityLoadRequestId = 0;
  private routeReady = false;

  loading = signal(false);
  savingCompanyOptions = signal(false);
  capabilitiesLoading = signal(false);
  savingCapability = signal(false);
  deletingCapabilityId = signal<string | null>(null);
  activeTab = signal<'processing' | 'models'>('processing');
  companyOptions = signal<any>(null);
  modelCapabilities = signal<ModelCapabilityDto[]>([]);
  processingLoadError = signal('');
  processingSaveError = signal('');
  capabilitiesLoadError = signal('');
  capabilitySaveError = signal('');
  capabilityProviderFilter = signal('');
  capabilityCategoryFilter = signal('');
  capabilitySearch = signal('');
  capabilityPage = signal(1);
  capabilityPageSize = signal(25);
  capabilityTotalItems = signal(0);
  capabilityEditorOpen = signal(false);
  editingCapability = signal<SaveModelCapabilityRequest | null>(null);
  saved = signal(false);
  capabilitiesSaved = signal(false);
  capabilityBusy = computed(() => this.capabilitiesLoading() || this.savingCapability() || !!this.deletingCapabilityId());
  capabilityTotalPages = computed(() => Math.max(1, Math.ceil(this.capabilityTotalItems() / this.capabilityPageSize())));
  capabilityPageStart = computed(() => this.capabilityTotalItems() === 0 ? 0 : ((this.capabilityPage() - 1) * this.capabilityPageSize()) + 1);
  capabilityPageEnd = computed(() => Math.min(this.capabilityPage() * this.capabilityPageSize(), this.capabilityTotalItems()));
  private capabilitySearchTimeout: ReturnType<typeof setTimeout> | null = null;
  private savedToastTimeout: ReturnType<typeof setTimeout> | null = null;
  private capabilitiesSavedToastTimeout: ReturnType<typeof setTimeout> | null = null;

  capabilityCategories = ['Text', 'ImageGen', 'TTS', 'VideoGen', 'Whisper', 'Vision', 'Embedding'];
  capabilityProviders = ['OpenRouter', 'TogetherAI', 'Gemini', 'OpenAI', 'StabilityAI', 'Azure', 'ElevenLabs', 'Cartesia', 'Runway', 'Luma', 'Kling', 'Alibaba', 'LiteLLM'];

  ngOnInit() {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      const nextTab = params.get('tab') === 'models' ? 'models' : 'processing';
      const previousTab = this.activeTab();
      this.activeTab.set(nextTab);
      if (this.routeReady && nextTab === 'models' && previousTab !== 'models') {
        this.loadModelCapabilities();
      }
    });
    this.routeReady = true;
    this.load();
  }

  ngOnDestroy() {
    if (this.capabilitySearchTimeout) {
      clearTimeout(this.capabilitySearchTimeout);
    }
    if (this.savedToastTimeout) {
      clearTimeout(this.savedToastTimeout);
    }
    if (this.capabilitiesSavedToastTimeout) {
      clearTimeout(this.capabilitiesSavedToastTimeout);
    }
  }

  load() {
    const requestId = ++this.processingLoadRequestId;
    this.loading.set(true);
    this.processingLoadError.set('');
    this.api.getCompanyProcessingOptions().pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => {
        if (requestId === this.processingLoadRequestId) {
          this.loading.set(false);
        }
      })
    ).subscribe({
      next: (data) => {
        if (requestId !== this.processingLoadRequestId) return;
        this.companyOptions.set(data);
      },
      error: () => {
        if (requestId !== this.processingLoadRequestId) return;
        this.companyOptions.set(null);
        this.processingLoadError.set('Processing defaults could not be loaded. Try refreshing this tab.');
      }
    });
    if (this.activeTab() === 'models') {
      this.loadModelCapabilities();
    }
  }

  save() {
    const opts = this.companyOptions();
    if (!opts || this.savingCompanyOptions()) return;
    this.savingCompanyOptions.set(true);
    this.processingSaveError.set('');
    this.api.updateCompanyProcessingOptions(opts).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.savingCompanyOptions.set(false))
    ).subscribe({
      next: () => {
        this.showSavedToast();
      },
      error: () => this.processingSaveError.set('Company defaults were not saved. Please retry after the current request finishes.')
    });
  }

  loadModelCapabilities() {
    const requestId = ++this.capabilityLoadRequestId;
    this.capabilitiesLoading.set(true);
    this.capabilitiesLoadError.set('');
    this.api.getModelCapabilities({
      provider: this.capabilityProviderFilter(),
      category: this.capabilityCategoryFilter(),
      search: this.capabilitySearch(),
      pageNumber: this.capabilityPage(),
      pageSize: this.capabilityPageSize()
    }).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => {
        if (requestId === this.capabilityLoadRequestId) {
          this.capabilitiesLoading.set(false);
        }
      })
    ).subscribe({
      next: (result) => {
        if (requestId !== this.capabilityLoadRequestId) return;
        this.modelCapabilities.set(result.items ?? []);
        this.capabilityTotalItems.set(result.totalCount ?? 0);
        this.capabilityPage.set(result.pageNumber ?? this.capabilityPage());
        this.capabilityPageSize.set(result.pageSize ?? this.capabilityPageSize());
      },
      error: () => {
        if (requestId !== this.capabilityLoadRequestId) return;
        this.modelCapabilities.set([]);
        this.capabilityTotalItems.set(0);
        this.capabilitiesLoadError.set('Model capabilities could not be loaded. Filters were kept so you can retry.');
      }
    });
  }

  applyCapabilityFilters() {
    if (this.capabilityBusy()) return;
    this.capabilityPage.set(1);
    this.loadModelCapabilities();
  }

  onCapabilitySearchChange(event: Event) {
    this.updateCapabilityFilter('search', event);
    this.capabilityPage.set(1);
    if (this.capabilitySearchTimeout) {
      clearTimeout(this.capabilitySearchTimeout);
    }
    this.capabilitySearchTimeout = setTimeout(() => this.loadModelCapabilities(), 350);
  }

  updateCapabilityPageSize(event: Event) {
    if (this.capabilityBusy()) return;
    const value = Number((event.target as HTMLSelectElement).value);
    this.capabilityPageSize.set(Number.isFinite(value) && value > 0 ? value : 25);
    this.capabilityPage.set(1);
    this.loadModelCapabilities();
  }

  nextCapabilityPage() {
    if (this.capabilityBusy() || this.capabilityPage() >= this.capabilityTotalPages()) return;
    this.capabilityPage.set(this.capabilityPage() + 1);
    this.loadModelCapabilities();
  }

  prevCapabilityPage() {
    if (this.capabilityBusy() || this.capabilityPage() <= 1) return;
    this.capabilityPage.set(this.capabilityPage() - 1);
    this.loadModelCapabilities();
  }

  openCapabilityEditor(row?: ModelCapabilityDto) {
    if (this.capabilityBusy()) return;
    this.capabilitySaveError.set('');
    this.editingCapability.set(row ? this.toCapabilityForm(row) : this.newCapabilityForm());
    this.capabilityEditorOpen.set(true);
  }

  closeCapabilityEditor(force = false) {
    if (this.savingCapability() && !force) return;
    this.capabilityEditorOpen.set(false);
    this.editingCapability.set(null);
    this.capabilitySaveError.set('');
  }

  saveCapability() {
    const form = this.editingCapability();
    if (!form || this.savingCapability() || !form.provider.trim() || !form.modelName.trim() || !form.category.trim()) return;

    this.savingCapability.set(true);
    this.capabilitySaveError.set('');
    this.api.saveModelCapability({
      ...form,
      provider: form.provider.trim(),
      modelName: form.modelName.trim(),
      category: form.category.trim(),
      supportedAspectRatios: this.cleanList(form.supportedAspectRatios),
      supportedDurations: this.cleanList(form.supportedDurations),
      supportedVoices: this.cleanList(form.supportedVoices),
      supportedLanguages: this.cleanList(form.supportedLanguages),
      priceTiers: this.cleanPriceTiers(form.priceTiers)
    }).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.savingCapability.set(false))
    ).subscribe({
      next: () => {
        this.showCapabilitiesSavedToast();
        this.closeCapabilityEditor(true);
        this.loadModelCapabilities();
      },
      error: () => this.capabilitySaveError.set('Model capability was not saved. Check the values and retry.')
    });
  }

  deleteCapability(row: ModelCapabilityDto) {
    if (this.capabilityBusy() || !confirm(`Delete ${row.provider} / ${row.modelName}?`)) return;
    this.deletingCapabilityId.set(row.id);
    this.capabilitySaveError.set('');
    this.api.deleteModelCapability(row.id).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => {
        if (this.deletingCapabilityId() === row.id) {
          this.deletingCapabilityId.set(null);
        }
      })
    ).subscribe({
      next: () => this.loadModelCapabilities(),
      error: () => this.capabilitySaveError.set('Model capability was not deleted. Please retry.')
    });
  }

  isDeletingCapability(row: ModelCapabilityDto): boolean {
    return this.deletingCapabilityId() === row.id;
  }

  updateCapabilityFilter(kind: 'provider' | 'category' | 'search', event: Event) {
    const value = (event.target as HTMLInputElement | HTMLSelectElement).value;
    if (kind === 'provider') this.capabilityProviderFilter.set(value);
    if (kind === 'category') this.capabilityCategoryFilter.set(value);
    if (kind === 'search') this.capabilitySearch.set(value);
  }

  setCapabilityList(field: 'supportedAspectRatios' | 'supportedDurations' | 'supportedVoices' | 'supportedLanguages', event: Event) {
    const form = this.editingCapability();
    if (!form) return;
    const values = this.parseList((event.target as HTMLInputElement).value);
    this.editingCapability.set({ ...form, [field]: values });
  }

  listText(values?: string[] | null): string {
    return (values ?? []).join(', ');
  }

  recordType(row: ModelCapabilityDto): string {
    if (this.isPricingOnly(row)) return 'Synced pricing';
    if (this.isManualRecord(row)) return 'Admin/manual';
    return 'Synced capability';
  }

  recordActor(row: ModelCapabilityDto): string {
    const actor = row.modifiedBy || row.createdBy;
    if (actor) return actor;
    if (this.isPricingOnly(row)) return 'Auto sync job';
    return this.isManualRecord(row) ? 'Admin' : 'Auto sync job';
  }

  latestRecordTime(row: ModelCapabilityDto): string | null {
    return row.modifiedAt || row.lastSeenAt || row.createdAt || null;
  }

  formatDateTime(value?: string | null): string {
    if (!value) return 'Never';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Unknown';
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  priceLines(row: ModelCapabilityDto): string[] {
    const lines: string[] = [];
    this.addPriceLine(lines, 'Input', row.inputPricePerMillion, '/M tok');
    this.addPriceLine(lines, 'Output', row.outputPricePerMillion, '/M tok');
    this.addPriceLine(lines, 'Chars', row.characterPricePerMillion, '/M chars');
    this.addPriceLine(lines, 'Image', row.imagePricePerUnit, '/image');
    this.addPriceLine(lines, 'Audio', row.audioPricePerSecond, '/sec');
    this.addPriceLine(lines, 'Video sec', row.videoPricePerSecond, '/sec');
    this.addPriceLine(lines, 'Video', row.videoPricePerUnit, '/video');
    this.addPriceLine(lines, 'Request', row.requestPricePerUnit, '/request');
    return lines;
  }

  addPriceTier(type = 'Resolution') {
    const form = this.editingCapability();
    if (!form) return;
    const rows = [...(form.priceTiers ?? [])];
    rows.push({
      id: null,
      tierType: type,
      tierKey: '',
      label: '',
      nonByokPriceUsd: null,
      byokPriceUsd: null,
      quotaMultiplier: 1,
      showForNonByok: true,
      showForByok: true,
      sortOrder: rows.length
    });
    this.editingCapability.set({ ...form, priceTiers: rows });
  }

  addDefaultResolutionTiers() {
    const form = this.editingCapability();
    if (!form) return;
    const existing = new Set((form.priceTiers ?? []).map(tier => `${tier.tierType}:${tier.tierKey}`.toLowerCase()));
    const defaults = this.defaultResolutionTiers()
      .filter(tier => !existing.has(`${tier.tierType}:${tier.tierKey}`.toLowerCase()));
    this.editingCapability.set({ ...form, priceTiers: [...(form.priceTiers ?? []), ...defaults] });
  }

  removePriceTier(index: number) {
    const form = this.editingCapability();
    if (!form) return;
    this.editingCapability.set({
      ...form,
      priceTiers: (form.priceTiers ?? []).filter((_, i) => i !== index)
    });
  }

  trackByCapabilityId(index: number, row: ModelCapabilityDto) {
    return row.id && row.id !== '00000000-0000-0000-0000-000000000000'
      ? row.id
      : `${row.provider}:${row.modelName}:${row.category}:${index}`;
  }

  trackByTierIndex(index: number) {
    return index;
  }

  private newCapabilityForm(): SaveModelCapabilityRequest {
    return {
      id: null,
      provider: '',
      modelName: '',
      category: 'ImageGen',
      displayName: '',
      description: '',
      maxResolution: '',
      supportedAspectRatios: [],
      supportedDurations: [],
      supportsImageToVideo: false,
      supportsTextToVideo: false,
      supportsAudio: false,
      supportedVoices: [],
      supportedLanguages: [],
      supportsVoiceClone: false,
      supportsStreaming: false,
      metadataSource: 'Manual',
      metadataQuality: 'Manual',
      skipAutoSync: true,
      priceTiers: this.defaultResolutionTiers(),
      lastReviewedAt: new Date().toISOString()
    };
  }

  private toCapabilityForm(row: ModelCapabilityDto): SaveModelCapabilityRequest {
    return {
      id: row.id,
      provider: row.provider,
      modelName: row.modelName,
      category: row.category,
      displayName: row.displayName ?? '',
      description: row.description ?? '',
      maxResolution: row.maxResolution ?? '',
      supportedAspectRatios: row.supportedAspectRatios ?? [],
      supportedDurations: row.supportedDurations ?? [],
      supportsImageToVideo: row.supportsImageToVideo,
      supportsTextToVideo: row.supportsTextToVideo,
      supportsAudio: row.supportsAudio,
      supportedVoices: row.supportedVoices ?? [],
      supportedLanguages: row.supportedLanguages ?? [],
      supportsVoiceClone: row.supportsVoiceClone,
      supportsStreaming: row.supportsStreaming,
      metadataSource: row.metadataSource || 'Manual',
      metadataQuality: row.metadataQuality || 'Manual',
      skipAutoSync: row.skipAutoSync,
      priceTiers: (row.priceTiers ?? []).map(tier => ({ ...tier })),
      lastReviewedAt: row.lastReviewedAt
    };
  }

  private parseList(value: string): string[] {
    return value.split(',').map(item => item.trim()).filter(Boolean);
  }

  private cleanList(values?: string[] | null): string[] {
    return (values ?? []).map(item => item.trim()).filter(Boolean);
  }

  private cleanPriceTiers(values?: ModelCapabilityPriceTierDto[] | null): ModelCapabilityPriceTierDto[] {
    return (values ?? [])
      .filter(tier => tier.tierKey?.trim())
      .map((tier, index) => ({
        ...tier,
        tierType: tier.tierType?.trim() || 'Resolution',
        tierKey: tier.tierKey.trim(),
        label: tier.label?.trim() || tier.tierKey.trim(),
        nonByokPriceUsd: this.nullableNumber(tier.nonByokPriceUsd),
        byokPriceUsd: this.nullableNumber(tier.byokPriceUsd),
        quotaMultiplier: this.positiveNumber(tier.quotaMultiplier, 1),
        showForNonByok: tier.showForNonByok !== false,
        showForByok: tier.showForByok !== false,
        sortOrder: Number.isFinite(Number(tier.sortOrder)) ? Number(tier.sortOrder) : index
      }));
  }

  private defaultResolutionTiers(): ModelCapabilityPriceTierDto[] {
    return [
      { id: null, tierType: 'Resolution', tierKey: '720p', label: '720p', nonByokPriceUsd: null, byokPriceUsd: null, quotaMultiplier: 1, showForNonByok: true, showForByok: true, sortOrder: 0 },
      { id: null, tierType: 'Resolution', tierKey: '1K', label: '1K', nonByokPriceUsd: null, byokPriceUsd: null, quotaMultiplier: 1.25, showForNonByok: true, showForByok: true, sortOrder: 1 },
      { id: null, tierType: 'Resolution', tierKey: '2K', label: '2K', nonByokPriceUsd: null, byokPriceUsd: null, quotaMultiplier: 1.5, showForNonByok: true, showForByok: true, sortOrder: 2 },
      { id: null, tierType: 'Resolution', tierKey: '4K', label: '4K', nonByokPriceUsd: null, byokPriceUsd: null, quotaMultiplier: 2, showForNonByok: true, showForByok: true, sortOrder: 3 }
    ];
  }

  private nullableNumber(value: number | string | null | undefined): number | null {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private positiveNumber(value: number | string | null | undefined, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  private addPriceLine(lines: string[], label: string, value: number | null | undefined, suffix: string) {
    const amount = Number(value ?? 0);
    if (!Number.isFinite(amount) || amount <= 0) return;
    lines.push(`${label} ${this.formatUsd(amount)} ${suffix}`);
  }

  private formatUsd(value: number): string {
    if (value >= 1) return `$${value.toFixed(4)}`;
    if (value >= 0.0001) return `$${value.toFixed(6)}`;
    return `$${value.toExponential(3)}`;
  }

  private isPricingOnly(row: ModelCapabilityDto): boolean {
    return row.id === '00000000-0000-0000-0000-000000000000'
      || row.metadataQuality?.toLowerCase() === 'pricingonly';
  }

  private isManualRecord(row: ModelCapabilityDto): boolean {
    return row.skipAutoSync || row.metadataSource?.toLowerCase() === 'manual';
  }

  private showSavedToast() {
    this.saved.set(true);
    if (this.savedToastTimeout) {
      clearTimeout(this.savedToastTimeout);
    }
    this.savedToastTimeout = setTimeout(() => this.saved.set(false), 3000);
  }

  private showCapabilitiesSavedToast() {
    this.capabilitiesSaved.set(true);
    if (this.capabilitiesSavedToastTimeout) {
      clearTimeout(this.capabilitiesSavedToastTimeout);
    }
    this.capabilitiesSavedToastTimeout = setTimeout(() => this.capabilitiesSaved.set(false), 3000);
  }
}



