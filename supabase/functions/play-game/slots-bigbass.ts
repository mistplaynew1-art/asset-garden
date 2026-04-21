// Big Bass Bonanza — server-authoritative engine.
//
// 1:1 math port of `src/components/games/slots/bigbass/BigBassScene.ts` and
// `src/components/games/slots/bigbass/symbols.ts`:
//   - 5×3 grid, 10 fixed paylines
//   - Fisherman is wild (substitutes for all paying symbols, also pays as own)
//   - Chest is scatter — 3+ triggers 10 free spins, 3+ in FS retriggers +5
//   - During free spins: boosted bass + fisherman weights, bass cells carry
//     a random cash value. Each fisherman in view collects ALL cash on the
//     reels and pays cash * bet * 0.5.
//
// Returns a `SlotServerResult`-shaped payload with full transcripts of:
//   - base spin paylines
//   - cash collected on base spin (rare, since base bass have no cash)
//   - free-spin sub-rounds with their own paylines + cash collections

import type { FloatStream } from './rng.ts';
import {
  buildPickTable, buildRandomGrid, evaluatePaylines, countSymbol,
  clampMultiplier, type Grid, type PaylineWin,
} from './slots-shared.ts';

/* ----------------------------- Symbol math ----------------------------- */

interface BBSym {
  id: string;
  weight: number;
  pays: { '3': number; '4': number; '5': number };
}

const BASE_SYMS: BBSym[] = [
  { id: 'card-q', weight: 24, pays: { '3': 0.2, '4': 0.5, '5': 1.5 } },
  { id: 'card-k', weight: 22, pays: { '3': 0.25,'4': 0.6, '5': 1.8 } },
  { id: 'card-a', weight: 20, pays: { '3': 0.3, '4': 0.75,'5': 2 } },
  { id: 'bobber', weight: 14, pays: { '3': 0.5, '4': 1.5, '5': 4 } },
  { id: 'lure',   weight: 12, pays: { '3': 0.8, '4': 2.0, '5': 6 } },
  { id: 'tackle', weight: 10, pays: { '3': 1.0, '4': 3.0, '5': 10 } },
  { id: 'bass',   weight: 7,  pays: { '3': 2.0, '4': 7.0, '5': 25 } },
  { id: 'fisherman', weight: 3, pays: { '3': 5,   '4': 25,  '5': 100 } },
  { id: 'chest',     weight: 2, pays: { '3': 0,   '4': 0,   '5': 0 } },
];

// Free-spins boost: bass weight ×3, fisherman weight 8, chest 1.
const FS_SYMS: BBSym[] = BASE_SYMS.map(s => {
  if (s.id === 'bass') return { ...s, weight: s.weight * 3 };
  if (s.id === 'fisherman') return { ...s, weight: 8 };
  if (s.id === 'chest') return { ...s, weight: 1 };
  return s;
});

const PAY_BY_ID: Record<string, BBSym['pays']> = Object.fromEntries(
  BASE_SYMS.filter(s => s.id !== 'chest').map(s => [s.id, s.pays]),
);

const WILD_ID = 'fisherman';
const SCATTER_ID = 'chest';

const PAYLINES: number[][] = [
  [1, 1, 1, 1, 1],
  [0, 0, 0, 0, 0],
  [2, 2, 2, 2, 2],
  [0, 1, 2, 1, 0],
  [2, 1, 0, 1, 2],
  [0, 0, 1, 2, 2],
  [2, 2, 1, 0, 0],
  [1, 0, 0, 0, 1],
  [1, 2, 2, 2, 1],
  [0, 1, 0, 1, 0],
];

const COLS = 5;
const ROWS = 3;
const PER_LINE_BET = (bet: number) => bet / PAYLINES.length;

const BASE_TABLE = buildPickTable(BASE_SYMS);
const FS_TABLE = buildPickTable(FS_SYMS);

const CASH_VALUES = [1, 2, 3, 5, 10, 15, 25, 50, 100, 250];
async function pickCashValue(rng: FloatStream): Promise<number> {
  const r = await rng.next();
  if (r < 0.45) return CASH_VALUES[Math.floor((await rng.next()) * 3)];
  if (r < 0.78) return CASH_VALUES[3 + Math.floor((await rng.next()) * 2)];
  if (r < 0.93) return CASH_VALUES[5 + Math.floor((await rng.next()) * 2)];
  if (r < 0.985) return CASH_VALUES[7];
  if (r < 0.998) return CASH_VALUES[8];
  return CASH_VALUES[9];
}

function getPay(symId: string, count: number): number {
  if (count < 3) return 0;
  const pays = PAY_BY_ID[symId];
  if (!pays) return 0;
  if (count >= 5) return pays['5'];
  if (count >= 4) return pays['4'];
  return pays['3'];
}

/* ------------------------------ Outcome -------------------------------- */

interface CashCell { cellIndex: number; value: number }

interface FSRound {
  reels: Grid;
  wins: PaylineWin[];
  cashCollected: CashCell[];
  scatterCount: number;
  payout: number;
}

async function runSpin(
  bet: number,
  rng: FloatStream,
  isFreeSpin: boolean,
): Promise<{
  grid: Grid;
  wins: PaylineWin[];
  baseLineWin: number;
  cashCells: CashCell[];
  cashWin: number;
  scatterCount: number;
}> {
  const table = isFreeSpin ? FS_TABLE : BASE_TABLE;
  const grid = await buildRandomGrid(COLS, ROWS, table, rng);

  const wins = evaluatePaylines(
    grid, PAYLINES, WILD_ID,
    (id, n) => getPay(id, n) * PER_LINE_BET(bet),
  );
  const baseLineWin = wins.reduce((s, w) => s + w.pay, 0);

  // Cash collection: only fires during free spins (bass cells get cash values).
  let cashWin = 0;
  const cashCells: CashCell[] = [];
  if (isFreeSpin) {
    let fishermanCount = 0;
    const candidates: Array<{ col: number; row: number }> = [];
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        if (grid[c][r] === WILD_ID) fishermanCount++;
        else if (grid[c][r] === 'bass') candidates.push({ col: c, row: r });
      }
    }
    if (fishermanCount > 0 && candidates.length > 0) {
      for (const cell of candidates) {
        const v = await pickCashValue(rng);
        cashCells.push({ cellIndex: cell.col * ROWS + cell.row, value: v });
        cashWin += v * bet * 0.5;
      }
    }
  }

  const scatterCount = countSymbol(grid, SCATTER_ID);
  return { grid, wins, baseLineWin, cashCells, cashWin, scatterCount };
}

export async function playBigBassSlots(
  bet: number,
  _params: Record<string, unknown>,
  rng: FloatStream,
): Promise<{
  won: boolean;
  multiplier: number;
  result: Record<string, unknown>;
}> {
  // Base spin
  const base = await runSpin(bet, rng, false);

  // Free spins trigger
  const triggered = base.scatterCount >= 3;
  let fsAwarded = 0;
  let fsTotal = 0;
  const fsRounds: FSRound[] = [];
  const scatterPositions: Array<[number, number]> = [];

  if (triggered) {
    fsAwarded = 10;
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        if (base.grid[c][r] === SCATTER_ID) scatterPositions.push([c, r]);
      }
    }

    let remaining = fsAwarded;
    while (remaining > 0) {
      const fs = await runSpin(bet, rng, true);
      const roundPayout = fs.baseLineWin + fs.cashWin;
      fsRounds.push({
        reels: fs.grid,
        wins: fs.wins,
        cashCollected: fs.cashCells,
        scatterCount: fs.scatterCount,
        payout: roundPayout,
      });
      fsTotal += roundPayout;
      remaining--;
      // 3+ chests in free spins → +5 retrigger
      if (fs.scatterCount >= 3) remaining += 5;
      // Safety: cap free spins at 100 to prevent runaway
      if (fsRounds.length >= 100) break;
    }
  }

  const totalPayout = base.baseLineWin + base.cashWin + fsTotal;
  const multiplier = clampMultiplier(totalPayout / bet);
  const won = multiplier > 0;

  const result = {
    reels: base.grid,
    wins: base.wins,
    bonusTriggered: triggered,
    freeSpinsAwarded: fsAwarded,
    scatterPositions,
    freeSpinRounds: fsRounds.map(r => ({
      reels: r.reels,
      wins: r.wins,
      cashCollected: r.cashCollected,
      payout: r.payout,
    })),
    freeSpinsTotal: fsTotal,
  };

  return { won, multiplier, result };
}
