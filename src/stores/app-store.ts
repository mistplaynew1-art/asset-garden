import { create } from 'zustand';

export interface WalletBalance {
  id: string;
  currency: string;
  balance: number;
  usd: number;
  icon: string;
  color: string;
}

export interface Profile {
  username: string | null;
  display_name: string | null;
  level?: number;
  xp?: number;
  is_admin: boolean;
}

interface AppState {
  user: { id: string; email: string } | null;
  profile: Profile | null;
  isAuthenticated: boolean;
  setUser: (user: { id: string; email: string } | null) => void;
  setProfile: (profile: Profile | null) => void;

  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  mobileSidebarOpen: boolean;
  setMobileSidebarOpen: (open: boolean) => void;
  activeModal: string | null;
  openModal: (id: string) => void;
  closeModal: () => void;

  balances: WalletBalance[];
  balancesLoading: boolean;
  totalUsd: number;
  setBalances: (balances: WalletBalance[]) => void;

  selectedCurrency: string;
  setSelectedCurrency: (c: string) => void;

  // Notification badge count is derived from useNotifications store (notifications-store.ts).

  // Admin wallet (house funds)
  houseBalance: number;
  setHouseBalance: (b: number) => void;

  // Sound
  soundEnabled: boolean;
  musicEnabled: boolean;
  toggleSound: () => void;
  toggleMusic: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  user: null,
  profile: null,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: !!user, profile: user ? get().profile : null }),
  setProfile: (profile) => set({ profile }),

  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  mobileSidebarOpen: false,
  setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),
  activeModal: null,
  openModal: (id) => set({ activeModal: id }),
  closeModal: () => set({ activeModal: null }),

  balances: [],
  balancesLoading: false,
  totalUsd: 0,
  setBalances: (balances) => {
    const totalUsd = balances.reduce((s, b) => s + b.usd, 0);
    set({ balances, totalUsd, balancesLoading: false });
  },

  selectedCurrency: 'USD',
  setSelectedCurrency: (c) => set({ selectedCurrency: c }),


  houseBalance: 0,
  setHouseBalance: (b) => set({ houseBalance: b }),

  soundEnabled: true,
  musicEnabled: false,
  toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),
  toggleMusic: () => set((s) => ({ musicEnabled: !s.musicEnabled })),
}));
