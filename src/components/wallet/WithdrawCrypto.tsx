import { useMemo, useState } from 'react';
import { ArrowUpRight, Loader2, AlertTriangle } from 'lucide-react';
import { CRYPTO_OPTIONS, getCryptoOption, usdToCrypto, formatCrypto } from '@/lib/payments/crypto';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAppStore } from '@/stores/app-store';
import { useWithdrawalRequests } from '@/hooks/use-game-data';
import { useQueryClient } from '@tanstack/react-query';
import { notify } from '@/stores/notifications-store';

type WMethod = 'crypto' | 'card' | 'bank';

export default function WithdrawCrypto() {
  const { totalUsd } = useAppStore();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: withdrawals } = useWithdrawalRequests();
  const [method, setMethod] = useState<WMethod>('crypto');
  const [code, setCode] = useState('BTC');
  const [amount, setAmount] = useState('100');
  const [destination, setDestination] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const opt = useMemo(() => getCryptoOption(code)!, [code]);
  const cryptoAmount = useMemo(() => usdToCrypto(parseFloat(amount) || 0, code), [amount, code]);
  const addressValid = method !== 'crypto' || (destination ? opt.validate(destination) : true);

  const submit = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return toast({ title: 'Invalid amount', variant: 'destructive' });
    if (!destination.trim()) return toast({ title: 'Destination required', variant: 'destructive' });
    if (method === 'crypto' && !opt.validate(destination)) {
      return toast({ title: 'Invalid address', description: `Address does not match ${opt.network} format.`, variant: 'destructive' });
    }
    if (amt > totalUsd) return toast({ title: 'Insufficient balance', variant: 'destructive' });

    setSubmitting(true);
    const { data, error } = await supabase.rpc('request_withdrawal', {
      p_method: method,
      p_amount: amt,
      p_destination: destination,
      p_crypto_currency: method === 'crypto' ? code : undefined,
    });
    setSubmitting(false);
    const result = data as { error?: string; ok?: boolean } | null;
    if (error || result?.error) return toast({ title: 'Error', description: result?.error || error?.message, variant: 'destructive' });
    toast({ title: 'Withdrawal requested', description: 'Pending admin approval.' });
    notify({ type: 'wallet', title: 'Withdrawal Pending', desc: `${method === 'crypto' ? code : method.toUpperCase()} withdrawal of $${amt.toFixed(2)} requested.` });
    setDestination('');
    qc.invalidateQueries({ queryKey: ['withdrawal-requests'] });
    qc.invalidateQueries({ queryKey: ['user-transactions'] });
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(['crypto', 'card', 'bank'] as const).map((m) => (
          <button key={m} onClick={() => setMethod(m)} className={`flex-1 py-2 rounded-xl text-sm font-bold capitalize ${method === m ? 'gradient-primary text-foreground' : 'bg-elevated border border-border text-muted-foreground'}`}>{m}</button>
        ))}
      </div>

      <div>
        <label className="text-xs font-bold text-muted-foreground uppercase">Amount (USD)</label>
        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1 w-full px-4 py-3 rounded-xl bg-void border border-border text-foreground font-mono text-lg focus:border-neon-blue focus:outline-none" />
        <div className="text-[10px] text-muted-foreground mt-1">Available: <span className="font-mono text-foreground">${totalUsd.toFixed(2)}</span></div>
      </div>

      {method === 'crypto' && (
        <>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase">Currency</label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-2">
              {CRYPTO_OPTIONS.map((c) => (
                <button key={c.code} onClick={() => setCode(c.code)} className={`p-2 rounded-lg text-xs font-bold ${code === c.code ? 'gradient-primary text-foreground' : 'bg-elevated border border-border text-muted-foreground'}`}>
                  <div className="font-mono">{c.code.replace('_', ' ')}</div>
                  <div className="text-[9px] opacity-70 mt-0.5">{c.network}</div>
                </button>
              ))}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-elevated border border-border text-center">
            <div className="text-xs text-muted-foreground">You'll receive ≈</div>
            <div className="font-mono font-extrabold text-xl text-glow-gold mt-1">{formatCrypto(cryptoAmount, code)} {code.split('_')[0]}</div>
          </div>
        </>
      )}

      <div>
        <label className="text-xs font-bold text-muted-foreground uppercase">
          {method === 'crypto' ? `${opt.network} address` : method === 'bank' ? 'IBAN / Account' : 'Card number'}
        </label>
        <input value={destination} onChange={(e) => setDestination(e.target.value)} className={`mt-1 w-full px-4 py-3 rounded-xl bg-void border ${addressValid ? 'border-border' : 'border-glow-red/60'} text-foreground font-mono text-sm focus:border-neon-blue focus:outline-none`} />
        {!addressValid && (
          <div className="flex items-center gap-1 text-xs text-glow-red mt-1">
            <AlertTriangle className="w-3 h-3" /> Invalid {opt.network} address format.
          </div>
        )}
      </div>

      <button onClick={submit} disabled={submitting || !addressValid} className="w-full py-3 rounded-xl font-bold bg-elevated border border-border text-foreground hover:border-neon-blue/30 disabled:opacity-50 flex items-center justify-center gap-2">
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUpRight className="w-4 h-4" />} Request Withdrawal
      </button>

      {(withdrawals?.length ?? 0) > 0 && (
        <div className="space-y-2 pt-2">
          <div className="text-xs font-bold text-muted-foreground uppercase">Your withdrawals</div>
          {withdrawals!.slice(0, 5).map((w) => (
            <div key={w.id} className="flex justify-between text-xs py-2 border-b border-border/50">
              <span className="text-foreground">{w.method}{w.crypto_currency ? ` (${w.crypto_currency})` : ''} ${Number(w.amount).toFixed(2)}</span>
              <span className={`font-bold ${w.status === 'paid' ? 'text-glow-green' : w.status === 'rejected' ? 'text-glow-red' : 'text-glow-gold'}`}>{w.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
