/**
 * ClassicSlotScene — Vegas neon retro slot built entirely with Phaser.
 *
 * 5 reels × 3 rows. 9 fixed paylines. All symbols are procedurally drawn
 * with Phaser.GameObjects.Graphics → generateTexture (no asset files).
 *
 * Visual identity: charcoal background, hot-pink + yellow neon frame with
 * flickering segments, chrome reel windows, left-side payline indicators.
 */
import * as Phaser from 'phaser';
import { SlotRNG } from '../core/SlotRNG';
import { ReelStrip, type ReelSymbolData } from '../core/ReelStrip';
import { evaluatePaylines, type Grid, type PaylineWin } from '../core/WinEvaluator';
import { screenShake, flashColor, sparkleBurst } from '../core/SlotFX';

export const COLS = 5;
export const ROWS = 3;
export const CELL = 92;
export const GAP = 6;
export const GRID_W = COLS * CELL + (COLS - 1) * GAP;
export const GRID_H = ROWS * CELL + (ROWS - 1) * GAP;

const SCENE_KEY = 'ClassicSlotScene';

interface ClassicSym {
  id: string;
  color: number;
  weight: number;
  pays: { '3': number; '4': number; '5': number };
}

const SYMBOLS: ClassicSym[] = [
  { id: 'cherry',  color: 0xff2222, weight: 26, pays: { '3': 1.5, '4': 4,  '5': 10 } },
  { id: 'lemon',   color: 0xffff00, weight: 24, pays: { '3': 2,   '4': 6,  '5': 15 } },
  { id: 'orange',  color: 0xff8800, weight: 22, pays: { '3': 2.5, '4': 8,  '5': 20 } },
  { id: 'grape',   color: 0x8822cc, weight: 18, pays: { '3': 3,   '4': 10, '5': 25 } },
  { id: 'bell',    color: 0xffd34a, weight: 14, pays: { '3': 4,   '4': 14, '5': 35 } },
  { id: 'star',    color: 0xffff66, weight: 10, pays: { '3': 6,   '4': 18, '5': 50 } },
  { id: 'clover',  color: 0x00cc44, weight: 8,  pays: { '3': 5,   '4': 16, '5': 40 } },
  { id: 'diamond', color: 0x00ffff, weight: 6,  pays: { '3': 8,   '4': 25, '5': 75 } },
  { id: 'seven',   color: 0xff0033, weight: 4,  pays: { '3': 20,  '4': 60, '5': 200 } }, // wild
];
const TOTAL_W = SYMBOLS.reduce((s, x) => s + x.weight, 0);
const WILD_ID = 'seven';

function pickSym(rng: () => number): ClassicSym {
  let r = rng() * TOTAL_W;
  for (const s of SYMBOLS) { r -= s.weight; if (r <= 0) return s; }
  return SYMBOLS[0];
}

function payFor(id: string, count: number): number {
  if (count < 3) return 0;
  const sym = SYMBOLS.find(s => s.id === id);
  if (!sym) return 0;
  if (count >= 5) return sym.pays['5'];
  if (count >= 4) return sym.pays['4'];
  return sym.pays['3'];
}

// 9 classic paylines (rows 0=top, 1=mid, 2=bot)
const PAYLINES: number[][] = [
  [1, 1, 1, 1, 1],
  [0, 0, 0, 0, 0],
  [2, 2, 2, 2, 2],
  [0, 1, 2, 1, 0],
  [2, 1, 0, 1, 2],
  [1, 0, 0, 0, 1],
  [1, 2, 2, 2, 1],
  [0, 0, 1, 2, 2],
  [2, 2, 1, 0, 0],
];

const PAYLINE_COLORS = [
  0xff66cc, 0xffd34a, 0x66ff99, 0x66bbff, 0xff5555,
  0xc299ff, 0xffaa33, 0xffff66, 0x99ffd6,
];

const SYM_KEY = (id: string) => `classic-sym-${id}`;

export interface ClassicSpinOutcome {
  totalPayout: number;
  paylineWins: PaylineWin[];
  jackpot: boolean;
  reels: string[][];
}

export interface ClassicSceneEvents {
  onSpinComplete: (o: ClassicSpinOutcome) => void;
  onPhaseChange: (p: 'idle' | 'spinning' | 'big-win') => void;
}

export class ClassicSlotScene extends Phaser.Scene {
  private rng!: SlotRNG;
  private events_!: ClassicSceneEvents;
  private bus = new Phaser.Events.EventEmitter();
  private reels: ReelStrip[] = [];
  private grid: Grid = [];
  private gridOriginX = 0;
  private gridOriginY = 0;
  private neonFrameGfx!: Phaser.GameObjects.Graphics;
  private neonInnerGfx!: Phaser.GameObjects.Graphics;
  private chromeWindowsGfx!: Phaser.GameObjects.Graphics;
  private winLineGfx!: Phaser.GameObjects.Graphics;
  private paylineIndicators: Phaser.GameObjects.Rectangle[] = [];
  private winCounterText!: Phaser.GameObjects.Text;
  private flickerTimers: Phaser.Time.TimerEvent[] = [];
  private turbo = false;

  constructor() { super({ key: SCENE_KEY }); }

  init(data: { events: ClassicSceneEvents }) {
    this.events_ = data.events;
    this.rng = new SlotRNG('classic');
  }

  setTurbo(on: boolean) { this.turbo = on; this.reels.forEach(r => r.setTurbo(on)); }

  create() {
    const w = this.scale.width;
    const h = this.scale.height;

    this.cameras.main.setBackgroundColor(0x0d0d0d);

    // Generate procedural symbol textures
    this.generateSymbolTextures();

    this.gridOriginX = (w - GRID_W) / 2;
    this.gridOriginY = (h - GRID_H) / 2 + 8;

    // Neon frame (drawn under reels)
    this.neonFrameGfx = this.add.graphics();
    this.neonInnerGfx = this.add.graphics();
    this.chromeWindowsGfx = this.add.graphics();
    this.drawFrame();
    this.drawChromeReelWindows();

    // Payline indicators (left side)
    const indicX = this.gridOriginX - 20;
    PAYLINES.forEach((_, i) => {
      const r = this.add.rectangle(indicX, this.gridOriginY + 8 + i * 9, 12, 5, PAYLINE_COLORS[i], 0.25);
      r.setStrokeStyle(1, PAYLINE_COLORS[i], 0.55);
      this.paylineIndicators.push(r);
    });

    // Reel strips
    this.winLineGfx = this.add.graphics().setDepth(10);
    for (let col = 0; col < COLS; col++) {
      const reel = new ReelStrip({
        scene: this,
        reelIndex: col,
        x: this.gridOriginX + col * (CELL + GAP),
        y: this.gridOriginY,
        cellSize: CELL,
        visibleRows: ROWS,
        bus: this.bus,
        buildSymbol: (c, r, sym) => this.buildSymbol(c, r, sym),
        pickRandom: () => this.toReelData(pickSym(this.rng.fn)),
      });
      this.reels.push(reel);
    }
    // Initial fill
    this.grid = this.makeGrid();
    for (let col = 0; col < COLS; col++) {
      this.reels[col].setSymbols(this.grid[col].map(id =>
        this.toReelData(SYMBOLS.find(s => s.id === id)!)));
    }

    // Win counter
    this.winCounterText = this.add.text(w / 2, this.gridOriginY + GRID_H + 18, '', {
      fontFamily: 'Syne, system-ui, sans-serif',
      fontSize: '20px', fontStyle: 'bold',
      color: '#FFD34A', stroke: '#7a4f00', strokeThickness: 4,
    }).setOrigin(0.5);

    // Sound bridge
    this.bus.on('reel:stop', () => this.events.emit('sound', 'slot.stop'));

    // Flicker neon segments
    this.startFlicker();

    this.events_?.onPhaseChange?.('idle');
  }

  /* --------------------- PROCEDURAL SYMBOL TEXTURES ----------------------- */

  private generateSymbolTextures() {
    const SIZE = CELL;
    SYMBOLS.forEach(sym => {
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      const cx = SIZE / 2; const cy = SIZE / 2;
      // Soft tile background
      g.fillStyle(0x000000, 0).fillRect(0, 0, SIZE, SIZE);

      switch (sym.id) {
        case 'cherry': {
          g.lineStyle(3, 0x228822, 1).beginPath();
          g.moveTo(cx, cy - 30).lineTo(cx - 10, cy - 38).lineTo(cx - 12, cy - 5);
          g.strokePath();
          g.fillStyle(0xff2222, 1).fillCircle(cx - 14, cy + 14, 18);
          g.fillStyle(0xff5555, 1).fillCircle(cx - 19, cy + 9, 5);
          g.fillStyle(0xff2222, 1).fillCircle(cx + 14, cy + 16, 16);
          g.fillStyle(0xff5555, 1).fillCircle(cx + 9, cy + 11, 4);
          break;
        }
        case 'lemon': {
          g.fillStyle(0xffff00, 1).fillEllipse(cx, cy + 4, 50, 36);
          g.fillStyle(0xfff299, 1).fillEllipse(cx - 6, cy - 2, 24, 14);
          g.fillStyle(0xffff00, 1).beginPath();
          g.moveTo(cx - 24, cy + 4).lineTo(cx - 30, cy - 4).lineTo(cx - 22, cy);
          g.closePath().fillPath();
          g.fillStyle(0xffff00, 1).beginPath();
          g.moveTo(cx + 24, cy + 4).lineTo(cx + 30, cy + 12).lineTo(cx + 22, cy + 8);
          g.closePath().fillPath();
          break;
        }
        case 'orange': {
          g.fillStyle(0xff8800, 1).fillCircle(cx, cy + 4, 26);
          g.fillStyle(0xffaa33, 1).fillCircle(cx - 6, cy - 2, 12);
          g.fillStyle(0x228822, 1).fillEllipse(cx + 14, cy - 18, 14, 8);
          g.fillStyle(0x44aa22, 1).fillTriangle(cx + 18, cy - 22, cx + 24, cy - 28, cx + 22, cy - 18);
          break;
        }
        case 'grape': {
          const positions: Array<[number, number]> = [
            [cx, cy - 10], [cx - 11, cy], [cx + 11, cy],
            [cx - 6, cy + 12], [cx + 6, cy + 12], [cx, cy + 22],
          ];
          positions.forEach(([px, py]) => {
            g.fillStyle(0x6611aa, 1).fillCircle(px, py, 11);
            g.fillStyle(0x9933cc, 1).fillCircle(px - 3, py - 3, 4);
          });
          g.fillStyle(0x228822, 1).fillTriangle(cx - 6, cy - 24, cx + 6, cy - 24, cx, cy - 14);
          break;
        }
        case 'bell': {
          g.fillStyle(0xffd34a, 1).beginPath();
          g.moveTo(cx, cy - 26);
          g.lineTo(cx + 22, cy + 14);
          g.lineTo(cx - 22, cy + 14);
          g.closePath().fillPath();
          g.fillStyle(0xfff299, 1).beginPath();
          g.moveTo(cx - 6, cy - 22);
          g.lineTo(cx - 4, cy - 8);
          g.lineTo(cx - 12, cy - 4);
          g.closePath().fillPath();
          g.fillStyle(0x7a4f00, 1).fillRect(cx - 16, cy + 14, 32, 5);
          g.fillStyle(0xffd34a, 1).fillCircle(cx, cy + 24, 6);
          break;
        }
        case 'star': {
          const pts: Phaser.Math.Vector2[] = [];
          for (let i = 0; i < 10; i++) {
            const r = i % 2 === 0 ? 28 : 12;
            const a = (Math.PI / 5) * i - Math.PI / 2;
            pts.push(new Phaser.Math.Vector2(cx + Math.cos(a) * r, cy + Math.sin(a) * r));
          }
          g.fillStyle(0xffff66, 1).fillPoints(pts, true);
          g.lineStyle(2, 0xffd34a, 1).strokePoints(pts, true);
          break;
        }
        case 'clover': {
          g.fillStyle(0x00cc44, 1);
          g.fillCircle(cx, cy - 12, 13);
          g.fillCircle(cx - 12, cy, 13);
          g.fillCircle(cx + 12, cy, 13);
          g.fillCircle(cx, cy + 12, 13);
          g.fillStyle(0x44ee66, 1).fillCircle(cx - 4, cy - 16, 4);
          g.lineStyle(3, 0x227722, 1).beginPath();
          g.moveTo(cx, cy + 16).lineTo(cx - 4, cy + 30);
          g.strokePath();
          break;
        }
        case 'diamond': {
          g.fillStyle(0x00ffff, 1).beginPath();
          g.moveTo(cx, cy - 28);
          g.lineTo(cx + 22, cy);
          g.lineTo(cx, cy + 28);
          g.lineTo(cx - 22, cy);
          g.closePath().fillPath();
          g.fillStyle(0xb6ffff, 1).beginPath();
          g.moveTo(cx - 12, cy - 8);
          g.lineTo(cx, cy - 22);
          g.lineTo(cx + 12, cy - 8);
          g.closePath().fillPath();
          g.lineStyle(2, 0x008888, 1).strokeRect(cx - 22, cy - 28, 44, 56);
          break;
        }
        case 'seven': {
          g.fillStyle(0xff0033, 1).fillRect(cx - 20, cy - 24, 40, 8);
          g.fillStyle(0xff0033, 1).beginPath();
          g.moveTo(cx + 16, cy - 16);
          g.lineTo(cx - 4, cy + 28);
          g.lineTo(cx + 4, cy + 28);
          g.lineTo(cx + 24, cy - 16);
          g.closePath().fillPath();
          g.fillStyle(0xffffff, 0.6).fillRect(cx - 18, cy - 22, 36, 2);
          break;
        }
      }
      g.generateTexture(SYM_KEY(sym.id), SIZE, SIZE);
      g.destroy();
    });
  }

  /* ----------------------------- DRAWING ---------------------------------- */

  private drawFrame() {
    const g = this.neonFrameGfx;
    const inner = this.neonInnerGfx;
    g.clear(); inner.clear();
    const x = this.gridOriginX - 18;
    const y = this.gridOriginY - 18;
    const w = GRID_W + 36;
    const h = GRID_H + 36;
    // Outer hot-pink
    g.lineStyle(6, 0xff0066, 0.9).strokeRoundedRect(x, y, w, h, 14);
    // Soft glow halo
    g.lineStyle(12, 0xff0066, 0.18).strokeRoundedRect(x - 3, y - 3, w + 6, h + 6, 16);
    // Inner yellow
    inner.lineStyle(3, 0xffff00, 0.95).strokeRoundedRect(x + 6, y + 6, w - 12, h - 12, 10);
  }

  private drawChromeReelWindows() {
    const g = this.chromeWindowsGfx;
    g.clear();
    for (let c = 0; c < COLS; c++) {
      const wx = this.gridOriginX + c * (CELL + GAP) - 3;
      const wy = this.gridOriginY - 3;
      const ww = CELL + 6;
      const hh = CELL * ROWS + GAP * (ROWS - 1) + 6;
      // Dark gradient background
      g.fillStyle(0x1a1a1a, 1).fillRoundedRect(wx, wy, ww, hh, 6);
      // Silver border
      g.lineStyle(3, 0xc0c0c0, 0.85).strokeRoundedRect(wx, wy, ww, hh, 6);
      // Inner highlight
      g.lineStyle(1, 0xeeeeee, 0.4).strokeRoundedRect(wx + 2, wy + 2, ww - 4, hh - 4, 5);
    }
  }

  private startFlicker() {
    // Periodically dim/restore one of 4 frame quadrants
    const segments = [0, 1, 2, 3];
    segments.forEach(seg => {
      const t = this.time.addEvent({
        delay: 1500 + seg * 300,
        loop: true,
        callback: () => {
          this.tweens.add({
            targets: this.neonFrameGfx,
            alpha: 0.55,
            duration: 90,
            yoyo: true,
            ease: 'Sine.easeInOut',
          });
        },
      });
      this.flickerTimers.push(t);
    });
  }

  /* ------------------------------- SYMBOLS -------------------------------- */

  private toReelData(sym: ClassicSym): ReelSymbolData {
    return { id: sym.id, texture: SYM_KEY(sym.id), color: sym.color };
  }

  private buildSymbol(col: number, row: number, sym: ReelSymbolData): Phaser.GameObjects.Container {
    const c = this.add.container(0, 0);
    const bg = this.add.graphics();
    bg.fillStyle(sym.color, 0.10).fillRoundedRect(-CELL / 2 + 3, -CELL / 2 + 3, CELL - 6, CELL - 6, 6);
    const glow = this.add.rectangle(0, 0, CELL - 4, CELL - 4, sym.color, 0).setStrokeStyle(3, sym.color, 0);
    const img = this.add.image(0, 0, sym.texture).setDisplaySize(Math.round(CELL * 0.80), Math.round(CELL * 0.80));
    c.add([bg, glow, img]);
    c.setData({ symbolId: sym.id, glow });

    if (sym.id === 'seven' || sym.id === 'diamond' || sym.id === 'star') {
      this.tweens.add({
        targets: c, scaleX: 1.04, scaleY: 1.04,
        duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        delay: (col * ROWS + row) * 120,
      });
    }
    return c;
  }

  /* -------------------------------- GRID ---------------------------------- */

  private makeGrid(): Grid {
    this.rng.refresh(64);
    const g: Grid = [];
    for (let c = 0; c < COLS; c++) {
      const col: string[] = [];
      for (let r = 0; r < ROWS; r++) col.push(pickSym(this.rng.fn).id);
      g.push(col);
    }
    return g;
  }

  /* ------------------------------- WIN ------------------------------------ */

  private evaluateWins(grid: Grid, bet: number): { wins: PaylineWin[]; total: number; jackpot: boolean } {
    const wins = evaluatePaylines(grid, PAYLINES, WILD_ID, (id, n) => payFor(id, n) * (bet / PAYLINES.length));
    const total = wins.reduce((s, w) => s + w.pay, 0);
    // Jackpot: 5 sevens on middle row
    const middleAllSevens = grid.every(col => col[1] === WILD_ID);
    return { wins, total, jackpot: middleAllSevens };
  }

  private async showWinLines(wins: PaylineWin[], total: number): Promise<void> {
    if (wins.length === 0) return;
    const winning = new Set(wins.flatMap(w => w.cells.map(([c, r]) => `${c}:${r}`)));
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        const cell = this.reels[c].landed[r];
        if (!cell) continue;
        if (!winning.has(`${c}:${r}`)) {
          this.tweens.add({ targets: cell, alpha: 0.35, duration: 200 });
        } else {
          const glow = cell.getData('glow') as Phaser.GameObjects.Rectangle;
          this.tweens.add({ targets: glow, alpha: 0.7, strokeAlpha: 1, duration: 220, yoyo: true, repeat: 2 });
          this.tweens.add({ targets: cell, scaleX: 1.18, scaleY: 1.18, duration: 220, yoyo: true, repeat: 2 });
        }
      }
    }
    // Light indicators
    wins.forEach(w => {
      const bar = this.paylineIndicators[w.paylineIndex];
      if (bar) this.tweens.add({ targets: bar, fillAlpha: 0.95, duration: 200, yoyo: true, repeat: 3 });
    });

    const turboMul = this.turbo ? 0.3 : 1;
    for (const w of wins) {
      await this.drawDashedPayline(w.paylineIndex, w.cells.slice(0, w.count), 280 * turboMul);
    }
    if (total > 0) await this.runWinCounter(total, 1100 * turboMul);

    await this.delay(900 * turboMul);
    for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) {
      const cell = this.reels[c].landed[r];
      if (cell) cell.setAlpha(1);
    }
    this.winLineGfx.clear();
    this.winCounterText.setText('');
  }

  private drawDashedPayline(paylineIdx: number, cells: Array<[number, number]>, durMs: number): Promise<void> {
    return new Promise(resolve => {
      const color = PAYLINE_COLORS[paylineIdx % PAYLINE_COLORS.length];
      const points = cells.map(([c, r]) => ({
        x: this.gridOriginX + c * (CELL + GAP) + CELL / 2,
        y: this.gridOriginY + r * (CELL + GAP) + CELL / 2,
      }));
      const obj = { progress: 0 };
      this.tweens.add({
        targets: obj, progress: 1, duration: durMs, ease: 'Cubic.easeInOut',
        onUpdate: () => {
          this.winLineGfx.clear();
          this.winLineGfx.lineStyle(8, color, 0.25);
          for (let i = 0; i < points.length - 1; i++) {
            const segEnd = (i + 1) / (points.length - 1);
            if (obj.progress >= segEnd) {
              this.winLineGfx.lineBetween(points[i].x, points[i].y, points[i + 1].x, points[i + 1].y);
            } else {
              const segStart = i / (points.length - 1);
              const localT = Math.max(0, (obj.progress - segStart) / (segEnd - segStart));
              const tx = points[i].x + (points[i + 1].x - points[i].x) * localT;
              const ty = points[i].y + (points[i + 1].y - points[i].y) * localT;
              this.winLineGfx.lineBetween(points[i].x, points[i].y, tx, ty);
              break;
            }
          }
          this.winLineGfx.lineStyle(3, color, 1);
          for (let i = 0; i < points.length - 1; i++) {
            const segEnd = (i + 1) / (points.length - 1);
            if (obj.progress >= segEnd) {
              this.winLineGfx.lineBetween(points[i].x, points[i].y, points[i + 1].x, points[i + 1].y);
            }
          }
          points.forEach((p, i) => {
            if (obj.progress >= i / (points.length - 1)) {
              this.winLineGfx.fillStyle(color, 1).fillCircle(p.x, p.y, 5);
            }
          });
        },
        onComplete: () => resolve(),
      });
    });
  }

  private runWinCounter(target: number, durMs: number): Promise<void> {
    return new Promise(resolve => {
      const obj = { v: 0 };
      this.tweens.add({
        targets: obj, v: target, duration: durMs, ease: 'Cubic.easeOut',
        onUpdate: () => this.winCounterText.setText(`+ ${obj.v.toFixed(2)}`),
        onComplete: () => {
          this.tweens.add({
            targets: this.winCounterText, scale: { from: 1, to: 1.3 },
            yoyo: true, duration: 200,
            onComplete: () => resolve(),
          });
        },
      });
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => this.time.delayedCall(ms, resolve));
  }

  /* -------------------------------- SPIN ---------------------------------- */

  async startSpin(bet: number): Promise<ClassicSpinOutcome> {
    this.events_?.onPhaseChange?.('spinning');
    this.winLineGfx.clear();
    this.winCounterText.setText('');

    const finalGrid = this.makeGrid();
    const turboMul = this.turbo ? 0.3 : 1;
    const reelPromises = this.reels.map((reel, i) => {
      const symbolsForReel: ReelSymbolData[] = finalGrid[i].map(id =>
        this.toReelData(SYMBOLS.find(s => s.id === id)!),
      );
      return reel.spinTo(symbolsForReel, {
        delayMs: i * 280 * turboMul,
        durationMs: 800 + i * 100,
      });
    });
    await Promise.all(reelPromises);
    this.grid = finalGrid;

    const { wins, total, jackpot } = this.evaluateWins(this.grid, bet);

    if (wins.length > 0) {
      // Sparkle every winning cell on land for premium feel
      const winCells = new Set(wins.flatMap(w => w.cells.map(([c, r]) => `${c}:${r}`)));
      winCells.forEach(key => {
        const [c, r] = key.split(':').map(Number);
        const wx = this.gridOriginX + c * (CELL + GAP) + CELL / 2;
        const wy = this.gridOriginY + r * (CELL + GAP) + CELL / 2;
        sparkleBurst(this, wx, wy, { count: 6, tint: [0xff66cc, 0xffd34a, 0xffffff] });
      });
      await this.showWinLines(wins, total);
    }

    if (jackpot) {
      // Full neon flash + heavy shake for the 5-sevens jackpot.
      screenShake(this, 600, 0.018);
      await flashColor(this, 0xffff66, 0.6, 480);
    }

    const outcome: ClassicSpinOutcome = {
      totalPayout: total,
      paylineWins: wins,
      jackpot,
      reels: this.grid,
    };
    this.events_?.onSpinComplete?.(outcome);
    this.events_?.onPhaseChange?.('idle');
    return outcome;
  }

  shutdown() {
    this.flickerTimers.forEach(t => t.remove());
    this.flickerTimers = [];
    this.reels.forEach(r => r.destroy());
    this.bus.removeAllListeners();
    this.tweens.killAll();
  }
}

export const CLASSIC_SYMBOLS_PUBLIC = SYMBOLS;
export const CLASSIC_PAYLINES_COUNT = PAYLINES.length;
