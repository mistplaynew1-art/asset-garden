// Server-authoritative themed 5×3 / 9-payline slot engine.
//
// Math is identical for every themed slot — only the symbol weights, payouts,
// wildId and jackpotId vary per theme. Those per-theme tables live in
// `slots-themed-registry.ts` (auto-generated from the client theme files so
// payouts cannot drift).
//
// Outcome shape conforms to `SlotServerResult` from src/types/slots.ts.
//
// LAW 1: every symbol in the returned grid is decided by FloatStream here.
// LAW 2: payout = sum(line wins) + jackpotMultiplier * bet, all server-side.
//        Client may not modify these numbers.

import type { FloatStream } from './rng.ts';
import {
  buildPickTable,
  buildRandomGrid,
  evaluatePaylines,
  clampMultiplier,
  type Payline,
} from './slots-shared.ts';
import { SERVER_THEMES, type ServerTheme } from './slots-themed-registry.ts';

const COLS = 5;
const ROWS = 3;

// Same 9 paylines as ThemedSlotScene.ts.
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
const MIDDLE_ROW = 1;

// Pre-built pick tables per theme (cached across invocations of the same
// edge-function isolate so we don't rebuild on every spin).
const tableCache = new Map<string, ReturnType<typeof buildPickTable>>();
function tableFor(theme: ServerTheme) {
  let t = tableCache.get(theme.id);
  if (!t) { t = buildPickTable(theme.symbols); tableCache.set(theme.id, t); }
  return t;
}

// Pay lookup for a theme: symbol id + count → multiplier of per-line bet.
function makePayFn(theme: ServerTheme) {
  const map = new Map<string, [number, number, number]>();
  for (const s of theme.symbols) map.set(s.id, s.pays);
  return (symId: string, count: number): number => {
    const p = map.get(symId);
    if (!p || count < 3) return 0;
    return p[Math.min(count, 5) - 3];
  };
}

// Per-theme jackpot multiplier (5 jackpot symbols on the middle row).
// Ported from each client theme's "5 X on middle row triggers JACKPOT (Y× bet)" rule.
const JACKPOT_MULT: Record<string, number> = {
  'buffalo-king': 200, 'dog-house': 180, 'fire-portals': 250, 'fruit-party': 200,
  'starlight': 220, 'sugar-rush': 220, 'wild-west-gold': 250, 'zeus-vs-hades': 250,
  'book-dead': 300, 'reactoonz': 250, 'starburst': 200, 'gonzo-quest': 250,
  'dead-or-alive': 250, 'money-train': 300, 'wanted-dead': 300, 'mental': 350,
  'tombstone': 250, 'the-dog-house-megaways': 350, 'gems-bonanza': 220,
  'aztec-king': 250, 'rise-of-giza': 280, 'book-of-fallen': 300,
  'floating-dragon': 280, 'hot-fiesta': 220, 'lucky-lightning': 280,
  'madame-destiny-megaways': 320, 'wild-booster': 240,
};

export async function playThemedSlot(
  bet: number,
  params: Record<string, unknown>,
  rng: FloatStream,
) {
  const themeId = String(params?.themeId ?? '');
  const theme = SERVER_THEMES[themeId];
  if (!theme) {
    return {
      won: false, multiplier: 0, payout: 0,
      result: { error: 'UNKNOWN_THEME', themeId },
    };
  }

  const table = tableFor(theme);
  const grid = await buildRandomGrid(COLS, ROWS, table, rng);

  // Per-line bet — the client `betAmount` is the TOTAL stake, distributed
  // evenly across all paylines (matches the client UX where the bet input
  // is the total spend per spin).
  const perLineBet = bet / PAYLINES.length;

  const payFn = makePayFn(theme);
  const lineWins = evaluatePaylines(grid, PAYLINES, theme.wildId, payFn);

  const lineMultiplier = lineWins.reduce((s, w) => s + w.pay, 0);

  // Jackpot detection: 5 jackpot symbols on the middle row.
  let jackpot = false;
  let jackpotMultiplier = 0;
  if (PAYLINES[0].every((row, col) => grid[col][row] === theme.jackpotId)) {
    // First payline is the middle row (row 1). Re-checking for safety:
    if (grid.every(col => col[MIDDLE_ROW] === theme.jackpotId)) {
      jackpot = true;
      jackpotMultiplier = JACKPOT_MULT[theme.id] ?? 200;
    }
  }

  // Total payout = per-line pay * perLineBet + jackpot * total bet.
  const linePayout = lineMultiplier * perLineBet;
  const jackpotPayout = jackpotMultiplier * bet;
  const totalPayout = linePayout + jackpotPayout;

  // Convert to "multiplier of total bet" for the place_bet RPC contract.
  const totalMultiplier = clampMultiplier(bet > 0 ? totalPayout / bet : 0);

  return {
    won: totalMultiplier > 0,
    multiplier: totalMultiplier,
    payout: totalPayout,
    result: {
      themeId,
      grid,                 // grid[col][row] = symbolId
      paylines: PAYLINES,
      wins: lineWins.map(w => ({
        paylineIndex: w.paylineIndex,
        symbolId: w.symbolId,
        count: w.count,
        cells: w.cells,
        pay: w.pay,           // multiple of per-line bet
        amount: w.pay * perLineBet,
      })),
      jackpot,
      jackpotMultiplier,
      jackpotPayout,
      bonusTriggered: false, // themed engine has no free-spin bonus (yet)
      cascades: [],          // themed engine is not a cascade slot
    },
  };
}
