import bassImg from '@/assets/slots/bigbass/bass.png';
import fishermanImg from '@/assets/slots/bigbass/fisherman.png';
import moneyImg from '@/assets/slots/bigbass/money.png';
import tackleImg from '@/assets/slots/bigbass/tackle.png';
import lureImg from '@/assets/slots/bigbass/lure.png';
import bobberImg from '@/assets/slots/bigbass/bobber.png';
import cardAImg from '@/assets/slots/bigbass/card-a.png';
import cardKImg from '@/assets/slots/bigbass/card-k.png';
import cardQImg from '@/assets/slots/bigbass/card-q.png';
import scatterChestImg from '@/assets/slots/bigbass/scatter-chest.png';
import bgImg from '@/assets/slots/bigbass/background.jpg';

export interface BigBassSymbol {
  id: string;
  texture: string;
  color: number;
  tier: 'low' | 'mid' | 'high' | 'special';
  weight: number;
  // Pays per [3, 4, 5] of a kind
  pays: { '3': number; '4': number; '5': number };
}

export const BIGBASS_SYMBOLS: BigBassSymbol[] = [
  // Low — playing cards
  { id: 'card-q', texture: cardQImg, color: 0xff4d4d, tier: 'low',  weight: 24, pays: { '3': 0.2, '4': 0.5, '5': 1.5 } },
  { id: 'card-k', texture: cardKImg, color: 0x40d985, tier: 'low',  weight: 22, pays: { '3': 0.25,'4': 0.6, '5': 1.8 } },
  { id: 'card-a', texture: cardAImg, color: 0x3aa0ff, tier: 'low',  weight: 20, pays: { '3': 0.3, '4': 0.75,'5': 2 } },
  // Mid — fishing equipment
  { id: 'bobber', texture: bobberImg, color: 0xff3355, tier: 'mid',  weight: 14, pays: { '3': 0.5, '4': 1.5, '5': 4 } },
  { id: 'lure',   texture: lureImg,   color: 0xffa033, tier: 'mid',  weight: 12, pays: { '3': 0.8, '4': 2.0, '5': 6 } },
  { id: 'tackle', texture: tackleImg, color: 0x40b85e, tier: 'mid',  weight: 10, pays: { '3': 1.0, '4': 3.0, '5': 10 } },
  // High — bass fish (highest non-special)
  { id: 'bass',   texture: bassImg,   color: 0x66cc88, tier: 'high', weight: 7,  pays: { '3': 2.0, '4': 7.0, '5': 25 } },
];

export const FISHERMAN_WILD: BigBassSymbol = {
  id: 'fisherman', texture: fishermanImg, color: 0xff5555, tier: 'special', weight: 3,
  pays: { '3': 5, '4': 25, '5': 100 },
};

export const SCATTER_CHEST: BigBassSymbol = {
  id: 'chest', texture: scatterChestImg, color: 0xffd34a, tier: 'special', weight: 2,
  pays: { '3': 0, '4': 0, '5': 0 },
};

export const MONEY_TEXTURE = moneyImg;
export const BACKGROUND_TEXTURE_BB = bgImg;

const ALL = [...BIGBASS_SYMBOLS, FISHERMAN_WILD, SCATTER_CHEST];
const TOTAL_W = ALL.reduce((s, x) => s + x.weight, 0);

export function pickBigBassSymbol(rng: () => number = Math.random): BigBassSymbol {
  let r = rng() * TOTAL_W;
  for (const s of ALL) {
    r -= s.weight;
    if (r <= 0) return s;
  }
  return ALL[0];
}

// During free spins, force more bass + fisherman appearances (collector mechanic)
const FS_ALL = [
  ...BIGBASS_SYMBOLS.map(s => ({ ...s, weight: s.tier === 'high' ? s.weight * 3 : s.weight })),
  { ...FISHERMAN_WILD, weight: 8 },
  { ...SCATTER_CHEST, weight: 1 },
];
const FS_TOTAL_W = FS_ALL.reduce((s, x) => s + x.weight, 0);

export function pickBigBassSymbolFreeSpin(rng: () => number = Math.random): BigBassSymbol {
  let r = rng() * FS_TOTAL_W;
  for (const s of FS_ALL) {
    r -= s.weight;
    if (r <= 0) return s;
  }
  return FS_ALL[0];
}

// Cash values that bass symbols can carry during free spins
export const CASH_VALUES = [1, 2, 3, 5, 10, 15, 25, 50, 100, 250];
export function pickCashValue(rng: () => number = Math.random): number {
  const r = rng();
  if (r < 0.45) return CASH_VALUES[Math.floor(rng() * 3)];        // 1–3
  if (r < 0.78) return CASH_VALUES[3 + Math.floor(rng() * 2)];    // 5–10
  if (r < 0.93) return CASH_VALUES[5 + Math.floor(rng() * 2)];    // 15–25
  if (r < 0.985) return CASH_VALUES[7];                           // 50
  if (r < 0.998) return CASH_VALUES[8];                           // 100
  return CASH_VALUES[9];                                          // 250
}

export function getBigBassPay(symbolId: string, count: number): number {
  if (count < 3) return 0;
  const sym = [...BIGBASS_SYMBOLS, FISHERMAN_WILD].find(s => s.id === symbolId);
  if (!sym) return 0;
  if (count >= 5) return sym.pays['5'];
  if (count >= 4) return sym.pays['4'];
  return sym.pays['3'];
}
