import heartImg from '@/assets/slots/bonanza/heart.png';
import starImg from '@/assets/slots/bonanza/star.png';
import greenGemImg from '@/assets/slots/bonanza/green-gem.png';
import blueGemImg from '@/assets/slots/bonanza/blue-gem.png';
import grapesImg from '@/assets/slots/bonanza/grapes.png';
import watermelonImg from '@/assets/slots/bonanza/watermelon.png';
import cherriesImg from '@/assets/slots/bonanza/cherries.png';
import bananaImg from '@/assets/slots/bonanza/banana.png';
import lollipopImg from '@/assets/slots/bonanza/lollipop.png';
import multiplierImg from '@/assets/slots/bonanza/multiplier.png';
import bgImg from '@/assets/slots/bonanza/background.jpg';

export interface BonanzaSymbol {
  id: string;
  texture: string;
  color: number;
  tier: 'low' | 'mid' | 'high' | 'top';
  weight: number;
  // Pays per cluster size [5-6, 7-8, 9-10, 11-12+]
  pays: { '5-6': number; '7-8': number; '9-10': number; '11+': number };
}

export const BONANZA_SYMBOLS: BonanzaSymbol[] = [
  // Low — fruits
  { id: 'banana',     texture: bananaImg,    color: 0xffe066, tier: 'low',  weight: 18, pays: { '5-6': 0.2, '7-8': 0.5, '9-10': 1.0, '11+': 2 } },
  { id: 'grapes',     texture: grapesImg,    color: 0x9b59b6, tier: 'low',  weight: 17, pays: { '5-6': 0.25,'7-8': 0.6, '9-10': 1.2, '11+': 2.5 } },
  { id: 'watermelon', texture: watermelonImg,color: 0xff4d6d, tier: 'low',  weight: 16, pays: { '5-6': 0.3, '7-8': 0.7, '9-10': 1.5, '11+': 3 } },
  { id: 'cherries',   texture: cherriesImg,  color: 0xff3355, tier: 'low',  weight: 16, pays: { '5-6': 0.4, '7-8': 0.9, '9-10': 1.8, '11+': 4 } },
  // Mid — candies
  { id: 'green-gem',  texture: greenGemImg,  color: 0x40d985, tier: 'mid',  weight: 12, pays: { '5-6': 0.8, '7-8': 1.8, '9-10': 4,   '11+': 10 } },
  { id: 'blue-gem',   texture: blueGemImg,   color: 0x3aa0ff, tier: 'mid',  weight: 11, pays: { '5-6': 1.2, '7-8': 2.5, '9-10': 6,   '11+': 15 } },
  // High — premium
  { id: 'star',       texture: starImg,      color: 0xb967ff, tier: 'high', weight: 7,  pays: { '5-6': 2.5, '7-8': 6,   '9-10': 15,  '11+': 40 } },
  { id: 'heart',      texture: heartImg,     color: 0xff3355, tier: 'top',  weight: 5,  pays: { '5-6': 5,   '7-8': 12,  '9-10': 30,  '11+': 100 } },
];

export const SCATTER_BONANZA: BonanzaSymbol = {
  id: 'lollipop', texture: lollipopImg, color: 0xff66cc, tier: 'top', weight: 2,
  pays: { '5-6': 0, '7-8': 0, '9-10': 0, '11+': 0 },
};

export const MULTIPLIER_TEXTURE_BONANZA = multiplierImg;
export const BACKGROUND_TEXTURE_BONANZA = bgImg;

// Multipliers for free spins (Sweet Bonanza style — adds to a global accumulator)
export const BONANZA_MULTIPLIER_TIERS = [2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 50, 100];

const ALL = [...BONANZA_SYMBOLS, SCATTER_BONANZA];
const TOTAL_W = ALL.reduce((s, x) => s + x.weight, 0);

export function pickBonanzaSymbol(rng: () => number = Math.random): BonanzaSymbol {
  let r = rng() * TOTAL_W;
  for (const s of ALL) {
    r -= s.weight;
    if (r <= 0) return s;
  }
  return ALL[0];
}

export function pickBonanzaMultiplier(rng: () => number = Math.random): number {
  const r = rng();
  if (r < 0.50) return BONANZA_MULTIPLIER_TIERS[Math.floor(rng() * 5)];           // 2–6
  if (r < 0.85) return BONANZA_MULTIPLIER_TIERS[5 + Math.floor(rng() * 4)];       // 8–15
  if (r < 0.97) return BONANZA_MULTIPLIER_TIERS[9 + Math.floor(rng() * 3)];       // 20–50
  return BONANZA_MULTIPLIER_TIERS[12];                                            // 100×
}

export function getBonanzaPay(symbolId: string, count: number): number {
  if (count < 5) return 0;
  const sym = BONANZA_SYMBOLS.find(s => s.id === symbolId);
  if (!sym) return 0;
  if (count >= 11) return sym.pays['11+'];
  if (count >= 9)  return sym.pays['9-10'];
  if (count >= 7)  return sym.pays['7-8'];
  return sym.pays['5-6'];
}
