/**
 * Affiliate Program — server-truth only.
 *
 * The platform does not yet track referrals on the backend, so every metric
 * shown here starts at zero and will only move once a real referral schema
 * is implemented (Round 2). No fake / hardcoded numbers, no client drift.
 *
 * The personal referral link is derived from the authenticated user's id so
 * each player sees their own code — anonymous visitors see the marketing
 * pitch but no link.
 */
import { Users, DollarSign, Link as LinkIcon, Copy, BarChart3 } from 'lucide-react';
import { useMemo } from 'react';
import { toast } from 'sonner';
import { playSound } from '@/lib/sounds';
import { useAuth } from '@/hooks/use-auth';

export default function AffiliatePage() {
  const { user, isAuthenticated } = useAuth();

  // Personal ref code = first 8 chars of the user id. Stable, unique, server-derived.
  const refCode = useMemo(() => (user?.id ? user.id.slice(0, 8).toUpperCase() : ''), [user?.id]);
  const refLink = useMemo(() => {
    if (!refCode) return '';
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/?ref=${refCode}`;
  }, [refCode]);

  // Real referral tracking is not implemented yet — every counter is 0.
  // When the backend ships a `referrals` table these will hydrate from it.
  const stats = [
    { label: 'Total Referrals', value: '0',     icon: Users,     cls: 'text-glow-blue' },
    { label: 'Active Players',  value: '0',     icon: BarChart3, cls: 'text-glow-green' },
    { label: 'Total Earned',    value: '$0.00', icon: DollarSign,cls: 'text-glow-gold' },
    { label: 'This Month',      value: '$0.00', icon: LinkIcon,  cls: 'text-primary' },
  ];

  const copyLink = async () => {
    if (!refLink) return;
    try {
      await navigator.clipboard.writeText(refLink);
      playSound('coin');
      toast.success('Referral link copied');
    } catch {
      toast.error('Could not copy link');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center gap-2">
        <Users className="w-6 h-6 text-primary" />
        <h1 className="font-display font-extrabold text-2xl text-foreground">Affiliate Program</h1>
      </div>

      <div className="p-6 rounded-2xl bg-surface border border-border text-center">
        <h2 className="font-display font-bold text-xl text-foreground">Earn 25% Commission</h2>
        <p className="text-sm text-muted-foreground mt-1">On every player you refer, for life.</p>

        {isAuthenticated && refLink ? (
          <div className="mt-4 flex items-center gap-2 max-w-md mx-auto">
            <div className="flex-1 px-3 py-2.5 rounded-lg bg-void border border-border font-mono text-xs text-foreground truncate">
              {refLink}
            </div>
            <button
              onClick={copyLink}
              className="px-4 py-2.5 rounded-lg gradient-primary text-foreground font-bold text-sm flex items-center gap-1 neon-glow-blue"
            >
              <Copy className="w-4 h-4" /> Copy
            </button>
          </div>
        ) : (
          <p className="mt-4 text-xs text-muted-foreground">
            Sign in to get your personal referral link.
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="p-4 rounded-xl bg-surface border border-border text-center">
            <s.icon className={`w-5 h-5 ${s.cls} mx-auto mb-2`} />
            <div className="font-mono font-bold text-xl text-foreground">{s.value}</div>
            <div className="text-[10px] text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-muted-foreground text-center">
        Referral tracking goes live once a friend signs up with your link and places their first bet.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { step: '1', title: 'Share Your Link', desc: 'Share your unique referral link with friends' },
          { step: '2', title: 'Friends Sign Up', desc: 'They create an account and start playing' },
          { step: '3', title: 'Earn Forever',    desc: 'Get 25% of the house edge on all their bets' },
        ].map((s) => (
          <div key={s.step} className="p-5 rounded-xl bg-surface border border-border">
            <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center font-display font-bold text-sm text-foreground mb-3">
              {s.step}
            </div>
            <div className="font-display font-bold text-sm text-foreground">{s.title}</div>
            <div className="text-xs text-muted-foreground mt-1">{s.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
