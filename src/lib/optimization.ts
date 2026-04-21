/**
 * Advanced Optimization Utilities
 * Deep lazy loading, async helpers, and performance optimizations
 */
import React from 'react';
import * as THREE from 'three';

// ============= ASSET LOADING CACHE =============
interface AssetCache {
  [key: string]: {
    data: any;
    timestamp: number;
    loading: Promise<any> | null;
  };
}

const assetCache: AssetCache = {};
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

// ============= ASYNC ASSET LOADER =============
export async function loadAsset<T>(
  key: string,
  loader: () => Promise<T>,
  options?: {
    cache?: boolean;
    priority?: 'high' | 'low';
    timeout?: number;
  }
): Promise<T> {
  const { cache = true, priority = 'low', timeout = 10000 } = options || {};
  
  // Check cache first
  if (cache && assetCache[key]) {
    const cached = assetCache[key];
    const now = Date.now();
    
    // Return cached data if still valid
    if (now - cached.timestamp < CACHE_DURATION && cached.data) {
      return cached.data;
    }
    
    // Return existing loading promise
    if (cached.loading) {
      return cached.loading;
    }
  }
  
  // Create loading promise with timeout
  const loadingPromise = Promise.race([
    loader(),
    new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error(`Asset loading timeout: ${key}`)), timeout)
    )
  ]);
  
  // Store in cache
  if (cache) {
    assetCache[key] = {
      data: null,
      timestamp: Date.now(),
      loading: loadingPromise
    };
  }
  
  try {
    const data = await loadingPromise;
    
    // Update cache with loaded data
    if (cache && assetCache[key]) {
      assetCache[key].data = data;
      assetCache[key].loading = null;
    }
    
    return data;
  } catch (error) {
    // Remove from cache on error
    if (cache && assetCache[key]) {
      delete assetCache[key];
    }
    throw error;
  }
}

// ============= LAZY IMAGE LOADER =============
export async function lazyLoadImage(
  src: string,
  options?: {
    quality?: number;
    format?: 'webp' | 'jpeg' | 'png';
    priority?: 'high' | 'low';
  }
): Promise<HTMLImageElement> {
  const { quality = 0.8, format = 'webp', priority = 'low' } = options || {};
  
  return loadAsset(
    `img_${src}_${quality}_${format}`,
    async () => {
      const img = new Image();
      img.loading = priority === 'high' ? 'eager' : 'lazy';
      img.decoding = 'async';
      
      return new Promise((resolve, reject) => {
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
        img.src = src;
      });
    },
    { cache: true, priority }
  );
}

// ============= LAZY 3D MODEL LOADER =============
export async function lazyLoadGLTF(
  url: string,
  options?: {
    draco?: boolean;
    priority?: 'high' | 'low';
  }
): Promise<any> {
  const { draco = false, priority = 'low' } = options || {};
  
  return loadAsset(
    `gltf_${url}_${draco}`,
    async () => {
      // Dynamic import to avoid bundling
      const { useGLTF } = await import('@react-three/drei');
      
      // Preload the model
      useGLTF.preload(url);
      
      // Load the model
      const { scene } = useGLTF(url) as any;
      
      // Optimize the scene
      scene.traverse((child: any) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          
          // Optimize geometry
          if (child.geometry) {
            child.geometry.computeBoundingSphere();
            child.geometry.computeBoundingBox();
          }
          
          // Optimize material
          if (child.material) {
            child.material.needsUpdate = true;
          }
        }
      });
      
      return scene;
    },
    { cache: true, priority, timeout: 15000 }
  );
}

// ============= LAZY TEXTURE LOADER =============
export async function lazyLoadTexture(
  url: string,
  options?: {
    anisotropy?: number;
    priority?: 'high' | 'low';
  }
): Promise<THREE.Texture> {
  const { anisotropy = 4, priority = 'low' } = options || {};

  return loadAsset(
    `tex_${url}_${anisotropy}`,
    async () => {
      const textureLoader = new THREE.TextureLoader();

      return new Promise<THREE.Texture>((resolve, reject) => {
        textureLoader.load(
          url,
          (texture: THREE.Texture) => {
            texture.anisotropy = anisotropy;
            (texture as unknown as { colorSpace: string }).colorSpace = 'srgb';
            texture.needsUpdate = true;
            resolve(texture);
          },
          undefined,
          reject as (err: unknown) => void
        );
      });
    },
    { cache: true, priority }
  );
}

// ============= BATCH ASSET LOADER =============
export async function batchLoadAssets<T>(
  loaders: Array<{ key: string; loader: () => Promise<T> }>,
  options?: {
    concurrent?: number;
    priority?: 'high' | 'low';
  }
): Promise<Map<string, T>> {
  const { concurrent = 3, priority = 'low' } = options || {};
  const results = new Map<string, T>();
  
  // Process in batches
  for (let i = 0; i < loaders.length; i += concurrent) {
    const batch = loaders.slice(i, i + concurrent);
    const promises = batch.map(async ({ key, loader }) => {
      try {
        const data = await loadAsset(key, loader, { cache: true, priority });
        return { key, data };
      } catch (error) {
        console.error(`Failed to load asset: ${key}`, error);
        return { key, data: null };
      }
    });
    
    const batchResults = await Promise.all(promises);
    batchResults.forEach(({ key, data }) => {
      if (data !== null) {
        results.set(key, data);
      }
    });
  }
  
  return results;
}

// ============= MEMORY MANAGEMENT =============
export function clearAssetCache(pattern?: string): void {
  if (pattern) {
    Object.keys(assetCache).forEach(key => {
      if (key.includes(pattern)) {
        delete assetCache[key];
      }
    });
  } else {
    Object.keys(assetCache).forEach(key => {
      delete assetCache[key];
    });
  }
  
  // Trigger garbage collection hint
  if (typeof window !== 'undefined' && 'gc' in window) {
    (window as any).gc?.();
  }
}

export function getCacheStats(): {
  size: number;
  keys: string[];
  memoryUsage: number;
} {
  const keys = Object.keys(assetCache);
  const size = keys.length;
  
  // Estimate memory usage
  let memoryUsage = 0;
  keys.forEach(key => {
    const cached = assetCache[key];
    if (cached.data) {
      try {
        memoryUsage += JSON.stringify(cached.data).length;
      } catch {
        memoryUsage += 1024; // Estimate
      }
    }
  });
  
  return { size, keys, memoryUsage };
}

// ============= PERFORMANCE MONITORING =============
export class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  private thresholds: Map<string, number> = new Map();
  
  constructor() {
    // Set default thresholds
    this.setThreshold('assetLoad', 5000); // 5 seconds
    this.setThreshold('render', 16.67); // 60 FPS
    this.setThreshold('update', 16.67); // 60 FPS
  }
  
  setThreshold(metric: string, threshold: number): void {
    this.thresholds.set(metric, threshold);
  }
  
  startMeasure(metric: string): () => void {
    const startTime = performance.now();
    
    return () => {
      const duration = performance.now() - startTime;
      this.recordMetric(metric, duration);
      
      // Check threshold
      const threshold = this.thresholds.get(metric);
      if (threshold && duration > threshold) {
        console.warn(`Performance warning: ${metric} took ${duration.toFixed(2)}ms (threshold: ${threshold}ms)`);
      }
    };
  }
  
  recordMetric(metric: string, value: number): void {
    if (!this.metrics.has(metric)) {
      this.metrics.set(metric, []);
    }
    
    const values = this.metrics.get(metric)!;
    values.push(value);
    
    // Keep only last 100 measurements
    if (values.length > 100) {
      values.shift();
    }
  }
  
  getAverage(metric: string): number {
    const values = this.metrics.get(metric);
    if (!values || values.length === 0) return 0;
    
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }
  
  getStats(): Record<string, { avg: number; min: number; max: number; count: number }> {
    const stats: Record<string, any> = {};
    
    this.metrics.forEach((values, metric) => {
      stats[metric] = {
        avg: this.getAverage(metric),
        min: Math.min(...values),
        max: Math.max(...values),
        count: values.length
      };
    });
    
    return stats;
  }
}

// ============= LAZY COMPONENT LOADER =============
export function createLazyComponent<T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  fallback?: React.ReactNode
): React.LazyExoticComponent<T> {
  return React.lazy(() =>
    importFn().catch((error: unknown) => {
      console.error('Failed to load component:', error);
      // Return a fallback component
      return Promise.resolve({
        default: (() => React.createElement('div', { className: 'flex items-center justify-center p-8 text-red-500' }, 'Failed to load component')) as unknown as T,
      });
    })
  );
}

// ============= DEBOUNCE & THROTTLE =============
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// ============= REQUEST IDLE CALLBACK =============
export function requestIdleCallback(
  callback: () => void,
  options?: { timeout?: number }
): number {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    return (window as any).requestIdleCallback(callback, options);
  }
  
  // Fallback for browsers without requestIdleCallback
  if (typeof window !== 'undefined') {
    return (window as unknown as Window).setTimeout(callback, options?.timeout || 1) as unknown as number;
  }
  return 0;
}

export function cancelIdleCallback(id: number): void {
  if (typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
    (window as any).cancelIdleCallback(id);
  } else {
    clearTimeout(id);
  }
}

// ============= INTERSECTION OBSERVER HELPER =============
export function createIntersectionObserver(
  callback: IntersectionObserverCallback,
  options?: IntersectionObserverInit
): IntersectionObserver {
  return new IntersectionObserver(callback, {
    rootMargin: '50px',
    threshold: 0.1,
    ...options
  });
}

// ============= VIRTUAL SCROLL HELPER =============
export function createVirtualScrollHelper(
  containerHeight: number,
  itemHeight: number,
  totalItems: number
) {
  const visibleCount = Math.ceil(containerHeight / itemHeight) + 2;
  const scrollTop = { current: 0 };

  return {
    getVisibleRange: (scrollPosition: number) => {
      const startIndex = Math.max(0, Math.floor(scrollPosition / itemHeight) - 1);
      const endIndex = Math.min(totalItems - 1, startIndex + visibleCount);
      
      return { startIndex, endIndex };
    },
    
    getTotalHeight: () => totalItems * itemHeight,
    
    getOffsetY: (index: number) => index * itemHeight,
    
    visibleCount
  };
}

// ============= EXPORTS =============
export const perfMonitor = new PerformanceMonitor();