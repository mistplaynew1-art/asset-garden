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
DECLARE v_admin UUID; v_req RECORD; v_balance NUMERIC;
BEGIN
  v_admin := auth.uid();
  IF v_admin IS NULL OR NOT public.has_role(v_admin, 'admin') THEN
    RETURN jsonb_build_object('error','NOT_ADMIN');
  END IF;
  SELECT * INTO v_req FROM public.withdrawal_requests WHERE id = p_request_id FOR UPDATE;
  IF v_req IS NULL THEN RETURN jsonb_build_object('error','NOT_FOUND'); END IF;
  IF v_req.status NOT IN ('pending','approved') THEN RETURN jsonb_build_object('error','ALREADY_PROCESSED'); END IF;

  SELECT balance INTO v_balance FROM public.wallets WHERE user_id = v_req.user_id AND currency = 'USD';

  UPDATE public.withdrawal_requests SET status = 'paid', reviewed_by = v_admin, reviewed_at = now(), notes = COALESCE(p_note, notes)
    WHERE id = p_request_id;

  INSERT INTO public.transactions (user_id, type, amount, balance_after, description, reference_id)
    VALUES (v_req.user_id, 'withdraw', -v_req.amount, v_balance, v_req.method || ' withdrawal paid', p_request_id);

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
  IF v_req.status NOT IN ('pending','approved') THEN RETURN jsonb_build_object('error','ALREADY_PROCESSED'); END IF;

  UPDATE public.wallets SET balance = balance + v_req.amount
    WHERE user_id = v_req.user_id AND currency = 'USD'
    RETURNING balance INTO v_balance;

  UPDATE public.withdrawal_requests SET status = 'rejected', reviewed_by = v_admin, reviewed_at = now(), notes = COALESCE(p_note, notes)
    WHERE id = p_request_id;

  INSERT INTO public.transactions (user_id, type, amount, balance_after, description, reference_id)
    VALUES (v_req.user_id, 'withdraw_refund', v_req.amount, v_balance, v_req.method || ' withdrawal refunded', p_request_id);

  RETURN jsonb_build_object('ok', true);
END; $$;