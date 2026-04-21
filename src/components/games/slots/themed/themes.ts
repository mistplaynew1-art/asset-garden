/**
 * Theme registry for themed slot machines.
 *
 * Each theme gives a slot a unique visual identity (palette, frame, background)
 * and a unique symbol set drawn procedurally so no asset files are required.
 * Symbol drawing is delegated to small painter functions per-symbol.
 */
import * as Phaser from 'phaser';
import sugarRushGummy from '@/assets/slots/sugar-rush/gummy.png';
import sugarRushDonut from '@/assets/slots/sugar-rush/donut.png';
import sugarRushChocolate from '@/assets/slots/sugar-rush/chocolate.png';
import sugarRushCake from '@/assets/slots/sugar-rush/cake.png';
import sugarRushIcecream from '@/assets/slots/sugar-rush/icecream.png';
import sugarRushHeart from '@/assets/slots/sugar-rush/heart.png';
import sugarRushStar from '@/assets/slots/sugar-rush/star.png';
import sugarRushWild from '@/assets/slots/sugar-rush/wild.png';
import sugarRushLollipop from '@/assets/slots/sugar-rush/lollipop.png';

export interface ThemeSymbol {
  id: string;
  /** Display name in the paytable. */
  name: string;
  /** Brand color (used for tile glow + paytable swatch). */
  color: number;
  weight: number;
  /** Pays as a multiple of the per-line bet for 3/4/5 of a kind. */
  pays: { '3': number; '4': number; '5': number };
  /** True for the high-tier symbol that pulses idle. */
  premium?: boolean;
  /** Optional pre-rendered PNG asset URL — when present, used instead of paint(). */
  imageUrl?: string;
  /** Procedural painter — draws the symbol centred at (cx, cy) into Graphics g.
   *  Used as the fallback when imageUrl is not provided. */
  paint: (g: Phaser.GameObjects.Graphics, cx: number, cy: number, size: number) => void;
}

export interface SlotTheme {
  id: string;
  /** Display name shown in the slot header. */
  name: string;
  /** Tagline shown under the title. */
  tagline: string;
  /** Background color of the canvas. */
  backgroundColor: number;
  /** Outer neon frame color. */
  frameOuter: number;
  /** Inner accent frame color. */
  frameInner: number;
  /** Reel window background color. */
  reelWindowBg: number;
  /** Reel window border color. */
  reelWindowBorder: number;
  /** Win counter text color (CSS hex). */
  winCounterColor: string;
  winCounterStroke: string;
  /** Ambient particle / sparkle palette for wins. */
  sparklePalette: number[];
  /** Optional ambient background painter (e.g. clouds, stars). */
  paintAmbient?: (
    scene: Phaser.Scene,
    g: Phaser.GameObjects.Graphics,
    width: number,
    height: number,
  ) => void;
  /** Wild symbol id (substitutes for any). Optional. */
  wildId?: string;
  /** ID of the special "jackpot" symbol — 5-in-middle-row triggers jackpot. */
  jackpotId: string;
  /** Symbol catalogue. Order = paytable order (low → high). */
  symbols: ThemeSymbol[];
  /** Three rules shown in the paytable modal. */
  rules: string[];
  /** Tailwind text color class for header (e.g. "text-pink-200"). */
  headerColorClass: string;
  /** Tailwind border color class for the outer container. */
  containerBorderClass: string;
  /** Tailwind background gradient class for the outer container. */
  containerBgClass: string;
  /** Optional Tailwind icon (lucide name handled in component). */
  icon: 'crown' | 'flame' | 'gem' | 'star' | 'cherry' | 'sparkles' | 'zap' | 'mountain' | 'candy';
}

/* -------------------------- shared painter utils -------------------------- */

const polygonPoints = (cx: number, cy: number, radius: number, sides: number, rotation = 0): Phaser.Math.Vector2[] => {
  const pts: Phaser.Math.Vector2[] = [];
  for (let i = 0; i < sides; i++) {
    const a = (Math.PI * 2 * i) / sides + rotation;
    pts.push(new Phaser.Math.Vector2(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius));
  }
  return pts;
};

const starPoints = (cx: number, cy: number, outer: number, inner: number, points = 5): Phaser.Math.Vector2[] => {
  const pts: Phaser.Math.Vector2[] = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI / points) * i - Math.PI / 2;
    pts.push(new Phaser.Math.Vector2(cx + Math.cos(a) * r, cy + Math.sin(a) * r));
  }
  return pts;
};

const drawCard = (g: Phaser.GameObjects.Graphics, cx: number, cy: number, label: string, accent: number) => {
  // White card body
  g.fillStyle(0xffffff, 1).fillRoundedRect(cx - 26, cy - 32, 52, 64, 6);
  g.lineStyle(2, accent, 1).strokeRoundedRect(cx - 26, cy - 32, 52, 64, 6);
  g.fillStyle(accent, 1);
  // Stylised letter rendered as a thick block — proper text uses make.text but
  // we keep this purely Graphics to stay in the procedural pipeline.
  // We approximate the letter with a filled rect + corner accents. The label
  // hint is mainly for paytable parity; the colour does the heavy lifting.
  g.fillRect(cx - 12, cy - 16, 24, 32);
  g.fillStyle(0xffffff, 0.85).fillRect(cx - 8, cy - 12, 16, 24);
  g.fillStyle(accent, 1).fillRect(cx - 4, cy - 6, 8, 12);
  // Tiny corner pip for visual richness
  g.fillCircle(cx - 18, cy - 24, 3);
  g.fillCircle(cx + 18, cy + 24, 3);
  // Suppress unused-var warning for label (kept for future text overlay)
  void label;
};

/* ============================ THEMES ============================ */

const THEMES: Record<string, SlotTheme> = {

  /* ---------------------- Buffalo King ---------------------- */
  'buffalo-king': {
    id: 'buffalo-king',
    name: 'Buffalo King',
    tagline: 'Stampede across the Great Plains',
    backgroundColor: 0x2b1810,
    frameOuter: 0xc77b32,
    frameInner: 0xffd34a,
    reelWindowBg: 0x1a0f08,
    reelWindowBorder: 0x8a5a28,
    winCounterColor: '#FFB347',
    winCounterStroke: '#5a2f00',
    sparklePalette: [0xffb347, 0xffd34a, 0xffffff, 0xc77b32],
    headerColorClass: 'text-amber-200',
    containerBorderClass: 'border-amber-700/50',
    containerBgClass: 'bg-[#1a0f08]',
    icon: 'mountain',
    wildId: 'buffalo',
    jackpotId: 'buffalo',
    rules: [
      '5×3 grid. 9 paylines. Pays left → right.',
      'Buffalo 🐃 is wild and substitutes for all symbols.',
      '5 buffaloes on middle row triggers the herd JACKPOT (200× bet).',
    ],
    symbols: [
      { id: 'card-10', name: '10', color: 0x6699ff, weight: 26, pays: { '3': 1.5, '4': 4, '5': 10 },
        paint: (g, cx, cy) => drawCard(g, cx, cy, '10', 0x4477dd) },
      { id: 'card-j', name: 'J', color: 0xff8855, weight: 24, pays: { '3': 2, '4': 5, '5': 12 },
        paint: (g, cx, cy) => drawCard(g, cx, cy, 'J', 0xdd5522) },
      { id: 'card-q', name: 'Q', color: 0xee66cc, weight: 22, pays: { '3': 2, '4': 6, '5': 15 },
        paint: (g, cx, cy) => drawCard(g, cx, cy, 'Q', 0xaa2288) },
      { id: 'card-k', name: 'K', color: 0xffd34a, weight: 20, pays: { '3': 2.5, '4': 8, '5': 18 },
        paint: (g, cx, cy) => drawCard(g, cx, cy, 'K', 0xc77b32) },
      { id: 'card-a', name: 'A', color: 0xff4444, weight: 18, pays: { '3': 3, '4': 10, '5': 22 },
        paint: (g, cx, cy) => drawCard(g, cx, cy, 'A', 0xaa1122) },
      { id: 'eagle', name: 'Eagle', color: 0xeeeeee, weight: 12, pays: { '3': 5, '4': 15, '5': 35 },
        paint: (g, cx, cy) => {
          // Eagle silhouette
          g.fillStyle(0xeeeeee, 1);
          g.fillTriangle(cx, cy - 26, cx - 28, cy + 8, cx + 28, cy + 8);
          g.fillTriangle(cx - 30, cy - 4, cx - 8, cy - 16, cx - 8, cy + 8);
          g.fillTriangle(cx + 30, cy - 4, cx + 8, cy - 16, cx + 8, cy + 8);
          g.fillStyle(0xffd34a, 1).fillTriangle(cx - 4, cy - 4, cx + 4, cy - 4, cx, cy + 6);
          g.fillStyle(0x222222, 1).fillCircle(cx - 4, cy - 14, 2);
          g.fillCircle(cx + 4, cy - 14, 2);
        } },
      { id: 'wolf', name: 'Wolf', color: 0xaaaaaa, weight: 10, pays: { '3': 6, '4': 18, '5': 45 },
        paint: (g, cx, cy) => {
          g.fillStyle(0x888888, 1);
          g.fillCircle(cx, cy + 4, 22);
          g.fillTriangle(cx - 22, cy - 6, cx - 14, cy - 22, cx - 6, cy - 6);
          g.fillTriangle(cx + 22, cy - 6, cx + 14, cy - 22, cx + 6, cy - 6);
          g.fillStyle(0xffd34a, 1).fillCircle(cx - 8, cy - 2, 3);
          g.fillCircle(cx + 8, cy - 2, 3);
          g.fillStyle(0x222222, 1).fillTriangle(cx - 4, cy + 12, cx + 4, cy + 12, cx, cy + 18);
        } },
      { id: 'bear', name: 'Bear', color: 0x6b3e1f, weight: 8, pays: { '3': 8, '4': 25, '5': 60 }, premium: true,
        paint: (g, cx, cy) => {
          g.fillStyle(0x6b3e1f, 1);
          g.fillCircle(cx, cy + 6, 24);
          g.fillCircle(cx - 16, cy - 14, 9);
          g.fillCircle(cx + 16, cy - 14, 9);
          g.fillStyle(0xc99a66, 1).fillCircle(cx, cy + 14, 12);
          g.fillStyle(0x222222, 1).fillCircle(cx - 8, cy - 2, 3);
          g.fillCircle(cx + 8, cy - 2, 3);
          g.fillCircle(cx, cy + 8, 4);
        } },
      { id: 'buffalo', name: 'Buffalo (Wild)', color: 0xffd34a, weight: 5, pays: { '3': 25, '4': 80, '5': 250 }, premium: true,
        paint: (g, cx, cy) => {
          // Buffalo head
          g.fillStyle(0x3a1f0e, 1);
          g.fillCircle(cx, cy + 4, 24);
          g.fillEllipse(cx, cy - 14, 36, 14);
          // Horns
          g.fillStyle(0xeeeeee, 1);
          g.fillTriangle(cx - 18, cy - 14, cx - 32, cy - 22, cx - 16, cy - 22);
          g.fillTriangle(cx + 18, cy - 14, cx + 32, cy - 22, cx + 16, cy - 22);
          // Eyes
          g.fillStyle(0xffd34a, 1).fillCircle(cx - 8, cy - 2, 3);
          g.fillCircle(cx + 8, cy - 2, 3);
          // Snout
          g.fillStyle(0xc99a66, 1).fillEllipse(cx, cy + 18, 16, 10);
          g.fillStyle(0x222222, 1).fillCircle(cx - 4, cy + 16, 1.5);
          g.fillCircle(cx + 4, cy + 16, 1.5);
          // Wild banner
          g.fillStyle(0xffd34a, 1).fillRect(cx - 22, cy + 26, 44, 8);
          g.fillStyle(0x3a1f0e, 1).fillRect(cx - 18, cy + 28, 36, 4);
        } },
    ],
  },

  /* ---------------------- Dog House ---------------------- */
  'dog-house': {
    id: 'dog-house',
    name: 'The Dog House',
    tagline: 'Sticky wilds in the doghouse',
    backgroundColor: 0x1a3a4a,
    frameOuter: 0xff8c42,
    frameInner: 0xffd34a,
    reelWindowBg: 0x0e2230,
    reelWindowBorder: 0x4a8aaa,
    winCounterColor: '#FFD34A',
    winCounterStroke: '#5a2f00',
    sparklePalette: [0xff8c42, 0xffd34a, 0xffffff, 0x66ccff],
    headerColorClass: 'text-orange-200',
    containerBorderClass: 'border-orange-500/50',
    containerBgClass: 'bg-[#0e2230]',
    icon: 'sparkles',
    jackpotId: 'doghouse',
    wildId: 'dalmatian',
    rules: [
      '5×3 grid. 9 paylines. Pays left → right.',
      'Dalmatian 🐶 is wild — sticky on the reel for the next spin.',
      '5 dog houses on middle row triggers the kennel JACKPOT (180× bet).',
    ],
    symbols: [
      { id: 'card-10', name: '10', color: 0x66ccff, weight: 26, pays: { '3': 1.5, '4': 4, '5': 10 },
        paint: (g, cx, cy) => drawCard(g, cx, cy, '10', 0x3399cc) },
      { id: 'card-j', name: 'J', color: 0x99ff99, weight: 24, pays: { '3': 2, '4': 5, '5': 12 },
        paint: (g, cx, cy) => drawCard(g, cx, cy, 'J', 0x33aa55) },
      { id: 'card-q', name: 'Q', color: 0xff99cc, weight: 22, pays: { '3': 2, '4': 6, '5': 15 },
        paint: (g, cx, cy) => drawCard(g, cx, cy, 'Q', 0xcc3388) },
      { id: 'card-k', name: 'K', color: 0xffcc66, weight: 20, pays: { '3': 2.5, '4': 8, '5': 18 },
        paint: (g, cx, cy) => drawCard(g, cx, cy, 'K', 0xcc8822) },
      { id: 'card-a', name: 'A', color: 0xff6666, weight: 18, pays: { '3': 3, '4': 10, '5': 22 },
        paint: (g, cx, cy) => drawCard(g, cx, cy, 'A', 0xaa2222) },
      { id: 'collar', name: 'Collar', color: 0xff8c42, weight: 12, pays: { '3': 5, '4': 15, '5': 35 },
        paint: (g, cx, cy) => {
          g.lineStyle(8, 0xff8c42, 1).strokeCircle(cx, cy, 22);
          g.fillStyle(0xffd34a, 1).fillCircle(cx, cy + 22, 8);
          g.fillStyle(0x222222, 1).fillCircle(cx, cy + 22, 3);
        } },
      { id: 'bone', name: 'Bone', color: 0xfff5dd, weight: 10, pays: { '3': 6, '4': 18, '5': 45 },
        paint: (g, cx, cy) => {
          g.fillStyle(0xfff5dd, 1);
          g.fillCircle(cx - 22, cy - 14, 9);
          g.fillCircle(cx - 14, cy - 22, 9);
          g.fillCircle(cx + 22, cy + 14, 9);
          g.fillCircle(cx + 14, cy + 22, 9);
          g.fillRoundedRect(cx - 22, cy - 8, 44, 16, 8);
          g.lineStyle(2, 0x999999, 0.6).strokeRoundedRect(cx - 22, cy - 8, 44, 16, 8);
        } },
      { id: 'puppy', name: 'Puppy', color: 0xc99a66, weight: 8, pays: { '3': 8, '4': 25, '5': 60 }, premium: true,
        paint: (g, cx, cy) => {
          // Puppy head
          g.fillStyle(0xc99a66, 1).fillCircle(cx, cy + 4, 22);
          // Floppy ears
          g.fillStyle(0x8a5a28, 1);
          g.fillEllipse(cx - 22, cy + 4, 14, 26);
          g.fillEllipse(cx + 22, cy + 4, 14, 26);
          // Snout
          g.fillStyle(0xfff5dd, 1).fillCircle(cx, cy + 12, 10);
          // Eyes
          g.fillStyle(0x222222, 1).fillCircle(cx - 7, cy - 2, 3);
          g.fillCircle(cx + 7, cy - 2, 3);
          g.fillCircle(cx, cy + 10, 2);
          // Tongue
          g.fillStyle(0xff5577, 1).fillEllipse(cx, cy + 18, 6, 8);
        } },
      { id: 'dalmatian', name: 'Dalmatian (Wild)', color: 0xffffff, weight: 5, pays: { '3': 20, '4': 60, '5': 200 }, premium: true,
        paint: (g, cx, cy) => {
          g.fillStyle(0xffffff, 1).fillCircle(cx, cy + 4, 24);
          // Spots
          g.fillStyle(0x111111, 1);
          g.fillCircle(cx - 10, cy - 8, 4);
          g.fillCircle(cx + 12, cy - 4, 5);
          g.fillCircle(cx - 6, cy + 14, 4);
          g.fillCircle(cx + 8, cy + 18, 3);
          // Ears
          g.fillStyle(0x111111, 1);
          g.fillEllipse(cx - 22, cy + 4, 12, 22);
          g.fillEllipse(cx + 22, cy + 4, 12, 22);
          // Eyes
          g.fillStyle(0x222222, 1).fillCircle(cx - 7, cy - 2, 3);
          g.fillCircle(cx + 7, cy - 2, 3);
          // Wild banner
          g.fillStyle(0xff8c42, 1).fillRect(cx - 22, cy + 24, 44, 8);
        } },
      { id: 'doghouse', name: 'Dog House (Jackpot)', color: 0xff8c42, weight: 4, pays: { '3': 25, '4': 80, '5': 250 }, premium: true,
        paint: (g, cx, cy) => {
          // House
          g.fillStyle(0xff8c42, 1).fillTriangle(cx - 28, cy - 6, cx, cy - 30, cx + 28, cy - 6);
          g.fillStyle(0xc26b22, 1).fillRect(cx - 24, cy - 6, 48, 32);
          // Door (arch)
          g.fillStyle(0x111111, 1).fillRoundedRect(cx - 12, cy + 4, 24, 24, 12);
          // Bone over door
          g.fillStyle(0xfff5dd, 1).fillCircle(cx - 8, cy - 14, 4);
          g.fillCircle(cx + 8, cy - 14, 4);
          g.fillRect(cx - 8, cy - 16, 16, 4);
        } },
    ],
  },

  /* ---------------------- Fire Portals ---------------------- */
  'fire-portals': {
    id: 'fire-portals',
    name: 'Fire Portals',
    tagline: 'Burn through the gates of fortune',
    backgroundColor: 0x1a0606,
    frameOuter: 0xff3300,
    frameInner: 0xffaa00,
    reelWindowBg: 0x0a0202,
    reelWindowBorder: 0xff6622,
    winCounterColor: '#FFAA00',
    winCounterStroke: '#5a1a00',
    sparklePalette: [0xff3300, 0xffaa00, 0xffff66, 0xffffff],
    headerColorClass: 'text-orange-300',
    containerBorderClass: 'border-red-600/60',
    containerBgClass: 'bg-[#0a0202]',
    icon: 'flame',
    jackpotId: 'phoenix',
    wildId: 'flame',
    rules: [
      '5×3 grid. 9 paylines. Pays left → right.',
      'Flame 🔥 is wild — substitutes for any symbol.',
      '5 phoenixes on middle row triggers ASCENSION JACKPOT (250× bet).',
    ],
    symbols: [
      { id: 'card-10', name: '10', color: 0xee5522, weight: 26, pays: { '3': 1.5, '4': 4, '5': 10 },
        paint: (g, cx, cy) => drawCard(g, cx, cy, '10', 0x992211) },
      { id: 'card-j', name: 'J', color: 0xffaa44, weight: 24, pays: { '3': 2, '4': 5, '5': 12 },
        paint: (g, cx, cy) => drawCard(g, cx, cy, 'J', 0xcc6611) },
      { id: 'card-q', name: 'Q', color: 0xffd34a, weight: 22, pays: { '3': 2, '4': 6, '5': 15 },
        paint: (g, cx, cy) => drawCard(g, cx, cy, 'Q', 0xaa7700) },
      { id: 'card-k', name: 'K', color: 0xff6644, weight: 20, pays: { '3': 2.5, '4': 8, '5': 18 },
        paint: (g, cx, cy) => drawCard(g, cx, cy, 'K', 0xcc3322) },
      { id: 'card-a', name: 'A', color: 0xffffff, weight: 18, pays: { '3': 3, '4': 10, '5': 22 },
        paint: (g, cx, cy) => drawCard(g, cx, cy, 'A', 0x771100) },
      { id: 'ember', name: 'Ember', color: 0xff6622, weight: 12, pays: { '3': 5, '4': 15, '5': 35 },
        paint: (g, cx, cy) => {
          g.fillStyle(0xffaa00, 1).fillCircle(cx, cy, 22);
          g.fillStyle(0xff3300, 1).fillCircle(cx, cy + 4, 16);
          g.fillStyle(0xffff66, 1).fillCircle(cx - 4, cy - 4, 6);
        } },
      { id: 'skull', name: 'Skull', color: 0xeeeeee, weight: 10, pays: { '3': 6, '4': 18, '5': 45 },
        paint: (g, cx, cy) => {
          g.fillStyle(0xeeeeee, 1).fillCircle(cx, cy - 4, 22);
          g.fillRect(cx - 14, cy + 8, 28, 16);
          g.fillStyle(0x111111, 1).fillCircle(cx - 8, cy - 2, 5);
          g.fillCircle(cx + 8, cy - 2, 5);
          g.fillTriangle(cx - 3, cy + 8, cx + 3, cy + 8, cx, cy + 14);
          g.fillStyle(0xff3300, 1).fillCircle(cx - 8, cy - 2, 2);
          g.fillCircle(cx + 8, cy - 2, 2);
        } },
      { id: 'flame', name: 'Flame (Wild)', color: 0xff3300, weight: 6, pays: { '3': 12, '4': 30, '5': 90 }, premium: true,
        paint: (g, cx, cy) => {
          g.fillStyle(0xff3300, 1);
          g.fillTriangle(cx, cy - 28, cx - 18, cy + 14, cx + 18, cy + 14);
          g.fillStyle(0xffaa00, 1);
          g.fillTriangle(cx, cy - 18, cx - 12, cy + 12, cx + 12, cy + 12);
          g.fillStyle(0xffff66, 1);
          g.fillTriangle(cx, cy - 8, cx - 6, cy + 10, cx + 6, cy + 10);
          g.fillStyle(0xffffff, 0.9).fillCircle(cx, cy + 6, 4);
        } },
      { id: 'phoenix', name: 'Phoenix (Jackpot)', color: 0xffd34a, weight: 4, pays: { '3': 30, '4': 100, '5': 300 }, premium: true,
        paint: (g, cx, cy) => {
          // Body
          g.fillStyle(0xff3300, 1).fillCircle(cx, cy + 4, 16);
          // Wings
          g.fillStyle(0xff6622, 1);
          g.fillTriangle(cx - 4, cy - 4, cx - 32, cy - 18, cx - 14, cy + 8);
          g.fillTriangle(cx + 4, cy - 4, cx + 32, cy - 18, cx + 14, cy + 8);
          g.fillStyle(0xffaa00, 1);
          g.fillTriangle(cx - 6, cy - 2, cx - 24, cy - 10, cx - 12, cy + 6);
          g.fillTriangle(cx + 6, cy - 2, cx + 24, cy - 10, cx + 12, cy + 6);
          // Crest
          g.fillStyle(0xffd34a, 1).fillTriangle(cx, cy - 24, cx - 8, cy - 4, cx + 8, cy - 4);
          g.fillStyle(0x222222, 1).fillCircle(cx - 4, cy + 2, 2);
          g.fillStyle(0xffaa00, 1).fillTriangle(cx + 8, cy + 4, cx + 16, cy + 6, cx + 8, cy + 8);
        } },
    ],
  },

  /* ---------------------- Fruit Party ---------------------- */
  'fruit-party': {
    id: 'fruit-party',
    name: 'Fruit Party',
    tagline: 'Juicy cluster wins on a tropical grid',
    backgroundColor: 0x163d2a,
    frameOuter: 0x66ff99,
    frameInner: 0xffd34a,
    reelWindowBg: 0x0a2418,
    reelWindowBorder: 0x44cc77,
    winCounterColor: '#FFE66B',
    winCounterStroke: '#1a4422',
    sparklePalette: [0xff6699, 0xffd34a, 0x66ffaa, 0xffffff],
    headerColorClass: 'text-lime-200',
    containerBorderClass: 'border-emerald-500/50',
    containerBgClass: 'bg-[#0a2418]',
    icon: 'cherry',
    jackpotId: 'pineapple',
    rules: [
      '5×3 grid. 9 paylines. Pays left → right.',
      'Pineapple 🍍 is the highest-paying fruit.',
      '5 pineapples on middle row triggers TROPICAL JACKPOT (200× bet).',
    ],
    symbols: [
      { id: 'cherry', name: 'Cherry', color: 0xff2266, weight: 24, pays: { '3': 2, '4': 5, '5': 12 },
        paint: (g, cx, cy) => {
          g.lineStyle(3, 0x228822, 1).beginPath();
          g.moveTo(cx, cy - 30).lineTo(cx - 10, cy - 38).lineTo(cx - 12, cy - 5);
          g.strokePath();
          g.fillStyle(0xff2266, 1).fillCircle(cx - 14, cy + 14, 18);
          g.fillStyle(0xff66aa, 1).fillCircle(cx - 19, cy + 9, 5);
          g.fillStyle(0xff2266, 1).fillCircle(cx + 14, cy + 16, 16);
        } },
      { id: 'lemon', name: 'Lemon', color: 0xffee44, weight: 22, pays: { '3': 2, '4': 6, '5': 14 },
        paint: (g, cx, cy) => {
          g.fillStyle(0xffee44, 1).fillEllipse(cx, cy + 4, 50, 36);
          g.fillStyle(0xfff299, 1).fillEllipse(cx - 6, cy - 2, 24, 14);
          g.fillStyle(0x88aa22, 1).fillTriangle(cx + 18, cy - 18, cx + 26, cy - 22, cx + 22, cy - 12);
        } },
      { id: 'orange', name: 'Orange', color: 0xff8822, weight: 20, pays: { '3': 2.5, '4': 8, '5': 18 },
        paint: (g, cx, cy) => {
          g.fillStyle(0xff8822, 1).fillCircle(cx, cy + 4, 26);
          g.fillStyle(0xffaa55, 1).fillCircle(cx - 6, cy - 2, 12);
          g.fillStyle(0x228822, 1).fillEllipse(cx + 14, cy - 18, 14, 8);
        } },
      { id: 'plum', name: 'Plum', color: 0x8844cc, weight: 18, pays: { '3': 3, '4': 10, '5': 22 },
        paint: (g, cx, cy) => {
          g.fillStyle(0x6622aa, 1).fillCircle(cx, cy + 4, 26);
          g.fillStyle(0x9955dd, 1).fillCircle(cx - 6, cy - 4, 12);
          g.fillStyle(0x228822, 1).fillTriangle(cx, cy - 22, cx - 6, cy - 30, cx + 6, cy - 30);
        } },
      { id: 'watermelon', name: 'Watermelon', color: 0xff5577, weight: 14, pays: { '3': 4, '4': 14, '5': 32 },
        paint: (g, cx, cy) => {
          g.fillStyle(0x55aa44, 1);
          g.beginPath();
          g.arc(cx, cy, 28, Math.PI, 0, false);
          g.closePath();
          g.fillPath();
          g.fillStyle(0xff5577, 1);
          g.beginPath();
          g.arc(cx, cy, 22, Math.PI, 0, false);
          g.closePath();
          g.fillPath();
          g.fillStyle(0x111111, 1);
          g.fillCircle(cx - 10, cy - 6, 2);
          g.fillCircle(cx + 4, cy - 10, 2);
          g.fillCircle(cx + 12, cy - 4, 2);
        } },
      { id: 'grape', name: 'Grape', color: 0x8822cc, weight: 12, pays: { '3': 5, '4': 16, '5': 38 },
        paint: (g, cx, cy) => {
          const positions: Array<[number, number]> = [
            [cx, cy - 10], [cx - 11, cy], [cx + 11, cy],
            [cx - 6, cy + 12], [cx + 6, cy + 12], [cx, cy + 22],
          ];
          positions.forEach(([px, py]) => {
            g.fillStyle(0x6611aa, 1).fillCircle(px, py, 11);
            g.fillStyle(0x9933cc, 1).fillCircle(px - 3, py - 3, 4);
          });
        } },
      { id: 'strawberry', name: 'Strawberry', color: 0xff3344, weight: 10, pays: { '3': 7, '4': 22, '5': 55 }, premium: true,
        paint: (g, cx, cy) => {
          g.fillStyle(0xff3344, 1);
          g.fillTriangle(cx - 24, cy - 4, cx + 24, cy - 4, cx, cy + 26);
          g.fillStyle(0x44aa44, 1);
          g.fillTriangle(cx - 18, cy - 8, cx + 18, cy - 8, cx, cy - 22);
          g.fillTriangle(cx - 22, cy - 4, cx - 6, cy - 4, cx - 14, cy + 6);
          g.fillStyle(0xffd34a, 1);
          g.fillCircle(cx - 6, cy + 4, 1.5);
          g.fillCircle(cx + 6, cy + 8, 1.5);
          g.fillCircle(cx, cy + 14, 1.5);
          g.fillCircle(cx - 10, cy + 12, 1.5);
        } },
      { id: 'pineapple', name: 'Pineapple (Jackpot)', color: 0xffcc44, weight: 4, pays: { '3': 25, '4': 80, '5': 250 }, premium: true,
        paint: (g, cx, cy) => {
          // Leaves
          g.fillStyle(0x44aa44, 1);
          g.fillTriangle(cx - 12, cy - 12, cx - 4, cy - 30, cx, cy - 12);
          g.fillTriangle(cx, cy - 12, cx, cy - 32, cx + 4, cy - 12);
          g.fillTriangle(cx + 4, cy - 12, cx + 12, cy - 26, cx + 12, cy - 12);
          // Body
          g.fillStyle(0xffcc44, 1).fillEllipse(cx, cy + 8, 36, 40);
          // Diamond pattern
          g.lineStyle(1, 0xaa6622, 0.8);
          for (let i = -2; i <= 2; i++) {
            g.lineBetween(cx - 16, cy + i * 8, cx + 16, cy + i * 8);
          }
          for (let i = -2; i <= 2; i++) {
            g.lineBetween(cx + i * 8, cy - 8, cx + i * 8 + 12, cy + 24);
          }
        } },
    ],
  },

  /* ---------------------- Starlight Princess (Starlight) ---------------------- */
  starlight: {
    id: 'starlight',
    name: 'Starlight',
    tagline: 'Cosmic gems & stardust multipliers',
    backgroundColor: 0x0d0822,
    frameOuter: 0xcc66ff,
    frameInner: 0x66ddff,
    reelWindowBg: 0x07041a,
    reelWindowBorder: 0x9966ff,
    winCounterColor: '#FFC4FF',
    winCounterStroke: '#3a0a55',
    sparklePalette: [0xcc66ff, 0x66ddff, 0xffffff, 0xffd34a],
    headerColorClass: 'text-purple-200',
    containerBorderClass: 'border-purple-500/50',
    containerBgClass: 'bg-[#07041a]',
    icon: 'star',
    jackpotId: 'crown',
    wildId: 'star',
    paintAmbient: (scene, g, w, h) => {
      // Twinkling stars background
      for (let i = 0; i < 80; i++) {
        const x = (i * 53.7) % w;
        const y = (i * 31.3) % h;
        const size = 1 + (i % 3);
        const colors = [0xffffff, 0xcc66ff, 0x66ddff];
        g.fillStyle(colors[i % 3], 0.6 + (i % 4) * 0.1);
        g.fillCircle(x, y, size);
      }
      void scene;
    },
    rules: [
      '5×3 grid. 9 paylines. Pays left → right.',
      'Star ✨ is wild and substitutes for any gem.',
      '5 crowns on middle row triggers CELESTIAL JACKPOT (220× bet).',
    ],
    symbols: [
      { id: 'gem-blue', name: 'Sapphire', color: 0x3366ff, weight: 24, pays: { '3': 1.5, '4': 4, '5': 10 },
        paint: (g, cx, cy) => {
          g.fillStyle(0x3366ff, 1);
          g.fillPoints(starPoints(cx, cy, 24, 12, 4), true);
          g.fillStyle(0xaaccff, 1);
          g.fillPoints(starPoints(cx, cy - 4, 10, 5, 4), true);
        } },
      { id: 'gem-purple', name: 'Amethyst', color: 0xaa44dd, weight: 22, pays: { '3': 2, '4': 5, '5': 12 },
        paint: (g, cx, cy) => {
          g.fillStyle(0xaa44dd, 1).fillPoints(polygonPoints(cx, cy, 24, 6, Math.PI / 6), true);
          g.fillStyle(0xddaaff, 1).fillPoints(polygonPoints(cx, cy - 4, 10, 6, Math.PI / 6), true);
        } },
      { id: 'gem-pink', name: 'Rose Quartz', color: 0xff66bb, weight: 20, pays: { '3': 2, '4': 6, '5': 15 },
        paint: (g, cx, cy) => {
          g.fillStyle(0xff66bb, 1).fillCircle(cx, cy, 22);
          g.fillStyle(0xffaadd, 1).fillCircle(cx - 6, cy - 6, 8);
          g.lineStyle(2, 0xffffff, 0.8).strokeCircle(cx, cy, 22);
        } },
      { id: 'gem-green', name: 'Emerald', color: 0x44dd88, weight: 18, pays: { '3': 2.5, '4': 8, '5': 18 },
        paint: (g, cx, cy) => {
          g.fillStyle(0x44dd88, 1).fillRoundedRect(cx - 18, cy - 22, 36, 44, 4);
          g.fillStyle(0x99ffcc, 1).fillRect(cx - 12, cy - 16, 8, 8);
          g.lineStyle(2, 0xffffff, 0.6).strokeRoundedRect(cx - 18, cy - 22, 36, 44, 4);
        } },
      { id: 'gem-orange', name: 'Topaz', color: 0xffaa33, weight: 14, pays: { '3': 4, '4': 12, '5': 28 },
        paint: (g, cx, cy) => {
          g.fillStyle(0xffaa33, 1).fillPoints([
            new Phaser.Math.Vector2(cx, cy - 26),
            new Phaser.Math.Vector2(cx + 22, cy - 8),
            new Phaser.Math.Vector2(cx + 18, cy + 22),
            new Phaser.Math.Vector2(cx - 18, cy + 22),
            new Phaser.Math.Vector2(cx - 22, cy - 8),
          ], true);
          g.fillStyle(0xffe6b3, 1).fillPoints([
            new Phaser.Math.Vector2(cx, cy - 18),
            new Phaser.Math.Vector2(cx + 12, cy - 4),
            new Phaser.Math.Vector2(cx, cy + 4),
            new Phaser.Math.Vector2(cx - 12, cy - 4),
          ], true);
        } },
      { id: 'gem-red', name: 'Ruby', color: 0xff3344, weight: 12, pays: { '3': 5, '4': 16, '5': 40 }, premium: true,
        paint: (g, cx, cy) => {
          g.fillStyle(0xff3344, 1);
          g.fillPoints([
            new Phaser.Math.Vector2(cx, cy - 26),
            new Phaser.Math.Vector2(cx + 24, cy - 4),
            new Phaser.Math.Vector2(cx + 18, cy + 24),
            new Phaser.Math.Vector2(cx - 18, cy + 24),
            new Phaser.Math.Vector2(cx - 24, cy - 4),
          ], true);
          g.fillStyle(0xff99aa, 1).fillTriangle(cx - 12, cy - 8, cx + 12, cy - 8, cx, cy - 22);
        } },
      { id: 'star', name: 'Star (Wild)', color: 0xffffff, weight: 8, pays: { '3': 10, '4': 30, '5': 100 }, premium: true,
        paint: (g, cx, cy) => {
          g.fillStyle(0xffffff, 1).fillPoints(starPoints(cx, cy, 28, 12, 5), true);
          g.fillStyle(0xcc66ff, 1).fillPoints(starPoints(cx, cy, 14, 6, 5), true);
        } },
      { id: 'crown', name: 'Crown (Jackpot)', color: 0xffd34a, weight: 4, pays: { '3': 30, '4': 100, '5': 300 }, premium: true,
        paint: (g, cx, cy) => {
          g.fillStyle(0xffd34a, 1);
          g.fillPoints([
            new Phaser.Math.Vector2(cx - 28, cy + 18),
            new Phaser.Math.Vector2(cx - 28, cy - 8),
            new Phaser.Math.Vector2(cx - 16, cy + 4),
            new Phaser.Math.Vector2(cx - 6, cy - 16),
            new Phaser.Math.Vector2(cx + 6, cy - 16),
            new Phaser.Math.Vector2(cx + 16, cy + 4),
            new Phaser.Math.Vector2(cx + 28, cy - 8),
            new Phaser.Math.Vector2(cx + 28, cy + 18),
          ], true);
          // Gems on crown
          g.fillStyle(0xff3344, 1).fillCircle(cx, cy + 8, 4);
          g.fillStyle(0x44ddff, 1).fillCircle(cx - 14, cy + 10, 3);
          g.fillStyle(0x44ff88, 1).fillCircle(cx + 14, cy + 10, 3);
          // Base
          g.fillStyle(0xc77b32, 1).fillRect(cx - 28, cy + 16, 56, 6);
        } },
    ],
  },

  /* ---------------------- Sugar Rush ---------------------- */
  'sugar-rush': {
    id: 'sugar-rush',
    name: 'Sugar Rush',
    tagline: 'Sweet candy crush cluster wins',
    backgroundColor: 0x4a1a3a,
    frameOuter: 0xff66cc,
    frameInner: 0xffe6f7,
    reelWindowBg: 0x2a0a22,
    reelWindowBorder: 0xff99dd,
    winCounterColor: '#FFB3E6',
    winCounterStroke: '#5a1a3a',
    sparklePalette: [0xff66cc, 0xff99dd, 0xffd34a, 0xffffff],
    headerColorClass: 'text-pink-200',
    containerBorderClass: 'border-pink-500/50',
    containerBgClass: 'bg-[#2a0a22]',
    icon: 'candy',
    wildId: 'wild',
    jackpotId: 'lollipop',
    rules: [
      '5×3 grid. 9 paylines. Pays left → right.',
      'Rainbow swirl 🌀 is wild — substitutes for any candy.',
      '5 lollipops on middle row triggers SUGAR JACKPOT (300× bet).',
    ],
    symbols: [
      { id: 'gummy', name: 'Gummy Bear', color: 0xff8866, weight: 24, pays: { '3': 1.5, '4': 4, '5': 10 },
        imageUrl: sugarRushGummy,
        paint: (g, cx, cy) => { g.fillStyle(0xff8866, 1).fillEllipse(cx, cy, 38, 26); } },
      { id: 'donut', name: 'Donut', color: 0xff66cc, weight: 22, pays: { '3': 2, '4': 5, '5': 12 },
        imageUrl: sugarRushDonut,
        paint: (g, cx, cy) => { g.fillStyle(0xff66cc, 1).fillCircle(cx, cy, 26); } },
      { id: 'chocolate', name: 'Chocolate', color: 0x8a5a28, weight: 20, pays: { '3': 2, '4': 6, '5': 15 },
        imageUrl: sugarRushChocolate,
        paint: (g, cx, cy) => { g.fillStyle(0x8a5a28, 1).fillRoundedRect(cx - 22, cy - 22, 44, 44, 6); } },
      { id: 'cake', name: 'Strawberry Cake', color: 0xff99cc, weight: 18, pays: { '3': 2.5, '4': 8, '5': 18 },
        imageUrl: sugarRushCake,
        paint: (g, cx, cy) => { g.fillStyle(0xffccdd, 1).fillRect(cx - 22, cy - 16, 44, 32); g.fillStyle(0xff4488, 1).fillCircle(cx - 12, cy - 18, 8); } },
      { id: 'icecream', name: 'Ice Cream', color: 0xff99dd, weight: 14, pays: { '3': 4, '4': 12, '5': 28 },
        imageUrl: sugarRushIcecream,
        paint: (g, cx, cy) => { g.fillStyle(0xff99dd, 1).fillCircle(cx, cy - 8, 20); g.fillStyle(0xffccaa, 1).fillTriangle(cx - 16, cy + 4, cx + 16, cy + 4, cx, cy + 28); } },
      { id: 'heart', name: 'Heart Gem', color: 0xff33cc, weight: 12, pays: { '3': 5, '4': 16, '5': 40 }, premium: true,
        imageUrl: sugarRushHeart,
        paint: (g, cx, cy) => { g.fillStyle(0xff33cc, 1); g.fillCircle(cx - 10, cy - 8, 12); g.fillCircle(cx + 10, cy - 8, 12); g.fillTriangle(cx - 22, cy - 4, cx + 22, cy - 4, cx, cy + 22); } },
      { id: 'star', name: 'Golden Star', color: 0xffd34a, weight: 8, pays: { '3': 8, '4': 22, '5': 60 }, premium: true,
        imageUrl: sugarRushStar,
        paint: (g, cx, cy) => { g.fillStyle(0xffd34a, 1); g.fillTriangle(cx, cy - 24, cx - 22, cy + 16, cx + 22, cy + 16); g.fillTriangle(cx, cy + 24, cx - 22, cy - 8, cx + 22, cy - 8); } },
      { id: 'wild', name: 'Rainbow Swirl (Wild)', color: 0xff66ff, weight: 5, pays: { '3': 12, '4': 35, '5': 100 }, premium: true,
        imageUrl: sugarRushWild,
        paint: (g, cx, cy) => { g.fillStyle(0xff66ff, 1).fillCircle(cx, cy, 24); g.fillStyle(0xffd34a, 1).fillCircle(cx, cy, 16); g.fillStyle(0x66ccff, 1).fillCircle(cx, cy, 8); } },
      { id: 'lollipop', name: 'Lollipop (Jackpot)', color: 0xff66cc, weight: 4, pays: { '3': 30, '4': 100, '5': 300 }, premium: true,
        imageUrl: sugarRushLollipop,
        paint: (g, cx, cy) => { g.fillStyle(0xffffff, 1).fillRect(cx - 2, cy + 2, 4, 28); g.fillStyle(0xff66cc, 1).fillCircle(cx, cy - 4, 24); g.fillStyle(0xffffff, 1).fillCircle(cx, cy - 4, 12); } },
    ],
  },

  /* ---------------------- Wild West Gold ---------------------- */
  'wild-west-gold': {
    id: 'wild-west-gold',
    name: 'Wild West Gold',
    tagline: 'Bandits, bullets & bountiful loot',
    backgroundColor: 0x3a2418,
    frameOuter: 0xc77b32,
    frameInner: 0xffd34a,
    reelWindowBg: 0x1f1208,
    reelWindowBorder: 0x8a5a28,
    winCounterColor: '#FFD34A',
    winCounterStroke: '#3a1a08',
    sparklePalette: [0xffd34a, 0xc77b32, 0xff8855, 0xffffff],
    headerColorClass: 'text-amber-200',
    containerBorderClass: 'border-amber-700/60',
    containerBgClass: 'bg-[#1f1208]',
    icon: 'zap',
    jackpotId: 'sheriff',
    wildId: 'pistol',
    rules: [
      '5×3 grid. 9 paylines. Pays left → right.',
      'Pistol 🔫 is wild — substitutes for any symbol.',
      '5 sheriffs on middle row triggers BOUNTY JACKPOT (250× bet).',
    ],
    symbols: [
      { id: 'card-10', name: '10', color: 0x88aaff, weight: 26, pays: { '3': 1.5, '4': 4, '5': 10 },
        paint: (g, cx, cy) => drawCard(g, cx, cy, '10', 0x4477cc) },
      { id: 'card-j', name: 'J', color: 0xff9966, weight: 24, pays: { '3': 2, '4': 5, '5': 12 },
        paint: (g, cx, cy) => drawCard(g, cx, cy, 'J', 0xcc5522) },
      { id: 'card-q', name: 'Q', color: 0xff77aa, weight: 22, pays: { '3': 2, '4': 6, '5': 15 },
        paint: (g, cx, cy) => drawCard(g, cx, cy, 'Q', 0xaa3377) },
      { id: 'card-k', name: 'K', color: 0xffd34a, weight: 20, pays: { '3': 2.5, '4': 8, '5': 18 },
        paint: (g, cx, cy) => drawCard(g, cx, cy, 'K', 0x886622) },
      { id: 'card-a', name: 'A', color: 0xff5544, weight: 18, pays: { '3': 3, '4': 10, '5': 22 },
        paint: (g, cx, cy) => drawCard(g, cx, cy, 'A', 0xaa2222) },
      { id: 'horseshoe', name: 'Horseshoe', color: 0xc0c0c0, weight: 12, pays: { '3': 5, '4': 15, '5': 35 },
        paint: (g, cx, cy) => {
          g.lineStyle(8, 0xc0c0c0, 1);
          g.beginPath();
          g.arc(cx, cy + 4, 22, Math.PI, 0, false);
          g.lineTo(cx - 22, cy + 22);
          g.moveTo(cx + 22, cy + 4);
          g.lineTo(cx + 22, cy + 22);
          g.strokePath();
          g.fillStyle(0x444444, 1);
          for (let i = 0; i < 5; i++) {
            g.fillCircle(cx - 16 + i * 8, cy + 16, 1.5);
          }
        } },
      { id: 'whisky', name: 'Whisky', color: 0xc77b32, weight: 10, pays: { '3': 6, '4': 18, '5': 45 },
        paint: (g, cx, cy) => {
          g.fillStyle(0x6b3e1f, 1).fillRect(cx - 14, cy - 16, 28, 36);
          g.fillStyle(0xc77b32, 1).fillRect(cx - 14, cy - 4, 28, 24);
          g.fillStyle(0xffd34a, 1).fillRect(cx - 12, cy + 4, 24, 12);
          g.fillStyle(0xeeeeee, 1).fillRect(cx - 12, cy - 14, 24, 8);
          g.lineStyle(1, 0x111111, 0.6).strokeRect(cx - 14, cy - 16, 28, 36);
        } },
      { id: 'pistol', name: 'Pistol (Wild)', color: 0xc0c0c0, weight: 6, pays: { '3': 12, '4': 35, '5': 100 }, premium: true,
        paint: (g, cx, cy) => {
          // Barrel
          g.fillStyle(0x666666, 1).fillRect(cx - 24, cy - 8, 38, 10);
          // Front sight
          g.fillRect(cx + 10, cy - 14, 4, 6);
          // Grip
          g.fillStyle(0x6b3e1f, 1).fillTriangle(cx - 24, cy + 2, cx - 8, cy + 2, cx - 18, cy + 22);
          // Trigger guard
          g.lineStyle(3, 0x666666, 1).strokeCircle(cx - 14, cy + 6, 6);
          // Star sheriff badge
          g.fillStyle(0xffd34a, 1).fillPoints(starPoints(cx + 18, cy + 10, 8, 4, 5), true);
        } },
      { id: 'sheriff', name: 'Sheriff (Jackpot)', color: 0xffd34a, weight: 4, pays: { '3': 30, '4': 100, '5': 300 }, premium: true,
        paint: (g, cx, cy) => {
          // Hat
          g.fillStyle(0x6b3e1f, 1);
          g.fillEllipse(cx, cy - 18, 44, 8);
          g.fillRoundedRect(cx - 16, cy - 26, 32, 12, 4);
          // Face
          g.fillStyle(0xddaa88, 1).fillCircle(cx, cy + 2, 18);
          // Mustache
          g.fillStyle(0x442211, 1);
          g.fillEllipse(cx - 8, cy + 8, 12, 4);
          g.fillEllipse(cx + 8, cy + 8, 12, 4);
          // Eyes
          g.fillStyle(0x111111, 1).fillCircle(cx - 6, cy - 2, 2);
          g.fillCircle(cx + 6, cy - 2, 2);
          // Star badge below
          g.fillStyle(0xffd34a, 1).fillPoints(starPoints(cx, cy + 26, 10, 5, 5), true);
          g.fillStyle(0x6b3e1f, 1).fillCircle(cx, cy + 26, 3);
        } },
    ],
  },

  /* ---------------------- Zeus vs Hades ---------------------- */
  'zeus-vs-hades': {
    id: 'zeus-vs-hades',
    name: 'Zeus vs Hades',
    tagline: 'Olympus & Underworld collide',
    backgroundColor: 0x0a0818,
    frameOuter: 0x66ccff,
    frameInner: 0xff3322,
    reelWindowBg: 0x040308,
    reelWindowBorder: 0xaaaaff,
    winCounterColor: '#FFEE99',
    winCounterStroke: '#3a1a00',
    sparklePalette: [0x66ccff, 0xff3322, 0xffd34a, 0xffffff],
    headerColorClass: 'text-cyan-200',
    containerBorderClass: 'border-blue-500/50',
    containerBgClass: 'bg-[#040308]',
    icon: 'zap',
    jackpotId: 'zeus',
    wildId: 'lightning',
    paintAmbient: (scene, g, w, h) => {
      // Top half blue glow (Zeus), bottom red glow (Hades)
      g.fillStyle(0x1133aa, 0.18).fillRect(0, 0, w, h / 2);
      g.fillStyle(0xaa1122, 0.18).fillRect(0, h / 2, w, h / 2);
      // Static lightning bolts
      for (let i = 0; i < 6; i++) {
        const x = (i * 97) % w;
        g.lineStyle(2, 0x66ccff, 0.4);
        g.beginPath();
        g.moveTo(x, 0);
        g.lineTo(x + 8, h * 0.25);
        g.lineTo(x - 4, h * 0.4);
        g.strokePath();
      }
      void scene;
    },
    rules: [
      '5×3 grid. 9 paylines. Pays left → right.',
      'Lightning ⚡ is wild — substitutes for any symbol.',
      '5 zeus on middle row triggers OLYMPIAN JACKPOT (300× bet).',
    ],
    symbols: [
      { id: 'card-10', name: '10', color: 0x6699ff, weight: 26, pays: { '3': 1.5, '4': 4, '5': 10 },
        paint: (g, cx, cy) => drawCard(g, cx, cy, '10', 0x3366cc) },
      { id: 'card-j', name: 'J', color: 0xff8866, weight: 24, pays: { '3': 2, '4': 5, '5': 12 },
        paint: (g, cx, cy) => drawCard(g, cx, cy, 'J', 0xcc4422) },
      { id: 'card-q', name: 'Q', color: 0xee66bb, weight: 22, pays: { '3': 2, '4': 6, '5': 15 },
        paint: (g, cx, cy) => drawCard(g, cx, cy, 'Q', 0xaa2266) },
      { id: 'card-k', name: 'K', color: 0xffd34a, weight: 20, pays: { '3': 2.5, '4': 8, '5': 18 },
        paint: (g, cx, cy) => drawCard(g, cx, cy, 'K', 0x886622) },
      { id: 'card-a', name: 'A', color: 0xff4444, weight: 18, pays: { '3': 3, '4': 10, '5': 22 },
        paint: (g, cx, cy) => drawCard(g, cx, cy, 'A', 0xaa1133) },
      { id: 'helmet', name: 'Spartan Helmet', color: 0xc0c0c0, weight: 12, pays: { '3': 5, '4': 15, '5': 35 },
        paint: (g, cx, cy) => {
          g.fillStyle(0xc0c0c0, 1);
          g.fillCircle(cx, cy, 22);
          g.fillRect(cx - 22, cy - 4, 44, 18);
          g.fillStyle(0xff3322, 1);
          g.fillTriangle(cx - 8, cy - 22, cx + 8, cy - 22, cx, cy - 32);
          g.fillRect(cx - 4, cy - 28, 8, 10);
          g.fillStyle(0x222222, 1);
          g.fillRect(cx - 14, cy + 2, 8, 6);
          g.fillRect(cx + 6, cy + 2, 8, 6);
        } },
      { id: 'cerberus', name: 'Cerberus', color: 0xaa3322, weight: 10, pays: { '3': 6, '4': 18, '5': 45 },
        paint: (g, cx, cy) => {
          g.fillStyle(0x442211, 1);
          g.fillCircle(cx - 18, cy + 4, 14);
          g.fillCircle(cx, cy - 4, 16);
          g.fillCircle(cx + 18, cy + 4, 14);
          g.fillStyle(0xff3322, 1);
          g.fillCircle(cx - 18, cy + 4, 3);
          g.fillCircle(cx, cy - 4, 3);
          g.fillCircle(cx + 18, cy + 4, 3);
          g.fillStyle(0x222222, 1);
          g.fillTriangle(cx - 22, cy - 4, cx - 18, cy - 14, cx - 14, cy - 4);
          g.fillTriangle(cx - 4, cy - 14, cx, cy - 22, cx + 4, cy - 14);
          g.fillTriangle(cx + 14, cy - 4, cx + 18, cy - 14, cx + 22, cy - 4);
        } },
      { id: 'lightning', name: 'Lightning (Wild)', color: 0x66ccff, weight: 6, pays: { '3': 12, '4': 35, '5': 100 }, premium: true,
        paint: (g, cx, cy) => {
          g.fillStyle(0x66ccff, 1);
          g.fillPoints([
            new Phaser.Math.Vector2(cx - 4, cy - 28),
            new Phaser.Math.Vector2(cx + 14, cy - 4),
            new Phaser.Math.Vector2(cx + 4, cy - 4),
            new Phaser.Math.Vector2(cx + 14, cy + 28),
            new Phaser.Math.Vector2(cx - 12, cy + 4),
            new Phaser.Math.Vector2(cx, cy + 4),
            new Phaser.Math.Vector2(cx - 14, cy - 22),
          ], true);
          g.fillStyle(0xffffff, 0.85);
          g.fillPoints([
            new Phaser.Math.Vector2(cx - 2, cy - 22),
            new Phaser.Math.Vector2(cx + 8, cy - 4),
            new Phaser.Math.Vector2(cx, cy - 4),
            new Phaser.Math.Vector2(cx + 8, cy + 18),
            new Phaser.Math.Vector2(cx - 6, cy + 2),
            new Phaser.Math.Vector2(cx - 6, cy - 16),
          ], true);
        } },
      { id: 'zeus', name: 'Zeus (Jackpot)', color: 0xffeeaa, weight: 4, pays: { '3': 35, '4': 120, '5': 400 }, premium: true,
        paint: (g, cx, cy) => {
          // Hair / beard
          g.fillStyle(0xeeeeee, 1).fillCircle(cx, cy - 4, 22);
          g.fillEllipse(cx, cy + 14, 30, 18);
          // Face
          g.fillStyle(0xddaa88, 1).fillCircle(cx, cy - 2, 14);
          // Eyes
          g.fillStyle(0x66ccff, 1).fillCircle(cx - 5, cy - 4, 2.5);
          g.fillCircle(cx + 5, cy - 4, 2.5);
          // Crown / laurel
          g.fillStyle(0xffd34a, 1);
          g.fillTriangle(cx - 18, cy - 14, cx - 12, cy - 22, cx - 10, cy - 14);
          g.fillTriangle(cx - 6, cy - 18, cx, cy - 26, cx + 6, cy - 18);
          g.fillTriangle(cx + 10, cy - 14, cx + 12, cy - 22, cx + 18, cy - 14);
          // Lightning bolt accent
          g.fillStyle(0x66ccff, 1);
          g.fillPoints([
            new Phaser.Math.Vector2(cx + 18, cy + 18),
            new Phaser.Math.Vector2(cx + 24, cy + 18),
            new Phaser.Math.Vector2(cx + 18, cy + 26),
            new Phaser.Math.Vector2(cx + 22, cy + 26),
            new Phaser.Math.Vector2(cx + 16, cy + 32),
          ], true);
        } },
    ],
  },
};

import { EXTRA_THEME_MAP } from './themes.extra';



/* ===================== AUTO-THEME FALLBACK ===================== */
// Ensures getTheme() NEVER returns undefined for any slot slug.
// Generates a deterministic, playable theme from the slug hash.

function _slugToHex(slug: string): number {
  let h = 5381;
  for (let i = 0; i < slug.length; i++) h = ((h << 5) + h + slug.charCodeAt(i)) >>> 0;
  return (h & 0xffffff) | 0x303030; // ensure not too dark
}

function _buildAutoSymbols(primary: number, secondary: number): ThemeSymbol[] {
  const tints = [0xc0392b, 0xf39c12, 0x27ae60, 0x2980b9, primary, secondary, 0xffd700, 0xff3366];
  const ids = ['ten', 'jack', 'queen', 'king', 'ace', 'gem', 'special', 'wild'];
  const names = ['10', 'J', 'Q', 'K', 'A', 'Gem', 'Special', 'Wild'];
  const weights = [22, 20, 18, 16, 14, 8, 4, 6];
  const pays = [
    { '3': 0.5, '4': 1.5, '5': 4 },
    { '3': 0.5, '4': 1.5, '5': 4 },
    { '3': 0.8, '4': 2.0, '5': 6 },
    { '3': 0.8, '4': 2.0, '5': 6 },
    { '3': 1.0, '4': 3.0, '5': 10 },
    { '3': 1.5, '4': 5.0, '5': 20 },
    { '3': 5.0, '4': 20.0, '5': 100 },
    { '3': 2.0, '4': 8.0, '5': 25 },
  ];
  return ids.map((id, i) => ({
    id,
    name: names[i],
    color: tints[i],
    weight: weights[i],
    pays: pays[i],
    premium: i >= 6,
    paint: (g, cx, cy, size) => {
      const R = size * 0.38;
      // shadow
      g.fillStyle(0x000000, 0.30);
      g.fillCircle(cx + 3, cy + 4, R);
      // base
      g.fillStyle(tints[i], 1);
      g.fillCircle(cx, cy, R);
      // outline
      g.lineStyle(2.5, 0x000000, 0.9);
      g.strokeCircle(cx, cy, R);
      // inner bevel
      g.fillStyle(0xffffff, 0.18);
      g.fillCircle(cx, cy - R * 0.15, R * 0.65);
      // specular
      g.fillStyle(0xffffff, 0.55);
      g.fillEllipse(cx - R * 0.3, cy - R * 0.45, R * 0.5, R * 0.25);
      // letter / glyph
      // (text drawn separately by scene)
    },
  }));
}

function makeAutoTheme(slug: string): SlotTheme {
  const primary = _slugToHex(slug);
  const secondary = _slugToHex(slug + '_s');
  const name = slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  return {
    id: slug,
    name,
    tagline: 'Spin & Win',
    backgroundColor: 0x0d0d18,
    frameOuter: primary,
    frameInner: secondary,
    reelWindowBg: 0x111122,
    reelWindowBorder: primary,
    winCounterColor: '#' + primary.toString(16).padStart(6, '0'),
    winCounterStroke: '#000000',
    sparklePalette: [primary, secondary, 0xffd700, 0xffffff],
    wildId: 'wild',
    jackpotId: 'special',
    headerColorClass: 'text-yellow-200',
    containerBorderClass: 'border-yellow-500/40',
    containerBgClass: 'bg-[#0d0d18]',
    icon: 'sparkles',
    rules: [
      '5 reels x 3 rows. 9 fixed paylines. Pays left to right.',
      'Wild substitutes for all symbols.',
      '5 specials on middle row = JACKPOT (200x bet).',
    ],
    symbols: _buildAutoSymbols(primary, secondary),
  };
}

export function getTheme(id: string): SlotTheme {
  return THEMES[id] ?? EXTRA_THEME_MAP[id] ?? makeAutoTheme(id);
}

export const THEME_IDS = [...Object.keys(THEMES), ...Object.keys(EXTRA_THEME_MAP)];
