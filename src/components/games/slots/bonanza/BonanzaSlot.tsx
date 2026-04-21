/**
 * Sweet Bonanza — React wrapper. Manages Phaser game lifecycle, unified
 * SlotControls bar, paytable modal, and BigWinOverlay (PixiJS) for ≥10×.
 * Enhanced with 3D PremiumSlotMachine for premium visual experience.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Candy } from 'lucide-react';
import * as Phaser from 'phaser';
import WinCelebration from '../../WinCelebration';
import { placeGameBet } from '@/lib/game-functions';
import { useAppStore } from '@/stores/app-store';
import { playSound } from '@/lib/sounds';
import { haptic } from '@/lib/haptics';
import { BonanzaScene, type BonanzaSpinOutcome, GRID_W, GRID_H } from './BonanzaScene';
import SlotControls, { type AutoCount } from '../core/SlotControls';
import PaytableModal, { type PaytableEntry } from '../core/PaytableModal';
import { createBigWinOverlay } from '../core/BigWinOverlay';
import ProvablyFairButton from '@/components/provably-fair/ProvablyFairButton';
import { BONANZA_SYMBOLS, SCATTER_BONANZA } from './symbols';

// Generous vertical padding so the win counter, multiplier badge and
// candy chrome live above/below the cluster grid without overlapping symbols.
const STAGE_W = GRID_W + 100;
const STAGE_H = GRID_H + 170;

const PAYTABLE_ENTRIES: PaytableEntry[] = [
  { id: SCATTER_BONANZA.id, name: 'Lollipop (Scatter)', imageUrl: SCATTER_BONANZA.texture,
    description: '4+ scatters trigger 10 free spins with multiplier bombs.',
    payouts: ['Free Spins x10'] },
  ...BONANZA_SYMBOLS.slice().reverse().map(s => ({
    id: s.id, name: s.id, imageUrl: s.texture,
    payouts: [
      `5–6: ${s.pays['5-6']}× bet`,
      `7–8: ${s.pays['7-8']}× bet`,
      `9–10: ${s.pays['9-10']}× bet`,
      `11+: ${s.pays['11+']}× bet`,
    ],
  })),
];

const PAYTABLE_RULES = [
  '6 reels × 5 rows. Cluster pays — 5+ matching connected symbols anywhere.',
  'Winning clusters explode and remaining symbols tumble down (cascades chain wins).',
  'During Free Spins, multiplier bombs land randomly and add to a global accumulator multiplier.',
];

export default function BonanzaSlot() {
  const { selectedCurrency, balances } = useAppStore();
  const balance = balances.find(b => b.currency === selectedCurrency)?.balance ?? 0;

  const [betAmount, setBetAmount] = useState('1');
  const [playing, setPlaying] = useState(false);
  const [autoSpinning, setAutoSpinning] = useState(false);
  const [autoRemaining, setAutoRemaining] = useState<AutoCount | null>(null);
  const [turboMode, setTurboMode] = useState(false);
  const [paytableOpen, setPaytableOpen] = useState(false);
  const [lastOutcome, setLastOutcome] = useState<BonanzaSpinOutcome | null>(null);
  const [phase, setPhase] = useState<'idle' | 'spinning' | 'cascading' | 'free-spins' | 'big-win'>('idle');
  const [freeSpinsLeft, setFreeSpinsLeft] = useState(0);
  const [latestMultDrop, setLatestMultDrop] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const sceneRef = useRef<BonanzaScene | null>(null);
  const autoRef = useRef<{ stop: boolean; remaining: AutoCount }>({ stop: false, remaining: 0 });

  useEffect(() => {
    if (!containerRef.current) return;
    const parent = containerRef.current;

    const sceneEvents = {
      onSpinComplete: (outcome: BonanzaSpinOutcome) => {
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
      onCascadeWin: (amount: number) => { if (amount > 0) playSound('slot.win'); haptic('win-small'); },
      onMultiplierDropped: (value: number) => {
        playSound('slot.stop'); haptic('tick');
        setLatestMultDrop(value);
        setTimeout(() => setLatestMultDrop(null), 1400);
      },
      onFreeSpinsTriggered: (count: number) => { playSound('slot.jackpot'); haptic('jackpot'); setFreeSpinsLeft(count); },
      onFreeSpinTick: (remaining: number) => setFreeSpinsLeft(remaining),
      onPhaseChange: (p: typeof phase) => {
        setPhase(p);
        if (p === 'idle') setTimeout(() => setFreeSpinsLeft(0), 600);
      },
    };

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: STAGE_W,
      height: STAGE_H,
      parent,
      backgroundColor: '#1a0820',
      transparent: false,
      scene: BonanzaScene,
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      callbacks: {
        postBoot: (game) => {
          gameRef.current = game;
          requestAnimationFrame(() => {
            sceneRef.current = game.scene.getScene('BonanzaScene') as BonanzaScene;
          });
        },
      },
    };
    const game = new Phaser.Game(config);
    game.scene.start('BonanzaScene', { events: sceneEvents });

    return () => {
      autoRef.current.stop = true;
      game.destroy(true);
      gameRef.current = null;
      sceneRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { sceneRef.current?.setTurbo(turboMode); }, [turboMode]);

  const handleSpin = useCallback(async () => {
    const scene = sceneRef.current ?? (gameRef.current?.scene.getScene('BonanzaScene') as BonanzaScene | undefined);
    if (!scene || playing) return;
    setPlaying(true);
    setLastOutcome(null);
    setLatestMultDrop(null);
    playSound('slot.spin'); haptic('tap');
    const bet = parseFloat(betAmount);
    try {
      const outcome = await scene.startSpin(bet, false);
      const finalMult = bet > 0 ? outcome.totalPayout / bet : 0;
      placeGameBet({
        gameType: 'sweet-bonanza',
        betAmount: bet,
        currency: selectedCurrency,
        multiplier: finalMult,
        won: outcome.totalPayout > 0,
        result: {
          baseWin: outcome.baseWin,
          cascadeCount: outcome.cascadeCount,
          scatterCount: outcome.scatterCount,
          freeSpins: outcome.triggeredFreeSpins,
          freeSpinsTotal: outcome.freeSpinsTotal,
          globalMultiplier: outcome.globalMultiplier,
          reels: outcome.reels,
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
    <div className="w-full max-w-5xl mx-auto p-3 sm:p-4 rounded-2xl bg-[#1a0820] border border-pink-400/40 shadow-2xl">
      <div className="flex items-center gap-2 mb-3">
        <Candy className="w-5 h-5 text-pink-300" />
        <h1 className="font-display font-extrabold text-lg text-pink-200 tracking-wider">Sweet Bonanza</h1>
        {phase !== 'idle' && (
          <span className="text-[10px] uppercase tracking-widest text-pink-300/80">{phase.replace('-', ' ')}</span>
        )}
        <div className="ml-auto"><ProvablyFairButton gameId="sweet-bonanza" /></div>
      </div>

      {/* Phaser Game Canvas - Full Width */}
      <div className="relative flex items-center justify-center slot-canvas-wrapper mb-4">
        <div
          ref={containerRef}
          className="relative rounded-2xl overflow-hidden border-2 border-pink-400/40 w-full"
          style={{ aspectRatio: `${STAGE_W} / ${STAGE_H}`, width: '100%', maxWidth: 'min(100%, ' + STAGE_W + 'px)', maxHeight: 'min(70vh, calc(100vw * ' + (STAGE_H / STAGE_W) + '))' }}
        />

        <AnimatePresence>
          {latestMultDrop !== null && (
            <motion.div
              key={latestMultDrop}
              initial={{ scale: 0, opacity: 0, y: 0 }}
              animate={{ scale: 1.2, opacity: 1, y: -50 }}
              exit={{ opacity: 0, y: -120, scale: 0.6 }}
              transition={{ duration: 0.6 }}
              className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-gradient-to-r from-pink-400 to-yellow-400 text-black font-display font-extrabold text-xl shadow-lg pointer-events-none"
            >
              💣 +{latestMultDrop}×
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
        title="Sweet Bonanza — Paytable"
        entries={PAYTABLE_ENTRIES}
        rules={PAYTABLE_RULES}
      />
    </div>
  );
}
