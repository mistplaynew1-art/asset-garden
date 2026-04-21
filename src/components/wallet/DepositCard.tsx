import { useState } from 'react';
import { CreditCard, Loader2, ArrowDownLeft, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAppStore } from '@/stores/app-store';
import { useAdminSettings } from '@/hooks/use-game-data';
import { useQueryClient } from '@tanstack/react-query';
import { playSound } from '@/lib/sounds';
import { notify } from '@/stores/notifications-store';

export default function DepositCard() {
  const { user } = useAppStore();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: settings } = useAdminSettings();
  const [amount, setAmount] = useState('100');
  const [card, setCard] = useState('');
  const [exp, setExp] = useState('');
  const [cvc, setCvc] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const checkoutKey = settings?.find((s) => s.key === 'CHECKOUT_PUBLIC_KEY')?.value;
  const configured = !!checkoutKey;

  const submit = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return toast({ title: 'Invalid amount', variant: 'destructive' });
    setSubmitting(true);
    const { error } = await supabase.from('deposit_requests').insert({
      user_id: user!.id,
      method: 'card',
      currency: 'USD',
      amount: amt,
    });
    setSubmitting(false);
    if (error) return toast({ title: 'Error', description: error.message, variant: 'destructive' });
    toast({ title: 'Deposit submitted', description: 'Pending admin approval.' });
    notify({ type: 'wallet', title: 'Deposit Pending', desc: `Card deposit of $${amt.toFixed(2)} submitted.` });
    setCard(''); setExp(''); setCvc('');
    playSound('coin');
    qc.invalidateQueries({ queryKey: ['deposit-requests'] });
  };

  return (
    <div className="space-y-4">
      {!configured && (
        <div className="p-3 rounded-xl bg-glow-gold/10 border border-glow-gold/30 flex gap-2 items-start">
          <AlertTriangle className="w-4 h-4 text-glow-gold mt-0.5 flex-shrink-0" />
          <div className="text-xs text-glow-gold">
            <div className="font-bold">Card processor not configured</div>
            <div className="text-muted-foreground mt-0.5">Test mode — submissions queue for manual admin approval. Set <span className="font-mono">CHECKOUT_PUBLIC_KEY</span> in admin settings to enable live card payments.</div>
          </div>
        </div>
      )}

      <div>
        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Amount (USD)</label>
        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1 w-full px-4 py-3 rounded-xl bg-void border border-border text-foreground font-mono text-lg focus:border-neon-blue focus:outline-none" />
        <div className="flex gap-2 mt-2 flex-wrap">
          {[50, 100, 500, 1000].map((v) => (
            <button key={v} onClick={() => setAmount(String(v))} className="px-3 py-1 rounded-lg text-xs font-bold bg-elevated border border-border text-foreground hover:border-neon-blue/30">${v}</button>
          ))}
        </div>
      </div>

      <div className="p-4 rounded-xl bg-void border border-border space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <CreditCard className="w-4 h-4 text-neon-blue" />
          <span className="text-xs font-bold text-muted-foreground uppercase">Card details</span>
        </div>
        <input
          placeholder="4242 4242 4242 4242"
          value={card}
          onChange={(e) => setCard(e.target.value)}
          maxLength={19}
          className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-foreground text-sm font-mono focus:border-neon-blue focus:outline-none"
        />
        <div className="grid grid-cols-2 gap-2">
          <input placeholder="MM/YY" value={exp} onChange={(e) => setExp(e.target.value)} maxLength={5} className="px-3 py-2 rounded-lg bg-surface border border-border text-foreground text-sm font-mono focus:border-neon-blue focus:outline-none" />
          <input placeholder="CVC" value={cvc} onChange={(e) => setCvc(e.target.value)} maxLength={4} className="px-3 py-2 rounded-lg bg-surface border border-border text-foreground text-sm font-mono focus:border-neon-blue focus:outline-none" />
        </div>
      </div>

      <button onClick={submit} disabled={submitting} className="w-full py-3 rounded-xl font-bold gradient-primary text-foreground neon-glow-blue disabled:opacity-50 flex items-center justify-center gap-2">
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowDownLeft className="w-4 h-4" />} Submit Deposit
      </button>
    </div>
  );
}
