import { useEffect, useRef } from 'react';
import { JetpackScene, type JetpackPhase } from './JetpackScene';

interface JetpackCanvasProps {
  multiplier: number;
  phase: JetpackPhase;
  crashPoint: number;
  countdown: number;
}

export default function JetpackCanvas({ multiplier, phase, crashPoint, countdown }: JetpackCanvasProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<JetpackScene | null>(null);

  useEffect(() => {
    if (!hostRef.current) return;
    const scene = new JetpackScene(hostRef.current);
    sceneRef.current = scene;
    scene.init().catch(() => {
      /* noop */
    });
    return () => {
      sceneRef.current = null;
      scene.destroy();
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
