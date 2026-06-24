'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useSessionStore } from '@/store/useSessionStore';
import { usePrivy } from '@privy-io/react-auth';
import { Paperclip, ArrowUp, Loader2, Image as ImageIcon, FileText, X } from 'lucide-react';
import ModelPicker from './ModelPicker';

export default function Composer() {
  const { authenticated, getAccessToken } = usePrivy();
  const guestId = useSessionStore((state) => state.guestId);
  const activeModelId = useSessionStore((state) => state.activeModelId);
  
  const messages = useSessionStore((state) => state.messages);
  const setMessages = useSessionStore((state) => state.setMessages);
  const addMessage = useSessionStore((state) => state.addMessage);
  const updateLastMessageText = useSessionStore((state) => state.updateLastMessageText);
  const isStreaming = useSessionStore((state) => state.isStreaming);
  const setIsStreaming = useSessionStore((state) => state.setIsStreaming);
  
  const addToolCall = useSessionStore((state) => state.addToolCall);
  const updateToolCall = useSessionStore((state) => state.updateToolCall);
  const clearToolCalls = useSessionStore((state) => state.clearToolCalls);
  const setCredits = useSessionStore((state) => state.setCredits);

  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<any[]>([]);
  const [uploadStatus, setUploadStatus] = useState<{
    filename: string;
    progress: 'requesting_url' | 'uploading_ipfs' | 'indexing_rag' | 'error';
    error?: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [input]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    if (file.size > 20 * 1024 * 1024) {
      setUploadStatus({
        filename: file.name,
        progress: 'error',
        error: 'Safety Limit: 20MB Max.',
      });
      return;
    }

    setUploadStatus({ filename: file.name, progress: 'requesting_url' });

    try {
      const token = authenticated ? await getAccessToken() : null;
      const urlRes = await fetch('/api/files/upload-url', {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(guestId ? { 'x-guest-id': guestId } : {}),
        },
      });

      if (!urlRes.ok) throw new Error('Signed upload rejected');
      const { jwt } = await urlRes.json();

      setUploadStatus({ filename: file.name, progress: 'uploading_ipfs' });
      const formData = new FormData();
      formData.append('file', file);

      const pinataRes = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
        body: formData,
      });

      if (!pinataRes.ok) throw new Error('IPFS upload failed');
      const pinataData = await pinataRes.json();
      const cid = pinataData.IpfsHash;

      setUploadStatus({ filename: file.name, progress: 'indexing_rag' });
      const regRes = await fetch('/api/files/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(guestId ? { 'x-guest-id': guestId } : {}),
        },
        body: JSON.stringify({
          cid,
          filename: file.name,
          mimeType: file.type,
          size: file.size,
        }),
      });

      if (!regRes.ok) throw new Error('Indexing failed');

      setAttachments((prev) => [
        ...prev,
        { cid, filename: file.name, mimeType: file.type },
      ]);
      setUploadStatus(null);
    } catch (err: any) {
      console.error('File upload error:', err);
      setUploadStatus({ filename: file.name, progress: 'error', error: err.message });
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!input.trim() && attachments.length === 0) || isStreaming) return;

    const userMessageContent = input.trim();
    const imageCids = attachments
      .filter((a) => a.mimeType.startsWith('image/'))
      .map((a) => a.cid);

    const userMessage: any = {
      role: 'user',
      content: userMessageContent,
    };

    setInput('');
    setAttachments([]);
    clearToolCalls();
    
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIsStreaming(true);

    addMessage({
      role: 'assistant',
      content: '',
    });

    try {
      const token = authenticated ? await getAccessToken() : null;
      const isGuestMode = !authenticated && typeof window !== 'undefined' && localStorage.getItem('nexus_guest_access') === 'true';
      const activeGuestId = isGuestMode ? guestId : null;

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-guest-id': activeGuestId || '',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          messages: updatedMessages,
          modelId: activeModelId,
          images: imageCids,
          currentCredits: useSessionStore.getState().credits,
          conversationId: useSessionStore.getState().activeConversationId,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || response.statusText);
      }

      if (!response.body) throw new Error('Empty payload');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() || '';

        for (const evStr of events) {
          const trimmed = evStr.trim();
          if (!trimmed) continue;

          const lines = trimmed.split('\n');
          let eventType = '';
          let dataJson = '';

          for (const line of lines) {
            if (line.startsWith('event: ')) {
              eventType = line.slice(7).trim();
            } else if (line.startsWith('data: ')) {
              dataJson = line.slice(6).trim();
            }
          }

          if (!eventType || !dataJson) continue;
          
          try {
            const data = JSON.parse(dataJson);
            if (eventType === 'delta') {
              updateLastMessageText(data.text);
            } else if (eventType === 'tool_start') {
              addToolCall({
                id: data.id,
                name: data.name,
                arguments: data.arguments,
                status: 'running',
              });
            } else if (eventType === 'tool_end') {
              updateToolCall(data.id, {
                result: data.result,
                status: 'completed',
              });
            } else if (eventType === 'usage') {
              setCredits(data.newBalance);
            } else if (eventType === 'conversation_id') {
              useSessionStore.getState().setActiveConversationId(data.conversationId);
              if (typeof window !== 'undefined' && (window as any).refreshConversations) {
                (window as any).refreshConversations();
              }
            } else if (eventType === 'error') {
              updateLastMessageText(`\n\n[Error: ${data.message}]`);
            }
          } catch (e) {
            console.error('SSE parse error:', e);
          }
        }
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      updateLastMessageText(`\n\n[Error: ${err.message || 'Connection failed'}]`);
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="w-full">
      {/* File upload status bar */}
      {uploadStatus && (
        <div className="mb-2.5 p-3 rounded-2xl border border-white/10 bg-[#1F110E] text-xs flex items-center justify-between text-white/70">
          <div className="flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 text-[#D35E43] animate-spin" />
            <span className="truncate max-w-[200px]">Uploading <strong>{uploadStatus.filename}</strong></span>
            <span className="text-[10px] text-white/50 font-semibold uppercase tracking-wider font-mono">
              ({uploadStatus.progress.replace('_', ' ')})
            </span>
          </div>
          {uploadStatus.progress === 'error' && (
            <span className="text-[#D35E43] font-bold text-[10px]">{uploadStatus.error}</span>
          )}
        </div>
      )}

      {/* Attachment chips */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2.5">
          {attachments.map((file, i) => (
            <div
              key={i}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-[#301A15] text-xs text-white"
            >
              {file.mimeType.startsWith('image/') ? (
                <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
              ) : (
                <FileText className="w-3.5 h-3.5 text-[#D35E43]" />
              )}
              <span className="max-w-[120px] truncate font-medium">{file.filename}</span>
              <button
                type="button"
                onClick={() => setAttachments((prev) => prev.filter((_, idx) => idx !== i))}
                className="hover:text-[#D35E43] transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Premium Inverted Composer Card */}
      <form onSubmit={handleSend} className="bg-[oklch(90.1%_0.076_70.697)] border border-[#1F110E]/15 rounded-[32px] p-3.5 relative shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:border-[#1F110E]/30 transition-colors duration-500">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask models anything..."
          rows={1}
          disabled={isStreaming}
          className="w-full bg-transparent border-0 text-sm text-[#1F110E] placeholder-[#1F110E]/50 focus:ring-0 focus:outline-none resize-none px-3.5 py-3 pr-14 leading-relaxed font-sans max-h-48 inside-text"
        />

        {/* Toolbar Row */}
        <div className="flex items-center justify-between border-t border-[#1F110E]/15 pt-3 px-1 mt-2">
          <div className="flex items-center gap-2">
            {/* Paperclip Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isStreaming}
              className="p-2.5 rounded-full border border-[#1F110E]/15 bg-[#1F110E]/10 text-[#1F110E] hover:bg-[#1F110E] hover:text-white hover:border-[#1F110E] transition-all duration-300 cursor-pointer disabled:opacity-50"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              accept=".pdf,.docx,.csv,.txt,.png,.jpg,.jpeg"
            />
            
            <ModelPicker />
          </div>

          {/* Dark Brown Send Button */}
          <button
            type="submit"
            disabled={(!input.trim() && attachments.length === 0) || isStreaming}
            className="p-2.5 bg-[#1F110E] hover:bg-[#1F110E]/90 disabled:bg-[#1F110E]/20 disabled:text-[#1F110E]/30 active:scale-95 text-white rounded-full transition-all shadow-sm cursor-pointer"
          >
            {isStreaming ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <ArrowUp className="w-4 h-4 text-white" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
