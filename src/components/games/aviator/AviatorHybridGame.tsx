/**
 * AviatorHybridGame — server-authoritative skin.
 *
 * All RNG/crash math lives on the server (`crash_rounds` + `advance_crash_round`).
 * This component is purely a 3D presentation layer driven by `useCrashRound`,
 * so every player sees the same shared round and wallets are mutated only by
 * the `place_crash_bet` / `cashout_crash_bet` SECURITY DEFINER RPCs.
 */
import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Aviator3DScene from './Aviator3DScene';
import PlayerGhostsOverlay from '../shared/PlayerGhostsOverlay';
import { crash } from '@/lib/sounds';
import { useAuth } from '@/hooks/use-auth';
import { useCrashRound } from '@/hooks/use-crash-round';
import { toast } from '@/hooks/use-toast';

interface AviatorHybridGameProps {
  className?: string;
  /** Which shared round skin to drive — both share math, only artwork differs. */
  gameType?: 'crash' | 'jetpack';
}

export default function AviatorHybridGame({ className = '', gameType = 'crash' }: AviatorHybridGameProps) {
  const { user } = useAuth();
  const [betAmount, setBetAmount] = useState(100);

  const { round, bets, myBet, multiplier, placeBet, cashout } = useCrashRound({
    gameType,
    userId: user?.id ?? null,
  });

  const status = round?.status ?? 'waiting';
  const phase: 'waiting' | 'running' | 'crashed' | 'cashed_out' =
    myBet?.status === 'cashed' && status === 'running' ? 'cashed_out'
    : status === 'running' ? 'running'
    : status === 'crashed' || status === 'settled' ? 'crashed'
    : 'waiting';

  const crashPoint = round?.crash_multiplier ?? 0;
  const hasBet = !!myBet && myBet.status !== 'lost';
  const hasCashedOut = myBet?.status === 'cashed';

  const potentialWin = useMemo(
    () => (hasBet && !hasCashedOut ? betAmount * multiplier : 0),
    [hasBet, hasCashedOut, betAmount, multiplier],
  );
  const actualWin = useMemo(
    () => (hasCashedOut && myBet ? Number(myBet.payout) : 0),
    [hasCashedOut, myBet],
  );

  const handlePlaceBet = useCallback(async () => {
    if (!user) { toast({ title: 'Sign in to play' }); return; }
    if (status !== 'waiting') { toast({ title: 'Wait for next round' }); return; }
    const res = await placeBet(betAmount, null);
    if (res.error) toast({ title: 'Bet failed', description: res.error });
    else crash.tick();
  }, [user, status, betAmount, placeBet]);

  const handleCashOut = useCallback(async () => {
    if (!myBet || myBet.status !== 'placed') return;
    const res = await cashout(myBet.id);
    if (res.error) toast({ title: 'Cashout failed', description: res.error });
    else crash.cashout();
  }, [myBet, cashout]);

  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`}>
      <Aviator3DScene multiplier={multiplier} phase={phase} className="absolute inset-0 z-0" />

      <PlayerGhostsOverlay
        bets={bets.filter((b) => b.game_type === gameType)}
        multiplier={multiplier}
        status={status}
        variant="plane"
        excludeUserId={user?.id ?? null}
        className="z-[5]"
      />

      <div className="absolute inset-0 z-10 pointer-events-none">
        <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-background/60 to-transparent" />
      </div>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none">
        <motion.div key={Math.floor(multiplier * 10)} initial={{ scale: 1 }} animate={{ scale: [1, 1.02, 1] }} transition={{ duration: 0.1 }} className="text-center">
          <span
            className={`text-7xl md:text-8xl font-bold font-mono tracking-tighter ${
              phase === 'crashed' ? 'text-destructive'
              : phase === 'cashed_out' ? 'text-success'
              : 'text-foreground'
            }`}
            style={{ textShadow: '0 0 30px hsl(var(--primary) / 0.5)' }}
          >
            {multiplier.toFixed(2)}×
          </span>
        </motion.div>
      </div>

      <div className="absolute top-4 left-4 z-30">
        <div className="px-4 py-2 rounded-lg font-semibold text-sm uppercase tracking-wider bg-card/60 border border-border text-foreground backdrop-blur-sm">
          {phase === 'waiting' && '⏳ Starting Soon'}
          {phase === 'running' && '🚀 Flying'}
          {phase === 'crashed' && '💥 Crashed'}
          {phase === 'cashed_out' && '💰 Cashed Out'}
        </div>
      </div>

      <div className="absolute bottom-4 left-4 right-4 z-30">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card/60 backdrop-blur-sm rounded-2xl p-4 border border-border">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">Bet:</span>
            <div className="flex items-center bg-muted/40 rounded-lg">
              <button onClick={() => setBetAmount(Math.max(1, betAmount - 10))} className="px-3 py-2 text-foreground hover:bg-muted/40">−</button>
              <input type="number" value={betAmount} onChange={(e) => setBetAmount(Math.max(1, parseInt(e.target.value) || 1))} className="w-20 bg-transparent text-foreground text-center font-mono" />
              <button onClick={() => setBetAmount(betAmount + 10)} className="px-3 py-2 text-foreground hover:bg-muted/40">+</button>
            </div>
          </div>

          <div className="text-center">
            <div className="text-muted-foreground text-xs">Potential Win</div>
            <div className="text-foreground font-mono text-lg">${potentialWin.toFixed(2)}</div>
          </div>

          {!hasBet ? (
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handlePlaceBet} disabled={status !== 'waiting'}
              className={`px-8 py-3 rounded-xl font-bold text-lg ${status === 'waiting' ? 'gradient-primary text-primary-foreground shadow-lg' : 'bg-muted text-muted-foreground cursor-not-allowed'}`}>
              Place Bet
            </motion.button>
          ) : !hasCashedOut ? (
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleCashOut} disabled={phase !== 'running'}
              className={`px-8 py-3 rounded-xl font-bold text-lg ${phase === 'running' ? 'bg-warning text-warning-foreground shadow-lg animate-pulse' : 'bg-muted text-muted-foreground cursor-not-allowed'}`}>
              Cash Out ${potentialWin.toFixed(2)}
            </motion.button>
          ) : (
            <div className="text-center">
              <div className="text-success font-bold text-lg">Won ${actualWin.toFixed(2)}!</div>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {phase === 'crashed' && crashPoint > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <motion.div initial={{ scale: 0 }} animate={{ scale: [0, 1.2, 1] }} transition={{ duration: 0.3 }}
                className="text-destructive text-6xl font-bold mb-4" style={{ textShadow: '0 0 50px hsl(var(--destructive) / 0.8)' }}>
                FLEW AWAY!
              </motion.div>
              <div className="text-muted-foreground text-xl">Crashed at {crashPoint.toFixed(2)}×</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
