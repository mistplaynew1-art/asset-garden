// Server-side slot evaluation primitives.
//
// Pure functions ported 1:1 from `src/components/games/slots/core/WinEvaluator.ts`.
// No Phaser, no DOM. Used by every slot engine in this folder
// (slots-classic.ts, slots-themed.ts, slots-bigbass.ts, slots-bonanza.ts,
// slots-olympus.ts) so payline / scatter / cluster math is identical to what
// the client used to compute, but now lives only on the server.

import type { FloatStream } from './rng.ts';

export type Grid = string[][]; // grid[col][row] = symbolId

/* ----------------------------- Symbol picking --------------------------- */

export interface WeightedSym {
  id: string;
  weight: number;
}

/** Build a fast cumulative-weight table once and reuse it across many picks. */
export function buildPickTable<T extends WeightedSym>(syms: readonly T[]): {
  total: number;
  cumulative: number[];
  syms: readonly T[];
} {
  const cumulative: number[] = [];
  let total = 0;
  for (const s of syms) {
    total += s.weight;
    cumulative.push(total);
  }
  return { total, cumulative, syms };
}

/** Pick one symbol uniformly weighted from a pre-built pick table. */
export async function pickWeighted<T extends WeightedSym>(
  table: { total: number; cumulative: number[]; syms: readonly T[] },
  rng: FloatStream,
): Promise<T> {
  const r = (await rng.next()) * table.total;
  for (let i = 0; i < table.cumulative.length; i++) {
    if (r < table.cumulative[i]) return table.syms[i];
  }
  return table.syms[table.syms.length - 1];
}

/** Build a fresh `cols x rows` grid by independent weighted picks per cell. */
export async function buildRandomGrid<T extends WeightedSym>(
  cols: number,
  rows: number,
  table: { total: number; cumulative: number[]; syms: readonly T[] },
  rng: FloatStream,
): Promise<Grid> {
  const grid: Grid = [];
  for (let c = 0; c < cols; c++) {
    const col: string[] = [];
    for (let r = 0; r < rows; r++) {
      col.push((await pickWeighted(table, rng)).id);
    }
    grid.push(col);
  }
  return grid;
}

/* ----------------------------- Payline eval ---------------------------- */

export type Payline = number[]; // one row index per reel column

export interface PaylineWin {
  paylineIndex: number;
  symbolId: string;
  count: number;
  cells: Array<[number, number]>;
  pay: number;
}

/**
 * Ported from src/components/games/slots/core/WinEvaluator.ts.
 *
 * Walks each payline left→right. The first non-wild symbol locks the "target".
 * Subsequent cells extend the run if they match the target or are wild.
 * A run of 3+ pays via `payFn(symbolId, count)`.
 */
export function evaluatePaylines(
  grid: Grid,
  paylines: readonly Payline[],
  wildId: string | null,
  payFn: (symId: string, count: number) => number,
): PaylineWin[] {
  const wins: PaylineWin[] = [];
  const cols = grid.length;
  paylines.forEach((line, pIdx) => {
    if (line.length !== cols) return;
    let target: string | null = null;
    let count = 0;
    const cells: Array<[number, number]> = [];
    for (let col = 0; col < cols; col++) {
      const sym = grid[col][line[col]];
      if (col === 0) {
        target = sym === wildId ? null : sym;
        count = 1;
        cells.push([col, line[col]]);
        continue;
      }
      if (target === null && sym !== wildId) {
        target = sym;
        count++;
        cells.push([col, line[col]]);
        continue;
      }
      if (sym === target || sym === wildId) {
        count++;
        cells.push([col, line[col]]);
      } else {
        break;
      }
    }
    if (target && count >= 3) {
      const pay = payFn(target, count);
      if (pay > 0) wins.push({ paylineIndex: pIdx, symbolId: target, count, cells, pay });
    }
  });
  return wins;
}

/* ----------------------------- Scatter / count ------------------------- */

export function countSymbol(grid: Grid, symbolId: string): number {
  let n = 0;
  for (const col of grid) for (const id of col) if (id === symbolId) n++;
  return n;
}

export function findCells(grid: Grid, symbolId: string): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let c = 0; c < grid.length; c++) {
    for (let r = 0; r < grid[c].length; r++) {
      if (grid[c][r] === symbolId) out.push([c, r]);
    }
  }
  return out;
}

/* ----------------------------- Scatter pays (Olympus) ------------------ */

export interface ScatterWin {
  symbolId: string;
  count: number;
  cells: Array<[number, number]>;
  pay: number;
}

/** Olympus-style: any 8+ matching symbols anywhere on the grid pays. */
export function evaluateScatterPays(
  grid: Grid,
  minCount: number,
  payFn: (symId: string, count: number) => number,
  excludeIds: readonly string[] = [],
): ScatterWin[] {
  const counts = new Map<string, Array<[number, number]>>();
  for (let c = 0; c < grid.length; c++) {
    for (let r = 0; r < grid[c].length; r++) {
      const sym = grid[c][r];
      if (!sym || excludeIds.includes(sym)) continue;
      const arr = counts.get(sym) ?? [];
      arr.push([c, r]);
      counts.set(sym, arr);
    }
  }
  const wins: ScatterWin[] = [];
  counts.forEach((cells, sym) => {
    if (cells.length >= minCount) {
      const pay = payFn(sym, cells.length);
      if (pay > 0) wins.push({ symbolId: sym, count: cells.length, cells, pay });
    }
  });
  return wins;
}

/* ----------------------------- Cluster (flood-fill) -------------------- */

export interface Cluster {
  symbolId: string;
  cells: Array<[number, number]>;
  pay: number;
}

/** 4-neighbour connected-component clusters (Sweet Bonanza style). */
export function findClusters(
  grid: Grid,
  minSize: number,
  payFn: (symId: string, size: number) => number,
  excludeIds: readonly string[] = [],
): Cluster[] {
  const cols = grid.length;
  const rows = grid[0]?.length ?? 0;
  const seen: boolean[][] = Array.from({ length: cols }, () => Array(rows).fill(false));
  const out: Cluster[] = [];

  const inBounds = (c: number, r: number) => c >= 0 && c < cols && r >= 0 && r < rows;

  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      if (seen[c][r]) continue;
      const sym = grid[c][r];
      if (!sym || excludeIds.includes(sym)) { seen[c][r] = true; continue; }
      const stack: Array<[number, number]> = [[c, r]];
      const cells: Array<[number, number]> = [];
      while (stack.length) {
        const [cc, rr] = stack.pop()!;
        if (!inBounds(cc, rr) || seen[cc][rr] || grid[cc][rr] !== sym) continue;
        seen[cc][rr] = true;
        cells.push([cc, rr]);
        stack.push([cc + 1, rr], [cc - 1, rr], [cc, rr + 1], [cc, rr - 1]);
      }
      if (cells.length >= minSize) {
        const pay = payFn(sym, cells.length);
        if (pay > 0) out.push({ symbolId: sym, cells, pay });
      }
    }
  }
  return out;
}

/* ----------------------------- Tier classifier ------------------------- */

export type WinTier = 'small' | 'big' | 'mega' | 'epic' | 'jackpot' | null;

export function classifyWinTier(multiplier: number): WinTier {
  if (multiplier >= 200) return 'jackpot';
  if (multiplier >= 50) return 'epic';
  if (multiplier >= 25) return 'mega';
  if (multiplier >= 10) return 'big';
  if (multiplier > 0) return 'small';
  return null;
}

/* ----------------------------- Cascade helpers (Bonanza/Olympus) ------- */

/**
 * Remove the given cells from the grid and gravity-drop the remaining
 * symbols downward, refilling empty top cells from a fresh pick.
 *
 * Returns the new grid. Does NOT mutate the input.
 */
export async function dropAndRefill<T extends WeightedSym>(
  grid: Grid,
  removedCells: ReadonlyArray<[number, number]>,
  table: { total: number; cumulative: number[]; syms: readonly T[] },
  rng: FloatStream,
): Promise<Grid> {
  const cols = grid.length;
  const rows = grid[0]?.length ?? 0;
  const removedSet = new Set(removedCells.map(([c, r]) => `${c}:${r}`));

  const next: Grid = [];
  for (let c = 0; c < cols; c++) {
    // Collect surviving symbols in this column, top → bottom order.
    const surviving: string[] = [];
    for (let r = 0; r < rows; r++) {
      if (!removedSet.has(`${c}:${r}`)) surviving.push(grid[c][r]);
    }
    // New column: refill on top, surviving at the bottom.
    const newCol: string[] = [];
    const missing = rows - surviving.length;
    for (let i = 0; i < missing; i++) {
      newCol.push((await pickWeighted(table, rng)).id);
    }
    newCol.push(...surviving);
    next.push(newCol);
  }
  return next;
}

/* ----------------------------- Validation helpers ---------------------- */

/** Cap any computed multiplier to a sane ceiling so a buggy engine can never
 *  drain the house wallet in a single spin. Slots can win up to 5000× on
 *  legit bonus rounds. */
export const SLOT_MAX_MULTIPLIER = 5000;

export function clampMultiplier(m: number): number {
  if (!Number.isFinite(m) || m <= 0) return 0;
  if (m > SLOT_MAX_MULTIPLIER) return SLOT_MAX_MULTIPLIER;
  // Round to 2 decimal places.
  return Math.round(m * 100) / 100;
}
