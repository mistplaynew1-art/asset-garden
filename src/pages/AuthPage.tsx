import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Mail, Lock, User, Eye, EyeOff, Loader2, AlertCircle, Check } from 'lucide-react';
import { playSound } from '@/lib/sounds';
import { supabase } from '@/integrations/supabase/client';

/** Password strength scorer: returns 0-4 + label + color. */
function scorePassword(pw: string) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  const labels = ['Too weak', 'Weak', 'Fair', 'Strong', 'Excellent'];
  const colors = ['var(--neon-red-hex,#ff3366)', 'var(--neon-red-hex,#ff3366)', 'var(--neon-gold-hex,#ffd34a)', 'var(--neon-green-hex,#22ee99)', 'var(--neon-green-hex,#22ee99)'];
  return { score, label: labels[score], color: colors[score] };
}

export default function AuthPage() {
  const [searchParams] = useSearchParams();
  const searchMode = searchParams.get('mode') === 'signup' ? 'signup' : 'login';
  const [mode, setMode] = useState<'login' | 'signup'>(searchMode as 'login' | 'signup');

  useEffect(() => {
    setMode(searchMode as 'login' | 'signup');
  }, [searchMode]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { signIn, signUp, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const strength = useMemo(() => scorePassword(password), [password]);

  useEffect(() => {
    if (isAuthenticated) navigate('/');
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null); setSuccess(null);
    playSound('click');
    try {
      if (mode === 'login') {
        await signIn(email, password);
        playSound('win');
        navigate('/');
      } else {
        if (strength.score < 2) {
          setError('Please choose a stronger password (8+ chars, mix of cases, numbers, symbols).');
          setLoading(false); return;
        }
        await signUp(email, password, username || undefined);
        setSuccess('Account created! Check your email to verify your account.');
        playSound('win');
        setMode('login');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      playSound('lose');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true); setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed');
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-8 animate-fade-in">
      {/* Ambient neon backdrop */}
      <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full opacity-30 blur-3xl"
          style={{ background: 'radial-gradient(circle, var(--neon-blue-hex,#3aa0ff) 0%, transparent 70%)' }} />
        <div className="absolute -bottom-32 -right-32 w-[480px] h-[480px] rounded-full opacity-30 blur-3xl"
          style={{ background: 'radial-gradient(circle, var(--neon-pink-hex,#ff3aa0) 0%, transparent 70%)' }} />
      </div>

      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center gap-2.5">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, var(--neon-blue-hex,#3aa0ff), var(--neon-pink-hex,#ff3aa0))',
                boxShadow: '0 0 20px color-mix(in oklab, var(--neon-blue-hex,#3aa0ff) 50%, transparent)',
              }}>
              <span className="text-xl font-bold text-white">N</span>
            </div>
            <span className="font-display font-extrabold text-2xl text-rainbow">NexBet</span>
          </Link>
          <p className="text-muted-foreground text-sm mt-2">
            {mode === 'login' ? 'Welcome back, player' : 'Join the action — create your account'}
          </p>
        </div>

        <div className="rounded-2xl p-6 space-y-4 relative"
          style={{
            background: 'linear-gradient(180deg, color-mix(in oklab, var(--bg-surface,#161a24) 92%, transparent), color-mix(in oklab, var(--bg-surface,#161a24) 80%, transparent))',
            border: '1px solid color-mix(in oklab, var(--neon-blue-hex,#3aa0ff) 25%, transparent)',
            boxShadow: '0 0 40px color-mix(in oklab, var(--neon-blue-hex,#3aa0ff) 10%, transparent), inset 0 1px 0 color-mix(in oklab, var(--neon-blue-hex,#3aa0ff) 20%, transparent)',
          }}>
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-neon-red/10 border border-neon-red/30 text-sm text-glow-red" role="alert">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-neon-green/10 border border-neon-green/30 text-sm text-glow-green" role="status">
              <Check className="w-4 h-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Tabs */}
          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-void border border-border" role="tablist">
            {(['login', 'signup'] as const).map(m => (
              <button key={m} role="tab" aria-selected={mode === m}
                onClick={() => { setMode(m); setError(null); }}
                className={`py-2.5 rounded-lg text-sm font-bold font-display transition-all ${
                  mode === m ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
                style={mode === m ? {
                  background: 'linear-gradient(135deg, var(--neon-blue-hex,#3aa0ff), var(--neon-pink-hex,#ff3aa0))',
                  boxShadow: '0 0 16px color-mix(in oklab, var(--neon-blue-hex,#3aa0ff) 40%, transparent)',
                } : undefined}
              >{m === 'login' ? 'Sign In' : 'Sign Up'}</button>
            ))}
          </div>

          {/* Google OAuth */}
          <button type="button" onClick={handleGoogle} disabled={googleLoading || loading}
            className="w-full py-3 rounded-xl font-display font-bold text-sm bg-elevated border border-border hover:border-neon-blue/50 text-foreground flex items-center justify-center gap-2.5 transition-colors disabled:opacity-50">
            {googleLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
                <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.83.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.34A9 9 0 0 0 9 18z"/>
                <path fill="#FBBC05" d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.94H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.06l3.01-2.34z"/>
                <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 9 0 9 9 0 0 0 .96 4.94l3.01 2.34C4.68 5.16 6.66 3.58 9 3.58z"/>
              </svg>
            )}
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-display">or with email</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === 'signup' && (
              <div>
                <label className="text-[10px] font-bold font-display text-muted-foreground uppercase tracking-wider mb-1 block">Username</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Choose a username"
                    pattern="^[a-zA-Z0-9_]{3,20}$" title="3-20 chars, letters, numbers, underscores"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-void border border-border text-foreground text-sm focus:border-neon-blue focus:outline-none transition-colors" />
                </div>
              </div>
            )}

            <div>
              <label className="text-[10px] font-bold font-display text-muted-foreground uppercase tracking-wider mb-1 block">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-void border border-border text-foreground text-sm focus:border-neon-blue focus:outline-none transition-colors" />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold font-display text-muted-foreground uppercase tracking-wider mb-1 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={8}
                  className="w-full pl-10 pr-10 py-3 rounded-xl bg-void border border-border text-foreground text-sm focus:border-neon-blue focus:outline-none transition-colors" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {mode === 'signup' && password.length > 0 && (
                <div className="mt-2 space-y-1">
                  <div className="flex gap-1">
                    {[0, 1, 2, 3].map(i => (
                      <div key={i} className="flex-1 h-1 rounded-full bg-border overflow-hidden">
                        <div className="h-full transition-all duration-300"
                          style={{ width: strength.score > i ? '100%' : '0%', background: strength.color }} />
                      </div>
                    ))}
                  </div>
                  <div className="text-[10px] font-mono uppercase tracking-wider" style={{ color: strength.color }}>
                    {strength.label}
                  </div>
                </div>
              )}
            </div>

            <button type="submit" disabled={loading || googleLoading}
              className="w-full py-3 rounded-xl font-display font-bold text-sm text-white active:scale-[0.98] transition-transform disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, var(--neon-blue-hex,#3aa0ff), var(--neon-pink-hex,#ff3aa0))',
                boxShadow: '0 0 20px color-mix(in oklab, var(--neon-blue-hex,#3aa0ff) 50%, transparent)',
              }}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <p className="text-[10px] text-center text-muted-foreground">
            By continuing, you agree to NexBet's terms. 18+ only. Play responsibly.
          </p>
        </div>
      </div>
    </div>
  );
}
