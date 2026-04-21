CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.advance_crash_round() RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  v_round RECORD;
  v_now TIMESTAMPTZ := now();
  v_elapsed_ms NUMERIC;
  v_current_mult NUMERIC;
  v_seed TEXT;
  v_seed_hash TEXT;
  v_crash NUMERIC;
  v_h NUMERIC;
  v_house_edge NUMERIC := 0.01;
BEGIN
  SELECT * INTO v_round
    FROM public.crash_rounds
    ORDER BY round_number DESC
    LIMIT 1
    FOR UPDATE;

  IF v_round IS NULL THEN
    v_seed := encode(extensions.gen_random_bytes(32), 'hex');
    v_seed_hash := encode(extensions.digest(v_seed, 'sha256'), 'hex');
    v_h := (('x' || substr(encode(extensions.digest(v_seed, 'sha256'), 'hex'),1,13))::bit(52)::bigint)::numeric / power(2,52);
    IF v_h < v_house_edge THEN v_crash := 1.00;
    ELSE
      v_crash := round((100.0 / (v_h * 100.0)) * (1 - v_house_edge), 2);
      IF v_crash < 1.01 THEN v_crash := 1.01; END IF;
      IF v_crash > 1000 THEN v_crash := 1000; END IF;
    END IF;
    INSERT INTO public.crash_rounds (server_seed_hash, server_seed, crash_multiplier, status, waiting_starts_at)
      VALUES (v_seed_hash, v_seed, v_crash, 'waiting', v_now)
      RETURNING * INTO v_round;
  END IF;

  IF v_round.status = 'waiting' AND v_now >= v_round.waiting_starts_at + interval '6 seconds' THEN
    UPDATE public.crash_rounds SET status = 'running', running_starts_at = v_now
      WHERE id = v_round.id RETURNING * INTO v_round;
  END IF;

  IF v_round.status = 'running' THEN
    v_elapsed_ms := EXTRACT(EPOCH FROM (v_now - v_round.running_starts_at)) * 1000.0;
    v_current_mult := 1 + 0.06 * power(v_elapsed_ms / 1000.0, 1.6);
    IF v_current_mult >= v_round.crash_multiplier THEN
      UPDATE public.crash_rounds SET status = 'crashed', crashed_at = v_now
        WHERE id = v_round.id RETURNING * INTO v_round;
    END IF;
  END IF;

  IF v_round.status = 'crashed' AND v_now >= v_round.crashed_at + interval '3 seconds' THEN
    UPDATE public.crash_bets SET status = 'lost', payout = 0
      WHERE round_id = v_round.id AND status = 'placed';
    INSERT INTO public.game_rounds (user_id, game_type, bet_amount, multiplier, payout, won, result, server_seed, server_seed_hash)
      SELECT b.user_id, b.game_type, b.bet_amount,
             COALESCE(b.cashout_multiplier, v_round.crash_multiplier),
             b.payout, b.payout > 0,
             jsonb_build_object('round_id', v_round.id, 'crash_multiplier', v_round.crash_multiplier),
             v_round.server_seed, v_round.server_seed_hash
        FROM public.crash_bets b WHERE b.round_id = v_round.id;
    UPDATE public.house_wallet SET
      total_bets = total_bets + COALESCE((SELECT sum(bet_amount) FROM public.crash_bets WHERE round_id = v_round.id), 0),
      total_bets_today = total_bets_today + COALESCE((SELECT sum(bet_amount) FROM public.crash_bets WHERE round_id = v_round.id), 0),
      balance = balance + COALESCE((SELECT sum(bet_amount) FROM public.crash_bets WHERE round_id = v_round.id), 0),
      updated_at = now()
    WHERE id IS NOT NULL;
    UPDATE public.crash_rounds SET status = 'settled', settled_at = v_now WHERE id = v_round.id;

    v_seed := encode(extensions.gen_random_bytes(32), 'hex');
    v_seed_hash := encode(extensions.digest(v_seed, 'sha256'), 'hex');
    v_h := (('x' || substr(encode(extensions.digest(v_seed, 'sha256'), 'hex'),1,13))::bit(52)::bigint)::numeric / power(2,52);
    IF v_h < v_house_edge THEN v_crash := 1.00;
    ELSE
      v_crash := round((100.0 / (v_h * 100.0)) * (1 - v_house_edge), 2);
      IF v_crash < 1.01 THEN v_crash := 1.01; END IF;
      IF v_crash > 1000 THEN v_crash := 1000; END IF;
    END IF;
    INSERT INTO public.crash_rounds (server_seed_hash, server_seed, crash_multiplier, status, waiting_starts_at)
      VALUES (v_seed_hash, v_seed, v_crash, 'waiting', v_now)
      RETURNING * INTO v_round;
  END IF;

  RETURN jsonb_build_object(
    'id', v_round.id,
    'round_number', v_round.round_number,
    'status', v_round.status,
    'server_seed_hash', v_round.server_seed_hash,
    'server_seed', CASE WHEN v_round.status IN ('crashed','settled') THEN v_round.server_seed ELSE NULL END,
    'crash_multiplier', CASE WHEN v_round.status IN ('crashed','settled') THEN v_round.crash_multiplier ELSE NULL END,
    'waiting_starts_at', v_round.waiting_starts_at,
    'running_starts_at', v_round.running_starts_at,
    'crashed_at', v_round.crashed_at
  );
END; $$;