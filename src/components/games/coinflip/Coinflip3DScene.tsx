/**
 * Coinflip3DScene - Ultra Premium 3D Casino Experience
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
    particlesRef.current.rotation.y += delta * 0.8;
    particlesRef.current.rotation.x += delta * 0.4;
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

// ============= ULTRA PREMIUM COIN =============
function UltraCoin({ 
  position, 
  flipping, 
  result 
}: { 
  position: [number, number, number]; 
  flipping?: boolean;
  result?: 'heads' | 'tails';
}) {
  const meshRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.PointLight>(null);

  useFrame((state) => {
    if (meshRef.current) {
      if (flipping) {
        meshRef.current.rotation.x += 0.3;
        meshRef.current.rotation.y += 0.2;
        meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 10) * 0.5;
      } else {
        meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.02;
      }
    }
    if (glowRef.current) {
      glowRef.current.intensity = 2 + Math.sin(state.clock.elapsedTime * 6) * 0.8;
    }
  });

  return (
    <group position={position}>
      <Float speed={2} rotationIntensity={flipping ? 0.5 : 0} floatIntensity={0.1}>
        <group ref={meshRef}>
          {/* Coin body */}
          <mesh castShadow>
            <cylinderGeometry args={[0.8, 0.8, 0.1, 64]} />
            <meshStandardMaterial 
              color="#ffd700"
              metalness={1}
              roughness={0.05}
              emissive="#ffd700"
              emissiveIntensity={0.5}
            />
          </mesh>
          
          {/* Coin edge */}
          <mesh>
            <torusGeometry args={[0.8, 0.05, 16, 64]} />
            <meshStandardMaterial 
              color="#ffcc00"
              metalness={1}
              roughness={0.1}
              emissive="#ffcc00"
              emissiveIntensity={0.3}
            />
          </mesh>
          
          {/* Heads side */}
          <mesh position={[0, 0.06, 0]} rotation={[0, 0, 0]}>
            <circleGeometry args={[0.6, 32]} />
            <meshStandardMaterial 
              color="#1a1a3e"
              metalness={0.9}
              roughness={0.2}
            />
          </mesh>
          
          {/* Tails side */}
          <mesh position={[0, -0.06, 0]} rotation={[Math.PI, 0, 0]}>
            <circleGeometry args={[0.6, 32]} />
            <meshStandardMaterial 
              color="#1a1a3e"
              metalness={0.9}
              roughness={0.2}
            />
          </mesh>
          
          {/* Crown symbol on heads */}
          <mesh position={[0, 0.07, 0]}>
            <coneGeometry args={[0.15, 0.2, 4]} />
            <meshStandardMaterial 
              color="#ffd700"
              emissive="#ffd700"
              emissiveIntensity={0.8}
            />
          </mesh>
          
          {/* Star symbol on tails */}
          <mesh position={[0, -0.07, 0]} rotation={[Math.PI, 0, 0]}>
            <octahedronGeometry args={[0.12, 0]} />
            <meshStandardMaterial 
              color="#ffd700"
              emissive="#ffd700"
              emissiveIntensity={0.8}
            />
          </mesh>
        </group>
      </Float>
      
      {/* Coin glow */}
      <pointLight ref={glowRef} position={[0, 0, 0]} color="#ffd700" intensity={2} distance={3} />
      
      {/* Sparkles */}
      {flipping && (
        <>
          <Sparkles count={40} size={3} scale={[1, 1, 1]} speed={2} color="#ffd700" />
          <Trail width={1.5} length={10} color={new THREE.Color('#ffd700')} attenuation={(t) => t * t}>
            <mesh>
              <sphereGeometry args={[0.1]} />
              <meshBasicMaterial color="#ffd700" />
            </mesh>
          </Trail>
        </>
      )}
    </group>
  );
}

// ============= ULTRA PREMIUM GROUND =======
function UltraGround() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
        <planeGeometry args={[15, 15]} />
        <meshStandardMaterial 
          color="#0a0a18"
          metalness={0.9}
          roughness={0.2}
          emissive="#050510"
          emissiveIntensity={0.3}
        />
      </mesh>
      
      <gridHelper args={[15, 15, '#1a1a4a', '#0a0a2a']} position={[0, -0.48, 0]} />
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
  flipping,
  result,
  onFlipEnd
}: { 
  flipping?: boolean;
  result?: 'heads' | 'tails';
  onFlipEnd?: () => void;
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
      <pointLight position={[0, 10, 8]} intensity={2.5} color="#ffd700" distance={35} />
      <pointLight position={[8, 6, 5]} intensity={2} color="#ff00ff" distance={30} />
      <pointLight position={[-8, 6, 5]} intensity={2} color="#00ffff" distance={30} />
      
      {/* ===== ENVIRONMENT ===== */}
      <color attach="background" args={['#020208']} />
      <fog attach="fog" args={['#020208', 12, 50]} />
      
      {/* ===== SCENE ELEMENTS ===== */}
      <UltraSkyBackground />
      <UltraGround />
      
      {/* ===== COIN ===== */}
      <UltraCoin position={[0, 0, 0]} flipping={flipping} result={result} />
    </>
  );
}

// ============= MAIN EXPORT COMPONENT ============
interface Coinflip3DSceneProps {
  flipping?: boolean;
  result?: 'heads' | 'tails';
  onFlipEnd?: () => void;
  className?: string;
}

export default function Coinflip3DScene({
  flipping,
  result,
  onFlipEnd,
  className = ''
}: Coinflip3DSceneProps) {
  return (
    <div className={`w-full h-full ${className}`}>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [0, 2, 4], fov: 50 }}
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
            flipping={flipping}
            result={result}
            onFlipEnd={onFlipEnd}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}