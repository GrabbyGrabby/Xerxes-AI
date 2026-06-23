'use client';

import React, { useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { motion, AnimatePresence } from 'framer-motion';
import { User, LogOut, ChevronDown } from 'lucide-react';

export default function UserDropdownCard() {
  const { logout, user } = usePrivy();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative font-sans">
      {/* Trigger Button - Warm peach border, hover effect */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 rounded-full border border-[#EFE0D4] bg-white hover:border-[#D35E43] hover:bg-[#FDF6F0] transition-all text-xs text-[#301A15] shadow-[0_2px_8px_rgba(48,26,21,0.03)] cursor-pointer select-none"
      >
        <div className="w-5 h-5 rounded-full bg-[#301A15]/5 border border-[#301A15]/10 flex items-center justify-center shrink-0">
          <User className="w-3 h-3 text-[#301A15]" />
        </div>
        <span className="font-semibold max-w-[120px] truncate">
          {user?.email?.address || 'Active User'}
        </span>
        <ChevronDown className="w-3.5 h-3.5 opacity-60 shrink-0" />
      </button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="absolute right-0 mt-3 w-64 bg-white border border-[#EFE0D4] rounded-[24px] p-4.5 z-50 text-sm shadow-[0_16px_48px_rgba(48,26,21,0.1)] overflow-hidden"
            >
              <div className="space-y-3.5">
                {/* Account info section */}
                <div className="space-y-1">
                  <span className="text-[9px] text-[#7E6C68]/60 font-bold uppercase tracking-wider font-mono">
                    Account Session
                  </span>
                  <p className="text-xs font-semibold text-[#301A15] truncate max-w-full">
                    {user?.email?.address || 'Active User'}
                  </p>
                </div>

                {/* Divider */}
                <div className="border-t border-[#FDF6F0]" />

                {/* Logout Button */}
                <button
                  onClick={() => {
                    logout();
                    setIsOpen(false);
                  }}
                  className="w-full h-9 bg-black text-white hover:bg-white hover:text-black border border-black font-bold rounded-full text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log out</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
