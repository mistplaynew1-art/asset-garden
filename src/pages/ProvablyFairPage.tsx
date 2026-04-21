import { useState } from 'react';
import { Shield, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { verifyRound, verifyDiceRound, verifyCrashRound } from '@/lib/provably-fair/verify';

type Mode = 'generic' | 'dice' | 'crash';

export default function ProvablyFairPage() {
  const [mode, setMode] = useState<Mode>('generic');
  const [serverSeed, setServerSeed] = useState('');
  const [serverSeedHash, setServerSeedHash] = useState('');
  const [clientSeed, setClientSeed] = useState('');
  const [nonce, setNonce] = useState('0');
  const [result, setResult] = useState<{ valid: boolean; outcome?: number; roll?: number; crashPoint?: number; serverSeedValid?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    setResult(null);
    const params = { serverSeed, serverSeedHash, clientSeed, nonce: parseInt(nonce) || 0 };
    try {
      if (mode === 'dice') setResult(await verifyDiceRound(params));
      else if (mode === 'crash') setResult(await verifyCrashRound(params));
      else setResult(await verifyRound(params));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto animate-fade-in">
      <div className="flex items-center gap-2">
        <Shield className="w-6 h-6 text-primary" />
        <h1 className="font-display font-extrabold text-2xl text-foreground">Provably Fair Verifier</h1>
      </div>

      <div className="p-6 rounded-2xl bg-surface border border-border space-y-4">
        <div className="text-sm text-muted-foreground">
          Every game round is generated using HMAC-SHA256 of (clientSeed:nonce) keyed by a serverSeed whose SHA-256 hash is published before the round. Paste the values from your round to reproduce the outcome and verify it was not tampered with.
        </div>

        <div className="flex gap-2">
          {(['generic', 'dice', 'crash'] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)} className={`flex-1 py-2 rounded-xl text-sm font-bold capitalize ${mode === m ? 'gradient-primary text-foreground' : 'bg-elevated border border-border text-muted-foreground'}`}>
              {m}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="text-xs font-bold text-muted-foreground uppercase">Server seed</label>
            <input value={serverSeed} onChange={(e) => setServerSeed(e.target.value)} placeholder="hex string" className="mt-1 w-full px-3 py-2 rounded-lg bg-void border border-border text-foreground text-sm font-mono focus:border-neon-blue focus:outline-none" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-bold text-muted-foreground uppercase">Server seed hash (published before round)</label>
            <input value={serverSeedHash} onChange={(e) => setServerSeedHash(e.target.value)} placeholder="sha256 hex" className="mt-1 w-full px-3 py-2 rounded-lg bg-void border border-border text-foreground text-sm font-mono focus:border-neon-blue focus:outline-none" />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase">Client seed</label>
            <input value={clientSeed} onChange={(e) => setClientSeed(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-lg bg-void border border-border text-foreground text-sm font-mono focus:border-neon-blue focus:outline-none" />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase">Nonce</label>
            <input value={nonce} onChange={(e) => setNonce(e.target.value)} type="number" className="mt-1 w-full px-3 py-2 rounded-lg bg-void border border-border text-foreground text-sm font-mono focus:border-neon-blue focus:outline-none" />
          </div>
        </div>

        <button onClick={run} disabled={busy || !serverSeed || !serverSeedHash} className="w-full py-3 rounded-xl font-bold gradient-primary text-foreground neon-glow-blue disabled:opacity-50 flex items-center justify-center gap-2">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />} Verify Round
        </button>

        {result && (
          <div className={`p-4 rounded-xl border ${result.valid ? 'bg-neon-green/5 border-neon-green/30' : 'bg-neon-red/5 border-neon-red/30'}`}>
            <div className="flex items-center gap-2 mb-2">
              {result.valid ? <CheckCircle2 className="w-5 h-5 text-glow-green" /> : <XCircle className="w-5 h-5 text-glow-red" />}
              <span className={`font-bold ${result.valid ? 'text-glow-green' : 'text-glow-red'}`}>
                {result.valid ? 'Round verified' : 'Verification failed — server seed does not match published hash'}
              </span>
            </div>
            {result.valid && (
              <div className="space-y-1 text-sm font-mono text-foreground">
                {mode === 'dice' && <div>Roll: <span className="text-glow-gold">{result.roll?.toFixed(2)}</span></div>}
                {mode === 'crash' && <div>Crash point: <span className="text-glow-gold">{result.crashPoint?.toFixed(2)}×</span></div>}
                {mode === 'generic' && <div>Outcome (0-1): <span className="text-glow-gold">{result.outcome?.toFixed(8)}</span></div>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
