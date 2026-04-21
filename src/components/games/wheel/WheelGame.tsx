/**
 * Wheel — premium spinning wheel game.
 *
 * Features:
 *  • Animated spinning wheel with segments
 *  • Physics-based spin/slowdown animation
 *  • Game-specific sounds from game-sounds.ts
 */
import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Target, History, Trophy } from 'lucide-react';
import GameShell from '../GameShell';
import WinCelebration from '../WinCelebration';
import DifficultySelector from '../DifficultySelector';
import { playWheel } from '@/lib/game-functions';
import { useAppStore } from '@/stores/app-store';
import { haptic } from '@/lib/haptics';
import { gameSounds } from '@/lib/game-sounds';
import type { Difficulty } from '@/lib/difficulty';

const WHEELS: Record<Difficulty, Array<{ label: string; multiplier: number; color: string }>> = {
  easy: [
    { label: '1.2×', multiplier: 1.2, color: '#3b82f6' },
    { label: '1.5×', multiplier: 1.5, color: '#22c55e' },
    { label: '1.2×', multiplier: 1.2, color: '#3b82f6' },
    { label: '0×',   multiplier: 0,   color: '#6b7280' },
    { label: '1.5×', multiplier: 1.5, color: '#22c55e' },
    { label: '1.2×', multiplier: 1.2, color: '#3b82f6' },
    { label: '0×',   multiplier: 0,   color: '#6b7280' },
    { label: '1.5×', multiplier: 1.5, color: '#22c55e' },
    { label: '2×',   multiplier: 2,   color: '#a855f7' },
    { label: '1.2×', multiplier: 1.2, color: '#3b82f6' },
  ],
  medium: [
    { label: '1.5×', multiplier: 1.5, color: '#3b82f6' },
    { label: '2×',   multiplier: 2,   color: '#22c55e' },
    { label: '0×',   multiplier: 0,   color: '#6b7280' },
    { label: '3×',   multiplier: 3,   color: '#a855f7' },
    { label: '0×',   multiplier: 0,   color: '#6b7280' },
    { label: '5×',   multiplier: 5,   color: '#f59e0b' },
    { label: '1.5×', multiplier: 1.5, color: '#3b82f6' },
    { label: '0×',   multiplier: 0,   color: '#6b7280' },
    { label: '2×',   multiplier: 2,   color: '#22c55e' },
    { label: '10×',  multiplier: 10,  color: '#ef4444' },
    { label: '0×',   multiplier: 0,   color: '#6b7280' },
    { label: '1.5×', multiplier: 1.5, color: '#3b82f6' },
  ],
  hard: [
    { label: '0×',   multiplier: 0,   color: '#6b7280' },
    { label: '3×',   multiplier: 3,   color: '#22c55e' },
    { label: '0×',   multiplier: 0,   color: '#6b7280' },
    { label: '0×',   multiplier: 0,   color: '#6b7280' },
    { label: '5×',   multiplier: 5,   color: '#a855f7' },
    { label: '0×',   multiplier: 0,   color: '#6b7280' },
    { label: '10×',  multiplier: 10,  color: '#f59e0b' },
    { label: '0×',   multiplier: 0,   color: '#6b7280' },
    { label: '0×',   multiplier: 0,   color: '#6b7280' },
    { label: '25×',  multiplier: 25,  color: '#ef4444' },
  ],
  extreme: [
    { label: '0×',   multiplier: 0,   color: '#6b7280' },
    { label: '0×',   multiplier: 0,   color: '#6b7280' },
    { label: '5×',   multiplier: 5,   color: '#22c55e' },
    { label: '0×',   multiplier: 0,   color: '#6b7280' },
    { label: '0×',   multiplier: 0,   color: '#6b7280' },
    { label: '15×',  multiplier: 15,  color: '#f59e0b' },
    { label: '0×',   multiplier: 0,   color: '#6b7280' },
    { label: '50×',  multiplier: 50,  color: '#ef4444' },
  ],
  nightmare: [
    { label: '0×',   multiplier: 0,   color: '#6b7280' },
    { label: '0×',   multiplier: 0,   color: '#6b7280' },
    { label: '0×',   multiplier: 0,   color: '#6b7280' },
    { label: '10×',  multiplier: 10,  color: '#a855f7' },
    { label: '0×',   multiplier: 0,   color: '#6b7280' },
    { label: '0×',   multiplier: 0,   color: '#6b7280' },
    { label: '0×',   multiplier: 0,   color: '#6b7280' },
    { label: '100×', multiplier: 100, color: '#ef4444' },
  ],
};

export default function WheelGame() {
  const { selectedCurrency } = useAppStore();
  const [betAmount, setBetAmount] = useState('10');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [playing, setPlaying] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<{ multiplier: number; payout: number } | null>(null);
  const [history, setHistory] = useState<Array<{ multiplier: number; won: boolean }>>([]);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [targetRotation3D, setTargetRotation3D] = useState<number | undefined>(undefined);
  const tickInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const segments = useMemo(() => WHEELS[difficulty], [difficulty]);
  const uniqueMults = useMemo(() => {
    const set = new Map<number, string>();
    segments.forEach(s => set.set(s.multiplier, s.color));
    return Array.from(set.entries()).sort((a, b) => a[0] - b[0]);
  }, [segments]);

  // Initialize audio context
  useEffect(() => {
    setAudioContext(new (window.AudioContext || (window as any).webkitAudioContext)());
  }, []);

  // Play wheel-specific sound
  const playWheelSound = useCallback((soundType: 'tick' | 'spin' | 'win' | 'lose') => {
    if (!audioContext) return;
    const soundProfile = gameSounds.wheel;
    const sounds = soundProfile.sounds as Record<string, (ctx: AudioContext) => void>;
    if (sounds[soundType]) {
      sounds[soundType](audioContext);
    }
  }, [audioContext]);

  const handlePlay = useCallback(async () => {
    setPlaying(true);
    setResult(null);
    setSpinning(true);
    setTargetRotation3D(undefined);
    playWheelSound('spin');

    try {
      const serverDifficulty: 'easy' | 'medium' | 'hard' =
        difficulty === 'extreme' || difficulty === 'nightmare' ? 'hard' : (difficulty as 'easy' | 'medium' | 'hard');
      const res = await playWheel({ betAmount: parseFloat(betAmount), difficulty: serverDifficulty });
      const segIdx = res.result.segment;
      const segAngle = (Math.PI * 2) / segments.length;
      const targetRot = segIdx * segAngle + segAngle / 2;
      setTargetRotation3D(targetRot);

      // Tick sounds during spin
      if (tickInterval.current) clearInterval(tickInterval.current);
      let speed = 60;
      const tick = () => {
        playWheelSound('tick');
        haptic('tick');
        speed += 8;
        if (speed < 250) tickInterval.current = setTimeout(tick, speed) as unknown as ReturnType<typeof setInterval>;
      };
      tick();

      await new Promise(r => setTimeout(r, 4000));
      if (tickInterval.current) clearTimeout(tickInterval.current as unknown as number);
      setSpinning(false);
      setResult({ multiplier: res.multiplier, payout: res.payout });
      setHistory(prev => [{ multiplier: res.multiplier, won: res.won }, ...prev].slice(0, 25));
      playWheelSound(res.won ? 'win' : 'lose');
    } catch (e) {
      console.error('wheel', e);
      setSpinning(false);
    } finally {
      setPlaying(false);
    }
  }, [betAmount, segments, difficulty, playWheelSound]);

  const extraControls = (
    <>
      <DifficultySelector value={difficulty} onChange={setDifficulty} disabled={playing} />
      <div className="p-3 rounded-xl bg-surface border border-border">
        <div className="text-[10px] font-bold text-muted-foreground uppercase mb-2 flex items-center gap-1"><Trophy className="w-3 h-3" /> Multipliers</div>
        <div className="flex flex-wrap gap-1.5">
          {uniqueMults.map(([m, color]) => (
            <span key={m} className="px-2 py-1 rounded-md text-[10px] font-mono font-bold border"
              style={{ background: `${color}22`, color, borderColor: `${color}55` }}>
              {m}×
            </span>
          ))}
        </div>
      </div>
    </>
  );

  const historyPanel = history.length > 0 ? (
    <div className="p-3 rounded-xl bg-surface border border-border">
      <div className="text-[10px] font-bold text-muted-foreground uppercase mb-2 flex items-center gap-1"><History className="w-3 h-3" /> Last spins</div>
      <div className="flex flex-wrap gap-1">
        {history.map((r, i) => (
          <span key={i} className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${r.won ? 'bg-neon-green/10 text-glow-green' : 'bg-neon-red/10 text-glow-red'}`}>{r.multiplier}×</span>
        ))}
      </div>
    </div>
  ) : undefined;

  return (
    <GameShell title="Wheel" icon={<Target className="w-6 h-6 text-neon-gold" />}
      betAmount={betAmount} setBetAmount={setBetAmount} onPlay={handlePlay} playing={playing} playLabel="Spin Wheel" history={historyPanel} extraControls={extraControls}>
      <div className="text-center space-y-4 relative w-full max-w-[400px]">
        {/* Wheel Display */}
        <div className="h-80 w-full rounded-xl overflow-hidden border border-border bg-gradient-to-b from-slate-900 to-slate-950 relative flex items-center justify-center">
          {/* Spinning wheel emoji */}
          <motion.div
            animate={spinning ? { rotate: 360 } : {}}
            transition={{ duration: 2, repeat: spinning ? Infinity : 0, ease: "linear" }}
            className="text-7xl"
          >
            🎡
          </motion.div>

          {/* Pointer overlay */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 drop-shadow-[0_0_12px_hsl(var(--neon-gold))]">
            <div className="w-0 h-0 border-l-[14px] border-r-[14px] border-t-[26px] border-l-transparent border-r-transparent border-t-neon-gold" />
          </div>
        </div>

        {result && !spinning && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className={`font-display font-bold text-lg ${result.payout > 0 ? 'text-glow-green' : 'text-glow-red'}`}>
            {result.payout > 0 ? `+${result.payout.toFixed(2)} ${selectedCurrency} · ${result.multiplier}×` : 'No win — try again!'}
          </motion.div>
        )}

        <WinCelebration show={!!result && !spinning && result.payout > 0} amount={result?.payout ?? 0} currency={selectedCurrency} multiplier={result?.multiplier} big={(result?.multiplier ?? 0) >= 5} />
      </div>
    </GameShell>
  );
}