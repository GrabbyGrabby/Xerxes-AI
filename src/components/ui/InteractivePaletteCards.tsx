'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { 
  Copy, Check, Paintbrush, RefreshCw, Layers, Sparkles, Plus, Trash2, Sliders, Info
} from 'lucide-react';
import { 
  useTheme, 
  OCEAN_PALETTE, 
  PLASTER_PALETTE, 
  ThemeMode,
  ColorPalette
} from '../providers/ThemeContext';

const FEATURE_TEXTS = [
  "Agentic MultiModal AI Workspace",
  "Multimodal agentic loop, vector search, and JWT authentication",
  "Semantic chunking and vector embeddings in Supabase",
  "MultiModel LLM Routing, Decentralized Pinata IPFS Tracking",
  "Secure, decentralized, and scalable agentic architecture"
];

interface InteractivePaletteCardsProps {
  isLanding?: boolean;
}

export default function InteractivePaletteCards({ isLanding = false }: InteractivePaletteCardsProps) {
  const { 
    themeMode, 
    setThemeMode, 
    activeColors, 
    applyTheme, 
    customPalette, 
    setCustomPalette,
    resetToDefault
  } = useTheme();

  const [mounted, setMounted] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [showTrueHex, setShowTrueHex] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [activePalette, setActivePalette] = useState<ColorPalette>(OCEAN_PALETTE);
  
  // Card hover states for local 3D tilt
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setMounted(true);
    // Set initial active palette based on theme mode
    if (themeMode === 'ocean' || themeMode === 'default') {
      setActivePalette(OCEAN_PALETTE);
    } else if (themeMode === 'plaster') {
      setActivePalette(PLASTER_PALETTE);
    } else if (themeMode === 'custom' && customPalette) {
      setActivePalette(customPalette);
    }
  }, [themeMode, customPalette]);

  if (!mounted) return null;

  // Handle color click (copy to clipboard)
  const handleCopy = (text: string, index: number) => {
    if (isLanding) return; // Prevent copying on landing page
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1800);
  };

  // Switch between themes
  const handleThemeChange = (mode: ThemeMode) => {
    setThemeMode(mode);
    if (mode === 'ocean') {
      setActivePalette(OCEAN_PALETTE);
    } else if (mode === 'plaster') {
      setActivePalette(PLASTER_PALETTE);
    } else if (mode === 'custom') {
      if (customPalette) {
        setActivePalette(customPalette);
      } else {
        // Create initial custom palette cloning Ocean
        const initialCustom: ColorPalette = {
          name: 'Custom Theme',
          id: 'custom',
          colors: [...OCEAN_PALETTE.colors],
          labels: [...OCEAN_PALETTE.labels],
          visualColors: [...OCEAN_PALETTE.visualColors],
          themeColors: { ...OCEAN_PALETTE.themeColors }
        };
        setCustomPalette(initialCustom);
        setActivePalette(initialCustom);
        setThemeMode('custom');
      }
    }
  };

  // Reordering cards
  const handleReorder = (newColors: string[]) => {
    const updatedPalette = { ...activePalette };
    const reorderedIndices = newColors.map(color => activePalette.colors.indexOf(color));
    
    updatedPalette.colors = newColors;
    updatedPalette.labels = reorderedIndices.map(idx => activePalette.labels[idx]);
    updatedPalette.visualColors = reorderedIndices.map(idx => activePalette.visualColors[idx]);
    
    // Re-map the theme colors dynamically
    if (newColors.length >= 5) {
      updatedPalette.themeColors = {
        background: newColors[0],
        accent: newColors[1],
        secondary: newColors[2],
        card: newColors[3],
        foreground: newColors[4],
        cardForeground: newColors[4],
        primary: newColors[1],
        primaryForeground: newColors[0],
        secondaryForeground: newColors[4],
        muted: newColors[3],
        mutedForeground: newColors[2],
        accentForeground: newColors[0],
        border: newColors[3],
        ring: newColors[1]
      };
    }

    setActivePalette(updatedPalette);

    if (activePalette.id === 'custom') {
      setCustomPalette(updatedPalette);
    }
  };

  // Modify individual card color
  const handleColorChange = (index: number, newColor: string) => {
    const updatedPalette = { ...activePalette };
    updatedPalette.colors[index] = newColor;
    updatedPalette.visualColors[index] = newColor;
    updatedPalette.labels[index] = newColor.toUpperCase().replace('#', '');
    
    // Dynamically rebuild theme mapping
    if (updatedPalette.colors.length >= 5) {
      updatedPalette.themeColors = {
        background: updatedPalette.colors[0],
        accent: updatedPalette.colors[1],
        secondary: updatedPalette.colors[2],
        card: updatedPalette.colors[3],
        foreground: updatedPalette.colors[4],
        cardForeground: updatedPalette.colors[4],
        primary: updatedPalette.colors[1],
        primaryForeground: updatedPalette.colors[0],
        secondaryForeground: updatedPalette.colors[4],
        muted: updatedPalette.colors[3],
        mutedForeground: updatedPalette.colors[2],
        accentForeground: updatedPalette.colors[0],
        border: updatedPalette.colors[3],
        ring: updatedPalette.colors[1]
      };
    }

    setActivePalette(updatedPalette);

    if (activePalette.id !== 'custom') {
      const customClone: ColorPalette = {
        ...updatedPalette,
        name: 'Custom Theme',
        id: 'custom'
      };
      setCustomPalette(customClone);
      setThemeMode('custom');
    } else {
      setCustomPalette(updatedPalette);
      applyTheme(updatedPalette.themeColors);
    }
  };

  // Add custom color card
  const addColorCard = () => {
    const randomColors = ['#E57373', '#F06292', '#BA68C8', '#9575CD', '#7986CB', '#64B5F6', '#4FC3F7', '#4DB6AC', '#81C784', '#DCE775', '#FFF176', '#FFB74D'];
    const newColor = randomColors[Math.floor(Math.random() * randomColors.length)];
    
    const updatedColors = [...activePalette.colors, newColor];
    const updatedLabels = [...activePalette.labels, newColor.toUpperCase().replace('#', '')];
    const updatedVisuals = [...activePalette.visualColors, newColor];

    const updatedPalette: ColorPalette = {
      name: 'Custom Theme',
      id: 'custom',
      colors: updatedColors,
      labels: updatedLabels,
      visualColors: updatedVisuals,
      themeColors: {
        ...activePalette.themeColors,
        foreground: '#F6FAFD',
        cardForeground: '#F6FAFD'
      }
    };

    setCustomPalette(updatedPalette);
    setActivePalette(updatedPalette);
    setThemeMode('custom');
  };

  // Delete color card
  const deleteColorCard = (index: number) => {
    if (activePalette.colors.length <= 3) return;
    
    const updatedColors = activePalette.colors.filter((_, idx) => idx !== index);
    const updatedLabels = activePalette.labels.filter((_, idx) => idx !== index);
    const updatedVisuals = activePalette.visualColors.filter((_, idx) => idx !== index);

    const updatedPalette: ColorPalette = {
      name: 'Custom Theme',
      id: 'custom',
      colors: updatedColors,
      labels: updatedLabels,
      visualColors: updatedVisuals,
      themeColors: {
        background: updatedColors[0],
        accent: updatedColors[1],
        secondary: updatedColors[2] || updatedColors[0],
        card: updatedColors[3] || updatedColors[0],
        foreground: '#FAF1EB',
        cardForeground: '#FAF1EB',
        primary: updatedColors[1],
        primaryForeground: updatedColors[0],
        secondaryForeground: '#FAF1EB',
        muted: updatedColors[2] || updatedColors[0],
        mutedForeground: updatedColors[1],
        accentForeground: updatedColors[0],
        border: updatedColors[3] || updatedColors[0],
        ring: updatedColors[1]
      }
    };

    setCustomPalette(updatedPalette);
    setActivePalette(updatedPalette);
    setThemeMode('custom');
  };

  // Card mouse movement for local 3D Tilt
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>, index: number) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    const rotateX = -(y / (rect.height / 2)) * 10;
    const rotateY = (x / (rect.width / 2)) * 10;
    setTilt({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
    setTilt({ x: 0, y: 0 });
  };

  const getContrastColor = (hexcolor: string) => {
    const hex = hexcolor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? '#000000' : '#FFFFFF';
  };

  const cardItems = isLanding ? FEATURE_TEXTS : activePalette.colors;

  return (
    <div className="w-full flex flex-col items-center max-w-xl mx-auto px-4 z-20">
      
      {/* Palette Navigation Controls */}
      {isLanding ? (
        // Small switcher at top right of the cards container
        <div className="w-full flex justify-end mb-4">
          <div className="flex items-center gap-1 p-1 bg-black/40 backdrop-blur-xl border border-white/10 rounded-full shadow-lg select-none">
            <button
              onClick={() => handleThemeChange('ocean')}
              className={`py-1.5 px-3 text-[10px] font-bold rounded-full transition-all cursor-pointer ${
                themeMode === 'ocean' || themeMode === 'default'
                  ? 'bg-white text-black shadow-sm'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              Ocean Waves
            </button>
            <button
              onClick={() => handleThemeChange('plaster')}
              className={`py-1.5 px-3 text-[10px] font-bold rounded-full transition-all cursor-pointer ${
                themeMode === 'plaster'
                  ? 'bg-white text-black shadow-sm'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              Warm Plaster
            </button>
          </div>
        </div>
      ) : (
        // Normal wide switcher inside the app
        <div className="w-full flex items-center justify-between mb-6 p-1.5 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl select-none">
          <div className="flex items-center gap-1.5 w-full">
            <button
              onClick={() => handleThemeChange('ocean')}
              className={`flex-1 py-2 px-3 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                themeMode === 'ocean' 
                  ? 'bg-white text-black shadow-md' 
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Ocean Waves</span>
            </button>
            
            <button
              onClick={() => handleThemeChange('plaster')}
              className={`flex-1 py-2 px-3 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                themeMode === 'plaster' 
                  ? 'bg-white text-black shadow-md' 
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Paintbrush className="w-3.5 h-3.5" />
              <span>Warm Plaster</span>
            </button>

            <button
              onClick={() => handleThemeChange('custom')}
              className={`flex-1 py-2 px-3 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                themeMode === 'custom' 
                  ? 'bg-white text-black shadow-md' 
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Custom</span>
            </button>
          </div>
        </div>
      )}

      {/* Easter Egg / Designer Note Bubble - Only in app workspace customizer */}
      {!isLanding && themeMode === 'plaster' && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full mb-6 p-3 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl text-[10px] text-white/70 leading-relaxed flex gap-2.5 items-start"
        >
          <Info className="w-4 h-4 text-[#C08E66] shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-white">Palette Design Fact:</span> In the uploaded Warm Plaster image, the printed hex codes differ from the visual colors. We display the visual colors for accuracy but print the original codes. 
            <button 
              onClick={() => setShowTrueHex(!showTrueHex)}
              className="text-[#C08E66] hover:underline font-bold ml-1.5 inline-block"
            >
              {showTrueHex ? "Show original codes" : "Reveal actual colors"}
            </button>
          </div>
        </motion.div>
      )}

      {/* Interactive Cards Container */}
      <div className="w-full select-none">
        <Reorder.Group 
          axis="y" 
          values={cardItems} 
          onReorder={isLanding ? () => {} : handleReorder} // Disable reordering on landing page
          className="space-y-4 w-full flex flex-col"
        >
          {cardItems.map((item, index) => {
            // Retrieve color mapping for the active color index
            const color = activePalette.colors[index] || activePalette.colors[activePalette.colors.length - 1];
            const visualColor = activePalette.visualColors[index] || activePalette.visualColors[activePalette.visualColors.length - 1] || color;
            const labelText = activePalette.labels[index] || color.replace('#', '');
            
            let displayLabel = labelText;
            if (isLanding) {
              displayLabel = item;
            } else if (themeMode === 'plaster' && showTrueHex) {
              displayLabel = visualColor.toUpperCase().replace('#', '');
            }

            const contrastColor = getContrastColor(visualColor);

            return (
              <Reorder.Item
                key={isLanding ? item : color}
                value={isLanding ? item : color}
                dragListener={!isLanding && editMode}
                className="w-full focus:outline-none"
              >
                <motion.div
                  onMouseMove={(e) => {
                    setHoveredIndex(index);
                    handleMouseMove(e, index);
                  }}
                  onMouseLeave={handleMouseLeave}
                  onClick={(!editMode && !isLanding) ? () => handleCopy(visualColor, index) : undefined}
                  style={{
                    backgroundColor: visualColor,
                    color: contrastColor,
                    transform: hoveredIndex === index 
                      ? `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale3d(1.02, 1.02, 1.02)` 
                      : 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
                    boxShadow: isLanding 
                      ? '0 6px 16px rgba(0, 0, 0, 0.12)' 
                      : hoveredIndex === index 
                        ? `0 20px 40px -10px ${visualColor}40, 0 0 0 1px ${contrastColor}10` 
                        : `0 8px 24px -8px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.05)`,
                  }}
                  animate={{
                    y: hoveredIndex === index ? -4 : [0, -4, 0],
                  }}
                  transition={{
                    y: hoveredIndex === index 
                      ? { type: 'spring', stiffness: 400, damping: 25 }
                      : { duration: 3.5 + index * 0.4, repeat: Infinity, ease: "easeInOut" },
                    transform: { type: 'spring', stiffness: 450, damping: 22 }
                  }}
                  className={`w-full ${
                    isLanding ? 'h-auto min-h-[4.5rem] py-3.5 cursor-default rounded-[32px] md:rounded-[40px]' : 'h-16 md:h-20 cursor-pointer rounded-[20px] md:rounded-[24px]'
                  } px-6 md:px-8 flex items-center justify-between transition-shadow relative overflow-hidden select-none border border-transparent`}
                >
                  {/* Subtle shine hover reflection - Disabled in landing page to prevent glassy glow */}
                  {!isLanding && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full hover:animate-[shimmer_1.5s_infinite] pointer-events-none" />
                  )}

                  {/* Card Left: Color Code or Feature Description Label */}
                  <div className="flex items-center gap-3 w-full pr-2">
                    {!isLanding && editMode && (
                      <div className="cursor-grab active:cursor-grabbing p-1 hover:bg-black/10 rounded mr-1 shrink-0">
                        <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5" className="opacity-60">
                          <line x1="4" y1="6" x2="16" y2="6" />
                          <line x1="4" y1="10" x2="16" y2="10" />
                          <line x1="4" y1="14" x2="16" y2="14" />
                        </svg>
                      </div>
                    )}
                    <span 
                      className={`font-semibold tracking-wide ${
                        isLanding ? 'font-sans text-xs md:text-sm text-left leading-snug w-full pr-1.5' : 'font-mono text-base md:text-lg font-header'
                      }`}
                      style={{ color: contrastColor }}
                    >
                      {displayLabel}
                    </span>
                  </div>

                  {/* Card Right: Actions (Copy / Color Picker / Delete) - Hashed out entirely on Landing Page */}
                  {!isLanding && (
                    <div className="flex items-center gap-2 shrink-0">
                      <AnimatePresence mode="wait">
                        {copiedIndex === index ? (
                          <motion.div
                            key="copied"
                            initial={{ scale: 0.6, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.6, opacity: 0 }}
                            className="flex items-center gap-1.5 bg-black/15 px-3 py-1 rounded-full text-xs font-semibold"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Copied!</span>
                          </motion.div>
                        ) : editMode ? (
                          <motion.div 
                            key="edit-controls"
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-2"
                          >
                            <div className="relative w-8 h-8 rounded-full bg-black/10 hover:bg-black/20 flex items-center justify-center transition-colors">
                              <Paintbrush className="w-4 h-4" />
                              <input
                                type="color"
                                value={visualColor}
                                onChange={(e) => handleColorChange(index, e.target.value)}
                                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                              />
                            </div>

                            {activePalette.colors.length > 3 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteColorCard(index);
                                }}
                                className="w-8 h-8 rounded-full bg-red-500/10 hover:bg-red-500/25 flex items-center justify-center text-red-500 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </motion.div>
                        ) : (
                          <motion.div
                            key="copy-icon"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.5 }}
                            whileHover={{ opacity: 1, scale: 1.1 }}
                            className="p-2"
                          >
                            <Copy className="w-4 h-4" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </motion.div>
              </Reorder.Item>
            );
          })}
        </Reorder.Group>
      </div>

      {/* Bottom Interface Controls - Hidden on Landing Page */}
      {!isLanding && (
        <div className="w-full flex flex-col gap-3 mt-8 select-none">
          <div className="flex gap-2.5 w-full">
            <button
              onClick={() => setEditMode(!editMode)}
              className={`flex-1 py-3 border rounded-full text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm ${
                editMode
                  ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
                  : 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{editMode ? 'Done Customizing' : 'Customize Colors'}</span>
            </button>

            {editMode && (
              <motion.button
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                onClick={addColorCard}
                className="px-4 py-3 bg-white text-black border border-white rounded-full text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md hover:bg-white/95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Color</span>
              </motion.button>
            )}
          </div>

          <div className="flex gap-2.5 w-full mt-1.5">
            <button
              onClick={() => applyTheme(activePalette.themeColors)}
              className="flex-1 py-3.5 bg-white text-black border border-white hover:bg-white/95 text-xs font-bold rounded-full transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_4px_20px_rgba(255,255,255,0.15)] active:scale-98"
            >
              <Sparkles className="w-4 h-4 text-[#C08E66]" />
              <span>Apply Theme to Website</span>
            </button>

            {themeMode !== 'default' && (
              <button
                onClick={resetToDefault}
                className="py-3.5 px-4 bg-transparent border border-white/10 hover:border-white/20 text-white/70 hover:text-white rounded-full text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                title="Reset to default theme"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
