import { ChatProvider, StreamChunk } from './types';
import { streamOpenAICompatible } from './openai-base';

export const openrouter: ChatProvider = {
  id: 'openrouter',
  async *streamChat(params): AsyncIterable<StreamChunk> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY is missing');
    }
    yield* streamOpenAICompatible({
      apiKey,
      baseUrl: 'https://openrouter.ai/api/v1',
      model: params.model,
      messages: params.messages,
      tools: params.tools,
      images: params.images,
      headers: {
        'HTTP-Referer': 'https://freellm.net/',
        'X-Title': 'Agentic Grab',
      }
    });
  },
};
