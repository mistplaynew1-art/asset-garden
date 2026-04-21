import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Crown, Star, Gift, TrendingUp, Zap, Sparkles, Lock } from 'lucide-react';
import { useAppStore } from '@/stores/app-store';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface Tier {
  name: string;
  min: number;          // XP threshold
  color: string;
  icon: string;
  rakeback: number;     // %
  weeklyBonus: number;  // USD
  perks: string[];
}

const VIP_TIERS: Tier[] = [
  { name: 'Bronze',   min: 0,      color: '#CD7F32', icon: '🥉', rakeback: 5,  weeklyBonus: 25,  perks: ['5% Rakeback', 'Weekly Bonus', 'Priority Support'] },
  { name: 'Silver',   min: 1_000,  color: '#C0C0C0', icon: '🥈', rakeback: 10, weeklyBonus: 75,  perks: ['10% Rakeback', 'Daily Bonus', 'Exclusive Games', 'Personal Manager'] },
  { name: 'Gold',     min: 10_000, color: '#FFD700', icon: '🥇', rakeback: 15, weeklyBonus: 200, perks: ['15% Rakeback', 'Hourly Bonus', 'VIP Events', 'Custom Limits'] },
  { name: 'Platinum', min: 50_000, color: '#E5E4E2', icon: '💎', rakeback: 20, weeklyBonus: 750, perks: ['20% Rakeback', 'Instant Withdrawals', 'Private Tables', 'Luxury Gifts'] },
  { name: 'Diamond',  min: 250_000, color: '#B9F2FF', icon: '👑', rakeback: 25, weeklyBonus: 2500, perks: ['25% Rakeback', 'Concierge Service', 'Trip Packages', 'No Limits'] },
];

const WEEKLY_KEY = (uid: string) => `vip-weekly:${uid}`;

export default function VIPPage() {
  const { profile, isAuthenticated, user } = useAppStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const xp = profile?.xp ?? 0;
  const level = profile?.level ?? 1;

  const currentIdx = useMemo(() => {
    let idx = 0;
    for (let i = 0; i < VIP_TIERS.length; i++) if (xp >= VIP_TIERS[i].min) idx = i;
    return idx;
  }, [xp]);

  const current = VIP_TIERS[currentIdx];
  const next = VIP_TIERS[currentIdx + 1] ?? null;
  const progressPct = next ? Math.min(100, ((xp - current.min) / (next.min - current.min)) * 100) : 100;

  const lastWeekly = isAuthenticated && user?.id
    ? Number(localStorage.getItem(WEEKLY_KEY(user.id)) ?? '0')
    : 0;
  const weeklyAvailable = Date.now() - lastWeekly > 7 * 24 * 3_600_000;
  const [claiming, setClaiming] = useState(false);

  async function claimWeekly() {
    if (!isAuthenticated || !user?.id) {
      toast({ title: 'Sign in required', description: 'Log in to claim your weekly bonus.' });
      return;
    }
    if (!weeklyAvailable) return;
    setClaiming(true);
    const amt = Math.min(current.weeklyBonus, 10000);
    const { data, error } = await supabase.rpc('add_test_credit', { p_amount: amt });
    setClaiming(false);
    if (error || (data && typeof data === 'object' && 'error' in data)) {
      toast({ title: 'Claim failed', description: error?.message ?? 'Try again later.' });
      return;
    }
    localStorage.setItem(WEEKLY_KEY(user.id), String(Date.now()));
    queryClient.invalidateQueries({ queryKey: ['wallet'] });
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    toast({ title: `+$${amt} Weekly Bonus`, description: `${current.name} tier reward credited.` });
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
      <div className="flex items-center gap-2">
        <Crown className="w-6 h-6 text-glow-gold" />
        <h1 className="font-display font-extrabold text-2xl text-foreground">VIP Club</h1>
      </div>

      {/* Current tier hero */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative p-6 rounded-2xl bg-surface border border-border text-center overflow-hidden"
      >
        <div
          className="absolute inset-0 opacity-10 blur-3xl pointer-events-none"
          style={{ background: `radial-gradient(circle at 50% 0%, ${current.color}, transparent 70%)` }}
        />
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2.5, repeat: Infinity }}
          className="text-6xl mb-3 relative"
        >
          {current.icon}
        </motion.div>
        <h2 className="font-display font-extrabold text-2xl relative" style={{ color: current.color }}>
          {current.name} Member
        </h2>
        <p className="text-sm text-muted-foreground mt-1 relative">
          Level {level} · {xp.toLocaleString()} XP · {current.rakeback}% rakeback
        </p>

        <div className="w-full max-w-md mx-auto mt-5 relative">
          <div className="h-3 rounded-full bg-void overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg, ${current.color}, ${next?.color ?? current.color})` }}
            />
          </div>
          <div className="text-[11px] text-muted-foreground mt-2">
            {next
              ? `${(next.min - xp).toLocaleString()} XP to ${next.name} ${next.icon}`
              : 'Maximum tier reached!'}
          </div>
        </div>

        <button
          onClick={claimWeekly}
          disabled={!weeklyAvailable || claiming || !isAuthenticated}
          className={`mt-5 px-5 py-2.5 rounded-xl text-sm font-bold inline-flex items-center gap-2 transition-all ${
            weeklyAvailable && isAuthenticated
              ? 'gradient-primary text-foreground neon-glow-blue'
              : 'bg-elevated border border-border text-muted-foreground'
          }`}
        >
          {!isAuthenticated ? (
            <><Lock className="w-4 h-4" /> Sign in to claim</>
          ) : claiming ? (
            'Processing…'
          ) : weeklyAvailable ? (
            <><Sparkles className="w-4 h-4" /> Claim ${current.weeklyBonus} weekly bonus</>
          ) : (
            <><Lock className="w-4 h-4" /> Weekly bonus claimed</>
          )}
        </button>
      </motion.div>

      {/* Tier ladder */}
      <div>
        <h3 className="font-display font-bold text-sm text-muted-foreground mb-3 uppercase tracking-wider">Tier Ladder</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {VIP_TIERS.map((tier, i) => {
            const reached = i <= currentIdx;
            const isCurrent = i === currentIdx;
            return (
              <motion.div
                key={tier.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`relative p-4 rounded-xl border transition-all ${
                  isCurrent ? 'border-2' : reached ? 'border-border' : 'border-border/50'
                } ${reached ? 'bg-surface' : 'bg-surface/40'}`}
                style={{ borderColor: isCurrent ? tier.color : undefined }}
              >
                {isCurrent && (
                  <div
                    className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[9px] font-bold"
                    style={{ background: tier.color, color: '#000' }}
                  >
                    YOU
                  </div>
                )}
                <div className={`text-3xl mb-2 ${reached ? '' : 'grayscale opacity-40'}`}>{tier.icon}</div>
                <div className="font-display font-bold text-sm" style={{ color: reached ? tier.color : '#666' }}>
                  {tier.name}
                </div>
                <div className="text-[10px] text-muted-foreground mb-3">{tier.min.toLocaleString()}+ XP</div>
                <ul className="space-y-1">
                  {tier.perks.map((p) => (
                    <li key={p} className="text-[11px] text-muted-foreground flex items-start gap-1">
                      <Star className={`w-3 h-3 shrink-0 mt-0.5 ${reached ? 'text-glow-gold' : 'text-muted-foreground/40'}`} />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Benefits cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          { icon: Gift, title: 'Weekly Rewards', desc: `Claim $${current.weeklyBonus} every 7 days at your tier`, cls: 'text-glow-green' },
          { icon: TrendingUp, title: 'Rakeback', desc: `Earn ${current.rakeback}% back on every bet you place`, cls: 'text-glow-blue' },
          { icon: Zap, title: 'Exclusive Events', desc: 'Access high-roller tournaments and events', cls: 'text-glow-gold' },
        ].map((item) => (
          <motion.div
            key={item.title}
            whileHover={{ y: -2 }}
            className="p-5 rounded-xl bg-surface border border-border"
          >
            <item.icon className={`w-6 h-6 ${item.cls} mb-2`} />
            <div className="font-display font-bold text-sm text-foreground">{item.title}</div>
            <div className="text-xs text-muted-foreground mt-1">{item.desc}</div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
