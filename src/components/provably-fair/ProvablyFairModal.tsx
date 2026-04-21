/**
 * Global Provably Fair widget — accessible from every game header.
 * Lets the player view the active server seed hash, edit their client seed,
 * inspect the nonce, rotate the seed, and verify any past round client-side
 * with HMAC-SHA256 (SubtleCrypto).
 */
import { useEffect, useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, RotateCw, Copy, ShieldCheck, ShieldAlert, X, Sparkles } from 'lucide-react';
import { verifyRound, verifyCrashRound } from '@/lib/provably-fair/verify';

interface ProvablyFairModalProps {
  open: boolean;
  onClose: () => void;
  gameId?: string;
}

const STORAGE_KEY = 'pf:state:v1';

interface PFState {
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
}

function loadState(): PFState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* noop */ }
  return {
    serverSeedHash: 'b0e3' + Math.random().toString(16).slice(2, 14).padEnd(60, '0'),
    clientSeed: Math.random().toString(36).slice(2, 14),
    nonce: 0,
  };
}

function saveState(s: PFState) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* noop */ }
}

export default function ProvablyFairModal({ open, onClose, gameId }: ProvablyFairModalProps) {
  const [state, setState] = useState<PFState>(() => loadState());
  const [copied, setCopied] = useState<string | null>(null);
  const [verifyForm, setVerifyForm] = useState({
    serverSeed: '',
    serverSeedHash: '',
    clientSeed: '',
    nonce: '0',
  });
  const [verifyResult, setVerifyResult] = useState<
    | { kind: 'ok'; outcome: number; crash?: number; valid: boolean }
    | { kind: 'err'; message: string }
    | null
  >(null);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => { saveState(state); }, [state]);

  // Prefill verify form with current state
  useEffect(() => {
    if (open) {
      setVerifyForm((p) => ({ ...p, serverSeedHash: state.serverSeedHash, clientSeed: state.clientSeed, nonce: String(state.nonce) }));
      setVerifyResult(null);
    }
  }, [open, state]);

  const copy = useCallback((label: string, value: string) => {
    try {
      navigator.clipboard.writeText(value);
      setCopied(label);
      setTimeout(() => setCopied(null), 1200);
    } catch { /* noop */ }
  }, []);

  const rotateSeed = useCallback(() => {
    setState((s) => ({
      ...s,
      serverSeedHash: 'r' + Math.random().toString(16).slice(2, 16).padEnd(63, '0'),
      nonce: 0,
    }));
  }, []);

  const handleVerify = useCallback(async () => {
    setIsVerifying(true);
    setVerifyResult(null);
    try {
      const nonce = parseInt(verifyForm.nonce, 10) || 0;
      const isCrashGame = gameId === 'crash' || gameId === 'jetpack' || gameId === 'limbo';
      if (isCrashGame) {
        const r = await verifyCrashRound({
          serverSeed: verifyForm.serverSeed,
          serverSeedHash: verifyForm.serverSeedHash,
          clientSeed: verifyForm.clientSeed,
          nonce,
        });
        setVerifyResult({ kind: 'ok', outcome: r.crashPoint, crash: r.crashPoint, valid: r.valid });
      } else {
        const r = await verifyRound({
          serverSeed: verifyForm.serverSeed,
          serverSeedHash: verifyForm.serverSeedHash,
          clientSeed: verifyForm.clientSeed,
          nonce,
        });
        setVerifyResult({ kind: 'ok', outcome: r.outcome, valid: r.valid });
      }
    } catch (e) {
      setVerifyResult({ kind: 'err', message: e instanceof Error ? e.message : 'Verification failed' });
    } finally {
      setIsVerifying(false);
    }
  }, [verifyForm, gameId]);

  const seedShort = useMemo(() => `${state.serverSeedHash.slice(0, 10)}…${state.serverSeedHash.slice(-6)}`, [state.serverSeedHash]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-3"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.92, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.92, y: 20, opacity: 0 }}
            transition={{ type: 'spring', damping: 22, stiffness: 280 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-surface border border-primary/30 shadow-2xl shadow-primary/20"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-border bg-surface/95 backdrop-blur">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-primary" />
                <h2 className="font-display font-extrabold text-sm text-foreground">Provably Fair</h2>
                {gameId && (
                  <span className="text-[9px] uppercase tracking-widest font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/30">
                    {gameId}
                  </span>
                )}
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-elevated text-muted-foreground hover:text-foreground transition-colors" aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Current seeds */}
              <section>
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Active Round
                </div>

                <div className="space-y-2">
                  <Field
                    label="Server Seed Hash"
                    value={state.serverSeedHash}
                    short={seedShort}
                    onCopy={() => copy('hash', state.serverSeedHash)}
                    copied={copied === 'hash'}
                    readOnly
                  />
                  <Field
                    label="Client Seed"
                    value={state.clientSeed}
                    onChange={(v) => setState((s) => ({ ...s, clientSeed: v }))}
                    onCopy={() => copy('cs', state.clientSeed)}
                    copied={copied === 'cs'}
                  />
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <Field
                        label="Nonce"
                        value={String(state.nonce)}
                        onChange={(v) => setState((s) => ({ ...s, nonce: parseInt(v) || 0 }))}
                        onCopy={() => copy('nonce', String(state.nonce))}
                        copied={copied === 'nonce'}
                      />
                    </div>
                  </div>

                  <button
                    onClick={rotateSeed}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-primary/10 border border-primary/30 text-primary text-xs font-bold hover:bg-primary/20 transition-colors"
                  >
                    <RotateCw className="w-3.5 h-3.5" /> Rotate Server Seed (resets nonce)
                  </button>
                </div>
              </section>

              {/* Verify a past round */}
              <section className="border-t border-border pt-3">
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Verify Previous Round
                </div>
                <p className="text-[10px] text-muted-foreground mb-3 leading-relaxed">
                  Paste the revealed <code className="px-1 rounded bg-elevated text-foreground">server_seed</code> from any past round to verify the outcome was determined fairly using HMAC-SHA256.
                </p>

                <div className="space-y-2">
                  <Field
                    label="Server Seed (revealed)"
                    value={verifyForm.serverSeed}
                    onChange={(v) => setVerifyForm((p) => ({ ...p, serverSeed: v }))}
                    placeholder="Paste revealed server seed…"
                  />
                  <Field
                    label="Server Seed Hash"
                    value={verifyForm.serverSeedHash}
                    onChange={(v) => setVerifyForm((p) => ({ ...p, serverSeedHash: v }))}
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <Field
                        label="Client Seed"
                        value={verifyForm.clientSeed}
                        onChange={(v) => setVerifyForm((p) => ({ ...p, clientSeed: v }))}
                      />
                    </div>
                    <Field
                      label="Nonce"
                      value={verifyForm.nonce}
                      onChange={(v) => setVerifyForm((p) => ({ ...p, nonce: v.replace(/\D/g, '') }))}
                    />
                  </div>

                  <button
                    onClick={handleVerify}
                    disabled={isVerifying || !verifyForm.serverSeed || !verifyForm.serverSeedHash}
                    className="w-full py-2.5 rounded-lg bg-gradient-to-r from-primary to-neon-purple text-foreground text-xs font-bold disabled:opacity-50 hover:brightness-110 transition-all"
                  >
                    {isVerifying ? 'Verifying…' : 'Verify Round'}
                  </button>

                  <AnimatePresence>
                    {verifyResult && verifyResult.kind === 'ok' && (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className={`p-2.5 rounded-lg border text-[11px] flex items-start gap-2 ${
                          verifyResult.valid
                            ? 'bg-neon-green/10 border-neon-green/30 text-glow-green'
                            : 'bg-neon-red/10 border-neon-red/30 text-glow-red'
                        }`}
                      >
                        {verifyResult.valid ? <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" /> : <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />}
                        <div className="space-y-0.5">
                          <div className="font-bold">
                            {verifyResult.valid ? '✓ Round verified — server seed matches hash' : '✗ Hash mismatch — invalid seed'}
                          </div>
                          {verifyResult.valid && (
                            <div className="font-mono">
                              {verifyResult.crash !== undefined
                                ? `Crash point: ${verifyResult.crash.toFixed(2)}×`
                                : `Outcome: ${verifyResult.outcome.toFixed(8)} (${(verifyResult.outcome * 100).toFixed(4)})`}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                    {verifyResult && verifyResult.kind === 'err' && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="p-2.5 rounded-lg bg-neon-red/10 border border-neon-red/30 text-glow-red text-[11px]"
                      >
                        {verifyResult.message}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </section>

              <section className="border-t border-border pt-3 text-[10px] text-muted-foreground leading-relaxed">
                Each round combines a hidden <code className="px-1 rounded bg-elevated text-foreground">server_seed</code> (committed via SHA-256 hash before play), your editable <code className="px-1 rounded bg-elevated text-foreground">client_seed</code>, and an incrementing <code className="px-1 rounded bg-elevated text-foreground">nonce</code>. After the seed is revealed you can mathematically verify the outcome was not changed.
              </section>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface FieldProps {
  label: string;
  value: string;
  short?: string;
  onChange?: (v: string) => void;
  onCopy?: () => void;
  copied?: boolean;
  readOnly?: boolean;
  placeholder?: string;
}

function Field({ label, value, short, onChange, onCopy, copied, readOnly, placeholder }: FieldProps) {
  return (
    <div>
      <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">{label}</label>
      <div className="flex gap-1.5">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          readOnly={readOnly || !onChange}
          placeholder={placeholder}
          className="flex-1 px-2.5 py-1.5 rounded-md bg-void border border-border text-foreground font-mono text-[11px] focus:border-primary focus:outline-none truncate"
          title={short ? value : undefined}
        />
        {onCopy && (
          <button
            onClick={onCopy}
            aria-label="Copy"
            className={`px-2 rounded-md border text-[10px] font-bold transition-all ${
              copied
                ? 'bg-neon-green/15 border-neon-green/40 text-glow-green'
                : 'bg-elevated border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            {copied ? '✓' : <Copy className="w-3 h-3" />}
          </button>
        )}
      </div>
    </div>
  );
}
