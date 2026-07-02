'use client';

import React, { useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { motion, AnimatePresence } from 'framer-motion';
import { User, LogOut, ChevronDown } from 'lucide-react';
import { useSessionStore } from '@/store/useSessionStore';

export default function UserDropdownCard() {
  const { logout, user, authenticated } = usePrivy();
  const [isOpen, setIsOpen] = useState(false);
  const setMessages = useSessionStore((state) => state.setMessages);
  const setActiveConversationId = useSessionStore((state) => state.setActiveConversationId);

  const isGuestMode = typeof window !== 'undefined' && localStorage.getItem('nexus_guest_access') === 'true';

  const handleExitGuest = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('nexus_guest_access');
      setMessages([]);
      setActiveConversationId(null);
      window.location.reload();
    }
  };

  if (!authenticated && !isGuestMode) return null;

  return (
    <div className="relative font-sans">
      {/* Inverted theme trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 rounded-full border border-border/15 bg-card hover:bg-card/90 transition-all text-xs text-card-foreground shadow-[0_2px_8px_rgba(0,0,0,0.04)] cursor-pointer select-none font-bold"
      >
        <div className="w-5 h-5 rounded-full bg-foreground/10 border border-border/15 flex items-center justify-center shrink-0">
          <User className="w-3 h-3 text-card-foreground" />
        </div>
        <span className="font-semibold max-w-[120px] truncate">
          {authenticated ? (user?.email?.address || 'Active User') : 'Guest Explorer'}
        </span>
        <ChevronDown className="w-3.5 h-3.5 opacity-60 shrink-0 text-card-foreground" />
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
              className="absolute right-0 mt-3 w-64 bg-card border border-border rounded-[24px] p-4.5 z-50 text-sm shadow-[0_16px_48px_rgba(0,0,0,0.12)] overflow-hidden text-card-foreground"
            >
              <div className="space-y-3.5">
                {/* Account info section */}
                <div className="space-y-1">
                  <span className="text-[9px] text-card-foreground/40 font-bold uppercase tracking-wider font-mono">
                    Account Session
                  </span>
                  <p className="text-xs font-semibold text-card-foreground truncate max-w-full">
                    {authenticated ? (user?.email?.address || 'Active User') : 'Guest Session (50 credits)'}
                  </p>
                </div>

                {/* Divider */}
                <div className="border-t border-border" />

                {/* Logout Button / Exit Guest Mode */}
                {authenticated ? (
                  <button
                    onClick={() => {
                      logout();
                      setIsOpen(false);
                    }}
                    className="w-full h-9 bg-foreground text-background hover:opacity-90 border border-transparent font-bold rounded-full text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Log out</span>
                  </button>
                ) : (
                  <button
                    onClick={handleExitGuest}
                    className="w-full h-9 bg-[#B54A4A] text-white hover:bg-red-600 border border-[#B54A4A] hover:border-red-600 font-bold rounded-full text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Exit Guest Mode</span>
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
