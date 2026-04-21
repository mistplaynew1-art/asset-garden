/**
 * ReelStrip — one spinning vertical reel column for Phaser-based slots.
 *
 * - The strip is a Container masked to the visible rows.
 * - During spin, fast-scroll symbols downward (positive Y) with motion blur.
 * - Speed curve: easeIn ramp-up → linear → easeOut deceleration.
 * - On stop: bounce + playSound('slot.stop') via the bus.
 * - Anticipation slows the reel and pulses a glow before the final stop.
 */
import * as Phaser from 'phaser';

export interface ReelSymbolData {
  id: string;
  texture: string;
  color: number;
}

export interface ReelStripOptions {
  scene: Phaser.Scene;
  reelIndex: number;
  x: number;
  y: number;          // top-left of visible window
  cellSize: number;
  visibleRows: number;
  bus: Phaser.Events.EventEmitter;
  /** Build a final symbol Container for cell (col, row) — used after the reel stops. */
  buildSymbol: (col: number, row: number, sym: ReelSymbolData) => Phaser.GameObjects.Container;
  /** Pick a random symbol (for ghost cells while spinning). */
  pickRandom: () => ReelSymbolData;
}

const GHOST_TOP = 6;

export class ReelStrip {
  scene: Phaser.Scene;
  index: number;
  cell: number;
  rows: number;
  bus: Phaser.Events.EventEmitter;
  buildSymbol: ReelStripOptions['buildSymbol'];
  pickRandom: () => ReelSymbolData;

  /** Container that is masked & translated downward during spin. */
  scroll: Phaser.GameObjects.Container;
  /** Final landed symbols (col,row) -> Container, exposed for win highlighting. */
  landed: Phaser.GameObjects.Container[] = [];
  /** Persistent column glow used during anticipation. */
  glow: Phaser.GameObjects.Rectangle;

  /** Ghost sprites used during spin animation only. */
  private ghosts: Phaser.GameObjects.Image[] = [];
  private spinTween?: Phaser.Tweens.Tween;
  private maskGfx: Phaser.GameObjects.Graphics;
  private originX: number;
  private originY: number;
  private spinning = false;
  private turbo = false;

  constructor(opts: ReelStripOptions) {
    this.scene = opts.scene;
    this.index = opts.reelIndex;
    this.cell = opts.cellSize;
    this.rows = opts.visibleRows;
    this.bus = opts.bus;
    this.buildSymbol = opts.buildSymbol;
    this.pickRandom = opts.pickRandom;
    this.originX = opts.x;
    this.originY = opts.y;

    this.scroll = opts.scene.add.container(opts.x, opts.y);

    // Geometry mask clips the spinning column to the visible window.
    this.maskGfx = opts.scene.make.graphics({ x: 0, y: 0 });
    this.maskGfx.fillStyle(0xffffff);
    this.maskGfx.fillRect(opts.x, opts.y, opts.cellSize, opts.cellSize * opts.visibleRows);
    const mask = this.maskGfx.createGeometryMask();
    this.scroll.setMask(mask);

    // Anticipation glow — a column rectangle behind the reel.
    this.glow = opts.scene.add.rectangle(
      opts.x + opts.cellSize / 2,
      opts.y + (opts.cellSize * opts.visibleRows) / 2,
      opts.cellSize + 8,
      opts.cellSize * opts.visibleRows + 8,
      0xffd34a, 0.0,
    );
    this.glow.setStrokeStyle(3, 0xffd34a, 0.0);
    this.glow.setDepth(-1);
  }

  setTurbo(on: boolean) { this.turbo = on; }

  /**
   * Place final symbols into the strip without animation.
   * Used at scene boot, after a tumble (Olympus/Bonanza), or after a hard stop.
   */
  setSymbols(symbols: ReelSymbolData[]) {
    // Clear previous landed
    this.landed.forEach(c => c.destroy());
    this.landed = [];
    for (let row = 0; row < this.rows; row++) {
      const sym = symbols[row] ?? this.pickRandom();
      const c = this.buildSymbol(this.index, row, sym);
      c.setPosition(this.originX + this.cell / 2, this.originY + this.cell * row + this.cell / 2);
      this.landed.push(c);
    }
  }

  /**
   * Animated spin to a final symbol set.
   * Returns a promise that resolves after the landing bounce.
   */
  spinTo(
    finalSymbols: ReelSymbolData[],
    opts: { delayMs: number; durationMs: number; anticipate?: boolean },
  ): Promise<void> {
    return new Promise(resolve => {
      this.spinning = true;
      // Hide landed sprites while we animate ghosts.
      this.landed.forEach(c => c.setVisible(false));

      // Build a long ghost strip: GHOST_TOP randoms above, then visibleRows finals.
      // Ghost sprites are simple Images (no inner glow) for batch performance.
      this.ghosts.forEach(g => g.destroy());
      this.ghosts = [];
      const totalGhosts = GHOST_TOP + this.rows;
      const stripStartY = -this.cell * GHOST_TOP;

      for (let i = 0; i < totalGhosts; i++) {
        const sym = i < GHOST_TOP ? this.pickRandom() : finalSymbols[i - GHOST_TOP] ?? this.pickRandom();
        const img = this.scene.add.image(
          this.cell / 2,
          stripStartY + this.cell * i + this.cell / 2,
          sym.texture,
        );
        img.setDisplaySize(this.cell - 16, this.cell - 16);
        // Vertical motion blur — only when WebGL supports postFX.
        const fx = (img as unknown as { postFX?: { addBlur: (q: number, sx: number, sy: number, s: number, c: number, steps: number) => unknown } }).postFX;
        try { fx?.addBlur(0, 0, 6, 1, 0xffffff, 4); } catch { /* canvas fallback: no fx */ }
        this.ghosts.push(img);
        this.scroll.add(img);
      }

      const turboMul = this.turbo ? 0.4 : 1;
      const delay = opts.delayMs * turboMul;
      const duration = opts.durationMs * turboMul;
      const distance = this.cell * GHOST_TOP;

      this.scene.time.delayedCall(delay, () => {
        // Anticipation: stronger pulse, persistent glow ramp, emit event for sound
        if (opts.anticipate) {
          this.bus.emit('reel:anticipate', this.index);
          this.scene.tweens.add({
            targets: this.glow,
            fillAlpha: 0.32,
            strokeAlpha: 1,
            duration: 220,
            yoyo: true,
            repeat: 5,
            ease: 'Sine.easeInOut',
            onComplete: () => {
              this.glow.fillAlpha = 0;
              this.glow.strokeAlpha = 0;
            },
          });
        }

        const totalDur = duration + (opts.anticipate ? 600 : 0);

        this.spinTween = this.scene.tweens.add({
          targets: this.scroll,
          y: this.originY + distance,
          duration: totalDur,
          ease: 'Cubic.easeInOut',
          onComplete: () => {
            // Snap back to origin and reveal real landed symbols.
            this.scroll.y = this.originY;
            this.ghosts.forEach(g => g.destroy());
            this.ghosts = [];

            // Place final landed Containers.
            this.landed.forEach(c => c.destroy());
            this.landed = [];
            for (let row = 0; row < this.rows; row++) {
              const sym = finalSymbols[row] ?? this.pickRandom();
              const c = this.buildSymbol(this.index, row, sym);
              c.setPosition(this.originX + this.cell / 2, this.originY + this.cell * row + this.cell / 2);
              this.landed.push(c);
            }

            // Landing bounce — slightly stronger for emphasis
            this.landed.forEach(c => {
              this.scene.tweens.add({
                targets: c,
                y: c.y + 10,
                duration: 70,
                yoyo: true,
                ease: 'Bounce.easeOut',
              });
            });

            this.bus.emit('reel:stop', this.index);
            this.spinning = false;
            this.scene.time.delayedCall(120, resolve);
          },
        });
      });
    });
  }

  /** Public — needed by BaseSlotScene cleanup. */
  destroy() {
    this.spinTween?.stop();
    this.ghosts.forEach(g => g.destroy());
    this.landed.forEach(c => c.destroy());
    this.maskGfx.destroy();
    this.glow.destroy();
    this.scroll.destroy();
  }

  isSpinning() { return this.spinning; }
}
