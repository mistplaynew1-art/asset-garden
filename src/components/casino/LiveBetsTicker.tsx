import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface LiveBet {
  id: string;
  game_type: string;
  bet_amount: number;
  payout: number;
  won: boolean;
  user_id: string;
  username?: string;
}

export default function LiveBetsTicker() {
  const [bets, setBets] = useState<LiveBet[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: rounds } = await supabase
        .from('game_rounds')
        .select('id, game_type, bet_amount, payout, won, user_id')
        .order('created_at', { ascending: false })
        .limit(20);
      if (!active || !rounds?.length) return;
      const ids = [...new Set(rounds.map((r) => r.user_id))];
      const { data: profiles } = await supabase.from('profiles').select('user_id, username').in('user_id', ids);
      const nameMap = new Map((profiles ?? []).map((p) => [p.user_id, p.username || 'Player']));
      setBets(rounds.map((r) => ({ ...r, bet_amount: Number(r.bet_amount), payout: Number(r.payout ?? 0), won: !!r.won, username: nameMap.get(r.user_id) })));
    })();

    const channel = supabase
      .channel('live-bets')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'game_rounds' }, async (payload) => {
        const r = payload.new as { id: string; game_type: string; bet_amount: number; payout: number; won: boolean; user_id: string };
        const { data: p } = await supabase.from('profiles').select('username').eq('user_id', r.user_id).maybeSingle();
        setBets((prev) => [{ ...r, bet_amount: Number(r.bet_amount), payout: Number(r.payout ?? 0), won: !!r.won, username: p?.username || 'Player' }, ...prev].slice(0, 30));
      })
      .subscribe();

    return () => { active = false; supabase.removeChannel(channel); };
  }, []);

  if (bets.length === 0) {
    return (
      <div className="h-8 bg-void/80 backdrop-blur-sm border-b border-border flex items-center px-4 text-[11px] text-muted-foreground">
        Live bets feed — waiting for first wager…
      </div>
    );
  }

  const display = [...bets, ...bets];

  return (
    <div className="h-8 bg-void/80 backdrop-blur-sm border-b border-border overflow-hidden" role="marquee" aria-label="Live bets feed">
      <div className="flex items-center h-full animate-ticker whitespace-nowrap">
        {display.map((bet, i) => {
          const profit = bet.payout - bet.bet_amount;
          return (
            <div key={`${bet.id}-${i}`} className="inline-flex items-center gap-1.5 px-3 text-[11px] shrink-0">
              <span className="font-medium text-muted-foreground">{bet.username}</span>
              <span className="text-muted-foreground/50">•</span>
              <span className="text-foreground capitalize">{bet.game_type}</span>
              <span className={`font-mono font-bold ${bet.won ? 'text-glow-green' : 'text-glow-red'}`}>
                {bet.won ? '+' : ''}${profit.toFixed(2)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
