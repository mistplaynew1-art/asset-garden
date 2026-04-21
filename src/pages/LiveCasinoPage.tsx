import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Video, Users, Filter } from 'lucide-react';
import { useGames } from '@/hooks/use-game-data';

const FILTERS = [
  { key: 'all', label: 'All Tables' },
  { key: 'roulette', label: 'Roulette' },
  { key: 'blackjack', label: 'Blackjack' },
  { key: 'baccarat', label: 'Baccarat' },
  { key: 'gameshow', label: 'Game Shows' },
] as const;

function inferCategory(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('roulette')) return 'roulette';
  if (n.includes('blackjack')) return 'blackjack';
  if (n.includes('baccarat')) return 'baccarat';
  return 'gameshow';
}

export default function LiveCasinoPage() {
  const [filter, setFilter] = useState<typeof FILTERS[number]['key']>('all');
  const { data: games, isLoading } = useGames('live');

  const tables = useMemo(() => {
    const list = (games ?? []).map((g) => ({
      ...g,
      live_category: inferCategory(g.name),
      players: 200 + Math.floor(Math.random() * 5000),
    }));
    return filter === 'all' ? list : list.filter((t) => t.live_category === filter);
  }, [games, filter]);

  const totalPlayers = tables.reduce((s, t) => s + t.players, 0);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Video className="w-6 h-6 text-primary" />
          <h1 className="font-display font-extrabold text-2xl text-foreground">Live Casino</h1>
          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-neon-red/15 text-glow-red animate-pulse-neon">● LIVE</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Users className="w-3.5 h-3.5" />
          <span className="font-mono font-bold text-foreground">{totalPlayers.toLocaleString()}</span> players online
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
        <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filter === f.key
                ? 'gradient-primary text-foreground'
                : 'bg-surface border border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-[4/5] rounded-xl shimmer" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {tables.map((t) => (
            <Link
              key={t.id}
              to={`/game/${t.slug}`}
              className="group relative aspect-[4/5] rounded-xl overflow-hidden border border-border bg-surface hover:border-primary/40 transition-all hover:scale-[1.02]"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-neon-purple/20 to-neon-pink/20" />
              <div className="absolute inset-0 bg-gradient-to-t from-overlay via-overlay/30 to-transparent" />
              <div className="absolute top-2 left-2 flex gap-1">
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-neon-red/90 text-foreground animate-pulse-neon">● LIVE</span>
                {t.is_hot && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-neon-gold/90 text-overlay">🔥</span>}
                {t.is_new && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-neon-blue/90 text-foreground">NEW</span>}
              </div>
              <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-void/70 text-foreground backdrop-blur-sm">
                {t.players}
              </div>
              <div className="absolute inset-x-0 bottom-0 p-2.5 space-y-0.5">
                <div className="font-display font-bold text-sm text-foreground truncate">{t.name}</div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-foreground/60">{t.provider}</span>
                  <span className="font-mono text-foreground/70">${Number(t.min_bet ?? 0)}+</span>
                </div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-overlay/60">
                <span className="px-4 py-2 rounded-xl gradient-primary text-foreground font-display font-bold text-sm">Join Table</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
