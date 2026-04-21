/**
 * Game-Specific Sound Profiles
 * Each game has unique, immersive sound effects
 */

// ============= SOUND PROFILES BY GAME =============

export const gameSoundProfiles = {
  // CRASH GAME - Airplane/Aviation theme
  crash: {
    tick: { type: 'sine', freq: 800, duration: 0.05, decay: 0.02 },
    liftoff: { type: 'sawtooth', freq: 200, endFreq: 600, duration: 0.8, swell: true },
    milestone: { type: 'sine', freq: [523, 659, 784], duration: 0.15, arpeggio: true },
    cashout: { type: 'sine', freq: [784, 988, 1175], duration: 0.2, arpeggio: true },
    crash: { type: 'sawtooth', freq: 400, endFreq: 50, duration: 0.5, noise: true },
    ambient: { type: 'wind', volume: 0.1 },
  },

  // JETPACK GAME - Space/Sci-Fi theme
  jetpack: {
    tick: { type: 'square', freq: 1200, duration: 0.03, decay: 0.01 },
    liftoff: { type: 'sawtooth', freq: 100, endFreq: 800, duration: 1.2, swell: true },
    milestone: { type: 'sine', freq: [440, 554, 659, 880], duration: 0.1, arpeggio: true },
    cashout: { type: 'sine', freq: [880, 1100, 1320], duration: 0.25, arpeggio: true },
    crash: { type: 'noise', freq: 0, duration: 0.8, explosion: true },
    ambient: { type: 'engine', volume: 0.08 },
  },

  // DICE GAME - Casino dice theme
  dice: {
    roll: { type: 'noise', duration: 0.4, rattle: true },
    land: { type: 'sine', freq: 300, duration: 0.1, thud: true },
    win: { type: 'sine', freq: [523, 659, 784, 1047], duration: 0.12, arpeggio: true },
    lose: { type: 'sawtooth', freq: 200, duration: 0.3, decay: 0.15 },
    shake: { type: 'noise', duration: 0.15, rattle: true },
  },

  // MINES GAME - Minefield theme
  mines: {
    reveal: { type: 'sine', freq: 600, duration: 0.08 },
    gem: { type: 'sine', freq: [880, 1100, 1320], duration: 0.1, sparkle: true },
    mine: { type: 'noise', duration: 0.6, explosion: true },
    cashout: { type: 'sine', freq: [659, 784, 988, 1175], duration: 0.15, arpeggio: true },
    tension: { type: 'sine', freq: 100, duration: 2, swell: true, volume: 0.1 },
  },

  // PLINKO GAME - Ball drop theme
  plinko: {
    drop: { type: 'sine', freq: 400, duration: 0.1 },
    peg: { type: 'sine', freq: 800, duration: 0.03 },
    bounce: { type: 'sine', freq: 500, duration: 0.05 },
    land: { type: 'sine', freq: [400, 500, 600], duration: 0.2, arpeggio: true },
    win: { type: 'sine', freq: [784, 988, 1175, 1397], duration: 0.15, arpeggio: true },
  },

  // LIMBO GAME - Target multiplier theme
  limbo: {
    spin: { type: 'sawtooth', freq: 200, endFreq: 800, duration: 0.5 },
    stop: { type: 'sine', freq: 600, duration: 0.1 },
    win: { type: 'sine', freq: [659, 784, 988], duration: 0.15, arpeggio: true },
    lose: { type: 'sawtooth', freq: 300, endFreq: 100, duration: 0.3 },
    tick: { type: 'square', freq: 1000, duration: 0.02 },
  },

  // TOWER GAME - Climbing theme
  tower: {
    step: { type: 'sine', freq: 440, duration: 0.08 },
    climb: { type: 'sine', freq: [440, 494, 523, 587], duration: 0.1, arpeggio: true },
    fall: { type: 'sawtooth', freq: 400, endFreq: 100, duration: 0.5 },
    win: { type: 'sine', freq: [523, 659, 784, 1047], duration: 0.12, arpeggio: true },
    tension: { type: 'sine', freq: 150, duration: 1, swell: true, volume: 0.1 },
  },

  // WHEEL GAME - Spinning wheel theme
  wheel: {
    spin: { type: 'sawtooth', freq: 150, duration: 3, wobble: true },
    tick: { type: 'sine', freq: 1000, duration: 0.02 },
    slow: { type: 'sine', freq: 300, duration: 0.5, swell: true },
    stop: { type: 'sine', freq: 500, duration: 0.2 },
    win: { type: 'sine', freq: [784, 988, 1175, 1397, 1568], duration: 0.12, arpeggio: true },
    lose: { type: 'sawtooth', freq: 200, duration: 0.4 },
  },

  // HILO GAME - Card flip theme
  hilo: {
    flip: { type: 'sine', freq: 300, duration: 0.15 },
    reveal: { type: 'sine', freq: 500, duration: 0.1 },
    win: { type: 'sine', freq: [523, 659, 784], duration: 0.15, arpeggio: true },
    lose: { type: 'sawtooth', freq: 250, duration: 0.3 },
    cardPlace: { type: 'sine', freq: 200, duration: 0.05, thud: true },
  },

  // COINFLIP GAME - Coin theme
  coinflip: {
    flip: { type: 'sine', freq: [800, 1000, 800], duration: 0.5, wobble: true },
    land: { type: 'sine', freq: 600, duration: 0.1 },
    heads: { type: 'sine', freq: [784, 988, 1175], duration: 0.15, arpeggio: true },
    tails: { type: 'sine', freq: [392, 494, 587], duration: 0.15, arpeggio: true },
    win: { type: 'sine', freq: [1047, 1319, 1568], duration: 0.2, arpeggio: true },
  },

  // KENO GAME - Lottery ball theme
  keno: {
    roll: { type: 'noise', duration: 0.3, rattle: true },
    number: { type: 'sine', freq: 600, duration: 0.1 },
    match: { type: 'sine', freq: [880, 1100], duration: 0.1, sparkle: true },
    win: { type: 'sine', freq: [659, 784, 988, 1175, 1319], duration: 0.1, arpeggio: true },
    lose: { type: 'sawtooth', freq: 150, duration: 0.4 },
  },

  // DRAGON TIGER - Asian casino theme
  dragonTiger: {
    deal: { type: 'sine', freq: 300, duration: 0.1 },
    reveal: { type: 'sine', freq: 400, duration: 0.15 },
    dragon: { type: 'sawtooth', freq: [200, 300, 400], duration: 0.2, growl: true },
    tiger: { type: 'sine', freq: [400, 500, 600], duration: 0.2, roar: true },
    win: { type: 'sine', freq: [784, 988, 1175], duration: 0.15, arpeggio: true },
    tie: { type: 'sine', freq: [392, 494, 587], duration: 0.2 },
  },

  // BLACKJACK - Casino cards theme
  blackjack: {
    deal: { type: 'sine', freq: 300, duration: 0.08 },
    cardFlip: { type: 'sine', freq: 500, duration: 0.1 },
    hit: { type: 'sine', freq: 400, duration: 0.05 },
    stand: { type: 'sine', freq: 300, duration: 0.1 },
    bust: { type: 'sawtooth', freq: 300, endFreq: 100, duration: 0.3 },
    blackjack: { type: 'sine', freq: [784, 988, 1175, 1397], duration: 0.12, arpeggio: true },
    win: { type: 'sine', freq: [659, 784, 988], duration: 0.15, arpeggio: true },
    push: { type: 'sine', freq: 400, duration: 0.2 },
  },

  // ROULETTE - Casino wheel theme
  roulette: {
    spin: { type: 'sawtooth', freq: 100, duration: 4, wobble: true },
    ballDrop: { type: 'sine', freq: 800, duration: 0.1 },
    tick: { type: 'sine', freq: 1200, duration: 0.02 },
    land: { type: 'sine', freq: 400, duration: 0.2 },
    win: { type: 'sine', freq: [784, 988, 1175, 1397], duration: 0.12, arpeggio: true },
    lose: { type: 'sawtooth', freq: 200, duration: 0.4 },
  },

  // SLOTS - Various themes
  slots: {
    bonanza: {
      spin: { type: 'noise', duration: 1.5, rattle: true },
      stop: { type: 'sine', freq: 400, duration: 0.1 },
      win: { type: 'sine', freq: [659, 784, 988, 1175, 1319], duration: 0.1, arpeggio: true },
      bigWin: { type: 'sine', freq: [784, 988, 1175, 1397, 1568, 1760], duration: 0.08, arpeggio: true },
      gem: { type: 'sine', freq: 1200, duration: 0.05, sparkle: true },
      explosion: { type: 'noise', duration: 0.3, explosion: true },
    },
    bigBass: {
      spin: { type: 'sine', freq: 200, duration: 1.5, wobble: true },
      splash: { type: 'noise', duration: 0.3, water: true },
      catch: { type: 'sine', freq: [400, 500, 600], duration: 0.15, arpeggio: true },
      win: { type: 'sine', freq: [523, 659, 784, 988], duration: 0.12, arpeggio: true },
      fish: { type: 'sine', freq: 600, duration: 0.1, bubble: true },
    },
    olympus: {
      spin: { type: 'sawtooth', freq: 150, duration: 1.5, power: true },
      thunder: { type: 'noise', duration: 0.5, explosion: true },
      lightning: { type: 'sawtooth', freq: 800, duration: 0.1 },
      win: { type: 'sine', freq: [659, 784, 988, 1175, 1319], duration: 0.1, arpeggio: true },
      zeus: { type: 'sawtooth', freq: [200, 400, 600], duration: 0.3, growl: true },
    },
  },
};

// ============= SOUND GENERATOR =============

let audioContext: AudioContext | null = null;

const getAudioContext = (): AudioContext => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
};

interface SoundConfig {
  type: OscillatorType | 'noise';
  freq?: number | number[];
  endFreq?: number;
  duration: number;
  decay?: number;
  swell?: boolean;
  arpeggio?: boolean;
  volume?: number;
  wobble?: boolean;
  sparkle?: boolean;
  explosion?: boolean;
  rattle?: boolean;
  thud?: boolean;
  growl?: boolean;
  water?: boolean;
  bubble?: boolean;
  power?: boolean;
  noise?: boolean;
}

export function playGameSound(game: keyof typeof gameSoundProfiles, soundName: string): void {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') ctx.resume();

  const gameProfile = gameSoundProfiles[game];
  if (!gameProfile) return;

  const config = (gameProfile as any)[soundName] as SoundConfig | undefined;
  if (!config) return;

  const now = ctx.currentTime;
  const masterGain = ctx.createGain();
  masterGain.connect(ctx.destination);
  masterGain.gain.value = config.volume ?? 0.3;

  if (config.type === 'noise') {
    playNoiseSound(ctx, masterGain, config, now);
  } else if (config.arpeggio && Array.isArray(config.freq)) {
    playArpeggioSound(ctx, masterGain, config, now);
  } else {
    playToneSound(ctx, masterGain, config, now);
  }
}

function playToneSound(
  ctx: AudioContext,
  destination: AudioNode,
  config: SoundConfig,
  now: number
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = config.type as OscillatorType;
  osc.frequency.value = typeof config.freq === 'number' ? config.freq : 440;

  if (config.endFreq && typeof config.freq === 'number') {
    osc.frequency.setValueAtTime(config.freq, now);
    osc.frequency.exponentialRampToValueAtTime(config.endFreq, now + config.duration);
  }

  if (config.wobble && typeof config.freq === 'number') {
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 5;
    lfoGain.gain.value = config.freq * 0.1;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    lfo.start(now);
    lfo.stop(now + config.duration);
  }

  gain.gain.setValueAtTime(0.3, now);
  
  if (config.swell) {
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.3, now + config.duration * 0.3);
    gain.gain.linearRampToValueAtTime(0.3, now + config.duration * 0.7);
    gain.gain.linearRampToValueAtTime(0, now + config.duration);
  } else if (config.decay) {
    gain.gain.exponentialRampToValueAtTime(0.01, now + config.decay);
  } else {
    gain.gain.exponentialRampToValueAtTime(0.01, now + config.duration);
  }

  osc.connect(gain);
  gain.connect(destination);
  osc.start(now);
  osc.stop(now + config.duration + 0.1);
}

function playArpeggioSound(
  ctx: AudioContext,
  destination: AudioNode,
  config: SoundConfig,
  now: number
): void {
  const freqs = config.freq as number[];
  const noteDuration = config.duration / freqs.length;

  freqs.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = config.type as OscillatorType;
    osc.frequency.value = freq;

    const noteStart = now + i * noteDuration;
    gain.gain.setValueAtTime(0.3, noteStart);
    gain.gain.exponentialRampToValueAtTime(0.01, noteStart + noteDuration * 0.9);

    osc.connect(gain);
    gain.connect(destination);
    osc.start(noteStart);
    osc.stop(noteStart + noteDuration + 0.1);
  });
}

function playNoiseSound(
  ctx: AudioContext,
  destination: AudioNode,
  config: SoundConfig,
  now: number
): void {
  const bufferSize = ctx.sampleRate * config.duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = config.water ? 'lowpass' : config.explosion ? 'lowpass' : 'highpass';
  filter.frequency.value = config.explosion ? 500 : config.water ? 800 : 1000;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.3, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + config.duration);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(destination);
  source.start(now);
}

// ============= AMBIENT SOUND CONTROLLER =============

class AmbientSoundController {
  private activeNodes: Map<string, { stop: () => void }> = new Map();

  startAmbient(game: keyof typeof gameSoundProfiles): void {
    // Stop any existing ambient
    this.stopAmbient();

    const ctx = getAudioContext();
    if (ctx.state === 'suspended') ctx.resume();

    // Create ambient sound based on game
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = 60;
    gain.gain.value = 0.05;

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();

    this.activeNodes.set(game, {
      stop: () => {
        osc.stop();
        gain.disconnect();
      },
    });
  }

  stopAmbient(): void {
    this.activeNodes.forEach((node) => node.stop());
    this.activeNodes.clear();
  }
}

export const ambientController = new AmbientSoundController();

// ============= GAME SOUNDS OBJECT FOR DIRECT ACCESS =============
// This provides a convenient interface for games to access their sound profiles

export const gameSounds = {
  crash: {
    name: 'Crash',
    sounds: {
      tick: (ctx: AudioContext) => playGameSoundWithContext(ctx, 'crash', 'tick'),
      liftoff: (ctx: AudioContext) => playGameSoundWithContext(ctx, 'crash', 'liftoff'),
      milestone: (ctx: AudioContext) => playGameSoundWithContext(ctx, 'crash', 'milestone'),
      cashout: (ctx: AudioContext) => playGameSoundWithContext(ctx, 'crash', 'cashout'),
      crash: (ctx: AudioContext) => playGameSoundWithContext(ctx, 'crash', 'crash'),
    },
  },
  jetpack: {
    name: 'Jetpack',
    sounds: {
      tick: (ctx: AudioContext) => playGameSoundWithContext(ctx, 'jetpack', 'tick'),
      liftoff: (ctx: AudioContext) => playGameSoundWithContext(ctx, 'jetpack', 'liftoff'),
      milestone: (ctx: AudioContext) => playGameSoundWithContext(ctx, 'jetpack', 'milestone'),
      cashout: (ctx: AudioContext) => playGameSoundWithContext(ctx, 'jetpack', 'cashout'),
      crash: (ctx: AudioContext) => playGameSoundWithContext(ctx, 'jetpack', 'crash'),
    },
  },
  dice: {
    name: 'Dice',
    sounds: {
      roll: (ctx: AudioContext) => playGameSoundWithContext(ctx, 'dice', 'roll'),
      land: (ctx: AudioContext) => playGameSoundWithContext(ctx, 'dice', 'land'),
      win: (ctx: AudioContext) => playGameSoundWithContext(ctx, 'dice', 'win'),
      lose: (ctx: AudioContext) => playGameSoundWithContext(ctx, 'dice', 'lose'),
      tick: (ctx: AudioContext) => playGameSoundWithContext(ctx, 'dice', 'shake'),
    },
  },
  mines: {
    name: 'Mines',
    sounds: {
      reveal: (ctx: AudioContext) => playGameSoundWithContext(ctx, 'mines', 'reveal'),
      boom: (ctx: AudioContext) => playGameSoundWithContext(ctx, 'mines', 'mine'),
      cashout: (ctx: AudioContext) => playGameSoundWithContext(ctx, 'mines', 'cashout'),
      tick: (ctx: AudioContext) => playGameSoundWithContext(ctx, 'mines', 'reveal'),
    },
  },
  plinko: {
    name: 'Plinko',
    sounds: {
      drop: (ctx: AudioContext) => playGameSoundWithContext(ctx, 'plinko', 'drop'),
      bounce: (ctx: AudioContext) => playGameSoundWithContext(ctx, 'plinko', 'peg'),
      land: (ctx: AudioContext) => playGameSoundWithContext(ctx, 'plinko', 'land'),
      win: (ctx: AudioContext) => playGameSoundWithContext(ctx, 'plinko', 'win'),
      lose: (ctx: AudioContext) => playGameSoundWithContext(ctx, 'plinko', 'land'),
    },
  },
  limbo: {
    name: 'Limbo',
    sounds: {
      spin: (ctx: AudioContext) => playGameSoundWithContext(ctx, 'limbo', 'spin'),
      stop: (ctx: AudioContext) => playGameSoundWithContext(ctx, 'limbo', 'stop'),
      win: (ctx: AudioContext) => playGameSoundWithContext(ctx, 'limbo', 'win'),
      lose: (ctx: AudioContext) => playGameSoundWithContext(ctx, 'limbo', 'lose'),
      tick: (ctx: AudioContext) => playGameSoundWithContext(ctx, 'limbo', 'tick'),
    },
  },
  tower: {
    name: 'Tower',
    sounds: {
      step: (ctx: AudioContext) => playGameSoundWithContext(ctx, 'tower', 'step'),
      climb: (ctx: AudioContext) => playGameSoundWithContext(ctx, 'tower', 'climb'),
      fall: (ctx: AudioContext) => playGameSoundWithContext(ctx, 'tower', 'fall'),
      win: (ctx: AudioContext) => playGameSoundWithContext(ctx, 'tower', 'win'),
      boom: (ctx: AudioContext) => playGameSoundWithContext(ctx, 'tower', 'fall'),
    },
  },
  wheel: {
    name: 'Wheel',
    sounds: {
      spin: (ctx: AudioContext) => playGameSoundWithContext(ctx, 'wheel', 'spin'),
      tick: (ctx: AudioContext) => playGameSoundWithContext(ctx, 'wheel', 'tick'),
      win: (ctx: AudioContext) => playGameSoundWithContext(ctx, 'wheel', 'win'),
      lose: (ctx: AudioContext) => playGameSoundWithContext(ctx, 'wheel', 'lose'),
    },
  },
  hilo: {
    name: 'Hilo',
    sounds: {
      flip: (ctx: AudioContext) => playGameSoundWithContext(ctx, 'hilo', 'flip'),
      reveal: (ctx: AudioContext) => playGameSoundWithContext(ctx, 'hilo', 'reveal'),
      win: (ctx: AudioContext) => playGameSoundWithContext(ctx, 'hilo', 'win'),
      lose: (ctx: AudioContext) => playGameSoundWithContext(ctx, 'hilo', 'lose'),
    },
  },
  coinflip: {
    name: 'Coinflip',
    sounds: {
      flip: (ctx: AudioContext) => playGameSoundWithContext(ctx, 'coinflip', 'flip'),
      land: (ctx: AudioContext) => playGameSoundWithContext(ctx, 'coinflip', 'land'),
      win: (ctx: AudioContext) => playGameSoundWithContext(ctx, 'coinflip', 'win'),
      lose: (ctx: AudioContext) => playGameSoundWithContext(ctx, 'coinflip', 'heads'),
    },
  },
  keno: {
    name: 'Keno',
    sounds: {
      roll: (ctx: AudioContext) => playGameSoundWithContext(ctx, 'keno', 'roll'),
      number: (ctx: AudioContext) => playGameSoundWithContext(ctx, 'keno', 'number'),
      win: (ctx: AudioContext) => playGameSoundWithContext(ctx, 'keno', 'win'),
      lose: (ctx: AudioContext) => playGameSoundWithContext(ctx, 'keno', 'lose'),
    },
  },
  dragonTiger: {
    name: 'Dragon Tiger',
    sounds: {
      deal: (ctx: AudioContext) => playGameSoundWithContext(ctx, 'dragonTiger', 'deal'),
      reveal: (ctx: AudioContext) => playGameSoundWithContext(ctx, 'dragonTiger', 'reveal'),
      win: (ctx: AudioContext) => playGameSoundWithContext(ctx, 'dragonTiger', 'win'),
      lose: (ctx: AudioContext) => playGameSoundWithContext(ctx, 'dragonTiger', 'tie'),
    },
  },
  blackjack: {
    name: 'Blackjack',
    sounds: {
      deal: (ctx: AudioContext) => playGameSoundWithContext(ctx, 'blackjack', 'deal'),
      hit: (ctx: AudioContext) => playGameSoundWithContext(ctx, 'blackjack', 'hit'),
      stand: (ctx: AudioContext) => playGameSoundWithContext(ctx, 'blackjack', 'stand'),
      bust: (ctx: AudioContext) => playGameSoundWithContext(ctx, 'blackjack', 'bust'),
      win: (ctx: AudioContext) => playGameSoundWithContext(ctx, 'blackjack', 'win'),
      blackjack: (ctx: AudioContext) => playGameSoundWithContext(ctx, 'blackjack', 'blackjack'),
    },
  },
  roulette: {
    name: 'Roulette',
    sounds: {
      spin: (ctx: AudioContext) => playGameSoundWithContext(ctx, 'roulette', 'spin'),
      tick: (ctx: AudioContext) => playGameSoundWithContext(ctx, 'roulette', 'tick'),
      land: (ctx: AudioContext) => playGameSoundWithContext(ctx, 'roulette', 'land'),
      win: (ctx: AudioContext) => playGameSoundWithContext(ctx, 'roulette', 'win'),
      lose: (ctx: AudioContext) => playGameSoundWithContext(ctx, 'roulette', 'lose'),
    },
  },
  slots: {
    name: 'Slots',
    sounds: {
      spin: (ctx: AudioContext) => playGameSoundWithContext(ctx, 'slots', 'bonanza.spin'),
      stop: (ctx: AudioContext) => playGameSoundWithContext(ctx, 'slots', 'bonanza.stop'),
      win: (ctx: AudioContext) => playGameSoundWithContext(ctx, 'slots', 'bonanza.win'),
      jackpot: (ctx: AudioContext) => playGameSoundWithContext(ctx, 'slots', 'bonanza.bigWin'),
    },
  },
};

// Helper function to play sounds with a provided context
function playGameSoundWithContext(ctx: AudioContext, game: string, soundName: string): void {
  if (ctx.state === 'suspended') ctx.resume();
  
  const [gameKey, soundKey] = soundName.includes('.') ? soundName.split('.') : [game, soundName];
  const gameProfile = (gameSoundProfiles as any)[gameKey === 'slots' ? 'slots' : gameKey];
  if (!gameProfile) return;
  
  const config = gameKey === 'slots' && soundKey ? (gameProfile as any)[soundKey] : (gameProfile as any)[soundKey || soundName];
  if (!config) return;

  const now = ctx.currentTime;
  const masterGain = ctx.createGain();
  masterGain.connect(ctx.destination);
  masterGain.gain.value = config.volume ?? 0.3;

  if (config.type === 'noise') {
    playNoiseSound(ctx, masterGain, config, now);
  } else if (config.arpeggio && Array.isArray(config.freq)) {
    playArpeggioSound(ctx, masterGain, config, now);
  } else {
    playToneSound(ctx, masterGain, config, now);
  }
}