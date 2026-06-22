import { NextRequest } from 'next/server';
import { getAuthSession, AuthSession } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import { getProvider, ChatMessage, ToolDef } from '@/lib/providers';
import { getEncoding } from 'js-tiktoken';

export const dynamic = 'force-dynamic';

const enc = getEncoding('cl100k_base');

// Define tools available to the agentic loop
const AGENT_TOOLS: ToolDef[] = [
  {
    type: 'function',
    function: {
      name: 'web_search',
      description: 'Search the web for up-to-date information on a specific topic.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query to look up.',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'file_qa',
      description: 'Search the text contents of the user\'s uploaded files.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The query word or phrase to look for inside uploaded files.',
          },
        },
        required: ['query'],
      },
    },
  },
];

// Helper to execute tools
async function executeTool(name: string, argsStr: string, session: AuthSession): Promise<string> {
  let args = { query: '' };
  try {
    args = JSON.parse(argsStr);
  } catch (e) {
    console.error('Failed to parse tool arguments:', argsStr);
  }
  
  const query = args.query || '';

  if (name === 'web_search') {
    // Return mock search listings
    return `[Web Search Results for "${query}"]:
- Next.js 14 App Router features Server-side Rendering (SSR) and React Server Components (RSC) to serve dynamic content without client-side JS overhead.
- Pinata IPFS gateway provides secure, scalable decentralized storage for media, PDF assets, and images with fast globally distributed content delivery.
- Privy is a leading web3 developer wallet auth SDK that allows email, social, and embedded wallet logins seamlessly.`;
  }
  
  if (name === 'file_qa') {
    try {
      // Find matching chunks inside the database for files owned by this user/guest
      let queryBuilder = supabaseServer
        .from('file_chunks')
        .select('chunk_text, files!inner(filename, user_id, guest_id)')
        .ilike('chunk_text', `%${query}%`);

      if (session.userId) {
        queryBuilder = queryBuilder.eq('files.user_id', session.userId);
      } else if (session.guestId) {
        queryBuilder = queryBuilder.eq('files.guest_id', session.guestId);
      } else {
        return 'No user/guest identity associated with file search.';
      }

      const { data, error } = await queryBuilder.limit(3);

      if (error || !data || data.length === 0) {
        return `[File Q&A search for "${query}"]: No matching text segments were found in your uploaded files. Try uploading a text, CSV or PDF document first.`;
      }

      return data
        .map((d: any) => `[From file "${d.files.filename}"]: ${d.chunk_text}`)
        .join('\n\n');
    } catch (e: any) {
      console.error('File QA search execution failed:', e);
      return `Error querying user files: ${e.message}`;
    }
  }

  return `Tool ${name} executed successfully.`;
}

export async function POST(req: NextRequest) {
  // 1. Establish SSE headers
  const responseHeaders = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
  });

  // 2. Validate Session Auth
  const session = await getAuthSession(req);
  if (!session.userId && !session.guestId) {
    return new Response(JSON.stringify({ error: 'Unauthorized credentials' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const body = await req.json();
  let { conversationId, messages, modelId, images } = body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: 'Messages history is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!modelId) {
    return new Response(JSON.stringify({ error: 'Model ID is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 3. Resolve Model configuration statically (database query bypassed to avoid openzen fallback errors)
  const SUPPORTED_MODELS = [
    { id: 'minimaxai/minimax-m3', provider: 'nvidia', credit_cost_per_1k_input: 1, credit_cost_per_1k_output: 1, supports_tools: true },
    { id: 'deepseek-ai/deepseek-v4-flash', provider: 'nvidia', credit_cost_per_1k_input: 1, credit_cost_per_1k_output: 1, supports_tools: true },
    { id: 'gemini-2.5-pro', provider: 'gemini', credit_cost_per_1k_input: 1, credit_cost_per_1k_output: 2, supports_tools: true },
    { id: 'gemini-2.5-flash', provider: 'gemini', credit_cost_per_1k_input: 1, credit_cost_per_1k_output: 1, supports_tools: true },
    { id: 'gemini-2.0-flash', provider: 'gemini', credit_cost_per_1k_input: 1, credit_cost_per_1k_output: 1, supports_tools: true },
    { id: 'gemini-1.5-pro', provider: 'gemini', credit_cost_per_1k_input: 1, credit_cost_per_1k_output: 2, supports_tools: true },
    { id: 'gemini-1.5-flash', provider: 'gemini', credit_cost_per_1k_input: 1, credit_cost_per_1k_output: 1, supports_tools: true }
  ];

  const modelInfo = SUPPORTED_MODELS.find((m) => m.id === modelId);

  if (!modelInfo) {
    return new Response(JSON.stringify({ error: `Model "${modelId}" is not supported.` }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const creditCostIn = Number(modelInfo?.credit_cost_per_1k_input ?? 1);
  const creditCostOut = Number(modelInfo?.credit_cost_per_1k_output ?? 1);
  const providerName = modelInfo?.provider ?? (process.env.GEMINI_API_KEY ? 'gemini' : 'nvidia');
  const supportsTools = modelInfo?.supports_tools ?? true;

  let balance = 0;
  if (session.userId) {
    const { data: p } = await supabaseServer.from('profiles').select('credits').eq('id', session.userId).single();
    balance = p?.credits ?? 0;
  } else {
    const { data: g } = await supabaseServer.from('guest_sessions').select('credits').eq('guest_id', session.guestId).single();
    balance = g?.credits ?? 0;
  }

  // Calculate input tokens
  const fullTextContext = messages.map((m) => m.content).join(' ');
  const inputTokens = enc.encode(fullTextContext).length;
  const estimatedCost = (inputTokens * creditCostIn) / 1000;

  if (balance < estimatedCost) {
    return new Response(JSON.stringify({ error: 'Insufficient credits. Please top up your wallet.' }), {
      status: 402,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 4. Return SSE ReadableStream
  const stream = new ReadableStream({
    async start(controller) {
      const sendSSE = (event: string, data: any) => {
        controller.enqueue(new TextEncoder().encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      try {
        let history = [...messages];
        let toolLoopCount = 0;
        const maxToolSteps = 5;
        let isFinalAnswerGenerated = false;
        let totalOutputTokens = 0;
        let accumulatedText = '';

        // Select LLM provider
        let activeProvider = getProvider(providerName);
        
        // Check if provider is configured (mock fallback removed)
        const isProviderConfigured =
          (providerName === 'nvidia' && process.env.NVIDIA_NIM_API_KEY) ||
          (providerName === 'gemini' && process.env.GEMINI_API_KEY);

        if (!isProviderConfigured) {
          throw new Error(`API key for provider "${providerName}" is not configured in .env.local.`);
        }

        while (!isFinalAnswerGenerated && toolLoopCount < maxToolSteps) {
          let toolCallReceived = false;
          let pendingToolCall: any = null;

          // Call provider stream
          try {
            const providerStream = activeProvider.streamChat({
              messages: history,
              model: modelId,
              tools: supportsTools ? AGENT_TOOLS : undefined,
              images,
            });

            for await (const chunk of providerStream) {
              if (chunk.toolCall) {
                // Intercept tool call chunks
                toolCallReceived = true;
                if (!pendingToolCall) {
                  pendingToolCall = {
                    id: chunk.toolCall.id,
                    name: chunk.toolCall.function.name,
                    arguments: '',
                  };
                }
                pendingToolCall.arguments += chunk.toolCall.function.arguments;
              } else if (chunk.delta) {
                // Yield normal text deltas
                accumulatedText += chunk.delta;
                sendSSE('delta', { text: chunk.delta });
              }
            }
          } catch (streamError: any) {
            console.error(`Provider stream error for ${providerName}:`, streamError);
            sendSSE('error', {
              message: `Stream error on "${providerName}": ${streamError.message}`,
            });
            throw streamError;
          }

          if (toolCallReceived && pendingToolCall) {
            sendSSE('tool_start', {
              id: pendingToolCall.id,
              name: pendingToolCall.name,
              arguments: pendingToolCall.arguments,
            });

            // Execute tool
            const toolResult = await executeTool(pendingToolCall.name, pendingToolCall.arguments, session);

            sendSSE('tool_end', {
              id: pendingToolCall.id,
              name: pendingToolCall.name,
              result: toolResult,
            });

            // Append assistant tool_call message and tool response message to thread
            history.push({
              role: 'assistant',
              content: '',
              name: undefined,
              tool_call_id: undefined,
              // Format tool_calls object for openAI schema
              ...({
                tool_calls: [
                  {
                    id: pendingToolCall.id,
                    type: 'function',
                    function: {
                      name: pendingToolCall.name,
                      arguments: pendingToolCall.arguments,
                    },
                  },
                ],
              } as any),
            });

            history.push({
              role: 'tool',
              content: toolResult,
              name: pendingToolCall.name,
              tool_call_id: pendingToolCall.id,
            });

            toolLoopCount++;
          } else {
            // No tool call emitted, meaning we have the final text answer
            isFinalAnswerGenerated = true;
          }
        }

        // 5. Calculate Final Credits Spent
        totalOutputTokens = enc.encode(accumulatedText).length;
        const totalCost = Math.ceil(((inputTokens * creditCostIn) + (totalOutputTokens * creditCostOut)) / 1000);
        const finalCost = totalCost > 0 ? totalCost : 1; // min 1 credit per interaction

        // Write spend transaction
        const { error: ledgerError } = await supabaseServer
          .from('credit_transactions')
          .insert({
            user_id: session.userId || null,
            guest_id: session.guestId || null,
            amount: -finalCost,
            reason: `Chat completion using ${modelId}`,
            model_used: modelId,
            tokens_in: inputTokens,
            tokens_out: totalOutputTokens,
          });

        if (ledgerError) {
          console.error('Ledger spend write error:', ledgerError);
        }

        // Fetch updated balance
        let finalBalance = balance - finalCost;
        if (session.userId) {
          const { data: p } = await supabaseServer.from('profiles').select('credits').eq('id', session.userId).single();
          finalBalance = p?.credits ?? finalBalance;
        } else {
          const { data: g } = await supabaseServer.from('guest_sessions').select('credits').eq('guest_id', session.guestId).single();
          finalBalance = g?.credits ?? finalBalance;
        }

        // Send final transaction usage chunk
        sendSSE('usage', {
          creditsSpent: finalCost,
          newBalance: finalBalance,
          tokensIn: inputTokens,
          tokensOut: totalOutputTokens,
        });

      } catch (err: any) {
        console.error('SSE connection crashed:', err);
        sendSSE('error', { message: err.message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: responseHeaders });
}
