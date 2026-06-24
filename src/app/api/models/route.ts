import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const SUPPORTED_MODELS = [
  // NVIDIA NIM
  { id: 'minimaxai/minimax-m3', provider: 'nvidia', display_name: 'MiniMax M3 (NVIDIA)', description: 'Fast chat model by MiniMax', category: 'chat', credit_cost_per_1k_input: 0, credit_cost_per_1k_output: 0, supports_vision: true, supports_tools: true, is_active: true },
  { id: 'deepseek-ai/deepseek-v4-flash', provider: 'nvidia', display_name: 'DeepSeek V4 Flash (NVIDIA)', description: 'Reasoning model by DeepSeek', category: 'reasoning', credit_cost_per_1k_input: 0, credit_cost_per_1k_output: 0, supports_vision: false, supports_tools: true, is_active: true },
  
  // Gemini
  { id: 'gemini-2.5-pro', provider: 'gemini', display_name: 'Gemini 2.5 Pro', description: 'Advanced large context model', category: 'chat', credit_cost_per_1k_input: 0, credit_cost_per_1k_output: 0, supports_vision: true, supports_tools: true, is_active: true },
  { id: 'gemini-2.5-flash', provider: 'gemini', display_name: 'Gemini 2.5 Flash', description: 'Fast multimodal model', category: 'chat', credit_cost_per_1k_input: 0, credit_cost_per_1k_output: 0, supports_vision: true, supports_tools: true, is_active: true },
  { id: 'gemini-2.0-flash', provider: 'gemini', display_name: 'Gemini 2.0 Flash', description: 'Lightweight and fast', category: 'chat', credit_cost_per_1k_input: 0, credit_cost_per_1k_output: 0, supports_vision: true, supports_tools: true, is_active: true },
  { id: 'gemini-1.5-pro', provider: 'gemini', display_name: 'Gemini 1.5 Pro', description: 'Solid reasoning capabilities', category: 'chat', credit_cost_per_1k_input: 0, credit_cost_per_1k_output: 0, supports_vision: true, supports_tools: true, is_active: true },
  { id: 'gemini-1.5-flash', provider: 'gemini', display_name: 'Gemini 1.5 Flash', description: 'Quick responses', category: 'chat', credit_cost_per_1k_input: 0, credit_cost_per_1k_output: 0, supports_vision: true, supports_tools: true, is_active: true },

  // OpenRouter (Free/Standard)
  { id: 'deepseek/deepseek-r1', provider: 'openrouter', display_name: 'DeepSeek R1 (OpenRouter)', description: 'State-of-the-art reasoning model', category: 'reasoning', credit_cost_per_1k_input: 0, credit_cost_per_1k_output: 0, supports_vision: false, supports_tools: false, is_active: true },
  { id: 'google/gemini-2.0-flash', provider: 'openrouter', display_name: 'Gemini 2.0 Flash (OpenRouter)', description: 'Google Gemini via OpenRouter', category: 'chat', credit_cost_per_1k_input: 0, credit_cost_per_1k_output: 0, supports_vision: true, supports_tools: true, is_active: true },
  { id: 'meta-llama/llama-3.3-70b-instruct:free', provider: 'openrouter', display_name: 'Llama 3.3 70B (OpenRouter Free)', description: 'Powerful Meta LLM', category: 'chat', credit_cost_per_1k_input: 0, credit_cost_per_1k_output: 0, supports_vision: false, supports_tools: true, is_active: true },

  // Mistral AI
  { id: 'mistral-large-latest', provider: 'mistral', display_name: 'Mistral Large', description: 'Flagship reasoning and agentic model', category: 'reasoning', credit_cost_per_1k_input: 0, credit_cost_per_1k_output: 0, supports_vision: true, supports_tools: true, is_active: true },
  { id: 'mistral-small-latest', provider: 'mistral', display_name: 'Mistral Small', description: 'Fast and efficient everyday model', category: 'chat', credit_cost_per_1k_input: 0, credit_cost_per_1k_output: 0, supports_vision: false, supports_tools: true, is_active: true },
  { id: 'codestral-latest', provider: 'mistral', display_name: 'Codestral', description: 'State-of-the-art coding and math model', category: 'coding', credit_cost_per_1k_input: 0, credit_cost_per_1k_output: 0, supports_vision: false, supports_tools: true, is_active: true },
];

export async function GET(req: NextRequest) {
  try {
    // Attach dynamic health state based on environment keys
    const health = {
      nvidia: !!process.env.NVIDIA_NIM_API_KEY,
      gemini: !!process.env.GEMINI_API_KEY,
      openrouter: !!process.env.OPENROUTER_API_KEY,
      mistral: !!process.env.MISTRAL_API_KEY,
    };

    const modelsWithHealth = SUPPORTED_MODELS
      .map((m) => {
        const providerId = m.provider.toLowerCase();
        const isHealthy = health[providerId as keyof typeof health] ?? false;
        return {
          ...m,
          is_healthy: isHealthy,
        };
      })
      .filter((m) => m.is_healthy);

    return NextResponse.json({ models: modelsWithHealth });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
