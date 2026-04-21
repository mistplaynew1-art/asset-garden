/**
 * Keno3DScene - Ultra Premium 3D Casino Experience
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

// ============= ULTRA PREMIUM KENO BALL =============
function UltraKenoBall({ 
  position, 
  number,
  selected,
  drawn,
  onClick 
}: { 
  position: [number, number, number]; 
  number: number;
  selected?: boolean;
  drawn?: boolean;
  onClick?: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.PointLight>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.5;
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2 + position[0]) * 0.02;
    }
    if (glowRef.current) {
      glowRef.current.intensity = selected ? 3 + Math.sin(state.clock.elapsedTime * 6) * 1 : 0.5;
    }
  });

  const color = drawn ? '#00ff88' : selected ? '#ffd700' : '#1a1a3e';

  return (
    <group position={position}>
      <Float speed={2} rotationIntensity={0.2} floatIntensity={0.1}>
        <mesh 
          ref={meshRef} 
          castShadow 
          scale={hovered ? 1.15 : 1}
          onPointerOver={() => setHovered(true)} 
          onPointerOut={() => setHovered(false)}
          onClick={onClick}
        >
          <sphereGeometry args={[0.35, 32, 32]} />
          <meshStandardMaterial 
            color={color}
            metalness={0.9}
            roughness={0.15}
            emissive={color}
            emissiveIntensity={selected ? 0.5 : 0.2}
          />
        </mesh>
        
        {/* Number display */}
        <Billboard position={[0, 0, 0]}>
          <Text
            fontSize={0.28}
            color={selected ? '#000000' : '#ffffff'}
            anchorX="center"
            anchorY="middle"
            outlineWidth={selected ? 0 : 0.02}
            outlineColor="#000000"
            fontWeight="bold"
          >
            {number}
          </Text>
        </Billboard>
      </Float>
      
      {/* Glow */}
      <pointLight ref={glowRef} position={[0, 0, 0]} color={color} intensity={selected ? 3 : 0.5} distance={2} />
      
      {/* Sparkles */}
      {drawn && (
        <Sparkles count={20} size={3} scale={[0.5, 0.5, 0.5]} speed={1.5} color="#00ff88" />
      )}
    </group>
  );
}

// ============= ULTRA PREMIUM KENO BOARD =============
function UltraKenoBoard({ 
  selectedNumbers,
  drawnNumbers,
  onNumberSelect 
}: { 
  selectedNumbers?: number[];
  drawnNumbers?: number[];
  onNumberSelect?: (num: number) => void;
}) {
  const balls = useMemo(() => {
    const result: Array<{
      number: number;
      position: [number, number, number];
      selected: boolean | undefined;
      drawn: boolean | undefined;
    }> = [];
    for (let i = 1; i <= 40; i++) {
      const row = Math.floor((i - 1) / 8);
      const col = (i - 1) % 8;
      result.push({
        number: i,
        position: [(col - 3.5) * 0.9, (2.5 - row) * 0.9, 0],
        selected: selectedNumbers?.includes(i),
        drawn: drawnNumbers?.includes(i)
      });
    }
    return result;
  }, [selectedNumbers, drawnNumbers]);

  return (
    <group>
      {/* Board background */}
      <mesh position={[0, 0, -0.2]} castShadow>
        <boxGeometry args={[8, 6, 0.3]} />
        <meshStandardMaterial 
          color="#0a0a1e"
          metalness={0.9}
          roughness={0.2}
          emissive="#050510"
          emissiveIntensity={0.3}
        />
      </mesh>
      
      {/* Board border */}
      <mesh position={[0, 0, -0.05]}>
        <boxGeometry args={[8.1, 6.1, 0.1]} />
        <meshStandardMaterial 
          color="#ffd700"
          metalness={1}
          roughness={0.1}
          emissive="#ffd700"
          emissiveIntensity={0.3}
        />
      </mesh>
      
      {/* Balls */}
      {balls.map((ball) => (
        <UltraKenoBall
          key={ball.number}
          position={ball.position}
          number={ball.number}
          selected={ball.selected}
          drawn={ball.drawn}
          onClick={() => onNumberSelect?.(ball.number)}
        />
      ))}
    </group>
  );
}

// ============= ULTRA PREMIUM GROUND =======
function UltraGround() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial 
          color="#0a0a18"
          metalness={0.9}
          roughness={0.2}
          emissive="#050510"
          emissiveIntensity={0.3}
        />
      </mesh>
      
      <gridHelper args={[30, 30, '#1a1a4a', '#0a0a2a']} position={[0, -0.48, 0]} />
    </>
  );
}

// ============= ULTRA PREMIUM SKY BACKGROUND ============
function UltraSkyBackground() {
  return (
    <>
      <Stars radius={100} depth={50} count={2000} factor={4} saturation={0} fade speed={0.3} />
      <Sparkles count={50} size={8} position={[0, 12, -20]} scale={[30, 20, 10]} speed={0.1} color="#ffd700" />
      <Sparkles count={40} size={6} position={[10, 8, -15]} scale={[25, 15, 10]} speed={0.15} color="#00ff88" />
    </>
  );
}

// ============= MAIN SCENE CONTENT ============
function SceneContent({ 
  selectedNumbers,
  drawnNumbers,
  onNumberSelect
}: { 
  selectedNumbers?: number[];
  drawnNumbers?: number[];
  onNumberSelect?: (num: number) => void;
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
      <fog attach="fog" args={['#020208', 15, 60]} />
      
      {/* ===== SCENE ELEMENTS ===== */}
      <UltraSkyBackground />
      <UltraGround />
      
      {/* ===== KENO BOARD ===== */}
      <UltraKenoBoard 
        selectedNumbers={selectedNumbers}
        drawnNumbers={drawnNumbers}
        onNumberSelect={onNumberSelect}
      />
    </>
  );
}

// ============= MAIN EXPORT COMPONENT ============
interface Keno3DSceneProps {
  selectedNumbers?: number[];
  drawnNumbers?: number[];
  onNumberSelect?: (num: number) => void;
  className?: string;
}

export default function Keno3DScene({
  selectedNumbers = [],
  drawnNumbers = [],
  onNumberSelect,
  className = ''
}: Keno3DSceneProps) {
  return (
    <div className={`w-full h-full ${className}`}>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [0, 8, 10], fov: 50 }}
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
            selectedNumbers={selectedNumbers}
            drawnNumbers={drawnNumbers}
            onNumberSelect={onNumberSelect}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}