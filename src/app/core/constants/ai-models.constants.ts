export interface AIModelOption {
  id: string;
  label: string;
}

export const AI_MODELS: Record<string, Record<string, AIModelOption[]>> = {
  text: {
    openrouter: [
      { id: 'deepseek/deepseek-v4-flash', label: 'deepseek/deepseek-v4-flash | $0.14/1M' },
      { id: 'deepseek/deepseek-v4-pro', label: 'deepseek/deepseek-v4-pro | $0.87/1M' },
      { id: 'meta-llama/llama-4-scout', label: 'meta-llama/llama-4-scout | $0.20/1M' },
      { id: 'meta-llama/llama-4-maverick', label: 'meta-llama/llama-4-maverick | $0.77/1M' },
      { id: 'google/gemma-4-31b-it:free', label: 'google/gemma-4-31b-it:free | $0.00' },
      { id: 'qwen/qwen-3.7-max', label: 'qwen/qwen-3.7-max | $7.50/1M' },
      { id: 'anthropic/claude-4.7-opus', label: 'anthropic/claude-4.7-opus | $15.00/1M' },
      { id: 'nvidia/nemotron-3-nano:free', label: 'nvidia/nemotron-3-nano:free | $0.00' },
      { id: 'openai/gpt-oss-120b:free', label: 'openai/gpt-oss-120b:free | $0.00' },
      { id: 'microsoft/phi-4-mini', label: 'microsoft/phi-4-mini | $0.10/1M' }
    ],
    gemini: [
      { id: 'gemini-3.5-flash', label: 'gemini-3.5-flash | $0.35/1M' },
      { id: 'gemini-3.5-pro', label: 'gemini-3.5-pro | $1.25/1M' },
      { id: 'gemini-3.0-flash', label: 'gemini-3.0-flash | $0.10/1M' },
      { id: 'gemini-3.0-pro', label: 'gemini-3.0-pro | $1.00/1M' },
      { id: 'gemma-4-31b-it', label: 'gemma-4-31b-it | $0.37/1M' },
      { id: 'gemma-4-9b-it', label: 'gemma-4-9b-it | $0.15/1M' },
      { id: 'gemini-2.5-flash', label: 'gemini-2.5-flash | Free tier' },
      { id: 'gemini-2.5-pro', label: 'gemini-2.5-pro | Free tier' }
    ],
    deepseek: [
      { id: 'deepseek-v4-flash', label: 'deepseek-v4-flash | $0.14/1M' },
      { id: 'deepseek-v4-pro', label: 'deepseek-v4-pro | $0.87/1M' },
      { id: 'deepseek-v4-coder', label: 'deepseek-v4-coder | $0.14/1M' },
      { id: 'deepseek-chat', label: 'deepseek-chat | $0.10/1M' },
      { id: 'deepseek-reasoner', label: 'deepseek-reasoner | $0.25/1M' }
    ],
    groq: [
      { id: 'llama-4-scout-70b', label: 'llama-4-scout-70b | Free / $0.50/1M' },
      { id: 'llama-4-maverick-8b', label: 'llama-4-maverick-8b | Free / $0.15/1M' },
      { id: 'qwen-3.7-32b', label: 'qwen-3.7-32b | $0.25/1M' },
      { id: 'mixtral-8x22b', label: 'mixtral-8x22b | $0.40/1M' },
      { id: 'gemma-4-9b-it', label: 'gemma-4-9b-it | $0.10/1M' },
      { id: 'deepseek-r1-distill-70b', label: 'deepseek-r1-distill-70b | $0.60/1M' },
      { id: 'allam-2-7b', label: 'allam-2-7b | $0.10/1M' },
      { id: 'llama-3.3-70b-versatile', label: 'llama-3.3-70b-versatile | $0.40/1M' },
      { id: 'llama3-8b-8192', label: 'llama3-8b-8192 | $0.05/1M' }
    ],
    together: [
      { id: 'meta-llama/Llama-4-Scout-70B', label: 'Llama-4-Scout-70B | $0.50/1M' },
      { id: 'meta-llama/Llama-4-Maverick-8B', label: 'Llama-4-Maverick-8B | $0.15/1M' },
      { id: 'Qwen/Qwen-3.7-72B', label: 'Qwen-3.7-72B | $0.60/1M' },
      { id: 'deepseek-ai/DeepSeek-V4', label: 'DeepSeek-V4 | $0.80/1M' },
      { id: 'mistralai/Mistral-Saba-24B', label: 'Mistral-Saba-24B | $0.35/1M' },
      { id: 'meta-llama/Llama-3.3-70B-Instruct-Turbo', label: 'Llama-3.3-70B-Turbo | $0.45/1M' },
      { id: 'Qwen/Qwen2.5-72B-Instruct-Turbo', label: 'Qwen2.5-72B-Turbo | $0.40/1M' },
      { id: 'google/gemma-4-31b-it', label: 'Gemma-4-31B | $0.30/1M' }
    ],
    openai: [
      { id: 'gpt-4.5-turbo', label: 'gpt-4.5-turbo | $10.00/1M' },
      { id: 'gpt-4o-mini', label: 'gpt-4o-mini | $0.15/1M' },
      { id: 'gpt-4o', label: 'gpt-4o | $2.50/1M' },
      { id: 'o4-mini', label: 'o4-mini | $0.30/1M' },
      { id: 'o4-preview', label: 'o4-preview | $5.00/1M' },
      { id: 'o3-mini', label: 'o3-mini | $0.60/1M' },
      { id: 'gpt-oss-120b', label: 'gpt-oss-120b | $1.20/1M' }
    ],
    alibaba: [
      { id: 'qwen-3.7-max', label: 'qwen-3.7-max | $7.50/1M' },
      { id: 'qwen-3.7-plus', label: 'qwen-3.7-plus | $1.50/1M' },
      { id: 'qwen-3.7-turbo', label: 'qwen-3.7-turbo | $0.15/1M' },
      { id: 'qwen-3.5-coder', label: 'qwen-3.5-coder | $1.00/1M' },
      { id: 'qwen2.5-72b-instruct', label: 'qwen2.5-72b-instruct | $0.50/1M' }
    ]
  },
  imagegen: {
    openai: [
      { id: 'dall-e-4', label: 'dall-e-4 | $0.06/img' },
      { id: 'dall-e-3', label: 'dall-e-3 | $0.04/img' },
      { id: 'dall-e-2', label: 'dall-e-2 | $0.02/img' }
    ],
    gemini: [
      { id: 'imagen-4.0-generate', label: 'imagen-4.0 | $0.05/img' },
      { id: 'imagen-3.0-generate-001', label: 'imagen-3.0 | $0.03/img' }
    ],
    together: [
      { id: 'black-forest-labs/FLUX.2-schnell', label: 'FLUX.2-schnell | $0.015/img' },
      { id: 'black-forest-labs/FLUX.2-dev', label: 'FLUX.2-dev | $0.03/img' },
      { id: 'stabilityai/stable-diffusion-3.5-large', label: 'SD 3.5 Large | $0.03/img' },
      { id: 'stabilityai/stable-diffusion-xl-base-1.0', label: 'SDXL 1.0 | $0.005/img' },
      { id: 'runwayml/stable-diffusion-v1-5', label: 'SD 1.5 | $0.002/img' },
      { id: 'prompthero/openjourney', label: 'OpenJourney | $0.003/img' }
    ],
    stability: [
      { id: 'sd4-core', label: 'sd4-core | $0.03/img' },
      { id: 'sd4-ultra', label: 'sd4-ultra | $0.06/img' },
      { id: 'sd3.5-large', label: 'sd3.5-large | $0.03/img' },
      { id: 'sd3.5-turbo', label: 'sd3.5-turbo | $0.01/img' },
      { id: 'sd3-medium', label: 'sd3-medium | $0.01/img' }
    ],
    pollinations: [
      { id: 'flux', label: 'flux | Free' },
      { id: 'turbo', label: 'turbo | Free' },
      { id: 'default', label: 'default | Free' }
    ],
    alibaba: [
      { id: 'wanx-v2', label: 'wanx-v2 | $0.04/img' },
      { id: 'wanx-v1', label: 'wanx-v1 | $0.02/img' }
    ]
  },
  tts: {
    openai: [
      { id: 'tts-2', label: 'tts-2 | $0.02/1K chars' },
      { id: 'tts-2-hd', label: 'tts-2-hd | $0.04/1K chars' },
      { id: 'tts-1', label: 'tts-1 | $0.015/1K chars' },
      { id: 'tts-1-hd', label: 'tts-1-hd | $0.03/1K chars' }
    ],
    azure: [
      { id: 'en-US-AriaNeural', label: 'en-US-AriaNeural | $0.016/1K chars' },
      { id: 'en-US-JennyNeural', label: 'en-US-JennyNeural | $0.016/1K chars' },
      { id: 'en-US-GuyNeural', label: 'en-US-GuyNeural | $0.016/1K chars' },
      { id: 'en-US-DavisNeural', label: 'en-US-DavisNeural | $0.016/1K chars' },
      { id: 'en-GB-SoniaNeural', label: 'en-GB-SoniaNeural | $0.016/1K chars' },
      { id: 'en-GB-RyanNeural', label: 'en-GB-RyanNeural | $0.016/1K chars' },
      { id: 'en-AU-NatashaNeural', label: 'en-AU-NatashaNeural | $0.016/1K chars' }
    ],
    eleven: [
      { id: 'eleven_multilingual_v3', label: 'multilingual_v3 | $0.09/1K chars' },
      { id: 'eleven_turbo_v3', label: 'turbo_v3 | $0.04/1K chars' },
      { id: 'eleven_multilingual_v2', label: 'multilingual_v2 | $0.06/1K chars' },
      { id: 'eleven_monolingual_v1', label: 'monolingual_v1 | $0.04/1K chars' }
    ],
    cartesia: [
      { id: 'sonic-english-v2', label: 'sonic-english-v2 | $0.07/1K chars' },
      { id: 'sonic-english', label: 'sonic-english | $0.05/1K chars' },
      { id: 'sonic-multilingual', label: 'sonic-multilingual | $0.08/1K chars' }
    ],
    gemini: [
      { id: 'en-US-Journey-F', label: 'en-US-Journey-F | $0.016/1K chars' },
      { id: 'en-US-Journey-D', label: 'en-US-Journey-D | $0.016/1K chars' },
      { id: 'en-GB-Standard-A', label: 'en-GB-Standard-A | $0.016/1K chars' },
      { id: 'en-IN-Standard-A', label: 'en-IN-Standard-A | $0.016/1K chars' }
    ]
  },
  whisper: {
    openai: [
      { id: 'whisper-2', label: 'whisper-2 | $0.006/min' },
      { id: 'whisper-1', label: 'whisper-1 | $0.006/min' }
    ],
    groq: [
      { id: 'whisper-large-v3-turbo', label: 'whisper-turbo | Free / $0.003/min' },
      { id: 'whisper-large-v3', label: 'whisper-large-v3 | Free / $0.005/min' },
      { id: 'distil-whisper-large-v3-en', label: 'distil-whisper | Free' }
    ]
  },
  videogen: {
    alibaba: [
      { id: 'wanx-video-v2', label: 'wanx-video-v2 | $0.30/sec' },
      { id: 'wanx-video', label: 'wanx-video | $0.15/sec' }
    ],
    together: [
      { id: 'luma/ray-3.14', label: 'luma/ray-3.14 | $0.35/sec' },
      { id: 'runwayml/gen-4.5', label: 'runway/gen-4.5 | $0.50/sec' },
      { id: 'stabilityai/stable-video-diffusion-img2vid-xt', label: 'SVD-XT | $0.10/sec' }
    ],
    luma: [
      { id: 'ray-3.14', label: 'ray-3.14 | $0.35/sec' },
      { id: 'ray-3', label: 'ray-3 | $0.40/sec' }
    ],
    runway: [
      { id: 'gen-4.5', label: 'gen-4.5 | $0.50/sec' },
      { id: 'aleph-2.0', label: 'aleph-2.0 | $0.60/sec' }
    ],
    kling: [
      { id: 'kling-3.5', label: 'kling-3.5 | $0.45/sec' },
      { id: 'kling-3.0', label: 'kling-3.0 | $0.30/sec' }
    ]
  },
  vision: {
    openai: [
      { id: 'gpt-4.5-vision', label: 'gpt-4.5-vision | $10.00/1M' },
      { id: 'gpt-4o-mini', label: 'gpt-4o-mini | $0.15/1M' },
      { id: 'gpt-4o', label: 'gpt-4o | $2.50/1M' }
    ],
    gemini: [
      { id: 'gemini-3.5-flash', label: 'gemini-3.5-flash | $0.35/1M' },
      { id: 'gemini-3.5-pro', label: 'gemini-3.5-pro | $1.25/1M' },
      { id: 'gemini-2.5-flash', label: 'gemini-2.5-flash | Free tier' },
      { id: 'gemini-2.5-pro', label: 'gemini-2.5-pro | Free tier' }
    ],
    together: [
      { id: 'meta-llama/Llama-4-Vision-11B', label: 'Llama-4-Vision-11B | $0.20/1M' },
      { id: 'meta-llama/Llama-3.2-11B-Vision-Instruct-Turbo', label: 'Llama-3.2-11B | $0.15/1M' }
    ],
    groq: [
      { id: 'llama-4-vision-11b', label: 'llama-4-vision-11b | $0.20/1M' },
      { id: 'llama-3.2-11b-vision-preview', label: 'llama-3.2-11b | Free' }
    ],
    alibaba: [
      { id: 'qwen-vl-plus-v2', label: 'qwen-vl-plus-v2 | $0.50/1M' },
      { id: 'qwen-vl-max-v2', label: 'qwen-vl-max-v2 | $2.50/1M' },
      { id: 'qwen-vl-plus', label: 'qwen-vl-plus | $0.40/1M' },
      { id: 'qwen-vl-max', label: 'qwen-vl-max | $2.00/1M' }
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

  const categoryModels = AI_MODELS[catKey] || AI_MODELS['text'];

  // Resolve provider key
  let providerKey = p;
  if (p.includes('openrouter')) providerKey = 'openrouter';
  else if (p.includes('gemini') || p.includes('google')) providerKey = 'gemini';
  else if (p.includes('deepseek')) providerKey = 'deepseek';
  else if (p.includes('groq')) providerKey = 'groq';
  else if (p.includes('together')) providerKey = 'together';
  else if (p.includes('openai')) providerKey = 'openai';
  else if (p.includes('alibaba') || p.includes('dashscope') || p.includes('qwen')) providerKey = 'alibaba';
  else if (p.includes('stability')) providerKey = 'stability';
  else if (p.includes('pollinations')) providerKey = 'pollinations';
  else if (p.includes('azure')) providerKey = 'azure';
  else if (p.includes('eleven')) providerKey = 'eleven';
  else if (p.includes('cartesia')) providerKey = 'cartesia';
  else if (p.includes('luma')) providerKey = 'luma';
  else if (p.includes('runway')) providerKey = 'runway';
  else if (p.includes('kling')) providerKey = 'kling';
  else if (p.includes('serper')) providerKey = 'serper';
  else if (p.includes('tavily')) providerKey = 'tavily';

  return categoryModels[providerKey] || [];
}
