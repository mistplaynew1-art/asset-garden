import { useState, useCallback, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Grid3X3, History, Sparkles, RotateCw } from 'lucide-react';
import GameShell from '../GameShell';
import WinCelebration from '../WinCelebration';
import { playKeno } from '@/lib/game-functions';
import { useAppStore } from '@/stores/app-store';
import { playSound } from '@/lib/sounds';
import { haptic } from '@/lib/haptics';
import { gameSounds } from '@/lib/game-sounds';

const KENO_PAYOUTS: Record<number, Record<number, number>> = {
  1: { 1: 3.5 }, 2: { 1: 1, 2: 9 }, 3: { 1: 0, 2: 2, 3: 26 },
  4: { 2: 1.5, 3: 5, 4: 50 },
  5: { 0: 0, 1: 0, 2: 1, 3: 3, 4: 12, 5: 50 },
  6: { 3: 1.5, 4: 4, 5: 12, 6: 75 },
  7: { 3: 1, 4: 2, 5: 6, 6: 25, 7: 100 },
  8: { 4: 2, 5: 5, 6: 15, 7: 50, 8: 200 },
  9: { 4: 1.5, 5: 3, 6: 8, 7: 25, 8: 75, 9: 500 },
  10: { 0: 0, 1: 0, 2: 0, 3: 1, 4: 2, 5: 5, 6: 15, 7: 40, 8: 100, 9: 500, 10: 1000 },
};

const NumberCell = memo(function NumberCell({
  n, isSelected, isDrawn, isHit, onClick, disabled,
}: { n: number; isSelected: boolean; isDrawn: boolean; isHit: boolean; onClick: () => void; disabled: boolean }) {
  return (
    <motion.button onClick={onClick} disabled={disabled}
      whileHover={!disabled ? { scale: 1.08 } : {}}
      whileTap={{ scale: 0.92 }}
      animate={isHit ? { scale: [1, 1.2, 1], rotate: [0, 8, -8, 0] } : {}}
      transition={isHit ? { duration: 0.5 } : {}}
      className={`relative aspect-square rounded-lg text-xs font-mono font-bold transition-colors ${
        isHit ? 'bg-gradient-to-br from-neon-green/40 to-neon-green/10 border-2 border-neon-green/60 text-glow-green shadow-[0_0_12px_hsl(var(--neon-green)/0.5)]' :
        isDrawn ? 'bg-neon-red/10 border border-neon-red/40 text-glow-red' :
        isSelected ? 'bg-gradient-to-br from-primary/30 to-primary/10 border-2 border-primary/60 text-primary shadow-[0_0_8px_hsl(var(--primary)/0.4)]' :
        'bg-void border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
      }`}
      style={{ willChange: 'transform' }}>
      {n}
      {isHit && (
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-neon-green" />
      )}
    </motion.button>
  );
});

export default function KenoGame() {
  const { selectedCurrency } = useAppStore();
  const [betAmount, setBetAmount] = useState('10');
  const [playing, setPlaying] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [drawn, setDrawn] = useState<Set<number>>(new Set());
  const [result, setResult] = useState<{ hits: number; payout: number; multiplier: number } | null>(null);
  const [history, setHistory] = useState<Array<{ hits: number; multiplier: number; won: boolean }>>([]);

  const possiblePayouts = useMemo(() => {
    const table = KENO_PAYOUTS[selected.size] || {};
    return Object.entries(table).map(([h, m]) => ({ hits: parseInt(h), mult: m })).filter(e => e.mult > 0).sort((a, b) => a.hits - b.hits);
  }, [selected.size]);

  const toggleNumber = useCallback((n: number) => {
    if (playing) return;
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else if (next.size < 10) next.add(n);
      return next;
    });
    playSound('click');
  }, [playing]);

  const clearAll = useCallback(() => { if (!playing) { setSelected(new Set()); setDrawn(new Set()); setResult(null); } }, [playing]);

  const quickPick = useCallback((n: number) => {
    if (playing) return;
    const set = new Set<number>();
    while (set.size < n) set.add(1 + Math.floor(Math.random() * 40));
    setSelected(set);
    setDrawn(new Set());
    setResult(null);
    playSound('click');
  }, [playing]);

  const handlePlay = useCallback(async () => {
    if (selected.size === 0) return;
    setPlaying(true);
    setDrawn(new Set());
    setResult(null);
    try {
      const res = await playKeno({ betAmount: parseFloat(betAmount), picks: Array.from(selected) });
      const nums = res.result.drawn;
      for (let i = 0; i < nums.length; i++) {
        await new Promise(r => setTimeout(r, 180));
        setDrawn(prev => new Set([...prev, nums[i]]));
        playSound(selected.has(nums[i]) ? 'keno.hit' : 'keno.draw');
      }
      setResult({ hits: res.result.hits, payout: res.payout, multiplier: res.multiplier });
      setHistory(prev => [{ hits: res.result.hits, multiplier: res.multiplier, won: res.won }, ...prev].slice(0, 20));
      setTimeout(() => playSound(res.won ? 'keno.win' : 'lose'), 200);
    } catch (e) {
      console.error('keno', e);
    } finally {
      setPlaying(false);
    }
  }, [betAmount, selected]);

  const extraControls = (
    <div className="space-y-2">
      <div className="flex gap-1.5">
        {[1, 5, 10].map(n => (
          <button key={n} onClick={() => quickPick(n)} disabled={playing} className="flex-1 py-1.5 rounded-lg text-[10px] font-bold bg-void border border-border text-muted-foreground hover:text-foreground hover:border-primary/40">
            Pick {n}
          </button>
        ))}
        <button onClick={clearAll} disabled={playing} title="Clear" className="px-2 py-1.5 rounded-lg bg-void border border-border text-muted-foreground hover:text-foreground hover:border-neon-red/40">
          <RotateCw className="w-3.5 h-3.5" />
        </button>
      </div>
      {possiblePayouts.length > 0 && (
        <div className="p-3 rounded-xl bg-surface border border-border">
          <div className="text-[10px] font-bold text-muted-foreground uppercase mb-2">Payout Table ({selected.size} picks)</div>
          <div className="grid grid-cols-2 gap-1 text-[10px] font-mono">
            {possiblePayouts.map(p => (
              <div key={p.hits} className="flex justify-between items-center px-1.5 py-0.5 rounded bg-void/60">
                <span className="text-muted-foreground">{p.hits} hits</span>
                <span className="font-bold text-glow-gold">{p.mult}×</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const historyPanel = history.length > 0 ? (
    <div className="p-3 rounded-xl bg-surface border border-border">
      <div className="text-[10px] font-bold text-muted-foreground uppercase mb-2 flex items-center gap-1"><History className="w-3 h-3" /> History</div>
      <div className="flex flex-wrap gap-1">
        {history.map((r, i) => (
          <span key={i} className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${r.won ? 'bg-neon-green/10 text-glow-green' : 'bg-neon-red/10 text-glow-red'}`}>
            {r.hits}h · {r.multiplier}×
          </span>
        ))}
      </div>
    </div>
  ) : undefined;

  return (
    <GameShell title="Keno" icon={<Grid3X3 className="w-6 h-6 text-primary" />}
      betAmount={betAmount} setBetAmount={setBetAmount} onPlay={handlePlay} playing={playing}
      playLabel={selected.size === 0 ? 'Pick numbers' : `Draw 10 (${selected.size} picked)`} disabled={selected.size === 0}
      history={historyPanel} extraControls={extraControls}>
      <div className="w-full h-full flex items-center justify-center">
        <div className="space-y-4 w-full max-w-[440px] relative">
          <div className="grid grid-cols-8 gap-1.5 sm:gap-2">
            {Array.from({ length: 40 }, (_, i) => i + 1).map(n => (
              <NumberCell
                key={n}
                n={n}
                isSelected={selected.has(n)}
                isDrawn={drawn.has(n)}
                isHit={selected.has(n) && drawn.has(n)}
                onClick={() => toggleNumber(n)}
                disabled={playing}
              />
            ))}
          </div>
          {result && (
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center" aria-live="polite">
              <div className={`font-display font-extrabold text-xl flex items-center justify-center gap-2 ${result.payout > 0 ? 'text-glow-green' : 'text-glow-red'}`}>
                {result.payout > 0 && <Sparkles className="w-4 h-4" />}
                {result.hits} hit{result.hits === 1 ? '' : 's'} · {result.payout > 0 ? `+${result.payout.toFixed(2)} (${result.multiplier}×)` : 'Better luck next time'}
              </div>
            </motion.div>
          )}
          <WinCelebration
            show={!!result && result.payout > 0}
            amount={result?.payout ?? 0}
            currency={selectedCurrency}
            multiplier={result?.multiplier}
            big={!!result && result.multiplier >= 50}
          />
        </div>
      </div>
    </GameShell>
  );
}
