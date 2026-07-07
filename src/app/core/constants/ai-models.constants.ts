export interface AIModelOption {
  id: string;
  label: string;
}

/**
 * Admin model dropdowns — kept in lock-step with the trimmed AI-gateway-worker registry and the
 * user FE catalog (heyjivu-frontend .../ai-brain/model-catalog.ts). Only providers that have a
 * real gateway adapter for the category are listed, and every model id is one the gateway forwards
 * to a provider that actually hosts it (verified ~June 2026). Do NOT add a provider/model here
 * unless its adapter exists in cloudflare/ai-gateway-worker/src/categories/<cat>/providers AND it
 * is registered in registry.ts — otherwise the key 404s at runtime.
 *
 * Provider keys are the lowercase forms resolved by getProviderModels() below.
 */
export const AI_MODELS: Record<string, Record<string, AIModelOption[]>> = {
  text: {
    deepseek: [
      { id: 'deepseek-v4-flash', label: 'DeepSeek V4 Flash | $0.14/$0.28 per 1M' },
      { id: 'deepseek-v4-pro', label: 'DeepSeek V4 Pro (reasoning) | $1.74/$3.48 per 1M' }
    ],
    openrouter: [
      { id: 'openai/gpt-oss-120b:free', label: 'GPT-OSS 120B (free) | $0.00' },
      { id: 'deepseek/deepseek-v4-flash', label: 'DeepSeek V4 Flash (via OR) | $0.09/$0.18 per 1M' },
      { id: 'google/gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite | $0.10/$0.40 per 1M' },
      { id: 'google/gemini-3-flash-preview', label: 'Gemini 3 Flash (preview) | $0.50/$3.00 per 1M' }
    ]
  },
  whisper: {
    groq: [
      { id: 'whisper-large-v3-turbo', label: 'Whisper Large v3 Turbo | $0.04/hr' },
      { id: 'whisper-large-v3', label: 'Whisper Large v3 | $0.111/hr' }
    ],
    openrouter: [
      { id: 'qwen/qwen3-asr-flash-2026-02-10', label: 'Qwen3 ASR Flash (cheapest) | $35/1M' },
      { id: 'openai/gpt-4o-mini-transcribe', label: 'GPT-4o mini Transcribe | $1.25/$5 per 1M' },
      { id: 'openai/gpt-4o-transcribe', label: 'GPT-4o Transcribe | $2.50/$10 per 1M' }
    ]
  },
  imagegen: {
    modal: [
      { id: 'Qwen/Qwen-Image-Edit', label: 'Qwen-Image-Edit (self-hosted) | free' }
    ],
    together: [
      { id: 'black-forest-labs/FLUX.1-schnell-Free', label: 'FLUX.1 [schnell] (free) | $0.00' },
      { id: 'black-forest-labs/FLUX.1-dev', label: 'FLUX.1 [dev] | $0.025/img' },
      { id: 'black-forest-labs/FLUX1.1-pro', label: 'FLUX1.1 [pro] | $0.04/img' },
      { id: 'black-forest-labs/FLUX1.1-pro-ultra', label: 'FLUX1.1 [pro] ultra | $0.06/img' }
    ],
    openrouter: [
      { id: 'bytedance-seed/seedream-4.5', label: 'Seedream 4.5 (flat) | $0.04/img' },
      { id: 'black-forest-labs/flux.2-klein-4b', label: 'FLUX.2 Klein 4B (cheap) | ~$0.015/MP' },
      { id: 'google/gemini-2.5-flash-image', label: 'Gemini 2.5 Flash Image (Nano Banana) | $0.30/$2.50 per 1M' },
      { id: 'openai/gpt-5-image-mini', label: 'GPT-5 Image mini | $2.50/$2.00 per 1M' }
    ]
  },
  vision: {
    gemini: [
      { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash | Free tier' },
      { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash | Free tier' },
      { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro | $1.25/$10 per 1M' }
    ],
    openai: [
      { id: 'gpt-4o-mini', label: 'GPT-4o mini | $0.15/$0.60 per 1M' },
      { id: 'gpt-4.1-mini', label: 'GPT-4.1 mini | $0.40/$1.60 per 1M' },
      { id: 'gpt-4.1', label: 'GPT-4.1 | $2.00/$8.00 per 1M' },
      { id: 'gpt-4o', label: 'GPT-4o | $2.50/$10 per 1M' }
    ]
  },
  videogen: {
    modal: [
      { id: 'Wan-AI/Wan2.2-I2V-A14B', label: 'Wan2.2 I2V (self-hosted, distilled) | free' }
    ],
    openrouter: [
      { id: 'bytedance/seedance-2.0', label: 'Seedance 2.0 (cheapest) | $0.06726/sec' },
      { id: 'kwaivgi/kling-v3.0-std', label: 'Kling v3.0 Standard | $0.126/sec' },
      { id: 'google/veo-3.1', label: 'Veo 3.1 | $0.50/sec' },
      { id: 'openai/sora-2-pro', label: 'Sora 2 Pro (premium) | $0.30/sec' }
    ]
    // Together video intentionally omitted: its public video model-id strings are unverified and
    // it doesn't host Sora/Veo/Kling directly — route video through OpenRouter + Modal only.
  },
  tts: {
    modal: [
      { id: 'hexgrad/Kokoro-82M', label: 'Kokoro-82M (self-hosted) | free' }
    ],
    together: [
      { id: 'hexgrad/Kokoro-82M', label: 'Kokoro-82M | $10/1M chars' },
      { id: 'canopylabs/orpheus-3b-0.1-ft', label: 'Orpheus 3B | $15/1M chars' },
      { id: 'cartesia/sonic-2', label: 'Cartesia Sonic 2 | $65/1M chars' },
      { id: 'cartesia/sonic-3', label: 'Cartesia Sonic 3 | $65/1M chars' }
    ],
    openrouter: [
      { id: 'hexgrad/kokoro-82m', label: 'Kokoro-82M (via OR) | $0.62/1M tok' },
      { id: 'openai/gpt-4o-mini-tts', label: 'GPT-4o mini TTS | $0.60/$12 per 1M' }
    ],
    eleven: [
      { id: 'eleven_flash_v2_5', label: 'Eleven Flash v2.5 (cheap) | $50/1M chars' },
      { id: 'eleven_turbo_v2_5', label: 'Eleven Turbo v2.5 | $50/1M chars' },
      { id: 'eleven_multilingual_v2', label: 'Eleven Multilingual v2 | $100/1M chars' },
      { id: 'eleven_v3', label: 'Eleven v3 | $100/1M chars' }
    ]
  },
  embedding: {
    gemini: [
      { id: 'gemini-embedding-001', label: 'gemini-embedding-001 | $0.15/1M tokens' }
    ],
    openai: [
      { id: 'text-embedding-3-small', label: 'text-embedding-3-small | $0.02/1M tokens' },
      { id: 'text-embedding-3-large', label: 'text-embedding-3-large | $0.13/1M tokens' }
    ]
  }
};

export function getProviderModels(category: string, provider: string): AIModelOption[] {
  if (!provider) return [];
  const p = provider.toLowerCase();
  let catKey = (category || 'text').toLowerCase();

  // Normalize category names
  if (catKey === 'picture' || catKey === 'image') catKey = 'imagegen';
  if (catKey === 'video') catKey = 'videogen';
  if (catKey === 'audio') catKey = 'tts';
  if (catKey === 'stockmedia' || catKey === 'stock' || catKey === 'websearch' || catKey === 'web') return [];

  const categoryModels = AI_MODELS[catKey] || AI_MODELS['text'];

  // Resolve provider key (only providers with a real gateway adapter are present above)
  let providerKey = p;
  if (p.includes('openrouter')) providerKey = 'openrouter';
  else if (p.includes('gemini') || p.includes('google')) providerKey = 'gemini';
  else if (p.includes('deepseek')) providerKey = 'deepseek';
  else if (p.includes('groq')) providerKey = 'groq';
  else if (p.includes('together')) providerKey = 'together';
  else if (p.includes('openai')) providerKey = 'openai';
  else if (p.includes('modal')) providerKey = 'modal';
  else if (p.includes('eleven')) providerKey = 'eleven';

  return categoryModels[providerKey] || [];
}
