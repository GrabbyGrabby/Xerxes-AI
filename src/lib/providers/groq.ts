import { ChatProvider, StreamChunk } from './types';
import { streamOpenAICompatible } from './openai-base';

export const groq: ChatProvider = {
  id: 'groq',
  async *streamChat(params): AsyncIterable<StreamChunk> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error('GROQ_API_KEY is missing');
    }
    yield* streamOpenAICompatible({
      apiKey,
      baseUrl: 'https://api.groq.com/openai/v1',
      model: params.model,
      messages: params.messages,
      tools: params.tools,
      images: params.images,
    });
  },
};
