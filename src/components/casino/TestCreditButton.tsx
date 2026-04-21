import { useState } from 'react';
import { Gift, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAppStore } from '@/stores/app-store';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { playSound } from '@/lib/sounds';

interface Props {
  amount?: number;
  variant?: 'default' | 'compact';
  className?: string;
}

/**
 * Adds free test-mode credit to the signed-in user's wallet.
 * Calls public.add_test_credit RPC (max $10k per click, server-validated).
 */
export default function TestCreditButton({ amount = 1000, variant = 'default', className = '' }: Props) {
  const { isAuthenticated, setBalances, balances } = useAppStore();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);

  if (!isAuthenticated) return null;

  const handle = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('add_test_credit', { p_amount: amount });
    setLoading(false);
    const result = data as { ok?: boolean; balance?: number; error?: string } | null;
    if (error || result?.error) {
      toast({ title: 'Failed', description: result?.error ?? error?.message, variant: 'destructive' });
      return;
    }
    // Optimistic refresh
    if (typeof result?.balance === 'number') {
      const next = balances.length
        ? balances.map(b => (b.currency === 'USD' ? { ...b, balance: result.balance!, usd: result.balance! } : b))
        : [{ id: 'usd', currency: 'USD', balance: result.balance, usd: result.balance, icon: '$', color: '#22c55e' }];
      setBalances(next);
    }
    qc.invalidateQueries({ queryKey: ['user-transactions'] });
    playSound('coin');
    toast({ title: `+$${amount} test credit added`, description: 'Use it to try every game risk-free.' });
  };

  if (variant === 'compact') {
    return (
      <button
        onClick={handle}
        disabled={loading}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-neon-gold/15 border border-neon-gold/40 text-glow-gold hover:bg-neon-gold/25 transition-all disabled:opacity-50 ${className}`}
        title="Add test balance"
      >
        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Gift className="w-3 h-3" />}
        +${amount}
      </button>
    );
  }

  return (
    <button
      onClick={handle}
      disabled={loading}
      className={`w-full py-3 rounded-xl font-display font-bold text-sm bg-gradient-to-r from-neon-gold/20 to-neon-gold/10 border border-neon-gold/40 text-glow-gold hover:from-neon-gold/30 hover:to-neon-gold/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${className}`}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gift className="w-4 h-4" />}
      Add ${amount} Test Credit
    </button>
  );
}
