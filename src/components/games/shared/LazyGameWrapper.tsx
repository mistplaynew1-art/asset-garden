/**
 * LazyGameWrapper - Lazy loading wrapper for games with loading screen
 * Implements code splitting and asset preloading
 */
import React, { Suspense, lazy, useState, useEffect, useCallback } from 'react';
import GameLoadingScreen from './GameLoadingScreen';

// Lazy load game components
export const LazyAviatorGame = lazy(() => import('../aviator/AviatorHybridGame'));
export const LazyAviator3DScene = lazy(() => import('../aviator/Aviator3DScene'));

// Higher-order component for lazy loading with loading screen
interface LazyGameProps {
  gameComponent: React.LazyExoticComponent<React.ComponentType<any>>;
  gameName: string;
  props?: Record<string, any>;
  preloadAssets?: string[];
  minLoadDuration?: number;
}

export function LazyGameLoader({
  gameComponent: GameComponent,
  gameName,
  props = {},
  preloadAssets = [],
  minLoadDuration = 2000,
}: LazyGameProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [assetsLoaded, setAssetsLoaded] = useState(false);

  // Preload assets
  useEffect(() => {
    if (preloadAssets.length === 0) {
      setAssetsLoaded(true);
      return;
    }

    const loadAssets = async () => {
      try {
        await Promise.all(
          preloadAssets.map((src) => {
            if (src.endsWith('.glb') || src.endsWith('.gltf')) {
              // Preload 3D models
              return fetch(src).then(() => {});
            } else if (src.endsWith('.png') || src.endsWith('.jpg')) {
              // Preload images
              return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = resolve;
                img.onerror = reject;
                img.src = src;
              });
            }
            return Promise.resolve();
          })
        );
      } catch (error) {
        console.warn('Some assets failed to preload:', error);
      }
      setAssetsLoaded(true);
    };

    loadAssets();
  }, [preloadAssets]);

  const handleLoadComplete = useCallback(() => {
    setIsLoading(false);
  }, []);

  return (
    <>
      <GameLoadingScreen
        isLoading={isLoading || !assetsLoaded}
        gameName={gameName}
        onLoadComplete={handleLoadComplete}
        minDuration={minLoadDuration}
      />
      <Suspense fallback={null}>
        <GameComponent {...props} />
      </Suspense>
    </>
  );
}

// Hook for lazy loading games
export function useLazyGame(importFn: () => Promise<{ default: React.ComponentType<any> }>) {
  const [Component, setComponent] = useState<React.LazyExoticComponent<React.ComponentType> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(() => {
    if (Component || isLoading) return;

    setIsLoading(true);
    setError(null);

    importFn()
      .then((module) => {
        setComponent(lazy(() => Promise.resolve({ default: module.default })));
      })
      .catch((err) => {
        setError(err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [Component, isLoading, importFn]);

  return { Component, isLoading, error, load };
}

// Intersection Observer hook for lazy loading on scroll
export function useIntersectionLoader(
  ref: React.RefObject<HTMLElement>,
  onIntersect: () => void,
  options: IntersectionObserverInit = {}
) {
  useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          onIntersect();
          observer.disconnect();
        }
      },
      { threshold: 0.1, ...options }
    );

    observer.observe(ref.current);

    return () => observer.disconnect();
  }, [ref, onIntersect, options]);
}