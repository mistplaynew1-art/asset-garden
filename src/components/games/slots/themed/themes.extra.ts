/**
 * Extra theme registry — built from a compact factory so every remaining
 * slot ID gets a unique palette, frame, sparkle palette, jackpot and wild
 * without duplicating the long per-symbol painter blocks from themes.ts.
 *
 * Symbol painters here lean on a small set of generic shape primitives
 * (gems, runes, glyphs, animals) tinted per-theme. Each theme overrides 1–2
 * "hero" symbols with a unique procedural drawing for character.
 */
import * as Phaser from 'phaser';
import type { SlotTheme, ThemeSymbol } from './themes';

/* ----------------------------- generic painters --------------------------- */

const polygon = (cx: number, cy: number, radius: number, sides: number, rot = 0) => {
  const pts: Phaser.Math.Vector2[] = [];
  for (let i = 0; i < sides; i++) {
    const a = (Math.PI * 2 * i) / sides + rot;
    pts.push(new Phaser.Math.Vector2(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius));
  }
  return pts;
};

const star = (cx: number, cy: number, outer: number, inner: number, points = 5) => {
  const pts: Phaser.Math.Vector2[] = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI / points) * i - Math.PI / 2;
    pts.push(new Phaser.Math.Vector2(cx + Math.cos(a) * r, cy + Math.sin(a) * r));
  }
  return pts;
};

const card = (g: Phaser.GameObjects.Graphics, cx: number, cy: number, accent: number) => {
  g.fillStyle(0xffffff, 1).fillRoundedRect(cx - 26, cy - 32, 52, 64, 6);
  g.lineStyle(2, accent, 1).strokeRoundedRect(cx - 26, cy - 32, 52, 64, 6);
  g.fillStyle(accent, 1).fillRect(cx - 12, cy - 16, 24, 32);
  g.fillStyle(0xffffff, 0.85).fillRect(cx - 8, cy - 12, 16, 24);
  g.fillStyle(accent, 1).fillRect(cx - 4, cy - 6, 8, 12);
  g.fillCircle(cx - 18, cy - 24, 3);
  g.fillCircle(cx + 18, cy + 24, 3);
};

const gem = (g: Phaser.GameObjects.Graphics, cx: number, cy: number, color: number, hi: number) => {
  g.fillStyle(color, 1);
  g.fillPoints([
    new Phaser.Math.Vector2(cx, cy - 26),
    new Phaser.Math.Vector2(cx + 22, cy - 4),
    new Phaser.Math.Vector2(cx + 18, cy + 24),
    new Phaser.Math.Vector2(cx - 18, cy + 24),
    new Phaser.Math.Vector2(cx - 22, cy - 4),
  ], true);
  g.fillStyle(hi, 1).fillTriangle(cx - 10, cy - 6, cx + 10, cy - 6, cx, cy - 18);
};

const rune = (g: Phaser.GameObjects.Graphics, cx: number, cy: number, color: number, hi: number) => {
  // Stone tablet
  g.fillStyle(0x3a2a1a, 1).fillRoundedRect(cx - 22, cy - 26, 44, 52, 6);
  g.lineStyle(2, color, 0.9).strokeRoundedRect(cx - 22, cy - 26, 44, 52, 6);
  g.fillStyle(color, 1).fillRect(cx - 12, cy - 18, 24, 4);
  g.fillRect(cx - 4, cy - 18, 8, 36);
  g.fillRect(cx - 12, cy + 14, 24, 4);
  g.fillStyle(hi, 0.6).fillCircle(cx, cy, 3);
};

const book = (g: Phaser.GameObjects.Graphics, cx: number, cy: number, cover: number, accent: number) => {
  g.fillStyle(cover, 1).fillRoundedRect(cx - 22, cy - 28, 44, 56, 4);
  g.lineStyle(2, accent, 1).strokeRoundedRect(cx - 22, cy - 28, 44, 56, 4);
  g.fillStyle(accent, 1);
  // Eye-of-Ra-ish glyph
  g.fillEllipse(cx, cy, 26, 12);
  g.fillStyle(0x111111, 1).fillCircle(cx, cy, 5);
  g.fillStyle(accent, 1).fillRect(cx - 16, cy + 14, 32, 3);
  g.fillRect(cx - 16, cy - 18, 32, 3);
};

const skull = (g: Phaser.GameObjects.Graphics, cx: number, cy: number, color: number, eyeColor: number) => {
  g.fillStyle(color, 1).fillCircle(cx, cy - 4, 22);
  g.fillRect(cx - 14, cy + 8, 28, 16);
  g.fillStyle(0x111111, 1).fillCircle(cx - 8, cy - 2, 5);
  g.fillCircle(cx + 8, cy - 2, 5);
  g.fillTriangle(cx - 3, cy + 8, cx + 3, cy + 8, cx, cy + 14);
  g.fillStyle(eyeColor, 1).fillCircle(cx - 8, cy - 2, 2);
  g.fillCircle(cx + 8, cy - 2, 2);
};

const dragon = (g: Phaser.GameObjects.Graphics, cx: number, cy: number, body: number, eye: number) => {
  // Coiled dragon head
  g.fillStyle(body, 1).fillCircle(cx, cy + 4, 22);
  g.fillTriangle(cx - 14, cy - 14, cx, cy - 26, cx + 14, cy - 14);
  g.fillTriangle(cx - 24, cy - 8, cx - 16, cy - 18, cx - 12, cy - 4);
  g.fillTriangle(cx + 24, cy - 8, cx + 16, cy - 18, cx + 12, cy - 4);
  g.fillStyle(eye, 1).fillCircle(cx - 7, cy, 3);
  g.fillCircle(cx + 7, cy, 3);
  g.fillStyle(0x111111, 1).fillCircle(cx - 7, cy, 1.5);
  g.fillCircle(cx + 7, cy, 1.5);
  g.fillStyle(body, 1).fillTriangle(cx - 6, cy + 14, cx + 6, cy + 14, cx, cy + 22);
};

const aztec = (g: Phaser.GameObjects.Graphics, cx: number, cy: number, color: number, hi: number) => {
  // Sun-stone disc
  g.fillStyle(color, 1).fillCircle(cx, cy, 26);
  g.fillStyle(hi, 1).fillCircle(cx, cy, 16);
  // Spokes
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI * 2 * i) / 8;
    const x1 = cx + Math.cos(a) * 16;
    const y1 = cy + Math.sin(a) * 16;
    const x2 = cx + Math.cos(a) * 26;
    const y2 = cy + Math.sin(a) * 26;
    g.lineStyle(3, color, 1).lineBetween(x1, y1, x2, y2);
  }
  g.fillStyle(0x111111, 1).fillRect(cx - 6, cy - 6, 12, 12);
  g.fillStyle(hi, 1).fillRect(cx - 3, cy - 3, 6, 6);
};

const sparkleGem = (g: Phaser.GameObjects.Graphics, cx: number, cy: number, color: number) => {
  g.fillStyle(color, 1);
  g.fillPoints(star(cx, cy, 26, 10, 4), true);
  g.fillStyle(0xffffff, 0.9);
  g.fillPoints(star(cx, cy, 12, 4, 4), true);
};

const cactus = (g: Phaser.GameObjects.Graphics, cx: number, cy: number) => {
  g.fillStyle(0x44aa44, 1);
  g.fillRoundedRect(cx - 8, cy - 22, 16, 50, 6);
  g.fillRoundedRect(cx - 24, cy - 4, 14, 22, 5);
  g.fillRoundedRect(cx + 10, cy - 8, 14, 22, 5);
  g.fillStyle(0xff66bb, 1).fillCircle(cx, cy - 24, 6);
};

const dynamite = (g: Phaser.GameObjects.Graphics, cx: number, cy: number) => {
  g.fillStyle(0xcc2222, 1).fillRoundedRect(cx - 18, cy - 8, 36, 28, 4);
  g.fillStyle(0xffffff, 0.8).fillRect(cx - 16, cy - 4, 32, 4);
  g.fillStyle(0xffd34a, 1).fillCircle(cx + 16, cy - 16, 4);
  g.lineStyle(2, 0x111111, 1).beginPath();
  g.moveTo(cx + 16, cy - 12).lineTo(cx + 14, cy - 24);
  g.strokePath();
};

const lightningBolt = (g: Phaser.GameObjects.Graphics, cx: number, cy: number, color: number) => {
  g.fillStyle(color, 1);
  g.fillPoints([
    new Phaser.Math.Vector2(cx - 4, cy - 28),
    new Phaser.Math.Vector2(cx + 14, cy - 4),
    new Phaser.Math.Vector2(cx + 4, cy - 4),
    new Phaser.Math.Vector2(cx + 14, cy + 28),
    new Phaser.Math.Vector2(cx - 12, cy + 4),
    new Phaser.Math.Vector2(cx, cy + 4),
    new Phaser.Math.Vector2(cx - 14, cy - 22),
  ], true);
  g.fillStyle(0xffffff, 0.8);
  g.fillTriangle(cx - 2, cy - 18, cx + 6, cy - 4, cx - 4, cy - 4);
};

/* --------------------------- compact theme factory ------------------------ */

interface SymSpec {
  id: string;
  name: string;
  color: number;
  weight: number;
  pays: [number, number, number];  // 3, 4, 5
  premium?: boolean;
  paint: (g: Phaser.GameObjects.Graphics, cx: number, cy: number) => void;
}

interface ThemeSpec {
  id: string;
  name: string;
  tagline: string;
  bg: number;
  frameOuter: number;
  frameInner: number;
  windowBg: number;
  windowBorder: number;
  counterColor: string;
  counterStroke: string;
  sparkle: number[];
  headerColorClass: string;
  containerBorderClass: string;
  containerBgClass: string;
  icon: SlotTheme['icon'];
  jackpotId: string;
  wildId?: string;
  rules: string[];
  symbols: SymSpec[];
  paintAmbient?: SlotTheme['paintAmbient'];
}

function build(spec: ThemeSpec): SlotTheme {
  const symbols: ThemeSymbol[] = spec.symbols.map(s => ({
    id: s.id,
    name: s.name,
    color: s.color,
    weight: s.weight,
    pays: { '3': s.pays[0], '4': s.pays[1], '5': s.pays[2] },
    premium: s.premium,
    paint: (g, cx, cy) => s.paint(g, cx, cy),
  }));
  return {
    id: spec.id,
    name: spec.name,
    tagline: spec.tagline,
    backgroundColor: spec.bg,
    frameOuter: spec.frameOuter,
    frameInner: spec.frameInner,
    reelWindowBg: spec.windowBg,
    reelWindowBorder: spec.windowBorder,
    winCounterColor: spec.counterColor,
    winCounterStroke: spec.counterStroke,
    sparklePalette: spec.sparkle,
    paintAmbient: spec.paintAmbient,
    wildId: spec.wildId,
    jackpotId: spec.jackpotId,
    symbols,
    rules: spec.rules,
    headerColorClass: spec.headerColorClass,
    containerBorderClass: spec.containerBorderClass,
    containerBgClass: spec.containerBgClass,
    icon: spec.icon,
  };
}

/* -------- standard low-tier card pack reused across many themes ---------- */

const cardPack = (palette: { ten: number; jack: number; queen: number; king: number; ace: number }): SymSpec[] => ([
  { id: 'card-10', name: '10', color: palette.ten, weight: 26, pays: [1.5, 4, 10],
    paint: (g, cx, cy) => card(g, cx, cy, palette.ten) },
  { id: 'card-j', name: 'J', color: palette.jack, weight: 24, pays: [2, 5, 12],
    paint: (g, cx, cy) => card(g, cx, cy, palette.jack) },
  { id: 'card-q', name: 'Q', color: palette.queen, weight: 22, pays: [2, 6, 15],
    paint: (g, cx, cy) => card(g, cx, cy, palette.queen) },
  { id: 'card-k', name: 'K', color: palette.king, weight: 20, pays: [2.5, 8, 18],
    paint: (g, cx, cy) => card(g, cx, cy, palette.king) },
  { id: 'card-a', name: 'A', color: palette.ace, weight: 18, pays: [3, 10, 22],
    paint: (g, cx, cy) => card(g, cx, cy, palette.ace) },
]);

/* =============================== THEMES ================================== */

const EXTRA_THEMES: SlotTheme[] = [

  /* -------- Book of Dead -------- */
  build({
    id: 'book-dead', name: 'Book of Dead', tagline: 'Egyptian adventurer hunts pharaoh\'s gold',
    bg: 0x2a1a08, frameOuter: 0xffd34a, frameInner: 0xc77b32,
    windowBg: 0x140a04, windowBorder: 0x886622,
    counterColor: '#FFD34A', counterStroke: '#3a1a00',
    sparkle: [0xffd34a, 0xc77b32, 0xffeeaa, 0xffffff],
    headerColorClass: 'text-amber-200', containerBorderClass: 'border-amber-600/60',
    containerBgClass: 'bg-[#140a04]', icon: 'crown',
    jackpotId: 'pharaoh', wildId: 'book',
    rules: [
      '5×3 grid. 9 paylines. Pays left → right.',
      'Book is wild AND scatter — 3+ trigger 10 free spins.',
      '5 pharaohs on middle row triggers TOMB JACKPOT (300× bet).',
    ],
    symbols: [
      ...cardPack({ ten: 0x66aaff, jack: 0xff8855, queen: 0xff77aa, king: 0xffd34a, ace: 0xff4444 }),
      { id: 'ankh', name: 'Ankh', color: 0xffd34a, weight: 12, pays: [5, 15, 35],
        paint: (g, cx, cy) => {
          g.fillStyle(0xffd34a, 1);
          g.lineStyle(6, 0xffd34a, 1).strokeCircle(cx, cy - 12, 10);
          g.fillRect(cx - 3, cy - 4, 6, 28);
          g.fillRect(cx - 16, cy + 4, 32, 6);
        } },
      { id: 'scarab', name: 'Scarab', color: 0x44aaff, weight: 10, pays: [6, 18, 45],
        paint: (g, cx, cy) => {
          g.fillStyle(0x44aaff, 1).fillEllipse(cx, cy + 4, 36, 30);
          g.fillStyle(0xffd34a, 1).fillRect(cx - 2, cy - 12, 4, 28);
          g.fillStyle(0x222222, 1).fillCircle(cx, cy - 8, 6);
        } },
      { id: 'adventurer', name: 'Adventurer', color: 0xc77b32, weight: 8, pays: [8, 25, 60], premium: true,
        paint: (g, cx, cy) => {
          // Hat
          g.fillStyle(0x6b3e1f, 1).fillEllipse(cx, cy - 18, 40, 8);
          g.fillRoundedRect(cx - 14, cy - 26, 28, 12, 4);
          // Face
          g.fillStyle(0xddaa88, 1).fillCircle(cx, cy + 2, 16);
          // Eyes
          g.fillStyle(0x111111, 1).fillCircle(cx - 5, cy, 2);
          g.fillCircle(cx + 5, cy, 2);
          // Stubble
          g.fillStyle(0x442211, 1).fillEllipse(cx, cy + 10, 14, 4);
        } },
      { id: 'book', name: 'Book (Wild/Scatter)', color: 0xffeeaa, weight: 6, pays: [10, 30, 100], premium: true,
        paint: (g, cx, cy) => book(g, cx, cy, 0xc77b32, 0xffd34a) },
      { id: 'pharaoh', name: 'Pharaoh (Jackpot)', color: 0xffd34a, weight: 4, pays: [30, 100, 300], premium: true,
        paint: (g, cx, cy) => {
          // Nemes headdress
          g.fillStyle(0xffd34a, 1);
          g.fillTriangle(cx - 26, cy + 18, cx, cy - 28, cx + 26, cy + 18);
          g.fillStyle(0x3344aa, 1);
          for (let i = -2; i <= 2; i++) g.fillRect(cx - 24 + i * 10, cy - 18, 4, 32);
          // Face
          g.fillStyle(0xddaa88, 1).fillCircle(cx, cy + 2, 14);
          g.fillStyle(0x111111, 1).fillCircle(cx - 5, cy, 2);
          g.fillCircle(cx + 5, cy, 2);
          // Beard
          g.fillStyle(0xc77b32, 1).fillRect(cx - 4, cy + 14, 8, 12);
        } },
    ],
  }),

  /* -------- Reactoonz -------- */
  build({
    id: 'reactoonz', name: 'Reactoonz', tagline: 'Quirky alien cluster wins',
    bg: 0x1a0a3a, frameOuter: 0x66ffaa, frameInner: 0xff66cc,
    windowBg: 0x0a0418, windowBorder: 0x66ffaa,
    counterColor: '#66FFAA', counterStroke: '#1a4a3a',
    sparkle: [0x66ffaa, 0xff66cc, 0xffd34a, 0xffffff],
    headerColorClass: 'text-emerald-200', containerBorderClass: 'border-emerald-400/60',
    containerBgClass: 'bg-[#0a0418]', icon: 'sparkles',
    jackpotId: 'gargantoon',
    rules: [
      '5×3 grid. 9 paylines. Pays left → right.',
      'Gargantoon is the highest-paying alien overlord.',
      '5 gargantoons on middle row triggers WAVELENGTH JACKPOT (250× bet).',
    ],
    symbols: [
      { id: 'one-eye-pink', name: 'Pink Cyclops', color: 0xff66cc, weight: 24, pays: [1.5, 4, 10],
        paint: (g, cx, cy) => {
          g.fillStyle(0xff66cc, 1).fillCircle(cx, cy + 4, 22);
          g.fillStyle(0xffffff, 1).fillCircle(cx, cy - 4, 10);
          g.fillStyle(0x111111, 1).fillCircle(cx, cy - 4, 5);
          g.fillStyle(0xff66cc, 1).fillTriangle(cx - 16, cy - 14, cx - 22, cy - 22, cx - 10, cy - 10);
        } },
      { id: 'two-eye-blue', name: 'Blue Tentacle', color: 0x66ccff, weight: 22, pays: [2, 5, 12],
        paint: (g, cx, cy) => {
          g.fillStyle(0x66ccff, 1).fillCircle(cx, cy, 22);
          g.fillStyle(0xffffff, 1).fillCircle(cx - 7, cy - 4, 5);
          g.fillCircle(cx + 7, cy - 4, 5);
          g.fillStyle(0x111111, 1).fillCircle(cx - 7, cy - 4, 2.5);
          g.fillCircle(cx + 7, cy - 4, 2.5);
          g.fillStyle(0x66ccff, 1).fillCircle(cx - 14, cy + 18, 4);
          g.fillCircle(cx, cy + 22, 4);
          g.fillCircle(cx + 14, cy + 18, 4);
        } },
      { id: 'three-eye-yellow', name: 'Triclops', color: 0xffd34a, weight: 20, pays: [2, 6, 15],
        paint: (g, cx, cy) => {
          g.fillStyle(0xffd34a, 1).fillRoundedRect(cx - 22, cy - 20, 44, 40, 14);
          g.fillStyle(0xffffff, 1).fillCircle(cx - 8, cy - 4, 5);
          g.fillCircle(cx + 8, cy - 4, 5);
          g.fillCircle(cx, cy + 8, 5);
          g.fillStyle(0x111111, 1).fillCircle(cx - 8, cy - 4, 2);
          g.fillCircle(cx + 8, cy - 4, 2);
          g.fillCircle(cx, cy + 8, 2);
        } },
      { id: 'four-eye-green', name: 'Mossbeast', color: 0x66ee99, weight: 18, pays: [2.5, 8, 18],
        paint: (g, cx, cy) => {
          g.fillStyle(0x66ee99, 1).fillCircle(cx, cy, 24);
          g.fillStyle(0xffffff, 1);
          g.fillCircle(cx - 8, cy - 6, 4);
          g.fillCircle(cx + 8, cy - 6, 4);
          g.fillCircle(cx - 8, cy + 6, 4);
          g.fillCircle(cx + 8, cy + 6, 4);
          g.fillStyle(0x111111, 1);
          g.fillCircle(cx - 8, cy - 6, 1.5);
          g.fillCircle(cx + 8, cy - 6, 1.5);
          g.fillCircle(cx - 8, cy + 6, 1.5);
          g.fillCircle(cx + 8, cy + 6, 1.5);
        } },
      { id: 'gem-toon-blue', name: 'Crystal Toon', color: 0x44aaff, weight: 14, pays: [4, 12, 28],
        paint: (g, cx, cy) => sparkleGem(g, cx, cy, 0x44aaff) },
      { id: 'gem-toon-pink', name: 'Cherry Toon', color: 0xff3388, weight: 12, pays: [5, 15, 35], premium: true,
        paint: (g, cx, cy) => sparkleGem(g, cx, cy, 0xff3388) },
      { id: 'wild-toon', name: 'Wildtoon', color: 0xffeeaa, weight: 6, pays: [10, 30, 100], premium: true,
        paint: (g, cx, cy) => {
          g.fillStyle(0xffeeaa, 1).fillCircle(cx, cy, 26);
          g.fillStyle(0xff66cc, 1).fillCircle(cx - 8, cy - 6, 5);
          g.fillStyle(0x66ccff, 1).fillCircle(cx + 8, cy - 6, 5);
          g.fillStyle(0x111111, 1);
          g.fillCircle(cx - 8, cy - 6, 2);
          g.fillCircle(cx + 8, cy - 6, 2);
          g.fillStyle(0xff3388, 1).fillEllipse(cx, cy + 10, 14, 6);
        } },
      { id: 'gargantoon', name: 'Gargantoon (Jackpot)', color: 0xff3388, weight: 4, pays: [25, 80, 250], premium: true,
        paint: (g, cx, cy) => {
          g.fillStyle(0xff3388, 1).fillCircle(cx, cy + 4, 28);
          // Tentacles
          for (let i = -2; i <= 2; i++) {
            g.fillCircle(cx + i * 12, cy + 26, 5);
          }
          g.fillStyle(0xffd34a, 1).fillCircle(cx, cy - 4, 12);
          g.fillStyle(0x111111, 1).fillCircle(cx, cy - 4, 6);
          g.fillStyle(0xffffff, 1).fillCircle(cx - 2, cy - 6, 2);
        } },
    ],
  }),

  /* -------- Starburst -------- */
  build({
    id: 'starburst', name: 'Starburst', tagline: 'Cosmic gem expanding wilds',
    bg: 0x05051a, frameOuter: 0x66ddff, frameInner: 0xff8866,
    windowBg: 0x020210, windowBorder: 0x99eeff,
    counterColor: '#FFEE99', counterStroke: '#1a1a44',
    sparkle: [0x66ddff, 0xff66cc, 0xffd34a, 0xffffff, 0x66ee99],
    headerColorClass: 'text-cyan-200', containerBorderClass: 'border-cyan-400/60',
    containerBgClass: 'bg-[#020210]', icon: 'star',
    jackpotId: 'starburst',
    paintAmbient: (s, g, w, h) => {
      for (let i = 0; i < 60; i++) {
        const x = (i * 47.3) % w; const y = (i * 23.7) % h;
        g.fillStyle(0xffffff, 0.5 + (i % 3) * 0.15);
        g.fillCircle(x, y, 1 + (i % 2));
      }
      void s;
    },
    rules: [
      '5×3 grid. 9 paylines. Pays both ways!',
      'Starburst is the expanding wild that locks in for a re-spin.',
      '5 starbursts on middle row triggers SUPERNOVA JACKPOT (200× bet).',
    ],
    symbols: [
      { id: 'gem-blue', name: 'Sapphire', color: 0x3366ff, weight: 24, pays: [1.5, 4, 10],
        paint: (g, cx, cy) => gem(g, cx, cy, 0x3366ff, 0xaaccff) },
      { id: 'gem-purple', name: 'Amethyst', color: 0xaa44dd, weight: 22, pays: [2, 5, 12],
        paint: (g, cx, cy) => gem(g, cx, cy, 0xaa44dd, 0xddaaff) },
      { id: 'gem-yellow', name: 'Topaz', color: 0xffd34a, weight: 20, pays: [2, 6, 15],
        paint: (g, cx, cy) => gem(g, cx, cy, 0xffd34a, 0xffeebb) },
      { id: 'gem-green', name: 'Emerald', color: 0x44dd88, weight: 18, pays: [2.5, 8, 18],
        paint: (g, cx, cy) => gem(g, cx, cy, 0x44dd88, 0x99ffcc) },
      { id: 'gem-orange', name: 'Citrine', color: 0xff8833, weight: 14, pays: [4, 12, 28],
        paint: (g, cx, cy) => gem(g, cx, cy, 0xff8833, 0xffcc88) },
      { id: 'lucky-7', name: 'Lucky 7', color: 0xff3344, weight: 8, pays: [6, 20, 50], premium: true,
        paint: (g, cx, cy) => {
          g.fillStyle(0xff3344, 1).fillRect(cx - 18, cy - 22, 36, 8);
          g.fillTriangle(cx + 14, cy - 14, cx - 4, cy + 26, cx + 4, cy + 26);
          g.fillTriangle(cx + 18, cy - 14, cx, cy + 26, cx + 8, cy + 26);
        } },
      { id: 'bar', name: 'BAR', color: 0xffd34a, weight: 6, pays: [10, 30, 80], premium: true,
        paint: (g, cx, cy) => {
          g.fillStyle(0xffd34a, 1).fillRoundedRect(cx - 24, cy - 14, 48, 28, 4);
          g.fillStyle(0x111111, 1).fillRect(cx - 18, cy - 6, 36, 12);
          g.fillStyle(0xffd34a, 1).fillRect(cx - 14, cy - 2, 6, 4);
          g.fillRect(cx - 4, cy - 2, 8, 4);
          g.fillRect(cx + 8, cy - 2, 6, 4);
        } },
      { id: 'starburst', name: 'Starburst (Wild/Jackpot)', color: 0xff66cc, weight: 4, pays: [25, 80, 250], premium: true,
        paint: (g, cx, cy) => {
          g.fillStyle(0xff66cc, 1).fillPoints(star(cx, cy, 30, 10, 8), true);
          g.fillStyle(0x66ddff, 1).fillPoints(star(cx, cy, 18, 6, 8), true);
          g.fillStyle(0xffffff, 1).fillCircle(cx, cy, 6);
        } },
    ],
  }),

  /* -------- Gonzo's Quest -------- */
  build({
    id: 'gonzo-quest', name: 'Gonzo\'s Quest', tagline: 'Conquistador hunts El Dorado',
    bg: 0x1a2a18, frameOuter: 0xc77b32, frameInner: 0x66ee99,
    windowBg: 0x0a1808, windowBorder: 0x88aa66,
    counterColor: '#FFD34A', counterStroke: '#1a3a1a',
    sparkle: [0xffd34a, 0x66ee99, 0xc77b32, 0xffffff],
    headerColorClass: 'text-lime-200', containerBorderClass: 'border-lime-600/60',
    containerBgClass: 'bg-[#0a1808]', icon: 'mountain',
    jackpotId: 'eldorado', wildId: 'free',
    rules: [
      '5×3 grid. Avalanche wins! Symbols fall from above.',
      'Free Fall scatter triggers free spins with rising multipliers.',
      '5 El Dorado idols on middle row triggers JACKPOT (250× bet).',
    ],
    symbols: [
      { id: 'azul', name: 'Blue Mask', color: 0x3399ff, weight: 24, pays: [1.5, 4, 10],
        paint: (g, cx, cy) => {
          g.fillStyle(0x3399ff, 1).fillRoundedRect(cx - 22, cy - 24, 44, 48, 6);
          g.fillStyle(0xffffff, 1).fillCircle(cx - 8, cy - 4, 5);
          g.fillCircle(cx + 8, cy - 4, 5);
          g.fillStyle(0x111111, 1).fillCircle(cx - 8, cy - 4, 2);
          g.fillCircle(cx + 8, cy - 4, 2);
        } },
      { id: 'rose', name: 'Pink Mask', color: 0xff66aa, weight: 22, pays: [2, 5, 12],
        paint: (g, cx, cy) => {
          g.fillStyle(0xff66aa, 1).fillRoundedRect(cx - 22, cy - 24, 44, 48, 6);
          g.fillStyle(0xffffff, 1).fillEllipse(cx - 8, cy - 4, 12, 6);
          g.fillEllipse(cx + 8, cy - 4, 12, 6);
          g.fillStyle(0x111111, 1).fillCircle(cx - 8, cy - 4, 2);
          g.fillCircle(cx + 8, cy - 4, 2);
        } },
      { id: 'amarillo', name: 'Yellow Mask', color: 0xffd34a, weight: 20, pays: [2, 6, 15],
        paint: (g, cx, cy) => {
          g.fillStyle(0xffd34a, 1).fillTriangle(cx - 24, cy + 22, cx, cy - 26, cx + 24, cy + 22);
          g.fillStyle(0x111111, 1).fillRect(cx - 12, cy - 4, 8, 4);
          g.fillRect(cx + 4, cy - 4, 8, 4);
        } },
      { id: 'verde', name: 'Green Mask', color: 0x44dd88, weight: 18, pays: [2.5, 8, 18],
        paint: (g, cx, cy) => {
          g.fillStyle(0x44dd88, 1).fillEllipse(cx, cy, 44, 50);
          g.fillStyle(0x111111, 1).fillRect(cx - 12, cy - 4, 6, 6);
          g.fillRect(cx + 6, cy - 4, 6, 6);
        } },
      { id: 'snake', name: 'Serpent', color: 0xaaee44, weight: 14, pays: [4, 12, 28],
        paint: (g, cx, cy) => {
          g.lineStyle(8, 0xaaee44, 1).beginPath();
          g.moveTo(cx - 18, cy + 14);
          g.lineTo(cx, cy + 4); g.lineTo(cx - 8, cy - 8); g.lineTo(cx + 14, cy - 16);
          g.strokePath();
          g.fillStyle(0xaaee44, 1).fillCircle(cx + 18, cy - 18, 7);
          g.fillStyle(0xff3344, 1).fillCircle(cx + 22, cy - 18, 2);
        } },
      { id: 'free', name: 'Free Fall (Wild)', color: 0xffeeaa, weight: 6, pays: [8, 25, 80], premium: true,
        paint: (g, cx, cy) => {
          g.fillStyle(0xffeeaa, 1).fillCircle(cx, cy, 24);
          g.fillStyle(0xc77b32, 1).fillRect(cx - 18, cy - 4, 36, 8);
          g.lineStyle(2, 0x111111, 1).strokeRect(cx - 18, cy - 4, 36, 8);
        } },
      { id: 'eldorado', name: 'El Dorado (Jackpot)', color: 0xffd34a, weight: 4, pays: [30, 100, 300], premium: true,
        paint: (g, cx, cy) => {
          g.fillStyle(0xffd34a, 1);
          g.fillTriangle(cx - 26, cy + 24, cx, cy - 28, cx + 26, cy + 24);
          g.fillStyle(0x111111, 1).fillRect(cx - 6, cy + 4, 12, 16);
          g.fillStyle(0xc77b32, 1).fillCircle(cx, cy - 6, 8);
          g.fillStyle(0x111111, 1).fillCircle(cx - 3, cy - 8, 1.5);
          g.fillCircle(cx + 3, cy - 8, 1.5);
        } },
    ],
  }),

  /* -------- Dead or Alive -------- */
  build({
    id: 'dead-or-alive', name: 'Dead or Alive', tagline: 'Outlaws, sticky wilds, sundown',
    bg: 0x2a1a08, frameOuter: 0xc77b32, frameInner: 0xeeeeee,
    windowBg: 0x140a04, windowBorder: 0x886622,
    counterColor: '#FFD34A', counterStroke: '#3a1a00',
    sparkle: [0xffd34a, 0xc77b32, 0xff8855, 0xffffff],
    headerColorClass: 'text-amber-200', containerBorderClass: 'border-amber-700/60',
    containerBgClass: 'bg-[#140a04]', icon: 'zap',
    jackpotId: 'wanted', wildId: 'sheriff-star',
    rules: [
      '5×3 grid. 9 paylines. Pays left → right.',
      'Sheriff star is wild and sticky during free spins.',
      '5 wanted posters on middle row triggers BOUNTY JACKPOT (250× bet).',
    ],
    symbols: [
      ...cardPack({ ten: 0x66aaff, jack: 0xff8855, queen: 0xff66aa, king: 0xffd34a, ace: 0xff4444 }),
      { id: 'whisky', name: 'Whisky', color: 0xc77b32, weight: 12, pays: [5, 15, 35],
        paint: (g, cx, cy) => {
          g.fillStyle(0x6b3e1f, 1).fillRect(cx - 14, cy - 18, 28, 36);
          g.fillStyle(0xc77b32, 1).fillRect(cx - 14, cy - 4, 28, 22);
          g.fillStyle(0xffd34a, 1).fillRect(cx - 12, cy + 4, 24, 12);
        } },
      { id: 'cactus', name: 'Cactus', color: 0x44aa44, weight: 10, pays: [6, 18, 45],
        paint: (g, cx, cy) => cactus(g, cx, cy) },
      { id: 'sheriff-star', name: 'Sheriff Star (Wild)', color: 0xffd34a, weight: 6, pays: [12, 35, 100], premium: true,
        paint: (g, cx, cy) => {
          g.fillStyle(0xffd34a, 1).fillPoints(star(cx, cy, 26, 12, 5), true);
          g.lineStyle(2, 0xc77b32, 1).strokePoints(star(cx, cy, 26, 12, 5), true);
          g.fillStyle(0x6b3e1f, 1).fillCircle(cx, cy, 5);
        } },
      { id: 'wanted', name: 'Wanted (Jackpot)', color: 0xffd34a, weight: 4, pays: [30, 100, 300], premium: true,
        paint: (g, cx, cy) => {
          g.fillStyle(0xfff299, 1).fillRoundedRect(cx - 24, cy - 28, 48, 56, 4);
          g.lineStyle(2, 0x6b3e1f, 1).strokeRoundedRect(cx - 24, cy - 28, 48, 56, 4);
          g.fillStyle(0x6b3e1f, 1).fillRect(cx - 18, cy - 22, 36, 6);
          // Face silhouette
          g.fillStyle(0x6b3e1f, 1).fillCircle(cx, cy + 4, 12);
          g.fillRect(cx - 14, cy + 16, 28, 8);
          g.fillStyle(0x6b3e1f, 1).fillRect(cx - 18, cy + 22, 36, 4);
        } },
    ],
  }),

  /* -------- Money Train -------- */
  build({
    id: 'money-train', name: 'Money Train', tagline: 'Bonus bullets & cash collectors',
    bg: 0x18080a, frameOuter: 0xff3344, frameInner: 0xffd34a,
    windowBg: 0x0a0306, windowBorder: 0xff6666,
    counterColor: '#FFD34A', counterStroke: '#3a0a0a',
    sparkle: [0xff3344, 0xffd34a, 0xffffff, 0xc77b32],
    headerColorClass: 'text-red-200', containerBorderClass: 'border-red-600/60',
    containerBgClass: 'bg-[#0a0306]', icon: 'zap',
    jackpotId: 'train', wildId: 'dynamite',
    rules: [
      '5×4 grid feel. Money cars collect bonus payouts.',
      'Dynamite is wild and removes adjacent symbols.',
      '5 trains on middle row triggers HEIST JACKPOT (300× bet).',
    ],
    symbols: [
      ...cardPack({ ten: 0x66aaff, jack: 0xff8855, queen: 0xff66aa, king: 0xffd34a, ace: 0xff4444 }),
      { id: 'safe', name: 'Safe', color: 0x666666, weight: 12, pays: [5, 15, 35],
        paint: (g, cx, cy) => {
          g.fillStyle(0x444444, 1).fillRoundedRect(cx - 22, cy - 22, 44, 44, 4);
          g.fillStyle(0x222222, 1).fillCircle(cx, cy, 14);
          g.fillStyle(0xffd34a, 1).fillCircle(cx, cy, 6);
          g.fillStyle(0x111111, 1).fillRect(cx - 1, cy - 12, 2, 24);
        } },
      { id: 'gold-bag', name: 'Gold Bag', color: 0xc77b32, weight: 10, pays: [6, 18, 45],
        paint: (g, cx, cy) => {
          g.fillStyle(0xc77b32, 1).fillRoundedRect(cx - 18, cy - 8, 36, 30, 8);
          g.fillStyle(0x6b3e1f, 1).fillRect(cx - 14, cy - 14, 28, 8);
          g.fillStyle(0xffd34a, 1).fillCircle(cx, cy + 6, 4);
        } },
      { id: 'dynamite', name: 'Dynamite (Wild)', color: 0xff3344, weight: 6, pays: [12, 35, 100], premium: true,
        paint: (g, cx, cy) => dynamite(g, cx, cy) },
      { id: 'train', name: 'Train (Jackpot)', color: 0x222222, weight: 4, pays: [30, 100, 300], premium: true,
        paint: (g, cx, cy) => {
          g.fillStyle(0x222222, 1).fillRoundedRect(cx - 26, cy - 8, 52, 22, 4);
          g.fillStyle(0xff3344, 1).fillRect(cx - 22, cy - 14, 12, 6);
          g.fillStyle(0xeeeeee, 1).fillCircle(cx - 16, cy + 18, 6);
          g.fillCircle(cx + 16, cy + 18, 6);
          g.fillStyle(0xffd34a, 1).fillCircle(cx + 18, cy - 4, 4);
          g.fillStyle(0xeeeeee, 0.6).fillCircle(cx - 26, cy - 22, 6);
          g.fillCircle(cx - 18, cy - 26, 8);
        } },
    ],
  }),

  /* -------- Wanted Dead or a Wild -------- */
  build({
    id: 'wanted-dead', name: 'Wanted Dead or a Wild', tagline: 'Showdown spins & duel bonus',
    bg: 0x1a0a08, frameOuter: 0xee8833, frameInner: 0xffeeaa,
    windowBg: 0x0a0504, windowBorder: 0xc77b32,
    counterColor: '#FFCC66', counterStroke: '#2a1004',
    sparkle: [0xee8833, 0xffd34a, 0xff4444, 0xffffff],
    headerColorClass: 'text-orange-200', containerBorderClass: 'border-orange-600/60',
    containerBgClass: 'bg-[#0a0504]', icon: 'flame',
    jackpotId: 'gunslinger', wildId: 'revolver',
    rules: [
      '5×3 grid. 20 paylines (engine: 9 demo). Pays left → right.',
      'Revolver is wild — extra shots during duel bonus.',
      '5 gunslingers on middle row triggers DUEL JACKPOT (300× bet).',
    ],
    symbols: [
      ...cardPack({ ten: 0x66aaff, jack: 0xff8855, queen: 0xff66aa, king: 0xffd34a, ace: 0xff4444 }),
      { id: 'horseshoe', name: 'Horseshoe', color: 0xc0c0c0, weight: 12, pays: [5, 15, 35],
        paint: (g, cx, cy) => {
          g.lineStyle(8, 0xc0c0c0, 1);
          g.beginPath();
          g.arc(cx, cy + 4, 22, Math.PI, 0, false);
          g.lineTo(cx - 22, cy + 22);
          g.moveTo(cx + 22, cy + 4);
          g.lineTo(cx + 22, cy + 22);
          g.strokePath();
        } },
      { id: 'sherrif-badge', name: 'Sheriff Badge', color: 0xffd34a, weight: 10, pays: [6, 18, 45],
        paint: (g, cx, cy) => {
          g.fillStyle(0xffd34a, 1).fillPoints(star(cx, cy, 24, 10, 5), true);
          g.fillStyle(0x6b3e1f, 1).fillCircle(cx, cy, 5);
        } },
      { id: 'revolver', name: 'Revolver (Wild)', color: 0xc0c0c0, weight: 6, pays: [12, 35, 100], premium: true,
        paint: (g, cx, cy) => {
          g.fillStyle(0x666666, 1).fillRect(cx - 24, cy - 8, 38, 10);
          g.fillStyle(0x6b3e1f, 1).fillTriangle(cx - 24, cy + 2, cx - 8, cy + 2, cx - 18, cy + 22);
          g.lineStyle(3, 0x666666, 1).strokeCircle(cx - 14, cy + 6, 7);
        } },
      { id: 'gunslinger', name: 'Gunslinger (Jackpot)', color: 0xee8833, weight: 4, pays: [30, 100, 300], premium: true,
        paint: (g, cx, cy) => {
          g.fillStyle(0x6b3e1f, 1).fillEllipse(cx, cy - 18, 44, 8);
          g.fillRoundedRect(cx - 16, cy - 26, 32, 12, 4);
          g.fillStyle(0xddaa88, 1).fillCircle(cx, cy + 2, 16);
          g.fillStyle(0x111111, 1).fillCircle(cx - 5, cy, 2);
          g.fillCircle(cx + 5, cy, 2);
          g.fillStyle(0x442211, 1).fillEllipse(cx, cy + 12, 18, 4);
        } },
    ],
  }),

  /* -------- Mental -------- */
  build({
    id: 'mental', name: 'Mental', tagline: 'Asylum horror with electroshock multipliers',
    bg: 0x0a0a18, frameOuter: 0x66ddff, frameInner: 0xff3344,
    windowBg: 0x040408, windowBorder: 0x88ccff,
    counterColor: '#66DDFF', counterStroke: '#0a1a2a',
    sparkle: [0x66ddff, 0xff3344, 0xffffff, 0x66ee99],
    headerColorClass: 'text-cyan-200', containerBorderClass: 'border-cyan-400/60',
    containerBgClass: 'bg-[#040408]', icon: 'zap',
    jackpotId: 'doctor', wildId: 'lightning',
    rules: [
      '5×3 grid. 9 paylines. Pays left → right.',
      'Electroshock is wild and zaps random multipliers.',
      '5 doctors on middle row triggers ASYLUM JACKPOT (350× bet).',
    ],
    symbols: [
      ...cardPack({ ten: 0x6699ff, jack: 0xaaccff, queen: 0xff66aa, king: 0xffd34a, ace: 0xff4444 }),
      { id: 'pills', name: 'Pills', color: 0xff77aa, weight: 12, pays: [5, 15, 35],
        paint: (g, cx, cy) => {
          g.fillStyle(0xff77aa, 1).fillRoundedRect(cx - 18, cy - 8, 36, 16, 8);
          g.fillStyle(0xffffff, 1).fillRect(cx - 18, cy - 8, 18, 16);
          g.fillStyle(0xc0c0c0, 1).fillRoundedRect(cx - 8, cy + 6, 16, 10, 5);
        } },
      { id: 'syringe', name: 'Syringe', color: 0xaaeeff, weight: 10, pays: [6, 18, 45],
        paint: (g, cx, cy) => {
          g.fillStyle(0xc0c0c0, 1).fillRect(cx - 24, cy - 4, 32, 8);
          g.fillStyle(0xaaeeff, 1).fillRect(cx - 24, cy - 4, 18, 8);
          g.fillStyle(0xc0c0c0, 1).fillRect(cx + 8, cy - 6, 6, 12);
          g.lineStyle(2, 0xc0c0c0, 1).lineBetween(cx + 14, cy, cx + 22, cy);
        } },
      { id: 'lightning', name: 'Electroshock (Wild)', color: 0x66ddff, weight: 6, pays: [12, 35, 100], premium: true,
        paint: (g, cx, cy) => lightningBolt(g, cx, cy, 0x66ddff) },
      { id: 'doctor', name: 'Doctor (Jackpot)', color: 0xff3344, weight: 4, pays: [30, 100, 300], premium: true,
        paint: (g, cx, cy) => {
          g.fillStyle(0xeeeeee, 1).fillCircle(cx, cy + 4, 22);
          g.fillStyle(0xddaa88, 1).fillCircle(cx, cy - 4, 14);
          g.fillStyle(0x111111, 1).fillCircle(cx - 5, cy - 6, 2);
          g.fillCircle(cx + 5, cy - 6, 2);
          // Mask
          g.fillStyle(0x66ddff, 0.6).fillRect(cx - 10, cy - 2, 20, 6);
          // Cross on cap
          g.fillStyle(0xff3344, 1).fillRect(cx - 2, cy - 22, 4, 10);
          g.fillRect(cx - 6, cy - 18, 12, 4);
        } },
    ],
  }),

  /* -------- Tombstone R.I.P. -------- */
  build({
    id: 'tombstone', name: 'Tombstone R.I.P.', tagline: 'Wild West expanding wilds',
    bg: 0x0a0a08, frameOuter: 0x888888, frameInner: 0xc77b32,
    windowBg: 0x040404, windowBorder: 0x666666,
    counterColor: '#CCCCCC', counterStroke: '#1a1a1a',
    sparkle: [0xcccccc, 0xc77b32, 0xff3344, 0xffffff],
    headerColorClass: 'text-zinc-200', containerBorderClass: 'border-zinc-500/60',
    containerBgClass: 'bg-[#040404]', icon: 'mountain',
    jackpotId: 'tombstone', wildId: 'revolver',
    rules: [
      '5×3 grid. 9 paylines. Pays left → right.',
      'Revolver is wild and triggers shoot-out re-spins.',
      '5 tombstones on middle row triggers GRAVEDIGGER JACKPOT (250× bet).',
    ],
    symbols: [
      ...cardPack({ ten: 0x66aaff, jack: 0xff8855, queen: 0xff66aa, king: 0xffd34a, ace: 0xff4444 }),
      { id: 'cactus', name: 'Cactus', color: 0x44aa44, weight: 12, pays: [5, 15, 35],
        paint: (g, cx, cy) => cactus(g, cx, cy) },
      { id: 'skull', name: 'Skull', color: 0xeeeeee, weight: 10, pays: [6, 18, 45],
        paint: (g, cx, cy) => skull(g, cx, cy, 0xeeeeee, 0xff3344) },
      { id: 'revolver', name: 'Revolver (Wild)', color: 0xc77b32, weight: 6, pays: [12, 35, 100], premium: true,
        paint: (g, cx, cy) => {
          g.fillStyle(0x666666, 1).fillRect(cx - 24, cy - 8, 38, 10);
          g.fillStyle(0x6b3e1f, 1).fillTriangle(cx - 24, cy + 2, cx - 8, cy + 2, cx - 18, cy + 22);
        } },
      { id: 'tombstone', name: 'Tombstone (Jackpot)', color: 0xcccccc, weight: 4, pays: [30, 100, 300], premium: true,
        paint: (g, cx, cy) => {
          g.fillStyle(0x888888, 1);
          g.beginPath();
          g.arc(cx, cy - 8, 22, Math.PI, 0, false);
          g.lineTo(cx + 22, cy + 24);
          g.lineTo(cx - 22, cy + 24);
          g.closePath();
          g.fillPath();
          g.fillStyle(0x444444, 1).fillRect(cx - 4, cy + 2, 8, 14);
          g.fillRect(cx - 12, cy + 6, 24, 4);
        } },
    ],
  }),

  /* -------- The Dog House Megaways -------- */
  build({
    id: 'the-dog-house-megaways', name: 'The Dog House Megaways', tagline: 'Megaways pups, multipliers up to 117k',
    bg: 0x0a3050, frameOuter: 0xff8c42, frameInner: 0xffd34a,
    windowBg: 0x051828, windowBorder: 0x66aacc,
    counterColor: '#FFD34A', counterStroke: '#0a2a44',
    sparkle: [0xff8c42, 0xffd34a, 0x66ccff, 0xffffff],
    headerColorClass: 'text-orange-200', containerBorderClass: 'border-orange-500/60',
    containerBgClass: 'bg-[#051828]', icon: 'sparkles',
    jackpotId: 'doghouse', wildId: 'dalmatian',
    rules: [
      '5×3 grid (Megaways flavour). 9 paylines.',
      'Dalmatian is wild — sticks for cascading multipliers.',
      '5 dog houses on middle row triggers MEGAWAYS JACKPOT (350× bet).',
    ],
    symbols: [
      ...cardPack({ ten: 0x66ccff, jack: 0x99ff99, queen: 0xff99cc, king: 0xffcc66, ace: 0xff6666 }),
      { id: 'bone', name: 'Bone', color: 0xfff5dd, weight: 12, pays: [5, 15, 35],
        paint: (g, cx, cy) => {
          g.fillStyle(0xfff5dd, 1);
          g.fillCircle(cx - 22, cy - 14, 9); g.fillCircle(cx - 14, cy - 22, 9);
          g.fillCircle(cx + 22, cy + 14, 9); g.fillCircle(cx + 14, cy + 22, 9);
          g.fillRoundedRect(cx - 22, cy - 8, 44, 16, 8);
        } },
      { id: 'collar', name: 'Collar', color: 0xff8c42, weight: 10, pays: [6, 18, 45],
        paint: (g, cx, cy) => {
          g.lineStyle(8, 0xff8c42, 1).strokeCircle(cx, cy, 22);
          g.fillStyle(0xffd34a, 1).fillCircle(cx, cy + 22, 8);
        } },
      { id: 'dalmatian', name: 'Dalmatian (Wild)', color: 0xffffff, weight: 6, pays: [12, 35, 100], premium: true,
        paint: (g, cx, cy) => {
          g.fillStyle(0xffffff, 1).fillCircle(cx, cy + 4, 24);
          g.fillStyle(0x111111, 1);
          g.fillCircle(cx - 10, cy - 8, 4);
          g.fillCircle(cx + 12, cy - 4, 5);
          g.fillCircle(cx - 6, cy + 14, 4);
          g.fillEllipse(cx - 22, cy + 4, 12, 22);
          g.fillEllipse(cx + 22, cy + 4, 12, 22);
        } },
      { id: 'doghouse', name: 'Dog House (Jackpot)', color: 0xff8c42, weight: 4, pays: [35, 120, 350], premium: true,
        paint: (g, cx, cy) => {
          g.fillStyle(0xff8c42, 1).fillTriangle(cx - 28, cy - 6, cx, cy - 30, cx + 28, cy - 6);
          g.fillStyle(0xc26b22, 1).fillRect(cx - 24, cy - 6, 48, 32);
          g.fillStyle(0x111111, 1).fillRoundedRect(cx - 12, cy + 4, 24, 24, 12);
        } },
    ],
  }),

  /* -------- Gems Bonanza -------- */
  build({
    id: 'gems-bonanza', name: 'Gems Bonanza', tagline: 'Cluster-pay diamond cascade',
    bg: 0x0a0a3a, frameOuter: 0x66ccff, frameInner: 0xff66cc,
    windowBg: 0x040420, windowBorder: 0xaaccff,
    counterColor: '#AACCFF', counterStroke: '#1a1a4a',
    sparkle: [0x66ccff, 0xff66cc, 0xffd34a, 0xffffff, 0x44ee99],
    headerColorClass: 'text-blue-200', containerBorderClass: 'border-blue-400/60',
    containerBgClass: 'bg-[#040420]', icon: 'gem',
    jackpotId: 'mega-gem',
    rules: [
      '5×3 grid. 9 paylines. Pays left → right.',
      'Cascading wins keep firing while clusters explode.',
      '5 mega-gems on middle row triggers GEM JACKPOT (300× bet).',
    ],
    symbols: [
      { id: 'gem-cyan', name: 'Aqua', color: 0x66ddff, weight: 22, pays: [1.5, 4, 10],
        paint: (g, cx, cy) => gem(g, cx, cy, 0x66ddff, 0xccf3ff) },
      { id: 'gem-green', name: 'Emerald', color: 0x44ee99, weight: 20, pays: [2, 5, 12],
        paint: (g, cx, cy) => gem(g, cx, cy, 0x44ee99, 0xaaffcc) },
      { id: 'gem-pink', name: 'Rose', color: 0xff66cc, weight: 18, pays: [2, 6, 15],
        paint: (g, cx, cy) => gem(g, cx, cy, 0xff66cc, 0xffaadd) },
      { id: 'gem-blue', name: 'Sapphire', color: 0x3366ff, weight: 16, pays: [2.5, 8, 18],
        paint: (g, cx, cy) => gem(g, cx, cy, 0x3366ff, 0xaaccff) },
      { id: 'gem-purple', name: 'Amethyst', color: 0xaa44dd, weight: 14, pays: [4, 12, 28],
        paint: (g, cx, cy) => gem(g, cx, cy, 0xaa44dd, 0xddaaff) },
      { id: 'gem-yellow', name: 'Topaz', color: 0xffd34a, weight: 10, pays: [6, 20, 50], premium: true,
        paint: (g, cx, cy) => gem(g, cx, cy, 0xffd34a, 0xffeebb) },
      { id: 'gem-red', name: 'Ruby', color: 0xff3344, weight: 8, pays: [10, 30, 80], premium: true,
        paint: (g, cx, cy) => gem(g, cx, cy, 0xff3344, 0xff99aa) },
      { id: 'mega-gem', name: 'Mega Gem (Jackpot)', color: 0xffffff, weight: 4, pays: [30, 100, 300], premium: true,
        paint: (g, cx, cy) => sparkleGem(g, cx, cy, 0xffffff) },
    ],
  }),

  /* -------- Aztec King -------- */
  build({
    id: 'aztec-king', name: 'Aztec King', tagline: 'Sun-stone royalty & jaguar wilds',
    bg: 0x18230f, frameOuter: 0xc77b32, frameInner: 0xffd34a,
    windowBg: 0x0a1208, windowBorder: 0x886622,
    counterColor: '#FFD34A', counterStroke: '#1a2a08',
    sparkle: [0xffd34a, 0xc77b32, 0xff8855, 0xffffff],
    headerColorClass: 'text-amber-200', containerBorderClass: 'border-amber-700/60',
    containerBgClass: 'bg-[#0a1208]', icon: 'crown',
    jackpotId: 'king', wildId: 'jaguar',
    rules: [
      '5×3 grid. 9 paylines. Pays left → right.',
      'Jaguar is wild — substitutes for any symbol.',
      '5 kings on middle row triggers SUN-STONE JACKPOT (300× bet).',
    ],
    symbols: [
      ...cardPack({ ten: 0x66aaff, jack: 0xff8855, queen: 0xff66aa, king: 0xffd34a, ace: 0xff4444 }),
      { id: 'sun-disc', name: 'Sun Disc', color: 0xffaa33, weight: 12, pays: [5, 15, 35],
        paint: (g, cx, cy) => aztec(g, cx, cy, 0xffaa33, 0xffd34a) },
      { id: 'snake', name: 'Serpent', color: 0x66ee99, weight: 10, pays: [6, 18, 45],
        paint: (g, cx, cy) => {
          g.lineStyle(8, 0x66ee99, 1).beginPath();
          g.moveTo(cx - 18, cy + 14); g.lineTo(cx, cy + 4);
          g.lineTo(cx - 8, cy - 8); g.lineTo(cx + 14, cy - 16);
          g.strokePath();
          g.fillStyle(0x66ee99, 1).fillCircle(cx + 18, cy - 18, 7);
        } },
      { id: 'jaguar', name: 'Jaguar (Wild)', color: 0xffd34a, weight: 6, pays: [12, 35, 100], premium: true,
        paint: (g, cx, cy) => {
          g.fillStyle(0xffd34a, 1).fillCircle(cx, cy + 4, 24);
          g.fillTriangle(cx - 22, cy - 8, cx - 14, cy - 22, cx - 8, cy - 8);
          g.fillTriangle(cx + 22, cy - 8, cx + 14, cy - 22, cx + 8, cy - 8);
          g.fillStyle(0x111111, 1);
          g.fillCircle(cx - 8, cy, 3); g.fillCircle(cx + 8, cy, 3);
          g.fillCircle(cx - 14, cy + 12, 2); g.fillCircle(cx + 6, cy + 16, 2);
          g.fillTriangle(cx - 4, cy + 12, cx + 4, cy + 12, cx, cy + 18);
        } },
      { id: 'king', name: 'Aztec King (Jackpot)', color: 0xffd34a, weight: 4, pays: [30, 100, 300], premium: true,
        paint: (g, cx, cy) => {
          // Feather headdress
          g.fillStyle(0x44ee99, 1);
          for (let i = -3; i <= 3; i++) {
            g.fillTriangle(cx + i * 8, cy - 16, cx + i * 8 - 3, cy - 30, cx + i * 8 + 3, cy - 30);
          }
          g.fillStyle(0xff3344, 1).fillRect(cx - 24, cy - 16, 48, 6);
          // Face
          g.fillStyle(0xc77b32, 1).fillCircle(cx, cy + 4, 14);
          g.fillStyle(0x111111, 1).fillCircle(cx - 5, cy + 2, 2);
          g.fillCircle(cx + 5, cy + 2, 2);
          g.fillStyle(0xffd34a, 1).fillTriangle(cx - 4, cy + 14, cx + 4, cy + 14, cx, cy + 22);
        } },
    ],
  }),

  /* -------- Rise of Giza -------- */
  build({
    id: 'rise-of-giza', name: 'Rise of Giza', tagline: 'PowerNudge through the pyramids',
    bg: 0x2a1f08, frameOuter: 0xffd34a, frameInner: 0x66ccff,
    windowBg: 0x150f04, windowBorder: 0xc77b32,
    counterColor: '#FFD34A', counterStroke: '#3a2a08',
    sparkle: [0xffd34a, 0xc77b32, 0x66ccff, 0xffffff],
    headerColorClass: 'text-amber-100', containerBorderClass: 'border-amber-500/60',
    containerBgClass: 'bg-[#150f04]', icon: 'crown',
    jackpotId: 'sphinx', wildId: 'eye',
    rules: [
      '5×3 grid. 9 paylines. PowerNudge re-spins on every win.',
      'Eye of Horus is wild — substitutes for any symbol.',
      '5 sphinxes on middle row triggers PYRAMID JACKPOT (300× bet).',
    ],
    symbols: [
      ...cardPack({ ten: 0x66aaff, jack: 0xff8855, queen: 0xff66aa, king: 0xffd34a, ace: 0xff4444 }),
      { id: 'ankh', name: 'Ankh', color: 0xffd34a, weight: 12, pays: [5, 15, 35],
        paint: (g, cx, cy) => {
          g.lineStyle(6, 0xffd34a, 1).strokeCircle(cx, cy - 12, 10);
          g.fillStyle(0xffd34a, 1).fillRect(cx - 3, cy - 4, 6, 28);
          g.fillRect(cx - 16, cy + 4, 32, 6);
        } },
      { id: 'scarab', name: 'Scarab', color: 0x44aaff, weight: 10, pays: [6, 18, 45],
        paint: (g, cx, cy) => {
          g.fillStyle(0x44aaff, 1).fillEllipse(cx, cy + 4, 36, 30);
          g.fillStyle(0xffd34a, 1).fillRect(cx - 2, cy - 12, 4, 28);
        } },
      { id: 'eye', name: 'Eye of Horus (Wild)', color: 0xffeeaa, weight: 6, pays: [12, 35, 100], premium: true,
        paint: (g, cx, cy) => {
          g.fillStyle(0xffeeaa, 1).fillEllipse(cx, cy, 36, 18);
          g.fillStyle(0x111111, 1).fillCircle(cx, cy, 7);
          g.fillStyle(0x66ccff, 1).fillCircle(cx, cy, 4);
          g.fillStyle(0xffd34a, 1).fillRect(cx - 18, cy + 8, 18, 4);
          g.fillTriangle(cx + 12, cy + 8, cx + 22, cy + 16, cx + 12, cy + 12);
        } },
      { id: 'sphinx', name: 'Sphinx (Jackpot)', color: 0xc77b32, weight: 4, pays: [30, 100, 300], premium: true,
        paint: (g, cx, cy) => {
          g.fillStyle(0xc77b32, 1).fillEllipse(cx, cy + 14, 44, 18);
          g.fillStyle(0xffd34a, 1).fillCircle(cx, cy - 4, 18);
          // Nemes lines
          g.fillStyle(0x3344aa, 1);
          for (let i = -2; i <= 2; i++) g.fillRect(cx - 14 + i * 8, cy - 16, 3, 16);
          g.fillStyle(0x111111, 1).fillCircle(cx - 5, cy - 4, 2); g.fillCircle(cx + 5, cy - 4, 2);
        } },
    ],
  }),

  /* -------- Book of Fallen -------- */
  build({
    id: 'book-of-fallen', name: 'Book of Fallen', tagline: 'Dark book unleashes expanding symbols',
    bg: 0x180a18, frameOuter: 0xaa44ff, frameInner: 0xffd34a,
    windowBg: 0x0a040a, windowBorder: 0x884488,
    counterColor: '#FFD34A', counterStroke: '#2a0a2a',
    sparkle: [0xaa44ff, 0xffd34a, 0xff3344, 0xffffff],
    headerColorClass: 'text-fuchsia-200', containerBorderClass: 'border-fuchsia-500/60',
    containerBgClass: 'bg-[#0a040a]', icon: 'crown',
    jackpotId: 'fallen', wildId: 'book',
    rules: [
      '5×3 grid. 9 paylines. Pays left → right.',
      'Book is wild AND scatter — 3+ trigger 10 free spins.',
      '5 fallen kings on middle row triggers DAMNATION JACKPOT (350× bet).',
    ],
    symbols: [
      ...cardPack({ ten: 0x66aaff, jack: 0xff8855, queen: 0xff66aa, king: 0xffd34a, ace: 0xff4444 }),
      { id: 'rune', name: 'Rune Stone', color: 0xaa44ff, weight: 12, pays: [5, 15, 35],
        paint: (g, cx, cy) => rune(g, cx, cy, 0xaa44ff, 0xffd34a) },
      { id: 'skull', name: 'Skull', color: 0xeeeeee, weight: 10, pays: [6, 18, 45],
        paint: (g, cx, cy) => skull(g, cx, cy, 0xeeeeee, 0xff3344) },
      { id: 'book', name: 'Book (Wild)', color: 0xffd34a, weight: 6, pays: [12, 35, 100], premium: true,
        paint: (g, cx, cy) => book(g, cx, cy, 0x551155, 0xaa44ff) },
      { id: 'fallen', name: 'Fallen King (Jackpot)', color: 0xaa44ff, weight: 4, pays: [35, 120, 350], premium: true,
        paint: (g, cx, cy) => {
          // Crown
          g.fillStyle(0xffd34a, 1);
          g.fillPoints([
            new Phaser.Math.Vector2(cx - 22, cy + 6),
            new Phaser.Math.Vector2(cx - 22, cy - 8),
            new Phaser.Math.Vector2(cx - 12, cy + 4),
            new Phaser.Math.Vector2(cx, cy - 18),
            new Phaser.Math.Vector2(cx + 12, cy + 4),
            new Phaser.Math.Vector2(cx + 22, cy - 8),
            new Phaser.Math.Vector2(cx + 22, cy + 6),
          ], true);
          // Skull-king face below
          g.fillStyle(0xeeeeee, 1).fillCircle(cx, cy + 12, 14);
          g.fillStyle(0x111111, 1).fillCircle(cx - 5, cy + 10, 3); g.fillCircle(cx + 5, cy + 10, 3);
          g.fillStyle(0xff3344, 1).fillCircle(cx - 5, cy + 10, 1); g.fillCircle(cx + 5, cy + 10, 1);
        } },
    ],
  }),

  /* -------- Floating Dragon -------- */
  build({
    id: 'floating-dragon', name: 'Floating Dragon', tagline: 'Mystic dragon hold-and-spin',
    bg: 0x0a1a2a, frameOuter: 0x44ff99, frameInner: 0xff3344,
    windowBg: 0x040810, windowBorder: 0x66ddaa,
    counterColor: '#44FF99', counterStroke: '#0a3a2a',
    sparkle: [0x44ff99, 0xff3344, 0xffd34a, 0xffffff],
    headerColorClass: 'text-emerald-200', containerBorderClass: 'border-emerald-400/60',
    containerBgClass: 'bg-[#040810]', icon: 'flame',
    jackpotId: 'dragon', wildId: 'pearl',
    rules: [
      '5×3 grid. 9 paylines. Pays left → right.',
      'Pearl is wild — fuels dragon multipliers.',
      '5 dragons on middle row triggers DRAGON JACKPOT (350× bet).',
    ],
    symbols: [
      ...cardPack({ ten: 0x66aaff, jack: 0xff8855, queen: 0xff66aa, king: 0xffd34a, ace: 0xff4444 }),
      { id: 'koi', name: 'Koi Fish', color: 0xff8833, weight: 12, pays: [5, 15, 35],
        paint: (g, cx, cy) => {
          g.fillStyle(0xff8833, 1).fillEllipse(cx - 4, cy + 4, 36, 22);
          g.fillTriangle(cx + 14, cy + 4, cx + 26, cy - 4, cx + 26, cy + 12);
          g.fillStyle(0xeeeeee, 1).fillCircle(cx, cy - 2, 4);
          g.fillStyle(0x111111, 1).fillCircle(cx - 8, cy, 2);
        } },
      { id: 'lotus', name: 'Lotus', color: 0xff66cc, weight: 10, pays: [6, 18, 45],
        paint: (g, cx, cy) => {
          g.fillStyle(0xff66cc, 1);
          for (let i = 0; i < 6; i++) {
            const a = (Math.PI * 2 * i) / 6;
            const x = cx + Math.cos(a) * 14; const y = cy + Math.sin(a) * 14;
            g.fillEllipse(x, y, 12, 18);
          }
          g.fillStyle(0xffd34a, 1).fillCircle(cx, cy, 8);
        } },
      { id: 'pearl', name: 'Pearl (Wild)', color: 0xeeeeee, weight: 6, pays: [12, 35, 100], premium: true,
        paint: (g, cx, cy) => {
          g.fillStyle(0xeeeeee, 1).fillCircle(cx, cy, 22);
          g.fillStyle(0xffffff, 1).fillCircle(cx - 6, cy - 6, 8);
          g.lineStyle(2, 0x44ff99, 0.8).strokeCircle(cx, cy, 22);
        } },
      { id: 'dragon', name: 'Dragon (Jackpot)', color: 0x44ff99, weight: 4, pays: [35, 120, 350], premium: true,
        paint: (g, cx, cy) => dragon(g, cx, cy, 0x44ff99, 0xffd34a) },
    ],
  }),

  /* -------- Hot Fiesta -------- */
  build({
    id: 'hot-fiesta', name: 'Hot Fiesta', tagline: 'Sizzling Mexican carnival cluster wins',
    bg: 0x2a0518, frameOuter: 0xff3388, frameInner: 0xffd34a,
    windowBg: 0x18030c, windowBorder: 0xff66aa,
    counterColor: '#FFD34A', counterStroke: '#3a0a1a',
    sparkle: [0xff3388, 0xffd34a, 0x66ee99, 0xffffff, 0x66ccff],
    headerColorClass: 'text-pink-200', containerBorderClass: 'border-pink-500/60',
    containerBgClass: 'bg-[#18030c]', icon: 'flame',
    jackpotId: 'sombrero', wildId: 'maracas',
    rules: [
      '5×3 grid. 9 paylines. Pays left → right.',
      'Maracas are wild and trigger fiesta multipliers.',
      '5 sombreros on middle row triggers FIESTA JACKPOT (250× bet).',
    ],
    symbols: [
      { id: 'gem-pink', name: 'Pink Skull', color: 0xff66aa, weight: 24, pays: [1.5, 4, 10],
        paint: (g, cx, cy) => {
          skull(g, cx, cy, 0xff66aa, 0xffd34a);
          // Flowers around
          g.fillStyle(0xffd34a, 1).fillCircle(cx - 14, cy + 12, 3);
          g.fillCircle(cx + 14, cy + 12, 3);
        } },
      { id: 'chili', name: 'Chili Pepper', color: 0xff3344, weight: 22, pays: [2, 5, 12],
        paint: (g, cx, cy) => {
          g.fillStyle(0xff3344, 1);
          g.fillTriangle(cx - 4, cy - 18, cx + 14, cy + 22, cx - 14, cy + 18);
          g.fillStyle(0x44aa44, 1).fillRect(cx - 6, cy - 24, 8, 8);
        } },
      { id: 'lime', name: 'Lime', color: 0x44ee99, weight: 20, pays: [2, 6, 15],
        paint: (g, cx, cy) => {
          g.fillStyle(0x44ee99, 1).fillCircle(cx, cy, 22);
          g.fillStyle(0xaaffcc, 1).fillCircle(cx, cy, 14);
          for (let i = 0; i < 6; i++) {
            const a = (Math.PI * 2 * i) / 6;
            g.fillStyle(0x44ee99, 1).fillTriangle(cx, cy, cx + Math.cos(a) * 14, cy + Math.sin(a) * 14, cx + Math.cos(a + 0.4) * 14, cy + Math.sin(a + 0.4) * 14);
          }
        } },
      { id: 'taco', name: 'Taco', color: 0xffd34a, weight: 14, pays: [4, 12, 28],
        paint: (g, cx, cy) => {
          g.fillStyle(0xffd34a, 1);
          g.beginPath();
          g.arc(cx, cy + 8, 24, 0, Math.PI, true);
          g.closePath();
          g.fillPath();
          g.fillStyle(0x44aa44, 1).fillRect(cx - 18, cy + 6, 36, 4);
          g.fillStyle(0xff3344, 1).fillRect(cx - 12, cy + 10, 24, 4);
        } },
      { id: 'maracas', name: 'Maracas (Wild)', color: 0xff8833, weight: 6, pays: [12, 35, 100], premium: true,
        paint: (g, cx, cy) => {
          g.fillStyle(0xff8833, 1).fillCircle(cx - 10, cy - 4, 14);
          g.fillCircle(cx + 10, cy - 4, 14);
          g.fillStyle(0x6b3e1f, 1).fillRect(cx - 14, cy + 4, 8, 22);
          g.fillRect(cx + 6, cy + 4, 8, 22);
          g.fillStyle(0xffd34a, 1).fillCircle(cx - 10, cy - 8, 4);
          g.fillCircle(cx + 10, cy - 8, 4);
        } },
      { id: 'sombrero', name: 'Sombrero (Jackpot)', color: 0xffd34a, weight: 4, pays: [25, 80, 250], premium: true,
        paint: (g, cx, cy) => {
          g.fillStyle(0xc77b32, 1).fillEllipse(cx, cy + 10, 56, 14);
          g.fillStyle(0xffd34a, 1).fillEllipse(cx, cy - 4, 30, 22);
          g.fillStyle(0xff3344, 1).fillEllipse(cx, cy + 4, 32, 6);
          // Tassels
          g.fillStyle(0xff3344, 1).fillCircle(cx - 26, cy + 16, 3);
          g.fillCircle(cx + 26, cy + 16, 3);
        } },
    ],
  }),

  /* -------- Lucky Lightning -------- */
  build({
    id: 'lucky-lightning', name: 'Lucky Lightning', tagline: 'Storm-charged multipliers',
    bg: 0x081428, frameOuter: 0x66ccff, frameInner: 0xffd34a,
    windowBg: 0x040810, windowBorder: 0x88ddff,
    counterColor: '#FFD34A', counterStroke: '#0a1a3a',
    sparkle: [0x66ccff, 0xffd34a, 0xffffff, 0xff3344],
    headerColorClass: 'text-cyan-200', containerBorderClass: 'border-cyan-400/60',
    containerBgClass: 'bg-[#040810]', icon: 'zap',
    jackpotId: 'thor', wildId: 'lightning',
    paintAmbient: (s, g, w, h) => {
      for (let i = 0; i < 5; i++) {
        g.lineStyle(2, 0x66ccff, 0.3);
        const x = (i * 137) % w;
        g.beginPath();
        g.moveTo(x, 0); g.lineTo(x + 12, h * 0.3); g.lineTo(x - 6, h * 0.5);
        g.strokePath();
      }
      void s;
    },
    rules: [
      '5×3 grid. 9 paylines. Pays left → right.',
      'Lightning is wild and triggers chain multipliers.',
      '5 thunder gods on middle row triggers STORM JACKPOT (350× bet).',
    ],
    symbols: [
      ...cardPack({ ten: 0x66aaff, jack: 0xff8855, queen: 0xff66aa, king: 0xffd34a, ace: 0xff4444 }),
      { id: 'cloud', name: 'Storm Cloud', color: 0xaaccff, weight: 12, pays: [5, 15, 35],
        paint: (g, cx, cy) => {
          g.fillStyle(0x88aaff, 1);
          g.fillCircle(cx - 14, cy, 12);
          g.fillCircle(cx + 14, cy, 12);
          g.fillCircle(cx, cy - 8, 14);
          g.fillRect(cx - 14, cy, 28, 12);
        } },
      { id: 'rain', name: 'Rain Drop', color: 0x44aaff, weight: 10, pays: [6, 18, 45],
        paint: (g, cx, cy) => {
          g.fillStyle(0x44aaff, 1);
          g.fillCircle(cx, cy + 8, 14);
          g.fillTriangle(cx - 14, cy + 8, cx + 14, cy + 8, cx, cy - 22);
          g.fillStyle(0xaaeeff, 1).fillCircle(cx - 4, cy + 4, 4);
        } },
      { id: 'lightning', name: 'Lightning (Wild)', color: 0xffd34a, weight: 6, pays: [12, 35, 100], premium: true,
        paint: (g, cx, cy) => lightningBolt(g, cx, cy, 0xffd34a) },
      { id: 'thor', name: 'Thunder God (Jackpot)', color: 0x66ccff, weight: 4, pays: [35, 120, 350], premium: true,
        paint: (g, cx, cy) => {
          g.fillStyle(0xeeeeee, 1).fillCircle(cx, cy + 4, 22);
          g.fillStyle(0xddaa88, 1).fillCircle(cx, cy - 2, 14);
          g.fillStyle(0x111111, 1).fillCircle(cx - 5, cy - 4, 2); g.fillCircle(cx + 5, cy - 4, 2);
          g.fillStyle(0xc77b32, 1).fillRect(cx - 12, cy + 12, 24, 6);
          // Lightning bolt accent
          g.fillStyle(0x66ccff, 1);
          g.fillTriangle(cx + 16, cy + 18, cx + 24, cy + 22, cx + 18, cy + 28);
        } },
    ],
  }),

  /* -------- Madame Destiny Megaways -------- */
  build({
    id: 'madame-destiny-megaways', name: 'Madame Destiny Megaways', tagline: 'Tarot mystic, multipliers up to 5000×',
    bg: 0x1a0a2a, frameOuter: 0xff66cc, frameInner: 0xffd34a,
    windowBg: 0x0a0418, windowBorder: 0xaa44ff,
    counterColor: '#FFB3FF', counterStroke: '#2a0a3a',
    sparkle: [0xff66cc, 0xffd34a, 0xaa44ff, 0xffffff],
    headerColorClass: 'text-fuchsia-200', containerBorderClass: 'border-fuchsia-500/60',
    containerBgClass: 'bg-[#0a0418]', icon: 'sparkles',
    jackpotId: 'madame', wildId: 'crystal',
    rules: [
      '5×3 grid (Megaways flavour). 9 paylines.',
      'Crystal ball is wild — multipliers in free spins.',
      '5 madames on middle row triggers DESTINY JACKPOT (300× bet).',
    ],
    symbols: [
      ...cardPack({ ten: 0x66aaff, jack: 0xff8855, queen: 0xff66aa, king: 0xffd34a, ace: 0xff4444 }),
      { id: 'tarot', name: 'Tarot Card', color: 0xaa44ff, weight: 12, pays: [5, 15, 35],
        paint: (g, cx, cy) => {
          g.fillStyle(0xaa44ff, 1).fillRoundedRect(cx - 22, cy - 28, 44, 56, 4);
          g.fillStyle(0xffd34a, 1).fillPoints(star(cx, cy, 14, 6, 5), true);
        } },
      { id: 'cat', name: 'Black Cat', color: 0x111111, weight: 10, pays: [6, 18, 45],
        paint: (g, cx, cy) => {
          g.fillStyle(0x111111, 1).fillCircle(cx, cy + 4, 22);
          g.fillTriangle(cx - 22, cy - 8, cx - 12, cy - 22, cx - 6, cy - 8);
          g.fillTriangle(cx + 22, cy - 8, cx + 12, cy - 22, cx + 6, cy - 8);
          g.fillStyle(0x66ee99, 1).fillCircle(cx - 6, cy, 3); g.fillCircle(cx + 6, cy, 3);
          g.fillStyle(0x111111, 1).fillRect(cx - 7, cy, 2, 4); g.fillRect(cx + 5, cy, 2, 4);
        } },
      { id: 'crystal', name: 'Crystal Ball (Wild)', color: 0x66ccff, weight: 6, pays: [12, 35, 100], premium: true,
        paint: (g, cx, cy) => {
          g.fillStyle(0x66ccff, 1).fillCircle(cx, cy - 4, 22);
          g.fillStyle(0xaaeeff, 1).fillCircle(cx - 6, cy - 10, 8);
          g.fillStyle(0xffd34a, 1).fillRect(cx - 18, cy + 16, 36, 8);
        } },
      { id: 'madame', name: 'Madame Destiny (Jackpot)', color: 0xff66cc, weight: 4, pays: [30, 100, 300], premium: true,
        paint: (g, cx, cy) => {
          // Headscarf
          g.fillStyle(0xff66cc, 1).fillCircle(cx, cy - 4, 24);
          g.fillStyle(0xaa44ff, 1).fillRect(cx - 22, cy - 14, 44, 8);
          // Face
          g.fillStyle(0xddaa88, 1).fillCircle(cx, cy + 2, 14);
          g.fillStyle(0x111111, 1).fillCircle(cx - 5, cy, 2); g.fillCircle(cx + 5, cy, 2);
          // Earrings
          g.fillStyle(0xffd34a, 1).fillCircle(cx - 16, cy + 6, 3);
          g.fillCircle(cx + 16, cy + 6, 3);
        } },
    ],
  }),

  /* -------- Wild Booster -------- */
  build({
    id: 'wild-booster', name: 'Wild Booster', tagline: 'Wild collect-and-boost mechanic',
    bg: 0x18280a, frameOuter: 0x66ee99, frameInner: 0xffd34a,
    windowBg: 0x0a1604, windowBorder: 0x88ee66,
    counterColor: '#88FF99', counterStroke: '#1a3a08',
    sparkle: [0x66ee99, 0xffd34a, 0xff8833, 0xffffff],
    headerColorClass: 'text-lime-200', containerBorderClass: 'border-lime-500/60',
    containerBgClass: 'bg-[#0a1604]', icon: 'zap',
    jackpotId: 'booster', wildId: 'wild-w',
    rules: [
      '5×3 grid. 9 paylines. Pays left → right.',
      'Wild W collects boosters for stacking multipliers.',
      '5 boosters on middle row triggers BOOST JACKPOT (250× bet).',
    ],
    symbols: [
      ...cardPack({ ten: 0x66aaff, jack: 0xff8855, queen: 0xff66aa, king: 0xffd34a, ace: 0xff4444 }),
      { id: 'gem-green', name: 'Emerald', color: 0x44dd88, weight: 12, pays: [5, 15, 35],
        paint: (g, cx, cy) => gem(g, cx, cy, 0x44dd88, 0xaaffcc) },
      { id: 'gem-orange', name: 'Topaz', color: 0xffaa33, weight: 10, pays: [6, 18, 45],
        paint: (g, cx, cy) => gem(g, cx, cy, 0xffaa33, 0xffe6b3) },
      { id: 'wild-w', name: 'Wild W', color: 0xff8833, weight: 6, pays: [12, 35, 100], premium: true,
        paint: (g, cx, cy) => {
          g.fillStyle(0xff8833, 1).fillRoundedRect(cx - 24, cy - 24, 48, 48, 6);
          g.fillStyle(0xffffff, 1);
          // Big W
          g.fillTriangle(cx - 18, cy - 14, cx - 14, cy - 14, cx - 8, cy + 18);
          g.fillTriangle(cx - 8, cy + 18, cx - 4, cy + 18, cx, cy - 14);
          g.fillTriangle(cx, cy - 14, cx + 4, cy - 14, cx + 8, cy + 18);
          g.fillTriangle(cx + 8, cy + 18, cx + 14, cy + 18, cx + 18, cy - 14);
        } },
      { id: 'booster', name: 'Booster (Jackpot)', color: 0xffd34a, weight: 4, pays: [25, 80, 250], premium: true,
        paint: (g, cx, cy) => {
          g.fillStyle(0xffd34a, 1).fillCircle(cx, cy, 24);
          g.fillStyle(0xff3344, 1).fillTriangle(cx - 12, cy - 4, cx + 12, cy - 4, cx, cy - 22);
          g.fillStyle(0xffffff, 1).fillRect(cx - 14, cy + 4, 28, 4);
          g.fillStyle(0xff3344, 1).fillCircle(cx, cy + 12, 4);
        } },
    ],
  }),
];

export const EXTRA_THEME_MAP: Record<string, SlotTheme> = Object.fromEntries(
  EXTRA_THEMES.map(t => [t.id, t]),
);
