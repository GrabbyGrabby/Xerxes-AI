'use client';

import React, { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useTheme } from '../providers/ThemeContext';

export default function WavesBackground({ isLoginPage = false }: { isLoginPage?: boolean }) {
  const { themeMode, activeColors } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Mouse positions for interactive parallax tracking
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth springs for mouse movement
  const springConfig = { damping: 40, stiffness: 120, mass: 1 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  // 1. Define top-level transforms for the 4 wave layers (Ocean theme)
  const waveX0 = useTransform(smoothX, v => v * -45);
  const waveY0 = useTransform(smoothY, v => v * 20);

  const waveX1 = useTransform(smoothX, v => v * -90);
  const waveY1 = useTransform(smoothY, v => v * 40);

  const waveX2 = useTransform(smoothX, v => v * -135);
  const waveY2 = useTransform(smoothY, v => v * 60);

  const waveX3 = useTransform(smoothX, v => v * -180);
  const waveY3 = useTransform(smoothY, v => v * 80);

  const waveTransforms = [
    { x: waveX0, y: waveY0 },
    { x: waveX1, y: waveY1 },
    { x: waveX2, y: waveY2 },
    { x: waveX3, y: waveY3 }
  ];

  // 2. Define top-level transforms for the 4 plaster blobs (Plaster theme)
  const blobX1 = useTransform(smoothX, v => v * -180);
  const blobY1 = useTransform(smoothY, v => v * 120);

  const blobX2 = useTransform(smoothX, v => v * 150);
  const blobY2 = useTransform(smoothY, v => v * -150);

  const blobX3 = useTransform(smoothX, v => v * 200);
  const blobY3 = useTransform(smoothY, v => v * 180);

  const blobX4 = useTransform(smoothX, v => v * -120);
  const blobY4 = useTransform(smoothY, v => v * -160);

  useEffect(() => {
    setMounted(true);
    
    const handleMouseMove = (e: MouseEvent) => {
      // Calculate normalized mouse positions (-0.5 to 0.5)
      const x = (e.clientX / window.innerWidth) - 0.5;
      const y = (e.clientY / window.innerHeight) - 0.5;
      
      mouseX.set(x);
      mouseY.set(y);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  if (!mounted) {
    return <div className="absolute inset-0 z-[-2] bg-black" />;
  }

  // Wave definitions for the Ocean/Default liquid wave themes
  const wavePaths = [
    // Deepest wave
    {
      d1: "M 0 350 C 300 280, 600 420, 1000 350 L 1000 1000 L 0 1000 Z",
      d2: "M 0 320 C 400 400, 700 300, 1000 380 L 1000 1000 L 0 1000 Z",
      duration: 18,
    },
    // Middle wave
    {
      d1: "M 0 450 C 400 380, 600 500, 1000 420 L 1000 1000 L 0 1000 Z",
      d2: "M 0 420 C 300 480, 700 390, 1000 460 L 1000 1000 L 0 1000 Z",
      duration: 14,
    },
    // Medium light wave
    {
      d1: "M 0 550 C 250 500, 550 620, 1000 520 L 1000 1000 L 0 1000 Z",
      d2: "M 0 520 C 350 590, 650 490, 1000 570 L 1000 1000 L 0 1000 Z",
      duration: 11,
    },
    // Highest foreground wave (foam/highlight)
    {
      d1: "M 0 650 C 350 580, 650 700, 1000 620 L 1000 1000 L 0 1000 Z",
      d2: "M 0 620 C 250 690, 750 590, 1000 660 L 1000 1000 L 0 1000 Z",
      duration: 8,
    }
  ];

  const isOcean = themeMode === 'ocean' || themeMode === 'default';

  // Overrides to keep login page background static deep navy in Ocean mode
  const bgVal = isLoginPage ? '#0A1931' : activeColors.background;
  const secondaryVal = isLoginPage ? '#4A7FA7' : activeColors.secondary;
  const mutedVal = isLoginPage ? '#1A3D63' : activeColors.muted;
  const cardVal = isLoginPage ? '#1A3D63' : activeColors.card;
  const primaryVal = isLoginPage ? '#B3CFE5' : activeColors.primary;

  return (
    <div 
      className="absolute inset-0 z-[-2] overflow-hidden select-none pointer-events-none transition-colors duration-1000"
      style={{ backgroundColor: bgVal }}
    >
      {/* Dynamic Base Radial Glow */}
      <div 
        className="absolute inset-0 transition-opacity duration-1000"
        style={{
          background: isOcean 
            ? `radial-gradient(circle at 50% -20%, ${secondaryVal} 0%, ${bgVal} 80%)`
            : `radial-gradient(circle at 50% 120%, ${activeColors.primary}10 0%, ${activeColors.background} 90%)`,
        }}
      />

      {isOcean ? (
        // ================= OCEAN WAVES (LIQUID SMOKE) THEME =================
        <div className="absolute inset-0 flex flex-col justify-end w-full h-full opacity-75">
          <svg 
            className="w-full h-full min-h-[120dvh] -mb-10 scale-[1.05]"
            viewBox="0 0 1000 1000" 
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="wave-grad-0" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={mutedVal} stopOpacity="0.8" />
                <stop offset="100%" stopColor={bgVal} />
              </linearGradient>
              <linearGradient id="wave-grad-1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={secondaryVal} stopOpacity="0.75" />
                <stop offset="100%" stopColor={bgVal} />
              </linearGradient>
              <linearGradient id="wave-grad-2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={cardVal} stopOpacity="0.65" />
                <stop offset="100%" stopColor={bgVal} />
              </linearGradient>
              <linearGradient id="wave-grad-3" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={primaryVal} stopOpacity="0.4" />
                <stop offset="100%" stopColor={bgVal} />
              </linearGradient>
            </defs>

            {wavePaths.map((wave, idx) => {
              const trans = waveTransforms[idx] || { x: smoothX, y: smoothY };

              return (
                <motion.path
                  key={idx}
                  style={{
                    x: trans.x,
                    y: trans.y,
                  }}
                  animate={{
                    d: [wave.d1, wave.d2, wave.d1],
                  }}
                  transition={{
                    duration: wave.duration,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  fill={`url(#wave-grad-${idx})`}
                />
              );
            })}
          </svg>
        </div>
      ) : (
        // ================= WARM PLASTER (HOODIE / CLAY) THEME =================
        <div className="absolute inset-0 w-full h-full flex items-center justify-center overflow-hidden">
          {/* Base Wall Color with Plaster Gradient */}
          <div 
            className="absolute inset-0 transition-all duration-1000"
            style={{
              background: `radial-gradient(circle at 20% 20%, #EFECE6 0%, #D8D5CE 50%, #C4C0B7 100%)`,
            }}
          />

          {/* SVG Plaster Micro-Grain Texture Overlay */}
          <div 
            className="absolute inset-0 opacity-[0.06] mix-blend-overlay pointer-events-none"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            }}
          />

          {/* Subtle Plaster Shadows / Wrinkles simulating hoodie fabric folds */}
          <div className="absolute inset-0 bg-gradient-to-tr from-black/5 via-transparent to-white/10 mix-blend-overlay pointer-events-none" />

          {/* Immersive floating organic blob liquid shapes (visualizing the Warm Plaster colors) */}
          <div className="absolute inset-0 w-full h-full opacity-80 blur-[80px]">
            {/* Blob 1: Terracotta / Orange */}
            <motion.div
              style={{
                x: blobX1,
                y: blobY1,
                background: `radial-gradient(circle, ${activeColors.accent} 0%, transparent 70%)`
              }}
              animate={{
                scale: [1, 1.15, 0.95, 1],
                borderRadius: ["40% 60% 70% 30% / 40% 50% 60% 70%", "50% 60% 30% 70% / 60% 40% 70% 30%", "60% 40% 50% 60% / 30% 60% 40% 70%", "40% 60% 70% 30% / 40% 50% 60% 70%"]
              }}
              transition={{
                duration: 25,
                repeat: Infinity,
                ease: "linear"
              }}
              className="absolute top-[10%] left-[15%] w-[45vw] h-[45vw] opacity-75"
            />

            {/* Blob 2: Tan / Ochre */}
            <motion.div
              style={{
                x: blobX2,
                y: blobY2,
                background: `radial-gradient(circle, ${activeColors.secondary} 0%, transparent 75%)`
              }}
              animate={{
                scale: [1, 0.85, 1.1, 1],
                borderRadius: ["50% 50% 30% 70% / 50% 60% 40% 50%", "40% 60% 60% 40% / 30% 50% 70% 50%", "60% 40% 40% 60% / 50% 30% 50% 70%", "50% 50% 30% 70% / 50% 60% 40% 50%"]
              }}
              transition={{
                duration: 20,
                repeat: Infinity,
                ease: "linear"
              }}
              className="absolute bottom-[15%] right-[10%] w-[50vw] h-[50vw] opacity-60"
            />

            {/* Blob 3: Deep Navy */}
            <motion.div
              style={{
                x: blobX3,
                y: blobY3,
                background: `radial-gradient(circle, ${activeColors.background} 0%, transparent 80%)`
              }}
              animate={{
                scale: [1.1, 0.9, 1.05, 1.1],
                borderRadius: ["60% 40% 70% 30% / 50% 60% 30% 70%", "30% 70% 40% 60% / 60% 40% 70% 30%", "50% 50% 60% 40% / 40% 70% 50% 60%", "60% 40% 70% 30% / 50% 60% 30% 70%"]
              }}
              transition={{
                duration: 28,
                repeat: Infinity,
                ease: "linear"
              }}
              className="absolute top-[35%] right-[20%] w-[35vw] h-[35vw] opacity-80"
            />

            {/* Blob 4: Slate Blue */}
            <motion.div
              style={{
                x: blobX4,
                y: blobY4,
                background: `radial-gradient(circle, ${activeColors.card} 0%, transparent 70%)`
              }}
              animate={{
                scale: [0.9, 1.05, 0.95, 0.9],
                borderRadius: ["30% 70% 50% 50% / 40% 40% 60% 60%", "60% 40% 60% 40% / 50% 70% 30% 50%", "40% 60% 30% 70% / 60% 40% 50% 50%", "30% 70% 50% 50% / 40% 40% 60% 60%"]
              }}
              transition={{
                duration: 22,
                repeat: Infinity,
                ease: "linear"
              }}
              className="absolute bottom-[20%] left-[25%] w-[40vw] h-[40vw] opacity-70"
            />
          </div>
        </div>
      )}
      
      {/* Continuous Vignette for depth */}
      <div className="absolute inset-0 bg-radial-gradient-vignette pointer-events-none mix-blend-multiply opacity-25" 
           style={{ background: 'radial-gradient(circle at center, transparent 30%, rgba(0,0,0,0.4) 100%)' }} />
    </div>
  );
}
