import { Grid3X3, Sparkles } from 'lucide-react';
import GameCard from '@/components/casino/GameCard';
import { useGames } from '@/hooks/use-game-data';

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

export default function SlotsPage() {
  const { data: games, isLoading } = useGames('slot');

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-2">
        <Grid3X3 className="w-6 h-6 text-primary" />
        <h1 className="font-display font-extrabold text-2xl text-foreground">Slots</h1>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-elevated text-muted-foreground">
          {games?.length ?? 0} games
        </span>
      </div>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-neon-gold" />
          <h2 className="font-display font-bold text-lg text-foreground">In-House Originals</h2>
          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-neon-green/10 text-glow-green animate-pulse-neon">● LIVE</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {isLoading
            ? Array.from({ length: 12 }).map((_, i) => <GameSkeleton key={i} />)
            : (games ?? []).map((g) => (
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
      </section>
    </div>
  );
}
