-- Reset progressive jackpots to $0. They will accumulate again from real bets via place_bet().
INSERT INTO public.platform_stats (stat_key, stat_value)
VALUES ('jackpot_mini', 0), ('jackpot_major', 0), ('jackpot_grand', 0)
ON CONFLICT (stat_key) DO UPDATE SET stat_value = 0, updated_at = now();