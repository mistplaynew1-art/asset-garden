/**
 * useCrashRound — drives the shared global Crash/Jetpack round on the client.
 *
 * - Subscribes to realtime updates of the latest `crash_rounds` row.
 * - Fetches initial round on mount.
 * - Computes the live multiplier locally from `running_starts_at` so the
 *   number animates at 60fps (the server only updates the row at status
 *   transitions). The crash point itself is server-authoritative.
 * - Exposes `placeBet` / `cashout` helpers that call the SECURITY DEFINER
 *   RPCs. Wallet/payout/transactions are fully server-side.
 *
 * One round at a time, shared by every player. Same round powers both
 * `crash` and `jetpack` skins (different artwork, identical math).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type RoundStatus = 'waiting' | 'running' | 'crashed' | 'settled';

export interface CrashRound {
  id: string;
  round_number: number;
  status: RoundStatus;
  server_seed_hash: string;
  server_seed: string | null;     // revealed only after crash
  crash_multiplier: number | null; // revealed only after crash
  waiting_starts_at: string;
  running_starts_at: string | null;
  crashed_at: string | null;
}

export interface CrashBet {
  id: string;
  round_id: string;
  user_id: string;
  game_type: 'crash' | 'jetpack';
  bet_amount: number;
  auto_cashout: number | null;
  cashout_multiplier: number | null;
  payout: number;
  status: 'placed' | 'cashed' | 'lost';
}

// Multiplier curve must match advance_crash_round() in the database:
//   m(t) = 1 + 0.06 * t^1.6   where t is seconds since running_starts_at
export function liveMultiplier(runningStartsAtIso: string | null): number {
  if (!runningStartsAtIso) return 1.0;
  const t = (Date.now() - new Date(runningStartsAtIso).getTime()) / 1000;
  if (t <= 0) return 1.0;
  return 1 + 0.06 * Math.pow(t, 1.6);
}

interface UseCrashRoundOptions {
  /** 'crash' or 'jetpack' — used as game_type when placing a bet. */
  gameType: 'crash' | 'jetpack';
  /** Optional: target user id used to filter own bets. */
  userId: string | null;
}

export function useCrashRound({ gameType, userId }: UseCrashRoundOptions) {
  const [round, setRound] = useState<CrashRound | null>(null);
  const [bets, setBets] = useState<CrashBet[]>([]);
  const [history, setHistory] = useState<Array<{ crash_multiplier: number; round_number: number }>>([]);
  const [multiplier, setMultiplier] = useState(1.0);
  const rafRef = useRef<number | null>(null);

  // ── Initial fetch ──────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: latest } = await supabase
        .from('crash_rounds')
        .select('*')
        .order('round_number', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cancelled && latest) setRound(latest as CrashRound);

      const { data: hist } = await supabase
        .from('crash_rounds')
        .select('crash_multiplier, round_number')
        .in('status', ['crashed', 'settled'])
        .order('round_number', { ascending: false })
        .limit(30);
      if (!cancelled && hist) {
        setHistory(hist.filter((h) => h.crash_multiplier != null) as Array<{ crash_multiplier: number; round_number: number }>);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Realtime subscription ─────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('crash-rounds-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'crash_rounds' }, (p) => {
        setRound(p.new as CrashRound);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'crash_rounds' }, (p) => {
        const nr = p.new as CrashRound;
        setRound((cur) => (cur && cur.round_number > nr.round_number ? cur : nr));
        if (nr.status === 'crashed' && nr.crash_multiplier != null) {
          setHistory((prev) => [{ crash_multiplier: nr.crash_multiplier!, round_number: nr.round_number }, ...prev].slice(0, 30));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crash_bets' }, () => {
        // refresh bets for the active round
        // (handled by the dedicated bets-fetch effect)
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // ── Fetch bets for the current round ──────────────────────────────
  useEffect(() => {
    if (!round) return;
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from('crash_bets')
        .select('*')
        .eq('round_id', round.id);
      if (!cancelled && data) {
        // DB column is `cashed_out_at_multiplier`; client type uses `cashout_multiplier`.
        const mapped: CrashBet[] = data.map((b) => ({
          id: b.id,
          round_id: b.round_id,
          user_id: b.user_id,
          game_type: b.game_type as 'crash' | 'jetpack',
          bet_amount: Number(b.bet_amount),
          auto_cashout: b.auto_cashout != null ? Number(b.auto_cashout) : null,
          cashout_multiplier: b.cashout_multiplier != null ? Number(b.cashout_multiplier) : null,
          payout: Number(b.payout ?? 0),
          status: b.status as 'placed' | 'cashed' | 'lost',
        }));
        setBets(mapped);
      }
    };
    load();
    const channel = supabase
      .channel(`crash-bets-${round.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crash_bets', filter: `round_id=eq.${round.id}` }, load)
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [round?.id]);

  // ── 60fps multiplier driver ───────────────────────────────────────
  useEffect(() => {
    const tick = () => {
      if (round?.status === 'running' && round.running_starts_at) {
        const m = liveMultiplier(round.running_starts_at);
        const cap = round.crash_multiplier ?? Infinity;
        setMultiplier(Math.min(m, cap));
      } else if (round?.status === 'crashed' && round.crash_multiplier != null) {
        setMultiplier(round.crash_multiplier);
      } else {
        setMultiplier(1.0);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [round?.status, round?.running_starts_at, round?.crash_multiplier]);

  // ── Self-heal: kick the engine if no update in 5s while in waiting/crashed ──
  useEffect(() => {
    if (!round) return;
    const interval = setInterval(() => {
      const ageMs = Date.now() - new Date(round.waiting_starts_at).getTime();
      const stale = round.status === 'waiting' && ageMs > 8000;
      const crashedTooLong = round.status === 'crashed' && round.crashed_at && Date.now() - new Date(round.crashed_at).getTime() > 5000;
      if (stale || crashedTooLong) {
        supabase.functions.invoke('crash-tick', { body: {} }).catch(() => {});
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [round?.id, round?.status]);

  // ── Actions ────────────────────────────────────────────────────────
  const placeBet = useCallback(
    async (betAmount: number, autoCashout: number | null) => {
      if (!round) return { error: 'NO_ROUND' };
      const { data, error } = await supabase.rpc('place_crash_bet' as never, {
        p_round_id: round.id,
        p_game_type: gameType,
        p_bet_amount: betAmount,
        p_auto_cashout: autoCashout,
      } as never);
      if (error) return { error: error.message };
      return data as { ok?: boolean; error?: string; bet_id?: string; balance?: number };
    },
    [round, gameType]
  );

  const cashout = useCallback(async (betId: string) => {
    const { data, error } = await supabase.rpc('cashout_crash_bet' as never, { p_bet_id: betId } as never);
    if (error) return { error: error.message };
    return data as { ok?: boolean; error?: string; multiplier?: number; payout?: number };
  }, []);

  const myBet = userId ? bets.find((b) => b.user_id === userId && b.game_type === gameType) ?? null : null;

  return { round, bets, myBet, history, multiplier, placeBet, cashout };
}
