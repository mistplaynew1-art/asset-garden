/**
 * JetpackScene — Pixi.js 8 procedural canvas for the Jetpack provider game.
 * 100% client-side, 100% procedural drawing (no image assets, no API calls).
 * Theme: futuristic neon city at night, character flies upward as multiplier grows.
 */
import {
  Application,
  Graphics,
  Text,
  Container,
  Ticker,
  BlurFilter,
  ColorMatrixFilter,
  FillGradient,
  TextStyle,
} from 'pixi.js';

export type JetpackPhase = 'waiting' | 'running' | 'crashed' | 'cashed_out';

interface Building {
  g: Graphics;
  layer: 0 | 1 | 2;
  baseY: number;
  width: number;
  height: number;
}

interface Star {
  g: Graphics;
  baseAlpha: number;
  twinkle: boolean;
  period: number;
}

interface FlameParticle {
  g: Graphics;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
}

interface DebrisParticle {
  g: Graphics;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  rot: number;
  rotSpeed: number;
}

function tierColor(mult: number): number {
  if (mult >= 25) return 0xff4500;
  if (mult >= 10) return 0xff4500;
  if (mult >= 5) return 0xff8c00;
  if (mult >= 2) return 0xffd700;
  return 0xffffff;
}

const LAYER_SPEED = [0.1, 0.3, 0.8];
const LAYER_ALPHA = [0.25, 0.55, 1.0];

export class JetpackScene {
  app: Application | null = null;
  private host: HTMLElement;
  private ro: ResizeObserver | null = null;
  private destroyed = false;

  private bgLayer = new Container();
  private starLayer = new Container();
  private cityLayer = [new Container(), new Container(), new Container()];
  private characterLayer = new Container();
  private uiLayer = new Container();

  private bgRect = new Graphics();
  private stars: Star[] = [];
  private buildings: Building[] = [];

  // Character
  private characterContainer = new Container();
  private characterGfx = new Graphics();
  private flames: FlameParticle[] = [];
  private smoke: DebrisParticle[] = [];
  private explosionParticles: DebrisParticle[] = [];

  // Altitude meter
  private meterContainer = new Container();
  private meterBg = new Graphics();
  private meterFill = new Graphics();
  private meterIndicator = new Graphics();
  private meterBadgeBg = new Graphics();
  private meterBadgeText: Text;

  // Center / status
  private centerContainer = new Container();
  private centerText: Text;
  private centerGlow: Text;
  private centerSubLabel: Text;
  private centerStatus: Text;
  private countdownText: Text;
  private altLabel: Text;
  private altValue: Text;

  multiplier = 1.0;
  phase: JetpackPhase = 'waiting';
  crashPoint = 0;
  countdown = 0;

  private startTime = 0;
  private crashStart = 0;
  private gravityVel = 0;
  private characterY = 0;
  private rainbowHue = 0;
  private milestonesHit = new Set<number>();
  private milestoneBursts: Array<{ text: Text; t: number }> = [];
  private cityScroll = 0;
  private prevMult = 1;

  constructor(host: HTMLElement) {
    this.host = host;
    const titleStyle = new TextStyle({
      fontFamily: 'Orbitron, "Syne", system-ui, sans-serif',
      fontSize: 78,
      fontWeight: '900',
      fill: 0xffffff,
      letterSpacing: 2,
    });
    this.centerText = new Text({ text: '1.00×', style: titleStyle });
    this.centerGlow = new Text({ text: '1.00×', style: new TextStyle({ ...titleStyle, fill: 0x00f5ff }) });
    this.centerGlow.alpha = 0.65;
    this.centerGlow.filters = [new BlurFilter({ strength: 14, quality: 2 })];
    this.centerSubLabel = new Text({
      text: 'ALTITUDE',
      style: new TextStyle({
        fontFamily: 'Orbitron, "Syne", system-ui, sans-serif',
        fontSize: 11,
        fontWeight: '700',
        fill: 0xffffff,
        letterSpacing: 4,
      }),
    });
    this.centerSubLabel.alpha = 0.4;
    this.centerStatus = new Text({
      text: '',
      style: new TextStyle({
        fontFamily: 'Orbitron, "Syne", system-ui, sans-serif',
        fontSize: 18,
        fontWeight: '700',
        fill: 0xffffff,
      }),
    });
    this.countdownText = new Text({
      text: '',
      style: new TextStyle({
        fontFamily: 'Orbitron, "Syne", system-ui, sans-serif',
        fontSize: 110,
        fontWeight: '900',
        fill: 0xff8c00,
      }),
    });
    this.countdownText.alpha = 0;
    this.altLabel = new Text({
      text: 'ALT',
      style: new TextStyle({
        fontFamily: 'Orbitron, "Syne", system-ui, sans-serif',
        fontSize: 9,
        fontWeight: '700',
        fill: 0xffffff,
        letterSpacing: 2,
      }),
    });
    this.altLabel.alpha = 0.4;
    this.altValue = new Text({
      text: '1.00x',
      style: new TextStyle({
        fontFamily: 'Orbitron, "Syne", system-ui, sans-serif',
        fontSize: 14,
        fontWeight: '700',
        fill: 0xffffff,
      }),
    });
    this.meterBadgeText = new Text({
      text: '1.00x',
      style: new TextStyle({
        fontFamily: 'Orbitron, "Syne", system-ui, sans-serif',
        fontSize: 11,
        fontWeight: '700',
        fill: 0xffffff,
      }),
    });
  }

  async init(): Promise<void> {
    if (this.destroyed) return;
    const w = Math.max(320, this.host.clientWidth);
    const h = Math.max(240, this.host.clientHeight);

    const app = new Application();
    await app.init({
      width: w,
      height: h,
      backgroundColor: 0x000008,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
    });
    if (this.destroyed) {
      app.destroy(true, { children: true, texture: true });
      return;
    }
    this.app = app;
    this.host.appendChild(app.canvas);
    app.canvas.style.display = 'block';
    app.canvas.style.width = '100%';
    app.canvas.style.height = '100%';

    app.stage.addChild(this.bgLayer);
    app.stage.addChild(this.starLayer);
    this.cityLayer.forEach((l) => app.stage.addChild(l));
    app.stage.addChild(this.characterLayer);
    app.stage.addChild(this.uiLayer);

    this.bgLayer.addChild(this.bgRect);
    this.drawBackground(w, h);
    this.spawnStars(w, h);
    this.spawnBuildings(w, h);

    this.buildCharacter();
    this.characterLayer.addChild(this.characterContainer);
    this.characterY = h * 0.55;
    this.characterContainer.position.set(w * 0.42, this.characterY);

    // Altitude meter
    this.meterContainer.addChild(this.meterBg);
    this.meterContainer.addChild(this.meterFill);
    this.meterContainer.addChild(this.meterIndicator);
    this.meterContainer.addChild(this.meterBadgeBg);
    this.meterContainer.addChild(this.meterBadgeText);
    this.meterBadgeText.anchor.set(0.5);
    this.uiLayer.addChild(this.meterContainer);
    this.drawMeterBg(w, h);

    // Center
    this.centerText.anchor.set(0.5);
    this.centerGlow.anchor.set(0.5);
    this.centerSubLabel.anchor.set(0.5);
    this.centerStatus.anchor.set(0.5);
    this.countdownText.anchor.set(0.5);
    this.centerContainer.addChild(this.centerGlow);
    this.centerContainer.addChild(this.centerText);
    this.centerContainer.addChild(this.centerSubLabel);
    this.centerContainer.addChild(this.centerStatus);
    this.centerContainer.addChild(this.countdownText);
    this.uiLayer.addChild(this.centerContainer);

    this.uiLayer.addChild(this.altLabel);
    this.uiLayer.addChild(this.altValue);
    this.layoutUI(w, h);

    this.startTime = performance.now();
    app.ticker.add(this.tick);

    if (typeof ResizeObserver !== 'undefined') {
      this.ro = new ResizeObserver(() => this.handleResize());
      this.ro.observe(this.host);
    }
  }

  private drawBackground(w: number, h: number) {
    this.bgRect.clear();
    const grad = new FillGradient(0, 0, 0, h);
    grad.addColorStop(0, 0x000008);
    grad.addColorStop(0.4, 0x050518);
    grad.addColorStop(0.7, 0x0a0a28);
    grad.addColorStop(1, 0x0a0a1a);
    this.bgRect.rect(0, 0, w, h).fill(grad);
  }

  private spawnStars(w: number, h: number) {
    this.stars.forEach((s) => s.g.destroy());
    this.stars = [];
    for (let i = 0; i < 80; i++) {
      const g = new Graphics();
      const size = Math.random() < 0.7 ? 1 : 1.5;
      g.circle(0, 0, size).fill(0xffffff);
      g.position.set(Math.random() * w, Math.random() * h * 0.5);
      const baseAlpha = 0.25 + Math.random() * 0.6;
      g.alpha = baseAlpha;
      this.starLayer.addChild(g);
      this.stars.push({
        g,
        baseAlpha,
        twinkle: Math.random() < 0.3,
        period: 1800 + Math.random() * 2400,
      });
    }
  }

  private makeBuilding(layer: 0 | 1 | 2, w: number, h: number): Building {
    const layerHeights = [
      [40, 100],
      [60, 140],
      [80, 200],
    ][layer];
    const bw = 30 + Math.random() * 40;
    const bh = layerHeights[0] + Math.random() * (layerHeights[1] - layerHeights[0]);
    const g = new Graphics();
    g.rect(0, 0, bw, bh).fill(0x111122);
    // Right edge glow
    g.moveTo(bw, 0).lineTo(bw, bh).stroke({ color: 0x4466ff, alpha: 0.3, width: 1 });
    // Antenna
    if (Math.random() < 0.4) {
      const ah = 10 + Math.random() * 15;
      g.rect(bw / 2 - 0.5, -ah, 1, ah).fill(0x666688);
    }
    // Windows grid
    const winColors = [0xffee88, 0x88aaff, 0xff8844];
    for (let wy = 8; wy < bh - 8; wy += 10) {
      for (let wx = 6; wx < bw - 6; wx += 10) {
        if (Math.random() < 0.7) {
          const c = winColors[Math.floor(Math.random() * winColors.length)];
          g.rect(wx, wy, 6, 6).fill({ color: c, alpha: 0.85 });
        }
      }
    }
    g.alpha = LAYER_ALPHA[layer];
    g.position.set(Math.random() * w, h - bh - (layer === 0 ? 0 : layer === 1 ? 5 : 10));
    this.cityLayer[layer].addChild(g);
    return { g, layer, baseY: g.y, width: bw, height: bh };
  }

  private spawnBuildings(w: number, h: number) {
    this.buildings.forEach((b) => b.g.destroy());
    this.buildings = [];
    const counts = [12, 8, 5];
    for (let li = 0 as 0 | 1 | 2; li < 3; li = (li + 1) as 0 | 1 | 2) {
      for (let i = 0; i < counts[li]; i++) {
        this.buildings.push(this.makeBuilding(li, w, h));
      }
    }
  }

  private buildCharacter() {
    const c = this.characterContainer;
    c.removeChildren();
    const g = this.characterGfx;
    g.clear();

    // JETPACK (drawn first → behind body)
    // Two tanks
    g.roundRect(-12, -2, 10, 28, 3).fill({ color: 0x778899 });
    g.roundRect(-12, -2, 10, 28, 3).stroke({ color: 0x99aacc, width: 1 });
    g.roundRect(2, -2, 10, 28, 3).fill({ color: 0x778899 });
    g.roundRect(2, -2, 10, 28, 3).stroke({ color: 0x99aacc, width: 1 });
    // Highlight stripes on tanks
    g.rect(-11, -1, 1, 26).fill({ color: 0xffffff, alpha: 0.4 });
    g.rect(3, -1, 1, 26).fill({ color: 0xffffff, alpha: 0.4 });
    // Cross-straps
    g.moveTo(-10, 0).lineTo(-2, 6).stroke({ color: 0x554433, width: 2 });
    g.moveTo(10, 0).lineTo(2, 6).stroke({ color: 0x554433, width: 2 });
    // Nozzles
    g.roundRect(-10, 24, 8, 6, 2).fill({ color: 0x555566 });
    g.roundRect(2, 24, 8, 6, 2).fill({ color: 0x555566 });

    // BODY (suit)
    g.roundRect(-9, -8, 18, 26, 4).fill({ color: 0x1a1a3a });
    g.rect(-8, -7, 2, 24).fill({ color: 0xffffff, alpha: 0.2 });
    g.rect(-9, -2, 18, 1).fill({ color: 0x00f5ff, alpha: 0.6 });
    g.rect(-9, 6, 18, 1).fill({ color: 0x00f5ff, alpha: 0.6 });

    // HEAD
    g.circle(0, -16, 9).fill({ color: 0xffcc99 });
    // VISOR
    g.circle(0, -17, 10).fill({ color: 0x2244aa, alpha: 0.85 });
    // Visor reflection
    g.ellipse(-3, -19, 4, 1.8).fill({ color: 0xffffff, alpha: 0.6 });

    // ARMS (extended forward)
    g.roundRect(-14, 0, 5, 14, 2).fill({ color: 0x1a1a3a });
    g.circle(-12, 14, 4).fill({ color: 0x222233 });
    g.roundRect(9, 0, 5, 14, 2).fill({ color: 0x1a1a3a });
    g.circle(11, 14, 4).fill({ color: 0x222233 });

    // LEGS
    g.roundRect(-7, 18, 5, 16, 2).fill({ color: 0x1a1a3a });
    g.roundRect(-9, 32, 9, 6, 2).fill({ color: 0x333344 });
    g.roundRect(2, 18, 5, 16, 2).fill({ color: 0x1a1a3a });
    g.roundRect(0, 32, 9, 6, 2).fill({ color: 0x333344 });

    c.addChild(g);
    c.pivot.set(0, 0);
  }

  private drawMeterBg(w: number, h: number) {
    const barX = w - 32;
    const barY = 15;
    const barW = 18;
    const barH = h - 30;
    this.meterContainer.position.set(barX, barY);
    this.meterBg.clear();
    this.meterBg
      .roundRect(0, 0, barW, barH, 9)
      .fill({ color: 0x000000, alpha: 0.5 })
      .roundRect(0, 0, barW, barH, 9)
      .stroke({ color: 0xffffff, alpha: 0.18, width: 1 });
    // Milestone tick marks
    [2, 5, 10, 25, 50].forEach((m) => {
      const ratio = Math.log(m) / Math.log(1000);
      const y = barH - ratio * barH;
      this.meterBg.moveTo(-3, y).lineTo(0, y).stroke({ color: 0xffffff, alpha: 0.4, width: 1 });
    });
  }

  private layoutUI(w: number, h: number) {
    this.centerContainer.position.set(w / 2, h * 0.18);
    this.centerText.position.set(0, 0);
    this.centerGlow.position.set(0, 0);
    this.centerSubLabel.position.set(0, 50);
    this.centerStatus.position.set(0, 78);
    this.countdownText.position.set(0, 0);
    this.altLabel.position.set(15, h / 2 - 10);
    this.altValue.position.set(15, h / 2 + 4);
  }

  private spawnFlames(intensity: number) {
    if (this.flames.length > 280) return;
    const count = Math.max(1, Math.floor(4 * intensity));
    const nozzles = [-6, 6];
    for (const nx of nozzles) {
      for (let i = 0; i < count; i++) {
        const g = new Graphics();
        g.circle(0, 0, 3).fill(0xffffff);
        // World position: characterContainer + offset
        const wx = this.characterContainer.x + nx;
        const wy = this.characterContainer.y + 28;
        g.position.set(wx, wy);
        this.characterLayer.addChild(g);
        this.flames.push({
          g,
          vx: (Math.random() - 0.5) * 1.2,
          vy: 4 + Math.random() * 3,
          life: 0,
          maxLife: 250,
          size: 5 + Math.random() * 2,
        });
      }
    }
  }

  private updateFlames(dtMs: number) {
    for (let i = this.flames.length - 1; i >= 0; i--) {
      const p = this.flames[i];
      p.life += dtMs;
      const t = p.life / p.maxLife;
      if (t >= 1) {
        p.g.destroy();
        this.flames.splice(i, 1);
        continue;
      }
      p.g.x += p.vx + (Math.random() - 0.5) * 0.6;
      p.g.y += p.vy;
      p.g.scale.set((1 - t * 0.6) * (p.size / 5));
      p.g.alpha = 1 - t;
      const c = t < 0.25 ? 0xffffff : t < 0.5 ? 0xffff44 : t < 0.8 ? 0xff8800 : 0xff4400;
      p.g.tint = c;
    }
  }

  private spawnSmoke(originX: number, originY: number, count = 2) {
    for (let i = 0; i < count; i++) {
      const g = new Graphics();
      g.circle(0, 0, 6).fill({ color: 0x666677, alpha: 0.6 });
      g.position.set(originX, originY);
      this.characterLayer.addChild(g);
      this.smoke.push({
        g,
        vx: (Math.random() - 0.5) * 3,
        vy: -1.5 - Math.random() * 1.5,
        life: 0,
        maxLife: 800,
        rot: 0,
        rotSpeed: (Math.random() - 0.5) * 0.05,
      });
    }
  }

  private updateSmoke(dtMs: number) {
    for (let i = this.smoke.length - 1; i >= 0; i--) {
      const p = this.smoke[i];
      p.life += dtMs;
      const t = p.life / p.maxLife;
      if (t >= 1) {
        p.g.destroy();
        this.smoke.splice(i, 1);
        continue;
      }
      p.g.x += p.vx;
      p.g.y += p.vy;
      p.g.alpha = 0.6 * (1 - t);
      p.g.scale.set(1 + t * 1.8);
      p.g.rotation += p.rotSpeed;
    }
  }

  private spawnExplosion(x: number, y: number) {
    const colors = [0xff4400, 0xff8800, 0xffff00, 0xffffff, 0xff0044];
    for (let i = 0; i < 35; i++) {
      const g = new Graphics();
      const c = colors[i % colors.length];
      g.circle(0, 0, 3 + Math.random() * 3).fill(c);
      g.position.set(x, y);
      this.characterLayer.addChild(g);
      const angle = (Math.PI * 2 * i) / 35 + Math.random() * 0.3;
      const speed = 2 + Math.random() * 5;
      this.explosionParticles.push({
        g,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        life: 0,
        maxLife: 800,
        rot: 0,
        rotSpeed: (Math.random() - 0.5) * 0.2,
      });
    }
    // Dust cloud at ground hit
    for (let i = 0; i < 18; i++) {
      const g = new Graphics();
      g.circle(0, 0, 6).fill({ color: 0x888899, alpha: 0.7 });
      g.position.set(x, y);
      this.characterLayer.addChild(g);
      this.explosionParticles.push({
        g,
        vx: (Math.random() - 0.5) * 6,
        vy: -Math.random() * 1.5,
        life: 0,
        maxLife: 1000,
        rot: 0,
        rotSpeed: (Math.random() - 0.5) * 0.05,
      });
    }
  }

  private updateExplosion(dtMs: number) {
    for (let i = this.explosionParticles.length - 1; i >= 0; i--) {
      const p = this.explosionParticles[i];
      p.life += dtMs;
      const t = p.life / p.maxLife;
      if (t >= 1) {
        p.g.destroy();
        this.explosionParticles.splice(i, 1);
        continue;
      }
      p.g.x += p.vx;
      p.g.y += p.vy;
      p.vy += 0.15 * (dtMs / 16.67);
      p.g.alpha = 1 - t;
      p.g.rotation += p.rotSpeed;
    }
  }

  private updateMeter(w: number, h: number, mult: number) {
    const barH = h - 30;
    const ratio = Math.min(1, Math.log(Math.max(1, mult)) / Math.log(1000));
    const fillH = ratio * barH;
    const c = tierColor(mult);
    this.meterFill.clear();
    if (fillH > 0) {
      const grad = new FillGradient(0, barH, 0, barH - fillH);
      grad.addColorStop(0, 0x00ff88);
      grad.addColorStop(0.5, 0xffd700);
      grad.addColorStop(1, 0xff4400);
      this.meterFill.roundRect(2, barH - fillH, 14, fillH, 7).fill(grad);
    }
    // Indicator
    const indY = barH - fillH;
    this.meterIndicator.clear();
    this.meterIndicator
      .moveTo(-12, indY)
      .lineTo(0, indY)
      .stroke({ color: 0xffffff, width: 2 });
    // Badge
    this.meterBadgeBg.clear();
    this.meterBadgeBg
      .roundRect(-46, indY - 9, 32, 18, 4)
      .fill({ color: 0x000000, alpha: 0.85 })
      .roundRect(-46, indY - 9, 32, 18, 4)
      .stroke({ color: c, width: 1 });
    this.meterBadgeText.position.set(-30, indY);
    this.meterBadgeText.text = `${mult.toFixed(2)}x`;
    this.meterBadgeText.style.fill = c;
  }

  private updateCenter(mult: number, dtMs: number) {
    const c = tierColor(mult);
    if (this.phase === 'waiting') {
      this.centerText.alpha = 0;
      this.centerGlow.alpha = 0;
      this.centerSubLabel.alpha = 0;
      const sec = Math.max(0, Math.ceil(this.countdown));
      this.countdownText.text = sec > 0 ? String(sec) : '🚀';
      this.countdownText.alpha = 1;
      this.centerStatus.text = 'IGNITION SEQUENCE';
      this.centerStatus.style.fill = 0xff8c00;
      this.centerStatus.alpha = 0.6 + 0.4 * Math.sin(performance.now() / 300);
    } else if (this.phase === 'running') {
      this.countdownText.alpha = 0;
      this.centerText.text = `${mult.toFixed(2)}×`;
      this.centerGlow.text = `${mult.toFixed(2)}×`;
      this.centerText.style.fill = c;
      this.centerGlow.style.fill = c;
      this.centerText.alpha = 1;
      this.centerGlow.alpha = 0.7;
      this.centerSubLabel.alpha = 0.5;
      this.centerStatus.text = '';
      const pulse = 1 + 0.04 * Math.sin(performance.now() / 220);
      this.centerContainer.scale.set(pulse);
      if (mult >= 25) {
        this.rainbowHue = (this.rainbowHue + dtMs * 0.36) % 360;
        const cm = new ColorMatrixFilter();
        cm.hue(this.rainbowHue, false);
        this.centerText.filters = [cm];
        this.centerGlow.filters = [new BlurFilter({ strength: 14, quality: 2 }), cm];
      } else {
        this.centerText.filters = null;
        this.centerGlow.filters = [new BlurFilter({ strength: 14, quality: 2 })];
      }
      const milestones = [2, 5, 10, 25, 50, 100];
      for (const m of milestones) {
        if (mult >= m && !this.milestonesHit.has(m)) {
          this.milestonesHit.add(m);
          this.spawnMilestoneBurst(m);
        }
      }
    } else if (this.phase === 'crashed') {
      this.centerContainer.scale.set(1);
      this.countdownText.alpha = 0;
      this.centerText.text = `${this.crashPoint.toFixed(2)}×`;
      this.centerGlow.text = `${this.crashPoint.toFixed(2)}×`;
      this.centerText.style.fill = 0xff4466;
      this.centerGlow.style.fill = 0xff4466;
      this.centerText.alpha = 1;
      this.centerGlow.alpha = 0.7;
      this.centerSubLabel.alpha = 0;
      this.centerStatus.text = 'CRASHED 💥';
      this.centerStatus.style.fill = 0xff4466;
      this.centerStatus.alpha = 1;
      this.centerText.filters = null;
      this.centerGlow.filters = [new BlurFilter({ strength: 14, quality: 2 })];
    } else if (this.phase === 'cashed_out') {
      this.centerContainer.scale.set(1);
      this.countdownText.alpha = 0;
      this.centerText.text = `${mult.toFixed(2)}×`;
      this.centerGlow.text = `${mult.toFixed(2)}×`;
      this.centerText.style.fill = 0x00ff88;
      this.centerGlow.style.fill = 0x00ff88;
      this.centerText.alpha = 1;
      this.centerGlow.alpha = 0.7;
      this.centerSubLabel.alpha = 0;
      this.centerStatus.text = 'ESCAPED 🚀';
      this.centerStatus.style.fill = 0x00ff88;
      this.centerStatus.alpha = 1;
      this.centerText.filters = null;
      this.centerGlow.filters = [new BlurFilter({ strength: 14, quality: 2 })];
    }
    // Update ALT label
    this.altValue.text = `${mult.toFixed(2)}×`;
    this.altValue.style.fill = tierColor(mult);

    // Animate milestone bursts
    for (let i = this.milestoneBursts.length - 1; i >= 0; i--) {
      const b = this.milestoneBursts[i];
      b.t += dtMs;
      const t = b.t / 800;
      if (t >= 1) {
        b.text.destroy();
        this.milestoneBursts.splice(i, 1);
        continue;
      }
      const scaleP = t < 0.4 ? 0.5 + (t / 0.4) * 0.9 : 1.4 - ((t - 0.4) / 0.6) * 0.4;
      b.text.scale.set(scaleP);
      b.text.alpha = t < 0.5 ? t * 2 : 1 - (t - 0.5) * 2;
      b.text.y = 70 + t * 30;
    }
  }

  private spawnMilestoneBurst(m: number) {
    const c = tierColor(m);
    const t = new Text({
      text: `🚀 ${m}×!`,
      style: new TextStyle({
        fontFamily: 'Orbitron, "Syne", system-ui, sans-serif',
        fontSize: 30,
        fontWeight: '900',
        fill: c,
        dropShadow: { color: c, blur: 12, distance: 0, alpha: 0.9 },
      }),
    });
    t.anchor.set(0.5);
    t.position.set(0, 70);
    this.centerContainer.addChild(t);
    this.milestoneBursts.push({ text: t, t: 0 });
  }

  private tick = (ticker: Ticker) => {
    if (!this.app || this.destroyed) return;
    const w = this.app.renderer.width / this.app.renderer.resolution;
    const h = this.app.renderer.height / this.app.renderer.resolution;
    const dtMs = ticker.deltaMS;
    const elapsed = performance.now() - this.startTime;

    // Stars
    for (const s of this.stars) {
      if (s.twinkle) {
        s.g.alpha = s.baseAlpha * (0.6 + 0.4 * Math.sin(elapsed / s.period * Math.PI * 2));
      }
    }

    // City scroll: based on multiplier velocity in running, gentle in idle
    let scrollDelta = 0;
    if (this.phase === 'running') {
      const dm = Math.max(0, this.multiplier - this.prevMult);
      scrollDelta = dm * 120 + 0.8;
    } else if (this.phase === 'waiting') {
      scrollDelta = 0.3;
    } else if (this.phase === 'crashed') {
      scrollDelta = -2; // city moves up (character falling = relative city goes up)
    }
    this.prevMult = this.multiplier;
    this.cityScroll += scrollDelta;

    for (const b of this.buildings) {
      b.g.y += scrollDelta * LAYER_SPEED[b.layer] * (dtMs / 16.67);
      // Recycle off bottom (during fall)
      if (b.g.y > h + 20) {
        b.g.y = -b.height - Math.random() * 100;
        b.g.x = Math.random() * w;
      }
      // Recycle off top (during ascent — typical case)
      if (b.g.y + b.height < -20) {
        b.g.y = h + Math.random() * 80;
        b.g.x = Math.random() * w;
      }
    }

    // Character behavior
    if (this.phase === 'waiting') {
      // Idle bob
      this.characterContainer.y = h * 0.6 + Math.sin(elapsed / 1500 * Math.PI * 2) * 4;
      this.characterContainer.rotation = Math.sin(elapsed / 1200) * 0.04;
      this.characterContainer.x = w * 0.42;
      this.spawnFlames(0.4);
    } else if (this.phase === 'running') {
      // Slight forward lean, small turbulence
      this.characterContainer.rotation = -0.18 + Math.sin(elapsed / 600) * 0.04;
      this.characterContainer.x = w * 0.42 + Math.sin(elapsed / 700) * 6;
      this.characterContainer.y = h * 0.45 + Math.sin(elapsed / 400) * 3;
      const intensity = Math.min(2, 1 + (this.multiplier - 1) * 0.05);
      this.spawnFlames(intensity);
    } else if (this.phase === 'crashed') {
      const ce = performance.now() - this.crashStart;
      this.gravityVel += 0.5 * (dtMs / 16.67);
      this.characterContainer.y += this.gravityVel;
      this.characterContainer.x += 1.5 * (dtMs / 16.67);
      this.characterContainer.rotation += 0.18 * (dtMs / 16.67);
      if (ce > 200 && ce < 1800 && this.characterContainer.alpha > 0) {
        this.spawnSmoke(this.characterContainer.x + 4, this.characterContainer.y + 12, 2);
      }
      // Camera shake at impact
      if (ce >= 600 && ce < 1200) {
        const amp = 8 * (1 - (ce - 600) / 600);
        this.app.stage.position.set(
          (Math.random() - 0.5) * amp * 2,
          (Math.random() - 0.5) * amp * 2
        );
      } else {
        this.app.stage.position.set(0, 0);
      }
      // Ground impact at y > h
      if (this.characterContainer.y > h - 20 && this.characterContainer.alpha > 0) {
        this.spawnExplosion(this.characterContainer.x, h - 10);
        this.characterContainer.alpha = 0;
      }
    } else if (this.phase === 'cashed_out') {
      // Continue ascending gently
      this.characterContainer.rotation = Math.max(-0.4, this.characterContainer.rotation - 0.005);
      this.characterContainer.y -= 0.5 * (dtMs / 16.67);
      this.spawnFlames(1.4);
    }

    this.updateFlames(dtMs);
    this.updateSmoke(dtMs);
    this.updateExplosion(dtMs);
    this.updateMeter(w, h, this.multiplier);
    this.updateCenter(this.multiplier, dtMs);
  };

  setPhase(phase: JetpackPhase, opts?: { crashPoint?: number }) {
    if (this.phase === phase) return;
    this.phase = phase;
    if (phase === 'running') {
      this.crashStart = performance.now();
      this.gravityVel = 0;
      this.milestonesHit.clear();
      this.prevMult = 1;
    } else if (phase === 'crashed') {
      if (opts?.crashPoint != null) this.crashPoint = opts.crashPoint;
      this.crashStart = performance.now();
      this.gravityVel = -2;
    } else if (phase === 'waiting') {
      this.app?.stage.position.set(0, 0);
      this.characterContainer.alpha = 1;
      this.characterContainer.rotation = 0;
    } else if (phase === 'cashed_out') {
      this.characterContainer.alpha = 1;
    }
  }

  setMultiplier(m: number) {
    this.multiplier = m;
  }

  setCountdown(seconds: number) {
    this.countdown = seconds;
  }

  private handleResize() {
    if (!this.app || this.destroyed) return;
    const w = Math.max(320, this.host.clientWidth);
    const h = Math.max(240, this.host.clientHeight);
    this.app.renderer.resize(w, h);
    this.drawBackground(w, h);
    this.drawMeterBg(w, h);
    this.layoutUI(w, h);
  }

  destroy() {
    this.destroyed = true;
    this.ro?.disconnect();
    this.ro = null;
    if (this.app) {
      try {
        this.app.ticker.remove(this.tick);
        this.app.destroy(true, { children: true, texture: true });
      } catch {
        /* noop */
      }
      this.app = null;
    }
    this.flames = [];
    this.smoke = [];
    this.explosionParticles = [];
    this.stars = [];
    this.buildings = [];
  }
}
