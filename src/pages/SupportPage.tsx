/**
 * Support — overhauled.
 *  • Categorized, searchable FAQ
 *  • Self-service quick actions (status, deposit/withdraw shortcuts)
 *  • In-page AI assistant (uses LOVABLE_API_KEY-powered edge gateway when wired;
 *    falls back to canned answers for now)
 *  • Contact form that emails support inbox via Lovable Cloud (placeholder hook)
 */
import { useMemo, useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  HelpCircle, MessageCircle, Mail, FileText, Search, Send, Bot, User, ChevronRight,
  Wallet, Shield, Trophy, Gift, Settings, Sparkles,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAppStore } from '@/stores/app-store';
import { playSound } from '@/lib/sounds';

interface FaqEntry {
  id: string;
  category: 'account' | 'wallet' | 'games' | 'bonus' | 'security';
  q: string;
  a: string;
}

const CATEGORIES: Array<{ key: FaqEntry['category'] | 'all'; label: string; icon: typeof HelpCircle }> = [
  { key: 'all', label: 'All', icon: HelpCircle },
  { key: 'account', label: 'Account', icon: User },
  { key: 'wallet', label: 'Wallet', icon: Wallet },
  { key: 'games', label: 'Games', icon: Trophy },
  { key: 'bonus', label: 'Bonuses', icon: Gift },
  { key: 'security', label: 'Security', icon: Shield },
];

const FAQS: FaqEntry[] = [
  { id: '1', category: 'wallet', q: 'How do I deposit?',
    a: 'Open Wallet → Deposit. We accept BTC, ETH, USDT, LTC and credit cards. Crypto deposits are credited after 1 confirmation; cards are instant.' },
  { id: '2', category: 'wallet', q: 'How long do withdrawals take?',
    a: 'Crypto withdrawals are processed within 10 minutes after admin approval. Card and bank withdrawals take 1–3 business days.' },
  { id: '3', category: 'wallet', q: 'Are there withdrawal limits?',
    a: 'Standard accounts: $10,000/day. VIP tiers unlock $25k–$250k/day depending on level. Contact support for higher limits.' },
  { id: '4', category: 'games', q: 'Is the platform provably fair?',
    a: 'Yes. All Originals games use HMAC-SHA256 with a server seed (hashed before play), client seed (you control), and an incrementing nonce. Verify any bet on /provably-fair.' },
  { id: '5', category: 'games', q: 'What is the minimum bet?',
    a: 'Most games start at $0.01. Live casino tables vary from $0.10 to $25 minimum.' },
  { id: '6', category: 'games', q: 'What is RTP?',
    a: 'Return-to-Player — the long-run % paid back to players. Our slots range 96–98%; Originals run 99% (1% house edge).' },
  { id: '7', category: 'bonus', q: 'How does the welcome bonus work?',
    a: 'You receive up to $10,000 + 200 free spins across your first 4 deposits. Wagering requirement is 35× the bonus amount.' },
  { id: '8', category: 'bonus', q: 'How do I claim daily rewards?',
    a: 'Log in daily and visit Rewards. Streak bonuses scale up to $100 on day 7. Missing a day resets the streak.' },
  { id: '9', category: 'account', q: 'How does the VIP program work?',
    a: 'Every $1 wagered earns 1 XP. Tiers: Bronze → Silver → Gold → Platinum → Diamond → VIP. Higher tiers unlock cashback, dedicated host, faster withdrawals.' },
  { id: '10', category: 'account', q: 'How do I change my display name?',
    a: 'Go to Profile → Identity → Edit display name. Changes are visible in chat and leaderboards instantly.' },
  { id: '11', category: 'security', q: 'Should I enable 2FA?',
    a: 'Strongly recommended. Profile → Security → Two-factor authentication. We support TOTP apps like Authy, Google Authenticator, 1Password.' },
  { id: '12', category: 'security', q: 'I forgot my password',
    a: 'Click "Forgot Password" on the sign-in page. We email a reset link valid for 1 hour. Contact support if no email arrives within 5 min.' },
  { id: '13', category: 'security', q: 'Responsible gaming tools',
    a: 'Profile → Responsible Gaming. Set deposit limits, session timeouts, or self-exclude. Limits take effect within 24h and cannot be raised instantly.' },
];

interface ChatMsg { role: 'user' | 'assistant'; content: string; }

const CANNED_REPLIES: Array<{ match: RegExp; reply: string }> = [
  { match: /deposit/i, reply: 'To deposit, head to Wallet → Deposit. We accept BTC, ETH, USDT and cards. Crypto credits after 1 confirmation, cards are instant.' },
  { match: /withdraw/i, reply: 'Withdrawals are reviewed within 10 minutes for crypto, 1–3 business days for fiat. Make sure you have completed account verification.' },
  { match: /bonus|promo/i, reply: 'Active promotions live at /promotions. Welcome package: 100% match up to $10,000 + 200 spins, 35× wagering.' },
  { match: /provabl|fair|hash|seed/i, reply: 'Our Originals are provably fair via HMAC-SHA256. You can verify every bet at /provably-fair using the server seed (revealed after rotation), client seed and nonce.' },
  { match: /vip|level|xp/i, reply: 'You earn 1 XP per $1 wagered. VIP tiers unlock cashback up to 25%, faster withdrawals and a personal host.' },
  { match: /password|reset/i, reply: 'Use the "Forgot password" link on the sign-in page. Reset emails are valid for 1 hour.' },
  { match: /2fa|authenticator|two[- ]factor/i, reply: 'Enable 2FA in Profile → Security. We support all TOTP apps (Authy, Google Authenticator, 1Password).' },
  { match: /limit|self.?exclud/i, reply: 'Set deposit limits, session timers and self-exclusion in Profile → Responsible Gaming. Limit reductions are immediate; increases require a 24h cool-off.' },
];

function getCannedReply(q: string): string {
  const hit = CANNED_REPLIES.find(c => c.match.test(q));
  if (hit) return hit.reply;
  return "Thanks for the message — a human agent will follow up shortly. In the meantime you can browse our FAQ above, or check status at /status.";
}

export default function SupportPage() {
  const [search, setSearch] = useState('');
  const [activeCat, setActiveCat] = useState<FaqEntry['category'] | 'all'>('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: 'assistant', content: 'Hi! I\'m the NexBet assistant. Ask me anything about deposits, withdrawals, bonuses, or your account.' },
  ]);
  const [draft, setDraft] = useState('');
  const [thinking, setThinking] = useState(false);
  const messagesRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { user } = useAppStore();

  const [contactSubject, setContactSubject] = useState('');
  const [contactBody, setContactBody] = useState('');
  const [sending, setSending] = useState(false);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return FAQS.filter(f => {
      if (activeCat !== 'all' && f.category !== activeCat) return false;
      if (!s) return true;
      return f.q.toLowerCase().includes(s) || f.a.toLowerCase().includes(s);
    });
  }, [search, activeCat]);

  useEffect(() => {
    if (chatOpen && messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [chatOpen, messages]);

  const send = () => {
    const text = draft.trim();
    if (!text || thinking) return;
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setDraft('');
    setThinking(true);
    playSound('click');
    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'assistant', content: getCannedReply(text) }]);
      setThinking(false);
    }, 600);
  };

  const submitContact = async () => {
    if (!contactSubject.trim() || !contactBody.trim()) {
      return toast({ title: 'Please fill in subject and message', variant: 'destructive' });
    }
    setSending(true);
    // Placeholder — would invoke an edge function `support-contact` with the message body.
    await new Promise(r => setTimeout(r, 700));
    setSending(false);
    setContactSubject('');
    setContactBody('');
    toast({ title: 'Message sent', description: 'Our team will reply to you within 4 hours.' });
    playSound('win');
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-6 h-6 text-primary" />
          <h1 className="font-display font-extrabold text-2xl text-foreground">Help &amp; Support</h1>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />
          All systems operational
        </div>
      </div>

      {/* Quick contact channels */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={() => setChatOpen(true)}
          className="p-5 rounded-xl bg-surface border border-border hover:border-neon-green/40 transition-all text-left group"
        >
          <MessageCircle className="w-6 h-6 text-glow-green mb-2" />
          <div className="font-display font-bold text-sm text-foreground">Live Chat</div>
          <div className="text-xs text-muted-foreground mt-1">Avg reply &lt; 60s</div>
          <div className="mt-3 flex items-center gap-1 text-xs text-glow-green font-bold">
            Start chat <ChevronRight className="w-3 h-3" />
          </div>
        </button>
        <a href="mailto:support@nexbet.com" className="p-5 rounded-xl bg-surface border border-border hover:border-neon-blue/40 transition-all text-left group">
          <Mail className="w-6 h-6 text-glow-blue mb-2" />
          <div className="font-display font-bold text-sm text-foreground">Email</div>
          <div className="text-xs text-muted-foreground mt-1">support@nexbet.com</div>
          <div className="mt-3 flex items-center gap-1 text-xs text-glow-blue font-bold">
            Send email <ChevronRight className="w-3 h-3" />
          </div>
        </a>
        <Link to="/provably-fair" className="p-5 rounded-xl bg-surface border border-border hover:border-neon-gold/40 transition-all text-left group">
          <FileText className="w-6 h-6 text-glow-gold mb-2" />
          <div className="font-display font-bold text-sm text-foreground">Documentation</div>
          <div className="text-xs text-muted-foreground mt-1">Provably-fair & APIs</div>
          <div className="mt-3 flex items-center gap-1 text-xs text-glow-gold font-bold">
            Read docs <ChevronRight className="w-3 h-3" />
          </div>
        </Link>
      </div>

      {/* Search + categories */}
      <div className="rounded-2xl bg-surface border border-border p-4 sm:p-5 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="search" placeholder="Search FAQ — try 'withdrawal', '2FA', 'bonus'…"
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-void border border-border text-sm text-foreground focus:border-primary focus:outline-none"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
          {CATEGORIES.map(c => {
            const active = activeCat === c.key;
            const Icon = c.icon;
            return (
              <button key={c.key} onClick={() => setActiveCat(c.key)}
                className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  active ? 'gradient-primary text-foreground' : 'bg-elevated border border-border text-muted-foreground hover:text-foreground'
                }`}>
                <Icon className="w-3.5 h-3.5" /> {c.label}
              </button>
            );
          })}
        </div>

        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No matching FAQ. Try the live chat or email support.
            </div>
          ) : (
            filtered.map(faq => {
              const open = openId === faq.id;
              return (
                <div key={faq.id} className="rounded-xl bg-void border border-border overflow-hidden">
                  <button
                    onClick={() => setOpenId(open ? null : faq.id)}
                    className="w-full flex items-center justify-between p-3 text-left text-sm font-display font-bold text-foreground hover:bg-elevated/50 transition-colors"
                  >
                    <span>{faq.q}</span>
                    <span className={`text-muted-foreground text-xl transition-transform ${open ? 'rotate-45' : ''}`}>+</span>
                  </button>
                  {open && (
                    <div className="px-3 pb-3 text-sm text-muted-foreground border-t border-border/60 pt-2">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Contact form */}
      <div className="rounded-2xl bg-surface border border-border p-4 sm:p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-display font-bold text-foreground">Open a ticket</h2>
        </div>
        <input
          type="text" placeholder="Subject"
          value={contactSubject} onChange={e => setContactSubject(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-void border border-border text-sm text-foreground focus:border-primary focus:outline-none"
        />
        <textarea
          placeholder="Describe your issue in detail…" rows={5}
          value={contactBody} onChange={e => setContactBody(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-void border border-border text-sm text-foreground focus:border-primary focus:outline-none resize-y min-h-[120px]"
        />
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="text-[10px] text-muted-foreground">
            Replies sent to: <span className="font-mono text-foreground">{user?.email ?? 'sign in to attach your email'}</span>
          </div>
          <button onClick={submitContact} disabled={sending}
            className="px-4 py-2 rounded-lg text-sm font-display font-bold gradient-primary text-foreground neon-glow-blue disabled:opacity-50">
            {sending ? 'Sending…' : 'Submit ticket'}
          </button>
        </div>
      </div>

      {/* Chat drawer */}
      {chatOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:justify-end bg-overlay/60 backdrop-blur-sm p-0 sm:p-4 animate-fade-in"
          onClick={() => setChatOpen(false)}>
          <div onClick={e => e.stopPropagation()}
            className="w-full sm:w-[420px] h-[80vh] sm:h-[600px] bg-surface border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-scale-in">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Bot className="w-5 h-5 text-primary" />
                  <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-neon-green border border-surface" />
                </div>
                <div>
                  <div className="font-display font-bold text-sm text-foreground">NexBet Assistant</div>
                  <div className="text-[10px] text-muted-foreground">Powered by AI · 24/7</div>
                </div>
              </div>
              <button onClick={() => setChatOpen(false)} className="text-muted-foreground hover:text-foreground text-xl leading-none">×</button>
            </div>
            <div ref={messagesRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((m, i) => (
                <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                    m.role === 'user' ? 'bg-primary/20 text-primary' : 'bg-neon-green/20 text-glow-green'
                  }`}>
                    {m.role === 'user' ? <User className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                  </div>
                  <div className={`max-w-[78%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-primary/15 text-foreground rounded-tr-sm'
                      : 'bg-elevated text-foreground rounded-tl-sm'
                  }`}>
                    {m.content}
                  </div>
                </div>
              ))}
              {thinking && (
                <div className="flex gap-2 items-center text-xs text-muted-foreground">
                  <div className="w-7 h-7 rounded-full bg-neon-green/20 flex items-center justify-center"><Sparkles className="w-3.5 h-3.5 text-glow-green" /></div>
                  <span className="inline-flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '120ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '240ms' }} />
                  </span>
                </div>
              )}
            </div>
            <div className="p-3 border-t border-border flex gap-2">
              <input
                type="text" placeholder="Type a message…"
                value={draft} onChange={e => setDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') send(); }}
                disabled={thinking}
                className="flex-1 px-3 py-2 rounded-lg bg-void border border-border text-sm text-foreground focus:border-primary focus:outline-none disabled:opacity-50"
              />
              <button onClick={send} disabled={!draft.trim() || thinking}
                className="px-3 rounded-lg gradient-primary text-foreground neon-glow-blue disabled:opacity-40">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
