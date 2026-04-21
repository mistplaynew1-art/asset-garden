/**
 * Big Bass Bonanza — React wrapper.
 *
 * Manages Phaser game lifecycle, unified SlotControls bar, paytable modal,
 * BigWinOverlay (PixiJS) for ≥10× wins, and small-win React celebration.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Fish } from 'lucide-react';
import * as Phaser from 'phaser';
import WinCelebration from '../../WinCelebration';
import { placeGameBet } from '@/lib/game-functions';
import { useAppStore } from '@/stores/app-store';
import { playSound } from '@/lib/sounds';
import { haptic } from '@/lib/haptics';
import { BigBassScene, type BigBassSpinOutcome, GRID_W, GRID_H } from './BigBassScene';
import SlotControls, { type AutoCount } from '../core/SlotControls';
import PaytableModal, { type PaytableEntry } from '../core/PaytableModal';
import { createBigWinOverlay } from '../core/BigWinOverlay';
import ProvablyFairButton from '@/components/provably-fair/ProvablyFairButton';
import { BIGBASS_SYMBOLS, FISHERMAN_WILD, SCATTER_CHEST } from './symbols';
import { gameSounds } from '@/lib/game-sounds';

// Wider/taller stage so the fisherman wild art + scatter labels stay
// outside the play grid on every viewport.
const STAGE_W = GRID_W + 110;
const STAGE_H = GRID_H + 170;

const PAYTABLE_ENTRIES: PaytableEntry[] = [
  { id: SCATTER_CHEST.id, name: 'Treasure Chest (Scatter)', imageUrl: SCATTER_CHEST.texture,
    description: '3+ scatters award 10 free spins (re-trigger +5).',
    payouts: ['Free Spins x10'] },
  { id: FISHERMAN_WILD.id, name: 'Fisherman (Wild)', imageUrl: FISHERMAN_WILD.texture,
    description: 'Substitutes for any non-scatter symbol. Collects all bass cash on the grid.',
    payouts: ['3×: 5×', '4×: 25×', '5×: 100×'] },
  ...BIGBASS_SYMBOLS.slice().reverse().map(s => ({
    id: s.id, name: s.id, imageUrl: s.texture,
    payouts: [`3×: ${s.pays['3']}× bet`, `4×: ${s.pays['4']}× bet`, `5×: ${s.pays['5']}× bet`],
  })),
];

const PAYTABLE_RULES = [
  '5 reels × 3 rows. 10 fixed paylines. Pays left → right.',
  'Fisherman wild substitutes for all symbols except Treasure Chest.',
  'During free spins, bass appear with cash values; the fisherman collects them.',
  '3 chest scatters during free spins re-trigger +5 spins.',
];

export default function BigBassSlot() {
  const { selectedCurrency, balances } = useAppStore();
  const balance = balances.find(b => b.currency === selectedCurrency)?.balance ?? 0;

  const [betAmount, setBetAmount] = useState('1');
  const [playing, setPlaying] = useState(false);
  const [autoSpinning, setAutoSpinning] = useState(false);
  const [autoRemaining, setAutoRemaining] = useState<AutoCount | null>(null);
  const [turboMode, setTurboMode] = useState(false);
  const [paytableOpen, setPaytableOpen] = useState(false);
  const [lastOutcome, setLastOutcome] = useState<BigBassSpinOutcome | null>(null);
  const [phase, setPhase] = useState<'idle' | 'spinning' | 'free-spins' | 'big-win'>('idle');
  const [freeSpinsLeft, setFreeSpinsLeft] = useState(0);
  const [latestCollection, setLatestCollection] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const sceneRef = useRef<BigBassScene | null>(null);
  const autoRef = useRef<{ stop: boolean; remaining: AutoCount }>({ stop: false, remaining: 0 });

  useEffect(() => {
    if (!containerRef.current) return;
    const parent = containerRef.current;

    const sceneEvents = {
      onSpinComplete: (outcome: BigBassSpinOutcome) => {
        setLastOutcome(outcome);
        const mult = parseFloat(betAmount) > 0 ? outcome.totalPayout / parseFloat(betAmount) : 0;
        if (outcome.totalPayout > 0) {
          setTimeout(() => playSound(mult >= 50 ? 'slot.jackpot' : 'slot.win'), 100);
          if (mult >= 10) {
            createBigWinOverlay(parent, outcome.totalPayout, mult, selectedCurrency).catch(() => undefined);
          }
        } else {
          setTimeout(() => playSound('lose'), 100);
        }
      },
      onCashCollected: (amount: number) => {
        setLatestCollection(amount);
        setTimeout(() => setLatestCollection(null), 1400);
      },
      onFreeSpinsTriggered: (count: number) => { playSound('slot.jackpot'); haptic('jackpot'); setFreeSpinsLeft(count); },
      onFreeSpinTick: (remaining: number) => setFreeSpinsLeft(remaining),
      onPhaseChange: (p: 'idle' | 'spinning' | 'free-spins' | 'big-win') => {
        setPhase(p);
        if (p === 'idle') setTimeout(() => setFreeSpinsLeft(0), 600);
      },
    };

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: STAGE_W,
      height: STAGE_H,
      parent,
      backgroundColor: '#0a1220',
      transparent: false,
      scene: BigBassScene,
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      callbacks: {
        postBoot: (game) => {
          gameRef.current = game;
          requestAnimationFrame(() => {
            sceneRef.current = game.scene.getScene('BigBassScene') as BigBassScene;
          });
        },
      },
    };
    const game = new Phaser.Game(config);
    game.scene.start('BigBassScene', { events: sceneEvents });

    // Bridge sound events from scene
    const soundBridge = (key: string) => playSound(key as Parameters<typeof playSound>[0]);
    requestAnimationFrame(() => {
      const s = game.scene.getScene('BigBassScene') as BigBassScene | undefined;
      s?.events.on('sound', soundBridge);
    });

    return () => {
      autoRef.current.stop = true;
      game.destroy(true);
      gameRef.current = null;
      sceneRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync turbo mode with scene
  useEffect(() => {
    sceneRef.current?.setTurbo(turboMode);
  }, [turboMode]);

  const handleSpin = useCallback(async () => {
    const scene = sceneRef.current ?? (gameRef.current?.scene.getScene('BigBassScene') as BigBassScene | undefined);
    if (!scene || playing) return;
    setPlaying(true);
    setLastOutcome(null);
    setLatestCollection(null);
    playSound('slot.spin'); haptic('tap');
    const bet = parseFloat(betAmount);
    try {
      const outcome = await scene.startSpin(bet, false);
      const finalMult = bet > 0 ? outcome.totalPayout / bet : 0;
      placeGameBet({
        gameType: 'big-bass',
        betAmount: bet,
        currency: selectedCurrency,
        multiplier: finalMult,
        won: outcome.totalPayout > 0,
        result: {
          baseWin: outcome.baseWin,
          scatterCount: outcome.scatterCount,
          freeSpins: outcome.triggeredFreeSpins,
          freeSpinsTotal: outcome.freeSpinsTotal,
          collectedCash: outcome.collectedCash,
          reels: outcome.reels,
          winLines: outcome.paylineWins.map(w => w.paylineIndex),
        },
      }).catch(() => undefined);
    } finally {
      setPlaying(false);
    }
  }, [betAmount, selectedCurrency, playing]);

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
  const lastMult = lastOutcome && parseFloat(betAmount) > 0 ? lastOutcome.totalPayout / parseFloat(betAmount) : 0;

  return (
    <div className="w-full max-w-6xl mx-auto p-3 sm:p-4 rounded-2xl bg-[#06141c] border border-amber-700/40 shadow-2xl">
      <div className="flex items-center gap-2 mb-3">
        <Fish className="w-5 h-5 text-amber-400" />
        <h1 className="font-display font-extrabold text-lg text-amber-200 tracking-wider">Big Bass Bonanza</h1>
        {phase !== 'idle' && (
          <span className="text-[10px] uppercase tracking-widest text-amber-300/80">{phase.replace('-', ' ')}</span>
        )}
        <div className="ml-auto"><ProvablyFairButton gameId="big-bass" /></div>
      </div>

      {/* Phaser Game Canvas - Full Width */}
      <div className="relative flex items-center justify-center slot-canvas-wrapper mb-4">
        <div
          ref={containerRef}
          className="relative rounded-2xl overflow-hidden border-2 border-amber-700/40 w-full"
          style={{ aspectRatio: `${STAGE_W} / ${STAGE_H}`, width: '100%', maxWidth: 'min(100%, ' + STAGE_W + 'px)', maxHeight: 'min(70vh, calc(100vw * ' + (STAGE_H / STAGE_W) + '))' }}
        />

        <AnimatePresence>
          {latestCollection !== null && (
            <motion.div
              key={latestCollection}
              initial={{ scale: 0, opacity: 0, y: 0 }}
              animate={{ scale: 1.2, opacity: 1, y: -50 }}
              exit={{ opacity: 0, y: -120, scale: 0.6 }}
              transition={{ duration: 0.6 }}
              className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-400 to-emerald-400 text-black font-display font-extrabold text-xl shadow-lg pointer-events-none"
            >
              🎣 +{latestCollection}
            </motion.div>
          )}
        </AnimatePresence>

        <WinCelebration
          show={!!lastOutcome && lastOutcome.totalPayout > 0 && phase === 'idle' && lastMult < 10}
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
        freeSpinsRemaining={freeSpinsLeft}
        paylinesCount={10}
      />

      <PaytableModal
        open={paytableOpen}
        onClose={() => setPaytableOpen(false)}
        title="Big Bass Bonanza — Paytable"
        entries={PAYTABLE_ENTRIES}
        rules={PAYTABLE_RULES}
      />
    </div>
  );
}
