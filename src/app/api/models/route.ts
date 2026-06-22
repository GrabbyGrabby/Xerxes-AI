import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const SUPPORTED_MODELS = [
  { id: 'minimaxai/minimax-m3', provider: 'nvidia', display_name: 'MiniMax M3 (NVIDIA)', credit_cost_per_1k_input: 1, credit_cost_per_1k_output: 1, supports_vision: true, supports_tools: true, is_active: true },
  { id: 'deepseek-ai/deepseek-v4-flash', provider: 'nvidia', display_name: 'DeepSeek V4 Flash (NVIDIA)', credit_cost_per_1k_input: 1, credit_cost_per_1k_output: 1, supports_vision: false, supports_tools: true, is_active: true },
  { id: 'gemini-2.5-pro', provider: 'gemini', display_name: 'Gemini 2.5 Pro', credit_cost_per_1k_input: 1, credit_cost_per_1k_output: 2, supports_vision: true, supports_tools: true, is_active: true },
  { id: 'gemini-2.5-flash', provider: 'gemini', display_name: 'Gemini 2.5 Flash', credit_cost_per_1k_input: 1, credit_cost_per_1k_output: 1, supports_vision: true, supports_tools: true, is_active: true },
  { id: 'gemini-2.0-flash', provider: 'gemini', display_name: 'Gemini 2.0 Flash', credit_cost_per_1k_input: 1, credit_cost_per_1k_output: 1, supports_vision: true, supports_tools: true, is_active: true },
  { id: 'gemini-1.5-pro', provider: 'gemini', display_name: 'Gemini 1.5 Pro', credit_cost_per_1k_input: 1, credit_cost_per_1k_output: 2, supports_vision: true, supports_tools: true, is_active: true },
  { id: 'gemini-1.5-flash', provider: 'gemini', display_name: 'Gemini 1.5 Flash', credit_cost_per_1k_input: 1, credit_cost_per_1k_output: 1, supports_vision: true, supports_tools: true, is_active: true }
];

export async function GET(req: NextRequest) {
  try {
    // Attach dynamic health state based on environment keys
    const health = {
      nvidia: !!process.env.NVIDIA_NIM_API_KEY,
      gemini: !!process.env.GEMINI_API_KEY,
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
