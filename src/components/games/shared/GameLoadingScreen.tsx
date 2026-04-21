/**
 * GameLoadingScreen - Highly polished loading screen
 * Features animated 3D-style loader, progress bar, tips
 * 
 * USAGE:
 * 1. As fallback: <Suspense fallback={<GameLoadingScreen gameName="Game" />}>
 * 2. Auto-dismisses after minDuration for clean UX
 */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface GameLoadingScreenProps {
  isLoading?: boolean;
  gameName?: string;
  onLoadComplete?: () => void;
  minDuration?: number;
}

const LOADING_TIPS = [
  '🎰 Tip: Set a budget before playing and stick to it',
  '💡 Tip: Crash games are provably fair - verify your results',
  '🚀 Tip: In crash games, cash out early for smaller, safer wins',
  '⚡ Tip: Higher multipliers mean higher risk',
  '🎮 Tip: Try the demo mode to learn game mechanics',
  '📊 Tip: Track your bets to understand your playing patterns',
  '🎯 Tip: Take regular breaks to stay focused',
  '✨ Tip: Lucky streaks don\'t last forever - know when to stop',
];

export default function GameLoadingScreen({
  isLoading = true,
  gameName = 'Game',
  onLoadComplete,
  minDuration = 1200,
}: GameLoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  // Simulate loading progress with auto-dismiss
  useEffect(() => {
    setProgress(0);
    const startTime = Date.now();
    
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const baseProgress = Math.min((elapsed / minDuration) * 100, 100);
      setProgress(baseProgress);
      
      if (baseProgress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          setVisible(false);
          onLoadComplete?.();
        }, 200);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [minDuration, onLoadComplete]);

  // Rotate tips
  useEffect(() => {
    const tipInterval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % LOADING_TIPS.length);
    }, 4000);

    return () => clearInterval(tipInterval);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.3 } }}
          className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900"
        >
          {/* Animated Background */}
          <div className="absolute inset-0 overflow-hidden">
            {/* Animated gradient orbs */}
            <motion.div
              animate={{
                x: [0, 100, 0],
                y: [0, -50, 0],
                scale: [1, 1.2, 1],
              }}
              transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl"
            />
            <motion.div
              animate={{
                x: [0, -100, 0],
                y: [0, 50, 0],
                scale: [1.2, 1, 1.2],
              }}
              transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl"
            />
            <motion.div
              animate={{
                x: [0, 50, 0],
                y: [0, 100, 0],
              }}
              transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute top-1/2 right-1/3 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl"
            />
          </div>

          {/* Content */}
          <div className="relative z-10 flex flex-col items-center">
            {/* 3D-style animated loader */}
            <div className="relative w-32 h-32 mb-8">
              {/* Outer ring */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-0 rounded-full border-4 border-transparent border-t-cyan-400 border-r-purple-400"
              />
              
              {/* Middle ring */}
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-2 rounded-full border-4 border-transparent border-b-pink-400 border-l-cyan-400"
              />
              
              {/* Inner ring */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-4 rounded-full border-4 border-transparent border-t-purple-400 border-b-pink-400"
              />
              
              {/* Center glow */}
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute inset-8 rounded-full bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 blur-sm"
              />
              
              {/* Percentage */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-white font-mono">
                  {Math.round(progress)}%
                </span>
              </div>
            </div>

            {/* Game name */}
            <motion.h2
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-3xl font-bold text-white mb-2 tracking-tight"
            >
              {gameName}
            </motion.h2>

            {/* Loading text */}
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-white/60 text-sm mb-6"
            >
              Loading assets...
            </motion.p>

            {/* Progress bar */}
            <div className="w-64 h-2 bg-white/10 rounded-full overflow-hidden mb-6">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.1 }}
                className="h-full bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 rounded-full"
              />
            </div>

            {/* Loading tip */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-center max-w-md"
            >
              <AnimatePresence mode="wait">
                <motion.p
                  key={tipIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="text-white/50 text-sm"
                >
                  {LOADING_TIPS[tipIndex]}
                </motion.p>
              </AnimatePresence>
            </motion.div>
          </div>

          {/* Decorative elements */}
          <div className="absolute bottom-8 left-8">
            <motion.div
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="flex items-center gap-2"
            >
              <div className="w-2 h-2 rounded-full bg-cyan-400" />
              <div className="w-2 h-2 rounded-full bg-purple-400" />
              <div className="w-2 h-2 rounded-full bg-pink-400" />
            </motion.div>
          </div>

          {/* Brand */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="absolute bottom-8 right-8 text-white/30 text-sm font-medium"
          >
            NEXBET
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}