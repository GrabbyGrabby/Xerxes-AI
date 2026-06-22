import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

const fallbackModels = [
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
    let models = [];
    
    // Fetch models from Supabase
    const { data, error } = await supabaseServer.from('models').select('*').eq('is_active', true);
    
    if (error || !data || data.length === 0) {
      console.warn('Supabase models query failed, using default fallback models:', error);
      models = fallbackModels;
    } else {
      // Filter data to only include minimax-m3, deepseek-v4-flash and gemini models
      models = data.filter((m: any) => 
        m.id === 'minimaxai/minimax-m3' || 
        m.id === 'deepseek-ai/deepseek-v4-flash' || 
        m.provider === 'gemini'
      );
      if (models.length === 0) models = fallbackModels;
    }

    // Attach dynamic health state based on environment keys
    const health = {
      nvidia: !!process.env.NVIDIA_NIM_API_KEY,
      gemini: !!process.env.GEMINI_API_KEY,
    };

    const modelsWithHealth = models.map((m) => {
      const providerId = m.provider.toLowerCase();
      const isHealthy = health[providerId as keyof typeof health] ?? false;
      return {
        ...m,
        is_healthy: isHealthy,
      };
    });

    return NextResponse.json({ models: modelsWithHealth });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
