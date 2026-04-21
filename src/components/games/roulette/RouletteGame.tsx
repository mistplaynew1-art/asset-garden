/**
 * Roulette — premium European-wheel overhaul.
 *
 * Visual-only upgrades; existing RNG (`generateOutcome`) and
 * `placeGameBet` payload preserved.
 *
 * Highlights:
 *  • SVG European wheel: 37 numbered segments in canonical order
 *  • Wheel rotates 6+ turns and decelerates to land on the result
 *  • Ball orbits opposite direction and snaps onto the winning pocket
 *  • Hot/Cold stats grid (last 30 results)
 *  • "Replay last bet" quick action
 *  • Bet types: red/black/green/odd/even/high/low + dozens + columns
 */
import { useState, useCallback, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { CircleDot, History, RotateCcw } from 'lucide-react';
import GameShell from '../GameShell';
import WinCelebration from '../WinCelebration';
import { playRoulette } from '@/lib/game-functions';
import { useAppStore } from '@/stores/app-store';
import { playSound } from '@/lib/sounds';
import { haptic } from '@/lib/haptics';
import { gameSounds } from '@/lib/game-sounds';

// Canonical European roulette wheel order (single zero)
const WHEEL_ORDER = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];
const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

type BetType =
  | 'red' | 'black' | 'green'
  | 'odd' | 'even'
  | 'high' | 'low'
  | 'dozen1' | 'dozen2' | 'dozen3'
  | 'col1' | 'col2' | 'col3';

interface BetMeta {
  type: BetType;
  label: string;
  payout: number; // e.g., 2 = even-money returns 2× including stake
  matches: (n: number) => boolean;
}

const BETS: BetMeta[] = [
  { type: 'red', label: 'Red', payout: 2, matches: n => n !== 0 && RED_NUMBERS.has(n) },
  { type: 'black', label: 'Black', payout: 2, matches: n => n !== 0 && !RED_NUMBERS.has(n) },
  { type: 'green', label: '0 (Green)', payout: 36, matches: n => n === 0 },
  { type: 'odd', label: 'Odd', payout: 2, matches: n => n !== 0 && n % 2 === 1 },
  { type: 'even', label: 'Even', payout: 2, matches: n => n !== 0 && n % 2 === 0 },
  { type: 'low', label: '1–18', payout: 2, matches: n => n >= 1 && n <= 18 },
  { type: 'high', label: '19–36', payout: 2, matches: n => n >= 19 && n <= 36 },
  { type: 'dozen1', label: '1st 12', payout: 3, matches: n => n >= 1 && n <= 12 },
  { type: 'dozen2', label: '2nd 12', payout: 3, matches: n => n >= 13 && n <= 24 },
  { type: 'dozen3', label: '3rd 12', payout: 3, matches: n => n >= 25 && n <= 36 },
  { type: 'col1', label: 'Col 1', payout: 3, matches: n => n !== 0 && n % 3 === 1 },
  { type: 'col2', label: 'Col 2', payout: 3, matches: n => n !== 0 && n % 3 === 2 },
  { type: 'col3', label: 'Col 3', payout: 3, matches: n => n !== 0 && n % 3 === 0 },
];

function colorOf(n: number): 'red' | 'black' | 'green' {
  if (n === 0) return 'green';
  return RED_NUMBERS.has(n) ? 'red' : 'black';
}

const SEG_ANGLE = 360 / WHEEL_ORDER.length; // ≈9.7297°

/** Build SVG path for a wheel segment ring. */
function segmentPath(idx: number, rOuter: number, rInner: number) {
  const start = idx * SEG_ANGLE - 90;
  const end = (idx + 1) * SEG_ANGLE - 90;
  const sRad = (start * Math.PI) / 180;
  const eRad = (end * Math.PI) / 180;
  const x1 = Math.cos(sRad) * rOuter;
  const y1 = Math.sin(sRad) * rOuter;
  const x2 = Math.cos(eRad) * rOuter;
  const y2 = Math.sin(eRad) * rOuter;
  const x3 = Math.cos(eRad) * rInner;
  const y3 = Math.sin(eRad) * rInner;
  const x4 = Math.cos(sRad) * rInner;
  const y4 = Math.sin(sRad) * rInner;
  return `M ${x1} ${y1} A ${rOuter} ${rOuter} 0 0 1 ${x2} ${y2} L ${x3} ${y3} A ${rInner} ${rInner} 0 0 0 ${x4} ${y4} Z`;
}

export default function RouletteGame() {
  const { selectedCurrency, isAuthenticated } = useAppStore();
  const [betAmount, setBetAmount] = useState('10');
  const [playing, setPlaying] = useState(false);
  const [selectedBet, setSelectedBet] = useState<BetType>('red');
  const [lastBet, setLastBet] = useState<{ type: BetType; amount: string } | null>(null);
  const [result, setResult] = useState<{ number: number; won: boolean; payout: number; betType: BetType } | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [history, setHistory] = useState<Array<{ number: number; color: string }>>([]);
  const wheelRotation = useRef(0);
  const ballRotation = useRef(0);
  const [wheelAngle, setWheelAngle] = useState(0);
  const [ballAngle, setBallAngle] = useState(0);

  const handlePlay = useCallback(async () => {
    if (!isAuthenticated) return;
    setPlaying(true);
    setResult(null);
    setSpinning(true);
    playSound('roulette.spin'); haptic('tap');

    let num: number;
    let serverPayout = 0;
    let serverMult = 0;
    let serverWon = false;
    try {
      const res = await playRoulette({ betAmount: parseFloat(betAmount), betType: selectedBet });
      num = res.result.number;
      serverPayout = res.payout;
      serverMult = res.multiplier;
      serverWon = res.won;
    } catch (e) {
      console.error('roulette', e);
      setSpinning(false);
      setPlaying(false);
      return;
    }
    const winningIdx = WHEEL_ORDER.indexOf(num);

    // Wheel rotates clockwise 6+ turns and lands so winningIdx is at top (0deg).
    const targetWheel = 360 * 6 + (-(winningIdx * SEG_ANGLE));
    const newWheel = wheelRotation.current + ((targetWheel - (wheelRotation.current % 360)) + 360) % 360 + 360 * 5;
    wheelRotation.current = newWheel;
    setWheelAngle(newWheel);

    // Ball orbits counter-clockwise and lands on the same pocket
    const targetBall = -(360 * 8) - (winningIdx * SEG_ANGLE);
    const newBall = ballRotation.current + ((targetBall - (ballRotation.current % 360)) - 360) % 360 - 360 * 7;
    ballRotation.current = newBall;
    setBallAngle(newBall);

    // Save the bet for replay
    setLastBet({ type: selectedBet, amount: betAmount });

    setTimeout(() => {
      setSpinning(false);
      playSound('roulette.land'); haptic('tick');
      setResult({ number: num, won: serverWon, payout: serverPayout, betType: selectedBet });
      setHistory(prev => [{ number: num, color: colorOf(num) }, ...prev].slice(0, 30));
      setPlaying(false);
      setTimeout(() => playSound(serverWon ? 'roulette.win' : 'roulette.lose'), 200);
    }, 4200);
  }, [betAmount, selectedBet, isAuthenticated]);

  const replayLastBet = useCallback(() => {
    if (!lastBet || playing) return;
    setSelectedBet(lastBet.type);
    setBetAmount(lastBet.amount);
    playSound('click');
  }, [lastBet, playing]);

  // Hot/cold counts over recent history
  const hotCold = useMemo(() => {
    const counts: Record<number, number> = {};
    history.forEach(h => { counts[h.number] = (counts[h.number] ?? 0) + 1; });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([n, c]) => ({ n: +n, c }));
    const hot = sorted.slice(0, 4);
    const cold = sorted.slice(-4).reverse();
    return { hot, cold };
  }, [history]);

  const extraControls = (
    <div className="space-y-3 p-4 rounded-xl bg-surface border border-border">
      <label className="text-[10px] font-bold font-display text-muted-foreground uppercase tracking-wider block">
        Bet On
      </label>
      <div className="grid grid-cols-3 gap-1.5">
        {BETS.map(opt => {
          const active = selectedBet === opt.type;
          const baseCls =
            opt.type === 'red'
              ? 'bg-neon-red/15 border-neon-red/30 text-glow-red'
              : opt.type === 'black'
                ? 'bg-void border-border text-foreground'
                : opt.type === 'green'
                  ? 'bg-neon-green/15 border-neon-green/30 text-glow-green'
                  : 'bg-surface border-border text-muted-foreground';
          return (
            <button
              key={opt.type}
              onClick={() => setSelectedBet(opt.type)}
              disabled={playing}
              className={`py-2 rounded-lg text-[11px] font-bold border transition-all ${
                active ? 'ring-2 ring-primary ' + baseCls : baseCls + ' opacity-70 hover:opacity-100'
              }`}
            >
              {opt.label}
              <div className="text-[8px] opacity-70 font-mono">{opt.payout}×</div>
            </button>
          );
        })}
      </div>
      {lastBet && (
        <button
          onClick={replayLastBet}
          disabled={playing}
          className="w-full py-2 rounded-lg text-xs font-bold bg-elevated border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors flex items-center justify-center gap-1.5"
        >
          <RotateCcw className="w-3 h-3" />
          Replay {BETS.find(b => b.type === lastBet.type)?.label} @ ${lastBet.amount}
        </button>
      )}
    </div>
  );

  const historyPanel = history.length > 0 ? (
    <div className="space-y-2">
      <div className="p-3 rounded-xl bg-surface border border-border">
        <div className="text-[10px] font-bold text-muted-foreground uppercase mb-2 flex items-center gap-1">
          <History className="w-3 h-3" /> Last 30
        </div>
        <div className="flex flex-wrap gap-1">
          {history.map((r, i) => (
            <span
              key={i}
              className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-mono font-bold ${
                r.color === 'red'
                  ? 'bg-neon-red/20 text-glow-red'
                  : r.color === 'green'
                    ? 'bg-neon-green/20 text-glow-green'
                    : 'bg-void text-foreground border border-border'
              }`}
            >
              {r.number}
            </span>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="p-2 rounded-lg bg-surface border border-border">
          <div className="text-[9px] uppercase font-display text-glow-red mb-1">🔥 Hot</div>
          <div className="flex gap-1 flex-wrap">
            {hotCold.hot.map(({ n, c }) => (
              <span key={n} className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-neon-red/10 text-glow-red">
                {n}<span className="text-[8px] opacity-60 ml-0.5">×{c}</span>
              </span>
            ))}
          </div>
        </div>
        <div className="p-2 rounded-lg bg-surface border border-border">
          <div className="text-[9px] uppercase font-display text-glow-blue mb-1">❄ Cold</div>
          <div className="flex gap-1 flex-wrap">
            {hotCold.cold.map(({ n, c }) => (
              <span key={n} className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-primary/10 text-glow-blue">
                {n}<span className="text-[8px] opacity-60 ml-0.5">×{c}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  ) : undefined;

  // SVG sizes
  const SIZE = 280;
  const R_OUTER = 130;
  const R_INNER = 92;
  const R_BALL = 86;
  const R_HUB = 32;

  return (
    <GameShell
      title="Roulette"
      icon={<CircleDot className="w-6 h-6 text-primary" />}
      betAmount={betAmount}
      setBetAmount={setBetAmount}
      onPlay={handlePlay}
      playing={playing}
      playLabel="Spin"
      extraControls={extraControls}
      history={historyPanel}
    >
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center space-y-4 relative w-full max-w-[400px]">
          <div className="relative mx-auto" style={{ width: SIZE, height: SIZE }}>
            {/* Outer rim */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-700 via-amber-900 to-stone-900 shadow-[0_8px_30px_rgba(0,0,0,0.6)]" />
            <div className="absolute inset-2 rounded-full bg-gradient-to-br from-amber-600 to-amber-800" />
            <div className="absolute inset-3 rounded-full bg-stone-950" />

            {/* Wheel */}
            <motion.svg
              viewBox={`-${SIZE / 2} -${SIZE / 2} ${SIZE} ${SIZE}`}
              className="absolute inset-3"
              animate={{ rotate: wheelAngle }}
              transition={{ duration: 4.2, ease: [0.17, 0.67, 0.16, 0.99] }}
            >
              {WHEEL_ORDER.map((num, i) => {
                const c = colorOf(num);
                const fill =
                  c === 'red'
                    ? 'hsl(0 75% 38%)'
                    : c === 'green'
                      ? 'hsl(155 65% 30%)'
                      : 'hsl(0 0% 8%)';
                const angle = i * SEG_ANGLE + SEG_ANGLE / 2 - 90;
                const tx = Math.cos((angle * Math.PI) / 180) * (R_OUTER - 14);
                const ty = Math.sin((angle * Math.PI) / 180) * (R_OUTER - 14);
                return (
                  <g key={i}>
                    <path d={segmentPath(i, R_OUTER, R_INNER)} fill={fill} stroke="hsl(42 80% 45%)" strokeWidth={0.6} />
                    <text
                      x={tx} y={ty}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={8.5}
                      fontFamily="DM Mono, monospace"
                      fontWeight={700}
                      fill="white"
                      transform={`rotate(${angle + 90} ${tx} ${ty})`}
                    >
                      {num}
                    </text>
                  </g>
                );
              })}
              {/* Hub */}
              <circle r={R_HUB} fill="hsl(42 80% 50%)" stroke="hsl(42 80% 30%)" strokeWidth={2} />
              <circle r={R_HUB - 8} fill="hsl(0 0% 6%)" />
              <circle r={3} fill="hsl(42 80% 55%)" />
            </motion.svg>

            {/* Ball */}
            <motion.svg
              viewBox={`-${SIZE / 2} -${SIZE / 2} ${SIZE} ${SIZE}`}
              className="absolute inset-3 pointer-events-none"
              animate={{ rotate: ballAngle }}
              transition={{ duration: 4.2, ease: [0.17, 0.67, 0.2, 0.99] }}
            >
              <defs>
                <radialGradient id="rouletteBall" cx="0.35" cy="0.35" r="0.7">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="60%" stopColor="#e2e8f0" />
                  <stop offset="100%" stopColor="#94a3b8" />
                </radialGradient>
              </defs>
              <circle cx={0} cy={-R_BALL} r={5} fill="url(#rouletteBall)"
                stroke="rgba(0,0,0,0.4)" strokeWidth={0.5}
                style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.6))' }} />
            </motion.svg>

            {/* Pointer */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-20">
              <div className="w-0 h-0 border-l-[10px] border-r-[10px] border-t-[16px] border-l-transparent border-r-transparent border-t-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
            </div>

            {/* Result chip */}
            {result && !spinning && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 220, damping: 14 }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30"
              >
                <div
                  className={`w-16 h-16 rounded-full flex flex-col items-center justify-center font-mono font-extrabold text-xl ${
                    colorOf(result.number) === 'red'
                      ? 'bg-neon-red/30 text-glow-red border-2 border-neon-red'
                      : colorOf(result.number) === 'green'
                        ? 'bg-neon-green/30 text-glow-green border-2 border-neon-green'
                        : 'bg-void text-foreground border-2 border-border'
                  }`}
                >
                  {result.number}
                  <span className="text-[8px] uppercase opacity-70">{colorOf(result.number)}</span>
                </div>
              </motion.div>
            )}
          </div>

          {result && !spinning && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`font-display font-bold text-lg ${result.won ? 'text-glow-green' : 'text-glow-red'}`}
              aria-live="polite"
            >
              {result.won ? `Won ${result.payout.toFixed(2)}!` : 'No luck this time'}
            </motion.div>
          )}

          <WinCelebration
            show={!!result?.won && !spinning}
            amount={result?.payout ?? 0}
            currency={selectedCurrency}
            multiplier={
              result && parseFloat(betAmount) > 0 ? result.payout / parseFloat(betAmount) : undefined
            }
            big={result?.betType === 'green' && !!result?.won}
          />
        </div>
      </div>
    </GameShell>
  );
}
