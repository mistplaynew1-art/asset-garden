/** Shared types matching the backend schema */

export interface User {
  id: string;
  email: string;
  username: string;
  kycTier: 'none' | 'basic' | 'enhanced' | 'full';
}

export interface Wallet {
  id: string;
  userId: string;
  currency: string;
  balance: string;
  lockedBalance: string;
}

export interface LedgerEntry {
  id: string;
  userId: string;
  walletId: string;
  txType: TxType;
  status: TxStatus;
  amount: string;
  balanceBefore: string;
  balanceAfter: string;
  currency: string;
  referenceType?: string;
  referenceId?: string;
  createdAt: string;
}

export type TxType = 'deposit' | 'withdrawal' | 'wager' | 'payout' | 'reversal' | 'bonus' | 'cashback' | 'commission' | 'fee' | 'adjustment';
export type TxStatus = 'pending' | 'confirmed' | 'failed' | 'cancelled' | 'reversed';

export interface GameResult {
  betId: string;
  outcome: number;
  multiplier: number;
  payout: string;
  serverSeedHash: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export type APIErrorCode =
  | 'INSUFFICIENT_BALANCE'
  | 'BET_BELOW_MINIMUM'
  | 'BET_ABOVE_MAXIMUM'
  | 'GAME_DISABLED'
  | 'KYC_REQUIRED'
  | 'RATE_LIMIT'
  | 'SELF_EXCLUDED'
  | 'GEO_BLOCKED'
  | 'INTERNAL_ERROR';
