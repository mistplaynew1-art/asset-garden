CREATE OR REPLACE FUNCTION public.place_bet(p_game_type text, p_bet_amount numeric, p_multiplier numeric DEFAULT 0, p_payout numeric DEFAULT 0, p_result jsonb DEFAULT '{}'::jsonb, p_server_seed text DEFAULT NULL::text, p_client_seed text DEFAULT NULL::text, p_nonce bigint DEFAULT NULL::bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_user_id UUID; v_balance NUMERIC; v_won BOOLEAN; v_round_id UUID; v_balance_after NUMERIC;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RETURN jsonb_build_object('error','NOT_AUTHENTICATED'); END IF;
  SELECT balance INTO v_balance FROM public.wallets WHERE user_id = v_user_id AND currency = 'USD' FOR UPDATE;
  IF v_balance IS NULL THEN RETURN jsonb_build_object('error','NO_WALLET'); END IF;
  IF v_balance < p_bet_amount THEN RETURN jsonb_build_object('error','INSUFFICIENT_BALANCE'); END IF;
  IF p_bet_amount <= 0 THEN RETURN jsonb_build_object('error','INVALID_BET_AMOUNT'); END IF;
  v_won := p_payout > 0;
  v_balance_after := v_balance - p_bet_amount + p_payout;
  UPDATE public.wallets SET balance = v_balance_after WHERE user_id = v_user_id AND currency = 'USD';
  INSERT INTO public.game_rounds (user_id, game_type, bet_amount, multiplier, payout, won, result, server_seed, client_seed, nonce)
  VALUES (v_user_id, p_game_type, p_bet_amount, p_multiplier, p_payout, v_won, p_result, p_server_seed, p_client_seed, p_nonce)
  RETURNING id INTO v_round_id;
  INSERT INTO public.transactions (user_id, type, amount, balance_after, description, reference_id)
  VALUES (v_user_id, 'bet', -p_bet_amount, v_balance - p_bet_amount, p_game_type || ' bet', v_round_id);
  IF v_won THEN
    INSERT INTO public.transactions (user_id, type, amount, balance_after, description, reference_id)
    VALUES (v_user_id, 'win', p_payout, v_balance_after, p_game_type || ' win', v_round_id);
  END IF;
  UPDATE public.house_wallet SET
    total_bets = total_bets + p_bet_amount,
    total_payouts = total_payouts + p_payout,
    total_bets_today = total_bets_today + p_bet_amount,
    total_payouts_today = total_payouts_today + p_payout,
    balance = balance + p_bet_amount - p_payout,
    updated_at = now()
    WHERE id IS NOT NULL;
  UPDATE public.platform_stats SET stat_value = stat_value + (p_bet_amount * 0.005), updated_at = now()
    WHERE stat_key = 'jackpot_mini';
  UPDATE public.platform_stats SET stat_value = stat_value + (p_bet_amount * 0.003), updated_at = now()
    WHERE stat_key = 'jackpot_major';
  UPDATE public.platform_stats SET stat_value = stat_value + (p_bet_amount * 0.002), updated_at = now()
    WHERE stat_key = 'jackpot_grand';
  RETURN jsonb_build_object('round_id', v_round_id, 'won', v_won, 'payout', p_payout, 'balance', v_balance_after);
END; $function$;

CREATE OR REPLACE FUNCTION public.cashout_crash_bet(p_bet_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_user UUID := auth.uid(); v_bet RECORD; v_round RECORD; v_elapsed_ms NUMERIC;
        v_current_mult NUMERIC; v_payout NUMERIC; v_balance_after NUMERIC;
BEGIN
  IF v_user IS NULL THEN RETURN jsonb_build_object('error','NOT_AUTHENTICATED'); END IF;
  SELECT * INTO v_bet FROM public.crash_bets WHERE id = p_bet_id FOR UPDATE;
  IF v_bet IS NULL OR v_bet.user_id <> v_user THEN RETURN jsonb_build_object('error','BET_NOT_FOUND'); END IF;
  IF v_bet.status <> 'placed' THEN RETURN jsonb_build_object('error','ALREADY_SETTLED'); END IF;
  SELECT * INTO v_round FROM public.crash_rounds WHERE id = v_bet.round_id FOR UPDATE;
  IF v_round.status <> 'running' THEN RETURN jsonb_build_object('error','NOT_RUNNING'); END IF;
  v_elapsed_ms := EXTRACT(EPOCH FROM (now() - v_round.running_starts_at)) * 1000.0;
  v_current_mult := 1 + 0.06 * power(v_elapsed_ms / 1000.0, 1.6);
  IF v_current_mult >= v_round.crash_multiplier THEN RETURN jsonb_build_object('error','TOO_LATE'); END IF;
  v_payout := round(v_bet.bet_amount * v_current_mult, 2);
  UPDATE public.crash_bets SET status = 'cashed', cashout_multiplier = v_current_mult, payout = v_payout WHERE id = p_bet_id;
  UPDATE public.wallets SET balance = balance + v_payout WHERE user_id = v_user AND currency = 'USD' RETURNING balance INTO v_balance_after;
  INSERT INTO public.transactions (user_id, type, amount, balance_after, description, reference_id)
    VALUES (v_user, 'win', v_payout, v_balance_after, v_bet.game_type || ' cashout', p_bet_id);
  UPDATE public.house_wallet SET total_payouts = total_payouts + v_payout, total_payouts_today = total_payouts_today + v_payout,
    balance = balance - v_payout, updated_at = now() WHERE id IS NOT NULL;
  RETURN jsonb_build_object('ok', true, 'multiplier', v_current_mult, 'payout', v_payout, 'balance', v_balance_after);
END; $function$;

CREATE OR REPLACE FUNCTION public.settle_active_round(p_round_id uuid, p_user_id uuid, p_multiplier numeric, p_payout numeric, p_status text, p_result jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_round RECORD; v_balance NUMERIC; v_balance_after NUMERIC; v_won BOOLEAN; v_final_round_id UUID;
BEGIN
  IF p_user_id IS NULL THEN RETURN jsonb_build_object('error','NOT_AUTHENTICATED'); END IF;
  SELECT * INTO v_round FROM public.active_rounds WHERE id = p_round_id AND user_id = p_user_id FOR UPDATE;
  IF v_round IS NULL THEN RETURN jsonb_build_object('error','ROUND_NOT_FOUND'); END IF;
  IF v_round.status <> 'active' THEN RETURN jsonb_build_object('error','ROUND_ALREADY_SETTLED'); END IF;
  v_won := p_payout > 0;
  IF p_payout > 0 THEN
    SELECT balance INTO v_balance FROM public.wallets WHERE user_id = p_user_id AND currency = 'USD' FOR UPDATE;
    v_balance_after := v_balance + p_payout;
    UPDATE public.wallets SET balance = v_balance_after WHERE user_id = p_user_id AND currency = 'USD';
  ELSE
    SELECT balance INTO v_balance_after FROM public.wallets WHERE user_id = p_user_id AND currency = 'USD';
  END IF;
  INSERT INTO public.game_rounds (user_id, game_type, bet_amount, multiplier, payout, won, result, server_seed, server_seed_hash, client_seed, nonce)
    VALUES (p_user_id, v_round.game_type, v_round.bet_amount, p_multiplier, p_payout, v_won, p_result, v_round.server_seed, v_round.server_seed_hash, v_round.client_seed, v_round.nonce)
    RETURNING id INTO v_final_round_id;
  IF v_won THEN
    INSERT INTO public.transactions (user_id, type, amount, balance_after, description, reference_id)
      VALUES (p_user_id, 'win', p_payout, v_balance_after, v_round.game_type || ' win', v_final_round_id);
  END IF;
  UPDATE public.active_rounds SET status = COALESCE(p_status, 'settled'), settled_at = now(),
    public_state = public_state || jsonb_build_object('final', p_result, 'payout', p_payout)
    WHERE id = p_round_id;
  UPDATE public.house_wallet SET total_payouts = total_payouts + p_payout, total_payouts_today = total_payouts_today + p_payout,
    balance = balance - p_payout, updated_at = now() WHERE id IS NOT NULL;
  RETURN jsonb_build_object('ok', true, 'round_id', v_final_round_id, 'won', v_won, 'payout', p_payout, 'balance', v_balance_after);
END; $function$;