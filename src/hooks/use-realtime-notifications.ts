/**
 * Supabase realtime subscription for win notifications.
 * Mount in CasinoLayout.tsx for global listening.
 */
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNotifications } from '@/stores/notifications-store';
import { useAppStore } from '@/stores/app-store';

export function useRealtimeNotifications() {
  const user = useAppStore((s) => s.user);
  const pushNotification = useNotifications((s) => s.push);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'game_rounds',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const round = payload.new as {
            won: boolean;
            payout: number;
            game_type: string;
            multiplier: number;
          };
          if (round.won && round.payout > 0) {
            pushNotification({
              type: 'win',
              title: 'You won!',
              desc: `${round.game_type} — ${round.multiplier?.toFixed(2)}× — +${round.payout.toFixed(2)}`,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'wallets',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Wallet updated — the useWallet hook handles refetching balance
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, pushNotification]);
}