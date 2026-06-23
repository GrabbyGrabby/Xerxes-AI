'use client';

import React, { useEffect, useState } from 'react';
import { useSessionStore } from '@/store/useSessionStore';
import { usePrivy } from '@privy-io/react-auth';
import { 
  Menu, MessageSquare, Trophy, User, Globe, 
  Check, Loader2, Bot, Database, FileText, Plus, X, LogOut, Compass, LogIn
} from 'lucide-react';
import AmbientScene from '@/components/three/AmbientScene';
import CreditMeter from '@/components/workspace/CreditMeter';
import MessageStream from '@/components/workspace/MessageStream';
import Composer from '@/components/workspace/Composer';
import { motion, AnimatePresence } from 'framer-motion';

export default function WorkspacePage() {
  const { authenticated, login, logout, user, ready } = usePrivy();
  const initGuestSession = useSessionStore((state) => state.initGuestSession);
  const guestId = useSessionStore((state) => state.guestId);
  const setMessages = useSessionStore((state) => state.setMessages);

  const credits = useSessionStore((state) => state.credits);
  const setCredits = useSessionStore((state) => state.setCredits);

  // Custom UI helper states
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'history' | 'profile'>('chat');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Initialize guest session
  useEffect(() => {
    initGuestSession();
  }, [initGuestSession]);

  // Fetch and sync initial credits on mount / auth state change
  useEffect(() => {
    const fetchCreditsData = async () => {
      try {
        const token = authenticated ? await window.localStorage.getItem('privy:token') : null;
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        if (guestId) headers['x-guest-id'] = guestId;

        const res = await fetch('/api/credits', { headers });
        if (res.ok) {
          const data = await res.json();
          setCredits(data.credits);
        }
      } catch (e) {
        console.error('Error fetching credit balance:', e);
      }
    };

    if (guestId || authenticated) {
      fetchCreditsData();
    }
  }, [guestId, authenticated, setCredits]);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const startNewChat = () => {
    setMessages([]);
    triggerToast('New Chat Session started.');
  };

  if (!ready) {
    return (
      <main className="w-screen h-screen overflow-hidden flex items-center justify-center bg-[#FAF1EB]">
        <Loader2 className="w-8 h-8 text-[#D35E43] animate-spin" />
      </main>
    );
  }

  if (!authenticated) {
    return (
      <main className="w-screen h-screen overflow-hidden flex flex-col items-center justify-center relative bg-[#FAF1EB] font-sans">
        {/* 3D background with slow-rotating chrome sphere & gold dust */}
        <AmbientScene />

        {/* Glassmorphic Centered Card */}
        <div className="z-10 flex flex-col items-center text-center p-8 md:p-12 bg-white/20 border border-white/30 rounded-[36px] backdrop-blur-md shadow-[0_16px_48px_rgba(48,26,21,0.08)] max-w-md mx-4 select-none">
          <h1 className="font-header text-6xl md:text-7xl font-bold text-[#301A15] tracking-wide leading-none mb-3">
            Xerxes AI
          </h1>
          <p className="font-header text-sm md:text-base font-light text-[#7E6C68] tracking-widest mb-8">
            One Agent , Your All Worklows !
          </p>

          <button
            onClick={() => login()}
            className="w-48 h-12 bg-[#301A15] hover:bg-black text-white rounded-full text-sm font-medium transition-all shadow-[0_4px_16px_rgba(48,26,21,0.2)] flex items-center justify-center gap-2 cursor-pointer inside-text"
          >
            <LogIn className="w-4.5 h-4.5" />
            <span>Sign In</span>
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="w-screen h-screen overflow-hidden flex flex-col relative bg-[#FAF1EB] font-sans">
      {/* 3D background with slow-rotating chrome sphere & gold dust */}
      <AmbientScene />

      {/* Floating Mascot Button */}
      <div className="absolute top-4 right-4 z-30">
        <button
          onClick={() => {
            if (authenticated) {
              setIsSidebarOpen(true);
              triggerToast('Opening user profile drawer.');
            } else {
              login();
            }
          }}
          className="w-9 h-9 rounded-full bg-white border border-[#EFE0D4] flex items-center justify-center text-lg hover:bg-[#FDF6F0] hover:scale-105 active:scale-95 transition-all shadow-[0_4px_12px_rgba(48,26,21,0.05)] cursor-pointer select-none"
          title={authenticated ? `User Profile: ${user?.email?.address || 'Active'}` : 'Log In / Sign Up'}
        >
          {authenticated ? (
            <User className="w-4 h-4 text-[#301A15]" />
          ) : (
            <LogIn className="w-4 h-4 text-[#301A15]" />
          )}
        </button>
      </div>

      {/* Floating toast alerts */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -40, scale: 0.9 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 px-4 py-2.5 bg-white border border-[#EFE0D4] text-[#301A15] text-xs font-bold rounded-full z-50 shadow-[0_8px_24px_rgba(48,26,21,0.06)] flex items-center gap-2"
          >
            <Check className="w-3.5 h-3.5 text-[#D35E43]" />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Workspace Layout */}
      <section className="flex-1 flex overflow-hidden relative pt-2">
        {/* Mobile overlay backdrop */}
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="md:hidden absolute inset-0 bg-black/40 z-40 backdrop-blur-sm"
            />
          )}
        </AnimatePresence>

        {/* Collapsible Left Sidebar (transitions between w-18 and w-64) */}
        <motion.aside
          onMouseEnter={() => setIsSidebarOpen(true)}
          onMouseLeave={() => setIsSidebarOpen(false)}
          animate={{ width: isSidebarOpen ? 260 : 72 }}
          transition={{ type: 'spring', damping: 26, stiffness: 220 }}
          className={`absolute md:relative h-[calc(100vh-2rem)] my-4 md:ml-4 bg-[#301A15] border border-[#2C1813] rounded-[28px] flex flex-col justify-between py-6 z-50 select-none shadow-[0_8px_32px_rgba(48,26,21,0.15)] overflow-hidden shrink-0 text-white transition-transform duration-300 ${
            isSidebarOpen ? 'translate-x-4 md:translate-x-0' : '-translate-x-32 md:translate-x-0'
          }`}
        >
          {/* Top Panel Actions */}
          <div className="space-y-6 flex flex-col items-center w-full">
            {/* Sidebar Top: Hamburger Menu Button and optional Xerxes Logo */}
            <div className="flex items-center gap-3 px-5 w-full h-8 overflow-hidden">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-1.5 rounded-full text-white hover:bg-white/10 transition-all cursor-pointer shrink-0"
                title="Toggle Sidebar"
              >
                <Menu className="w-7 h-7" />
              </button>
              {isSidebarOpen && (
                <div className="flex items-center select-none shrink-0">
                  <span className="font-header font-bold text-sm tracking-tighter text-white">
                    xerxes
                  </span>
                </div>
              )}
            </div>

            {/* New Chat Button - Styled in white overlay */}
            <div className="px-3.5 w-full">
              <button
                onClick={startNewChat}
                className="w-full h-10 bg-white/10 border border-white/20 hover:bg-white hover:text-[#301A15] text-white font-bold rounded-full text-xs transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer overflow-hidden whitespace-nowrap"
              >
                <Plus className="w-4 h-4 shrink-0 text-[#D35E43]" />
                {isSidebarOpen && <span>New Chat</span>}
              </button>
            </div>

            {/* Middle Icons List with Labels (collapsible) */}
            <div className="w-full flex flex-col gap-2 px-3.5">
              {[
                { icon: <MessageSquare className="w-4 h-4 shrink-0" />, label: 'Active Chat', active: true, action: () => triggerToast('Chat window focused.') }
              ].map((item, idx) => (
                <button
                  key={idx}
                  onClick={item.action}
                  className="w-full h-10 bg-white/10 border border-white/20 hover:bg-white hover:text-[#301A15] text-white font-bold rounded-full text-xs transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer overflow-hidden whitespace-nowrap"
                >
                  <div className="shrink-0">{item.icon}</div>
                  {isSidebarOpen && (
                    <span className="tracking-tight whitespace-nowrap">{item.label}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Recent Conversations List */}
            {isSidebarOpen && (
              <div className="w-full px-4 pt-3 border-t border-white/10 space-y-2">
                <h4 className="text-[9px] uppercase font-bold tracking-wider text-white/40 font-header">
                  Recent Threads
                </h4>
                <div className="space-y-1 max-h-40 overflow-y-auto pr-1 tiny-scrollbar">
                  {[
                    { title: 'Getting started with Xerxes AI' },
                    { title: 'Document RAG Context analysis' }
                  ].map((chat, idx) => (
                    <button
                      key={idx}
                      onClick={() => triggerToast(`Opened: ${chat.title}`)}
                      className="w-full text-left p-2 rounded-[10px] text-[11px] text-white/80 hover:bg-white/10 hover:text-white truncate block cursor-pointer"
                    >
                      {chat.title}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Panel Actions: Authentication */}
          <div className="flex flex-col items-center gap-5 w-full">
            {/* Privy Login status card - Inverts on hover */}
            <div className="px-3.5 w-full">
              {authenticated ? (
                <div className="w-full bg-white/10 border border-white/20 rounded-[20px] p-3 flex flex-col items-center gap-2 overflow-hidden hover:bg-white hover:text-[#301A15] hover:border-white transition-all duration-300">
                  {isSidebarOpen && (
                    <span className="text-[9px] text-white/50 font-bold uppercase tracking-wider font-mono">
                      Logged In
                    </span>
                  )}
                  <User className="w-4.5 h-4.5 shrink-0" />
                  {isSidebarOpen && (
                    <>
                      <span className="text-[10px] font-semibold truncate max-w-full">
                        {user?.email?.address || 'Active User'}
                      </span>
                      <span className="text-[10px] text-white/70 font-bold">
                        Credits: <strong>{credits}</strong>
                      </span>
                      <button
                        onClick={() => logout()}
                        className="w-full py-1.5 bg-black text-white hover:bg-white hover:text-black border border-black font-bold rounded-full text-[10px] transition-all flex items-center justify-center gap-1 cursor-pointer"
                      >
                        Log out
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <div className="w-full flex flex-col gap-2">
                  <button
                    onClick={() => login()}
                    className="w-full h-10 bg-white/10 border border-white/20 hover:bg-white hover:text-[#301A15] text-white font-bold rounded-full text-xs transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer overflow-hidden whitespace-nowrap"
                  >
                    <LogIn className="w-4 h-4 shrink-0" />
                    {isSidebarOpen && <span>Sign In</span>}
                  </button>
                  {isSidebarOpen && (
                    <div className="text-center">
                      <span className="text-[10px] text-white/70 font-bold">
                        Credits: <strong>{credits}</strong>
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </motion.aside>

        {/* Central Chat pane */}
        <div className="flex-1 flex flex-col h-full max-w-2xl mx-auto px-4 py-6 relative z-10 overflow-hidden">
          {/* Scrollable messages thread */}
          <MessageStream />

          {/* Bottom milky Composer */}
          <div className="mt-3 w-full">
            <Composer />
          </div>
        </div>
      </section>
    </main>
  );
}
