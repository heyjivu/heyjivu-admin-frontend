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

interface KeyRowState {
  isOpen: boolean;
  showKey: boolean;
  isTesting: boolean;
  isSaving: boolean;
  testResult: TestKeyResult | null;
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

  loading = signal(false);
  settings = signal<BrainSettingsDto[]>([]);
  openCategories = signal<Record<string, boolean>>({});
  keyRowStates = signal<Record<string, KeyRowState>>({});

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
        { name: 'OpenAI' }
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
        const states: Record<string, KeyRowState> = {};
        data.forEach(s => s.apiKeys.forEach(k => {
          states[k.id] = { isOpen: false, showKey: false, isTesting: false, isSaving: false, testResult: null };
        }));
        this.keyRowStates.set(states);
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
          keysList.push({
            id: `virtual-${setting.type}-${prov.name}`,
            key: '',
            isBlocked: false,
            usageCount: 0,
            provider: prov.name,
            modelName: null,
            roleName: null,
            isFree: prov.isFree || false,
            customLabel: null
          });
        }
      });
    }

    return keysList;
  }

  // ── Key row state helpers ────────────────────────────────────────────
  getRowState(keyId: string): KeyRowState {
    return this.keyRowStates()[keyId] ?? { isOpen: false, showKey: false, isTesting: false, isSaving: false, testResult: null };
  }

  updateRowState(keyId: string, patch: Partial<KeyRowState>) {
    this.keyRowStates.update(prev => ({
      ...prev,
      [keyId]: { ...(prev[keyId] ?? { isOpen: false, showKey: false, isTesting: false, isSaving: false, testResult: null }), ...patch }
    }));
  }

  toggleRow(keyId: string) {
    const current = this.getRowState(keyId);
    this.updateRowState(keyId, { isOpen: !current.isOpen, testResult: null });
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
      [newKey.id]: { isOpen: true, showKey: false, isTesting: false, isSaving: false, testResult: null }
    }));
  }

  removeKey(setting: BrainSettingsDto, key: BrainApiKeyDto) {
    if (!confirm(`Remove this key for ${key.provider || setting.provider}?`)) return;
    setting.apiKeys = setting.apiKeys.filter(k => k !== key);
  }

  saveKey(setting: BrainSettingsDto, key: BrainApiKeyDto) {
    if (this.isVirtualKey(key.id)) {
      if (!key.key) {
        alert('Please enter an API Key first.');
        return;
      }
      // Convert to a real key
      const newKey: BrainApiKeyDto = {
        ...key,
        id: crypto.randomUUID()
      };
      setting.apiKeys = [...setting.apiKeys, newKey];
    }
    this.saveAll(setting);
  }

  saveAll(setting: BrainSettingsDto) {
    // Automatically set default provider and default model from the first active key configured
    if (setting.apiKeys.length > 0) {
      setting.provider = setting.apiKeys[0].provider;
      setting.model = setting.apiKeys[0].modelName || this.getDefaultModelForProvider(setting.type, setting.provider);
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
        modelName: k.modelName,
        roleName: k.roleName,
        isFree: k.isFree,
        customLabel: k.customLabel
      }))
    };
    this.api.saveBrainSettings(payload).subscribe({
      next: () => this.load()
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

  trackByKeyId(_: number, key: BrainApiKeyDto) { return key.id; }
  trackBySettingId(_: number, s: BrainSettingsDto) { return s.id; }
}
