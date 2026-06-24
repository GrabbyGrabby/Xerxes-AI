'use client';

import React, { useEffect, useState } from 'react';
import { useSessionStore } from '@/store/useSessionStore';
import { usePrivy } from '@privy-io/react-auth';
import { 
  Menu, MessageSquare, Check, Loader2, Plus, LogIn, LogOut
} from 'lucide-react';
import AmbientScene from '@/components/three/AmbientScene';
import CreditMeter from '@/components/workspace/CreditMeter';
import MessageStream from '@/components/workspace/MessageStream';
import Composer from '@/components/workspace/Composer';
import UserDropdownCard from '@/components/workspace/UserDropdownCard';
import { motion, AnimatePresence } from 'framer-motion';

export default function WorkspacePage() {
  const { authenticated, login, logout, user, ready, getAccessToken } = usePrivy();
  const initGuestSession = useSessionStore((state) => state.initGuestSession);
  const guestId = useSessionStore((state) => state.guestId);
  const messages = useSessionStore((state) => state.messages);
  const setMessages = useSessionStore((state) => state.setMessages);

  const credits = useSessionStore((state) => state.credits);
  const setCredits = useSessionStore((state) => state.setCredits);

  const conversations = useSessionStore((state) => state.conversations);
  const setConversations = useSessionStore((state) => state.setConversations);
  const activeConversationId = useSessionStore((state) => state.activeConversationId);
  const setActiveConversationId = useSessionStore((state) => state.setActiveConversationId);
  const showTopControls = useSessionStore((state) => state.showTopControls);

  // Custom UI helper states
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isGuestMode, setIsGuestMode] = useState(false);

  // Initialize guest session
  useEffect(() => {
    initGuestSession();
  }, [initGuestSession]);

  // Sync Guest Mode from LocalStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nexus_guest_access') === 'true';
      setIsGuestMode(saved);
    }
  }, []);

  // When Privy finishes logging in, automatically exit Guest Mode
  useEffect(() => {
    if (authenticated) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('nexus_guest_access');
      }
      setIsGuestMode(false);
    }
  }, [authenticated]);

  // Fetch credit balance on mount / auth state change
  const fetchCreditsData = async () => {
    try {
      const token = authenticated ? await getAccessToken() : null;
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

  useEffect(() => {
    if (guestId || authenticated) {
      fetchCreditsData();
    }
  }, [guestId, authenticated, setCredits]);

  // Fetch recent conversation history
  const fetchConversationsList = async () => {
    try {
      const token = authenticated ? await getAccessToken() : null;
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (guestId) headers['x-guest-id'] = guestId;

      const res = await fetch('/api/conversations', { headers });
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch (e) {
      console.error('Error fetching conversations list:', e);
    }
  };

  useEffect(() => {
    if (guestId || authenticated) {
      fetchConversationsList();
    }
  }, [guestId, authenticated, setConversations]);

  // Expose conversations list fetch globally for message route updates
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).refreshConversations = fetchConversationsList;
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).refreshConversations;
      }
    };
  }, [guestId, authenticated]);

  const loadConversation = async (id: string) => {
    try {
      const token = authenticated ? await getAccessToken() : null;
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (guestId) headers['x-guest-id'] = guestId;

      const res = await fetch(`/api/conversations?id=${id}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        setActiveConversationId(id);
        setIsSidebarOpen(false);
        triggerToast('Loaded thread history.');
      } else {
        triggerToast('Failed to load conversation.');
      }
    } catch (e) {
      console.error(e);
      triggerToast('Error loading conversation.');
    }
  };

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const startNewChat = () => {
    setMessages([]);
    setActiveConversationId(null);
    triggerToast('New Chat Session started.');
  };

  const handleGuestLogin = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('nexus_guest_access', 'true');
    }
    setIsGuestMode(true);
    triggerToast('Logged in as Guest.');
  };

  if (!ready) {
    return (
      <main className="w-full h-[100dvh] overflow-hidden flex items-center justify-center bg-[#181210]">
        <Loader2 className="w-8 h-8 text-[#D35E43] animate-spin" />
      </main>
    );
  }

  const showLogin = !authenticated && !isGuestMode;

  if (showLogin) {
    return (
      <main className="w-full h-[100dvh] overflow-hidden flex flex-col items-center justify-center relative bg-[#FAF9F6] font-sans">
        {/* 3D background with rotating chrome sphere & gold/terracotta particles */}
        <AmbientScene bgType="login" />

        {/* Centered Professional Solid Black Card */}
        <div className="z-10 flex flex-col items-center text-center p-8 md:p-12 bg-black border border-neutral-800 rounded-[36px] shadow-[0_24px_64px_rgba(0,0,0,0.12)] transition-all duration-500 max-w-md mx-4 select-none">
          <div className="w-20 h-20 mb-6 bg-transparent">
            {/* Smooth outline image logo */}
            <img 
              src="/logo.png" 
              alt="Xerxes AI Logo" 
              className="w-full h-full object-contain filter drop-shadow-[0_0_12px_rgba(255,255,255,0.18)]" 
            />
          </div>
          
          {/* Solid white h1 text in Copperplate Gothic */}
          <h1 className="font-header text-4xl md:text-5xl font-bold tracking-wide leading-none mb-3 text-white">
            Xerxes AI
          </h1>
          <p className="font-header text-[10px] md:text-xs font-light text-[#7E6C68] tracking-widest mb-8 uppercase">
            One Agent , Your All Workflows !
          </p>

          <div className="flex flex-col gap-3 w-full items-center">
            {/* Sign in with Privy */}
            <button
              onClick={() => login()}
              className="w-56 h-11 bg-white hover:bg-white/90 text-[#1F110E] font-bold rounded-full text-xs transition-all duration-300 shadow-[0_4px_16px_rgba(255,255,255,0.05)] hover:scale-105 active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogIn className="w-4 h-4 shrink-0" />
              <span>Sign In</span>
            </button>

            {/* Guest Login */}
            <button
              onClick={handleGuestLogin}
              className="w-56 h-11 bg-transparent hover:bg-white/5 text-white border border-white/20 hover:border-white/40 rounded-full text-xs font-semibold transition-all duration-300 hover:scale-105 active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Explore as a Guest</span>
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="w-full h-[100dvh] overflow-hidden flex flex-col relative bg-[#181210] text-[#FAF1EB] font-sans">
      {/* 3D background with rotating chrome sphere */}
      <AmbientScene />

      {/* MOBILE FLOATING MENU BUTTON: Floating top-left */}
      <motion.button
        animate={{
          y: (showTopControls || messages.length === 0) ? 0 : -80,
          opacity: (showTopControls || messages.length === 0) ? 1 : 0
        }}
        transition={{ type: 'spring', damping: 25, stiffness: 220 }}
        onClick={() => setIsSidebarOpen(true)}
        className="md:hidden absolute top-4 left-4 z-30 w-9 h-9 rounded-full bg-[#301A15] border border-[#4A2F29] flex items-center justify-center text-white hover:bg-[#47271F] hover:scale-105 active:scale-95 transition-all shadow-sm cursor-pointer select-none"
        title="Open Sidebar"
      >
        <Menu className="w-4 h-4 text-white" />
      </motion.button>

      {/* FLOATING CONTROLS: Placed absolute top right for both desktop and mobile */}
      <motion.div
        animate={{
          y: (showTopControls || messages.length === 0) ? 0 : -80,
          opacity: (showTopControls || messages.length === 0) ? 1 : 0
        }}
        transition={{ type: 'spring', damping: 25, stiffness: 220 }}
        className="flex absolute top-4 right-4 z-30 items-center gap-3"
      >
        {(authenticated || isGuestMode) && <CreditMeter />}
        {authenticated ? (
          <UserDropdownCard />
        ) : (
          <button
            onClick={() => login()}
            className="w-9 h-9 rounded-full bg-[#301A15] border border-[#4A2F29] flex items-center justify-center hover:bg-[#47271F] hover:scale-105 active:scale-95 transition-all shadow-sm cursor-pointer select-none"
            title="Log In / Sign Up"
          >
            <LogIn className="w-4 h-4 text-white" />
          </button>
        )}
      </motion.div>

      {/* Floating toast alerts */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -40, scale: 0.9 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 px-4 py-2.5 bg-[#1F110E] border border-[#4A2F29] text-[#FAF1EB] text-xs font-bold rounded-full z-50 shadow-[0_8px_24px_rgba(0,0,0,0.12)] flex items-center gap-2"
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
              className="md:hidden absolute inset-0 bg-black/60 z-40 backdrop-blur-sm"
            />
          )}
        </AnimatePresence>

        {/* Collapsible Left Sidebar */}
        <motion.aside
          onMouseEnter={() => setIsSidebarOpen(true)}
          onMouseLeave={() => setIsSidebarOpen(false)}
          animate={{ width: isSidebarOpen ? 260 : 72 }}
          transition={{ type: 'spring', damping: 26, stiffness: 220 }}
          className={`absolute md:relative h-[calc(100dvh-2rem)] my-4 md:ml-4 bg-[#B5CBB7] border border-[#1F110E]/15 rounded-[28px] flex flex-col justify-between py-6 z-50 select-none shadow-[0_8px_32px_rgba(0,0,0,0.08)] overflow-hidden shrink-0 text-[#1F110E] transition-transform duration-300 ${
            isSidebarOpen ? 'translate-x-4 md:translate-x-0' : '-translate-x-32 md:translate-x-0'
          }`}
        >
          {/* Top Panel Actions */}
          <div className="space-y-6 flex flex-col items-center w-full">
            {/* Sidebar Top: Hamburger Menu Button and Xerxes Logo */}
            <div className="flex items-center gap-3 px-5 w-full h-8 overflow-hidden">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-1.5 rounded-full text-[#1F110E] hover:bg-[#1F110E]/10 transition-all cursor-pointer shrink-0"
                title="Toggle Sidebar"
              >
                <Menu className="w-7 h-7" />
              </button>
              {isSidebarOpen && (
                <div className="flex items-center select-none shrink-0">
                  <span className="font-header font-bold text-sm tracking-wide text-[#1F110E]">
                    Xerxes
                  </span>
                </div>
              )}
            </div>

            {/* New Chat Button */}
            <div className="px-3.5 w-full">
              <button
                onClick={startNewChat}
                className="w-full h-10 bg-[#1F110E]/10 border border-[#1F110E]/15 hover:bg-[#1F110E] hover:text-white text-[#1F110E] font-bold rounded-full text-xs transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer overflow-hidden whitespace-nowrap"
              >
                <Plus className="w-4 h-4 shrink-0 text-[#D35E43]" />
                {isSidebarOpen && <span>New Chat</span>}
              </button>
            </div>

            {/* Middle Icons List */}
            <div className="w-full flex flex-col gap-2 px-3.5">
              {[
                { icon: <MessageSquare className="w-4 h-4 shrink-0" />, label: 'Active Chat', active: true, action: () => triggerToast('Chat window focused.') }
              ].map((item, idx) => (
                <button
                  key={idx}
                  onClick={item.action}
                  className="w-full h-10 bg-[#1F110E]/10 border border-[#1F110E]/15 hover:bg-[#1F110E] hover:text-white text-[#1F110E] font-bold rounded-full text-xs transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer overflow-hidden whitespace-nowrap"
                >
                  <div className="shrink-0">{item.icon}</div>
                  {isSidebarOpen && (
                    <span className="tracking-tight whitespace-nowrap">{item.label}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Recent Conversations List - Loaded from Supabase */}
            {isSidebarOpen && (
              <div className="w-full px-4 pt-3 border-t border-[#1F110E]/15 space-y-2">
                <h4 className="text-[9px] uppercase font-bold tracking-wider text-[#1F110E]/40 font-header">
                  Recent Threads
                </h4>
                <div className="space-y-1 max-h-48 overflow-y-auto pr-1 tiny-scrollbar">
                  {conversations.length === 0 ? (
                    <p className="text-[10px] text-[#1F110E]/30 text-center py-2">No threads saved.</p>
                  ) : (
                    conversations.map((chat) => (
                      <button
                        key={chat.id}
                        onClick={() => loadConversation(chat.id)}
                        className={`w-full text-left p-2.5 rounded-[10px] text-[11px] truncate block cursor-pointer transition-all ${
                          activeConversationId === chat.id
                            ? 'bg-[#1F110E]/10 text-[#1F110E] font-bold border-l-2 border-[#D35E43]'
                            : 'text-[#1F110E]/80 hover:bg-[#1F110E]/5 hover:text-[#1F110E]'
                        }`}
                      >
                        {chat.title || 'Untitled Thread'}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Panel Actions: Authentication */}
          <div className="flex flex-col items-center gap-5 w-full">
            <div className="px-3.5 w-full">
              {authenticated ? (
                <div className="w-full bg-[#1F110E]/5 border border-[#1F110E]/15 rounded-[20px] p-3 flex flex-col items-center gap-2 overflow-hidden transition-all duration-300">
                  {isSidebarOpen ? (
                    <>
                      <span className="text-[10px] font-semibold truncate max-w-full text-[#1F110E]/80">
                        {user?.email?.address || 'Active User'}
                      </span>
                      <button
                        onClick={() => logout()}
                        className="w-full py-1.5 bg-[#1F110E] text-white border border-[#1F110E] font-bold rounded-full text-[10px] transition-all flex items-center justify-center gap-1 cursor-pointer hover:opacity-90"
                      >
                        Log out
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => logout()}
                      className="p-2 bg-[#1F110E] text-white border border-[#1F110E] rounded-full transition-all flex items-center justify-center cursor-pointer hover:opacity-90"
                      title="Log out"
                    >
                      <LogOut className="w-4.5 h-4.5" />
                    </button>
                  )}
                </div>
              ) : isGuestMode ? (
                <div className="w-full bg-[#1F110E]/5 border border-[#1F110E]/15 rounded-[20px] p-3 flex flex-col items-center gap-2 overflow-hidden transition-all duration-300">
                  {isSidebarOpen ? (
                    <>
                      <span className="text-[10px] font-semibold truncate max-w-full text-[#1F110E]/60">
                        Guest Explorer
                      </span>
                      <button
                        onClick={startNewChat}
                        className="w-full py-1.5 bg-transparent border border-[#1F110E]/20 text-[#1F110E] font-bold rounded-full text-[10px] transition-all flex items-center justify-center gap-1 cursor-pointer hover:bg-[#1F110E]/5"
                      >
                        Exit Mode
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={startNewChat}
                      className="p-2 bg-transparent border border-[#1F110E]/20 text-[#1F110E] rounded-full transition-all flex items-center justify-center cursor-pointer hover:bg-[#1F110E]/5"
                      title="Exit Guest Mode"
                    >
                      <LogOut className="w-4.5 h-4.5" />
                    </button>
                  )}
                </div>
              ) : (
                <div className="w-full flex flex-col gap-2">
                  <button
                    onClick={() => login()}
                    className="w-full h-10 bg-[#1F110E]/10 border border-[#1F110E]/15 hover:bg-[#1F110E] hover:text-white text-[#1F110E] font-bold rounded-full text-xs transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer overflow-hidden whitespace-nowrap"
                  >
                    <LogIn className="w-4 h-4 shrink-0" />
                    {isSidebarOpen && <span>Sign In</span>}
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.aside>

        {/* Central Chat pane */}
        <div className="flex-1 flex flex-col h-full max-w-2xl mx-auto px-4 py-6 relative z-10 overflow-hidden">
          {/* Sticky Header at the top of conversation (desktop only to prevent overlaps) */}
          {messages.length > 0 && (
            <motion.div
              layoutId="xerxes-header-container"
              className="flex flex-col items-center justify-center pb-0 mb-2 select-none shrink-0"
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            >
              <div className="flex items-center gap-2">
                <motion.div
                  layoutId="xerxes-logo-image"
                  className="w-8 h-8 bg-transparent shrink-0"
                  transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                >
                  <img src="/logo.png" alt="Logo" className="w-full h-full object-contain filter drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]" />
                </motion.div>
                <motion.h2
                  layoutId="xerxes-logo"
                  className="font-header text-xl md:text-2xl font-bold text-[#FAF1EB] tracking-wide leading-none"
                  transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                >
                  Xerxes AI
                </motion.h2>
              </div>
              <motion.p
                layoutId="xerxes-subtitle"
                className="font-header text-[9px] md:text-[10px] font-light text-[#FAF1EB]/60 tracking-widest mt-0.5"
                transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              >
                One Agent , Your All Worklows !
              </motion.p>
            </motion.div>
          )}

          {/* Scrollable messages thread */}
          <MessageStream />

          {/* Bottom Composer */}
          <div className="mt-3 w-full">
            <Composer />
          </div>
        </div>
      </section>
    </main>
  );
}
