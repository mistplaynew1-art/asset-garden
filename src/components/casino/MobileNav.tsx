import { Link, useLocation } from 'react-router-dom';
import { Home, Gamepad2, Trophy, Wallet, User } from 'lucide-react';
import { playSound } from '@/lib/sounds';

const TABS = [
  { to: '/', icon: Home, label: 'Lobby' },
  { to: '/casino', icon: Gamepad2, label: 'Casino' },
  { to: '/sports', icon: Trophy, label: 'Sports' },
  { to: '/wallet', icon: Wallet, label: 'Wallet' },
  { to: '/profile', icon: User, label: 'Profile' },
];

export default function MobileNav() {
  const location = useLocation();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 h-16 bg-void/95 backdrop-blur-xl border-t border-border flex items-center lg:hidden" role="navigation" aria-label="Mobile navigation">
      {TABS.map((tab) => {
        const isActive = location.pathname === tab.to || (tab.to !== '/' && location.pathname.startsWith(tab.to));
        return (
          <Link key={tab.to} to={tab.to} onClick={() => playSound('click')}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2 transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
            <tab.icon className="w-5 h-5" />
            <span className="text-[10px] font-bold">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
