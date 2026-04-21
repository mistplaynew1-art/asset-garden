/**
 * GODMODE v6 — animation constants.
 * Use these everywhere instead of ad-hoc spring/ease/duration values.
 */

export const SPRING = {
  snappy: { type: 'spring', stiffness: 400, damping: 30, mass: 0.8 },
  bouncy: { type: 'spring', stiffness: 200, damping: 15, mass: 1.0 },
  smooth: { type: 'spring', stiffness: 150, damping: 25, mass: 1.2 },
  molasses: { type: 'spring', stiffness: 80, damping: 20, mass: 1.5 },
} as const;

export const EASE = {
  out: [0.0, 0.0, 0.2, 1.0] as const,
  in: [0.4, 0.0, 1.0, 1.0] as const,
  inOut: [0.4, 0.0, 0.2, 1.0] as const,
  overshoot: [0.34, 1.56, 0.64, 1.0] as const,
  expo: [0.19, 1.0, 0.22, 1.0] as const,
} as const;

export const DURATION = {
  instant: 0.08,
  fast: 0.15,
  normal: 0.25,
  slow: 0.4,
  dramatic: 0.6,
  cinematic: 1.2,
} as const;

/**
 * Returns a CSS color value (or the literal 'rainbow' for ≥25× — caller should
 * apply a hue-rotate animation in that case).
 */
export function getMultiplierColor(m: number): string {
  if (m >= 25) return 'rainbow';
  if (m >= 10) return 'var(--mult-tier-4)';
  if (m >= 5) return 'var(--mult-tier-3)';
  if (m >= 2) return 'var(--mult-tier-2)';
  return 'var(--mult-tier-1)';
}
