/**
 * SlotControls — unified bottom-bar UI used by all themed Phaser slots.
 *
 * Includes bet stepper, paylines indicator, SPIN/STOP, AUTO dropdown, TURBO
 * toggle, paytable button, free-spins badge, and an animated last-win counter.
 */
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Play, Square, ChevronDown, Repeat, BookOpen, Sparkles, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type AutoCount = number | 'infinite';

const PRESETS = [0.2, 0.5, 1, 2, 5, 10, 20, 50, 100];
const AUTO_OPTIONS: AutoCount[] = [5, 10, 25, 50, 100, 'infinite'];

export interface SlotControlsProps {
  betAmount: string;
  setBetAmount: (v: string) => void;
  onSpin: () => void;
  onAutoSpin: (count: AutoCount) => void;
  onStopAuto: () => void;
  onToggleTurbo: () => void;
  onOpenPaytable: () => void;
  spinning: boolean;
  autoSpinning: boolean;
  autoRemaining?: AutoCount | null;
  turboMode: boolean;
  phase: string;
  balance: number;
  currency: string;
  lastWin: number;
  freeSpinsRemaining: number;
  paylinesCount?: number;
}

function useCountUp(target: number, durationMs = 500) {
  const [v, setV] = useState(target);
  const startRef = useRef<number | null>(null);
  const fromRef = useRef(target);
  useEffect(() => {
    fromRef.current = v;
    startRef.current = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - (startRef.current ?? now)) / durationMs);
      setV(fromRef.current + (target - fromRef.current) * t);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs]);
  return v;
}

export default function SlotControls({
  betAmount, setBetAmount,
  onSpin, onAutoSpin, onStopAuto, onToggleTurbo, onOpenPaytable,
  spinning, autoSpinning, autoRemaining, turboMode,
  phase, balance, currency, lastWin, freeSpinsRemaining, paylinesCount,
}: SlotControlsProps) {
  const [autoOpen, setAutoOpen] = useState(false);
  const winV = useCountUp(lastWin);
  const bet = parseFloat(betAmount) || 0;

  const stepBet = (dir: 1 | -1) => {
    const idx = PRESETS.findIndex(p => p >= bet);
    let nextIdx = idx + dir;
    if (nextIdx < 0) nextIdx = 0;
    if (nextIdx >= PRESETS.length) nextIdx = PRESETS.length - 1;
    setBetAmount(String(PRESETS[nextIdx]));
  };

  const setMaxBet = () => {
    // Pick the highest preset <= balance, or the smallest preset if balance is tiny.
    const affordable = PRESETS.filter(p => p <= Math.max(0, balance));
    const max = affordable.length ? affordable[affordable.length - 1] : PRESETS[0];
    setBetAmount(String(max));
  };

  const spinBtnClass = cn(
    'relative h-14 w-14 sm:h-16 sm:w-16 rounded-full font-display font-extrabold text-xs uppercase tracking-wider',
    'flex items-center justify-center transition-all active:scale-95 select-none neon-button',
    'border-2',
    spinning ? 'animate-pulse text-white' : 'text-black hover:brightness-110',
  );
  const spinBtnStyle: React.CSSProperties = spinning
    ? {
        background: 'linear-gradient(135deg, var(--neon-red-hex), #b8002a)',
        borderColor: 'var(--neon-red-hex)',
        boxShadow: '0 0 24px color-mix(in oklab, var(--neon-red-hex) 60%, transparent), inset 0 0 12px rgba(255,255,255,0.15)',
      }
    : autoSpinning
      ? {
          background: 'linear-gradient(135deg, var(--neon-green-hex), #00b35e)',
          borderColor: 'var(--neon-green-hex)',
          boxShadow: '0 0 22px color-mix(in oklab, var(--neon-green-hex) 55%, transparent)',
        }
      : {
          background: 'linear-gradient(135deg, var(--neon-gold-hex), #ff8c00)',
          borderColor: 'var(--neon-gold-hex)',
          boxShadow: '0 0 22px color-mix(in oklab, var(--neon-gold-hex) 55%, transparent)',
        };

  const handleSpinBtn = () => {
    if (autoSpinning) { onStopAuto(); return; }
    if (spinning) return;
    onSpin();
  };

  const winMultiplier = bet > 0 && lastWin > 0 ? lastWin / bet : 0;

  return (
    <div className="w-full mt-3 rounded-xl bg-surface/80 border border-border backdrop-blur p-3 flex flex-col gap-2">
      {/* Top row: balance / total bet / win — three bordered chips */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-void/60 border border-border px-2 py-1.5">
          <div className="text-[8px] uppercase tracking-wider text-muted-foreground">Balance</div>
          <div className="font-mono text-xs font-extrabold text-foreground tabular-nums truncate">
            {balance.toFixed(2)} <span className="text-muted-foreground text-[9px]">{currency}</span>
          </div>
        </div>
        <div className="rounded-lg bg-void/60 border border-border px-2 py-1.5">
          <div className="text-[8px] uppercase tracking-wider text-muted-foreground">Total Bet</div>
          <div className="font-mono text-xs font-extrabold text-amber-300 tabular-nums truncate">
            {bet.toFixed(2)} <span className="text-muted-foreground text-[9px]">{currency}</span>
          </div>
        </div>
        <div className={`rounded-lg border px-2 py-1.5 transition-colors ${lastWin > 0 ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-void/60 border-border'}`}>
          <div className="text-[8px] uppercase tracking-wider text-muted-foreground flex items-center justify-between">
            <span>Last Win</span>
            {winMultiplier >= 5 && (
              <span className="font-mono font-extrabold text-emerald-300">{winMultiplier.toFixed(1)}×</span>
            )}
          </div>
          <div className={`font-mono text-xs font-extrabold tabular-nums truncate ${lastWin > 0 ? 'text-emerald-300' : 'text-muted-foreground'}`}>
            {winV.toFixed(2)} <span className="text-muted-foreground text-[9px]">{currency}</span>
          </div>
        </div>
      </div>

      {freeSpinsRemaining > 0 && (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-yellow-400/20 via-amber-300/30 to-yellow-400/20 border border-yellow-400/50 text-yellow-200 font-bold text-xs animate-pulse"
        >
          ⚡ FREE SPINS REMAINING: {freeSpinsRemaining}
        </motion.div>
      )}

      {/* Main control row */}
      <div className="flex items-center gap-2">
        {/* Bet stepper */}
        <div className="flex items-center gap-1 rounded-lg bg-background/60 border border-border p-1">
          <button
            type="button"
            onClick={() => stepBet(-1)}
            disabled={spinning || autoSpinning}
            className="h-8 w-8 rounded-md bg-surface hover:bg-muted text-foreground font-bold disabled:opacity-40"
          >−</button>
          <div className="px-2 min-w-[64px] text-center">
            <div className="text-[8px] uppercase text-muted-foreground tracking-wider">Bet</div>
            <div className="font-mono text-sm font-bold text-foreground">{bet.toFixed(2)}</div>
          </div>
          <button
            type="button"
            onClick={() => stepBet(1)}
            disabled={spinning || autoSpinning}
            className="h-8 w-8 rounded-md bg-surface hover:bg-muted text-foreground font-bold disabled:opacity-40"
          >+</button>
          <button
            type="button"
            onClick={setMaxBet}
            disabled={spinning || autoSpinning}
            className="h-8 px-2 rounded-md bg-gradient-to-br from-amber-400 to-amber-600 text-black font-display font-extrabold text-[10px] tracking-wider uppercase hover:brightness-110 active:scale-95 disabled:opacity-40 flex items-center gap-1"
            title="Max bet"
            aria-label="Max bet"
          >
            <Maximize2 className="w-3 h-3" />
            Max
          </button>
        </div>

        {/* Paylines tag */}
        {paylinesCount !== undefined && (
          <div className="hidden sm:flex flex-col items-center px-2 py-1 rounded-lg bg-background/60 border border-border">
            <div className="text-[8px] uppercase text-muted-foreground tracking-wider">Lines</div>
            <div className="font-mono text-sm font-bold text-foreground">{paylinesCount}</div>
          </div>
        )}

        {/* SPIN button — GODMODE */}
        <button type="button" onClick={handleSpinBtn} className={spinBtnClass} style={spinBtnStyle} aria-label="Spin">
          {autoSpinning ? <Square className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          {autoSpinning && typeof autoRemaining === 'number' && (
            <span
              className="absolute -top-1 -right-1 text-[9px] rounded-full px-1 font-mono font-bold"
              style={{ background: 'var(--bg-void)', color: 'var(--neon-green-hex)', border: '1px solid var(--neon-green-hex)' }}
              data-numeric
            >
              {autoRemaining}
            </span>
          )}
        </button>

        {/* AUTO dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setAutoOpen(o => !o)}
            disabled={spinning && !autoSpinning}
            className="h-10 px-2 rounded-lg bg-background/60 border border-border text-foreground flex items-center gap-1 hover:bg-muted disabled:opacity-40"
          >
            <Repeat className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Auto</span>
            <ChevronDown className="w-3 h-3" />
          </button>
          <AnimatePresence>
            {autoOpen && (
              <motion.div
                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                className="absolute right-0 bottom-full mb-1 z-50 min-w-[120px] rounded-lg bg-popover border border-border shadow-xl overflow-hidden"
              >
                {AUTO_OPTIONS.map(opt => (
                  <button
                    key={String(opt)}
                    onClick={() => { setAutoOpen(false); onAutoSpin(opt); }}
                    className="block w-full text-left px-3 py-1.5 text-xs font-mono hover:bg-muted text-popover-foreground"
                  >
                    {opt === 'infinite' ? '∞ Infinite' : `${opt} spins`}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* TURBO */}
        <button
          type="button"
          onClick={onToggleTurbo}
          className={cn(
            'h-10 w-10 rounded-lg border flex items-center justify-center transition',
            turboMode
              ? 'bg-yellow-400/20 border-yellow-400 text-yellow-300'
              : 'bg-background/60 border-border text-muted-foreground hover:text-foreground',
          )}
          aria-label="Turbo mode"
          title="Turbo"
        >
          <Zap className="w-4 h-4" />
        </button>

        {/* PAYTABLE */}
        <button
          type="button"
          onClick={onOpenPaytable}
          className="h-10 w-10 rounded-lg border border-border bg-background/60 text-muted-foreground hover:text-foreground flex items-center justify-center"
          aria-label="Paytable"
          title="Paytable"
        >
          <BookOpen className="w-4 h-4" />
        </button>
      </div>

      {/* Bottom phase pill */}
      {phase && phase !== 'idle' && (
        <div className="flex items-center justify-center gap-1 text-[9px] uppercase tracking-widest text-muted-foreground">
          <Sparkles className="w-3 h-3" /> {phase.replace('-', ' ')}
        </div>
      )}
    </div>
  );
}
