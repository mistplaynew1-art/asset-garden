/**
 * Jetpack3DScene - Premium 3D Jetpack Game with Real 3D Model
 * Uses jetpack_man3d.glb for the character
 * Fire animation tied to flying state - fire when flying, stop when stopped, fall animation
 */
import React, { useRef, useMemo, useCallback, Suspense, useState, useEffect, memo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { 
  Trail, Sparkles, Stars, Float, useGLTF
} from '@react-three/drei';
import * as THREE from 'three';
import {
  SkyDome,
  Moon,
  VolumetricClouds,
  MountainRange,
  CityScape,
  GroundPlane,
} from '../shared/Environment3D';

// ============= CONSTANTS =============
const MAX_TRAIL_LENGTH = 25;
const CRYSTAL_COUNT = 15;

// ============= PRELOAD MODEL =============
useGLTF.preload('/models/jetpack_man3d.glb');

// ============= SHARED GEOMETRY =============
const sharedParticleGeometry = new THREE.SphereGeometry(0.04, 8, 8);
const sharedCrystalGeometry = new THREE.OctahedronGeometry(1, 0);

// ============= MEMOIZED STARS =============
const MemoizedStars = memo(function MemoizedStars() {
  return (
    <Stars 
      radius={100} 
      depth={50} 
      count={5000} 
      factor={4} 
      saturation={0} 
      fade 
      speed={0.5} 
    />
  );
});

// ============= MEMOIZED GROUND =============
const MemoizedGround = memo(function MemoizedGround() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial 
          color="#0a0a15" 
          metalness={0.8} 
          roughness={0.4}
        />
      </mesh>
      <gridHelper args={[200, 100, '#1a1a3a', '#0f0f2a']} position={[0, -0.49, 0]} />
    </>
  );
});

// ============= ANIMATED FIRE PARTICLE =============
const FireParticle = memo(function FireParticle({ 
  position, 
  delay = 0,
  color = '#ff6b35'
}: { 
  position: [number, number, number]; 
  delay?: number;
  color?: string;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (!meshRef.current) return;
    
    const t = state.clock.elapsedTime + delay;
    const scale = 0.8 + Math.sin(t * 15) * 0.3;
    meshRef.current.scale.setScalar(scale);
    meshRef.current.position.y = position[1] - Math.abs(Math.sin(t * 10)) * 0.08;
    
    // Color animation
    const material = meshRef.current.material as THREE.MeshBasicMaterial;
    const hue = 0.05 + Math.sin(t * 12) * 0.03;
    material.color.setHSL(hue, 1, 0.55);
  });
  
  return (
    <mesh ref={meshRef} position={position} geometry={sharedParticleGeometry}>
      <meshBasicMaterial color={color} transparent opacity={0.85} />
    </mesh>
  );
});

// ============= FIRE CONE =============
const FireCone = memo(function FireCone({ 
  position, 
  scale: baseScale = 1, 
  color = '#ff6b35'
}: { 
  position: [number, number, number]; 
  scale?: number; 
  color?: string;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (!meshRef.current) return;
    
    const t = state.clock.elapsedTime;
    const scaleMult = 0.9 + Math.sin(t * 18) * 0.15;
    meshRef.current.scale.set(baseScale * scaleMult, baseScale * (1 + Math.sin(t * 15) * 0.2), baseScale * scaleMult);
    meshRef.current.rotation.z = Math.sin(t * 10) * 0.15;
    
    const material = meshRef.current.material as THREE.MeshBasicMaterial;
    const hue = 0.03 + Math.sin(t * 12) * 0.04;
    material.color.setHSL(hue, 1, 0.55);
  });
  
  return (
    <mesh ref={meshRef} position={position}>
      <coneGeometry args={[0.12, 0.6, 12]} />
      <meshBasicMaterial color={color} transparent opacity={0.85} />
    </mesh>
  );
});

// ============= FIRE THRUSTER - TIED TO FLYING STATE =============
const FireThruster = memo(function FireThruster({ 
  position,
  isFlying,
  intensity = 1
}: { 
  position: [number, number, number];
  isFlying: boolean;
  intensity?: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const [visible, setVisible] = useState(false);
  
  useFrame((state) => {
    if (!groupRef.current) return;
    
    // Smooth visibility transition
    if (isFlying && !visible) {
      setVisible(true);
    }
    
    groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 5) * 0.05;
  });
  
  // Hide fire when not flying
  if (!isFlying) return null;
  
  return (
    <group ref={groupRef} position={position}>
      <FireCone position={[0, 0, 0]} scale={1 * intensity} color="#ff6b35" />
      <FireCone position={[0, 0.15, 0]} scale={0.7 * intensity} color="#ffcc00" />
      <FireCone position={[0, 0.25, 0]} scale={0.4 * intensity} color="#ffffff" />
      
      {Array.from({ length: 8 }).map((_, i) => (
        <FireParticle
          key={i}
          position={[
            (Math.random() - 0.5) * 0.12,
            -Math.random() * 0.25,
            (Math.random() - 0.5) * 0.12
          ]}
          delay={i * 0.5}
        />
      ))}
      
      <pointLight color="#ff6b35" intensity={8 * intensity} distance={3} />
      <pointLight position={[0, 0.2, 0]} color="#ffcc00" intensity={5 * intensity} distance={2} />
    </group>
  );
});

// ============= JETPACK 3D MODEL =============
const JetpackModel = memo(function JetpackModel({ 
  phase,
  isFlying
}: { 
  phase: 'waiting' | 'running' | 'crashed' | 'cashed_out';
  isFlying: boolean;
}) {
  const [error, setError] = useState(false);
  const { scene } = useGLTF('/models/jetpack_man3d.glb') as any;
  const modelRef = useRef<THREE.Group>(null);
  
  const clonedScene = useMemo(() => {
    try {
      if (!scene) return null;
      const clone = scene.clone(true);
      clone.traverse((child: any) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      return clone;
    } catch (e) {
      setError(true);
      return null;
    }
  }, [scene]);

  useFrame((state) => {
    if (modelRef.current) {
      modelRef.current.rotation.y = Math.PI;
      modelRef.current.scale.set(1, 1, 1);
      
      // Subtle hover animation when running
      if (phase === 'running') {
        modelRef.current.position.y = Math.sin(state.clock.elapsedTime * 8) * 0.02;
      }
      
      // Fall animation when crashed
      if (phase === 'crashed') {
        modelRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 3) * 0.3;
        modelRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 2) * 0.4;
      }
    }
  });
  
  if (error || !clonedScene) {
    // Fallback to simple box
    return (
      <mesh>
        <boxGeometry args={[0.5, 1, 0.5]} />
        <meshStandardMaterial color="#ff6b35" />
      </mesh>
    );
  }
  
  return (
    <group ref={modelRef}>
      <primitive object={clonedScene} />
      
      {/* Fire thrusters attached to the model - only visible when flying */}
      {isFlying && (
        <group>
          <FireThruster position={[-0.15, -0.9, 0]} isFlying={isFlying} intensity={1 + Math.random() * 0.2} />
          <FireThruster position={[0.15, -0.9, 0]} isFlying={isFlying} intensity={1 + Math.random() * 0.2} />
        </group>
      )}
    </group>
  );
});

// ============= JETPACK CHARACTER =============
const JetpackCharacter = memo(function JetpackCharacter({ 
  multiplier, 
  phase,
  onPositionUpdate
}: { 
  multiplier: number; 
  phase: 'waiting' | 'running' | 'crashed' | 'cashed_out';
  onPositionUpdate?: (position: THREE.Vector3) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  
  // Determine if flying (fire visible) - only when running
  const isFlying = phase === 'running';
  
  const targetPosition = useMemo(() => {
    if (phase === 'waiting') return new THREE.Vector3(-3, 1, 0);
    if (phase === 'crashed' || phase === 'cashed_out') return new THREE.Vector3(6, 0.5, 0);
    const x = Math.min(multiplier * 1.5, 6);
    const y = 1 + Math.log(multiplier + 1) * 2.2;
    return new THREE.Vector3(x, y, 0);
  }, [multiplier, phase]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    
    groupRef.current.position.lerp(targetPosition, delta * 3);
    
    if (phase === 'running') {
      groupRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 5) * 0.08;
      groupRef.current.position.y += Math.sin(state.clock.elapsedTime * 6) * 0.01;
    }
    
    // Fall animation when crashed
    if (phase === 'crashed') {
      groupRef.current.rotation.z += delta * 10;
      groupRef.current.position.y = Math.max(0.5, groupRef.current.position.y - delta * 2);
    }
    
    onPositionUpdate?.(groupRef.current.position.clone());
  });

  return (
    <group ref={groupRef}>
      <Trail 
        width={2.5} 
        length={MAX_TRAIL_LENGTH} 
        color={new THREE.Color('#ff6b35')} 
        attenuation={(t) => t * t * t}
      >
        <mesh position={[0, -0.8, 0]}>
          <sphereGeometry args={[0.08]} />
          <meshBasicMaterial color="#ff6b35" />
        </mesh>
      </Trail>
      
      <Float speed={2.5} rotationIntensity={phase === 'running' ? 0.15 : 0} floatIntensity={0.1}>
        <Suspense fallback={null}>
          <JetpackModel phase={phase} isFlying={isFlying} />
        </Suspense>
        
        {/* Sparkles when flying */}
        {isFlying && (
          <Sparkles count={40} size={4} position={[0, -1, 0]} scale={[1, 1.5, 0.8]} speed={3} color="#ffcc00" />
        )}
      </Float>
      
      {/* Crashed effects */}
      {phase === 'crashed' && (
        <group>
          <Sparkles count={200} size={8} position={[0, 0, 0]} scale={[6, 6, 6]} speed={4} color="#ff3333" />
          <pointLight position={[0, 0, 0]} color="#ff4400" intensity={15} distance={15} />
        </group>
      )}
      
      {/* Cashed out celebration */}
      {phase === 'cashed_out' && (
        <group>
          <Sparkles count={150} size={6} position={[0, 0, 0]} scale={[5, 5, 5]} speed={3} color="#ffd700" />
          <pointLight position={[0, 0, 0]} color="#ffd700" intensity={10} distance={12} />
        </group>
      )}
    </group>
  );
});

// ============= FLOATING CRYSTALS =============
const FloatingCrystals = memo(function FloatingCrystals() {
  const crystals = useMemo(() => {
    const result: Array<{
      position: [number, number, number];
      rotation: [number, number, number];
      scale: number;
      color: string;
    }> = [];
    for (let i = 0; i < CRYSTAL_COUNT; i++) {
      result.push({
        position: [
          (Math.random() - 0.5) * 30,
          Math.random() * 10 + 3,
          (Math.random() - 0.5) * 15 - 8,
        ],
        rotation: [
          Math.random() * Math.PI,
          Math.random() * Math.PI,
          Math.random() * Math.PI,
        ],
        scale: 0.15 + Math.random() * 0.25,
        color: ['#4cc9f0', '#ff00ff', '#00ff88'][Math.floor(Math.random() * 3)],
      });
    }
    return result;
  }, []);

  return (
    <group>
      {crystals.map((crystal, i) => (
        <Float key={i} speed={1.5} rotationIntensity={0.5} floatIntensity={0.5}>
          <mesh 
            position={crystal.position} 
            rotation={crystal.rotation} 
            scale={crystal.scale}
            geometry={sharedCrystalGeometry}
          >
            <meshStandardMaterial
              color={crystal.color}
              emissive={crystal.color}
              emissiveIntensity={0.6}
              metalness={0.9}
              roughness={0.1}
              transparent
              opacity={0.7}
            />
          </mesh>
        </Float>
      ))}
    </group>
  );
});

// ============= SCENE CONTENT =============
const SceneContent = memo(function SceneContent({ 
  multiplier, 
  phase 
}: { 
  multiplier: number; 
  phase: 'waiting' | 'running' | 'crashed' | 'cashed_out';
}) {
  const characterPosition = useRef(new THREE.Vector3(-3, 1, 0));
  const { camera } = useThree();

  // Camera follow
  useFrame((state, delta) => {
    const targetX = characterPosition.current.x + 4;
    const targetY = Math.max(3, characterPosition.current.y + 2);
    
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetX, delta * 3);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, delta * 3);
    camera.lookAt(characterPosition.current);
  });

  const handlePositionUpdate = useCallback((pos: THREE.Vector3) => {
    characterPosition.current.copy(pos);
  }, []);

  return (
    <>
      {/* Lighting — neon-city dusk */}
      <ambientLight intensity={0.45} color="#6a7fd0" />
      <directionalLight
        position={[25, 35, 15]}
        intensity={1.6}
        color="#ffb88a"
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <directionalLight position={[-25, 15, -15]} intensity={0.7} color="#6644ff" />
      <pointLight position={[0, 14, 6]} intensity={1.4} color="#4cc9f0" distance={30} />
      <pointLight position={[20, 6, 0]} intensity={1.1} color="#ff00ff" distance={25} />

      {/* Full Environment — neon night over a cyberpunk skyline */}
      <SkyDome
        topColor="#060616"
        horizonColor="#2a0f3e"
        bottomColor="#020208"
        sunPosition={[0.7, 0.12]}
        sunColor="#d14cff"
      />
      <Moon position={[-60, 55, -130]} color="#e8eeff" size={5.5} />
      <fog attach="fog" args={['#05061a', 25, 140]} />

      <MountainRange z={-100} color="#06091e" width={260} height={24} />
      <CityScape count={44} spread={180} depthStart={-30} depthEnd={-85} />
      <VolumetricClouds count={12} spreadX={200} spreadZ={60} y={26} speed={0.6} color="#d0c7ff" />

      <GroundPlane color="#060614" size={260} gridColor1="#261b4e" gridColor2="#0f0a2a" divisions={80} />

      <FloatingCrystals />

      <JetpackCharacter
        multiplier={multiplier}
        phase={phase}
        onPositionUpdate={handlePositionUpdate}
      />
    </>
  );
});

// ============= LOADING FALLBACK WITH PROGRESS =============
const LoadingFallback = memo(function LoadingFallback() {
  const [progress, setProgress] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(p => Math.min(p + Math.random() * 15, 100));
    }, 200);
    return () => clearInterval(interval);
  }, []);
  
  return (
    <group>
      <mesh>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshStandardMaterial color="#ff6b35" emissive="#ff6b35" emissiveIntensity={0.5} />
      </mesh>
      {/* Progress indicator */}
      <mesh position={[0, -1, 0]}>
        <boxGeometry args={[1.5, 0.08, 0.08]} />
        <meshBasicMaterial color="#333333" />
      </mesh>
      <mesh position={[-0.75 + (progress / 100) * 1.5, -1, 0]}>
        <boxGeometry args={[progress / 66.67, 0.06, 0.06]} />
        <meshBasicMaterial color="#ff6b35" />
      </mesh>
    </group>
  );
});

// ============= ERROR BOUNDARY =============
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Jetpack3DScene Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-[#030310]">
          <div className="text-center">
            <div className="text-4xl mb-4">🚀</div>
            <div className="text-white text-lg">Loading Jetpack...</div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ============= MAIN EXPORT ============
interface Jetpack3DSceneProps {
  multiplier: number;
  phase: 'waiting' | 'running' | 'crashed' | 'cashed_out';
  className?: string;
}

export default function Jetpack3DScene({ multiplier, phase, className = '' }: Jetpack3DSceneProps) {
  const [isClient, setIsClient] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [modelLoaded, setModelLoaded] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
    // Simulate loading progress
    const interval = setInterval(() => {
      setLoadProgress(p => {
        if (p >= 100) {
          clearInterval(interval);
          setModelLoaded(true);
          return 100;
        }
        return p + Math.random() * 20;
      });
    }, 150);
    return () => clearInterval(interval);
  }, []);
  
  if (!isClient || !modelLoaded) {
    return (
      <div className={`w-full h-full ${className} bg-gradient-to-br from-[#030310] via-[#0a0a1a] to-[#030310] flex items-center justify-center`}>
        <div className="text-center">
          <div className="text-6xl mb-6 animate-bounce">🚀</div>
          <div className="text-white text-xl font-bold mb-4">Jetpack</div>
          {/* Progress bar */}
          <div className="w-64 h-2 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-orange-400 to-red-500 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(loadProgress, 100)}%` }}
            />
          </div>
          <div className="text-white/60 text-sm mt-2">{Math.round(Math.min(loadProgress, 100))}% Loading...</div>
        </div>
      </div>
    );
  }
  
  return (
    <ErrorBoundary>
      <div className={`w-full h-full ${className}`}>
        <Canvas
          shadows
          dpr={[1, 2]}
          camera={{ position: [0, 3, 8], fov: 55 }}
          gl={{ 
            antialias: true, 
            alpha: true, 
            powerPreference: 'high-performance',
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.2
          }}
          performance={{ min: 0.5 }}
        >
          <Suspense fallback={<LoadingFallback />}>
            <SceneContent multiplier={multiplier} phase={phase} />
          </Suspense>
        </Canvas>
      </div>
    </ErrorBoundary>
  );
}