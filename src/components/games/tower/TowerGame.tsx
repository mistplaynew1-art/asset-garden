import { useState, useCallback, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, History, Bomb } from 'lucide-react';
import GameShell from '../GameShell';
import WinCelebration from '../WinCelebration';
import { playTower } from '@/lib/game-functions';
import { useAppStore } from '@/stores/app-store';
import { useWallet } from '@/hooks/use-wallet';
import { playSound } from '@/lib/sounds';
import { haptic } from '@/lib/haptics';
import { gameSounds } from '@/lib/game-sounds';

// Hard: 2 columns with 1 bomb per row → 1/2 safe odds, max ≈ 501.76× over 8 rows.
const DIFFICULTY_CONFIGS = {
  easy: { mines: 1, cols: 4, multiplierStep: 1.31 },
  medium: { mines: 1, cols: 3, multiplierStep: 1.47 },
  hard: { mines: 1, cols: 2, multiplierStep: 2.1813 },
};
type Difficulty = keyof typeof DIFFICULTY_CONFIGS;
type CellState = 'hidden' | 'safe' | 'bomb';

/** SVG gem icon — replaces emoji for crispness. */
const Gem = memo(function Gem() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
      <defs>
        <linearGradient id="gemFill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#a7f3d0" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
      </defs>
      <polygon points="12,2 22,9 18,22 6,22 2,9" fill="url(#gemFill)" stroke="#065f46" strokeWidth="0.8" />
      <polygon points="12,2 22,9 12,12" fill="#34d399" opacity="0.7" />
      <polygon points="12,2 2,9 12,12" fill="#6ee7b7" opacity="0.5" />
    </svg>
  );
});

const BombIcon = memo(function BombIcon() {
  return <Bomb className="w-5 h-5 text-glow-red drop-shadow-[0_0_4px_hsl(var(--neon-red))]" />;
});

export default function TowerGame() {
  const { selectedCurrency, isAuthenticated } = useAppStore();
  const { refetch } = useWallet();
  const [betAmount, setBetAmount] = useState('10');
  const [playing, setPlaying] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const rows = 8;
  const [grid, setGrid] = useState<CellState[][]>([]);
  const [bombPositions, setBombPositions] = useState<number[][]>([]);
  const [currentRow, setCurrentRow] = useState(0);
  const [sessionActive, setSessionActive] = useState(false);
  const [currentMultiplier, setCurrentMultiplier] = useState(1);
  const [lastPayout, setLastPayout] = useState<number | null>(null);
  const [history, setHistory] = useState<Array<{ won: boolean; multiplier: number }>>([]);
  const [roundToken, setRoundToken] = useState<string | null>(null);

  const [pickOrder, setPickOrder] = useState<number[]>([]);
  const config = DIFFICULTY_CONFIGS[difficulty];

  // Convert grid to 3D scene levels format
  const levels3D = useMemo(() => {
    return Array.from({ length: rows }, (_, rowIdx) => {
      const row = grid[rowIdx];
      const isRevealed = row?.some(cell => cell !== 'hidden') ?? false;
      const hasBomb = row?.some(cell => cell === 'bomb') ?? false;
      const hasSafe = row?.some(cell => cell === 'safe') ?? false;
      const multiplier = Math.round(Math.pow(config.multiplierStep, rowIdx + 1) * 100) / 100;
      return {
        isRevealed,
        isSafe: isRevealed && !hasBomb && hasSafe,
        multiplier,
      };
    });
  }, [grid, config.multiplierStep]);

  const handlePlay = useCallback(async () => {
    if (!isAuthenticated) return;
    setPlaying(true);
    setLastPayout(null);
    try {
      const init = await playTower({ betAmount: parseFloat(betAmount), difficulty, picks: [], cashout: false, init: true });
      setRoundToken(init.result.roundToken ?? null);
      setBombPositions([]);
      setGrid(Array.from({ length: rows }, () => Array(config.cols).fill('hidden') as CellState[]));
      setCurrentRow(0);
      setCurrentMultiplier(1);
      setPickOrder([]);
      setSessionActive(true);
    } catch (e) {
      console.error('tower init', e);
    } finally {
      setPlaying(false);
    }
  }, [isAuthenticated, config, betAmount, difficulty]);

  const handleSelect = useCallback(async (col: number) => {
    if (!sessionActive || currentRow >= rows) return;
    const newPicks = [...pickOrder, col];
    try {
      const res = await playTower({ betAmount: parseFloat(betAmount), difficulty, picks: newPicks, cashout: false, roundToken: roundToken ?? undefined, action: 'pick' } as never);
      setPickOrder(newPicks);
      setRoundToken(res.result.roundToken ?? null);
      setGrid(prev => {
        const next = prev.map(r => [...r]);
        next[currentRow][col] = res.result.busted ? 'bomb' : 'safe';
        if (res.result.busted) (res.result.bombs?.[currentRow] ?? []).forEach((b: number) => { next[currentRow][b] = 'bomb'; });
        return next;
      });
      if (res.result.busted) {
        setBombPositions(res.result.bombs ?? []);
        setRoundToken(null);
        playSound('tower.boom'); haptic('lose');
        setSessionActive(false);
        setHistory(prev => [{ won: false, multiplier: 0 }, ...prev].slice(0, 25));
        refetch();
        return;
      }
      const newMult = res.result.multiplier ?? currentMultiplier;
      setCurrentMultiplier(newMult);
      setCurrentRow(res.result.reachedRow ?? currentRow + 1);
      playSound('tower.step'); haptic('tap');
      if (res.result.cashout) {
        const payout = Math.floor(parseFloat(betAmount) * newMult * 100) / 100;
        setBombPositions(res.result.bombs ?? []);
        setRoundToken(null);
        setLastPayout(payout);
        setSessionActive(false);
        playSound('tower.cashout'); haptic('win-small');
        setHistory(prev => [{ won: true, multiplier: newMult }, ...prev].slice(0, 25));
        refetch();
      }
    } catch {
      return;
    }
  }, [sessionActive, currentRow, rows, currentMultiplier, betAmount, difficulty, refetch, pickOrder, roundToken]);

  const handleCashout = useCallback(async () => {
    if (!sessionActive || currentRow === 0) return;
    try {
      const res = await playTower({ betAmount: parseFloat(betAmount), difficulty, picks: pickOrder, cashout: true, roundToken: roundToken ?? undefined, action: 'cashout' } as never);
      const payout = Math.floor(parseFloat(betAmount) * res.multiplier * 100) / 100;
      setBombPositions(res.result.bombs ?? []);
      setRoundToken(null);
      setLastPayout(payout);
      setSessionActive(false);
      playSound('tower.cashout'); haptic('win-small');
      setGrid(prev => prev.map((row, ri) => row.map((cell, ci) => cell === 'hidden' && (res.result.bombs?.[ri] ?? []).includes(ci) ? 'bomb' : cell)));
      setHistory(prev => [{ won: true, multiplier: res.multiplier }, ...prev].slice(0, 25));
      refetch();
    } catch {
      return;
    }
  }, [sessionActive, currentRow, betAmount, difficulty, refetch, pickOrder, roundToken]);

  const extraControls = (
    <div className="space-y-3">
      <div>
        <label className="text-[10px] font-bold font-display text-muted-foreground uppercase tracking-wider mb-1 block">Difficulty</label>
        <div className="flex gap-1">
          {(['easy', 'medium', 'hard'] as const).map(d => (
            <button key={d} onClick={() => setDifficulty(d)} disabled={sessionActive}
              className={`flex-1 py-2 rounded-lg text-xs font-bold capitalize transition-all ${
                difficulty === d ? 'gradient-primary text-foreground' : 'bg-void border border-border text-muted-foreground hover:border-primary/40'
              }`}>{d}</button>
          ))}
        </div>
      </div>
      {sessionActive && (
        <>
          <div className="p-3 rounded-lg bg-gradient-to-br from-neon-green/10 to-neon-blue/5 border border-neon-green/30 text-center">
            <div className="text-[9px] text-muted-foreground uppercase font-display">Multiplier</div>
            <div className="font-mono font-extrabold text-2xl text-glow-green drop-shadow-[0_0_8px_hsl(var(--neon-green))]">{currentMultiplier.toFixed(2)}×</div>
            <div className="text-xs text-muted-foreground">Floor {currentRow}/{rows}</div>
          </div>
          <button onClick={handleCashout} disabled={currentRow === 0}
            className="w-full py-3 rounded-xl font-display font-bold text-sm bg-neon-green/20 border border-neon-green/40 text-glow-green hover:bg-neon-green/30 transition-colors disabled:opacity-50">
            Cashout {(parseFloat(betAmount) * currentMultiplier).toFixed(2)}
          </button>
        </>
      )}
      {lastPayout !== null && !sessionActive && (
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="p-3 rounded-lg bg-neon-green/10 border border-neon-green/30 text-center">
          <div className="font-mono font-bold text-lg text-glow-green">+{lastPayout.toFixed(2)}</div>
        </motion.div>
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
          <span key={i} className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
            r.won ? 'bg-neon-green/10 text-glow-green' : 'bg-neon-red/10 text-glow-red'
          }`}>{r.won ? `${r.multiplier.toFixed(1)}×` : '💥'}</span>
        ))}
      </div>
    </div>
  ) : undefined;

  return (
    <GameShell title="Tower" icon={<Building2 className="w-6 h-6 text-primary" />}
      betAmount={betAmount} setBetAmount={setBetAmount}
      onPlay={handlePlay} playing={playing} disabled={sessionActive}
      playLabel={sessionActive ? 'Climbing...' : 'Start Climb'}
      extraControls={extraControls} history={historyPanel}>
      <div className="w-full h-full flex items-center justify-center">
        <div className="w-full max-w-[300px] space-y-1.5 relative">
          {[...Array(rows)].map((_, rowIdx) => {
            const visualRow = rows - 1 - rowIdx;
            const isCurrentRow = visualRow === currentRow && sessionActive;
            const stepMult = Math.round(Math.pow(config.multiplierStep, visualRow + 1) * 100) / 100;
            return (
              <div key={visualRow} className={`flex gap-1.5 items-center ${isCurrentRow ? 'animate-pulse-neon' : ''}`}>
                <div className={`w-9 text-right text-[9px] font-mono font-bold ${isCurrentRow ? 'text-glow-gold' : visualRow < currentRow ? 'text-glow-green' : 'text-muted-foreground'}`}>
                  {stepMult}×
                </div>
                <div className={`flex-1 flex gap-1 ${isCurrentRow ? 'ring-1 ring-primary/40 rounded-lg p-0.5 bg-primary/5' : 'p-0.5'}`}>
                  {Array.from({ length: config.cols }, (_, col) => {
                    const cell = grid[visualRow]?.[col] ?? 'hidden';
                    const canClick = isCurrentRow && cell === 'hidden';
                    return (
                      <motion.button key={col} onClick={() => handleSelect(col)} disabled={!canClick}
                        whileHover={canClick ? { scale: 1.05, y: -1 } : {}}
                        whileTap={canClick ? { scale: 0.96 } : {}}
                        className={`flex-1 aspect-[2/1] rounded-lg flex items-center justify-center text-xs font-bold transition-colors ${
                          cell === 'safe' ? 'bg-gradient-to-br from-neon-green/30 to-neon-green/10 border border-neon-green/50' :
                          cell === 'bomb' ? 'bg-gradient-to-br from-neon-red/30 to-neon-red/10 border border-neon-red/50' :
                          canClick ? 'bg-void border border-primary/30 hover:bg-elevated cursor-pointer hover:border-primary/60' :
                          'bg-void/50 border border-border/50'
                        }`}>
                        <AnimatePresence mode="wait">
                          {cell === 'safe' && <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }}><Gem /></motion.div>}
                          {cell === 'bomb' && <motion.div initial={{ scale: 0 }} animate={{ scale: [0, 1.4, 1] }}><BombIcon /></motion.div>}
                        </AnimatePresence>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            );
          })}
          <WinCelebration
            show={lastPayout !== null && lastPayout > 0 && !sessionActive}
            amount={lastPayout ?? 0}
            currency={selectedCurrency}
            multiplier={currentMultiplier}
            big={currentMultiplier >= 5}
          />
        </div>
      </div>
    </GameShell>
  );
}
