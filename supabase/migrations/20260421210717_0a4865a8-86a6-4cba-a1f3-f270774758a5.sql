INSERT INTO public.platform_stats (stat_key, stat_value)
VALUES ('jackpot_mini', 1247.83), ('jackpot_major', 18920.41), ('jackpot_grand', 348127.92)
ON CONFLICT DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'platform_stats_stat_key_key') THEN
    ALTER TABLE public.platform_stats ADD CONSTRAINT platform_stats_stat_key_key UNIQUE (stat_key);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.place_bet(
  p_game_type text, p_bet_amount numeric, p_multiplier numeric DEFAULT 0,
  p_payout numeric DEFAULT 0, p_result jsonb DEFAULT '{}'::jsonb,
  p_server_seed text DEFAULT NULL, p_client_seed text DEFAULT NULL, p_nonce bigint DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
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
    balance = balance + p_bet_amount - p_payout;
  UPDATE public.platform_stats SET stat_value = stat_value + (p_bet_amount * 0.005), updated_at = now()
    WHERE stat_key = 'jackpot_mini';
  UPDATE public.platform_stats SET stat_value = stat_value + (p_bet_amount * 0.003), updated_at = now()
    WHERE stat_key = 'jackpot_major';
  UPDATE public.platform_stats SET stat_value = stat_value + (p_bet_amount * 0.002), updated_at = now()
    WHERE stat_key = 'jackpot_grand';
  RETURN jsonb_build_object('round_id', v_round_id, 'won', v_won, 'payout', p_payout, 'balance', v_balance_after);
END; $function$;

ALTER TABLE public.platform_stats REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'platform_stats') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.platform_stats;
  END IF;
END $$;

UPDATE public.games SET slug = 'gates-olympus' WHERE slug = 'olympus';
UPDATE public.games SET slug = 'sweet-bonanza' WHERE slug = 'bonanza';
UPDATE public.games SET slug = 'big-bass'      WHERE slug = 'bigbass';
UPDATE public.games SET slug = 'classic'       WHERE slug = 'classic-slots';