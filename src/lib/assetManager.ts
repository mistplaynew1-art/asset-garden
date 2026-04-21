/**
 * Asset Manager — wraps the central registry from `@/lib/assets` and
 * provides a runtime cache + lazy/preload helpers.
 *
 * All URLs come from real ES imports (or `/public` paths), so Vite bundles
 * and fingerprints them. No more hardcoded `/assets/...` paths that 404.
 */

import { lazyLoadImage, batchLoadAssets, lazyLoadGLTF } from './optimization';
import {
  MODEL_JETPACK,
  MODEL_PLANE,
  MODEL_SPACESHIP,
  BG_OLYMPUS,
  BG_BONANZA,
  BG_BIGBASS,
  BG_BUFFALO_KING,
  BG_SUGAR_RUSH,
  BG_BOOK_DEAD,
  BG_WILD_WEST_GOLD,
  BG_STARBURST,
  BG_AZTEC_KING,
  BG_FRUIT_PARTY,
  BG_GONZO_QUEST,
  BG_HOT_FIESTA,
  BG_DOG_HOUSE,
  BG_MONEY_TRAIN,
  BG_REACTOONZ,
  SUGAR_RUSH_SYMBOLS,
  SLOT_BACKGROUNDS,
} from './assets';
import React from 'react';

// ============= ASSET REGISTRY =============
export interface AssetDefinition {
  type: 'image' | 'model' | 'audio' | 'texture';
  url: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
  preload?: boolean;
  fallback?: string;
}

const def = (
  type: AssetDefinition['type'],
  url: string,
  category: string,
  priority: AssetDefinition['priority'] = 'low',
): AssetDefinition => ({ type, url, category, priority, preload: false });

export const ASSET_REGISTRY: Record<string, AssetDefinition> = {
  // 3D MODELS
  'model.jetpack':   def('model', MODEL_JETPACK,   'jetpack', 'medium'),
  'model.spaceship': def('model', MODEL_SPACESHIP, 'aviator'),
  'model.plane':     def('model', MODEL_PLANE,     'aviator'),

  // SLOT BACKGROUNDS
  'bg.olympus':        def('image', BG_OLYMPUS,        'slots'),
  'bg.bonanza':        def('image', BG_BONANZA,        'slots'),
  'bg.bigbass':        def('image', BG_BIGBASS,        'slots'),
  'bg.buffalo-king':   def('image', BG_BUFFALO_KING,   'slots'),
  'bg.sugar-rush':     def('image', BG_SUGAR_RUSH,     'slots'),
  'bg.book-dead':      def('image', BG_BOOK_DEAD,      'slots'),
  'bg.wild-west-gold': def('image', BG_WILD_WEST_GOLD, 'slots'),
  'bg.starburst':      def('image', BG_STARBURST,      'slots'),
  'bg.aztec-king':     def('image', BG_AZTEC_KING,     'slots'),
  'bg.fruit-party':    def('image', BG_FRUIT_PARTY,    'slots'),
  'bg.gonzo-quest':    def('image', BG_GONZO_QUEST,    'slots'),
  'bg.hot-fiesta':     def('image', BG_HOT_FIESTA,     'slots'),
  'bg.dog-house':      def('image', BG_DOG_HOUSE,      'slots'),
  'bg.money-train':    def('image', BG_MONEY_TRAIN,    'slots'),
  'bg.reactoonz':      def('image', BG_REACTOONZ,      'slots'),

  // SUGAR RUSH SYMBOLS
  ...Object.fromEntries(
    Object.entries(SUGAR_RUSH_SYMBOLS).map(([k, url]) => [
      `symbol.${k}`,
      def('image', url, 'symbols'),
    ]),
  ),
};

// ============= ASSET MANAGER CLASS =============
class AssetManager {
  private loadedAssets = new Map<string, any>();
  private loadingPromises = new Map<string, Promise<any>>();
  private preloadedCategories = new Set<string>();

  async loadAsset(key: string): Promise<any> {
    const definition = ASSET_REGISTRY[key];
    if (!definition) {
      console.warn(`Asset not found: ${key}`);
      return null;
    }
    if (this.loadedAssets.has(key)) return this.loadedAssets.get(key);
    if (this.loadingPromises.has(key)) return this.loadingPromises.get(key);

    const loadingPromise = this.loadAssetByType(key, definition);
    this.loadingPromises.set(key, loadingPromise);
    try {
      const asset = await loadingPromise;
      this.loadedAssets.set(key, asset);
      return asset;
    } catch (error) {
      console.error(`Failed to load asset: ${key}`, error);
      if (definition.fallback) return this.loadAsset(definition.fallback);
      return null;
    } finally {
      this.loadingPromises.delete(key);
    }
  }

  private async loadAssetByType(key: string, d: AssetDefinition): Promise<any> {
    switch (d.type) {
      case 'image':
        return lazyLoadImage(d.url, { priority: d.priority as 'high' | 'low' });
      case 'model':
        return lazyLoadGLTF(d.url, { priority: d.priority as 'high' | 'low' });
      default:
        throw new Error(`Unknown asset type: ${d.type}`);
    }
  }

  async preloadCategory(category: string): Promise<void> {
    if (this.preloadedCategories.has(category)) return;
    const items = Object.entries(ASSET_REGISTRY)
      .filter(([_, d]) => d.category === category)
      .map(([key, d]) => ({ key, loader: () => this.loadAssetByType(key, d) }));
    await batchLoadAssets(items, { concurrent: 3, priority: 'low' });
    this.preloadedCategories.add(category);
  }

  async preloadHighPriority(): Promise<void> {
    const items = Object.entries(ASSET_REGISTRY)
      .filter(([_, d]) => d.priority === 'high' || d.preload)
      .map(([key, d]) => ({ key, loader: () => this.loadAssetByType(key, d) }));
    await batchLoadAssets(items, { concurrent: 2, priority: 'high' });
  }

  getAsset<T = any>(key: string): T | null {
    return this.loadedAssets.get(key) ?? null;
  }
  isLoaded(key: string): boolean {
    return this.loadedAssets.has(key);
  }
  unloadCategory(category: string): void {
    Object.entries(ASSET_REGISTRY).forEach(([key, d]) => {
      if (d.category === category) this.loadedAssets.delete(key);
    });
    this.preloadedCategories.delete(category);
  }
  getLoadedCount(): number {
    return this.loadedAssets.size;
  }
  clearAll(): void {
    this.loadedAssets.clear();
    this.loadingPromises.clear();
    this.preloadedCategories.clear();
  }
}

export const assetManager = new AssetManager();

// ============= REACT HOOKS =============
export function useAsset(key: string): { data: any; loading: boolean; error: Error | null } {
  const [state, setState] = React.useState<{ data: any; loading: boolean; error: Error | null }>({
    data: null, loading: true, error: null,
  });

  React.useEffect(() => {
    let mounted = true;
    assetManager.loadAsset(key)
      .then(asset => mounted && setState({ data: asset, loading: false, error: null }))
      .catch(err => mounted && setState({ data: null, loading: false, error: err as Error }));
    return () => { mounted = false; };
  }, [key]);

  return state;
}

export function useAssetPreload(category: string): { loaded: boolean; progress: number } {
  const [state, setState] = React.useState({ loaded: false, progress: 0 });

  React.useEffect(() => {
    let mounted = true;
    const items = Object.entries(ASSET_REGISTRY).filter(([_, d]) => d.category === category);
    const total = items.length || 1;
    let loaded = 0;

    Promise.all(
      items.map(async ([key]) => {
        await assetManager.loadAsset(key);
        if (mounted) {
          loaded++;
          setState({ loaded: false, progress: loaded / total });
        }
      }),
    ).then(() => { if (mounted) setState({ loaded: true, progress: 1 }); });

    return () => { mounted = false; };
  }, [category]);

  return state;
}

export function useLazyImage(key: string, fallback?: string): string {
  const assetDef = ASSET_REGISTRY[key];
  return assetDef?.url ?? fallback ?? '';
}

// ============= SLOT HELPERS =============
export function getSlotBackgroundUrl(gameId: string): string | null {
  return SLOT_BACKGROUNDS[gameId] ?? null;
}

export function getSlotSymbolUrls(gameId: string): Record<string, string> {
  if (gameId === 'sugar-rush') return { ...SUGAR_RUSH_SYMBOLS };
  return {};
}
