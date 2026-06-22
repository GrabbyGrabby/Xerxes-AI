import { ChatProvider, StreamChunk } from './types';
import { streamOpenAICompatible } from './openai-base';

export const nvidia: ChatProvider = {
  id: 'nvidia',
  async *streamChat(params): AsyncIterable<StreamChunk> {
    const apiKey = process.env.NVIDIA_NIM_API_KEY;
    if (!apiKey) {
      throw new Error('NVIDIA_NIM_API_KEY is missing');
    }
    yield* streamOpenAICompatible({
      apiKey,
      baseUrl: 'https://integrate.api.nvidia.com/v1',
      model: params.model,
      messages: params.messages,
      tools: params.tools,
      images: params.images,
    });
  },
};
