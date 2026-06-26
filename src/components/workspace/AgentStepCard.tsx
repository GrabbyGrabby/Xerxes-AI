'use client';

import React, { useState } from 'react';
import { Search, FolderSearch, ChevronRight, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { ToolStatus } from '@/store/useSessionStore';
import { motion } from 'framer-motion';

export default function AgentStepCard({ step }: { step: ToolStatus }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const isRunning = step.status === 'running';
  const isCompleted = step.status === 'completed';
  const isFailed = step.status === 'failed';

  const toolIcon = step.name === 'web_search' 
    ? <Search className="w-3.5 h-3.5 text-blue-500" />
    : <FolderSearch className="w-3.5 h-3.5 text-[#D35E43]" />;

  const displayTitle = step.name === 'web_search'
    ? 'Web Search Agent'
    : 'File Knowledge QA';

  let queryText = '';
  try {
    if (step.arguments) {
      const parsed = JSON.parse(step.arguments);
      queryText = parsed.query || '';
    }
  } catch (e) {
    // If not valid JSON, fallback to showing the arguments string directly
    queryText = step.arguments || '';
  }

  const renderArguments = () => {
    try {
      return JSON.stringify(JSON.parse(step.arguments || '{}'), null, 2);
    } catch (e) {
      return step.arguments;
    }
  };

  return (
    <div className="w-full my-2 border border-[#EFE0D4] bg-[#FDF6F0]/80 backdrop-blur-md rounded-2xl overflow-hidden text-xs shadow-[0_2px_8px_rgba(48,26,21,0.02)]">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3.5 select-none hover:bg-white/40 transition-all text-left cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          {isRunning && <Loader2 className="w-3.5 h-3.5 text-[#D35E43] animate-spin" />}
          {isCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
          {isFailed && <AlertCircle className="w-3.5 h-3.5 text-rose-500" />}
          
          <div className="flex items-center gap-1.5">
            {toolIcon}
            <span className="font-bold text-[#301A15]/80">{displayTitle}</span>
            {queryText && (
              <span className="text-[10px] text-[#7E6C68] font-mono truncate max-w-[150px]">
                ("{queryText}")
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[9px] text-[#7E6C68] font-bold uppercase tracking-wider font-mono">
            {step.status}
          </span>
          <ChevronRight 
            className={`w-4 h-4 text-[#7E6C68]/60 transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
          />
        </div>
      </button>

      {/* Expanded body */}
      {isExpanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="border-t border-[#EFE0D4] bg-white/70 p-3.5 font-mono text-[10px] leading-relaxed text-[#301A15]/85 space-y-2 max-h-60 overflow-y-auto"
        >
          {step.arguments && (
            <div>
              <span className="text-[#D35E43] font-bold">Input Arguments:</span>
              <pre className="mt-1 bg-[#FDF6F0] border border-[#EFE0D4] p-2.5 rounded-[12px] text-[#301A15]/80 overflow-x-auto whitespace-pre-wrap">
                {renderArguments()}
              </pre>
            </div>
          )}
          
          {step.result && (
            <div>
              <span className="text-emerald-600 font-bold">Output Results:</span>
              <pre className="mt-1 bg-[#FDF6F0] border border-[#EFE0D4] p-2.5 rounded-[12px] text-[#301A15]/80 overflow-x-auto whitespace-pre-wrap">
                {step.result}
              </pre>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
