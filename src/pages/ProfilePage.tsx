import { useState } from 'react';
import { useAppStore } from '@/stores/app-store';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  User,
  Shield,
  Mail,
  Key,
  Smartphone,
  Globe,
  Edit,
  Heart,
  Clock,
  AlertTriangle,
  Check,
} from 'lucide-react';

export default function ProfilePage() {
  const { profile, user, setProfile } = useAppStore();
  const { toast } = useToast();

  const [editingName, setEditingName] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [savingName, setSavingName] = useState(false);

  const [showPwd, setShowPwd] = useState(false);
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [savingPwd, setSavingPwd] = useState(false);

  const [twoFAOpen, setTwoFAOpen] = useState(false);

  // Responsible gaming local-state limits (would be persisted server-side in a future iteration).
  const [depositLimit, setDepositLimit] = useState('');
  const [sessionLimit, setSessionLimit] = useState('');
  const [coolingPeriod, setCoolingPeriod] = useState<'24h' | '7d' | '30d' | ''>('');

  const saveDisplayName = async () => {
    if (!user) return;
    setSavingName(true);
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: displayName })
      .eq('user_id', user.id);
    setSavingName(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    setProfile(profile ? { ...profile, display_name: displayName } : null);
    setEditingName(false);
    toast({ title: 'Profile updated' });
  };

  const updatePassword = async () => {
    if (newPwd.length < 8) {
      toast({ title: 'Password too short', description: 'Minimum 8 characters.', variant: 'destructive' });
      return;
    }
    if (newPwd !== confirmPwd) {
      toast({ title: "Passwords don't match", variant: 'destructive' });
      return;
    }
    setSavingPwd(true);
    const { error } = await supabase.auth.updateUser({ password: newPwd });
    setSavingPwd(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    setNewPwd('');
    setConfirmPwd('');
    setShowPwd(false);
    toast({ title: 'Password updated' });
  };

  const applyResponsibleGaming = () => {
    const parts: string[] = [];
    if (depositLimit) parts.push(`deposit cap $${depositLimit}/day`);
    if (sessionLimit) parts.push(`session cap ${sessionLimit} min`);
    if (coolingPeriod) parts.push(`cool-off ${coolingPeriod}`);
    if (parts.length === 0) {
      toast({ title: 'Nothing to apply', description: 'Set at least one limit.', variant: 'destructive' });
      return;
    }
    toast({ title: 'Limits saved locally', description: parts.join(' · ') });
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto animate-fade-in">
      <div className="flex items-center gap-2">
        <User className="w-6 h-6 text-primary" />
        <h1 className="font-display font-extrabold text-2xl text-foreground">Profile & Security</h1>
      </div>

      {/* Header card */}
      <div className="p-6 rounded-2xl bg-surface border border-border flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-elevated border-2 border-primary flex items-center justify-center">
          <User className="w-8 h-8 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          {editingName ? (
            <div className="flex gap-2 items-center">
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-void border border-border text-foreground text-sm focus:border-neon-blue focus:outline-none flex-1"
                placeholder="Display name"
              />
              <button
                onClick={saveDisplayName}
                disabled={savingName}
                className="px-3 py-1.5 rounded-lg text-xs font-bold gradient-primary text-foreground disabled:opacity-50"
              >
                <Check className="w-3 h-3 inline" />
              </button>
              <button
                onClick={() => {
                  setEditingName(false);
                  setDisplayName(profile?.display_name ?? '');
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-elevated border border-border text-foreground"
              >
                Cancel
              </button>
            </div>
          ) : (
            <>
              <div className="font-display font-bold text-lg text-foreground truncate">
                {profile?.display_name ?? 'Player'}
              </div>
              <div className="text-sm text-muted-foreground truncate">@{profile?.username ?? 'anonymous'}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Level {profile?.level ?? 1} • {profile?.xp ?? 0} XP
              </div>
            </>
          )}
        </div>
        {!editingName && (
          <button
            onClick={() => setEditingName(true)}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-elevated border border-border text-foreground hover:border-neon-blue/30"
          >
            <Edit className="w-3 h-3 inline mr-1" /> Edit
          </button>
        )}
      </div>

      {/* Security */}
      <section className="space-y-3">
        <h2 className="font-display font-bold text-sm uppercase tracking-wider text-muted-foreground">
          Security
        </h2>

        <div className="p-4 rounded-xl bg-surface border border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-muted-foreground" />
              <div>
                <div className="font-bold text-sm text-foreground">Email</div>
                <div className="text-xs text-muted-foreground">{user?.email ?? 'Not set'}</div>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neon-green/10 text-glow-green">
              Verified
            </span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-surface border border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Key className="w-5 h-5 text-muted-foreground" />
              <div>
                <div className="font-bold text-sm text-foreground">Password</div>
                <div className="text-xs text-muted-foreground">Change your login password</div>
              </div>
            </div>
            <button
              onClick={() => setShowPwd((v) => !v)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-elevated border border-border text-foreground hover:border-neon-blue/30"
            >
              {showPwd ? 'Close' : 'Change'}
            </button>
          </div>
          {showPwd && (
            <div className="mt-3 pt-3 border-t border-border space-y-2">
              <input
                type="password"
                placeholder="New password (min 8 chars)"
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-void border border-border text-foreground text-sm focus:border-neon-blue focus:outline-none"
              />
              <input
                type="password"
                placeholder="Confirm new password"
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-void border border-border text-foreground text-sm focus:border-neon-blue focus:outline-none"
              />
              <button
                onClick={updatePassword}
                disabled={savingPwd}
                className="w-full py-2 rounded-lg text-xs font-bold gradient-primary text-foreground disabled:opacity-50"
              >
                {savingPwd ? 'Updating…' : 'Update password'}
              </button>
            </div>
          )}
        </div>

        <div className="p-4 rounded-xl bg-surface border border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Smartphone className="w-5 h-5 text-muted-foreground" />
              <div>
                <div className="font-bold text-sm text-foreground">Two-Factor Authentication</div>
                <div className="text-xs text-muted-foreground">Authenticator app (TOTP)</div>
              </div>
            </div>
            <button
              onClick={() => setTwoFAOpen((v) => !v)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-elevated border border-border text-foreground hover:border-neon-blue/30"
            >
              {twoFAOpen ? 'Close' : 'Enable'}
            </button>
          </div>
          {twoFAOpen && (
            <div className="mt-3 pt-3 border-t border-border">
              <div className="flex items-start gap-3">
                <div className="w-32 h-32 rounded-lg bg-foreground p-2 flex items-center justify-center shrink-0">
                  <div className="w-full h-full grid grid-cols-8 gap-0.5">
                    {Array.from({ length: 64 }).map((_, i) => (
                      <div
                        key={i}
                        className={`${(i * 13 + 7) % 3 === 0 ? 'bg-foreground' : 'bg-background'}`}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex-1 text-xs space-y-2">
                  <div className="text-muted-foreground">
                    Scan with Google Authenticator, Authy, or 1Password, then enter the 6-digit code below.
                  </div>
                  <input
                    placeholder="000000"
                    maxLength={6}
                    inputMode="numeric"
                    className="w-full px-3 py-2 rounded-lg bg-void border border-border text-foreground text-center font-mono text-lg tracking-[0.4em] focus:border-neon-blue focus:outline-none"
                  />
                  <button
                    onClick={() =>
                      toast({
                        title: '2FA setup pending',
                        description: 'TOTP enrollment will activate once the backend handler is wired.',
                      })
                    }
                    className="w-full py-2 rounded-lg text-xs font-bold gradient-primary text-foreground"
                  >
                    Verify & enable
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 rounded-xl bg-surface border border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Globe className="w-5 h-5 text-muted-foreground" />
            <div>
              <div className="font-bold text-sm text-foreground">Active sessions</div>
              <div className="text-xs text-muted-foreground">This device</div>
            </div>
          </div>
          <button
            onClick={async () => {
              await supabase.auth.signOut({ scope: 'others' });
              toast({ title: 'Other sessions signed out' });
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-elevated border border-border text-foreground hover:border-neon-blue/30"
          >
            Sign out others
          </button>
        </div>
      </section>

      {/* Responsible Gaming */}
      <section className="space-y-3">
        <h2 className="font-display font-bold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Heart className="w-4 h-4" /> Responsible Gaming
        </h2>
        <div className="p-5 rounded-2xl bg-surface border border-border space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Daily deposit limit
              </label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  $
                </span>
                <input
                  type="number"
                  value={depositLimit}
                  onChange={(e) => setDepositLimit(e.target.value)}
                  placeholder="500"
                  className="w-full pl-7 pr-3 py-2 rounded-lg bg-void border border-border text-foreground text-sm focus:border-neon-blue focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Session timeout (min)
              </label>
              <div className="relative mt-1">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  type="number"
                  value={sessionLimit}
                  onChange={(e) => setSessionLimit(e.target.value)}
                  placeholder="60"
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-void border border-border text-foreground text-sm focus:border-neon-blue focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Cool-off period
              </label>
              <select
                value={coolingPeriod}
                onChange={(e) => setCoolingPeriod(e.target.value as '' | '24h' | '7d' | '30d')}
                className="mt-1 w-full px-3 py-2 rounded-lg bg-void border border-border text-foreground text-sm focus:border-neon-blue focus:outline-none"
              >
                <option value="">None</option>
                <option value="24h">24 hours</option>
                <option value="7d">7 days</option>
                <option value="30d">30 days</option>
              </select>
            </div>
          </div>
          <button
            onClick={applyResponsibleGaming}
            className="px-4 py-2 rounded-xl text-xs font-bold gradient-primary text-foreground"
          >
            Apply limits
          </button>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            If gambling is no longer fun, take a break. Find help: BeGambleAware (UK), Gamblers Anonymous,
            or call the National Council on Problem Gambling at <span className="font-mono">1-800-522-4700</span>.
          </p>
        </div>
      </section>

      {/* Danger zone */}
      <section className="space-y-3">
        <div className="p-4 rounded-xl bg-neon-red/5 border border-neon-red/20">
          <h3 className="font-display font-bold text-sm text-glow-red flex items-center gap-2">
            <Shield className="w-4 h-4" /> Danger Zone
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Self-exclude or permanently deactivate your account.
          </p>
          <div className="flex gap-2 mt-3 flex-wrap">
            <button
              onClick={() =>
                toast({
                  title: 'Self-exclusion request received',
                  description: 'A team member will confirm within 24 hours.',
                })
              }
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-neon-red/10 text-glow-red border border-neon-red/20 hover:bg-neon-red/20"
            >
              <AlertTriangle className="w-3 h-3 inline mr-1" /> Self-Exclude
            </button>
            <button
              onClick={() =>
                toast({
                  title: 'Deactivation request received',
                  description: 'Account will be deactivated after pending withdrawals settle.',
                })
              }
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-elevated border border-border text-muted-foreground hover:text-foreground"
            >
              Deactivate Account
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
