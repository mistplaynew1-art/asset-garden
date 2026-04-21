/**
 * AviatorScene — Pixi.js 8 procedural canvas for the Crash/Aviator game.
 * 100% procedural drawing (zero image assets). Mounted via AviatorCanvas.tsx.
 *
 * VISUAL ONLY: this scene receives the multiplier from React state. It never
 * computes the multiplier itself and never affects RNG, bets, or payouts.
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

export type AviatorPhase = 'waiting' | 'running' | 'crashed' | 'cashed_out';

interface Star {
  g: Graphics;
  baseAlpha: number;
  twinkle: boolean;
  period: number;
  speed: number;
}

interface Cloud {
  g: Graphics;
  speed: number;
  layerAlpha: number;
}

interface ExhaustParticle {
  g: Graphics;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
}

interface SmokeParticle {
  g: Graphics;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

const TIER_COLORS = {
  white: 0xffffff,
  gold: 0xffd700,
  orange: 0xff8c00,
  redOrange: 0xff4500,
  rainbow: 0xffffff,
};

function tierColor(mult: number): number {
  if (mult >= 25) return TIER_COLORS.rainbow;
  if (mult >= 10) return TIER_COLORS.redOrange;
  if (mult >= 5) return TIER_COLORS.orange;
  if (mult >= 2) return TIER_COLORS.gold;
  return TIER_COLORS.white;
}

export class AviatorScene {
  app: Application | null = null;
  private host: HTMLElement;
  private ro: ResizeObserver | null = null;
  private destroyed = false;

  // Layers
  private skyLayer = new Container();
  private starLayer = new Container();
  private cloudLayer = new Container();
  private gridLayer = new Container();
  private trailLayer = new Container();
  private planeLayer = new Container();
  private uiLayer = new Container();

  // Visual elements
  private skyRect = new Graphics();
  private stars: Star[] = [];
  private clouds: Cloud[] = [];
  private trailGfx = new Graphics();
  private gridGfx = new Graphics();
  private moveTickGfx = new Graphics();

  // Plane
  private planeContainer = new Container();
  private planeBody = new Container();
  private planeGfx = new Graphics();
  private planeNavLeft = new Graphics();
  private planeNavRight = new Graphics();
  private exhaust: ExhaustParticle[] = [];
  private contrail: Array<{ x: number; y: number }> = [];
  private contrailGfx = new Graphics();

  // Smoke (crash)
  private smoke: SmokeParticle[] = [];

  // Multiplier badge (attached to plane)
  private badgeContainer = new Container();
  private badgeBg = new Graphics();
  private badgeText: Text;

  // Center display
  private centerContainer = new Container();
  private centerText: Text;
  private centerGlow: Text;
  private centerSubLabel: Text;
  private centerStatus: Text;

  // Countdown
  private countdownText: Text;

  // Trail data
  private trailPoints: Array<{ x: number; y: number }> = [];
  private startTime = 0;

  // External state
  multiplier = 1.0;
  phase: AviatorPhase = 'waiting';
  crashPoint = 0;
  countdown = 0; // seconds remaining in waiting

  // Crash physics
  private crashStart = 0;
  private gravityVel = 0;
  private shakeAmp = 0;
  private rainbowHue = 0;

  // Milestone tracking
  private milestonesHit = new Set<number>();
  private milestoneBursts: Array<{ text: Text; t: number }> = [];

  constructor(host: HTMLElement) {
    this.host = host;

    const titleStyle = new TextStyle({
      fontFamily: 'Orbitron, "Syne", system-ui, sans-serif',
      fontSize: 84,
      fontWeight: '900',
      fill: 0xffffff,
      letterSpacing: 2,
    });
    const glowStyle = new TextStyle({ ...titleStyle, fill: 0x00f5ff });
    this.centerText = new Text({ text: '1.00×', style: titleStyle });
    this.centerGlow = new Text({ text: '1.00×', style: glowStyle });
    this.centerGlow.alpha = 0.65;
    this.centerGlow.filters = [new BlurFilter({ strength: 14, quality: 2 })];

    this.centerSubLabel = new Text({
      text: 'MULTIPLIER',
      style: new TextStyle({
        fontFamily: 'Orbitron, "Syne", system-ui, sans-serif',
        fontSize: 12,
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
        fill: 0x00f5ff,
      }),
    });
    this.countdownText.alpha = 0;

    this.badgeText = new Text({
      text: '1.00×',
      style: new TextStyle({
        fontFamily: 'Orbitron, "Syne", system-ui, sans-serif',
        fontSize: 14,
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
      backgroundColor: 0x050818,
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

    // Layer composition
    app.stage.addChild(this.skyLayer);
    app.stage.addChild(this.starLayer);
    app.stage.addChild(this.cloudLayer);
    app.stage.addChild(this.gridLayer);
    app.stage.addChild(this.trailLayer);
    app.stage.addChild(this.planeLayer);
    app.stage.addChild(this.uiLayer);

    // Sky
    this.skyLayer.addChild(this.skyRect);
    this.drawSky(w, h);

    // Stars
    this.spawnStars(w, h);

    // Clouds (3 layers via single container, depth via alpha + size)
    this.spawnClouds(w, h);

    // Grid
    this.gridLayer.addChild(this.gridGfx);
    this.gridLayer.addChild(this.moveTickGfx);
    this.drawGrid(w, h);

    // Trail
    this.trailLayer.addChild(this.trailGfx);

    // Plane
    this.buildPlane();
    this.contrailGfx.alpha = 0.7;
    this.planeLayer.addChild(this.contrailGfx);
    this.planeLayer.addChild(this.planeContainer);

    // Badge
    this.badgeContainer.addChild(this.badgeBg);
    this.badgeContainer.addChild(this.badgeText);
    this.badgeText.anchor.set(0.5);
    this.badgeContainer.visible = false;
    this.uiLayer.addChild(this.badgeContainer);

    // Center display
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
    this.layoutCenter(w, h);

    // Plane initial position (off-screen left)
    this.planeContainer.position.set(60, h * 0.75);

    this.startTime = performance.now();
    app.ticker.add(this.tick);

    // Resize
    if (typeof ResizeObserver !== 'undefined') {
      this.ro = new ResizeObserver(() => this.handleResize());
      this.ro.observe(this.host);
    }
  }

  private drawSky(w: number, h: number) {
    this.skyRect.clear();
    const grad = new FillGradient(0, 0, 0, h);
    grad.addColorStop(0, 0x050818);
    grad.addColorStop(0.6, 0x0a1024);
    grad.addColorStop(1, 0x0d1535);
    this.skyRect.rect(0, 0, w, h).fill(grad);
  }

  private spawnStars(w: number, h: number) {
    this.stars.forEach((s) => s.g.destroy());
    this.stars = [];
    for (let i = 0; i < 120; i++) {
      const g = new Graphics();
      const size = Math.random() < 0.7 ? 1 : Math.random() < 0.5 ? 1.5 : 2;
      g.circle(0, 0, size).fill({ color: 0xffffff, alpha: 1 });
      g.position.set(Math.random() * w, Math.random() * h * 0.85);
      const layer = i % 3;
      const speed = layer === 0 ? 0.05 : layer === 1 ? 0.15 : 0.35;
      const baseAlpha = 0.3 + Math.random() * 0.6;
      const twinkle = Math.random() < 0.4;
      g.alpha = baseAlpha;
      this.starLayer.addChild(g);
      this.stars.push({
        g,
        baseAlpha,
        twinkle,
        period: 1500 + Math.random() * 2500,
        speed,
      });
    }
  }

  private spawnClouds(w: number, h: number) {
    this.clouds.forEach((c) => c.g.destroy());
    this.clouds = [];
    const layers = [
      { count: 8, minW: 80, maxW: 130, alpha: 0.18, speed: 0.2, blur: 6 },
      { count: 6, minW: 130, maxW: 220, alpha: 0.32, speed: 0.5, blur: 3 },
      { count: 4, minW: 220, maxW: 360, alpha: 0.5, speed: 1.0, blur: 1.5 },
    ];
    layers.forEach((layer, li) => {
      for (let i = 0; i < layer.count; i++) {
        const g = new Graphics();
        const cw = layer.minW + Math.random() * (layer.maxW - layer.minW);
        const ch = cw * 0.4;
        // 3-5 overlapping ellipses for an organic cloud shape
        const ovals = 3 + Math.floor(Math.random() * 3);
        for (let o = 0; o < ovals; o++) {
          const ox = (o / ovals) * cw + (Math.random() - 0.5) * 20;
          const oy = (Math.random() - 0.5) * 10;
          const rx = cw * 0.18 + Math.random() * cw * 0.12;
          const ry = ch * 0.45 + Math.random() * ch * 0.25;
          g.ellipse(ox, oy, rx, ry).fill({ color: 0xd0d8f0, alpha: 1 });
        }
        if (layer.blur > 0) g.filters = [new BlurFilter({ strength: layer.blur, quality: 1 })];
        g.alpha = layer.alpha;
        g.position.set(
          Math.random() * w,
          (li / layers.length) * h * 0.7 + Math.random() * h * 0.2 + 20
        );
        this.cloudLayer.addChild(g);
        this.clouds.push({ g, speed: layer.speed, layerAlpha: layer.alpha });
      }
    });
  }

  private drawGrid(w: number, h: number) {
    this.gridGfx.clear();
    const labels = [2, 5, 10, 25, 50, 100];
    labels.forEach((m) => {
      const y = h - (Math.log(m) / Math.log(1000)) * (h - 40) - 30;
      // dashed line
      const dash = 6;
      const gap = 6;
      let x = 0;
      while (x < w) {
        this.gridGfx
          .moveTo(x, y)
          .lineTo(Math.min(w, x + dash), y)
          .stroke({ color: 0xffffff, alpha: 0.06, width: 1 });
        x += dash + gap;
      }
    });
  }

  private buildPlane() {
    const c = this.planeContainer;
    const body = this.planeBody;
    body.removeChildren();
    this.planeGfx.clear();

    // Wings (drawn first, behind body)
    const wingGrad = new FillGradient(0, -22, 0, 22);
    wingGrad.addColorStop(0, 0xc0c0d8);
    wingGrad.addColorStop(1, 0x8080a8);
    this.planeGfx
      .poly([0, 0, 32, -22, 60, -4])
      .fill(wingGrad)
      .poly([0, 0, 32, 22, 60, 4])
      .fill(wingGrad);

    // Tail stabilizers
    this.planeGfx
      .roundRect(-44, -10, 24, 4, 2)
      .fill(0xa0a0c0)
      .roundRect(-44, 6, 24, 4, 2)
      .fill(0xa0a0c0);

    // Tail fin
    this.planeGfx.poly([-40, 0, -50, -22, -30, -2]).fill(0xb0b0d0);

    // Fuselage
    const fuselageGrad = new FillGradient(0, -9, 0, 9);
    fuselageGrad.addColorStop(0, 0xe8e8f0);
    fuselageGrad.addColorStop(1, 0xa0a0c0);
    this.planeGfx.roundRect(-40, -9, 80, 18, 9).fill(fuselageGrad);

    // Cockpit
    this.planeGfx.roundRect(20, -7, 20, 14, 6).fill({ color: 0x4488ff, alpha: 0.9 });
    // cockpit highlight arc — approximate with a small ellipse
    this.planeGfx.ellipse(28, -4, 7, 1.5).fill({ color: 0xffffff, alpha: 0.7 });

    // Airline neon stripe
    this.planeGfx.moveTo(-36, 0).lineTo(36, 0).stroke({ color: 0x00f5ff, width: 1, alpha: 0.7 });

    // Windows
    for (let i = 0; i < 4; i++) {
      const wx = -22 + i * 12;
      this.planeGfx.circle(wx, 0, 3.5).fill({ color: 0x66aaff, alpha: 0.9 });
    }

    body.addChild(this.planeGfx);

    // Nav lights as separate gfx so we can blink alpha
    this.planeNavLeft.clear();
    this.planeNavLeft.circle(0, 0, 2).fill(0xff4444);
    this.planeNavLeft.position.set(30, -20);
    this.planeNavRight.clear();
    this.planeNavRight.circle(0, 0, 2).fill(0x44ff44);
    this.planeNavRight.position.set(30, 20);
    body.addChild(this.planeNavLeft);
    body.addChild(this.planeNavRight);

    c.removeChildren();
    c.addChild(body);
  }

  private layoutCenter(w: number, h: number) {
    this.centerContainer.position.set(w / 2, h / 2);
    this.centerText.position.set(0, -10);
    this.centerGlow.position.set(0, -10);
    this.centerSubLabel.position.set(0, 50);
    this.centerStatus.position.set(0, 78);
    this.countdownText.position.set(0, -10);
  }

  private spawnExhaust(originX: number, originY: number) {
    if (this.exhaust.length > 240) return;
    for (let i = 0; i < 4; i++) {
      const g = new Graphics();
      g.circle(0, 0, 3).fill(0xffffff);
      g.position.set(originX, originY + (Math.random() - 0.5) * 2);
      this.planeLayer.addChildAt(g, 0);
      this.exhaust.push({
        g,
        vx: -3 - Math.random() * 2,
        vy: (Math.random() - 0.5) * 1.5,
        life: 0,
        maxLife: 400,
        size: 6 + Math.random() * 3,
      });
    }
  }

  private updateExhaust(dtMs: number) {
    for (let i = this.exhaust.length - 1; i >= 0; i--) {
      const p = this.exhaust[i];
      p.life += dtMs;
      const t = p.life / p.maxLife;
      if (t >= 1) {
        p.g.destroy();
        this.exhaust.splice(i, 1);
        continue;
      }
      p.g.x += p.vx;
      p.g.y += p.vy;
      const scale = 1 - t * 0.7;
      p.g.scale.set(scale * (p.size / 6));
      p.g.alpha = 1 - t;
      // color shift via tint
      const c = t < 0.33 ? 0xffffff : t < 0.66 ? 0xffff88 : 0xff8844;
      p.g.tint = c;
    }
  }

  private spawnSmoke(originX: number, originY: number) {
    for (let i = 0; i < 3; i++) {
      const g = new Graphics();
      g.circle(0, 0, 6).fill({ color: 0x666677, alpha: 0.7 });
      g.position.set(originX, originY);
      this.planeLayer.addChild(g);
      this.smoke.push({
        g,
        vx: (Math.random() - 0.5) * 2,
        vy: -1 - Math.random() * 1.5,
        life: 0,
        maxLife: 800,
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
      p.g.alpha = 0.7 * (1 - t);
      p.g.scale.set(1 + t * 1.5);
    }
  }

  private updateContrail(px: number, py: number) {
    this.contrail.unshift({ x: px, y: py });
    if (this.contrail.length > 80) this.contrail.pop();
    this.contrailGfx.clear();
    if (this.contrail.length < 2) return;
    for (let i = 0; i < this.contrail.length - 1; i++) {
      const a = this.contrail[i];
      const b = this.contrail[i + 1];
      const alpha = 0.18 * (1 - i / this.contrail.length);
      this.contrailGfx
        .moveTo(a.x, a.y)
        .lineTo(b.x, b.y)
        .stroke({ color: 0xffffff, width: 3, alpha, cap: 'round' });
    }
  }

  private drawTrail(w: number, h: number, mult: number, elapsed: number) {
    // Plane position: x increases with time, y rises with log(mult)
    const targetX = Math.min(w * 0.78, 80 + (elapsed / 1000) * 40);
    const yProgress = Math.log(Math.max(1, mult)) / Math.log(1000);
    const targetY = h - 30 - yProgress * (h - 80);

    this.trailPoints.push({ x: targetX, y: targetY });
    if (this.trailPoints.length > 600) this.trailPoints.shift();

    // Curve fill
    this.trailGfx.clear();
    if (this.trailPoints.length < 2) return { px: targetX, py: targetY };

    // Filled area below curve
    this.trailGfx.moveTo(this.trailPoints[0].x, h);
    for (const p of this.trailPoints) this.trailGfx.lineTo(p.x, p.y);
    this.trailGfx.lineTo(this.trailPoints[this.trailPoints.length - 1].x, h).closePath();
    this.trailGfx.fill({ color: 0x00f5ff, alpha: 0.18 });

    // Stroke curve on top
    this.trailGfx.moveTo(this.trailPoints[0].x, this.trailPoints[0].y);
    for (let i = 1; i < this.trailPoints.length; i++) {
      this.trailGfx.lineTo(this.trailPoints[i].x, this.trailPoints[i].y);
    }
    const strokeColor = tierColor(mult);
    this.trailGfx.stroke({
      color: strokeColor,
      width: 3,
      alpha: 1,
      cap: 'round',
      join: 'round',
    });

    // Moving Y-axis tick
    this.moveTickGfx.clear();
    let x = 0;
    while (x < w) {
      this.moveTickGfx
        .moveTo(x, targetY)
        .lineTo(Math.min(w, x + 6), targetY)
        .stroke({ color: strokeColor, alpha: 0.25, width: 1 });
      x += 12;
    }
    return { px: targetX, py: targetY };
  }

  private updateBadge(w: number, h: number, px: number, py: number, mult: number) {
    if (this.phase !== 'running') {
      this.badgeContainer.visible = false;
      return;
    }
    this.badgeContainer.visible = true;
    const c = tierColor(mult);
    this.badgeBg.clear();
    this.badgeBg
      .roundRect(-32, -14, 64, 28, 8)
      .fill({ color: 0x000000, alpha: 0.78 })
      .roundRect(-32, -14, 64, 28, 8)
      .stroke({ color: c, width: 1.5 });
    // Arrow pointing toward plane
    this.badgeBg.poly([-5, 14, 0, 20, 5, 14]).fill({ color: 0x000000, alpha: 0.78 });
    this.badgeText.text = `${mult.toFixed(2)}×`;
    this.badgeText.style.fill = c;
    // Position above & ahead of plane, clamp inside canvas
    const bx = Math.min(w - 36, px + 65);
    const by = Math.max(28, py - 38);
    this.badgeContainer.position.set(bx, by);
  }

  private updateCenter(w: number, h: number, mult: number, dtMs: number) {
    const c = tierColor(mult);
    if (this.phase === 'waiting') {
      this.centerText.alpha = 0;
      this.centerGlow.alpha = 0;
      this.centerSubLabel.alpha = 0;
      const sec = Math.max(0, Math.ceil(this.countdown));
      this.countdownText.text = sec > 0 ? String(sec) : '✈';
      this.countdownText.alpha = 1;
      this.centerStatus.text = 'PREPARING FLIGHT';
      this.centerStatus.style.fill = 0x00f5ff;
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
      // Pulse
      const pulse = 1 + 0.04 * Math.sin(performance.now() / 220);
      this.centerContainer.scale.set(pulse);
      // Rainbow at 25x+
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
      // Milestone bursts
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
      this.centerStatus.text = 'FLEW AWAY';
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
      this.centerStatus.text = 'CASHED OUT';
      this.centerStatus.style.fill = 0x00ff88;
      this.centerStatus.alpha = 1;
      this.centerText.filters = null;
      this.centerGlow.filters = [new BlurFilter({ strength: 14, quality: 2 })];
    }

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
      b.text.y = -100 - t * 30;
    }
  }

  private spawnMilestoneBurst(m: number) {
    const c = tierColor(m);
    const t = new Text({
      text: `🔥 ${m}×!`,
      style: new TextStyle({
        fontFamily: 'Orbitron, "Syne", system-ui, sans-serif',
        fontSize: 32,
        fontWeight: '900',
        fill: c,
        dropShadow: { color: c, blur: 12, distance: 0, alpha: 0.9 },
      }),
    });
    t.anchor.set(0.5);
    t.position.set(0, -100);
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
      s.g.position.x -= s.speed;
      if (s.g.position.x < -2) s.g.position.x = w + 2;
      if (s.twinkle) {
        s.g.alpha = s.baseAlpha * (0.6 + 0.4 * Math.sin(elapsed / s.period * Math.PI * 2));
      }
    }

    // Clouds
    const cloudSpeedMul = this.phase === 'running' ? 1 : this.phase === 'waiting' ? 0.5 : 0.2;
    for (const c of this.clouds) {
      c.g.position.x -= c.speed * cloudSpeedMul * (dtMs / 16.67);
      if (this.phase === 'crashed') c.g.position.y += 0.3 * (dtMs / 16.67);
      if (c.g.position.x + 200 < 0) {
        c.g.position.x = w + 100;
        c.g.position.y = Math.random() * h * 0.7 + 20;
      }
    }

    // Nav light blink
    const blink = (Math.sin(elapsed / 400) + 1) / 2;
    this.planeNavLeft.alpha = 0.3 + blink * 0.7;
    this.planeNavRight.alpha = 0.3 + (1 - blink) * 0.7;

    // Phase-driven plane behavior
    if (this.phase === 'waiting') {
      // Plane idle on the runway, gentle bob
      this.planeContainer.position.set(60, h * 0.78 + Math.sin(elapsed / 700) * 4);
      this.planeContainer.rotation = -0.05;
      this.planeContainer.alpha = 1;
      this.trailPoints = [];
      this.contrail = [];
      this.contrailGfx.clear();
      this.trailGfx.clear();
      this.moveTickGfx.clear();
      this.milestonesHit.clear();
    } else if (this.phase === 'running') {
      const runElapsed = performance.now() - this.crashStart;
      const { px, py } = this.drawTrail(w, h, this.multiplier, runElapsed);
      // Smooth lerp toward target
      this.planeContainer.x += (px - this.planeContainer.x) * 0.18;
      this.planeContainer.y += (py - this.planeContainer.y) * 0.18;
      // Tilt based on velocity
      const tilt = Math.atan2(py - this.planeContainer.y, px - this.planeContainer.x + 1) - 0.05;
      this.planeContainer.rotation = Math.max(-0.6, Math.min(0.1, tilt));
      this.planeContainer.alpha = 1;
      this.spawnExhaust(this.planeContainer.x - 38, this.planeContainer.y);
      this.updateContrail(this.planeContainer.x, this.planeContainer.y);
    } else if (this.phase === 'crashed') {
      // Stop drawing trail, plane dives & spins
      const ce = performance.now() - this.crashStart;
      this.gravityVel += 0.4 * (dtMs / 16.67);
      this.planeContainer.x += 6 * (dtMs / 16.67);
      this.planeContainer.y += this.gravityVel;
      this.planeContainer.rotation += 0.08 * (dtMs / 16.67);
      // Camera shake decays
      if (ce < 600) {
        this.shakeAmp = 8 * (1 - ce / 600);
        this.app.stage.position.set(
          (Math.random() - 0.5) * this.shakeAmp * 2,
          (Math.random() - 0.5) * this.shakeAmp * 2
        );
      } else {
        this.app.stage.position.set(0, 0);
      }
      this.spawnSmoke(this.planeContainer.x - 20, this.planeContainer.y);
      this.updateContrail(this.planeContainer.x, this.planeContainer.y);
      if (this.planeContainer.y > h + 80) {
        this.planeContainer.alpha = 0;
      }
    } else if (this.phase === 'cashed_out') {
      // Plane continues coasting upward gently
      this.planeContainer.x += 1.2 * (dtMs / 16.67);
      this.planeContainer.y -= 0.3 * (dtMs / 16.67);
      this.planeContainer.rotation = Math.max(-0.4, this.planeContainer.rotation - 0.005);
      this.spawnExhaust(this.planeContainer.x - 38, this.planeContainer.y);
      this.updateContrail(this.planeContainer.x, this.planeContainer.y);
    }

    this.updateExhaust(dtMs);
    this.updateSmoke(dtMs);
    this.updateBadge(w, h, this.planeContainer.x, this.planeContainer.y, this.multiplier);
    this.updateCenter(w, h, this.multiplier, dtMs);
  };

  setPhase(phase: AviatorPhase, opts?: { crashPoint?: number }) {
    if (this.phase === phase) return;
    this.phase = phase;
    if (phase === 'running') {
      this.crashStart = performance.now();
      this.gravityVel = 0;
      this.shakeAmp = 0;
      this.milestonesHit.clear();
    } else if (phase === 'crashed') {
      if (opts?.crashPoint != null) this.crashPoint = opts.crashPoint;
      this.crashStart = performance.now();
      this.gravityVel = -3;
    } else if (phase === 'cashed_out') {
      // Smooth out — keep plane visible
    } else if (phase === 'waiting') {
      this.app?.stage.position.set(0, 0);
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
    this.drawSky(w, h);
    this.drawGrid(w, h);
    this.layoutCenter(w, h);
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
    this.exhaust = [];
    this.smoke = [];
    this.stars = [];
    this.clouds = [];
  }
}
