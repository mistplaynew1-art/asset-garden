import { useMemo, useState } from 'react';
import { Trophy, Clock, TrendingUp, X, Plus, Minus, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAppStore } from '@/stores/app-store';
import { playSound } from '@/lib/sounds';

type Outcome = '1' | 'X' | '2';
interface Match {
  id: string;
  league: string;
  home: string;
  away: string;
  startsIn: string; // "Live · 67'", "18:30", "Tomorrow"
  isLive: boolean;
  scoreHome?: number;
  scoreAway?: number;
  odds: { '1': number; X: number; '2': number };
}

const SPORTS = [
  { key: 'soccer', label: '⚽ Football', count: 142 },
  { key: 'basketball', label: '🏀 Basketball', count: 38 },
  { key: 'tennis', label: '🎾 Tennis', count: 24 },
  { key: 'mma', label: '🥊 MMA', count: 12 },
  { key: 'esports', label: '🎮 eSports', count: 56 },
  { key: 'baseball', label: '⚾ Baseball', count: 18 },
];

const FIXTURES: Record<string, Match[]> = {
  soccer: [
    { id: 's1', league: 'Premier League', home: 'Arsenal', away: 'Chelsea', startsIn: "Live · 67'", isLive: true, scoreHome: 2, scoreAway: 1, odds: { '1': 1.42, X: 4.20, '2': 7.50 } },
    { id: 's2', league: 'La Liga', home: 'Real Madrid', away: 'Barcelona', startsIn: 'Today 21:00', isLive: false, odds: { '1': 2.15, X: 3.40, '2': 3.10 } },
    { id: 's3', league: 'Serie A', home: 'Juventus', away: 'Inter Milan', startsIn: 'Today 19:45', isLive: false, odds: { '1': 2.80, X: 3.10, '2': 2.55 } },
    { id: 's4', league: 'Bundesliga', home: 'Bayern Munich', away: 'Dortmund', startsIn: "Live · 23'", isLive: true, scoreHome: 1, scoreAway: 0, odds: { '1': 1.65, X: 4.00, '2': 4.80 } },
    { id: 's5', league: 'UCL', home: 'Man City', away: 'PSG', startsIn: 'Tomorrow 22:00', isLive: false, odds: { '1': 1.95, X: 3.60, '2': 3.80 } },
    { id: 's6', league: 'Premier League', home: 'Liverpool', away: 'Tottenham', startsIn: 'Tomorrow 17:30', isLive: false, odds: { '1': 1.72, X: 3.80, '2': 4.50 } },
  ],
  basketball: [
    { id: 'b1', league: 'NBA', home: 'Lakers', away: 'Celtics', startsIn: "Live · Q3 4:12", isLive: true, scoreHome: 78, scoreAway: 81, odds: { '1': 2.10, X: 12.0, '2': 1.75 } },
    { id: 'b2', league: 'NBA', home: 'Warriors', away: 'Heat', startsIn: 'Today 03:30', isLive: false, odds: { '1': 1.65, X: 15.0, '2': 2.30 } },
    { id: 'b3', league: 'EuroLeague', home: 'Real Madrid', away: 'Olympiacos', startsIn: 'Today 20:00', isLive: false, odds: { '1': 1.82, X: 14.0, '2': 2.05 } },
  ],
  tennis: [
    { id: 't1', league: 'ATP Madrid', home: 'Alcaraz', away: 'Sinner', startsIn: 'Today 16:00', isLive: false, odds: { '1': 1.95, X: 0, '2': 1.85 } },
    { id: 't2', league: 'WTA Rome', home: 'Swiatek', away: 'Sabalenka', startsIn: "Live · Set 2", isLive: true, scoreHome: 1, scoreAway: 1, odds: { '1': 1.55, X: 0, '2': 2.45 } },
  ],
  mma: [
    { id: 'm1', league: 'UFC 304', home: 'Edwards', away: 'Muhammad', startsIn: 'Sat 23:00', isLive: false, odds: { '1': 1.75, X: 0, '2': 2.10 } },
  ],
  esports: [
    { id: 'e1', league: 'CS2 Major', home: 'NAVI', away: 'FaZe', startsIn: "Live · Map 2", isLive: true, scoreHome: 1, scoreAway: 0, odds: { '1': 1.65, X: 0, '2': 2.25 } },
    { id: 'e2', league: 'LoL Worlds', home: 'T1', away: 'Gen.G', startsIn: 'Today 12:00', isLive: false, odds: { '1': 1.85, X: 0, '2': 1.95 } },
  ],
  baseball: [
    { id: 'ba1', league: 'MLB', home: 'Yankees', away: 'Dodgers', startsIn: 'Tomorrow 02:00', isLive: false, odds: { '1': 2.00, X: 0, '2': 1.80 } },
  ],
};

interface BetSlipItem { matchId: string; label: string; outcome: Outcome; odds: number; }

export default function SportsPage() {
  const { isAuthenticated, balances, user, setBalances } = useAppStore();
  const { toast } = useToast();
  const [sport, setSport] = useState('soccer');
  const [slip, setSlip] = useState<BetSlipItem[]>([]);
  const [stake, setStake] = useState('10');
  const [submitting, setSubmitting] = useState(false);

  const matches = FIXTURES[sport] ?? [];
  const totalOdds = useMemo(() => slip.reduce((acc, s) => acc * s.odds, 1), [slip]);
  const stakeNum = parseFloat(stake) || 0;
  const potential = stakeNum * totalOdds;
  const usd = balances.find(b => b.currency === 'USD')?.balance ?? 0;

  const addPick = (m: Match, outcome: Outcome) => {
    const odds = m.odds[outcome];
    if (!odds) return;
    const label = outcome === '1' ? m.home : outcome === '2' ? m.away : 'Draw';
    setSlip(prev => {
      const filtered = prev.filter(p => p.matchId !== m.id);
      const exists = prev.find(p => p.matchId === m.id && p.outcome === outcome);
      if (exists) return filtered; // toggle off
      return [...filtered, { matchId: m.id, label: `${m.home} vs ${m.away} — ${label}`, outcome, odds }];
    });
    playSound('click');
  };

  const placeBet = async () => {
    if (!isAuthenticated) return toast({ title: 'Sign in to place bets', variant: 'destructive' });
    if (slip.length === 0) return toast({ title: 'Empty bet slip', variant: 'destructive' });
    if (stakeNum <= 0) return toast({ title: 'Invalid stake', variant: 'destructive' });
    if (stakeNum > usd) return toast({ title: 'Insufficient balance', variant: 'destructive' });

    setSubmitting(true);
    // Simulate outcome — 47% chance per leg (slight house edge)
    const allWon = slip.every(() => Math.random() < 0.47);
    const payout = allWon ? Math.floor(potential * 100) / 100 : 0;
    const { data, error } = await supabase.rpc('place_bet', {
      p_game_type: 'sports_' + sport,
      p_bet_amount: stakeNum,
      p_multiplier: allWon ? totalOdds : 0,
      p_payout: payout,
      p_result: { picks: slip, totalOdds, won: allWon } as never,
    });
    setSubmitting(false);
    const result = data as { error?: string; balance_after?: number } | null;
    if (error || result?.error) return toast({ title: 'Failed', description: result?.error ?? error?.message, variant: 'destructive' });
    if (typeof result?.balance_after === 'number') {
      setBalances(balances.map(b => b.currency === 'USD' ? { ...b, balance: result.balance_after!, usd: result.balance_after! } : b));
    }
    if (allWon) {
      playSound('win');
      toast({ title: `🎉 Won $${payout.toFixed(2)}!`, description: `${slip.length}-leg @ ${totalOdds.toFixed(2)}×` });
    } else {
      playSound('lose');
      toast({ title: 'Bet lost', description: 'Better luck next time!' });
    }
    setSlip([]);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Trophy className="w-6 h-6 text-primary" />
          <h1 className="font-display font-extrabold text-2xl text-foreground">Sportsbook</h1>
          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-neon-green/10 text-glow-green animate-pulse-neon">● LIVE</span>
        </div>
        <div className="text-xs text-muted-foreground">Pre-match · In-Play · Accumulators</div>
      </div>

      {/* Sport tabs */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {SPORTS.map(s => (
          <button key={s.key} onClick={() => setSport(s.key)}
            className={`shrink-0 px-3 py-2 rounded-xl text-xs font-bold transition-all ${sport === s.key ? 'gradient-primary text-foreground neon-glow-blue' : 'bg-surface border border-border text-muted-foreground hover:text-foreground'}`}>
            {s.label} <span className="ml-1 text-[9px] opacity-60">{s.count}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Matches list */}
        <div className="lg:col-span-2 space-y-2">
          {matches.map(m => {
            const live = m.isLive;
            return (
              <div key={m.id} className="rounded-2xl bg-surface border border-border p-4 hover:border-primary/30 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <span>{m.league}</span>
                    {live ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-neon-red/15 text-glow-red animate-pulse-neon">
                        <Zap className="w-2.5 h-2.5" /> {m.startsIn}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-elevated text-foreground/70">
                        <Clock className="w-2.5 h-2.5" /> {m.startsIn}
                      </span>
                    )}
                  </div>
                  {live && (
                    <div className="font-mono font-bold text-sm text-foreground">{m.scoreHome} : {m.scoreAway}</div>
                  )}
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-display font-bold text-sm text-foreground truncate">{m.home}</div>
                    <div className="font-display font-bold text-sm text-foreground truncate">{m.away}</div>
                  </div>
                  <div className="flex gap-1.5">
                    {(['1', 'X', '2'] as Outcome[]).map(o => {
                      const odds = m.odds[o];
                      if (!odds) return <div key={o} className="w-[58px]" />;
                      const picked = slip.some(p => p.matchId === m.id && p.outcome === o);
                      return (
                        <button key={o} onClick={() => addPick(m, o)}
                          className={`w-[58px] py-2 rounded-lg text-center transition-all ${picked ? 'gradient-primary text-foreground neon-glow-blue' : 'bg-elevated border border-border hover:border-primary/30'}`}>
                          <div className="text-[9px] font-bold uppercase opacity-70">{o === '1' ? '1' : o === '2' ? '2' : 'X'}</div>
                          <div className="font-mono font-bold text-sm">{odds.toFixed(2)}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
          {matches.length === 0 && <div className="text-center text-muted-foreground py-12">No matches available.</div>}
        </div>

        {/* Bet slip */}
        <div className="lg:sticky lg:top-4 self-start space-y-3">
          <div className="rounded-2xl bg-surface border border-border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <h3 className="font-display font-bold text-foreground">Bet Slip</h3>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-primary/15 text-primary">{slip.length}</span>
              </div>
              {slip.length > 0 && (
                <button onClick={() => setSlip([])} className="text-[10px] text-muted-foreground hover:text-foreground">Clear</button>
              )}
            </div>

            {slip.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted-foreground">Tap odds to add picks</div>
            ) : (
              <div className="space-y-2">
                {slip.map(s => (
                  <div key={s.matchId + s.outcome} className="p-2 rounded-lg bg-void border border-border flex items-center justify-between gap-2">
                    <div className="text-[11px] text-foreground truncate">{s.label}</div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono font-bold text-xs text-glow-gold">{s.odds.toFixed(2)}</span>
                      <button onClick={() => setSlip(prev => prev.filter(p => p !== s))} className="text-muted-foreground hover:text-glow-red"><X className="w-3 h-3" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Stake (USD)</label>
              <div className="flex gap-1 mt-1">
                <button onClick={() => setStake(String(Math.max(1, stakeNum - 5)))} className="px-2 rounded-lg bg-elevated border border-border text-foreground"><Minus className="w-3 h-3" /></button>
                <input type="number" value={stake} onChange={e => setStake(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg bg-void border border-border text-foreground font-mono text-sm focus:border-primary focus:outline-none" />
                <button onClick={() => setStake(String(stakeNum + 5))} className="px-2 rounded-lg bg-elevated border border-border text-foreground"><Plus className="w-3 h-3" /></button>
              </div>
              <div className="flex gap-1 mt-2">
                {[10, 25, 50, 100].map(v => (
                  <button key={v} onClick={() => setStake(String(v))} className="flex-1 py-1 rounded text-[10px] font-bold bg-void border border-border text-muted-foreground hover:text-foreground">${v}</button>
                ))}
              </div>
            </div>

            <div className="space-y-1 pt-2 border-t border-border">
              <div className="flex justify-between text-xs"><span className="text-muted-foreground">Total odds</span><span className="font-mono font-bold text-foreground">{totalOdds.toFixed(2)}×</span></div>
              <div className="flex justify-between text-xs"><span className="text-muted-foreground">Potential win</span><span className="font-mono font-bold text-glow-green">${potential.toFixed(2)}</span></div>
            </div>

            <button onClick={placeBet} disabled={submitting || slip.length === 0}
              className="w-full py-3 rounded-xl font-display font-bold text-sm gradient-primary text-foreground neon-glow-blue disabled:opacity-50">
              {submitting ? 'Placing…' : isAuthenticated ? `Place Bet · $${stakeNum.toFixed(2)}` : 'Sign in to bet'}
            </button>
          </div>

          <div className="rounded-2xl bg-surface border border-border p-3 text-[10px] text-muted-foreground">
            18+ · Bet responsibly · Odds are simulated for demo. Settled bets are recorded in your history and affect your wallet.
          </div>
        </div>
      </div>
    </div>
  );
}
