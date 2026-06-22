import { ChatProvider, StreamChunk } from './types';
import { streamOpenAICompatible } from './openai-base';

export const gemini: ChatProvider = {
  id: 'gemini',
  async *streamChat(params): AsyncIterable<StreamChunk> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is missing');
    }
    yield* streamOpenAICompatible({
      apiKey,
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
      model: params.model,
      messages: params.messages,
      tools: params.tools,
      images: params.images,
    });
  },
};
