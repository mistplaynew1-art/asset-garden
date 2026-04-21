/**
 * Shared types for casino games - server-authoritative architecture.
 * All RNG, multiplier math, and balance changes happen on the server.
 */

export interface Card {
  value: number; // 1-13 (Ace=1, King=13)
  suit: number;  // 0-3 (hearts, diamonds, clubs, spades)
}

export interface RoundToken {
  token: string;
  expiresAt: number;
}

export type GamePhase = 'idle' | 'spinning' | 'big-win' | 'cashed-out' | 'busted';

export type WinTier = 'small' | 'big' | 'mega' | 'epic' | 'jackpot';

export interface AutoplayConfig {
  rounds: number | 'infinite';
  stopOnWin: boolean;
  stopOnBigWin: boolean; // stop if win > 5x bet
  stopOnBalanceIncrease: number | null; // stop if balance goes up by X
  stopOnBalanceDecrease: number | null; // stop if balance drops by X (loss limit)
}

export interface GameResult<R = Record<string, unknown>> {
  roundId: string;
  won: boolean;
  multiplier: number;
  payout: number;
  result: R;
  balance: number;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
}

export interface CrashResult {
  crashPoint: number;
  cashoutAt: number | null;
  players: Array<{
    id: string;
    betAmount: number;
    cashoutAt: number | null;
    isBot: boolean;
  }>;
}

export interface MinesResult {
  mineCount: number;
  minePositions: number[];
  picks: number[];
  busted: boolean;
  bustIndex: number | null;
  safeRevealed: number;
  cashout: boolean;
  multiplier: number;
  roundToken?: string | null;
}

export interface PlinkoResult {
  path: boolean[]; // true=right, false=left for each row
  bucket: number;
  multiplier: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
}

export interface RouletteResult {
  number: number; // 0-36
  betType: string;
  color: 'red' | 'black' | 'green';
  multiplier: number;
}

export interface DiceResult {
  roll: number;
  target: number;
  direction: 'over' | 'under';
  multiplier: number;
}

export interface LimboResult {
  value: number;
  target: number;
  multiplier: number;
}

export interface KenoResult {
  picks: number[];
  drawn: number[]; // ordered by draw sequence
  hits: number;
  multiplier: number;
}

export interface HiloResult {
  currentSuit?: number | null;
  currentValue: number;
  nextSuit?: number | null;
  nextValue: number;
  guess: 'higher' | 'lower';
  won: boolean;
  multiplier: number;
  roundToken?: string | null;
}

export interface DragonTigerResult {
  dragon: number;
  tiger: number;
  winner: 'dragon' | 'tiger' | 'tie';
  choice: 'dragon' | 'tiger' | 'tie';
  multiplier: number;
}

export interface BlackjackResult {
  roundToken: string;
  playerCards: Card[];
  dealerVisible: Card | null;
  dealerCards: Card[] | null;
  playerTotal: number;
  dealerTotal: number | null;
  bust: boolean;
  outcome: 'win' | 'lose' | 'push' | 'blackjack' | null;
  multiplier: number;
}

export interface TowerResult {
  difficulty: string;
  bombs: number[][];
  picks: number[];
  reachedRow: number;
  busted: boolean;
  cashout: boolean;
  multiplier: number;
  roundToken?: string | null;
}

export interface CoinflipResult {
  coinResult: 'heads' | 'tails';
  choice: 'heads' | 'tails';
  multiplier: number;
}

export interface WheelResult {
  segment: number;
  value: number;
  multiplier: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface SlotResult {
  reels: string[][];
  winLines: Array<{
    paylineIndex: number;
    symbolId: string;
    count: number;
    payout: number;
  }>;
  totalPayout: number;
  multiplier: number;
  cascadeWins?: Array<{
    cascadeIndex: number;
    wins: Array<{
      symbolId: string;
      positions: Array<[number, number]>;
      payout: number;
    }>;
  }>;
  freeSpins?: {
    triggered: boolean;
    count: number;
    multiplier: number;
  };
  bonusFeature?: {
    type: string;
    data: Record<string, unknown>;
  };
}

export interface JetpackResult {
  crashPoint: number;
  cashoutAt: number | null;
  fuelRemaining: number;
  multiplier: number;
}

export function getWinTier(multiplier: number): WinTier {
  if (multiplier >= 100) return 'jackpot';
  if (multiplier >= 50) return 'epic';
  if (multiplier >= 20) return 'mega';
  if (multiplier >= 8) return 'big';
  return 'small';
}

export const SUITS = ['♥', '♦', '♣', '♠'] as const;
export const SUIT_COLORS = ['#ef4444', '#ef4444', '#1f2937', '#1f2937'] as const;
export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const;

export function cardToString(card: Card): string {
  return `${RANKS[card.value - 1]}${SUITS[card.suit]}`;
}

export function getCardValue(rank: string): number {
  const idx = RANKS.indexOf(rank as typeof RANKS[number]);
  return idx >= 0 ? idx + 1 : 1;
}