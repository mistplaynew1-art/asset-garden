// Server-authoritative game engine.
//
// All RNG happens here. Clients submit a `gameType`, `betAmount`, and
// game-specific `params` (e.g. dice target, mines picks). The server:
//   1. Generates a fresh server seed and client seed
//   2. Computes the outcome via /games.ts pure functions
//   3. Calls the `place_bet` RPC which atomically debits + credits the wallet
//   4. Returns the outcome + the seed hash so the client can verify after the round
//
// Heavy multi-step games (mines, tower, blackjack) are designed so the client
// performs the animation locally but the *outcome* is decided by the server.
// For mines/tower the client sends the full `picks[]` and a `cashout` flag
// when the round ends, and the server replays the picks against its
// authoritative mine layout.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

import { FloatStream, generateServerSeed, sha256Hex } from './rng.ts';
import {
  type Outcome,
  playBlackjack, playCoinflip, playCrash, playDice, playDragonTiger,
  playHilo, playKeno, playLimbo, playMines, playPlinko, playRoulette,
  playSlots, playTower, playWheel,
} from './games.ts';
import { playClassicSlots } from './slots-classic.ts';
import { playThemedSlot } from './slots-themed.ts';
import { playBigBassSlots } from './slots-bigbass.ts';
import { playOlympusSlot } from './slots-olympus.ts';
import { playBonanzaSlot } from './slots-bonanza.ts';
import { handleStatefulRound } from './stateful.ts';

type GameType =
  | 'dice' | 'limbo' | 'coinflip' | 'hilo'
  | 'crash' | 'jetpack'
  | 'mines' | 'plinko' | 'tower'
  | 'roulette' | 'wheel' | 'keno'
  | 'blackjack' | 'dragon-tiger'
  | 'slots'
  // Server-authoritative slot engines (one per slot, ported 1:1 from each Phaser scene's math).
  | 'classic-slots'
  // Generic 5×3 / 9-payline themed slots — `params.themeId` selects the math.
  | 'themed-slot'
  // Big Bass Bonanza — fisherman wild + cash-collect free spins.
  | 'bigbass-slot'
  // Gates of Olympus — 6×5 tumble with Zeus multipliers.
  | 'olympus-slot' | 'gates-olympus'
  // Sweet Bonanza — 6×5 cluster pays with tumble.
  | 'bonanza-slot' | 'sweet-bonanza';

interface PlayRequest {
  gameType: GameType;
  betAmount: number;
  params?: Record<string, unknown>;
}

const HANDLERS: Record<GameType, (bet: number, params: Record<string, unknown>, rng: FloatStream) => Promise<Outcome>> = {
  'dice': playDice,
  'limbo': playLimbo,
  'coinflip': playCoinflip,
  'hilo': playHilo,
  'crash': playCrash,
  'jetpack': playCrash,
  'mines': playMines,
  'plinko': playPlinko,
  'tower': playTower,
  'roulette': playRoulette,
  'wheel': playWheel,
  'keno': playKeno,
  'blackjack': playBlackjack,
  'dragon-tiger': playDragonTiger,
  'slots': playSlots,
  'classic-slots': playClassicSlots,
  'themed-slot': playThemedSlot,
  'bigbass-slot': playBigBassSlots,
  'olympus-slot': playOlympusSlot,
  'gates-olympus': playOlympusSlot,
  'bonanza-slot': playBonanzaSlot,
  'sweet-bonanza': playBonanzaSlot,
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Always return 200 with { ok:false, error } so the client can read the
// real error message instead of getting a generic "non-2xx" failure.
function errResponse(error: string, extra: Record<string, unknown> = {}): Response {
  return jsonResponse({ ok: false, error, ...extra }, 200);
}

function isFiniteNumber(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n);
}

// Map legacy/UI slot slugs onto canonical edge-function handlers so games
// like "gates-olympus", "sweet-bonanza", "big-bass", themed slot slugs and
// classic slot slugs all resolve to a real handler.
function resolveGameType(rawType: string, params: Record<string, unknown>): {
  gameType: GameType;
  params: Record<string, unknown>;
} | null {
  if (rawType in HANDLERS) return { gameType: rawType as GameType, params };
  if (rawType === 'big-bass') return { gameType: 'bigbass-slot', params };
  if (rawType === 'classic' || rawType === 'classic-slot') return { gameType: 'classic-slots', params };
  if (rawType === 'olympus' || rawType === 'gates-of-olympus') return { gameType: 'olympus-slot', params };
  if (rawType === 'bonanza' || rawType === 'sweet-bonanza') return { gameType: 'bonanza-slot', params };
  // Anything else that looks like a slot slug → themed slot, with the slug
  // itself forwarded as the themeId so the math picks the right table.
  return { gameType: 'themed-slot', params: { ...params, themeId: params.themeId ?? rawType } };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return errResponse('METHOD_NOT_ALLOWED');

  try {
    const auth = req.headers.get('Authorization');
    if (!auth) return errResponse('NOT_AUTHENTICATED');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: auth } } },
    );
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    let body: PlayRequest;
    try { body = await req.json() as PlayRequest; }
    catch { return errResponse('INVALID_JSON'); }

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) return errResponse('NOT_AUTHENTICATED');

    if (!body.gameType) return errResponse('UNKNOWN_GAME_TYPE');
    const resolved = resolveGameType(String(body.gameType), body.params ?? {});
    if (!resolved || !HANDLERS[resolved.gameType]) return errResponse('UNKNOWN_GAME_TYPE');
    const resolvedParams = resolved.params;
    const resolvedType = resolved.gameType;
    if (!isFiniteNumber(body.betAmount) || body.betAmount <= 0 || body.betAmount > 100000) {
      return errResponse('INVALID_BET_AMOUNT');
    }

    if (resolvedType === 'hilo' || resolvedType === 'mines' || resolvedType === 'tower' || resolvedType === 'blackjack') {
      const stateful = await handleStatefulRound({
        adminClient: admin,
        betAmount: body.betAmount,
        gameType: resolvedType,
        params: resolvedParams,
        userId: authData.user.id,
      });
      if (stateful) return jsonResponse(stateful);
    }

    const serverSeed = generateServerSeed();
    const serverSeedHash = await sha256Hex(serverSeed);
    const clientSeed = generateServerSeed().slice(0, 16);
    const nonce = Date.now();

    const rng = new FloatStream(serverSeed, clientSeed, nonce);
    const handler = HANDLERS[resolvedType];
    const outcome = await handler(body.betAmount, resolvedParams, rng);

    const isInit = (outcome.result as Record<string, unknown> | undefined)?.init === true;
    if (isInit) {
      return jsonResponse({
        ok: true,
        roundId: null,
        won: false,
        multiplier: 0,
        payout: 0,
        result: outcome.result,
        balance: 0,
        serverSeedHash,
        clientSeed,
        nonce,
        init: true,
      });
    }

    const multiplier = Math.max(0, Math.min(1000, outcome.multiplier));
    const payout = outcome.won ? Math.floor(body.betAmount * multiplier * 100) / 100 : 0;

    const { data, error } = await supabase.rpc('place_bet', {
      p_game_type: String(body.gameType),
      p_bet_amount: body.betAmount,
      p_multiplier: multiplier,
      p_payout: payout,
      p_result: outcome.result as never,
      p_server_seed: serverSeed,
      p_client_seed: clientSeed,
      p_nonce: nonce,
    });

    if (error) return errResponse(error.message);
    const rpc = data as Record<string, unknown> | null;
    if (!rpc) return errResponse('RPC_NULL_RESPONSE');
    if (rpc.error) return errResponse(String(rpc.error));

    return jsonResponse({
      ok: true,
      roundId: rpc.round_id,
      won: outcome.won,
      multiplier,
      payout,
      result: outcome.result,
      balance: Number(rpc.balance),
      serverSeedHash,
      clientSeed,
      nonce,
    });
  } catch (e) {
    return errResponse((e as Error).message || 'UNKNOWN_ERROR');
  }
});
