import { useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Bitcoin, Copy, Loader2, Check, ArrowDownLeft } from 'lucide-react';
import { CRYPTO_OPTIONS, getCryptoOption, usdToCrypto, formatCrypto } from '@/lib/payments/crypto';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAdminSettings, useDepositRequests } from '@/hooks/use-game-data';
import { useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '@/stores/app-store';
import { playSound } from '@/lib/sounds';
import { notify } from '@/stores/notifications-store';

type Step = 'choose' | 'pay' | 'confirm';

export default function DepositCrypto() {
  const { user } = useAppStore();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: settings } = useAdminSettings();
  const { data: deposits } = useDepositRequests();

  const [code, setCode] = useState('BTC');
  const [amount, setAmount] = useState('100');
  const [txHash, setTxHash] = useState('');
  const [step, setStep] = useState<Step>('choose');
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  const opt = useMemo(() => getCryptoOption(code)!, [code]);
  const address = settings?.find((s) => s.key === opt.settingKey)?.value || '';
  const cryptoAmount = useMemo(() => usdToCrypto(parseFloat(amount) || 0, code), [amount, code]);

  const copy = async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const submit = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return toast({ title: 'Invalid amount', variant: 'destructive' });
    setSubmitting(true);
    const { error } = await supabase.from('deposit_requests').insert([{
      user_id: user!.id,
      method: 'crypto',
      currency: 'USD',
      amount: amt,
      crypto_currency: code,
      tx_hash: txHash || null,
    }]);
    setSubmitting(false);
    if (error) return toast({ title: 'Error', description: error.message, variant: 'destructive' });
    toast({ title: 'Deposit submitted', description: 'Pending admin approval.' });
    notify({ type: 'wallet', title: 'Deposit Pending', desc: `${code} deposit of $${amt.toFixed(2)} submitted for review.` });
    setTxHash('');
    setStep('choose');
    playSound('coin');
    qc.invalidateQueries({ queryKey: ['deposit-requests'] });
  };

  return (
    <div className="space-y-4">
      {/* Step 1 — choose currency + amount */}
      {step === 'choose' && (
        <>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Currency</label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-2">
              {CRYPTO_OPTIONS.map((c) => (
                <button
                  key={c.code}
                  onClick={() => setCode(c.code)}
                  className={`p-2 rounded-lg text-xs font-bold transition-all ${code === c.code ? 'gradient-primary text-foreground neon-glow-blue' : 'bg-elevated border border-border text-muted-foreground hover:border-neon-blue/40'}`}
                  title={`${c.name} · ${c.network}`}
                >
                  <div className="font-mono">{c.code.replace('_', ' ')}</div>
                  <div className="text-[9px] opacity-70 mt-0.5">{c.network}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Amount (USD)</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1 w-full px-4 py-3 rounded-xl bg-void border border-border text-foreground font-mono text-lg focus:border-neon-blue focus:outline-none" />
            <div className="flex gap-2 mt-2">
              {[50, 100, 500, 1000, 5000].map((v) => (
                <button key={v} onClick={() => setAmount(String(v))} className="px-3 py-1 rounded-lg text-xs font-bold bg-elevated border border-border text-foreground hover:border-neon-blue/30">${v}</button>
              ))}
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              ≈ <span className="font-mono text-foreground">{formatCrypto(cryptoAmount, code)} {code.split('_')[0]}</span>
            </div>
          </div>

          <button
            onClick={() => setStep('pay')}
            disabled={!parseFloat(amount)}
            className="w-full py-3 rounded-xl font-bold gradient-primary text-foreground neon-glow-blue disabled:opacity-50"
          >
            Continue
          </button>
        </>
      )}

      {/* Step 2 — pay */}
      {step === 'pay' && (
        <>
          <div className="flex items-center justify-between">
            <button onClick={() => setStep('choose')} className="text-xs font-bold text-muted-foreground hover:text-foreground">← Back</button>
            <div className="text-xs text-muted-foreground">Step 2 of 3</div>
          </div>

          {!address ? (
            <div className="p-6 rounded-xl bg-void border border-glow-red/40 text-center">
              <Bitcoin className="w-10 h-10 text-glow-red mx-auto mb-2" />
              <div className="font-bold text-glow-red mb-1">No deposit address configured</div>
              <div className="text-xs text-muted-foreground">Ask an admin to set <span className="font-mono">{opt.settingKey}</span> in admin settings.</div>
            </div>
          ) : (
            <>
              <div className="p-4 rounded-xl bg-white flex items-center justify-center">
                <QRCodeSVG value={address} size={180} bgColor="#ffffff" fgColor="#000000" />
              </div>
              <div className="p-3 rounded-xl bg-void border border-border">
                <div className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Send {opt.name} ({opt.network})</div>
                <div className="flex items-center gap-2">
                  <div className="font-mono text-xs text-foreground break-all flex-1">{address}</div>
                  <button onClick={copy} className="p-2 rounded-lg bg-elevated border border-border hover:border-neon-blue/40">
                    {copied ? <Check className="w-4 h-4 text-glow-green" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
                  </button>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-elevated border border-border text-center">
                <div className="text-xs text-muted-foreground">Amount to send</div>
                <div className="font-mono font-extrabold text-2xl text-glow-gold mt-1">
                  {formatCrypto(cryptoAmount, code)} {code.split('_')[0]}
                </div>
                <div className="text-xs text-muted-foreground mt-1">≈ ${parseFloat(amount).toFixed(2)} USD</div>
              </div>
              <button onClick={() => setStep('confirm')} className="w-full py-3 rounded-xl font-bold gradient-primary text-foreground neon-glow-blue">
                I've sent the payment
              </button>
            </>
          )}
        </>
      )}

      {/* Step 3 — confirm */}
      {step === 'confirm' && (
        <>
          <div className="flex items-center justify-between">
            <button onClick={() => setStep('pay')} className="text-xs font-bold text-muted-foreground hover:text-foreground">← Back</button>
            <div className="text-xs text-muted-foreground">Step 3 of 3</div>
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Transaction hash (optional)</label>
            <input value={txHash} onChange={(e) => setTxHash(e.target.value)} placeholder="0x..." className="mt-1 w-full px-4 py-3 rounded-xl bg-void border border-border text-foreground font-mono text-sm focus:border-neon-blue focus:outline-none" />
            <div className="text-xs text-muted-foreground mt-2">Providing the tx hash speeds up admin approval.</div>
          </div>
          <button onClick={submit} disabled={submitting} className="w-full py-3 rounded-xl font-bold gradient-primary text-foreground neon-glow-blue disabled:opacity-50 flex items-center justify-center gap-2">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowDownLeft className="w-4 h-4" />} Submit Deposit
          </button>
        </>
      )}

      {/* Recent */}
      {(deposits?.length ?? 0) > 0 && (
        <div className="space-y-2 pt-2">
          <div className="text-xs font-bold text-muted-foreground uppercase">Your deposits</div>
          {deposits!.slice(0, 5).map((d) => (
            <div key={d.id} className="flex justify-between text-xs py-2 border-b border-border/50">
              <span className="text-foreground">{d.method}{d.crypto_currency ? ` (${d.crypto_currency})` : ''} ${Number(d.amount).toFixed(2)}</span>
              <span className={`font-bold ${d.status === 'approved' ? 'text-glow-green' : d.status === 'rejected' ? 'text-glow-red' : 'text-glow-gold'}`}>{d.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
