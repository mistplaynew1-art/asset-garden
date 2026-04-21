// Per-game outcome computation. Pure functions — no DB access here.
// Every function takes a FloatStream and returns { multiplier, won, result }.
// `multiplier` is the gross multiplier (e.g. 2.0 = double); `payout = bet * multiplier`.

import { FloatStream } from './rng.ts';

export const HOUSE_EDGE = 0.01;

export interface Outcome {
  won: boolean;
  multiplier: number;
  result: Record<string, unknown>;
}

// ───────────────────────────────────────────────────────── Originals

export async function playDice(bet: number, params: Record<string, unknown>, rng: FloatStream): Promise<Outcome> {
  const target = clamp(Number(params.target ?? 50), 1, 99);
  const direction = params.direction === 'over' ? 'over' : 'under';
  const r = await rng.next();
  const roll = Math.floor(r * 10000) / 100; // 0.00 – 99.99
  const won = direction === 'over' ? roll > target : roll < target;
  const winChance = direction === 'over' ? (100 - target) / 100 : target / 100;
  const multiplier = won && winChance > 0 ? floor2((1 - HOUSE_EDGE) / winChance) : 0;
  return { won, multiplier, result: { roll, target, direction } };
}

export async function playLimbo(bet: number, params: Record<string, unknown>, rng: FloatStream): Promise<Outcome> {
  const target = Math.max(1.01, Number(params.targetMultiplier ?? 2));
  const r = await rng.next();
  const crash = Math.max(1, (1 - HOUSE_EDGE) / Math.max(r, 0.0001));
  const cap = floor2(crash);
  const won = cap >= target;
  return { won, multiplier: won ? target : 0, result: { value: cap, target } };
}

export async function playCoinflip(bet: number, params: Record<string, unknown>, rng: FloatStream): Promise<Outcome> {
  const choice = params.choice === 'tails' ? 'tails' : 'heads';
  const flip = (await rng.next()) < 0.5 ? 'heads' : 'tails';
  const won = flip === choice;
  return { won, multiplier: won ? 1.98 : 0, result: { coinResult: flip, choice } };
}

export async function playHilo(bet: number, params: Record<string, unknown>, rng: FloatStream): Promise<Outcome> {
  const guess = params.guess === 'lower' ? 'lower' : 'higher';
  const currentValue = clamp(Number(params.currentValue ?? 6), 0, 12);
  const nextValue = await rng.nextInt(13);
  const won = guess === 'higher' ? nextValue > currentValue : nextValue < currentValue;
  // Fair multiplier: ((1-edge) / probability)
  const probHigher = (12 - currentValue) / 13;
  const probLower = currentValue / 13;
  const prob = guess === 'higher' ? probHigher : probLower;
  const mult = won && prob > 0 ? floor2((1 - HOUSE_EDGE) / prob) : 0;
  return { won, multiplier: mult, result: { currentValue, nextValue, guess } };
}

// ───────────────────────────────────────────────────────── Crash family

export async function playCrash(bet: number, params: Record<string, unknown>, rng: FloatStream): Promise<Outcome> {
  // Server decides crash point. Client sends desired cashout (or null for manual).
  // For manual play the client will call back with `cashoutAt` once they cash out — but for a single-round bet
  // we simulate auto-cashout. If `cashoutAt` is omitted, we treat it as a 1× bet (auto-bust).
  const cashoutAt = params.cashoutAt != null ? Math.max(1.01, Number(params.cashoutAt)) : null;
  const r = await rng.next();
  const crashPoint = floor2(Math.max(1, (1 - HOUSE_EDGE) / Math.max(r, 0.0001)));
  if (cashoutAt == null) {
    // Pure observation round (no auto bet) — should not actually credit, but
    // we still record it. Treated as a bust.
    return { won: false, multiplier: 0, result: { crashPoint, cashoutAt: null } };
  }
  const won = crashPoint >= cashoutAt;
  return { won, multiplier: won ? cashoutAt : 0, result: { crashPoint, cashoutAt } };
}

// ───────────────────────────────────────────────────────── Wheel & Roulette

const WHEEL_SEGS: Record<string, number[]> = {
  easy:      [1.2, 1.5, 1.2, 0, 1.5, 1.2, 0, 1.5, 2, 1.2],
  medium:    [1.5, 2, 0, 3, 0, 5, 1.5, 0, 2, 10, 0, 1.5],
  hard:      [0, 3, 0, 0, 5, 0, 10, 0, 0, 25],
  extreme:   [0, 0, 5, 0, 0, 15, 0, 50],
  nightmare: [0, 0, 0, 10, 0, 0, 0, 100],
};

export async function playWheel(bet: number, params: Record<string, unknown>, rng: FloatStream): Promise<Outcome> {
  const difficulty = String(params.difficulty ?? 'medium');
  const segs = WHEEL_SEGS[difficulty] ?? WHEEL_SEGS.medium;
  const idx = await rng.nextInt(segs.length);
  const m = segs[idx];
  return { won: m > 0, multiplier: m, result: { segment: idx, value: m, difficulty } };
}

const RED_NUMBERS = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);

export async function playRoulette(bet: number, params: Record<string, unknown>, rng: FloatStream): Promise<Outcome> {
  const betType = String(params.betType ?? 'red');
  const num = await rng.nextInt(37); // 0..36
  let multiplier = 0;
  const isRed = num !== 0 && RED_NUMBERS.has(num);
  const isBlack = num !== 0 && !RED_NUMBERS.has(num);
  switch (betType) {
    case 'red': if (isRed) multiplier = 2; break;
    case 'black': if (isBlack) multiplier = 2; break;
    case 'green': if (num === 0) multiplier = 36; break;
    case 'odd': if (num !== 0 && num % 2 === 1) multiplier = 2; break;
    case 'even': if (num !== 0 && num % 2 === 0) multiplier = 2; break;
    case 'low': if (num >= 1 && num <= 18) multiplier = 2; break;
    case 'high': if (num >= 19 && num <= 36) multiplier = 2; break;
    case 'dozen1': if (num >= 1 && num <= 12) multiplier = 3; break;
    case 'dozen2': if (num >= 13 && num <= 24) multiplier = 3; break;
    case 'dozen3': if (num >= 25 && num <= 36) multiplier = 3; break;
    case 'col1': if (num !== 0 && num % 3 === 1) multiplier = 3; break;
    case 'col2': if (num !== 0 && num % 3 === 2) multiplier = 3; break;
    case 'col3': if (num !== 0 && num % 3 === 0) multiplier = 3; break;
    default: {
      // Straight number bet
      if (/^\d+$/.test(betType) && Number(betType) === num) multiplier = 36;
    }
  }
  return { won: multiplier > 0, multiplier, result: { number: num, betType, color: num === 0 ? 'green' : isRed ? 'red' : 'black' } };
}

// ───────────────────────────────────────────────────────── Keno

const KENO_PAYOUTS: Record<number, Record<number, number>> = {
  1:  { 1: 3.5 },
  2:  { 1: 1, 2: 9 },
  3:  { 2: 2, 3: 26 },
  4:  { 2: 1.5, 3: 5, 4: 50 },
  5:  { 2: 1, 3: 3, 4: 12, 5: 50 },
  6:  { 3: 1.5, 4: 4, 5: 12, 6: 75 },
  7:  { 3: 1, 4: 2, 5: 6, 6: 25, 7: 100 },
  8:  { 4: 2, 5: 5, 6: 15, 7: 50, 8: 200 },
  9:  { 4: 1.5, 5: 3, 6: 8, 7: 25, 8: 75, 9: 500 },
  10: { 3: 1, 4: 2, 5: 5, 6: 15, 7: 40, 8: 100, 9: 500, 10: 1000 },
};

export async function playKeno(bet: number, params: Record<string, unknown>, rng: FloatStream): Promise<Outcome> {
  const picks = (Array.isArray(params.picks) ? (params.picks as unknown[]).map(n => Number(n)).filter(n => Number.isInteger(n) && n >= 1 && n <= 40) : []).slice(0, 10);
  if (picks.length === 0) return { won: false, multiplier: 0, result: { picks: [], drawn: [], hits: 0 } };
  const drawn = new Set<number>();
  while (drawn.size < 10) drawn.add((await rng.nextInt(40)) + 1);
  const drawnArr = Array.from(drawn);
  const hits = picks.filter(p => drawn.has(p)).length;
  const table = KENO_PAYOUTS[picks.length] ?? {};
  const multiplier = table[hits] ?? 0;
  return { won: multiplier > 0, multiplier, result: { picks, drawn: drawnArr, hits } };
}

// ───────────────────────────────────────────────────────── Mines (single-pick session)

export async function playMines(bet: number, params: Record<string, unknown>, rng: FloatStream): Promise<Outcome> {
  // Server controls mine layout AND validates the user's revealed picks in one shot.
  // Client sends:
  //   - mineCount: 1..24
  //   - picks: number[] indices in 0..24 — the cells the user revealed in order
  //   - cashout: boolean — true if user clicked cashout BEFORE bust
  //   - init: true — preview layout for client animation; bet is held but no settlement (multiplier=1, treated as push)
  const mineCount = clamp(Math.floor(Number(params.mineCount ?? 5)), 1, 24);
  const safeCount = 25 - mineCount;
  const picks = (Array.isArray(params.picks) ? (params.picks as unknown[]).map(n => Number(n)) : [])
    .filter(n => Number.isInteger(n) && n >= 0 && n < 25);
  const cashout = params.cashout === true;
  const init = params.init === true;

  const all = Array.from({ length: 25 }, (_, i) => i);
  const shuffled = await rng.shuffle(all);
  const minePositions = shuffled.slice(0, mineCount).sort((a, b) => a - b);
  const minesSet = new Set(minePositions);

  // For init we return layout immediately with multiplier=1 (push - bet returned)
  if (init) {
    return {
      won: true,
      multiplier: 1,
      result: { mineCount, minePositions, picks: [], busted: false, bustIndex: null, safeRevealed: 0, cashout: false, init: true },
    };
  }

  let safeRevealed = 0;
  let busted = false;
  let bustIndex: number | null = null;
  const seen = new Set<number>();
  const revealedOrdered: number[] = [];
  for (const p of picks) {
    if (seen.has(p)) continue;
    seen.add(p);
    revealedOrdered.push(p);
    if (minesSet.has(p)) {
      busted = true;
      bustIndex = p;
      break;
    }
    safeRevealed++;
  }

  const multiplier = busted || safeRevealed === 0
    ? 0
    : cashout || safeRevealed === safeCount
      ? floor2((1 - HOUSE_EDGE) * combinatorialMineMultiplier(mineCount, safeRevealed))
      : 0;

  return {
    won: multiplier > 0,
    multiplier,
    result: { mineCount, minePositions, picks: revealedOrdered, busted, bustIndex, safeRevealed, cashout },
  };
}

/** Multiplier formula: (25 / safeCount) ^ safeRevealed — same as the client uses. */
function combinatorialMineMultiplier(mineCount: number, safeRevealed: number): number {
  const safeCount = 25 - mineCount;
  return (25 / safeCount) ** safeRevealed;
}

// ───────────────────────────────────────────────────────── Plinko

const PLINKO_TABLES: Record<string, number[]> = {
  easy:      [2, 1.5, 1.2, 1, 0.7, 0.5, 0.5, 0.5, 0.7, 1, 1.2, 1.5, 2],
  medium:    [5, 3, 2, 1.5, 1, 0.5, 0.3, 0.5, 1, 1.5, 2, 3, 5],
  hard:      [10, 5, 3, 1.5, 1, 0.5, 0.2, 0.5, 1, 1.5, 3, 5, 10],
  extreme:   [29, 10, 5, 2, 1, 0.3, 0.1, 0.3, 1, 2, 5, 10, 29],
  nightmare: [110, 41, 10, 5, 1.5, 0.2, 0.1, 0.2, 1.5, 5, 10, 41, 110],
};

export async function playPlinko(bet: number, params: Record<string, unknown>, rng: FloatStream): Promise<Outcome> {
  const difficulty = String(params.difficulty ?? 'medium');
  const table = PLINKO_TABLES[difficulty] ?? PLINKO_TABLES.medium;
  const ROWS = 12;
  const path: number[] = [];
  for (let i = 0; i < ROWS; i++) path.push((await rng.next()) < 0.5 ? 0 : 1);
  const slot = path.reduce((s, d) => s + d, 0);
  const multiplier = table[Math.min(slot, table.length - 1)] ?? 0;
  return { won: multiplier > 1, multiplier, result: { path, slot, difficulty } };
}

// ───────────────────────────────────────────────────────── Tower

const TOWER_CFG: Record<string, { mines: number; cols: number; step: number }> = {
  easy:   { mines: 1, cols: 4, step: 1.31 },
  medium: { mines: 1, cols: 3, step: 1.47 },
  hard:   { mines: 1, cols: 2, step: 2.18 },
};

export async function playTower(bet: number, params: Record<string, unknown>, rng: FloatStream): Promise<Outcome> {
  const difficulty = String(params.difficulty ?? 'medium');
  const cfg = TOWER_CFG[difficulty] ?? TOWER_CFG.medium;
  const ROWS = 8;
  const picks = (Array.isArray(params.picks) ? (params.picks as unknown[]).map(n => Number(n)) : [])
    .filter(n => Number.isInteger(n) && n >= 0 && n < cfg.cols);
  const cashout = params.cashout === true;
  const init = params.init === true;

  const bombs: number[][] = [];
  for (let r = 0; r < ROWS; r++) {
    const cols = Array.from({ length: cfg.cols }, (_, i) => i);
    const shuffled = await rng.shuffle(cols);
    bombs.push(shuffled.slice(0, cfg.mines).sort((a, b) => a - b));
  }

  if (init) {
    return { won: true, multiplier: 1, result: { difficulty, bombs, picks: [], reachedRow: 0, busted: false, cashout: false, init: true } };
  }

  let row = 0;
  let busted = false;
  for (const p of picks) {
    if (row >= ROWS) break;
    if (bombs[row].includes(p)) { busted = true; break; }
    row++;
  }

  const multiplier = busted || row === 0
    ? 0
    : cashout || row === ROWS
      ? floor2((cfg.step ** row) * (1 - HOUSE_EDGE))
      : 0;

  return { won: multiplier > 0, multiplier, result: { difficulty, bombs, picks, reachedRow: row, busted, cashout } };
}

// ───────────────────────────────────────────────────────── Dragon-Tiger

export async function playDragonTiger(bet: number, params: Record<string, unknown>, rng: FloatStream): Promise<Outcome> {
  const choice = ['dragon', 'tiger', 'tie'].includes(String(params.choice)) ? String(params.choice) : 'dragon';
  const dragon = await rng.nextInt(13) + 1; // 1..13
  const tiger = await rng.nextInt(13) + 1;
  const winner = dragon > tiger ? 'dragon' : tiger > dragon ? 'tiger' : 'tie';
  const won = choice === winner;
  const multiplier = won ? (choice === 'tie' ? 8 : 1.96) : 0;
  return { won, multiplier, result: { dragon, tiger, winner, choice } };
}

// ───────────────────────────────────────────────────────── Blackjack (single round)

interface Card { v: number; s: number } // v: 1..13 (1=A, 11=J, 12=Q, 13=K), s: 0..3

function cardValue(v: number): number {
  if (v === 1) return 11;
  if (v >= 11) return 10;
  return v;
}

function handTotal(hand: Card[]): { total: number; soft: boolean } {
  let total = 0;
  let aces = 0;
  for (const c of hand) {
    total += cardValue(c.v);
    if (c.v === 1) aces++;
  }
  let soft = aces > 0;
  while (total > 21 && aces > 0) { total -= 10; aces--; soft = aces > 0; }
  return { total, soft };
}

export async function playBlackjack(bet: number, params: Record<string, unknown>, rng: FloatStream): Promise<Outcome> {
  // Client tells us the actions taken (hit / stand / double). Server deals all cards.
  // params.actions: ('hit' | 'stand' | 'double')[]
  const actions = (Array.isArray(params.actions) ? (params.actions as unknown[]).map(a => String(a)) : []).filter(a => ['hit', 'stand', 'double'].includes(a));

  const draw = async (): Promise<Card> => ({ v: (await rng.nextInt(13)) + 1, s: await rng.nextInt(4) });

  const player: Card[] = [await draw(), await draw()];
  const dealer: Card[] = [await draw(), await draw()];

  let doubled = false;
  for (const a of actions) {
    const t = handTotal(player).total;
    if (t >= 21) break;
    if (a === 'hit') player.push(await draw());
    else if (a === 'double' && player.length === 2) { doubled = true; player.push(await draw()); break; }
    else if (a === 'stand') break;
  }

  // Dealer plays
  while (handTotal(dealer).total < 17) dealer.push(await draw());

  const pt = handTotal(player).total;
  const dt = handTotal(dealer).total;
  const playerBJ = player.length === 2 && pt === 21;
  const dealerBJ = dealer.length === 2 && dt === 21;

  let baseMult = 0;
  if (pt > 21) baseMult = 0;
  else if (playerBJ && !dealerBJ) baseMult = 2.5;
  else if (dealerBJ && !playerBJ) baseMult = 0;
  else if (dt > 21 || pt > dt) baseMult = 2;
  else if (pt === dt) baseMult = 1; // push
  else baseMult = 0;

  const multiplier = doubled ? baseMult * 2 : baseMult;
  // For doubled bets the client should send 2× the bet; we just report the raw multiplier on `bet`.
  // The DB layer multiplies bet*multiplier, so doubled hands need bet=2× from the client OR we handle here.
  // Simpler: report bet*multiplier in `effectiveMultiplier` on the original bet — i.e. multiplier already encodes the double.
  return {
    won: multiplier > 1,
    multiplier,
    result: {
      player, dealer, playerTotal: pt, dealerTotal: dt,
      doubled, playerBlackjack: playerBJ, dealerBlackjack: dealerBJ,
    },
  };
}

// ───────────────────────────────────────────────────────── Slots (5x3 generic)

const SLOT_SYMS = ['🍒','🍋','🍊','🍇','🔔','⭐','💎','7️⃣','🍀'] as const;
const SLOT_MULTS: Record<string, number> = { '7️⃣': 50, '💎': 25, '⭐': 15, '🔔': 10, '🍇': 5, '🍊': 3, '🍋': 2, '🍒': 1.5, '🍀': 8 };

export async function playSlots(bet: number, params: Record<string, unknown>, rng: FloatStream): Promise<Outcome> {
  const reels: string[][] = [];
  for (let c = 0; c < 5; c++) {
    const col: string[] = [];
    for (let r = 0; r < 3; r++) col.push(SLOT_SYMS[await rng.nextInt(SLOT_SYMS.length)]);
    reels.push(col);
  }
  const middle = reels.map(c => c[1]);
  // Count consecutive matches starting from leftmost reel
  const first = middle[0];
  let count = 1;
  for (let i = 1; i < middle.length; i++) {
    if (middle[i] === first) count++;
    else break;
  }
  const multiplier = count >= 3 ? (SLOT_MULTS[first] ?? 1) * (count - 2) : 0;
  return { won: multiplier > 0, multiplier, result: { reels, middle } };
}

// ───────────────────────────────────────────────────────── Helpers

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
function floor2(n: number): number {
  return Math.floor(n * 100) / 100;
}
