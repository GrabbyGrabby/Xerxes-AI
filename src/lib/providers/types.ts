export interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant' | 'tool' | 'system';
  content: string;
  name?: string;
  tool_call_id?: string;
}

export interface ToolDef {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, any>;
  };
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface Usage {
  prompt_tokens: number;
  completion_tokens: number;
}

export interface StreamChunk {
  delta: string;
  toolCall?: ToolCall;
  usage?: Usage;
}

export interface ChatProvider {
  id: string;
  streamChat(params: {
    messages: ChatMessage[];
    model: string;
    tools?: ToolDef[];
    images?: string[];
  }): AsyncIterable<StreamChunk>;
}
