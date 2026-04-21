/**
 * CrashGame — server-authoritative shared-round skin.
 *
 * Every player connected to /game/crash sees the SAME crash round
 * (same start time, same crash point) thanks to `useCrashRound` +
 * Supabase Realtime + the `crash_rounds` table.
 *
 * Visuals = AviatorCanvas (kept). Logic = entirely server-side.
 */
import { useState, useCallback, useMemo, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History, Plane } from 'lucide-react';
import GameShell from '../GameShell';
import WinCelebration from '../WinCelebration';
import { useAppStore } from '@/stores/app-store';
import { playSound } from '@/lib/sounds';
import { haptic } from '@/lib/haptics';
import Aviator3DScene from '../aviator/Aviator3DScene';
import GameLoadingScreen from '../shared/GameLoadingScreen';
import { getMultiplierColor } from '@/lib/animations';
import { useAuth } from '@/hooks/use-auth';
import { useCrashRound } from '@/hooks/use-crash-round';
import { toast } from '@/hooks/use-toast';

const QUICK_AMOUNTS = ['0.10', '1', '5', '25', '100'];

export default function CrashGame() {
  const { selectedCurrency } = useAppStore();
  const { user } = useAuth();
  const [betAmount, setBetAmount] = useState('10');
  const [autoCashout, setAutoCashout] = useState('2.00');
  const [characterType, setCharacterType] = useState<'airplane' | 'astronaut'>('airplane');

  const { round, bets, myBet, history, multiplier, placeBet, cashout } = useCrashRound({
    gameType: 'crash',
    userId: user?.id ?? null,
  });

  const status = round?.status ?? 'waiting';
  const crashPoint = round?.crash_multiplier ?? 0;

  // Phase mapping for the canvas
  const canvasPhase = status === 'running' ? 'running' : status === 'crashed' ? 'crashed' : 'waiting';
  const countdown = round && round.status === 'waiting'
    ? Math.max(0, 6 - (Date.now() - new Date(round.waiting_starts_at).getTime()) / 1000)
    : 0;

  // ── Actions ────────────────────────────────────────────────────────
  const handlePlaceBet = useCallback(async () => {
    if (!user) { toast({ title: 'Sign in to play' }); return; }
    if (!round || round.status !== 'waiting') {
      toast({ title: 'Wait for next round', description: 'Betting opens during the lobby phase.' });
      return;
    }
    const amt = parseFloat(betAmount);
    if (!Number.isFinite(amt) || amt <= 0) { toast({ title: 'Invalid bet' }); return; }
    const auto = parseFloat(autoCashout);
    const res = await placeBet(amt, Number.isFinite(auto) && auto > 1 ? auto : null);
    if (res.error) { toast({ title: 'Bet failed', description: res.error }); return; }
    playSound('bet'); haptic('tap');
  }, [user, round, betAmount, autoCashout, placeBet]);

  const handleCashout = useCallback(async () => {
    if (!myBet || myBet.status !== 'placed') return;
    const res = await cashout(myBet.id);
    if (res.error) { toast({ title: 'Cashout failed', description: res.error }); return; }
    playSound('crash.cashout'); haptic('win-big');
  }, [myBet, cashout]);

  // ── Live bets ticker (real bets from all players) ─────────────────
  const liveBets = useMemo(() => {
    return bets
      .filter((b) => b.game_type === 'crash')
      .sort((a, b) => {
        const order = { cashed: 0, placed: 1, lost: 2 } as const;
        return order[a.status] - order[b.status];
      })
      .slice(0, 14);
  }, [bets]);

  const totalPlayers = bets.filter((b) => b.game_type === 'crash').length;

  const extraControls = useMemo(() => (
    <div className="space-y-3">
      <div className="space-y-2 p-3 rounded-xl bg-surface border border-border">
        <label className="text-[10px] font-bold font-display text-muted-foreground uppercase tracking-wider">
          Bet Amount
        </label>
        <input
          type="number"
          value={betAmount}
          onChange={(e) => setBetAmount(e.target.value)}
          disabled={!!myBet}
          className="w-full px-3 py-2 rounded-lg bg-void border border-border text-foreground font-mono text-sm focus:border-primary focus:outline-none disabled:opacity-60"
          min={0.01}
          step="0.01"
        />
        <div className="grid grid-cols-5 gap-1">
          {QUICK_AMOUNTS.map((a) => (
            <button
              key={a}
              onClick={() => { setBetAmount(a); playSound('click'); }}
              disabled={!!myBet}
              className="py-1 rounded text-[10px] font-mono font-bold bg-void border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors disabled:opacity-40"
            >
              {a}
            </button>
          ))}
        </div>
        <label className="text-[10px] font-bold font-display text-muted-foreground uppercase tracking-wider mt-2 block">
          Auto Cashout @
        </label>
        <input
          type="number"
          value={autoCashout}
          onChange={(e) => setAutoCashout(e.target.value)}
          disabled={!!myBet}
          className="w-full px-3 py-2 rounded-lg bg-void border border-border text-foreground font-mono text-sm focus:border-neon-blue focus:outline-none disabled:opacity-60"
          min={1.01}
          step="0.01"
        />
      </div>

      <AnimatePresence>
        {myBet && myBet.status === 'placed' && status === 'running' && (
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0, scale: [1, 1.03, 1] }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ scale: { duration: 0.5, repeat: Infinity, ease: 'easeInOut' } }}
            onClick={handleCashout}
            className="w-full py-4 rounded-xl font-display font-extrabold text-base bg-neon-green text-background hover:brightness-110 transition-all"
          >
            CASHOUT — <span style={{ color: getMultiplierColor(multiplier) }}>{multiplier.toFixed(2)}×</span>
          </motion.button>
        )}
      </AnimatePresence>

      {myBet && myBet.status === 'cashed' && (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="p-3 rounded-lg bg-neon-green/10 border border-neon-green/30 text-center"
        >
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Cashed @ {Number(myBet.cashout_multiplier).toFixed(2)}×</div>
          <div className="font-mono font-bold text-lg text-glow-green">+{Number(myBet.payout).toFixed(2)}</div>
        </motion.div>
      )}

      {myBet && myBet.status === 'lost' && (
        <div className="p-3 rounded-lg bg-neon-red/10 border border-neon-red/30 text-center">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Round busted</div>
          <div className="font-mono font-bold text-lg text-glow-red">−{Number(myBet.bet_amount).toFixed(2)}</div>
        </div>
      )}

      {/* Live bets ticker */}
      <div className="rounded-xl bg-surface border border-border overflow-hidden">
        <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-neon-red animate-pulse" />
          Live Bets <span className="ml-auto text-foreground/60">{totalPlayers}</span>
        </div>
        <div className="max-h-44 overflow-y-auto divide-y divide-border/40">
          <AnimatePresence initial={false}>
            {liveBets.map((b, i) => (
              <motion.div
                key={b.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: i * 0.02 }}
                className="px-3 py-1.5 flex items-center gap-2 text-[10px] font-mono"
              >
                <span className="w-5 h-5 rounded-full bg-gradient-to-br from-primary/40 to-neon-purple/40 flex items-center justify-center text-[9px] font-bold text-foreground">
                  {b.user_id.slice(0, 2).toUpperCase()}
                </span>
                <span className="flex-1 truncate text-foreground/80">
                  {b.user_id === user?.id ? 'You' : `Player ${b.user_id.slice(0, 6)}`}
                </span>
                <span className="text-foreground/60 w-12 text-right">{Number(b.bet_amount).toFixed(2)}</span>
                <span
                  className={`w-14 text-right ${
                    b.status === 'cashed'
                      ? 'text-glow-green'
                      : b.status === 'lost'
                      ? 'text-glow-red'
                      : 'text-foreground/40'
                  }`}
                >
                  {b.status === 'cashed'
                    ? `${Number(b.cashout_multiplier).toFixed(2)}×`
                    : b.status === 'lost'
                    ? '✗'
                    : '…'}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
          {liveBets.length === 0 && (
            <div className="px-3 py-4 text-center text-[10px] text-muted-foreground">No bets yet — be first this round</div>
          )}
        </div>
      </div>
    </div>
  ), [betAmount, autoCashout, myBet, status, multiplier, liveBets, totalPlayers, user, handleCashout]);

  const historyPanel = history.length > 0 ? (
    <div className="p-3 rounded-xl bg-surface border border-border">
      <div className="text-[10px] font-bold text-muted-foreground uppercase mb-2 flex items-center gap-1">
        <History className="w-3 h-3" /> Previous Rounds
      </div>
      <div className="flex flex-wrap gap-1">
        {history.map((r) => {
          const cp = Number(r.crash_multiplier);
          const tone =
            cp >= 10
              ? 'bg-neon-purple/15 text-neon-purple border-neon-purple/30'
              : cp >= 2
              ? 'bg-neon-green/10 text-glow-green border-neon-green/30'
              : cp >= 1.5
              ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
              : 'bg-neon-red/10 text-glow-red border-neon-red/30';
          return (
            <span
              key={r.round_number}
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${tone}`}
              title={`Crashed @ ${cp.toFixed(2)}×`}
            >
              {cp >= 10 ? '✨' : ''}
              {cp.toFixed(2)}×
            </span>
          );
        })}
      </div>
    </div>
  ) : undefined;

  const playLabel = !user
    ? 'Sign in to play'
    : myBet
    ? status === 'running'
      ? 'In flight…'
      : 'Bet placed — waiting'
    : status === 'waiting'
    ? `Place bet (${countdown.toFixed(1)}s)`
    : status === 'running'
    ? 'Round in flight'
    : 'Wait for next round';

  return (
    <GameShell
      title="Crash"
      icon={<Plane className="w-6 h-6 text-primary" />}
      betAmount={betAmount}
      setBetAmount={setBetAmount}
      onPlay={handlePlaceBet}
      playing={status === 'waiting' || status === 'running'}
      playLabel={playLabel}
      disabled={!!myBet || status !== 'waiting' || !user}
      extraControls={extraControls}
      history={historyPanel}
    >
      <div
        className="relative w-full overflow-hidden rounded-xl bg-gradient-to-b from-[#02060d] to-[#08111a] border border-border"
        style={{ aspectRatio: '16 / 9', minHeight: 320 }}
      >
        {/* 3D Scene with Loading Fallback */}
        <Suspense fallback={<GameLoadingScreen gameName="Crash" />}>
          <Aviator3DScene
            multiplier={multiplier}
            phase={canvasPhase}
            className="absolute inset-0"
          />
        </Suspense>
        
        {/* Multiplier Overlay - Top Right Corner */}
        <div className="absolute top-4 right-4 pointer-events-none z-10">
          <motion.div
            key={multiplier}
            initial={{ scale: 1 }}
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ duration: 0.1 }}
            className="text-right"
          >
            <AnimatePresence mode="wait">
              {status === 'crashed' ? (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="px-4 py-2 rounded-xl bg-red-500/20 border border-red-500/30 backdrop-blur-sm"
                >
                  <div className="text-red-400 text-2xl md:text-3xl font-bold font-mono tracking-tighter"
                    style={{ textShadow: '0 0 20px rgba(239, 68, 68, 0.8)' }}>
                    FLEW AWAY!
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="px-4 py-2 rounded-xl bg-black/40 border border-white/10 backdrop-blur-sm"
                >
                  <div className={`text-3xl md:text-4xl font-bold font-mono tracking-tighter ${getMultiplierColor(multiplier)}`}
                    style={{ textShadow: '0 0 20px currentColor' }}>
                    {multiplier.toFixed(2)}×
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Countdown Badge */}
        {status === 'waiting' && countdown > 0 && (
          <div className="absolute top-4 left-4 z-20">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="px-3 py-1.5 rounded-lg bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 text-sm font-mono"
            >
              Next round in {countdown.toFixed(1)}s
            </motion.div>
          </div>
        )}

        {/* Crash Flash + screen shake */}
        <AnimatePresence>
          {status === 'crashed' && (
            <motion.div
              key={`crash-${round?.id}`}
              initial={{ opacity: 0, x: 0, y: 0 }}
              animate={{
                opacity: [0, 0.55, 0.25, 0],
                x: [0, -10, 9, -7, 4, -2, 0],
                y: [0, 5, -6, 3, -2, 0],
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              className="absolute inset-0 bg-neon-red/40 pointer-events-none z-20"
            />
          )}
        </AnimatePresence>
        
        <WinCelebration
          show={!!myBet && myBet.status === 'cashed' && status !== 'running'}
          amount={Number(myBet?.payout ?? 0)}
          currency={selectedCurrency}
          multiplier={Number(myBet?.cashout_multiplier ?? 0)}
          big={Number(myBet?.cashout_multiplier ?? 0) >= 5}
        />
      </div>
    </GameShell>
  );
}
