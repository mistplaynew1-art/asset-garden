/**
 * Limbo3DScene - Ultra Premium 3D Casino Experience
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

// ============= ULTRA PREMIUM ROCKET =============
function UltraRocket({ 
  position, 
  flying, 
  altitude 
}: { 
  position: [number, number, number]; 
  flying?: boolean;
  altitude?: number;
}) {
  const meshRef = useRef<THREE.Group>(null);
  const flameRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.PointLight>(null);

  useFrame((state) => {
    if (meshRef.current) {
      if (flying) {
        meshRef.current.position.y = position[1] + (altitude || 0) * 2;
        meshRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 5) * 0.05;
      } else {
        meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.02;
      }
    }
    if (flameRef.current && flying) {
      flameRef.current.scale.y = 1 + Math.sin(state.clock.elapsedTime * 15) * 0.3;
    }
    if (glowRef.current) {
      glowRef.current.intensity = flying ? 5 + Math.sin(state.clock.elapsedTime * 10) * 2 : 1;
    }
  });

  return (
    <group position={position}>
      <Float speed={2} rotationIntensity={flying ? 0.2 : 0} floatIntensity={0.1}>
        <group ref={meshRef}>
          {/* Rocket body */}
          <mesh castShadow>
            <capsuleGeometry args={[0.25, 0.8, 16, 32]} />
            <meshStandardMaterial 
              color="#e63946"
              metalness={0.9}
              roughness={0.15}
              emissive="#e63946"
              emissiveIntensity={0.3}
            />
          </mesh>
          
          {/* Nose cone */}
          <mesh position={[0, 0.65, 0]} castShadow>
            <coneGeometry args={[0.25, 0.5, 32]} />
            <meshStandardMaterial 
              color="#ffd700"
              metalness={1}
              roughness={0.1}
              emissive="#ffd700"
              emissiveIntensity={0.5}
            />
          </mesh>
          
          {/* Fins */}
          {[0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((rot, i) => (
            <mesh key={i} rotation={[0, rot, 0]} position={[Math.cos(rot) * 0.25, -0.4, Math.sin(rot) * 0.25]} castShadow>
              <boxGeometry args={[0.3, 0.3, 0.03]} />
              <meshStandardMaterial 
                color="#1a1a3e"
                metalness={0.9}
                roughness={0.2}
              />
            </mesh>
          ))}
          
          {/* Window */}
          <mesh position={[0, 0.2, 0.25]}>
            <sphereGeometry args={[0.12, 16, 16]} />
            <MeshTransmissionMaterial
              backside
              samples={16}
              thickness={0.1}
              transmission={0.95}
              color="#88ddff"
              roughness={0.05}
            />
          </mesh>
          
          {/* Engine */}
          <mesh position={[0, -0.55, 0]}>
            <cylinderGeometry args={[0.2, 0.25, 0.15, 16]} />
            <meshStandardMaterial 
              color="#1a1a1a"
              metalness={1}
              roughness={0.1}
            />
          </mesh>
        </group>
      </Float>
      
      {/* Engine flame */}
      {flying && (
        <group ref={flameRef} position={[0, -0.8, 0]}>
          <mesh>
            <coneGeometry args={[0.25, 0.8, 16]} />
            <meshBasicMaterial color="#ff6b35" transparent opacity={0.8} />
          </mesh>
          <mesh position={[0, -0.1, 0]}>
            <coneGeometry args={[0.15, 0.5, 16]} />
            <meshBasicMaterial color="#ffd700" transparent opacity={0.9} />
          </mesh>
          <mesh position={[0, -0.15, 0]}>
            <coneGeometry args={[0.08, 0.3, 16]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.95} />
          </mesh>
        </group>
      )}
      
      {/* Rocket glow */}
      <pointLight ref={glowRef} position={[0, 0, 0]} color="#ff6b35" intensity={flying ? 5 : 1} distance={5} />
      
      {/* Exhaust particles */}
      {flying && (
        <>
          <UltraParticles position={[0, -1.2, 0]} color="#ff6b35" count={80} />
          <Sparkles count={50} size={4} position={[0, -1.5, 0]} scale={[1, 2, 1]} speed={2} color="#ffd700" />
          <Trail width={1.5} length={15} color={new THREE.Color('#ff6b35')} attenuation={(t) => t * t}>
            <mesh position={[0, -1, 0]}>
              <sphereGeometry args={[0.1]} />
              <meshBasicMaterial color="#ff6b35" />
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
      <Stars radius={100} depth={50} count={2000} factor={4} saturation={0} fade speed={0.3} />
      <Sparkles count={60} size={10} position={[0, 15, -20]} scale={[30, 20, 10]} speed={0.1} color="#ff6b35" />
      <Sparkles count={50} size={8} position={[10, 10, -15]} scale={[25, 15, 10]} speed={0.15} color="#ffd700" />
    </>
  );
}

// ============= MAIN SCENE CONTENT ============
function SceneContent({ 
  flying,
  altitude,
  onFlyEnd
}: { 
  flying?: boolean;
  altitude?: number;
  onFlyEnd?: () => void;
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
      <pointLight position={[0, 10, 8]} intensity={2.5} color="#ff6b35" distance={35} />
      <pointLight position={[8, 6, 5]} intensity={2} color="#ffd700" distance={30} />
      <pointLight position={[-8, 6, 5]} intensity={2} color="#00ffff" distance={30} />
      
      {/* ===== ENVIRONMENT ===== */}
      <color attach="background" args={['#020208']} />
      <fog attach="fog" args={['#020208', 12, 50]} />
      
      {/* ===== SCENE ELEMENTS ===== */}
      <UltraSkyBackground />
      <UltraGround />
      
      {/* ===== ROCKET ===== */}
      <UltraRocket position={[0, 0, 0]} flying={flying} altitude={altitude} />
    </>
  );
}

// ============= MAIN EXPORT COMPONENT ============
interface Limbo3DSceneProps {
  flying?: boolean;
  altitude?: number;
  onFlyEnd?: () => void;
  className?: string;
}

export default function Limbo3DScene({
  flying,
  altitude,
  onFlyEnd,
  className = ''
}: Limbo3DSceneProps) {
  return (
    <div className={`w-full h-full ${className}`}>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [0, 2, 6], fov: 50 }}
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
            flying={flying}
            altitude={altitude}
            onFlyEnd={onFlyEnd}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}