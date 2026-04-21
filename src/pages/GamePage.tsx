/**
 * GamePage — central router for every casino game route.
 * Game components are lazy-loaded so each is split into its own chunk and
 * only downloaded when first opened, dramatically reducing initial JS.
 */
import { lazy, Suspense, type ComponentType } from 'react';
import { useParams } from 'react-router-dom';

const DiceGame = lazy(() => import('@/components/games/dice/DiceGame'));
const CrashGame = lazy(() => import('@/components/games/crash/CrashGame'));
const MinesGame = lazy(() => import('@/components/games/mines/MinesGame'));
const PlinkoGame = lazy(() => import('@/components/games/plinko/PlinkoGame'));
const BlackjackGame = lazy(() => import('@/components/games/blackjack/BlackjackGame'));
const RouletteGame = lazy(() => import('@/components/games/roulette/RouletteGame'));
const CoinflipGame = lazy(() => import('@/components/games/coinflip/CoinflipGame'));
const LimboGame = lazy(() => import('@/components/games/limbo/LimboGame'));
const HiloGame = lazy(() => import('@/components/games/hilo/HiloGame'));
const KenoGame = lazy(() => import('@/components/games/keno/KenoGame'));
const WheelGame = lazy(() => import('@/components/games/wheel/WheelGame'));
const DragonTigerGame = lazy(() => import('@/components/games/dragon-tiger/DragonTigerGame'));
const TowerGame = lazy(() => import('@/components/games/tower/TowerGame'));
const JetpackGame = lazy(() => import('@/components/games/jetpack/JetpackGame'));
import OlympusSlot from '@/components/games/slots/olympus/OlympusSlot';
const BonanzaSlot = lazy(() => import('@/components/games/slots/bonanza/BonanzaSlot'));
const BigBassSlot = lazy(() => import('@/components/games/slots/bigbass/BigBassSlot'));
const ThemedSlotMachine = lazy(() => import('@/components/games/slots/themed/ThemedSlotMachine'));

const GAME_MAP: Record<string, ComponentType> = {
  dice: DiceGame, crash: CrashGame, mines: MinesGame, plinko: PlinkoGame,
  blackjack: BlackjackGame, roulette: RouletteGame, coinflip: CoinflipGame,
  limbo: LimboGame, hilo: HiloGame, keno: KenoGame, wheel: WheelGame,
  'dragon-tiger': DragonTigerGame, tower: TowerGame, jetpack: JetpackGame,
  'gates-olympus': OlympusSlot,
  'sweet-bonanza': BonanzaSlot,
  'big-bass': BigBassSlot,
};


function GameFallback() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex items-center gap-3 text-muted-foreground">
        <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <span className="text-xs font-mono uppercase tracking-wider">Loading game…</span>
      </div>
    </div>
  );
}

export default function GamePage() {
  const { slug } = useParams<{ slug: string }>();
  if (!slug) return <div className="text-center py-16 text-foreground">Game not found</div>;

  const GameComponent = GAME_MAP[slug];
  if (GameComponent) {
    return (
      <Suspense fallback={<GameFallback />}>
        <GameComponent />
      </Suspense>
    );
  }

  if (slug.startsWith('live-')) {
    const liveMap: Record<string, React.LazyExoticComponent<React.ComponentType>> = {
      'live-lightning-roulette': RouletteGame,
      'live-blackjack-vip': BlackjackGame,
      'live-baccarat': DragonTigerGame,
      'live-crazy-time': WheelGame,
      'live-monopoly': WheelGame,
      'live-dream-catcher': WheelGame,
      'live-mega-ball': KenoGame,
      'live-deal-no-deal': MinesGame,
    };
    const LiveComponent = liveMap[slug] ?? RouletteGame;
    const name = slug.replace('live-', '').split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    return (
      <div className="space-y-3">
        <div className="rounded-xl bg-gradient-to-r from-neon-red/10 to-primary/10 border border-neon-red/30 p-3 flex items-center gap-2 text-xs">
          <span className="px-2 py-0.5 rounded bg-neon-red text-foreground font-bold animate-pulse-neon">● LIVE</span>
          <span className="font-bold text-foreground">{name}</span>
          <span className="text-muted-foreground">— in-house version. Real dealer streaming requires a licensed B2B feed.</span>
        </div>
        <Suspense fallback={<GameFallback />}>
          <LiveComponent />
        </Suspense>
      </div>
    );
  }

  // All other slugs → themed slot (getTheme always returns a valid theme)
  return (
    <Suspense fallback={<GameFallback />}>
      <ThemedSlotMachine gameId={slug} />
    </Suspense>
  );
}
