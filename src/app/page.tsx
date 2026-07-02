'use client';

import React, { useEffect, useState } from 'react';
import { useSessionStore } from '@/store/useSessionStore';
import { usePrivy } from '@privy-io/react-auth';
import { 
  Menu, MessageSquare, Check, Loader2, Plus, LogIn, LogOut, MoreVertical, Edit2, Trash2, X, Sparkles
} from 'lucide-react';
import AmbientScene from '@/components/three/AmbientScene';
import CreditMeter from '@/components/workspace/CreditMeter';
import MessageStream from '@/components/workspace/MessageStream';
import Composer from '@/components/workspace/Composer';
import UserDropdownCard from '@/components/workspace/UserDropdownCard';
import { motion, AnimatePresence } from 'framer-motion';

// Immersive Theme Components & Context
import WavesBackground from '@/components/ui/WavesBackground';
import InteractivePaletteCards from '@/components/ui/InteractivePaletteCards';
import { useTheme } from '@/components/providers/ThemeContext';

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

  const loadConversationsFromLocal = useSessionStore((state) => state.loadConversationsFromLocal);
  const syncConversationsWithBackend = useSessionStore((state) => state.syncConversationsWithBackend);

  // Custom UI helper states
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const { themeMode, setThemeMode, activeColors } = useTheme();

  // States for thread editing and deletion
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameTitle, setRenameTitle] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
    const userId = user?.id || null;
    
    // Load from local DB first (instant, offline-ready)
    await loadConversationsFromLocal(guestId, userId);

    try {
      const token = authenticated ? await getAccessToken() : null;
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (guestId) headers['x-guest-id'] = guestId;

      const res = await fetch('/api/conversations', { headers });
      if (res.ok) {
        const data = await res.json();
        // Sync API list to IndexedDB
        await syncConversationsWithBackend(data.conversations || [], guestId, userId);
      }
    } catch (e) {
      console.error('Error fetching conversations list, using local storage cache:', e);
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
      // 1. Try loading from local IndexedDB first
      const { localDb } = await import('@/lib/storage/indexedDbHelper');
      const localMsgs = await localDb.getMessages(id);
      if (localMsgs.length > 0) {
        setMessages(localMsgs as any);
        setActiveConversationId(id);
        setIsSidebarOpen(false);
      }

      // 2. Fetch from backend API to sync in the background
      const token = authenticated ? await getAccessToken() : null;
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (guestId) headers['x-guest-id'] = guestId;

      const res = await fetch(`/api/conversations?id=${id}`, { headers });
      if (res.ok) {
        const data = await res.json();
        const serverMsgs = data.messages || [];
        setMessages(serverMsgs);
        setActiveConversationId(id);
        setIsSidebarOpen(false);
        if (localMsgs.length > 0) {
          triggerToast('Synced thread history.');
        } else {
          triggerToast('Loaded thread history.');
        }
        // Save server messages back to local database
        await localDb.bulkSaveMessages(id, serverMsgs);
      } else {
        if (localMsgs.length === 0) {
          triggerToast('Failed to load conversation.');
        }
      }
    } catch (e) {
      console.error('Error loading conversation:', e);
      // If we failed but loaded locally, don't show full error toast
      const { localDb } = await import('@/lib/storage/indexedDbHelper');
      const localMsgs = await localDb.getMessages(id);
      if (localMsgs.length === 0) {
        triggerToast('Error loading conversation.');
      }
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

  const handleRename = async (id: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    const userId = user?.id || null;

    // Update locally first (optimistic UI)
    try {
      const { localDb } = await import('@/lib/storage/indexedDbHelper');
      const conv = await localDb.getConversation(id);
      if (conv) {
        conv.title = newTitle.trim();
        await localDb.saveConversation(conv);
      }
      await loadConversationsFromLocal(guestId, userId);
    } catch (localErr) {
      console.error('Failed to rename locally:', localErr);
    }

    try {
      const res = await fetch('/api/conversations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, title: newTitle.trim() }),
      });
      if (res.ok) {
        triggerToast('Thread renamed.');
        setRenamingId(null);
        fetchConversationsList();
      } else {
        triggerToast('Renamed locally. Cloud sync pending.');
        setRenamingId(null);
      }
    } catch (e) {
      console.error(e);
      triggerToast('Renamed locally (offline).');
      setRenamingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    const userId = user?.id || null;

    // Delete locally first (optimistic UI)
    try {
      const { localDb } = await import('@/lib/storage/indexedDbHelper');
      await localDb.deleteConversation(id);
      await loadConversationsFromLocal(guestId, userId);
      if (activeConversationId === id) {
        setMessages([]);
        setActiveConversationId(null);
      }
    } catch (localErr) {
      console.error('Failed to delete locally:', localErr);
    }

    try {
      const res = await fetch(`/api/conversations?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        triggerToast('Thread deleted.');
        setDeletingId(null);
        fetchConversationsList();
      } else {
        triggerToast('Deleted locally. Cloud sync failed.');
        setDeletingId(null);
      }
    } catch (e) {
      console.error(e);
      triggerToast('Deleted locally (offline).');
      setDeletingId(null);
    }
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
    const loginHeaderColor = themeMode === 'plaster' ? '#000000' : '#ffffff';
    return (
      <main className="w-full h-[100dvh] overflow-y-auto md:overflow-hidden flex flex-col items-center justify-start md:justify-center relative font-sans py-12 md:py-0 select-none">
        {/* Animated fluid waves background */}
        <WavesBackground isLoginPage={true} />

        {/* Header Title for Mobile */}
        <div className="md:hidden flex flex-col items-center text-center mb-6 z-10 select-none px-4">
          <div className="w-14 h-14 mb-3">
            <img 
              src="/logo.png" 
              alt="Xerxes AI Logo" 
              className="w-full h-full object-contain filter drop-shadow-[0_0_8px_rgba(255,255,255,0.15)]" 
            />
          </div>
          <h1 className="font-header text-4xl font-extrabold tracking-wide leading-none transition-colors duration-1000" style={{ color: loginHeaderColor }}>
            Xerxes AI
          </h1>
          <p className="font-header text-sm font-bold tracking-wide mt-2 uppercase transition-colors duration-1000" style={{ color: loginHeaderColor }}>
            One Agent, All Your Workflows!
          </p>
        </div>

        {/* Interactive Split Layout container */}
        <div className="z-10 w-full max-w-6xl px-4 md:px-8 flex flex-col md:flex-row items-center justify-center gap-10 md:gap-16">
          
          {/* Left Column: Interactive Palette Cards UI */}
          <div className="flex-1 w-full flex flex-col items-center md:items-start text-center md:text-left">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="hidden md:flex flex-col mb-6 select-none"
            >
              <div className="flex items-center gap-4 mb-2">
                <div className="w-12 h-12">
                  <img 
                    src="/logo.png" 
                    alt="Xerxes AI Logo" 
                    className="w-full h-full object-contain filter drop-shadow-[0_0_8px_rgba(255,255,255,0.15)]" 
                  />
                </div>
                <h1 className="font-header text-5xl md:text-6xl font-extrabold tracking-wide leading-none transition-colors duration-1000" style={{ color: loginHeaderColor }}>
                  Xerxes AI
                </h1>
              </div>
              <p className="font-header text-lg md:text-xl font-bold tracking-wider mt-1 pl-1 text-left uppercase transition-colors duration-1000" style={{ color: loginHeaderColor }}>
                One Agent, All Your Workflows!
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, type: "spring" }}
              className="w-full"
            >
              <InteractivePaletteCards isLanding={true} />
            </motion.div>
          </div>

          {/* Right Column: Glassmorphic Login Card */}
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
            className="flex flex-col items-center text-center p-8 md:p-12 bg-[#0A1931]/85 backdrop-blur-2xl border border-white/10 rounded-[36px] shadow-[0_24px_64px_rgba(0,0,0,0.3)] transition-all duration-500 max-w-sm w-full select-none"
          >
            <div className="w-20 h-20 mb-6 bg-transparent hidden md:block">
              <img 
                src="/logo.png" 
                alt="Xerxes AI Logo" 
                className="w-full h-full object-contain filter drop-shadow-[0_0_12px_rgba(255,255,255,0.18)]" 
              />
            </div>
            
            <h2 className="font-header text-2xl md:text-3xl font-bold tracking-wide leading-none mb-3 text-white">
              Get Started
            </h2>
            <p className="text-xs text-white/60 leading-relaxed mb-8 max-w-[280px]">
              Access your workflows, manage model routes, and explore next-gen AI assistance.
            </p>

            <div className="flex flex-col gap-3.5 w-full items-center">
              {/* Sign in with Privy */}
              <button
                onClick={() => login()}
                className="w-full h-12 bg-white hover:bg-white/90 text-black font-bold rounded-full text-xs transition-all duration-300 shadow-[0_4px_16px_rgba(255,255,255,0.05)] hover:scale-102 active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Sign In</span>
              </button>

              {/* Guest Login */}
              <button
                onClick={handleGuestLogin}
                className="w-full h-12 bg-transparent hover:bg-white/5 text-white border border-white/20 hover:border-white/40 rounded-full text-xs font-semibold transition-all duration-300 hover:scale-102 active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Explore as a Guest</span>
              </button>
            </div>
          </motion.div>

        </div>
      </main>
    );
  }

  const activeTextClass = themeMode === 'plaster' ? 'text-[#800021]' : 'text-[#042842]';
  const hoverTextClass = themeMode === 'plaster' ? 'hover:text-[#800021]' : 'hover:text-[#042842]';

  return (
    <main className="w-full h-[100dvh] overflow-hidden flex flex-col relative bg-background text-foreground font-sans transition-colors duration-1000">
      {/* Dynamic backdrop */}
      {themeMode === 'default' ? (
        <AmbientScene />
      ) : (
        <WavesBackground />
      )}

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
        {/* Compact Switcher Pill on Active Page */}
        {(authenticated || isGuestMode) && (
          <div className="flex items-center gap-1 p-1 bg-black/40 backdrop-blur-xl border border-white/10 rounded-full shadow-lg select-none">
            <button
              onClick={() => setThemeMode('ocean')}
              className={`py-1 px-2.5 text-[9px] font-bold rounded-full transition-all cursor-pointer ${
                themeMode === 'ocean' || themeMode === 'default'
                  ? 'bg-white text-black shadow-sm'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              Ocean
            </button>
            <button
              onClick={() => setThemeMode('plaster')}
              className={`py-1 px-2.5 text-[9px] font-bold rounded-full transition-all cursor-pointer ${
                themeMode === 'plaster'
                  ? 'bg-white text-black shadow-sm'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              Plaster
            </button>
          </div>
        )}

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
          className={`absolute md:relative h-[calc(100dvh-2rem)] my-4 md:ml-4 bg-card backdrop-blur-2xl border border-border/30 rounded-[28px] flex flex-col justify-between py-6 z-50 select-none shadow-[0_8px_32px_rgba(0,0,0,0.08)] overflow-hidden shrink-0 text-card-foreground transition-transform duration-300 ${
            isSidebarOpen ? 'translate-x-4 md:translate-x-0' : '-translate-x-32 md:translate-x-0'
          }`}
        >
          {/* Top Panel Actions */}
          <div className="space-y-6 flex flex-col items-center w-full">
            {/* Sidebar Top: Hamburger Menu Button and Xerxes Logo */}
            <div className="flex items-center gap-3 px-5 w-full h-8 overflow-hidden">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-1.5 rounded-full text-card-foreground hover:bg-card-foreground/10 transition-all cursor-pointer shrink-0"
                title="Toggle Sidebar"
              >
                <Menu className="w-7 h-7" />
              </button>
              {isSidebarOpen && (
                <div className="flex items-center select-none shrink-0">
                  <span className="font-header font-bold text-sm tracking-wide text-card-foreground">
                    Xerxes
                  </span>
                </div>
              )}
            </div>

            {/* New Chat Button */}
            <div className="px-3.5 w-full">
              <button
                onClick={startNewChat}
                className={`w-full h-10 bg-foreground/10 border border-border/15 hover:bg-white ${hoverTextClass} hover:shadow-sm text-card-foreground font-bold rounded-full text-xs transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer overflow-hidden whitespace-nowrap`}
              >
                <Plus className={`w-4 h-4 shrink-0 ${themeMode === 'plaster' ? 'text-white' : 'text-accent'}`} />
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
                  className={`w-full h-10 bg-foreground/10 border border-border/15 hover:bg-white ${hoverTextClass} hover:shadow-sm text-card-foreground font-bold rounded-full text-xs transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer overflow-hidden whitespace-nowrap`}
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
              <div className="w-full px-4 pt-3 border-t border-border/15 space-y-2">
                <h4 className="text-[9px] uppercase font-bold tracking-wider text-card-foreground/40 font-header">
                  Recent Threads
                </h4>
                <div className="space-y-1 max-h-48 overflow-y-auto pr-1 tiny-scrollbar">
                  {conversations.length === 0 ? (
                    <p className="text-[10px] text-card-foreground/30 text-center py-2">No threads saved.</p>
                  ) : (
                    conversations.map((chat) => (
                      <div
                        key={chat.id}
                        className={`relative group flex items-center justify-between p-1.5 transition-all rounded-[12px] ${
                          activeConversationId === chat.id
                            ? `bg-white ${activeTextClass} font-bold shadow-sm`
                            : `text-card-foreground/70 hover:bg-white ${hoverTextClass} hover:font-bold hover:shadow-sm`
                        }`}
                      >
                        {renamingId === chat.id ? (
                          <div className="flex items-center gap-1 w-full px-1">
                            <input
                              type="text"
                              value={renameTitle}
                              onChange={(e) => setRenameTitle(e.target.value)}
                              onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleRename(chat.id, renameTitle);
                                  if (e.key === 'Escape') setRenamingId(null);
                              }}
                              className="w-full bg-transparent border-b border-border text-[11px] text-card-foreground font-medium focus:outline-none focus:ring-0 px-0.5 py-0.5"
                              autoFocus
                            />
                            <button
                              onClick={() => handleRename(chat.id, renameTitle)}
                              className="p-1 hover:bg-foreground/10 rounded text-green-700 cursor-pointer"
                              title="Save"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => setRenamingId(null)}
                              className="p-1 hover:bg-[#1F110E]/10 rounded text-red-700 cursor-pointer"
                              title="Cancel"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => loadConversation(chat.id)}
                              className="flex-1 text-left text-[11px] truncate block cursor-pointer transition-all font-semibold pl-1"
                              title={chat.title || 'Untitled Thread'}
                            >
                              {chat.title || 'Untitled Thread'}
                            </button>
                            
                             <div className="relative shrink-0 flex items-center">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setMenuOpenId(menuOpenId === chat.id ? null : chat.id);
                                }}
                                className="p-1 rounded-full text-current opacity-60 hover:opacity-100 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                                title="Thread Options"
                              >
                                <MoreVertical className="w-3.5 h-3.5" />
                              </button>

                              <AnimatePresence>
                                {menuOpenId === chat.id && (
                                  <>
                                    <div 
                                      className="fixed inset-0 z-30" 
                                      onClick={() => setMenuOpenId(null)} 
                                    />
                                    <motion.div
                                      initial={{ opacity: 0, scale: 0.95, y: -4 }}
                                      animate={{ opacity: 1, scale: 1, y: 0 }}
                                      exit={{ opacity: 0, scale: 0.95, y: -4 }}
                                      className="absolute right-0 top-6 w-24 bg-card border border-border rounded-[12px] py-1.5 z-40 shadow-lg text-[10px] text-card-foreground flex flex-col font-sans"
                                    >
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setRenameTitle(chat.title || '');
                                          setRenamingId(chat.id);
                                          setMenuOpenId(null);
                                        }}
                                        className="w-full text-left px-3 py-1.5 hover:bg-secondary transition-all flex items-center gap-1.5 font-medium cursor-pointer"
                                      >
                                        <Edit2 className="w-3 h-3 text-accent" />
                                        <span>Rename</span>
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setDeletingId(chat.id);
                                          setMenuOpenId(null);
                                        }}
                                        className="w-full text-left px-3 py-1.5 hover:bg-secondary transition-all flex items-center gap-1.5 font-medium text-red-400 cursor-pointer"
                                      >
                                        <Trash2 className="w-3 h-3 text-red-400" />
                                        <span>Delete</span>
                                      </button>
                                    </motion.div>
                                  </>
                                )}
                              </AnimatePresence>
                            </div>
                          </>
                        )}
                      </div>
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
                <div className="w-full bg-foreground/5 border border-border/15 rounded-[20px] p-3 flex flex-col items-center gap-2 overflow-hidden transition-all duration-300">
                  {isSidebarOpen ? (
                    <>
                      <span className="text-[10px] font-semibold truncate max-w-full text-card-foreground/80">
                        {user?.email?.address || 'Active User'}
                      </span>
                      <button
                        onClick={() => logout()}
                        className={`w-full py-1.5 bg-foreground text-background border border-transparent font-bold rounded-full text-[10px] transition-all flex items-center justify-center gap-1 cursor-pointer hover:bg-white ${hoverTextClass} hover:shadow-sm`}
                      >
                        Log out
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => logout()}
                      className={`p-2 bg-foreground text-background border border-transparent rounded-full transition-all flex items-center justify-center cursor-pointer hover:bg-white ${hoverTextClass} hover:shadow-sm`}
                      title="Log out"
                    >
                      <LogOut className="w-4.5 h-4.5" />
                    </button>
                  )}
                </div>
              ) : isGuestMode ? (
                <div className="w-full bg-foreground/5 border border-border/15 rounded-[20px] p-3 flex flex-col items-center gap-2 overflow-hidden transition-all duration-300">
                  {isSidebarOpen ? (
                    <>
                      <span className="text-[10px] font-semibold truncate max-w-full text-card-foreground/60">
                        Guest Explorer
                      </span>
                      <button
                        onClick={startNewChat}
                        className="w-full py-1.5 bg-transparent border border-border/20 text-card-foreground font-bold rounded-full text-[10px] transition-all flex items-center justify-center gap-1 cursor-pointer hover:bg-card-foreground/5"
                      >
                        Exit Mode
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={startNewChat}
                      className="p-2 bg-transparent border border-border/20 text-card-foreground rounded-full transition-all flex items-center justify-center cursor-pointer hover:bg-card-foreground/5"
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
                    className="w-full h-10 bg-foreground/10 border border-border/15 hover:bg-foreground hover:text-background text-card-foreground font-bold rounded-full text-xs transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer overflow-hidden whitespace-nowrap"
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
              initial={{ scale: 0.85, y: -12, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              whileHover={{ 
                scale: 1.05, 
                y: -1,
                transition: { type: "spring", stiffness: 450, damping: 12 }
              }}
              style={{ originY: 0.5 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            >
              <div className="flex items-center gap-2 cursor-pointer filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.15)] hover:drop-shadow-[0_6px_12px_rgba(0,0,0,0.35)] transition-all duration-300">
                <motion.div
                  layoutId="xerxes-logo-image"
                  className="w-8 h-8 bg-transparent shrink-0"
                  transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                >
                  <img src="/logo.png" alt="Logo" className="w-full h-full object-contain filter drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]" />
                </motion.div>
                <motion.h2
                  layoutId="xerxes-logo"
                  className="font-header text-xl md:text-2xl font-bold tracking-wide leading-none"
                  style={{ color: '#000000' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                >
                  Xerxes AI
                </motion.h2>
              </div>
              <motion.p
                layoutId="xerxes-subtitle"
                className="font-header text-[9px] md:text-[10px] font-light tracking-widest mt-0.5"
                style={{ color: 'rgba(0,0,0,0.6)' }}
                transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              >
                One Agent , Your All Workflows !
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
      {/* Modern Card Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-sm mx-4 bg-card border border-border rounded-[28px] p-6 shadow-2xl text-card-foreground"
            >
              <h3 className="font-header text-lg font-bold mb-2">Delete Conversation?</h3>
              <p className="text-xs text-card-foreground/60 leading-relaxed mb-6">
                Are you sure you want to delete this thread? This will permanently erase the message history. This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setDeletingId(null)}
                  className="px-4 py-2 bg-transparent hover:bg-foreground/5 border border-border/20 hover:border-border/30 text-xs font-semibold rounded-full transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deletingId)}
                  className="px-4 py-2 bg-accent hover:bg-accent/90 text-accent-foreground text-xs font-semibold rounded-full transition-all cursor-pointer shadow-sm"
                >
                  Delete Thread
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
