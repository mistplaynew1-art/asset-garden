/**
 * Responsible Gaming Modal
 * 
 * Legal/compliance requirement for any real casino.
 * Provides tools for:
 * - Deposit limits (daily/weekly/monthly)
 * - Session time limits
 * - Loss limits
 * - Cool-off periods
 * - Self-exclusion
 * - Reality checks
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Clock, DollarSign, Ban, AlertTriangle, Timer } from 'lucide-react';
import { useAppStore } from '@/stores/app-store';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  onClose: () => void;
}

type LimitType = 'deposit_daily' | 'deposit_weekly' | 'deposit_monthly' | 'loss_daily' | 'loss_weekly' | 'session_time';

export default function ResponsibleGamingModal({ open, onClose }: Props) {
  const { user } = useAppStore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [limits, setLimits] = useState<Record<LimitType, string>>({
    deposit_daily: '',
    deposit_weekly: '',
    deposit_monthly: '',
    loss_daily: '',
    loss_weekly: '',
    session_time: '',
  });
  const [coolOffDays, setCoolOffDays] = useState<number>(0);
  const [selfExcludeDays, setSelfExcludeDays] = useState<number>(0);
  const [realityCheckMinutes, setRealityCheckMinutes] = useState<number>(0);

  const handleSetLimit = async (type: LimitType, value: string) => {
    if (!user) return;
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0) {
      toast({ title: 'Invalid value', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { error } = await (supabase as any).from("responsible_gaming").upsert({
        user_id: user.id,
        [type]: numValue,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

      if (error) throw error;
      toast({ title: 'Limit set successfully' });
    } catch (err) {
      toast({ title: 'Failed to set limit', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleCoolOff = async (days: number) => {
    if (!user || days <= 0) return;
    setLoading(true);
    try {
      const coolOffUntil = new Date();
      coolOffUntil.setDate(coolOffUntil.getDate() + days);

      const { error } = await (supabase as any).from("responsible_gaming").upsert({
        user_id: user.id,
        cool_off_until: coolOffUntil.toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

      if (error) throw error;
      toast({ title: `Cool-off period set for ${days} day${days > 1 ? 's' : ''}` });
      setCoolOffDays(0);
    } catch (err) {
      toast({ title: 'Failed to set cool-off', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSelfExclude = async (days: number) => {
    if (!user || days <= 0) return;
    setLoading(true);
    try {
      const selfExcludedUntil = new Date();
      selfExcludedUntil.setDate(selfExcludedUntil.getDate() + days);

      const { error } = await (supabase as any).from("responsible_gaming").upsert({
        user_id: user.id,
        self_excluded_until: selfExcludedUntil.toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

      if (error) throw error;
      toast({ title: `Self-exclusion set for ${days} days. This cannot be undone.`, variant: 'destructive' });
      setSelfExcludeDays(0);
    } catch (err) {
      toast({ title: 'Failed to set self-exclusion', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleRealityCheck = async (minutes: number) => {
    if (!user || minutes <= 0) return;
    setLoading(true);
    try {
      const { error } = await (supabase as any).from("responsible_gaming").upsert({
        user_id: user.id,
        session_time_limit_minutes: minutes,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

      if (error) throw error;
      toast({ title: `Reality check set for every ${minutes} minutes` });
      setRealityCheckMinutes(0);
    } catch (err) {
      toast({ title: 'Failed to set reality check', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-surface border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-border flex items-center gap-3">
              <Shield className="w-6 h-6 text-neon-blue" />
              <h2 className="text-xl font-bold font-display">Responsible Gambling</h2>
            </div>

            <div className="p-6 space-y-6">
              {/* Warning Banner */}
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-amber-500">Gambling can be addictive</p>
                  <p className="text-muted-foreground mt-1">
                    Please gamble responsibly. Only bet what you can afford to lose.
                    If you feel gambling is becoming a problem, please seek help.
                  </p>
                </div>
              </div>

              {/* Deposit Limits */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign className="w-5 h-5 text-neon-green" />
                  <h3 className="font-bold font-display">Deposit Limits</h3>
                </div>
                <div className="grid sm:grid-cols-3 gap-3">
                  {(['daily', 'weekly', 'monthly'] as const).map((period) => (
                    <div key={period} className="bg-void rounded-lg p-3 border border-border">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-2">
                        {period} Limit
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          placeholder="$0"
                          className="flex-1 bg-surface border border-border rounded px-2 py-1.5 text-sm"
                          value={limits[`deposit_${period}`]}
                          onChange={(e) => setLimits((prev) => ({ ...prev, [`deposit_${period}`]: e.target.value }))}
                        />
                        <button
                          onClick={() => handleSetLimit(`deposit_${period}`, limits[`deposit_${period}`])}
                          disabled={loading}
                          className="px-3 py-1.5 bg-primary/20 border border-primary/40 rounded text-primary text-xs font-bold hover:bg-primary/30 transition-colors disabled:opacity-50"
                        >
                          Set
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Loss Limits */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Ban className="w-5 h-5 text-neon-red" />
                  <h3 className="font-bold font-display">Loss Limits</h3>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  {(['daily', 'weekly'] as const).map((period) => (
                    <div key={period} className="bg-void rounded-lg p-3 border border-border">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-2">
                        Max {period} Loss
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          placeholder="$0"
                          className="flex-1 bg-surface border border-border rounded px-2 py-1.5 text-sm"
                          value={limits[`loss_${period}`]}
                          onChange={(e) => setLimits((prev) => ({ ...prev, [`loss_${period}`]: e.target.value }))}
                        />
                        <button
                          onClick={() => handleSetLimit(`loss_${period}`, limits[`loss_${period}`])}
                          disabled={loading}
                          className="px-3 py-1.5 bg-neon-red/20 border border-neon-red/40 rounded text-neon-red text-xs font-bold hover:bg-neon-red/30 transition-colors disabled:opacity-50"
                        >
                          Set
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Session Time Limit */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Timer className="w-5 h-5 text-neon-purple" />
                  <h3 className="font-bold font-display">Session Time Limit</h3>
                </div>
                <div className="bg-void rounded-lg p-3 border border-border">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-2">
                    Auto-logout after (minutes)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="60"
                      className="flex-1 bg-surface border border-border rounded px-2 py-1.5 text-sm"
                      value={limits.session_time}
                      onChange={(e) => setLimits((prev) => ({ ...prev, session_time: e.target.value }))}
                    />
                    <button
                      onClick={() => handleSetLimit('session_time', limits.session_time)}
                      disabled={loading}
                      className="px-3 py-1.5 bg-neon-purple/20 border border-neon-purple/40 rounded text-neon-purple text-xs font-bold hover:bg-neon-purple/30 transition-colors disabled:opacity-50"
                    >
                      Set
                    </button>
                  </div>
                </div>
              </section>

              {/* Reality Check */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-5 h-5 text-neon-blue" />
                  <h3 className="font-bold font-display">Reality Check</h3>
                </div>
                <div className="bg-void rounded-lg p-3 border border-border">
                  <p className="text-sm text-muted-foreground mb-3">
                    Receive a popup reminder showing your session stats every X minutes.
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {[15, 30, 60, 120].map((mins) => (
                      <button
                        key={mins}
                        onClick={() => handleRealityCheck(mins)}
                        disabled={loading}
                        className="px-3 py-1.5 bg-surface border border-border rounded text-sm hover:border-neon-blue/50 transition-colors disabled:opacity-50"
                      >
                        {mins}m
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              {/* Cool Off */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-5 h-5 text-yellow-500" />
                  <h3 className="font-bold font-display">Cool-Off Period</h3>
                </div>
                <div className="bg-void rounded-lg p-3 border border-border">
                  <p className="text-sm text-muted-foreground mb-3">
                    Take a short break. You won't be able to login until the period expires.
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {[1, 3, 7].map((days) => (
                      <button
                        key={days}
                        onClick={() => handleCoolOff(days)}
                        disabled={loading}
                        className="px-3 py-1.5 bg-yellow-500/20 border border-yellow-500/40 rounded text-yellow-500 text-sm font-bold hover:bg-yellow-500/30 transition-colors disabled:opacity-50"
                      >
                        {days} day{days > 1 ? 's' : ''}
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              {/* Self Exclusion */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Ban className="w-5 h-5 text-neon-red" />
                  <h3 className="font-bold font-display text-neon-red">Self-Exclusion</h3>
                </div>
                <div className="bg-neon-red/5 border border-neon-red/30 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground mb-3">
                    <strong className="text-neon-red">Warning:</strong> Self-exclusion blocks your account for the
                    entire duration and cannot be undone. Please consider this carefully.
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {[30, 90, 180, 365].map((days) => (
                      <button
                        key={days}
                        onClick={() => handleSelfExclude(days)}
                        disabled={loading}
                        className="px-3 py-1.5 bg-neon-red/20 border border-neon-red/40 rounded text-neon-red text-sm font-bold hover:bg-neon-red/30 transition-colors disabled:opacity-50"
                      >
                        {days} days
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              {/* Help Resources */}
              <div className="text-center pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground mb-2">Need help?</p>
                <div className="flex justify-center gap-4 text-sm">
                  <a href="https://www.begambleaware.org" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    BeGambleAware
                  </a>
                  <a href="https://www.gamblersanonymous.org" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    Gamblers Anonymous
                  </a>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-border flex justify-end">
              <button
                onClick={onClose}
                className="px-6 py-2 bg-surface border border-border rounded-lg font-bold hover:bg-void transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}