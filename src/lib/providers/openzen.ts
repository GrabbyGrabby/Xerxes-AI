import { ChatProvider, StreamChunk, ChatMessage } from './types';

export const openZen: ChatProvider = {
  id: 'openzen',
  async *streamChat(params): AsyncIterable<StreamChunk> {
    const { messages, tools } = params;

    // Check if the last message is from a tool. If so, we are in the second turn (synthesizing)
    const lastMessage = messages[messages.length - 1];
    
    // Simulate thinking time
    await new Promise((resolve) => setTimeout(resolve, 800));

    if (lastMessage && lastMessage.role === 'tool') {
      // Second Turn: Answer based on tool output
      const toolOutput = lastMessage.content;
      const responseText = `[OpenZen Agent] I have run the tool query and obtained the following results:\n\n> ${toolOutput}\n\nBased on this information, NexusAI is fully configured with Privy auth, Supabase ledger, Pinata IPFS metadata, and an interactive 3D particle canvas. Let me know if you would like me to explain any other system details!`;
      
      const words = responseText.split(' ');
      for (let i = 0; i < words.length; i++) {
        yield {
          delta: (i === 0 ? '' : ' ') + words[i],
        };
        await new Promise((resolve) => setTimeout(resolve, 15));
      }
      return;
    }

    // First Turn: Decide if we call a tool (if tools are provided)
    if (tools && tools.length > 0) {
      // Yield a simulated tool call chunk
      yield {
        delta: '',
        toolCall: {
          id: `call_${Math.random().toString(36).substr(2, 9)}`,
          type: 'function',
          function: {
            name: 'web_search',
            arguments: JSON.stringify({ query: 'NexusAI architecture and design system' }),
          },
        },
      };
      return;
    }

    // Default flow: direct conversation without tools
    const text = `This is a simulated response from the **OpenZen Agent**. 

I am functioning in offline/mock mode to help you verify your application flows. Here are some details about the current request:
- **Selected Model**: \`${params.model}\`
- **Number of messages**: ${params.messages.length}
- **Web3 Wallet / Auth Status**: Connected
- **Credits System**: Active & monitored

If you need to connect real models, please ensure that you have populated your \`.env.local\` file with appropriate API keys (e.g. \`OPENROUTER_API_KEY\`, \`GROQ_API_KEY\`, or \`NVIDIA_NIM_API_KEY\`).`;

    const words = text.split(' ');
    for (let i = 0; i < words.length; i++) {
      yield {
        delta: (i === 0 ? '' : ' ') + words[i],
      };
      await new Promise((resolve) => setTimeout(resolve, 15));
    }
  },
};
