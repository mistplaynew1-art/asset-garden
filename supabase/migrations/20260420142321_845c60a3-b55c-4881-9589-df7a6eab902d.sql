-- Crash bet RPC functions: place_crash_bet and cashout_crash_bet.
-- These are called by useCrashRound() to atomically debit/credit the wallet
-- against an active crash round.

CREATE OR REPLACE FUNCTION public.place_crash_bet(
  p_round_id UUID,
  p_game_type TEXT,
  p_bet_amount NUMERIC,
  p_auto_cashout NUMERIC DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_balance NUMERIC;
  v_bet_id UUID;
  v_round_status TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'NOT_AUTHENTICATED');
  END IF;

  IF p_bet_amount IS NULL OR p_bet_amount <= 0 THEN
    RETURN jsonb_build_object('error', 'INVALID_BET_AMOUNT');
  END IF;

  SELECT status INTO v_round_status FROM public.crash_rounds WHERE id = p_round_id;
  IF v_round_status IS NULL THEN
    RETURN jsonb_build_object('error', 'ROUND_NOT_FOUND');
  END IF;
  IF v_round_status <> 'waiting' THEN
    RETURN jsonb_build_object('error', 'ROUND_LOCKED');
  END IF;

  -- Prevent duplicate bets per user/round/game_type
  IF EXISTS (
    SELECT 1 FROM public.crash_bets
    WHERE user_id = v_user_id AND round_id = p_round_id AND game_type = p_game_type
  ) THEN
    RETURN jsonb_build_object('error', 'ALREADY_BET');
  END IF;

  -- Debit wallet atomically
  UPDATE public.wallets
  SET balance = balance - p_bet_amount, updated_at = now()
  WHERE user_id = v_user_id AND balance >= p_bet_amount
  RETURNING balance INTO v_balance;

  IF v_balance IS NULL THEN
    RETURN jsonb_build_object('error', 'INSUFFICIENT_FUNDS');
  END IF;

  INSERT INTO public.crash_bets (user_id, round_id, game_type, bet_amount, auto_cashout, status)
  VALUES (v_user_id, p_round_id, p_game_type, p_bet_amount, p_auto_cashout, 'placed')
  RETURNING id INTO v_bet_id;

  INSERT INTO public.transactions (user_id, type, amount, balance_after, reference_id, description)
  VALUES (v_user_id, 'bet', -p_bet_amount, v_balance, v_bet_id::TEXT, p_game_type || ' bet');

  RETURN jsonb_build_object('ok', true, 'bet_id', v_bet_id, 'balance', v_balance);
END;
$$;

CREATE OR REPLACE FUNCTION public.cashout_crash_bet(p_bet_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_bet RECORD;
  v_round RECORD;
  v_multiplier NUMERIC;
  v_payout NUMERIC;
  v_balance NUMERIC;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'NOT_AUTHENTICATED');
  END IF;

  SELECT * INTO v_bet FROM public.crash_bets WHERE id = p_bet_id AND user_id = v_user_id;
  IF v_bet.id IS NULL THEN
    RETURN jsonb_build_object('error', 'BET_NOT_FOUND');
  END IF;
  IF v_bet.cashed_out_at_multiplier IS NOT NULL THEN
    RETURN jsonb_build_object('error', 'ALREADY_CASHED_OUT');
  END IF;

  SELECT * INTO v_round FROM public.crash_rounds WHERE id = v_bet.round_id;
  IF v_round.id IS NULL THEN
    RETURN jsonb_build_object('error', 'ROUND_NOT_FOUND');
  END IF;
  IF v_round.status <> 'running' OR v_round.running_starts_at IS NULL THEN
    RETURN jsonb_build_object('error', 'ROUND_NOT_RUNNING');
  END IF;

  -- Compute live multiplier with curve m(t) = 1.0 * exp(0.06 * t) (matches client liveMultiplier).
  v_multiplier := GREATEST(1.0, exp(0.06 * EXTRACT(EPOCH FROM (now() - v_round.running_starts_at))));
  v_multiplier := LEAST(v_multiplier, COALESCE(v_round.crash_multiplier, 1000));

  v_payout := round((v_bet.bet_amount * v_multiplier)::numeric, 2);

  UPDATE public.crash_bets
  SET cashed_out_at_multiplier = v_multiplier,
      payout = v_payout,
      status = 'cashed_out',
      updated_at = now()
  WHERE id = p_bet_id;

  UPDATE public.wallets
  SET balance = balance + v_payout, updated_at = now()
  WHERE user_id = v_user_id
  RETURNING balance INTO v_balance;

  INSERT INTO public.transactions (user_id, type, amount, balance_after, reference_id, description)
  VALUES (v_user_id, 'win', v_payout, v_balance, p_bet_id::TEXT, v_bet.game_type || ' cashout @ ' || round(v_multiplier::numeric, 2) || 'x');

  RETURN jsonb_build_object('ok', true, 'multiplier', v_multiplier, 'payout', v_payout, 'balance', v_balance);
END;
$$;

GRANT EXECUTE ON FUNCTION public.place_crash_bet(UUID, TEXT, NUMERIC, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cashout_crash_bet(UUID) TO authenticated;