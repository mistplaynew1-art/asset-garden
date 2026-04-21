/**
 * SlotFX — shared professional polish helpers used by every slot scene.
 *
 * These utilities are theme-agnostic and live above the per-scene logic so
 * the four slots feel cohesive and high-end:
 *   • screenShake()      — camera shake for big wins / scatter triggers
 *   • flashColor()       — full-screen color tint flash (white, gold, rainbow)
 *   • sparkleBurst()     — 12-particle gold sparkle at any (x, y)
 *   • coinTrail()        — particle trail attached to a moving sprite
 *   • drawCellLandFx()   — short pulsing ring at a cell when a high-tier symbol lands
 *   • runNumberCounter() — smooth count-up text, with overshoot bounce
 *
 * All helpers are non-blocking unless they return a Promise.
 */
import * as Phaser from 'phaser';

const SPARK_TEX_KEY = '__slotfx_spark__';
const COIN_TEX_KEY = '__slotfx_coin__';

function ensureSparkTexture(scene: Phaser.Scene) {
  if (scene.textures.exists(SPARK_TEX_KEY)) return;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(0xffffff, 1).fillCircle(6, 6, 6);
  g.fillStyle(0xffd34a, 1).fillCircle(6, 6, 4);
  g.generateTexture(SPARK_TEX_KEY, 12, 12);
  g.destroy();
}

function ensureCoinTexture(scene: Phaser.Scene) {
  if (scene.textures.exists(COIN_TEX_KEY)) return;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(0xffd34a, 1).fillCircle(7, 7, 7);
  g.fillStyle(0xfff066, 1).fillCircle(7, 7, 4.5);
  g.lineStyle(1, 0x7a4f00, 0.85).strokeCircle(7, 7, 7);
  g.generateTexture(COIN_TEX_KEY, 14, 14);
  g.destroy();
}

/** Camera shake — short, snappy. intensity 0..1. */
export function screenShake(scene: Phaser.Scene, durationMs = 220, intensity = 0.008) {
  scene.cameras.main.shake(durationMs, intensity, true);
}

/** Full-screen color flash overlay (front of everything). */
export function flashColor(
  scene: Phaser.Scene,
  color = 0xffffff,
  alpha = 0.6,
  durationMs = 320,
): Promise<void> {
  return new Promise(resolve => {
    const w = scene.scale.width;
    const h = scene.scale.height;
    const rect = scene.add.rectangle(w / 2, h / 2, w, h, color, alpha).setDepth(999);
    scene.tweens.add({
      targets: rect,
      alpha: 0,
      duration: durationMs,
      ease: 'Cubic.easeOut',
      onComplete: () => { rect.destroy(); resolve(); },
    });
  });
}

/** 12-particle gold sparkle burst. Use on big-win cell lands or scatter pops. */
export function sparkleBurst(
  scene: Phaser.Scene,
  x: number,
  y: number,
  opts: { count?: number; tint?: number | number[]; spread?: number; depth?: number } = {},
) {
  ensureSparkTexture(scene);
  const count = opts.count ?? 12;
  const tint = opts.tint ?? [0xffd34a, 0xfff066, 0xffffff];
  const spread = opts.spread ?? 60;
  const emitter = scene.add.particles(x, y, SPARK_TEX_KEY, {
    lifespan: 700,
    speed: { min: 80, max: 220 },
    scale: { start: 0.9, end: 0 },
    alpha: { start: 1, end: 0 },
    angle: { min: 0, max: 360 },
    quantity: count,
    tint: Array.isArray(tint) ? tint : [tint],
    blendMode: 'ADD',
    emitting: false,
  });
  emitter.setDepth(opts.depth ?? 80);
  emitter.explode(count, x, y);
  scene.time.delayedCall(800, () => emitter.destroy());
}

/** Coin trail attached behind a moving game object. Returns a stop() fn. */
export function attachCoinTrail(
  scene: Phaser.Scene,
  follow: Phaser.GameObjects.GameObject & { x: number; y: number },
  opts: { tint?: number; depth?: number } = {},
): () => void {
  ensureCoinTexture(scene);
  const emitter = scene.add.particles(0, 0, COIN_TEX_KEY, {
    lifespan: 480,
    speed: { min: 0, max: 12 },
    scale: { start: 0.7, end: 0 },
    alpha: { start: 0.9, end: 0 },
    quantity: 1,
    frequency: 24,
    tint: [opts.tint ?? 0xffd34a],
    blendMode: 'ADD',
  });
  emitter.setDepth(opts.depth ?? 70);
  emitter.startFollow(follow);
  return () => {
    emitter.stop();
    scene.time.delayedCall(500, () => emitter.destroy());
  };
}

/** Quick pulsing ring shown when a special symbol lands in its cell. */
export function landingRing(
  scene: Phaser.Scene,
  x: number,
  y: number,
  radius: number,
  color = 0xffd34a,
  durationMs = 360,
) {
  const ring = scene.add.graphics().setDepth(45);
  const obj = { r: radius * 0.4, a: 0.95 };
  scene.tweens.add({
    targets: obj,
    r: radius,
    a: 0,
    duration: durationMs,
    ease: 'Cubic.easeOut',
    onUpdate: () => {
      ring.clear();
      ring.lineStyle(3, color, obj.a).strokeCircle(x, y, obj.r);
    },
    onComplete: () => ring.destroy(),
  });
}

/** Smooth number tween onto any Phaser.GameObjects.Text. Fires onUpdate per tick. */
export function runNumberCounter(
  scene: Phaser.Scene,
  target: Phaser.GameObjects.Text,
  finalValue: number,
  options: { durationMs?: number; prefix?: string; decimals?: number; bounce?: boolean } = {},
): Promise<void> {
  const dur = options.durationMs ?? 900;
  const decimals = options.decimals ?? 2;
  const prefix = options.prefix ?? '';
  return new Promise(resolve => {
    const obj = { v: 0 };
    scene.tweens.add({
      targets: obj,
      v: finalValue,
      duration: dur,
      ease: 'Cubic.easeOut',
      onUpdate: () => target.setText(`${prefix}${obj.v.toFixed(decimals)}`),
      onComplete: () => {
        if (options.bounce !== false) {
          scene.tweens.add({
            targets: target,
            scale: { from: 1.35, to: 1 },
            duration: 260,
            ease: 'Back.easeOut',
            onComplete: () => resolve(),
          });
        } else {
          resolve();
        }
      },
    });
  });
}

/** Anticipation glow ramp on a specific reel column rectangle. */
export function pulseAnticipationGlow(
  scene: Phaser.Scene,
  glow: Phaser.GameObjects.Rectangle,
  durationMs = 800,
) {
  scene.tweens.add({
    targets: glow,
    fillAlpha: 0.25,
    strokeAlpha: 0.95,
    duration: durationMs / 4,
    yoyo: true,
    repeat: 3,
    ease: 'Sine.easeInOut',
    onComplete: () => {
      glow.fillAlpha = 0;
      glow.strokeAlpha = 0;
    },
  });
}

/** Quick scale-pop on any Container/Image (used for emphasis on landings). */
export function popScale(
  scene: Phaser.Scene,
  target: Phaser.GameObjects.GameObject,
  amount = 1.2,
  durationMs = 220,
) {
  scene.tweens.add({
    targets: target,
    scaleX: amount, scaleY: amount,
    duration: durationMs / 2,
    yoyo: true,
    ease: 'Sine.easeInOut',
  });
}
