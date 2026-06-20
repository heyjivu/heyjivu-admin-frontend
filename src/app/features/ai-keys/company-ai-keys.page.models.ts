import { TestKeyResult } from './services/company-ai-keys-api.service';

export interface AIProviderInfo {
  name: string;
  isFree?: boolean;
}

export interface CategoryInfo {
  id: string;
  name: string;
  icon: string;
  description: string;
  providers: AIProviderInfo[];
}

export type KeySaveStatus = 'idle' | 'success' | 'error';

export interface KeyRowState {
  isOpen: boolean;
  showKey: boolean;
  isTesting: boolean;
  isSaving: boolean;
  testResult: TestKeyResult | null;
  saveStatus: KeySaveStatus;
  saveMessage: string | null;
}

export interface ModalByocDraft {
  tokenId: string;
  tokenSecret: string;
  huggingFaceToken: string;
  showSecret: boolean;
  showHuggingFaceToken: boolean;
  preset: string;
  gpu: string;
  model: string;
}
