import { useState } from 'react';
import { useAppStore } from '@/stores/app-store';
import { Wallet, ArrowUpRight, ArrowDownLeft, Clock, CreditCard, Bitcoin } from 'lucide-react';
import { useUserTransactions } from '@/hooks/use-game-data';
import TestCreditButton from '@/components/casino/TestCreditButton';
import DepositCrypto from '@/components/wallet/DepositCrypto';
import DepositCard from '@/components/wallet/DepositCard';
import WithdrawCrypto from '@/components/wallet/WithdrawCrypto';

export default function WalletPage() {
  const { balances, totalUsd, isAuthenticated } = useAppStore();
  const [tab, setTab] = useState<'deposit' | 'withdraw' | 'history'>('deposit');
  const [method, setMethod] = useState<'card' | 'crypto'>('crypto');
  const { data: txs } = useUserTransactions();

  if (!isAuthenticated) {
    return (
      <div className="text-center py-16">
        <Wallet className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <div className="font-display font-bold text-foreground">Sign in to access your wallet</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center gap-2">
        <Wallet className="w-6 h-6 text-primary" />
        <h1 className="font-display font-extrabold text-2xl text-foreground">Wallet</h1>
      </div>

      <div className="p-6 rounded-2xl bg-surface border border-border text-center">
        <div className="text-sm text-muted-foreground mb-1">Total Balance</div>
        <div className="font-mono font-extrabold text-4xl text-glow-green">${totalUsd.toFixed(2)}</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4 max-w-md mx-auto">
          {balances.map((b) => (
            <div key={b.id} className="p-2 rounded-lg bg-elevated border border-border">
              <div className="text-[10px] text-muted-foreground">{b.currency}</div>
              <div className="font-mono font-bold text-sm text-foreground">{b.balance.toFixed(2)}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 max-w-sm mx-auto space-y-2">
          <TestCreditButton amount={1000} />
          <div className="flex gap-2">
            <TestCreditButton amount={100} variant="compact" className="flex-1 justify-center" />
            <TestCreditButton amount={500} variant="compact" className="flex-1 justify-center" />
            <TestCreditButton amount={5000} variant="compact" className="flex-1 justify-center" />
          </div>
          <div className="text-[10px] text-muted-foreground">Test mode credit — instant, no approval. Capped at $10k per click.</div>
        </div>
      </div>

      <div className="flex gap-2">
        {(['deposit', 'withdraw', 'history'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2 rounded-xl text-sm font-bold capitalize transition-all ${tab === t ? 'gradient-primary text-foreground' : 'bg-surface border border-border text-muted-foreground'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'deposit' && (
        <div className="p-6 rounded-2xl bg-surface border border-border space-y-4">
          <div className="flex gap-2">
            <button onClick={() => setMethod('crypto')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold ${method === 'crypto' ? 'gradient-primary text-foreground' : 'bg-elevated border border-border text-muted-foreground'}`}>
              <Bitcoin className="w-4 h-4" />Crypto
            </button>
            <button onClick={() => setMethod('card')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold ${method === 'card' ? 'gradient-primary text-foreground' : 'bg-elevated border border-border text-muted-foreground'}`}>
              <CreditCard className="w-4 h-4" />Card
            </button>
          </div>
          {method === 'crypto' ? <DepositCrypto /> : <DepositCard />}
        </div>
      )}

      {tab === 'withdraw' && (
        <div className="p-6 rounded-2xl bg-surface border border-border">
          <WithdrawCrypto />
        </div>
      )}

      {tab === 'history' && (
        <div className="p-6 rounded-2xl bg-surface border border-border">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-muted-foreground" />
            <h3 className="font-display font-bold text-lg text-foreground">Transaction History</h3>
          </div>
          {!txs?.length ? (
            <div className="text-center py-8 text-muted-foreground text-sm">No transactions yet.</div>
          ) : (
            <div className="space-y-2">
              {txs.map((tx) => {
                const positive = Number(tx.amount) > 0;
                return (
                  <div key={tx.id} className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${positive ? 'bg-neon-green/10' : 'bg-neon-red/10'}`}>
                        {positive ? <ArrowDownLeft className="w-4 h-4 text-glow-green" /> : <ArrowUpRight className="w-4 h-4 text-glow-red" />}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-foreground capitalize">{tx.type.replace('_', ' ')}</div>
                        <div className="text-[10px] text-muted-foreground">{tx.description} · {tx.created_at ? new Date(tx.created_at).toLocaleString() : ''}</div>
                      </div>
                    </div>
                    <div className={`font-mono font-bold text-sm ${positive ? 'text-glow-green' : 'text-glow-red'}`}>
                      {positive ? '+' : ''}{Number(tx.amount).toFixed(2)} USD
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
