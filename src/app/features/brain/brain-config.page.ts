import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  MemoryApiService,
  BrainSettingsDto,
  BrainApiKeyDto,
  TestKeyResult
} from './services/memory-api.service';
import { getProviderModels, AIModelOption } from '../../core/constants/ai-models.constants';
import { ToastService } from '../../core/services/toast.service';

interface AIProviderInfo {
  name: string;
  isFree?: boolean;
}

interface CategoryInfo {
  id: string;
  name: string;
  icon: string;
  description: string;
  providers: AIProviderInfo[];
}

type KeySaveStatus = 'idle' | 'success' | 'error';

interface KeyRowState {
  isOpen: boolean;
  showKey: boolean;
  isTesting: boolean;
  isSaving: boolean;
  testResult: TestKeyResult | null;
  saveStatus: KeySaveStatus;
  saveMessage: string | null;
}

@Component({
  selector: 'app-brain-config',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './brain-config.page.html',
  styleUrl: './brain-config.page.scss'
})
export class BrainConfigPage implements OnInit {
  private api = inject(MemoryApiService);
  private toast = inject(ToastService);

  loading = signal(false);
  settings = signal<BrainSettingsDto[]>([]);
  openCategories = signal<Record<string, boolean>>({});
  keyRowStates = signal<Record<string, KeyRowState>>({});
  pendingRemoveKeyId = signal<string | null>(null);
  private virtualKeyDrafts: Record<string, BrainApiKeyDto> = {};

  // Hero stats
  totalKeys = computed(() => this.settings().reduce((acc, s) => acc + s.apiKeys.length, 0));
  activeKeys = computed(() => this.settings().reduce((acc, s) => acc + s.apiKeys.filter(k => !k.isBlocked).length, 0));
  blockedKeys = computed(() => this.settings().reduce((acc, s) => acc + s.apiKeys.filter(k => k.isBlocked).length, 0));
  categoriesConfigured = computed(() => this.settings().filter(s => s.isEnabled && s.apiKeys.length > 0).length);

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
        { name: 'Groq' },
        { name: 'Ollama' }
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
        { name: 'Pollinations', isFree: true }
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
      description: 'AI video generation and rendering engines',
      providers: [
        { name: 'Alibaba' },
        { name: 'TogetherAI' },
        { name: 'OpenRouter' },
        { name: 'Generic' },
        { name: 'Luma' },
        { name: 'Kling' },
        { name: 'Runway' }
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
      id: 'Search',
      name: 'Stock / Search',
      icon: 'fas fa-search',
      description: 'Media discovery and stock resource lookup APIs',
      providers: [
        { name: 'Pexels' },
        { name: 'Pixabay' },
        { name: 'Serper' },
        { name: 'Tavily' }
      ]
    }
  ];

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.api.getBrainSettings().subscribe({
      next: (data) => {
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
      },
      complete: () => this.loading.set(false)
    });
  }

  // ── Category helpers ────────────────────────────────────────────────
  getCategoryInfo(type: string): CategoryInfo {
    return this.categories.find(c => c.id === type) ?? { id: type, name: type, icon: 'fas fa-brain', description: '', providers: [] };
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

  toggleEnabled(setting: BrainSettingsDto, event: Event) {
    event.stopPropagation();
    const checkbox = event.target as HTMLInputElement;
    setting.isEnabled = checkbox.checked;
    this.saveAll(setting);
  }

  // ── Virtual / Placeholder keys mapping ──────────────────────────────
  isVirtualKey(keyId: string): boolean {
    return (keyId || '').startsWith('virtual-');
  }

  getCategoryKeysForDisplay(setting: BrainSettingsDto): BrainApiKeyDto[] {
    const keysList: BrainApiKeyDto[] = [];

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

  toggleRow(keyId: string) {
    const current = this.getRowState(keyId);
    this.updateRowState(keyId, { isOpen: !current.isOpen, testResult: null, saveStatus: 'idle', saveMessage: null });
  }

  toggleShowKey(keyId: string, event: Event) {
    event.stopPropagation();
    const current = this.getRowState(keyId);
    this.updateRowState(keyId, { showKey: !current.showKey });
  }

  // ── CRUD operations ─────────────────────────────────────────────────
  addKey(setting: BrainSettingsDto) {
    const newKey: BrainApiKeyDto = {
      id: crypto.randomUUID(),
      key: '',
      isBlocked: false,
      usageCount: 0,
      provider: setting.provider || '',
      modelName: null,
      roleName: null,
      isFree: false,
      customLabel: null
    };
    setting.apiKeys = [...setting.apiKeys, newKey];
    // Auto-open the new row
    this.keyRowStates.update(prev => ({
      ...prev,
      [newKey.id]: { ...this.defaultRowState(), isOpen: true }
    }));
  }

  removeKey(setting: BrainSettingsDto, key: BrainApiKeyDto) {
    const provider = key.provider || setting.provider || 'this provider';
    if (this.pendingRemoveKeyId() !== key.id) {
      this.pendingRemoveKeyId.set(key.id);
      this.toast.show(`Click remove again to delete the ${provider} key.`, 'warning', 5000);
      setTimeout(() => {
        if (this.pendingRemoveKeyId() === key.id) {
          this.pendingRemoveKeyId.set(null);
        }
      }, 5000);
      return;
    }

    this.pendingRemoveKeyId.set(null);
    setting.apiKeys = setting.apiKeys.filter(k => k !== key);
    this.saveAll(setting, `${provider} key removed.`);
  }

  saveKey(setting: BrainSettingsDto, key: BrainApiKeyDto) {
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
      const newKey: BrainApiKeyDto = {
        ...key,
        id: crypto.randomUUID(),
        key: key.key?.trim() ?? '',
        provider: key.provider || setting.provider,
        modelName: this.nullableText(key.modelName),
        roleName: this.nullableText(key.roleName),
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
    setting: BrainSettingsDto,
    successMessage = 'Brain settings saved.',
    afterSuccess?: () => void,
    afterError?: () => void,
    preferredKey?: BrainApiKeyDto
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
    this.api.saveBrainSettings(payload).subscribe({
      next: () => {
        afterSuccess?.();
        this.toast.success(successMessage);
        this.load();
      },
      error: () => {
        afterError?.();
        this.toast.error('Failed to save brain settings.');
      }
    });
  }

  getDefaultModelForProvider(type: string, provider: string): string {
    const models = getProviderModels(type, provider);
    return models.length > 0 ? models[0].id : '';
  }

  testKey(keyId: string, event: Event) {
    event.stopPropagation();
    this.updateRowState(keyId, { isTesting: true, testResult: null });
    this.api.testKey(keyId).subscribe({
      next: (res) => this.updateRowState(keyId, { isTesting: false, testResult: res }),
      error: () => this.updateRowState(keyId, { isTesting: false, testResult: { success: false, message: 'Connection failed' } })
    });
  }

  // ── Model constants ─────────────────────────────────────────────────
  getModelsForKey(key: BrainApiKeyDto, setting: BrainSettingsDto): AIModelOption[] {
    const provider = key.provider || setting.provider;
    return getProviderModels(setting.type, provider);
  }

  getModelsForSetting(setting: BrainSettingsDto): AIModelOption[] {
    return getProviderModels(setting.type, setting.provider);
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
    if (p.includes('azure')) return 'assets/svg/azure.svg';
    if (p.includes('eleven')) return 'assets/svg/elevenlabs.svg';
    if (p.includes('cartesia')) return 'assets/svg/cartesia.svg';
    if (p.includes('pexels')) return 'assets/svg/pexels.svg';
    if (p.includes('pixabay')) return 'assets/svg/pixabay.svg';
    if (p.includes('ollama')) return 'assets/svg/ollama.svg';
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
    if (p.includes('azure')) return 'badge-blue';
    if (p.includes('eleven')) return 'badge-orange';
    if (p.includes('ollama')) return 'badge-orange';
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

  private getVirtualKeyDraft(setting: BrainSettingsDto, provider: AIProviderInfo): BrainApiKeyDto {
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

  canSaveKey(key: BrainApiKeyDto): boolean {
    return !this.isVirtualKey(key.id) || key.isFree || !!key.key?.trim();
  }

  getSaveStatusIcon(key: BrainApiKeyDto): string {
    const state = this.getRowState(key.id);
    if (state.isSaving) return 'fa-spinner fa-spin';
    if (state.saveStatus === 'success') return 'fa-check-circle';
    if (state.saveStatus === 'error') return 'fa-exclamation-circle';
    if (!this.canSaveKey(key)) return 'fa-key';
    return 'fa-save';
  }

  getSaveStatusText(key: BrainApiKeyDto): string {
    const state = this.getRowState(key.id);
    if (state.isSaving) return 'Saving changes';
    if (state.saveMessage) return state.saveMessage;
    if (!this.canSaveKey(key)) return 'API key required';
    return this.isVirtualKey(key.id) ? 'Ready to save' : 'Ready';
  }

  trackByKeyId(_: number, key: BrainApiKeyDto) { return key.id; }
  trackBySettingId(_: number, s: BrainSettingsDto) { return s.id; }
}
