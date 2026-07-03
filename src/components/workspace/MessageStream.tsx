'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useSessionStore } from '@/store/useSessionStore';
import { usePrivy } from '@privy-io/react-auth';
import { Bot, User, Copy, Check, ArrowRight, Compass, ShieldAlert, Cpu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AgentStepCard from './AgentStepCard';
import XerxesSphere from '../three/XerxesSphere';
import { useTheme } from '../providers/ThemeContext';

const getModelDisplayName = (modelId: string | undefined, availableModels: any[]) => {
  if (!modelId) return '';
  const found = availableModels.find(m => m.id === modelId);
  if (found) return found.display_name;
  
  const map: Record<string, string> = {
    'minimaxai/minimax-m3': 'MiniMax M3',
    'deepseek-ai/deepseek-v4-flash': 'DeepSeek V4 Flash',
    'gemini-2.5-pro': 'Gemini 2.5 Pro',
    'gemini-2.5-flash': 'Gemini 2.5 Flash',
    'gemini-2.0-flash': 'Gemini 2.0 Flash',
    'gemini-1.5-pro': 'Gemini 1.5 Pro',
    'gemini-1.5-flash': 'Gemini 1.5 Flash',
  };
  return map[modelId] || modelId;
};

export default function MessageStream() {
  const { user } = usePrivy();
  const { themeMode } = useTheme();
  const messages = useSessionStore((state) => state.messages);
  const activeToolCalls = useSessionStore((state) => state.activeToolCalls);
  const isStreaming = useSessionStore((state) => state.isStreaming);
  const setActiveModelId = useSessionStore((state) => state.setActiveModelId);
  const availableModels = useSessionStore((state) => state.availableModels);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [copiedMessageIndex, setCopiedMessageIndex] = useState<number | null>(null);

  // Thinking phrases cycling logic
  const [thinkingPhraseIndex, setThinkingPhraseIndex] = useState(0);
  const thinkingPhrases = ['Thinking...', 'Scraping web...', 'Exploring...', 'Synthesizing...'];

  useEffect(() => {
    let interval: any;
    if (isStreaming) {
      interval = setInterval(() => {
        setThinkingPhraseIndex((prev) => (prev + 1) % 4);
      }, 1500);
    } else {
      setThinkingPhraseIndex(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isStreaming]);

  // Auto-scroll helper
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages, activeToolCalls]);

  // Scroll direction detection to hide/show top controls
  const setShowTopControls = useSessionStore((state) => state.setShowTopControls);
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let lastScrollTop = 0;
    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      // Scrolling down and scrolled past a tiny threshold (e.g. 50px)
      if (scrollTop > lastScrollTop && scrollTop > 50) {
        setShowTopControls(false);
      } else if (scrollTop < lastScrollTop) {
        // Scrolling up
        setShowTopControls(true);
      }
      lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [setShowTopControls]);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto px-4 py-6 space-y-6 scrollbar-none mt-2"
    >
      {messages.length === 0 ? (
        <motion.div
          layoutId="xerxes-header-container"
          className="flex flex-col justify-center items-center text-center p-6 space-y-3 max-w-3xl mx-auto select-none my-auto min-h-[55vh]"
          initial={{ scale: 0.85, y: 16, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          whileHover={{ 
            scale: 1.03,
            y: -2,
            transition: { type: "spring", stiffness: 400, damping: 14 }
          }}
          transition={{ type: 'spring', damping: 22, stiffness: 180 }}
        >
          {/* Logo image with layoutId for transition */}
          <motion.div
            layoutId="xerxes-logo-image"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="w-28 h-28 mb-2 bg-transparent shrink-0 hover:scale-105 transition-all duration-300 cursor-pointer"
          >
            <img 
              src="/logo.png" 
              alt="Xerxes AI Logo" 
              className="w-full h-full object-contain filter drop-shadow-[0_4px_20px_rgba(0,0,0,0.65)] drop-shadow-[0_0_2px_rgba(0,0,0,0.85)]" 
            />
          </motion.div>

          {/* Xerxes AI Bold title */}
          <motion.h2 
            layoutId="xerxes-logo"
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="font-header text-5xl md:text-7xl font-bold tracking-wide leading-none drop-shadow-2xl shadow-black/10 cursor-pointer transition-colors duration-1000 text-foreground"
          >
            Xerxes AI
          </motion.h2>
          {/* One Agent Tagline */}
          <motion.p 
            layoutId="xerxes-subtitle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="font-header text-sm md:text-lg font-light tracking-widest mt-1 transition-colors duration-1000 text-foreground/60"
          >
            One Agent , Your All Workflows !
          </motion.p>
        </motion.div>
      ) : (
        <div className="space-y-6 max-w-2xl mx-auto w-full">
          <AnimatePresence initial={false}>
            {messages.map((msg, index) => {
              const isUser = msg.role === 'user';
              const isLast = index === messages.length - 1;

              if (msg.role === 'tool' || msg.role === 'system') return null;

              const msgModelId = msg.id || (msg as any).model_id;

              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className={`flex gap-3 items-start ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {/* Left avatar */}
                  {!isUser && (
                    <div className="w-8 h-8 rounded-full bg-secondary border border-border/15 flex items-center justify-center shrink-0 shadow-[0_2px_8px_rgba(0,0,0,0.03)] mt-0.5">
                      <Bot className="w-4 h-4 text-foreground" />
                    </div>
                  )}

                   {/* Message bubble wrapper */}
                  <div className="flex flex-col gap-1.5 max-w-[85%]">
                    <div className="flex items-center gap-1.5 px-1.5 text-[10px] text-foreground/70 font-semibold tracking-wide font-sans">
                      <span>{isUser ? (user?.email?.address || 'User') : 'Xerxes'}</span>
                      {!isUser && msgModelId && (
                        <>
                          <span className="opacity-40">•</span>
                          <span className="text-[9px] text-black font-semibold font-mono flex items-center gap-0.5 bg-white/85 px-1.5 py-0.5 rounded-md border border-black/10 shadow-sm">
                            <Cpu className="w-2.5 h-2.5 opacity-70 text-black/60" />
                            {getModelDisplayName(msgModelId, availableModels)}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Chat Bubble - Dynamic theme layout */}
                    <div
                      className={`rounded-[24px] text-xs leading-relaxed border bg-card text-card-foreground border-border/60 shadow-[0_4px_16px_rgba(0,0,0,0.15)] inside-text ${
                        msg.content === '' && isLast && isStreaming && activeToolCalls.length === 0
                          ? 'px-3 py-1.5'
                          : 'px-4.5 py-3.5'
                      } ${
                        isUser ? 'rounded-tr-sm font-normal' : 'rounded-tl-sm font-medium'
                      }`}
                    >
                      <div className="whitespace-pre-wrap break-words space-y-3 font-sans">
                        {msg.content === '' && isLast && isStreaming && activeToolCalls.length === 0 ? (
                          // Small black chrome loader sphere next to text indicator
                          <div className="flex items-center gap-2 py-1.5">
                            <XerxesSphere size="small" />
                            <span className="text-[11px] font-bold font-mono text-card-foreground">
                              {thinkingPhrases[thinkingPhraseIndex]}
                            </span>
                          </div>
                        ) : (
                          formatContent(msg.content, isUser)
                        )}
                      </div>
                    </div>

                    {/* Copy action below assistant message bubble (hidden during streaming) */}
                    {!isUser && msg.content !== '' && (!isLast || !isStreaming) && (
                      <div className="flex items-center gap-3 px-1 mt-0.5">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(msg.content);
                            setCopiedMessageIndex(index);
                            setTimeout(() => setCopiedMessageIndex(null), 2000);
                          }}
                          className="p-1.5 rounded-full text-muted-foreground/60 hover:text-foreground hover:bg-card border border-transparent hover:border-border/30 transition-all cursor-pointer"
                          title="Copy response"
                        >
                          {copiedMessageIndex === index ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    )}

                    {/* Collapsible tools */}
                    {!isUser && isLast && activeToolCalls.length > 0 && (
                      <div className="mt-1.5 w-full space-y-1">
                        {activeToolCalls.map((tc) => (
                          <AgentStepCard key={tc.id} step={tc} />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right avatar */}
                  {isUser && (
                    <div className="w-8 h-8 rounded-full bg-secondary border border-border/15 flex items-center justify-center shrink-0 shadow-[0_2px_8px_rgba(0,0,0,0.03)] mt-0.5">
                      <User className="w-4 h-4 text-foreground" />
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function formatContent(text: string, isUser: boolean) {
  if (!text) return '';

  const blocks = [];
  let remaining = text;
  while (remaining) {
    const start = remaining.indexOf('<think>');
    if (start !== -1) {
      if (start > 0) blocks.push({ type: 'text', content: remaining.slice(0, start) });
      const end = remaining.indexOf('</think>', start);
      if (end !== -1) {
        blocks.push({ type: 'think', content: remaining.slice(start + 7, end) });
        remaining = remaining.slice(end + 8);
      } else {
        blocks.push({ type: 'think', content: remaining.slice(start + 7) });
        remaining = '';
      }
    } else {
      blocks.push({ type: 'text', content: remaining });
      break;
    }
  }

  return blocks.map((block, blockIdx) => {
    if (block.type === 'think') {
      return (
        <div key={`think-${blockIdx}`} className="flex items-center gap-2 mb-2 bg-[#261410] rounded-full py-1.5 px-3 border border-[#2C1813]/50 w-max">
          <XerxesSphere size="small" />
          {/* the thinking part is not visible make the text white */}
          <span className="text-white text-[10px] hidden whitespace-pre-wrap leading-relaxed opacity-60 italic">{block.content}</span>
          <span className="text-white text-[11px] font-bold font-mono animate-pulse">Reasoning...</span>
        </div>
      );
    }

    const parts = block.content.split(/(```[\s\S]*?```)/g);
    return parts.map((part, index) => {
      if (part.startsWith('```')) {
        const codeLines = part.split('\n');
        const language = codeLines[0].slice(3).trim() || 'code';
        const codeContent = codeLines.slice(1, -1).join('\n');

        return <CodeBlock key={`code-${blockIdx}-${index}`} language={language} code={codeContent} isUser={isUser} />;
      }

      const inlineParts = part.split(/(\*\*.*?\*\*)/g);
      return (
        <span key={`text-${blockIdx}-${index}`}>
          {inlineParts.map((subPart, subIdx) => {
            if (subPart.startsWith('**') && subPart.endsWith('**')) {
              return (
                <strong key={subIdx} className="font-normal text-[#301A15]">
                  {subPart.slice(2, -2)}
                </strong>
              );
            }
            return subPart;
          })}
        </span>
      );
    });
  });
}

function CodeBlock({ language, code, isUser }: { language: string; code: string; isUser: boolean }) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`my-3 border rounded-2xl overflow-hidden text-xs inside-text ${
      isUser 
        ? 'border-[#EFE0D4] bg-[#F5EAE1] text-[#301A15]' 
        : 'border-[#2C1813] bg-[#261410] text-white/90'
    }`}>
      {/* Code block copy header */}
      <div className={`flex justify-between items-center px-4 py-2 border-b text-[10px] font-mono font-normal uppercase tracking-wider ${
        isUser 
          ? 'border-[#EFE0D4] bg-[#E5D5C8] text-[#301A15]/70' 
          : 'border-[#2C1813] bg-[#1D0E0B] text-white/40'
      }`}>
        <span>{language}</span>
        <button
          onClick={copyToClipboard}
          className="flex items-center gap-1 hover:opacity-80 transition-opacity cursor-pointer font-normal"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-emerald-500">Copied</span>
            </>
          ) : (
            <span>Copy</span>
          )}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto font-mono leading-relaxed max-h-80 whitespace-pre">
        <code>{code}</code>
      </pre>
    </div>
  );
}
