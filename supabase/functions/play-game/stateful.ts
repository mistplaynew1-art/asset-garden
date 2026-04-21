import { FloatStream, generateServerSeed, sha256Hex } from './rng.ts';

const HOUSE_EDGE = 0.01;
const USD = 'USD';

type AdminClient = any;

interface StatefulRequest {
  adminClient: AdminClient;
  betAmount: number;
  gameType: 'hilo' | 'mines' | 'tower' | 'blackjack';
  params: Record<string, unknown>;
  userId: string;
}

interface ActiveRoundRow {
  id: string;
  bet_amount: number;
  game_type: string;
  state: Record<string, unknown>;
  public_state: Record<string, unknown>;
  server_seed_hash: string | null;
  client_seed: string | null;
  nonce: number | null;
  status: string;
}

const TOWER_CFG: Record<string, { cols: number; mines: number; step: number; rows: number }> = {
  easy: { cols: 4, mines: 1, step: 1.31, rows: 8 },
  medium: { cols: 3, mines: 1, step: 1.47, rows: 8 },
  hard: { cols: 2, mines: 1, step: 2.18, rows: 8 },
};

export async function handleStatefulRound(req: StatefulRequest): Promise<Record<string, unknown> | null> {
  switch (req.gameType) {
    case 'hilo':
      return handleHilo(req);
    case 'mines':
      return handleMines(req);
    case 'tower':
      return handleTower(req);
    case 'blackjack':
      return handleBlackjack(req);
    default:
      return null;
  }
}

async function startRound(
  adminClient: AdminClient,
  userId: string,
  gameType: string,
  betAmount: number,
  state: Record<string, unknown>,
  publicState: Record<string, unknown>,
) {
  const serverSeed = generateServerSeed();
  const serverSeedHash = await sha256Hex(serverSeed);
  const clientSeed = generateServerSeed().slice(0, 16);
  const nonce = Date.now();

  const { data, error } = await adminClient.rpc('start_active_round', {
    p_user_id: userId,
    p_game_type: gameType,
    p_bet_amount: betAmount,
    p_state: state,
    p_public_state: publicState,
    p_server_seed: serverSeed,
    p_server_seed_hash: serverSeedHash,
    p_client_seed: clientSeed,
    p_nonce: nonce,
  });

  if (error) throw new Error(error.message);
  const rpc = data as Record<string, unknown> | null;
  if (!rpc) throw new Error('RPC_NULL_RESPONSE');
  if (rpc.error) throw new Error(String(rpc.error));

  await creditHouseBet(adminClient, betAmount);

  return {
    balance: Number(rpc.balance ?? 0),
    clientSeed,
    nonce,
    roundToken: String(rpc.round_id),
    serverSeedHash,
  };
}

async function getActiveRound(
  adminClient: AdminClient,
  userId: string,
  gameType: string,
  roundToken: string,
): Promise<ActiveRoundRow> {
  const { data, error } = await adminClient
    .from('active_rounds')
    .select('*')
    .eq('id', roundToken)
    .eq('user_id', userId)
    .eq('game_type', gameType)
    .single();

  if (error || !data) throw new Error('ROUND_NOT_FOUND');
  if (data.status !== 'active') throw new Error('ROUND_ALREADY_SETTLED');
  return data as ActiveRoundRow;
}

async function updateRound(
  adminClient: AdminClient,
  roundId: string,
  state: Record<string, unknown>,
  publicState: Record<string, unknown>,
) {
  const { error } = await adminClient
    .from('active_rounds')
    .update({ state, public_state: publicState, updated_at: new Date().toISOString() })
    .eq('id', roundId);

  if (error) throw new Error(error.message);
}

async function settleRound(
  adminClient: AdminClient,
  round: ActiveRoundRow,
  userId: string,
  multiplier: number,
  result: Record<string, unknown>,
  status = 'settled',
) {
  const payout = multiplier > 0 ? floor2(Number(round.bet_amount) * multiplier) : 0;
  const { data, error } = await adminClient.rpc('settle_active_round', {
    p_round_id: round.id,
    p_user_id: userId,
    p_multiplier: multiplier,
    p_payout: payout,
    p_status: status,
    p_result: result,
  });

  if (error) throw new Error(error.message);
  const rpc = data as Record<string, unknown> | null;
  if (!rpc) throw new Error('RPC_NULL_RESPONSE');
  if (rpc.error) throw new Error(String(rpc.error));

  return {
    balance: Number(rpc.balance ?? 0),
    payout: Number(rpc.payout ?? payout),
    roundId: String(rpc.round_id ?? round.id),
    won: Boolean(rpc.won ?? (payout > 0)),
  };
}

async function creditHouseBet(adminClient: AdminClient, amount: number) {
  const { data, error } = await adminClient.from('house_wallet').select('*').limit(1).maybeSingle();
  if (error || !data) return;

  await adminClient
    .from('house_wallet')
    .update({
      balance: Number(data.balance ?? 0) + amount,
      total_bets: Number(data.total_bets ?? 0) + amount,
      total_bets_today: Number(data.total_bets_today ?? 0) + amount,
      updated_at: new Date().toISOString(),
    })
    .eq('id', data.id);
}

async function debitAdditionalStake(
  adminClient: AdminClient,
  round: ActiveRoundRow,
  userId: string,
  amount: number,
) {
  const { data: wallet, error: walletError } = await adminClient
    .from('wallets')
    .select('*')
    .eq('user_id', userId)
    .eq('currency', USD)
    .maybeSingle();

  if (walletError || !wallet) throw new Error('NO_WALLET');
  const balance = Number(wallet.balance ?? 0);
  if (balance < amount) throw new Error('INSUFFICIENT_BALANCE');

  const nextBalance = floor2(balance - amount);

  const { error: updateWalletError } = await adminClient
    .from('wallets')
    .update({ balance: nextBalance, updated_at: new Date().toISOString() })
    .eq('id', wallet.id);
  if (updateWalletError) throw new Error(updateWalletError.message);

  const { error: updateRoundError } = await adminClient
    .from('active_rounds')
    .update({ bet_amount: Number(round.bet_amount) + amount, updated_at: new Date().toISOString() })
    .eq('id', round.id);
  if (updateRoundError) throw new Error(updateRoundError.message);

  await adminClient.from('transactions').insert({
    user_id: userId,
    type: 'bet',
    amount: -amount,
    balance_after: nextBalance,
    description: `${round.game_type} double`,
    reference_id: round.id,
  });

  await creditHouseBet(adminClient, amount);
  round.bet_amount = Number(round.bet_amount) + amount;

  return nextBalance;
}

async function handleHilo({ adminClient, betAmount, params, userId }: StatefulRequest) {
  const roundToken = stringOrNull(params.roundToken);
  const action = params.action === 'guess' ? 'guess' : 'deal';

  if (!roundToken || action === 'deal') {
    const serverSeed = generateServerSeed();
    const clientSeed = generateServerSeed().slice(0, 16);
    const nonce = Date.now();
    const rng = new FloatStream(serverSeed, clientSeed, nonce);
    const currentValue = await rng.nextInt(13);
    const currentSuit = await rng.nextInt(4);
    const nextValue = await rng.nextInt(13);
    const nextSuit = await rng.nextInt(4);
    const serverSeedHash = await sha256Hex(serverSeed);

    const state = { currentValue, currentSuit, nextValue, nextSuit };
    const publicState = { currentValue, currentSuit };
    const { data, error } = await adminClient.rpc('start_active_round', {
      p_user_id: userId,
      p_game_type: 'hilo',
      p_bet_amount: betAmount,
      p_state: state,
      p_public_state: publicState,
      p_server_seed: serverSeed,
      p_server_seed_hash: serverSeedHash,
      p_client_seed: clientSeed,
      p_nonce: nonce,
    });
    if (error) throw new Error(error.message);
    const rpc = data as Record<string, unknown> | null;
    if (!rpc) throw new Error('RPC_NULL_RESPONSE');
    if (rpc.error) throw new Error(String(rpc.error));

    await creditHouseBet(adminClient, betAmount);

    return {
      ok: true,
      roundId: String(rpc.round_id),
      won: false,
      multiplier: 0,
      payout: 0,
      balance: Number(rpc.balance ?? 0),
      serverSeedHash,
      clientSeed,
      nonce,
      result: {
        currentSuit,
        currentValue,
        guess: null,
        multiplier: 0,
        nextSuit: null,
        nextValue: null,
        roundToken: String(rpc.round_id),
        won: false,
      },
    };
  }

  const round = await getActiveRound(adminClient, userId, 'hilo', roundToken);
  const guess = params.guess === 'lower' ? 'lower' : 'higher';
  const state = round.state as Record<string, number>;
  const currentValue = Number(state.currentValue ?? 6);
  const currentSuit = Number(state.currentSuit ?? 0);
  const nextValue = Number(state.nextValue ?? 0);
  const nextSuit = Number(state.nextSuit ?? 0);
  const won = guess === 'higher' ? nextValue > currentValue : nextValue < currentValue;
  const probHigher = (12 - currentValue) / 13;
  const probLower = currentValue / 13;
  const probability = guess === 'higher' ? probHigher : probLower;
  const multiplier = won && probability > 0 ? floor2((1 - HOUSE_EDGE) / probability) : 0;
  const result = { currentSuit, currentValue, guess, multiplier, nextSuit, nextValue, won };
  const settled = await settleRound(adminClient, round, userId, multiplier, result, won ? 'cashed_out' : 'busted');

  return {
    ok: true,
    roundId: settled.roundId,
    won,
    multiplier,
    payout: settled.payout,
    balance: settled.balance,
    serverSeedHash: round.server_seed_hash,
    clientSeed: round.client_seed,
    nonce: round.nonce,
    result,
  };
}

async function handleMines({ adminClient, betAmount, params, userId }: StatefulRequest) {
  const roundToken = stringOrNull(params.roundToken);
  const action = params.action === 'pick' ? 'pick' : params.action === 'cashout' ? 'cashout' : 'start';
  const mineCount = clamp(Math.floor(Number(params.mineCount ?? 5)), 1, 24);

  if (!roundToken || params.init === true || action === 'start') {
    const serverSeed = generateServerSeed();
    const clientSeed = generateServerSeed().slice(0, 16);
    const nonce = Date.now();
    const rng = new FloatStream(serverSeed, clientSeed, nonce);
    const minePositions = (await rng.shuffle(Array.from({ length: 25 }, (_, i) => i))).slice(0, mineCount).sort((a, b) => a - b);
    const serverSeedHash = await sha256Hex(serverSeed);
    const state = { mineCount, minePositions, picks: [], safeRevealed: 0 };
    const publicState = { mineCount, picks: [], safeRevealed: 0 };

    const { data, error } = await adminClient.rpc('start_active_round', {
      p_user_id: userId,
      p_game_type: 'mines',
      p_bet_amount: betAmount,
      p_state: state,
      p_public_state: publicState,
      p_server_seed: serverSeed,
      p_server_seed_hash: serverSeedHash,
      p_client_seed: clientSeed,
      p_nonce: nonce,
    });
    if (error) throw new Error(error.message);
    const rpc = data as Record<string, unknown> | null;
    if (!rpc) throw new Error('RPC_NULL_RESPONSE');
    if (rpc.error) throw new Error(String(rpc.error));

    await creditHouseBet(adminClient, betAmount);

    return {
      ok: true,
      roundId: String(rpc.round_id),
      won: false,
      multiplier: 0,
      payout: 0,
      balance: Number(rpc.balance ?? 0),
      serverSeedHash,
      clientSeed,
      nonce,
      result: {
        busted: false,
        bustIndex: null,
        cashout: false,
        mineCount,
        multiplier: 1,
        picks: [],
        roundToken: String(rpc.round_id),
        safeRevealed: 0,
      },
    };
  }

  const round = await getActiveRound(adminClient, userId, 'mines', roundToken);
  const state = (round.state ?? {}) as Record<string, unknown>;
  const minePositions = Array.isArray(state.minePositions) ? (state.minePositions as number[]).map(Number) : [];
  const picks = Array.isArray(state.picks) ? (state.picks as number[]).map(Number) : [];
  const mines = new Set(minePositions);
  const safeCount = 25 - Number(state.mineCount ?? mineCount);

  if (action === 'cashout') {
    if (picks.length === 0) throw new Error('INVALID_ACTION');
    const multiplier = floor2((1 - HOUSE_EDGE) * combinatorialMineMultiplier(Number(state.mineCount ?? mineCount), picks.length));
    const result = {
      busted: false,
      bustIndex: null,
      cashout: true,
      mineCount: Number(state.mineCount ?? mineCount),
      minePositions,
      multiplier,
      picks,
      safeRevealed: picks.length,
    };
    const settled = await settleRound(adminClient, round, userId, multiplier, result, 'cashed_out');
    return {
      ok: true,
      roundId: settled.roundId,
      won: true,
      multiplier,
      payout: settled.payout,
      balance: settled.balance,
      serverSeedHash: round.server_seed_hash,
      clientSeed: round.client_seed,
      nonce: round.nonce,
      result,
    };
  }

  const pickIndex = Number(params.pickIndex ?? getLastNumber(params.picks));
  if (!Number.isInteger(pickIndex) || pickIndex < 0 || pickIndex >= 25 || picks.includes(pickIndex)) {
    throw new Error('INVALID_ACTION');
  }

  const nextPicks = [...picks, pickIndex];
  if (mines.has(pickIndex)) {
    const result = {
      busted: true,
      bustIndex: pickIndex,
      cashout: false,
      mineCount: Number(state.mineCount ?? mineCount),
      minePositions,
      multiplier: 0,
      picks: nextPicks,
      safeRevealed: picks.length,
    };
    const settled = await settleRound(adminClient, round, userId, 0, result, 'busted');
    return {
      ok: true,
      roundId: settled.roundId,
      won: false,
      multiplier: 0,
      payout: 0,
      balance: settled.balance,
      serverSeedHash: round.server_seed_hash,
      clientSeed: round.client_seed,
      nonce: round.nonce,
      result,
    };
  }

  const safeRevealed = nextPicks.length;
  const currentMultiplier = floor2((1 - HOUSE_EDGE) * combinatorialMineMultiplier(Number(state.mineCount ?? mineCount), safeRevealed));
  if (safeRevealed >= safeCount) {
    const result = {
      busted: false,
      bustIndex: null,
      cashout: true,
      mineCount: Number(state.mineCount ?? mineCount),
      minePositions,
      multiplier: currentMultiplier,
      picks: nextPicks,
      safeRevealed,
    };
    const settled = await settleRound(adminClient, round, userId, currentMultiplier, result, 'completed');
    return {
      ok: true,
      roundId: settled.roundId,
      won: true,
      multiplier: currentMultiplier,
      payout: settled.payout,
      balance: settled.balance,
      serverSeedHash: round.server_seed_hash,
      clientSeed: round.client_seed,
      nonce: round.nonce,
      result,
    };
  }

  const nextState = { ...state, picks: nextPicks, safeRevealed };
  const nextPublicState = { mineCount: Number(state.mineCount ?? mineCount), picks: nextPicks, safeRevealed };
  await updateRound(adminClient, round.id, nextState, nextPublicState);

  return {
    ok: true,
    roundId: round.id,
    won: false,
    multiplier: currentMultiplier,
    payout: 0,
    balance: 0,
    serverSeedHash: round.server_seed_hash,
    clientSeed: round.client_seed,
    nonce: round.nonce,
    result: {
      busted: false,
      bustIndex: null,
      cashout: false,
      mineCount: Number(state.mineCount ?? mineCount),
      multiplier: currentMultiplier,
      picks: nextPicks,
      roundToken: round.id,
      safeRevealed,
    },
  };
}

async function handleTower({ adminClient, betAmount, params, userId }: StatefulRequest) {
  const roundToken = stringOrNull(params.roundToken);
  const action = params.action === 'pick' ? 'pick' : params.action === 'cashout' ? 'cashout' : 'start';
  const difficulty = String(params.difficulty ?? 'medium');
  const cfg = TOWER_CFG[difficulty] ?? TOWER_CFG.medium;

  if (!roundToken || params.init === true || action === 'start') {
    const serverSeed = generateServerSeed();
    const clientSeed = generateServerSeed().slice(0, 16);
    const nonce = Date.now();
    const rng = new FloatStream(serverSeed, clientSeed, nonce);
    const bombs: number[][] = [];
    for (let row = 0; row < cfg.rows; row++) {
      bombs.push((await rng.shuffle(Array.from({ length: cfg.cols }, (_, i) => i))).slice(0, cfg.mines).sort((a, b) => a - b));
    }
    const serverSeedHash = await sha256Hex(serverSeed);
    const state = { bombs, difficulty, picks: [], reachedRow: 0 };
    const publicState = { difficulty, picks: [], reachedRow: 0 };

    const { data, error } = await adminClient.rpc('start_active_round', {
      p_user_id: userId,
      p_game_type: 'tower',
      p_bet_amount: betAmount,
      p_state: state,
      p_public_state: publicState,
      p_server_seed: serverSeed,
      p_server_seed_hash: serverSeedHash,
      p_client_seed: clientSeed,
      p_nonce: nonce,
    });
    if (error) throw new Error(error.message);
    const rpc = data as Record<string, unknown> | null;
    if (!rpc) throw new Error('RPC_NULL_RESPONSE');
    if (rpc.error) throw new Error(String(rpc.error));

    await creditHouseBet(adminClient, betAmount);

    return {
      ok: true,
      roundId: String(rpc.round_id),
      won: false,
      multiplier: 1,
      payout: 0,
      balance: Number(rpc.balance ?? 0),
      serverSeedHash,
      clientSeed,
      nonce,
      result: {
        bombs: undefined,
        busted: false,
        cashout: false,
        difficulty,
        multiplier: 1,
        picks: [],
        reachedRow: 0,
        roundToken: String(rpc.round_id),
      },
    };
  }

  const round = await getActiveRound(adminClient, userId, 'tower', roundToken);
  const state = (round.state ?? {}) as Record<string, unknown>;
  const bombs = Array.isArray(state.bombs) ? (state.bombs as number[][]).map((row) => row.map(Number)) : [];
  const picks = Array.isArray(state.picks) ? (state.picks as number[]).map(Number) : [];
  const reachedRow = Number(state.reachedRow ?? 0);
  const towerDifficulty = String(state.difficulty ?? difficulty);
  const towerCfg = TOWER_CFG[towerDifficulty] ?? cfg;

  if (action === 'cashout') {
    if (reachedRow <= 0) throw new Error('INVALID_ACTION');
    const multiplier = floor2((towerCfg.step ** reachedRow) * (1 - HOUSE_EDGE));
    const result = {
      bombs,
      busted: false,
      cashout: true,
      difficulty: towerDifficulty,
      multiplier,
      picks,
      reachedRow,
    };
    const settled = await settleRound(adminClient, round, userId, multiplier, result, 'cashed_out');
    return {
      ok: true,
      roundId: settled.roundId,
      won: true,
      multiplier,
      payout: settled.payout,
      balance: settled.balance,
      serverSeedHash: round.server_seed_hash,
      clientSeed: round.client_seed,
      nonce: round.nonce,
      result,
    };
  }

  const pickIndex = Number(params.pickIndex ?? getLastNumber(params.picks));
  if (!Number.isInteger(pickIndex) || pickIndex < 0 || pickIndex >= towerCfg.cols) {
    throw new Error('INVALID_ACTION');
  }

  const rowBombs = bombs[reachedRow] ?? [];
  const nextPicks = [...picks, pickIndex];
  if (rowBombs.includes(pickIndex)) {
    const result = {
      bombs,
      busted: true,
      cashout: false,
      difficulty: towerDifficulty,
      multiplier: 0,
      picks: nextPicks,
      reachedRow,
    };
    const settled = await settleRound(adminClient, round, userId, 0, result, 'busted');
    return {
      ok: true,
      roundId: settled.roundId,
      won: false,
      multiplier: 0,
      payout: 0,
      balance: settled.balance,
      serverSeedHash: round.server_seed_hash,
      clientSeed: round.client_seed,
      nonce: round.nonce,
      result,
    };
  }

  const nextReachedRow = reachedRow + 1;
  const multiplier = floor2((towerCfg.step ** nextReachedRow) * (1 - HOUSE_EDGE));
  if (nextReachedRow >= towerCfg.rows) {
    const result = {
      bombs,
      busted: false,
      cashout: true,
      difficulty: towerDifficulty,
      multiplier,
      picks: nextPicks,
      reachedRow: nextReachedRow,
    };
    const settled = await settleRound(adminClient, round, userId, multiplier, result, 'completed');
    return {
      ok: true,
      roundId: settled.roundId,
      won: true,
      multiplier,
      payout: settled.payout,
      balance: settled.balance,
      serverSeedHash: round.server_seed_hash,
      clientSeed: round.client_seed,
      nonce: round.nonce,
      result,
    };
  }

  const nextState = { ...state, picks: nextPicks, reachedRow: nextReachedRow };
  const nextPublicState = { difficulty: towerDifficulty, picks: nextPicks, reachedRow: nextReachedRow };
  await updateRound(adminClient, round.id, nextState, nextPublicState);

  return {
    ok: true,
    roundId: round.id,
    won: false,
    multiplier,
    payout: 0,
    balance: 0,
    serverSeedHash: round.server_seed_hash,
    clientSeed: round.client_seed,
    nonce: round.nonce,
    result: {
      busted: false,
      cashout: false,
      difficulty: towerDifficulty,
      multiplier,
      picks: nextPicks,
      reachedRow: nextReachedRow,
      roundToken: round.id,
    },
  };
}

async function handleBlackjack({ adminClient, betAmount, params, userId }: StatefulRequest) {
  const roundToken = stringOrNull(params.roundToken);
  const action = String(params.action ?? 'deal');

  if (!roundToken || action === 'deal') {
    const serverSeed = generateServerSeed();
    const clientSeed = generateServerSeed().slice(0, 16);
    const nonce = Date.now();
    const rng = new FloatStream(serverSeed, clientSeed, nonce);
    const deck = await buildDeck(rng);
    const playerCards = [deck.shift()!, deck.shift()!];
    const dealerCards = [deck.shift()!, deck.shift()!];
    const playerTotal = handTotal(playerCards).total;
    const publicState = {
      dealerVisible: dealerCards[0],
      playerCards,
      playerTotal,
    };
    const state = {
      dealerCards,
      deck,
      doubled: false,
      playerCards,
    };
    const serverSeedHash = await sha256Hex(serverSeed);

    const { data, error } = await adminClient.rpc('start_active_round', {
      p_user_id: userId,
      p_game_type: 'blackjack',
      p_bet_amount: betAmount,
      p_state: state,
      p_public_state: publicState,
      p_server_seed: serverSeed,
      p_server_seed_hash: serverSeedHash,
      p_client_seed: clientSeed,
      p_nonce: nonce,
    });
    if (error) throw new Error(error.message);
    const rpc = data as Record<string, unknown> | null;
    if (!rpc) throw new Error('RPC_NULL_RESPONSE');
    if (rpc.error) throw new Error(String(rpc.error));

    await creditHouseBet(adminClient, betAmount);

    return {
      ok: true,
      roundId: String(rpc.round_id),
      won: false,
      multiplier: 0,
      payout: 0,
      balance: Number(rpc.balance ?? 0),
      serverSeedHash,
      clientSeed,
      nonce,
      result: {
        bust: false,
        dealerCards: null,
        dealerTotal: null,
        dealerVisible: dealerCards[0],
        multiplier: 0,
        outcome: null,
        playerCards,
        playerTotal,
        roundToken: String(rpc.round_id),
      },
    };
  }

  const round = await getActiveRound(adminClient, userId, 'blackjack', roundToken);
  const state = (round.state ?? {}) as Record<string, unknown>;
  const playerCards = Array.isArray(state.playerCards) ? (state.playerCards as Card[]).map(normalizeCard) : [];
  const dealerCards = Array.isArray(state.dealerCards) ? (state.dealerCards as Card[]).map(normalizeCard) : [];
  const deck = Array.isArray(state.deck) ? (state.deck as Card[]).map(normalizeCard) : [];
  let doubled = state.doubled === true;

  if (action === 'hit') {
    playerCards.push(drawCard(deck));
    const playerTotal = handTotal(playerCards).total;
    if (playerTotal > 21) {
      const result = {
        bust: true,
        dealerCards,
        dealerTotal: handTotal(dealerCards).total,
        dealerVisible: dealerCards[0] ?? null,
        multiplier: 0,
        outcome: 'lose',
        playerCards,
        playerTotal,
        roundToken: null,
      };
      const settled = await settleRound(adminClient, round, userId, 0, result, 'busted');
      return {
        ok: true,
        roundId: settled.roundId,
        won: false,
        multiplier: 0,
        payout: 0,
        balance: settled.balance,
        serverSeedHash: round.server_seed_hash,
        clientSeed: round.client_seed,
        nonce: round.nonce,
        result,
      };
    }

    const nextState = { dealerCards, deck, doubled, playerCards };
    const nextPublicState = {
      dealerVisible: dealerCards[0] ?? null,
      playerCards,
      playerTotal,
    };
    await updateRound(adminClient, round.id, nextState, nextPublicState);

    return {
      ok: true,
      roundId: round.id,
      won: false,
      multiplier: 0,
      payout: 0,
      balance: 0,
      serverSeedHash: round.server_seed_hash,
      clientSeed: round.client_seed,
      nonce: round.nonce,
      result: {
        bust: false,
        dealerCards: null,
        dealerTotal: null,
        dealerVisible: dealerCards[0] ?? null,
        multiplier: 0,
        outcome: null,
        playerCards,
        playerTotal,
        roundToken: round.id,
      },
    };
  }

  if (action === 'double') {
    if (playerCards.length !== 2 || doubled) throw new Error('INVALID_ACTION');
    await debitAdditionalStake(adminClient, round, userId, Number(round.bet_amount));
    doubled = true;
    playerCards.push(drawCard(deck));
  }

  if (action !== 'stand' && action !== 'double') throw new Error('INVALID_ACTION');

  while (handTotal(dealerCards).total < 17) dealerCards.push(drawCard(deck));

  const playerTotal = handTotal(playerCards).total;
  const dealerTotal = handTotal(dealerCards).total;
  const playerBJ = playerCards.length === 2 && playerTotal === 21 && !doubled;
  const dealerBJ = dealerCards.length === 2 && dealerTotal === 21;
  let multiplier = 0;
  let outcome: 'win' | 'lose' | 'push' | 'blackjack' = 'lose';

  if (playerTotal > 21) {
    multiplier = 0;
    outcome = 'lose';
  } else if (playerBJ && !dealerBJ) {
    multiplier = 2.5;
    outcome = 'blackjack';
  } else if (dealerBJ && !playerBJ) {
    multiplier = 0;
    outcome = 'lose';
  } else if (dealerTotal > 21 || playerTotal > dealerTotal) {
    multiplier = 2;
    outcome = 'win';
  } else if (playerTotal === dealerTotal) {
    multiplier = 1;
    outcome = 'push';
  }

  const result = {
    bust: playerTotal > 21,
    dealerCards,
    dealerTotal,
    dealerVisible: dealerCards[0] ?? null,
    multiplier,
    outcome,
    playerCards,
    playerTotal,
    roundToken: null,
  };
  const settled = await settleRound(adminClient, round, userId, multiplier, result, outcome === 'lose' ? 'busted' : 'completed');

  return {
    ok: true,
    roundId: settled.roundId,
    won: multiplier > 1,
    multiplier,
    payout: settled.payout,
    balance: settled.balance,
    serverSeedHash: round.server_seed_hash,
    clientSeed: round.client_seed,
    nonce: round.nonce,
    result,
  };
}

interface Card {
  suit: number;
  value: number;
}

async function buildDeck(rng: FloatStream) {
  const deck: Card[] = [];
  for (let suit = 0; suit < 4; suit++) {
    for (let value = 1; value <= 13; value++) {
      deck.push({ suit, value });
    }
  }
  return rng.shuffle(deck);
}

function drawCard(deck: Card[]) {
  const card = deck.shift();
  if (!card) throw new Error('INVALID_ACTION');
  return normalizeCard(card);
}

function normalizeCard(card: Record<string, unknown>): Card {
  return {
    suit: Number(card.suit ?? 0),
    value: Number(card.value ?? 1),
  };
}

function handTotal(cards: Card[]) {
  let total = 0;
  let aces = 0;
  for (const card of cards) {
    total += card.value === 1 ? 11 : card.value >= 11 ? 10 : card.value;
    if (card.value === 1) aces += 1;
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }
  return { total };
}

function combinatorialMineMultiplier(mineCount: number, safeRevealed: number) {
  const safeCount = 25 - mineCount;
  return (25 / safeCount) ** safeRevealed;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function floor2(value: number) {
  return Math.floor(value * 100) / 100;
}

function getLastNumber(value: unknown) {
  if (!Array.isArray(value) || value.length === 0) return null;
  return Number(value[value.length - 1]);
}

function stringOrNull(value: unknown) {
  return typeof value === 'string' && value.length > 0 ? value : null;
}