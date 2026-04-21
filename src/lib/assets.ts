/**
 * Centralized asset registry.
 *
 * Every bundled asset is imported as an ES module so Vite fingerprints and
 * serves it correctly. Public assets (3D models in `/public/models/`) are
 * referenced by their runtime URL.
 *
 * Usage:
 *   import { MODEL_JETPACK, BG_OLYMPUS } from '@/lib/assets';
 */

// ============= 3D MODELS (served from /public/models) =============
export const MODEL_JETPACK = '/models/jetpack_man3d.glb';
export const MODEL_PLANE = '/models/casino_plane3d.glb';
export const MODEL_SPACESHIP = '/models/casino_spaceship3d.glb';
export const MODEL_JETPACK_GLTF = '/models/JetpackModel.gltf';

// ============= SLOT BACKGROUNDS =============
import BG_OLYMPUS_SRC from '@/assets/slots/olympus/background.jpg';
import BG_BONANZA_SRC from '@/assets/slots/bonanza/background.jpg';
import BG_BIGBASS_SRC from '@/assets/slots/bigbass/background.jpg';
import BG_BUFFALO_KING_SRC from '@/assets/slots/buffalo-king/background.jpg';
import BG_SUGAR_RUSH_SRC from '@/assets/slots/sugar-rush/background.jpg';
import BG_BOOK_DEAD_SRC from '@/assets/slots/book-dead/background.jpg';
import BG_WILD_WEST_GOLD_SRC from '@/assets/slots/wild-west-gold/background.jpg';
import BG_STARBURST_SRC from '@/assets/slots/starburst/background.jpg';
import BG_AZTEC_KING_SRC from '@/assets/slots/aztec-king/background.jpg';
import BG_FRUIT_PARTY_SRC from '@/assets/slots/fruit-party/background.jpg';
import BG_GONZO_QUEST_SRC from '@/assets/slots/gonzo-quest/background.jpg';
import BG_HOT_FIESTA_SRC from '@/assets/slots/hot-fiesta/background.jpg';
import BG_DOG_HOUSE_SRC from '@/assets/slots/dog-house/background.jpg';
import BG_MONEY_TRAIN_SRC from '@/assets/slots/money-train/background.jpg';
import BG_REACTOONZ_SRC from '@/assets/slots/reactoonz/background.jpg';

export const BG_OLYMPUS = BG_OLYMPUS_SRC;
export const BG_BONANZA = BG_BONANZA_SRC;
export const BG_BIGBASS = BG_BIGBASS_SRC;
export const BG_BUFFALO_KING = BG_BUFFALO_KING_SRC;
export const BG_SUGAR_RUSH = BG_SUGAR_RUSH_SRC;
export const BG_BOOK_DEAD = BG_BOOK_DEAD_SRC;
export const BG_WILD_WEST_GOLD = BG_WILD_WEST_GOLD_SRC;
export const BG_STARBURST = BG_STARBURST_SRC;
export const BG_AZTEC_KING = BG_AZTEC_KING_SRC;
export const BG_FRUIT_PARTY = BG_FRUIT_PARTY_SRC;
export const BG_GONZO_QUEST = BG_GONZO_QUEST_SRC;
export const BG_HOT_FIESTA = BG_HOT_FIESTA_SRC;
export const BG_DOG_HOUSE = BG_DOG_HOUSE_SRC;
export const BG_MONEY_TRAIN = BG_MONEY_TRAIN_SRC;
export const BG_REACTOONZ = BG_REACTOONZ_SRC;

export const SLOT_BACKGROUNDS: Record<string, string> = {
  'olympus': BG_OLYMPUS,
  'gates-olympus': BG_OLYMPUS,
  'gates-of-olympus': BG_OLYMPUS,
  'bonanza': BG_BONANZA,
  'sweet-bonanza': BG_BONANZA,
  'bigbass': BG_BIGBASS,
  'big-bass': BG_BIGBASS,
  'big-bass-bonanza': BG_BIGBASS,
  'buffalo-king': BG_BUFFALO_KING,
  'sugar-rush': BG_SUGAR_RUSH,
  'book-dead': BG_BOOK_DEAD,
  'book-of-dead': BG_BOOK_DEAD,
  'wild-west-gold': BG_WILD_WEST_GOLD,
  'starburst': BG_STARBURST,
  'aztec-king': BG_AZTEC_KING,
  'fruit-party': BG_FRUIT_PARTY,
  'gonzo-quest': BG_GONZO_QUEST,
  'hot-fiesta': BG_HOT_FIESTA,
  'dog-house': BG_DOG_HOUSE,
  'money-train': BG_MONEY_TRAIN,
  'reactoonz': BG_REACTOONZ,
};

// ============= SUGAR RUSH SYMBOLS =============
import SYMBOL_GUMMY_SRC from '@/assets/slots/sugar-rush/gummy.png';
import SYMBOL_DONUT_SRC from '@/assets/slots/sugar-rush/donut.png';
import SYMBOL_CHOCOLATE_SRC from '@/assets/slots/sugar-rush/chocolate.png';
import SYMBOL_CAKE_SRC from '@/assets/slots/sugar-rush/cake.png';
import SYMBOL_ICECREAM_SRC from '@/assets/slots/sugar-rush/icecream.png';
import SYMBOL_SR_HEART_SRC from '@/assets/slots/sugar-rush/heart.png';
import SYMBOL_SR_STAR_SRC from '@/assets/slots/sugar-rush/star.png';
import SYMBOL_SR_WILD_SRC from '@/assets/slots/sugar-rush/wild.png';
import SYMBOL_LOLLIPOP_SRC from '@/assets/slots/sugar-rush/lollipop.png';

export const SUGAR_RUSH_SYMBOLS: Record<string, string> = {
  gummy: SYMBOL_GUMMY_SRC,
  donut: SYMBOL_DONUT_SRC,
  chocolate: SYMBOL_CHOCOLATE_SRC,
  cake: SYMBOL_CAKE_SRC,
  icecream: SYMBOL_ICECREAM_SRC,
  heart: SYMBOL_SR_HEART_SRC,
  star: SYMBOL_SR_STAR_SRC,
  wild: SYMBOL_SR_WILD_SRC,
  lollipop: SYMBOL_LOLLIPOP_SRC,
};

// ============= HELPERS =============
export function getSlotBackground(slug: string): string | null {
  return SLOT_BACKGROUNDS[slug] ?? null;
}
