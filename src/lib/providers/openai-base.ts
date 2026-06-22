import { ChatMessage, ToolDef, StreamChunk, ToolCall } from './types';

export async function* streamOpenAICompatible(params: {
  apiKey: string;
  baseUrl: string;
  model: string;
  messages: ChatMessage[];
  tools?: ToolDef[];
  images?: string[];
}): AsyncIterable<StreamChunk> {
  const { apiKey, baseUrl, model, messages, tools, images } = params;

  // Format messages
  const formattedMessages = messages.map((msg) => {
    // If the message has images, format content as content array (vision API)
    if (msg.role === 'user' && images && images.length > 0) {
      const contentArray: any[] = [{ type: 'text', text: msg.content }];
      for (const img of images) {
        contentArray.push({
          type: 'image_url',
          image_url: {
            url: img.startsWith('http') || img.startsWith('data:') ? img : `https://gateway.pinata.cloud/ipfs/${img}`,
          },
        });
      }
      return {
        role: msg.role,
        content: contentArray,
      };
    }

    // Standard message
    const formatted: any = {
      role: msg.role,
      content: msg.content,
    };
    if (msg.name) formatted.name = msg.name;
    if (msg.tool_call_id) formatted.tool_call_id = msg.tool_call_id;
    return formatted;
  });

  const requestBody: any = {
    model,
    messages: formattedMessages,
    stream: true,
  };

  if (model === 'deepseek-ai/deepseek-v4-flash') {
    requestBody.chat_template_kwargs = { thinking: true, reasoning_effort: 'high' };
  }

  if (tools && tools.length > 0) {
    requestBody.tools = tools;
  }

  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM provider error (${response.status}): ${errorText || response.statusText}`);
  }

  if (!response.body) {
    throw new Error('LLM provider returned empty response body');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      
      // Save last unfinished line back to buffer
      buffer = lines.pop() || '';

      for (const line of lines) {
        const cleaned = line.trim();
        if (!cleaned) continue;

        if (cleaned.startsWith('data: ')) {
          const dataContent = cleaned.slice(6).trim();

          if (dataContent === '[DONE]') {
            return;
          }

          try {
            const parsed = JSON.parse(dataContent);
            const choice = parsed.choices?.[0];
            if (!choice) continue;

            const delta = choice.delta;
            const deltaText = delta?.content || '';
            const usage = parsed.usage || undefined;

            let toolCall: ToolCall | undefined = undefined;
            if (delta?.tool_calls?.[0]) {
              const tc = delta.tool_calls[0];
              toolCall = {
                id: tc.id || '',
                type: 'function',
                function: {
                  name: tc.function?.name || '',
                  arguments: tc.function?.arguments || '',
                },
              };
            }

            if (deltaText || toolCall || usage) {
              yield {
                delta: deltaText,
                toolCall,
                usage,
              };
            }
          } catch (err) {
            // Ignore parse errors for incomplete lines (in rare cases)
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
