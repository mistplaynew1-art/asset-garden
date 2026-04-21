/**
 * LightingSystem - Professional lighting setup for 3D scenes
 * Creates cinematic lighting with dynamic effects
 */
import * as THREE from 'three';

export interface LightingConfig {
  ambientIntensity?: number;
  ambientColor?: string | number;
  mainLightIntensity?: number;
  mainLightColor?: string | number;
  mainLightPosition?: [number, number, number];
  fillLightIntensity?: number;
  fillLightColor?: string | number;
  rimLightIntensity?: number;
  rimLightColor?: string | number;
  enableShadows?: boolean;
  shadowMapSize?: number;
}

export interface GameLighting {
  ambient: THREE.AmbientLight;
  main: THREE.DirectionalLight;
  fill: THREE.DirectionalLight;
  rim: THREE.DirectionalLight;
  point?: THREE.PointLight[];
  spot?: THREE.SpotLight[];
}

class LightingSystemClass {
  private static instance: LightingSystemClass;
  private lightSetups: Map<string, GameLighting> = new Map();

  private constructor() {}

  static getInstance(): LightingSystemClass {
    if (!LightingSystemClass.instance) {
      LightingSystemClass.instance = new LightingSystemClass();
    }
    return LightingSystemClass.instance;
  }

  createLighting(sceneId: string, config: LightingConfig = {}): GameLighting {
    const {
      ambientIntensity = 0.4,
      ambientColor = 0x404080,
      mainLightIntensity = 1.5,
      mainLightColor = 0xffffff,
      mainLightPosition = [10, 20, 10],
      fillLightIntensity = 0.5,
      fillLightColor = 0x8888ff,
      rimLightIntensity = 0.8,
      rimLightColor = 0xff8844,
      enableShadows = true,
      shadowMapSize = 2048,
    } = config;

    // Ambient light - overall scene illumination
    const ambient = new THREE.AmbientLight(
      typeof ambientColor === 'string' ? new THREE.Color(ambientColor) : ambientColor,
      ambientIntensity
    );

    // Main directional light - primary light source (sun/key light)
    const main = new THREE.DirectionalLight(
      typeof mainLightColor === 'string' ? new THREE.Color(mainLightColor) : mainLightColor,
      mainLightIntensity
    );
    main.position.set(...mainLightPosition);
    
    if (enableShadows) {
      main.castShadow = true;
      main.shadow.mapSize.width = shadowMapSize;
      main.shadow.mapSize.height = shadowMapSize;
      main.shadow.camera.near = 0.5;
      main.shadow.camera.far = 100;
      main.shadow.camera.left = -20;
      main.shadow.camera.right = 20;
      main.shadow.camera.top = 20;
      main.shadow.camera.bottom = -20;
      main.shadow.bias = -0.0001;
      main.shadow.normalBias = 0.02;
    }

    // Fill light - softens shadows
    const fill = new THREE.DirectionalLight(
      typeof fillLightColor === 'string' ? new THREE.Color(fillLightColor) : fillLightColor,
      fillLightIntensity
    );
    fill.position.set(-10, 10, -10);

    // Rim light - creates edge definition
    const rim = new THREE.DirectionalLight(
      typeof rimLightColor === 'string' ? new THREE.Color(rimLightColor) : rimLightColor,
      rimLightIntensity
    );
    rim.position.set(0, 5, -15);

    const lighting: GameLighting = {
      ambient,
      main,
      fill,
      rim,
    };

    this.lightSetups.set(sceneId, lighting);
    return lighting;
  }

  addToScene(sceneId: string, scene: THREE.Scene): void {
    const lighting = this.lightSetups.get(sceneId);
    if (lighting) {
      scene.add(lighting.ambient);
      scene.add(lighting.main);
      scene.add(lighting.fill);
      scene.add(lighting.rim);
      
      lighting.point?.forEach(light => scene.add(light));
      lighting.spot?.forEach(light => scene.add(light));
    }
  }

  removeFromScene(sceneId: string, scene: THREE.Scene): void {
    const lighting = this.lightSetups.get(sceneId);
    if (lighting) {
      scene.remove(lighting.ambient);
      scene.remove(lighting.main);
      scene.remove(lighting.fill);
      scene.remove(lighting.rim);
      
      lighting.point?.forEach(light => scene.remove(light));
      lighting.spot?.forEach(light => scene.remove(light));
    }
  }

  addPointLight(
    sceneId: string,
    position: THREE.Vector3,
    color: number | string = 0xffffff,
    intensity: number = 1,
    distance: number = 10,
    decay: number = 2
  ): THREE.PointLight | null {
    const lighting = this.lightSetups.get(sceneId);
    if (!lighting) return null;

    const pointLight = new THREE.PointLight(
      typeof color === 'string' ? new THREE.Color(color) : color,
      intensity,
      distance,
      decay
    );
    pointLight.position.copy(position);
    pointLight.castShadow = true;

    if (!lighting.point) lighting.point = [];
    lighting.point.push(pointLight);

    return pointLight;
  }

  addSpotLight(
    sceneId: string,
    position: THREE.Vector3,
    target: THREE.Vector3,
    color: number | string = 0xffffff,
    intensity: number = 1,
    angle: number = Math.PI / 6,
    penumbra: number = 0.5
  ): THREE.SpotLight | null {
    const lighting = this.lightSetups.get(sceneId);
    if (!lighting) return null;

    const spotLight = new THREE.SpotLight(
      typeof color === 'string' ? new THREE.Color(color) : color,
      intensity,
      30,
      angle,
      penumbra
    );
    spotLight.position.copy(position);
    spotLight.target.position.copy(target);
    spotLight.castShadow = true;
    spotLight.shadow.mapSize.width = 1024;
    spotLight.shadow.mapSize.height = 1024;

    if (!lighting.spot) lighting.spot = [];
    lighting.spot.push(spotLight);

    return spotLight;
  }

  setIntensity(sceneId: string, lightType: 'ambient' | 'main' | 'fill' | 'rim', intensity: number): void {
    const lighting = this.lightSetups.get(sceneId);
    if (lighting && lighting[lightType]) {
      lighting[lightType].intensity = intensity;
    }
  }

  animateIntensity(
    sceneId: string,
    lightType: 'ambient' | 'main' | 'fill' | 'rim',
    targetIntensity: number,
    duration: number = 1
  ): Promise<void> {
    return new Promise((resolve) => {
      const lighting = this.lightSetups.get(sceneId);
      if (!lighting || !lighting[lightType]) {
        resolve();
        return;
      }

      const startIntensity = lighting[lightType].intensity;
      const startTime = performance.now();

      const animate = () => {
        const elapsed = (performance.now() - startTime) / 1000;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic

        lighting[lightType].intensity = THREE.MathUtils.lerp(
          startIntensity,
          targetIntensity,
          eased
        );

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };

      animate();
    });
  }

  createGameLightingPreset(preset: 'crash' | 'slots' | 'cards' | 'default'): LightingConfig {
    switch (preset) {
      case 'crash':
        return {
          ambientIntensity: 0.3,
          ambientColor: 0x1a1a3a,
          mainLightIntensity: 2,
          mainLightColor: 0xffffff,
          mainLightPosition: [5, 15, 10],
          fillLightIntensity: 0.6,
          fillLightColor: 0x4444ff,
          rimLightIntensity: 1,
          rimLightColor: 0xff6633,
        };
      case 'slots':
        return {
          ambientIntensity: 0.5,
          ambientColor: 0x2a1a3a,
          mainLightIntensity: 1.8,
          mainLightColor: 0xffddaa,
          mainLightPosition: [0, 20, 5],
          fillLightIntensity: 0.4,
          fillLightColor: 0xff44aa,
          rimLightIntensity: 0.6,
          rimLightColor: 0xaa44ff,
        };
      case 'cards':
        return {
          ambientIntensity: 0.6,
          ambientColor: 0x3a2a2a,
          mainLightIntensity: 1.2,
          mainLightColor: 0xfff5e6,
          mainLightPosition: [0, 15, 10],
          fillLightIntensity: 0.3,
          fillLightColor: 0x886644,
          rimLightIntensity: 0.5,
          rimLightColor: 0xffaa66,
        };
      default:
        return {};
    }
  }

  dispose(sceneId: string): void {
    const lighting = this.lightSetups.get(sceneId);
    if (lighting) {
      lighting.main.shadow.map?.dispose();
      lighting.spot?.forEach(spot => spot.shadow.map?.dispose());
      this.lightSetups.delete(sceneId);
    }
  }
}

export const lightingSystem = LightingSystemClass.getInstance();