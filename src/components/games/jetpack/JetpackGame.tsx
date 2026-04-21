/**
 * JetpackGame — same shared-round engine as CrashGame, jetpack visuals.
 * Both games live on the SAME round. Bets are tagged `game_type='jetpack'`.
 */
import { useState, useCallback, useMemo, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Rocket, History } from 'lucide-react';
import GameShell from '../GameShell';
import WinCelebration from '../WinCelebration';
import { useAppStore } from '@/stores/app-store';
import { playSound } from '@/lib/sounds';
import { haptic } from '@/lib/haptics';
import Jetpack3DScene from './Jetpack3DScene';
import GameLoadingScreen from '../shared/GameLoadingScreen';
import { getMultiplierColor } from '@/lib/animations';
import { useAuth } from '@/hooks/use-auth';
import { useCrashRound } from '@/hooks/use-crash-round';
import { toast } from '@/hooks/use-toast';

const QUICK_AMOUNTS = ['0.10', '1', '5', '25', '100'];

export default function JetpackGame() {
  const { selectedCurrency } = useAppStore();
  const { user } = useAuth();
  const [betAmount, setBetAmount] = useState('10');
  const [autoCashout, setAutoCashout] = useState('2.00');
  const [autoEnabled, setAutoEnabled] = useState(true);

  const { round, bets, myBet, history, multiplier, placeBet, cashout } = useCrashRound({
    gameType: 'jetpack',
    userId: user?.id ?? null,
  });

  const status = round?.status ?? 'waiting';
  const crashPoint = round?.crash_multiplier ?? 0;
  const canvasPhase = status === 'running' ? 'running' : status === 'crashed' ? 'crashed' : 'waiting';
  const countdown = round && round.status === 'waiting'
    ? Math.max(0, 6 - (Date.now() - new Date(round.waiting_starts_at).getTime()) / 1000)
    : 0;

  const handlePlaceBet = useCallback(async () => {
    if (!user) { toast({ title: 'Sign in to play' }); return; }
    if (!round || round.status !== 'waiting') {
      toast({ title: 'Wait for next launch' });
      return;
    }
    const amt = parseFloat(betAmount);
    if (!Number.isFinite(amt) || amt <= 0) { toast({ title: 'Invalid bet' }); return; }
    const auto = autoEnabled ? parseFloat(autoCashout) : NaN;
    const res = await placeBet(amt, Number.isFinite(auto) && auto > 1 ? auto : null);
    if (res.error) { toast({ title: 'Bet failed', description: res.error }); return; }
    playSound('bet');
  }, [user, round, betAmount, autoCashout, autoEnabled, placeBet]);

  const handleCashout = useCallback(async () => {
    if (!myBet || myBet.status !== 'placed') return;
    const res = await cashout(myBet.id);
    if (res.error) { toast({ title: 'Cashout failed', description: res.error }); return; }
    playSound('crash.cashout');
  }, [myBet, cashout]);

  const liveBets = useMemo(
    () =>
      bets
        .filter((b) => b.game_type === 'jetpack')
        .sort((a, b) => {
          const order = { cashed: 0, placed: 1, lost: 2 } as const;
          return order[a.status] - order[b.status];
        })
        .slice(0, 14),
    [bets]
  );

  const totalPlayers = bets.filter((b) => b.game_type === 'jetpack').length;

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
              className="py-1.5 rounded text-[10px] font-mono font-bold bg-void border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors disabled:opacity-40"
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      <div className="p-3 rounded-xl bg-surface border border-border space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold font-display text-muted-foreground uppercase tracking-wider">
            Auto Cashout
          </label>
          <button
            onClick={() => { setAutoEnabled(!autoEnabled); playSound('click'); }}
            disabled={!!myBet}
            className={`relative w-9 h-5 rounded-full transition-colors ${autoEnabled ? 'bg-neon-green' : 'bg-border'} disabled:opacity-50`}
            aria-label="Toggle auto cashout"
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-foreground transition-transform ${
                autoEnabled ? 'translate-x-4' : ''
              }`}
            />
          </button>
        </div>
        <input
          type="number"
          value={autoCashout}
          onChange={(e) => setAutoCashout(e.target.value)}
          disabled={!autoEnabled || !!myBet}
          className="w-full px-3 py-2 rounded-lg bg-void border border-border text-foreground font-mono text-sm focus:border-neon-blue focus:outline-none disabled:opacity-50"
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
            CASHOUT — {multiplier.toFixed(2)}×
          </motion.button>
        )}
      </AnimatePresence>

      {myBet && myBet.status === 'cashed' && (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="p-3 rounded-lg bg-neon-green/10 border border-neon-green/30 text-center"
        >
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Escaped @ {Number(myBet.cashout_multiplier).toFixed(2)}×
          </div>
          <div className="font-mono font-bold text-lg text-glow-green">+{Number(myBet.payout).toFixed(2)}</div>
        </motion.div>
      )}

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
                <span className="w-5 h-5 rounded-full bg-gradient-to-br from-neon-purple/40 to-primary/40 flex items-center justify-center text-[9px] font-bold text-foreground">
                  {b.user_id.slice(0, 2).toUpperCase()}
                </span>
                <span className="flex-1 truncate text-foreground/80">
                  {b.user_id === user?.id ? 'You' : `Player ${b.user_id.slice(0, 6)}`}
                </span>
                <span className="text-foreground/60 w-12 text-right">{Number(b.bet_amount).toFixed(2)}</span>
                <span
                  className={`w-16 text-right ${
                    b.status === 'cashed'
                      ? 'text-glow-green'
                      : b.status === 'lost'
                      ? 'text-glow-red'
                      : 'text-foreground/40'
                  }`}
                >
                  {b.status === 'cashed'
                    ? `🚀 ${Number(b.cashout_multiplier).toFixed(2)}×`
                    : b.status === 'lost'
                    ? '💥'
                    : '…'}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
          {liveBets.length === 0 && (
            <div className="px-3 py-4 text-center text-[10px] text-muted-foreground">No pilots yet — strap in!</div>
          )}
        </div>
      </div>
    </div>
  ), [betAmount, autoCashout, autoEnabled, myBet, status, multiplier, liveBets, totalPlayers, user, handleCashout]);

  const historyPanel = history.length > 0 ? (
    <div className="p-3 rounded-xl bg-surface border border-border">
      <div className="text-[10px] font-bold text-muted-foreground uppercase mb-2 flex items-center gap-1">
        <History className="w-3 h-3" /> Previous Launches
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
              🚀 {cp.toFixed(2)}×
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
      ? 'In flight 🚀'
      : 'Strapped in — waiting'
    : status === 'waiting'
    ? `Strap in (${countdown.toFixed(1)}s)`
    : status === 'running'
    ? 'In Flight 🚀'
    : 'Wait for next launch';

  return (
    <GameShell
      title="Jetpack"
      icon={<Rocket className="w-6 h-6 text-neon-purple" />}
      betAmount={betAmount}
      setBetAmount={setBetAmount}
      onPlay={handlePlaceBet}
      playing={status === 'waiting' || status === 'running'}
      playLabel={playLabel}
      disabled={!!myBet || status !== 'waiting' || !user}
      extraControls={extraControls}
      history={historyPanel}
    >
      <motion.div
        className="relative w-full overflow-hidden rounded-xl bg-gradient-to-b from-[#000008] to-[#0a0a1a] border border-border"
        style={{ aspectRatio: '16 / 9', minHeight: 320 }}
        animate={
          status === 'crashed'
            ? { x: [0, -8, 7, -5, 3, -1, 0], y: [0, 4, -5, 2, -1, 0] }
            : myBet?.status === 'cashed'
            ? { scale: [1, 1.01, 1], boxShadow: ['0 0 0 0 hsl(var(--neon-green) / 0)', '0 0 40px 4px hsl(var(--neon-green) / 0.4)', '0 0 0 0 hsl(var(--neon-green) / 0)'] }
            : {}
        }
        transition={{ duration: 0.6 }}
      >
        {/* 3D Scene with Loading Fallback */}
        <Suspense fallback={<GameLoadingScreen gameName="Jetpack" />}>
          <Jetpack3DScene
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
                    CRASHED!
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
              className="px-3 py-1.5 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-400 text-sm font-mono"
            >
              🚀 Launching in {countdown.toFixed(1)}s
            </motion.div>
          </div>
        )}

        {/* Crash Flash Effect */}
        <AnimatePresence>
          {status === 'crashed' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.4, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              className="absolute inset-0 bg-neon-red/30 pointer-events-none z-20"
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
      </motion.div>
    </GameShell>
  );
}
