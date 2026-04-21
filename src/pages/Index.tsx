import { Link } from 'react-router-dom';
import GameCard from '@/components/casino/GameCard';
import JackpotTicker from '@/components/casino/JackpotTicker';
import { useAppStore } from '@/stores/app-store';
import { useGames, usePlatformStats } from '@/hooks/use-game-data';
import { Trophy, Flame, Star, TrendingUp, Gift, Zap, Users, ChevronRight } from 'lucide-react';

function Section({ title, icon: Icon, badge, link, children }: { title: string; icon: React.ElementType; badge?: string; link: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-primary" />
          <h2 className="font-display font-extrabold text-lg text-foreground">{title}</h2>
          {badge && <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-primary/10 text-primary">{badge}</span>}
        </div>
        <Link to={link} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors">View All <ChevronRight className="w-4 h-4" /></Link>
      </div>
      {children}
    </section>
  );
}

function StatSkeleton() {
  return <div className="p-4 rounded-xl bg-surface border border-border"><div className="shimmer h-5 w-5 rounded mb-2" /><div className="shimmer h-6 w-20 rounded mb-1" /><div className="shimmer h-3 w-16 rounded" /></div>;
}

function GameSkeleton() {
  return <div className="rounded-xl bg-surface border border-border overflow-hidden"><div className="shimmer aspect-[4/3]" /><div className="p-2.5 space-y-1"><div className="shimmer h-4 w-3/4 rounded" /><div className="shimmer h-3 w-1/2 rounded" /></div></div>;
}

export default function HomePage() {
  const { isAuthenticated } = useAppStore();
  const { data: stats, isLoading: statsLoading } = usePlatformStats();
  const { data: originals, isLoading: originalsLoading } = useGames('original');
  const { data: slots, isLoading: slotsLoading } = useGames('slot');
  const { data: liveGames, isLoading: liveLoading } = useGames('live');

  const statItems = [
    { icon: TrendingUp, label: 'Total Jackpot', value: stats ? `$${(stats.total_jackpot ?? 0).toLocaleString()}` : '$0', color: 'var(--neon-gold-hex)' },
    { icon: Users, label: 'Online Now', value: stats ? (stats.online_now ?? 0).toLocaleString() : '0', color: 'var(--neon-green-hex)' },
    { icon: Flame, label: 'Bets Today', value: stats ? `$${(stats.total_bets_today ?? 0).toLocaleString()}` : '$0', color: 'var(--neon-red-hex)' },
    { icon: Gift, label: 'Won Today', value: stats ? `$${(stats.total_won_today ?? 0).toLocaleString()}` : '$0', color: 'var(--neon-blue-hex)' },
  ];

  return (
    <div className="space-y-8">
      {/* Hero Banner — GODMODE */}
      <div
        className="relative rounded-2xl overflow-hidden p-6 lg:p-10 panel-dots"
        style={{
          background:
            'radial-gradient(ellipse 60% 80% at 20% 0%, color-mix(in oklab, var(--neon-blue-hex) 18%, transparent), transparent 70%), radial-gradient(ellipse 50% 70% at 100% 100%, color-mix(in oklab, var(--neon-purple-hex) 14%, transparent), transparent 70%), var(--bg-surface)',
          border: '1px solid var(--border-default)',
        }}
      >
        <div className="relative z-10 max-w-xl">
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold mb-4 uppercase tracking-wider"
            style={{
              background: 'color-mix(in oklab, var(--neon-gold-hex) 12%, transparent)',
              border: '1px solid color-mix(in oklab, var(--neon-gold-hex) 40%, transparent)',
              color: 'var(--neon-gold-hex)',
            }}
          >
            <Star className="w-3 h-3" /> Welcome Bonus
          </div>
          <h1 className="font-display font-extrabold leading-[1.05]" style={{ color: 'var(--text-primary)' }}>
            Provably Fair <span className="text-rainbow">Casino</span> Experience
          </h1>
          <p className="mt-3 text-sm lg:text-base max-w-md" style={{ color: 'var(--text-secondary)' }}>
            Every game outcome is verifiable. Instant crypto deposits, server-verified bets, and the best odds.
          </p>
          <div className="flex gap-3 mt-6 flex-wrap">
            {isAuthenticated ? (
              <Link
                to="/casino"
                className="px-6 py-3 rounded-xl font-display font-extrabold text-sm text-black neon-button active:scale-95 transition-transform"
                style={{
                  background: 'linear-gradient(135deg, var(--neon-blue-hex), var(--neon-green-hex))',
                  boxShadow: '0 0 24px color-mix(in oklab, var(--neon-blue-hex) 40%, transparent)',
                }}
              >
                Play Now
              </Link>
            ) : (
              <Link
                to="/auth"
                className="px-6 py-3 rounded-xl font-display font-extrabold text-sm text-black neon-button active:scale-95 transition-transform"
                style={{
                  background: 'linear-gradient(135deg, var(--neon-blue-hex), var(--neon-green-hex))',
                  boxShadow: '0 0 24px color-mix(in oklab, var(--neon-blue-hex) 40%, transparent)',
                }}
              >
                Get Started
              </Link>
            )}
            <Link
              to="/promotions"
              className="px-6 py-3 rounded-xl font-display font-extrabold text-sm neon-button"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)',
              }}
            >
              View Promos
            </Link>
          </div>
        </div>
        <div className="absolute -right-10 -top-10 w-60 h-60 rounded-full blur-3xl pointer-events-none" style={{ background: 'color-mix(in oklab, var(--neon-blue-hex) 14%, transparent)' }} />
        <div className="absolute -right-5 -bottom-10 w-40 h-40 rounded-full blur-3xl pointer-events-none" style={{ background: 'color-mix(in oklab, var(--neon-green-hex) 12%, transparent)' }} />
      </div>

      {/* Progressive Jackpot Network */}
      <JackpotTicker />

      {/* Stats */}
      {/* Stats — GODMODE neon */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statsLoading
          ? Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)
          : statItems.map((s) => (
            <div
              key={s.label}
              className="p-4 rounded-xl panel-dots"
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <s.icon className="w-5 h-5 mb-2 neon-text" style={{ color: s.color }} />
              <div className="font-extrabold text-lg neon-text" data-numeric style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>{s.label}</div>
            </div>
          ))}
      </div>

      {/* Originals */}
      <Section title="NexBet Originals" icon={Zap} badge="Provably Fair" link="/originals">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {originalsLoading
            ? Array.from({ length: 8 }).map((_, i) => <GameSkeleton key={i} />)
            : (originals ?? []).map((g) => (
              <GameCard key={g.id} id={g.slug} name={g.name} provider={g.provider ?? undefined} rtp={`${g.rtp}%`} category={g.category} isHot={g.is_hot ?? false} isNew={g.is_new ?? false} />
            ))}
        </div>
      </Section>

      {/* Slots */}
      <Section title="Popular Slots" icon={Flame} badge={`${(slots ?? []).length}+ Games`} link="/slots">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {slotsLoading
            ? Array.from({ length: 12 }).map((_, i) => <GameSkeleton key={i} />)
            : (slots ?? []).slice(0, 12).map((g) => (
              <GameCard key={g.id} id={g.slug} name={g.name} provider={g.provider ?? undefined} rtp={`${g.rtp}%`} isHot={g.is_hot ?? false} isNew={g.is_new ?? false} />
            ))}
        </div>
      </Section>

      {/* Live Casino */}
      <Section title="Live Casino" icon={Trophy} badge="Real Dealers" link="/live">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {liveLoading
            ? Array.from({ length: 4 }).map((_, i) => <GameSkeleton key={i} />)
            : (liveGames ?? []).map((t) => (
              <GameCard key={t.id} id={t.slug} name={t.name} provider={t.provider ?? undefined} rtp={`${t.rtp}%`} isLive={true} />
            ))}
        </div>
      </Section>
    </div>
  );
}
