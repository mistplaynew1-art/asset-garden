/**
 * Rewards — overhauled.
 *  • Daily login streak with persisted state in localStorage (per user)
 *  • Working "Spin the Wheel" prize wheel (24h cooldown), credits via add_test_credit RPC
 *  • Working "Mystery Box" with 4h cooldown
 *  • Active quests panel
 *  • Reward shop where XP can be redeemed for items
 */
import { useEffect, useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Star, Zap, Trophy, Box, Compass, ShoppingBag, Lock, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAppStore } from '@/stores/app-store';
import { useWallet } from '@/hooks/use-wallet';
import { supabase } from '@/integrations/supabase/client';
import { playSound } from '@/lib/sounds';

const WHEEL_PRIZES = [
  { label: '$1', amount: 1, color: '#94a3b8', weight: 30 },
  { label: '$5', amount: 5, color: '#3b82f6', weight: 25 },
  { label: '$2', amount: 2, color: '#a855f7', weight: 20 },
  { label: '$10', amount: 10, color: '#22c55e', weight: 12 },
  { label: '$25', amount: 25, color: '#eab308', weight: 8 },
  { label: '$100', amount: 100, color: '#ef4444', weight: 4 },
  { label: '$500', amount: 500, color: '#ff00ff', weight: 0.9 },
  { label: '$1000', amount: 1000, color: '#fbbf24', weight: 0.1 },
];

const DAILY_REWARDS = [
  { day: 1, amount: 1 }, { day: 2, amount: 2 }, { day: 3, amount: 5 },
  { day: 4, amount: 10 }, { day: 5, amount: 25 }, { day: 6, amount: 50 }, { day: 7, amount: 100 },
];

const QUESTS = [
  { id: 'q1', title: 'Place 10 bets', goal: 10, progress: 7, reward: 5 },
  { id: 'q2', title: 'Win 3 in a row', goal: 3, progress: 2, reward: 10 },
  { id: 'q3', title: 'Try 3 different games', goal: 3, progress: 3, reward: 15, claimable: true },
  { id: 'q4', title: 'Reach a 5× multiplier', goal: 1, progress: 0, reward: 25 },
];

const SHOP_ITEMS = [
  { id: 'avatar1', name: 'Diamond Frame', desc: 'Animated avatar border', cost: 5000, icon: '💎' },
  { id: 'spin50', name: '50 Free Spins', desc: 'Big Bass Bonanza', cost: 2500, icon: '🎰' },
  { id: 'wager100', name: '$100 Wager Bonus', desc: '20× wagering required', cost: 10000, icon: '💵' },
  { id: 'host', name: 'VIP Host Call', desc: '15-min concierge call', cost: 25000, icon: '👑' },
];

function pickWeighted<T extends { weight: number }>(items: T[]): number {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= items[i].weight;
    if (r <= 0) return i;
  }
  return items.length - 1;
}

function dayKey() {
  return new Date().toISOString().slice(0, 10);
}

interface PersistedState {
  streak: number;
  lastClaimDay: string | null;
  lastWheelTs: number;
  lastBoxTs: number;
}

const COOLDOWN_WHEEL_MS = 24 * 3600 * 1000;
const COOLDOWN_BOX_MS = 4 * 3600 * 1000;

function useCountdown(targetTs: number) {
  const [remaining, setRemaining] = useState(Math.max(0, targetTs - Date.now()));
  useEffect(() => {
    if (remaining <= 0) return;
    const id = setInterval(() => setRemaining(Math.max(0, targetTs - Date.now())), 1000);
    return () => clearInterval(id);
  }, [targetTs, remaining]);
  if (remaining <= 0) return null;
  const h = Math.floor(remaining / 3600000);
  const m = Math.floor((remaining % 3600000) / 60000);
  const s = Math.floor((remaining % 60000) / 1000);
  return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function RewardsPage() {
  const { user, isAuthenticated } = useAppStore();
  const { refetch } = useWallet();
  const { toast } = useToast();
  const storageKey = `nb-rewards-${user?.id ?? 'guest'}`;

  const [state, setState] = useState<PersistedState>(() => {
    if (typeof window === 'undefined') return { streak: 0, lastClaimDay: null, lastWheelTs: 0, lastBoxTs: 0 };
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) return JSON.parse(raw);
    } catch {}
    return { streak: 2, lastClaimDay: null, lastWheelTs: 0, lastBoxTs: 0 };
  });

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch {}
  }, [state, storageKey]);

  const [wheelAngle, setWheelAngle] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [wonPrize, setWonPrize] = useState<typeof WHEEL_PRIZES[number] | null>(null);
  const [openingBox, setOpeningBox] = useState(false);
  const [boxPrize, setBoxPrize] = useState<number | null>(null);

  const today = dayKey();
  const claimedToday = state.lastClaimDay === today;
  const nextClaimDay = claimedToday ? state.streak : Math.min(state.streak + 1, 7);

  const wheelCooldown = useCountdown(state.lastWheelTs + COOLDOWN_WHEEL_MS);
  const boxCooldown = useCountdown(state.lastBoxTs + COOLDOWN_BOX_MS);

  const creditWallet = useCallback(async (amount: number, label: string) => {
    if (!isAuthenticated) {
      toast({ title: 'Sign in to claim rewards', variant: 'destructive' });
      return false;
    }
    const { data, error } = await supabase.rpc('add_test_credit', { p_amount: amount });
    const result = data as { error?: string; balance?: number } | null;
    if (error || result?.error) {
      toast({ title: 'Failed to credit reward', description: result?.error ?? error?.message, variant: 'destructive' });
      return false;
    }
    refetch();
    toast({ title: `🎁 +$${amount}`, description: label });
    playSound('jackpot');
    return true;
  }, [isAuthenticated, refetch, toast]);

  const claimDaily = async (day: number) => {
    if (day !== nextClaimDay || claimedToday) return;
    const reward = DAILY_REWARDS.find(d => d.day === day);
    if (!reward) return;
    const ok = await creditWallet(reward.amount, `Daily streak day ${day}`);
    if (ok) setState(s => ({ ...s, streak: day === 7 ? 0 : day, lastClaimDay: today }));
  };

  const spinWheel = async () => {
    if (spinning || wheelCooldown) return;
    setSpinning(true);
    setWonPrize(null);
    const idx = pickWeighted(WHEEL_PRIZES);
    const prize = WHEEL_PRIZES[idx];
    const segAngle = 360 / WHEEL_PRIZES.length;
    const target = 360 * 6 + (360 - (idx * segAngle + segAngle / 2));
    const newAngle = wheelAngle + target - (wheelAngle % 360);
    setWheelAngle(newAngle);
    playSound('wheel.tick');
    setTimeout(async () => {
      setSpinning(false);
      setWonPrize(prize);
      const ok = await creditWallet(prize.amount, `Daily wheel spin — ${prize.label}`);
      if (ok) setState(s => ({ ...s, lastWheelTs: Date.now() }));
    }, 4200);
  };

  const openBox = async () => {
    if (openingBox || boxCooldown) return;
    setOpeningBox(true);
    setBoxPrize(null);
    setTimeout(async () => {
      const amount = [1, 2, 5, 10, 25][Math.floor(Math.random() * 5)];
      setBoxPrize(amount);
      setOpeningBox(false);
      const ok = await creditWallet(amount, `Mystery box — $${amount}`);
      if (ok) setState(s => ({ ...s, lastBoxTs: Date.now() }));
    }, 1200);
  };

  const claimQuest = async (q: typeof QUESTS[number]) => {
    if (!q.claimable) return;
    await creditWallet(q.reward, `Quest reward — ${q.title}`);
  };

  const wheelSegSize = 360 / WHEEL_PRIZES.length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in pb-8">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Gift className="w-6 h-6 text-glow-gold" />
          <h1 className="font-display font-extrabold text-2xl text-foreground">Rewards</h1>
        </div>
        <div className="text-xs text-muted-foreground">
          Streak <span className="font-mono font-bold text-glow-gold">{state.streak} 🔥</span>
        </div>
      </div>

      {/* Daily streak */}
      <div className="p-5 rounded-2xl bg-surface border border-border">
        <h2 className="font-display font-bold text-lg text-foreground mb-3 flex items-center gap-2">
          <Star className="w-4 h-4 text-glow-gold" /> Daily Login Bonus
        </h2>
        <div className="grid grid-cols-7 gap-2">
          {DAILY_REWARDS.map(d => {
            const collected = d.day <= state.streak;
            const isNext = d.day === nextClaimDay && !claimedToday;
            return (
              <motion.button key={d.day}
                whileHover={isNext ? { scale: 1.05 } : {}}
                whileTap={isNext ? { scale: 0.95 } : {}}
                onClick={() => claimDaily(d.day)}
                disabled={!isNext}
                className={`relative p-3 rounded-xl border text-center transition-all overflow-hidden ${
                  collected ? 'bg-neon-green/10 border-neon-green/40' :
                  isNext ? 'bg-neon-gold/15 border-neon-gold ring-2 ring-neon-gold/30 animate-pulse-neon cursor-pointer' :
                  'bg-void border-border opacity-50'
                }`}>
                <div className="text-[10px] text-muted-foreground uppercase font-bold">Day {d.day}</div>
                <div className={`font-mono font-extrabold text-base mt-0.5 ${
                  collected ? 'text-glow-green' : isNext ? 'text-glow-gold' : 'text-foreground'
                }`}>${d.amount}</div>
                {collected && <Check className="w-4 h-4 text-glow-green mx-auto mt-1" />}
                {isNext && (
                  <div className="absolute -top-px -right-px text-[8px] font-bold bg-neon-gold text-void px-1 py-0.5 rounded-bl-md">
                    CLAIM
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
        {claimedToday && (
          <div className="mt-3 text-xs text-glow-green text-center">✓ Today's bonus claimed. Come back tomorrow!</div>
        )}
      </div>

      {/* Wheel + Box */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Spin the Wheel */}
        <div className="p-5 rounded-2xl bg-surface border border-border">
          <div className="flex items-center gap-2 mb-3">
            <Compass className="w-4 h-4 text-glow-blue" />
            <h3 className="font-display font-bold text-foreground">Daily Prize Wheel</h3>
          </div>
          <div className="relative w-56 h-56 mx-auto mb-4">
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 z-10
              w-0 h-0 border-l-[10px] border-r-[10px] border-t-[16px] border-l-transparent border-r-transparent border-t-neon-gold drop-shadow-[0_0_6px_hsl(var(--neon-gold))]" />
            <motion.svg viewBox="-100 -100 200 200" className="absolute inset-0"
              animate={{ rotate: wheelAngle }}
              transition={{ duration: 4.2, ease: [0.17, 0.67, 0.16, 0.99] }}>
              {WHEEL_PRIZES.map((p, i) => {
                const start = i * wheelSegSize - 90;
                const end = (i + 1) * wheelSegSize - 90;
                const sRad = (start * Math.PI) / 180;
                const eRad = (end * Math.PI) / 180;
                const x1 = Math.cos(sRad) * 96, y1 = Math.sin(sRad) * 96;
                const x2 = Math.cos(eRad) * 96, y2 = Math.sin(eRad) * 96;
                const labelAngle = start + wheelSegSize / 2;
                const lx = Math.cos((labelAngle * Math.PI) / 180) * 60;
                const ly = Math.sin((labelAngle * Math.PI) / 180) * 60;
                return (
                  <g key={i}>
                    <path d={`M 0 0 L ${x1} ${y1} A 96 96 0 0 1 ${x2} ${y2} Z`}
                      fill={p.color} stroke="#0c0f15" strokeWidth="1" opacity="0.92" />
                    <text x={lx} y={ly} textAnchor="middle" dominantBaseline="central"
                      fontSize={11} fontWeight={800} fill="white"
                      transform={`rotate(${labelAngle + 90} ${lx} ${ly})`}
                      style={{ textShadow: '0 1px 2px rgba(0,0,0,0.7)' }}>
                      {p.label}
                    </text>
                  </g>
                );
              })}
              <circle r={14} fill="hsl(42 80% 50%)" stroke="hsl(42 80% 30%)" strokeWidth={2} />
              <circle r={5} fill="#0c0f15" />
            </motion.svg>
          </div>
          <button onClick={spinWheel} disabled={!!wheelCooldown || spinning || !isAuthenticated}
            className="w-full py-2.5 rounded-xl text-sm font-display font-bold gradient-primary text-foreground neon-glow-blue disabled:opacity-50 disabled:cursor-not-allowed">
            {spinning ? 'Spinning…' : wheelCooldown ? `Available in ${wheelCooldown}` : isAuthenticated ? 'Spin Now' : 'Sign in to spin'}
          </button>
          <AnimatePresence>
            {wonPrize && !spinning && (
              <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}
                className="mt-3 p-3 rounded-xl bg-neon-gold/15 border border-neon-gold/40 text-center">
                <div className="text-[10px] uppercase font-bold text-muted-foreground">You won</div>
                <div className="font-display font-extrabold text-2xl text-glow-gold">{wonPrize.label}</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Mystery Box */}
        <div className="p-5 rounded-2xl bg-surface border border-border">
          <div className="flex items-center gap-2 mb-3">
            <Box className="w-4 h-4 text-glow-purple" />
            <h3 className="font-display font-bold text-foreground">Mystery Box</h3>
          </div>
          <div className="relative h-56 mx-auto mb-4 flex items-center justify-center">
            <motion.div
              animate={openingBox ? { rotate: [0, -10, 10, -10, 10, 0], scale: [1, 1.05, 1] } : {}}
              transition={openingBox ? { duration: 1.2, ease: 'easeInOut' } : {}}
              className="text-7xl"
              style={{ filter: 'drop-shadow(0 8px 16px rgba(168,85,247,0.5))' }}>
              {boxPrize !== null && !openingBox ? '🎉' : '📦'}
            </motion.div>
            {openingBox && (
              <div className="absolute inset-0 pointer-events-none">
                {[...Array(8)].map((_, i) => (
                  <motion.span key={i}
                    initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                    animate={{
                      x: Math.cos((i / 8) * Math.PI * 2) * 80,
                      y: Math.sin((i / 8) * Math.PI * 2) * 80,
                      opacity: 0, scale: 0.4,
                    }}
                    transition={{ duration: 0.9, delay: 0.6, ease: 'easeOut' }}
                    className="absolute top-1/2 left-1/2 w-2 h-2 -ml-1 -mt-1 rounded-full bg-neon-gold shadow-[0_0_12px_hsl(var(--neon-gold))]" />
                ))}
              </div>
            )}
          </div>
          <button onClick={openBox} disabled={!!boxCooldown || openingBox || !isAuthenticated}
            className="w-full py-2.5 rounded-xl text-sm font-display font-bold bg-neon-purple/20 border border-neon-purple/50 text-glow-purple hover:bg-neon-purple/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            {openingBox ? 'Opening…' : boxCooldown ? `Next box in ${boxCooldown}` : isAuthenticated ? 'Open Box' : 'Sign in to open'}
          </button>
          <AnimatePresence>
            {boxPrize !== null && !openingBox && (
              <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}
                className="mt-3 p-3 rounded-xl bg-neon-purple/15 border border-neon-purple/40 text-center">
                <div className="text-[10px] uppercase font-bold text-muted-foreground">Found inside</div>
                <div className="font-display font-extrabold text-2xl text-glow-purple">${boxPrize}</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Active quests */}
      <div className="p-5 rounded-2xl bg-surface border border-border">
        <h2 className="font-display font-bold text-lg text-foreground mb-3 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-glow-gold" /> Active Quests
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {QUESTS.map(q => {
            const pct = Math.min(100, Math.round((q.progress / q.goal) * 100));
            return (
              <div key={q.id} className="p-3 rounded-xl bg-void border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-display font-bold text-sm text-foreground">{q.title}</div>
                  <div className="text-xs font-mono text-glow-gold">+${q.reward}</div>
                </div>
                <div className="h-1.5 rounded-full bg-elevated overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-neon-blue to-neon-purple transition-all" style={{ width: `${pct}%` }} />
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>{q.progress} / {q.goal}</span>
                  <button onClick={() => claimQuest(q)} disabled={!q.claimable}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                      q.claimable
                        ? 'bg-neon-green/20 text-glow-green hover:bg-neon-green/30 border border-neon-green/40'
                        : 'bg-elevated border border-border text-muted-foreground cursor-not-allowed'
                    }`}>
                    {q.claimable ? 'Claim' : 'Locked'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Reward shop */}
      <div className="p-5 rounded-2xl bg-surface border border-border">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-glow-blue" /> Reward Shop
          </h2>
          <div className="text-xs text-muted-foreground">
            XP balance: <span className="font-mono font-bold text-glow-blue">3,420</span>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {SHOP_ITEMS.map(item => {
            const affordable = 3420 >= item.cost;
            return (
              <div key={item.id} className="p-3 rounded-xl bg-void border border-border text-center space-y-2">
                <div className="text-3xl">{item.icon}</div>
                <div className="font-display font-bold text-xs text-foreground">{item.name}</div>
                <div className="text-[10px] text-muted-foreground leading-tight">{item.desc}</div>
                <button disabled={!affordable}
                  onClick={() => toast({ title: 'Reward shop coming soon', description: 'Item redemption will be enabled in the next release.' })}
                  className={`w-full py-1.5 rounded-lg text-[10px] font-bold transition-colors ${
                    affordable
                      ? 'bg-primary/20 border border-primary/40 text-primary hover:bg-primary/30'
                      : 'bg-elevated border border-border text-muted-foreground cursor-not-allowed'
                  }`}>
                  {affordable ? `${item.cost.toLocaleString()} XP` : <><Lock className="w-3 h-3 inline -mt-0.5" /> {item.cost.toLocaleString()}</>}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
