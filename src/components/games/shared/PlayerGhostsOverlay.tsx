/**
 * PlayerGhostsOverlay — renders other players as floating ghost markers
 * over a crash/jetpack scene. Each marker shows a tiny icon + username (or
 * truncated id) and animates upward with the live multiplier. When a player
 * cashes out, their marker freezes at their cashout multiplier and turns
 * green; if the round crashes before they cash out, the marker turns red
 * and falls.
 *
 * The component is purely presentational — it consumes the `bets` array
 * from `useCrashRound` and the live `multiplier`. No DB schema changes
 * required (it uses the existing `crash_bets.user_id` and joins profiles
 * once for display names).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Plane, Rocket } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { CrashBet } from '@/hooks/use-crash-round';

interface Props {
  bets: CrashBet[];
  multiplier: number;
  status: 'waiting' | 'running' | 'crashed' | 'settled';
  variant: 'plane' | 'jetpack';
  /** Highest multiplier shown on the Y axis (used to scale ghost altitude). */
  yMax?: number;
  /** User id to exclude (the local player — already drawn by main scene). */
  excludeUserId?: string | null;
  className?: string;
}

interface NameMap { [userId: string]: string }

export default function PlayerGhostsOverlay({
  bets, multiplier, status, variant, yMax = 10, excludeUserId, className,
}: Props) {
  const [names, setNames] = useState<NameMap>({});
  const fetchedRef = useRef<Set<string>>(new Set());

  // Lazy-fetch usernames for new bettors only.
  useEffect(() => {
    const missing = bets
      .map((b) => b.user_id)
      .filter((id) => !fetchedRef.current.has(id));
    if (missing.length === 0) return;
    missing.forEach((id) => fetchedRef.current.add(id));
    supabase
      .from('profiles')
      .select('user_id, username, display_name')
      .in('user_id', missing)
      .then(({ data }) => {
        if (!data) return;
        setNames((prev) => {
          const next = { ...prev };
          for (const p of data as Array<{ user_id: string; username: string | null; display_name: string | null }>) {
            next[p.user_id] = p.username ?? p.display_name ?? `player_${p.user_id.slice(0, 6)}`;
          }
          return next;
        });
      });
  }, [bets]);

  const visible = useMemo(
    () => bets.filter((b) => b.user_id !== excludeUserId).slice(0, 12),
    [bets, excludeUserId]
  );

  if (visible.length === 0) return null;

  const Icon = variant === 'plane' ? Plane : Rocket;

  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className ?? ''}`}>
      {visible.map((b, idx) => {
        // Y position: cashed/lost are frozen at their multiplier; placed
        // bets ride the live multiplier.
        const m = b.status === 'placed'
          ? multiplier
          : (b.cashout_multiplier ?? multiplier);
        const yPct = Math.min(95, (Math.log2(Math.max(1, m)) / Math.log2(Math.max(2, yMax))) * 90);
        // Spread horizontally based on user id hash so ghosts don't overlap.
        const xHash = (b.user_id.charCodeAt(0) + b.user_id.charCodeAt(1) * 7 + idx * 23) % 75;
        const xPct = 8 + xHash;

        const color = b.status === 'cashed'
          ? 'text-emerald-400'
          : b.status === 'lost'
            ? 'text-rose-500/70'
            : 'text-cyan-300/80';
        const label = names[b.user_id] ?? `…${b.user_id.slice(-4)}`;
        const fell = b.status === 'lost' && status !== 'running';

        return (
          <div
            key={b.id}
            className={`absolute flex flex-col items-center transition-all duration-500 ease-out ${color}`}
            style={{
              left: `${xPct}%`,
              bottom: fell ? '2%' : `${yPct}%`,
              opacity: b.status === 'lost' ? 0.5 : 0.9,
              transform: 'translateX(-50%)',
            }}
          >
            <Icon className="h-4 w-4 drop-shadow-[0_0_4px_currentColor]" />
            <span className="text-[10px] font-mono mt-0.5 px-1.5 py-px rounded bg-background/60 backdrop-blur-sm border border-current/30 max-w-[80px] truncate">
              {label}
              {b.status === 'cashed' && b.cashout_multiplier && (
                <span className="ml-1 font-bold">{b.cashout_multiplier.toFixed(2)}×</span>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}
