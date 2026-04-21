/**
 * PIXI.js overlay — runs on a separate transparent canvas above the Phaser scene.
 * Used for high-quality particle showers + bloom on big wins so both renderers
 * actively contribute to the final composite.
 */
import * as PIXI from 'pixi.js';

interface PixiOverlayHandle {
  app: PIXI.Application;
  destroy: () => void;
  bigWin: (multiplier: number) => void;
  coinShower: (durationMs?: number) => void;
}

export async function createPixiOverlay(parent: HTMLDivElement, width: number, height: number): Promise<PixiOverlayHandle> {
  const app = new PIXI.Application();
  await app.init({
    width, height,
    backgroundAlpha: 0,
    antialias: true,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
  });

  const canvas = app.canvas as HTMLCanvasElement;
  canvas.style.position = 'absolute';
  canvas.style.inset = '0';
  canvas.style.pointerEvents = 'none';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  parent.appendChild(canvas);

  const layer = new PIXI.Container();
  app.stage.addChild(layer);

  const coinShower = (durationMs = 2200) => {
    const start = performance.now();
    const spawn = () => {
      if (performance.now() - start > durationMs) return;
      const coin = new PIXI.Graphics();
      const r = 8 + Math.random() * 8;
      coin.circle(0, 0, r).fill({ color: 0xffd34a }).stroke({ color: 0xff9900, width: 2 });
      coin.x = Math.random() * width;
      coin.y = -20;
      const vx = (Math.random() - 0.5) * 2;
      const vy = 3 + Math.random() * 3;
      const va = (Math.random() - 0.5) * 0.2;
      coin.rotation = Math.random() * Math.PI;
      layer.addChild(coin);

      const tick = () => {
        coin.x += vx;
        coin.y += vy;
        coin.rotation += va;
        if (coin.y > height + 30) {
          app.ticker.remove(tick);
          coin.destroy();
        }
      };
      app.ticker.add(tick);
      requestAnimationFrame(spawn);
    };
    spawn();
  };

  const bigWin = (multiplier: number) => {
    // Fireworks at multiple anchor points
    const points = [
      { x: width * 0.25, y: height * 0.4 },
      { x: width * 0.75, y: height * 0.4 },
      { x: width * 0.5, y: height * 0.6 },
    ];
    const colors = [0xffd34a, 0xff3355, 0x40d985, 0x3aa0ff, 0xff66cc];
    points.forEach((p, idx) => {
      setTimeout(() => burst(p.x, p.y), idx * 220);
    });
    if (multiplier >= 100) {
      // mega burst
      setTimeout(() => burst(width / 2, height / 2, 80, 5), 800);
    }
    coinShower(1800 + Math.min(multiplier * 30, 4000));

    function burst(cx: number, cy: number, count = 40, scale = 1) {
      for (let i = 0; i < count; i++) {
        const sparkle = new PIXI.Graphics();
        const color = colors[Math.floor(Math.random() * colors.length)];
        const sz = (2 + Math.random() * 3) * scale;
        sparkle.rect(-sz / 2, -sz / 2, sz, sz).fill({ color });
        sparkle.x = cx;
        sparkle.y = cy;
        layer.addChild(sparkle);
        const a = Math.random() * Math.PI * 2;
        const speed = (3 + Math.random() * 6) * scale;
        const vx = Math.cos(a) * speed;
        const vy = Math.sin(a) * speed;
        const gravity = 0.12;
        let life = 0;
        const tick = () => {
          life++;
          sparkle.x += vx;
          sparkle.y += vy + life * gravity;
          sparkle.rotation += 0.1;
          sparkle.alpha = Math.max(0, 1 - life / 90);
          if (life > 90) {
            app.ticker.remove(tick);
            sparkle.destroy();
          }
        };
        app.ticker.add(tick);
      }
    }
  };

  return {
    app,
    destroy: () => {
      try {
        if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
        app.destroy(true, { children: true });
      } catch {
        // ignore
      }
    },
    bigWin,
    coinShower,
  };
}
