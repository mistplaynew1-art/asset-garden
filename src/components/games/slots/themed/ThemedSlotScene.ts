/**
 * ThemedSlotScene — generic 5×3 / 9-payline Phaser scene that renders any
 * SlotTheme. Symbol textures are generated procedurally from each theme's
 * paint() functions, so no asset files are required and every game has a
 * unique visual identity.
 *
 * Reuses the shared engine: SlotRNG, ReelStrip, WinEvaluator, SlotFX.
 */
import * as Phaser from 'phaser';
import { SlotRNG } from '../core/SlotRNG';
import { ReelStrip, type ReelSymbolData } from '../core/ReelStrip';
import { evaluatePaylines, type Grid, type PaylineWin } from '../core/WinEvaluator';
import { screenShake, flashColor, sparkleBurst } from '../core/SlotFX';
import type { SlotTheme, ThemeSymbol } from './themes';
import { getThemeSymbolAsset } from './themeAssets';

export const COLS = 5;
export const ROWS = 3;
// Visual cell footprint. Symbol painters were authored at ~92px so we draw
// them into a 92px texture and the renderer scales them to CELL — keeps the
// procedural artwork crisp while letting us upsize the grid for readability.
export const CELL = 112;
export const SYMBOL_PAINT_SIZE = 92;
export const GAP = 6;
export const GRID_W = COLS * CELL + (COLS - 1) * GAP;
export const GRID_H = ROWS * CELL + (ROWS - 1) * GAP;

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

export const PAYLINES_COUNT = PAYLINES.length;

export interface ThemedSpinOutcome {
  totalPayout: number;
  paylineWins: PaylineWin[];
  jackpot: boolean;
  reels: string[][];
}

export interface ThemedSceneEvents {
  onSpinComplete: (o: ThemedSpinOutcome) => void;
  onPhaseChange: (p: 'idle' | 'spinning' | 'big-win') => void;
}

export interface ThemedSceneInit {
  events: ThemedSceneEvents;
  theme: SlotTheme;
}

const SYM_KEY = (themeId: string, id: string) => `themed-${themeId}-${id}`;

export function makeThemedSceneClass(sceneKey: string) {
  return class ThemedSlotScene extends Phaser.Scene {
    private rng!: SlotRNG;
    private events_!: ThemedSceneEvents;
    private theme!: SlotTheme;
    private bus = new Phaser.Events.EventEmitter();
    private reels: ReelStrip[] = [];
    private grid: Grid = [];
    private gridOriginX = 0;
    private gridOriginY = 0;
    private ambientGfx!: Phaser.GameObjects.Graphics;
    private parallaxGfx!: Phaser.GameObjects.Graphics;
    private vignetteGfx!: Phaser.GameObjects.Graphics;
    private frameOuterGfx!: Phaser.GameObjects.Graphics;
    private frameInnerGfx!: Phaser.GameObjects.Graphics;
    private frameGlowGfx!: Phaser.GameObjects.Graphics;
    private cornerOrnamentsGfx!: Phaser.GameObjects.Graphics;
    private windowsGfx!: Phaser.GameObjects.Graphics;
    private reelDividersGfx!: Phaser.GameObjects.Graphics;
    private winLineGfx!: Phaser.GameObjects.Graphics;
    private titleBannerGfx!: Phaser.GameObjects.Graphics;
    private paylineIndicators: Phaser.GameObjects.Rectangle[] = [];
    private winCounterText!: Phaser.GameObjects.Text;
    private titleText!: Phaser.GameObjects.Text;
    private flickerTimers: Phaser.Time.TimerEvent[] = [];
    private ambientParticles: Phaser.GameObjects.Arc[] = [];
    private turbo = false;
    private symbolCount = 0;

    constructor() { super({ key: sceneKey }); }

    init(data: ThemedSceneInit) {
      this.events_ = data.events;
      this.theme = data.theme;
      this.rng = new SlotRNG(`themed-${data.theme.id}`);
    }

    preload() {
      // Auto-resolve PNG/JPG/WebP assets per convention:
      // src/assets/slots/{themeId}/{symbolId}.(png|jpg|webp)
      // Falls back to symbol's explicit imageUrl, then to procedural paint().
      this.theme.symbols.forEach(sym => {
        const url = sym.imageUrl ?? getThemeSymbolAsset(this.theme.id, sym.id);
        if (url) {
          const key = SYM_KEY(this.theme.id, sym.id) + '_img';
          if (!this.textures.exists(key)) this.load.image(key, url);
        }
      });
    }

    setTurbo(on: boolean) { this.turbo = on; this.reels.forEach(r => r.setTurbo(on)); }

    create() {
      const w = this.scale.width;
      const h = this.scale.height;
      this.cameras.main.setBackgroundColor(this.theme.backgroundColor);

      // ===== Layered background: deep gradient → ambient → parallax orbs → vignette
      this.drawBackdropGradient(w, h);
      this.ambientGfx = this.add.graphics();
      if (this.theme.paintAmbient) this.theme.paintAmbient(this, this.ambientGfx, w, h);
      this.parallaxGfx = this.add.graphics();
      this.drawGodRays(w, h);
      this.spawnAmbientParticles(w, h);
      this.vignetteGfx = this.add.graphics();
      this.drawVignette(w, h);

      this.generateSymbolTextures();

      this.gridOriginX = (w - GRID_W) / 2;
      this.gridOriginY = (h - GRID_H) / 2 + 14;

      // ===== Premium frame stack (glow → outer → inner → corners)
      this.frameGlowGfx = this.add.graphics();
      this.frameOuterGfx = this.add.graphics();
      this.frameInnerGfx = this.add.graphics();
      this.cornerOrnamentsGfx = this.add.graphics();
      this.windowsGfx = this.add.graphics();
      this.reelDividersGfx = this.add.graphics();
      this.drawFrameGlow();
      this.drawFrame();
      this.drawReelWindows();
      this.drawReelDividers();
      this.drawCornerOrnaments();

      // ===== Title banner above grid
      this.titleBannerGfx = this.add.graphics();
      this.drawTitleBanner(w);
      this.titleText = this.add.text(w / 2, this.gridOriginY - 38, this.theme.name.toUpperCase(), {
        fontFamily: 'Orbitron, system-ui, sans-serif',
        fontSize: '15px', fontStyle: 'bold',
        color: this.theme.winCounterColor,
        stroke: this.theme.winCounterStroke,
        strokeThickness: 3,
      }).setOrigin(0.5).setShadow(0, 0, '#000', 8, true, true);

      const indicX = this.gridOriginX - 22;
      PAYLINES.forEach((_, i) => {
        const r = this.add.rectangle(indicX, this.gridOriginY + 8 + i * 9, 14, 5, PAYLINE_COLORS[i], 0.35);
        r.setStrokeStyle(1, PAYLINE_COLORS[i], 0.75);
        this.paylineIndicators.push(r);
      });

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
          pickRandom: () => this.toReelData(this.pickSym()),
        });
        this.reels.push(reel);
      }

      this.grid = this.makeGrid();
      for (let col = 0; col < COLS; col++) {
        this.reels[col].setSymbols(this.grid[col].map(id =>
          this.toReelData(this.theme.symbols.find(s => s.id === id)!)));
      }

      this.winCounterText = this.add.text(w / 2, this.gridOriginY + GRID_H + 26, '', {
        fontFamily: 'Orbitron, system-ui, sans-serif',
        fontSize: '24px', fontStyle: 'bold',
        color: this.theme.winCounterColor,
        stroke: this.theme.winCounterStroke,
        strokeThickness: 5,
      }).setOrigin(0.5).setShadow(0, 0, this.theme.winCounterColor, 16, true, true);

      this.bus.on('reel:stop', () => this.events.emit('sound', 'slot.stop'));
      this.startFlicker();
      this.startParallaxDrift();
      this.events_?.onPhaseChange?.('idle');
    }

    /* ----------------------- backdrop / ambient layers -------------------- */
    private drawBackdropGradient(w: number, h: number) {
      const g = this.add.graphics().setDepth(-100);
      const base = this.theme.backgroundColor;
      // radial spotlight: lighter center, darker edges
      for (let i = 0; i < 18; i++) {
        const t = i / 17;
        const r = Math.max(w, h) * (1 - t * 0.85);
        const alpha = 0.06 + t * 0.06;
        const tint = Phaser.Display.Color.IntegerToColor(base);
        const lighten = Math.round(28 * (1 - t));
        const c = Phaser.Display.Color.GetColor(
          Math.min(255, tint.red + lighten),
          Math.min(255, tint.green + lighten),
          Math.min(255, tint.blue + lighten),
        );
        g.fillStyle(c, alpha).fillCircle(w / 2, h / 2, r);
      }
    }

    private spawnAmbientParticles(w: number, h: number) {
      const palette = this.theme.sparklePalette;
      for (let i = 0; i < 28; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        const sz = 1 + Math.random() * 2.2;
        const tint = palette[Math.floor(Math.random() * palette.length)];
        const dot = this.add.circle(x, y, sz, tint, 0.55).setDepth(-50);
        this.ambientParticles.push(dot);
      }
    }

    private drawGodRays(w: number, h: number) {
      // Subtle volumetric light cones radiating from the upper center,
      // adds depth behind the reels without overpowering the symbols.
      const g = this.add.graphics().setDepth(-60).setBlendMode(Phaser.BlendModes.ADD);
      const cx = w / 2;
      const cy = -h * 0.15;
      const palette = this.theme.sparklePalette;
      for (let i = 0; i < 9; i++) {
        const angle = -Math.PI / 2 + (i - 4) * 0.18;
        const len = h * 1.4;
        const tint = palette[i % palette.length];
        const ex = cx + Math.cos(angle) * len;
        const ey = cy + Math.sin(angle) * len;
        // wedge as triangle fan
        const spread = 14;
        const pAx = cx + Math.cos(angle - 0.02) * 30;
        const pAy = cy + Math.sin(angle - 0.02) * 30;
        const pBx = ex + Math.cos(angle + Math.PI / 2) * spread;
        const pBy = ey + Math.sin(angle + Math.PI / 2) * spread;
        const pCx = ex - Math.cos(angle + Math.PI / 2) * spread;
        const pCy = ey - Math.sin(angle + Math.PI / 2) * spread;
        g.fillStyle(tint, 0.05);
        g.fillTriangle(pAx, pAy, pBx, pBy, pCx, pCy);
      }
      // gentle pulse
      this.tweens.add({
        targets: g, alpha: { from: 0.6, to: 1 },
        duration: 4200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    }

    private startParallaxDrift() {
      this.ambientParticles.forEach((p, i) => {
        const dy = 8 + Math.random() * 18;
        const dur = 3500 + Math.random() * 4000;
        this.tweens.add({
          targets: p, y: p.y + (i % 2 === 0 ? dy : -dy),
          alpha: { from: 0.2, to: 0.85 },
          duration: dur, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
          delay: i * 80,
        });
      });
    }

    private drawVignette(w: number, h: number) {
      const g = this.vignetteGfx.setDepth(-10);
      g.fillStyle(0x000000, 0.0);
      // 4 corner darkening pads
      const pad = Math.max(w, h) * 0.55;
      [
        [0, 0], [w, 0], [0, h], [w, h],
      ].forEach(([cx, cy]) => {
        for (let i = 0; i < 6; i++) {
          const r = pad * (1 - i / 6);
          g.fillStyle(0x000000, 0.04 + i * 0.012).fillCircle(cx, cy, r);
        }
      });
    }

    private drawFrameGlow() {
      const g = this.frameGlowGfx;
      g.clear();
      const x = this.gridOriginX - 22;
      const y = this.gridOriginY - 22;
      const w = GRID_W + 44;
      const h = GRID_H + 44;
      // multi-stop outer glow
      for (let i = 8; i >= 1; i--) {
        const expand = i * 4;
        g.lineStyle(3, this.theme.frameInner, 0.04 + (8 - i) * 0.018);
        g.strokeRoundedRect(x - expand, y - expand, w + expand * 2, h + expand * 2, 18 + expand);
      }
    }

    private drawCornerOrnaments() {
      const g = this.cornerOrnamentsGfx;
      g.clear();
      const x = this.gridOriginX - 18;
      const y = this.gridOriginY - 18;
      const w = GRID_W + 36;
      const h = GRID_H + 36;
      const corners: Array<[number, number, number]> = [
        [x, y, 0], [x + w, y, 90], [x + w, y + h, 180], [x, y + h, 270],
      ];
      const accent = this.theme.frameInner;
      const gold = this.theme.frameOuter;
      corners.forEach(([cx, cy, rot]) => {
        const rad = Phaser.Math.DegToRad(rot);
        const cos = Math.cos(rad), sin = Math.sin(rad);
        // L-shaped accent
        g.lineStyle(3, gold, 0.95);
        const p1 = { x: cx + cos * 18, y: cy + sin * 18 };
        const p2 = { x: cx + cos * 4, y: cy + sin * 4 };
        const p3 = { x: cx + Math.cos(rad + Math.PI / 2) * 18, y: cy + Math.sin(rad + Math.PI / 2) * 18 };
        g.lineBetween(p1.x, p1.y, p2.x, p2.y);
        g.lineBetween(p2.x, p2.y, p3.x, p3.y);
        // gem dot
        g.fillStyle(accent, 1).fillCircle(cx + (cos + Math.cos(rad + Math.PI / 2)) * 8, cy + (sin + Math.sin(rad + Math.PI / 2)) * 8, 3);
        g.fillStyle(0xffffff, 0.7).fillCircle(cx + (cos + Math.cos(rad + Math.PI / 2)) * 8 - 0.8, cy + (sin + Math.sin(rad + Math.PI / 2)) * 8 - 0.8, 1);
      });
    }

    private drawTitleBanner(w: number) {
      const g = this.titleBannerGfx;
      g.clear();
      const cx = w / 2;
      const by = this.gridOriginY - 46;
      const bw = 240, bh = 28;
      // banner fill
      g.fillStyle(this.theme.frameOuter, 0.18).fillRoundedRect(cx - bw / 2, by, bw, bh, 6);
      g.lineStyle(2, this.theme.frameInner, 0.95).strokeRoundedRect(cx - bw / 2, by, bw, bh, 6);
      // side ornaments
      g.lineStyle(2, this.theme.frameOuter, 0.9);
      g.lineBetween(cx - bw / 2 - 26, by + bh / 2, cx - bw / 2 - 6, by + bh / 2);
      g.lineBetween(cx + bw / 2 + 6, by + bh / 2, cx + bw / 2 + 26, by + bh / 2);
      g.fillStyle(this.theme.frameInner, 1)
        .fillCircle(cx - bw / 2 - 30, by + bh / 2, 3)
        .fillCircle(cx + bw / 2 + 30, by + bh / 2, 3);
    }

    private drawReelDividers() {
      const g = this.reelDividersGfx;
      g.clear();
      for (let c = 1; c < COLS; c++) {
        const dx = this.gridOriginX + c * (CELL + GAP) - GAP / 2;
        // vertical divider line with gradient feel
        g.lineStyle(2, this.theme.frameOuter, 0.5);
        g.lineBetween(dx, this.gridOriginY - 4, dx, this.gridOriginY + GRID_H + 4);
        g.lineStyle(1, 0xffffff, 0.18);
        g.lineBetween(dx + 0.5, this.gridOriginY - 4, dx + 0.5, this.gridOriginY + GRID_H + 4);
      }
    }

    /* ----------------------- procedural symbol textures ------------------- */
    // Symbols are painted into a fixed-size buffer (SYMBOL_PAINT_SIZE) so all
    // existing painters keep their carefully tuned dimensions. The renderer
    // then upscales the texture into the larger CELL — bigger, readable
    // symbols without re-authoring 130+ painters.
    private generateSymbolTextures() {
      const SIZE = SYMBOL_PAINT_SIZE;
      this.theme.symbols.forEach(sym => {
        const key = SYM_KEY(this.theme.id, sym.id);
        if (this.textures.exists(key)) return;
        const g = this.make.graphics({ x: 0, y: 0 }, false);
        sym.paint(g, SIZE / 2, SIZE / 2, SIZE);
        g.generateTexture(key, SIZE, SIZE);
        g.destroy();
      });
    }

    /* ------------------------------- frame -------------------------------- */
    private drawFrame() {
      const g = this.frameOuterGfx;
      const inner = this.frameInnerGfx;
      g.clear(); inner.clear();
      const x = this.gridOriginX - 18;
      const y = this.gridOriginY - 18;
      const w = GRID_W + 36;
      const h = GRID_H + 36;
      // outer thick metallic border
      g.lineStyle(8, this.theme.frameOuter, 0.95).strokeRoundedRect(x, y, w, h, 16);
      g.lineStyle(14, this.theme.frameOuter, 0.22).strokeRoundedRect(x - 4, y - 4, w + 8, h + 8, 18);
      // bevel highlight (top edge)
      g.lineStyle(2, 0xffffff, 0.35);
      g.beginPath();
      g.arc(x + 16, y + 16, 16, Math.PI, Math.PI * 1.5);
      g.lineTo(x + w - 16, y);
      g.arc(x + w - 16, y + 16, 16, Math.PI * 1.5, 0);
      g.strokePath();
      // inner accent ring
      inner.lineStyle(3, this.theme.frameInner, 0.95).strokeRoundedRect(x + 7, y + 7, w - 14, h - 14, 12);
      inner.lineStyle(1, 0xffffff, 0.25).strokeRoundedRect(x + 9, y + 9, w - 18, h - 18, 10);
    }

    private drawReelWindows() {
      const g = this.windowsGfx;
      g.clear();
      // single deep recessed background covering all reels
      const wx = this.gridOriginX - 5;
      const wy = this.gridOriginY - 5;
      const ww = GRID_W + 10;
      const hh = GRID_H + 10;
      g.fillStyle(this.theme.reelWindowBg, 1).fillRoundedRect(wx, wy, ww, hh, 8);
      // inner shadow gradient (darker edges)
      g.fillStyle(0x000000, 0.25).fillRoundedRect(wx, wy, ww, 4, 4);
      g.fillStyle(0x000000, 0.18).fillRoundedRect(wx, wy + hh - 4, ww, 4, 4);
      // border
      g.lineStyle(3, this.theme.reelWindowBorder, 0.95).strokeRoundedRect(wx, wy, ww, hh, 8);
      g.lineStyle(1, 0xffffff, 0.22).strokeRoundedRect(wx + 2, wy + 2, ww - 4, hh - 4, 7);
    }

    private startFlicker() {
      [0, 1, 2, 3].forEach(seg => {
        const t = this.time.addEvent({
          delay: 1500 + seg * 300,
          loop: true,
          callback: () => {
            this.tweens.add({
              targets: this.frameOuterGfx,
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

    /* ------------------------------ symbols ------------------------------- */
    private toReelData(sym: ThemeSymbol): ReelSymbolData {
      // Prefer pre-rendered PNG (loaded in preload) when available, else use
      // the procedural texture key generated from paint().
      const imgKey = SYM_KEY(this.theme.id, sym.id) + '_img';
      const hasImg = (sym.imageUrl || getThemeSymbolAsset(this.theme.id, sym.id))
        && this.textures.exists(imgKey);
      return {
        id: sym.id,
        texture: hasImg ? imgKey : SYM_KEY(this.theme.id, sym.id),
        color: sym.color,
      };
    }

    private pickSym(): ThemeSymbol {
      this.symbolCount++;
      const total = this.theme.symbols.reduce((s, x) => s + x.weight, 0);
      let r = this.rng.fn() * total;
      for (const s of this.theme.symbols) { r -= s.weight; if (r <= 0) return s; }
      return this.theme.symbols[0];
    }

    private buildSymbol(col: number, row: number, sym: ReelSymbolData): Phaser.GameObjects.Container {
      const c = this.add.container(0, 0);
      const themeSym = this.theme.symbols.find(s => s.id === sym.id);
      const isPremium = !!themeSym?.premium;
      const isJackpot = sym.id === this.theme.jackpotId;
      const isWild = sym.id === this.theme.wildId;

      // Backplate — gradient-look layered card with corner accents
      const bg = this.add.graphics();
      const half = CELL / 2 - 3;
      // dark base
      bg.fillStyle(0x000000, 0.35).fillRoundedRect(-half, -half, half * 2, half * 2, 8);
      // tinted overlay
      bg.fillStyle(sym.color, isPremium ? 0.22 : 0.13).fillRoundedRect(-half, -half, half * 2, half * 2, 8);
      // inner highlight band
      bg.fillStyle(0xffffff, 0.06).fillRoundedRect(-half + 2, -half + 2, half * 2 - 4, (half * 2 - 4) * 0.45, 6);
      // border
      bg.lineStyle(1.5, sym.color, isPremium ? 0.85 : 0.55).strokeRoundedRect(-half, -half, half * 2, half * 2, 8);
      // tiny corner accents
      const cornerC = isPremium ? sym.color : 0xffffff;
      const cornerA = isPremium ? 0.9 : 0.4;
      bg.lineStyle(1.5, cornerC, cornerA);
      const cs = 6;
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy]) => {
        const x = sx * (half - 3), y = sy * (half - 3);
        bg.lineBetween(x, y, x - sx * cs, y);
        bg.lineBetween(x, y, x, y - sy * cs);
      });

      const glow = this.add.rectangle(0, 0, CELL - 4, CELL - 4, sym.color, 0).setStrokeStyle(3, sym.color, 0);
      // Up-scale the 92px painter texture into the 112px cell with antialiasing.
      const img = this.add.image(0, 0, sym.texture).setDisplaySize(Math.round(CELL * 0.92), Math.round(CELL * 0.92));

      // Premium gem under image
      if (isPremium) {
        const halo = this.add.graphics();
        halo.fillStyle(sym.color, 0.18).fillCircle(0, 0, half - 4);
        c.add(halo);
      }

      c.add([bg, glow, img]);

      // Special badge for wild / jackpot
      if (isWild || isJackpot) {
        const badge = this.add.graphics();
        const bcol = isJackpot ? 0xffd34a : 0xff66cc;
        badge.fillStyle(0x000000, 0.85).fillRoundedRect(-half + 2, -half + 2, 22, 10, 3);
        badge.lineStyle(1, bcol, 1).strokeRoundedRect(-half + 2, -half + 2, 22, 10, 3);
        const txt = this.add.text(-half + 13, -half + 7, isJackpot ? 'JP' : 'W', {
          fontFamily: 'Orbitron, system-ui, sans-serif',
          fontSize: '8px', fontStyle: 'bold',
          color: isJackpot ? '#ffd34a' : '#ff66cc',
        }).setOrigin(0.5);
        c.add([badge, txt]);
      }

      c.setData({ symbolId: sym.id, glow });

      if (isPremium) {
        this.tweens.add({
          targets: c, scaleX: 1.05, scaleY: 1.05,
          duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
          delay: (col * ROWS + row) * 120,
        });
        // shimmer rotation hint
        this.tweens.add({
          targets: img, angle: { from: -2, to: 2 },
          duration: 2400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
          delay: (col * ROWS + row) * 90,
        });
      }
      return c;
    }

    /* -------------------------------- grid -------------------------------- */
    private makeGrid(): Grid {
      this.rng.refresh(64);
      const g: Grid = [];
      for (let c = 0; c < COLS; c++) {
        const col: string[] = [];
        for (let r = 0; r < ROWS; r++) col.push(this.pickSym().id);
        g.push(col);
      }
      return g;
    }

    /* --------------------------------- win -------------------------------- */
    private payFor(id: string, count: number): number {
      if (count < 3) return 0;
      const sym = this.theme.symbols.find(s => s.id === id);
      if (!sym) return 0;
      if (count >= 5) return sym.pays['5'];
      if (count >= 4) return sym.pays['4'];
      return sym.pays['3'];
    }

    private evaluateWins(grid: Grid, bet: number): { wins: PaylineWin[]; total: number; jackpot: boolean } {
      const wildId = this.theme.wildId ?? '__none__';
      const wins = evaluatePaylines(grid, PAYLINES, wildId, (id, n) => this.payFor(id, n) * (bet / PAYLINES.length));
      const total = wins.reduce((s, w) => s + w.pay, 0);
      const middleAllJackpot = grid.every(col => col[1] === this.theme.jackpotId);
      return { wins, total, jackpot: middleAllJackpot };
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
            this.tweens.add({ targets: glow, alpha: 0.7, duration: 220, yoyo: true, repeat: 2 });
            this.tweens.add({ targets: cell, scaleX: 1.18, scaleY: 1.18, duration: 220, yoyo: true, repeat: 2 });
          }
        }
      }
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
              yoyo: true, duration: 200, onComplete: () => resolve(),
            });
          },
        });
      });
    }

    private delay(ms: number): Promise<void> {
      return new Promise(resolve => this.time.delayedCall(ms, resolve));
    }

    /* -------------------------------- spin -------------------------------- */
    async startSpin(bet: number): Promise<ThemedSpinOutcome> {
      this.events_?.onPhaseChange?.('spinning');
      this.winLineGfx.clear();
      this.winCounterText.setText('');

      const finalGrid = this.makeGrid();
      const turboMul = this.turbo ? 0.3 : 1;
      const reelPromises = this.reels.map((reel, i) => {
        const symbolsForReel: ReelSymbolData[] = finalGrid[i].map(id =>
          this.toReelData(this.theme.symbols.find(s => s.id === id)!),
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
        const winCells = new Set(wins.flatMap(w => w.cells.map(([c, r]) => `${c}:${r}`)));
        winCells.forEach(key => {
          const [c, r] = key.split(':').map(Number);
          const wx = this.gridOriginX + c * (CELL + GAP) + CELL / 2;
          const wy = this.gridOriginY + r * (CELL + GAP) + CELL / 2;
          sparkleBurst(this, wx, wy, { count: 6, tint: this.theme.sparklePalette });
        });
        await this.showWinLines(wins, total);
      }

      if (jackpot) {
        screenShake(this, 600, 0.018);
        await flashColor(this, this.theme.frameInner, 0.55, 480);
      }

      const outcome: ThemedSpinOutcome = {
        totalPayout: total, paylineWins: wins, jackpot, reels: this.grid,
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
  };
}
