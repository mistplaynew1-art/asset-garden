// Game thumbnail resolver — uses Vite's import.meta.glob to eagerly import
// all thumbnail assets and maps them by slug.

const PLACEHOLDER = '/placeholder.svg';

// Eagerly import every thumbnail as a URL string
const slotThumbs = import.meta.glob('/src/assets/slots/thumbnails/*.{jpg,png,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const originalThumbs = import.meta.glob('/src/assets/games/*.{jpg,png,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const liveThumbs = import.meta.glob('/src/assets/live/*.{jpg,png,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

function byBasename(map: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [path, url] of Object.entries(map)) {
    const base = path.split('/').pop()!.replace(/\.(jpg|png|webp)$/, '');
    out[base] = url;
  }
  return out;
}

const SLOT_MAP = byBasename(slotThumbs);
const ORIGINAL_MAP = byBasename(originalThumbs);
const LIVE_MAP = byBasename(liveThumbs);

// Slug aliases — DB slug -> thumbnail filename
const SLOT_ALIASES: Record<string, string> = {
  'gates-of-olympus': 'gates-olympus',
  'gates-olympus': 'gates-olympus',
  'sweet-bonanza': 'sweet-bonanza',
  'big-bass-bonanza': 'big-bass',
  'big-bass': 'big-bass',
  'book-of-dead': 'book-dead',
  'madame-destiny': 'madame-destiny-megaways',
};

export function getGameThumbnail(
  slug: string,
  category?: string,
  fallback?: string | null,
): string {
  if (fallback && fallback.length > 0 && /^https?:\/\//.test(fallback)) return fallback;

  const cat = (category || '').toLowerCase();

  // Slots
  if (cat === 'slots' || cat === 'slot') {
    const key = SLOT_ALIASES[slug] ?? slug;
    if (SLOT_MAP[key]) return SLOT_MAP[key];
    if (SLOT_MAP[slug]) return SLOT_MAP[slug];
    return SLOT_MAP['classic'] ?? PLACEHOLDER;
  }

  // Live casino — strip "live-" prefix to match filenames
  if (cat === 'live' || cat === 'live-casino') {
    const key = slug.startsWith('live-') ? slug.slice(5) : slug;
    if (LIVE_MAP[key]) return LIVE_MAP[key];
    if (LIVE_MAP[slug]) return LIVE_MAP[slug];
    return PLACEHOLDER;
  }

  // Originals / table games
  if (ORIGINAL_MAP[slug]) return ORIGINAL_MAP[slug];
  if (SLOT_MAP[slug]) return SLOT_MAP[slug];
  return ORIGINAL_MAP['slot-default'] ?? PLACEHOLDER;
}
