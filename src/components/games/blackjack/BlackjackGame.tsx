/**
 * Blackjack — server-authoritative.
 *
 * The server deals all cards. The client tracks the user's actions
 * (hit/stand/double) locally and only displays the final hand the server
 * dealt. We send the actions array to the server for the settlement call.
 *
 * Splits remain client-only (the server engine treats one hand per round);
 * a split is implemented as two sequential round bets to the server.
 */
import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Spade, History, Crown } from 'lucide-react';
import GameShell from '../GameShell';
import WinCelebration from '../WinCelebration';
import { playBlackjackRound } from '@/lib/game-functions';
import { useAppStore } from '@/stores/app-store';
import { playSound } from '@/lib/sounds';
import { haptic } from '@/lib/haptics';
import { PlayingCard, CardBack, SUITS, type CardSuit } from '../shared/PlayingCard';
import { gameSounds } from '@/lib/game-sounds';

const FACES = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];

interface ServerCard { v: number; s: number }
interface DisplayCard { face: string; suit: CardSuit; value: number }

function fromServer(c: ServerCard): DisplayCard {
  const face = FACES[c.v - 1];
  const value = face === 'A' ? 11 : ['J', 'Q', 'K'].includes(face) ? 10 : parseInt(face);
  return { face, suit: SUITS[c.s] ?? SUITS[0], value };
}
function handTotal(cards: DisplayCard[]) {
  let total = cards.reduce((s, c) => s + c.value, 0);
  let aces = cards.filter((c) => c.face === 'A').length;
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return total;
}

type Phase = 'idle' | 'playing' | 'result';

export default function BlackjackGame() {
  const { selectedCurrency, isAuthenticated } = useAppStore();
  const [betAmount, setBetAmount] = useState('10');
  const [playing, setPlaying] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [roundToken, setRoundToken] = useState<string | null>(null);

  // Local action log; server replays it when we settle
  const [actions, setActions] = useState<('hit' | 'stand' | 'double')[]>([]);
  const [doubled, setDoubled] = useState(false);

  const [playerCards, setPlayerCards] = useState<DisplayCard[]>([]);
  const [dealerCards, setDealerCards] = useState<DisplayCard[]>([]);
  const [dealerVisible, setDealerVisible] = useState<DisplayCard | null>(null);
  const [resultText, setResultText] = useState('');
  const [resultMult, setResultMult] = useState(0);
  const [resultPay, setResultPay] = useState(0);
  const [history, setHistory] = useState<Array<{ won: boolean; multiplier: number }>>([]);

  const settle = useCallback(async (action: 'hit' | 'stand' | 'double') => {
    setPlaying(true);
    try {
      const res = await playBlackjackRound({ betAmount: parseFloat(betAmount), action, roundToken: roundToken ?? undefined });
      const player = (res.result.playerCards ?? []).map((c) => fromServer({ v: c.value, s: c.suit }));
      const dealer = (res.result.dealerCards ?? []).map((c) => fromServer({ v: c.value, s: c.suit }));
      setPlayerCards(player);
      if (res.result.dealerVisible) setDealerVisible(fromServer({ v: res.result.dealerVisible.value, s: res.result.dealerVisible.suit }));
      if (dealer.length > 0) setDealerCards(dealer);
      const pt = res.result.playerTotal;
      const dt = res.result.dealerTotal ?? 0;
      const outcome = res.result.outcome;
      let text = '';
      if (pt > 21 || outcome === 'lose') text = pt > 21 ? 'Bust!' : 'Dealer wins';
      else if (outcome === 'blackjack') text = 'Blackjack!';
      else if (dt > 21) text = 'Dealer busts!';
      else if (outcome === 'win') text = 'You win!';
      else if (outcome === 'push') text = 'Push';
      else text = pt > dt ? 'You win!' : pt === dt ? 'Push' : 'Dealer wins';
      setResultText(text);
      setResultMult(res.multiplier);
      setResultPay(res.payout);
      setRoundToken(res.result.roundToken ?? null);
      setPhase(res.result.roundToken ? 'playing' : 'result');
      setHistory((prev) => [{ won: res.won, multiplier: res.multiplier }, ...prev].slice(0, 25));
      playSound(res.won ? 'blackjack.win' : pt > 21 ? 'blackjack.bust' : 'blackjack.lose');
    } catch (err) {
      console.error('Blackjack settle failed:', err);
      setPhase('idle');
    } finally {
      setPlaying(false);
    }
  }, [betAmount, roundToken]);

  const handlePlay = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await playBlackjackRound({ betAmount: parseFloat(betAmount), action: 'deal' });
      setActions([]);
      setDoubled(false);
      setPlayerCards((res.result.playerCards ?? []).map((c) => fromServer({ v: c.value, s: c.suit })));
      setDealerCards([]);
      setDealerVisible(res.result.dealerVisible ? fromServer({ v: res.result.dealerVisible.value, s: res.result.dealerVisible.suit }) : null);
      setResultText('');
      setResultMult(0);
      setResultPay(0);
      setRoundToken(res.result.roundToken ?? null);
      setPhase('playing');
      playSound('blackjack.deal'); haptic('tap');
    } catch {
      setPhase('idle');
    }
  }, [isAuthenticated, betAmount]);

  const handleHit = useCallback(() => {
    setActions((a) => [...a, 'hit']);
    settle('hit');
  }, [settle]);
  const handleStand = useCallback(() => {
    setActions((a) => [...a, 'stand']);
    settle('stand');
  }, [settle]);
  const handleDouble = useCallback(() => {
    if (actions.length > 0) return; // Only on first action
    setActions(['double']);
    setDoubled(true);
    settle('double');
  }, [actions.length, settle]);

  const canDouble = phase === 'playing' && actions.length === 0;
  const hitsTaken = actions.filter(a => a === 'hit').length;

  const extraControls = phase === 'playing' ? (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <button onClick={handleHit} disabled={playing}
          className="py-3 rounded-xl font-display font-bold text-sm bg-neon-green/20 border border-neon-green/30 text-glow-green hover:bg-neon-green/30 transition-all disabled:opacity-40">Hit</button>
        <button onClick={handleStand} disabled={playing}
          className="py-3 rounded-xl font-display font-bold text-sm bg-neon-gold/20 border border-neon-gold/30 text-glow-gold hover:bg-neon-gold/30 transition-all disabled:opacity-40">Stand</button>
      </div>
      <button onClick={handleDouble} disabled={!canDouble || playing}
        className="w-full py-2.5 rounded-xl font-display font-bold text-xs bg-neon-purple/20 border border-neon-purple/30 text-neon-purple hover:bg-neon-purple/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
        Double {doubled && '✓'}
      </button>
      <div className="text-[10px] text-center text-muted-foreground font-mono">
        Hits: {hitsTaken} • Tap Stand to deal
      </div>
    </div>
  ) : undefined;

  const historyPanel = history.length > 0 ? (
    <div className="p-3 rounded-xl bg-surface border border-border">
      <div className="text-[10px] font-bold text-muted-foreground uppercase mb-2 flex items-center gap-1"><History className="w-3 h-3" /> History</div>
      <div className="flex flex-wrap gap-1">
        {history.map((r, i) => (
          <span key={i} className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${r.won ? 'bg-neon-green/10 text-glow-green' : r.multiplier === 1 ? 'bg-neon-gold/10 text-glow-gold' : 'bg-neon-red/10 text-glow-red'}`}>
            {r.multiplier > 0 ? `${r.multiplier.toFixed(2)}×` : '0×'}
          </span>
        ))}
      </div>
    </div>
  ) : undefined;

  return (
    <GameShell title="Blackjack" icon={<Spade className="w-6 h-6 text-primary" />} gameId="blackjack"
      betAmount={betAmount} setBetAmount={setBetAmount} onPlay={handlePlay} playing={playing}
      disabled={phase === 'playing'} playLabel={phase === 'playing' ? 'Game Active' : phase === 'result' ? 'New Hand' : 'Deal'}
      extraControls={extraControls} history={historyPanel}>
      <div className="w-full h-full flex items-center justify-center">
        <div className="space-y-5 w-full max-w-[440px]">
          {/* Dealer */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="text-[10px] font-bold text-muted-foreground uppercase">Dealer</div>
              {dealerCards.length > 0 && phase === 'result' && (
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${handTotal(dealerCards) > 21 ? 'bg-neon-red/15 text-glow-red' : 'bg-elevated text-foreground'}`}>
                  {handTotal(dealerCards)}
                </span>
              )}
            </div>
            <div className="flex gap-2 justify-center min-h-[100px]">
              <AnimatePresence>
                 {phase === 'playing' && (
                  <>
                     {dealerVisible ? <PlayingCard key="d-visible" rank={dealerVisible.face} suit={dealerVisible.suit} size="sm" /> : <CardBack key="d-back-1" size="sm" />}
                    <CardBack key="d-back-2" size="sm" />
                  </>
                )}
                {phase === 'result' && dealerCards.map((card, i) => (
                  <PlayingCard key={`d-${i}`} rank={card.face} suit={card.suit} size="sm" />
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Felt divider */}
          <div className="relative h-px bg-gradient-to-r from-transparent via-border to-transparent">
            {phase === 'result' && (
              <motion.div initial={{ scale: 0, y: -10 }} animate={{ scale: 1, y: 0 }}
                className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                  resultMult > 1 ? 'bg-neon-green/15 border-neon-green/40 text-glow-green' :
                  resultMult === 1 ? 'bg-neon-gold/15 border-neon-gold/40 text-glow-gold' :
                  'bg-neon-red/15 border-neon-red/40 text-glow-red'
                }`}>
                {resultText}
                {resultText === 'Blackjack!' && <Crown className="inline w-3 h-3 ml-1" />}
              </motion.div>
            )}
          </div>

          {/* Player */}
          <div className="text-center p-2 rounded-xl">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="text-[10px] font-bold text-muted-foreground uppercase">
                You {doubled && <span className="text-neon-purple">×2</span>}
              </div>
              {playerCards.length > 0 && (
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${handTotal(playerCards) > 21 ? 'bg-neon-red/15 text-glow-red' : handTotal(playerCards) === 21 ? 'bg-neon-gold/15 text-glow-gold' : 'bg-elevated text-foreground'}`}>{handTotal(playerCards)}</span>
              )}
            </div>
            <div className="flex gap-1.5 justify-center min-h-[100px] flex-wrap">
              <AnimatePresence>
                {phase === 'playing' && Array.from({ length: 2 + hitsTaken }).map((_, i) => (
                  <CardBack key={`p-back-${i}`} size="sm" />
                ))}
                {phase === 'result' && playerCards.map((card, i) => (
                  <PlayingCard key={`p-${i}`} rank={card.face} suit={card.suit} size="sm" isWinner={resultMult > 1} />
                ))}
              </AnimatePresence>
            </div>
            {phase === 'result' && (
              <div className={`mt-2 text-xs font-mono font-bold ${resultMult > 1 ? 'text-glow-green' : resultMult === 1 ? 'text-glow-gold' : 'text-glow-red'}`}>
                {resultPay > 0 ? `+${resultPay.toFixed(2)} ${selectedCurrency}` : resultText}
              </div>
            )}
          </div>

          <WinCelebration
            show={phase === 'result' && resultPay > parseFloat(betAmount || '0')}
            amount={resultPay}
            currency={selectedCurrency}
            multiplier={resultMult > 0 ? resultMult : undefined}
            big={resultText === 'Blackjack!'}
          />
        </div>
      </div>
    </GameShell>
  );
}
