// Gates of Olympus — server engine.
//
// 6×5 tumble slot with Zeus multiplier feature.
// Cluster pays (8+ matching symbols anywhere), cascade/tumble,
// scatter triggers free spins, Zeus wild multipliers.

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

interface OlympusSym extends WeightedSym {
  id: string;
  weight: number;
  pays: Record<number, number>; // count -> multiplier
}

// Symbol definitions with weights and pays
// Paytable: Owl=8/20/50, Chalice=5/12/30, Ring=3/8/20, Scroll=2/5/15
//           Hera=1.5/4/10, Poseidon=1/3/8, Crown=0.5/2/5, A/K/Q/J/10=0.3/0.8/2
const SYMBOLS: readonly OlympusSym[] = [
  { id: 'owl',      weight: 4,  pays: { 8: 8, 12: 20, 20: 50 } },
  { id: 'chalice',  weight: 6,  pays: { 8: 5, 12: 12, 20: 30 } },
  { id: 'ring',     weight: 8,  pays: { 8: 3, 12: 8,  20: 20 } },
  { id: 'scroll',   weight: 10, pays: { 8: 2, 12: 5,  20: 15 } },
  { id: 'hera',     weight: 12, pays: { 8: 1.5, 12: 4, 20: 10 } },
  { id: 'poseidon', weight: 14, pays: { 8: 1, 12: 3, 20: 8 } },
  { id: 'crown',    weight: 16, pays: { 8: 0.5, 12: 2, 20: 5 } },
  { id: 'A',        weight: 18, pays: { 8: 0.3, 12: 0.8, 20: 2 } },
  { id: 'K',        weight: 18, pays: { 8: 0.3, 12: 0.8, 20: 2 } },
  { id: 'Q',        weight: 18, pays: { 8: 0.3, 12: 0.8, 20: 2 } },
  { id: 'J',        weight: 18, pays: { 8: 0.3, 12: 0.8, 20: 2 } },
  { id: '10',       weight: 18, pays: { 8: 0.3, 12: 0.8, 20: 2 } },
  { id: 'zeus-wild', weight: 2, pays: {} }, // Wild - substitutes for all except scatter
  { id: 'scatter',   weight: 3, pays: {} }, // Scatter - triggers free spins
];

const WILD_ID = 'zeus-wild';
const SCATTER_ID = 'scatter';
const MIN_CLUSTER = 8;

const PICK_TABLE = buildPickTable(SYMBOLS);

// Find pay for a cluster of given symbol and size
function payForCluster(symId: string, count: number): number {
  const sym = SYMBOLS.find(s => s.id === symId);
  if (!sym) return 0;
  // Find the best matching threshold
  const thresholds = Object.keys(sym.pays).map(Number).sort((a, b) => b - a);
  for (const t of thresholds) {
    if (count >= t) return sym.pays[t];
  }
  return 0;
}

interface CascadeStep {
  grid: string[][];
  wins: Cluster[];
  multiplier: number;
}

/**
 * Play one spin of Gates of Olympus.
 * 
 * - 6×5 grid, cluster pays (8+ matching)
 * - Tumble/cascade on wins
 * - Zeus wild can appear with multiplier
 * - 4+ scatters trigger free spins
 */
export async function playOlympusSlot(
  bet: number,
  _params: Record<string, unknown>,
  rng: FloatStream,
): Promise<Outcome> {
  // Generate initial grid
  let grid = await buildRandomGrid(COLS, ROWS, PICK_TABLE, rng);
  
  const cascadeHistory: CascadeStep[] = [];
  let totalPayout = 0;
  let totalMultiplier = 0;
  
  // Tumble loop
  let tumbling = true;
  while (tumbling) {
    // Find clusters (8+ matching symbols, excluding wild and scatter)
    const wins = findClusters(grid, MIN_CLUSTER, payForCluster, [WILD_ID, SCATTER_ID]);
    
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
    
    // Apply Zeus multiplier (random 2x-500x orb)
    let zeusMultiplier = 0;
    const hasZeus = grid.some(col => col.includes(WILD_ID));
    if (hasZeus) {
      // Zeus multiplier: random from [2, 3, 5, 8, 10, 15, 20, 25, 50, 100, 250, 500]
      const zeusMults = [2, 3, 5, 8, 10, 15, 20, 25, 50, 100, 250, 500];
      const idx = await rng.nextInt(zeusMults.length);
      zeusMultiplier = zeusMults[idx];
      totalPayout *= zeusMultiplier;
    }
    
    cascadeHistory.push({
      grid: grid.map(col => [...col]),
      wins,
      multiplier: zeusMultiplier,
    });
    
    // Drop and refill
    grid = await dropAndRefill(grid, allCells, PICK_TABLE, rng);
  }
  
  // Count scatters
  const scatterCount = countSymbol(grid, SCATTER_ID);
  const scatterPositions = findCells(grid, SCATTER_ID);
  
  // Free spins: 4 scatters = 15, 5 = 18, 6+ = 20
  let freeSpinsAwarded = 0;
  let bonusTriggered = false;
  if (scatterCount >= 4) {
    bonusTriggered = true;
    if (scatterCount >= 6) freeSpinsAwarded = 20;
    else if (scatterCount >= 5) freeSpinsAwarded = 18;
    else freeSpinsAwarded = 15;
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
      multiplierTotal: totalMultiplier,
      scatterCount,
      scatterPositions,
      bonusTriggered,
      freeSpinsAwarded,
      jackpot,
    },
  };
}