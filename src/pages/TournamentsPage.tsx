import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Clock, Users, Trophy, Zap, Crown, Medal, X } from 'lucide-react';
import { useAppStore } from '@/stores/app-store';
import { useToast } from '@/hooks/use-toast';

interface Tournament {
  id: string;
  name: string;
  game: string;
  prizePool: number;       // USD
  players: number;
  endsAt: number;          // ms epoch
  startsAt: number;        // ms epoch
  icon: string;
  color: string;
}

const NOW = Date.now();
const H = 3_600_000;
const D = 24 * H;

const TOURNAMENTS: Tournament[] = [
  { id: 'crash-masters',  name: 'Crash Masters',     game: 'Crash',     prizePool: 25_000,  players: 1247, startsAt: NOW - 6 * H,  endsAt: NOW + 2 * H + 15 * 60_000, icon: '🚀', color: '#FF4757' },
  { id: 'slot-frenzy',    name: 'Slot Frenzy',       game: 'Slots',     prizePool: 50_000,  players: 3892, startsAt: NOW - D,      endsAt: NOW + D + 8 * H,           icon: '🎰', color: '#FF69B4' },
  { id: 'dice-champ',     name: 'Dice Championship', game: 'Dice',      prizePool: 15_000,  players: 892,  startsAt: NOW - 12 * H, endsAt: NOW + 4 * H + 30 * 60_000, icon: '🎲', color: '#3b82f6' },
  { id: 'bj-elite',       name: 'Blackjack Elite',   game: 'Blackjack', prizePool: 10_000,  players: 0,    startsAt: NOW + D,      endsAt: NOW + 3 * D,                icon: '🃏', color: '#22c55e' },
  { id: 'plinko-paradise', name: 'Plinko Paradise',  game: 'Plinko',    prizePool: 20_000,  players: 0,    startsAt: NOW + 3 * D,  endsAt: NOW + 5 * D,                icon: '📍', color: '#eab308' },
  { id: 'mega',           name: 'Monthly Mega',      game: 'All Games', prizePool: 100_000, players: 0,    startsAt: NOW + 7 * D,  endsAt: NOW + 14 * D,               icon: '👑', color: '#FFD700' },
];

const NAMES = ['CryptoKing', 'NeonNova', 'AceHunter', 'JadeTiger', 'StormByte', 'PixelPunk', 'ZenithX', 'VortexLynx', 'GoldRush88', 'IronOwl', 'ShadowSpin', 'EmberFox'];

interface LeaderRow { rank: number; name: string; profit: number; rounds: number; }

function buildLeaderboard(seed: string, count = 10): LeaderRow[] {
  // Deterministic per-tournament leaderboard so refreshing doesn't reshuffle.
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = (h ^ seed.charCodeAt(i)) * 16777619;
  const rng = () => {
    h ^= h << 13; h ^= h >>> 17; h ^= h << 5;
    return ((h >>> 0) % 10000) / 10000;
  };
  const rows = Array.from({ length: count }, (_, i) => ({
    rank: i + 1,
    name: NAMES[Math.floor(rng() * NAMES.length)] + Math.floor(rng() * 1000),
    profit: Math.round(5000 / (i + 1) + rng() * 800),
    rounds: 50 + Math.floor(rng() * 600),
  }));
  return rows.sort((a, b) => b.profit - a.profit).map((r, i) => ({ ...r, rank: i + 1 }));
}

function timeLeft(targetMs: number, nowMs: number): string {
  const ms = targetMs - nowMs;
  if (ms <= 0) return 'Ended';
  const d = Math.floor(ms / D);
  const h = Math.floor((ms % D) / H);
  const m = Math.floor((ms % H) / 60_000);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function distribution(prize: number): number[] {
  // 50% / 25% / 12% / 8% / 5% to top 5
  return [0.5, 0.25, 0.12, 0.08, 0.05].map((p) => Math.round(prize * p));
}

export default function TournamentsPage() {
  const { isAuthenticated } = useAppStore();
  const { toast } = useToast();
  const [now, setNow] = useState(Date.now());
  const [openId, setOpenId] = useState<string | null>(null);
  const [joined, setJoined] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const open = useMemo(() => TOURNAMENTS.find((t) => t.id === openId) ?? null, [openId]);
  const leaderboard = useMemo(() => (open ? buildLeaderboard(open.id) : []), [open]);
  const prizeBreakdown = useMemo(() => (open ? distribution(open.prizePool) : []), [open]);

  function statusOf(t: Tournament) {
    if (now < t.startsAt) return 'upcoming' as const;
    if (now > t.endsAt) return 'ended' as const;
    return 'live' as const;
  }

  function handleJoin(t: Tournament) {
    if (!isAuthenticated) {
      toast({ title: 'Sign in required', description: 'Log in to enter tournaments.' });
      return;
    }
    const status = statusOf(t);
    if (status === 'upcoming') {
      toast({ title: 'Reminder set', description: `We'll notify you when ${t.name} starts.` });
      return;
    }
    if (status === 'ended') return;
    setJoined((j) => ({ ...j, [t.id]: true }));
    toast({ title: 'Joined!', description: `You're entered in ${t.name}. Good luck!` });
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
      <div className="flex items-center gap-2">
        <Flame className="w-6 h-6 text-glow-red" />
        <h1 className="font-display font-extrabold text-2xl text-foreground">Tournaments</h1>
      </div>

      <div className="space-y-4">
        {TOURNAMENTS.map((t) => {
          const status = statusOf(t);
          const target = status === 'upcoming' ? t.startsAt : t.endsAt;
          const isJoined = joined[t.id];
          return (
            <motion.div
              key={t.id}
              layout
              className="relative p-5 rounded-2xl bg-surface border border-border hover:border-neon-blue/30 transition-all flex flex-col sm:flex-row items-start sm:items-center gap-4 overflow-hidden"
            >
              <div
                className="absolute -top-16 -left-12 w-48 h-48 rounded-full opacity-10 blur-3xl pointer-events-none"
                style={{ background: t.color }}
              />
              <span className="text-4xl relative">{t.icon}</span>
              <div className="flex-1 relative">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-display font-bold text-lg text-foreground">{t.name}</h3>
                  {status === 'live' && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-neon-green/10 text-glow-green animate-pulse-neon">● LIVE</span>
                  )}
                  {status === 'upcoming' && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-neon-gold/10 text-glow-gold">UPCOMING</span>
                  )}
                  {status === 'ended' && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-muted/20 text-muted-foreground">ENDED</span>
                  )}
                  {isJoined && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-primary/15 text-primary">JOINED</span>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> {t.game}</span>
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {t.players.toLocaleString()} players</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {status === 'upcoming' ? `Starts in ${timeLeft(target, now)}` : status === 'live' ? `Ends in ${timeLeft(target, now)}` : 'Ended'}
                  </span>
                  <button
                    onClick={() => setOpenId(t.id)}
                    className="text-primary hover:underline font-bold"
                  >
                    View leaderboard
                  </button>
                </div>
              </div>
              <div className="text-right relative">
                <div className="font-mono font-extrabold text-xl" style={{ color: t.color }}>
                  ${t.prizePool.toLocaleString()}
                </div>
                <button
                  onClick={() => handleJoin(t)}
                  disabled={status === 'ended'}
                  className={`mt-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    status === 'live'
                      ? isJoined
                        ? 'bg-neon-green/15 text-glow-green border border-neon-green/30'
                        : 'gradient-primary text-foreground neon-glow-blue'
                      : status === 'upcoming'
                      ? 'bg-elevated border border-border text-muted-foreground hover:text-foreground'
                      : 'bg-elevated border border-border text-muted-foreground opacity-60'
                  }`}
                >
                  {status === 'live' ? (isJoined ? 'Entered ✓' : 'Join Now') : status === 'upcoming' ? 'Notify Me' : 'Closed'}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-void/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setOpenId(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-surface border border-border rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5 border-b border-border flex items-center justify-between sticky top-0 bg-surface z-10">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{open.icon}</span>
                  <div>
                    <h3 className="font-display font-extrabold text-lg text-foreground">{open.name}</h3>
                    <div className="text-xs text-muted-foreground">
                      {open.game} · ${open.prizePool.toLocaleString()} pool
                    </div>
                  </div>
                </div>
                <button onClick={() => setOpenId(null)} className="p-2 rounded-lg hover:bg-elevated">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              <div className="p-5 space-y-5">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Trophy className="w-4 h-4 text-glow-gold" />
                    <h4 className="font-display font-bold text-sm text-foreground">Prize Distribution</h4>
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {prizeBreakdown.map((amt, i) => (
                      <div key={i} className="text-center p-2 rounded-lg bg-elevated border border-border">
                        <div className="text-[10px] text-muted-foreground">#{i + 1}</div>
                        <div className="font-mono font-bold text-xs text-glow-gold">${amt.toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Crown className="w-4 h-4 text-glow-gold" />
                    <h4 className="font-display font-bold text-sm text-foreground">Live Leaderboard</h4>
                  </div>
                  <div className="space-y-1">
                    {leaderboard.map((row) => (
                      <div
                        key={row.rank}
                        className={`flex items-center justify-between p-2.5 rounded-lg ${
                          row.rank <= 3 ? 'bg-elevated border border-neon-gold/20' : 'bg-elevated/50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-bold text-xs ${
                            row.rank === 1 ? 'bg-neon-gold/20 text-glow-gold' :
                            row.rank === 2 ? 'bg-muted/30 text-foreground' :
                            row.rank === 3 ? 'bg-orange-500/20 text-orange-400' :
                            'bg-void text-muted-foreground'
                          }`}>
                            {row.rank <= 3 ? <Medal className="w-3.5 h-3.5" /> : row.rank}
                          </div>
                          <div>
                            <div className="font-bold text-sm text-foreground">{row.name}</div>
                            <div className="text-[10px] text-muted-foreground">{row.rounds} rounds</div>
                          </div>
                        </div>
                        <div className="font-mono font-bold text-sm text-glow-green">+${row.profit.toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
