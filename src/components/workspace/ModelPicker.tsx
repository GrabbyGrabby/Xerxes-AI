'use client';

import React, { useState, useEffect } from 'react';
import { useSessionStore } from '@/store/useSessionStore';
import { ChevronDown, Cpu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ModelPicker() {
  const activeModelId = useSessionStore((state) => state.activeModelId);
  const setActiveModelId = useSessionStore((state) => state.setActiveModelId);
  const availableModels = useSessionStore((state) => state.availableModels);
  const setAvailableModels = useSessionStore((state) => state.setAvailableModels);
  
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const res = await fetch('/api/models');
        if (res.ok) {
          const data = await res.json();
          setAvailableModels(data.models);
        }
      } catch (e) {
        console.error('Failed to load models list:', e);
      }
    };
    fetchModels();
  }, [setAvailableModels]);

  const activeModel = availableModels.find((m) => m.id === activeModelId) || {
    id: activeModelId,
    display_name: 'Auto Select',
    is_healthy: true,
  };

  const groupedModels = availableModels.reduce((acc, model) => {
    const cat = model.category || 'chat';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(model);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="relative font-sans">
      {/* Selector Button - Dark brown matching theme */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 rounded-full border border-[#4A2F29] bg-[#301A15] text-xs font-semibold text-white hover:bg-[#1F110E] hover:border-[#D35E43] transition-all duration-300 select-none shadow-[0_2px_8px_rgba(0,0,0,0.2)] cursor-pointer"
      >
        <span className="font-semibold tracking-tight">{activeModel.display_name}</span>
        <ChevronDown className="w-3.5 h-3.5 opacity-60 text-white" />
      </button>

      {/* Dropdown Panel - Styled in premium dark brown */}
      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="absolute left-0 bottom-full mb-3 w-64 bg-[#1F110E] border border-[#4A2F29] rounded-[28px] p-2.5 z-50 shadow-[0_16px_40px_rgba(0,0,0,0.12)] overflow-hidden text-white"
            >
              <div className="px-3 py-1.5 border-b border-[#2C1813] mb-1.5">
                <span className="text-[9px] uppercase font-bold tracking-wider text-white/40">Select Model</span>
              </div>

              <div className="max-h-56 overflow-y-auto space-y-0.5 pr-1 tiny-scrollbar">
                {Object.entries(groupedModels).map(([category, models]) => (
                  <div key={category} className="mb-2">
                    <div className="px-3 py-1 text-[10px] uppercase font-bold text-white/40 tracking-widest">{category}</div>
                    {(models as any[]).map((model) => {
                      const isSelected = model.id === activeModelId;
                      return (
                        <button
                          key={model.id}
                          type="button"
                          onClick={() => {
                            setActiveModelId(model.id);
                            setIsOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-[16px] border transition-all flex flex-col justify-center select-none cursor-pointer ${
                            isSelected
                              ? 'border-transparent bg-white text-[#1F110E]'
                              : 'border-transparent hover:bg-white/5 text-white/80 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Cpu className={`w-3.5 h-3.5 ${isSelected ? 'text-[#1F110E]' : 'text-white/40'}`} />
                            <span className="truncate text-xs font-semibold">{model.display_name}</span>
                          </div>
                          {model.description && (
                            <span className={`text-[9px] mt-0.5 pl-5 leading-tight block ${isSelected ? 'text-[#1F110E]/80' : 'text-white/60'}`}>
                              {model.description}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
