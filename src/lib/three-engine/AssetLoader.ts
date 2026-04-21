/**
 * AssetLoader - Lazy loading system for 3D assets
 * Handles GLTF models, textures, and animations with caching
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

export interface LoadProgress {
  loaded: number;
  total: number;
  progress: number;
}

export interface AssetConfig {
  id: string;
  type: 'model' | 'texture' | 'hdri' | 'cubeTexture';
  url: string;
  lazy?: boolean;
}

export interface LoadedModel {
  scene: THREE.Group;
  animations: THREE.AnimationClip[];
  asset: unknown;
}

class AssetLoaderClass {
  private static instance: AssetLoaderClass;
  private gltfLoader: GLTFLoader;
  private textureLoader: THREE.TextureLoader;
  private rgbeLoader: RGBELoader;
  private cache: Map<string, LoadedModel | THREE.Texture | THREE.CubeTexture> = new Map();
  private loading: Map<string, Promise<LoadedModel | THREE.Texture | THREE.CubeTexture>> = new Map();
  private dracoLoader: DRACOLoader;

  private constructor() {
    this.gltfLoader = new GLTFLoader();
    this.textureLoader = new THREE.TextureLoader();
    this.rgbeLoader = new RGBELoader();
    
    // Setup DRACO loader for compressed models
    this.dracoLoader = new DRACOLoader();
    this.dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    this.gltfLoader.setDRACOLoader(this.dracoLoader);
  }

  static getInstance(): AssetLoaderClass {
    if (!AssetLoaderClass.instance) {
      AssetLoaderClass.instance = new AssetLoaderClass();
    }
    return AssetLoaderClass.instance;
  }

  async loadModel(
    id: string, 
    url: string, 
    onProgress?: (progress: LoadProgress) => void
  ): Promise<LoadedModel> {
    // Check cache first
    const cached = this.cache.get(id);
    if (cached && 'scene' in cached) {
      return cached as LoadedModel;
    }

    // Check if already loading
    const pending = this.loading.get(id);
    if (pending) {
      return pending as Promise<LoadedModel>;
    }

    // Start loading
    const loadPromise = new Promise<LoadedModel>((resolve, reject) => {
      this.gltfLoader.load(
        url,
        (gltf) => {
          const result: LoadedModel = {
            scene: gltf.scene,
            animations: gltf.animations,
            asset: gltf.asset,
          };
          
          // Setup shadows for all meshes
          gltf.scene.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });

          this.cache.set(id, result);
          this.loading.delete(id);
          resolve(result);
        },
        (progress) => {
          if (onProgress && progress.total > 0) {
            onProgress({
              loaded: progress.loaded,
              total: progress.total,
              progress: progress.loaded / progress.total,
            });
          }
        },
        (error) => {
          this.loading.delete(id);
          reject(error);
        }
      );
    });

    this.loading.set(id, loadPromise);
    return loadPromise;
  }

  async loadTexture(
    id: string,
    url: string,
    options?: {
      flipY?: boolean;
      colorSpace?: string;
      generateMipmaps?: boolean;
    }
  ): Promise<THREE.Texture> {
    const cached = this.cache.get(id);
    if (cached && cached instanceof THREE.Texture) {
      return cached;
    }

    const pending = this.loading.get(id);
    if (pending) {
      return pending as Promise<THREE.Texture>;
    }

    const loadPromise = new Promise<THREE.Texture>((resolve, reject) => {
      this.textureLoader.load(
        url,
        (texture) => {
          if (options?.flipY !== undefined) texture.flipY = options.flipY;
          if (options?.colorSpace) (texture as unknown as { colorSpace: string }).colorSpace = options.colorSpace;
          if (options?.generateMipmaps !== undefined) texture.generateMipmaps = options.generateMipmaps;
          
          texture.anisotropy = 16;
          
          this.cache.set(id, texture);
          this.loading.delete(id);
          resolve(texture);
        },
        undefined,
        (error) => {
          this.loading.delete(id);
          reject(error);
        }
      );
    });

    this.loading.set(id, loadPromise);
    return loadPromise;
  }

  async loadHDRI(
    id: string, 
    url: string,
    renderer: THREE.WebGLRenderer
  ): Promise<THREE.Texture> {
    const cached = this.cache.get(id);
    if (cached && cached instanceof THREE.Texture) {
      return cached;
    }

    const pending = this.loading.get(id);
    if (pending) {
      return pending as Promise<THREE.Texture>;
    }

    const loadPromise = new Promise<THREE.Texture>((resolve, reject) => {
      this.rgbeLoader.load(
        url,
        (texture) => {
          texture.mapping = THREE.EquirectangularReflectionMapping;
          
          const pmremGenerator = new THREE.PMREMGenerator(renderer);
          pmremGenerator.compileEquirectangularShader();
          
          const envMap = pmremGenerator.fromEquirectangular(texture).texture;
          
          this.cache.set(id, envMap);
          this.loading.delete(id);
          
          texture.dispose();
          pmremGenerator.dispose();
          
          resolve(envMap);
        },
        undefined,
        (error) => {
          this.loading.delete(id);
          reject(error);
        }
      );
    });

    this.loading.set(id, loadPromise);
    return loadPromise;
  }

  async loadAssets(
    assets: AssetConfig[],
    onProgress?: (id: string, progress: LoadProgress) => void
  ): Promise<Map<string, LoadedModel | THREE.Texture | THREE.CubeTexture>> {
    const results = new Map<string, LoadedModel | THREE.Texture | THREE.CubeTexture>();

    // Filter out lazy assets for initial load
    const immediateAssets = assets.filter(a => !a.lazy);
    
    await Promise.all(
      immediateAssets.map(async (asset) => {
        try {
          let result: LoadedModel | THREE.Texture | THREE.CubeTexture;
          
          switch (asset.type) {
            case 'model':
              result = await this.loadModel(asset.id, asset.url, (p) => onProgress?.(asset.id, p));
              break;
            case 'texture':
              result = await this.loadTexture(asset.id, asset.url);
              break;
            default:
              throw new Error(`Unsupported asset type: ${asset.type}`);
          }
          
          results.set(asset.id, result);
        } catch (error) {
          console.error(`Failed to load asset ${asset.id}:`, error);
        }
      })
    );

    return results;
  }

  getCached(id: string): LoadedModel | THREE.Texture | THREE.CubeTexture | undefined {
    return this.cache.get(id);
  }

  hasCached(id: string): boolean {
    return this.cache.has(id);
  }

  preloadAssets(assets: AssetConfig[]): void {
    assets.forEach(asset => {
      if (!this.cache.has(asset.id) && !this.loading.has(asset.id)) {
        switch (asset.type) {
          case 'model':
            this.loadModel(asset.id, asset.url);
            break;
          case 'texture':
            this.loadTexture(asset.id, asset.url);
            break;
        }
      }
    });
  }

  dispose(id: string): void {
    const asset = this.cache.get(id);
    if (asset) {
      if (asset instanceof THREE.Texture) {
        asset.dispose();
      } else if ('scene' in asset) {
        (asset as LoadedModel).scene.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry?.dispose();
            if (Array.isArray(child.material)) {
              child.material.forEach(m => m.dispose());
            } else {
              child.material?.dispose();
            }
          }
        });
      }
      this.cache.delete(id);
    }
  }

  disposeAll(): void {
    this.cache.forEach((_, id) => this.dispose(id));
  }

  getLoadingProgress(): number {
    if (this.loading.size === 0) return 1;
    return 0.5; // Simplified - could be enhanced with actual progress tracking
  }
}

export const assetLoader = AssetLoaderClass.getInstance();
export type { AssetLoaderClass };