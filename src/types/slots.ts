/**
 * Wire contract for server-authoritative slot games.
 *
 * The client sends `{ gameType, betAmount, params }` to `play-game` and receives
 * a `PlayResponse<SlotServerResult>` (see `src/lib/game-functions.ts`).
 *
 * The Phaser scene then animates `result.reels` landing on the server's exact
 * grid, highlights `result.wins`, and plays through any cascades / bonus rounds.
 *
 * Every slot engine on the server must produce a value of this shape. Optional
 * fields are populated only by slots that support that mechanic (e.g. cascades
 * for Bonanza/Olympus, free spins for Big Bass/Olympus, multiplier orbs for
 * Olympus).
 */

/** A single payline win — paylines slots (classic, themed, Big Bass). */
export interface WinLine {
  /** Index into the slot's PAYLINES array. */
  paylineIndex: number;
  /** Symbol id that formed the win (after wild substitution). */
  symbolId: string;
  /** Number of consecutive matching cells starting from the leftmost reel. */
  count: number;
  /** Cells included in the win as `[col, row]` pairs. */
  cells: Array<[number, number]>;
  /** Pay amount in money units (already multiplied by per-line bet). */
  pay: number;
}

/** A scatter / "ways" / cluster win — used by Olympus (scatter pays) and
 *  Sweet Bonanza (cluster pays). */
export interface ScatterOrClusterWin {
  symbolId: string;
  count: number;
  cells: Array<[number, number]>;
  pay: number;
}

/** A multiplier orb (Olympus free-spins style). */
export interface MultiplierOrb {
  /** Linearised cell index `col * ROWS + row`. */
  cellIndex: number;
  /** Multiplier value (added to the running free-spins accumulator). */
  value: number;
}

/** One step of a tumble / cascade sequence (Bonanza, Olympus). */
export interface CascadeStep {
  /** Grid before the cascade is evaluated. */
  gridBefore: string[][];
  /** Wins that were paid in this cascade step. */
  wins: ScatterOrClusterWin[];
  /** Cells that exploded (these will be removed from the grid). */
  exploded: Array<[number, number]>;
  /** Grid after the explosion + drop + refill. */
  gridAfter: string[][];
  /** Multiplier orbs that landed on this cascade step (Olympus). */
  orbs?: MultiplierOrb[];
  /** Total pay from this cascade step (sum of `wins[*].pay`). */
  cascadePay: number;
}

/** A free-spin sub-round (Olympus, Big Bass). */
export interface FreeSpinRound {
  /** Final landed grid for this free-spin sub-round. */
  reels: string[][];
  /** Cascades that played out during this sub-round (if applicable). */
  cascades?: CascadeStep[];
  /** Payline wins for this sub-round (if it's a payline slot). */
  wins?: WinLine[];
  /** Scatter / cluster wins for this sub-round. */
  scatterWins?: ScatterOrClusterWin[];
  /** Multiplier orbs that landed in this sub-round. */
  orbs?: MultiplierOrb[];
  /** Big Bass: cash values collected by the fisherman this sub-round. */
  cashCollected?: Array<{ cellIndex: number; value: number }>;
  /** Total payout from this free-spin sub-round (already includes any
   *  free-spin multiplier). */
  payout: number;
}

/** The full payload the server returns under `result` for any slot game. */
export interface SlotServerResult {
  /** The authoritative grid the scene must land on. `reels[col][row]`. */
  reels: string[][];

  /** Payline wins from the base spin (classic / themed / Big Bass). */
  wins?: WinLine[];

  /** Scatter / cluster wins from the base spin (Olympus / Bonanza). */
  scatterWins?: ScatterOrClusterWin[];

  /** Cascades that played out on the base spin (Bonanza / Olympus). */
  cascades?: CascadeStep[];

  /** Whether the jackpot rule fired on this spin (e.g. 5 sevens on middle row). */
  jackpot?: boolean;

  /** Whether a bonus / free-spins round was triggered. */
  bonusTriggered?: boolean;

  /** Number of free spins awarded (if bonus triggered). */
  freeSpinsAwarded?: number;

  /** Cells holding the scatter symbols that triggered the bonus (for animation). */
  scatterPositions?: Array<[number, number]>;

  /** The full transcript of free spins played out server-side. */
  freeSpinRounds?: FreeSpinRound[];

  /** Total payout from the free-spins round (sum of freeSpinRounds[*].payout). */
  freeSpinsTotal?: number;

  /** For Olympus: accumulated multiplier built up across the free-spins round. */
  freeSpinAccumulatedMultiplier?: number;

  /** Multiplier orbs landed on the base spin (Olympus, very rare in base game). */
  orbs?: MultiplierOrb[];
}

/** Bet payload sent to `play-game` for slot games. Most slots take no params,
 *  but Big Bass / Olympus may accept a `forceBuyBonus: true` to invoke the
 *  bonus-buy variant in the future. */
export interface SlotBetParams {
  /** Optional: buy the bonus directly (typically 100× bet). */
  forceBuyBonus?: boolean;
  [key: string]: unknown;
}
