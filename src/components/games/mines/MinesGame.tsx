/**
 * Mines — premium minefield game.
 *
 * Features:
 *  • Interactive minefield with glowing gems and mines
 *  • Real-time probability + next-multiplier display
 *  • Animated multiplier counter
 *  • Game-specific sounds from game-sounds.ts
 */
import { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bomb, History, Sparkles } from 'lucide-react';
import { getMultiplierColor } from '@/lib/animations';
import GameShell from '../GameShell';
import WinCelebration from '../WinCelebration';
import { playMines } from '@/lib/game-functions';
import { useAppStore } from '@/stores/app-store';
import { haptic } from '@/lib/haptics';
import { gameSounds } from '@/lib/game-sounds';

interface Tile {
  isRevealed: boolean;
  isMine: boolean;
  isGem: boolean;
}

export default function MinesGame() {
  const { selectedCurrency } = useAppStore();
  const [betAmount, setBetAmount] = useState('10');
  const [playing, setPlaying] = useState(false);
  const [mineCount, setMineCount] = useState(5);
  const [gameActive, setGameActive] = useState(false);
  const [minePositions, setMinePositions] = useState<number[]>([]);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [busted, setBusted] = useState(false);
  const [bustedAt, setBustedAt] = useState<number | null>(null);
  const [currentMultiplier, setCurrentMultiplier] = useState(1);
  const [history, setHistory] = useState<Array<{ won: boolean; mult: number }>>([]);
  const [celebrate, setCelebrate] = useState(false);
  const [roundToken, setRoundToken] = useState<string | null>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);

  const [pickOrder, setPickOrder] = useState<number[]>([]);

  // Initialize audio context
  useEffect(() => {
    setAudioContext(new (window.AudioContext || (window as any).webkitAudioContext)());
  }, []);

  // Play mines-specific sound
  const playMinesSound = useCallback((soundType: 'reveal' | 'boom' | 'cashout' | 'tick') => {
    if (!audioContext) return;
    const soundProfile = gameSounds.mines;
    const sounds = soundProfile.sounds as Record<string, (ctx: AudioContext) => void>;
    if (sounds[soundType]) {
      sounds[soundType](audioContext);
    }
  }, [audioContext]);

  const safeCount = 25 - mineCount;
  const safeRevealedCount = useMemo(
    () => Array.from(revealed).filter(i => !minePositions.includes(i)).length,
    [revealed, minePositions]
  );
  const tilesLeft = 25 - revealed.size;
  const safeLeft = safeCount - safeRevealedCount;
  const nextProbability = tilesLeft > 0 ? (safeLeft / tilesLeft) * 100 : 0;
  const nextMultiplier = useMemo(() => {
    if (!gameActive || busted) return null;
    return Math.round((25 / safeCount) ** (safeRevealedCount + 1) * 100) / 100;
  }, [gameActive, busted, safeCount, safeRevealedCount]);

  // Convert game state to 3D grid format
  const grid3D = useMemo((): Tile[][] => {
    const grid: Tile[][] = [];
    for (let row = 0; row < 5; row++) {
      const rowData: Tile[] = [];
      for (let col = 0; col < 5; col++) {
        const index = row * 5 + col;
        const isRevealed = revealed.has(index);
        const isMine = minePositions.includes(index);
        rowData.push({
          isRevealed,
          isMine,
          isGem: isRevealed && !isMine,
        });
      }
      grid.push(rowData);
    }
    return grid;
  }, [revealed, minePositions]);

  const handlePlay = useCallback(async () => {
    setPlaying(true);
    try {
      const init = await playMines({ betAmount: parseFloat(betAmount), mineCount, picks: [], cashout: false, init: true } as never);
      setRoundToken(init.result.roundToken ?? null);
      setMinePositions([]);
      setRevealed(new Set());
      setPickOrder([]);
      setBusted(false);
      setBustedAt(null);
      setCurrentMultiplier(1);
      setGameActive(true);
    } catch (e) {
      console.error('mines init', e);
    } finally {
      setPlaying(false);
    }
  }, [mineCount, betAmount]);

  const handleReveal = async (index: number) => {
    if (!gameActive || busted || revealed.has(index)) return;
    try {
      const res = await playMines({ betAmount: parseFloat(betAmount), mineCount, picks: [...pickOrder, index], cashout: false, roundToken: roundToken ?? undefined, action: 'pick' } as never);
      const newRevealed = new Set(revealed);
      newRevealed.add(index);
      setRevealed(newRevealed);
      const newPicks = [...pickOrder, index];
      setPickOrder(newPicks);
      setRoundToken(res.result.roundToken ?? null);
      if (res.result.busted) {
        setMinePositions(res.result.minePositions ?? []);
        setRevealed(new Set([...(res.result.picks ?? []), ...(res.result.minePositions ?? [])]));
        setRoundToken(null);
        setBusted(true);
        setBustedAt(res.result.bustIndex ?? index);
        setGameActive(false);
        playMinesSound('boom');
        haptic('lose');
        setHistory(prev => [{ won: false, mult: 0 }, ...prev].slice(0, 20));
        return;
      }
      const mult = res.result.multiplier ?? currentMultiplier;
      setCurrentMultiplier(mult);
      playMinesSound('reveal');
      haptic('tap');
      if (res.result.cashout) {
        setMinePositions(res.result.minePositions ?? []);
        setGameActive(false);
        setRoundToken(null);
        playMinesSound('cashout');
        haptic('win-small');
        setCelebrate(true);
        setTimeout(() => setCelebrate(false), 2200);
        setHistory(prev => [{ won: true, mult }, ...prev].slice(0, 20));
      }
    } catch {
      return;
    }
  };

  const handleCashout = async () => {
    if (!gameActive || busted) return;
    try {
      const res = await playMines({ betAmount: parseFloat(betAmount), mineCount, picks: pickOrder, cashout: true, roundToken: roundToken ?? undefined, action: 'cashout' } as never);
      setMinePositions(res.result.minePositions ?? []);
      setRoundToken(null);
      setGameActive(false);
      playMinesSound('cashout');
      haptic('win-small');
      setCelebrate(true);
      setTimeout(() => setCelebrate(false), 2200);
      setHistory(prev => [{ won: true, mult: res.multiplier }, ...prev].slice(0, 20));
    } catch {
      setBusted(true);
      return;
    }
  };

  const extraControls = (
    <div className="space-y-3 p-4 rounded-xl bg-surface border border-border">
      <div>
        <label className="text-[10px] font-bold font-display text-muted-foreground uppercase tracking-wider mb-1 block">
          Mines: {mineCount}
        </label>
        <input
          type="range" min={1} max={24} value={mineCount}
          onChange={e => setMineCount(Number(e.target.value))}
          className="w-full accent-primary" disabled={gameActive}
        />
      </div>
      {gameActive && !busted && (
        <>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="p-2 rounded-lg bg-void border border-border">
              <div className="text-[9px] uppercase text-muted-foreground font-display">Multiplier</div>
              <motion.div
                key={currentMultiplier}
                initial={{ scale: 1.4 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.45 }}
                className={`font-mono font-extrabold text-xl tabular-nums ${currentMultiplier >= 25 ? 'text-rainbow' : ''}`}
                style={currentMultiplier < 25 ? { color: getMultiplierColor(currentMultiplier) } : undefined}
              >
                {currentMultiplier.toFixed(2)}×
              </motion.div>
            </div>
            <div className="p-2 rounded-lg bg-void border border-border">
              <div className="text-[9px] uppercase text-muted-foreground font-display">Next pick</div>
              <div className="font-mono font-bold text-xl text-foreground">
                {nextMultiplier?.toFixed(2)}×
              </div>
              <div className="text-[9px] text-muted-foreground">{nextProbability.toFixed(1)}% safe</div>
            </div>
          </div>
          <button
            onClick={handleCashout}
            className="w-full py-3 rounded-xl font-display font-bold text-sm bg-neon-green/20 border border-neon-green/40 text-glow-green hover:bg-neon-green/30 transition-colors"
          >
            Cashout {(parseFloat(betAmount) * currentMultiplier).toFixed(2)}
          </button>
        </>
      )}
    </div>
  );

  const historyPanel = history.length > 0 ? (
    <div className="p-3 rounded-xl bg-surface border border-border">
      <div className="text-[10px] font-bold text-muted-foreground uppercase mb-2 flex items-center gap-1">
        <History className="w-3 h-3" /> History
      </div>
      <div className="flex flex-wrap gap-1">
        {history.map((r, i) => (
          <span
            key={i}
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
              r.won ? 'bg-neon-green/10 text-glow-green' : 'bg-neon-red/10 text-glow-red'
            }`}
          >
            {r.won ? `${r.mult.toFixed(2)}×` : '💣'}
          </span>
        ))}
      </div>
    </div>
  ) : undefined;

  return (
    <GameShell
      title="Mines"
      icon={<Bomb className="w-6 h-6 text-primary" />}
      betAmount={betAmount}
      setBetAmount={setBetAmount}
      onPlay={handlePlay}
      playing={playing}
      disabled={gameActive}
      playLabel={gameActive ? 'Game Active' : 'Start Game'}
      extraControls={extraControls}
      history={historyPanel}
    >
      <div className="w-full max-w-[400px] space-y-4">
        {/* Clickable tile grid */}
        <div className="grid grid-cols-5 gap-2" style={{ perspective: 800 }}>
          {Array.from({ length: 25 }, (_, i) => {
            const isRevealed = revealed.has(i);
            const isMine = minePositions.includes(i);
            const showMineUnflipped = busted && !isRevealed && isMine;
            const flipped = isRevealed || showMineUnflipped;
            const showSafe = isRevealed && !isMine;
            const showMine = (isRevealed && isMine) || showMineUnflipped;
            const isBustTile = bustedAt === i;

            return (
              <motion.button
                key={i}
                onClick={() => handleReveal(i)}
                whileHover={gameActive && !isRevealed ? { scale: 1.06, y: -2 } : {}}
                whileTap={gameActive && !isRevealed ? { scale: 0.94 } : {}}
                disabled={!gameActive || isRevealed}
                className="relative aspect-square rounded-lg border text-lg font-bold transition-colors
                  bg-void/80 border-border hover:border-neon-blue/40 disabled:cursor-default
                  shadow-[inset_0_2px_0_rgba(255,255,255,0.04)]"
              >
                <motion.div
                  animate={{ rotateY: flipped ? 180 : 0 }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                  className="absolute inset-0 rounded-lg"
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  <div
                    className="absolute inset-0 rounded-lg flex items-center justify-center"
                    style={{ backfaceVisibility: 'hidden' }}
                  >
                    <div className="w-3 h-3 rounded-sm bg-elevated/60 border border-border" />
                  </div>
                  <div
                    className={`absolute inset-0 rounded-lg flex items-center justify-center ${
                      showSafe
                        ? 'bg-neon-green/15 border border-neon-green/40 shadow-[0_0_18px_hsl(var(--neon-green)/0.3)]'
                        : showMine
                          ? isBustTile
                            ? 'bg-neon-red/30 border border-neon-red shadow-[0_0_22px_hsl(var(--neon-red)/0.6)]'
                            : 'bg-elevated border border-border opacity-60'
                          : 'bg-elevated border border-border'
                    }`}
                    style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                  >
                    {showSafe && <span className="text-neon-green text-xl">💎</span>}
                    {showMine && <span className="text-2xl">💣</span>}
                  </div>
                </motion.div>
              </motion.button>
            );
          })}
        </div>

        <WinCelebration
          show={celebrate}
          amount={parseFloat(betAmount || '0') * currentMultiplier}
          currency={selectedCurrency}
          multiplier={currentMultiplier}
          big={currentMultiplier >= 5}
        />
      </div>

      <AnimatePresence>
        {busted && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-4 text-center text-glow-red font-display font-bold text-xl"
            aria-live="polite"
          >
            💥 Boom! You hit a mine
          </motion.div>
        )}
        {!gameActive && !busted && safeRevealedCount > 0 && currentMultiplier > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-4 text-center text-glow-green font-display font-bold text-lg flex items-center gap-2 justify-center"
          >
            <Sparkles className="w-5 h-5" /> Cashed out at {currentMultiplier.toFixed(2)}×
          </motion.div>
        )}
      </AnimatePresence>
    </GameShell>
  );
}