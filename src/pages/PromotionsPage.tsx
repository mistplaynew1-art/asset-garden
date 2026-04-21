import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Clock, CheckCircle2, Lock, Sparkles, X } from 'lucide-react';
import { useAppStore } from '@/stores/app-store';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface Promo {
  id: string;
  title: string;
  desc: string;
  icon: string;
  color: string;
  tag: string;
  bonus: number;            // USD credited on claim
  cooldownHours: number;    // 0 = one-time
  requiresDeposit?: boolean;
}

const PROMOS: Promo[] = [
  { id: 'welcome',  title: 'Welcome Package',  desc: 'Up to $1,000 instant bonus for new players',         icon: '🎁', color: '#FFD700', tag: 'New Players', bonus: 1000, cooldownHours: 0 },
  { id: 'reload',   title: 'Weekly Reload',    desc: '50% reload bonus every Monday up to $500',           icon: '🔄', color: '#3b82f6', tag: 'All Players', bonus: 500,  cooldownHours: 168 },
  { id: 'crash',    title: 'Crash Tournament', desc: 'Daily Crash bonus credit — $200 to test the game',   icon: '🚀', color: '#FF4757', tag: 'Tournament',  bonus: 200,  cooldownHours: 24 },
  { id: 'slots',    title: 'Slot Frenzy',      desc: 'Claim $300 to spin Sweet Bonanza, Olympus & more',   icon: '🎰', color: '#FF69B4', tag: 'Slots',       bonus: 300,  cooldownHours: 24 },
  { id: 'refer',    title: 'Refer & Earn',     desc: 'Daily referral bonus — $100 free to share & play',   icon: '👥', color: '#22c55e', tag: 'Referral',    bonus: 100,  cooldownHours: 24 },
  { id: 'vip',      title: 'VIP Cashback',     desc: 'Up to 25% daily cashback for VIP members ($150)',    icon: '💎', color: '#B9F2FF', tag: 'VIP Only',    bonus: 150,  cooldownHours: 24 },
  { id: 'race',     title: 'Daily Race',       desc: 'Top 100 players share $10,000 — claim $50 entry',    icon: '🏁', color: '#eab308', tag: 'Daily',       bonus: 50,   cooldownHours: 24 },
  { id: 'crypto',   title: 'Crypto Bonus',     desc: 'Extra 10% on all crypto deposits ($250 sample)',     icon: '₿',  color: '#f7931a', tag: 'Crypto',      bonus: 250,  cooldownHours: 24 },
];

interface ClaimRecord { lastClaimedAt: number; claimed: boolean; }
const STORAGE_KEY = (uid: string) => `promo-claims:${uid}`;

function loadClaims(uid: string): Record<string, ClaimRecord> {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY(uid)) ?? '{}'); } catch { return {}; }
}
function saveClaims(uid: string, claims: Record<string, ClaimRecord>) {
  localStorage.setItem(STORAGE_KEY(uid), JSON.stringify(claims));
}

function timeLeftLabel(ms: number): string {
  if (ms <= 0) return 'Available';
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function PromotionsPage() {
  const { isAuthenticated, user } = useAppStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [claims, setClaims] = useState<Record<string, ClaimRecord>>({});
  const [now, setNow] = useState(Date.now());
  const [claiming, setClaiming] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState<{ id: string; bonus: number } | null>(null);

  useEffect(() => { if (user?.id) setClaims(loadClaims(user.id)); }, [user?.id]);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  function statusFor(promo: Promo) {
    const rec = claims[promo.id];
    if (!rec) return { state: 'available' as const, ms: 0 };
    if (promo.cooldownHours === 0 && rec.claimed) return { state: 'claimed' as const, ms: 0 };
    const next = rec.lastClaimedAt + promo.cooldownHours * 3_600_000;
    const ms = next - now;
    return ms > 0 ? { state: 'cooldown' as const, ms } : { state: 'available' as const, ms: 0 };
  }

  async function handleClaim(promo: Promo) {
    if (!isAuthenticated || !user?.id) {
      toast({ title: 'Sign in required', description: 'Log in to claim promotions.' });
      return;
    }
    const status = statusFor(promo);
    if (status.state !== 'available') return;

    setClaiming(promo.id);
    const amount = Math.min(promo.bonus, 10000);
    const { data, error } = await supabase.rpc('add_test_credit', { p_amount: amount });
    setClaiming(null);

    if (error || (data && typeof data === 'object' && 'error' in data)) {
      toast({ title: 'Claim failed', description: error?.message ?? 'Try again later.' });
      return;
    }

    const next = { ...claims, [promo.id]: { lastClaimedAt: Date.now(), claimed: true } };
    setClaims(next);
    saveClaims(user.id, next);
    queryClient.invalidateQueries({ queryKey: ['wallet'] });
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    setCelebrate({ id: promo.id, bonus: amount });
    setTimeout(() => setCelebrate((c) => (c?.id === promo.id ? null : c)), 2800);
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
      <div className="flex items-center gap-2">
        <Gift className="w-6 h-6 text-glow-gold" />
        <h1 className="font-display font-extrabold text-2xl text-foreground">Promotions</h1>
      </div>

      {!isAuthenticated && (
        <div className="p-4 rounded-xl bg-surface border border-border text-sm text-muted-foreground">
          Sign in to claim promotions and have the bonus credited instantly to your wallet.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PROMOS.map((promo) => {
          const status = statusFor(promo);
          const isClaiming = claiming === promo.id;
          const isClaimed = status.state === 'claimed';
          const isCooldown = status.state === 'cooldown';
          const disabled = !isAuthenticated || isClaiming || isClaimed || isCooldown;

          return (
            <motion.div
              key={promo.id}
              layout
              className="relative p-5 rounded-2xl bg-surface border border-border hover:border-neon-blue/30 transition-all overflow-hidden"
              style={{ boxShadow: isClaimed ? `0 0 0 1px ${promo.color}40` : undefined }}
            >
              <div
                className="absolute -top-12 -right-12 w-40 h-40 rounded-full opacity-10 blur-2xl pointer-events-none"
                style={{ background: promo.color }}
              />
              <div className="flex items-start justify-between mb-3 relative">
                <span className="text-3xl">{promo.icon}</span>
                <span
                  className="px-2 py-0.5 rounded-full text-[9px] font-bold"
                  style={{ background: `${promo.color}20`, color: promo.color }}
                >
                  {promo.tag}
                </span>
              </div>
              <h3 className="font-display font-bold text-lg text-foreground">{promo.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{promo.desc}</p>

              <div className="flex items-center justify-between mt-4">
                <div className="text-xs text-muted-foreground">
                  Bonus:{' '}
                  <span className="font-mono font-bold text-glow-green">${promo.bonus.toLocaleString()}</span>
                </div>
                {isCooldown && (
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {timeLeftLabel(status.ms)}
                  </div>
                )}
              </div>

              <button
                onClick={() => handleClaim(promo)}
                disabled={disabled}
                className={`mt-3 w-full px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  isClaimed
                    ? 'bg-neon-green/15 text-glow-green border border-neon-green/30'
                    : isCooldown
                    ? 'bg-elevated border border-border text-muted-foreground'
                    : disabled
                    ? 'bg-elevated border border-border text-muted-foreground opacity-60'
                    : 'gradient-primary text-foreground neon-glow-blue hover:opacity-90'
                }`}
              >
                {isClaiming ? (
                  <>Processing…</>
                ) : isClaimed ? (
                  <><CheckCircle2 className="w-4 h-4" /> Claimed</>
                ) : isCooldown ? (
                  <><Lock className="w-4 h-4" /> Locked · {timeLeftLabel(status.ms)}</>
                ) : !isAuthenticated ? (
                  <><Lock className="w-4 h-4" /> Sign in to claim</>
                ) : (
                  <><Sparkles className="w-4 h-4" /> Claim ${promo.bonus.toLocaleString()}</>
                )}
              </button>

              <AnimatePresence>
                {celebrate?.id === promo.id && (
                  <motion.div
                    key="celebrate"
                    initial={{ opacity: 0, y: 12, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    className="absolute inset-0 flex items-center justify-center bg-void/80 backdrop-blur-sm"
                  >
                    <div className="text-center">
                      <div className="text-5xl mb-2">🎉</div>
                      <div className="font-display font-extrabold text-2xl text-glow-green">
                        +${celebrate.bonus}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">Credited to your wallet</div>
                    </div>
                    <button
                      onClick={() => setCelebrate(null)}
                      className="absolute top-2 right-2 p-1 rounded-full hover:bg-elevated"
                      aria-label="Dismiss"
                    >
                      <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
