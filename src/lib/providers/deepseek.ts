import { ChatProvider, StreamChunk } from './types';
import { streamOpenAICompatible } from './openai-base';

export const deepseek: ChatProvider = {
  id: 'deepseek',
  async *streamChat(params): AsyncIterable<StreamChunk> {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      throw new Error('DEEPSEEK_API_KEY is missing');
    }
    yield* streamOpenAICompatible({
      apiKey,
      baseUrl: 'https://api.deepseek.com/v1',
      model: params.model,
      messages: params.messages,
      tools: params.tools,
      images: params.images,
    });
  },
};
