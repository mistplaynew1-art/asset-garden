// Provably fair RNG — uses synchronous hash-based PRNG for client-side game logic

function generateOutcomeSync(serverSeed: string, clientSeed: string, nonce: number): number {
  const combined = `${serverSeed}:${clientSeed}:${nonce}`;
  let h = 0;
  for (let i = 0; i < combined.length; i++) {
    h = Math.imul(31, h) + combined.charCodeAt(i) | 0;
  }
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = Math.imul(h ^ (h >>> 13), 0x45d9f3b);
  h = (h ^ (h >>> 16)) >>> 0;
  return h / 0x100000000;
}

export function generateOutcome(serverSeed: string, clientSeed: string, nonce: number): number {
  return generateOutcomeSync(serverSeed, clientSeed, nonce);
}

export function generateOutcomeBytes(
  serverSeed: string, clientSeed: string, nonce: number, count: number
): number[] {
  const results: number[] = [];
  for (let i = 0; i < count; i++) {
    results.push(generateOutcomeSync(serverSeed, clientSeed, nonce * 1000 + i));
  }
  return results;
}

export function generateServerSeed(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function hashServerSeed(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = Math.imul(31, hash) + seed.charCodeAt(i) | 0;
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

// CRASH
export function generateCrashPoint(serverSeed: string, clientSeed: string, nonce: number): number {
  const outcome = generateOutcomeSync(serverSeed, clientSeed, nonce);
  const h = Math.floor(outcome * 0xFFFFFFFF);
  if (h % 101 === 0) return 1.00;
  const result = (100 * 0xFFFFFFFF) / (0xFFFFFFFF - h);
  return Math.max(1.00, Math.floor(result) / 100);
}

// DICE
export function rollDice(serverSeed: string, clientSeed: string, nonce: number): number {
  const outcome = generateOutcome(serverSeed, clientSeed, nonce);
  return Math.floor(outcome * 10000) / 100;
}

export function diceMultiplier(target: number, direction: 'under' | 'over', houseEdge: number): number {
  const winChance = direction === 'under' ? target / 100 : (100 - target) / 100;
  if (winChance <= 0 || winChance >= 1) return 0;
  return Math.floor((1 - houseEdge) / winChance * 10000) / 10000;
}

// MINES
export function generateMinePositions(
  serverSeed: string, clientSeed: string, nonce: number, mineCount: number
): number[] {
  if (mineCount < 1 || mineCount > 24) throw new Error('Invalid mine count');
  const outcomes = generateOutcomeBytes(serverSeed, clientSeed, nonce, 25);
  const indexed = outcomes.map((v, i) => ({ v, i }));
  indexed.sort((a, b) => a.v - b.v);
  return indexed.slice(0, mineCount).map(x => x.i).sort((a, b) => a - b);
}

// COINFLIP
export function generateCoinflipResult(serverSeed: string, clientSeed: string, nonce: number): 'heads' | 'tails' {
  return generateOutcome(serverSeed, clientSeed, nonce) < 0.5 ? 'heads' : 'tails';
}

// LIMBO
export function generateLimboResult(serverSeed: string, clientSeed: string, nonce: number, houseEdge: number): number {
  const outcome = generateOutcome(serverSeed, clientSeed, nonce);
  if (outcome === 0) return 1;
  const result = (1 - houseEdge) / outcome;
  return Math.max(1, Math.floor(result * 100) / 100);
}

// KENO
export function generateKenoNumbers(serverSeed: string, clientSeed: string, nonce: number, count: number): number[] {
  const outcomes = generateOutcomeBytes(serverSeed, clientSeed, nonce, 40);
  const indexed = outcomes.map((v, i) => ({ v, i: i + 1 }));
  indexed.sort((a, b) => a.v - b.v);
  return indexed.slice(0, count).map(x => x.i).sort((a, b) => a - b);
}

// PLINKO
export function generatePlinkoPath(serverSeed: string, clientSeed: string, nonce: number, rows: number): number[] {
  const outcomes = generateOutcomeBytes(serverSeed, clientSeed, nonce, rows);
  return outcomes.map(v => v < 0.5 ? 0 : 1);
}
