'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSessionStore } from '@/store/useSessionStore';
import { usePrivy } from '@privy-io/react-auth';
import { History, Loader2, Info } from 'lucide-react';

const getModelDisplayName = (modelId: string, availableModels: any[]) => {
  const found = availableModels.find((m: any) => m.id === modelId);
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

export default function CreditMeter() {
  const { authenticated, getAccessToken } = usePrivy();
  const credits = useSessionStore((state) => state.credits);
  const setCredits = useSessionStore((state) => state.setCredits);
  const guestId = useSessionStore((state) => state.guestId);
  const availableModels = useSessionStore((state) => state.availableModels);
  const [isOpen, setIsOpen] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Fetch transaction history and credit state
  const fetchCreditsData = async () => {
    setIsLoadingHistory(true);
    try {
      const token = authenticated ? await getAccessToken() : null;
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (guestId) headers['x-guest-id'] = guestId;

      const res = await fetch('/api/credits', { headers });
      if (res.ok) {
        const data = await res.json();
        setCredits(data.credits);
        setTransactions(data.transactions || []);
      }
    } catch (e) {
      console.error('Error fetching credit balance:', e);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (guestId || authenticated) {
      fetchCreditsData();
    }
  }, [guestId, authenticated]);

  return (
    <div className="relative">
      {/* Inverted theme trigger button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchCreditsData();
        }}
        className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-border/15 bg-card hover:bg-card/90 transition-all text-xs text-card-foreground shadow-[0_2px_8px_rgba(0,0,0,0.04)] cursor-pointer select-none font-sans font-bold"
      >
        <span className="text-card-foreground/60 font-semibold text-[10px] tracking-tight uppercase">Credits:</span>
        <span className="font-header font-black text-xs text-card-foreground tracking-tight">{credits}</span>
      </button>

      {/* Theme adaptive dropdown panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="absolute right-0 mt-3 w-80 bg-card border border-border rounded-[24px] p-4.5 z-50 text-sm shadow-[0_16px_48px_rgba(0,0,0,0.12)] overflow-hidden text-card-foreground"
            >
              {/* Credits overview */}
              <div className="pb-3 border-b border-border">
                <h4 className="font-header font-black text-xs text-card-foreground mb-2 flex items-center gap-1">
                  Credits Account
                </h4>
                
                <div className="bg-secondary border border-border rounded-[16px] p-3 text-xs text-secondary-foreground space-y-2 mt-2 leading-relaxed font-sans">
                  <div className="flex items-start gap-1.5">
                    <Info className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Google & GitHub Signup:</p>
                      <p className="text-secondary-foreground/70 text-[10px]">Receive <strong className="text-secondary-foreground">500 free credits</strong> immediately upon login onboarding.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-1.5 pt-1 border-t border-border">
                    <Info className="w-3.5 h-3.5 text-secondary-foreground/50 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Anonymous Guest Session:</p>
                      <p className="text-secondary-foreground/70 text-[10px]">Temporary guest profiles receive <strong className="text-secondary-foreground">50 credits</strong> for trial exploration.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Transactions list */}
              <div className="pt-3">
                <h4 className="font-bold text-card-foreground/60 mb-2 flex items-center gap-1.5 text-xs font-sans">
                  <History className="w-3.5 h-3.5 text-card-foreground/60" />
                  Ledger History
                </h4>

                {isLoadingHistory ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-accent" />
                  </div>
                ) : transactions.length === 0 ? (
                  <p className="text-xs text-card-foreground/30 text-center py-4 font-medium font-sans">No transactions registered.</p>
                ) : (
                  <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 font-sans tiny-scrollbar">
                    {transactions.map((tx) => {
                      const displayReason = tx.reason.startsWith('Chat completion using ')
                        ? 'Chat Session'
                        : tx.reason;
                      return (
                        <div
                          key={tx.id}
                          className="flex justify-between items-center gap-2 p-2 rounded-[12px] bg-secondary/40 border border-border hover:border-accent/40 transition-all text-xs"
                        >
                          <div className="overflow-hidden flex-1">
                            <p className="text-card-foreground truncate font-semibold" title={displayReason}>{displayReason}</p>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              {tx.model_used && (
                                <span className="text-[9px] font-mono font-medium text-secondary-foreground/70 bg-secondary px-1 py-0.5 rounded border border-border">
                                  {getModelDisplayName(tx.model_used, availableModels)}
                                </span>
                              )}
                              <span className="text-[9px] text-card-foreground/40 font-mono">
                                {new Date(tx.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <span
                            className={`font-bold font-mono shrink-0 ${
                              tx.amount > 0 ? 'text-emerald-500' : 'text-accent'
                            }`}
                          >
                            {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
