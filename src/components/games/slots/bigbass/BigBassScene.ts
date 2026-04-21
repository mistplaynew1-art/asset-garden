/**
 * Big Bass Bonanza — full rebuild per MEGA PROMPT.
 *
 * Visual identity: lakeside dock — wood-plank frame, water caustics overlay,
 * floating bubble particles, lily-pad corner ornaments, teal/amber palette.
 * Mechanics: 5×3 grid, 10 fixed paylines, fisherman wild collects bass cash,
 * 3+ chest scatters trigger 10 free spins (boosted bass weights).
 *
 * Built on shared core (ReelStrip + SlotRNG + WinEvaluator).
 */
import * as Phaser from 'phaser';
import {
  BIGBASS_SYMBOLS, FISHERMAN_WILD, SCATTER_CHEST,
  pickBigBassSymbol, pickBigBassSymbolFreeSpin, pickCashValue, getBigBassPay,
  MONEY_TEXTURE, BACKGROUND_TEXTURE_BB, type BigBassSymbol,
} from './symbols';
import { SlotRNG } from '../core/SlotRNG';
import { ReelStrip, type ReelSymbolData } from '../core/ReelStrip';
import { evaluatePaylines, countSymbol, type Grid, type PaylineWin } from '../core/WinEvaluator';
import { screenShake, flashColor, sparkleBurst, landingRing, attachCoinTrail } from '../core/SlotFX';

export const COLS = 5;
export const ROWS = 3;
export const CELL = 96;
export const GAP = 6;
export const GRID_W = COLS * CELL + (COLS - 1) * GAP;
export const GRID_H = ROWS * CELL + (ROWS - 1) * GAP;

const SCENE_KEY = 'BigBassScene';

// 10 fixed paylines (rows: 0=top, 1=mid, 2=bottom)
const PAYLINES: number[][] = [
  [1, 1, 1, 1, 1], // mid
  [0, 0, 0, 0, 0], // top
  [2, 2, 2, 2, 2], // bottom
  [0, 1, 2, 1, 0],
  [2, 1, 0, 1, 2],
  [0, 0, 1, 2, 2],
  [2, 2, 1, 0, 0],
  [1, 0, 0, 0, 1],
  [1, 2, 2, 2, 1],
  [0, 1, 0, 1, 0],
];

// Per-payline color (for line draw + indicator)
const PAYLINE_COLORS = [
  0xffd34a, 0xff5e5e, 0x5effa3, 0x66bbff, 0xff66cc,
  0xffaa33, 0x99ff99, 0xc299ff, 0xffeb66, 0xff7777,
];

export interface BigBassSpinOutcome {
  totalPayout: number;
  baseWin: number;
  scatterCount: number;
  triggeredFreeSpins: boolean;
  freeSpinsAwarded: number;
  freeSpinsTotal: number;
  collectedCash: number;
  paylineWins: PaylineWin[];
  reels: string[][];
}

export interface BigBassSceneEvents {
  onSpinComplete: (outcome: BigBassSpinOutcome) => void;
  onCashCollected: (amount: number) => void;
  onFreeSpinsTriggered: (count: number) => void;
  onFreeSpinTick: (remaining: number) => void;
  onPhaseChange: (phase: 'idle' | 'spinning' | 'free-spins' | 'big-win') => void;
}

interface CellExtras {
  cashValue?: number;
  cashLabel?: Phaser.GameObjects.Text;
}

const SYM_KEY = (id: string) => `bigbass-sym-${id}`;
const ALL_SYMS = [...BIGBASS_SYMBOLS, FISHERMAN_WILD, SCATTER_CHEST];

export class BigBassScene extends Phaser.Scene {
  private rng!: SlotRNG;
  private events_!: BigBassSceneEvents;
  private bus = new Phaser.Events.EventEmitter();
  private bgImage!: Phaser.GameObjects.Image;
  private bgOverlay!: Phaser.GameObjects.Graphics;
  private causticsGfx!: Phaser.GameObjects.Graphics;
  private dockFrameGfx!: Phaser.GameObjects.Graphics;
  private bubbles!: Phaser.GameObjects.Particles.ParticleEmitter;
  private waterShimmerTime = 0;
  private gridContainer!: Phaser.GameObjects.Container;
  private gridOriginX = 0;
  private gridOriginY = 0;
  private reels: ReelStrip[] = [];
  private grid: Grid = [];
  private cellExtras: CellExtras[][] = [];
  private winLineGfx!: Phaser.GameObjects.Graphics;
  private paylineIndicators: Phaser.GameObjects.Rectangle[] = [];
  private freeSpinsBadge!: Phaser.GameObjects.Container;
  private freeSpinsText!: Phaser.GameObjects.Text;
  private cashCounterText!: Phaser.GameObjects.Text;
  private winCounterText!: Phaser.GameObjects.Text;
  private inFreeSpins = false;
  private freeSpinsLeft = 0;
  private collectedCash = 0;
  private turbo = false;

  constructor() { super({ key: SCENE_KEY }); }

  init(data: { events: BigBassSceneEvents }) {
    this.events_ = data.events;
    this.rng = new SlotRNG('bigbass');
  }

  setTurbo(on: boolean) {
    this.turbo = on;
    this.reels.forEach(r => r.setTurbo(on));
  }

  preload() {
    this.load.image('bigbass-bg', BACKGROUND_TEXTURE_BB);
    ALL_SYMS.forEach(s => this.load.image(SYM_KEY(s.id), s.texture));
    this.load.image('bigbass-money', MONEY_TEXTURE);
  }

  create() {
    const w = this.scale.width;
    const h = this.scale.height;

    // Background photo + teal overlay
    this.bgImage = this.add.image(w / 2, h / 2, 'bigbass-bg').setDisplaySize(w, h);
    this.bgOverlay = this.add.graphics();
    this.bgOverlay.fillStyle(0x002a3a, 0.55).fillRect(0, 0, w, h);

    // Caustics — animated wavy lines drawn each frame in update()
    this.causticsGfx = this.add.graphics();

    // Bubble particles (free key — generate texture)
    const bubbleG = this.make.graphics({ x: 0, y: 0 }, false);
    bubbleG.fillStyle(0xffffff, 0.6).fillCircle(8, 8, 7);
    bubbleG.lineStyle(1, 0xffffff, 0.9).strokeCircle(8, 8, 7);
    bubbleG.generateTexture('bb-bubble', 16, 16);
    bubbleG.destroy();

    this.bubbles = this.add.particles(0, h, 'bb-bubble', {
      x: { min: 0, max: w },
      y: h + 10,
      lifespan: 5000,
      speedY: { min: -50, max: -25 },
      speedX: { min: -10, max: 10 },
      scale: { start: 0.4, end: 0.8 },
      alpha: { start: 0.7, end: 0 },
      frequency: 180,
      quantity: 1,
    });

    // Compute grid origin (centered, leave space at top for badges)
    this.gridOriginX = (w - GRID_W) / 2;
    this.gridOriginY = (h - GRID_H) / 2 + 10;

    // Dock frame (drawn under reels)
    this.dockFrameGfx = this.add.graphics();
    this.drawDockFrame();

    // Payline indicators (left strip)
    const indicX = this.gridOriginX - 18;
    PAYLINES.forEach((_, i) => {
      const r = this.add.rectangle(indicX, this.gridOriginY + 6 + i * 8, 12, 5, PAYLINE_COLORS[i], 0.25);
      r.setStrokeStyle(1, PAYLINE_COLORS[i], 0.4);
      this.paylineIndicators.push(r);
    });

    // Reel strips
    this.gridContainer = this.add.container(0, 0);
    this.winLineGfx = this.add.graphics();

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
        pickRandom: () => this.toReelData(this.pickSymbol()),
      });
      this.reels.push(reel);
    }

    // Initialize grid + render initial symbols
    this.grid = this.makeGrid();
    this.cellExtras = Array.from({ length: COLS }, () => Array.from({ length: ROWS }, () => ({})));
    for (let col = 0; col < COLS; col++) {
      this.reels[col].setSymbols(
        Array.from({ length: ROWS }, (_, r) => this.toReelData(ALL_SYMS.find(s => s.id === this.grid[col][r])!)),
      );
    }

    // Cash counter
    this.cashCounterText = this.add.text(w / 2, this.gridOriginY - 28, '', {
      fontFamily: 'Syne, system-ui, sans-serif',
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#ffd34a',
      stroke: '#3a2200',
      strokeThickness: 4,
    }).setOrigin(0.5);

    // Win counter (above grid)
    this.winCounterText = this.add.text(w / 2, this.gridOriginY + GRID_H + 14, '', {
      fontFamily: 'Syne, system-ui, sans-serif',
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#FFD34A',
      stroke: '#7a4f00',
      strokeThickness: 4,
    }).setOrigin(0.5);

    // Free spins badge (top-right)
    this.freeSpinsBadge = this.add.container(w - 60, 22);
    const fsBg = this.add.rectangle(0, 0, 110, 28, 0xffd34a, 0.18).setStrokeStyle(2, 0xffd34a, 0.7);
    fsBg.setOrigin(0.5);
    this.freeSpinsText = this.add.text(0, 0, 'FS: 0', {
      fontFamily: 'Syne, system-ui, sans-serif',
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#ffd34a',
    }).setOrigin(0.5);
    this.freeSpinsBadge.add([fsBg, this.freeSpinsText]);
    this.freeSpinsBadge.setVisible(false);

    // Reel-stop sound bridge
    this.bus.on('reel:stop', (idx: number) => {
      this.events_?.onPhaseChange?.('spinning'); // keep visible
      this.events.emit('sound', 'slot.stop', idx);
    });

    this.events_?.onPhaseChange?.('idle');
  }

  update(_t: number, dt: number) {
    this.waterShimmerTime += dt * 0.001;
    this.drawCaustics();
  }

  /* ------------------------------ DRAWING --------------------------------- */

  private drawDockFrame() {
    const g = this.dockFrameGfx;
    g.clear();
    const x = this.gridOriginX - 14;
    const y = this.gridOriginY - 14;
    const w = GRID_W + 28;
    const h = GRID_H + 28;

    // Outer wood plank — saddle brown
    g.fillStyle(0x6a3d1f, 1).fillRoundedRect(x, y, w, h, 14);
    // Inner darker plank — walnut
    g.fillStyle(0x3a1f0e, 1).fillRoundedRect(x + 6, y + 6, w - 12, h - 12, 10);
    // Plank lines (horizontal grain)
    g.lineStyle(1, 0x4a2810, 0.7);
    for (let i = 1; i < 5; i++) {
      const py = y + i * (h / 5);
      g.lineBetween(x + 8, py, x + w - 8, py);
    }
    // Bolt corners
    [[x + 12, y + 12], [x + w - 12, y + 12], [x + 12, y + h - 12], [x + w - 12, y + h - 12]].forEach(([bx, by]) => {
      g.fillStyle(0x9a7340, 1).fillCircle(bx, by, 4);
      g.fillStyle(0x3a2a18, 1).fillCircle(bx, by, 2);
    });

    // Lily-pad corner ornaments
    [[x + 4, y + 4, 1], [x + w - 4, y + 4, -1], [x + 4, y + h - 4, 1], [x + w - 4, y + h - 4, -1]].forEach(([cx, cy, dir]) => {
      g.fillStyle(0x2f7a3a, 0.85).fillCircle(cx, cy, 10);
      g.lineStyle(1.5, 0x9affc0, 0.9);
      g.beginPath();
      g.arc(cx, cy, 10, 0, Math.PI * 1.6);
      g.strokePath();
      // Tiny pink water-lily petal
      g.fillStyle(0xff99cc, 0.9).fillCircle(cx + (dir as number) * 3, cy - 1, 2.5);
    });
  }

  private drawCaustics() {
    const g = this.causticsGfx;
    g.clear();
    g.lineStyle(1, 0x9fdfff, 0.16);
    const w = this.scale.width;
    const h = this.scale.height;
    const t = this.waterShimmerTime;
    for (let i = 0; i < 14; i++) {
      g.beginPath();
      const yBase = (i / 14) * h;
      g.moveTo(0, yBase);
      for (let x = 0; x <= w; x += 14) {
        const y = yBase + Math.sin((x * 0.012) + t * 1.3 + i * 0.6) * 7;
        g.lineTo(x, y);
      }
      g.strokePath();
    }
  }

  /* ------------------------------ SYMBOLS --------------------------------- */

  private toReelData(sym: BigBassSymbol): ReelSymbolData {
    return { id: sym.id, texture: SYM_KEY(sym.id), color: sym.color };
  }

  private pickSymbol(): BigBassSymbol {
    return this.inFreeSpins ? pickBigBassSymbolFreeSpin(this.rng.fn) : pickBigBassSymbol(this.rng.fn);
  }

  private buildSymbol(col: number, row: number, sym: ReelSymbolData): Phaser.GameObjects.Container {
    const c = this.add.container(0, 0);
    // Background tile with subtle radial-style fill
    const bg = this.add.graphics();
    bg.fillStyle(sym.color, 0.10).fillRoundedRect(-CELL / 2 + 3, -CELL / 2 + 3, CELL - 6, CELL - 6, 8);
    bg.lineStyle(1, sym.color, 0.35).strokeRoundedRect(-CELL / 2 + 3, -CELL / 2 + 3, CELL - 6, CELL - 6, 8);
    // Glow (initially invisible)
    const glow = this.add.rectangle(0, 0, CELL - 4, CELL - 4, 0xffd34a, 0).setStrokeStyle(3, 0xffd34a, 0);
    const img = this.add.image(0, 0, sym.texture).setDisplaySize(Math.round(CELL * 0.80), Math.round(CELL * 0.80));
    c.add([bg, glow, img]);
    c.setData({ symbolId: sym.id, glow });

    // Idle pulse for high/special symbols
    if (sym.id === 'bass' || sym.id === 'fisherman' || sym.id === 'chest') {
      this.tweens.add({
        targets: c,
        scaleX: 1.04, scaleY: 1.04,
        duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        delay: (col * ROWS + row) * 120,
      });
    }

    // Cash label on bass during free spins (or fisherman with random cash on base)
    if (this.inFreeSpins && sym.id === 'bass') {
      const cashValue = pickCashValue(this.rng.fn);
      const cashLabel = this.add.text(0, CELL / 2 - 14, `${cashValue}`, {
        fontFamily: 'Syne, system-ui, sans-serif',
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#ffd34a',
        stroke: '#3a2200',
        strokeThickness: 3,
      }).setOrigin(0.5);
      c.add(cashLabel);
      this.cellExtras[col][row] = { cashValue, cashLabel };
    } else {
      this.cellExtras[col][row] = {};
    }

    return c;
  }

  /* -------------------------------- GRID ---------------------------------- */

  private makeGrid(): Grid {
    this.rng.refresh(64);
    const g: Grid = [];
    for (let c = 0; c < COLS; c++) {
      const col: string[] = [];
      for (let r = 0; r < ROWS; r++) col.push(this.pickSymbol().id);
      g.push(col);
    }
    return g;
  }

  /* --------------------------- WIN EVALUATION ----------------------------- */

  private evaluateBaseWin(grid: Grid, bet: number): { wins: PaylineWin[]; total: number; scatterCount: number } {
    const wins = evaluatePaylines(grid, PAYLINES, FISHERMAN_WILD.id, (id, n) => getBigBassPay(id, n) * (bet / PAYLINES.length));
    const total = wins.reduce((s, w) => s + w.pay, 0);
    const scatterCount = countSymbol(grid, SCATTER_CHEST.id);
    return { wins, total, scatterCount };
  }

  /* --------------------------- ANIMATIONS --------------------------------- */

  /** Highlight winning paylines with dashed line and glow on cells. */
  private async showWinLines(wins: PaylineWin[], totalWin: number): Promise<void> {
    if (wins.length === 0) return;
    // Dim non-winning cells
    const winningSet = new Set(wins.flatMap(w => w.cells.map(([c, r]) => `${c}:${r}`)));
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        const cell = this.reels[c].landed[r];
        if (!cell) continue;
        if (!winningSet.has(`${c}:${r}`)) {
          this.tweens.add({ targets: cell, alpha: 0.35, duration: 200 });
        } else {
          const glow = cell.getData('glow') as Phaser.GameObjects.Rectangle;
          this.tweens.add({ targets: glow, alpha: 0.7, strokeAlpha: 1, duration: 220, yoyo: true, repeat: 2 });
          this.tweens.add({ targets: cell, scaleX: 1.15, scaleY: 1.15, duration: 220, yoyo: true, repeat: 2 });
        }
      }
    }

    // Indicator bars light
    wins.forEach(w => {
      const bar = this.paylineIndicators[w.paylineIndex];
      if (bar) this.tweens.add({ targets: bar, fillAlpha: 0.95, duration: 200, yoyo: true, repeat: 3 });
    });

    // Animate dashed polylines per payline (sequential)
    const turboMul = this.turbo ? 0.3 : 1;
    for (const w of wins) {
      await this.drawDashedPayline(w.paylineIndex, w.cells.slice(0, w.count), 320 * turboMul);
    }

    // Win counter tick-up
    if (totalWin > 0) await this.runWinCounter(totalWin, 1100 * turboMul);

    // Hold then restore
    await this.delay(900 * turboMul);
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        const cell = this.reels[c].landed[r];
        if (cell) cell.setAlpha(1);
      }
    }
    this.winLineGfx.clear();
    this.winCounterText.setText('');
  }

  private async drawDashedPayline(paylineIdx: number, cells: Array<[number, number]>, durMs: number): Promise<void> {
    return new Promise(resolve => {
      const color = PAYLINE_COLORS[paylineIdx % PAYLINE_COLORS.length];
      const points = cells.map(([c, r]) => ({
        x: this.gridOriginX + c * (CELL + GAP) + CELL / 2,
        y: this.gridOriginY + r * (CELL + GAP) + CELL / 2,
      }));
      const obj = { progress: 0 };
      this.tweens.add({
        targets: obj,
        progress: 1,
        duration: durMs,
        ease: 'Cubic.easeInOut',
        onUpdate: () => {
          this.winLineGfx.clear();
          this.winLineGfx.lineStyle(4, color, 0.95);
          // Outer halo
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
          // Dot at each visited point
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
            targets: this.winCounterText,
            scale: { from: 1, to: 1.3 },
            yoyo: true, duration: 200,
            onComplete: () => resolve(),
          });
        },
      });
    });
  }

  /** Fly money coins from each cash-bearing bass to the fisherman cell. */
  private async collectCash(bet: number): Promise<number> {
    // Find fisherman cells & cash bass cells
    const fishermen: Array<[number, number]> = [];
    const cashCells: Array<{ col: number; row: number; value: number }> = [];
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        if (this.grid[c][r] === FISHERMAN_WILD.id) fishermen.push([c, r]);
        const v = this.cellExtras[c]?.[r]?.cashValue;
        if (v && this.grid[c][r] === 'bass') cashCells.push({ col: c, row: r, value: v });
      }
    }
    if (fishermen.length === 0 || cashCells.length === 0) return 0;
    let sum = 0;
    const turboMul = this.turbo ? 0.3 : 1;

    for (let i = 0; i < cashCells.length; i++) {
      const cc = cashCells[i];
      const target = fishermen[i % fishermen.length];
      const tx = this.gridOriginX + target[0] * (CELL + GAP) + CELL / 2;
      const ty = this.gridOriginY + target[1] * (CELL + GAP) + CELL / 2;
      const sx = this.gridOriginX + cc.col * (CELL + GAP) + CELL / 2;
      const sy = this.gridOriginY + cc.row * (CELL + GAP) + CELL / 2;

      const coin = this.add.image(sx, sy, 'bigbass-money').setDisplaySize(36, 36).setDepth(50);
      const stopTrail = attachCoinTrail(this, coin, { tint: 0xffd34a });
      const lbl = this.add.text(sx, sy - 18, `+${cc.value}`, {
        fontFamily: 'Syne, system-ui, sans-serif',
        fontSize: '14px', fontStyle: 'bold',
        color: '#ffd34a', stroke: '#3a2200', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(51);

      const arc = -80;
      const obj = { t: 0 };
      // Hide cash label on the bass cell
      const extra = this.cellExtras[cc.col][cc.row];
      extra.cashLabel?.setAlpha(0);

      await new Promise<void>(resolve => {
        this.tweens.add({
          targets: obj, t: 1, duration: 600 * turboMul, ease: 'Cubic.easeIn',
          onUpdate: () => {
            const x = sx + (tx - sx) * obj.t;
            const y = sy + (ty - sy) * obj.t + arc * Math.sin(Math.PI * obj.t);
            coin.setPosition(x, y);
            lbl.setPosition(x, y - 18).setAlpha(1 - obj.t * 0.5);
          },
          onComplete: () => {
            stopTrail();
            coin.destroy(); lbl.destroy();
            // Pulse fisherman + sparkle burst at fisherman cell
            const fis = this.reels[target[0]].landed[target[1]];
            if (fis) this.tweens.add({ targets: fis, scaleX: 1.3, scaleY: 1.3, duration: 150, yoyo: true });
            sparkleBurst(this, tx, ty, { count: 8, tint: [0xffd34a, 0xfff066] });
            sum += cc.value * bet * 0.5; // cash pays scaled by half-bet
            this.collectedCash += cc.value;
            this.cashCounterText.setText(`💰 ${this.collectedCash.toFixed(0)}`);
            this.events_?.onCashCollected?.(cc.value);
            this.events.emit('sound', 'slot.win');
            resolve();
          },
        });
      });
    }
    return sum;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => this.time.delayedCall(ms, resolve));
  }

  /** Anticipation check: scatter potential after reel index `i`. */
  private shouldAnticipate(reelIndex: number, scatterSoFar: number): boolean {
    if (reelIndex < 2) return false;
    // If 2 scatters already on first 2-3 reels and we're about to spin reel 3+
    return scatterSoFar >= 2;
  }

  /* -------------------------------- SPIN ---------------------------------- */

  /** Public — start a single spin. Returns final outcome. */
  async startSpin(bet: number, isFreeSpin = false): Promise<BigBassSpinOutcome> {
    this.events_?.onPhaseChange?.('spinning');
    this.winLineGfx.clear();
    this.winCounterText.setText('');

    // Generate final grid first so we can compute anticipation
    const finalGrid = this.makeGrid();

    // Spin reels left → right with stagger
    const stopBaseDelay = 0;
    const spinDur = 800;
    const stagger = 280;
    const turboMul = this.turbo ? 0.3 : 1;
    let scatterSoFar = 0;

    const reelPromises = this.reels.map((reel, i) => {
      // Count scatters on previous reels for anticipation decision
      const prevScatters = scatterSoFar;
      const symbolsForReel: ReelSymbolData[] = finalGrid[i].map(id =>
        this.toReelData(ALL_SYMS.find(s => s.id === id)!),
      );
      // Update scatter count after this reel
      scatterSoFar += finalGrid[i].filter(s => s === SCATTER_CHEST.id).length;

      const anticipate = this.shouldAnticipate(i, prevScatters);
      return reel.spinTo(symbolsForReel, {
        delayMs: stopBaseDelay + i * stagger * turboMul,
        durationMs: spinDur + i * 100,
        anticipate,
      });
    });

    await Promise.all(reelPromises);

    // Commit grid + extras (cash labels are built inside buildSymbol)
    this.grid = finalGrid;

    // Evaluate base wins
    const { wins, total, scatterCount } = this.evaluateBaseWin(this.grid, bet);

    // Cash collect (free spins or whenever fisherman + cash are present)
    const cashWin = await this.collectCash(bet);

    // Show winning paylines
    if (wins.length > 0) await this.showWinLines(wins, total);

    let triggeredFS = false;
    let fsAwarded = 0;
    let fsTotal = 0;

    if (scatterCount >= 3 && !this.inFreeSpins) {
      triggeredFS = true;
      fsAwarded = 10;
      // Burst at every chest cell + screen shake + teal flash
      for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) {
        if (this.grid[c][r] === SCATTER_CHEST.id) {
          const wx = this.gridOriginX + c * (CELL + GAP) + CELL / 2;
          const wy = this.gridOriginY + r * (CELL + GAP) + CELL / 2;
          sparkleBurst(this, wx, wy, { count: 18, tint: [0xffd34a, 0x66ddff, 0xffffff], depth: 90 });
          landingRing(this, wx, wy, CELL * 0.7, 0xffd34a, 600);
        }
      }
      screenShake(this, 320, 0.01);
      await flashColor(this, 0x66ddff, 0.35, 360);
      this.startFreeSpins(fsAwarded);
      // Run them
      const fsResult = await this.runFreeSpinsLoop(bet);
      fsTotal = fsResult;
    }

    const outcome: BigBassSpinOutcome = {
      totalPayout: total + cashWin + fsTotal,
      baseWin: total,
      scatterCount,
      triggeredFreeSpins: triggeredFS,
      freeSpinsAwarded: fsAwarded,
      freeSpinsTotal: fsTotal,
      collectedCash: this.inFreeSpins ? this.collectedCash : (cashWin > 0 ? cashWin : 0),
      paylineWins: wins,
      reels: this.grid,
    };

    if (!this.inFreeSpins) {
      this.events_?.onSpinComplete?.(outcome);
      this.events_?.onPhaseChange?.('idle');
    }
    return outcome;
  }

  private startFreeSpins(count: number) {
    this.inFreeSpins = true;
    this.freeSpinsLeft = count;
    this.collectedCash = 0;
    this.freeSpinsBadge.setVisible(true);
    this.freeSpinsText.setText(`FS: ${count}`);
    this.cashCounterText.setText('💰 0');
    this.events_?.onFreeSpinsTriggered?.(count);
    this.events_?.onPhaseChange?.('free-spins');
    // Pulse badge
    this.tweens.add({
      targets: this.freeSpinsBadge,
      scaleX: 1.1, scaleY: 1.1,
      duration: 400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
  }

  private async runFreeSpinsLoop(bet: number): Promise<number> {
    let totalFs = 0;
    while (this.freeSpinsLeft > 0) {
      this.freeSpinsText.setText(`FS: ${this.freeSpinsLeft}`);
      this.events_?.onFreeSpinTick?.(this.freeSpinsLeft);
      await this.delay(300);
      const fsOut = await this.startSpin(bet, true);
      totalFs += fsOut.totalPayout;
      this.freeSpinsLeft--;
      // 3 chest scatters re-trigger +5 free spins
      if (fsOut.scatterCount >= 3) {
        this.freeSpinsLeft += 5;
      }
    }
    // End free spins
    this.tweens.killTweensOf(this.freeSpinsBadge);
    this.freeSpinsBadge.setScale(1);
    this.freeSpinsBadge.setVisible(false);
    this.cashCounterText.setText('');
    this.inFreeSpins = false;
    return totalFs;
  }

  shutdown() {
    this.reels.forEach(r => r.destroy());
    this.bus.removeAllListeners();
  }
}
