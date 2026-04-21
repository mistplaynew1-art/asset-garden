// Crypto payment options + validators + simple fiat conversion helper.
// Used by deposit/withdrawal flows.

export interface CryptoOption {
  code: string;          // ticker (BTC, ETH, USDT_TRC20...)
  name: string;          // friendly label
  network: string;       // network description
  settingKey: string;    // admin_settings key holding the deposit address
  decimals: number;      // display precision
  /** Optional address validator. Returns true if the address looks valid. */
  validate: (addr: string) => boolean;
  /** Static fallback USD price when no live rate is available. */
  fallbackUsd: number;
  iconColor: string;     // hex (semantic color used inside icon bg)
}

const reBTC = /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/;
const reETH = /^0x[a-fA-F0-9]{40}$/;
const reTRC = /^T[1-9A-HJ-NP-Za-km-z]{33}$/;
const reSOL = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const reLTC = /^(ltc1|[LM3])[a-zA-HJ-NP-Z0-9]{25,62}$/;
const reDOGE = /^D[5-9A-HJ-NP-U][1-9A-HJ-NP-Za-km-z]{32}$/;
const reBNB = reETH; // BSC = same format
const reMATIC = reETH;

export const CRYPTO_OPTIONS: CryptoOption[] = [
  { code: 'BTC',        name: 'Bitcoin',        network: 'Bitcoin',          settingKey: 'CRYPTO_BTC_ADDRESS',        decimals: 8, validate: (a) => reBTC.test(a),  fallbackUsd: 95000,  iconColor: '#f7931a' },
  { code: 'ETH',        name: 'Ethereum',       network: 'ERC-20',           settingKey: 'CRYPTO_ETH_ADDRESS',        decimals: 6, validate: (a) => reETH.test(a),  fallbackUsd: 3500,   iconColor: '#627eea' },
  { code: 'USDT_TRC20', name: 'Tether',         network: 'TRC-20 (Tron)',    settingKey: 'CRYPTO_USDT_TRC20_ADDRESS', decimals: 2, validate: (a) => reTRC.test(a),  fallbackUsd: 1.0,    iconColor: '#26a17b' },
  { code: 'USDT_ERC20', name: 'Tether',         network: 'ERC-20 (Ethereum)',settingKey: 'CRYPTO_USDT_ERC20_ADDRESS', decimals: 2, validate: (a) => reETH.test(a),  fallbackUsd: 1.0,    iconColor: '#26a17b' },
  { code: 'USDC',       name: 'USD Coin',       network: 'ERC-20',           settingKey: 'CRYPTO_USDC_ADDRESS',       decimals: 2, validate: (a) => reETH.test(a),  fallbackUsd: 1.0,    iconColor: '#2775ca' },
  { code: 'SOL',        name: 'Solana',         network: 'Solana',           settingKey: 'CRYPTO_SOL_ADDRESS',        decimals: 4, validate: (a) => reSOL.test(a),  fallbackUsd: 180,    iconColor: '#14f195' },
  { code: 'BNB',        name: 'BNB',            network: 'BEP-20 (BSC)',     settingKey: 'CRYPTO_BNB_ADDRESS',        decimals: 4, validate: (a) => reBNB.test(a),  fallbackUsd: 600,    iconColor: '#f3ba2f' },
  { code: 'LTC',        name: 'Litecoin',       network: 'Litecoin',         settingKey: 'CRYPTO_LTC_ADDRESS',        decimals: 6, validate: (a) => reLTC.test(a),  fallbackUsd: 110,    iconColor: '#a6a9aa' },
  { code: 'DOGE',       name: 'Dogecoin',       network: 'Dogecoin',         settingKey: 'CRYPTO_DOGE_ADDRESS',       decimals: 2, validate: (a) => reDOGE.test(a), fallbackUsd: 0.4,    iconColor: '#c2a633' },
  { code: 'MATIC',      name: 'Polygon',        network: 'Polygon (MATIC)',  settingKey: 'CRYPTO_MATIC_ADDRESS',      decimals: 4, validate: (a) => reMATIC.test(a),fallbackUsd: 0.55,   iconColor: '#8247e5' },
  { code: 'TRX',        name: 'Tron',           network: 'Tron',             settingKey: 'CRYPTO_TRX_ADDRESS',        decimals: 4, validate: (a) => reTRC.test(a),  fallbackUsd: 0.18,   iconColor: '#ff060a' },
];

export function getCryptoOption(code: string): CryptoOption | undefined {
  return CRYPTO_OPTIONS.find((c) => c.code === code);
}

/** Convert USD amount → crypto amount using fallback rate. */
export function usdToCrypto(usd: number, code: string, liveRate?: number): number {
  const opt = getCryptoOption(code);
  if (!opt) return 0;
  const rate = liveRate && liveRate > 0 ? liveRate : opt.fallbackUsd;
  return usd / rate;
}

/** Format crypto amount with appropriate precision. */
export function formatCrypto(amount: number, code: string): string {
  const opt = getCryptoOption(code);
  const dec = opt?.decimals ?? 6;
  return amount.toFixed(dec);
}
