/**
 * CrashGame3D — Enhanced crash game with Three.js 3D graphics
 * Uses Aviator3DScene for immersive visuals while maintaining
 * the existing server-authoritative game logic.
 */
import { useState, useCallback, useMemo, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History, Plane, Volume2, VolumeX, Settings } from 'lucide-react';
import GameShell from '../GameShell';
import WinCelebration from '../WinCelebration';
import { useAppStore } from '@/stores/app-store';
import { playSound } from '@/lib/sounds';
import { haptic } from '@/lib/haptics';
import { getMultiplierColor } from '@/lib/animations';
import { useAuth } from '@/hooks/use-auth';
import { useCrashRound } from '@/hooks/use-crash-round';
import { toast } from '@/hooks/use-toast';
import GameLoadingScreen from '../shared/GameLoadingScreen';
import Aviator3DScene from '../aviator/Aviator3DScene';

const QUICK_AMOUNTS = ['0.10', '1', '5', '25', '100'];

export default function CrashGame3D() {
  const { selectedCurrency, soundEnabled, toggleSound } = useAppStore();
  const { user } = useAuth();
  const [betAmount, setBetAmount] = useState('10');
  const [autoCashout, setAutoCashout] = useState('2.00');
  const [showSettings, setShowSettings] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [characterType, setCharacterType] = useState<'airplane' | 'astronaut'>('airplane');

  const { round, bets, myBet, history, multiplier, placeBet, cashout } = useCrashRound({
    gameType: 'crash',
    userId: user?.id ?? null,
  });

  const status = round?.status ?? 'waiting';
  const crashPoint = round?.crash_multiplier ?? 0;
  void crashPoint;

  // Phase mapping for the 3D scene
  const scenePhase = status === 'running' ? 'running' : 
                     status === 'crashed' ? 'crashed' : 
                     myBet && myBet.cashout_multiplier ? 'cashed_out' : 'waiting';

  const countdown = round && round.status === 'waiting'
    ? Math.max(0, 6 - (Date.now() - new Date(round.waiting_starts_at).getTime()) / 1000)
    : 0;

  // Actions
  const handlePlaceBet = useCallback(async () => {
    if (!user) { toast({ title: 'Sign in to play' }); return; }
    if (!round || round.status !== 'waiting') {
      toast({ title: 'Wait for next round', description: 'Betting opens during the lobby phase.' });
      return;
    }
    haptic('press');
    await placeBet(parseFloat(betAmount), parseFloat(autoCashout));
  }, [user, round, betAmount, autoCashout, placeBet]);

  const handleCashout = useCallback(async () => {
    if (!myBet || myBet.cashout_multiplier) return;
    haptic('tap');
    playSound('coin');
    await cashout(myBet.id);
  }, [myBet, cashout]);
  void characterType;

  // Colors based on multiplier
  const multiplierColor = getMultiplierColor(multiplier);

  // Loading complete handler
  const handleLoadComplete = useCallback(() => {
    setIsLoading(false);
  }, []);

  return (
    <GameShell title="Crash 3D">
      {/* Loading Screen */}
      <GameLoadingScreen
        isLoading={isLoading}
        gameName="Crash 3D"
        onLoadComplete={handleLoadComplete}
        minDuration={2000}
      />

      {/* 3D Scene Background */}
      <div className="absolute inset-0 z-0">
        <Suspense fallback={null}>
          <Aviator3DScene
            multiplier={multiplier}
            phase={scenePhase}
            className="w-full h-full"
          />
        </Suspense>
      </div>

      {/* Gradient Overlay */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/50 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black/70 to-transparent" />
      </div>

      {/* Top Bar */}
      <div className="absolute top-4 left-4 right-4 z-20 flex justify-between items-start">
        {/* Status Badge */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`px-4 py-2 rounded-xl backdrop-blur-md ${
            status === 'waiting'
              ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
              : status === 'running'
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : 'bg-red-500/20 text-red-400 border border-red-500/30'
          }`}
        >
          <div className="flex items-center gap-2">
            <Plane className="w-4 h-4" />
            <span className="text-sm font-semibold uppercase tracking-wider">
              {status === 'waiting' ? 'Next Round' : status === 'running' ? 'Flying' : 'Crashed'}
            </span>
            {status === 'waiting' && countdown > 0 && (
              <span className="ml-1 text-xs">{countdown.toFixed(1)}s</span>
            )}
          </div>
        </motion.div>

        {/* Controls */}
        <div className="flex gap-2">
          <button
            onClick={toggleSound}
            className="p-2 rounded-lg bg-white/10 backdrop-blur-md text-white/70 hover:text-white transition-colors"
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 rounded-lg bg-white/10 backdrop-blur-md text-white/70 hover:text-white transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
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
          <AnimatePresence mode="wait">
            {status === 'crashed' ? (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-red-500 text-6xl md:text-8xl font-bold font-mono tracking-tighter"
                style={{ textShadow: '0 0 50px rgba(239, 68, 68, 0.8)' }}
              >
                FLEW AWAY
              </motion.div>
            ) : (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={`text-6xl md:text-8xl font-bold font-mono tracking-tighter ${multiplierColor}`}
                style={{ textShadow: `0 0 30px currentColor` }}
              >
                {multiplier.toFixed(2)}×
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-4 left-4 right-4 z-20">
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-end justify-between bg-black/40 backdrop-blur-md rounded-2xl p-4 border border-white/10">
          {/* Left: Bet Controls */}
          <div className="flex-1 space-y-3">
            {/* Bet Amount */}
            <div className="flex items-center gap-2">
              <span className="text-white/60 text-sm w-12">Bet:</span>
              <div className="flex-1 flex items-center bg-black/40 rounded-lg">
                <button
                  onClick={() => setBetAmount((b) => Math.max(0.1, parseFloat(b) - 1).toFixed(2))}
                  className="px-3 py-2 text-white hover:bg-white/10 transition-colors"
                >
                  −
                </button>
                <input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  className="flex-1 bg-transparent text-white text-center font-mono"
                  step="0.1"
                  min="0.1"
                />
                <button
                  onClick={() => setBetAmount((b) => (parseFloat(b) + 1).toFixed(2))}
                  className="px-3 py-2 text-white hover:bg-white/10 transition-colors"
                >
                  +
                </button>
              </div>
            </div>

            {/* Quick Amounts */}
            <div className="flex gap-2">
              {QUICK_AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  onClick={() => setBetAmount(amt)}
                  className="flex-1 py-1.5 text-xs rounded bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-colors"
                >
                  ${amt}
                </button>
              ))}
            </div>

            {/* Auto Cashout */}
            <div className="flex items-center gap-2">
              <span className="text-white/60 text-xs w-12">Auto:</span>
              <input
                type="number"
                value={autoCashout}
                onChange={(e) => setAutoCashout(e.target.value)}
                className="flex-1 bg-black/40 rounded-lg px-3 py-2 text-white text-sm font-mono"
                step="0.1"
                min="1.01"
              />
              <span className="text-white/60">×</span>
            </div>
          </div>

          {/* Right: Action Button */}
          <div className="flex flex-col gap-2">
            {!myBet ? (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handlePlaceBet}
                disabled={status !== 'waiting'}
                className={`px-8 py-3 rounded-xl font-bold text-lg transition-all ${
                  status === 'waiting'
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/30'
                    : 'bg-gray-600/50 text-gray-400 cursor-not-allowed'
                }`}
              >
                Place Bet ${betAmount}
              </motion.button>
            ) : !myBet.cashout_multiplier ? (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleCashout}
                disabled={status !== 'running'}
                className={`px-8 py-3 rounded-xl font-bold text-lg transition-all ${
                  status === 'running'
                    ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg shadow-orange-500/30 animate-pulse'
                    : 'bg-gray-600/50 text-gray-400 cursor-not-allowed'
                }`}
              >
                Cash Out ${(parseFloat(betAmount) * multiplier).toFixed(2)}
              </motion.button>
            ) : (
              <div className="text-center py-3">
                <div className="text-green-400 font-bold text-lg">
                  Won ${(parseFloat(betAmount) * myBet.cashout_multiplier).toFixed(2)}!
                </div>
                <div className="text-white/60 text-sm">
                  @ {myBet.cashout_multiplier.toFixed(2)}×
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* History Panel */}
      <div className="absolute top-20 right-4 z-20">
        <div className="flex flex-wrap gap-1 max-w-xs">
          {history.slice(0, 10).map((h, i) => (
            <motion.div
              key={`${h.round_number}-${i}`}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className={`px-2 py-1 rounded text-xs font-mono ${
                h.crash_multiplier >= 2
                  ? 'bg-green-500/20 text-green-400'
                  : h.crash_multiplier >= 1.5
                  ? 'bg-yellow-500/20 text-yellow-400'
                  : 'bg-red-500/20 text-red-400'
              }`}
            >
              {h.crash_multiplier.toFixed(2)}×
            </motion.div>
          ))}
        </div>
      </div>

      {/* Win Celebration */}
      <WinCelebration
        show={!!myBet?.cashout_multiplier && status === 'crashed'}
        amount={myBet?.cashout_multiplier ? parseFloat(betAmount) * myBet.cashout_multiplier : 0}
        currency={selectedCurrency}
      />

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setShowSettings(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 rounded-2xl p-6 border border-white/10 w-full max-w-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-white mb-4">Settings</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-white/60 text-sm">Character Type</label>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => setCharacterType('airplane')}
                      className={`flex-1 py-2 rounded-lg ${
                        characterType === 'airplane'
                          ? 'bg-blue-500 text-white'
                          : 'bg-white/10 text-white/60'
                      }`}
                    >
                      ✈️ Airplane
                    </button>
                    <button
                      onClick={() => setCharacterType('astronaut')}
                      className={`flex-1 py-2 rounded-lg ${
                        characterType === 'astronaut'
                          ? 'bg-blue-500 text-white'
                          : 'bg-white/10 text-white/60'
                      }`}
                    >
                      👨‍🚀 Astronaut
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowSettings(false)}
                className="w-full mt-6 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </GameShell>
  );
}