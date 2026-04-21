import { useState, useCallback, useMemo, useRef, useEffect, memo } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import { Rocket, History, TrendingUp, Flame } from 'lucide-react';
import GameShell from '../GameShell';
import WinCelebration from '../WinCelebration';
import { playLimbo } from '@/lib/game-functions';
import { useAppStore } from '@/stores/app-store';
import { haptic } from '@/lib/haptics';
import { getMultiplierColor } from '@/lib/animations';
import { gameSounds } from '@/lib/game-sounds';
import type { Difficulty } from '@/lib/difficulty';

const DIFF_EDGE: Record<Difficulty, number> = { easy: 0.005, medium: 0.01, hard: 0.02, extreme: 0.04, nightmare: 0.08 };
const DIFF_PRESETS: Record<Difficulty, number[]> = {
  easy: [1.2, 1.5, 2, 3],
  medium: [1.5, 2, 3, 5, 10],
  hard: [3, 5, 10, 25, 50],
  extreme: [10, 25, 50, 100, 250],
  nightmare: [50, 100, 500, 1000],
};

const AnimatedCounter = memo(function AnimatedCounter({ value, duration = 0.8, className = '' }: { value: number; duration?: number; className?: string }) {
  const motionValue = useMotionValue(1);
  const rounded = useTransform(motionValue, (v) => v.toFixed(2));
  useEffect(() => {
    const controls = animate(motionValue, value, { duration, ease: 'easeOut' });
    return () => controls.stop();
  }, [value, duration, motionValue]);
  return <motion.span className={className}>{rounded}</motion.span>;
});

export default function LimboGame() {
  const { selectedCurrency } = useAppStore();
  const [betAmount, setBetAmount] = useState('10');
  const [playing, setPlaying] = useState(false);
  const [targetMult, setTargetMult] = useState('2.00');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [result, setResult] = useState<{ value: number; won: boolean; payout: number } | null>(null);
  const [history, setHistory] = useState<Array<{ value: number; won: boolean }>>([]);
  const [previewVal, setPreviewVal] = useState(1);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const tickRef = useRef<number | null>(null);

  // Initialize audio context
  useEffect(() => {
    setAudioContext(new (window.AudioContext || (window as any).webkitAudioContext)());
  }, []);

  // Play limbo-specific sound
  const playLimboSound = useCallback((soundType: 'spin' | 'win' | 'lose' | 'tick') => {
    if (!audioContext) return;
    const soundProfile = gameSounds.limbo;
    const sounds = soundProfile.sounds as Record<string, (ctx: AudioContext) => void>;
    if (sounds[soundType]) {
      sounds[soundType](audioContext);
    }
  }, [audioContext]);

  const winChance = useMemo(() => {
    const t = parseFloat(targetMult) || 2;
    return Math.max(0.01, (1 - DIFF_EDGE[difficulty]) / t * 100);
  }, [targetMult, difficulty]);

  useEffect(() => {
    if (!playing) return;
    let last = 0;
    const tick = (t: number) => {
      if (t - last > 60) {
        last = t;
        setPreviewVal(1 + Math.random() * 50);
        playLimboSound('tick');
      }
      tickRef.current = requestAnimationFrame(tick);
    };
    tickRef.current = requestAnimationFrame(tick);
    return () => { if (tickRef.current !== null) cancelAnimationFrame(tickRef.current); };
  }, [playing, playLimboSound]);

  const handlePlay = useCallback(async () => {
    setPlaying(true);
    setResult(null);
    playLimboSound('spin');
    haptic('tap');
    const target = parseFloat(targetMult) || 2;
    try {
      const res = await playLimbo({ betAmount: parseFloat(betAmount), targetMultiplier: target });
      const value = res.result.value;
      const won = res.won;
      const payout = res.payout;
      await new Promise(r => setTimeout(r, 800));
      setResult({ value, won, payout });
      setHistory(prev => [{ value, won }, ...prev].slice(0, 25));
      playLimboSound(won ? 'win' : 'lose');
    } finally {
      setPlaying(false);
    }
  }, [betAmount, targetMult, playLimboSound]);

  const extraControls = (
    <div className="space-y-3 p-4 rounded-xl bg-surface border border-border">
      <label className="text-[10px] font-bold font-display text-muted-foreground uppercase tracking-wider block">Target Multiplier</label>
      <div className="relative">
        <input type="number" value={targetMult} onChange={e => setTargetMult(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-void border border-border text-foreground font-mono text-sm focus:border-neon-blue focus:outline-none pr-10" min={1.01} step="0.01" disabled={playing} />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-mono">×</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {DIFF_PRESETS[difficulty].map(m => (
          <button key={m} onClick={() => setTargetMult(m.toFixed(2))} disabled={playing}
            className="flex-1 min-w-[52px] py-1.5 rounded-lg text-[10px] font-mono font-bold bg-void border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors">{m}×</button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-1.5 text-center pt-1">
        <div className="rounded bg-void/60 border border-border py-1.5">
          <div className="text-[8px] uppercase text-muted-foreground">Win Chance</div>
          <div className="text-[11px] font-mono font-bold text-glow-green">{winChance.toFixed(2)}%</div>
        </div>
        <div className="rounded bg-void/60 border border-border py-1.5">
          <div className="text-[8px] uppercase text-muted-foreground">Profit</div>
          <div className="text-[11px] font-mono font-bold text-foreground">+{((parseFloat(betAmount) || 0) * (parseFloat(targetMult) - 1)).toFixed(2)}</div>
        </div>
      </div>
    </div>
  );

  const historyPanel = history.length > 0 ? (
    <div className="p-3 rounded-xl bg-surface border border-border space-y-2">
      <div className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1"><History className="w-3 h-3" /> History</div>
      <div className="flex flex-wrap gap-1">
        {history.slice(0, 12).map((r, i) => (
          <span key={i} className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${r.won ? 'bg-neon-green/10 text-glow-green' : 'bg-neon-red/10 text-glow-red'}`}>{r.value.toFixed(2)}×</span>
        ))}
      </div>
    </div>
  ) : undefined;

  const displayMultiplier = playing ? previewVal : result?.value || 1;

  return (
    <GameShell title="Limbo" icon={<Rocket className="w-6 h-6 text-neon-purple" />}
      betAmount={betAmount} setBetAmount={setBetAmount} onPlay={handlePlay} playing={playing} extraControls={extraControls} history={historyPanel}>
      <div className="text-center space-y-4 relative w-full max-w-md">
        {/* Multiplier Display */}
        <div className={`h-64 w-full rounded-xl overflow-hidden border bg-gradient-to-b from-slate-900 to-slate-950 relative flex items-center justify-center transition-colors duration-300 ${
          result?.won ? 'border-neon-green/60 shadow-[0_0_40px_hsl(var(--neon-green)/0.35)]'
          : result && !result.won ? 'border-neon-red/60 shadow-[0_0_40px_hsl(var(--neon-red)/0.35)]'
          : 'border-border'
        }`}>
          <AnimatePresence>
            {result && (
              <motion.div
                key={`limbo-flash-${result.value}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.3, 0] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6 }}
                className={`absolute inset-0 pointer-events-none ${result.won ? 'bg-neon-green' : 'bg-neon-red'}`}
              />
            )}
          </AnimatePresence>
          {/* Rocket icon animation */}
          <motion.div
            animate={playing ? { y: [0, -30, 0], rotate: [-5, 5, -5], scale: [1, 1.15, 1] } : result?.won ? { y: [0, -60, -120], opacity: [1, 1, 0], scale: [1, 1.2, 0.8] } : {}}
            transition={playing ? { duration: 0.6, repeat: Infinity, ease: 'easeInOut' } : { duration: 1.2, ease: 'easeOut' }}
            className="text-6xl drop-shadow-[0_0_25px_rgba(167,139,250,0.6)]"
          >
            🚀
          </motion.div>

          {/* Multiplier overlay - Top Right Corner */}
          <div className="absolute top-4 right-4 pointer-events-none">
            {playing ? (
              <motion.div 
                animate={{ scale: [0.95, 1.05, 0.95] }} 
                transition={{ duration: 0.6, repeat: Infinity }}
                className="px-4 py-2 rounded-xl bg-black/40 border border-white/10 backdrop-blur-sm"
              >
                <div className="font-mono font-extrabold text-3xl text-white/80 tracking-tight drop-shadow-[0_0_18px_rgba(255,255,255,0.6)]">
                  {previewVal.toFixed(2)}×
                </div>
              </motion.div>
            ) : result ? (
              <motion.div 
                initial={{ scale: 0.5, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }} 
                transition={{ type: 'spring', damping: 14, stiffness: 220 }}
                className={`px-4 py-2 rounded-xl backdrop-blur-sm ${result.won ? 'bg-neon-green/20 border border-neon-green/30' : 'bg-neon-red/20 border border-neon-red/30'}`}
              >
                <div className={`font-display font-extrabold text-3xl tracking-tight drop-shadow-[0_0_24px_currentColor] ${result.won ? 'text-glow-green' : 'text-glow-red'}`}>
                  <AnimatedCounter value={result.value} duration={0.6} />×
                </div>
                <div className={`text-xs mt-1 font-bold flex items-center justify-end gap-1 ${result.won ? 'text-glow-green' : 'text-glow-red'}`}>
                  {result.won ? <><Flame className="w-3 h-3" /> Won {result.payout.toFixed(2)}!</> : `Target was ${targetMult}×`}
                </div>
              </motion.div>
            ) : (
              <div className="px-4 py-2 rounded-xl bg-black/40 border border-white/10 backdrop-blur-sm">
                <div className="font-mono font-extrabold text-3xl text-muted-foreground/40 tracking-tight">??.??×</div>
              </div>
            )}
          </div>
        </div>

        {/* Probability bar */}
        <div className="px-4">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
            <span>Probability</span>
            <span className="font-mono font-bold text-glow-green">{winChance.toFixed(2)}%</span>
          </div>
          <div className="h-2 rounded-full bg-void overflow-hidden border border-border">
            <motion.div
              className="h-full bg-gradient-to-r from-neon-green via-neon-blue to-neon-purple"
              initial={false}
              animate={{ width: `${Math.min(100, winChance)}%` }}
              transition={{ type: 'spring', damping: 18, stiffness: 200 }}
            />
          </div>
        </div>

        <WinCelebration show={!!result?.won} amount={result?.payout ?? 0} currency={selectedCurrency} multiplier={result?.won ? parseFloat(targetMult) : undefined} big={result?.won && parseFloat(targetMult) >= 5} />
      </div>
    </GameShell>
  );
}