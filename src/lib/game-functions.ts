/**
 * Game functions — server-authoritative.
 *
 * All RNG, multiplier math, and balance changes happen on the server in the
 * `play-game` edge function. The client passes only:
 *   - `gameType` (well-known string)
 *   - `betAmount` (validated server-side)
 *   - `params`  (game-specific user inputs: dice target, mines picks, …)
 *
 * The server returns the authoritative outcome which the client animates.
 */
import { supabase } from '@/integrations/supabase/client';
import { useAppStore } from '@/stores/app-store';
import { toast } from '@/hooks/use-toast';
import type {
  GameResult,
  CrashResult,
  MinesResult,
  PlinkoResult,
  RouletteResult,
  DiceResult,
  LimboResult,
  KenoResult,
  HiloResult,
  DragonTigerResult,
  BlackjackResult,
  TowerResult,
  CoinflipResult,
  WheelResult,
  SlotResult,
  JetpackResult,
  AutoplayConfig,
} from '@/types/games';

export interface PlayResponse<R = Record<string, unknown>> {
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

function friendlyError(code: string): string {
  switch (code) {
    case 'NOT_AUTHENTICATED': return 'Please sign in to place a bet.';
    case 'NO_WALLET': return 'Wallet not found. Try refreshing the page.';
    case 'INSUFFICIENT_BALANCE': return 'Insufficient balance — top up to keep playing.';
    case 'INVALID_BET_AMOUNT': return 'Invalid bet amount.';
    case 'UNKNOWN_GAME_TYPE': return 'This game is not available.';
    case 'ROUND_IN_PROGRESS': return 'A round is already in progress.';
    case 'INVALID_ACTION': return 'Invalid action for this game state.';
    default: return code || 'Bet failed. Please try again.';
  }
}

async function callPlayGame<R = Record<string, unknown>>(
  gameType: string,
  betAmount: number,
  params: Record<string, unknown> = {},
): Promise<PlayResponse<R>> {
  const { data, error } = await supabase.functions.invoke('play-game', {
    body: { gameType, betAmount, params },
  });
  if (error && !data) {
    const msg = error.message || 'Network error';
    toast({ title: 'Bet failed', description: msg, variant: 'destructive' });
    throw new Error(msg);
  }
  if (!data) {
    toast({ title: 'Bet failed', description: 'Empty response from server', variant: 'destructive' });
    throw new Error('Empty response');
  }
  const payload = data as { ok?: boolean; error?: string } & PlayResponse<R>;
  if (payload.ok === false || payload.error) {
    const msg = friendlyError(payload.error || 'UNKNOWN');
    toast({ title: 'Bet failed', description: msg, variant: 'destructive' });
    throw new Error(payload.error || 'UNKNOWN');
  }
  syncBalance(payload.balance);
  return payload;
}

function syncBalance(balance: number) {
  const store = useAppStore.getState();
  const balances = [...store.balances];
  const idx = balances.findIndex((b) => b.currency === store.selectedCurrency);
  if (idx >= 0) {
    balances[idx] = { ...balances[idx], balance, usd: balance };
    store.setBalances(balances);
  }
}

/**
 * Generic helper used by games that have already finished animating.
 * Accepts a `cashout: true` for stateful games (mines, tower, blackjack)
 * and forwards user input via `params`.
 */
export async function play<R = Record<string, unknown>>(
  gameType: string,
  betAmount: number,
  params: Record<string, unknown> = {},
): Promise<PlayResponse<R>> {
  return callPlayGame<R>(gameType, betAmount, params);
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-game thin wrappers with full type safety
// ─────────────────────────────────────────────────────────────────────────────

export const playDice = (data: { betAmount: number; target: number; direction: 'over' | 'under' }) =>
  play<DiceResult>('dice', data.betAmount, { target: data.target, direction: data.direction });

export const playLimbo = (data: { betAmount: number; targetMultiplier: number }) =>
  play<LimboResult>('limbo', data.betAmount, { targetMultiplier: data.targetMultiplier });

export const playCoinflip = (data: { betAmount: number; choice: 'heads' | 'tails' }) =>
  play<CoinflipResult>('coinflip', data.betAmount, { choice: data.choice });

export const playHilo = (data: {
  betAmount: number;
  currentValue: number;
  guess: 'higher' | 'lower';
  action: 'deal' | 'guess' | 'cashout';
  roundToken?: string;
}) =>
  play<HiloResult>('hilo', data.betAmount, {
    currentValue: data.currentValue,
    guess: data.guess,
    action: data.action,
    roundToken: data.roundToken,
  });

export const playCrash = (data: { betAmount: number; cashoutAt: number | null; action: 'bet' | 'cashout' }) =>
  play<CrashResult>('crash', data.betAmount, { cashoutAt: data.cashoutAt, action: data.action });

export const playJetpack = (data: { betAmount: number; cashoutAt: number | null; action: 'bet' | 'cashout' }) =>
  play<JetpackResult>('jetpack', data.betAmount, { cashoutAt: data.cashoutAt, action: data.action });
export const playMines = (data: {
  betAmount: number;
  mineCount: number;
  picks: number[];
  cashout: boolean;
  init?: boolean;
  roundToken?: string;
}) =>
  play<MinesResult>('mines', data.betAmount, {
    mineCount: data.mineCount,
    picks: data.picks,
    cashout: data.cashout,
    init: data.init,
    roundToken: data.roundToken,
  });

export const playPlinko = (data: { betAmount: number; difficulty: 'easy' | 'medium' | 'hard' | 'expert' }) =>
  play<PlinkoResult>('plinko', data.betAmount, { difficulty: data.difficulty });

export const playTower = (data: {
  betAmount: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  picks: number[];
  cashout: boolean;
  init?: boolean;
  roundToken?: string;
}) =>
  play<TowerResult>('tower', data.betAmount, {
    difficulty: data.difficulty,
    picks: data.picks,
    cashout: data.cashout,
    init: data.init,
    roundToken: data.roundToken,
  });

export const playRoulette = (data: { betAmount: number; betType: string }) =>
  play<RouletteResult>('roulette', data.betAmount, { betType: data.betType });

export const playWheel = (data: { betAmount: number; difficulty: 'easy' | 'medium' | 'hard' }) =>
  play<WheelResult>('wheel', data.betAmount, { difficulty: data.difficulty });

export const playKeno = (data: { betAmount: number; picks: number[] }) =>
  play<KenoResult>('keno', data.betAmount, { picks: data.picks });

export const playDragonTiger = (data: { betAmount: number; choice: 'dragon' | 'tiger' | 'tie' }) =>
  play<DragonTigerResult>('dragon-tiger', data.betAmount, { choice: data.choice });

export const playBlackjack = (data: {
  betAmount: number;
  action: 'deal' | 'hit' | 'stand' | 'double' | 'split';
  roundToken?: string;
}) =>
  play<BlackjackResult>('blackjack', data.betAmount, {
    action: data.action,
    roundToken: data.roundToken,
  });

// Alias for backwards compatibility
export const playBlackjackRound = playBlackjack;

// ─────────────────────────────────────────────────────────────────────────────
// Slot games - Server-authoritative
// ─────────────────────────────────────────────────────────────────────────────

export const playSlot = (data: {
  gameType: string;
  betAmount: number;
  action?: 'spin' | 'buy-bonus' | 'free-spin';
  freeSpinIndex?: number;
}) =>
  play<SlotResult>(data.gameType, data.betAmount, {
    action: data.action ?? 'spin',
    freeSpinIndex: data.freeSpinIndex,
  });

export const playSlotClassic = (data: { betAmount: number }) =>
  play<SlotResult>('slots', data.betAmount);

export const playSlotOlympus = (data: { betAmount: number; action?: 'spin' | 'buy-bonus' }) =>
  play<SlotResult>('gates-olympus', data.betAmount, { action: data.action ?? 'spin' });

export const playSlotBonanza = (data: { betAmount: number; action?: 'spin' | 'buy-bonus' }) =>
  play<SlotResult>('sweet-bonanza', data.betAmount, { action: data.action ?? 'spin' });

export const playSlotBigBass = (data: { betAmount: number; action?: 'spin' | 'buy-bonus' }) =>
  play<SlotResult>('big-bass', data.betAmount, { action: data.action ?? 'spin' });

export const playSlotStarburst = (data: { betAmount: number }) =>
  play<SlotResult>('starburst', data.betAmount);

export const playSlotGonzo = (data: { betAmount: number }) =>
  play<SlotResult>('gonzo-quest', data.betAmount);

export const playSlotBookDead = (data: { betAmount: number }) =>
  play<SlotResult>('book-dead', data.betAmount);

export const playSlotDogHouse = (data: { betAmount: number }) =>
  play<SlotResult>('dog-house', data.betAmount);

export const playSlotSugarRush = (data: { betAmount: number }) =>
  play<SlotResult>('sugar-rush', data.betAmount);

export const playSlotFirePortals = (data: { betAmount: number }) =>
  play<SlotResult>('fire-portals', data.betAmount);

export const playSlotBuffaloKing = (data: { betAmount: number }) =>
  play<SlotResult>('buffalo-king', data.betAmount);

export const playSlotReactoonz = (data: { betAmount: number }) =>
  play<SlotResult>('reactoonz', data.betAmount);

export const playSlotMental = (data: { betAmount: number }) =>
  play<SlotResult>('mental', data.betAmount);

export const playSlotDeadOrAlive = (data: { betAmount: number }) =>
  play<SlotResult>('dead-or-alive', data.betAmount);

export const playSlotWildWestGold = (data: { betAmount: number }) =>
  play<SlotResult>('wild-west-gold', data.betAmount);

export const playSlotMoneyTrain = (data: { betAmount: number }) =>
  play<SlotResult>('money-train', data.betAmount);

export const playSlotMadameDestiny = (data: { betAmount: number }) =>
  play<SlotResult>('madame-destiny', data.betAmount);

export const playSlotFloatingDragon = (data: { betAmount: number }) =>
  play<SlotResult>('floating-dragon', data.betAmount);

export const playSlotLuckyLightning = (data: { betAmount: number }) =>
  play<SlotResult>('lucky-lightning', data.betAmount);

export const playSlotWildBooster = (data: { betAmount: number }) =>
  play<SlotResult>('wild-booster', data.betAmount);

export const playSlotHotFiesta = (data: { betAmount: number }) =>
  play<SlotResult>('hot-fiesta', data.betAmount);

export const playSlotRiseOfGiza = (data: { betAmount: number }) =>
  play<SlotResult>('rise-of-giza', data.betAmount);

export const playSlotAztecKing = (data: { betAmount: number }) =>
  play<SlotResult>('aztec-king', data.betAmount);

export const playSlotBookOfFallen = (data: { betAmount: number }) =>
  play<SlotResult>('book-of-fallen', data.betAmount);

export const playSlotWantedDead = (data: { betAmount: number }) =>
  play<SlotResult>('wanted-dead', data.betAmount);

export const playSlotZeusVsHades = (data: { betAmount: number }) =>
  play<SlotResult>('zeus-vs-hades', data.betAmount);

export const playSlotDogHouseMegaways = (data: { betAmount: number }) =>
  play<SlotResult>('dog-house-megaways', data.betAmount);

export const playSlotGemsBonanza = (data: { betAmount: number }) =>
  play<SlotResult>('gems-bonanza', data.betAmount);

export const playSlotFruitParty = (data: { betAmount: number }) =>
  play<SlotResult>('fruit-party', data.betAmount);

export const playSlotStarlight = (data: { betAmount: number }) =>
  play<SlotResult>('starlight', data.betAmount);

export const playSlotTombstone = (data: { betAmount: number }) =>
  play<SlotResult>('tombstone', data.betAmount);

// ─────────────────────────────────────────────────────────────────────────────
// Legacy wrapper - DEPRECATED - use typed wrappers above
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @deprecated Use typed wrappers (playDice, playMines, etc.) instead.
 * This wrapper trusts a client-computed multiplier which is not zero-trust.
 */
export async function placeGameBet(params: {
  gameType: string;
  betAmount: number;
  currency: string;
  multiplier: number;
  won: boolean;
  result: Record<string, unknown>;
}) {
  console.warn('placeGameBet is deprecated. Use typed wrappers instead.');
  const res = await callPlayGame(params.gameType, params.betAmount, {
    ...params.result,
    legacyMultiplier: params.multiplier,
  });
  return { round_id: res.roundId, balance_after: res.balance };
}

// ─────────────────────────────────────────────────────────────────────────────
// History & utilities
// ─────────────────────────────────────────────────────────────────────────────

export async function getGameHistory(opts: { gameSlug?: string; limit?: number } = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { rounds: [] };
  let q = supabase
    .from('game_rounds')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })
    .limit(opts.limit ?? 20);
  if (opts.gameSlug) q = q.eq('game_type', opts.gameSlug);
  const { data } = await q;
  return { rounds: data ?? [] };
}

export function getDefaultAutoplayConfig(): AutoplayConfig {
  return {
    rounds: 10,
    stopOnWin: false,
    stopOnBigWin: true,
    stopOnBalanceIncrease: null,
    stopOnBalanceDecrease: null,
  };
}

export function calculateAutoplayStop(
  config: AutoplayConfig,
  startBalance: number,
  currentBalance: number,
  lastWin: number,
  roundsRemaining: number | 'infinite'
): boolean {
  if (config.stopOnWin && lastWin > 0) return true;
  if (config.stopOnBigWin && lastWin > 0) return true; // Simplified - should check multiplier
  if (config.stopOnBalanceIncrease !== null) {
    if (currentBalance - startBalance >= config.stopOnBalanceIncrease) return true;
  }
  if (config.stopOnBalanceDecrease !== null) {
    if (startBalance - currentBalance >= config.stopOnBalanceDecrease) return true;
  }
  if (roundsRemaining !== 'infinite' && roundsRemaining <= 0) return true;
  return false;
}

// no-op retained for backwards compat
export function initDemoBalances() {}