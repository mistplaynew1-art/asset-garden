-- ============ Schema (combined from 15 source migrations) ============
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  level INTEGER NOT NULL DEFAULT 1,
  xp INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  balance NUMERIC(18,2) DEFAULT 0.00,
  currency TEXT DEFAULT 'USD',
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, currency)
);
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own wallet" ON public.wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own wallet" ON public.wallets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all wallets" ON public.wallets FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.game_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  game_type TEXT NOT NULL,
  bet_amount NUMERIC(18,2) NOT NULL,
  multiplier NUMERIC(10,4),
  payout NUMERIC(18,2) DEFAULT 0,
  won BOOLEAN DEFAULT false,
  result JSONB,
  server_seed TEXT,
  server_seed_hash TEXT,
  client_seed TEXT,
  nonce BIGINT,
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.game_rounds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own rounds" ON public.game_rounds FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own rounds" ON public.game_rounds FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all rounds" ON public.game_rounds FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('deposit','withdraw','withdraw_pending','withdraw_refund','bet','win','loss','bonus','house_credit')),
  amount NUMERIC(18,2) NOT NULL,
  balance_after NUMERIC(18,2),
  description TEXT,
  reference_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own transactions" ON public.transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own transactions" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all transactions" ON public.transactions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.house_wallet (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  balance NUMERIC(18,2) DEFAULT 0,
  total_bets NUMERIC(18,2) DEFAULT 0,
  total_payouts NUMERIC(18,2) DEFAULT 0,
  total_bets_today NUMERIC(18,2) DEFAULT 0,
  total_payouts_today NUMERIC(18,2) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.house_wallet ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view house wallet" ON public.house_wallet FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update house wallet" ON public.house_wallet FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
INSERT INTO public.house_wallet (balance) VALUES (0);

CREATE TABLE public.admin_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  description TEXT,
  is_secret BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage settings" ON public.admin_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'original',
  provider TEXT DEFAULT 'NexBet',
  rtp NUMERIC(5,2) DEFAULT 99.00,
  house_edge NUMERIC(5,4) DEFAULT 0.0100,
  thumbnail_url TEXT,
  is_active BOOLEAN DEFAULT true,
  is_hot BOOLEAN DEFAULT false,
  is_new BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  min_bet NUMERIC(18,2) DEFAULT 0.10,
  max_bet NUMERIC(18,2) DEFAULT 10000.00,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active games" ON public.games FOR SELECT USING (is_active = true);
CREATE POLICY "Admins manage games" ON public.games FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.platform_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stat_key TEXT NOT NULL UNIQUE,
  stat_value NUMERIC(18,2) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.platform_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view stats" ON public.platform_stats FOR SELECT USING (true);
CREATE POLICY "Admins manage stats" ON public.platform_stats FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.platform_stats (stat_key, stat_value) VALUES
  ('total_users', 0), ('online_now', 0), ('total_bets_today', 0),
  ('total_won_today', 0), ('total_jackpot', 0);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON public.wallets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_house_wallet_updated_at BEFORE UPDATE ON public.house_wallet FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_admin_settings_updated_at BEFORE UPDATE ON public.admin_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, username)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
          COALESCE(NEW.raw_user_meta_data->>'username', 'player_' || substr(NEW.id::TEXT, 1, 8)));
  INSERT INTO public.wallets (user_id, currency, balance) VALUES (NEW.id, 'USD', 0);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  UPDATE public.platform_stats SET stat_value = stat_value + 1 WHERE stat_key = 'total_users';
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.place_bet(
  p_game_type TEXT, p_bet_amount NUMERIC, p_multiplier NUMERIC DEFAULT 0,
  p_payout NUMERIC DEFAULT 0, p_result JSONB DEFAULT '{}'::jsonb,
  p_server_seed TEXT DEFAULT NULL, p_client_seed TEXT DEFAULT NULL, p_nonce BIGINT DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
  RETURN jsonb_build_object('round_id', v_round_id, 'won', v_won, 'payout', p_payout, 'balance', v_balance_after);
END; $$;

INSERT INTO public.games (slug, name, category, provider, rtp, house_edge, is_active, is_featured, is_hot, sort_order, min_bet, max_bet) VALUES
  ('limbo','Limbo','original','NexBet',99.00,0.0100,true,true,true,1,0.10,10000),
  ('crash','Crash','original','NexBet',99.00,0.0100,true,true,true,2,0.10,10000),
  ('jetpack','Jetpack','original','NexBet',99.00,0.0100,true,false,true,3,0.10,10000),
  ('mines','Mines','original','NexBet',99.00,0.0100,true,true,true,5,0.10,10000),
  ('plinko','Plinko','original','NexBet',99.00,0.0100,true,true,true,6,0.10,10000),
  ('tower','Tower','original','NexBet',99.00,0.0100,true,false,false,7,0.10,10000),
  ('dice','Dice','original','NexBet',99.00,0.0100,true,false,true,8,0.10,10000),
  ('keno','Keno','original','NexBet',95.00,0.0500,true,false,false,9,0.10,10000),
  ('hilo','Hi-Lo','original','NexBet',99.00,0.0100,true,false,false,10,0.10,10000),
  ('coinflip','Coin Flip','original','NexBet',98.00,0.0200,true,false,false,11,0.10,10000),
  ('wheel','Wheel','original','NexBet',96.00,0.0400,true,false,false,12,0.10,10000),
  ('roulette','Roulette','table','NexBet',97.30,0.0270,true,true,false,13,0.10,10000),
  ('blackjack','Blackjack','table','NexBet',99.50,0.0050,true,true,false,14,0.10,10000),
  ('dragon-tiger','Dragon Tiger','table','NexBet',96.27,0.0373,true,false,false,15,0.10,10000),
  ('olympus','Gates of Olympus','slots','Pragmatic Play',96.50,0.0350,true,true,true,16,0.20,10000),
  ('bonanza','Sweet Bonanza','slots','Pragmatic Play',96.48,0.0352,true,true,true,17,0.20,10000),
  ('bigbass','Big Bass Bonanza','slots','Pragmatic Play',96.71,0.0329,true,false,true,18,0.20,10000),
  ('classic-slots','Classic Slots','slots','NexBet',96.00,0.0400,true,false,false,19,0.10,10000)
ON CONFLICT (slug) DO NOTHING;

-- ============ Deposits / Withdrawals ============
CREATE TABLE public.deposit_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('crypto','card','bank')),
  currency TEXT NOT NULL DEFAULT 'USD',
  amount NUMERIC(18,2) NOT NULL CHECK (amount > 0),
  crypto_currency TEXT,
  crypto_address TEXT,
  tx_hash TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.deposit_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own deposits" ON public.deposit_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own deposits" ON public.deposit_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all deposits" ON public.deposit_requests FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update deposits" ON public.deposit_requests FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_deposit_requests_updated_at BEFORE UPDATE ON public.deposit_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('crypto','card','bank')),
  currency TEXT NOT NULL DEFAULT 'USD',
  amount NUMERIC(18,2) NOT NULL CHECK (amount > 0),
  crypto_currency TEXT,
  destination TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','paid','rejected')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  tx_hash TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own withdrawals" ON public.withdrawal_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own withdrawals" ON public.withdrawal_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all withdrawals" ON public.withdrawal_requests FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update withdrawals" ON public.withdrawal_requests FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_withdrawal_requests_updated_at BEFORE UPDATE ON public.withdrawal_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.add_test_credit(p_amount NUMERIC)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id UUID; v_balance NUMERIC;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RETURN jsonb_build_object('error','NOT_AUTHENTICATED'); END IF;
  IF p_amount IS NULL OR p_amount <= 0 OR p_amount > 10000 THEN
    RETURN jsonb_build_object('error','INVALID_AMOUNT');
  END IF;
  INSERT INTO public.wallets (user_id, currency, balance) VALUES (v_user_id, 'USD', 0)
    ON CONFLICT (user_id, currency) DO NOTHING;
  UPDATE public.wallets SET balance = balance + p_amount
    WHERE user_id = v_user_id AND currency = 'USD'
    RETURNING balance INTO v_balance;
  INSERT INTO public.transactions (user_id, type, amount, balance_after, description)
    VALUES (v_user_id, 'bonus', p_amount, v_balance, 'Test credit');
  RETURN jsonb_build_object('ok', true, 'balance', v_balance);
END; $$;

CREATE OR REPLACE FUNCTION public.request_withdrawal(
  p_method TEXT, p_amount NUMERIC, p_destination TEXT, p_crypto_currency TEXT DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id UUID; v_balance NUMERIC; v_balance_after NUMERIC; v_req_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RETURN jsonb_build_object('error','NOT_AUTHENTICATED'); END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN RETURN jsonb_build_object('error','INVALID_AMOUNT'); END IF;
  IF p_method NOT IN ('crypto','card','bank') THEN RETURN jsonb_build_object('error','INVALID_METHOD'); END IF;
  IF p_destination IS NULL OR length(trim(p_destination)) = 0 THEN RETURN jsonb_build_object('error','INVALID_DESTINATION'); END IF;

  SELECT balance INTO v_balance FROM public.wallets
    WHERE user_id = v_user_id AND currency = 'USD' FOR UPDATE;
  IF v_balance IS NULL THEN RETURN jsonb_build_object('error','NO_WALLET'); END IF;
  IF v_balance < p_amount THEN RETURN jsonb_build_object('error','INSUFFICIENT_BALANCE'); END IF;

  v_balance_after := v_balance - p_amount;
  UPDATE public.wallets SET balance = v_balance_after WHERE user_id = v_user_id AND currency = 'USD';

  INSERT INTO public.withdrawal_requests (user_id, method, amount, destination, crypto_currency)
    VALUES (v_user_id, p_method, p_amount, p_destination, p_crypto_currency)
    RETURNING id INTO v_req_id;

  INSERT INTO public.transactions (user_id, type, amount, balance_after, description, reference_id)
    VALUES (v_user_id, 'withdraw_pending', -p_amount, v_balance_after, p_method || ' withdrawal pending', v_req_id);

  RETURN jsonb_build_object('ok', true, 'request_id', v_req_id, 'balance', v_balance_after);
END; $$;

CREATE OR REPLACE FUNCTION public.approve_deposit(p_request_id UUID, p_note TEXT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_admin UUID; v_req RECORD; v_balance NUMERIC;
BEGIN
  v_admin := auth.uid();
  IF v_admin IS NULL OR NOT public.has_role(v_admin, 'admin') THEN
    RETURN jsonb_build_object('error','NOT_ADMIN');
  END IF;
  SELECT * INTO v_req FROM public.deposit_requests WHERE id = p_request_id FOR UPDATE;
  IF v_req IS NULL THEN RETURN jsonb_build_object('error','NOT_FOUND'); END IF;
  IF v_req.status <> 'pending' THEN RETURN jsonb_build_object('error','ALREADY_PROCESSED'); END IF;

  INSERT INTO public.wallets (user_id, currency, balance) VALUES (v_req.user_id, 'USD', 0)
    ON CONFLICT (user_id, currency) DO NOTHING;
  UPDATE public.wallets SET balance = balance + v_req.amount
    WHERE user_id = v_req.user_id AND currency = 'USD'
    RETURNING balance INTO v_balance;

  UPDATE public.deposit_requests SET status = 'approved', reviewed_by = v_admin, reviewed_at = now(), notes = COALESCE(p_note, notes)
    WHERE id = p_request_id;

  INSERT INTO public.transactions (user_id, type, amount, balance_after, description, reference_id)
    VALUES (v_req.user_id, 'deposit', v_req.amount, v_balance, v_req.method || ' deposit approved', p_request_id);

  RETURN jsonb_build_object('ok', true, 'balance', v_balance);
END; $$;

CREATE OR REPLACE FUNCTION public.reject_deposit(p_request_id UUID, p_note TEXT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_admin UUID;
BEGIN
  v_admin := auth.uid();
  IF v_admin IS NULL OR NOT public.has_role(v_admin, 'admin') THEN
    RETURN jsonb_build_object('error','NOT_ADMIN');
  END IF;
  UPDATE public.deposit_requests
    SET status = 'rejected', reviewed_by = v_admin, reviewed_at = now(), notes = COALESCE(p_note, notes)
    WHERE id = p_request_id AND status = 'pending';
  IF NOT FOUND THEN RETURN jsonb_build_object('error','NOT_FOUND_OR_PROCESSED'); END IF;
  RETURN jsonb_build_object('ok', true);
END; $$;

CREATE OR REPLACE FUNCTION public.approve_withdrawal(p_request_id UUID, p_note TEXT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_admin UUID;
BEGIN
  v_admin := auth.uid();
  IF v_admin IS NULL OR NOT public.has_role(v_admin, 'admin') THEN
    RETURN jsonb_build_object('error','NOT_ADMIN');
  END IF;
  UPDATE public.withdrawal_requests
    SET status = 'approved', reviewed_by = v_admin, reviewed_at = now(), notes = COALESCE(p_note, notes)
    WHERE id = p_request_id AND status = 'pending';
  IF NOT FOUND THEN RETURN jsonb_build_object('error','NOT_FOUND_OR_PROCESSED'); END IF;
  RETURN jsonb_build_object('ok', true);
END; $$;

CREATE OR REPLACE FUNCTION public.reject_withdrawal(p_request_id UUID, p_note TEXT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_admin UUID; v_req RECORD; v_balance NUMERIC;
BEGIN
  v_admin := auth.uid();
  IF v_admin IS NULL OR NOT public.has_role(v_admin, 'admin') THEN
    RETURN jsonb_build_object('error','NOT_ADMIN');
  END IF;
  SELECT * INTO v_req FROM public.withdrawal_requests WHERE id = p_request_id FOR UPDATE;
  IF v_req IS NULL THEN RETURN jsonb_build_object('error','NOT_FOUND'); END IF;
  IF v_req.status <> 'pending' THEN RETURN jsonb_build_object('error','ALREADY_PROCESSED'); END IF;

  -- Refund wallet
  UPDATE public.wallets SET balance = balance + v_req.amount
    WHERE user_id = v_req.user_id AND currency = 'USD'
    RETURNING balance INTO v_balance;

  UPDATE public.withdrawal_requests SET status = 'rejected', reviewed_by = v_admin, reviewed_at = now(), notes = COALESCE(p_note, notes)
    WHERE id = p_request_id;

  INSERT INTO public.transactions (user_id, type, amount, balance_after, description, reference_id)
    VALUES (v_req.user_id, 'withdraw_refund', v_req.amount, v_balance, 'Withdrawal rejected, refund', p_request_id);

  RETURN jsonb_build_object('ok', true, 'balance', v_balance);
END; $$;

CREATE OR REPLACE FUNCTION public.mark_withdrawal_paid(p_request_id UUID, p_tx_hash TEXT DEFAULT NULL, p_note TEXT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_admin UUID;
BEGIN
  v_admin := auth.uid();
  IF v_admin IS NULL OR NOT public.has_role(v_admin, 'admin') THEN
    RETURN jsonb_build_object('error','NOT_ADMIN');
  END IF;
  UPDATE public.withdrawal_requests
    SET status = 'paid', tx_hash = COALESCE(p_tx_hash, tx_hash), reviewed_by = v_admin, reviewed_at = now(), notes = COALESCE(p_note, notes)
    WHERE id = p_request_id AND status IN ('pending','approved');
  IF NOT FOUND THEN RETURN jsonb_build_object('error','NOT_FOUND_OR_PROCESSED'); END IF;
  RETURN jsonb_build_object('ok', true);
END; $$;

-- ============ Realtime + jackpot stats ============
INSERT INTO public.platform_stats (stat_key, stat_value) VALUES
  ('jackpot_mini', 1000), ('jackpot_major', 10000), ('jackpot_grand', 100000)
ON CONFLICT (stat_key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.place_bet(
  p_game_type TEXT, p_bet_amount NUMERIC, p_multiplier NUMERIC DEFAULT 0,
  p_payout NUMERIC DEFAULT 0, p_result JSONB DEFAULT '{}'::jsonb,
  p_server_seed TEXT DEFAULT NULL, p_client_seed TEXT DEFAULT NULL, p_nonce BIGINT DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
    updated_at = now();
  UPDATE public.platform_stats SET stat_value = stat_value + (p_bet_amount * 0.005), updated_at = now() WHERE stat_key = 'jackpot_mini';
  UPDATE public.platform_stats SET stat_value = stat_value + (p_bet_amount * 0.003), updated_at = now() WHERE stat_key = 'jackpot_major';
  UPDATE public.platform_stats SET stat_value = stat_value + (p_bet_amount * 0.002), updated_at = now() WHERE stat_key = 'jackpot_grand';
  RETURN jsonb_build_object('round_id', v_round_id, 'won', v_won, 'payout', p_payout, 'balance', v_balance_after);
END; $$;

ALTER TABLE public.platform_stats REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'platform_stats') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.platform_stats;
  END IF;
END $$;

-- ============ Active rounds (multi-step games) ============
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
CREATE POLICY "Users view own active rounds" ON public.active_rounds FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins view all active rounds" ON public.active_rounds FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
DROP TRIGGER IF EXISTS update_active_rounds_updated_at ON public.active_rounds;
CREATE TRIGGER update_active_rounds_updated_at BEFORE UPDATE ON public.active_rounds FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.start_active_round(
  p_user_id UUID, p_game_type TEXT, p_bet_amount NUMERIC, p_state JSONB, p_public_state JSONB,
  p_server_seed TEXT, p_server_seed_hash TEXT, p_client_seed TEXT, p_nonce BIGINT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_balance NUMERIC; v_balance_after NUMERIC; v_round_id UUID;
BEGIN
  IF p_user_id IS NULL THEN RETURN jsonb_build_object('error','NOT_AUTHENTICATED'); END IF;
  IF p_bet_amount <= 0 THEN RETURN jsonb_build_object('error','INVALID_BET_AMOUNT'); END IF;
  SELECT balance INTO v_balance FROM public.wallets WHERE user_id = p_user_id AND currency = 'USD' FOR UPDATE;
  IF v_balance IS NULL THEN RETURN jsonb_build_object('error','NO_WALLET'); END IF;
  IF v_balance < p_bet_amount THEN RETURN jsonb_build_object('error','INSUFFICIENT_BALANCE'); END IF;
  v_balance_after := v_balance - p_bet_amount;
  UPDATE public.wallets SET balance = v_balance_after WHERE user_id = p_user_id AND currency = 'USD';
  INSERT INTO public.active_rounds (user_id, game_type, bet_amount, state, public_state, server_seed, server_seed_hash, client_seed, nonce)
  VALUES (p_user_id, p_game_type, p_bet_amount, p_state, p_public_state, p_server_seed, p_server_seed_hash, p_client_seed, p_nonce)
  RETURNING id INTO v_round_id;
  INSERT INTO public.transactions (user_id, type, amount, balance_after, description, reference_id)
    VALUES (p_user_id, 'bet', -p_bet_amount, v_balance_after, p_game_type || ' bet', v_round_id);
  RETURN jsonb_build_object('ok', true, 'round_id', v_round_id, 'balance', v_balance_after);
END; $$;

CREATE OR REPLACE FUNCTION public.settle_active_round(
  p_round_id UUID, p_user_id UUID, p_multiplier NUMERIC, p_payout NUMERIC, p_status TEXT, p_result JSONB
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
  UPDATE public.house_wallet SET total_payouts = total_payouts + p_payout,
    total_payouts_today = total_payouts_today + p_payout, balance = balance - p_payout, updated_at = now();
  RETURN jsonb_build_object('ok', true, 'round_id', v_final_round_id, 'won', v_won, 'payout', p_payout, 'balance', v_balance_after);
END; $$;

-- Aviator removed from catalog (replaced by global crash rounds)
DELETE FROM public.games WHERE slug = 'aviator';

-- ============ Crash / Jetpack shared global rounds ============
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
CREATE INDEX idx_crash_rounds_status ON public.crash_rounds(status, created_at DESC);
ALTER TABLE public.crash_rounds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view non-active crash rounds" ON public.crash_rounds FOR SELECT
  USING (status IN ('waiting','running','crashed','settled'));
CREATE TRIGGER update_crash_rounds_updated_at BEFORE UPDATE ON public.crash_rounds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.crash_rounds REPLICA IDENTITY FULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'crash_rounds') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.crash_rounds;
  END IF;
END $$;

CREATE TABLE public.crash_bets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID REFERENCES public.crash_rounds(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  game_type TEXT NOT NULL DEFAULT 'crash',
  bet_amount NUMERIC(18,2) NOT NULL,
  auto_cashout NUMERIC(12,4),
  cashed_out_at_multiplier NUMERIC(12,4),
  payout NUMERIC(18,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'placed' CHECK (status IN ('placed','cashed_out','lost','refunded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(round_id, user_id, game_type)
);
CREATE INDEX idx_crash_bets_round ON public.crash_bets(round_id);
CREATE INDEX idx_crash_bets_user ON public.crash_bets(user_id, created_at DESC);
ALTER TABLE public.crash_bets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone view crash bets" ON public.crash_bets FOR SELECT USING (true);
CREATE TRIGGER update_crash_bets_updated_at BEFORE UPDATE ON public.crash_bets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.crash_bets REPLICA IDENTITY FULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'crash_bets') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.crash_bets;
  END IF;
END $$;

-- ============ Notifications ============
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  data JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users insert own notifications" ON public.notifications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all notifications" ON public.notifications FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'notifications') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;

-- ============ Promotions / Tournaments / Referrals / Support ============
CREATE TABLE public.promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  bonus_amount NUMERIC(18,2) DEFAULT 0,
  bonus_type TEXT DEFAULT 'fixed',
  is_active BOOLEAN DEFAULT true,
  starts_at TIMESTAMPTZ DEFAULT now(),
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active promotions" ON public.promotions FOR SELECT USING (is_active = true);
CREATE POLICY "Admins manage promotions" ON public.promotions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.user_promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  promotion_id UUID REFERENCES public.promotions(id) ON DELETE CASCADE NOT NULL,
  claimed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, promotion_id)
);
ALTER TABLE public.user_promotions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own promotion claims" ON public.user_promotions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own promotion claims" ON public.user_promotions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subject TEXT NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open','pending','resolved','closed')),
  priority TEXT DEFAULT 'normal',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own tickets" ON public.support_tickets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own tickets" ON public.support_tickets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all tickets" ON public.support_tickets FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update all tickets" ON public.support_tickets FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view messages on own tickets" ON public.ticket_messages FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND t.user_id = auth.uid()));
CREATE POLICY "Users insert messages on own tickets" ON public.ticket_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND t.user_id = auth.uid()));
CREATE POLICY "Admins view all ticket messages" ON public.ticket_messages FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert ticket messages" ON public.ticket_messages FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  referred_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  total_clicks INTEGER DEFAULT 0,
  total_signups INTEGER DEFAULT 0,
  total_commission NUMERIC(18,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own referrals" ON public.referrals FOR SELECT USING (auth.uid() = referrer_id);
CREATE POLICY "Users insert own referrals" ON public.referrals FOR INSERT WITH CHECK (auth.uid() = referrer_id);
CREATE POLICY "Admins view all referrals" ON public.referrals FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============ Payment intents (Stripe / NowPayments) ============
CREATE TABLE public.payment_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('stripe','nowpayments')),
  external_id TEXT,
  amount NUMERIC(18,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','succeeded','failed','expired','refunded')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_payment_intents_user ON public.payment_intents(user_id, created_at DESC);
CREATE INDEX idx_payment_intents_external ON public.payment_intents(provider, external_id);
ALTER TABLE public.payment_intents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own payment intents" ON public.payment_intents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own payment intents" ON public.payment_intents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all payment intents" ON public.payment_intents FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_payment_intents_updated_at BEFORE UPDATE ON public.payment_intents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();