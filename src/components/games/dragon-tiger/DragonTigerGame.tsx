import { useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Swords, History, Crown } from 'lucide-react';
import GameShell from '../GameShell';
import WinCelebration from '../WinCelebration';
import { PlayingCard, CardBack, SUITS, CARD_FACES } from '../shared/PlayingCard';
import { playDragonTiger } from '@/lib/game-functions';
import { useAppStore } from '@/stores/app-store';
import { useWallet } from '@/hooks/use-wallet';
import { playSound } from '@/lib/sounds';
import { haptic } from '@/lib/haptics';
import { gameSounds } from '@/lib/game-sounds';

function getCard(value: number) {
  const rank = CARD_FACES[value % 13];
  const suit = SUITS[Math.floor(value / 13) % 4];
  return { rank, suit, value: (value % 13) + 1 };
}

function CardSlot({
  card, isWinner, label,
}: { card: ReturnType<typeof getCard> | null; isWinner?: boolean; label: string }) {
  return (
    <div className="text-center">
      <div className={`text-[10px] font-bold uppercase mb-2 tracking-wider transition-colors ${isWinner ? 'text-glow-gold' : 'text-muted-foreground'}`}>{label}</div>
      <div className="relative w-28 h-40 mx-auto" style={{ perspective: '800px' }}>
        <AnimatePresence mode="wait">
          {card ? (
            <motion.div key={`${card.rank}-${card.suit.symbol}`} className="relative">
              <PlayingCard rank={card.rank} suit={card.suit} isWinner={isWinner} size="lg" />
              {isWinner && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1, rotate: 360 }} className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-neon-gold flex items-center justify-center z-10">
                  <Crown className="w-4 h-4 text-void" />
                </motion.div>
              )}
            </motion.div>
          ) : (
            <CardBack size="lg" />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

type BetChoice = 'dragon' | 'tiger' | 'tie';

export default function DragonTigerGame() {
  const { selectedCurrency, isAuthenticated } = useAppStore();
  const { refetch } = useWallet();
  const [betAmount, setBetAmount] = useState('10');
  const [playing, setPlaying] = useState(false);
  const [choice, setChoice] = useState<BetChoice>('dragon');
  const [dragonCard, setDragonCard] = useState<ReturnType<typeof getCard> | null>(null);
  const [tigerCard, setTigerCard] = useState<ReturnType<typeof getCard> | null>(null);
  const [result, setResult] = useState<{ winner: string; won: boolean; payout: number } | null>(null);
  const [history, setHistory] = useState<Array<{ winner: string; won: boolean }>>([]);

  const handlePlay = useCallback(async () => {
    if (!isAuthenticated) return;
    setPlaying(true);
    setResult(null);
    setDragonCard(null);
    setTigerCard(null);

    try {
      const res = await playDragonTiger({ betAmount: parseFloat(betAmount), choice });
      // Server returns dragon/tiger ranks (1..13). Pick a visual suit per side.
      const dSuit = SUITS[Math.floor(Math.random() * 4)]!;
      const tSuit = SUITS[Math.floor(Math.random() * 4)]!;
      const dragonVisible = { rank: CARD_FACES[(res.result.dragon - 1) % 13], suit: dSuit, value: res.result.dragon };
      const tigerVisible  = { rank: CARD_FACES[(res.result.tiger  - 1) % 13], suit: tSuit, value: res.result.tiger };

      await new Promise(r => setTimeout(r, 400));
      playSound('dragon.flip'); haptic('tap');
      setDragonCard(dragonVisible);

      await new Promise(r => setTimeout(r, 600));
      playSound('dragon.flip'); haptic('tap');
      setTigerCard(tigerVisible);

      await new Promise(r => setTimeout(r, 350));
      setResult({ winner: res.result.winner, won: res.won, payout: res.payout });
      setHistory(prev => [{ winner: res.result.winner, won: res.won }, ...prev].slice(0, 30));
      playSound(res.won ? 'dragon.win' : 'dragon.lose');
      refetch();
    } catch { /* GameShell shows the toast */ }
    setPlaying(false);
  }, [betAmount, choice, isAuthenticated, refetch]);

  const extraControls = (
    <div className="space-y-3">
      <label className="text-[10px] font-bold font-display text-muted-foreground uppercase tracking-wider block">Bet On</label>
      <div className="grid grid-cols-3 gap-1.5">
        <button onClick={() => setChoice('dragon')} disabled={playing}
          className={`p-2.5 rounded-xl font-display font-bold text-[10px] transition-all ${
            choice === 'dragon' ? 'bg-gradient-to-br from-neon-blue/30 to-neon-blue/10 border-2 border-neon-blue/60 text-glow-blue scale-[1.02]' : 'bg-void border border-border text-muted-foreground hover:border-neon-blue/40'
          }`}>
          <div className="text-lg mb-0.5">🐉</div>
          Dragon
          <div className="text-[9px] font-mono text-muted-foreground">1.96×</div>
        </button>
        <button onClick={() => setChoice('tie')} disabled={playing}
          className={`p-2.5 rounded-xl font-display font-bold text-[10px] transition-all ${
            choice === 'tie' ? 'bg-gradient-to-br from-neon-gold/30 to-neon-gold/10 border-2 border-neon-gold/60 text-glow-gold scale-[1.02]' : 'bg-void border border-border text-muted-foreground hover:border-neon-gold/40'
          }`}>
          <div className="text-lg mb-0.5">⚔️</div>
          Tie
          <div className="text-[9px] font-mono text-glow-gold">8×</div>
        </button>
        <button onClick={() => setChoice('tiger')} disabled={playing}
          className={`p-2.5 rounded-xl font-display font-bold text-[10px] transition-all ${
            choice === 'tiger' ? 'bg-gradient-to-br from-neon-red/30 to-neon-red/10 border-2 border-neon-red/60 text-glow-red scale-[1.02]' : 'bg-void border border-border text-muted-foreground hover:border-neon-red/40'
          }`}>
          <div className="text-lg mb-0.5">🐅</div>
          Tiger
          <div className="text-[9px] font-mono text-muted-foreground">1.96×</div>
        </button>
      </div>
    </div>
  );

  const historyPanel = history.length > 0 ? (
    <div className="p-3 rounded-xl bg-surface border border-border">
      <div className="text-[10px] font-bold text-muted-foreground uppercase mb-2 flex items-center gap-1">
        <History className="w-3 h-3" /> History
      </div>
      <div className="flex flex-wrap gap-1">
        {history.map((r, i) => (
          <span key={i} className={`inline-flex items-center justify-center w-7 h-7 rounded text-[10px] font-bold ${
            r.won ? 'bg-neon-green/10 text-glow-green border border-neon-green/30' : 'bg-neon-red/10 text-glow-red border border-neon-red/30'
          }`}>
            {r.winner === 'dragon' ? '🐉' : r.winner === 'tiger' ? '🐅' : '⚔️'}
          </span>
        ))}
      </div>
    </div>
  ) : undefined;

  return (
    <GameShell title="Dragon Tiger" icon={<Swords className="w-6 h-6 text-neon-red" />}
      betAmount={betAmount} setBetAmount={setBetAmount}
      onPlay={handlePlay} playing={playing}
      playLabel="Deal"
      extraControls={extraControls} history={historyPanel}>
      <div className="w-full h-full flex items-center justify-center">
        <div className="flex items-center gap-4 sm:gap-8 relative max-w-[500px]">
          <CardSlot card={dragonCard} label="🐉 Dragon" isWinner={result?.winner === 'dragon'} />
          <div className="text-center min-w-[60px]">
            <div className="text-2xl font-display font-bold text-muted-foreground">VS</div>
            <AnimatePresence>
              {result && (
                <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}
                  className={`mt-2 px-3 py-1 rounded-lg text-xs font-bold ${
                    result.won ? 'bg-neon-green/15 text-glow-green border border-neon-green/40' : 'bg-neon-red/15 text-glow-red border border-neon-red/40'
                  }`}>
                  {result.won ? `+${result.payout.toFixed(2)}` : 'Lost'}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <CardSlot card={tigerCard} label="🐅 Tiger" isWinner={result?.winner === 'tiger'} />
          <WinCelebration
            show={!!result?.won}
            amount={result?.payout ?? 0}
            currency={selectedCurrency}
            multiplier={choice === 'tie' ? 8 : 1.96}
            big={choice === 'tie' && !!result?.won}
          />
        </div>
      </div>
    </GameShell>
  );
}
