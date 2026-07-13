import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { forkJoin, of } from 'rxjs';
import { environment } from '../../../../environments/environment';

const ADMIN_API = environment.apiUrl;

export interface CompanyAIKeyDto {
  id: string;
  key: string;
  isBlocked: boolean;
  usageCount: number;
  provider: string;
  modelName: string | null;
  roleName: string | null;
  isFree: boolean;
  priority?: number;
  cooldownUntil?: string | null;
  customLabel?: string | null;
  capabilities?: string[] | null;
  pricingProfile?: AIModelPricingProfileDto | null;
}

export interface CompanyAIKeySettingsDto {
  id: string;
  provider: string;
  model: string;
  isEnabled: boolean;
  type: string;
  apiKeys: CompanyAIKeyDto[];
}

export interface SaveCompanyAIKeySettingsRequest {
  provider: string;
  model: string;
  isEnabled: boolean;
  type: string;
  apiKeys: {
    id: string;
    key: string;
    isBlocked: boolean;
    usageCount: number;
    provider: string;
    modelName: string | null;
    roleName: string | null;
    isFree: boolean;
    customLabel?: string | null;
    capabilities?: string[] | null;
    pricingProfile?: AIModelPricingProfileDto | null;
  }[];
}

export type ModelBillingMode =
  | 'tokens'
  | 'per_image'
  | 'per_video'
  | 'per_second'
  | 'per_character'
  | 'per_audio_second'
  | 'per_request'
  | 'per_asset';

export interface AIModelPricingProfileDto {
  billingMode?: ModelBillingMode | string | null;
  inputPricePerMillion?: number | null;
  outputPricePerMillion?: number | null;
  imagePricePerUnit?: number | null;
  characterPricePerMillion?: number | null;
  audioPricePerSecond?: number | null;
  videoPricePerSecond?: number | null;
  videoPricePerUnit?: number | null;
  requestPricePerUnit?: number | null;
  supportedDurationsSeconds?: number[] | null;
  supportedVoices?: string[] | null;
  freeQuota?: number | null;
  freeQuotaResetPeriod?: string | null;
  pricingSource?: string | null;
}

export interface TestKeyResult {
  success: boolean;
  status?: string;
  latencyMs?: number;
  message?: string;
}

export interface PipelineTestResultDto {
  pipeline: string;
  category: string;
  provider: string;
  success: boolean;
  message?: string;
  latencyMs?: number;
  status?: string;
}

export interface ByocConfigurationDto {
  id: string;
  aiKeyId: string;
  provider: string;
  status: string;
  credentialsConfigured: boolean;
  huggingFaceTokenConfigured?: boolean;
  settingsJson?: string | null;
  endpointUrl?: string | null;
  workerVersion?: string | null;
  lastValidatedAt?: string | null;
  lastDeployedAt?: string | null;
  lastError?: string | null;
}

export interface ByocActionResponse {
  success: boolean;
  status: string;
  message?: string | null;
  latencyMs?: number | null;
  key: AdminCompanyAIKeyDto;
  configuration: ByocConfigurationDto;
}

export interface ModalByocUpsertRequest {
  aiKeyId?: string | null;
  category: string;
  tokenId?: string | null;
  tokenSecret?: string | null;
  preset?: string | null;
  gpu?: string | null;
  model?: string | null;
  label?: string | null;
  huggingFaceToken?: string | null;
}

export interface ModalByocDeployRequest {
  preset?: string | null;
  gpu?: string | null;
  model?: string | null;
}

export interface AdminCompanyAIKeyDto {
  id?: string;
  userId?: string | null;
  category: string;
  provider: string;
  apiKey?: string | null;
  modelOverride?: string | null;
  label?: string | null;
  priority: number;
  isActive: boolean;
  isBlocked?: boolean;
  cooldownUntil?: string | null;
  lastUsedAt?: string | null;
  usageCount?: number | null;
  capabilities?: string[] | null;
  pricingProfile?: AIModelPricingProfileDto | null;
}

const COMPANY_CATEGORIES: Array<{ id: string; providers: string[] }> = [
  { id: 'Text', providers: ['OpenAI', 'Gemini', 'DeepSeek', 'OpenRouter', 'Alibaba'] },
  { id: 'Embedding', providers: ['OpenAI', 'Gemini', 'OpenRouter'] },
  { id: 'Whisper', providers: ['Groq', 'OpenAI', 'OpenRouter'] },
  { id: 'ImageGen', providers: ['Gemini', 'OpenAI', 'TogetherAI', 'OpenRouter', 'StabilityAI', 'Alibaba', 'Modal'] },
  { id: 'Vision', providers: ['Gemini', 'OpenAI', 'OpenRouter'] },
  { id: 'VideoGen', providers: ['Alibaba', 'OpenRouter', 'Generic', 'Luma', 'Kling', 'Runway', 'Modal'] },
  { id: 'TTS', providers: ['TogetherAI', 'OpenRouter', 'Gemini', 'OpenAI', 'Azure', 'ElevenLabs', 'Cartesia', 'Alibaba', 'Modal'] },
  { id: 'StockMedia', providers: ['Pexels', 'Pixabay'] },
  { id: 'WebSearch', providers: ['Serper', 'Tavily'] },
  { id: 'Music', providers: ['TogetherAI'] }
];

@Injectable({ providedIn: 'root' })
export class AdminCompanyAIKeysApiService {
  private http = inject(HttpClient);

  getCompanyAIKeySettings(): Observable<CompanyAIKeySettingsDto[]> {
    return this.http.get<AdminCompanyAIKeyDto[]>(`${ADMIN_API}/admin/ai-keys`)
      .pipe(map(keys => this.toCompanyAIKeySettings(keys)));
  }

  saveCompanyAIKeySettings(settings: SaveCompanyAIKeySettingsRequest): Observable<void> {
    const requests = settings.apiKeys.map((key, index) =>
      this.http.put<AdminCompanyAIKeyDto>(`${ADMIN_API}/admin/ai-keys`, {
        id: key.id,
        category: settings.type,
        provider: key.provider || settings.provider,
        apiKey: key.key,
        modelOverride: key.modelName,
        label: key.customLabel,
        priority: index,
        isActive: settings.isEnabled,
        capabilities: key.capabilities ?? null,
        pricingProfile: key.pricingProfile ?? null
      })
    );

    const save$ = requests.length > 0 ? forkJoin(requests) : of([]);
    return save$.pipe(
      switchMap(() => {
        const orderedKeyIds = settings.apiKeys
          .map(key => key.id)
          .filter(id => !!id && !id.startsWith('virtual-'));

        return orderedKeyIds.length > 1
          ? this.reorderKeys(settings.type, orderedKeyIds)
          : of(void 0);
      }),
      map(() => void 0)
    );
  }

  testKey(keyId: string): Observable<TestKeyResult> {
    return this.http.post<TestKeyResult>(`${ADMIN_API}/admin/ai-keys/test/${keyId}`, {});
  }

  deleteKey(keyId: string): Observable<void> {
    return this.http.delete<void>(`${ADMIN_API}/admin/ai-keys/${keyId}`);
  }

  testAllKeys(): Observable<PipelineTestResultDto[]> {
    return this.http.post<PipelineTestResultDto[]>(`${ADMIN_API}/admin/ai-keys/test-all`, {});
  }

  reorderKeys(category: string, orderedKeyIds: string[]): Observable<void> {
    return this.http.patch<void>(`${ADMIN_API}/admin/ai-keys/reorder`, { category, orderedKeyIds });
  }

  getByocConfiguration(id: string): Observable<ByocActionResponse> {
    return this.http.get<ByocActionResponse>(`${ADMIN_API}/admin/ai-keys/byoc/${id}`);
  }

  upsertModalByoc(request: ModalByocUpsertRequest): Observable<ByocActionResponse> {
    return this.http.put<ByocActionResponse>(`${ADMIN_API}/admin/ai-keys/byoc/modal`, request);
  }

  validateModalByoc(id: string): Observable<ByocActionResponse> {
    return this.http.post<ByocActionResponse>(`${ADMIN_API}/admin/ai-keys/byoc/modal/${id}/validate`, {});
  }

  deployModalByoc(id: string, request: ModalByocDeployRequest): Observable<ByocActionResponse> {
    return this.http.post<ByocActionResponse>(`${ADMIN_API}/admin/ai-keys/byoc/modal/${id}/deploy`, request);
  }

  private toCompanyAIKeySettings(keys: AdminCompanyAIKeyDto[]): CompanyAIKeySettingsDto[] {
    return COMPANY_CATEGORIES.map(category => {
      const categoryKeys = keys
        .filter(key => this.sameCategory(key.category, category.id))
        .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
      const firstKey = categoryKeys[0];
      const provider = firstKey?.provider ?? category.providers[0] ?? '';

      return {
        id: category.id,
        provider,
        model: firstKey?.modelOverride ?? '',
        isEnabled: categoryKeys.length === 0 || categoryKeys.some(key => key.isActive),
        type: category.id,
        apiKeys: categoryKeys.map(key => ({
          id: key.id ?? `virtual-${crypto.randomUUID()}`,
          key: key.apiKey ?? '',
          isBlocked: !!key.isBlocked,
          cooldownUntil: key.cooldownUntil ?? null,
          usageCount: key.usageCount ?? 0,
          provider: key.provider,
          modelName: key.modelOverride ?? null,
          roleName: null,
          isFree: false,
          priority: key.priority ?? 0,
          customLabel: key.label ?? null,
          capabilities: key.capabilities ?? null,
          pricingProfile: key.pricingProfile ?? null
        }))
      };
    });
  }

  private sameCategory(value: string, expected: string): boolean {
    return value.toLowerCase() === expected.toLowerCase();
  }
}
