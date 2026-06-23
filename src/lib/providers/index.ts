import { ChatProvider } from './types';
import { nvidia } from './nvidia';
import { deepseek } from './deepseek';
import { gemini } from './gemini';
import { openrouter } from './openrouter';

export * from './types';

export const providers: Record<string, ChatProvider> = {
  nvidia: nvidia,
  deepseek: deepseek,
  gemini: gemini,
  openrouter: openrouter,
};

export function getProvider(providerId: string): ChatProvider {
  const provider = providers[providerId.toLowerCase()];
  if (!provider) {
    throw new Error(`Provider "${providerId}" is not registered.`);
  }
  return provider;
}
