// Per-game procedural sound engine using Web Audio API.
// Each game gets its own signature sound profile — no shared sounds.
// Syncs with app-store for soundEnabled/musicEnabled toggles.

import { useAppStore } from '@/stores/app-store';

let ctx: AudioContext | null = null;
function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    try { ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)(); }
    catch { return null; }
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

interface ToneOpts {
  type?: OscillatorType;
  freq: number;
  endFreq?: number;
  duration: number;
  gain?: number;
  delay?: number;
  attack?: number;
}

function tone(opts: ToneOpts) {
  const c = getCtx();
  if (!c) return;
  const t0 = c.currentTime + (opts.delay ?? 0);
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = opts.type ?? 'sine';
  osc.frequency.setValueAtTime(opts.freq, t0);
  if (opts.endFreq) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.endFreq), t0 + opts.duration);
  }
  const peak = opts.gain ?? 0.2;
  const attack = opts.attack ?? 0.01;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.duration);
  osc.connect(g);
  g.connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + opts.duration + 0.05);
}

function noise(duration: number, gain = 0.15, delay = 0, filterFreq = 2000) {
  const c = getCtx();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const buffer = c.createBuffer(1, c.sampleRate * duration, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = filterFreq;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  src.connect(filter); filter.connect(g); g.connect(c.destination);
  src.start(t0);
  src.stop(t0 + duration + 0.05);
}

// Reel stop sound with pitch variant per reel
function reelStop(semitones: number) {
  const base = 220 * Math.pow(2, semitones / 12);
  noise(0.03, 0.12, 0, 3500);
  tone({ type: 'square', freq: base, endFreq: base * 1.2, duration: 0.07, gain: 0.1 });
}

// ====== Generic UI sounds ======
const ui = {
  click: () => tone({ type: 'square', freq: 800, duration: 0.04, gain: 0.08 }),
  bet: () => { tone({ type: 'sine', freq: 440, endFreq: 660, duration: 0.12, gain: 0.18 }); },
  error: () => { tone({ type: 'sawtooth', freq: 220, endFreq: 110, duration: 0.25, gain: 0.18 }); },
  notification: () => tone({ type: 'sine', freq: 800, endFreq: 1000, duration: 0.18, gain: 0.18 }),
};

// ====== Per-game signature sounds ======
type GameSoundKey =
  | 'dice.roll' | 'dice.win' | 'dice.lose'
  | 'crash.tick' | 'crash.cashout' | 'crash.boom'
  | 'mines.reveal' | 'mines.boom' | 'mines.cashout'
  | 'plinko.drop' | 'plinko.bounce' | 'plinko.land'
  | 'wheel.tick' | 'wheel.win' | 'wheel.lose'
  | 'limbo.spin' | 'limbo.win' | 'limbo.lose'
  | 'coinflip.flip' | 'coinflip.win' | 'coinflip.lose'
  | 'hilo.flip' | 'hilo.win' | 'hilo.lose'
  | 'keno.draw' | 'keno.hit' | 'keno.win'
  | 'tower.step' | 'tower.boom' | 'tower.cashout'
  | 'blackjack.deal' | 'blackjack.win' | 'blackjack.lose' | 'blackjack.bust'
  | 'roulette.spin' | 'roulette.land' | 'roulette.win' | 'roulette.lose'
  | 'dragon.flip' | 'dragon.win' | 'dragon.lose'
  | 'slot.spin' | 'slot.stop' | 'slot.win' | 'slot.jackpot'
  // New slot sounds
  | 'slot.reel-stop-1' | 'slot.reel-stop-2' | 'slot.reel-stop-3' | 'slot.reel-stop-4' | 'slot.reel-stop-5'
  | 'slot.scatter' | 'slot.bonus-enter' | 'slot.free-spin' | 'slot.cascade'
  | 'slot.zeus-lightning' | 'slot.fish-reel' | 'slot.fish-catch'
  // Win tier sounds
  | 'win.big' | 'win.mega' | 'win.epic' | 'win.jackpot'
  | 'win' | 'lose' | 'jackpot';

const games: Record<GameSoundKey, () => void> = {
  // Dice — sharp click + descending tone
  'dice.roll': () => { noise(0.05, 0.1, 0, 4000); tone({ type: 'square', freq: 1200, endFreq: 600, duration: 0.08, gain: 0.1, delay: 0.03 }); },
  'dice.win': () => { tone({ type: 'sine', freq: 660, duration: 0.12, gain: 0.2 }); tone({ type: 'sine', freq: 990, duration: 0.18, gain: 0.2, delay: 0.08 }); },
  'dice.lose': () => tone({ type: 'triangle', freq: 300, endFreq: 150, duration: 0.3, gain: 0.18 }),

  // Crash — rising hum + cashout chirp + explosion
  'crash.tick': () => tone({ type: 'square', freq: 1800, duration: 0.02, gain: 0.04 }),
  'crash.cashout': () => { tone({ type: 'sine', freq: 880, endFreq: 1760, duration: 0.2, gain: 0.25 }); tone({ type: 'sine', freq: 1320, duration: 0.15, gain: 0.18, delay: 0.1 }); },
  'crash.boom': () => { noise(0.5, 0.3, 0, 800); tone({ type: 'sawtooth', freq: 200, endFreq: 40, duration: 0.5, gain: 0.2 }); },

  // Mines — soft pluck reveal, sharp explosion
  'mines.reveal': () => tone({ type: 'sine', freq: 880, endFreq: 1100, duration: 0.1, gain: 0.15 }),
  'mines.boom': () => { noise(0.4, 0.35, 0, 600); tone({ type: 'sawtooth', freq: 120, endFreq: 30, duration: 0.4, gain: 0.25 }); },
  'mines.cashout': () => { tone({ type: 'sine', freq: 523, duration: 0.1, gain: 0.18 }); tone({ type: 'sine', freq: 659, duration: 0.1, gain: 0.18, delay: 0.08 }); tone({ type: 'sine', freq: 784, duration: 0.18, gain: 0.2, delay: 0.16 }); },

  // Plinko — wood-like bounce
  'plinko.drop': () => tone({ type: 'sine', freq: 200, endFreq: 400, duration: 0.08, gain: 0.12 }),
  'plinko.bounce': () => { noise(0.02, 0.08, 0, 6000); tone({ type: 'square', freq: 1500 + Math.random() * 800, duration: 0.03, gain: 0.06 }); },
  'plinko.land': () => tone({ type: 'sine', freq: 660, endFreq: 990, duration: 0.2, gain: 0.18 }),

  // Wheel — mechanical ticks + cheer/jeer
  'wheel.tick': () => { noise(0.015, 0.06, 0, 8000); },
  'wheel.win': () => { [523, 659, 784, 1046].forEach((f, i) => tone({ type: 'sine', freq: f, duration: 0.15, gain: 0.18, delay: i * 0.07 })); },
  'wheel.lose': () => tone({ type: 'sawtooth', freq: 280, endFreq: 140, duration: 0.4, gain: 0.18 }),

  // Limbo — whoosh up + verdict
  'limbo.spin': () => tone({ type: 'sawtooth', freq: 100, endFreq: 1200, duration: 0.6, gain: 0.12 }),
  'limbo.win': () => { tone({ type: 'sine', freq: 1046, duration: 0.12, gain: 0.2 }); tone({ type: 'sine', freq: 1568, duration: 0.18, gain: 0.2, delay: 0.1 }); },
  'limbo.lose': () => tone({ type: 'triangle', freq: 200, endFreq: 80, duration: 0.4, gain: 0.18 }),

  // Coinflip — metallic ringing
  'coinflip.flip': () => { tone({ type: 'sine', freq: 1200, duration: 0.4, gain: 0.12 }); tone({ type: 'sine', freq: 1800, duration: 0.4, gain: 0.08, delay: 0.05 }); },
  'coinflip.win': () => { tone({ type: 'sine', freq: 880, duration: 0.1, gain: 0.18 }); tone({ type: 'sine', freq: 1320, duration: 0.18, gain: 0.2, delay: 0.08 }); },
  'coinflip.lose': () => tone({ type: 'triangle', freq: 250, endFreq: 120, duration: 0.3, gain: 0.18 }),

  // HiLo — paper card flip
  'hilo.flip': () => { noise(0.08, 0.12, 0, 3000); tone({ type: 'square', freq: 600, endFreq: 800, duration: 0.05, gain: 0.06, delay: 0.04 }); },
  'hilo.win': () => { tone({ type: 'sine', freq: 660, duration: 0.1, gain: 0.18 }); tone({ type: 'sine', freq: 880, duration: 0.16, gain: 0.2, delay: 0.08 }); },
  'hilo.lose': () => tone({ type: 'triangle', freq: 280, endFreq: 140, duration: 0.3, gain: 0.18 }),

  // Keno — bingo ball draws
  'keno.draw': () => { tone({ type: 'sine', freq: 600 + Math.random() * 400, duration: 0.1, gain: 0.15 }); noise(0.03, 0.06, 0.05, 5000); },
  'keno.hit': () => { tone({ type: 'sine', freq: 1320, duration: 0.08, gain: 0.18 }); tone({ type: 'sine', freq: 1760, duration: 0.1, gain: 0.15, delay: 0.05 }); },
  'keno.win': () => { [659, 784, 1046, 1318].forEach((f, i) => tone({ type: 'sine', freq: f, duration: 0.15, gain: 0.2, delay: i * 0.08 })); },

  // Tower — footstep + alarm + chime
  'tower.step': () => tone({ type: 'square', freq: 440, endFreq: 660, duration: 0.08, gain: 0.14 }),
  'tower.boom': () => { noise(0.3, 0.3, 0, 800); tone({ type: 'sawtooth', freq: 150, endFreq: 50, duration: 0.35, gain: 0.2 }); },
  'tower.cashout': () => { tone({ type: 'sine', freq: 784, duration: 0.12, gain: 0.18 }); tone({ type: 'sine', freq: 1046, duration: 0.18, gain: 0.2, delay: 0.1 }); },

  // Blackjack — soft card swipe + verdict
  'blackjack.deal': () => { noise(0.06, 0.1, 0, 2500); tone({ type: 'sine', freq: 500, duration: 0.04, gain: 0.06, delay: 0.04 }); },
  'blackjack.win': () => { tone({ type: 'sine', freq: 587, duration: 0.12, gain: 0.18 }); tone({ type: 'sine', freq: 880, duration: 0.18, gain: 0.2, delay: 0.1 }); },
  'blackjack.lose': () => tone({ type: 'triangle', freq: 280, endFreq: 130, duration: 0.35, gain: 0.18 }),
  'blackjack.bust': () => { noise(0.15, 0.18, 0, 1200); tone({ type: 'sawtooth', freq: 200, endFreq: 80, duration: 0.3, gain: 0.18 }); },

  // Roulette — ball bouncing on wheel
  'roulette.spin': () => tone({ type: 'sawtooth', freq: 80, endFreq: 200, duration: 1.2, gain: 0.08 }),
  'roulette.land': () => { for (let i = 0; i < 6; i++) tone({ type: 'square', freq: 600 + Math.random() * 400, duration: 0.04, gain: 0.08, delay: i * 0.06 }); },
  'roulette.win': () => { [659, 880, 1318].forEach((f, i) => tone({ type: 'sine', freq: f, duration: 0.18, gain: 0.2, delay: i * 0.1 })); },
  'roulette.lose': () => tone({ type: 'triangle', freq: 250, endFreq: 110, duration: 0.4, gain: 0.18 }),

  // Dragon Tiger — gong-like flip
  'dragon.flip': () => { tone({ type: 'sine', freq: 200, endFreq: 400, duration: 0.3, gain: 0.18 }); tone({ type: 'sine', freq: 600, duration: 0.4, gain: 0.1, delay: 0.05 }); },
  'dragon.win': () => { tone({ type: 'sawtooth', freq: 440, duration: 0.15, gain: 0.18 }); tone({ type: 'sine', freq: 880, duration: 0.2, gain: 0.2, delay: 0.1 }); },
  'dragon.lose': () => tone({ type: 'triangle', freq: 220, endFreq: 90, duration: 0.4, gain: 0.18 }),

  // Slot — classic mechanical reels
  'slot.spin': () => { for (let i = 0; i < 8; i++) tone({ type: 'square', freq: 300 + i * 40, duration: 0.05, gain: 0.06, delay: i * 0.05 }); },
  'slot.stop': () => { noise(0.04, 0.1, 0, 3000); tone({ type: 'square', freq: 400, duration: 0.06, gain: 0.08 }); },
  'slot.win': () => { [659, 784, 988, 1318].forEach((f, i) => tone({ type: 'sine', freq: f, duration: 0.15, gain: 0.2, delay: i * 0.08 })); },
  'slot.jackpot': () => { [523, 659, 784, 1046, 1318, 1568, 2093].forEach((f, i) => tone({ type: 'sine', freq: f, duration: 0.2, gain: 0.22, delay: i * 0.1 })); },

  // Slot reel stop variants (each reel has slightly different pitch)
  'slot.reel-stop-1': () => reelStop(0),   // base pitch
  'slot.reel-stop-2': () => reelStop(1),   // +1 semitone
  'slot.reel-stop-3': () => reelStop(2),   // +2 semitones
  'slot.reel-stop-4': () => reelStop(3),   // +3 semitones
  'slot.reel-stop-5': () => reelStop(4),   // +4 semitones

  // Scatter burst — 3 ascending chimes
  'slot.scatter': () => {
    [880, 1100, 1320].forEach((f, i) =>
      tone({ type: 'sine', freq: f, duration: 0.18, gain: 0.22, delay: i * 0.1 })
    );
  },

  // Bonus entrance — dramatic ascending fanfare
  'slot.bonus-enter': () => {
    [523, 659, 784, 1046, 1318].forEach((f, i) =>
      tone({ type: 'sine', freq: f, duration: 0.22, gain: 0.24, delay: i * 0.12 })
    );
    noise(0.5, 0.08, 0.2, 4000);
  },

  // Free spin awarded tick
  'slot.free-spin': () => {
    tone({ type: 'sine', freq: 1100, endFreq: 1400, duration: 0.15, gain: 0.2 });
    tone({ type: 'sine', freq: 1600, duration: 0.1, gain: 0.15, delay: 0.12 });
  },

  // Cascade — satisfying crunch + rising tone
  'slot.cascade': () => {
    noise(0.06, 0.15, 0, 5000);
    tone({ type: 'square', freq: 600, endFreq: 900, duration: 0.12, gain: 0.12, delay: 0.04 });
  },

  // Big win tiers — each escalating
  'win.big': () => {
    [659, 784, 988, 1318].forEach((f, i) =>
      tone({ type: 'sine', freq: f, duration: 0.18, gain: 0.22, delay: i * 0.09 })
    );
  },
  'win.mega': () => {
    [523, 659, 784, 988, 1318, 1568].forEach((f, i) =>
      tone({ type: 'sine', freq: f, duration: 0.22, gain: 0.26, delay: i * 0.08 })
    );
    noise(0.3, 0.1, 0.3, 6000);
  },
  'win.epic': () => {
    [392, 523, 659, 784, 988, 1318, 1568, 1976].forEach((f, i) =>
      tone({ type: 'sine', freq: f, duration: 0.28, gain: 0.28, delay: i * 0.075 })
    );
    noise(0.5, 0.14, 0.4, 8000);
  },
  'win.jackpot': () => {
    // Full orchestral-style fanfare with noise burst
    [261, 330, 392, 523, 659, 784, 1046, 1318, 1568, 2093].forEach((f, i) =>
      tone({ type: 'sine', freq: f, duration: 0.35, gain: 0.3, delay: i * 0.08 })
    );
    noise(0.8, 0.2, 0.5, 10000);
    tone({ type: 'sawtooth', freq: 80, endFreq: 200, duration: 1.2, gain: 0.1, delay: 0.3 });
  },

  // Zeus lightning — sharp electric zap
  'slot.zeus-lightning': () => {
    noise(0.12, 0.3, 0, 12000);
    tone({ type: 'sawtooth', freq: 2000, endFreq: 200, duration: 0.15, gain: 0.25 });
  },

  // Fishing reel (BigBass) — whirring reel sound
  'slot.fish-reel': () => {
    for (let i = 0; i < 5; i++)
      tone({ type: 'square', freq: 400 + i * 80, duration: 0.06, gain: 0.06, delay: i * 0.05 });
  },
  'slot.fish-catch': () => {
    tone({ type: 'sine', freq: 880, endFreq: 1320, duration: 0.2, gain: 0.22 });
    noise(0.08, 0.1, 0.1, 3000);
  },

  // Generic fallbacks
  win: () => tone({ type: 'sine', freq: 660, endFreq: 990, duration: 0.3, gain: 0.2 }),
  lose: () => tone({ type: 'triangle', freq: 250, endFreq: 110, duration: 0.35, gain: 0.18 }),
  jackpot: () => { [523, 659, 784, 1046, 1318].forEach((f, i) => tone({ type: 'sine', freq: f, duration: 0.2, gain: 0.22, delay: i * 0.1 })); },
};

// Legacy aliases for components that still use generic names
const legacy: Record<string, () => void> = {
  click: ui.click,
  bet: ui.bet,
  error: ui.error,
  notification: ui.notification,
  spin: games['slot.spin'],
  flip: games['coinflip.flip'],
  card: games['blackjack.deal'],
  crash: games['crash.boom'],
  cashout: games['crash.cashout'],
  coin: games['coinflip.flip'],
  win: games.win,
  lose: games.lose,
  jackpot: games.jackpot,
};

// Namespaced helper used by the crash/aviator game family.
// Exposes `crash.tick()`, `crash.crash()`, `crash.cashout()`.
export const crash = {
  tick: () => playSound('click'),
  crash: () => playSound('crash'),
  cashout: () => playSound('cashout'),
};
export const bust = () => playSound('crash');

// Sync with app-store
export function setSoundEnabled(v: boolean) {
  // This function is kept for backwards compatibility
  // The actual sound state is now read from useAppStore
}

export function playSound(key: GameSoundKey | keyof typeof legacy) {
  // Check app-store for soundEnabled
  const soundEnabled = useAppStore.getState()?.soundEnabled ?? true;
  if (!soundEnabled) return;
  const fn = (games as Record<string, () => void>)[key] ?? legacy[key];
  fn?.();
}

// ====== Background music (synced with app-store musicEnabled) ======
let musicCtx: AudioContext | null = null;
let musicSource: AudioBufferSourceNode | null = null;
let musicGain: GainNode | null = null;
let musicPlaying = false;

export function startBackgroundMusic() {
  // Check app-store for musicEnabled
  const musicEnabled = useAppStore.getState()?.musicEnabled ?? false;
  if (musicPlaying || !musicEnabled) return;
  try {
    musicCtx = new AudioContext();
    musicGain = musicCtx.createGain();
    musicGain.gain.setValueAtTime(0.08, musicCtx.currentTime);
    musicGain.connect(musicCtx.destination);
    const sr = musicCtx.sampleRate;
    const buf = musicCtx.createBuffer(2, sr * 8, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        d[i] = (Math.sin(2 * Math.PI * 55 * t) * 0.05 + Math.sin(2 * Math.PI * 82.5 * t) * 0.03) * Math.min(t / 2, 1, (8 - t) / 2);
      }
    }
    musicSource = musicCtx.createBufferSource();
    musicSource.buffer = buf;
    musicSource.loop = true;
    musicSource.connect(musicGain);
    musicSource.start();
    musicPlaying = true;
  } catch {}
}

export function stopBackgroundMusic() {
  try { musicSource?.stop(); musicCtx?.close(); } catch {}
  musicPlaying = false;
  musicCtx = null; musicSource = null; musicGain = null;
}

export function isMusicPlaying() {
  return musicPlaying;
}