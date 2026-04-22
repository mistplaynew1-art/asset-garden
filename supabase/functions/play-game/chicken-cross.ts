// Chicken Cross — server-authoritative road-crossing game.
// Each lane has a difficulty-adjusted hit probability. The chicken advances
// lane-by-lane; if it survives, the multiplier grows. Client sends `lanes`
// (how many lanes attempted) and `cashout=true` to lock in the win.
//
// This is stateless: the server replays all lanes with one RNG stream and
// returns whichever outcome happened first (death OR cashout at requested lane).
import { FloatStream } from './rng.ts';
import type { Outcome } from './games.ts';

type Difficulty = 'easy' | 'medium' | 'hard' | 'daredevil';

// Hit probability per lane and per-lane multiplier step.
const DIFFICULTY: Record<Difficulty, { hitChance: number; step: number }> = {
  easy:      { hitChance: 0.04, step: 1.06 },
  medium:    { hitChance: 0.10, step: 1.18 },
  hard:      { hitChance: 0.20, step: 1.45 },
  daredevil: { hitChance: 0.35, step: 2.10 },
};

const MAX_LANES = 24;

export async function playChickenCross(
  _bet: number,
  params: Record<string, unknown>,
  rng: FloatStream,
): Promise<Outcome> {
  const diffKey = (typeof params.difficulty === 'string' ? params.difficulty : 'easy') as Difficulty;
  const cfg = DIFFICULTY[diffKey] ?? DIFFICULTY.easy;
  const targetLanes = Math.max(
    1,
    Math.min(MAX_LANES, Math.floor(Number(params.lanes ?? 1))),
  );

  let multiplier = 1;
  const lanes: Array<{ index: number; safe: boolean; multiplier: number }> = [];

  for (let i = 1; i <= targetLanes; i++) {
    const r = await rng.next();
    const safe = r >= cfg.hitChance;
    if (!safe) {
      lanes.push({ index: i, safe: false, multiplier: 0 });
      return {
        won: false,
        multiplier: 0,
        result: { difficulty: diffKey, lanes, deathLane: i },
      };
    }
    multiplier = +(multiplier * cfg.step).toFixed(2);
    lanes.push({ index: i, safe: true, multiplier });
  }

  return {
    won: true,
    multiplier,
    result: { difficulty: diffKey, lanes, cashedAt: targetLanes },
  };
}
