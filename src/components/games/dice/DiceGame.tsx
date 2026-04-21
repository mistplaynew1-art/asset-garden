import { useState, useCallback, useEffect, useMemo, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dices, History, TrendingUp } from 'lucide-react';
import GameShell from '../GameShell';
import WinCelebration from '../WinCelebration';
import { playDice } from '@/lib/game-functions';
import { useAppStore } from '@/stores/app-store';
import { playSound } from '@/lib/sounds';
import { haptic } from '@/lib/haptics';
import { getMultiplierColor } from '@/lib/animations';
import { gameSounds } from '@/lib/game-sounds';

interface DiceResult { roll: number; won: boolean; multiplier: number; payout: number; }

export default function DiceGame() {
  const { selectedCurrency } = useAppStore();
  const [betAmount, setBetAmount] = useState('10');
  const [playing, setPlaying] = useState(false);
  const [target, setTarget] = useState(50);
  const [direction, setDirection] = useState<'over' | 'under'>('over');
  const [result, setResult] = useState<DiceResult | null>(null);
  const [history, setHistory] = useState<DiceResult[]>([]);
  const [dieFace, setDieFace] = useState(1);
  const [isRolling, setIsRolling] = useState(false);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const tumbleRef = useRef<number | null>(null);

  // Initialize audio context for game-specific sounds
  useEffect(() => {
    setAudioContext(new (window.AudioContext || (window as any).webkitAudioContext)());
  }, []);

  const winChance = direction === 'over' ? (100 - target) : target;
  const multiplier = winChance > 0 ? Math.floor((99 / winChance) * 10000) / 10000 : 0;
  const profitOnWin = useMemo(() => parseFloat(betAmount) * (multiplier - 1) || 0, [betAmount, multiplier]);

  // Play dice-specific sound
  const playDiceSound = useCallback((soundType: 'roll' | 'win' | 'lose' | 'tick') => {
    if (!audioContext) return;
    const soundProfile = gameSounds.dice;
    const sounds = soundProfile.sounds as Record<string, (ctx: AudioContext) => void>;
    if (sounds[soundType]) {
      sounds[soundType](audioContext);
    }
  }, [audioContext]);

  // Tumble while playing
  useEffect(() => {
    if (!playing) return;
    let last = 0;
    const tick = (t: number) => {
      if (t - last > 70) { 
        last = t; 
        const newFace = 1 + Math.floor(Math.random() * 6);
        setDieFace(newFace);
        playDiceSound('tick');
      }
      tumbleRef.current = requestAnimationFrame(tick);
    };
    tumbleRef.current = requestAnimationFrame(tick);
    return () => { if (tumbleRef.current !== null) cancelAnimationFrame(tumbleRef.current); };
  }, [playing, playDiceSound]);

  const handlePlay = useCallback(async () => {
    setPlaying(true);
    setIsRolling(true);
    setResult(null);
    playDiceSound('roll');
    haptic('tap');
    try {
      const res = await playDice({ betAmount: parseFloat(betAmount), target, direction });
      const roll = res.result.roll;
      const r: DiceResult = { roll, won: res.won, multiplier: res.multiplier, payout: res.payout };
      const finalFace = Math.max(1, Math.min(6, Math.ceil((roll / 100) * 6)));
      setTimeout(() => {
        setDieFace(finalFace);
        setIsRolling(false);
      }, 300);
      setResult(r);
      setHistory(prev => [r, ...prev].slice(0, 20));
      playDiceSound(r.won ? 'win' : 'lose');
    } finally { setPlaying(false); }
  }, [betAmount, target, direction, playDiceSound]);

  const extraControls = (
    <div className="space-y-3 p-4 rounded-xl bg-surface border border-border">
      <div className="flex gap-2">
        {(['over', 'under'] as const).map(d => (
          <button key={d} onClick={() => setDirection(d)} disabled={playing}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${direction === d ? 'gradient-primary text-foreground neon-glow-blue' : 'bg-void border border-border text-muted-foreground hover:border-primary/40'}`}>
            Roll {d === 'over' ? '↑ Over' : '↓ Under'}
          </button>
        ))}
      </div>
      <div>
        <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase mb-1">
          <span>Target: <span className="text-foreground font-mono">{target.toFixed(2)}</span></span>
          <span>Win: <span className="text-glow-green font-mono">{winChance.toFixed(2)}%</span></span>
        </div>
        <input type="range" min={2} max={98} step={1} value={target} onChange={e => setTarget(Number(e.target.value))}
          className="w-full accent-primary cursor-pointer" disabled={playing} />
      </div>
      <div className="grid grid-cols-3 gap-1.5 text-center">
        <div className="p-2 rounded-lg bg-void border border-border">
          <div className="text-[9px] uppercase text-muted-foreground font-display">Mult</div>
          <div
            className={`font-mono font-extrabold text-base tabular-nums ${multiplier >= 25 ? 'text-rainbow' : ''}`}
            style={multiplier < 25 ? { color: getMultiplierColor(multiplier) } : undefined}
          >
            {multiplier.toFixed(2)}×
          </div>
        </div>
        <Stat label="Profit" value={`+${profitOnWin.toFixed(2)}`} tone="text-glow-green" />
        <Stat label="Edge" value="1%" tone="text-muted-foreground" />
      </div>
    </div>
  );

  const historyPanel = history.length > 0 ? (
    <div className="p-3 rounded-xl bg-surface border border-border">
      <div className="text-[10px] font-bold text-muted-foreground uppercase mb-2 flex items-center gap-1"><History className="w-3 h-3" /> History</div>
      <div className="flex flex-wrap gap-1">
        {history.map((r, i) => (
          <span key={i} className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${r.won ? 'bg-neon-green/10 text-glow-green' : 'bg-neon-red/10 text-glow-red'}`}>
            {r.roll.toFixed(2)}
          </span>
        ))}
      </div>
    </div>
  ) : undefined;

  return (
    <GameShell title="Dice" icon={<Dices className="w-6 h-6 text-primary" />}
      betAmount={betAmount} setBetAmount={setBetAmount} onPlay={handlePlay} playing={playing} history={historyPanel} extraControls={extraControls}>
      <div className="text-center space-y-4 w-full max-w-[400px] relative">
        {/* Dice Display */}
        <div className={`relative h-48 w-full rounded-xl overflow-hidden border bg-gradient-to-b from-slate-900 to-slate-950 flex items-center justify-center transition-colors duration-300 ${
          result?.won ? 'border-neon-green/60 shadow-[0_0_30px_hsl(var(--neon-green)/0.35)]'
          : result && !result.won ? 'border-neon-red/60 shadow-[0_0_30px_hsl(var(--neon-red)/0.35)]'
          : 'border-border'
        }`}>
          <AnimatePresence>
            {result && (
              <motion.div
                key={`flash-${result.roll}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.35, 0] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.55 }}
                className={`absolute inset-0 pointer-events-none ${result.won ? 'bg-neon-green' : 'bg-neon-red'}`}
              />
            )}
          </AnimatePresence>
          <motion.div
            animate={isRolling ? { rotate: [0, 360, 720], scale: [1, 1.25, 1] } : result?.won ? { scale: [1, 1.15, 1] } : {}}
            transition={isRolling ? { duration: 0.5, repeat: Infinity, ease: 'linear' } : { duration: 0.4 }}
            className="text-6xl drop-shadow-[0_0_15px_currentColor]"
          >
            🎲
          </motion.div>
        </div>

        {/* Result strip */}
        <div className="relative h-14 w-full rounded-xl bg-void/80 overflow-hidden border border-border shadow-inner">
          {/* Win zone */}
          <div className={`absolute top-0 h-full transition-all duration-300 ${direction === 'under' ? 'left-0 bg-gradient-to-r from-neon-green/30 to-neon-green/10' : 'right-0 bg-gradient-to-l from-neon-green/30 to-neon-green/10'}`}
            style={{ width: `${winChance}%` }} />
          {/* Tick marks */}
          {[0, 25, 50, 75, 100].map(t => (
            <div key={t} className="absolute top-0 w-px h-full bg-foreground/10" style={{ left: `${t}%` }} />
          ))}
          {/* Target line */}
          <div className="absolute top-0 w-0.5 h-full bg-neon-gold shadow-[0_0_8px_hsl(var(--neon-gold))]" style={{ left: `${target}%` }}>
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-neon-gold" />
          </div>
          {/* Result marker */}
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ scale: 0, y: -20, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: 'spring', damping: 12, stiffness: 280 }}
                className={`absolute top-1/2 -translate-y-1/2 w-1.5 h-12 rounded-full ${result.won ? 'bg-glow-green shadow-[0_0_12px_hsl(var(--neon-green))]' : 'bg-glow-red shadow-[0_0_12px_hsl(var(--neon-red))]'}`}
                style={{ left: `${result.roll}%` }}
              />
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence mode="wait">
          {result && (
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} className="text-center" aria-live="polite">
              <div className={`font-mono font-extrabold text-5xl tracking-tight ${result.won ? 'text-glow-green' : 'text-glow-red'}`}>
                {result.roll.toFixed(2)}
              </div>
              {result.won ? (
                <div className="flex items-center justify-center gap-1 text-sm mt-1 text-glow-green font-bold">
                  <TrendingUp className="w-4 h-4" /> Won {result.payout.toFixed(2)} {selectedCurrency}
                </div>
              ) : (
                <div className="text-sm mt-1 text-muted-foreground">No luck — try another</div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        {!result && !playing && <div className="font-mono text-xl text-muted-foreground">Roll {direction} {target}</div>}
        <WinCelebration show={!!result?.won} amount={result?.payout ?? 0} currency={selectedCurrency} multiplier={result?.multiplier} big={(result?.multiplier ?? 0) >= 5} />
      </div>
    </GameShell>
  );
}

const Stat = memo(function Stat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-md bg-void/60 border border-border py-1.5">
      <div className="text-[8px] uppercase text-muted-foreground tracking-wider">{label}</div>
      <div className={`text-[11px] font-mono font-bold ${tone}`}>{value}</div>
    </div>
  );
});