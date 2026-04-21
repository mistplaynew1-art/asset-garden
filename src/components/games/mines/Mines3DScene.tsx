/**
 * Mines3DScene - Ultra Premium 3D Casino Experience
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

// ============= ULTRA PREMIUM GEM =============
function UltraGem({ 
  position, 
  revealed, 
  onClick 
}: { 
  position: [number, number, number]; 
  revealed?: boolean;
  onClick?: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.PointLight>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 2;
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 2.5) * 0.15;
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 3 + position[0]) * 0.05;
    }
    if (glowRef.current) {
      glowRef.current.intensity = 2 + Math.sin(state.clock.elapsedTime * 5) * 0.8;
    }
  });

  const gemColors = ['#00ffff', '#ff00ff', '#00ff88', '#ffcc00', '#ff6b35'];
  const gemColor = gemColors[Math.floor(Math.abs(position[0] * position[2])) % gemColors.length];

  return (
    <group position={position}>
      {/* Main Diamond Gem */}
      <Float speed={2.5} rotationIntensity={0.6} floatIntensity={0.25}>
        <mesh 
          ref={meshRef} 
          castShadow 
          scale={hovered ? 1.2 : 1}
          onPointerOver={() => setHovered(true)} 
          onPointerOut={() => setHovered(false)}
          onClick={onClick}
        >
          <octahedronGeometry args={[0.4, 3]} />
          <MeshTransmissionMaterial
            backside
            samples={32}
            thickness={0.6}
            chromaticAberration={0.35}
            anisotropy={0.4}
            distortion={0.6}
            distortionScale={0.6}
            temporalDistortion={0.25}
            iridescence={1}
            iridescenceIOR={1}
            iridescenceThicknessRange={[0, 1400]}
            color={gemColor}
            transmission={0.97}
            roughness={0.03}
            metalness={0.1}
          />
        </mesh>
      </Float>
      
      {/* Inner Glow Core */}
      <mesh scale={0.25}>
        <sphereGeometry args={[1, 24, 24]} />
        <meshStandardMaterial
          color={gemColor}
          emissive={gemColor}
          emissiveIntensity={4}
          transparent
          opacity={0.85}
        />
      </mesh>
      
      {/* Dynamic Lighting */}
      <pointLight ref={glowRef} position={[0, 0, 0]} color={gemColor} intensity={2} distance={4} />
      <pointLight position={[0, 0.6, 0]} color="#ffffff" intensity={0.8} distance={2.5} />
      
      {/* Sparkle Particles */}
      <Sparkles count={25} size={4} scale={1.8} speed={1} color={gemColor} opacity={0.85} />
      
      {/* Reflection Ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.35, 0]}>
        <ringGeometry args={[0.35, 0.55, 48]} />
        <meshStandardMaterial
          color={gemColor}
          emissive={gemColor}
          emissiveIntensity={0.6}
          transparent
          opacity={0.35}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Outer glow ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.35, 0]}>
        <ringGeometry args={[0.55, 0.7, 48]} />
        <meshStandardMaterial
          color={gemColor}
          emissive={gemColor}
          emissiveIntensity={0.3}
          transparent
          opacity={0.2}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

// ============= ULTRA PREMIUM MINE =============
function UltraMine({ 
  position, 
  exploded,
  onClick 
}: { 
  position: [number, number, number]; 
  exploded?: boolean;
  onClick?: () => void;
}) {
  const meshRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (meshRef.current && !exploded) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.5;
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2 + position[0]) * 0.03;
    }
  });

  if (exploded) {
    return (
      <group position={position}>
        <UltraParticles position={[0, 0, 0]} color="#ff3300" count={200} />
        <Sparkles count={150} size={6} scale={[4, 4, 4]} speed={3} color="#ff3333" />
        <Sparkles count={100} size={4} scale={[3, 3, 3]} speed={2.5} color="#ff6600" />
        <Sparkles count={50} size={3} scale={[2, 2, 2]} speed={2} color="#ffcc00" />
        <pointLight position={[0, 0, 0]} color="#ff4400" intensity={10} distance={8} />
      </group>
    );
  }

  return (
    <group position={position}>
      <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.15}>
        <group ref={meshRef} scale={hovered ? 1.15 : 1}>
          {/* Mine body */}
          <mesh castShadow onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)} onClick={onClick}>
            <sphereGeometry args={[0.35, 32, 32]} />
            <meshStandardMaterial 
              color="#1a1a1a"
              metalness={0.95}
              roughness={0.15}
              emissive="#1a1a1a"
              emissiveIntensity={0.2}
            />
          </mesh>
          
          {/* Spikes */}
          {[0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((rot, i) => (
            <mesh key={i} rotation={[0, rot, 0]} position={[Math.cos(rot) * 0.35, 0, Math.sin(rot) * 0.35]} castShadow>
              <coneGeometry args={[0.08, 0.25, 8]} />
              <meshStandardMaterial 
                color="#2a2a2a"
                metalness={0.9}
                roughness={0.2}
              />
            </mesh>
          ))}
          
          {/* Top spike */}
          <mesh position={[0, 0.4, 0]} castShadow>
            <coneGeometry args={[0.1, 0.3, 8]} />
            <meshStandardMaterial 
              color="#ff3333"
              metalness={0.8}
              roughness={0.3}
              emissive="#ff3333"
              emissiveIntensity={0.5}
            />
          </mesh>
          
          {/* Warning light */}
          <mesh position={[0, 0.15, 0]}>
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshStandardMaterial 
              color="#ff0000"
              emissive="#ff0000"
              emissiveIntensity={3}
            />
          </mesh>
          
          {/* Warning light glow */}
          <pointLight position={[0, 0.15, 0]} color="#ff0000" intensity={2} distance={2} />
        </group>
      </Float>
      
      {/* Danger ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.35, 0]}>
        <ringGeometry args={[0.4, 0.5, 32]} />
        <meshStandardMaterial
          color="#ff0000"
          emissive="#ff0000"
          emissiveIntensity={0.8}
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

// ============= ULTRA PREMIUM TILE =============
function UltraTile({ 
  position, 
  revealed, 
  hasGem, 
  hasMine,
  onClick 
}: { 
  position: [number, number, number]; 
  revealed?: boolean;
  hasGem?: boolean;
  hasMine?: boolean;
  onClick?: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (meshRef.current && !revealed) {
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2 + position[0]) * 0.02;
    }
  });

  if (revealed) {
    if (hasGem) {
      return <UltraGem position={position} revealed={true} onClick={onClick} />;
    }
    if (hasMine) {
      return <UltraMine position={position} exploded={true} onClick={onClick} />;
    }
    return null;
  }

  return (
    <group position={position}>
      <mesh 
        ref={meshRef}
        castShadow 
        receiveShadow
        scale={hovered ? 1.05 : 1}
        onPointerOver={() => setHovered(true)} 
        onPointerOut={() => setHovered(false)}
        onClick={onClick}
      >
        <boxGeometry args={[0.9, 0.15, 0.9]} />
        <meshStandardMaterial 
          color="#1a1a3e"
          metalness={0.8}
          roughness={0.3}
          emissive="#0a0a2e"
          emissiveIntensity={0.3}
        />
      </mesh>
      
      {/* Tile border */}
      <mesh position={[0, 0.08, 0]}>
        <boxGeometry args={[0.95, 0.02, 0.95]} />
        <meshStandardMaterial 
          color="#4cc9f0"
          metalness={0.9}
          roughness={0.2}
          emissive="#4cc9f0"
          emissiveIntensity={0.5}
        />
      </mesh>
      
      {/* Hover glow */}
      {hovered && (
        <pointLight position={[0, 0.5, 0]} color="#4cc9f0" intensity={1.5} distance={2} />
      )}
    </group>
  );
}

// ============= ULTRA PREMIUM GROUND =======
function UltraGround() {
  return (
    <>
      {/* Main ground */}
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
      
      {/* Grid */}
      <gridHelper args={[30, 30, '#1a1a4a', '#0a0a2a']} position={[0, -0.48, 0]} />
      
      {/* Glow line */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.47, 0]}>
        <planeGeometry args={[30, 0.1]} />
        <meshBasicMaterial color="#4cc9f0" transparent opacity={0.3} />
      </mesh>
    </>
  );
}

// ============= ULTRA PREMIUM SKY BACKGROUND ============
function UltraSkyBackground() {
  return (
    <>
      <Stars radius={100} depth={50} count={2000} factor={4} saturation={0} fade speed={0.3} />
      <Sparkles count={60} size={10} position={[0, 15, -20]} scale={[30, 20, 10]} speed={0.1} color="#4400ff" />
      <Sparkles count={50} size={8} position={[10, 10, -15]} scale={[25, 15, 10]} speed={0.15} color="#ff0066" />
    </>
  );
}

// ============= MAIN SCENE CONTENT ============
function SceneContent({ 
  gridSize, 
  minesCount, 
  revealedTiles, 
  onTileClick 
}: { 
  gridSize: number;
  minesCount: number;
  revealedTiles: Array<{ x: number; z: number; hasGem: boolean; hasMine: boolean }>;
  onTileClick?: (x: number, z: number) => void;
}) {
  const tiles = useMemo(() => {
    const result: Array<{
      position: [number, number, number];
      revealed: boolean;
      hasGem: boolean | undefined;
      hasMine: boolean | undefined;
      x: number;
      z: number;
    }> = [];
    const offset = (gridSize - 1) / 2;
    for (let x = 0; x < gridSize; x++) {
      for (let z = 0; z < gridSize; z++) {
        const revealed = revealedTiles.find(t => t.x === x && t.z === z);
        result.push({
          position: [(x - offset) * 1.1, 0, (z - offset) * 1.1],
          revealed: !!revealed,
          hasGem: revealed?.hasGem,
          hasMine: revealed?.hasMine,
          x,
          z
        });
      }
    }
    return result;
  }, [gridSize, revealedTiles]);

  return (
    <>
      {/* ===== ULTRA PREMIUM LIGHTING ===== */}
      <ambientLight intensity={0.4} color="#4466aa" />
      
      <directionalLight 
        position={[10, 20, 10]} 
        intensity={2} 
        color="#ffffff" 
        castShadow 
        shadow-mapSize={[4096, 4096]}
      />
      
      <directionalLight position={[-10, 10, -10]} intensity={0.8} color="#ff8844" />
      <pointLight position={[0, 10, 5]} intensity={2} color="#4cc9f0" distance={30} />
      <pointLight position={[10, 5, 0]} intensity={1.5} color="#ff00ff" distance={25} />
      <pointLight position={[-10, 5, 0]} intensity={1.5} color="#00ffff" distance={25} />
      
      {/* ===== ENVIRONMENT ===== */}
      <color attach="background" args={['#020208']} />
      <fog attach="fog" args={['#020208', 15, 60]} />
      
      {/* ===== SCENE ELEMENTS ===== */}
      <UltraSkyBackground />
      <UltraGround />
      
      {/* ===== TILES ===== */}
      {tiles.map((tile, i) => (
        <UltraTile
          key={i}
          position={tile.position}
          revealed={tile.revealed}
          hasGem={tile.hasGem}
          hasMine={tile.hasMine}
          onClick={() => onTileClick?.(tile.x, tile.z)}
        />
      ))}
    </>
  );
}

// ============= MAIN EXPORT COMPONENT ============
interface Mines3DSceneProps {
  gridSize?: number;
  minesCount?: number;
  revealedTiles?: Array<{ x: number; z: number; hasGem: boolean; hasMine: boolean }>;
  onTileClick?: (x: number, z: number) => void;
  className?: string;
}

export default function Mines3DScene({
  gridSize = 5,
  minesCount = 3,
  revealedTiles = [],
  onTileClick,
  className = ''
}: Mines3DSceneProps) {
  return (
    <div className={`w-full h-full ${className}`}>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [0, 5, 5], fov: 50 }}
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
            gridSize={gridSize}
            minesCount={minesCount}
            revealedTiles={revealedTiles}
            onTileClick={onTileClick}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}