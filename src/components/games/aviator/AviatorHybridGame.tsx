/**
 * AviatorHybridGame - Combines Three.js 3D with PixiJS overlays
 * This is the main game component that layers:
 * - Three.js canvas (background, 3D character, particles)
 * - PixiJS canvas (multiplier display, UI effects)
 * - HTML overlays (bet controls, cash out button)
 */
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Aviator3DScene from './Aviator3DScene';
import { crash, playSound } from '@/lib/sounds';

type GamePhase = 'waiting' | 'running' | 'crashed' | 'cashed_out';

interface AviatorHybridGameProps {
  className?: string;
}

export default function AviatorHybridGame({ className = '' }: AviatorHybridGameProps) {
  const [phase, setPhase] = useState<GamePhase>('waiting');
  const [multiplier, setMultiplier] = useState(1.0);
  const [betAmount, setBetAmount] = useState(100);
  const [hasBet, setHasBet] = useState(false);
  const [hasCashedOut, setHasCashedOut] = useState(false);
  const [crashPoint, setCrashPoint] = useState(0);
  
  const gameIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // Start a new round
  const startRound = useCallback(() => {
    setPhase('waiting');
    setMultiplier(1.0);
    setHasCashedOut(false);
    setCrashPoint(0);
    
    // Generate random crash point (house edge algorithm)
    const randomCrash = Math.random();
    const newCrashPoint = Math.max(1.0, 1 / (1 - randomCrash));
    setCrashPoint(Math.min(newCrashPoint, 100)); // Cap at 100x
    
    // Wait 3 seconds then start
    setTimeout(() => {
      setPhase('running');
      startTimeRef.current = Date.now();
      crash.tick();
      
      // Game loop
      gameIntervalRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        const newMultiplier = Math.pow(Math.E, elapsed * 0.15);
        
        if (newMultiplier >= crashPoint) {
          // CRASH!
          setPhase('crashed');
          setMultiplier(crashPoint);
          crash.crash();
          if (gameIntervalRef.current) {
            clearInterval(gameIntervalRef.current);
          }
          
          // Auto restart after 5 seconds
          setTimeout(startRound, 5000);
        } else {
          setMultiplier(newMultiplier);
        }
      }, 50);
    }, 3000);
  }, [crashPoint]);

  // Cash out
  const handleCashOut = useCallback(() => {
    if (phase === 'running' && hasBet && !hasCashedOut) {
      setPhase('cashed_out');
      setHasCashedOut(true);
      crash.cashout();
      if (gameIntervalRef.current) {
        clearInterval(gameIntervalRef.current);
      }
    }
  }, [phase, hasBet, hasCashedOut]);

  // Place bet
  const handlePlaceBet = useCallback(() => {
    setHasBet(true);
  }, []);

  // Initialize game
  useEffect(() => {
    startRound();
    
    return () => {
      if (gameIntervalRef.current) {
        clearInterval(gameIntervalRef.current);
      }
    };
  }, []);

  // Calculate winnings
  const potentialWin = hasBet && !hasCashedOut ? betAmount * multiplier : 0;
  const actualWin = hasCashedOut ? betAmount * multiplier : 0;

  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`}>
      {/* Three.js 3D Background */}
      <Aviator3DScene
        multiplier={multiplier}
        phase={phase}
        className="absolute inset-0 z-0"
      />
      
      {/* Gradient Overlay for better text readability */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black/50 to-transparent" />
      </div>
      
      {/* Multiplier Display */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none">
        <motion.div
          key={multiplier}
          initial={{ scale: 1 }}
          animate={{ scale: [1, 1.02, 1] }}
          transition={{ duration: 0.1 }}
          className="text-center"
        >
          <span
            className={`text-7xl md:text-8xl font-bold font-mono tracking-tighter ${
              phase === 'crashed'
                ? 'text-red-500'
                : phase === 'cashed_out'
                ? 'text-green-400'
                : 'text-white'
            }`}
            style={{
              textShadow: `0 0 30px ${
                phase === 'crashed'
                  ? 'rgba(239, 68, 68, 0.8)'
                  : phase === 'cashed_out'
                  ? 'rgba(74, 222, 128, 0.8)'
                  : 'rgba(255, 255, 255, 0.5)'
              }`,
            }}
          >
            {multiplier.toFixed(2)}×
          </span>
        </motion.div>
      </div>
      
      {/* Phase Indicator */}
      <div className="absolute top-4 left-4 z-30">
        <div
          className={`px-4 py-2 rounded-lg font-semibold text-sm uppercase tracking-wider ${
            phase === 'waiting'
              ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
              : phase === 'running'
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : phase === 'crashed'
              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
              : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
          }`}
        >
          {phase === 'waiting' && '⏳ Starting Soon...'}
          {phase === 'running' && '🚀 Flying'}
          {phase === 'crashed' && '💥 Crashed!'}
          {phase === 'cashed_out' && '💰 Cashed Out!'}
        </div>
      </div>
      
      {/* Betting Controls */}
      <div className="absolute bottom-4 left-4 right-4 z-30">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-black/40 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
          {/* Bet Amount */}
          <div className="flex items-center gap-2">
            <span className="text-white/60 text-sm">Bet:</span>
            <div className="flex items-center bg-black/40 rounded-lg">
              <button
                onClick={() => setBetAmount(Math.max(10, betAmount - 10))}
                className="px-3 py-2 text-white hover:bg-white/10 transition-colors"
              >
                −
              </button>
              <input
                type="number"
                value={betAmount}
                onChange={(e) => setBetAmount(Math.max(10, parseInt(e.target.value) || 10))}
                className="w-20 bg-transparent text-white text-center font-mono"
              />
              <button
                onClick={() => setBetAmount(betAmount + 10)}
                className="px-3 py-2 text-white hover:bg-white/10 transition-colors"
              >
                +
              </button>
            </div>
          </div>
          
          {/* Potential/Actual Win */}
          <div className="text-center">
            <div className="text-white/60 text-xs">Potential Win</div>
            <div className="text-white font-mono text-lg">
              ${potentialWin.toFixed(2)}
            </div>
          </div>
          
          {/* Action Button */}
          {!hasBet ? (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handlePlaceBet}
              disabled={phase !== 'waiting'}
              className={`px-8 py-3 rounded-xl font-bold text-lg transition-all ${
                phase === 'waiting'
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/30 hover:shadow-green-500/50'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
            >
              Place Bet
            </motion.button>
          ) : !hasCashedOut ? (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleCashOut}
              disabled={phase !== 'running'}
              className={`px-8 py-3 rounded-xl font-bold text-lg transition-all ${
                phase === 'running'
                  ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 animate-pulse'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
            >
              Cash Out ${potentialWin.toFixed(2)}
            </motion.button>
          ) : (
            <div className="text-center">
              <div className="text-green-400 font-bold text-lg">Won ${actualWin.toFixed(2)}!</div>
            </div>
          )}
        </div>
      </div>
      
      {/* Crash Overlay */}
      <AnimatePresence>
        {phase === 'crashed' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none"
          >
            <div className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.2, 1] }}
                transition={{ duration: 0.3 }}
                className="text-red-500 text-6xl font-bold mb-4"
                style={{ textShadow: '0 0 50px rgba(239, 68, 68, 0.8)' }}
              >
                FLEW AWAY!
              </motion.div>
              <div className="text-white/60 text-xl">
                Crashed at {crashPoint.toFixed(2)}×
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}