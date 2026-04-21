/**
 * ThemedSlotMachine — React wrapper that boots a Phaser game using
 * ThemedSlotScene with a SlotTheme. Designed so each routed slot game gets
 * its own unique scene-key + theme without duplicating engine code.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Crown, Flame, Gem, Star, Cherry, Sparkles, Zap, Mountain, Candy,
} from 'lucide-react';
import * as Phaser from 'phaser';
import WinCelebration from '../../WinCelebration';
import { placeGameBet } from '@/lib/game-functions';
import { useAppStore } from '@/stores/app-store';
import { playSound } from '@/lib/sounds';
import { haptic } from '@/lib/haptics';
import SlotControls, { type AutoCount } from '../core/SlotControls';
import PaytableModal, { type PaytableEntry } from '../core/PaytableModal';
import { createBigWinOverlay } from '../core/BigWinOverlay';
import ProvablyFairButton from '@/components/provably-fair/ProvablyFairButton';
import { getTheme, type SlotTheme } from './themes';
import {
  makeThemedSceneClass,
  type ThemedSpinOutcome,
  GRID_W, GRID_H, PAYLINES_COUNT,
} from './ThemedSlotScene';

// Tight stage padding so Phaser's FIT scaler keeps reels large on the user's
// viewport. Just enough breathing room for the title banner above and the
// win counter + payline indicators around the grid.
const STAGE_W = GRID_W + 56;
const STAGE_H = GRID_H + 120;

const ICON_MAP = {
  crown: Crown, flame: Flame, gem: Gem, star: Star, cherry: Cherry,
  sparkles: Sparkles, zap: Zap, mountain: Mountain, candy: Candy,
};

interface ThemedSlotMachineProps { gameId: string; }

export default function ThemedSlotMachine({ gameId }: ThemedSlotMachineProps) {
  const { selectedCurrency, balances } = useAppStore();
  const balance = balances.find(b => b.currency === selectedCurrency)?.balance ?? 0;

  const theme = useMemo<SlotTheme | null>(() => getTheme(gameId) ?? null, [gameId]);

  const [betAmount, setBetAmount] = useState('1');
  const [playing, setPlaying] = useState(false);
  const [autoSpinning, setAutoSpinning] = useState(false);
  const [autoRemaining, setAutoRemaining] = useState<AutoCount | null>(null);
  const [turboMode, setTurboMode] = useState(false);
  const [paytableOpen, setPaytableOpen] = useState(false);
  const [lastOutcome, setLastOutcome] = useState<ThemedSpinOutcome | null>(null);
  const [phase, setPhase] = useState<'idle' | 'spinning' | 'big-win'>('idle');

  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sceneRef = useRef<any>(null);
  const autoRef = useRef<{ stop: boolean; remaining: AutoCount }>({ stop: false, remaining: 0 });

  const sceneKey = useMemo(() => `ThemedSlotScene_${gameId}`, [gameId]);

  useEffect(() => {
    if (!containerRef.current || !theme) return;
    const parent = containerRef.current;

    const sceneEvents = {
      onSpinComplete: (outcome: ThemedSpinOutcome) => {
        setLastOutcome(outcome);
        const mult = parseFloat(betAmount) > 0 ? outcome.totalPayout / parseFloat(betAmount) : 0;
        if (outcome.totalPayout > 0) {
          setTimeout(() => playSound(outcome.jackpot || mult >= 50 ? 'slot.jackpot' : 'slot.win'), 100);
          if (outcome.jackpot || mult >= 10) {
            createBigWinOverlay(parent, outcome.totalPayout, outcome.jackpot ? 200 : mult, selectedCurrency).catch(() => undefined);
          }
        } else {
          setTimeout(() => playSound('lose'), 100);
        }
      },
      onPhaseChange: (p: 'idle' | 'spinning' | 'big-win') => setPhase(p),
    };

    const SceneCls = makeThemedSceneClass(sceneKey);

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: STAGE_W,
      height: STAGE_H,
      parent,
      backgroundColor: `#${theme.backgroundColor.toString(16).padStart(6, '0')}`,
      transparent: false,
      scene: SceneCls,
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      callbacks: {
        postBoot: (game) => {
          gameRef.current = game;
          requestAnimationFrame(() => {
            sceneRef.current = game.scene.getScene(sceneKey);
          });
        },
      },
    };
    const game = new Phaser.Game(config);
    game.scene.start(sceneKey, { events: sceneEvents, theme });

    return () => {
      autoRef.current.stop = true;
      game.destroy(true);
      gameRef.current = null;
      sceneRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneKey, theme]);

  useEffect(() => { sceneRef.current?.setTurbo(turboMode); }, [turboMode]);

  const handleSpin = useCallback(async () => {
    const scene = sceneRef.current ?? gameRef.current?.scene.getScene(sceneKey);
    if (!scene || playing || !theme) return;
    setPlaying(true);
    setLastOutcome(null);
    playSound('slot.spin'); haptic('tap');
    const bet = parseFloat(betAmount);
    try {
      const outcome: ThemedSpinOutcome = await scene.startSpin(bet);
      const finalMult = bet > 0 ? outcome.totalPayout / bet : 0;
      placeGameBet({
        gameType: 'themed-slot',
        betAmount: bet,
        currency: selectedCurrency,
        multiplier: finalMult,
        won: outcome.totalPayout > 0,
        result: {
          themeId: gameId,
          jackpot: outcome.jackpot,
          reels: outcome.reels,
          winLines: outcome.paylineWins.map(w => w.paylineIndex),
          totalMultiplier: finalMult,
          theme: theme.id,
        },
      }).catch(() => undefined);
    } finally {
      setPlaying(false);
    }
  }, [betAmount, selectedCurrency, playing, gameId, theme, sceneKey]);

  const runAutoSpin = useCallback(async (count: AutoCount) => {
    if (autoSpinning) return;
    autoRef.current = { stop: false, remaining: count };
    setAutoSpinning(true);
    setAutoRemaining(count);
    while (!autoRef.current.stop) {
      const r = autoRef.current.remaining;
      if (r !== 'infinite' && r <= 0) break;
      await handleSpin();
      if (autoRef.current.remaining !== 'infinite') {
        autoRef.current.remaining = (autoRef.current.remaining as number) - 1;
        setAutoRemaining(autoRef.current.remaining);
      }
      if (!turboMode) await new Promise(res => setTimeout(res, 300));
    }
    setAutoSpinning(false);
    setAutoRemaining(null);
  }, [autoSpinning, handleSpin, turboMode]);

  const stopAuto = useCallback(() => { autoRef.current.stop = true; }, []);
  const lastMult = lastOutcome && parseFloat(betAmount) > 0
    ? lastOutcome.totalPayout / parseFloat(betAmount)
    : 0;

  if (!theme) {
    return (
      <div className="text-center py-16 text-foreground">
        <p>Theme not configured for "{gameId}".</p>
      </div>
    );
  }

  const paytableEntries: PaytableEntry[] = theme.symbols.slice().reverse().map(s => ({
    id: s.id,
    name: s.name,
    imageUrl: '',
    description:
      s.id === theme.wildId ? 'Wild — substitutes for any symbol.'
      : s.id === theme.jackpotId ? `Jackpot — 5 on middle row triggers the grand prize.`
      : undefined,
    payouts: [`3×: ${s.pays['3']}× bet`, `4×: ${s.pays['4']}× bet`, `5×: ${s.pays['5']}× bet`],
  }));

  const Icon = ICON_MAP[theme.icon] ?? Star;

  return (
    <div
      className={`w-full max-w-6xl mx-auto p-3 sm:p-4 rounded-2xl ${theme.containerBgClass} ${theme.containerBorderClass} border shadow-2xl`}
    >
      <div className="flex items-center gap-2 mb-3">
        <Icon className={`w-5 h-5 ${theme.headerColorClass}`} />
        <div className="flex flex-col">
          <h1 className={`font-display font-extrabold text-lg ${theme.headerColorClass} tracking-wider leading-tight`}>
            {theme.name}
          </h1>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            {theme.tagline}
          </span>
        </div>
        {phase !== 'idle' && (
          <span className={`text-[10px] uppercase tracking-widest ${theme.headerColorClass}/80`}>
            {phase}
          </span>
        )}
        <div className="ml-auto"><ProvablyFairButton gameId={gameId} /></div>
      </div>

      {/* Phaser Game Canvas - Full Width */}
      <div className="relative flex items-center justify-center slot-canvas-wrapper mb-4">
        <div
          ref={containerRef}
          className={`relative rounded-2xl overflow-hidden border-2 ${theme.containerBorderClass} w-full`}
          style={{ aspectRatio: `${STAGE_W} / ${STAGE_H}`, width: '100%', maxWidth: 'min(100%, ' + STAGE_W + 'px)', maxHeight: 'min(70vh, calc(100vw * ' + (STAGE_H / STAGE_W) + '))' }}
        />
        <WinCelebration
          show={!!lastOutcome && lastOutcome.totalPayout > 0 && phase === 'idle' && lastMult < 10 && !lastOutcome.jackpot}
          amount={lastOutcome?.totalPayout ?? 0}
          currency={selectedCurrency}
          multiplier={lastMult}
          big={false}
        />
      </div>

      <SlotControls
        betAmount={betAmount}
        setBetAmount={setBetAmount}
        onSpin={handleSpin}
        onAutoSpin={runAutoSpin}
        onStopAuto={stopAuto}
        onToggleTurbo={() => setTurboMode(t => !t)}
        onOpenPaytable={() => setPaytableOpen(true)}
        spinning={playing}
        autoSpinning={autoSpinning}
        autoRemaining={autoRemaining}
        turboMode={turboMode}
        phase={phase}
        balance={balance}
        currency={selectedCurrency}
        lastWin={lastOutcome?.totalPayout ?? 0}
        freeSpinsRemaining={0}
        paylinesCount={PAYLINES_COUNT}
      />

      <PaytableModal
        open={paytableOpen}
        onClose={() => setPaytableOpen(false)}
        title={`${theme.name} — Paytable`}
        entries={paytableEntries}
        rules={theme.rules}
      />
    </div>
  );
}
