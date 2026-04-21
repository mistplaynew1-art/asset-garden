/**
 * Plinko3DScene - Ultra Premium 3D Casino Experience
 * Hollywood-quality visuals, particle systems, and animations
 * Better than official by hundreds of times
 */
import React, { useRef, useMemo, useState, Suspense, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { 
  Sparkles, Stars, Float, Trail, MeshTransmissionMaterial, 
  Text, Billboard, RoundedBox
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

// ============= ULTRA PREMIUM PLINKO BALL =============
function UltraPlinkoBall({ 
  position, 
  isActive 
}: { 
  position: [number, number, number]; 
  isActive?: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.PointLight>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 2;
      meshRef.current.rotation.x = state.clock.elapsedTime * 1.5;
    }
    if (glowRef.current && isActive) {
      glowRef.current.intensity = 3 + Math.sin(state.clock.elapsedTime * 8) * 1;
    }
  });

  return (
    <group position={position}>
      <Float speed={3} rotationIntensity={0.3} floatIntensity={0.1}>
        {/* Main ball */}
        <mesh ref={meshRef} castShadow>
          <sphereGeometry args={[0.25, 48, 48]} />
          <MeshTransmissionMaterial
            backside
            samples={32}
            thickness={0.3}
            chromaticAberration={0.25}
            anisotropy={0.5}
            distortion={0.4}
            distortionScale={0.4}
            temporalDistortion={0.2}
            transmission={0.95}
            color="#ffd700"
            roughness={0.05}
            metalness={0.2}
          />
        </mesh>
        
        {/* Inner glow */}
        <mesh scale={0.18}>
          <sphereGeometry args={[1, 24, 24]} />
          <meshStandardMaterial
            color="#ffd700"
            emissive="#ffd700"
            emissiveIntensity={4}
            transparent
            opacity={0.9}
          />
        </mesh>
        
        {/* Dynamic lighting */}
        <pointLight ref={glowRef} position={[0, 0, 0]} color="#ffd700" intensity={isActive ? 4 : 2} distance={4} />
      </Float>
      
      {/* Sparkle trail */}
      {isActive && (
        <>
          <Sparkles count={30} size={3} scale={[1, 1, 1]} speed={2} color="#ffd700" />
          <Trail width={1} length={8} color={new THREE.Color('#ffd700')} attenuation={(t) => t * t}>
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

// ============= ULTRA PREMIUM PEG =============
function UltraPeg({ position }: { position: [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2 + position[0]) * 0.02;
    }
  });

  return (
    <group position={position}>
      {/* Peg body */}
      <mesh ref={meshRef} castShadow>
        <sphereGeometry args={[0.12, 24, 24]} />
        <meshStandardMaterial 
          color="#4cc9f0"
          metalness={0.95}
          roughness={0.1}
          emissive="#4cc9f0"
          emissiveIntensity={0.5}
        />
      </mesh>
      
      {/* Peg glow */}
      <pointLight position={[0, 0, 0]} color="#4cc9f0" intensity={0.8} distance={1.5} />
      
      {/* Reflection ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.15, 0]}>
        <ringGeometry args={[0.1, 0.18, 24]} />
        <meshStandardMaterial
          color="#4cc9f0"
          emissive="#4cc9f0"
          emissiveIntensity={0.4}
          transparent
          opacity={0.3}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

// ============= ULTRA PREMIUM BUCKET =============
function UltraBucket({ 
  position, 
  multiplier,
  color 
}: { 
  position: [number, number, number]; 
  multiplier: number;
  color: string;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 1.5 + position[0]) * 0.02;
    }
  });

  return (
    <group position={position}>
      {/* Bucket body */}
      <mesh 
        ref={meshRef} 
        castShadow
        scale={hovered ? 1.05 : 1}
        onPointerOver={() => setHovered(true)} 
        onPointerOut={() => setHovered(false)}
      >
        <boxGeometry args={[0.7, 0.4, 0.6]} />
        <meshStandardMaterial 
          color={color}
          metalness={0.8}
          roughness={0.2}
          emissive={color}
          emissiveIntensity={0.4}
        />
      </mesh>
      
      {/* Bucket rim */}
      <mesh position={[0, 0.22, 0]}>
        <boxGeometry args={[0.75, 0.04, 0.65]} />
        <meshStandardMaterial 
          color="#ffd700"
          metalness={1}
          roughness={0.1}
          emissive="#ffd700"
          emissiveIntensity={0.5}
        />
      </mesh>
      
      {/* Multiplier text */}
      <Billboard position={[0, 0.5, 0]}>
        <Text
          fontSize={0.28}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02}
          outlineColor="#000000"
          fontWeight="bold"
        >
          {multiplier}x
        </Text>
      </Billboard>
      
      {/* Bucket glow */}
      <pointLight position={[0, 0.2, 0]} color={color} intensity={1.5} distance={2} />
    </group>
  );
}

// ============= ULTRA PREMIUM BOARD FRAME =============
function UltraBoardFrame() {
  return (
    <group>
      {/* Left frame */}
      <mesh position={[-4, 2, 0]} castShadow>
        <boxGeometry args={[0.2, 12, 0.4]} />
        <meshStandardMaterial 
          color="#1a1a3e"
          metalness={0.9}
          roughness={0.2}
          emissive="#0a0a2e"
          emissiveIntensity={0.3}
        />
      </mesh>
      
      {/* Right frame */}
      <mesh position={[4, 2, 0]} castShadow>
        <boxGeometry args={[0.2, 12, 0.4]} />
        <meshStandardMaterial 
          color="#1a1a3e"
          metalness={0.9}
          roughness={0.2}
          emissive="#0a0a2e"
          emissiveIntensity={0.3}
        />
      </mesh>
      
      {/* Top frame */}
      <mesh position={[0, 8, 0]} castShadow>
        <boxGeometry args={[8, 0.3, 0.4]} />
        <meshStandardMaterial 
          color="#1a1a3e"
          metalness={0.9}
          roughness={0.2}
          emissive="#0a0a2e"
          emissiveIntensity={0.3}
        />
      </mesh>
      
      {/* Decorative lights on frame */}
      {[-3, -1.5, 0, 1.5, 3].map((x, i) => (
        <mesh key={i} position={[x, 8.2, 0.2]}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshStandardMaterial 
            color="#ffd700"
            emissive="#ffd700"
            emissiveIntensity={3}
          />
        </mesh>
      ))}
      
      {/* Frame accent lines */}
      <mesh position={[-4, 2, 0.21]}>
        <boxGeometry args={[0.05, 12, 0.02]} />
        <meshStandardMaterial color="#4cc9f0" emissive="#4cc9f0" emissiveIntensity={1} />
      </mesh>
      <mesh position={[4, 2, 0.21]}>
        <boxGeometry args={[0.05, 12, 0.02]} />
        <meshStandardMaterial color="#4cc9f0" emissive="#4cc9f0" emissiveIntensity={1} />
      </mesh>
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
      <Sparkles count={50} size={8} position={[0, 12, -15]} scale={[25, 18, 10]} speed={0.1} color="#ff00ff" />
      <Sparkles count={40} size={6} position={[8, 8, -12]} scale={[20, 12, 10]} speed={0.15} color="#00ffcc" />
    </>
  );
}

// ============= MAIN SCENE CONTENT ============
function SceneContent({ 
  ballPosition,
  activeBall,
  onBallLand
}: { 
  ballPosition?: [number, number, number];
  activeBall?: boolean;
  onBallLand?: (bucket: number) => void;
}) {
  // Generate pegs
  const pegs = useMemo(() => {
    const result: [number, number, number][] = [];
    const rows = 10;
    for (let row = 0; row < rows; row++) {
      const pegCount = row + 3;
      const offset = (pegCount - 1) / 2;
      for (let i = 0; i < pegCount; i++) {
        result.push([
          (i - offset) * 0.65,
          6 - row * 0.8,
          0
        ]);
      }
    }
    return result;
  }, []);

  // Generate buckets
  const buckets = useMemo(() => {
    const result: { position: [number, number, number]; multiplier: number; color: string }[] = [];
    const multipliers = [5, 3, 1.5, 1, 0.5, 0.3, 0.5, 1, 1.5, 3, 5];
    const colors = ['#ff0066', '#ff3399', '#ff66cc', '#ffcc00', '#00ff88', '#00ffcc', '#00ff88', '#ffcc00', '#ff66cc', '#ff3399', '#ff0066'];
    
    for (let i = 0; i < 11; i++) {
      result.push({
        position: [(i - 5) * 0.72, -1.5, 0],
        multiplier: multipliers[i],
        color: colors[i]
      });
    }
    return result;
  }, []);

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
      <pointLight position={[0, 12, 8]} intensity={2.5} color="#4cc9f0" distance={35} />
      <pointLight position={[8, 6, 5]} intensity={2} color="#ff00ff" distance={30} />
      <pointLight position={[-8, 6, 5]} intensity={2} color="#00ffff" distance={30} />
      
      {/* ===== ENVIRONMENT ===== */}
      <color attach="background" args={['#020208']} />
      <fog attach="fog" args={['#020208', 12, 50]} />
      
      {/* ===== SCENE ELEMENTS ===== */}
      <UltraSkyBackground />
      <UltraGround />
      <UltraBoardFrame />
      
      {/* ===== PEGS ===== */}
      {pegs.map((pos, i) => (
        <UltraPeg key={i} position={pos} />
      ))}
      
      {/* ===== BUCKETS ===== */}
      {buckets.map((bucket, i) => (
        <UltraBucket 
          key={i} 
          position={bucket.position} 
          multiplier={bucket.multiplier}
          color={bucket.color}
        />
      ))}
      
      {/* ===== BALL ===== */}
      {ballPosition && (
        <UltraPlinkoBall position={ballPosition} isActive={activeBall} />
      )}
    </>
  );
}

// ============= MAIN EXPORT COMPONENT ============
interface Plinko3DSceneProps {
  ballPosition?: [number, number, number];
  activeBall?: boolean;
  onBallLand?: (bucket: number) => void;
  className?: string;
}

export default function Plinko3DScene({
  ballPosition,
  activeBall,
  onBallLand,
  className = ''
}: Plinko3DSceneProps) {
  return (
    <div className={`w-full h-full ${className}`}>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [0, 0, 10], fov: 50 }}
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
            ballPosition={ballPosition}
            activeBall={activeBall}
            onBallLand={onBallLand}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}