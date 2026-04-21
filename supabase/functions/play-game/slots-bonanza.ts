// Sweet Bonanza — server engine.
//
// 6×5 cluster pays slot with tumble and free spins.
// 8+ matching symbols anywhere = win.
// Scatter multipliers during free spins: ×2, ×3, ×5, ×10.

import type { FloatStream } from './rng.ts';
import type { Outcome } from './games.ts';
import {
  buildPickTable,
  buildRandomGrid,
  findClusters,
  dropAndRefill,
  countSymbol,
  findCells,
  clampMultiplier,
  type WeightedSym,
  type Cluster,
} from './slots-shared.ts';

const COLS = 6;
const ROWS = 5;

interface BonanzaSym extends WeightedSym {
  id: string;
  weight: number;
  pays: Record<number, number>; // count -> multiplier
}

// Symbol definitions
// Paytable: Lollipop=50/100, Watermelon=25/50, Grape=15/30,
//           Plum=10/20, Orange=8/15, Apple=5/10, Banana=3/6
const SYMBOLS: readonly BonanzaSym[] = [
  { id: 'lollipop',  weight: 2,  pays: { 8: 50, 12: 100 } },
  { id: 'watermelon', weight: 4, pays: { 8: 25, 12: 50 } },
  { id: 'grape',     weight: 6,  pays: { 8: 15, 12: 30 } },
  { id: 'plum',      weight: 8,  pays: { 8: 10, 12: 20 } },
  { id: 'orange',    weight: 10, pays: { 8: 8,  12: 15 } },
  { id: 'apple',     weight: 12, pays: { 8: 5,  12: 10 } },
  { id: 'banana',    weight: 14, pays: { 8: 3,  12: 6 } },
  { id: 'heart',      weight: 3, pays: {} }, // Scatter - triggers free spins
  { id: 'mult-2',     weight: 1, pays: {} }, // Multiplier scatter (free spins only)
  { id: 'mult-3',     weight: 1, pays: {} },
  { id: 'mult-5',     weight: 1, pays: {} },
  { id: 'mult-10',    weight: 1, pays: {} },
];

const SCATTER_ID = 'heart';
const MIN_CLUSTER = 8;
const MULTIPLIER_SYMS = ['mult-2', 'mult-3', 'mult-5', 'mult-10'];

const PICK_TABLE = buildPickTable(SYMBOLS);

// Find pay for a cluster of given symbol and size
function payForCluster(symId: string, count: number): number {
  const sym = SYMBOLS.find(s => s.id === symId);
  if (!sym) return 0;
  const thresholds = Object.keys(sym.pays).map(Number).sort((a, b) => b - a);
  for (const t of thresholds) {
    if (count >= t) return sym.pays[t];
  }
  return 0;
}

// Get multiplier value from scatter symbol
function getMultiplierValue(symId: string): number {
  if (symId === 'mult-2') return 2;
  if (symId === 'mult-3') return 3;
  if (symId === 'mult-5') return 5;
  if (symId === 'mult-10') return 10;
  return 0;
}

interface CascadeStep {
  grid: string[][];
  wins: Cluster[];
  multiplierSymbols: Array<{ id: string; value: number; cell: [number, number] }>;
}

/**
 * Play one spin of Sweet Bonanza.
 * 
 * - 6×5 grid, cluster pays (8+ matching)
 * - Tumble/cascade on wins
 * - 4+ scatters trigger free spins
 * - During free spins, multiplier scatters accumulate
 */
export async function playBonanzaSlot(
  bet: number,
  _params: Record<string, unknown>,
  rng: FloatStream,
): Promise<Outcome> {
  // Generate initial grid
  let grid = await buildRandomGrid(COLS, ROWS, PICK_TABLE, rng);
  
  const cascadeHistory: CascadeStep[] = [];
  let totalPayout = 0;
  let accumulatedMultiplier = 1;
  
  // Tumble loop
  let tumbling = true;
  while (tumbling) {
    // Find clusters (8+ matching symbols, excluding scatter and multipliers)
    const wins = findClusters(grid, MIN_CLUSTER, payForCluster, [SCATTER_ID, ...MULTIPLIER_SYMS]);
    
    if (wins.length === 0) {
      tumbling = false;
      break;
    }
    
    // Calculate step payout
    const stepPayout = wins.reduce((s, w) => s + w.pay, 0);
    totalPayout += stepPayout;
    
    // Collect all cells to remove
    const allCells: Array<[number, number]> = [];
    for (const w of wins) {
      allCells.push(...w.cells);
    }
    
    // Find multiplier scatters on the grid
    const multiplierSymbols: Array<{ id: string; value: number; cell: [number, number] }> = [];
    for (let c = 0; c < grid.length; c++) {
      for (let r = 0; r < grid[c].length; r++) {
        const sym = grid[c][r];
        if (MULTIPLIER_SYMS.includes(sym)) {
          multiplierSymbols.push({
            id: sym,
            value: getMultiplierValue(sym),
            cell: [c, r],
          });
          accumulatedMultiplier *= getMultiplierValue(sym);
        }
      }
    }
    
    cascadeHistory.push({
      grid: grid.map(col => [...col]),
      wins,
      multiplierSymbols,
    });
    
    // Drop and refill (remove winning cells AND multiplier scatters)
    const cellsToRemove = [...allCells, ...multiplierSymbols.map(m => m.cell)];
    grid = await dropAndRefill(grid, cellsToRemove, PICK_TABLE, rng);
  }
  
  // Apply accumulated multiplier
  totalPayout *= accumulatedMultiplier;
  
  // Count scatters
  const scatterCount = countSymbol(grid, SCATTER_ID);
  const scatterPositions = findCells(grid, SCATTER_ID);
  
  // Free spins: 4+ scatters = 10 free spins
  let freeSpinsAwarded = 0;
  let bonusTriggered = false;
  if (scatterCount >= 4) {
    bonusTriggered = true;
    freeSpinsAwarded = 10 + (scatterCount - 4) * 2; // 4=10, 5=12, 6=14
  }
  
  // Final multiplier
  const multiplier = bet > 0 ? clampMultiplier(totalPayout) : 0;
  
  // Jackpot detection (100x+ bet)
  const jackpot = multiplier >= 100;
  
  return {
    won: totalPayout > 0,
    multiplier,
    result: {
      reels: grid,
      wins: cascadeHistory.flatMap(h => h.wins.map(w => ({
        symbolId: w.symbolId,
        count: w.cells.length,
        cells: w.cells,
        pay: w.pay,
      }))),
      totalPayout,
      cascades: cascadeHistory.length,
      accumulatedMultiplier,
      scatterCount,
      scatterPositions,
      bonusTriggered,
      freeSpinsAwarded,
      jackpot,
    },
  };
}