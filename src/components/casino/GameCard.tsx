import { Link } from 'react-router-dom';
import { Play, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { getGameThumbnail } from '@/lib/game-thumbnails';

interface GameCardProps {
  id: string;
  name: string;
  provider?: string;
  image?: string;
  rtp?: string;
  category?: string;
  color?: string;
  isHot?: boolean;
  isNew?: boolean;
  isLive?: boolean;
  players?: number;
}

/**
 * Premium casino tile — official-grade polish:
 * - object-contain so baked-in slot brand text is never cropped
 * - dual-layer frame (outer ring + inner glow) for a real lobby feel
 * - hover sheen, lift, and "Play" CTA
 * - badges sit on translucent chips so artwork stays readable
 * - title is two-line clamped; provider + RTP fit on one row
 */
export default function GameCard({
  id, name, provider, image, rtp, category, color,
  isHot, isNew, isLive, players,
}: GameCardProps) {
  const gameLink = `/game/${id}`;
  const thumb = image ?? getGameThumbnail(id, category);
  const [loaded, setLoaded] = useState(false);

  return (
    <Link
      to={gameLink}
      aria-label={`Play ${name}`}
      className="group relative rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        boxShadow: '0 1px 0 hsl(0 0% 100% / 0.04) inset, 0 8px 20px -14px hsl(0 0% 0% / 0.6)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-accent)';
        e.currentTarget.style.boxShadow =
          '0 1px 0 hsl(0 0% 100% / 0.08) inset, 0 14px 36px -12px color-mix(in oklab, var(--neon-blue-hex) 55%, transparent)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-subtle)';
        e.currentTarget.style.boxShadow =
          '0 1px 0 hsl(0 0% 100% / 0.04) inset, 0 8px 20px -14px hsl(0 0% 0% / 0.6)';
      }}
    >
      {/* ── Artwork frame ─────────────────────────────────── */}
      <div
        className="aspect-[4/3] relative overflow-hidden"
        style={{
          background: color
            ? `radial-gradient(ellipse at 50% 30%, ${color}30 0%, ${color}05 55%, hsl(0 0% 0% / 0.4) 100%)`
            : 'radial-gradient(ellipse at 50% 30%, color-mix(in oklab, var(--neon-blue-hex) 14%, transparent) 0%, transparent 65%), hsl(var(--background))',
        }}
      >
        {thumb ? (
          <img
            src={thumb}
            alt={name}
            className={`absolute inset-0 w-full h-full object-contain transition-all duration-500 group-hover:scale-[1.05] ${loaded ? 'opacity-100' : 'opacity-0'}`}
            loading="lazy"
            decoding="async"
            // @ts-expect-error fetchpriority is a valid HTML attribute
            fetchpriority="low"
            width={512}
            height={384}
            onLoad={() => setLoaded(true)}
            onError={() => setLoaded(true)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className="text-5xl font-display font-extrabold drop-shadow-[0_4px_18px_rgba(0,0,0,0.6)]"
              style={{ color: color ?? 'hsl(var(--primary))' }}
            >
              {name.charAt(0)}
            </span>
          </div>
        )}

        {/* Top sheen — adds glossy "official" feel */}
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-1/3 pointer-events-none opacity-70"
          style={{ background: 'linear-gradient(180deg, hsl(0 0% 100% / 0.07), transparent)' }}
        />

        {/* Hover sheen sweep */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{
            background:
              'linear-gradient(115deg, transparent 35%, hsl(0 0% 100% / 0.10) 50%, transparent 65%)',
          }}
        />

        {/* Badges */}
        <div className="absolute top-2 left-2 flex gap-1 z-10">
          {isHot && (
            <span
              className="px-1.5 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wider text-white backdrop-blur-md"
              style={{
                background: 'color-mix(in oklab, var(--neon-red-hex) 80%, transparent)',
                boxShadow: '0 0 12px color-mix(in oklab, var(--neon-red-hex) 60%, transparent)',
              }}
            >
              🔥 HOT
            </span>
          )}
          {isNew && (
            <span
              className="px-1.5 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wider text-black backdrop-blur-md"
              style={{
                background: 'color-mix(in oklab, var(--neon-blue-hex) 90%, transparent)',
                boxShadow: '0 0 12px color-mix(in oklab, var(--neon-blue-hex) 55%, transparent)',
              }}
            >
              NEW
            </span>
          )}
          {isLive && (
            <span
              className="px-1.5 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wider text-black animate-pulse-neon backdrop-blur-md"
              style={{ background: 'color-mix(in oklab, var(--neon-green-hex) 90%, transparent)' }}
            >
              ● LIVE
            </span>
          )}
        </div>

        {players !== undefined && (
          <div className="absolute top-2 right-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-mono font-bold bg-black/55 text-white backdrop-blur-md z-10 border border-white/10">
            <TrendingUp className="w-2.5 h-2.5 text-emerald-300" />
            {players.toLocaleString()}
          </div>
        )}

        {/* Hover overlay with explicit Play CTA */}
        <div className="absolute inset-0 flex items-end justify-center pb-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-t from-black/70 via-black/20 to-transparent">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-display font-bold text-xs text-white shadow-lg gradient-primary">
            <Play className="w-3.5 h-3.5 fill-current" />
            Play Now
          </span>
        </div>
      </div>

      {/* ── Info bar ──────────────────────────────────────── */}
      <div className="px-2.5 py-2 border-t border-border/60 bg-gradient-to-b from-transparent to-black/20">
        <div
          className="font-display font-bold text-[13px] sm:text-sm text-foreground leading-tight min-h-[2.4em]"
          style={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            wordBreak: 'break-word',
          }}
          title={name}
        >
          {name}
        </div>
        <div className="flex items-center justify-between mt-1 gap-2">
          <span className="text-[10px] text-muted-foreground truncate" title={provider ?? category}>
            {provider ?? category}
          </span>
          {rtp && (
            <span className="text-[10px] font-mono font-bold text-emerald-400/90 shrink-0 tracking-tight">
              RTP {rtp}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
