/**
 * WinEvaluator — payline + cluster evaluation utilities used by all themed
 * Phaser slot scenes. Pure functions, no Phaser dependency.
 */

export type Grid = string[][]; // grid[col][row] = symbolId

/* ----------------------------- PAYLINE EVAL ----------------------------- */

/** A payline is an array of row indices, one per reel column. */
export type Payline = number[];

export interface PaylineWin {
  paylineIndex: number;
  symbolId: string;
  count: number;          // how many consecutive matching from left
  cells: Array<[number, number]>; // (col,row) cells included
  pay: number;
}

export function evaluatePaylines(
  grid: Grid,
  paylines: Payline[],
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

/* ----------------------------- SCATTER EVAL ----------------------------- */

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

/* --------------------------- CLUSTER (FLOOD-FILL) ------------------------ */

export interface Cluster {
  symbolId: string;
  cells: Array<[number, number]>;
  pay: number; // computed externally (caller provides pay function)
}

/** Connected-component clusters using 4-neighbor flood fill (matches Sweet Bonanza style). */
export function findClusters(
  grid: Grid,
  minSize: number,
  payFn: (symId: string, size: number) => number,
  excludeIds: string[] = [],
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

/* ----------------------- SCATTER PAYS (Olympus style) -------------------- */

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
  excludeIds: string[] = [],
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

/* ----------------------- TIER (Big Win / Mega / Epic) -------------------- */

export type WinTier = 'small' | 'big' | 'mega' | 'epic' | 'jackpot' | null;

export function classifyWinTier(multiplier: number): WinTier {
  if (multiplier >= 200) return 'jackpot';
  if (multiplier >= 50) return 'epic';
  if (multiplier >= 25) return 'mega';
  if (multiplier >= 10) return 'big';
  if (multiplier > 0) return 'small';
  return null;
}
