/**
 * Roulette3DScene - Ultra Premium 3D Casino Experience
 * Hollywood-quality visuals, particle systems, and animations
 * Better than official by hundreds of times
 */
import React, { useRef, useMemo, useState, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { 
  Sparkles, Stars, Float, Trail, MeshTransmissionMaterial, 
  Text, Billboard
} from '@react-three/drei';
import * as THREE from 'three';

// ============= ULTRA PREMIUM PARTICLE SYSTEM =============
function UltraParticles({ position, color, count = 150 }: { position: [number, number, number]; color: string; count?: number }) {
  const particlesRef = useRef<THREE.Points>(null);
  const particleCount = count;
  
  const positions = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 2;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 2;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 2;
    }
    return pos;
  }, []);

  const colors = useMemo(() => {
    const cols = new Float32Array(particleCount * 3);
    const baseColor = new THREE.Color(color);
    for (let i = 0; i < particleCount; i++) {
      const variation = 0.5 + Math.random() * 0.5;
      cols[i * 3] = baseColor.r * variation;
      cols[i * 3 + 1] = baseColor.g * variation;
      cols[i * 3 + 2] = baseColor.b * variation;
    }
    return cols;
  }, [color]);

  useFrame((state, delta) => {
    if (!particlesRef.current) return;
    particlesRef.current.rotation.y += delta * 0.5;
  });

  return (
    <points ref={particlesRef} position={position}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={particleCount} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={particleCount} array={colors} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.05} vertexColors transparent opacity={0.9} sizeAttenuation blending={THREE.AdditiveBlending} />
    </points>
  );
}

// ============= ULTRA PREMIUM ROULETTE WHEEL =============
function UltraRouletteWheel({ 
  spinning, 
  rotation 
}: { 
  spinning?: boolean;
  rotation?: number;
}) {
  const wheelRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.PointLight>(null);

  useFrame((state) => {
    if (wheelRef.current) {
      wheelRef.current.rotation.y = rotation || 0;
    }
    if (glowRef.current) {
      glowRef.current.intensity = 3 + Math.sin(state.clock.elapsedTime * 6) * 1;
    }
  });

  // Generate wheel segments
  const segments = useMemo(() => {
    const result: Array<{
      number: number;
      angle: number;
      color: string;
    }> = [];
    const numbers = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
    const segmentAngle = (Math.PI * 2) / numbers.length;
    
    for (let i = 0; i < numbers.length; i++) {
      const isRed = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36].includes(numbers[i]);
      const isGreen = numbers[i] === 0;
      
      result.push({
        number: numbers[i],
        angle: i * segmentAngle,
        color: isGreen ? '#00ff88' : isRed ? '#ff0044' : '#1a1a1a'
      });
    }
    return result;
  }, []);

  return (
    <group ref={wheelRef}>
      {/* Wheel base */}
      <mesh castShadow>
        <cylinderGeometry args={[2.5, 2.5, 0.2, 64]} />
        <meshStandardMaterial 
          color="#1a1a2e"
          metalness={0.95}
          roughness={0.15}
          emissive="#0a0a1e"
          emissiveIntensity={0.3}
        />
      </mesh>
      
      {/* Wheel rim */}
      <mesh position={[0, 0.15, 0]} castShadow>
        <torusGeometry args={[2.5, 0.12, 16, 64]} />
        <meshStandardMaterial 
          color="#ffd700"
          metalness={1}
          roughness={0.1}
          emissive="#ffd700"
          emissiveIntensity={0.5}
        />
      </mesh>
      
      {/* Wheel pockets */}
      {segments.map((seg, i) => {
        const x = Math.cos(seg.angle) * 2;
        const z = Math.sin(seg.angle) * 2;
        
        return (
          <group key={i} rotation={[0, -seg.angle, 0]}>
            <mesh position={[x, 0.12, z]} castShadow>
              <boxGeometry args={[0.35, 0.08, 0.15]} />
              <meshStandardMaterial 
                color={seg.color}
                metalness={0.7}
                roughness={0.3}
                emissive={seg.color}
                emissiveIntensity={seg.number === 0 ? 0.5 : 0.2}
              />
            </mesh>
            
            {/* Number label */}
            <Billboard position={[x * 0.95, 0.2, z * 0.95]}>
              <Text
                fontSize={0.15}
                color="#ffffff"
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.01}
                outlineColor="#000000"
                fontWeight="bold"
              >
                {seg.number}
              </Text>
            </Billboard>
          </group>
        );
      })}
      
      {/* Center hub */}
      <mesh position={[0, 0.2, 0]} castShadow>
        <cylinderGeometry args={[0.6, 0.6, 0.25, 32]} />
        <meshStandardMaterial 
          color="#ffd700"
          metalness={1}
          roughness={0.1}
          emissive="#ffd700"
          emissiveIntensity={0.5}
        />
      </mesh>
      
      {/* Center diamond */}
      <mesh position={[0, 0.4, 0]}>
        <octahedronGeometry args={[0.2, 2]} />
        <MeshTransmissionMaterial
          backside
          samples={16}
          thickness={0.2}
          transmission={0.95}
          color="#ff00ff"
          roughness={0.05}
        />
      </mesh>
      
      {/* Hub glow */}
      <pointLight ref={glowRef} position={[0, 0.5, 0]} color="#ff00ff" intensity={3} distance={4} />
      
      {/* Decorative lights */}
      {Array.from({ length: 16 }).map((_, i) => {
        const angle = (i / 16) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(angle) * 2.65, 0.18, Math.sin(angle) * 2.65]}>
            <sphereGeometry args={[0.04, 12, 12]} />
            <meshStandardMaterial 
              color="#ffd700"
              emissive="#ffd700"
              emissiveIntensity={3}
            />
          </mesh>
        );
      })}
    </group>
  );
}

// ============= ULTRA PREMIUM BALL =============
function UltraBall({ 
  position, 
  spinning 
}: { 
  position: [number, number, number];
  spinning?: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current && spinning) {
      meshRef.current.position.x = Math.cos(state.clock.elapsedTime * 8) * 2;
      meshRef.current.position.z = Math.sin(state.clock.elapsedTime * 8) * 2;
    }
  });

  return (
    <group position={position}>
      <mesh ref={meshRef} castShadow>
        <sphereGeometry args={[0.12, 32, 32]} />
        <meshStandardMaterial 
          color="#ffffff"
          metalness={1}
          roughness={0.05}
          emissive="#ffffff"
          emissiveIntensity={0.5}
        />
      </mesh>
      
      <Trail width={0.5} length={10} color={new THREE.Color('#ffffff')} attenuation={(t) => t * t}>
        <mesh>
          <sphereGeometry args={[0.05]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      </Trail>
    </group>
  );
}

// ============= ULTRA PREMIUM GROUND =======
function UltraGround() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial 
          color="#0a0a18"
          metalness={0.9}
          roughness={0.2}
          emissive="#050510"
          emissiveIntensity={0.3}
        />
      </mesh>
      
      <gridHelper args={[20, 20, '#1a1a4a', '#0a0a2a']} position={[0, -0.48, 0]} />
    </>
  );
}

// ============= ULTRA PREMIUM SKY BACKGROUND ============
function UltraSkyBackground() {
  return (
    <>
      <Stars radius={80} depth={40} count={1500} factor={4} saturation={0} fade speed={0.3} />
      <Sparkles count={50} size={8} position={[0, 10, -15]} scale={[25, 18, 10]} speed={0.1} color="#ff00ff" />
      <Sparkles count={40} size={6} position={[8, 8, -12]} scale={[20, 12, 10]} speed={0.15} color="#ffd700" />
    </>
  );
}

// ============= MAIN SCENE CONTENT ============
function SceneContent({ 
  spinning,
  rotation,
  ballPosition,
  onSpinEnd
}: { 
  spinning?: boolean;
  rotation?: number;
  ballPosition?: [number, number, number];
  onSpinEnd?: () => void;
}) {
  return (
    <>
      {/* ===== ULTRA PREMIUM LIGHTING ===== */}
      <ambientLight intensity={0.45} color="#5577cc" />
      
      <directionalLight 
        position={[10, 20, 10]} 
        intensity={2.2} 
        color="#ffffff" 
        castShadow 
        shadow-mapSize={[4096, 4096]}
      />
      
      <directionalLight position={[-10, 10, -10]} intensity={0.9} color="#ff8844" />
      <pointLight position={[0, 10, 8]} intensity={2.5} color="#ff00ff" distance={35} />
      <pointLight position={[8, 6, 5]} intensity={2} color="#ffd700" distance={30} />
      <pointLight position={[-8, 6, 5]} intensity={2} color="#00ffff" distance={30} />
      
      {/* ===== ENVIRONMENT ===== */}
      <color attach="background" args={['#020208']} />
      <fog attach="fog" args={['#020208', 12, 50]} />
      
      {/* ===== SCENE ELEMENTS ===== */}
      <UltraSkyBackground />
      <UltraGround />
      
      {/* ===== WHEEL ===== */}
      <UltraRouletteWheel spinning={spinning} rotation={rotation} />
      
      {/* ===== BALL ===== */}
      <UltraBall position={ballPosition || [2, 0.3, 0]} spinning={spinning} />
    </>
  );
}

// ============= MAIN EXPORT COMPONENT ============
interface Roulette3DSceneProps {
  spinning?: boolean;
  rotation?: number;
  ballPosition?: [number, number, number];
  onSpinEnd?: () => void;
  className?: string;
}

export default function Roulette3DScene({
  spinning,
  rotation,
  ballPosition,
  onSpinEnd,
  className = ''
}: Roulette3DSceneProps) {
  return (
    <div className={`w-full h-full ${className}`}>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [0, 3, 5], fov: 50 }}
        gl={{ 
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2
        }}
      >
        <Suspense fallback={null}>
          <SceneContent 
            spinning={spinning}
            rotation={rotation}
            ballPosition={ballPosition}
            onSpinEnd={onSpinEnd}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}