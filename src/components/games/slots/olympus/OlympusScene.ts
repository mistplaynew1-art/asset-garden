/**
 * Gates of Olympus — Phaser scene (rebuild per MEGA PROMPT).
 *
 * Visual identity: Greek temple — pillar frame, golden lightning bolts,
 * ambient golden particles. Background photo with deep blue overlay.
 * Cluster/scatter pays (8+), tumbling cascades, multiplier orbs (free spins),
 * Zeus scatter triggers 15 free spins.
 *
 * Public API is intentionally identical to the previous OlympusSlotScene so
 * the React wrapper (which imports OlympusSlotScene + SpinOutcome) keeps
 * working without changes. The old file re-exports from here.
 */
import * as Phaser from 'phaser';
import {
  SYMBOLS, SCATTER, getSymbolPay, pickRandomMultiplier,
  MULTIPLIER_TEXTURE, BACKGROUND_TEXTURE, type SymbolDef,
} from './symbols';
import { SlotRNG } from '../core/SlotRNG';
import { evaluateScatterPays, countSymbol, type Grid } from '../core/WinEvaluator';
import { screenShake, flashColor, sparkleBurst, landingRing } from '../core/SlotFX';

export const COLS = 6;
export const ROWS = 5;
// Larger cells so each symbol reads clearly at the responsive Phaser FIT
// scale on mobile/desktop. The previous 88px cells produced a grid that
// looked tiny against the surrounding stage padding.
export const CELL = 110;
export const GAP = 8;
export const GRID_W = COLS * CELL + (COLS - 1) * GAP;
export const GRID_H = ROWS * CELL + (ROWS - 1) * GAP;

const SCENE_KEY = 'OlympusSlotScene';

export interface SpinOutcome {
  totalPayout: number;
  baseWin: number;
  cascadeCount: number;
  scatterCount: number;
  triggeredFreeSpins: boolean;
  freeSpinsAwarded: number;
  multipliersDropped: { value: number; cellIndex: number }[];
  freeSpinsResult?: SpinOutcome[];
  freeSpinsTotal?: number;
}

export interface OlympusSceneEvents {
  onSpinComplete: (outcome: SpinOutcome) => void;
  onCascadeWin: (winAmount: number, cascadeIndex: number) => void;
  onFreeSpinsTriggered: (count: number) => void;
  onMultiplierDropped: (value: number) => void;
  onFreeSpinTick: (remaining: number) => void;
  onPhaseChange: (phase: 'idle' | 'spinning' | 'cascading' | 'free-spins' | 'big-win') => void;
}

interface CellSprite {
  container: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Graphics;
  sprite: Phaser.GameObjects.Image;
  glow: Phaser.GameObjects.Rectangle;
  symbol: SymbolDef;
  col: number;
  row: number;
}

const SYM_KEY = (id: string) => `olympus-sym-${id}`;
const ALL_SYMBOLS = [...SYMBOLS, SCATTER];

export class OlympusSlotScene extends Phaser.Scene {
  private cells: (CellSprite | null)[][] = [];
  private gridContainer!: Phaser.GameObjects.Container;
  private bgImage!: Phaser.GameObjects.Image;
  private bgOverlay!: Phaser.GameObjects.Graphics;
  private pillarsGfx!: Phaser.GameObjects.Graphics;
  private lightningGfx!: Phaser.GameObjects.Graphics;
  private particles!: Phaser.GameObjects.Particles.ParticleEmitter;
  private zeusBg?: Phaser.GameObjects.Image;
  private events_!: OlympusSceneEvents;
  private inFreeSpins = false;
  private freeSpinAccumulatedMultiplier = 0;
  private rng!: SlotRNG;
  private gridOriginX = 0;
  private gridOriginY = 0;
  private winCounterText!: Phaser.GameObjects.Text;
  private multiplierCounterText!: Phaser.GameObjects.Text;
  private lightningTimer?: Phaser.Time.TimerEvent;

  constructor() {
    super(SCENE_KEY);
  }

  init(data: { events: OlympusSceneEvents }) {
    if (data?.events) this.events_ = data.events;
    this.rng = new SlotRNG('olympus');
  }

  preload() {
    this.load.image('olympus-bg', BACKGROUND_TEXTURE);
    this.load.image('olympus-mult', MULTIPLIER_TEXTURE);
    ALL_SYMBOLS.forEach(s => this.load.image(SYM_KEY(s.id), s.texture));
  }

  create() {
    const { width, height } = this.scale;

    // ---- Background photo + dark blue overlay ----
    // Cover the canvas while preserving aspect ratio. Explicit depths keep
    // the photo BELOW the reel backplate so the giant crown/temple artwork
    // can never bleed onto the symbols.
    this.bgImage = this.add.image(width / 2, height / 2, 'olympus-bg').setDepth(-100);
    const tex = this.bgImage.texture.getSourceImage() as HTMLImageElement;
    if (tex && tex.width > 0 && tex.height > 0) {
      const s = Math.max(width / tex.width, height / tex.height);
      this.bgImage.setScale(s);
    } else {
      this.bgImage.setDisplaySize(width, height);
    }
    this.bgImage.setAlpha(0.15);
    this.bgOverlay = this.add.graphics().setDepth(-90);
    this.bgOverlay.fillStyle(0x05030f, 0.95);
    this.bgOverlay.fillRect(0, 0, width, height);

    // ---- Greek temple pillar frame ----
    this.gridOriginX = (width - GRID_W) / 2;
    this.gridOriginY = Math.max(70, (height - GRID_H) / 2 + 30);

    // Opaque reel-window backplate so symbols are always clearly readable
    // regardless of what the background photo contains.
    const wpad = 14;
    const reelBg = this.add.graphics().setDepth(5);
    reelBg.fillStyle(0x0a0a18, 0.96).fillRoundedRect(
      this.gridOriginX - wpad, this.gridOriginY - wpad,
      GRID_W + wpad * 2, GRID_H + wpad * 2, 14,
    );
    reelBg.lineStyle(2, 0xffd34a, 0.4).strokeRoundedRect(
      this.gridOriginX - wpad, this.gridOriginY - wpad,
      GRID_W + wpad * 2, GRID_H + wpad * 2, 14,
    );

    this.pillarsGfx = this.add.graphics().setDepth(6);
    this.drawTempleFrame();

    // ---- Ambient golden particles drifting upward ----
    const dotG = this.add.graphics({ x: -100, y: -100 });
    dotG.fillStyle(0xffd34a, 1).fillCircle(4, 4, 4);
    dotG.generateTexture('olympus-dot', 8, 8);
    dotG.destroy();
    this.particles = this.add.particles(0, height + 10, 'olympus-dot', {
      x: { min: 0, max: width },
      y: 0,
      lifespan: 6000,
      speedY: { min: -50, max: -25 },
      speedX: { min: -8, max: 8 },
      alpha: { start: 0.6, end: 0 },
      scale: { start: 0.6, end: 0.2 },
      frequency: 500,
      blendMode: 'ADD',
    });
    this.particles.setDepth(1);

    // ---- Lightning overlay (above particles, below grid) ----
    this.lightningGfx = this.add.graphics();
    this.lightningGfx.setDepth(2);
    this.scheduleNextLightning();

    // ---- Grid container ----
    this.gridContainer = this.add.container(this.gridOriginX, this.gridOriginY);
    this.gridContainer.setDepth(10);
    for (let c = 0; c < COLS; c++) {
      this.cells[c] = [];
      for (let r = 0; r < ROWS; r++) this.cells[c][r] = null;
    }

    // ---- Win counter (above grid) ----
    this.winCounterText = this.add.text(width / 2, this.gridOriginY - 22, '', {
      fontFamily: 'Syne, system-ui, sans-serif',
      fontSize: '22px',
      fontStyle: '900',
      color: '#FFD34A',
      stroke: '#7a4f00',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(20);

    this.multiplierCounterText = this.add.text(width / 2, this.gridOriginY - 48, '', {
      fontFamily: 'Syne, system-ui, sans-serif',
      fontSize: '14px',
      fontStyle: '700',
      color: '#fff066',
      stroke: '#3b2200',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(20);

    this.populateInitialGrid();
  }

  /* =================== TEMPLE FRAME =================== */

  private drawTempleFrame() {
    const g = this.pillarsGfx;
    g.clear();
    const padX = 12;
    const left = this.gridOriginX - padX;
    const right = this.gridOriginX + GRID_W + padX;
    const top = this.gridOriginY - 28;
    const bottom = this.gridOriginY + GRID_H + 16;
    const stoneCol = 0x8b6914;
    const goldCol = 0xffd34a;

    // Entablature beam across the top
    g.fillStyle(stoneCol, 1);
    g.fillRect(left - 14, top - 14, (right - left) + 28, 22);
    g.lineStyle(2, goldCol, 0.8);
    g.strokeRect(left - 14, top - 14, (right - left) + 28, 22);

    // Top crest triangle
    g.fillStyle(stoneCol, 1);
    g.fillTriangle(
      (left + right) / 2 - 30, top - 14,
      (left + right) / 2 + 30, top - 14,
      (left + right) / 2,      top - 38,
    );
    g.lineStyle(2, goldCol, 0.9);
    g.strokeTriangle(
      (left + right) / 2 - 30, top - 14,
      (left + right) / 2 + 30, top - 14,
      (left + right) / 2,      top - 38,
    );

    // Two pillars
    [left - 9, right - 9].forEach(px => {
      // Capital
      g.fillStyle(stoneCol, 1);
      g.fillRect(px - 6, top - 4, 30, 10);
      // Shaft
      g.fillRect(px, top + 6, 18, bottom - top - 18);
      // Fluting lines
      g.lineStyle(1, goldCol, 0.4);
      for (let y = top + 14; y < bottom - 12; y += 18) {
        g.lineBetween(px + 2, y, px + 16, y);
      }
      // Base
      g.fillStyle(stoneCol, 1);
      g.fillRect(px - 6, bottom - 12, 30, 12);
    });
  }

  /* =================== LIGHTNING =================== */

  private scheduleNextLightning() {
    const delay = this.inFreeSpins ? 800 + this.rng.next() * 400 : 2000 + this.rng.next() * 2000;
    this.lightningTimer?.remove();
    this.lightningTimer = this.time.delayedCall(delay, () => {
      this.fireLightning();
      this.scheduleNextLightning();
    });
  }

  private fireLightning() {
    const { width } = this.scale;
    const startX = this.rng.next() * width;
    const startY = 0;
    const endX = this.gridOriginX + this.rng.next() * GRID_W;
    const endY = this.gridOriginY + this.rng.next() * GRID_H;

    const segments = 8 + this.rng.nextInt(4);
    const path: Array<[number, number]> = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const baseX = startX + (endX - startX) * t;
      const baseY = startY + (endY - startY) * t;
      const jitter = (this.rng.next() - 0.5) * 40 * (1 - Math.abs(t - 0.5));
      path.push([baseX + jitter, baseY]);
    }

    const g = this.add.graphics().setDepth(3);
    g.lineStyle(3, 0xfff066, 1);
    g.beginPath();
    g.moveTo(path[0][0], path[0][1]);
    for (let i = 1; i < path.length; i++) g.lineTo(path[i][0], path[i][1]);
    g.strokePath();

    // 2-3 branches
    const branchCount = 2 + this.rng.nextInt(2);
    for (let b = 0; b < branchCount; b++) {
      const i = 2 + this.rng.nextInt(path.length - 4);
      const [bx, by] = path[i];
      g.lineStyle(2, 0xfff066, 0.8);
      g.beginPath();
      g.moveTo(bx, by);
      const branchSeg = 3 + this.rng.nextInt(2);
      for (let j = 1; j <= branchSeg; j++) {
        g.lineTo(bx + (this.rng.next() - 0.5) * 60, by + j * 12 + (this.rng.next() - 0.5) * 12);
      }
      g.strokePath();
    }

    this.tweens.add({
      targets: g,
      alpha: 0,
      duration: 300,
      delay: 50,
      onComplete: () => g.destroy(),
    });
  }

  /* =================== GRID HELPERS =================== */

  private buildCell(col: number, row: number, sym: SymbolDef): CellSprite {
    const x = col * (CELL + GAP) + CELL / 2;
    const y = row * (CELL + GAP) + CELL / 2;
    const container = this.add.container(x, y);

    const bg = this.add.graphics();
    bg.fillStyle(sym.color, 0.1);
    bg.fillRoundedRect(-CELL / 2 + 2, -CELL / 2 + 2, CELL - 4, CELL - 4, 10);
    bg.lineStyle(1, sym.color, 0.25);
    bg.strokeRoundedRect(-CELL / 2 + 2, -CELL / 2 + 2, CELL - 4, CELL - 4, 10);

    const glow = this.add.rectangle(0, 0, CELL - 6, CELL - 6, sym.color, 0).setStrokeStyle(2, sym.color, 0);
    const sprite = this.add.image(0, 0, SYM_KEY(sym.id));
    // Optimized sizing: 92% fills the cell beautifully while keeping symbols
    // clearly readable with proper padding from cell borders.
    sprite.setDisplaySize(Math.round(CELL * 0.92), Math.round(CELL * 0.92));

    container.add([bg, glow, sprite]);
    this.gridContainer.add(container);

    // Idle pulse for high-tier
    if (sym.tier === 'high' || sym.tier === 'top') {
      this.tweens.add({
        targets: sprite,
        scale: { from: 1, to: 1.05 },
        duration: 1800,
        yoyo: true,
        repeat: -1,
        delay: (col * ROWS + row) * 80,
      });
    }

    return { container, bg, sprite, glow, symbol: sym, col, row };
  }

  private populateInitialGrid() {
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        const sym = this.rng.pick(ALL_SYMBOLS);
        this.cells[c][r] = this.buildCell(c, r, sym);
      }
    }
  }

  private rebuildGridFromIds(ids: string[][]) {
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        const cell = this.cells[c][r];
        if (cell) cell.container.destroy();
        const sym = ALL_SYMBOLS.find(s => s.id === ids[c][r]) ?? ALL_SYMBOLS[0];
        this.cells[c][r] = this.buildCell(c, r, sym);
      }
    }
  }

  private toGrid(): Grid {
    const g: Grid = [];
    for (let c = 0; c < COLS; c++) {
      g[c] = [];
      for (let r = 0; r < ROWS; r++) g[c][r] = this.cells[c][r]?.symbol.id ?? 'apple';
    }
    return g;
  }

  /* =================== SPIN ANIMATION =================== */

  private async animateSpin(): Promise<void> {
    const promises: Promise<void>[] = [];
    for (let c = 0; c < COLS; c++) {
      const baseDelay = c * 80;
      for (let r = 0; r < ROWS; r++) {
        const cell = this.cells[c][r];
        if (!cell) continue;
        promises.push(new Promise<void>(resolve => {
          this.tweens.add({
            targets: cell.container,
            y: cell.container.y + GRID_H + 80,
            alpha: 0.4,
            duration: 350,
            delay: baseDelay,
            ease: 'Cubic.easeIn',
            onComplete: () => resolve(),
          });
        }));
      }
    }
    await Promise.all(promises);
    // Generate new grid
    const ids: string[][] = [];
    for (let c = 0; c < COLS; c++) {
      ids[c] = [];
      for (let r = 0; r < ROWS; r++) ids[c][r] = this.rng.pick(ALL_SYMBOLS).id;
    }
    this.rebuildGridFromIds(ids);
    // Drop in
    const dropPromises: Promise<void>[] = [];
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        const cell = this.cells[c][r];
        if (!cell) continue;
        const targetY = cell.container.y;
        cell.container.y = targetY - GRID_H - 60;
        dropPromises.push(new Promise<void>(resolve => {
          this.tweens.add({
            targets: cell.container,
            y: targetY,
            duration: 380,
            delay: c * 90 + r * 30,
            ease: 'Bounce.easeOut',
            onComplete: () => resolve(),
          });
        }));
      }
    }
    await Promise.all(dropPromises);
  }

  /* =================== WIN HANDLING =================== */

  private async highlightAndExplode(cells: Array<[number, number]>, winAmount: number) {
    // Dim non-winners
    const winSet = new Set(cells.map(([c, r]) => `${c},${r}`));
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        const cell = this.cells[c][r];
        if (!cell) continue;
        if (!winSet.has(`${c},${r}`)) {
          this.tweens.add({ targets: cell.container, alpha: 0.35, duration: 200 });
        } else {
          this.tweens.add({
            targets: cell.glow, alpha: 0.7, duration: 150, yoyo: true, repeat: 2,
          });
          this.tweens.add({
            targets: cell.sprite, scale: { from: 1.18, to: 1 }, duration: 200, yoyo: true, repeat: 2,
          });
        }
      }
    }

    // Win counter count-up
    const target = winAmount;
    const counter = { v: 0 };
    this.winCounterText.setText('+0');
    this.tweens.add({
      targets: counter,
      v: target,
      duration: 900,
      ease: 'Cubic.easeOut',
      onUpdate: () => this.winCounterText.setText(`+${counter.v.toFixed(2)}`),
      onComplete: () => {
        this.tweens.add({
          targets: this.winCounterText,
          scale: { from: 1.3, to: 1 }, duration: 240,
        });
      },
    });

    await new Promise(res => this.time.delayedCall(800, res));

    // Explode winners
    cells.forEach(([c, r]) => {
      const cell = this.cells[c][r];
      if (!cell) return;
      this.spawnExplosion(cell);
      cell.container.destroy();
      this.cells[c][r] = null;
    });

    await new Promise(res => this.time.delayedCall(250, res));
  }

  private spawnExplosion(cell: CellSprite) {
    const wx = this.gridOriginX + cell.container.x;
    const wy = this.gridOriginY + cell.container.y;
    const tier = cell.symbol.tier;
    const count = tier === 'top' ? 12 : 8;
    for (let i = 0; i < count; i++) {
      const ang = (i / count) * Math.PI * 2;
      const dx = Math.cos(ang) * 60;
      const dy = Math.sin(ang) * 60;
      const shard = this.add.image(wx, wy, SYM_KEY(cell.symbol.id))
        .setDisplaySize(20, 20).setDepth(30);
      this.tweens.add({
        targets: shard,
        x: wx + dx, y: wy + dy,
        scale: 0,
        alpha: 0,
        duration: 500,
        onComplete: () => shard.destroy(),
      });
    }
    if (cell.symbol.id === 'zeus') {
      const flash = this.add.rectangle(this.scale.width / 2, this.scale.height / 2, this.scale.width, this.scale.height, 0xffffff, 0.7).setDepth(40);
      this.tweens.add({ targets: flash, alpha: 0, duration: 380, onComplete: () => flash.destroy() });
    }
  }

  private async cascadeFill() {
    // For each column, gravity-collapse remaining cells then refill from top.
    for (let c = 0; c < COLS; c++) {
      const remaining: CellSprite[] = [];
      for (let r = ROWS - 1; r >= 0; r--) {
        if (this.cells[c][r]) remaining.unshift(this.cells[c][r]!);
      }
      // Place existing at bottom, fill top with new
      const newCol: (CellSprite | null)[] = Array(ROWS).fill(null);
      for (let i = 0; i < remaining.length; i++) {
        const targetRow = ROWS - remaining.length + i;
        newCol[targetRow] = remaining[i];
        remaining[i].row = targetRow;
        const targetY = targetRow * (CELL + GAP) + CELL / 2;
        this.tweens.add({
          targets: remaining[i].container,
          y: targetY, alpha: 1,
          duration: 320,
          ease: 'Bounce.easeOut',
          delay: c * 30,
        });
      }
      const missing = ROWS - remaining.length;
      for (let i = 0; i < missing; i++) {
        const sym = this.rng.pick(ALL_SYMBOLS);
        const newCell = this.buildCell(c, i, sym);
        const targetY = newCell.container.y;
        newCell.container.y = targetY - GRID_H - 40;
        newCol[i] = newCell;
        this.tweens.add({
          targets: newCell.container,
          y: targetY,
          duration: 380,
          ease: 'Bounce.easeOut',
          delay: c * 30 + i * 40,
        });
      }
      this.cells[c] = newCol;
    }
    await new Promise(res => this.time.delayedCall(500, res));
  }

  /* =================== MULTIPLIER ORBS (free spins only) =================== */

  private async dropMultiplierOrbs(): Promise<{ value: number; cellIndex: number }[]> {
    const out: { value: number; cellIndex: number }[] = [];
    const orbCount = 1 + this.rng.nextInt(3);
    for (let i = 0; i < orbCount; i++) {
      const value = pickRandomMultiplier(this.rng.fn);
      const c = this.rng.nextInt(COLS);
      const r = this.rng.nextInt(ROWS);
      out.push({ value, cellIndex: c * ROWS + r });

      const startX = this.gridOriginX + c * (CELL + GAP) + CELL / 2;
      const targetY = this.gridOriginY + r * (CELL + GAP) + CELL / 2;
      const orb = this.add.image(startX, -40, 'olympus-mult').setDisplaySize(Math.round(CELL * 0.75), Math.round(CELL * 0.75)).setDepth(50);
      const label = this.add.text(startX, -40, `${value}×`, {
        fontFamily: 'Syne, system-ui, sans-serif',
        fontSize: '16px', fontStyle: '900', color: '#fff066', stroke: '#3b2200', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(51);

      await new Promise<void>(res => {
        this.tweens.add({
          targets: [orb, label], y: targetY, duration: 500,
          ease: 'Bounce.easeOut',
          onComplete: () => res(),
        });
      });

      this.events_?.onMultiplierDropped(value);
      this.freeSpinAccumulatedMultiplier += value;
      this.multiplierCounterText.setText(`Total Multiplier: ${this.freeSpinAccumulatedMultiplier}×`);

      // Bezier flight to counter
      const counterX = this.scale.width / 2;
      const counterY = this.gridOriginY - 48;
      const ctrlX = (startX + counterX) / 2 + (this.rng.next() - 0.5) * 80;
      const ctrlY = Math.min(targetY, counterY) - 80;

      await new Promise<void>(res => {
        const t = { v: 0 };
        this.tweens.add({
          targets: t,
          v: 1,
          duration: 600,
          ease: 'Cubic.easeIn',
          onUpdate: () => {
            const u = t.v;
            const x = (1 - u) * (1 - u) * startX + 2 * (1 - u) * u * ctrlX + u * u * counterX;
            const y = (1 - u) * (1 - u) * targetY + 2 * (1 - u) * u * ctrlY + u * u * counterY;
            orb.setPosition(x, y);
            label.setPosition(x, y);
            const s = 1 - u * 0.7;
            orb.setScale(s);
          },
          onComplete: () => {
            orb.destroy();
            label.destroy();
            this.tweens.add({
              targets: this.multiplierCounterText,
              scale: { from: 1.4, to: 1 }, duration: 240,
            });
            res();
          },
        });
      });
    }
    return out;
  }

  /* =================== FREE SPINS BANNER =================== */

  private async showFreeSpinsBanner(count: number) {
    const w = this.scale.width;
    const h = this.scale.height;
    const banner = this.add.container(w / 2, -80).setDepth(100);
    const panel = this.add.graphics();
    panel.fillStyle(0x110028, 0.95).fillRoundedRect(-160, -32, 320, 64, 12);
    panel.lineStyle(2, 0xffd34a, 1).strokeRoundedRect(-160, -32, 320, 64, 12);
    const txt = this.add.text(0, 0, `${count} FREE SPINS!`, {
      fontFamily: 'Syne, system-ui, sans-serif',
      fontSize: '24px', fontStyle: '900', color: '#ffd34a',
      stroke: '#3b2200', strokeThickness: 4,
    }).setOrigin(0.5);
    banner.add([panel, txt]);
    await new Promise<void>(res => {
      this.tweens.add({ targets: banner, y: h / 2, duration: 400, ease: 'Cubic.easeOut',
        onComplete: () => this.time.delayedCall(1600, () => {
          this.tweens.add({ targets: banner, y: -80, duration: 400, ease: 'Cubic.easeIn',
            onComplete: () => { banner.destroy(); res(); } });
        }) });
    });
  }

  /* =================== PUBLIC: spin =================== */

  async startSpin(bet: number, isFreeSpin = false): Promise<SpinOutcome> {
    if (!isFreeSpin) {
      this.events_?.onPhaseChange('spinning');
      this.freeSpinAccumulatedMultiplier = 0;
      this.multiplierCounterText.setText('');
    }
    this.winCounterText.setText('');
    this.rng.refresh(128);

    await this.animateSpin();

    let totalPayout = 0;
    let cascadeCount = 0;
    const multipliersDropped: { value: number; cellIndex: number }[] = [];

    // Cascade loop
    while (true) {
      const grid = this.toGrid();
      const wins = evaluateScatterPays(grid, 8, getSymbolPay, ['zeus']);
      if (wins.length === 0) break;
      cascadeCount++;
      this.events_?.onPhaseChange('cascading');

      const allCells: Array<[number, number]> = [];
      let cascadeWin = 0;
      for (const w of wins) {
        cascadeWin += w.pay * bet;
        for (const cell of w.cells) allCells.push(cell);
      }
      totalPayout += cascadeWin;
      this.events_?.onCascadeWin(cascadeWin, cascadeCount);

      // Cascade ≥3 → mild screen shake to amplify momentum
      if (cascadeCount >= 3) screenShake(this, 180, 0.006);

      await this.highlightAndExplode(allCells, cascadeWin);
      await this.cascadeFill();

      // Drop multiplier orbs during free spins after each winning cascade
      if (this.inFreeSpins) {
        const orbs = await this.dropMultiplierOrbs();
        multipliersDropped.push(...orbs);
      }
    }

    // Apply free-spins multiplier accumulator
    if (this.inFreeSpins && this.freeSpinAccumulatedMultiplier > 0 && totalPayout > 0) {
      totalPayout = totalPayout * this.freeSpinAccumulatedMultiplier;
    }

    // Scatter / free-spins trigger
    const scatterCount = countSymbol(this.toGrid(), 'zeus');
    let triggered = false;
    let freeSpinsAwarded = 0;
    let freeSpinsResult: SpinOutcome[] | undefined;
    let freeSpinsTotal = 0;

    if (!isFreeSpin && scatterCount >= 4) {
      triggered = true;
      freeSpinsAwarded = 15;
      this.events_?.onFreeSpinsTriggered(freeSpinsAwarded);
      // Burst sparkles at every Zeus cell, screen shake, then full-screen golden flash.
      const grid = this.toGrid();
      for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) {
        if (grid[c][r] === 'zeus') {
          const cell = this.cells[c][r];
          if (!cell) continue;
          const wx = this.gridOriginX + cell.container.x;
          const wy = this.gridOriginY + cell.container.y;
          sparkleBurst(this, wx, wy, { count: 20, tint: [0xffd34a, 0xfff066, 0xffffff], depth: 90 });
          landingRing(this, wx, wy, CELL * 0.7, 0xfff066, 600);
        }
      }
      screenShake(this, 360, 0.012);
      await flashColor(this, 0xfff066, 0.45, 380);
      await this.showFreeSpinsBanner(freeSpinsAwarded);

      this.inFreeSpins = true;
      freeSpinsResult = [];
      let remaining = freeSpinsAwarded;
      this.events_?.onPhaseChange('free-spins');
      while (remaining > 0) {
        this.events_?.onFreeSpinTick(remaining);
        const sub = await this.startSpin(bet, true);
        freeSpinsResult.push(sub);
        freeSpinsTotal += sub.totalPayout;
        // Re-trigger
        if (sub.scatterCount >= 4) remaining += 5;
        remaining--;
      }
      this.inFreeSpins = false;
      totalPayout += freeSpinsTotal;
    }

    if (!isFreeSpin) {
      const outcome: SpinOutcome = {
        totalPayout,
        baseWin: totalPayout - freeSpinsTotal,
        cascadeCount,
        scatterCount,
        triggeredFreeSpins: triggered,
        freeSpinsAwarded,
        multipliersDropped,
        freeSpinsResult,
        freeSpinsTotal,
      };
      this.events_?.onSpinComplete(outcome);
      this.events_?.onPhaseChange('idle');
      this.time.delayedCall(2200, () => this.winCounterText.setText(''));
      return outcome;
    }

    return {
      totalPayout, baseWin: totalPayout, cascadeCount, scatterCount,
      triggeredFreeSpins: false, freeSpinsAwarded: 0, multipliersDropped,
    };
  }
}
