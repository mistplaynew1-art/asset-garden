/**
 * Progressive Jackpot Network — REAL pots fed by every bet on the platform.
 *
 * - Initial values fetched from `platform_stats` (jackpot_mini/major/grand).
 * - Subscribes to Supabase Realtime so any player's bet bumps the ticker live.
 * - Between server pushes, a tiny client-side drift keeps the digits ticking
 *   so the ticker always feels alive (drift is dwarfed by real updates).
 */
import { useEffect, useState } from 'react';
import { Crown, Diamond, Gem } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';

type TierId = 'mini' | 'major' | 'grand';

interface JackpotTier {
  id: TierId;
  statKey: string;
  name: string;
  icon: typeof Crown;
  color: string;
  glow: string;
}

const TIERS: JackpotTier[] = [
  { id: 'mini',  statKey: 'jackpot_mini',  name: 'MINI',  icon: Gem,     color: 'text-cyan-300',    glow: 'shadow-[0_0_20px_rgba(34,211,238,0.45)]' },
  { id: 'major', statKey: 'jackpot_major', name: 'MAJOR', icon: Diamond, color: 'text-fuchsia-300', glow: 'shadow-[0_0_20px_rgba(232,121,249,0.45)]' },
  { id: 'grand', statKey: 'jackpot_grand', name: 'GRAND', icon: Crown,   color: 'text-yellow-300',  glow: 'shadow-[0_0_22px_rgba(253,224,71,0.55)]' },
];

const fmt = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function JackpotTicker() {
  const [values, setValues] = useState<Record<TierId, number>>({ mini: 0, major: 0, grand: 0 });

  // Initial fetch + realtime subscription. NO client-side drift — every
  // value shown is a real server-tracked number from `platform_stats`.
  useEffect(() => {
    let active = true;

    const load = async () => {
      const { data } = await supabase
        .from('platform_stats')
        .select('stat_key, stat_value')
        .in('stat_key', TIERS.map(t => t.statKey));
      if (!active || !data) return;
      const next: Record<TierId, number> = { mini: 0, major: 0, grand: 0 };
      for (const tier of TIERS) {
        const row = data.find(r => r.stat_key === tier.statKey);
        next[tier.id] = Number(row?.stat_value ?? 0);
      }
      setValues(next);
    };
    load();

    const channel = supabase
      .channel('jackpot-ticker')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'platform_stats' },
        (payload) => {
          const row = payload.new as { stat_key?: string; stat_value?: number };
          const tier = TIERS.find(t => t.statKey === row.stat_key);
          if (!tier) return;
          setValues(v => ({ ...v, [tier.id]: Number(row.stat_value ?? v[tier.id]) }));
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
      {TIERS.map((tier, i) => {
        const Icon = tier.icon;
        const value = values[tier.id];
        return (
          <motion.div
            key={tier.id}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`relative overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br from-card to-background p-2 sm:p-3 ${tier.glow}`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Icon className={`w-3.5 h-3.5 ${tier.color}`} />
              <span className={`text-[10px] sm:text-xs font-display font-extrabold tracking-widest ${tier.color}`}>
                {tier.name}
              </span>
            </div>
            <div className="font-mono font-extrabold text-sm sm:text-lg lg:text-xl text-foreground tabular-nums truncate">
              <AnimatePresence mode="popLayout">
                <motion.span
                  key={Math.floor(value)}
                  initial={{ y: 6, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -6, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="inline-block"
                >
                  ${fmt(value)}
                </motion.span>
              </AnimatePresence>
            </div>
            <div className="absolute -bottom-6 -right-6 opacity-10 pointer-events-none">
              <Icon className={`w-16 h-16 ${tier.color}`} />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
