import { ChatProvider } from './types';
import { openRouter } from './openrouter';
import { groq } from './groq';
import { nvidia } from './nvidia';
import { deepseek } from './deepseek';
import { openZen } from './openzen';
import { gemini } from './gemini';

export * from './types';

export const providers: Record<string, ChatProvider> = {
  openrouter: openRouter,
  groq: groq,
  nvidia: nvidia,
  deepseek: deepseek,
  openzen: openZen,
  gemini: gemini,
};

export function getProvider(providerId: string): ChatProvider {
  const provider = providers[providerId.toLowerCase()];
  if (!provider) {
    // Default to openZen mock provider for safety
    return openZen;
  }
  return provider;
}
export { openZen };
