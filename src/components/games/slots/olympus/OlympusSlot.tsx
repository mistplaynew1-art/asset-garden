/**
 * Olympus React wrapper — manages the Phaser game lifecycle and the unified
 * SlotControls bar (bet, spin, auto, turbo, paytable, free-spins badge).
 *
 * BigWinOverlay (PixiJS) replaces the old PixiOverlay for ≥10× wins; the
 * existing WinCelebration React component still shows for smaller wins.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap } from 'lucide-react';
import * as Phaser from 'phaser';
import WinCelebration from '../../WinCelebration';
import { placeGameBet } from '@/lib/game-functions';
import { useAppStore } from '@/stores/app-store';
import { playSound } from '@/lib/sounds';
import { haptic } from '@/lib/haptics';
import { OlympusSlotScene, type SpinOutcome, GRID_W, GRID_H } from './OlympusSlotScene';
import SlotControls, { type AutoCount } from '../core/SlotControls';
import PaytableModal, { type PaytableEntry } from '../core/PaytableModal';
import { createBigWinOverlay } from '../core/BigWinOverlay';
import ProvablyFairButton from '@/components/provably-fair/ProvablyFairButton';
import { SYMBOLS, SCATTER } from './symbols';

// Tight stage padding so the reels dominate the canvas and Phaser's FIT
// scaler doesn't shrink the symbols when fitted to the container width.
const STAGE_W = GRID_W + 48;
const STAGE_H = GRID_H + 110;

const PAYTABLE_ENTRIES: PaytableEntry[] = [
  { id: SCATTER.id, name: 'Zeus (Scatter)', imageUrl: SCATTER.texture,
    description: '4+ anywhere triggers 15 Free Spins with multiplier orbs.',
    payouts: ['Free Spins x15', 'Re-trigger +5'] },
  ...SYMBOLS.slice().reverse().map(s => ({
    id: s.id,
    name: s.id,
    imageUrl: s.texture,
    payouts: [
      `8–9: ${s.pays['8-9']}× bet`,
      `10–11: ${s.pays['10-11']}× bet`,
      `12+: ${s.pays['12+']}× bet`,
    ],
  })),
];

const PAYTABLE_RULES = [
  'Pays for 8 or more matching symbols anywhere on the 6×5 grid.',
  'Winning symbols explode and new ones tumble in (cascades chain wins).',
  'During Free Spins, multiplier orbs add to a global accumulator applied at the end.',
];

export default function OlympusSlot() {
  const { selectedCurrency, balances } = useAppStore();
  const balance = balances.find(b => b.currency === selectedCurrency)?.balance ?? 0;

  const [betAmount, setBetAmount] = useState('1');
  const [playing, setPlaying] = useState(false);
  const [autoSpinning, setAutoSpinning] = useState(false);
  const [autoRemaining, setAutoRemaining] = useState<AutoCount | null>(null);
  const [turboMode, setTurboMode] = useState(false);
  const [paytableOpen, setPaytableOpen] = useState(false);
  const [lastOutcome, setLastOutcome] = useState<SpinOutcome | null>(null);
  const [phase, setPhase] = useState<'idle' | 'spinning' | 'cascading' | 'free-spins' | 'big-win'>('idle');
  const [freeSpinsLeft, setFreeSpinsLeft] = useState(0);
  const [latestMultiplierDrop, setLatestMultiplierDrop] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const sceneRef = useRef<OlympusSlotScene | null>(null);
  const autoRef = useRef<{ stop: boolean; remaining: AutoCount }>({ stop: false, remaining: 0 });

  // Init Phaser
  useEffect(() => {
    if (!containerRef.current) return;
    const parent = containerRef.current;

    const sceneEvents = {
      onSpinComplete: (outcome: SpinOutcome) => {
        setLastOutcome(outcome);
        const mult = parseFloat(betAmount) > 0 ? outcome.totalPayout / parseFloat(betAmount) : 0;
        if (outcome.totalPayout > 0) {
          setTimeout(() => playSound(mult >= 50 ? 'slot.jackpot' : 'slot.win'), 100);
          if (mult >= 10) {
            createBigWinOverlay(parent, outcome.totalPayout, mult, selectedCurrency).catch(() => { /* ignore */ });
          }
        } else {
          setTimeout(() => playSound('lose'), 100);
        }
      },
      onCascadeWin: (winAmount: number) => { if (winAmount > 0) playSound('slot.win'); haptic('win-small'); },
      onFreeSpinsTriggered: (count: number) => { playSound('slot.jackpot'); haptic('jackpot'); setFreeSpinsLeft(count); },
      onMultiplierDropped: (value: number) => {
        playSound('slot.stop'); haptic('tick');
        setLatestMultiplierDrop(value);
        setTimeout(() => setLatestMultiplierDrop(null), 1400);
      },
      onFreeSpinTick: (remaining: number) => setFreeSpinsLeft(remaining),
      onPhaseChange: (p: typeof phase) => {
        setPhase(p);
        if (p === 'idle') setTimeout(() => setFreeSpinsLeft(0), 600);
      },
    };

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.CANVAS,
      width: STAGE_W,
      height: STAGE_H,
      parent,
      backgroundColor: '#0a0e1f',
      transparent: false,
      scene: OlympusSlotScene,
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      callbacks: {
        postBoot: (game) => {
          gameRef.current = game;
          requestAnimationFrame(() => {
            sceneRef.current = game.scene.getScene('OlympusSlotScene') as OlympusSlotScene;
          });
        },
      },
    };
    const game = new Phaser.Game(config);
    game.scene.start('OlympusSlotScene', { events: sceneEvents });

    return () => {
      autoRef.current.stop = true;
      game.destroy(true);
      gameRef.current = null;
      sceneRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSpin = useCallback(async () => {
    const scene = sceneRef.current ?? (gameRef.current?.scene.getScene('OlympusSlotScene') as OlympusSlotScene | undefined);
    if (!scene || playing) return;
    setPlaying(true);
    setLastOutcome(null);
    setLatestMultiplierDrop(null);
    playSound('slot.spin'); haptic('tap');
    const bet = parseFloat(betAmount);
    try {
      const outcome = await scene.startSpin(bet, false);
      const finalMult = bet > 0 ? outcome.totalPayout / bet : 0;
      placeGameBet({
        gameType: 'gates-olympus',
        betAmount: bet,
        currency: selectedCurrency,
        multiplier: finalMult,
        won: outcome.totalPayout > 0,
        result: {
          baseWin: outcome.baseWin,
          cascadeCount: outcome.cascadeCount,
          freeSpins: outcome.triggeredFreeSpins,
          freeSpinsTotal: outcome.freeSpinsTotal,
          scatterCount: outcome.scatterCount,
        },
      }).catch(() => { /* offline ok */ });
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
    <div className="w-full max-w-6xl mx-auto p-3 sm:p-4 rounded-2xl bg-void border border-yellow-400/30 shadow-2xl">
      <div className="flex items-center gap-2 mb-3">
        <Zap className="w-5 h-5 text-yellow-300" />
        <h1 className="font-display font-extrabold text-lg text-yellow-200 tracking-wider">Gates of Olympus</h1>
        {phase !== 'idle' && (
          <span className="text-[10px] uppercase tracking-widest text-yellow-300/80">{phase}</span>
        )}
        <div className="ml-auto"><ProvablyFairButton gameId="gates-olympus" /></div>
      </div>

      <div className="relative flex items-center justify-center slot-canvas-wrapper mb-4">
        <div
          ref={containerRef}
          className="relative rounded-2xl overflow-hidden border-2 border-yellow-400/30 w-full"
          style={{ aspectRatio: `${STAGE_W} / ${STAGE_H}`, width: '100%', maxWidth: 'min(100%, ' + STAGE_W + 'px)', maxHeight: 'min(70vh, calc(100vw * ' + (STAGE_H / STAGE_W) + '))' }}
        />

        <AnimatePresence>
          {latestMultiplierDrop !== null && (
            <motion.div
              key={latestMultiplierDrop}
              initial={{ scale: 0, opacity: 0, y: 0 }}
              animate={{ scale: 1.2, opacity: 1, y: -50 }}
              exit={{ opacity: 0, y: -120, scale: 0.6 }}
              transition={{ duration: 0.6 }}
              className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-gradient-to-r from-yellow-400 to-purple-500 text-black font-display font-extrabold text-xl shadow-lg pointer-events-none"
            >
              ⚡ +{latestMultiplierDrop}×
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
      />

      <PaytableModal
        open={paytableOpen}
        onClose={() => setPaytableOpen(false)}
        title="Gates of Olympus — Paytable"
        entries={PAYTABLE_ENTRIES}
        rules={PAYTABLE_RULES}
      />
    </div>
  );
}
