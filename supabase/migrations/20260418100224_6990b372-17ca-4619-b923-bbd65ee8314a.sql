-- Deposit requests
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

-- Withdrawal requests
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

-- Test credit RPC
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

-- Request withdrawal RPC
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