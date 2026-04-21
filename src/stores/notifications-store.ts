import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toast } from 'sonner';
import type { LucideIcon } from 'lucide-react';
import { Bell, Gift, Trophy, Shield, Wallet } from 'lucide-react';

export type NotificationType = 'promo' | 'win' | 'security' | 'wallet' | 'system' | 'deposit' | 'withdrawal' | 'bonus';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  desc: string;
  /** Unix ms when created. We render this with a relative-time helper. */
  createdAt: number;
  read: boolean;
}

interface NotificationsState {
  items: AppNotification[];
  push: (n: Omit<AppNotification, 'id' | 'createdAt' | 'read'> & { silent?: boolean }) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  dismiss: (id: string) => void;
  clear: () => void;
  unreadCount: () => number;
}

// EMPTY initial state - no hardcoded fake data
// Real notifications come from:
// 1. Supabase realtime subscriptions (useRealtimeNotifications hook)
// 2. Server-sent events (wallet updates, wins, etc.)
// 3. System broadcasts (promos, maintenance)

export const useNotifications = create<NotificationsState>()(
  persist(
    (set, get) => ({
      items: [], // EMPTY - no fake seed data
      push: ({ silent, ...n }) => {
        const next: AppNotification = {
          id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          createdAt: Date.now(),
          read: false,
          ...n,
        };
        set({ items: [next, ...get().items].slice(0, 50) });
        if (!silent) {
          if (n.type === 'win') toast.success(n.title, { description: n.desc });
          else if (n.type === 'security') toast.warning(n.title, { description: n.desc });
          else toast(n.title, { description: n.desc });
        }
      },
      markRead: (id) => set({ items: get().items.map((i) => (i.id === id ? { ...i, read: true } : i)) }),
      markAllRead: () => set({ items: get().items.map((i) => ({ ...i, read: true })) }),
      dismiss: (id) => set({ items: get().items.filter((i) => i.id !== id) }),
      clear: () => set({ items: [] }),
      unreadCount: () => get().items.filter((i) => !i.read).length,
    }),
    { name: 'casino-notifications-v1' },
  ),
);

export const NOTIFICATION_ICON: Record<NotificationType, LucideIcon> = {
  promo: Gift,
  win: Trophy,
  security: Shield,
  wallet: Wallet,
  system: Bell,
  deposit: Wallet,
  withdrawal: Wallet,
  bonus: Gift,
};

export function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const s = Math.max(1, Math.floor(diff / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d === 1 ? '' : 's'} ago`;
}

/** Convenience helper usable from anywhere (game wins, deposits, errors, etc). */
export function notify(payload: Omit<AppNotification, 'id' | 'createdAt' | 'read'> & { silent?: boolean }): void {
  useNotifications.getState().push(payload);
}