import { Gamepad2, Search, SlidersHorizontal, X } from 'lucide-react';
import GameCard from '@/components/casino/GameCard';
import { useMemo, useState } from 'react';
import { useGames } from '@/hooks/use-game-data';

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'original', label: 'Originals' },
  { id: 'slot', label: 'Slots' },
  { id: 'live', label: 'Live' },
  { id: 'table', label: 'Table' },
] as const;

const SORT_OPTIONS = [
  { id: 'featured', label: 'Featured' },
  { id: 'name', label: 'A → Z' },
  { id: 'rtp', label: 'Highest RTP' },
  { id: 'new', label: 'Newest' },
] as const;

type SortKey = (typeof SORT_OPTIONS)[number]['id'];
type CategoryKey = (typeof CATEGORIES)[number]['id'];

function GameSkeleton() {
  return (
    <div className="rounded-xl bg-surface border border-border overflow-hidden">
      <div className="shimmer aspect-[4/3]" />
      <div className="p-2.5 space-y-1">
        <div className="shimmer h-4 w-3/4 rounded" />
        <div className="shimmer h-3 w-1/2 rounded" />
      </div>
    </div>
  );
}

export default function CasinoPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<CategoryKey>('all');
  const [sort, setSort] = useState<SortKey>('featured');
  const [hotOnly, setHotOnly] = useState(false);

  const { data: games, isLoading } = useGames();

  const filtered = useMemo(() => {
    let list = games ?? [];
    if (category !== 'all') list = list.filter((g) => g.category === category);
    if (hotOnly) list = list.filter((g) => g.is_hot);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (g) => g.name.toLowerCase().includes(q) || (g.provider ?? '').toLowerCase().includes(q),
      );
    }
    const sorted = [...list];
    if (sort === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === 'rtp') sorted.sort((a, b) => Number(b.rtp ?? 0) - Number(a.rtp ?? 0));
    else if (sort === 'new')
      sorted.sort(
        (a, b) =>
          new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime(),
      );
    else
      sorted.sort(
        (a, b) =>
          Number(b.is_featured ?? 0) - Number(a.is_featured ?? 0) ||
          (a.sort_order ?? 0) - (b.sort_order ?? 0),
      );
    return sorted;
  }, [games, category, search, sort, hotOnly]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Gamepad2 className="w-6 h-6 text-primary" />
          <h1 className="font-display font-extrabold text-2xl text-foreground">Casino</h1>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-elevated text-muted-foreground">
            {filtered.length} games
          </span>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search games or providers…"
            className="w-full pl-9 pr-9 py-2 rounded-lg bg-surface border border-border text-foreground text-sm focus:border-neon-blue focus:outline-none"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1.5 flex-wrap">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                category === c.id
                  ? 'gradient-primary text-foreground'
                  : 'bg-surface border border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {c.label}
            </button>
          ))}
          <button
            onClick={() => setHotOnly((v) => !v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              hotOnly
                ? 'bg-neon-red/20 text-glow-red border border-neon-red/40'
                : 'bg-surface border border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            🔥 Hot
          </button>
        </div>

        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="px-3 py-1.5 rounded-lg bg-surface border border-border text-foreground text-xs font-bold focus:border-neon-blue focus:outline-none"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <GameSkeleton key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 rounded-2xl bg-surface border border-border text-center">
          <Search className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <div className="font-display font-bold text-foreground">No games match your filters</div>
          <div className="text-sm text-muted-foreground mt-1">Try clearing the search or category.</div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {filtered.map((g) => (
            <GameCard
              key={g.id}
              id={g.slug}
              name={g.name}
              provider={g.provider ?? undefined}
              rtp={`${g.rtp}%`}
              category={g.category}
              isHot={g.is_hot ?? false}
              isNew={g.is_new ?? false}
            />
          ))}
        </div>
      )}
    </div>
  );
}
