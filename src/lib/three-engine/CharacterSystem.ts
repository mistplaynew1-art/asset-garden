/**
 * CharacterSystem - 3D Character management with animations
 * Handles character loading, animation states, and physics
 */
import * as THREE from 'three';
import { LoadedModel } from './AssetLoader';

export type CharacterState = 
  | 'idle' 
  | 'flying' 
  | 'accelerating' 
  | 'celebrating' 
  | 'crashing' 
  | 'waiting'
  | 'takeoff';

export interface CharacterConfig {
  id: string;
  modelPath: string;
  scale?: number;
  position?: THREE.Vector3;
  rotation?: THREE.Euler;
  animationMixTime?: number;
}

export interface CharacterInstance {
  id: string;
  model: THREE.Group;
  mixer: THREE.AnimationMixer;
  animations: Map<string, THREE.AnimationClip>;
  currentState: CharacterState;
  currentAction: THREE.AnimationAction | null;
  skeleton: THREE.Skeleton | null;
  boundingBox: THREE.Box3;
}

class CharacterSystemClass {
  private static instance: CharacterSystemClass;
  private characters: Map<string, CharacterInstance> = new Map();
  private clock: THREE.Clock;

  private constructor() {
    this.clock = new THREE.Clock();
  }

  static getInstance(): CharacterSystemClass {
    if (!CharacterSystemClass.instance) {
      CharacterSystemClass.instance = new CharacterSystemClass();
    }
    return CharacterSystemClass.instance;
  }

  async createCharacter(
    config: CharacterConfig,
    loadedModel: LoadedModel
  ): Promise<CharacterInstance> {
    const model = loadedModel.scene.clone();
    
    // Apply transformations
    if (config.scale) {
      model.scale.setScalar(config.scale);
    }
    if (config.position) {
      model.position.copy(config.position);
    }
    if (config.rotation) {
      model.rotation.copy(config.rotation);
    }

    // Setup animation mixer
    const mixer = new THREE.AnimationMixer(model);
    const animations = new Map<string, THREE.AnimationClip>();
    
    loadedModel.animations.forEach((clip) => {
      animations.set(clip.name, clip);
    });

    // Find skeleton
    let skeleton: THREE.Skeleton | null = null;
    model.traverse((child) => {
      if (child instanceof THREE.SkinnedMesh && child.skeleton) {
        skeleton = child.skeleton;
      }
    });

    // Calculate bounding box
    const boundingBox = new THREE.Box3().setFromObject(model);

    const character: CharacterInstance = {
      id: config.id,
      model,
      mixer,
      animations,
      currentState: 'idle',
      currentAction: null,
      skeleton,
      boundingBox,
    };

    this.characters.set(config.id, character);
    return character;
  }

  playAnimation(
    characterId: string,
    state: CharacterState,
    transitionDuration: number = 0.3
  ): void {
    const character = this.characters.get(characterId);
    if (!character) return;

    const animationName = this.getAnimationNameForState(state);
    const clip = character.animations.get(animationName);
    
    if (!clip) {
      // If no specific animation, try to find a fallback
      const fallbackClip = character.animations.values().next().value;
      if (!fallbackClip) return;
    }

    const newAction = character.mixer.clipAction(clip || character.animations.values().next().value!);
    
    if (character.currentAction && character.currentAction !== newAction) {
      // Smooth transition between animations
      newAction.reset();
      newAction.setEffectiveTimeScale(1);
      newAction.setEffectiveWeight(1);
      newAction.crossFadeFrom(character.currentAction, transitionDuration, true);
      newAction.play();
    } else {
      newAction.play();
    }

    character.currentAction = newAction;
    character.currentState = state;
  }

  private getAnimationNameForState(state: CharacterState): string {
    const animationMap: Record<CharacterState, string> = {
      idle: 'idle',
      waiting: 'idle',
      takeoff: 'takeoff',
      flying: 'fly',
      accelerating: 'fly_fast',
      celebrating: 'celebrate',
      crashing: 'crash',
    };
    return animationMap[state] || 'idle';
  }

  setState(characterId: string, state: CharacterState): void {
    this.playAnimation(characterId, state);
  }

  update(delta?: number): void {
    const d = delta || this.clock.getDelta();
    this.characters.forEach((character) => {
      character.mixer.update(d);
    });
  }

  getCharacter(id: string): CharacterInstance | undefined {
    return this.characters.get(id);
  }

  getModel(id: string): THREE.Group | undefined {
    return this.characters.get(id)?.model;
  }

  getPosition(id: string): THREE.Vector3 | undefined {
    return this.characters.get(id)?.model.position;
  }

  setPosition(id: string, position: THREE.Vector3): void {
    const character = this.characters.get(id);
    if (character) {
      character.model.position.copy(position);
    }
  }

  setRotation(id: string, rotation: THREE.Euler): void {
    const character = this.characters.get(id);
    if (character) {
      character.model.rotation.copy(rotation);
    }
  }

  rotateToDirection(id: string, direction: THREE.Vector3, smoothness: number = 0.1): void {
    const character = this.characters.get(id);
    if (!character) return;

    const targetRotation = Math.atan2(direction.x, direction.z);
    character.model.rotation.y = THREE.MathUtils.lerp(
      character.model.rotation.y,
      targetRotation,
      smoothness
    );
  }

  dispose(id: string): void {
    const character = this.characters.get(id);
    if (character) {
      character.mixer.stopAllAction();
      character.model.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material?.dispose();
          }
        }
      });
      this.characters.delete(id);
    }
  }

  disposeAll(): void {
    this.characters.forEach((_, id) => this.dispose(id));
  }
}

export const characterSystem = CharacterSystemClass.getInstance();