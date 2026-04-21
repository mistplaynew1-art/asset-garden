/**
 * SceneManager - Central manager for Three.js scenes
 * Handles scene creation, rendering, and lifecycle management
 */
import * as THREE from 'three';

export interface SceneConfig {
  id: string;
  antialias?: boolean;
  alpha?: boolean;
  shadows?: boolean;
  toneMapping?: THREE.ToneMapping;
  exposure?: number;
  backgroundColor?: THREE.Color | string;
}

export class SceneManager {
  private static instance: SceneManager;
  private scenes: Map<string, THREE.Scene> = new Map();
  private renderers: Map<string, THREE.WebGLRenderer> = new Map();
  private cameras: Map<string, THREE.Camera> = new Map();
  private animationCallbacks: Map<string, (delta: number) => void> = new Map();
  private clock: THREE.Clock;
  private activeScenes: Set<string> = new Set();

  private constructor() {
    this.clock = new THREE.Clock();
  }

  static getInstance(): SceneManager {
    if (!SceneManager.instance) {
      SceneManager.instance = new SceneManager();
    }
    return SceneManager.instance;
  }

  createScene(config: SceneConfig): THREE.Scene {
    const scene = new THREE.Scene();
    
    // Set background
    if (config.backgroundColor) {
      const color = config.backgroundColor instanceof THREE.Color 
        ? config.backgroundColor 
        : new THREE.Color(config.backgroundColor);
      scene.background = color;
    }

    // Add fog for depth
    scene.fog = new THREE.Fog(0x0a0a1a, 10, 100);

    this.scenes.set(config.id, scene);
    return scene;
  }

  createRenderer(config: SceneConfig, canvas?: HTMLCanvasElement): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: config.antialias ?? true,
      alpha: config.alpha ?? true,
      powerPreference: 'high-performance',
    });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = config.shadows ?? true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    if (config.toneMapping) {
      renderer.toneMapping = config.toneMapping;
    }
    renderer.toneMappingExposure = config.exposure ?? 1.2;

    this.renderers.set(config.id, renderer);
    return renderer;
  }

  setCamera(sceneId: string, camera: THREE.Camera): void {
    this.cameras.set(sceneId, camera);
  }

  getCamera(sceneId: string): THREE.Camera | undefined {
    return this.cameras.get(sceneId);
  }

  getScene(id: string): THREE.Scene | undefined {
    return this.scenes.get(id);
  }

  getRenderer(id: string): THREE.WebGLRenderer | undefined {
    return this.renderers.get(id);
  }

  registerAnimation(sceneId: string, callback: (delta: number) => void): void {
    this.animationCallbacks.set(sceneId, callback);
    this.activeScenes.add(sceneId);
  }

  unregisterAnimation(sceneId: string): void {
    this.animationCallbacks.delete(sceneId);
    this.activeScenes.delete(sceneId);
  }

  startRenderLoop(): void {
    const animate = () => {
      requestAnimationFrame(animate);
      const delta = this.clock.getDelta();

      this.activeScenes.forEach(sceneId => {
        const scene = this.scenes.get(sceneId);
        const renderer = this.renderers.get(sceneId);
        const camera = this.cameras.get(sceneId);
        const callback = this.animationCallbacks.get(sceneId);

        if (scene && renderer && camera) {
          if (callback) callback(delta);
          renderer.render(scene, camera);
        }
      });
    };

    animate();
  }

  resize(sceneId: string, width: number, height: number): void {
    const renderer = this.renderers.get(sceneId);
    const camera = this.cameras.get(sceneId);

    if (renderer) {
      renderer.setSize(width, height);
    }

    if (camera instanceof THREE.PerspectiveCamera) {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }
  }

  dispose(sceneId: string): void {
    const scene = this.scenes.get(sceneId);
    const renderer = this.renderers.get(sceneId);

    if (scene) {
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry?.dispose();
          if (Array.isArray(object.material)) {
            object.material.forEach(m => m.dispose());
          } else {
            object.material?.dispose();
          }
        }
      });
      this.scenes.delete(sceneId);
    }

    if (renderer) {
      renderer.dispose();
      this.renderers.delete(sceneId);
    }

    this.cameras.delete(sceneId);
    this.animationCallbacks.delete(sceneId);
    this.activeScenes.delete(sceneId);
  }

  disposeAll(): void {
    this.scenes.forEach((_, id) => this.dispose(id));
  }
}

export const sceneManager = SceneManager.getInstance();