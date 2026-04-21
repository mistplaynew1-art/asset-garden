import { supabase } from '@/integrations/supabase/client';

export async function getWalletBalances() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const { data: wallets, error } = await supabase
    .from('wallets')
    .select('id, currency, balance')
    .eq('user_id', session.user.id)
    .order('currency');

  if (error) throw new Error(`Failed to fetch wallets: ${error.message}`);

  return {
    wallets: (wallets ?? []).map((w) => ({
      id: w.id,
      currency: w.currency,
      balance: Number(w.balance),
    })),
  };
}
