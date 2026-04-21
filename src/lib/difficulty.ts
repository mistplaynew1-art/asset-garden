/**
 * Difficulty system shared across all originals.
 * Each level adjusts risk vs. reward — bigger swings on higher tiers.
 */
export type Difficulty = 'easy' | 'medium' | 'hard' | 'extreme' | 'nightmare';

export interface DifficultyMeta {
  id: Difficulty;
  label: string;
  /** Multiplier scaler — applied to top payouts. */
  payoutScale: number;
  /** Win-chance scaler — lower = rarer wins, higher payouts. */
  chanceScale: number;
  /** Volatility tag for UI hint. */
  volatility: 'low' | 'med' | 'high' | 'extreme' | 'insane';
  color: string; // tailwind text color class
  ring: string;  // tailwind ring color class
  bg: string;    // tailwind bg color class
  emoji: string;
}

export const DIFFICULTIES: DifficultyMeta[] = [
  { id: 'easy',      label: 'Easy',      payoutScale: 0.6, chanceScale: 1.4, volatility: 'low',     color: 'text-neon-green', ring: 'ring-neon-green/60', bg: 'bg-neon-green/10', emoji: '🟢' },
  { id: 'medium',    label: 'Medium',    payoutScale: 1.0, chanceScale: 1.0, volatility: 'med',     color: 'text-neon-blue',  ring: 'ring-neon-blue/60',  bg: 'bg-neon-blue/10',  emoji: '🔵' },
  { id: 'hard',      label: 'Hard',      payoutScale: 1.6, chanceScale: 0.7, volatility: 'high',    color: 'text-neon-gold',  ring: 'ring-neon-gold/60',  bg: 'bg-neon-gold/10',  emoji: '🟡' },
  { id: 'extreme',   label: 'Extreme',   payoutScale: 2.5, chanceScale: 0.45, volatility: 'extreme', color: 'text-neon-red',   ring: 'ring-neon-red/60',   bg: 'bg-neon-red/10',   emoji: '🔴' },
  { id: 'nightmare', label: 'Nightmare', payoutScale: 4.0, chanceScale: 0.25, volatility: 'insane',  color: 'text-neon-purple',ring: 'ring-neon-purple/60',bg: 'bg-neon-purple/10',emoji: '💀' },
];

export const getDifficulty = (id: Difficulty): DifficultyMeta =>
  DIFFICULTIES.find(d => d.id === id) ?? DIFFICULTIES[1];
