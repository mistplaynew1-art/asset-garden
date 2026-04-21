/**
 * BigWinOverlay — full-screen PixiJS celebration shown for ≥10× wins.
 *
 *  - 10x  → BIG WIN   (gold)
 *  - 25x  → MEGA WIN  (rainbow)
 *  - 50x  → EPIC WIN  (animated gradient)
 *  - 200x → JACKPOT   (full flash + tsunami)
 *
 * Coin rain uses ParticleContainer. Auto-dismisses after 4s or on click.
 */
import * as PIXI from 'pixi.js';
import { classifyWinTier } from './WinEvaluator';

const TIER_TEXT: Record<string, string> = {
  big: 'BIG WIN',
  mega: 'MEGA WIN',
  epic: 'EPIC WIN',
  jackpot: 'JACKPOT',
};

const TIER_COIN_COUNT: Record<string, number> = {
  big: 200,
  mega: 400,
  epic: 600,
  jackpot: 800,
};

const TIER_COLORS: Record<string, number[]> = {
  big: [0xffd34a, 0xfff066],
  mega: [0xff6bff, 0x6bf0ff, 0xffd34a],
  epic: [0xff3355, 0xffd34a, 0x66ff99, 0x66bbff],
  jackpot: [0xffffff, 0xffd34a, 0xff3355, 0x66ff99, 0x66bbff, 0xff66ff],
};

interface CoinSprite extends PIXI.Sprite {
  vx: number;
  vy: number;
  vr: number;
  ay: number;
}

export async function createBigWinOverlay(
  container: HTMLElement,
  winAmount: number,
  multiplier: number,
  currency: string,
): Promise<void> {
  const tier = classifyWinTier(multiplier);
  if (!tier || tier === 'small') return;

  const w = container.clientWidth || 640;
  const h = container.clientHeight || 480;

  const app = new PIXI.Application();
  await app.init({
    width: w,
    height: h,
    backgroundAlpha: 0,
    antialias: true,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
  });

  const canvas = app.canvas as HTMLCanvasElement;
  canvas.style.position = 'absolute';
  canvas.style.inset = '0';
  canvas.style.pointerEvents = 'auto';
  canvas.style.zIndex = '60';
  container.appendChild(canvas);

  // Backdrop
  const backdrop = new PIXI.Graphics()
    .rect(0, 0, w, h)
    .fill({ color: 0x000000, alpha: 0.0 });
  app.stage.addChild(backdrop);

  // Coin texture (procedural)
  const coinG = new PIXI.Graphics()
    .circle(8, 8, 8)
    .fill({ color: 0xffd34a })
    .circle(8, 8, 5)
    .fill({ color: 0xfff066 });
  const coinTex = app.renderer.generateTexture(coinG);

  const particleContainer = new PIXI.Container();
  app.stage.addChild(particleContainer);

  const coins: CoinSprite[] = [];
  const palette = TIER_COLORS[tier] ?? [0xffd34a];
  const total = TIER_COIN_COUNT[tier] ?? 200;
  for (let i = 0; i < total; i++) {
    const c = new PIXI.Sprite(coinTex) as CoinSprite;
    c.anchor.set(0.5);
    c.x = Math.random() * w;
    c.y = -Math.random() * h - 20;
    c.scale.set(0.6 + Math.random() * 0.9);
    c.tint = palette[Math.floor(Math.random() * palette.length)];
    c.vx = (Math.random() - 0.5) * 1.2;
    c.vy = 1 + Math.random() * 3;
    c.vr = (Math.random() - 0.5) * 0.18;
    c.ay = 0.05 + Math.random() * 0.05;
    coins.push(c);
    particleContainer.addChild(c);
  }

  // Win text
  const tierLabel = TIER_TEXT[tier] ?? 'WIN';
  const fancyTier = tier === 'mega' || tier === 'epic' || tier === 'jackpot';
  const titleStyle = new PIXI.TextStyle({
    fontFamily: 'Syne, system-ui, sans-serif',
    fontSize: Math.min(w, h) * 0.13,
    fontWeight: '900',
    fill: fancyTier ? '#ff66ff' : '#ffd34a',
    stroke: { color: '#7a4f00', width: 6 },
    dropShadow: { color: '#000000', alpha: 0.6, blur: 6, distance: 4, angle: Math.PI / 4 },
    align: 'center',
  });
  const title = new PIXI.Text({ text: tierLabel, style: titleStyle });
  title.anchor.set(0.5);
  title.x = w / 2;
  title.y = h * 0.4;
  title.scale.set(0);
  app.stage.addChild(title);

  const amtStyle = new PIXI.TextStyle({
    fontFamily: 'Syne, system-ui, sans-serif',
    fontSize: Math.min(w, h) * 0.08,
    fontWeight: '800',
    fill: '#ffffff',
    stroke: { color: '#000000', width: 4 },
    align: 'center',
  });
  const amt = new PIXI.Text({ text: `0 ${currency}`, style: amtStyle });
  amt.anchor.set(0.5);
  amt.x = w / 2;
  amt.y = h * 0.55;
  amt.alpha = 0;
  app.stage.addChild(amt);

  // Animations
  let elapsed = 0;
  let countUp = 0;
  const dismissAt = 4000;
  let dismissed = false;

  const dismiss = () => {
    if (dismissed) return;
    dismissed = true;
    const fadeStart = elapsed;
    app.ticker.add(() => {
      const t = (elapsed - fadeStart) / 500;
      app.stage.alpha = Math.max(0, 1 - t);
      if (t >= 1) {
        try { app.destroy(true, { children: true, texture: true }); } catch { /* noop */ }
        canvas.remove();
      }
    });
  };

  canvas.addEventListener('click', dismiss);

  app.ticker.add(ticker => {
    elapsed += ticker.deltaMS;

    // Backdrop fade-in
    backdrop.clear().rect(0, 0, w, h).fill({
      color: tier === 'jackpot' ? 0x110008 : 0x000000,
      alpha: Math.min(0.78, elapsed / 300 * 0.78),
    });

    // Title scale-in pop
    if (title.scale.x < 1) {
      title.scale.x = title.scale.y = Math.min(1.2, title.scale.x + 0.06);
      if (title.scale.x >= 1.2) title.scale.set(1.2);
    } else {
      title.scale.x = title.scale.y = 1 + Math.sin(elapsed / 300) * 0.04;
    }

    // Amount fade in + count up
    if (elapsed > 400) {
      amt.alpha = Math.min(1, amt.alpha + 0.05);
      const target = winAmount;
      const speed = target / 60;
      countUp = Math.min(target, countUp + speed);
      amt.text = `${countUp.toFixed(2)} ${currency}`;
    }

    // Coins
    for (const c of coins) {
      c.vy += c.ay * ticker.deltaTime;
      c.x += c.vx * ticker.deltaTime;
      c.y += c.vy * ticker.deltaTime;
      c.rotation += c.vr * ticker.deltaTime;
      if (c.y > h + 20) {
        c.y = -20 - Math.random() * 40;
        c.x = Math.random() * w;
        c.vy = 1 + Math.random() * 3;
      }
    }

    if (elapsed >= dismissAt && !dismissed) dismiss();
  });
}
