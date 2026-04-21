DELETE FROM public.games WHERE slug = 'aviator';

CREATE TABLE public.crash_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_number BIGSERIAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting','running','crashed','settled')),
  server_seed_hash TEXT NOT NULL,
  server_seed TEXT,
  crash_multiplier NUMERIC(12,4) NOT NULL,
  waiting_starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  running_starts_at TIMESTAMPTZ,
  crashed_at TIMESTAMPTZ,
  settled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_crash_rounds_status ON public.crash_rounds(status);
CREATE INDEX idx_crash_rounds_created_at ON public.crash_rounds(created_at DESC);
ALTER TABLE public.crash_rounds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view crash rounds" ON public.crash_rounds FOR SELECT USING (true);
CREATE POLICY "Admins manage crash rounds" ON public.crash_rounds FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.crash_bets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES public.crash_rounds(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  game_type TEXT NOT NULL CHECK (game_type IN ('crash','jetpack')),
  bet_amount NUMERIC(14,2) NOT NULL CHECK (bet_amount > 0),
  auto_cashout NUMERIC(8,2),
  cashout_multiplier NUMERIC(12,4),
  payout NUMERIC(14,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'placed' CHECK (status IN ('placed','cashed','lost')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (round_id, user_id, game_type)
);
CREATE INDEX idx_crash_bets_round ON public.crash_bets(round_id);
CREATE INDEX idx_crash_bets_user ON public.crash_bets(user_id);
ALTER TABLE public.crash_bets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view all bets" ON public.crash_bets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage crash bets" ON public.crash_bets FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.crash_rounds REPLICA IDENTITY FULL;
ALTER TABLE public.crash_bets REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.crash_rounds;
ALTER PUBLICATION supabase_realtime ADD TABLE public.crash_bets;

CREATE TRIGGER trg_crash_rounds_updated_at BEFORE UPDATE ON public.crash_rounds FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_crash_bets_updated_at BEFORE UPDATE ON public.crash_bets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.place_crash_bet(
  p_round_id UUID, p_game_type TEXT, p_bet_amount NUMERIC, p_auto_cashout NUMERIC DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user UUID := auth.uid(); v_round RECORD; v_balance NUMERIC; v_balance_after NUMERIC; v_bet_id UUID;
BEGIN
  IF v_user IS NULL THEN RETURN jsonb_build_object('error','NOT_AUTHENTICATED'); END IF;
  IF p_bet_amount <= 0 THEN RETURN jsonb_build_object('error','INVALID_AMOUNT'); END IF;
  IF p_game_type NOT IN ('crash','jetpack') THEN RETURN jsonb_build_object('error','INVALID_GAME_TYPE'); END IF;
  SELECT * INTO v_round FROM public.crash_rounds WHERE id = p_round_id FOR UPDATE;
  IF v_round IS NULL THEN RETURN jsonb_build_object('error','ROUND_NOT_FOUND'); END IF;
  IF v_round.status <> 'waiting' THEN RETURN jsonb_build_object('error','BETTING_CLOSED'); END IF;
  SELECT balance INTO v_balance FROM public.wallets WHERE user_id = v_user AND currency = 'USD' FOR UPDATE;
  IF v_balance IS NULL THEN RETURN jsonb_build_object('error','NO_WALLET'); END IF;
  IF v_balance < p_bet_amount THEN RETURN jsonb_build_object('error','INSUFFICIENT_BALANCE'); END IF;
  v_balance_after := v_balance - p_bet_amount;
  UPDATE public.wallets SET balance = v_balance_after WHERE user_id = v_user AND currency = 'USD';
  INSERT INTO public.crash_bets (round_id, user_id, game_type, bet_amount, auto_cashout)
    VALUES (p_round_id, v_user, p_game_type, p_bet_amount, p_auto_cashout)
    ON CONFLICT (round_id, user_id, game_type) DO UPDATE
      SET bet_amount = EXCLUDED.bet_amount, auto_cashout = EXCLUDED.auto_cashout
    RETURNING id INTO v_bet_id;
  INSERT INTO public.transactions (user_id, type, amount, balance_after, description, reference_id)
    VALUES (v_user, 'bet', -p_bet_amount, v_balance_after, p_game_type || ' bet', v_bet_id);
  RETURN jsonb_build_object('ok', true, 'bet_id', v_bet_id, 'balance', v_balance_after);
END; $$;

CREATE OR REPLACE FUNCTION public.cashout_crash_bet(p_bet_id UUID) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
END; $$;

CREATE OR REPLACE FUNCTION public.advance_crash_round() RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_round RECORD; v_now TIMESTAMPTZ := now(); v_elapsed_ms NUMERIC; v_current_mult NUMERIC;
        v_seed TEXT; v_seed_hash TEXT; v_crash NUMERIC; v_h NUMERIC; v_house_edge NUMERIC := 0.01;
BEGIN
  SELECT * INTO v_round FROM public.crash_rounds ORDER BY round_number DESC LIMIT 1 FOR UPDATE;
  IF v_round IS NULL THEN
    v_seed := encode(extensions.gen_random_bytes(32), 'hex');
    v_seed_hash := encode(extensions.digest(v_seed, 'sha256'), 'hex');
    v_h := (('x' || substr(encode(extensions.digest(v_seed, 'sha256'), 'hex'),1,13))::bit(52)::bigint)::numeric / power(2,52);
    IF v_h < v_house_edge THEN v_crash := 1.00;
    ELSE v_crash := round((100.0 / (v_h * 100.0)) * (1 - v_house_edge), 2);
      IF v_crash < 1.01 THEN v_crash := 1.01; END IF;
      IF v_crash > 1000 THEN v_crash := 1000; END IF;
    END IF;
    INSERT INTO public.crash_rounds (server_seed_hash, server_seed, crash_multiplier, status, waiting_starts_at)
      VALUES (v_seed_hash, v_seed, v_crash, 'waiting', v_now) RETURNING * INTO v_round;
  END IF;
  IF v_round.status = 'waiting' AND v_now >= v_round.waiting_starts_at + interval '6 seconds' THEN
    UPDATE public.crash_rounds SET status = 'running', running_starts_at = v_now WHERE id = v_round.id RETURNING * INTO v_round;
  END IF;
  IF v_round.status = 'running' THEN
    v_elapsed_ms := EXTRACT(EPOCH FROM (v_now - v_round.running_starts_at)) * 1000.0;
    v_current_mult := 1 + 0.06 * power(v_elapsed_ms / 1000.0, 1.6);
    IF v_current_mult >= v_round.crash_multiplier THEN
      UPDATE public.crash_rounds SET status = 'crashed', crashed_at = v_now WHERE id = v_round.id RETURNING * INTO v_round;
    END IF;
  END IF;
  IF v_round.status = 'crashed' AND v_now >= v_round.crashed_at + interval '3 seconds' THEN
    UPDATE public.crash_bets SET status = 'lost', payout = 0 WHERE round_id = v_round.id AND status = 'placed';
    INSERT INTO public.game_rounds (user_id, game_type, bet_amount, multiplier, payout, won, result, server_seed, server_seed_hash)
      SELECT b.user_id, b.game_type, b.bet_amount, COALESCE(b.cashout_multiplier, v_round.crash_multiplier),
             b.payout, b.payout > 0,
             jsonb_build_object('round_id', v_round.id, 'crash_multiplier', v_round.crash_multiplier),
             v_round.server_seed, v_round.server_seed_hash
        FROM public.crash_bets b WHERE b.round_id = v_round.id;
    UPDATE public.house_wallet SET
      total_bets = total_bets + COALESCE((SELECT sum(bet_amount) FROM public.crash_bets WHERE round_id = v_round.id), 0),
      total_bets_today = total_bets_today + COALESCE((SELECT sum(bet_amount) FROM public.crash_bets WHERE round_id = v_round.id), 0),
      balance = balance + COALESCE((SELECT sum(bet_amount) FROM public.crash_bets WHERE round_id = v_round.id), 0),
      updated_at = now() WHERE id IS NOT NULL;
    UPDATE public.crash_rounds SET status = 'settled', settled_at = v_now WHERE id = v_round.id;
    v_seed := encode(extensions.gen_random_bytes(32), 'hex');
    v_seed_hash := encode(extensions.digest(v_seed, 'sha256'), 'hex');
    v_h := (('x' || substr(encode(extensions.digest(v_seed, 'sha256'), 'hex'),1,13))::bit(52)::bigint)::numeric / power(2,52);
    IF v_h < v_house_edge THEN v_crash := 1.00;
    ELSE v_crash := round((100.0 / (v_h * 100.0)) * (1 - v_house_edge), 2);
      IF v_crash < 1.01 THEN v_crash := 1.01; END IF;
      IF v_crash > 1000 THEN v_crash := 1000; END IF;
    END IF;
    INSERT INTO public.crash_rounds (server_seed_hash, server_seed, crash_multiplier, status, waiting_starts_at)
      VALUES (v_seed_hash, v_seed, v_crash, 'waiting', v_now) RETURNING * INTO v_round;
  END IF;
  RETURN jsonb_build_object(
    'id', v_round.id, 'round_number', v_round.round_number, 'status', v_round.status,
    'server_seed_hash', v_round.server_seed_hash,
    'server_seed', CASE WHEN v_round.status IN ('crashed','settled') THEN v_round.server_seed ELSE NULL END,
    'crash_multiplier', CASE WHEN v_round.status IN ('crashed','settled') THEN v_round.crash_multiplier ELSE NULL END,
    'waiting_starts_at', v_round.waiting_starts_at, 'running_starts_at', v_round.running_starts_at, 'crashed_at', v_round.crashed_at);
END; $$;

INSERT INTO public.platform_stats (stat_key, stat_value)
VALUES ('jackpot_mini', 0), ('jackpot_major', 0), ('jackpot_grand', 0)
ON CONFLICT (stat_key) DO UPDATE SET stat_value = 0, updated_at = now();

INSERT INTO public.games (slug, name, category, provider, rtp, house_edge, is_active, is_hot, is_new, is_featured, sort_order, min_bet, max_bet) VALUES
  ('sweet-bonanza','Sweet Bonanza','slot','NexBet Originals',96.5,0.035,true,true,false,true,1,0.10,1000),
  ('sugar-rush','Sugar Rush','slot','NexBet Originals',96.5,0.035,true,false,true,false,4,0.10,1000),
  ('starlight','Starlight Princess','slot','NexBet Originals',96.5,0.035,true,false,false,false,5,0.10,1000),
  ('dog-house','Dog House','slot','NexBet Originals',96.5,0.035,true,false,false,false,6,0.10,1000),
  ('fire-portals','Fire Portals','slot','NexBet Originals',96.5,0.035,true,false,false,false,7,0.10,1000),
  ('buffalo-king','Buffalo King','slot','NexBet Originals',96.5,0.035,true,false,false,false,8,0.10,1000),
  ('wild-west-gold','Wild West Gold','slot','NexBet Originals',96.5,0.035,true,false,false,false,9,0.10,1000),
  ('fruit-party','Fruit Party','slot','NexBet Originals',96.5,0.035,true,false,false,false,10,0.10,1000),
  ('gems-bonanza','Gems Bonanza','slot','NexBet Originals',96.5,0.035,true,false,false,false,11,0.10,1000),
  ('zeus-vs-hades','Zeus vs Hades','slot','NexBet Originals',96.1,0.039,true,true,false,true,12,0.10,1000),
  ('classic-slot','Classic Slot','slot','NexBet Originals',96.0,0.04,true,false,false,false,13,0.10,1000),
  ('live-lightning-roulette','Lightning Roulette','live','Evolution',97.3,0.027,true,true,false,true,1,0.20,5000),
  ('live-crazy-time','Crazy Time','live','Evolution',96.08,0.0392,true,true,false,true,2,0.10,2500),
  ('live-monopoly','Monopoly Live','live','Evolution',96.23,0.0377,true,false,false,true,3,0.10,2500),
  ('live-blackjack-vip','Blackjack VIP','live','Evolution',99.28,0.0072,true,false,false,false,4,1.00,5000),
  ('live-baccarat','Speed Baccarat','live','Evolution',98.94,0.0106,true,false,false,false,5,1.00,5000),
  ('live-dream-catcher','Dream Catcher','live','Evolution',96.58,0.0342,true,false,false,false,6,0.10,2500),
  ('live-mega-ball','Mega Ball','live','Evolution',95.40,0.046,true,false,true,false,7,0.10,1000),
  ('live-deal-no-deal','Deal or No Deal','live','Evolution',95.42,0.0458,true,false,false,false,8,0.10,1000)
ON CONFLICT (slug) DO NOTHING;