import { ChatProvider } from './types';
import { nvidia } from './nvidia';
import { deepseek } from './deepseek';
import { gemini } from './gemini';

export * from './types';

export const providers: Record<string, ChatProvider> = {
  nvidia: nvidia,
  deepseek: deepseek,
  gemini: gemini,
};

export function getProvider(providerId: string): ChatProvider {
  const provider = providers[providerId.toLowerCase()];
  if (!provider) {
    // Default to gemini or nvidia provider for safety
    return providers.gemini || providers.nvidia;
  }
  return provider;
}
