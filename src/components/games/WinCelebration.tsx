import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { haptic } from '@/lib/haptics';
import { getMultiplierColor } from '@/lib/animations';

interface WinCelebrationProps {
  show: boolean;
  amount: number;
  currency?: string;
  multiplier?: number;
  big?: boolean;
}

const COLORS = [
  'var(--neon-gold-hex)',
  'var(--neon-green-hex)',
  'var(--neon-blue-hex)',
  'var(--neon-purple-hex)',
  'var(--neon-red-hex)',
];

export default function WinCelebration({ show, amount, currency = 'USD', multiplier, big }: WinCelebrationProps) {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; color: string }>>([]);

  useEffect(() => {
    if (!show) return;
    if (big || (multiplier && multiplier >= 50)) haptic('jackpot');
    else if (multiplier && multiplier >= 10) haptic('win-big');
    else haptic('win-small');

    if (big) {
      const count = (multiplier ?? 0) >= 25 ? 48 : 24;
      const next = Array.from({ length: count }, (_, i) => ({
        id: i,
        x: 50 + (Math.random() - 0.5) * 80,
        y: 50,
        color: COLORS[i % COLORS.length],
      }));
      setParticles(next);
      const t = setTimeout(() => setParticles([]), 1800);
      return () => clearTimeout(t);
    }
  }, [show, big, multiplier]);

  // GODMODE multiplier color tiers (rainbow at >=25x)
  const multColor = multiplier !== undefined ? getMultiplierColor(multiplier) : 'var(--mult-tier-1)';
  const isRainbow = multColor === 'rainbow';

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 pointer-events-none flex items-center justify-center z-20"
          aria-live="polite"
        >
          {big && particles.map(p => (
            <span
              key={p.id}
              className="absolute w-2 h-2 rounded-sm animate-confetti"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                background: p.color,
                boxShadow: `0 0 8px ${p.color}`,
                animationDelay: `${p.id * 0.025}s`,
              }}
            />
          ))}
          <motion.div
            initial={{ scale: 0.4, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: 'spring', damping: 10, stiffness: 200 }}
            className={`text-center pointer-events-none ${big ? 'animate-win-pop' : ''}`}
          >
            {multiplier !== undefined && (
              <div
                className={`font-display font-extrabold neon-text ${big ? 'text-6xl' : 'text-4xl'} ${isRainbow ? 'text-rainbow' : ''}`}
                data-numeric
                style={
                  isRainbow
                    ? undefined
                    : { color: multColor, textShadow: `0 0 18px ${multColor}, 0 0 40px ${multColor}` }
                }
              >
                {multiplier.toFixed(2)}×
              </div>
            )}
            <div
              className={`font-display font-extrabold neon-text ${big ? 'text-3xl mt-2' : 'text-xl'}`}
              data-numeric
              style={{ color: 'var(--neon-green-hex)' }}
            >
              +{amount.toFixed(2)} {currency}
            </div>
            {big && (
              <div
                className="text-xs font-extrabold uppercase tracking-[0.3em] mt-1"
                style={{ color: 'var(--neon-gold-hex)' }}
              >
                {(multiplier ?? 0) >= 25 ? 'MEGA WIN!' : 'BIG WIN!'}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
