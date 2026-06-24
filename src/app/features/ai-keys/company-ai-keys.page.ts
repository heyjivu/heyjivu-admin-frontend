import { Component, DestroyRef, OnDestroy, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AdminCompanyAIKeysApiService,
  ByocActionResponse,
  ByocConfigurationDto,
  CompanyAIKeySettingsDto,
  CompanyAIKeyDto,
  ModalByocUpsertRequest,
  TestKeyResult
} from './services/company-ai-keys-api.service';
import { getProviderModels, AIModelOption } from '../../core/constants/ai-models.constants';
import { ToastService } from '../../core/services/toast.service';
import { DialogService } from '../../core/dialogs/dialog.service';
import { TestAllCompanyKeysDialogComponent } from './components/test-all-company-keys-dialog/test-all-company-keys-dialog.component';
import { AuthStore } from '../../core/auth/state/auth.store';

import type { AIProviderInfo, CategoryInfo, KeySaveStatus, KeyRowState, ModalByocDraft } from './company-ai-keys.page.models';

@Component({
  selector: 'app-company-ai-keys',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule],
  templateUrl: './company-ai-keys.page.html',
  styleUrl: './company-ai-keys.page.scss'
})
export class CompanyAIKeysPage implements OnInit, OnDestroy {
  private api = inject(AdminCompanyAIKeysApiService);
  private toast = inject(ToastService);
  private dialogService = inject(DialogService);
  private destroyRef = inject(DestroyRef);
  readonly authStore = inject(AuthStore);
  private loadRequestId = 0;
  private pendingRemoveTimer: ReturnType<typeof setTimeout> | null = null;

  loading = signal(false);
  loadError = signal(false);
  settings = signal<CompanyAIKeySettingsDto[]>([]);
  openCategories = signal<Record<string, boolean>>({});
  keyRowStates = signal<Record<string, KeyRowState>>({});
  pendingRemoveKeyId = signal<string | null>(null);
  deletingKeyId = signal<string | null>(null);
  private virtualKeyDrafts: Record<string, CompanyAIKeyDto> = {};
  modalDrafts: Record<string, ModalByocDraft> = {};
  modalConfigs: Record<string, ByocConfigurationDto> = {};
  readonly modalTokenHelp = 'Use a Modal API service-user token, not the Modal Secrets tab. Go to https://modal.com/settings/tokens/service-users, click New Service User, copy MODAL_TOKEN_ID and MODAL_TOKEN_SECRET. The secret is shown only once.';
  readonly huggingFaceTokenHelp = 'Use a Hugging Face access token with read permission after accepting any gated model license, such as FLUX.1 Kontext.';

  // Hero stats
  totalKeys = computed(() => this.settings().reduce((acc, s) => acc + s.apiKeys.length, 0));
  activeKeys = computed(() => this.settings().reduce((acc, s) => acc + s.apiKeys.filter(k => !k.isBlocked && !this.isInCooldown(k)).length, 0));
  cooldownKeys = computed(() => this.settings().reduce((acc, s) => acc + s.apiKeys.filter(k => k.isBlocked || this.isInCooldown(k)).length, 0));
  categoriesConfigured = computed(() => this.settings().filter(s => s.isEnabled && s.apiKeys.length > 0).length);
  poolTitle = computed(() => this.authStore.isTenantAdmin() ? 'Organization AI Keys' : 'Company AI Keys');
  poolSubtitle = computed(() => this.authStore.isTenantAdmin()
    ? 'Manage the Non-BYOK AI key pool for your organization.'
    : 'Manage company AI keys, models and provider categories.');

  readonly categories: CategoryInfo[] = [
    {
      id: 'Text',
      name: 'Text AI',
      icon: 'fas fa-comment-dots',
      description: 'Language models for script writing, narration & content generation',
      providers: [
        { name: 'OpenAI' },
        { name: 'Gemini' },
        { name: 'DeepSeek' },
        { name: 'OpenRouter' },
        { name: 'Alibaba' },
        { name: 'Groq' }
      ]
    },
    {
      id: 'Whisper',
      name: 'Whisper (STT)',
      icon: 'fas fa-volume-up',
      description: 'Speech-to-text transcription models for audio processing',
      providers: [
        { name: 'Groq' },
        { name: 'OpenAI' },
        { name: 'OpenRouter' }
      ]
    },
    {
      id: 'ImageGen',
      name: 'Image Generation',
      icon: 'fas fa-image',
      description: 'AI engines for thumbnails, graphics, and B-roll visuals',
      providers: [
        { name: 'Gemini' },
        { name: 'OpenAI' },
        { name: 'TogetherAI' },
        { name: 'OpenRouter' },
        { name: 'StabilityAI' },
        { name: 'Modal' }
      ]
    },
    {
      id: 'Vision',
      name: 'Vision',
      icon: 'fas fa-eye',
      description: 'Visual analysis and content understanding models',
      providers: [
        { name: 'Gemini' },
        { name: 'OpenAI' }
      ]
    },
    {
      id: 'VideoGen',
      name: 'Video Generation',
      icon: 'fas fa-film',
      description: 'AI video generation providers for 5-second clips',
      providers: [
        { name: 'Alibaba' },
        { name: 'TogetherAI' },
        { name: 'OpenRouter' },
        { name: 'Generic' },
        { name: 'Luma' },
        { name: 'Kling' },
        { name: 'Runway' },
        { name: 'Modal' }
      ]
    },
    {
      id: 'TTS',
      name: 'TTS (Text-to-Speech)',
      icon: 'fas fa-microphone-alt',
      description: 'AI voiceovers and speech synthesis engines',
      providers: [
        { name: 'TogetherAI' },
        { name: 'OpenRouter' },
        { name: 'Gemini' },
        { name: 'OpenAI' },
        { name: 'Azure' },
        { name: 'ElevenLabs' },
        { name: 'Cartesia' }
      ]
    },
    {
      id: 'StockMedia',
      name: 'Stock Media',
      icon: 'fas fa-photo-video',
      description: 'Stock image, clip, music, and visual asset lookup APIs',
      providers: [
        { name: 'Pexels' },
        { name: 'Pixabay' }
      ]
    },
    {
      id: 'WebSearch',
      name: 'Web Search',
      icon: 'fas fa-globe',
      description: 'Trend research and web search result providers',
      providers: [
        { name: 'Serper' },
        { name: 'Tavily' }
      ]
    }
  ];

  ngOnInit() {
    this.load();
  }

  ngOnDestroy() {
    this.clearPendingRemoveTimer();
  }

  load() {
    const requestId = ++this.loadRequestId;
    this.loading.set(true);
    this.loadError.set(false);
    this.api.getCompanyAIKeySettings().pipe(
      finalize(() => {
        if (requestId === this.loadRequestId) {
          this.loading.set(false);
        }
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (data) => {
        if (requestId !== this.loadRequestId) return;
        this.settings.set(data);
        // Init key row states
        const previousStates = this.keyRowStates();
        const states: Record<string, KeyRowState> = {};
        data.forEach(s => s.apiKeys.forEach(k => {
          states[k.id] = {
            ...this.defaultRowState(),
            ...(previousStates[k.id] ?? {}),
            isSaving: false,
            testResult: null
          };
        }));
        this.keyRowStates.set(states);
        this.pendingRemoveKeyId.set(null);
        this.clearPendingRemoveTimer();
      },
      error: () => {
        if (requestId !== this.loadRequestId) return;
        this.settings.set([]);
        this.keyRowStates.set({});
        this.pendingRemoveKeyId.set(null);
        this.clearPendingRemoveTimer();
        this.loadError.set(true);
        this.toast.error(`Failed to load ${this.poolTitle().toLowerCase()}.`);
      }
    });
  }

  // ── Category helpers ────────────────────────────────────────────────
  getCategoryInfo(type: string): CategoryInfo {
    return this.categories.find(c => c.id === type) ?? { id: type, name: type, icon: 'fas fa-key', description: '', providers: [] };
  }

  isCategoryOpen(type: string): boolean {
    return !!this.openCategories()[type];
  }

  toggleCategory(type: string) {
    this.openCategories.update(prev => ({ ...prev, [type]: !prev[type] }));
  }

  keyCountForType(type: string): number {
    return this.settings().find(s => s.type === type)?.apiKeys.length ?? 0;
  }

  toggleEnabled(setting: CompanyAIKeySettingsDto, event: Event) {
    event.stopPropagation();
    const checkbox = event.target as HTMLInputElement;
    setting.isEnabled = checkbox.checked;
    this.saveAll(setting);
  }

  // ── Virtual / Placeholder keys mapping ──────────────────────────────
  isVirtualKey(keyId: string): boolean {
    return (keyId || '').startsWith('virtual-');
  }

  getCategoryKeysForDisplay(setting: CompanyAIKeySettingsDto): CompanyAIKeyDto[] {
    const keysList: CompanyAIKeyDto[] = [];

    // 1. Add all configured keys
    setting.apiKeys.forEach(k => {
      keysList.push(k);
    });

    // 2. Add placeholder keys for any standard providers that aren't configured
    const catInfo = this.getCategoryInfo(setting.type);
    if (catInfo && catInfo.providers) {
      catInfo.providers.forEach(prov => {
        const hasKey = setting.apiKeys.some(k => (k.provider || '').toLowerCase() === prov.name.toLowerCase());
        if (!hasKey) {
          keysList.push(this.getVirtualKeyDraft(setting, prov));
        }
      });
    }

    return keysList;
  }

  // ── Key row state helpers ────────────────────────────────────────────
  getRowState(keyId: string): KeyRowState {
    return this.keyRowStates()[keyId] ?? this.defaultRowState();
  }

  updateRowState(keyId: string, patch: Partial<KeyRowState>) {
    this.keyRowStates.update(prev => ({
      ...prev,
      [keyId]: { ...this.defaultRowState(), ...(prev[keyId] ?? {}), ...patch }
    }));
  }

  toggleRow(keyId: string, key?: CompanyAIKeyDto) {
    const current = this.getRowState(keyId);
    this.updateRowState(keyId, { isOpen: !current.isOpen, testResult: null, saveStatus: 'idle', saveMessage: null });
    if (!current.isOpen && key && this.authStore.isSuperAdmin() && this.isModalProvider(key.provider) && !this.isVirtualKey(key.id)) {
      this.loadModalConfig(key);
    }
  }

  toggleShowKey(keyId: string, event: Event) {
    event.stopPropagation();
    const current = this.getRowState(keyId);
    this.updateRowState(keyId, { showKey: !current.showKey });
  }

  // ── CRUD operations ─────────────────────────────────────────────────
  addKey(setting: CompanyAIKeySettingsDto) {
    const newKey: CompanyAIKeyDto = {
      id: crypto.randomUUID(),
      key: '',
      isBlocked: false,
      usageCount: 0,
      provider: setting.provider || '',
      modelName: null,
      roleName: null,
      isFree: false,
      priority: setting.apiKeys.length,
      customLabel: null
    };
    setting.apiKeys = [...setting.apiKeys, newKey];
    // Auto-open the new row
    this.keyRowStates.update(prev => ({
      ...prev,
      [newKey.id]: { ...this.defaultRowState(), isOpen: true }
    }));
  }

  removeKey(setting: CompanyAIKeySettingsDto, key: CompanyAIKeyDto) {
    if (this.loading() || this.deletingKeyId() || this.getRowState(key.id).isSaving || this.getRowState(key.id).isTesting) {
      return;
    }

    const provider = key.provider || setting.provider || 'this provider';
    if (this.pendingRemoveKeyId() !== key.id) {
      this.pendingRemoveKeyId.set(key.id);
      this.toast.show(`Click remove again to delete the ${provider} key.`, 'warning', 5000);
      this.clearPendingRemoveTimer();
      this.pendingRemoveTimer = setTimeout(() => {
        if (this.pendingRemoveKeyId() === key.id) {
          this.pendingRemoveKeyId.set(null);
        }
      }, 5000);
      return;
    }

    this.pendingRemoveKeyId.set(null);
    this.clearPendingRemoveTimer();

    if (this.isVirtualKey(key.id)) {
      setting.apiKeys = setting.apiKeys.filter(k => k !== key);
      return;
    }

    this.deletingKeyId.set(key.id);
    this.api.deleteKey(key.id).pipe(
      finalize(() => {
        if (this.deletingKeyId() === key.id) {
          this.deletingKeyId.set(null);
        }
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: () => {
        setting.apiKeys = setting.apiKeys.filter(k => k.id !== key.id);
        this.toast.success(`${provider} key removed.`);
        this.load();
      },
      error: () => this.toast.error(`Failed to delete ${this.poolTitle().toLowerCase().slice(0, -1)}.`)
    });
  }

  saveKey(setting: CompanyAIKeySettingsDto, key: CompanyAIKeyDto) {
    const rowId = key.id;
    const wasVirtual = this.isVirtualKey(rowId);
    const previousApiKeys = setting.apiKeys.map(existingKey => ({ ...existingKey }));
    let keyToSave = key;

    if (!this.canSaveKey(key)) {
      this.updateRowState(rowId, {
        saveStatus: 'error',
        saveMessage: 'API key required'
      });
      this.toast.show('Enter an API key before saving this provider.', 'warning');
      return;
    }

    if (wasVirtual) {
      // Convert to a real key
      const newKey: CompanyAIKeyDto = {
        ...key,
        id: crypto.randomUUID(),
        key: key.key?.trim() ?? '',
        provider: key.provider || setting.provider,
        modelName: this.nullableText(key.modelName),
        roleName: this.nullableText(key.roleName),
        priority: setting.apiKeys.length,
        customLabel: this.nullableText(key.customLabel)
      };
      setting.apiKeys = [...setting.apiKeys, newKey];
      keyToSave = newKey;
    } else {
      key.key = key.key?.trim() ?? '';
      key.modelName = this.nullableText(key.modelName);
      key.roleName = this.nullableText(key.roleName);
      key.customLabel = this.nullableText(key.customLabel);
    }

    this.updateRowState(rowId, { isSaving: true, saveStatus: 'idle', saveMessage: null });

    this.saveAll(
      setting,
      `${keyToSave.provider || setting.provider || 'Provider'} key saved.`,
      () => {
        if (wasVirtual) {
          delete this.virtualKeyDrafts[rowId];
        }
        this.updateRowState(rowId, {
          isSaving: false,
          saveStatus: 'success',
          saveMessage: 'Saved'
        });
      },
      () => {
        setting.apiKeys = previousApiKeys;
        this.updateRowState(rowId, {
          isSaving: false,
          saveStatus: 'error',
          saveMessage: 'Save failed'
        });
      },
      keyToSave
    );
  }

  saveAll(
    setting: CompanyAIKeySettingsDto,
    successMessage = `${this.poolTitle()} saved.`,
    afterSuccess?: () => void,
    afterError?: () => void,
    preferredKey?: CompanyAIKeyDto
  ) {
    // Automatically set default provider and default model from the saved active key first.
    const preferredKeyInSetting = preferredKey
      ? (setting.apiKeys.find(k => k.id === preferredKey.id) ?? preferredKey)
      : null;
    const defaultKey = preferredKeyInSetting && !preferredKeyInSetting.isBlocked
      ? preferredKeyInSetting
      : (setting.apiKeys.find(k => !k.isBlocked) ?? setting.apiKeys[0]);

    if (defaultKey) {
      setting.provider = defaultKey.provider || setting.provider;
      setting.model = defaultKey.modelName || this.getDefaultModelForProvider(setting.type, setting.provider);
    } else {
      // Fallback if no keys configured: use first standard provider for the category
      const catInfo = this.getCategoryInfo(setting.type);
      if (catInfo && catInfo.providers && catInfo.providers.length > 0) {
        setting.provider = catInfo.providers[0].name;
        setting.model = this.getDefaultModelForProvider(setting.type, setting.provider);
      }
    }

    const payload = {
      provider: setting.provider,
      model: setting.model,
      isEnabled: setting.isEnabled,
      type: setting.type,
      apiKeys: setting.apiKeys.map(k => ({
        id: k.id,
        key: k.key,
        isBlocked: k.isBlocked,
        usageCount: k.usageCount,
        provider: k.provider || setting.provider,
        modelName: this.nullableText(k.modelName),
        roleName: this.nullableText(k.roleName),
        isFree: k.isFree,
        customLabel: this.nullableText(k.customLabel)
      }))
    };
    this.api.saveCompanyAIKeySettings(payload).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: () => {
        afterSuccess?.();
        this.toast.success(successMessage);
        this.load();
      },
      error: () => {
        afterError?.();
        this.toast.error(`Failed to save ${this.poolTitle().toLowerCase()}.`);
      }
    });
  }

  getDefaultModelForProvider(type: string, provider: string): string {
    const models = getProviderModels(type, provider);
    return models.length > 0 ? models[0].id : '';
  }

  testKey(keyId: string, event: Event) {
    event.stopPropagation();
    if (this.loading() || this.deletingKeyId() || this.getRowState(keyId).isTesting) return;
    this.updateRowState(keyId, { isTesting: true, testResult: null });
    this.api.testKey(keyId).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (res) => this.updateRowState(keyId, { isTesting: false, testResult: res }),
      error: () => this.updateRowState(keyId, { isTesting: false, testResult: { success: false, message: 'Connection failed' } })
    });
  }

  getModalDraft(setting: CompanyAIKeySettingsDto, key: CompanyAIKeyDto): ModalByocDraft {
    if (!this.modalDrafts[key.id]) {
      const preset = this.defaultModalPreset(setting.type);
      this.modalDrafts[key.id] = {
        tokenId: '',
        tokenSecret: '',
        huggingFaceToken: '',
        showSecret: false,
        showHuggingFaceToken: false,
        preset,
        gpu: this.defaultModalGpu(preset),
        model: key.modelName || this.defaultModalModel(preset)
      };
    }

    return this.modalDrafts[key.id];
  }

  modalPresetOptions(type: string): { id: string; label: string; help: string }[] {
    if (type.toLowerCase() === 'imagegen') {
      return [
        { id: 'image-budget', label: 'Image Budget', help: 'FLUX Schnell on L40S, 10-30 sec/image' },
        { id: 'image-quality', label: 'Image Quality', help: 'FLUX Dev or SDXL on H100, 5-20 sec/image' },
        { id: 'image-reference', label: 'Image to Image', help: 'FLUX Kontext on H100, reference image + prompt' }
      ];
    }

    return [
      { id: 'fast-preview', label: 'Fast Preview', help: 'Wan 2.2 preview profile from appsettings' },
      { id: 'high-quality', label: 'High Quality', help: 'Wan 2.2 H200 profile from appsettings' },
      { id: 'premium', label: 'Premium', help: 'Wan 2.2 quality-first profile from appsettings' }
    ];
  }

  modalGpuOptions(type: string): string[] {
    return type.toLowerCase() === 'imagegen' ? ['L40S', 'H100'] : ['L40S', 'H100', 'H200'];
  }

  onModalPresetChange(setting: CompanyAIKeySettingsDto, key: CompanyAIKeyDto) {
    const draft = this.getModalDraft(setting, key);
    draft.gpu = this.defaultModalGpu(draft.preset);
    draft.model = this.defaultModalModel(draft.preset);
  }

  openModalTokenPage(event: Event) {
    event.stopPropagation();
    window.open('https://modal.com/settings/tokens/service-users', '_blank', 'noopener,noreferrer');
  }

  openHuggingFaceTokenPage(event: Event) {
    event.stopPropagation();
    window.open('https://huggingface.co/settings/tokens', '_blank', 'noopener,noreferrer');
  }

  loadModalConfig(key: CompanyAIKeyDto) {
    if (this.isVirtualKey(key.id) || !this.authStore.isSuperAdmin()) return;
    this.api.getByocConfiguration(key.id).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (res) => this.applyModalResponse(res),
      error: () => undefined
    });
  }

  saveModalKey(setting: CompanyAIKeySettingsDto, key: CompanyAIKeyDto) {
    if (!this.authStore.isSuperAdmin()) {
      this.toast.show('Modal BYOC controls are available to super admins only.', 'warning');
      return;
    }

    const draft = this.getModalDraft(setting, key);
    this.updateRowState(key.id, { isSaving: true, saveStatus: 'idle', saveMessage: null });
    this.api.upsertModalByoc(this.buildModalRequest(setting, key, draft)).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (res) => {
        this.applyModalResponse(res);
        this.toast.success('Modal BYOC settings saved.');
        this.updateRowState(key.id, { isSaving: false, saveStatus: 'success', saveMessage: 'Saved' });
        this.load();
      },
      error: () => {
        this.updateRowState(key.id, { isSaving: false, saveStatus: 'error', saveMessage: 'Save failed' });
        this.toast.error('Failed to save Modal BYOC settings.');
      }
    });
  }

  validateModalKey(setting: CompanyAIKeySettingsDto, key: CompanyAIKeyDto) {
    if (!this.authStore.isSuperAdmin()) {
      this.toast.show('Modal BYOC controls are available to super admins only.', 'warning');
      return;
    }

    const draft = this.getModalDraft(setting, key);
    if (!this.canValidateModal(key, draft)) {
      this.toast.show('Modal token id, token secret, preset, GPU, and model are required.', 'warning');
      return;
    }

    this.updateRowState(key.id, { isTesting: true, testResult: null });
    this.api.upsertModalByoc(this.buildModalRequest(setting, key, draft)).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (saved) => {
        this.applyModalResponse(saved);
        this.api.validateModalByoc(saved.key.id!).pipe(
          takeUntilDestroyed(this.destroyRef)
        ).subscribe({
          next: (validated) => {
            this.applyModalResponse(validated);
            this.updateRowState(key.id, {
              isTesting: false,
              testResult: {
                success: validated.success,
                status: validated.status,
                latencyMs: validated.latencyMs ?? undefined,
                message: validated.message ?? undefined
              }
            });
            this.toast.success(validated.success ? 'Modal token validated.' : 'Modal validation failed.');
            this.load();
          },
          error: () => {
            this.updateRowState(key.id, { isTesting: false, testResult: { success: false, message: 'Modal validation failed' } });
            this.toast.error('Modal validation failed.');
          }
        });
      },
      error: () => {
        this.updateRowState(key.id, { isTesting: false, testResult: { success: false, message: 'Failed to save Modal settings' } });
        this.toast.error('Failed to save Modal settings.');
      }
    });
  }

  deployModalKey(setting: CompanyAIKeySettingsDto, key: CompanyAIKeyDto) {
    if (!this.authStore.isSuperAdmin()) {
      this.toast.show('Modal BYOC controls are available to super admins only.', 'warning');
      return;
    }

    if (this.isVirtualKey(key.id)) return;
    const draft = this.getModalDraft(setting, key);
    this.updateRowState(key.id, { isSaving: true, saveStatus: 'idle', saveMessage: null });

    const deploy = (keyId: string) => this.api.deployModalByoc(keyId, {
      preset: null,
      gpu: null,
      model: null
    }).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (deployed) => {
        this.applyModalResponse(deployed);
        this.updateRowState(key.id, {
          isSaving: false,
          saveStatus: deployed.success ? 'success' : 'error',
          saveMessage: deployed.success ? 'Deployed' : 'Deploy failed',
          testResult: {
            success: deployed.success,
            status: deployed.status,
            message: deployed.message ?? undefined
          }
        });
        this.toast.show(deployed.success ? 'Modal worker deployed.' : 'Modal deploy failed.', deployed.success ? 'success' : 'error');
        this.load();
      },
      error: () => {
        this.updateRowState(key.id, { isSaving: false, saveStatus: 'error', saveMessage: 'Deploy failed' });
        this.toast.error('Modal deploy failed.');
      }
    });

    if (this.hasPendingModalSecrets(draft)) {
      this.api.upsertModalByoc(this.buildModalRequest(setting, key, draft)).pipe(
        takeUntilDestroyed(this.destroyRef)
      ).subscribe({
        next: (saved) => {
          this.applyModalResponse(saved);
          deploy(saved.key.id!);
        },
        error: () => {
          this.updateRowState(key.id, { isSaving: false, saveStatus: 'error', saveMessage: 'Save failed' });
          this.toast.error('Failed to save Modal BYOC settings.');
        }
      });
      return;
    }

    deploy(key.id);
  }

  canValidateModal(key: CompanyAIKeyDto, draft: ModalByocDraft): boolean {
    const config = this.modalConfigs[key.id];
    const hasCredentials = !!config?.credentialsConfigured || (!!draft.tokenId.trim() && !!draft.tokenSecret.trim());
    return hasCredentials && !!draft.preset && !!draft.gpu && !!draft.model;
  }

  canDeployModal(key: CompanyAIKeyDto): boolean {
    const config = this.modalConfigs[key.id];
    return !this.isVirtualKey(key.id) &&
      !!config &&
      ['validated', 'deployed', 'needs_redeploy', 'failed'].includes(config.status);
  }

  modalStatusText(key: CompanyAIKeyDto): string {
    const config = this.modalConfigs[key.id];
    if (!config) return this.isVirtualKey(key.id) ? 'Not Configured' : 'BYOC Saved';
    if (key.isBlocked) return 'Paused';
    if (config.status === 'deployed') return 'BYOC Active';
    return `BYOC ${config.status.replace('_', ' ')}`;
  }

  private buildModalRequest(setting: CompanyAIKeySettingsDto, key: CompanyAIKeyDto, draft: ModalByocDraft): ModalByocUpsertRequest {
    return {
      aiKeyId: this.isVirtualKey(key.id) ? null : key.id,
      category: setting.type,
      tokenId: draft.tokenId.trim() || null,
      tokenSecret: draft.tokenSecret.trim() || null,
      preset: null,
      gpu: null,
      model: null,
      label: key.customLabel ?? null,
      huggingFaceToken: null
    };
  }

  private applyModalResponse(response: ByocActionResponse) {
    this.modalConfigs[response.configuration.aiKeyId] = response.configuration;
    const settings = this.parseModalSettings(response.configuration.settingsJson);
    const draft = this.modalDrafts[response.configuration.aiKeyId] ?? {
      tokenId: '',
      tokenSecret: '',
      huggingFaceToken: '',
      showSecret: false,
      showHuggingFaceToken: false,
      preset: settings.preset,
      gpu: settings.gpu,
      model: settings.model
    };
    draft.preset = settings.preset || draft.preset;
    draft.gpu = settings.gpu || draft.gpu;
    draft.model = settings.model || draft.model;
    draft.tokenId = '';
    draft.tokenSecret = '';
    draft.huggingFaceToken = '';
    this.modalDrafts[response.configuration.aiKeyId] = draft;
  }

  private hasPendingModalSecrets(draft: ModalByocDraft): boolean {
    return !!draft.tokenId.trim() ||
      !!draft.tokenSecret.trim() ||
      !!draft.huggingFaceToken.trim();
  }

  private parseModalSettings(settingsJson?: string | null): { preset: string; gpu: string; model: string } {
    const preset = this.defaultModalPreset('VideoGen');
    try {
      const settings = settingsJson ? JSON.parse(settingsJson) : {};
      return {
        preset: settings.preset || preset,
        gpu: settings.gpu || this.defaultModalGpu(settings.preset || preset),
        model: settings.model || this.defaultModalModel(settings.preset || preset)
      };
    } catch {
      return { preset, gpu: this.defaultModalGpu(preset), model: this.defaultModalModel(preset) };
    }
  }

  private defaultModalPreset(type: string): string {
    return type.toLowerCase() === 'imagegen' ? 'image-budget' : 'high-quality';
  }

  private defaultModalGpu(preset: string): string {
    if (preset === 'high-quality') return 'H200';
    if (preset === 'image-quality' || preset === 'image-reference') return 'H100';
    if (preset === 'premium') return 'H200';
    return 'L40S';
  }

  private defaultModalModel(preset: string): string {
    switch (preset) {
      case 'image-reference':
        return 'black-forest-labs/FLUX.1-Kontext-dev';
      case 'image-quality':
        return 'black-forest-labs/FLUX.1-dev';
      case 'high-quality':
        return 'Wan-AI/Wan2.2-I2V-A14B';
      case 'premium':
        return 'Wan-AI/Wan2.2-I2V-A14B';
      case 'fast-preview':
        return 'Wan-AI/Wan2.2-I2V-A14B';
      default:
        return 'black-forest-labs/FLUX.1-schnell';
    }
  }

  openTestAllDialog() {
    this.dialogService.open(TestAllCompanyKeysDialogComponent, {
      header: `${this.poolTitle()} Validation Report`,
      width: '680px',
      closable: true,
      dismissableMask: true
    });
  }

  onDrop(event: CdkDragDrop<CompanyAIKeyDto[]>, setting: CompanyAIKeySettingsDto) {
    const displayed = this.getCategoryKeysForDisplay(setting);
    const from = displayed[event.previousIndex];
    const to = displayed[event.currentIndex];
    if (!from || !to || this.isVirtualKey(from.id) || this.isVirtualKey(to.id)) {
      return;
    }

    const ordered = [...displayed];
    moveItemInArray(ordered, event.previousIndex, event.currentIndex);
    const orderedRealIds = ordered
      .filter(key => !this.isVirtualKey(key.id))
      .map(key => key.id);

    setting.apiKeys = orderedRealIds
      .map(id => setting.apiKeys.find(key => key.id === id))
      .filter((key): key is CompanyAIKeyDto => !!key)
      .map((key, priority) => ({ ...key, priority }));

    this.api.reorderKeys(setting.type, orderedRealIds).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: () => {
        this.toast.success(`${this.poolTitle()} priority updated.`);
        this.load();
      },
      error: () => {
        this.toast.error(`Failed to reorder ${this.poolTitle().toLowerCase()}.`);
        this.load();
      }
    });
  }

  // ── Model constants ─────────────────────────────────────────────────
  getModelsForKey(key: CompanyAIKeyDto, setting: CompanyAIKeySettingsDto): AIModelOption[] {
    const provider = key.provider || setting.provider;
    return getProviderModels(setting.type, provider);
  }

  getModelsForSetting(setting: CompanyAIKeySettingsDto): AIModelOption[] {
    return getProviderModels(setting.type, setting.provider);
  }

  isInCooldown(key: CompanyAIKeyDto): boolean {
    if (!key.cooldownUntil) return false;
    return new Date(key.cooldownUntil).getTime() > Date.now();
  }

  getCooldownMinutes(key: CompanyAIKeyDto): number {
    if (!key.cooldownUntil) return 0;
    const remainingMs = new Date(key.cooldownUntil).getTime() - Date.now();
    return Math.max(1, Math.ceil(remainingMs / 60000));
  }

  // ── Provider icon & color ────────────────────────────────────────────
  getProviderIcon(provider: string): string {
    const p = (provider || '').toLowerCase();
    if (p.includes('openai')) return 'assets/svg/openai.svg';
    if (p.includes('gemini') || p.includes('google')) return 'assets/svg/gemini.svg';
    if (p.includes('deepseek')) return 'assets/svg/deepseek.svg';
    if (p.includes('openrouter')) return 'assets/svg/openrouter.svg';
    if (p.includes('alibaba') || p.includes('dashscope') || p.includes('qwen')) return 'assets/svg/alibaba.svg';
    if (p.includes('groq')) return 'assets/svg/groq.svg';
    if (p.includes('together')) return 'assets/svg/together.svg';
    if (p.includes('stability')) return 'assets/svg/stability.svg';
    if (p.includes('modal')) return '';
    if (p.includes('azure')) return 'assets/svg/azure.svg';
    if (p.includes('eleven')) return 'assets/svg/elevenlabs.svg';
    if (p.includes('cartesia')) return 'assets/svg/cartesia.svg';
    if (p.includes('pexels')) return 'assets/svg/pexels.svg';
    if (p.includes('pixabay')) return 'assets/svg/pixabay.svg';
    if (p.includes('luma')) return 'assets/svg/luma.svg';
    if (p.includes('kling')) return 'assets/svg/kling.svg';
    if (p.includes('runway')) return 'assets/svg/runway.svg';
    if (p.includes('serper')) return 'assets/svg/serper.svg';
    if (p.includes('tavily')) return 'assets/svg/tavily.svg';
    if (p.includes('pollinations')) return 'assets/svg/pollinations.svg';
    return '';
  }

  getIconBadgeClass(provider: string): string {
    const p = (provider || '').toLowerCase();
    if (p.includes('openai')) return 'badge-green';
    if (p.includes('gemini') || p.includes('google')) return 'badge-blue';
    if (p.includes('deepseek')) return 'badge-blue';
    if (p.includes('openrouter')) return 'badge-purple';
    if (p.includes('alibaba') || p.includes('dashscope')) return 'badge-orange';
    if (p.includes('groq')) return 'badge-magenta';
    if (p.includes('together')) return 'badge-purple';
    if (p.includes('stability')) return 'badge-cyan';
    if (p.includes('modal')) return 'badge-cyan';
    if (p.includes('azure')) return 'badge-blue';
    if (p.includes('eleven')) return 'badge-orange';
    if (p.includes('luma')) return 'badge-purple';
    if (p.includes('kling')) return 'badge-red';
    if (p.includes('runway')) return 'badge-neutral';
    return 'badge-neutral';
  }

  private nullableText(value: string | null | undefined): string | null {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }

  private defaultRowState(): KeyRowState {
    return {
      isOpen: false,
      showKey: false,
      isTesting: false,
      isSaving: false,
      testResult: null,
      saveStatus: 'idle',
      saveMessage: null
    };
  }

  private getVirtualKeyDraft(setting: CompanyAIKeySettingsDto, provider: AIProviderInfo): CompanyAIKeyDto {
    const id = `virtual-${setting.type}-${provider.name}`;
    if (!this.virtualKeyDrafts[id]) {
      this.virtualKeyDrafts[id] = {
        id,
        key: '',
        isBlocked: false,
        usageCount: 0,
        provider: provider.name,
        modelName: null,
        roleName: null,
        isFree: provider.isFree || false,
        customLabel: null
      };
    }

    return this.virtualKeyDrafts[id];
  }

  private clearPendingRemoveTimer() {
    if (this.pendingRemoveTimer) {
      clearTimeout(this.pendingRemoveTimer);
      this.pendingRemoveTimer = null;
    }
  }

  canSaveKey(key: CompanyAIKeyDto): boolean {
    if (this.isModalProvider(key.provider)) {
      return true;
    }
    return !this.isVirtualKey(key.id) || key.isFree || !!key.key?.trim();
  }

  isModalProvider(provider: string | null | undefined): boolean {
    return (provider || '').trim().toLowerCase() === 'modal';
  }

  getSaveStatusIcon(key: CompanyAIKeyDto): string {
    const state = this.getRowState(key.id);
    if (state.isSaving) return 'fa-spinner fa-spin';
    if (state.saveStatus === 'success') return 'fa-check-circle';
    if (state.saveStatus === 'error') return 'fa-exclamation-circle';
    if (!this.canSaveKey(key)) return 'fa-key';
    return 'fa-save';
  }

  getSaveStatusText(key: CompanyAIKeyDto): string {
    const state = this.getRowState(key.id);
    if (state.isSaving) return 'Saving changes';
    if (state.saveMessage) return state.saveMessage;
    if (!this.canSaveKey(key)) return 'API key required';
    return this.isVirtualKey(key.id) ? 'Ready to save' : 'Ready';
  }

  trackByKeyId(_: number, key: CompanyAIKeyDto) { return key.id; }
  trackBySettingId(_: number, s: CompanyAIKeySettingsDto) { return s.id; }
}
