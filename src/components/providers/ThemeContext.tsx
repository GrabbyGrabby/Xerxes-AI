'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface ThemeColors {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  border: string;
  ring: string;
}

export type ThemeMode = 'default' | 'ocean' | 'plaster' | 'custom';

export interface ColorPalette {
  name: string;
  id: ThemeMode;
  colors: string[];
  labels: string[];
  visualColors: string[]; // For visual overrides like Warm Plaster's terracotta and cream
  themeColors: ThemeColors;
}

export const OCEAN_PALETTE: ColorPalette = {
  name: 'Ocean Waves',
  id: 'ocean',
  colors: ['#0A1931', '#B3CFE5', '#4A7FA7', '#1A3D63', '#F6FAFD'],
  labels: ['0A1931', 'B3CFE5', '4A7FA7', '1A3D63', 'F6FAFD'],
  visualColors: ['#0A1931', '#B3CFE5', '#4A7FA7', '#1A3D63', '#F6FAFD'],
  themeColors: {
    background: '#FFCC4C',         // Warm sand/yellow background on main page
    foreground: '#042842',         // Deep navy text on main page background
    card: '#042842',               // Deep navy card/sidebar/composer/picker/credits
    cardForeground: '#FAF5EF',     // Light cream text on cards
    primary: '#FFCC4C',            // Accent color matching background
    primaryForeground: '#042842',
    secondary: '#1A3D63',          // Medium navy
    secondaryForeground: '#F6FAFD',
    muted: '#FFCC4C',
    mutedForeground: '#4A7FA7',
    accent: '#FFCC4C',             // Highlight accent
    accentForeground: '#042842',
    border: '#1A3D63',             // Medium navy border
    ring: '#042842',
  }
};

export const PLASTER_PALETTE: ColorPalette = {
  name: 'Warm Plaster',
  id: 'plaster',
  colors: ['#7192A1', '#EADFCB', '#C08E66', '#186667', '#042842', '#FFCC4C'],
  labels: ['#7192A1', '#EADFCB', '#C08E66', '#186667', '#042842', '#FFCC4C'],
  visualColors: ['#7192A1', '#EADFCB', '#C08E66', '#BE5731', '#042842', '#FAF5EF'], // Corrected visuals for Rust/Cream
  themeColors: {
    background: '#FAF5EF',         // Milky/off-white background
    foreground: '#800021',         // Deep burgundy text
    card: '#800021',               // Deep burgundy card/sidebar/composer/bubbles
    cardForeground: '#FAF5EF',     // Milky cream text on card
    primary: '#7192A1',            // Slate Blue
    primaryForeground: '#FAF5EF',
    secondary: '#881144',          // Plum
    secondaryForeground: '#FAF5EF',
    muted: '#FAF5EF',
    mutedForeground: '#7192A1',    // Slate blue for muted labels
    accent: '#800021',             // Deep burgundy accent
    accentForeground: '#FAF5EF',
    border: '#881144',             // Plum border
    ring: '#800021',
  }
};

export const DEFAULT_COLORS: ThemeColors = {
  background: '#000000',
  foreground: '#FAF1EB',
  card: '#1F110E',
  cardForeground: '#FAF1EB',
  primary: '#FAF1EB',
  primaryForeground: '#1F110E',
  secondary: '#301A15',
  secondaryForeground: '#FAF1EB',
  muted: '#301A15',
  mutedForeground: '#7E6C68',
  accent: '#D35E43',
  accentForeground: '#FFFFFF',
  border: '#2C1813',
  ring: '#D35E43',
};

interface ThemeContextType {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  activeColors: ThemeColors;
  customPalette: ColorPalette | null;
  setCustomPalette: (palette: ColorPalette | null) => void;
  applyTheme: (colors: ThemeColors) => void;
  resetToDefault: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('default');
  const [customPalette, setCustomPalette] = useState<ColorPalette | null>(null);
  const [activeColors, setActiveColors] = useState<ThemeColors>(DEFAULT_COLORS);

  // Apply colors to CSS custom properties
  const applyTheme = (colors: ThemeColors) => {
    if (typeof window === 'undefined') return;
    const root = document.documentElement;
    
    root.style.setProperty('--color-background', colors.background);
    root.style.setProperty('--color-foreground', colors.foreground);
    root.style.setProperty('--color-card', colors.card);
    root.style.setProperty('--color-card-foreground', colors.cardForeground);
    root.style.setProperty('--color-primary', colors.primary);
    root.style.setProperty('--color-primary-foreground', colors.primaryForeground);
    root.style.setProperty('--color-secondary', colors.secondary);
    root.style.setProperty('--color-secondary-foreground', colors.secondaryForeground);
    root.style.setProperty('--color-muted', colors.muted);
    root.style.setProperty('--color-muted-foreground', colors.mutedForeground);
    root.style.setProperty('--color-accent', colors.accent);
    root.style.setProperty('--color-accent-foreground', colors.accentForeground);
    root.style.setProperty('--color-border', colors.border);
    root.style.setProperty('--color-ring', colors.ring);
    
    // Apply body style adjustments directly
    document.body.style.backgroundColor = colors.background;
    document.body.style.color = colors.foreground;
    
    setActiveColors(colors);
  };

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('nexus_theme_mode', mode);
    }
    
    if (mode === 'default') {
      applyTheme(DEFAULT_COLORS);
    } else if (mode === 'ocean') {
      applyTheme(OCEAN_PALETTE.themeColors);
    } else if (mode === 'plaster') {
      applyTheme(PLASTER_PALETTE.themeColors);
    } else if (mode === 'custom' && customPalette) {
      applyTheme(customPalette.themeColors);
    }
  };

  const resetToDefault = () => {
    setThemeMode('default');
  };

  // Restore saved theme on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedMode = localStorage.getItem('nexus_theme_mode') as ThemeMode;
      const savedCustom = localStorage.getItem('nexus_custom_palette');
      
      if (savedCustom) {
        try {
          const parsed = JSON.parse(savedCustom);
          setCustomPalette(parsed);
          if (savedMode === 'custom') {
            applyTheme(parsed.themeColors);
            setThemeModeState('custom');
            return;
          }
        } catch (e) {
          console.error('Error parsing custom palette from localStorage:', e);
        }
      }

      if (savedMode && savedMode !== 'custom') {
        setThemeMode(savedMode);
      } else {
        applyTheme(DEFAULT_COLORS);
      }
    }
  }, []);

  // Sync custom palette changes to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && customPalette) {
      localStorage.setItem('nexus_custom_palette', JSON.stringify(customPalette));
    }
  }, [customPalette]);

  return (
    <ThemeContext.Provider value={{
      themeMode,
      setThemeMode,
      activeColors,
      customPalette,
      setCustomPalette,
      applyTheme,
      resetToDefault
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
