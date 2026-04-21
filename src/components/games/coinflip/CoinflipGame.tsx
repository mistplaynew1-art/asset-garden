/**
 * Coinflip — premium coin flip game.
 *
 * Features:
 *  • Animated coin flip with heads/tails
 *  • Smooth flip animation
 *  • Game-specific sounds from game-sounds.ts
 */
import { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, History, Sparkles } from 'lucide-react';
import GameShell from '../GameShell';
import WinCelebration from '../WinCelebration';
import { playCoinflip } from '@/lib/game-functions';
import { useAppStore } from '@/stores/app-store';
import { haptic } from '@/lib/haptics';
import { gameSounds } from '@/lib/game-sounds';

export default function CoinflipGame() {
  const { selectedCurrency } = useAppStore();
  const [betAmount, setBetAmount] = useState('10');
  const [playing, setPlaying] = useState(false);
  const [choice, setChoice] = useState<'heads' | 'tails'>('heads');
  const [result, setResult] = useState<{ coinResult: 'heads' | 'tails'; won: boolean; payout: number } | null>(null);
  const [history, setHistory] = useState<Array<{ result: 'heads' | 'tails'; won: boolean }>>([]);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipResult, setFlipResult] = useState<'heads' | 'tails' | undefined>(undefined);

  // Initialize audio context
  useEffect(() => {
    setAudioContext(new (window.AudioContext || (window as any).webkitAudioContext)());
  }, []);

  // Play coinflip-specific sound
  const playCoinflipSound = useCallback((soundType: 'flip' | 'land' | 'win' | 'lose') => {
    if (!audioContext) return;
    const soundProfile = gameSounds.coinflip;
    const sounds = soundProfile.sounds as Record<string, (ctx: AudioContext) => void>;
    if (sounds[soundType]) {
      sounds[soundType](audioContext);
    }
  }, [audioContext]);

  const stats = useMemo(() => {
    const heads = history.filter(h => h.result === 'heads').length;
    const tails = history.length - heads;
    return { heads, tails, total: history.length };
  }, [history]);

  const handlePlay = useCallback(async () => {
    setPlaying(true);
    setResult(null);
    setIsFlipping(true);
    setFlipResult(undefined);
    playCoinflipSound('flip');
    haptic('tap');

    try {
      const res = await playCoinflip({ betAmount: parseFloat(betAmount), choice });
      const coinResult = res.result.coinResult;

      // Wait for flip animation
      await new Promise(r => setTimeout(r, 800));

      setIsFlipping(false);
      setFlipResult(coinResult);
      playCoinflipSound('land');

      await new Promise(r => setTimeout(r, 200));

      setResult({ coinResult, won: res.won, payout: res.payout });
      setHistory(prev => [{ result: coinResult, won: res.won }, ...prev].slice(0, 30));
      playCoinflipSound(res.won ? 'win' : 'lose');
    } finally {
      setPlaying(false);
    }
  }, [betAmount, choice, playCoinflipSound]);

  const extraControls = (
    <div className="space-y-3 p-4 rounded-xl bg-surface border border-border">
      <label className="text-[10px] font-bold font-display text-muted-foreground uppercase tracking-wider block">Your Pick</label>
      <div className="grid grid-cols-2 gap-2">
        {(['heads', 'tails'] as const).map(c => (
          <button key={c} onClick={() => { setChoice(c); playCoinflipSound('flip'); }} disabled={playing}
            className={`relative py-3 rounded-xl font-display font-bold text-sm transition-all overflow-hidden ${choice === c ? 'gradient-primary text-foreground neon-glow-blue scale-[1.02]' : 'bg-void border border-border text-muted-foreground hover:border-primary/40'}`}>
            <div className="flex flex-col items-center gap-1">
              <span className="text-2xl">{c === 'heads' ? '👑' : '⭐'}</span>
              <span>{c.charAt(0).toUpperCase() + c.slice(1)}</span>
            </div>
          </button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-1.5 text-center pt-1">
        <div className="rounded bg-void/60 border border-border py-1">
          <div className="text-[8px] uppercase text-muted-foreground">Mult</div>
          <div className="text-[11px] font-mono font-bold text-foreground">1.96×</div>
        </div>
        <div className="rounded bg-void/60 border border-border py-1">
          <div className="text-[8px] uppercase text-muted-foreground">H / T</div>
          <div className="text-[11px] font-mono font-bold text-foreground">{stats.heads}/{stats.tails}</div>
        </div>
        <div className="rounded bg-void/60 border border-border py-1">
          <div className="text-[8px] uppercase text-muted-foreground">Edge</div>
          <div className="text-[11px] font-mono font-bold text-muted-foreground">2%</div>
        </div>
      </div>
    </div>
  );

  const historyPanel = history.length > 0 ? (
    <div className="p-3 rounded-xl bg-surface border border-border">
      <div className="text-[10px] font-bold text-muted-foreground uppercase mb-2 flex items-center gap-1"><History className="w-3 h-3" /> History</div>
      <div className="flex flex-wrap gap-1">
        {history.map((r, i) => (
          <span key={i} className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold border ${r.won ? 'bg-neon-green/10 text-glow-green border-neon-green/30' : 'bg-neon-red/10 text-glow-red border-neon-red/30'}`}>
            {r.result === 'heads' ? 'H' : 'T'}
          </span>
        ))}
      </div>
    </div>
  ) : undefined;

  return (
    <GameShell title="Coinflip" icon={<Coins className="w-6 h-6 text-neon-gold" />}
      betAmount={betAmount} setBetAmount={setBetAmount} onPlay={handlePlay} playing={playing} extraControls={extraControls} history={historyPanel}>
      <div className="text-center space-y-4 relative w-full max-w-[400px]">
        {/* Animated Coin */}
        <div className="h-64 w-full flex items-center justify-center">
          <motion.div
            animate={isFlipping ? { rotateY: 1800 } : { rotateY: flipResult === 'tails' ? 180 : 0 }}
            transition={{ duration: isFlipping ? 1.5 : 0.3, ease: "easeOut" }}
            className="relative w-40 h-40"
            style={{ transformStyle: 'preserve-3d' }}
          >
            {/* Heads side */}
            <div 
              className={`absolute inset-0 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-6xl shadow-2xl border-4 border-yellow-500 ${flipResult === 'heads' && result ? 'ring-4 ring-neon-green/50' : ''}`}
              style={{ backfaceVisibility: 'hidden' }}
            >
              👑
            </div>
            {/* Tails side */}
            <div 
              className={`absolute inset-0 rounded-full bg-gradient-to-br from-yellow-500 to-yellow-700 flex items-center justify-center text-6xl shadow-2xl border-4 border-yellow-600 ${flipResult === 'tails' && result ? 'ring-4 ring-neon-green/50' : ''}`}
              style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
            >
              ⭐
            </div>
          </motion.div>
        </div>

        {/* Choice display */}
        <div className="flex justify-center gap-4">
          <div className={`px-4 py-2 rounded-lg border transition-all ${choice === 'heads' ? 'bg-neon-gold/20 border-neon-gold text-glow-gold' : 'bg-surface border-border text-muted-foreground'}`}>
            👑 Heads
          </div>
          <div className={`px-4 py-2 rounded-lg border transition-all ${choice === 'tails' ? 'bg-neon-gold/20 border-neon-gold text-glow-gold' : 'bg-surface border-border text-muted-foreground'}`}>
            ⭐ Tails
          </div>
        </div>

        <AnimatePresence mode="wait">
          {result && (
            <motion.div key={result.coinResult + (result.won ? 'w' : 'l')} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }} aria-live="polite">
              <div className={`font-display font-extrabold text-2xl flex items-center justify-center gap-2 ${result.won ? 'text-glow-green' : 'text-glow-red'}`}>
                {result.won && <Sparkles className="w-5 h-5" />}
                {result.won ? `Won ${result.payout.toFixed(2)}!` : `Landed on ${result.coinResult}`}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <WinCelebration show={!!result?.won} amount={result?.payout ?? 0} currency={selectedCurrency} multiplier={result?.won ? 1.96 : undefined} big={false} />
      </div>
    </GameShell>
  );
}