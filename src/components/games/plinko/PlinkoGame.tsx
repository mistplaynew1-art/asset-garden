/**
 * Plinko — premium ball drop game.
 *
 * Features:
 *  • Animated plinko board with ball and glowing pegs
 *  • Real-time probability + Expected Value (EV%) panel
 *  • Game-specific sounds from game-sounds.ts
 */
import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Triangle, History } from 'lucide-react';
import * as THREE from 'three';
import GameShell from '../GameShell';
import WinCelebration from '../WinCelebration';
import DifficultySelector from '../DifficultySelector';
import { playPlinko } from '@/lib/game-functions';
import { useAppStore } from '@/stores/app-store';
import { haptic } from '@/lib/haptics';
import { gameSounds } from '@/lib/game-sounds';
import type { Difficulty } from '@/lib/difficulty';

const ROWS = 12;
const BUCKETS = ROWS + 1;

const MULT_TABLES: Record<Difficulty, number[]> = {
  easy:      [2, 1.5, 1.2, 1, 0.7, 0.5, 0.5, 0.5, 0.7, 1, 1.2, 1.5, 2],
  medium:    [5, 3, 2, 1.5, 1, 0.5, 0.3, 0.5, 1, 1.5, 2, 3, 5],
  hard:      [10, 5, 3, 1.5, 1, 0.5, 0.2, 0.5, 1, 1.5, 3, 5, 10],
  extreme:   [29, 10, 5, 2, 1, 0.3, 0.1, 0.3, 1, 2, 5, 10, 29],
  nightmare: [110, 41, 10, 5, 1.5, 0.2, 0.1, 0.2, 1.5, 5, 10, 41, 110],
};

const C = (n: number, k: number) => {
  let r = 1;
  for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1);
  return r;
};
const PROBS = Array.from({ length: BUCKETS }, (_, k) => C(ROWS, k) / 2 ** ROWS);

export default function PlinkoGame() {
  const { selectedCurrency } = useAppStore();
  const [betAmount, setBetAmount] = useState('10');
  const [playing, setPlaying] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [result, setResult] = useState<{ slot: number; mult: number; payout: number } | null>(null);
  const [history, setHistory] = useState<Array<{ mult: number; won: boolean }>>([]);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [ballY, setBallY] = useState(4);

  const MULTIPLIERS = MULT_TABLES[difficulty];

  // Initialize audio context
  useEffect(() => {
    setAudioContext(new (window.AudioContext || (window as any).webkitAudioContext)());
  }, []);

  // Play plinko-specific sound
  const playPlinkoSound = useCallback((soundType: 'drop' | 'bounce' | 'land' | 'win' | 'lose') => {
    if (!audioContext) return;
    const soundProfile = gameSounds.plinko;
    const sounds = soundProfile.sounds as Record<string, (ctx: AudioContext) => void>;
    if (sounds[soundType]) {
      sounds[soundType](audioContext);
    }
  }, [audioContext]);

  // Convert multipliers to slot colors
  const slots3D = useMemo(() => {
    return MULTIPLIERS.map((m) => {
      if (m >= 10) return { multiplier: m, color: '#ff3333' };
      if (m >= 5) return { multiplier: m, color: '#ff6633' };
      if (m >= 2) return { multiplier: m, color: '#ffcc33' };
      if (m >= 1) return { multiplier: m, color: '#33cc33' };
      return { multiplier: m, color: '#3366cc' };
    });
  }, [MULTIPLIERS]);

  // Ball position for 3D scene
  const ballPosition = useMemo(() => {
    if (!playing && !result) return undefined;
    return new THREE.Vector3(0, ballY, 0);
  }, [playing, result, ballY]);
  void ballPosition;

  const evPercent = useMemo(() => {
    const ev = MULTIPLIERS.reduce((s, m, i) => s + m * PROBS[i], 0);
    return (ev * 100).toFixed(1);
  }, [MULTIPLIERS]);

  const handlePlay = useCallback(async () => {
    setPlaying(true);
    setResult(null);
    playPlinkoSound('drop');
    haptic('tap');

    // Animate ball dropping
    const dropAnimation = () => {
      let y = 4;
      const drop = () => {
        y -= 0.3;
        setBallY(y);
        if (y > -3.5) {
          requestAnimationFrame(drop);
        }
      };
      drop();
    };
    dropAnimation();

    try {
      const serverDifficulty: 'easy' | 'medium' | 'hard' | 'expert' =
        difficulty === 'extreme' || difficulty === 'nightmare' ? 'expert' : (difficulty as 'easy' | 'medium' | 'hard');
      const res = await playPlinko({ betAmount: parseFloat(betAmount), difficulty: serverDifficulty });
      const slot = res.result.bucket;
      const mult = res.multiplier;
      const won = res.won;
      setBallY(-3.5);
      playPlinkoSound('land');
      setTimeout(() => playPlinkoSound(won ? 'win' : 'lose'), 200);
      setResult({ slot, mult, payout: res.payout });
      setHistory(prev => [{ mult, won }, ...prev].slice(0, 20));
    } catch (e) {
      console.error('plinko', e);
    } finally {
      setPlaying(false);
    }
  }, [betAmount, difficulty, playPlinkoSound]);

  const extraControls = (
    <>
      <DifficultySelector value={difficulty} onChange={setDifficulty} disabled={playing} />
      <div className="p-3 rounded-xl bg-surface border border-border space-y-1.5">
        <div className="flex items-center justify-between text-[10px] uppercase font-display text-muted-foreground">
          <span>Expected return</span>
          <span className="font-mono text-foreground">{evPercent}%</span>
        </div>
        <div className="flex items-center justify-between text-[10px] uppercase font-display text-muted-foreground">
          <span>Center bucket prob.</span>
          <span className="font-mono text-foreground">{(PROBS[Math.floor(BUCKETS / 2)] * 100).toFixed(1)}%</span>
        </div>
        <div className="flex items-center justify-between text-[10px] uppercase font-display text-muted-foreground">
          <span>Edge bucket prob.</span>
          <span className="font-mono text-foreground">{(PROBS[0] * 100).toFixed(2)}%</span>
        </div>
      </div>
    </>
  );

  const historyPanel = history.length > 0 ? (
    <div className="p-3 rounded-xl bg-surface border border-border">
      <div className="text-[10px] font-bold text-muted-foreground uppercase mb-2 flex items-center gap-1">
        <History className="w-3 h-3" /> History
      </div>
      <div className="flex flex-wrap gap-1">
        {history.map((r, i) => (
          <span
            key={i}
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
              r.won ? 'bg-neon-green/10 text-glow-green' : 'bg-neon-red/10 text-glow-red'
            }`}
          >
            {r.mult}×
          </span>
        ))}
      </div>
    </div>
  ) : undefined;

  return (
    <GameShell
      title="Plinko"
      icon={<Triangle className="w-6 h-6 text-primary" />}
      betAmount={betAmount}
      setBetAmount={setBetAmount}
      onPlay={handlePlay}
      playing={playing}
      history={historyPanel}
      extraControls={extraControls}
    >
      <div className="text-center space-y-4 w-full max-w-[420px] relative">
        {/* Ball animation area */}
        <div className={`relative h-80 w-full rounded-xl overflow-hidden border bg-gradient-to-b from-slate-900 to-slate-950 flex items-start justify-center pt-4 transition-colors duration-300 ${
          result && result.mult >= 2 ? 'border-neon-gold/60 shadow-[0_0_30px_hsl(var(--neon-gold)/0.35)]'
          : result && result.mult < 1 ? 'border-neon-red/40' : 'border-border'
        }`}>
          {/* Pegs grid (decorative glow) */}
          <div className="absolute inset-0 flex flex-col items-center justify-around pt-6 pb-16 pointer-events-none">
            {Array.from({ length: ROWS }).map((_, row) => (
              <div key={row} className="flex gap-3" style={{ marginLeft: row % 2 === 0 ? 0 : 10 }}>
                {Array.from({ length: row + 3 }).map((_, i) => (
                  <motion.div
                    key={i}
                    animate={playing ? { opacity: [0.3, 0.9, 0.3], scale: [1, 1.4, 1] } : { opacity: 0.3 }}
                    transition={playing ? { duration: 0.4, delay: row * 0.08 + i * 0.02, repeat: Infinity } : {}}
                    className="w-1.5 h-1.5 rounded-full bg-neon-blue/60 shadow-[0_0_4px_hsl(var(--neon-blue))]"
                  />
                ))}
              </div>
            ))}
          </div>
          <motion.div
            key={playing ? 'dropping' : 'idle'}
            initial={{ y: 0, opacity: playing ? 1 : 0.4 }}
            animate={playing ? { y: 280, x: [0, -20, 15, -10, 8, 0] } : { opacity: 0.4 }}
            transition={{ duration: 1.5, ease: 'easeIn', x: { duration: 1.5, ease: 'easeInOut' } }}
            className="w-7 h-7 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-600 shadow-[0_0_15px_rgba(250,204,21,0.7)] relative z-10"
          />
        </div>

        {/* Multiplier buckets display */}
        <div className="flex justify-center gap-1 flex-wrap">
          {MULTIPLIERS.map((m, i) => (
            <div
              key={i}
              className={`px-2 py-1 rounded text-[10px] font-mono font-bold transition-all ${
                result?.slot === i 
                  ? 'scale-125 shadow-lg ' + (m >= 2 ? 'bg-neon-gold/30 text-glow-gold' : m >= 1 ? 'bg-neon-green/20 text-glow-green' : 'bg-neon-red/20 text-glow-red')
                  : m >= 5 
                    ? 'bg-neon-gold/10 text-glow-gold/70' 
                    : m >= 2 
                      ? 'bg-neon-green/10 text-glow-green/70' 
                      : m < 1 
                        ? 'bg-neon-red/10 text-glow-red/70'
                        : 'bg-surface text-muted-foreground'
              }`}
            >
              {m}×
            </div>
          ))}
        </div>

        {result && !playing && (
          <motion.div
            initial={{ scale: 0.6, opacity: 0, y: -10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 240, damping: 14 }}
          >
            <div
              className={`font-mono font-extrabold text-4xl ${
                result.mult >= 2
                  ? 'text-glow-green'
                  : result.mult >= 1
                    ? 'text-foreground'
                    : 'text-glow-red'
              }`}
            >
              {result.mult}×
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {result.payout > parseFloat(betAmount) ? `Won ${result.payout.toFixed(2)}!` : 'Try again!'}
            </div>
          </motion.div>
        )}
        {!result && !playing && (
          <div className="font-display text-2xl text-muted-foreground">Drop the ball!</div>
        )}

        <WinCelebration
          show={!!result && result.mult > 1 && !playing}
          amount={result?.payout ?? 0}
          currency={selectedCurrency}
          multiplier={result?.mult}
          big={(result?.mult ?? 0) >= 5}
        />
      </div>
    </GameShell>
  );
}