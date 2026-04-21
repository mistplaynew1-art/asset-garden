// Classic Slots — server engine.
//
// 1:1 port of the math in
//   src/components/games/slots/classic/ClassicSlotScene.ts
// SYMBOLS, weights, paylines, payFor() and the jackpot rule
// (5 sevens on the middle row = 200× bet) are kept identical so visual paytable
// in the client matches the server exactly.

import type { FloatStream } from './rng.ts';
import type { Outcome } from './games.ts';
import {
  buildPickTable,
  buildRandomGrid,
  evaluatePaylines,
  type Payline,
  type WeightedSym,
} from './slots-shared.ts';

const COLS = 5;
const ROWS = 3;

interface ClassicSym extends WeightedSym {
  id: string;
  weight: number;
  pays: { '3': number; '4': number; '5': number };
}

// === Ported verbatim from ClassicSlotScene.ts (lines 32–42) ===
const SYMBOLS: readonly ClassicSym[] = [
  { id: 'cherry',  weight: 26, pays: { '3': 1.5, '4': 4,  '5': 10 } },
  { id: 'lemon',   weight: 24, pays: { '3': 2,   '4': 6,  '5': 15 } },
  { id: 'orange',  weight: 22, pays: { '3': 2.5, '4': 8,  '5': 20 } },
  { id: 'grape',   weight: 18, pays: { '3': 3,   '4': 10, '5': 25 } },
  { id: 'bell',    weight: 14, pays: { '3': 4,   '4': 14, '5': 35 } },
  { id: 'star',    weight: 10, pays: { '3': 6,   '4': 18, '5': 50 } },
  { id: 'clover',  weight: 8,  pays: { '3': 5,   '4': 16, '5': 40 } },
  { id: 'diamond', weight: 6,  pays: { '3': 8,   '4': 25, '5': 75 } },
  { id: 'seven',   weight: 4,  pays: { '3': 20,  '4': 60, '5': 200 } }, // wild + jackpot
];

const WILD_ID = 'seven';

// === Ported verbatim from ClassicSlotScene.ts (lines 62–72) ===
const PAYLINES: readonly Payline[] = [
  [1, 1, 1, 1, 1],
  [0, 0, 0, 0, 0],
  [2, 2, 2, 2, 2],
  [0, 1, 2, 1, 0],
  [2, 1, 0, 1, 2],
  [1, 0, 0, 0, 1],
  [1, 2, 2, 2, 1],
  [0, 0, 1, 2, 2],
  [2, 2, 1, 0, 0],
];

// Pre-built pick table — 1 allocation per cold start.
const PICK_TABLE = buildPickTable(SYMBOLS);

function payFor(id: string, count: number): number {
  if (count < 3) return 0;
  const sym = SYMBOLS.find((s) => s.id === id);
  if (!sym) return 0;
  if (count >= 5) return sym.pays['5'];
  if (count >= 4) return sym.pays['4'];
  return sym.pays['3'];
}

/**
 * Compute one classic-slots spin server-side.
 *
 * Wager model (matches the scene): the per-line bet is `bet / PAYLINES.length`.
 * Each payline win pays `payFor(symbolId, count) * (bet / 9)`. Total payout
 * sums all line wins. The returned `multiplier` is `totalPayout / bet` so the
 * existing `place_bet` flow (which multiplies bet × multiplier) yields the
 * correct payout.
 *
 * Jackpot: when all 5 cells of the middle row are `seven`, fire jackpot.
 * The middle-row payline (line index 0) already pays 200× the per-line bet
 * for 5-of-a-kind sevens, so this is just a flag for the scene to flash.
 */
export async function playClassicSlots(
  bet: number,
  _params: Record<string, unknown>,
  rng: FloatStream,
): Promise<Outcome> {
  const grid = await buildRandomGrid(COLS, ROWS, PICK_TABLE, rng);

  const perLineBet = bet / PAYLINES.length;
  const wins = evaluatePaylines(grid, PAYLINES, WILD_ID, (id, count) => {
    return payFor(id, count) * perLineBet;
  });

  const totalPayout = wins.reduce((s, w) => s + w.pay, 0);
  const jackpot = grid.every((col) => col[1] === WILD_ID); // 5 sevens on middle row

  const multiplier = bet > 0 ? totalPayout / bet : 0;

  return {
    won: totalPayout > 0,
    multiplier,
    result: {
      reels: grid,
      wins: wins.map((w) => ({
        paylineIndex: w.paylineIndex,
        symbolId: w.symbolId,
        count: w.count,
        cells: w.cells,
        pay: w.pay,
      })),
      jackpot,
    },
  };
}
