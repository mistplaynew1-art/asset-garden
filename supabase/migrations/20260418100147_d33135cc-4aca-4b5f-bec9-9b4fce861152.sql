-- ============ Schema (combined from 7 source migrations) ============
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

-- Seed game catalog
INSERT INTO public.games (slug, name, category, provider, rtp, house_edge, is_active, is_featured, is_hot, sort_order, min_bet, max_bet) VALUES
  ('limbo','Limbo','original','NexBet',99.00,0.0100,true,true,true,1,0.10,10000),
  ('crash','Crash','original','NexBet',99.00,0.0100,true,true,true,2,0.10,10000),
  ('jetpack','Jetpack','original','NexBet',99.00,0.0100,true,false,true,3,0.10,10000),
  ('aviator','Aviator','original','NexBet',99.00,0.0100,true,true,true,4,0.10,10000),
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