/**
 * Live-casino thumbnail registry.
 * Maps each live game slug (from public.games) to its bundled image.
 */
import LIGHTNING_ROULETTE from '@/assets/live/lightning-roulette.jpg';
import CRAZY_TIME from '@/assets/live/crazy-time.jpg';
import MONOPOLY from '@/assets/live/monopoly.jpg';
import BLACKJACK_VIP from '@/assets/live/blackjack-vip.jpg';
import BACCARAT from '@/assets/live/baccarat.jpg';
import DREAM_CATCHER from '@/assets/live/dream-catcher.jpg';
import MEGA_BALL from '@/assets/live/mega-ball.jpg';
import DEAL_NO_DEAL from '@/assets/live/deal-no-deal.jpg';

export const LIVE_THUMBNAILS: Record<string, string> = {
  'live-lightning-roulette': LIGHTNING_ROULETTE,
  'live-crazy-time': CRAZY_TIME,
  'live-monopoly': MONOPOLY,
  'live-blackjack-vip': BLACKJACK_VIP,
  'live-baccarat': BACCARAT,
  'live-dream-catcher': DREAM_CATCHER,
  'live-mega-ball': MEGA_BALL,
  'live-deal-no-deal': DEAL_NO_DEAL,
};

export function getLiveThumbnail(slug: string): string | null {
  return LIVE_THUMBNAILS[slug] ?? null;
}
