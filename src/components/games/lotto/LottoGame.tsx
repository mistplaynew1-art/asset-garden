/**
 * Lotto — pick 6 numbers from 1..49. Server draws 6 winners.
 * All RNG is server-authoritative via the play-game edge function.
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Ticket, RotateCcw, Sparkles } from 'lucide-react';
import GameShell from '@/components/games/GameShell';
import { Button } from '@/components/ui/button';
import { playLottoGame, type LottoResult } from '@/lib/game-functions';
import { useToast } from '@/hooks/use-toast';
import { playSound } from '@/lib/sounds';

const POOL = 49;
const PICK_COUNT = 6;

const PAYOUT_TABLE: Array<{ matches: number; multi: string }> = [
  { matches: 3, multi: '5×' },
  { matches: 4, multi: '50×' },
  { matches: 5, multi: '500×' },
  { matches: 6, multi: '50,000×' },
];

export default function LottoGame() {
  const [betAmount, setBetAmount] = useState('1');
  const [picks, setPicks] = useState<number[]>([]);
  const [drawn, setDrawn] = useState<number[]>([]);
  const [matches, setMatches] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const togglePick = (n: number) => {
    if (busy) return;
    setPicks((p) =>
      p.includes(n) ? p.filter((x) => x !== n) : p.length < PICK_COUNT ? [...p, n] : p,
    );
  };

  const quickPick = () => {
    if (busy) return;
    const set = new Set<number>();
    while (set.size < PICK_COUNT) set.add(Math.floor(Math.random() * POOL) + 1);
    setPicks(Array.from(set).sort((a, b) => a - b));
  };

  const reset = () => {
    setPicks([]);
    setDrawn([]);
    setMatches(null);
  };

  const onPlay = async () => {
    if (picks.length !== PICK_COUNT) {
      toast({ title: 'Pick 6 numbers', description: `You need ${PICK_COUNT - picks.length} more.` });
      return;
    }
    setBusy(true);
    setDrawn([]);
    setMatches(null);
    try {
      const res = await playLottoGame({ betAmount: parseFloat(betAmount), picks });
      const result = res.result as LottoResult;
      for (let i = 0; i < result.drawn.length; i++) {
        await new Promise((r) => setTimeout(r, 450));
        setDrawn(result.drawn.slice(0, i + 1));
        playSound('keno.draw');
      }
      setMatches(result.matches);
      if (res.won) {
        playSound('keno.win');
        toast({
          title: `Won ${res.multiplier}× — $${res.payout.toFixed(2)}`,
          description: `${result.matches} matches`,
        });
      } else {
        playSound('lose');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <GameShell
      title="Lotto"
      betAmount={betAmount}
      setBetAmount={setBetAmount}
      onPlay={onPlay}
      playing={busy}
      disabled={picks.length !== PICK_COUNT}
      playLabel="Draw"
    >
      <div className="w-full space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Ticket className="w-4 h-4 text-primary" />
            <span className="text-xs uppercase tracking-widest font-mono text-muted-foreground">
              Pick {PICK_COUNT} of {POOL}
            </span>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={quickPick} disabled={busy}>
              <Sparkles className="w-3 h-3 mr-1" /> Quick Pick
            </Button>
            <Button size="sm" variant="outline" onClick={reset} disabled={busy}>
              <RotateCcw className="w-3 h-3 mr-1" /> Clear
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 sm:grid-cols-10 gap-1.5">
          {Array.from({ length: POOL }, (_, i) => i + 1).map((n) => {
            const picked = picks.includes(n);
            const isHit = drawn.includes(n) && picks.includes(n);
            const isDraw = drawn.includes(n);
            return (
              <button
                key={n}
                onClick={() => togglePick(n)}
                disabled={busy}
                className={[
                  'aspect-square rounded-lg text-sm font-bold font-mono transition-all border',
                  isHit
                    ? 'bg-gradient-to-br from-primary to-accent text-primary-foreground border-primary shadow-[0_0_18px_hsl(var(--primary)/0.6)]'
                    : isDraw
                      ? 'bg-accent/30 text-accent-foreground border-accent/60'
                      : picked
                        ? 'bg-primary/20 text-primary border-primary/60'
                        : 'bg-card text-foreground border-border hover:border-primary/50',
                ].join(' ')}
              >
                {n}
              </button>
            );
          })}
        </div>

        <div className="rounded-xl border border-border bg-card/50 p-3">
          <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground mb-2">
            Draw
          </div>
          <div className="flex flex-wrap gap-2 min-h-[44px]">
            <AnimatePresence>
              {drawn.map((n) => (
                <motion.div
                  key={n}
                  initial={{ scale: 0, rotate: -120 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  className={[
                    'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold font-mono border-2',
                    picks.includes(n)
                      ? 'bg-gradient-to-br from-primary to-accent text-primary-foreground border-primary shadow-[0_0_18px_hsl(var(--primary)/0.6)]'
                      : 'bg-muted text-foreground border-border',
                  ].join(' ')}
                >
                  {n}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          {matches !== null && (
            <div className="mt-3 text-sm font-mono">
              <span className="text-muted-foreground">Matches: </span>
              <span className="font-bold text-foreground">{matches}</span>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card/30 p-3">
          <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground mb-2">
            Payouts
          </div>
          <div className="grid grid-cols-4 gap-2 text-xs">
            {PAYOUT_TABLE.map((p) => (
              <div key={p.matches} className="flex flex-col items-center rounded-lg bg-muted/30 p-2">
                <span className="font-bold text-foreground">{p.matches} match</span>
                <span className="text-primary font-mono">{p.multi}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </GameShell>
  );
}
