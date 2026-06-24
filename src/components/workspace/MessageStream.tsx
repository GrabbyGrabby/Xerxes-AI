'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useSessionStore } from '@/store/useSessionStore';
import { usePrivy } from '@privy-io/react-auth';
import { Bot, User, Copy, Check, ArrowRight, Compass, ShieldAlert, Cpu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AgentStepCard from './AgentStepCard';
import XerxesSphere from '../three/XerxesSphere';

export default function MessageStream() {
  const { user } = usePrivy();
  const messages = useSessionStore((state) => state.messages);
  const activeToolCalls = useSessionStore((state) => state.activeToolCalls);
  const isStreaming = useSessionStore((state) => state.isStreaming);
  const setActiveModelId = useSessionStore((state) => state.setActiveModelId);
  const containerRef = useRef<HTMLDivElement>(null);

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
          transition={{ type: 'spring', damping: 25, stiffness: 220 }}
        >
          {/* Logo image with layoutId for transition */}
          <motion.div
            layoutId="xerxes-logo-image"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="w-28 h-28 mb-2 bg-transparent shrink-0"
          >
            <img src="/logo.png" alt="Xerxes AI Logo" className="w-full h-full object-contain filter drop-shadow-[0_0_12px_rgba(255,255,255,0.18)]" />
          </motion.div>

          {/* Xerxes AI Bold Copperplate gothic */}
          <motion.h2 
            layoutId="xerxes-logo"
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="font-header text-5xl md:text-7xl font-bold text-[#FAF1EB] tracking-wide leading-none drop-shadow-2xl shadow-black/10"
          >
            Xerxes AI
          </motion.h2>
          {/* One Agent , Your All Workflows thin Copperplate gothic */}
          <motion.p 
            layoutId="xerxes-subtitle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="font-header text-sm md:text-lg font-light text-[#FAF1EB]/50 tracking-widest mt-1"
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
                    <div className="w-8 h-8 rounded-full bg-[#301A15]/5 border border-[#301A15]/15 flex items-center justify-center shrink-0 shadow-[0_2px_8px_rgba(48,26,21,0.03)] mt-0.5">
                      <Bot className="w-4 h-4 text-[#301A15]" />
                    </div>
                  )}

                  {/* Message bubble wrapper */}
                  <div className="flex flex-col gap-1.5 max-w-[85%]">
                    <span className="text-[10px] text-[#7E6C68] font-semibold tracking-wide px-1.5 font-sans">
                      {isUser ? (user?.email?.address || 'User') : 'Xerxes'}
                    </span>

                    {/* Chat Bubble - Consistent light beige theme */}
                    <div
                      className={`rounded-[24px] text-xs leading-relaxed border border-[#EFE0D4] bg-[#F5EAE1] text-[#301A15] shadow-[0_4px_16px_rgba(0,0,0,0.25)] inside-text ${
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
                            <span className="text-[11px] font-bold font-mono animate-pulse text-[#301A15]">
                              Thinking...
                            </span>
                          </div>
                        ) : (
                          formatContent(msg.content, isUser)
                        )}
                      </div>
                    </div>

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
                    <div className="w-8 h-8 rounded-full bg-white border border-[#EFE0D4] flex items-center justify-center shrink-0 shadow-[0_2px_8px_rgba(48,26,21,0.03)] mt-0.5">
                      <User className="w-4 h-4 text-[#301A15]" />
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
