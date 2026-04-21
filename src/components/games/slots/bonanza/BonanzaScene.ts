/**
 * Sweet Bonanza — full rebuild per MEGA PROMPT.
 *
 * Visual identity: candy land — diagonal pastel candy stripes scrolling
 * behind the grid, lollipop-spiral corner ornaments, candy-cane vertical
 * pillars, sparkling 6-color star particles around the canvas edges.
 * Mechanics: 6×5 cluster pays (5+ flood-fill), tumble cascades with
 * shard explosions, multiplier bombs during free spins, 4+ scatter
 * lollipops trigger 10 free spins with global multiplier accumulator.
 *
 * Built on shared core (SlotRNG + WinEvaluator) — no ReelStrip because
 * Bonanza tumbles symbols (no reel spin metaphor).
 */
import * as Phaser from 'phaser';
import {
  BONANZA_SYMBOLS, SCATTER_BONANZA, pickBonanzaSymbol, pickBonanzaMultiplier, getBonanzaPay,
  MULTIPLIER_TEXTURE_BONANZA, BACKGROUND_TEXTURE_BONANZA, type BonanzaSymbol,
} from './symbols';
import { SlotRNG } from '../core/SlotRNG';
import { findClusters, countSymbol, type Grid, type Cluster } from '../core/WinEvaluator';
import { screenShake, flashColor, sparkleBurst, landingRing } from '../core/SlotFX';

export const COLS = 6;
export const ROWS = 5;
export const CELL = 78;
export const GAP = 5;
export const GRID_W = COLS * CELL + (COLS - 1) * GAP;
export const GRID_H = ROWS * CELL + (ROWS - 1) * GAP;

const SCENE_KEY = 'BonanzaScene';
const ALL_SYMS = [...BONANZA_SYMBOLS, SCATTER_BONANZA];
const SYM_KEY = (id: string) => `bonanza-sym-${id}`;
const SPARKLE_COLORS = [0xff6b8a, 0xffb347, 0xffff66, 0x88ff88, 0x66bbff, 0xff99ff];

export interface BonanzaSpinOutcome {
  totalPayout: number;
  baseWin: number;
  cascadeCount: number;
  scatterCount: number;
  triggeredFreeSpins: boolean;
  freeSpinsAwarded: number;
  multipliersDropped: number[];
  freeSpinsTotal?: number;
  globalMultiplier: number;
  reels: string[][];
}

export interface BonanzaSceneEvents {
  onSpinComplete: (o: BonanzaSpinOutcome) => void;
  onCascadeWin: (amount: number, idx: number) => void;
  onMultiplierDropped: (value: number) => void;
  onFreeSpinsTriggered: (count: number) => void;
  onFreeSpinTick: (remaining: number) => void;
  onPhaseChange: (p: 'idle' | 'spinning' | 'cascading' | 'free-spins' | 'big-win') => void;
}

interface CellSprite {
  container: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Image;
  glow: Phaser.GameObjects.Rectangle;
  symbol: BonanzaSymbol;
  col: number;
  row: number;
}

export class BonanzaScene extends Phaser.Scene {
  private rng!: SlotRNG;
  private events_!: BonanzaSceneEvents;
  private bgImage!: Phaser.GameObjects.Image;
  private bgOverlay!: Phaser.GameObjects.Graphics;
  private stripesGfx!: Phaser.GameObjects.Graphics;
  private stripesOffset = 0;
  private candyFrameGfx!: Phaser.GameObjects.Graphics;
  private gridContainer!: Phaser.GameObjects.Container;
  private gridOriginX = 0;
  private gridOriginY = 0;
  private cells: (CellSprite | null)[][] = [];
  private grid: Grid = [];
  private sparkles!: Phaser.GameObjects.Particles.ParticleEmitter;
  private clusterHullGfx!: Phaser.GameObjects.Graphics;
  private winCounterText!: Phaser.GameObjects.Text;
  private freeSpinsBadge!: Phaser.GameObjects.Container;
  private freeSpinsText!: Phaser.GameObjects.Text;
  private multAccumText!: Phaser.GameObjects.Text;
  private inFreeSpins = false;
  private freeSpinsLeft = 0;
  private accumulatedMult = 0;
  private turbo = false;

  constructor() { super({ key: SCENE_KEY }); }

  init(data: { events: BonanzaSceneEvents }) {
    this.events_ = data.events;
    this.rng = new SlotRNG('bonanza');
  }

  setTurbo(on: boolean) { this.turbo = on; }

  preload() {
    this.load.image('bonanza-bg', BACKGROUND_TEXTURE_BONANZA);
    this.load.image('bonanza-mult', MULTIPLIER_TEXTURE_BONANZA);
    ALL_SYMS.forEach(s => this.load.image(SYM_KEY(s.id), s.texture));
  }

  create() {
    const w = this.scale.width;
    const h = this.scale.height;

    // Background photo + soft pink overlay
    this.bgImage = this.add.image(w / 2, h / 2, 'bonanza-bg').setDisplaySize(w, h);
    this.bgOverlay = this.add.graphics();
    this.bgOverlay.fillStyle(0x33001a, 0.4).fillRect(0, 0, w, h);

    // Sparkle texture (procedural 4-pt star)
    const sparkG = this.make.graphics({ x: 0, y: 0 }, false);
    sparkG.fillStyle(0xffffff, 1);
    sparkG.beginPath();
    sparkG.moveTo(8, 0);
    sparkG.lineTo(10, 6);
    sparkG.lineTo(16, 8);
    sparkG.lineTo(10, 10);
    sparkG.lineTo(8, 16);
    sparkG.lineTo(6, 10);
    sparkG.lineTo(0, 8);
    sparkG.lineTo(6, 6);
    sparkG.closePath();
    sparkG.fillPath();
    sparkG.generateTexture('bonanza-spark', 16, 16);
    sparkG.destroy();

    this.sparkles = this.add.particles(0, 0, 'bonanza-spark', {
      x: { min: 0, max: w },
      y: { min: 0, max: h },
      lifespan: 2000,
      speedY: { min: -10, max: 10 },
      speedX: { min: -10, max: 10 },
      scale: { start: 0.05, end: 0.15 },
      alpha: { start: 1, end: 0 },
      frequency: 320,
      tint: SPARKLE_COLORS,
      emitZone: {
        type: 'edge',
        source: new Phaser.Geom.Rectangle(0, 0, w, h),
        quantity: 20,
      },
    });

    // Candy stripes behind grid
    this.gridOriginX = (w - GRID_W) / 2;
    this.gridOriginY = (h - GRID_H) / 2 + 12;
    this.stripesGfx = this.add.graphics();

    // Candy frame
    this.candyFrameGfx = this.add.graphics();
    this.drawCandyFrame();

    // Cluster hull layer
    this.clusterHullGfx = this.add.graphics();

    // Grid
    this.gridContainer = this.add.container(0, 0);
    this.cells = Array.from({ length: COLS }, () => Array<CellSprite | null>(ROWS).fill(null));
    this.grid = this.makeGrid();
    this.renderGrid();

    // Win counter
    this.winCounterText = this.add.text(w / 2, this.gridOriginY + GRID_H + 16, '', {
      fontFamily: 'Syne, system-ui, sans-serif',
      fontSize: '20px', fontStyle: 'bold',
      color: '#FFD34A', stroke: '#7a4f00', strokeThickness: 4,
    }).setOrigin(0.5);

    // Free spins badge (top-right)
    this.freeSpinsBadge = this.add.container(w - 60, 22);
    const fsBg = this.add.rectangle(0, 0, 110, 28, 0xff66cc, 0.22).setStrokeStyle(2, 0xff66cc, 0.7);
    fsBg.setOrigin(0.5);
    this.freeSpinsText = this.add.text(0, 0, 'FS: 0', {
      fontFamily: 'Syne, system-ui, sans-serif',
      fontSize: '12px', fontStyle: 'bold',
      color: '#ff99ff',
    }).setOrigin(0.5);
    this.freeSpinsBadge.add([fsBg, this.freeSpinsText]);
    this.freeSpinsBadge.setVisible(false);

    // Multiplier accumulator (top-left)
    this.multAccumText = this.add.text(20, 22, '', {
      fontFamily: 'Syne, system-ui, sans-serif',
      fontSize: '14px', fontStyle: 'bold',
      color: '#ffd34a', stroke: '#3a2200', strokeThickness: 3,
    }).setOrigin(0, 0.5);

    this.events_?.onPhaseChange?.('idle');
  }

  update(_t: number, dt: number) {
    this.stripesOffset = (this.stripesOffset + 0.3 * (dt / 16)) % 60;
    this.drawStripes();
  }

  /* ----------------------------- DRAWING ---------------------------------- */

  private drawStripes() {
    const g = this.stripesGfx;
    g.clear();
    const x = this.gridOriginX - 8;
    const y = this.gridOriginY - 8;
    const w = GRID_W + 16;
    const h = GRID_H + 16;
    g.save();
    // Mask via geometry mask isn't strictly needed — clip to rect by checks
    const stripeW = 30;
    const colors = [0xffd6e8, 0xfff0d6];
    for (let i = -10; i < (w + h) / stripeW + 2; i++) {
      const baseX = x - h + (i * stripeW) + this.stripesOffset;
      g.fillStyle(colors[i & 1], 0.06);
      // Diagonal stripe — drawn as parallelogram
      g.beginPath();
      g.moveTo(baseX, y);
      g.lineTo(baseX + stripeW, y);
      g.lineTo(baseX + stripeW + h, y + h);
      g.lineTo(baseX + h, y + h);
      g.closePath();
      g.fillPath();
    }
    g.restore();
  }

  private drawCandyFrame() {
    const g = this.candyFrameGfx;
    g.clear();
    const x = this.gridOriginX - 12;
    const y = this.gridOriginY - 12;
    const w = GRID_W + 24;
    const h = GRID_H + 24;

    // Outer pink frame
    g.fillStyle(0xff8fb5, 1).fillRoundedRect(x, y, w, h, 14);
    // Inner cream
    g.fillStyle(0xfff4f7, 1).fillRoundedRect(x + 4, y + 4, w - 8, h - 8, 11);

    // Candy-cane vertical pillars (left/right) — diagonal stripes inside thin pillar rects
    const pillarW = 8;
    [x, x + w - pillarW].forEach(px => {
      g.fillStyle(0xffffff, 1).fillRoundedRect(px, y + 8, pillarW, h - 16, 4);
      g.fillStyle(0xff3366, 1);
      for (let yy = y + 8; yy < y + h - 16; yy += 12) {
        g.beginPath();
        g.moveTo(px, yy);
        g.lineTo(px + pillarW, yy + 5);
        g.lineTo(px + pillarW, yy + 9);
        g.lineTo(px, yy + 4);
        g.closePath();
        g.fillPath();
      }
    });

    // Top banner — alternating pink/white segments (candy cane horizontal)
    const segW = 18;
    const bannerY = y - 4;
    const bannerH = 12;
    for (let xx = x + 12; xx < x + w - 12; xx += segW) {
      g.fillStyle(((xx - x) / segW) & 1 ? 0xff3366 : 0xffffff, 1);
      g.fillRoundedRect(xx, bannerY, segW - 1, bannerH, 3);
    }

    // Lollipop-spiral corner ornaments
    [[x + 8, y + 8], [x + w - 8, y + 8], [x + 8, y + h - 8], [x + w - 8, y + h - 8]].forEach(([cx, cy]) => {
      this.drawLollipopSpiral(g, cx, cy, 14);
    });
  }

  private drawLollipopSpiral(g: Phaser.GameObjects.Graphics, cx: number, cy: number, maxR: number) {
    g.fillStyle(0xffffff, 1).fillCircle(cx, cy, maxR);
    g.lineStyle(2, 0xff3366, 1);
    g.beginPath();
    const a = 0.5; const b = 0.9;
    const steps = 80;
    for (let i = 0; i < steps; i++) {
      const theta = (i / steps) * Math.PI * 4;
      const r = a + b * theta;
      const px = cx + Math.cos(theta) * r;
      const py = cy + Math.sin(theta) * r;
      if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.strokePath();
  }

  /* ------------------------------- GRID ----------------------------------- */

  private makeGrid(): Grid {
    this.rng.refresh(96);
    const g: Grid = [];
    for (let c = 0; c < COLS; c++) {
      const col: string[] = [];
      for (let r = 0; r < ROWS; r++) col.push(pickBonanzaSymbol(this.rng.fn).id);
      g.push(col);
    }
    return g;
  }

  private renderGrid() {
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        const old = this.cells[c][r];
        if (old) old.container.destroy();
        const symId = this.grid[c][r];
        const sym = ALL_SYMS.find(s => s.id === symId);
        if (!sym) continue;
        this.cells[c][r] = this.buildCell(c, r, sym);
      }
    }
  }

  private buildCell(col: number, row: number, sym: BonanzaSymbol): CellSprite {
    const x = this.gridOriginX + col * (CELL + GAP) + CELL / 2;
    const y = this.gridOriginY + row * (CELL + GAP) + CELL / 2;
    const c = this.add.container(x, y);
    const bg = this.add.graphics();
    bg.fillStyle(sym.color, 0.08).fillRoundedRect(-CELL / 2 + 3, -CELL / 2 + 3, CELL - 6, CELL - 6, 12);
    bg.lineStyle(1, sym.color, 0.3).strokeRoundedRect(-CELL / 2 + 3, -CELL / 2 + 3, CELL - 6, CELL - 6, 12);
    const glow = this.add.rectangle(0, 0, CELL - 4, CELL - 4, sym.color, 0).setStrokeStyle(3, sym.color, 0);
    const sprite = this.add.image(0, 0, SYM_KEY(sym.id)).setDisplaySize(Math.round(CELL * 0.80), Math.round(CELL * 0.80));
    c.add([bg, glow, sprite]);
    this.gridContainer.add(c);

    // Idle pulse for high tier and scatter
    if (sym.tier === 'high' || sym.tier === 'top' || sym.id === SCATTER_BONANZA.id) {
      this.tweens.add({
        targets: c, scaleX: 1.04, scaleY: 1.04,
        duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        delay: (col * ROWS + row) * 120,
      });
    }
    return { container: c, sprite, glow, symbol: sym, col, row };
  }

  /* --------------------------- WIN EVALUATION ----------------------------- */

  private evalClusters(grid: Grid, bet: number): { clusters: Cluster[]; total: number } {
    const clusters = findClusters(
      grid,
      5,
      (id, n) => getBonanzaPay(id, n) * bet,
      [SCATTER_BONANZA.id],
    );
    const total = clusters.reduce((s, c) => s + c.pay, 0);
    return { clusters, total };
  }

  /* ----------------------------- ANIMATIONS ------------------------------- */

  private async showClusters(clusters: Cluster[]): Promise<void> {
    if (clusters.length === 0) return;
    // Draw convex hull around each cluster
    this.clusterHullGfx.clear();
    clusters.forEach((cl) => {
      const points = cl.cells.map(([c, r]) => ({
        x: this.gridOriginX + c * (CELL + GAP) + CELL / 2,
        y: this.gridOriginY + r * (CELL + GAP) + CELL / 2,
      }));
      // Simple bbox-based hull (cheap visual): expand each cell
      const sym = ALL_SYMS.find(s => s.id === cl.symbolId);
      const color = sym?.color ?? 0xffd34a;
      this.clusterHullGfx.lineStyle(3, color, 0.7);
      points.forEach(p => this.clusterHullGfx.strokeCircle(p.x, p.y, CELL / 2 - 4));
    });

    // Pulse hull alpha
    this.tweens.add({ targets: this.clusterHullGfx, alpha: 0.3, duration: 280, yoyo: true, repeat: 2 });

    // Pulse cluster cells
    clusters.forEach(cl => {
      cl.cells.forEach(([c, r]) => {
        const cell = this.cells[c][r];
        if (!cell) return;
        this.tweens.add({ targets: cell.glow, alpha: 0.7, strokeAlpha: 1, duration: 240, yoyo: true, repeat: 2 });
        this.tweens.add({ targets: cell.container, scaleX: 1.18, scaleY: 1.18, duration: 240, yoyo: true, repeat: 2 });
      });
    });

    await this.delay(this.turbo ? 280 : 700);
    this.clusterHullGfx.clear();
  }

  private explodeClusters(clusters: Cluster[]): void {
    clusters.forEach(cl => {
      const sym = ALL_SYMS.find(s => s.id === cl.symbolId);
      const tint = sym?.color ?? 0xffd34a;
      cl.cells.forEach(([c, r]) => {
        const cell = this.cells[c][r];
        if (!cell) return;
        // Sparkle burst at every cluster cell — color matches symbol palette
        sparkleBurst(this, cell.container.x + this.gridOriginX, cell.container.y + this.gridOriginY, {
          count: 8, tint: [tint, 0xffffff, 0xffd34a], depth: 50,
        });
        // Shard burst — 6 mini sprites
        for (let i = 0; i < 6; i++) {
          const ang = (i / 6) * Math.PI * 2;
          const shard = this.add.image(cell.container.x, cell.container.y, SYM_KEY(cell.symbol.id))
            .setDisplaySize(28, 28).setDepth(40);
          this.tweens.add({
            targets: shard,
            x: shard.x + Math.cos(ang) * 60,
            y: shard.y + Math.sin(ang) * 60,
            alpha: 0, scale: 0.2, angle: 360,
            duration: 500, ease: 'Cubic.easeOut',
            onComplete: () => shard.destroy(),
          });
        }
        cell.container.destroy();
        this.cells[c][r] = null;
        this.grid[c][r] = '';
      });
      // Big cluster (≥10) → mild screen shake
      if (cl.cells.length >= 10) screenShake(this, 200, 0.008);
    });
  }

  private async tumbleAndRefill(): Promise<void> {
    // Per column: gravity-pull existing symbols down, fill empty top
    const turboMul = this.turbo ? 0.4 : 1;
    const animPromises: Promise<void>[] = [];

    for (let c = 0; c < COLS; c++) {
      const survivors: { sym: BonanzaSymbol; from: number }[] = [];
      for (let r = ROWS - 1; r >= 0; r--) {
        if (this.cells[c][r] && this.grid[c][r]) {
          const sym = ALL_SYMS.find(s => s.id === this.grid[c][r])!;
          survivors.push({ sym, from: r });
        }
      }
      // Build new column from bottom-up
      const newCol: string[] = Array(ROWS).fill('');
      for (let i = 0; i < survivors.length; i++) {
        newCol[ROWS - 1 - i] = survivors[i].sym.id;
      }
      // Fill remainder from top
      for (let r = 0; r < ROWS; r++) {
        if (!newCol[r]) newCol[r] = pickBonanzaSymbol(this.rng.fn).id;
      }

      // Destroy existing cells in column
      for (let r = 0; r < ROWS; r++) {
        if (this.cells[c][r]) { this.cells[c][r]!.container.destroy(); this.cells[c][r] = null; }
      }
      this.grid[c] = newCol;

      // Build cells starting above the grid then tween down
      for (let r = 0; r < ROWS; r++) {
        const sym = ALL_SYMS.find(s => s.id === newCol[r])!;
        const cell = this.buildCell(c, r, sym);
        const finalY = cell.container.y;
        cell.container.y = finalY - GRID_H - (r * 8);
        this.cells[c][r] = cell;
        animPromises.push(new Promise(resolve => {
          this.tweens.add({
            targets: cell.container,
            y: finalY,
            duration: (350 + r * 50) * turboMul,
            ease: 'Bounce.easeOut',
            delay: c * 30 * turboMul,
            onComplete: () => resolve(),
          });
        }));
      }
    }
    await Promise.all(animPromises);
  }

  private async dropMultiplierBomb(bet: number): Promise<number> {
    // Find empty-ish cell candidates (non-scatter)
    const candidates: Array<[number, number]> = [];
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        if (this.grid[c][r] !== SCATTER_BONANZA.id) candidates.push([c, r]);
      }
    }
    if (candidates.length === 0) return 0;
    const [tc, tr] = candidates[this.rng.nextInt(candidates.length)];
    const value = pickBonanzaMultiplier(this.rng.fn);

    const tx = this.gridOriginX + tc * (CELL + GAP) + CELL / 2;
    const ty = this.gridOriginY + tr * (CELL + GAP) + CELL / 2;
    const bomb = this.add.image(tx, ty - 200, 'bonanza-mult').setDisplaySize(60, 60).setDepth(60);
    const lbl = this.add.text(tx, ty - 200, `${value}×`, {
      fontFamily: 'Syne, system-ui, sans-serif',
      fontSize: '14px', fontStyle: 'bold',
      color: '#ffffff', stroke: '#3a0044', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(61);

    const turboMul = this.turbo ? 0.4 : 1;

    await new Promise<void>(resolve => {
      this.tweens.add({
        targets: [bomb, lbl], y: ty,
        duration: 500 * turboMul, ease: 'Bounce.easeOut',
        onComplete: () => resolve(),
      });
    });

    // Spin bomb
    this.tweens.add({ targets: bomb, angle: 360, duration: 200 * turboMul });

    // Shockwave ring
    const ring = this.add.graphics().setDepth(59);
    const obj = { r: 0, a: 1 };
    await new Promise<void>(resolve => {
      this.tweens.add({
        targets: obj, r: 80, a: 0,
        duration: 400 * turboMul, ease: 'Cubic.easeOut',
        onUpdate: () => {
          ring.clear();
          ring.lineStyle(4, 0xff66ff, obj.a).strokeCircle(tx, ty, obj.r);
        },
        onComplete: () => { ring.destroy(); resolve(); },
      });
    });

    this.accumulatedMult += value;
    this.multAccumText.setText(`× ${this.accumulatedMult}`);
    this.events_?.onMultiplierDropped?.(value);

    // Fly bomb up to accumulator (top-left)
    await new Promise<void>(resolve => {
      this.tweens.add({
        targets: [bomb, lbl],
        x: 30, y: 22, scale: 0.3, alpha: 0,
        duration: 400 * turboMul, ease: 'Cubic.easeIn',
        onComplete: () => { bomb.destroy(); lbl.destroy(); resolve(); },
      });
    });
    return value;
  }

  private async runWinCounter(target: number, durMs: number): Promise<void> {
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

  async startSpin(bet: number, isFreeSpin = false): Promise<BonanzaSpinOutcome> {
    this.events_?.onPhaseChange?.('spinning');
    this.winCounterText.setText('');

    // Initial drop animation — replace grid + animate from above
    this.grid = this.makeGrid();
    // Destroy existing
    for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) {
      if (this.cells[c][r]) { this.cells[c][r]!.container.destroy(); this.cells[c][r] = null; }
    }
    const turboMul = this.turbo ? 0.4 : 1;
    const dropPromises: Promise<void>[] = [];
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        const sym = ALL_SYMS.find(s => s.id === this.grid[c][r])!;
        const cell = this.buildCell(c, r, sym);
        const finalY = cell.container.y;
        cell.container.y = finalY - GRID_H - (r * 12);
        this.cells[c][r] = cell;
        dropPromises.push(new Promise(resolve => {
          this.tweens.add({
            targets: cell.container, y: finalY,
            duration: (450 + c * 60) * turboMul,
            delay: c * 40 * turboMul, ease: 'Bounce.easeOut',
            onComplete: () => resolve(),
          });
        }));
      }
    }
    await Promise.all(dropPromises);

    let totalWin = 0;
    let cascadeIdx = 0;
    const multipliersDropped: number[] = [];
    const scatterCount = countSymbol(this.grid, SCATTER_BONANZA.id);

    // Cascade loop
    this.events_?.onPhaseChange?.('cascading');
    while (true) {
      const { clusters, total } = this.evalClusters(this.grid, bet);
      if (clusters.length === 0) break;
      await this.showClusters(clusters);
      totalWin += total;
      this.events_?.onCascadeWin?.(total, cascadeIdx);
      cascadeIdx++;
      this.explodeClusters(clusters);
      await this.delay(150 * turboMul);
      await this.tumbleAndRefill();

      // Multiplier bomb during free spins
      if (this.inFreeSpins && this.rng.next() < 0.6) {
        const v = await this.dropMultiplierBomb(bet);
        multipliersDropped.push(v);
      }
    }

    // Apply accumulated multiplier in free spins (Sweet Bonanza style: multiplies total at end of FS, not per spin)
    let baseWin = totalWin;
    if (totalWin > 0) await this.runWinCounter(totalWin, 1100 * turboMul);

    let triggeredFS = false;
    let fsAwarded = 0;
    let fsTotal = 0;

    if (scatterCount >= 4 && !this.inFreeSpins) {
      triggeredFS = true;
      fsAwarded = 10;
      // Sparkle every scatter cell + candy-pink screen flash + shake
      for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) {
        if (this.grid[c][r] === SCATTER_BONANZA.id) {
          const wx = this.gridOriginX + c * (CELL + GAP) + CELL / 2;
          const wy = this.gridOriginY + r * (CELL + GAP) + CELL / 2;
          sparkleBurst(this, wx, wy, { count: 16, tint: [0xff6b8a, 0xffff66, 0xff99ff], depth: 90 });
          landingRing(this, wx, wy, CELL * 0.65, 0xff6b8a, 600);
        }
      }
      screenShake(this, 300, 0.01);
      await flashColor(this, 0xff6b8a, 0.4, 380);
      this.startFreeSpins(fsAwarded);
      fsTotal = await this.runFreeSpinsLoop(bet);
    }

    const outcome: BonanzaSpinOutcome = {
      totalPayout: totalWin + fsTotal,
      baseWin,
      cascadeCount: cascadeIdx,
      scatterCount,
      triggeredFreeSpins: triggeredFS,
      freeSpinsAwarded: fsAwarded,
      multipliersDropped,
      freeSpinsTotal: fsTotal,
      globalMultiplier: this.accumulatedMult,
      reels: this.grid,
    };

    if (!this.inFreeSpins) {
      this.events_?.onSpinComplete?.(outcome);
      this.events_?.onPhaseChange?.('idle');
      this.delay(900 * turboMul).then(() => this.winCounterText.setText(''));
    }
    return outcome;
  }

  private startFreeSpins(count: number) {
    this.inFreeSpins = true;
    this.freeSpinsLeft = count;
    this.accumulatedMult = 0;
    this.multAccumText.setText('× 0');
    this.freeSpinsBadge.setVisible(true);
    this.freeSpinsText.setText(`FS: ${count}`);
    this.events_?.onFreeSpinsTriggered?.(count);
    this.events_?.onPhaseChange?.('free-spins');
    this.tweens.add({
      targets: this.freeSpinsBadge,
      scaleX: 1.1, scaleY: 1.1,
      duration: 400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
  }

  private async runFreeSpinsLoop(bet: number): Promise<number> {
    let total = 0;
    while (this.freeSpinsLeft > 0) {
      this.freeSpinsText.setText(`FS: ${this.freeSpinsLeft}`);
      this.events_?.onFreeSpinTick?.(this.freeSpinsLeft);
      await this.delay(300);
      const out = await this.startSpin(bet, true);
      total += out.baseWin;
      this.freeSpinsLeft--;
      // 3+ scatters re-trigger +5
      if (out.scatterCount >= 3) this.freeSpinsLeft += 5;
    }
    // Apply global multiplier at end
    const finalMultBonus = this.accumulatedMult > 0 ? total * this.accumulatedMult : 0;
    total += finalMultBonus;

    this.tweens.killTweensOf(this.freeSpinsBadge);
    this.freeSpinsBadge.setScale(1).setVisible(false);
    this.multAccumText.setText('');
    this.inFreeSpins = false;
    return total;
  }

  shutdown() {
    // Clean up tweens / particles to avoid leaks during HMR
    this.tweens.killAll();
  }
}
