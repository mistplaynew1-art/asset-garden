/**
 * ParticleEffects - High-quality 3D particle systems
 * Creates stunning visual effects for games
 */
import * as THREE from 'three';

export interface ParticleConfig {
  count: number;
  size: number;
  color: string | number | THREE.Color;
  opacity?: number;
  spread: number;
  speed: number;
  lifetime: number;
  gravity?: number;
  friction?: number;
  fadeIn?: boolean;
  fadeOut?: boolean;
  scale?: number;
  texture?: string;
  blending?: THREE.Blending;
}

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
  opacity: number;
}

class ParticleEffectsClass {
  private static instance: ParticleEffectsClass;
  private systems: Map<string, THREE.Points> = new Map();
  private particleData: Map<string, Particle[]> = new Map();
  private geometries: Map<string, THREE.BufferGeometry> = new Map();
  private materials: Map<string, THREE.PointsMaterial> = new Map();

  private constructor() {}

  static getInstance(): ParticleEffectsClass {
    if (!ParticleEffectsClass.instance) {
      ParticleEffectsClass.instance = new ParticleEffectsClass();
    }
    return ParticleEffectsClass.instance;
  }

  createParticleSystem(id: string, config: ParticleConfig): THREE.Points {
    const {
      count,
      size,
      color,
      opacity = 1,
      spread,
      speed,
      lifetime,
      gravity = 0,
      friction = 0.98,
      fadeIn = true,
      fadeOut = true,
      blending = THREE.AdditiveBlending,
    } = config;

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const opacities = new Float32Array(count);

    const particles: Particle[] = [];
    const colorObj = typeof color === 'string' ? new THREE.Color(color) : new THREE.Color(color);

    for (let i = 0; i < count; i++) {
      const particle: Particle = {
        position: new THREE.Vector3(
          (Math.random() - 0.5) * spread,
          (Math.random() - 0.5) * spread,
          (Math.random() - 0.5) * spread
        ),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * speed,
          (Math.random() - 0.5) * speed,
          (Math.random() - 0.5) * speed
        ),
        life: Math.random() * lifetime,
        maxLife: lifetime,
        size: size * (0.5 + Math.random() * 0.5),
        opacity: opacity,
      };
      particles.push(particle);

      positions[i * 3] = particle.position.x;
      positions[i * 3 + 1] = particle.position.y;
      positions[i * 3 + 2] = particle.position.z;

      colors[i * 3] = colorObj.r;
      colors[i * 3 + 1] = colorObj.g;
      colors[i * 3 + 2] = colorObj.b;

      sizes[i] = particle.size;
      opacities[i] = particle.opacity;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size,
      vertexColors: true,
      transparent: true,
      opacity,
      blending,
      depthWrite: false,
    });

    const points = new THREE.Points(geometry, material);
    
    this.systems.set(id, points);
    this.particleData.set(id, particles);
    this.geometries.set(id, geometry);
    this.materials.set(id, material);

    // Store config for updates
    (points as unknown as { _config: ParticleConfig })._config = {
      ...config,
      gravity,
      friction,
      fadeIn,
      fadeOut,
    };

    return points as unknown as THREE.Points;
  }

  emitBurst(id: string, position: THREE.Vector3, count: number = 50): void {
    const particles = this.particleData.get(id);
    const system = this.systems.get(id);
    
    if (!particles || !system) return;

    const config = (system as THREE.Points & { _config: ParticleConfig })._config;
    
    for (let i = 0; i < Math.min(count, particles.length); i++) {
      const particle = particles[i];
      particle.position.copy(position);
      particle.velocity.set(
        (Math.random() - 0.5) * config.speed * 2,
        Math.random() * config.speed,
        (Math.random() - 0.5) * config.speed * 2
      );
      particle.life = particle.maxLife;
    }
  }

  update(delta: number): void {
    this.particleData.forEach((particles, id) => {
      const geometry = this.geometries.get(id);
      const system = this.systems.get(id);
      
      if (!geometry || !system) return;

      const config = (system as THREE.Points & { _config: ParticleConfig })._config;
      const positions = geometry.attributes.position.array as Float32Array;

      particles.forEach((particle, i) => {
        if (particle.life > 0) {
          // Update velocity
          particle.velocity.y -= (config.gravity || 0) * delta;
          particle.velocity.multiplyScalar(config.friction || 0.98);

          // Update position
          particle.position.add(particle.velocity.clone().multiplyScalar(delta));
          
          // Update life
          particle.life -= delta;

          // Calculate opacity based on life
          let opacity = particle.opacity;
          if (config.fadeIn && config.fadeOut) {
            const lifeRatio = particle.life / particle.maxLife;
            opacity = Math.min(1 - lifeRatio, lifeRatio) * 2 * particle.opacity;
          } else if (config.fadeOut) {
            opacity = (particle.life / particle.maxLife) * particle.opacity;
          }

          // Update buffer
          positions[i * 3] = particle.position.x;
          positions[i * 3 + 1] = particle.position.y;
          positions[i * 3 + 2] = particle.position.z;
        }
      });

      geometry.attributes.position.needsUpdate = true;
    });
  }

  createExhaustEffect(id: string): THREE.Points {
    return this.createParticleSystem(id, {
      count: 200,
      size: 0.15,
      color: 0xff6633,
      opacity: 0.8,
      spread: 0.5,
      speed: 2,
      lifetime: 1.5,
      gravity: 0.5,
      friction: 0.95,
      fadeIn: true,
      fadeOut: true,
      blending: THREE.AdditiveBlending,
    });
  }

  createExplosionEffect(id: string): THREE.Points {
    return this.createParticleSystem(id, {
      count: 500,
      size: 0.3,
      color: 0xffaa33,
      opacity: 1,
      spread: 2,
      speed: 10,
      lifetime: 2,
      gravity: 2,
      friction: 0.9,
      fadeIn: true,
      fadeOut: true,
      blending: THREE.AdditiveBlending,
    });
  }

  createSparkleEffect(id: string): THREE.Points {
    return this.createParticleSystem(id, {
      count: 100,
      size: 0.1,
      color: 0xffffaa,
      opacity: 0.9,
      spread: 3,
      speed: 0.5,
      lifetime: 3,
      gravity: -0.2,
      friction: 0.99,
      fadeIn: true,
      fadeOut: true,
      blending: THREE.AdditiveBlending,
    });
  }

  createStarsEffect(id: string): THREE.Points {
    return this.createParticleSystem(id, {
      count: 300,
      size: 0.08,
      color: 0xffffff,
      opacity: 0.6,
      spread: 50,
      speed: 0.1,
      lifetime: 10,
      fadeIn: false,
      fadeOut: false,
      blending: THREE.AdditiveBlending,
    });
  }

  getSystem(id: string): THREE.Points | undefined {
    return this.systems.get(id);
  }

  setPosition(id: string, position: THREE.Vector3): void {
    const system = this.systems.get(id);
    if (system) {
      system.position.copy(position);
    }
  }

  dispose(id: string): void {
    const geometry = this.geometries.get(id);
    const material = this.materials.get(id);
    const system = this.systems.get(id);

    if (geometry) geometry.dispose();
    if (material) material.dispose();
    
    this.systems.delete(id);
    this.particleData.delete(id);
    this.geometries.delete(id);
    this.materials.delete(id);
  }

  disposeAll(): void {
    this.systems.forEach((_, id) => this.dispose(id));
  }
}

export const particleEffects = ParticleEffectsClass.getInstance();