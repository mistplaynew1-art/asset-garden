/**
 * Three.js Engine - Core 3D rendering infrastructure
 * Exports all 3D engine components for use in games
 */

export * from './SceneManager';
export * from './AssetLoader';
export * from './CharacterSystem';
export * from './LightingSystem';
export * from './ParticleEffects';

// Re-export Three.js for convenience
export * as THREE from 'three';

// Utility functions
export const createGameScene = (id: string) => {
  const { sceneManager } = require('./SceneManager');
  const { lightingSystem } = require('./LightingSystem');
  
  const scene = sceneManager.createScene({
    id,
    backgroundColor: 0x0a0a1a,
  });
  
  const renderer = sceneManager.createRenderer({
    id,
    shadows: true,
  });
  
  const lighting = lightingSystem.createLighting(id, 
    lightingSystem.createGameLightingPreset('crash')
  );
  
  lightingSystem.addToScene(id, scene);
  
  return { scene, renderer, lighting };
};

export const disposeGameScene = (id: string) => {
  const { sceneManager } = require('./SceneManager');
  const { lightingSystem } = require('./LightingSystem');
  const { characterSystem } = require('./CharacterSystem');
  const { particleEffects } = require('./ParticleEffects');
  
  sceneManager.dispose(id);
  lightingSystem.dispose(id);
  characterSystem.dispose(id);
  particleEffects.dispose(id);
};