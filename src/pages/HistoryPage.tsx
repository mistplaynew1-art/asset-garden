/**
 * Unified game history — last 50 rounds across every game.
 *
 * Each row shows bet, payout, multiplier, server seed hash + nonce, and a
 * Verify button that opens the global ProvablyFairModal pre-filled.
 */
import { useEffect, useMemo, useState } from 'react';
import { History, Filter, Lock, Trophy, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAppStore } from '@/stores/app-store';
import ProvablyFairModal from '@/components/provably-fair/ProvablyFairModal';
import { Link } from 'react-router-dom';

interface Round {
  id: string;
  game_type: string;
  bet_amount: number;
  payout: number | null;
  multiplier: number | null;
  won: boolean | null;
  result: unknown;
  server_seed: string | null;
  server_seed_hash: string | null;
  client_seed: string | null;
  nonce: number | null;
  created_at: string | null;
}

const GAME_LABEL: Record<string, string> = {
  dice: 'Dice', limbo: 'Limbo', coinflip: 'Coinflip', hilo: 'Hi-Lo',
  crash: 'Crash', jetpack: 'Jetpack',
  mines: 'Mines', plinko: 'Plinko', tower: 'Tower',
  roulette: 'Roulette', wheel: 'Wheel', keno: 'Keno',
  blackjack: 'Blackjack', 'dragon-tiger': 'Dragon Tiger',
  slots: 'Slots', 'gates-olympus': 'Gates of Olympus',
  'sweet-bonanza': 'Sweet Bonanza', 'big-bass': 'Big Bass Bonanza',
};

export default function HistoryPage() {
  const { user, isAuthenticated, selectedCurrency } = useAppStore();
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifyGameId, setVerifyGameId] = useState<string | undefined>();

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    let active = true;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('game_rounds')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (active) {
        setRounds((data ?? []) as Round[]);
        setLoading(false);
      }
    })();

    const channel = supabase
      .channel('history-rounds')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'game_rounds', filter: `user_id=eq.${user.id}` },
        (payload) => setRounds((prev) => [payload.new as Round, ...prev].slice(0, 50)))
      .subscribe();
    return () => { active = false; supabase.removeChannel(channel); };
  }, [user]);

  const games = useMemo(() => Array.from(new Set(rounds.map(r => r.game_type))).sort(), [rounds]);
  const filtered = useMemo(() => filter === 'all' ? rounds : rounds.filter(r => r.game_type === filter), [rounds, filter]);

  const stats = useMemo(() => {
    const totalBet = filtered.reduce((s, r) => s + Number(r.bet_amount), 0);
    const totalPayout = filtered.reduce((s, r) => s + Number(r.payout ?? 0), 0);
    const wins = filtered.filter(r => r.won).length;
    const biggestWin = filtered.reduce((max, r) => Math.max(max, Number(r.payout ?? 0)), 0);
    const biggestMult = filtered.reduce((max, r) => Math.max(max, Number(r.multiplier ?? 0)), 0);
    return { totalBet, totalPayout, profit: totalPayout - totalBet, wins, biggestWin, biggestMult };
  }, [filtered]);

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto mt-20 p-8 rounded-2xl bg-surface border border-border text-center space-y-4">
        <Lock className="w-10 h-10 mx-auto text-primary" />
        <h1 className="font-display font-extrabold text-xl text-foreground">Sign in to view history</h1>
        <p className="text-sm text-muted-foreground">Your game history is tied to your account.</p>
        <Link to="/auth" className="inline-block px-4 py-2 rounded-lg gradient-primary text-foreground font-bold text-sm">Sign in</Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in pb-8">
      <div className="flex items-center gap-2">
        <History className="w-5 h-5 text-primary" />
        <h1 className="font-display font-extrabold text-xl text-foreground">Game History</h1>
        <span className="ml-auto text-xs text-muted-foreground">Last {filtered.length} rounds</span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <StatCard label="Total Wagered" value={`${stats.totalBet.toFixed(2)} ${selectedCurrency}`} />
        <StatCard label="Total Returned" value={`${stats.totalPayout.toFixed(2)} ${selectedCurrency}`} />
        <StatCard
          label="Net Profit"
          value={`${stats.profit >= 0 ? '+' : ''}${stats.profit.toFixed(2)}`}
          tone={stats.profit > 0 ? 'win' : stats.profit < 0 ? 'lose' : 'neutral'}
        />
        <StatCard label="Wins" value={`${stats.wins} / ${filtered.length}`} />
        <StatCard label="Biggest Multi" value={`${stats.biggestMult.toFixed(2)}×`} tone="win" icon={<Trophy className="w-3 h-3" />} />
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
        <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
        <FilterPill active={filter === 'all'} onClick={() => setFilter('all')}>All</FilterPill>
        {games.map(g => (
          <FilterPill key={g} active={filter === g} onClick={() => setFilter(g)}>
            {GAME_LABEL[g] ?? g}
          </FilterPill>
        ))}
      </div>

      {/* Rounds table */}
      <div className="rounded-xl bg-surface border border-border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            No rounds yet — go play a game!
          </div>
        ) : (
          <div className="divide-y divide-border">
            {/* Desktop header */}
            <div className="hidden md:grid grid-cols-[1.4fr_0.8fr_0.8fr_0.7fr_1fr_auto] gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-elevated/50">
              <span>Game</span><span>Bet</span><span>Payout</span><span>Multiplier</span><span>Time</span><span></span>
            </div>
            {filtered.map((r) => {
              const mult = Number(r.multiplier ?? 0);
              const profit = Number(r.payout ?? 0) - Number(r.bet_amount);
              return (
                <div key={r.id} className="grid grid-cols-2 md:grid-cols-[1.4fr_0.8fr_0.8fr_0.7fr_1fr_auto] gap-2 px-3 py-2.5 text-xs items-center hover:bg-elevated/40 transition-colors">
                  <div className="col-span-2 md:col-span-1">
                    <div className="font-display font-bold text-foreground capitalize">{GAME_LABEL[r.game_type] ?? r.game_type}</div>
                    <div className="md:hidden text-[10px] text-muted-foreground font-mono">{r.created_at ? new Date(r.created_at).toLocaleString() : ''}</div>
                  </div>
                  <div className="font-mono text-foreground">{Number(r.bet_amount).toFixed(2)}</div>
                  <div className={`font-mono font-bold ${profit > 0 ? 'text-glow-green' : profit < 0 ? 'text-glow-red' : 'text-foreground'}`}>
                    {profit >= 0 ? '+' : ''}{profit.toFixed(2)}
                  </div>
                  <div className={`font-mono ${mult > 1 ? 'text-glow-green' : 'text-muted-foreground'}`}>{mult.toFixed(2)}×</div>
                  <div className="hidden md:block text-[10px] text-muted-foreground font-mono">
                    {r.created_at ? new Date(r.created_at).toLocaleString() : ''}
                  </div>
                  <button
                    onClick={() => { setVerifyGameId(r.game_type); setVerifyOpen(true); }}
                    className="col-span-2 md:col-span-1 inline-flex items-center justify-center gap-1 px-2 py-1 rounded-md bg-elevated border border-border text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
                    title={r.server_seed_hash ?? ''}
                  >
                    <Lock className="w-3 h-3" /> Verify
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ProvablyFairModal open={verifyOpen} onClose={() => setVerifyOpen(false)} gameId={verifyGameId} />
    </div>
  );
}

function StatCard({ label, value, tone = 'neutral', icon }: { label: string; value: string; tone?: 'win' | 'lose' | 'neutral'; icon?: React.ReactNode }) {
  const toneClass = tone === 'win' ? 'text-glow-green' : tone === 'lose' ? 'text-glow-red' : 'text-foreground';
  return (
    <div className="p-3 rounded-xl bg-surface border border-border">
      <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">{icon}{label}</div>
      <div className={`mt-1 font-mono font-bold text-sm ${toneClass}`}>{value}</div>
    </div>
  );
}

function FilterPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider transition-colors shrink-0 border ${
        active ? 'bg-primary/15 border-primary/40 text-primary' : 'bg-elevated border-border text-muted-foreground hover:text-foreground'
      }`}
    >
      {children}
    </button>
  );
}
