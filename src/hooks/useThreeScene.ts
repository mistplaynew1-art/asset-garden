/**
 * useThreeScene - React hook for Three.js scene management
 * Handles lifecycle, resizing, and cleanup automatically
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { sceneManager, SceneConfig } from '@/lib/three-engine/SceneManager';
import { lightingSystem } from '@/lib/three-engine/LightingSystem';

interface UseThreeSceneOptions extends Partial<SceneConfig> {
  onInit?: (scene: THREE.Scene, renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera) => void;
  onRender?: (delta: number) => void;
  onResize?: (width: number, height: number) => void;
}

interface UseThreeSceneReturn {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  scene: THREE.Scene | null;
  renderer: THREE.WebGLRenderer | null;
  camera: THREE.PerspectiveCamera | null;
  isReady: boolean;
}

export function useThreeScene(options: UseThreeSceneOptions = {}): UseThreeSceneReturn {
  const {
    id = `scene-${Math.random().toString(36).substr(2, 9)}`,
    antialias = true,
    alpha = true,
    shadows = true,
    backgroundColor = 0x0a0a1a,
    onInit,
    onRender,
    onResize,
  } = options;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scene, setScene] = useState<THREE.Scene | null>(null);
  const [renderer, setRenderer] = useState<THREE.WebGLRenderer | null>(null);
  const [camera, setCamera] = useState<THREE.PerspectiveCamera | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Create scene
    const bg: string | THREE.Color =
      typeof backgroundColor === 'number'
        ? `#${(backgroundColor as number).toString(16).padStart(6, '0')}`
        : (backgroundColor as string | THREE.Color);
    const sceneConfig: SceneConfig = {
      id,
      antialias,
      alpha,
      shadows,
      backgroundColor: bg,
    };

    const newScene = sceneManager.createScene(sceneConfig);
    const newRenderer = sceneManager.createRenderer(sceneConfig, canvasRef.current);

    // Create camera
    const newCamera = new THREE.PerspectiveCamera(
      60,
      canvasRef.current.clientWidth / canvasRef.current.clientHeight,
      0.1,
      1000
    );
    newCamera.position.set(0, 5, 10);
    newCamera.lookAt(0, 0, 0);

    sceneManager.setCamera(id, newCamera);

    // Setup lighting
    const lighting = lightingSystem.createLighting(id, 
      lightingSystem.createGameLightingPreset('crash')
    );
    lightingSystem.addToScene(id, newScene);

    // Store references
    setScene(newScene);
    setRenderer(newRenderer);
    setCamera(newCamera);

    // Register animation callback
    if (onRender) {
      sceneManager.registerAnimation(id, onRender);
    }

    // Call onInit
    onInit?.(newScene, newRenderer, newCamera);

    // Handle resize
    const handleResize = () => {
      if (!canvasRef.current) return;
      
      const width = canvasRef.current.clientWidth;
      const height = canvasRef.current.clientHeight;
      
      sceneManager.resize(id, width, height);
      onResize?.(width, height);
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    // Start render loop
    sceneManager.startRenderLoop();

    setIsReady(true);

    return () => {
      window.removeEventListener('resize', handleResize);
      sceneManager.unregisterAnimation(id);
      lightingSystem.removeFromScene(id, newScene);
      lightingSystem.dispose(id);
      sceneManager.dispose(id);
      setScene(null);
      setRenderer(null);
      setCamera(null);
      setIsReady(false);
    };
  }, [id]);

  return {
    canvasRef,
    scene,
    renderer,
    camera,
    isReady,
  };
}

/**
 * useLazyThreeScene - Lazy-loaded Three.js scene
 * Only initializes when the component is visible
 */
export function useLazyThreeScene(
  options: UseThreeSceneOptions = {}
): UseThreeSceneReturn & { triggerLoad: () => void } {
  const [shouldLoad, setShouldLoad] = useState(false);
  const result = useThreeScene(shouldLoad ? options : { ...options, id: '' });

  const triggerLoad = useCallback(() => {
    setShouldLoad(true);
  }, []);

  return {
    ...result,
    triggerLoad,
  };
}