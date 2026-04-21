/**
 * Professional Asset Loader with Loading Screen
 * Initializes all game assets before gameplay like official slots
 */
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AssetLoaderProps {
  assets: string[];
  children: React.ReactNode;
  gameName: string;
  onProgress?: (progress: number) => void;
}

interface AssetLoadState {
  loaded: number;
  total: number;
  status: 'idle' | 'loading' | 'ready' | 'error';
  errors: string[];
}

export function AssetLoader({ assets, children, gameName, onProgress }: AssetLoaderProps) {
  const [state, setState] = useState<AssetLoadState>({
    loaded: 0,
    total: assets.length,
    status: 'idle',
    errors: [],
  });

  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    if (assets.length === 0) {
      setState(s => ({ ...s, status: 'ready', loaded: 1, total: 1 }));
      return;
    }

    setState(s => ({ ...s, status: 'loading' }));

    let loaded = 0;
    const errors: string[] = [];

    const promises = assets.map((src) => {
      return new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          loaded++;
          setState(s => {
            const progress = loaded / assets.length;
            onProgress?.(progress);
            return { ...s, loaded, status: loaded === assets.length ? 'ready' : 'loading' };
          });
          resolve();
        };
        img.onerror = () => {
          errors.push(src);
          loaded++;
          setState(s => ({ ...s, loaded, errors }));
          resolve();
        };
        img.src = src;
      });
    });

    Promise.all(promises).then(() => {
      setState(s => ({ ...s, status: 'ready', errors }));
    });
  }, [assets, onProgress]);

  useEffect(() => {
    if (state.status === 'ready') {
      const timer = setTimeout(() => setShowSplash(false), 500);
      return () => clearTimeout(timer);
    }
  }, [state.status]);

  const progress = state.total > 0 ? (state.loaded / state.total) * 100 : 100;

  return (
    <>
      <AnimatePresence>
        {showSplash && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-gradient-to-br from-[#0a0e1f] via-[#12182d] to-[#0d1020]"
          >
            {/* Animated background particles */}
            <div className="absolute inset-0 overflow-hidden">
              {Array.from({ length: 30 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 bg-yellow-400/30 rounded-full"
                  initial={{
                    x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
                    y: typeof window !== 'undefined' ? window.innerHeight + 10 : 1000,
                  }}
                  animate={{
                    y: -10,
                    opacity: [0, 1, 0],
                  }}
                  transition={{
                    duration: 4 + Math.random() * 4,
                    repeat: Infinity,
                    delay: Math.random() * 3,
                    ease: 'linear',
                  }}
                />
              ))}
            </div>

            {/* Main content */}
            <div className="relative z-10 flex flex-col items-center gap-6 px-8">
              {/* Game logo */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="text-center"
              >
                <h1 className="font-display text-3xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-yellow-400 to-amber-500 tracking-wider mb-2">
                  {gameName}
                </h1>
                <p className="text-yellow-400/60 text-sm tracking-widest uppercase">Loading assets...</p>
              </motion.div>

              {/* Progress bar */}
              <div className="w-64 md:w-80">
                <div className="relative h-2 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-300 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                  />
                  {/* Shimmer effect */}
                  <motion.div
                    className="absolute inset-y-0 left-0 w-full bg-gradient-to-r from-transparent via-white/20 to-transparent"
                    animate={{ x: ['-100%', '100%'] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                  />
                </div>
                <div className="flex justify-between mt-2 text-xs text-white/40">
                  <span>{state.loaded} / {state.total}</span>
                  <span>{Math.round(progress)}%</span>
                </div>
              </div>

              {/* Loading tips */}
              <motion.p
                className="text-white/30 text-xs text-center max-w-xs"
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                Preparing your premium gaming experience...
              </motion.p>
            </div>

            {/* Decorative corners */}
            <div className="absolute top-4 left-4 w-16 h-16 border-l-2 border-t-2 border-yellow-400/20 rounded-tl-lg" />
            <div className="absolute top-4 right-4 w-16 h-16 border-r-2 border-t-2 border-yellow-400/20 rounded-tr-lg" />
            <div className="absolute bottom-4 left-4 w-16 h-16 border-l-2 border-b-2 border-yellow-400/20 rounded-bl-lg" />
            <div className="absolute bottom-4 right-4 w-16 h-16 border-r-2 border-b-2 border-yellow-400/20 rounded-br-lg" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game content */}
      {state.status === 'ready' && !showSplash && children}
    </>
  );
}

export default AssetLoader;