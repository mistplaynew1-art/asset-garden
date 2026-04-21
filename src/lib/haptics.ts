/**
 * Professional Haptic Feedback System
 * Comprehensive vibration patterns for immersive mobile gaming
 * Gracefully degrades on unsupported devices
 */

const HAS_VIBRATE = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

let enabled = true;
try {
  enabled = (typeof localStorage !== 'undefined' && localStorage.getItem('hapticsEnabled') !== 'false');
} catch { /* ignore */ }

export function setHapticsEnabled(v: boolean) {
  enabled = v;
  try { localStorage.setItem('hapticsEnabled', String(v)); } catch { /* ignore */ }
}

export function isHapticsEnabled() { return enabled; }

// Comprehensive pattern catalog for casino gaming
export type HapticPattern =
  // Basic interactions
  | 'tap'           // Light tap feedback
  | 'select'        // Selection confirmation
  | 'toggle'        // Toggle switch
  | 'press'         // Button press
  | 'release'       // Button release
  // Game actions
  | 'spin'          // Slot spin start
  | 'reel-stop'     // Individual reel stop
  | 'card-deal'     // Card dealing
  | 'card-flip'     // Card flip
  | 'dice-roll'     // Dice rolling
  | 'coin-flip'     // Coin flip
  | 'wheel-tick'    // Wheel segment tick
  | 'wheel-land'    // Wheel landing
  | 'peg-hit'       // Plinko peg hit
  | 'ball-drop'     // Ball drop
  // Win celebrations
  | 'win-tiny'      // Small win
  | 'win-small'     // Minor win
  | 'win-medium'    // Moderate win
  | 'win-big'       // Big win
  | 'win-huge'      // Huge win
  | 'jackpot'       // Jackpot/Grand win
  // Game events
  | 'multiplier'    // Multiplier hit
  | 'bonus-trigger' // Bonus feature triggered
  | 'free-spin'     // Free spin awarded
  | 'scatter'       // Scatter symbol
  | 'cascade'       // Cascade/tumble
  | 'explosion'     // Symbol explosion
  // Negative
  | 'lose'          // Loss
  | 'error'         // Error state
  | 'bust'          // Crash game bust
  // Metronome
  | 'tick'          // Light tick
  | 'tock'          // Strong tick
  | 'pulse'         // Heartbeat pulse
  // Alert types
  | 'notification'  // Notification
  | 'warning'       // Warning alert
  | 'success';      // Success confirmation

const PATTERNS: Record<HapticPattern, number | number[]> = {
  // Basic interactions - subtle and quick
  tap: 10,
  select: 15,
  toggle: [12, 8, 12],
  press: 8,
  release: 5,

  // Game actions - rhythmic and engaging
  spin: [20, 15, 25, 15, 30],
  'reel-stop': 18,
  'card-deal': [8, 5, 8],
  'card-flip': [15, 10, 15],
  'dice-roll': [10, 8, 10, 8, 10],
  'coin-flip': [20, 30, 20],
  'wheel-tick': 6,
  'wheel-land': [25, 40, 25],
  'peg-hit': 8,
  'ball-drop': 12,

  // Win celebrations - escalating intensity
  'win-tiny': [15, 10, 15],
  'win-small': [25, 20, 25],
  'win-medium': [30, 25, 30, 25, 35],
  'win-big': [40, 30, 40, 30, 50, 30, 60],
  'win-huge': [50, 40, 50, 40, 60, 40, 70, 40, 80],
  jackpot: [80, 50, 80, 50, 100, 50, 120, 60, 150],

  // Game events - distinctive patterns
  multiplier: [25, 15, 35, 15, 45],
  'bonus-trigger': [40, 30, 40, 60, 40, 30, 40],
  'free-spin': [35, 25, 35, 25, 50],
  scatter: [30, 20, 40, 20, 50],
  cascade: [15, 10, 20, 10, 25],
  explosion: [20, 10, 30, 15, 40],

  // Negative - soft and short
  lose: 25,
  error: [50, 30, 50],
  bust: [30, 20, 50, 30, 80],

  // Metronome - timing patterns
  tick: 6,
  tock: 10,
  pulse: [20, 40, 20],

  // Alert types
  notification: [20, 40, 20],
  warning: [40, 20, 40, 20, 40],
  success: [15, 10, 25],
};

/**
 * Trigger a haptic feedback pattern
 * @param pattern - Named pattern to play
 */
export function haptic(pattern: HapticPattern) {
  if (!enabled || !HAS_VIBRATE) return;
  try { 
    navigator.vibrate(PATTERNS[pattern]); 
  } catch { /* ignore */ }
}

/**
 * Trigger a custom haptic pattern
 * @param pattern - Custom vibration pattern (ms durations)
 */
export function hapticCustom(pattern: number | number[]) {
  if (!enabled || !HAS_VIBRATE) return;
  try { 
    navigator.vibrate(pattern); 
  } catch { /* ignore */ }
}

/**
 * Stop any ongoing vibration
 */
export function hapticStop() {
  if (!HAS_VIBRATE) return;
  try { 
    navigator.vibrate(0); 
  } catch { /* ignore */ }
}

/**
 * Play a sequence of haptic patterns with delays
 */
export async function hapticSequence(
  patterns: Array<{ pattern: HapticPattern; delay?: number }>
) {
  for (const { pattern, delay = 0 } of patterns) {
    if (delay > 0) {
      await new Promise(r => setTimeout(r, delay));
    }
    haptic(pattern);
    // Wait for pattern to complete (rough estimate)
    const p = PATTERNS[pattern];
    const duration = Array.isArray(p) ? p.reduce((a, b) => a + b, 0) : p;
    await new Promise(r => setTimeout(r, duration + 20));
  }
}

// Convenience object for game-specific haptic groups
export const playHaptic = {
  // Slot games
  slot: {
    spin: () => haptic('spin'),
    reelStop: (index: number) => {
      // Staggered stops feel more natural
      setTimeout(() => haptic('reel-stop'), index * 50);
    },
    win: (tier: 'tiny' | 'small' | 'medium' | 'big' | 'huge' | 'jackpot') => {
      if (tier === 'jackpot') haptic('jackpot');
      else haptic(`win-${tier}` as HapticPattern);
    },
    cascade: () => haptic('cascade'),
    multiplier: () => haptic('multiplier'),
    scatter: () => haptic('scatter'),
    freeSpin: () => haptic('free-spin'),
  },

  // Crash games
  crash: {
    launch: () => haptic('spin'),
    tick: () => haptic('tick'),
    cashout: () => haptic('win-medium'),
    bust: () => haptic('bust'),
  },

  // Card games
  cards: {
    deal: () => haptic('card-deal'),
    flip: () => haptic('card-flip'),
    win: () => haptic('win-small'),
    lose: () => haptic('lose'),
  },

  // Dice games
  dice: {
    roll: () => haptic('dice-roll'),
    win: () => haptic('win-small'),
    lose: () => haptic('lose'),
  },

  // Wheel games
  wheel: {
    tick: () => haptic('wheel-tick'),
    land: () => haptic('wheel-land'),
    win: (tier: 'small' | 'medium' | 'big') => haptic(`win-${tier}`),
  },

  // Plinko
  plinko: {
    pegHit: () => haptic('peg-hit'),
    bucket: (multiplier: number) => {
      if (multiplier >= 10) haptic('win-big');
      else if (multiplier >= 5) haptic('win-medium');
      else if (multiplier >= 2) haptic('win-small');
      else haptic('win-tiny');
    },
  },

  // Mines
  mines: {
    reveal: () => haptic('tap'),
    gem: () => haptic('win-tiny'),
    mine: () => haptic('bust'),
    cashout: () => haptic('win-medium'),
  },

  // General
  ui: {
    tap: () => haptic('tap'),
    select: () => haptic('select'),
    toggle: () => haptic('toggle'),
    success: () => haptic('success'),
    error: () => haptic('error'),
    notification: () => haptic('notification'),
  },
};