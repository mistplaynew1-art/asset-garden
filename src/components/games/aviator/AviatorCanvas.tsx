import { useEffect, useRef } from 'react';
import { AviatorScene, type AviatorPhase } from './AviatorScene';

interface AviatorCanvasProps {
  multiplier: number;
  phase: AviatorPhase;
  crashPoint: number;
  countdown: number;
}

/**
 * Pixi.js 8 procedural Aviator canvas. Pure visual layer — receives all state
 * via props, never affects RNG/bet logic.
 */
export default function AviatorCanvas({ multiplier, phase, crashPoint, countdown }: AviatorCanvasProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<AviatorScene | null>(null);

  useEffect(() => {
    if (!hostRef.current) return;
    const scene = new AviatorScene(hostRef.current);
    sceneRef.current = scene;
    let cancelled = false;
    scene.init().catch(() => {
      /* swallow init errors — fallback UI handled by parent if needed */
    });
    return () => {
      cancelled = true;
      sceneRef.current = null;
      scene.destroy();
      void cancelled;
    };
  }, []);

  useEffect(() => {
    sceneRef.current?.setMultiplier(multiplier);
  }, [multiplier]);

  useEffect(() => {
    sceneRef.current?.setPhase(phase, { crashPoint });
  }, [phase, crashPoint]);

  useEffect(() => {
    sceneRef.current?.setCountdown(countdown);
  }, [countdown]);

  return (
    <div
      ref={hostRef}
      className="absolute inset-0 w-full h-full"
      style={{ contain: 'layout paint', backfaceVisibility: 'hidden' }}
      aria-hidden="true"
    />
  );
}
