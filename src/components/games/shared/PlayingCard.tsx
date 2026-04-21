/**
 * Shared casino-quality playing card. Used by HiLo, Blackjack, Dragon-Tiger.
 * Renders a 3D flip-in via Framer Motion + crisp SVG suit glyphs.
 */
import { memo } from 'react';
import { motion } from 'framer-motion';

export const CARD_FACES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const;

export interface CardSuit {
  symbol: string;
  isRed: boolean;
  name: 'spades' | 'hearts' | 'diamonds' | 'clubs';
}

export const SUITS: CardSuit[] = [
  { symbol: '♠', isRed: false, name: 'spades' },
  { symbol: '♥', isRed: true, name: 'hearts' },
  { symbol: '♦', isRed: true, name: 'diamonds' },
  { symbol: '♣', isRed: false, name: 'clubs' },
];

interface PlayingCardProps {
  rank: string;
  suit: CardSuit;
  isWinner?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const SIZES = {
  sm: { w: 'w-16', h: 'h-24', corner: 'text-sm', center: 'text-3xl' },
  md: { w: 'w-24', h: 'h-36', corner: 'text-base', center: 'text-4xl' },
  lg: { w: 'w-28', h: 'h-40', corner: 'text-lg', center: 'text-5xl' },
};

export const PlayingCard = memo(function PlayingCard({
  rank, suit, isWinner, size = 'lg',
}: PlayingCardProps) {
  const color = suit.isRed ? '#dc2626' : '#0f172a';
  const s = SIZES[size];
  return (
    <motion.div
      initial={{ rotateY: 90, opacity: 0 }}
      animate={{ rotateY: 0, opacity: 1 }}
      exit={{ rotateY: -90, opacity: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={`relative ${s.w} ${s.h} rounded-xl flex items-center justify-center select-none ${
        isWinner ? 'ring-2 ring-neon-gold shadow-[0_0_30px_hsl(var(--neon-gold)/0.4)]' : ''
      }`}
      style={{
        background: 'linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%)',
        boxShadow: '0 10px 24px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(15,23,42,0.15)',
        transformStyle: 'preserve-3d',
      }}
    >
      <div className="absolute top-1.5 left-2 leading-none text-left" style={{ color }}>
        <div className={`${s.corner} font-extrabold font-mono`}>{rank}</div>
        <div className={s.corner}>{suit.symbol}</div>
      </div>
      <div className="absolute bottom-1.5 right-2 leading-none text-right rotate-180" style={{ color }}>
        <div className={`${s.corner} font-extrabold font-mono`}>{rank}</div>
        <div className={s.corner}>{suit.symbol}</div>
      </div>
      <div className={s.center} style={{ color, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' }}>
        {suit.symbol}
      </div>
    </motion.div>
  );
});

export const CardBack = memo(function CardBack({ size = 'lg' }: { size?: 'sm' | 'md' | 'lg' }) {
  const s = SIZES[size];
  return (
    <div
      className={`${s.w} ${s.h} rounded-xl flex items-center justify-center`}
      style={{
        background:
          'repeating-linear-gradient(45deg, hsl(var(--primary) / 0.3), hsl(var(--primary) / 0.3) 4px, hsl(var(--neon-purple) / 0.3) 4px, hsl(var(--neon-purple) / 0.3) 8px)',
        boxShadow: '0 10px 24px rgba(0,0,0,0.4), inset 0 0 0 2px hsl(var(--primary) / 0.5)',
      }}
    >
      <div className="w-12 h-12 rounded-full bg-void flex items-center justify-center font-display font-extrabold text-xl text-primary border-2 border-primary/40">
        ?
      </div>
    </div>
  );
});
