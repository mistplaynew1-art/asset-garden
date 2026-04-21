
-- Seed slot and live games so the lobby rows render
INSERT INTO public.games (slug, name, category, provider, rtp, house_edge, is_active, is_hot, is_new, is_featured, sort_order, min_bet, max_bet) VALUES
  ('sweet-bonanza','Sweet Bonanza','slot','NexBet Originals',96.5,0.035,true,true,false,true,1,0.10,1000),
  ('gates-olympus','Gates of Olympus','slot','NexBet Originals',96.5,0.035,true,true,false,true,2,0.10,1000),
  ('big-bass','Big Bass Bonanza','slot','NexBet Originals',96.7,0.033,true,true,false,false,3,0.10,1000),
  ('sugar-rush','Sugar Rush','slot','NexBet Originals',96.5,0.035,true,false,true,false,4,0.10,1000),
  ('starlight','Starlight Princess','slot','NexBet Originals',96.5,0.035,true,false,false,false,5,0.10,1000),
  ('dog-house','Dog House','slot','NexBet Originals',96.5,0.035,true,false,false,false,6,0.10,1000),
  ('fire-portals','Fire Portals','slot','NexBet Originals',96.5,0.035,true,false,false,false,7,0.10,1000),
  ('buffalo-king','Buffalo King','slot','NexBet Originals',96.5,0.035,true,false,false,false,8,0.10,1000),
  ('wild-west-gold','Wild West Gold','slot','NexBet Originals',96.5,0.035,true,false,false,false,9,0.10,1000),
  ('fruit-party','Fruit Party','slot','NexBet Originals',96.5,0.035,true,false,false,false,10,0.10,1000),
  ('gems-bonanza','Gems Bonanza','slot','NexBet Originals',96.5,0.035,true,false,false,false,11,0.10,1000),
  ('zeus-vs-hades','Zeus vs Hades','slot','NexBet Originals',96.1,0.039,true,true,false,true,12,0.10,1000),
  ('classic-slot','Classic Slot','slot','NexBet Originals',96.0,0.04,true,false,false,false,13,0.10,1000)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.games (slug, name, category, provider, rtp, house_edge, is_active, is_hot, is_new, is_featured, sort_order, min_bet, max_bet) VALUES
  ('live-lightning-roulette','Lightning Roulette','live','Evolution',97.3,0.027,true,true,false,true,1,0.20,5000),
  ('live-crazy-time','Crazy Time','live','Evolution',96.08,0.0392,true,true,false,true,2,0.10,2500),
  ('live-monopoly','Monopoly Live','live','Evolution',96.23,0.0377,true,false,false,true,3,0.10,2500),
  ('live-blackjack-vip','Blackjack VIP','live','Evolution',99.28,0.0072,true,false,false,false,4,1.00,5000),
  ('live-baccarat','Speed Baccarat','live','Evolution',98.94,0.0106,true,false,false,false,5,1.00,5000),
  ('live-dream-catcher','Dream Catcher','live','Evolution',96.58,0.0342,true,false,false,false,6,0.10,2500),
  ('live-mega-ball','Mega Ball','live','Evolution',95.40,0.046,true,false,true,false,7,0.10,1000),
  ('live-deal-no-deal','Deal or No Deal','live','Evolution',95.42,0.0458,true,false,false,false,8,0.10,1000)
ON CONFLICT (slug) DO NOTHING;
