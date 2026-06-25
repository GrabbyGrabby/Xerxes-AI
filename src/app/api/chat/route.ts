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
  let { conversationId, messages, modelId, images, currentCredits } = body;

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
    // NVIDIA NIM
    { id: 'minimaxai/minimax-m3', provider: 'nvidia', category: 'chat', credit_cost_per_1k_input: 0, credit_cost_per_1k_output: 0, supports_tools: false },
    { id: 'deepseek-ai/deepseek-v4-flash', provider: 'nvidia', category: 'reasoning', credit_cost_per_1k_input: 0, credit_cost_per_1k_output: 0, supports_tools: true },
    
    // Gemini
    { id: 'gemini-2.5-pro', provider: 'gemini', category: 'chat', credit_cost_per_1k_input: 0, credit_cost_per_1k_output: 0, supports_tools: true },
    { id: 'gemini-2.5-flash', provider: 'gemini', category: 'chat', credit_cost_per_1k_input: 0, credit_cost_per_1k_output: 0, supports_tools: true },
    { id: 'gemini-2.0-flash', provider: 'gemini', category: 'chat', credit_cost_per_1k_input: 0, credit_cost_per_1k_output: 0, supports_tools: true },
    { id: 'gemini-1.5-pro', provider: 'gemini', category: 'chat', credit_cost_per_1k_input: 0, credit_cost_per_1k_output: 0, supports_tools: true },
    { id: 'gemini-1.5-flash', provider: 'gemini', category: 'chat', credit_cost_per_1k_input: 0, credit_cost_per_1k_output: 0, supports_tools: true },

    // OpenRouter (Free/Standard)
    { id: 'deepseek/deepseek-r1', provider: 'openrouter', category: 'reasoning', credit_cost_per_1k_input: 0, credit_cost_per_1k_output: 0, supports_tools: false },
    { id: 'google/gemini-2.0-flash', provider: 'openrouter', category: 'chat', credit_cost_per_1k_input: 0, credit_cost_per_1k_output: 0, supports_tools: true },
    { id: 'meta-llama/llama-3.3-70b-instruct:free', provider: 'openrouter', category: 'chat', credit_cost_per_1k_input: 0, credit_cost_per_1k_output: 0, supports_tools: true },

    // Mistral AI
    { id: 'mistral-large-latest', provider: 'mistral', category: 'reasoning', credit_cost_per_1k_input: 0, credit_cost_per_1k_output: 0, supports_tools: true },
    { id: 'mistral-small-latest', provider: 'mistral', category: 'chat', credit_cost_per_1k_input: 0, credit_cost_per_1k_output: 0, supports_tools: true },
    { id: 'codestral-latest', provider: 'mistral', category: 'coding', credit_cost_per_1k_input: 0, credit_cost_per_1k_output: 0, supports_tools: true },
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

  const isSupabaseConfigured = 
    process.env.NEXT_PUBLIC_SUPABASE_URL && 
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-supabase-project') &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    !process.env.SUPABASE_SERVICE_ROLE_KEY.includes('your-supabase-service-role-key');

  let balance = session.userId ? 500 : 50;
  if (typeof currentCredits === 'number') {
    balance = currentCredits;
  }

  if (isSupabaseConfigured) {
    try {
      if (session.userId) {
        let { data: profile } = await supabaseServer
          .from('profiles')
          .select('*')
          .eq('id', session.userId)
          .single();

        if (!profile) {
          // First login: Auto-create profile with 500
          await supabaseServer.from('profiles').insert({
            id: session.userId,
            credits: 500,
          });
          await supabaseServer.from('credit_transactions').insert({
            user_id: session.userId,
            amount: 500,
            reason: 'Initial Sign-up Credit Grant',
          });
          balance = 500;
        } else {
          balance = profile.credits;
        }
      } else if (session.guestId) {
        let { data: guest } = await supabaseServer
          .from('guest_sessions')
          .select('*')
          .eq('guest_id', session.guestId)
          .single();

        if (!guest) {
          // First login: Auto-create guest session with 50
          await supabaseServer.from('guest_sessions').insert({
            guest_id: session.guestId,
            credits: 50,
          });
          await supabaseServer.from('credit_transactions').insert({
            guest_id: session.guestId,
            amount: 50,
            reason: 'Anonymous Guest Credit Grant',
          });
          balance = 50;
        } else {
          balance = guest.credits;
        }
      }
    } catch (dbErr) {
      console.error('Supabase query failed in chat, falling back to local balance:', dbErr);
    }
  }

  // Calculate input tokens
  const fullTextContext = messages.map((m) => m.content).join(' ');
  const inputTokens = enc.encode(fullTextContext).length;
  // Cost is 1 credit = 1 message per user request, so we check if balance is >= 1
  if (balance < 1) {
    return new Response(JSON.stringify({ error: 'Insufficient credits.' }), {
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
        let currentConversationId = conversationId;
        
        // Auto-create or ensure conversation exists in database
        if (isSupabaseConfigured) {
          try {
            const firstUserMsg = messages.find((m: any) => m.role === 'user')?.content || 'New Chat';
            const title = firstUserMsg.slice(0, 35) + (firstUserMsg.length > 35 ? '...' : '');

            if (!currentConversationId) {
              const { data: newConv, error: newConvErr } = await supabaseServer
                .from('conversations')
                .insert({
                  user_id: session.userId || null,
                  guest_id: session.guestId || null,
                  title: title,
                })
                .select('*')
                .single();

              if (!newConvErr && newConv) {
                currentConversationId = newConv.id;
              }
            } else {
              // Ensure conversation exists in DB since client generates local UUIDs first
              const { data: existingConv } = await supabaseServer
                .from('conversations')
                .select('id')
                .eq('id', currentConversationId)
                .single();

              if (!existingConv) {
                await supabaseServer
                  .from('conversations')
                  .insert({
                    id: currentConversationId,
                    user_id: session.userId || null,
                    guest_id: session.guestId || null,
                    title: title,
                  });
              }
            }
          } catch (dbErr) {
            console.error('Failed to ensure database conversation:', dbErr);
          }
        }

        // Always yield the active conversation ID immediately
        if (currentConversationId) {
          sendSSE('conversation_id', { conversationId: currentConversationId });
        }

        // Save incoming user message to database
        if (currentConversationId && isSupabaseConfigured) {
          try {
            const lastUserMsg = messages[messages.length - 1];
            if (lastUserMsg && lastUserMsg.role === 'user') {
              await supabaseServer
                .from('messages')
                .insert({
                  conversation_id: currentConversationId,
                  role: 'user',
                  content: lastUserMsg.content,
                });
            }
          } catch (dbErr) {
            console.error('Failed to save user message to database:', dbErr);
          }
        }

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
          (providerName === 'gemini' && process.env.GEMINI_API_KEY) ||
          (providerName === 'openrouter' && process.env.OPENROUTER_API_KEY) ||
          (providerName === 'mistral' && process.env.MISTRAL_API_KEY);

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

        // 5. Calculate Final Credits Spent (1 credit = 1 message)
        totalOutputTokens = enc.encode(accumulatedText).length;

        // Save assistant message to database
        if (currentConversationId && isSupabaseConfigured && accumulatedText) {
          try {
            await supabaseServer
              .from('messages')
              .insert({
                conversation_id: currentConversationId,
                role: 'assistant',
                content: accumulatedText,
                model_id: modelId,
              });
          } catch (dbErr) {
            console.error('Failed to save assistant message:', dbErr);
          }
        }

        const finalCost = 1;
        const finalBalance = balance - finalCost;

        if (isSupabaseConfigured) {
          try {
            // Write spend transaction
            await supabaseServer
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

            // Update database balance directly to match
            if (session.userId) {
              await supabaseServer
                .from('profiles')
                .update({ credits: finalBalance })
                .eq('id', session.userId);
            } else if (session.guestId) {
              await supabaseServer
                .from('guest_sessions')
                .update({ credits: finalBalance })
                .eq('guest_id', session.guestId);
            }
          } catch (dbErr) {
            console.error('Supabase write credits failed:', dbErr);
          }
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
