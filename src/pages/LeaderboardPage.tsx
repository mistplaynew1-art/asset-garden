import { BarChart3 } from 'lucide-react';
import { useState } from 'react';
import { useLeaderboard } from '@/hooks/use-game-data';

export default function LeaderboardPage() {
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'all'>('weekly');
  const { data: leaders, isLoading } = useLeaderboard(period);

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-primary" />
          <h1 className="font-display font-extrabold text-2xl text-foreground">Leaderboard</h1>
        </div>
        <div className="flex gap-1">
          {(['daily', 'weekly', 'monthly', 'all'] as const).map((p) => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${period === p ? 'gradient-primary text-foreground' : 'bg-surface border border-border text-muted-foreground'}`}>
              {p === 'all' ? 'All Time' : p}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="shimmer h-64 rounded-2xl" />
      ) : !leaders?.length ? (
        <div className="p-12 rounded-2xl bg-surface border border-border text-center">
          <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <div className="font-display font-bold text-foreground">No bets in this period yet</div>
          <div className="text-sm text-muted-foreground mt-1">The leaderboard fills in as players wager. Place a bet to be the first.</div>
        </div>
      ) : (
        <>
          {leaders.length >= 3 && (
            <div className="grid grid-cols-3 gap-3">
              {[1, 0, 2].map((idx) => {
                const l = leaders[idx];
                const colors = ['#FFD700', '#C0C0C0', '#CD7F32'];
                const icons = ['🥇', '🥈', '🥉'];
                return (
                  <div key={l.user_id} className={`p-4 rounded-2xl bg-surface border border-border text-center ${idx === 0 ? 'ring-2 ring-glow-gold/30' : ''}`}>
                    <div className="text-3xl mb-1">{icons[idx]}</div>
                    <div className="font-display font-bold text-sm text-foreground truncate">{l.name}</div>
                    <div className="font-mono font-bold text-lg" style={{ color: colors[idx] }}>${l.wagered.toFixed(2)}</div>
                    <div className="text-[10px] text-muted-foreground">wagered</div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="p-4 rounded-2xl bg-surface border border-border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground text-xs border-b border-border">
                  <th className="pb-2 w-12">#</th><th className="pb-2">Player</th><th className="pb-2 text-right">Wagered</th><th className="pb-2 text-right">Profit</th><th className="pb-2 text-right">Games</th>
                </tr>
              </thead>
              <tbody>
                {leaders.map((l, i) => (
                  <tr key={l.user_id} className="border-b border-border/30 hover:bg-elevated/50 transition-colors">
                    <td className="py-2.5 font-mono font-bold text-muted-foreground">{i + 1}</td>
                    <td className="py-2.5 font-bold text-foreground">{l.name}</td>
                    <td className="py-2.5 font-mono text-right text-foreground">${l.wagered.toFixed(2)}</td>
                    <td className={`py-2.5 font-mono text-right ${l.profit >= 0 ? 'text-glow-green' : 'text-glow-red'}`}>
                      {l.profit >= 0 ? '+' : ''}${l.profit.toFixed(2)}
                    </td>
                    <td className="py-2.5 font-mono text-right text-muted-foreground">{l.games}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
