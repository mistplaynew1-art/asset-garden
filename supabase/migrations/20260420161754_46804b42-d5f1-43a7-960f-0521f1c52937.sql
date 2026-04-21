
INSERT INTO public.games (slug, name, category, provider, rtp, house_edge, is_active, is_featured, is_hot, is_new, sort_order) VALUES
  ('crash',        'Crash',        'original', 'NexBet', 99.00, 0.0100, true, true,  true,  false, 1),
  ('aviator',      'Aviator',      'original', 'NexBet', 97.00, 0.0300, true, true,  true,  false, 2),
  ('jetpack',      'Jetpack',      'original', 'NexBet', 97.00, 0.0300, true, true,  false, true,  3),
  ('dice',         'Dice',         'original', 'NexBet', 99.00, 0.0100, true, false, true,  false, 4),
  ('mines',        'Mines',        'original', 'NexBet', 99.00, 0.0100, true, true,  true,  false, 5),
  ('plinko',       'Plinko',       'original', 'NexBet', 99.00, 0.0100, true, true,  false, false, 6),
  ('tower',        'Tower',        'original', 'NexBet', 99.00, 0.0100, true, false, false, false, 7),
  ('wheel',        'Wheel',        'original', 'NexBet', 96.00, 0.0400, true, false, false, false, 8),
  ('limbo',        'Limbo',        'original', 'NexBet', 99.00, 0.0100, true, false, false, true,  9),
  ('keno',         'Keno',         'original', 'NexBet', 95.00, 0.0500, true, false, false, false, 10),
  ('hilo',         'Hi-Lo',        'original', 'NexBet', 99.00, 0.0100, true, false, false, false, 11),
  ('blackjack',    'Blackjack',    'original', 'NexBet', 99.50, 0.0050, true, true,  false, false, 12),
  ('roulette',     'Roulette',     'original', 'NexBet', 97.30, 0.0270, true, true,  false, false, 13),
  ('coinflip',     'Coin Flip',    'original', 'NexBet', 98.00, 0.0200, true, false, false, false, 14),
  ('dragon-tiger', 'Dragon Tiger', 'original', 'NexBet', 96.27, 0.0373, true, false, false, false, 15)
ON CONFLICT (slug) DO UPDATE SET
  category = EXCLUDED.category,
  is_active = true,
  name = EXCLUDED.name,
  sort_order = EXCLUDED.sort_order;
