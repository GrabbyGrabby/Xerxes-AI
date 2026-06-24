'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSessionStore } from '@/store/useSessionStore';
import { usePrivy } from '@privy-io/react-auth';
import { History, Loader2, Info } from 'lucide-react';

export default function CreditMeter() {
  const { authenticated, getAccessToken } = usePrivy();
  const credits = useSessionStore((state) => state.credits);
  const setCredits = useSessionStore((state) => state.setCredits);
  const guestId = useSessionStore((state) => state.guestId);
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
      {/* Inverted pista green trigger button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchCreditsData();
        }}
        className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#1F110E]/15 bg-[#B5CBB7] hover:bg-[#B5CBB7]/90 transition-all text-xs text-[#1F110E] shadow-[0_2px_8px_rgba(0,0,0,0.04)] cursor-pointer select-none font-sans font-bold"
      >
        <span className="text-[#1F110E]/60 font-semibold text-[10px] tracking-tight uppercase">Credits:</span>
        <span className="font-header font-black text-xs text-[#1F110E] tracking-tight">{credits}</span>
      </button>

      {/* Dark brown dropdown panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="absolute right-0 mt-3 w-80 bg-[#1F110E] border border-[#4A2F29] rounded-[24px] p-4.5 z-50 text-sm shadow-[0_16px_48px_rgba(0,0,0,0.12)] overflow-hidden text-white"
            >
              {/* Credits overview */}
              <div className="pb-3 border-b border-[#4A2F29]">
                <h4 className="font-header font-black text-xs text-white mb-2 flex items-center gap-1">
                  Credits Account
                </h4>
                
                <div className="bg-[#301A15] border border-[#4A2F29] rounded-[16px] p-3 text-xs text-white space-y-2 mt-2 leading-relaxed font-sans">
                  <div className="flex items-start gap-1.5">
                    <Info className="w-3.5 h-3.5 text-[#D35E43] shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Google & GitHub Signup:</p>
                      <p className="text-white/70 text-[10px]">Receive <strong className="text-white">500 free credits</strong> immediately upon login onboarding.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-1.5 pt-1 border-t border-[#4A2F29]">
                    <Info className="w-3.5 h-3.5 text-white/50 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Anonymous Guest Session:</p>
                      <p className="text-white/70 text-[10px]">Temporary guest profiles receive <strong className="text-white">50 credits</strong> for trial exploration.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Transactions list */}
              <div className="pt-3">
                <h4 className="font-bold text-white/60 mb-2 flex items-center gap-1.5 text-xs font-sans">
                  <History className="w-3.5 h-3.5 text-white/60" />
                  Ledger History
                </h4>

                {isLoadingHistory ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-[#D35E43]" />
                  </div>
                ) : transactions.length === 0 ? (
                  <p className="text-xs text-white/30 text-center py-4 font-medium font-sans">No transactions registered.</p>
                ) : (
                  <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 font-sans tiny-scrollbar">
                    {transactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="flex justify-between items-center gap-2 p-2 rounded-[12px] bg-[#301A15]/40 border border-[#4A2F29] hover:border-[#D35E43]/40 transition-all text-xs"
                      >
                        <div className="overflow-hidden">
                          <p className="text-white truncate font-semibold">{tx.reason}</p>
                          <p className="text-[9px] text-white/50 mt-0.5 font-mono">
                            {new Date(tx.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <span
                          className={`font-bold font-mono ${
                            tx.amount > 0 ? 'text-emerald-400' : 'text-[#D35E43]'
                          }`}
                        >
                          {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                        </span>
                      </div>
                    ))}
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
