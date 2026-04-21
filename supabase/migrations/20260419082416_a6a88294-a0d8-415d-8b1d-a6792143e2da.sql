-- ============================================================
-- Active rounds (multi-step server-authoritative game state)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.active_rounds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  game_type TEXT NOT NULL,
  bet_amount NUMERIC NOT NULL,
  state JSONB NOT NULL DEFAULT '{}'::jsonb,
  public_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  server_seed TEXT,
  server_seed_hash TEXT,
  client_seed TEXT,
  nonce BIGINT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  settled_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_active_rounds_user ON public.active_rounds(user_id, status);
CREATE INDEX IF NOT EXISTS idx_active_rounds_created ON public.active_rounds(created_at DESC);

ALTER TABLE public.active_rounds ENABLE ROW LEVEL SECURITY;

-- Players can only see their own active rounds, and only their public_state field
-- (state holds secret data like mine positions). The edge function uses the
-- service-role key so RLS doesn't apply for it.
CREATE POLICY "Users view own active rounds"
  ON public.active_rounds
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all active rounds"
  ON public.active_rounds
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- updated_at trigger
DROP TRIGGER IF EXISTS update_active_rounds_updated_at ON public.active_rounds;
CREATE TRIGGER update_active_rounds_updated_at
  BEFORE UPDATE ON public.active_rounds
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- start_active_round: debit bet, create active round, return id
-- ============================================================
CREATE OR REPLACE FUNCTION public.start_active_round(
  p_user_id UUID,
  p_game_type TEXT,
  p_bet_amount NUMERIC,
  p_state JSONB,
  p_public_state JSONB,
  p_server_seed TEXT,
  p_server_seed_hash TEXT,
  p_client_seed TEXT,
  p_nonce BIGINT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance NUMERIC;
  v_balance_after NUMERIC;
  v_round_id UUID;
BEGIN
  IF p_user_id IS NULL THEN RETURN jsonb_build_object('error','NOT_AUTHENTICATED'); END IF;
  IF p_bet_amount <= 0 THEN RETURN jsonb_build_object('error','INVALID_BET_AMOUNT'); END IF;

  SELECT balance INTO v_balance
    FROM public.wallets
    WHERE user_id = p_user_id AND currency = 'USD'
    FOR UPDATE;

  IF v_balance IS NULL THEN RETURN jsonb_build_object('error','NO_WALLET'); END IF;
  IF v_balance < p_bet_amount THEN RETURN jsonb_build_object('error','INSUFFICIENT_BALANCE'); END IF;

  v_balance_after := v_balance - p_bet_amount;
  UPDATE public.wallets
    SET balance = v_balance_after
    WHERE user_id = p_user_id AND currency = 'USD';

  INSERT INTO public.active_rounds (
    user_id, game_type, bet_amount, state, public_state,
    server_seed, server_seed_hash, client_seed, nonce
  ) VALUES (
    p_user_id, p_game_type, p_bet_amount, p_state, p_public_state,
    p_server_seed, p_server_seed_hash, p_client_seed, p_nonce
  ) RETURNING id INTO v_round_id;

  INSERT INTO public.transactions (user_id, type, amount, balance_after, description, reference_id)
    VALUES (p_user_id, 'bet', -p_bet_amount, v_balance_after, p_game_type || ' bet', v_round_id);

  RETURN jsonb_build_object(
    'ok', true,
    'round_id', v_round_id,
    'balance', v_balance_after
  );
END;
$$;

-- ============================================================
-- settle_active_round: credit payout, mark round settled, log game_rounds
-- ============================================================
CREATE OR REPLACE FUNCTION public.settle_active_round(
  p_round_id UUID,
  p_user_id UUID,
  p_multiplier NUMERIC,
  p_payout NUMERIC,
  p_status TEXT,
  p_result JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_round RECORD;
  v_balance NUMERIC;
  v_balance_after NUMERIC;
  v_won BOOLEAN;
  v_final_round_id UUID;
BEGIN
  IF p_user_id IS NULL THEN RETURN jsonb_build_object('error','NOT_AUTHENTICATED'); END IF;

  SELECT * INTO v_round
    FROM public.active_rounds
    WHERE id = p_round_id AND user_id = p_user_id
    FOR UPDATE;

  IF v_round IS NULL THEN RETURN jsonb_build_object('error','ROUND_NOT_FOUND'); END IF;
  IF v_round.status <> 'active' THEN RETURN jsonb_build_object('error','ROUND_ALREADY_SETTLED'); END IF;

  v_won := p_payout > 0;

  -- Credit any payout (bet was already debited by start_active_round)
  IF p_payout > 0 THEN
    SELECT balance INTO v_balance
      FROM public.wallets
      WHERE user_id = p_user_id AND currency = 'USD'
      FOR UPDATE;
    v_balance_after := v_balance + p_payout;
    UPDATE public.wallets SET balance = v_balance_after
      WHERE user_id = p_user_id AND currency = 'USD';
  ELSE
    SELECT balance INTO v_balance_after FROM public.wallets
      WHERE user_id = p_user_id AND currency = 'USD';
  END IF;

  -- Persist completed round to history
  INSERT INTO public.game_rounds (
    user_id, game_type, bet_amount, multiplier, payout, won, result,
    server_seed, server_seed_hash, client_seed, nonce
  ) VALUES (
    p_user_id, v_round.game_type, v_round.bet_amount, p_multiplier, p_payout, v_won, p_result,
    v_round.server_seed, v_round.server_seed_hash, v_round.client_seed, v_round.nonce
  ) RETURNING id INTO v_final_round_id;

  IF v_won THEN
    INSERT INTO public.transactions (user_id, type, amount, balance_after, description, reference_id)
      VALUES (p_user_id, 'win', p_payout, v_balance_after, v_round.game_type || ' win', v_final_round_id);
  END IF;

  -- Mark active round settled
  UPDATE public.active_rounds
    SET status = COALESCE(p_status, 'settled'),
        settled_at = now(),
        public_state = public_state || jsonb_build_object('final', p_result, 'payout', p_payout)
    WHERE id = p_round_id;

  -- House wallet bookkeeping (mirrors place_bet)
  UPDATE public.house_wallet SET
    total_payouts = total_payouts + p_payout,
    total_payouts_today = total_payouts_today + p_payout,
    balance = balance - p_payout,
    updated_at = now()
  WHERE id IS NOT NULL;

  RETURN jsonb_build_object(
    'ok', true,
    'round_id', v_final_round_id,
    'won', v_won,
    'payout', p_payout,
    'balance', v_balance_after
  );
END;
$$;