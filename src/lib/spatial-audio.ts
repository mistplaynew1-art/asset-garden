/**
 * Spatial Audio System - 3D positioned audio for Three.js games
 * Integrates with Three.js AudioListener for immersive sound
 */
import * as THREE from 'three';

// Audio listener singleton
let audioListener: THREE.AudioListener | null = null;
let audioLoader: THREE.AudioLoader | null = null;

/**
 * Initialize the spatial audio system
 * Call this once with your main camera
 */
export const initSpatialAudio = (camera: THREE.Camera): THREE.AudioListener => {
  if (!audioListener) {
    audioListener = new THREE.AudioListener();
    camera.add(audioListener);
    audioLoader = new THREE.AudioLoader();
  }
  return audioListener;
};

/**
 * Get the audio listener
 */
export const getAudioListener = (): THREE.AudioListener | null => {
  return audioListener;
};

/**
 * Create a positional audio source
 */
export const createPositionalSound = (
  url: string,
  options: {
    refDistance?: number;
    maxDistance?: number;
    rolloffFactor?: number;
    loop?: boolean;
    volume?: number;
    autoplay?: boolean;
  } = {}
): Promise<THREE.PositionalAudio> => {
  return new Promise((resolve, reject) => {
    if (!audioListener || !audioLoader) {
      reject(new Error('Spatial audio not initialized'));
      return;
    }

    const sound = new THREE.PositionalAudio(audioListener);
    
    audioLoader.load(
      url,
      (buffer) => {
        sound.setBuffer(buffer);
        sound.setRefDistance(options.refDistance ?? 1);
        sound.setMaxDistance(options.maxDistance ?? 20);
        sound.setRolloffFactor(options.rolloffFactor ?? 1);
        sound.setLoop(options.loop ?? false);
        sound.setVolume(options.volume ?? 1);
        
        if (options.autoplay) {
          sound.play();
        }
        
        resolve(sound);
      },
      undefined,
      reject
    );
  });
};

/**
 * Create a global audio source (not positioned)
 */
export const createGlobalSound = (
  url: string,
  options: {
    loop?: boolean;
    volume?: number;
    autoplay?: boolean;
  } = {}
): Promise<THREE.Audio> => {
  return new Promise((resolve, reject) => {
    if (!audioListener || !audioLoader) {
      reject(new Error('Spatial audio not initialized'));
      return;
    }

    const sound = new THREE.Audio(audioListener);
    
    audioLoader.load(
      url,
      (buffer) => {
        sound.setBuffer(buffer);
        sound.setLoop(options.loop ?? false);
        sound.setVolume(options.volume ?? 1);
        
        if (options.autoplay) {
          sound.play();
        }
        
        resolve(sound);
      },
      undefined,
      reject
    );
  });
};

/**
 * Synthesized sound effects for 3D games (no external files needed)
 */
export const createSynthSound = (
  type: 'engine' | 'wind' | 'explosion' | 'beep' | 'whoosh' | 'coin',
  options: {
    duration?: number;
    frequency?: number;
    volume?: number;
  } = {}
): { oscillator: OscillatorNode; gainNode: GainNode } | null => {
  if (!audioListener) return null;

  const context = audioListener.context;
  const oscillator = context.createOscillator();
  const gainNode = context.createGain();

  const duration = options.duration ?? 0.5;
  const frequency = options.frequency ?? 440;
  const volume = options.volume ?? 0.5;

  switch (type) {
    case 'engine':
      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(frequency * 0.5, context.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(
        frequency * 2,
        context.currentTime + duration
      );
      break;
    case 'wind':
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency * 0.8, context.currentTime);
      oscillator.frequency.setValueAtTime(frequency * 1.2, context.currentTime + duration * 0.5);
      oscillator.frequency.setValueAtTime(frequency * 0.8, context.currentTime + duration);
      break;
    case 'explosion':
      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(frequency * 2, context.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(20, context.currentTime + duration);
      break;
    case 'beep':
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, context.currentTime);
      break;
    case 'whoosh':
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(frequency * 0.5, context.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(frequency * 2, context.currentTime + duration * 0.5);
      oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.3, context.currentTime + duration);
      break;
    case 'coin':
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency * 2, context.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(frequency * 3, context.currentTime + duration * 0.1);
      oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.5, context.currentTime + duration);
      break;
  }

  gainNode.gain.setValueAtTime(volume, context.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);

  return { oscillator, gainNode };
};

/**
 * Play a synthesized sound effect
 */
export const playSynthSound = (
  type: 'engine' | 'wind' | 'explosion' | 'beep' | 'whoosh' | 'coin',
  options?: {
    duration?: number;
    frequency?: number;
    volume?: number;
  }
): void => {
  const synth = createSynthSound(type, options);
  if (!synth || !audioListener) return;

  const context = audioListener.context;
  synth.oscillator.connect(synth.gainNode);
  synth.gainNode.connect(context.destination);
  synth.oscillator.start(context.currentTime);
  synth.oscillator.stop(context.currentTime + (options?.duration ?? 0.5));
};

/**
 * Audio analyzer for visualizations
 */
export const createAudioAnalyzer = (
  sound: THREE.Audio | THREE.PositionalAudio
): AnalyserNode => {
  const context = audioListener?.context;
  if (!context) throw new Error('Audio not initialized');

  const analyzer = context.createAnalyser();
  analyzer.fftSize = 256;
  
  // Connect the sound to the analyzer
  if (sound.source) {
    sound.source.connect(analyzer);
  }

  return analyzer;
};

/**
 * Master volume control
 */
export const setMasterVolume = (volume: number): void => {
  if (audioListener) {
    audioListener.setMasterVolume(Math.max(0, Math.min(1, volume)));
  }
};

/**
 * Clean up spatial audio resources
 */
export const disposeSpatialAudio = (): void => {
  audioListener = null;
  audioLoader = null;
};