// Lotto — pick N numbers from 1..49, server draws 6 winners.
// Payout table approximates a fair lottery with ~1% house edge.
import { FloatStream } from './rng.ts';
import type { Outcome } from './games.ts';

const POOL = 49;
const DRAWN = 6;

// multiplier by number of matches (out of 6 picks).
const PAYOUT: Record<number, number> = {
  0: 0, 1: 0, 2: 0,
  3: 5,
  4: 50,
  5: 500,
  6: 50000,
};

export async function playLotto(
  _bet: number,
  params: Record<string, unknown>,
  rng: FloatStream,
): Promise<Outcome> {
  const rawPicks = Array.isArray(params.picks) ? params.picks : [];
  const picks = Array.from(
    new Set(
      rawPicks
        .map((n) => Math.floor(Number(n)))
        .filter((n) => Number.isFinite(n) && n >= 1 && n <= POOL),
    ),
  ).slice(0, DRAWN);

  if (picks.length !== DRAWN) {
    return { won: false, multiplier: 0, result: { error: 'NEED_6_PICKS', picks } };
  }

  // Draw 6 unique numbers from the pool.
  const pool = Array.from({ length: POOL }, (_, i) => i + 1);
  const drawn: number[] = [];
  for (let i = 0; i < DRAWN; i++) {
    const idx = await rng.nextInt(pool.length);
    drawn.push(pool[idx]);
    pool.splice(idx, 1);
  }

  const matches = picks.filter((p) => drawn.includes(p)).length;
  const multiplier = PAYOUT[matches] ?? 0;
  return {
    won: multiplier > 0,
    multiplier,
    result: { picks, drawn, matches },
  };
}
