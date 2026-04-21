import { Link, useLocation } from 'react-router-dom';
import { useAppStore } from '@/stores/app-store';
import {
  Home, Gamepad2, Zap, Grid3X3, Video, Trophy, Wallet, Crown, Gift, Users,
  BarChart3, HelpCircle, Shield, Flame, Star, X, History
} from 'lucide-react';
import { useEffect } from 'react';
import { playSound } from '@/lib/sounds';

interface NavItem { to: string; icon: React.ElementType; label: string; badge?: string; }
interface NavSection { title: string; items: NavItem[]; }

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Casino',
    items: [
      { to: '/', icon: Home, label: 'Lobby' },
      { to: '/casino', icon: Gamepad2, label: 'Casino' },
      { to: '/originals', icon: Zap, label: 'Originals', badge: 'PF' },
      { to: '/slots', icon: Grid3X3, label: 'Slots' },
      { to: '/live', icon: Video, label: 'Live Casino' },
    ],
  },
  {
    title: 'Sports',
    items: [{ to: '/sports', icon: Trophy, label: 'Sportsbook' }],
  },
  {
    title: 'Account',
    items: [
      { to: '/wallet', icon: Wallet, label: 'Wallet' },
      { to: '/history', icon: History, label: 'History' },
      { to: '/vip', icon: Crown, label: 'VIP Club' },
      { to: '/rewards', icon: Gift, label: 'Rewards' },
      { to: '/affiliate', icon: Users, label: 'Affiliate' },
      { to: '/promotions', icon: Star, label: 'Promotions' },
      { to: '/leaderboard', icon: BarChart3, label: 'Leaderboard' },
      { to: '/tournaments', icon: Flame, label: 'Tournaments' },
    ],
  },
  {
    title: 'Help',
    items: [
      { to: '/provably-fair', icon: Shield, label: 'Provably Fair' },
      { to: '/support', icon: HelpCircle, label: 'Support' },
    ],
  },
];

export default function Sidebar() {
  const { sidebarCollapsed, mobileSidebarOpen, setMobileSidebarOpen } = useAppStore();
  const location = useLocation();

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname, setMobileSidebarOpen]);

  const sidebarContent = (
    <nav className="py-4 space-y-4 overflow-y-auto h-full scrollbar-hide">
      {NAV_SECTIONS.map((section) => (
        <div key={section.title}>
          {!sidebarCollapsed && (
            <div className="px-4 mb-1 text-[9px] font-bold font-display text-muted-foreground uppercase tracking-widest">
              {section.title}
            </div>
          )}
          <div className="space-y-0.5">
            {section.items.map((item) => {
              const isActive = location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to));
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => playSound('click')}
                  className={`flex items-center gap-2.5 px-4 py-2 mx-2 rounded-lg text-sm transition-all neon-button ${
                    sidebarCollapsed ? 'justify-center px-2' : ''
                  }`}
                  style={
                    isActive
                      ? {
                          color: 'var(--neon-blue-hex)',
                          background: 'color-mix(in oklab, var(--neon-blue-hex) 10%, transparent)',
                          boxShadow: 'inset 2px 0 0 var(--neon-blue-hex), 0 0 12px color-mix(in oklab, var(--neon-blue-hex) 18%, transparent)',
                          fontWeight: 700,
                        }
                      : { color: 'var(--text-secondary)' }
                  }
                  title={sidebarCollapsed ? item.label : undefined}>
                  <item.icon className="w-4 h-4 shrink-0" />
                  {!sidebarCollapsed && (
                    <>
                      <span className="truncate">{item.label}</span>
                      {item.badge && (
                        <span
                          className="ml-auto px-1.5 py-0.5 rounded text-[8px] font-extrabold"
                          style={{
                            background: 'color-mix(in oklab, var(--neon-green-hex) 18%, transparent)',
                            color: 'var(--neon-green-hex)',
                          }}
                        >
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  return (
    <>
      <aside className={`fixed top-16 left-0 bottom-0 bg-sidebar border-r border-sidebar-border z-30 hidden lg:block transition-all duration-300 ${
        sidebarCollapsed ? 'w-[72px]' : 'w-[250px]'
      }`}>
        {sidebarContent}
      </aside>

      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-overlay/80" onClick={() => setMobileSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-[280px] bg-sidebar border-r border-sidebar-border animate-slide-in-right">
            <div className="h-16 flex items-center justify-between px-4 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                  <span className="text-sm font-bold text-foreground">N</span>
                </div>
                <span className="font-display font-extrabold text-foreground">NexBet</span>
              </div>
              <button onClick={() => setMobileSidebarOpen(false)} className="p-2 rounded-lg hover:bg-elevated" aria-label="Close menu">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
