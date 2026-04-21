import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useGames(category?: string) {
  return useQuery({
    queryKey: ['games', category],
    queryFn: async () => {
      let query = supabase.from('games').select('*').eq('is_active', true).order('sort_order');
      if (category) query = query.eq('category', category);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function usePlatformStats() {
  return useQuery({
    queryKey: ['platform-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.from('platform_stats').select('*');
      if (error) throw error;
      const stats: Record<string, number> = {};
      (data ?? []).forEach(s => { stats[s.stat_key] = Number(s.stat_value); });
      return stats;
    },
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  });
}

export function useHouseWallet() {
  return useQuery({
    queryKey: ['house-wallet'],
    queryFn: async () => {
      const { data, error } = await supabase.from('house_wallet').select('*').single();
      if (error) throw error;
      return data;
    },
    staleTime: 10 * 1000,
    refetchInterval: 10 * 1000,
  });
}

export function useAdminSettings() {
  return useQuery({
    queryKey: ['admin-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('admin_settings').select('*').order('key');
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAdminUsers() {
  return useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAdminGameRounds() {
  return useQuery({
    queryKey: ['admin-game-rounds'],
    queryFn: async () => {
      const { data, error } = await supabase.from('game_rounds').select('*').order('created_at', { ascending: false }).limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useDepositRequests() {
  return useQuery({
    queryKey: ['deposit-requests'],
    queryFn: async () => {
      const { data, error } = await supabase.from('deposit_requests').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useWithdrawalRequests() {
  return useQuery({
    queryKey: ['withdrawal-requests'],
    queryFn: async () => {
      const { data, error } = await supabase.from('withdrawal_requests').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUserTransactions() {
  return useQuery({
    queryKey: ['user-transactions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useLeaderboard(period: 'daily' | 'weekly' | 'monthly' | 'all' = 'weekly') {
  return useQuery({
    queryKey: ['leaderboard', period],
    queryFn: async () => {
      const since = new Date();
      if (period === 'daily') since.setDate(since.getDate() - 1);
      else if (period === 'weekly') since.setDate(since.getDate() - 7);
      else if (period === 'monthly') since.setMonth(since.getMonth() - 1);
      else since.setFullYear(2000);

      const { data: rounds } = await supabase
        .from('game_rounds')
        .select('user_id, bet_amount, payout')
        .gte('created_at', since.toISOString());

      const agg: Record<string, { wagered: number; profit: number; games: number }> = {};
      (rounds ?? []).forEach((r) => {
        const a = (agg[r.user_id] ||= { wagered: 0, profit: 0, games: 0 });
        a.wagered += Number(r.bet_amount);
        a.profit += Number(r.payout ?? 0) - Number(r.bet_amount);
        a.games += 1;
      });

      const userIds = Object.keys(agg);
      if (userIds.length === 0) return [];
      const { data: profiles } = await supabase.from('profiles').select('user_id, username, display_name').in('user_id', userIds);
      const nameMap = new Map((profiles ?? []).map((p) => [p.user_id, p.username || p.display_name || 'Player']));

      return userIds
        .map((uid) => ({ user_id: uid, name: nameMap.get(uid) || 'Player', ...agg[uid] }))
        .sort((a, b) => b.wagered - a.wagered)
        .slice(0, 50);
    },
    staleTime: 30 * 1000,
  });
}

export function useGameHistory(gameType?: string) {
  return useQuery({
    queryKey: ['game-history', gameType],
    queryFn: async () => {
      let query = supabase.from('game_rounds').select('*').order('created_at', { ascending: false }).limit(20);
      if (gameType) query = query.eq('game_type', gameType);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });
}
