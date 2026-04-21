/**
 * Classic SlotMachine — Phaser-based 5×3 / 9-payline Vegas neon slot.
 * Replaces the previous emoji-React implementation per MEGA PROMPT.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Cherry } from 'lucide-react';
import * as Phaser from 'phaser';
import WinCelebration from '../WinCelebration';
import { placeGameBet } from '@/lib/game-functions';
import { useAppStore } from '@/stores/app-store';
import { playSound } from '@/lib/sounds';
import { haptic } from '@/lib/haptics';
import { ClassicSlotScene, type ClassicSpinOutcome, GRID_W, GRID_H, CLASSIC_SYMBOLS_PUBLIC, CLASSIC_PAYLINES_COUNT } from './classic/ClassicSlotScene';
import SlotControls, { type AutoCount } from './core/SlotControls';
import PaytableModal, { type PaytableEntry } from './core/PaytableModal';
import { createBigWinOverlay } from './core/BigWinOverlay';
import ProvablyFairButton from '@/components/provably-fair/ProvablyFairButton';

// Extra vertical padding so the neon frame and win counter sit above the reels.
const STAGE_W = GRID_W + 100;
const STAGE_H = GRID_H + 170;

const PAYTABLE_ENTRIES: PaytableEntry[] = CLASSIC_SYMBOLS_PUBLIC.slice().reverse().map(s => ({
  id: s.id,
  name: s.id,
  imageUrl: '',
  description: s.id === 'seven' ? 'Wild — substitutes for any symbol. 5 sevens on middle row = JACKPOT.' : undefined,
  payouts: [`3×: ${s.pays['3']}× bet`, `4×: ${s.pays['4']}× bet`, `5×: ${s.pays['5']}× bet`],
}));

const PAYTABLE_RULES = [
  '5 reels × 3 rows. 9 fixed paylines. Pays left → right.',
  'Seven 7️⃣ is wild and substitutes for all symbols.',
  '5 sevens on the middle row = JACKPOT (200× bet).',
];

interface SlotMachineProps { gameName: string; gameId: string; }

export default function SlotMachine({ gameName, gameId }: SlotMachineProps) {
  const { selectedCurrency, balances } = useAppStore();
  const balance = balances.find(b => b.currency === selectedCurrency)?.balance ?? 0;

  const [betAmount, setBetAmount] = useState('1');
  const [playing, setPlaying] = useState(false);
  const [autoSpinning, setAutoSpinning] = useState(false);
  const [autoRemaining, setAutoRemaining] = useState<AutoCount | null>(null);
  const [turboMode, setTurboMode] = useState(false);
  const [paytableOpen, setPaytableOpen] = useState(false);
  const [lastOutcome, setLastOutcome] = useState<ClassicSpinOutcome | null>(null);
  const [phase, setPhase] = useState<'idle' | 'spinning' | 'big-win'>('idle');

  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const sceneRef = useRef<ClassicSlotScene | null>(null);
  const autoRef = useRef<{ stop: boolean; remaining: AutoCount }>({ stop: false, remaining: 0 });

  useEffect(() => {
    if (!containerRef.current) return;
    const parent = containerRef.current;

    const sceneEvents = {
      onSpinComplete: (outcome: ClassicSpinOutcome) => {
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

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: STAGE_W,
      height: STAGE_H,
      parent,
      backgroundColor: '#0d0d0d',
      transparent: false,
      scene: ClassicSlotScene,
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      callbacks: {
        postBoot: (game) => {
          gameRef.current = game;
          requestAnimationFrame(() => {
            sceneRef.current = game.scene.getScene('ClassicSlotScene') as ClassicSlotScene;
          });
        },
      },
    };
    const game = new Phaser.Game(config);
    game.scene.start('ClassicSlotScene', { events: sceneEvents });

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
    const scene = sceneRef.current ?? (gameRef.current?.scene.getScene('ClassicSlotScene') as ClassicSlotScene | undefined);
    if (!scene || playing) return;
    setPlaying(true);
    setLastOutcome(null);
    playSound('slot.spin'); haptic('tap');
    const bet = parseFloat(betAmount);
    try {
      const outcome = await scene.startSpin(bet);
      const finalMult = bet > 0 ? outcome.totalPayout / bet : 0;
      placeGameBet({
        gameType: gameId || 'classic-slot',
        betAmount: bet,
        currency: selectedCurrency,
        multiplier: finalMult,
        won: outcome.totalPayout > 0,
        result: {
          jackpot: outcome.jackpot,
          reels: outcome.reels,
          winLines: outcome.paylineWins.map(w => w.paylineIndex),
          totalMultiplier: finalMult,
        },
      }).catch(() => undefined);
    } finally {
      setPlaying(false);
    }
  }, [betAmount, selectedCurrency, playing, gameId]);

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
    <div className="w-full max-w-3xl mx-auto p-3 sm:p-4 rounded-2xl bg-[#0d0d0d] border border-pink-500/40 shadow-2xl">
      <div className="flex items-center gap-2 mb-3">
        <Cherry className="w-5 h-5 text-pink-400" />
        <h1 className="font-display font-extrabold text-lg text-pink-200 tracking-wider">{gameName}</h1>
        {phase !== 'idle' && (
          <span className="text-[10px] uppercase tracking-widest text-pink-300/80">{phase}</span>
        )}
        <div className="ml-auto"><ProvablyFairButton gameId={gameId} /></div>
      </div>

      <div className="relative w-full flex items-center justify-center slot-canvas-wrapper">
        <div
          ref={containerRef}
          className="relative rounded-2xl overflow-hidden border-2 border-pink-500/40 w-full"
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
        paylinesCount={CLASSIC_PAYLINES_COUNT}
      />

      <PaytableModal
        open={paytableOpen}
        onClose={() => setPaytableOpen(false)}
        title={`${gameName} — Paytable`}
        entries={PAYTABLE_ENTRIES}
        rules={PAYTABLE_RULES}
      />
    </div>
  );
}
