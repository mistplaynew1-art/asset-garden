/**
 * Aviator3DScene - Premium 3D Aviator Game with Real 3D Plane Model
 * Uses casino_plane3d.glb for the main plane
 * casino_spaceship3d.glb appears at X10+ multiplier
 */
import React, { useRef, useMemo, useCallback, Suspense, useState, useEffect, memo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { 
  Trail, Sparkles, Stars, Float, useGLTF, Environment
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
const MAX_TRAIL_LENGTH = 20;
const CRYSTAL_COUNT = 20;
const SPACESHIP_THRESHOLD = 10;

// ============= PRELOAD MODELS =============
useGLTF.preload('/models/casino_plane3d.glb');
useGLTF.preload('/models/casino_spaceship3d.glb');

// ============= SHARED GEOMETRY =============
const sharedCrystalGeometry = new THREE.OctahedronGeometry(1, 0);

// ============= MEMOIZED STARS =============
const MemoizedStars = memo(function MemoizedStars() {
  return (
    <Stars 
      radius={150} 
      depth={80} 
      count={5000} 
      factor={5} 
      saturation={0} 
      fade 
      speed={0.3} 
    />
  );
});

// ============= MEMOIZED GROUND =============
const MemoizedGround = memo(function MemoizedGround() {
  const gridRef = useRef<THREE.GridHelper>(null);
  
  useFrame((state) => {
    if (gridRef.current) {
      gridRef.current.position.x = state.camera.position.x * 0.3;
    }
  });

  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
        <planeGeometry args={[200, 60]} />
        <meshStandardMaterial color="#0a0a18" metalness={0.9} roughness={0.2} />
      </mesh>
      <gridHelper ref={gridRef} args={[200, 80, '#1a1a4a', '#0a0a2a']} position={[0, -0.48, 0]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.47, 0]}>
        <planeGeometry args={[200, 0.1]} />
        <meshBasicMaterial color="#00ffcc" transparent opacity={0.3} />
      </mesh>
    </>
  );
});

// ============= 3D PLANE MODEL =============
const PlaneModel = memo(function PlaneModel({ 
  phase 
}: { 
  phase: 'waiting' | 'running' | 'crashed' | 'cashed_out';
}) {
  const [error, setError] = useState(false);
  const { scene } = useGLTF('/models/casino_plane3d.glb') as any;
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
      modelRef.current.rotation.y = -Math.PI / 2;
      modelRef.current.scale.set(0.8, 0.8, 0.8);
      if (phase === 'running') {
        modelRef.current.position.y = Math.sin(state.clock.elapsedTime * 3) * 0.05;
      }
    }
  });
  
  if (error || !clonedScene) {
    // Fallback to procedural plane
    return (
      <group>
        <mesh castShadow>
          <capsuleGeometry args={[0.22, 0.9, 16, 32]} />
          <meshStandardMaterial 
            color="#e63946"
            metalness={0.95}
            roughness={0.05}
          />
        </mesh>
        <mesh position={[0, 0, 0.6]} castShadow>
          <boxGeometry args={[0.5, 0.03, 0.6]} />
          <meshStandardMaterial color="#f4a261" metalness={0.85} roughness={0.15} />
        </mesh>
        <mesh position={[0, 0, -0.6]} castShadow>
          <boxGeometry args={[0.5, 0.03, 0.6]} />
          <meshStandardMaterial color="#f4a261" metalness={0.85} roughness={0.15} />
        </mesh>
      </group>
    );
  }
  
  return (
    <group ref={modelRef}>
      <primitive object={clonedScene} />
    </group>
  );
});

// ============= SPACESHIP AT X10+ =============
const Spaceship = memo(function Spaceship({ visible }: { visible: boolean }) {
  const [error, setError] = useState(false);
  const { scene } = useGLTF('/models/casino_spaceship3d.glb') as any;
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
    if (!modelRef.current || !visible) return;
    
    const t = state.clock.elapsedTime;
    modelRef.current.position.x = -30 + ((t * 1.5) % 60);
    modelRef.current.position.y = 12 + Math.sin(t * 0.5) * 3;
    modelRef.current.position.z = -15;
    modelRef.current.rotation.y = Math.PI / 2;
    modelRef.current.scale.set(0.5, 0.5, 0.5);
  });
  
  if (!visible || error || !clonedScene) return null;
  
  return (
    <group ref={modelRef}>
      <primitive object={clonedScene} />
      <pointLight position={[-2, 0, 0]} color="#00ffff" intensity={5} distance={8} />
      <Sparkles count={30} size={5} position={[-2, 0, 0]} scale={[3, 2, 2]} speed={2} color="#00ffff" />
    </group>
  );
});

// ============= AIRPLANE CONTAINER =============
const Airplane = memo(function Airplane({ 
  multiplier, 
  phase,
  onPositionUpdate
}: { 
  multiplier: number; 
  phase: 'waiting' | 'running' | 'crashed' | 'cashed_out';
  onPositionUpdate?: (position: THREE.Vector3) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  
  const targetPosition = useMemo(() => {
    if (phase === 'waiting') return new THREE.Vector3(-4, 0.5, 0);
    if (phase === 'crashed' || phase === 'cashed_out') return new THREE.Vector3(10, 0.5, 0);
    const x = Math.min(multiplier * 2.5, 10);
    const y = 0.5 + Math.log(multiplier + 1) * 2;
    return new THREE.Vector3(x, y, 0);
  }, [multiplier, phase]);

  const targetRotation = useMemo(() => {
    if (phase === 'crashed') return Math.PI / 3;
    if (phase === 'waiting') return 0;
    return Math.max(-0.15, Math.min(0.25, Math.atan2(targetPosition.y - 0.5, targetPosition.x + 4) - 0.1));
  }, [targetPosition, phase]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    
    groupRef.current.position.lerp(targetPosition, delta * 4);
    groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, targetRotation, delta * 6);
    
    if (phase === 'running') {
      groupRef.current.position.y += Math.sin(state.clock.elapsedTime * 6) * 0.015;
    }
    
    onPositionUpdate?.(groupRef.current.position.clone());
  });

  return (
    <group ref={groupRef}>
      <Trail
        width={3}
        length={MAX_TRAIL_LENGTH}
        color={new THREE.Color(phase === 'crashed' ? '#ff3333' : '#00ffcc')}
        attenuation={(t) => t * t * t}
      >
        <mesh>
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshBasicMaterial color={phase === 'running' ? '#00ffcc' : '#ff6b35'} />
        </mesh>
      </Trail>
      
      <Float speed={3} rotationIntensity={phase === 'running' ? 0.15 : 0} floatIntensity={0.2}>
        <Suspense fallback={null}>
          <PlaneModel phase={phase} />
        </Suspense>
        
        {/* Engine glow when running */}
        {phase === 'running' && (
          <group>
            <pointLight position={[-0.5, 0, 0]} color="#ff6b35" intensity={5} distance={4} />
            <Sparkles count={80} size={4} position={[-0.8, 0, 0]} scale={[2, 1, 1]} speed={1.5} color="#ffcc00" />
          </group>
        )}
      </Float>
      
      {/* Phase effects */}
      {phase === 'crashed' && (
        <>
          <Sparkles count={250} size={8} position={[0, 0, 0]} scale={[6, 6, 6]} speed={4} color="#ff3333" />
          <Sparkles count={150} size={5} position={[0, 0, 0]} scale={[5, 5, 5]} speed={3} color="#ff6600" />
          <pointLight position={[0, 0, 0]} color="#ff4400" intensity={15} distance={15} />
        </>
      )}
      
      {phase === 'cashed_out' && (
        <>
          <Sparkles count={200} size={6} position={[0, 0, 0]} scale={[5, 5, 5]} speed={3} color="#ffd700" />
          <Sparkles count={100} size={4} position={[0, 0, 0]} scale={[4, 4, 4]} speed={2} color="#00ff88" />
          <pointLight position={[0, 0, 0]} color="#ffd700" intensity={8} distance={12} />
        </>
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
          (Math.random() - 0.5) * 40,
          Math.random() * 10 + 3,
          (Math.random() - 0.5) * 25 - 12,
        ],
        rotation: [
          Math.random() * Math.PI,
          Math.random() * Math.PI,
          Math.random() * Math.PI,
        ],
        scale: 0.1 + Math.random() * 0.2,
        color: ['#00ffcc', '#ff00ff', '#00ff88', '#ffcc00'][Math.floor(Math.random() * 4)],
      });
    }
    return result;
  }, []);

  return (
    <>
      {crystals.map((crystal, i) => (
        <Float key={i} speed={1 + Math.random()} rotationIntensity={0.5} floatIntensity={0.5}>
          <mesh 
            position={crystal.position} 
            rotation={crystal.rotation} 
            scale={crystal.scale}
            geometry={sharedCrystalGeometry}
          >
            <meshStandardMaterial 
              color={crystal.color}
              metalness={0.9}
              roughness={0.1}
              emissive={crystal.color}
              emissiveIntensity={0.5}
              transparent
              opacity={0.8}
            />
          </mesh>
        </Float>
      ))}
    </>
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
  const { camera } = useThree();
  const characterPosition = useRef(new THREE.Vector3());

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
  
  const showSpaceship = multiplier >= SPACESHIP_THRESHOLD && phase === 'running';

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.55} color="#5a6bb5" />
      <directionalLight
        position={[30, 40, 20]}
        intensity={1.8}
        color="#ffd9a8"
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <directionalLight position={[-30, 20, -20]} intensity={0.7} color="#5577ff" />
      <pointLight position={[0, 10, 5]} intensity={1.2} color="#4cc9f0" distance={30} />

      {/* Full Environment — sky, moon, clouds, mountains, city */}
      <SkyDome
        topColor="#0a0f2e"
        horizonColor="#3a1a4e"
        bottomColor="#060816"
        sunPosition={[0.35, 0.18]}
        sunColor="#ff8c44"
      />
      <Moon position={[70, 60, -140]} color="#f0f4ff" size={6} />
      <fog attach="fog" args={['#0a0f26', 40, 160]} />

      <MountainRange z={-95} color="#0a1230" width={280} height={30} />
      <MountainRange z={-70} color="#0d1738" width={250} height={22} />
      <CityScape count={36} spread={200} depthStart={-45} depthEnd={-90} />
      <VolumetricClouds count={16} spreadX={220} spreadZ={70} y={28} speed={0.8} />

      <GroundPlane color="#0a0a18" size={300} gridColor1="#1a1a4a" gridColor2="#0a0a2a" />

      {/* Spaceship at X10+ */}
      <Suspense fallback={null}>
        <Spaceship visible={showSpaceship} />
      </Suspense>

      <Airplane multiplier={multiplier} phase={phase} onPositionUpdate={handlePositionUpdate} />
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
        <capsuleGeometry args={[0.22, 0.9, 16, 32]} />
        <meshStandardMaterial color="#e63946" metalness={0.9} roughness={0.1} />
      </mesh>
      {/* Progress indicator */}
      <mesh position={[0, -1.5, 0]}>
        <boxGeometry args={[2, 0.1, 0.1]} />
        <meshBasicMaterial color="#333333" />
      </mesh>
      <mesh position={[-1 + (progress / 100) * 2, -1.5, 0]}>
        <boxGeometry args={[progress / 50, 0.08, 0.08]} />
        <meshBasicMaterial color="#00ffcc" />
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
    console.error('Aviator3DScene Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-[#020208]">
          <div className="text-center">
            <div className="text-4xl mb-4">✈️</div>
            <div className="text-white text-lg">Loading Aviator...</div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ============= MAIN EXPORT ============
interface Aviator3DSceneProps {
  multiplier: number;
  phase: 'waiting' | 'running' | 'crashed' | 'cashed_out';
  className?: string;
  /** Optional skin — currently visual-only, accepted so callers can pass it without TS errors. */
  characterType?: 'airplane' | 'astronaut';
}

export default function Aviator3DScene({ multiplier, phase, className = '' }: Aviator3DSceneProps) {
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
      <div className={`w-full h-full ${className} bg-gradient-to-br from-[#020208] via-[#0a0a1a] to-[#020208] flex items-center justify-center`}>
        <div className="text-center">
          <div className="text-6xl mb-6 animate-bounce">✈️</div>
          <div className="text-white text-xl font-bold mb-4">Aviator</div>
          {/* Progress bar */}
          <div className="w-64 h-2 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full transition-all duration-300"
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
          camera={{ position: [0, 3, 5], fov: 55 }}
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