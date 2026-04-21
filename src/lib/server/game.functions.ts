/**
 * Game functions — uses client-side RNG for outcomes and place_bet RPC for balance management.
 */
import { supabase } from '@/integrations/supabase/client';
import {
  generateOutcome,
  rollDice,
  diceMultiplier,
  generateCoinflipResult,
  generateLimboResult,
  generateServerSeed,
} from '@/lib/game/rng';

const HOUSE_EDGE = 0.01;

async function callPlaceBet(params: {
  gameType: string;
  betAmount: number;
  currency: string;
  multiplier: number;
  won: boolean;
  result: Record<string, unknown>;
}) {
  const payout = params.won ? Math.floor(params.betAmount * params.multiplier * 100) / 100 : 0;
  const { data, error } = await supabase.rpc('place_bet', {
    p_game_type: params.gameType,
    p_bet_amount: params.betAmount,
    p_multiplier: params.multiplier,
    p_payout: payout,
    p_result: params.result as never,
  });
  if (error) throw new Error(error.message);
  const result = data as Record<string, unknown>;
  if (result?.error) throw new Error(result.error as string);
  return result;
}

export async function playDice(data: {
  betAmount: number;
  currency: string;
  target: number;
  direction: 'over' | 'under';
}) {
  const serverSeed = generateServerSeed();
  const clientSeed = generateServerSeed().slice(0, 16);
  const nonce = Date.now();

  const roll = rollDice(serverSeed, clientSeed, nonce);
  const won = data.direction === 'over' ? roll > data.target : roll < data.target;
  const mult = won ? diceMultiplier(data.target, data.direction, HOUSE_EDGE) : 0;
  const payout = won ? Math.floor(data.betAmount * mult * 100) / 100 : 0;

  const rpcResult = await callPlaceBet({
    gameType: 'dice',
    betAmount: data.betAmount,
    currency: data.currency,
    multiplier: mult,
    won,
    result: { roll, target: data.target, direction: data.direction },
  });

  return {
    roundId: rpcResult.round_id as string,
    roll,
    won,
    multiplier: mult,
    payout,
    balance: Number(rpcResult.balance_after),
  };
}

export async function playGenericGame(data: {
  gameSlug: 'limbo' | 'coinflip' | 'hilo';
  betAmount: number;
  currency: string;
  targetMultiplier?: number;
  choice?: string;
  guess?: string;
}) {
  const serverSeed = generateServerSeed();
  const clientSeed = generateServerSeed().slice(0, 16);
  const nonce = Date.now();

  let won = false;
  let mult = 0;
  let outcomeData: Record<string, unknown> = {};

  if (data.gameSlug === 'limbo') {
    const target = data.targetMultiplier ?? 2;
    const result = generateLimboResult(serverSeed, clientSeed, nonce, HOUSE_EDGE);
    won = result >= target;
    mult = won ? target : 0;
    outcomeData = { result, targetMultiplier: target };
  } else if (data.gameSlug === 'coinflip') {
    const choice = data.choice ?? 'heads';
    const result = generateCoinflipResult(serverSeed, clientSeed, nonce);
    won = result === choice;
    mult = won ? 1.96 : 0;
    outcomeData = { result, choice };
  } else if (data.gameSlug === 'hilo') {
    const guess = data.guess ?? 'higher';
    const result = generateOutcome(serverSeed, clientSeed, nonce);
    const card = Math.floor(result * 52);
    won = guess === 'higher' ? card > 26 : card < 26;
    mult = won ? 1.9 : 0;
    outcomeData = { card, guess };
  }

  const payout = won ? Math.floor(data.betAmount * mult * 100) / 100 : 0;

  const rpcResult = await callPlaceBet({
    gameType: data.gameSlug,
    betAmount: data.betAmount,
    currency: data.currency,
    multiplier: mult,
    won,
    result: outcomeData,
  });

  return {
    roundId: rpcResult.round_id as string,
    outcome: outcomeData,
    won,
    multiplier: mult,
    payout,
    balance: Number(rpcResult.balance_after),
  };
}

export async function placeGameBet(params: {
  gameType: string;
  betAmount: number;
  currency: string;
  multiplier: number;
  won: boolean;
  result: Record<string, unknown>;
}) {
  return callPlaceBet(params);
}

export async function getGameHistory(params: { gameSlug?: string; limit?: number }) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const limit = params.limit ?? 20;
  let query = supabase
    .from('game_rounds')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (params.gameSlug) query = query.eq('game_type', params.gameSlug);
  const { data: rounds } = await query;
  return { rounds: rounds ?? [] };
}
