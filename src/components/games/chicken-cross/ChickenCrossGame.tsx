/**
 * Chicken Cross — cross-the-road style stair climb.
 * Player picks difficulty, advances lane-by-lane, and cashes out anytime.
 * All survival/death rolls are decided by the server in a single call,
 * the client animates the result.
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bird, Car } from 'lucide-react';
import GameShell from '@/components/games/GameShell';
import { Button } from '@/components/ui/button';
import { playChickenCross, type ChickenCrossResult } from '@/lib/game-functions';
import { useToast } from '@/hooks/use-toast';
import { playSound } from '@/lib/sounds';
import DifficultySelector from '@/components/games/DifficultySelector';

type Difficulty = 'easy' | 'medium' | 'hard' | 'daredevil';

const STEPS: Record<Difficulty, number> = {
  easy: 1.06, medium: 1.18, hard: 1.45, daredevil: 2.10,
};

const VISIBLE_LANES = 12;

export default function ChickenCrossGame() {
  const [betAmount, setBetAmount] = useState(1);
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [lane, setLane] = useState(0);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<ChickenCrossResult | null>(null);

  const { toast } = useToast();

  const projectedMulti = (idx: number) =>
    +(Math.pow(STEPS[difficulty], idx) ).toFixed(2);

  const advance = async (target: number) => {
    setBusy(true);
    setOutcome(null);
    try {
      const res = await playChickenCross({ betAmount, difficulty, lanes: target });
      const result = res.result as ChickenCrossResult;
      // Animate lane-by-lane
      for (let i = 0; i < result.lanes.length; i++) {
        await new Promise((r) => setTimeout(r, 220));
        setLane(result.lanes[i].index);
        if (!result.lanes[i].safe) {
          playSound('lose', 0.5);
          break;
        }
        playSound('click', 0.25);
      }
      setOutcome(result);
      if (res.won) {
        playSound('win', 0.5);
        toast({ title: `Cashed at ${res.multiplier}×`, description: `+$${res.payout.toFixed(2)}` });
      }
    } catch {
      // toast handled
    } finally {
      setBusy(false);
    }
  };

  const onPlay = () => {
    setLane(0);
    setOutcome(null);
    advance(1);
  };

  const onContinue = () => advance((outcome?.cashedAt ?? lane) + 1);

  const onCashout = () => {
    if (!outcome?.cashedAt) return;
    // Already cashed out by current call.
  };

  const reset = () => {
    setLane(0);
    setOutcome(null);
  };

  const dead = outcome && outcome.deathLane !== undefined;
  const cashed = outcome && outcome.cashedAt !== undefined;
  const currentMulti = outcome?.cashedAt
    ? projectedMulti(outcome.cashedAt)
    : lane > 0 && !dead
      ? projectedMulti(lane)
      : 0;

  return (
    <GameShell
      title="Chicken Cross"
      betAmount={betAmount}
      onBetAmountChange={setBetAmount}
      onPlay={onPlay}
      isPlaying={busy}
      canPlay={!busy && (outcome === null || dead === true)}
      playLabel={dead ? 'Try Again' : 'Start Run'}
    >
      <div className="space-y-4">
        <DifficultySelector
          value={difficulty}
          onChange={(d) => setDifficulty(d as Difficulty)}
          disabled={busy}
          options={[
            { value: 'easy', label: 'Easy' },
            { value: 'medium', label: 'Medium' },
            { value: 'hard', label: 'Hard' },
            { value: 'daredevil', label: 'Daredevil' },
          ]}
        />

        {/* The road */}
        <div className="rounded-xl border border-border bg-gradient-to-b from-card to-background p-3 overflow-hidden">
          <div className="flex items-end justify-between gap-1 min-h-[140px]">
            {Array.from({ length: VISIBLE_LANES }, (_, i) => i + 1).map((idx) => {
              const reached = lane >= idx;
              const isDeath = dead && outcome?.deathLane === idx;
              return (
                <div
                  key={idx}
                  className={[
                    'flex-1 flex flex-col items-center justify-end gap-1 rounded-md p-1 border',
                    reached
                      ? 'border-primary/50 bg-primary/10'
                      : 'border-border/40 bg-muted/30',
                  ].join(' ')}
                >
                  <span className="text-[9px] font-mono text-muted-foreground">
                    {projectedMulti(idx)}×
                  </span>
                  <div className="h-16 w-full flex items-end justify-center relative">
                    {isDeath && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute inset-0 flex items-center justify-center"
                      >
                        <Car className="w-6 h-6 text-destructive" />
                      </motion.div>
                    )}
                    {lane === idx && !isDeath && (
                      <motion.div
                        layoutId="chicken"
                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                        className="text-2xl"
                      >
                        🐔
                      </motion.div>
                    )}
                  </div>
                  <span className="text-[9px] font-mono text-foreground/50">{idx}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="text-xs font-mono text-muted-foreground">
            Lane <span className="text-foreground font-bold">{lane}</span>
            {currentMulti > 0 && (
              <>
                {' · '}
                <span className="text-primary font-bold">{currentMulti}×</span>
              </>
            )}
          </div>
          <div className="flex gap-2">
            {cashed === false && lane > 0 && !dead && (
              <Button size="sm" onClick={onContinue} disabled={busy}>
                Advance →
              </Button>
            )}
            {(dead || cashed) && (
              <Button size="sm" variant="outline" onClick={reset} disabled={busy}>
                <Bird className="w-3 h-3 mr-1" /> Reset
              </Button>
            )}
          </div>
        </div>
      </div>
    </GameShell>
  );
}
