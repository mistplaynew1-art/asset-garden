import { Link } from 'react-router-dom';
import { useAppStore } from '@/stores/app-store';
import { useAuth } from '@/hooks/use-auth';
import NotificationsDropdown from './NotificationsDropdown';
import {
  Menu, Search, Bell, Wallet, ChevronDown, User, Shield, Star, Gift, Users, LogOut, Settings, Volume2, VolumeX, Music
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { playSound, setSoundEnabled } from '@/lib/sounds';
import { supabase } from '@/integrations/supabase/client';
import { useWallet } from '@/hooks/use-wallet';
import { toast } from 'sonner';

export default function Header() {
  const {
    toggleSidebar, balances, totalUsd,
    openModal, setMobileSidebarOpen, user, profile, isAuthenticated,
    soundEnabled, musicEnabled, toggleSound, toggleMusic,
  } = useAppStore();
  const [showBalances, setShowBalances] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const balanceRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (balanceRef.current && !balanceRef.current.contains(e.target as Node)) setShowBalances(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfile(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    setSoundEnabled(soundEnabled);
  }, [soundEnabled]);

  const profileLinks = [
    { to: '/profile', icon: User, label: 'Profile & Security' },
    { to: '/wallet', icon: Wallet, label: 'Wallet' },
    { to: '/vip', icon: Star, label: 'VIP Club' },
    { to: '/rewards', icon: Gift, label: 'Rewards' },
    { to: '/affiliate', icon: Users, label: 'Affiliate' },
    { to: '/notifications', icon: Bell, label: 'Notifications' },
    { to: '/provably-fair', icon: Shield, label: 'Provably Fair' },
    ...(profile?.is_admin ? [{ to: '/admin', icon: Settings, label: 'Admin Panel' }] : []),
  ];

  const { signOut } = useAuth();
  const { refetch: refetchWallet } = useWallet();
  const [addingFunds, setAddingFunds] = useState(false);

  const handleSignOut = () => {
    setShowProfile(false);
    signOut();
  };

  const handleAddTestFunds = async () => {
    if (!user) return;
    setAddingFunds(true);
    try {
      const { data: existing } = await supabase
        .from('wallets')
        .select('id, balance')
        .eq('user_id', user.id)
        .eq('currency', 'USD')
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('wallets')
          .update({ balance: Number(existing.balance ?? 0) + 1000 })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('wallets')
          .insert({ user_id: user.id, currency: 'USD', balance: 1000 });
        if (error) throw error;
      }
      await refetchWallet();
      toast.success('+$1,000 test funds added');
      playSound('coin');
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to add test funds');
    } finally {
      setAddingFunds(false);
    }
  };

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 h-16 backdrop-blur-xl flex items-center px-3 lg:px-4 gap-2"
      style={{
        backgroundColor: 'color-mix(in oklab, var(--bg-void) 92%, transparent)',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      <button onClick={() => { setMobileSidebarOpen(true); playSound('click'); }} className="p-2 rounded-lg hover:bg-elevated transition-colors lg:hidden" aria-label="Open menu">
        <Menu className="w-5 h-5 text-muted-foreground" />
      </button>
      <button onClick={() => { toggleSidebar(); playSound('click'); }} className="p-2 rounded-lg hover:bg-elevated transition-colors hidden lg:block" aria-label="Toggle sidebar">
        <Menu className="w-5 h-5 text-muted-foreground" />
      </button>

      <Link to="/" className="flex items-center gap-2 mr-2 neon-button">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, var(--neon-blue-hex), var(--neon-purple-hex))',
            boxShadow: '0 0 18px color-mix(in oklab, var(--neon-blue-hex) 40%, transparent)',
          }}
        >
          <span className="text-sm font-extrabold text-white">N</span>
        </div>
        <span className="font-display font-extrabold text-lg hidden sm:block neon-text" style={{ color: 'var(--text-primary)' }}>NexBet</span>
      </Link>

      <div className="flex-1 max-w-md hidden md:block">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input placeholder="Search games, providers..." className="w-full pl-9 pr-3 py-2 rounded-lg bg-surface border border-border text-foreground text-sm focus:border-neon-blue focus:outline-none" />
        </div>
      </div>

      <div className="flex-1" />

      {/* Sound controls */}
      <button onClick={() => { toggleSound(); }} className="p-2 rounded-lg hover:bg-elevated transition-colors" aria-label="Toggle sound">
        {soundEnabled ? <Volume2 className="w-4 h-4 text-muted-foreground" /> : <VolumeX className="w-4 h-4 text-muted-foreground" />}
      </button>
      <button onClick={() => { toggleMusic(); }} className={`p-2 rounded-lg hover:bg-elevated transition-colors ${musicEnabled ? 'text-neon-blue' : ''}`} aria-label="Toggle music">
        <Music className="w-4 h-4 text-muted-foreground" />
      </button>

      {isAuthenticated ? (
        <div className="flex items-center gap-2">
          <div ref={balanceRef} className="relative">
            <button
              onClick={() => { setShowBalances(!showBalances); playSound('click'); }}
              key={totalUsd}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface border border-border text-sm hover:border-neon-blue/30 transition-colors animate-scale-in"
            >
              <Wallet className="w-4 h-4 text-neon-green" />
              <span className="font-mono font-bold text-foreground tabular-nums">${totalUsd.toFixed(2)}</span>
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            </button>
            {showBalances && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-surface border border-border rounded-xl p-3 shadow-2xl z-50 animate-fade-in">
                <div className="text-xs font-display font-bold text-muted-foreground uppercase tracking-wider mb-2">Balances</div>
                {balances.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-2">No balances yet</div>
                ) : (
                  <div className="space-y-1.5">
                    {balances.map((b) => (
                      <div key={b.id} className="flex items-center justify-between py-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold" style={{ color: b.color }}>{b.icon}</span>
                          <span className="text-sm text-foreground">{b.currency}</span>
                        </div>
                        <span className="font-mono text-sm font-bold text-foreground">{b.balance.toFixed(4)}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button onClick={() => { openModal('deposit'); setShowBalances(false); playSound('coin'); }}
                    className="py-2 rounded-lg text-xs font-bold gradient-primary text-foreground">Deposit</button>
                  <button onClick={() => { openModal('withdraw'); setShowBalances(false); }}
                    className="py-2 rounded-lg text-xs font-bold bg-elevated border border-border text-foreground">Withdraw</button>
                </div>
                <button
                  onClick={handleAddTestFunds}
                  disabled={addingFunds}
                  className="mt-2 w-full py-2 rounded-lg text-xs font-bold bg-neon-green/10 border border-neon-green/40 text-neon-green hover:bg-neon-green/20 transition-colors disabled:opacity-50"
                >
                  {addingFunds ? 'Adding...' : '+ Add $1,000 Test Funds'}
                </button>
              </div>
            )}
          </div>

          <NotificationsDropdown />

          <div ref={profileRef} className="relative">
            <button onClick={() => { setShowProfile(!showProfile); playSound('click'); }} className="flex items-center gap-2 p-2 rounded-lg hover:bg-elevated transition-colors">
              <div className="w-8 h-8 rounded-full bg-elevated border border-border flex items-center justify-center">
                <User className="w-4 h-4 text-muted-foreground" />
              </div>
            </button>
            {showProfile && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-surface border border-border rounded-xl py-2 shadow-2xl z-50 animate-fade-in">
                <div className="px-3 py-2 border-b border-border mb-1">
                  <div className="font-display font-bold text-sm text-foreground">{profile?.username ?? 'Player'}</div>
                  <div className="text-xs text-muted-foreground">{user?.email}</div>
                </div>
                {profileLinks.map((link) => (
                  <Link key={link.to} to={link.to} onClick={() => setShowProfile(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-elevated transition-colors">
                    <link.icon className="w-4 h-4" />{link.label}
                  </Link>
                ))}
                <div className="border-t border-border mt-1 pt-1">
                  <button onClick={handleSignOut}
                    className="flex items-center gap-2.5 px-3 py-2 text-sm text-glow-red hover:bg-elevated transition-colors w-full">
                    <LogOut className="w-4 h-4" />Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Link to="/auth" className="px-4 py-2 rounded-lg text-sm font-bold text-muted-foreground hover:text-foreground transition-colors">Sign In</Link>
          <Link to="/auth?mode=signup" className="px-4 py-2 rounded-lg text-sm font-bold gradient-primary text-foreground neon-glow-blue">Sign Up</Link>
        </div>
      )}
    </header>
  );
}
