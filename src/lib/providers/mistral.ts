import { ChatProvider, StreamChunk } from './types';
import { streamOpenAICompatible } from './openai-base';

export const mistral: ChatProvider = {
  id: 'mistral',
  async *streamChat(params): AsyncIterable<StreamChunk> {
    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) {
      throw new Error('MISTRAL_API_KEY is missing');
    }
    const baseUrl = process.env.MISTRAL_BASE_URL || 'https://api.mistral.ai/v1';
    yield* streamOpenAICompatible({
      apiKey,
      baseUrl,
      model: params.model,
      messages: params.messages,
      tools: params.tools,
      images: params.images,
    });
  },
};
