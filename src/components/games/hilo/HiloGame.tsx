import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpDown, History, TrendingUp, TrendingDown } from 'lucide-react';
import GameShell from '../GameShell';
import WinCelebration from '../WinCelebration';
import { playHilo } from '@/lib/game-functions';
import { useAppStore } from '@/stores/app-store';
import { playSound } from '@/lib/sounds';
import { haptic } from '@/lib/haptics';
import { PlayingCard, CardBack, CARD_FACES, SUITS } from '../shared/PlayingCard';
import { gameSounds } from '@/lib/game-sounds';


export default function HiloGame() {
  const { selectedCurrency } = useAppStore();
  const [betAmount, setBetAmount] = useState('10');
  const [playing, setPlaying] = useState(false);
  const [roundToken, setRoundToken] = useState<string | null>(null);
  const [currentCard, setCurrentCard] = useState<{ value: number; suit: number } | null>(null);
  const [result, setResult] = useState<{ nextValue: number; nextSuit: number; won: boolean; payout: number; guess: 'higher' | 'lower' } | null>(null);
  const [history, setHistory] = useState<Array<{ won: boolean }>>([]);

  // Compute live odds based on the current visible card
  const odds = useMemo(() => {
    if (currentCard === null) return null;
    const v = currentCard.value;
    const higherOutcomes = 12 - v;
    const lowerOutcomes = v;
    const equalOutcomes = 1; // exact match — neutral for higher/lower bet
    const total = 13;
    const higherProb = higherOutcomes / total;
    const lowerProb = lowerOutcomes / total;
    return {
      higher: { prob: higherProb, mult: higherProb > 0 ? Math.max(1.01, Math.floor((0.97 / higherProb) * 100) / 100) : 0 },
      lower: { prob: lowerProb, mult: lowerProb > 0 ? Math.max(1.01, Math.floor((0.97 / lowerProb) * 100) / 100) : 0 },
      tie: equalOutcomes / total,
    };
  }, [currentCard]);

  // Convert current card to 3D scene format
  const currentCard3D = useMemo(() => {
    if (!currentCard) return undefined;
    return {
      value: CARD_FACES[currentCard.value],
      suit: SUITS[currentCard.suit].symbol,
    };
  }, [currentCard]);

  // Track previous cards for 3D scene
  const [previousCards3D, setPreviousCards3D] = useState<Array<{ value: string; suit: string }>>([]);

  const handlePlay = useCallback(async () => {
    setPlaying(true);
    setResult(null);
    playSound('hilo.flip'); haptic('tap');
    try {
      const res = await playHilo({ betAmount: parseFloat(betAmount), currentValue: 0, guess: 'higher', action: 'deal' });
      setRoundToken(res.result.roundToken ?? null);
      setCurrentCard({ value: res.result.currentValue, suit: res.result.currentSuit ?? 0 });
    } finally {
      setPlaying(false);
    }
  }, [betAmount]);

  const handleGuess = useCallback(async (guess: 'higher' | 'lower') => {
    if (currentCard === null || !odds) return;
    playSound('hilo.flip'); haptic('tap');
    try {
      const res = await playHilo({ betAmount: parseFloat(betAmount), currentValue: currentCard.value, guess, action: 'guess', roundToken: roundToken ?? undefined });
      const nextValue = res.result.nextValue;
      const nextSuit = res.result.nextSuit ?? 0;
      const won = res.won;
      const payout = res.payout;
      setResult({ nextValue, nextSuit, won, payout, guess });
      setHistory(prev => [{ won }, ...prev].slice(0, 30));
      setRoundToken(null);
      setCurrentCard(null);
      setTimeout(() => playSound(won ? 'hilo.win' : 'hilo.lose'), 200);
    } catch { /* swallow — the toast is shown by GameShell */ }
  }, [currentCard, odds, betAmount, roundToken]);

  const extraControls = currentCard !== null && odds ? (
    <div className="space-y-2">
      <button onClick={() => handleGuess('higher')}
        className="w-full p-3 rounded-xl bg-gradient-to-r from-neon-green/15 to-neon-green/5 border border-neon-green/40 hover:from-neon-green/25 hover:to-neon-green/10 transition-all group">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-glow-green group-hover:scale-110 transition-transform" />
            <span className="font-display font-bold text-glow-green">Higher</span>
          </div>
          <div className="text-right">
            <div className="font-mono font-bold text-glow-green">{odds.higher.mult.toFixed(2)}×</div>
            <div className="text-[9px] text-muted-foreground">{(odds.higher.prob * 100).toFixed(1)}% chance</div>
          </div>
        </div>
      </button>
      <button onClick={() => handleGuess('lower')}
        className="w-full p-3 rounded-xl bg-gradient-to-r from-neon-red/15 to-neon-red/5 border border-neon-red/40 hover:from-neon-red/25 hover:to-neon-red/10 transition-all group">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-glow-red group-hover:scale-110 transition-transform" />
            <span className="font-display font-bold text-glow-red">Lower</span>
          </div>
          <div className="text-right">
            <div className="font-mono font-bold text-glow-red">{odds.lower.mult.toFixed(2)}×</div>
            <div className="text-[9px] text-muted-foreground">{(odds.lower.prob * 100).toFixed(1)}% chance</div>
          </div>
        </div>
      </button>
    </div>
  ) : undefined;

  const historyPanel = history.length > 0 ? (
    <div className="p-3 rounded-xl bg-surface border border-border">
      <div className="text-[10px] font-bold text-muted-foreground uppercase mb-2 flex items-center gap-1"><History className="w-3 h-3" /> History</div>
      <div className="flex flex-wrap gap-1">
        {history.map((r, i) => (
          <span key={i} className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold ${r.won ? 'bg-neon-green/10 text-glow-green border border-neon-green/30' : 'bg-neon-red/10 text-glow-red border border-neon-red/30'}`}>
            {r.won ? '✓' : '✗'}
          </span>
        ))}
      </div>
    </div>
  ) : undefined;

  const cardSuit = currentCard ? SUITS[currentCard.suit] : null;
  const resultSuit = result ? SUITS[result.nextSuit] : null;

  return (
    <GameShell title="HiLo" icon={<ArrowUpDown className="w-6 h-6 text-primary" />}
      betAmount={betAmount} setBetAmount={setBetAmount} onPlay={handlePlay} playing={playing}
      disabled={currentCard !== null} playLabel={currentCard !== null ? 'Pick higher or lower →' : 'Draw Card'}
      extraControls={extraControls} history={historyPanel}>
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center space-y-6 relative w-full max-w-[400px] perspective-[1000px]">
          <div className="flex gap-6 justify-center items-center min-h-[180px]">
            <AnimatePresence mode="popLayout">
              {currentCard && cardSuit && (
                <PlayingCard key={`current-${currentCard.value}-${currentCard.suit}`} rank={CARD_FACES[currentCard.value]} suit={cardSuit} />
              )}
              {result && resultSuit && (
                <PlayingCard key={`result-${result.nextValue}-${result.nextSuit}`} rank={CARD_FACES[result.nextValue]} suit={resultSuit} isWinner={result.won} />
              )}
              {!currentCard && !result && <CardBack key="back" />}
            </AnimatePresence>
          </div>
          {result && (
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} aria-live="polite">
              <div className={`font-display font-extrabold text-2xl ${result.won ? 'text-glow-green' : 'text-glow-red'}`}>
                {result.won ? `+${result.payout.toFixed(2)} ${selectedCurrency}` : 'Wrong guess!'}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                You picked <span className="text-foreground font-bold">{result.guess}</span> — drew {CARD_FACES[result.nextValue]}{resultSuit?.symbol}
              </div>
            </motion.div>
          )}
          {!currentCard && !result && (
            <div className="text-muted-foreground font-display text-sm">Draw a card to start the round</div>
          )}
          <WinCelebration show={!!result?.won} amount={result?.payout ?? 0} currency={selectedCurrency} multiplier={result?.won ? result.payout / parseFloat(betAmount) : undefined} big={false} />
        </div>
      </div>
    </GameShell>
  );
}
