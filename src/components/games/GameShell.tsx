/**
 * GameShell — premium "official casino" wrapper used by every original game.
 *
 * Polish:
 *  - Glossy header with title + provably-fair badge
 *  - Stat chips: Balance / Last Result hint area
 *  - Bet card with currency pill, ½/2×/Max + 6 quick chips
 *  - Big PLAY button with gradient + shimmer + scale press
 *  - Inline auth + deposit nudges with shake feedback
 */
import { type ReactNode, useState } from 'react';
import { useAppStore } from '@/stores/app-store';
import { playSound } from '@/lib/sounds';
import { toast } from 'sonner';
import { Link, useParams } from 'react-router-dom';
import { Wallet, Sparkles, Play } from 'lucide-react';
import TestCreditButton from '@/components/casino/TestCreditButton';
import ProvablyFairButton from '@/components/provably-fair/ProvablyFairButton';

interface GameShellProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  betAmount?: string;
  setBetAmount?: (v: string) => void;
  onPlay?: () => Promise<void>;
  playing?: boolean;
  disabled?: boolean;
  playLabel?: string;
  extraControls?: ReactNode;
  history?: ReactNode;
  stats?: ReactNode;
  gameId?: string;
  className?: string;
}

export default function GameShell({
  title, icon, children, betAmount = '', setBetAmount,
  onPlay, playing, disabled, playLabel, extraControls, history, stats, gameId,
}: GameShellProps) {
  const params = useParams<{ slug: string }>();
  const resolvedGameId = gameId ?? params.slug;
  const { balances, selectedCurrency, isAuthenticated } = useAppStore();
  const balance = balances.find(b => b.currency === selectedCurrency);
  const [shake, setShake] = useState(false);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 400);
  };

  const handlePlay = async () => {
    if (!isAuthenticated) {
      playSound('error');
      toast.error('Sign in to play', { description: 'Create an account or log in to place real bets.' });
      triggerShake();
      return;
    }
    const bet = parseFloat(betAmount);
    if (!bet || bet <= 0 || isNaN(bet)) {
      playSound('error');
      toast.error('Invalid bet amount', { description: 'Enter an amount greater than 0.' });
      triggerShake();
      return;
    }
    if (!balance || balance.balance <= 0) {
      playSound('error');
      toast.error('No balance', { description: 'Deposit funds to start playing.', action: { label: 'Deposit', onClick: () => { window.location.href = '/wallet'; } } });
      triggerShake();
      return;
    }
    if (bet > balance.balance) {
      playSound('error');
      toast.error('Insufficient balance', { description: `You have ${balance.balance.toFixed(2)} ${selectedCurrency}, bet is ${bet.toFixed(2)}.` });
      triggerShake();
      return;
    }
    if (!onPlay) {
      return;
    }
    playSound('bet');
    try {
      await onPlay();
    } catch (err) {
      playSound('error');
      const msg = err instanceof Error ? err.message : 'Bet failed';
      toast.error('Bet failed', { description: msg });
    }
  };

  const quickAmounts = [1, 5, 10, 25, 50, 100];
  const bal = balance?.balance ?? 0;
  const betNum = parseFloat(betAmount) || 0;
  const overBalance = betNum > bal && isAuthenticated;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* ── Glossy header ─────────────────────────────────── */}
      <div className="flex items-center gap-2 rounded-2xl border border-border/60 bg-gradient-to-r from-surface via-surface/80 to-surface/40 px-3 py-2.5 backdrop-blur">
        <div className="shrink-0">{icon}</div>
        <h1 className="font-display font-extrabold text-lg sm:text-xl text-foreground tracking-tight">{title}</h1>
        <span className="hidden sm:inline-flex items-center gap-1 ml-2 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[9px] font-bold text-emerald-300 uppercase tracking-wider">
          <Sparkles className="w-2.5 h-2.5" /> Provably Fair
        </span>
        {balance && isAuthenticated && (
          <div className="ml-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-void/60 border border-border">
            <Wallet className="w-3.5 h-3.5 text-emerald-300" />
            <span className="font-mono text-xs font-bold text-foreground tabular-nums">{bal.toFixed(2)}</span>
            <span className="text-[10px] text-muted-foreground">{selectedCurrency}</span>
          </div>
        )}
        <div className={isAuthenticated ? 'ml-2' : 'ml-auto'}>
          <ProvablyFairButton gameId={resolvedGameId} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Game stage */}
        <div className="lg:col-span-2 rounded-2xl game-stage border border-border p-4 sm:p-6 flex flex-col items-center justify-center min-h-[360px] relative overflow-hidden">
          {/* subtle inner highlight band */}
          <div aria-hidden className="absolute inset-x-0 top-0 h-24 pointer-events-none opacity-60"
            style={{ background: 'linear-gradient(180deg, hsl(0 0% 100% / 0.04), transparent)' }} />
          <div className="relative z-10 w-full flex flex-col items-center justify-center">{children}</div>
        </div>

        {/* Controls column */}
        <div className={`space-y-3 ${shake ? 'animate-[shake_0.4s_ease-in-out]' : ''}`}>
          <div className="p-4 rounded-xl bg-surface border border-border space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold font-display text-muted-foreground uppercase tracking-wider">Bet Amount</label>
              {overBalance && (
                <span className="text-[9px] font-bold uppercase tracking-wider text-rose-300">⚠ Over balance</span>
              )}
            </div>
            <div className="relative">
              <input
                type="number"
                value={betAmount}
                onChange={(e) => setBetAmount?.(e.target.value)}
                className={`w-full px-3 py-3 rounded-lg bg-void border text-foreground font-mono text-base focus:outline-none transition-colors ${overBalance ? 'border-rose-500/60' : 'border-border focus:border-primary'}`}
                min={0.01}
                step="0.01"
                disabled={playing}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-md bg-elevated text-[10px] text-muted-foreground font-mono font-bold border border-border">
                {selectedCurrency}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {quickAmounts.map((amt) => (
                <button
                  key={amt}
                  onClick={() => { setBetAmount?.(String(amt)); playSound('click'); }}
                  disabled={playing}
                  className="py-1.5 rounded-lg text-xs font-mono font-bold bg-void border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors disabled:opacity-50"
                >
                  ${amt}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setBetAmount?.(String(Math.max(0.01, parseFloat(betAmount || '0') / 2).toFixed(2))); playSound('click'); }}
                disabled={playing}
                className="flex-1 py-1.5 rounded-lg text-xs font-bold bg-void border border-border text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              >½</button>
              <button
                onClick={() => { setBetAmount?.(String((parseFloat(betAmount || '0') * 2).toFixed(2))); playSound('click'); }}
                disabled={playing}
                className="flex-1 py-1.5 rounded-lg text-xs font-bold bg-void border border-border text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              >2×</button>
              <button
                onClick={() => { if (balance) setBetAmount?.(String(balance.balance.toFixed(2))); playSound('click'); }}
                disabled={playing}
                className="flex-1 py-1.5 rounded-lg text-xs font-bold bg-void border border-border text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              >Max</button>
            </div>
          </div>

          {extraControls}

          {/* PLAY — premium gradient with sheen sweep */}
          <button
            onClick={handlePlay}
            disabled={playing || disabled}
            className="group relative w-full py-4 rounded-xl font-display font-extrabold text-base text-foreground gradient-primary neon-glow-blue active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110 overflow-hidden"
          >
            {/* sheen */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{ background: 'linear-gradient(115deg, transparent 35%, hsl(0 0% 100% / 0.18) 50%, transparent 65%)' }}
            />
            <span className="relative inline-flex items-center justify-center gap-2">
              {!isAuthenticated ? 'Sign in to Play'
                : playing ? <>⏳ Processing…</>
                : (balance && balance.balance <= 0) ? '💰 Deposit to Play'
                : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    {playLabel ?? 'Place Bet'}
                  </>
                )}
            </span>
          </button>

          {!isAuthenticated && (
            <Link to="/auth" className="block text-center text-xs text-primary hover:underline">Create free account →</Link>
          )}

          <TestCreditButton amount={1000} />

          {history}
          {stats}
        </div>
      </div>
    </div>
  );
}
