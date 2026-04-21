/**
 * Wheel3DScene - Ultra Premium 3D Casino Experience
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

// ============= ULTRA PREMIUM WHEEL =============
function UltraWheel({ 
  segments, 
  spinning, 
  rotation 
}: { 
  segments: Array<{ label: string; color: string; multiplier: number }>;
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

  const segmentAngle = (Math.PI * 2) / segments.length;

  return (
    <group ref={wheelRef}>
      {/* Wheel base */}
      <mesh castShadow>
        <cylinderGeometry args={[3, 3, 0.3, 64]} />
        <meshStandardMaterial 
          color="#1a1a2e"
          metalness={0.9}
          roughness={0.15}
          emissive="#0a0a1e"
          emissiveIntensity={0.3}
        />
      </mesh>
      
      {/* Wheel rim */}
      <mesh position={[0, 0.2, 0]} castShadow>
        <torusGeometry args={[3, 0.15, 16, 64]} />
        <meshStandardMaterial 
          color="#ffd700"
          metalness={1}
          roughness={0.1}
          emissive="#ffd700"
          emissiveIntensity={0.5}
        />
      </mesh>
      
      {/* Segments */}
      {segments.map((segment, i) => {
        const angle = i * segmentAngle;
        const halfAngle = segmentAngle / 2;
        
        return (
          <group key={i} rotation={[0, -angle, 0]}>
            {/* Segment */}
            <mesh position={[Math.cos(halfAngle) * 1.5, 0.16, Math.sin(halfAngle) * 1.5]} castShadow>
              <boxGeometry args={[2.2, 0.1, 0.8]} />
              <meshStandardMaterial 
                color={segment.color}
                metalness={0.7}
                roughness={0.3}
                emissive={segment.color}
                emissiveIntensity={0.3}
              />
            </mesh>
            
            {/* Segment border */}
            <mesh position={[Math.cos(0) * 2.95, 0.18, Math.sin(0) * 2.95]}>
              <boxGeometry args={[0.05, 0.12, 0.6]} />
              <meshStandardMaterial color="#ffd700" metalness={1} roughness={0.1} />
            </mesh>
            
            {/* Label */}
            <Billboard position={[Math.cos(halfAngle) * 2, 0.3, Math.sin(halfAngle) * 2]}>
              <Text
                fontSize={0.25}
                color="#ffffff"
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.02}
                outlineColor="#000000"
                fontWeight="bold"
              >
                {segment.multiplier}x
              </Text>
            </Billboard>
          </group>
        );
      })}
      
      {/* Center hub */}
      <mesh position={[0, 0.25, 0]} castShadow>
        <cylinderGeometry args={[0.4, 0.4, 0.3, 32]} />
        <meshStandardMaterial 
          color="#ffd700"
          metalness={1}
          roughness={0.1}
          emissive="#ffd700"
          emissiveIntensity={0.5}
        />
      </mesh>
      
      {/* Center gem */}
      <mesh position={[0, 0.45, 0]}>
        <octahedronGeometry args={[0.25, 2]} />
        <MeshTransmissionMaterial
          backside
          samples={16}
          thickness={0.3}
          chromaticAberration={0.2}
          transmission={0.95}
          color="#ff00ff"
          roughness={0.05}
        />
      </mesh>
      
      {/* Hub glow */}
      <pointLight ref={glowRef} position={[0, 0.5, 0]} color="#ff00ff" intensity={3} distance={4} />
      
      {/* Decorative lights */}
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(angle) * 3.2, 0.25, Math.sin(angle) * 3.2]}>
            <sphereGeometry args={[0.06, 12, 12]} />
            <meshStandardMaterial 
              color="#ff00ff"
              emissive="#ff00ff"
              emissiveIntensity={3}
            />
          </mesh>
        );
      })}
    </group>
  );
}

// ============= ULTRA PREMIUM POINTER =============
function UltraPointer() {
  const pointerRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (pointerRef.current) {
      pointerRef.current.position.y = 3.5 + Math.sin(state.clock.elapsedTime * 3) * 0.05;
    }
  });

  return (
    <group ref={pointerRef} position={[0, 3.5, 0]} rotation={[0, 0, Math.PI]}>
      {/* Pointer body */}
      <mesh castShadow>
        <coneGeometry args={[0.3, 0.8, 4]} />
        <meshStandardMaterial 
          color="#ffd700"
          metalness={1}
          roughness={0.1}
          emissive="#ffd700"
          emissiveIntensity={0.8}
        />
      </mesh>
      
      {/* Pointer glow */}
      <pointLight position={[0, -0.4, 0]} color="#ffd700" intensity={3} distance={3} />
      
      {/* Sparkles */}
      <Sparkles count={20} size={3} scale={[0.5, 0.5, 0.5]} speed={1.5} color="#ffd700" />
    </group>
  );
}

// ============= ULTRA PREMIUM GROUND =======
function UltraGround() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
        <planeGeometry args={[25, 25]} />
        <meshStandardMaterial 
          color="#0a0a18"
          metalness={0.9}
          roughness={0.2}
          emissive="#050510"
          emissiveIntensity={0.3}
        />
      </mesh>
      
      <gridHelper args={[25, 25, '#1a1a4a', '#0a0a2a']} position={[0, -0.48, 0]} />
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
  segments,
  spinning,
  rotation,
  onSpinEnd
}: { 
  segments: Array<{ label: string; color: string; multiplier: number }>;
  spinning?: boolean;
  rotation?: number;
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
      <UltraWheel segments={segments} spinning={spinning} rotation={rotation} />
      
      {/* ===== POINTER ===== */}
      <UltraPointer />
    </>
  );
}

// ============= MAIN EXPORT COMPONENT ============
interface Wheel3DSceneProps {
  segments?: Array<{ label: string; color: string; multiplier: number }>;
  spinning?: boolean;
  rotation?: number;
  onSpinEnd?: () => void;
  className?: string;
}

export default function Wheel3DScene({
  segments = [
    { label: '1x', color: '#ff0066', multiplier: 1 },
    { label: '2x', color: '#ff3399', multiplier: 2 },
    { label: '3x', color: '#ff66cc', multiplier: 3 },
    { label: '5x', color: '#ffd700', multiplier: 5 },
    { label: '10x', color: '#00ff88', multiplier: 10 },
    { label: '20x', color: '#00ffcc', multiplier: 20 },
    { label: '50x', color: '#ff6600', multiplier: 50 },
    { label: '100x', color: '#ff00ff', multiplier: 100 },
  ],
  spinning,
  rotation,
  onSpinEnd,
  className = ''
}: Wheel3DSceneProps) {
  return (
    <div className={`w-full h-full ${className}`}>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [0, 4, 6], fov: 50 }}
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
            segments={segments}
            spinning={spinning}
            rotation={rotation}
            onSpinEnd={onSpinEnd}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}