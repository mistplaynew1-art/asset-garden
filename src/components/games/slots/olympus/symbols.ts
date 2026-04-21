/**
 * Gates of Olympus — symbol catalog.
 * Modern "scatter pays" slot: any 8+ matching symbols anywhere on the 6×5 grid pays.
 */
import appleImg from '@/assets/slots/olympus/apple.png';
import plumImg from '@/assets/slots/olympus/plum.png';
import orangeImg from '@/assets/slots/olympus/orange.png';
import lemonImg from '@/assets/slots/olympus/lemon.png';
import sapphireImg from '@/assets/slots/olympus/sapphire.png';
import emeraldImg from '@/assets/slots/olympus/emerald.png';
import rubyImg from '@/assets/slots/olympus/ruby.png';
import diamondImg from '@/assets/slots/olympus/diamond.png';
import crownImg from '@/assets/slots/olympus/crown.png';
import zeusImg from '@/assets/slots/olympus/zeus.png';
import multiplierImg from '@/assets/slots/olympus/multiplier-orb.png';
import bgImg from '@/assets/slots/olympus/background.jpg';

export interface SymbolDef {
  id: string;
  texture: string;       // image URL (Vite-imported)
  color: number;         // hex tint for glow/filters
  tier: 'low' | 'mid' | 'high' | 'top';
  weight: number;
  pays: { '8-9': number; '10-11': number; '12+': number };
}

export const MULTIPLIER_TIERS = [2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 50, 100, 250, 500];

export const SYMBOLS: SymbolDef[] = [
  // Low tier — fruits
  { id: 'apple',   texture: appleImg,   color: 0xff4d6d, tier: 'low',  weight: 18, pays: { '8-9': 0.25, '10-11': 0.5,  '12+': 1   } },
  { id: 'plum',    texture: plumImg,    color: 0x9b59b6, tier: 'low',  weight: 18, pays: { '8-9': 0.25, '10-11': 0.5,  '12+': 1   } },
  { id: 'orange',  texture: orangeImg,  color: 0xff8c1a, tier: 'low',  weight: 16, pays: { '8-9': 0.4,  '10-11': 0.9,  '12+': 1.8 } },
  { id: 'lemon',   texture: lemonImg,   color: 0xffd54a, tier: 'low',  weight: 16, pays: { '8-9': 0.4,  '10-11': 0.9,  '12+': 1.8 } },
  // Mid tier — gem chips
  { id: 'sapphire',texture: sapphireImg,color: 0x3aa0ff, tier: 'mid',  weight: 12, pays: { '8-9': 1.0,  '10-11': 2.5,  '12+': 5   } },
  { id: 'emerald', texture: emeraldImg, color: 0x40d985, tier: 'mid',  weight: 12, pays: { '8-9': 1.5,  '10-11': 4.0,  '12+': 8   } },
  // High tier — premium gems
  { id: 'ruby',    texture: rubyImg,    color: 0xff3355, tier: 'high', weight: 8,  pays: { '8-9': 2.5,  '10-11': 7.5,  '12+': 20  } },
  { id: 'diamond', texture: diamondImg, color: 0xb6f2ff, tier: 'high', weight: 6,  pays: { '8-9': 5.0,  '10-11': 15,   '12+': 50  } },
  // Top tier — crown
  { id: 'crown',   texture: crownImg,   color: 0xffd34a, tier: 'top',  weight: 4,  pays: { '8-9': 10,   '10-11': 25,   '12+': 100 } },
];

// Scatter — Zeus head (triggers free spins; doesn't pay on its own)
export const SCATTER: SymbolDef = {
  id: 'zeus', texture: zeusImg, color: 0xfff066, tier: 'top', weight: 2,
  pays: { '8-9': 0, '10-11': 0, '12+': 0 },
};

export const MULTIPLIER_TEXTURE = multiplierImg;
export const BACKGROUND_TEXTURE = bgImg;

const ALL_REEL_SYMBOLS = [...SYMBOLS, SCATTER];
const TOTAL_WEIGHT = ALL_REEL_SYMBOLS.reduce((s, x) => s + x.weight, 0);

export function pickRandomSymbol(rng: () => number = Math.random): SymbolDef {
  let r = rng() * TOTAL_WEIGHT;
  for (const s of ALL_REEL_SYMBOLS) {
    r -= s.weight;
    if (r <= 0) return s;
  }
  return ALL_REEL_SYMBOLS[0];
}

export function pickRandomMultiplier(rng: () => number = Math.random): number {
  const r = rng();
  if (r < 0.45) return MULTIPLIER_TIERS[Math.floor(rng() * 5)];
  if (r < 0.78) return MULTIPLIER_TIERS[5 + Math.floor(rng() * 4)];
  if (r < 0.94) return MULTIPLIER_TIERS[9 + Math.floor(rng() * 3)];
  if (r < 0.992) return MULTIPLIER_TIERS[12];
  if (r < 0.999) return MULTIPLIER_TIERS[13];
  return MULTIPLIER_TIERS[14];
}

export function getSymbolPay(symbolId: string, count: number): number {
  if (count < 8) return 0;
  const sym = SYMBOLS.find(s => s.id === symbolId);
  if (!sym) return 0;
  if (count >= 12) return sym.pays['12+'];
  if (count >= 10) return sym.pays['10-11'];
  return sym.pays['8-9'];
}
