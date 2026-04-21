/**
 * Auto-resolves PNG/JPG/WebP assets per theme using Vite glob imports.
 * Convention: src/assets/slots/{themeId}/{symbolId}.(png|jpg|webp)
 * If a matching file exists, the corresponding ThemeSymbol gets its
 * imageUrl auto-populated so the procedural paint() is overridden.
 *
 * THEME_FOLDER_ALIASES maps theme.id → asset folder name when they differ
 * (e.g. theme id "the-dog-house-megaways" but folder is "dog-house-megaways").
 */
const ASSETS = import.meta.glob(
  '/src/assets/slots/**/*.{png,jpg,jpeg,webp}',
  { eager: true, query: '?url', import: 'default' },
) as Record<string, string>;

// Build a quick lookup: themeId/symbolId -> url
const LOOKUP: Record<string, string> = {};
for (const [path, url] of Object.entries(ASSETS)) {
  // path looks like /src/assets/slots/buffalo-king/buffalo.png
  const m = path.match(/\/slots\/([^/]+)\/([^/]+)\.(png|jpg|jpeg|webp)$/i);
  if (!m) continue;
  const [, theme, name] = m;
  LOOKUP[`${theme}/${name}`] = url;
}

/** Map theme.id → actual asset folder name when they differ. */
const THEME_FOLDER_ALIASES: Record<string, string> = {
  'the-dog-house-megaways': 'dog-house-megaways',
  'madame-destiny-megaways': 'madame-destiny',
  'gates-olympus': 'olympus',
  'gates-of-olympus': 'olympus',
  'sweet-bonanza': 'bonanza',
  'big-bass': 'bigbass',
  'big-bass-bonanza': 'bigbass',
  'book-of-dead': 'book-dead',
};

/** Map symbolId → asset filename when they differ within a theme. */
const SYMBOL_ALIASES: Record<string, Record<string, string>> = {
  'wanted-dead': { 'sheriff-badge': 'sherrif-badge' },
  'aztec-king': { 'sun': 'sun-disc' },
  'lucky-lightning': { 'bolt': 'lightning' },
  'mental': { 'electroshock': 'lightning' },
};

/** Returns the asset URL for a given theme + symbol id, or undefined. */
export function getThemeSymbolAsset(themeId: string, symbolId: string): string | undefined {
  const folder = THEME_FOLDER_ALIASES[themeId] ?? themeId;
  const sym = SYMBOL_ALIASES[themeId]?.[symbolId] ?? symbolId;
  return LOOKUP[`${folder}/${sym}`];
}
