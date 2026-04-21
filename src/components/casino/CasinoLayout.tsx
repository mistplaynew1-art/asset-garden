import { Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import ParticleBackground from './ParticleBackground';
import LiveBetsTicker from './LiveBetsTicker';
import { useAppStore } from '@/stores/app-store';
import { startBackgroundMusic, stopBackgroundMusic } from '@/lib/sounds';
import { useRealtimeNotifications } from '@/hooks/use-realtime-notifications';
import { useWallet } from '@/hooks/use-wallet';

export default function CasinoLayout() {
  const { sidebarCollapsed, musicEnabled, openModal } = useAppStore();
  const location = useLocation();
  const isHomepage = location.pathname === '/';

  // Mount global systems
  useRealtimeNotifications();
  useWallet();

  useEffect(() => {
    if (musicEnabled) startBackgroundMusic();
    else stopBackgroundMusic();
    return () => {
      stopBackgroundMusic();
    };
  }, [musicEnabled]);

  return (
    <div className="min-h-screen bg-void text-foreground flex flex-col">
      {isHomepage && <ParticleBackground />}
      <Header />
      <LiveBetsTicker />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main
          className={`relative z-10 flex-1 overflow-y-auto pt-[calc(4rem+2rem)] pb-20 lg:pb-6 px-3 lg:px-6 transition-all duration-300 ${
            sidebarCollapsed ? 'lg:ml-[72px]' : 'lg:ml-[250px]'
          }`}
        >
          <Outlet />
        </main>
      </div>
      <MobileNav />
      {/* Responsible Gambling Footer */}
      <footer className="py-3 px-4 border-t border-border text-center bg-surface/50">
        <div className="text-xs text-muted-foreground flex items-center justify-center gap-3 flex-wrap">
          <span className="text-neon-red">🔞 18+</span>
          <button
            onClick={() => openModal('responsible-gaming')}
            className="underline hover:text-foreground transition-colors"
          >
            Responsible Gambling
          </button>
          <a href="/provably-fair" className="underline hover:text-foreground transition-colors">
            Provably Fair
          </a>
          <a href="/support" className="underline hover:text-foreground transition-colors">
            Support
          </a>
          <span className="text-muted/50 hidden sm:inline">
            Gambling can be addictive. Play responsibly.
          </span>
        </div>
      </footer>
    </div>
  );
}