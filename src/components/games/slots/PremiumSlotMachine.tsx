/**
 * PremiumSlotMachine - Ultra-premium 3D slot machine
 * Better than official casino slots with advanced effects
 */
import React, { useRef, useMemo, useState, useEffect, Suspense } from 'react';
import { Canvas, useFrame, useThree, useLoader } from '@react-three/fiber';
import { 
  OrbitControls, 
  RoundedBox, 
  Text, 
  Sparkles, 
  Float,
  Trail,
  MeshTransmissionMaterial,
  Environment,
  useTexture,
  Billboard,
  PerspectiveCamera,
  Stars,
  Cloud,
} from '@react-three/drei';
import * as THREE from 'three';

// ============= ENHANCED SLOT SYMBOLS =============
const SYMBOLS = [
  { id: 'diamond', emoji: '💎', color: '#00ffff', value: 100, glow: '#00ffff' },
  { id: 'seven', emoji: '7️⃣', color: '#ff3333', value: 77, glow: '#ff0000' },
  { id: 'bell', emoji: '🔔', color: '#ffd700', value: 50, glow: '#ffd700' },
  { id: 'cherry', emoji: '🍒', color: '#ff6666', value: 30, glow: '#ff0066' },
  { id: 'lemon', emoji: '🍋', color: '#ffff00', value: 20, glow: '#ffff00' },
  { id: 'grape', emoji: '🍇', color: '#9933ff', value: 25, glow: '#9933ff' },
  { id: 'star', emoji: '⭐', color: '#ffcc00', value: 40, glow: '#ffcc00' },
  { id: 'bar', emoji: '📊', color: '#333333', value: 60, glow: '#666666' },
];

// ============= ANIMATED SYMBOL COMPONENT =============
function AnimatedSymbol({ symbol, position, visible }: { 
  symbol: typeof SYMBOLS[0]; 
  position: [number, number, number];
  visible: boolean;
}) {
  const meshRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 2) * 0.1;
    }
  });

  return (
    <group ref={meshRef} position={position}>
      {/* Glowing background */}
      <mesh>
        <planeGeometry args={[1.4, 1.4]} />
        <meshStandardMaterial 
          color={symbol.color} 
          transparent 
          opacity={0.2}
          emissive={symbol.glow}
          emissiveIntensity={0.5}
        />
      </mesh>
      
      {/* Symbol emoji */}
      <Billboard>
        <Text
          position={[0, 0, 0.1]}
          fontSize={0.8}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02}
          outlineColor="#000000"
        >
          {symbol.emoji}
        </Text>
      </Billboard>
      
      {/* Glow effect */}
      <pointLight 
        position={[0, 0, 0.5]} 
        color={symbol.glow} 
        intensity={0.5} 
        distance={2}
      />
    </group>
  );
}

// ============= ENHANCED 3D REEL COMPONENT =============
function Reel({ 
  symbols, 
  spinning, 
  stopIndex,
  position,
  reelIndex
}: { 
  symbols: typeof SYMBOLS;
  spinning: boolean;
  stopIndex?: number;
  position: [number, number, number];
  reelIndex: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const scrollPosition = useRef(0);
  const targetPosition = useRef(0);
  const velocityRef = useRef(0);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    if (spinning) {
      // Smooth acceleration and deceleration
      velocityRef.current = Math.min(velocityRef.current + delta * 2, 15);
      scrollPosition.current += velocityRef.current * delta;
    } else if (stopIndex !== undefined) {
      // Easing to stop position
      targetPosition.current = stopIndex * 1.5;
      const diff = targetPosition.current - scrollPosition.current;
      velocityRef.current = diff * 3;
      scrollPosition.current += velocityRef.current * delta;
      
      // Snap when close enough
      if (Math.abs(diff) < 0.01) {
        scrollPosition.current = targetPosition.current;
      }
    }

    groupRef.current.position.y = -scrollPosition.current;
  });

  // Create visible symbols with proper spacing
  const visibleSymbols = useMemo(() => {
    const result: Array<(typeof symbols)[number]> = [];
    for (let i = 0; i < 30; i++) {
      result.push(symbols[i % symbols.length]);
    }
    return result;
  }, [symbols]);

  return (
    <group position={position}>
      {/* Reel cylinder background */}
      <mesh position={[0, 0, -0.3]}>
        <cylinderGeometry args={[1.2, 1.2, 6, 32, 1, true]} />
        <meshStandardMaterial 
          color="#1a1a2e" 
          metalness={0.9} 
          roughness={0.1}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Inner glow */}
      <mesh position={[0, 0, -0.2]}>
        <cylinderGeometry args={[1.1, 1.1, 5.8, 32, 1, true]} />
        <meshStandardMaterial 
          color="#2a1a4e" 
          emissive="#4a0080"
          emissiveIntensity={0.3}
          transparent
          opacity={0.8}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Symbols */}
      <group ref={groupRef}>
        {visibleSymbols.map((symbol, i) => (
          <AnimatedSymbol
            key={i}
            symbol={symbol}
            position={[0, i * 1.5, 0]}
            visible={true}
          />
        ))}
      </group>

      {/* Top/bottom chrome caps */}
      <mesh position={[0, 3.2, 0]}>
        <cylinderGeometry args={[1.3, 1.2, 0.3, 32]} />
        <meshStandardMaterial color="#c0c0c0" metalness={1} roughness={0.1} />
      </mesh>
      <mesh position={[0, -3.2, 0]}>
        <cylinderGeometry args={[1.2, 1.3, 0.3, 32]} />
        <meshStandardMaterial color="#c0c0c0" metalness={1} roughness={0.1} />
      </mesh>
    </group>
  );
}

// ============= NEON LIGHT STRIP =============
function NeonStrip({ position, color, length = 8 }: { 
  position: [number, number, number]; 
  color: string;
  length?: number;
}) {
  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={[length, 0.1, 0.1]} />
        <meshStandardMaterial 
          color={color}
          emissive={color}
          emissiveIntensity={2}
        />
      </mesh>
      <pointLight position={[0, 0, 0.2]} color={color} intensity={0.5} distance={3} />
    </group>
  );
}

// ============= ENHANCED SLOT CABINET =============
function SlotCabinet({ 
  spinning, 
  reelResults,
  winAmount,
  theme = 'default'
}: { 
  spinning: boolean;
  reelResults: number[];
  winAmount?: number;
  theme?: string;
}) {
  const cabinetRef = useRef<THREE.Group>(null);
  const [lightPulse, setLightPulse] = useState(0);

  useFrame((state) => {
    setLightPulse(Math.sin(state.clock.elapsedTime * 3) * 0.5 + 0.5);
    
    // Gentle cabinet sway on win
    if (cabinetRef.current && winAmount && winAmount > 0) {
      cabinetRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 5) * 0.02;
    }
  });

  return (
    <group ref={cabinetRef}>
      {/* Main cabinet body with premium materials */}
      <RoundedBox args={[10, 8, 3]} radius={0.3} smoothness={4} position={[0, 0, -1.5]} castShadow receiveShadow>
        <meshStandardMaterial 
          color="#1a0a2e" 
          metalness={0.8} 
          roughness={0.2}
        />
      </RoundedBox>
      
      {/* Chrome trim */}
      <mesh position={[0, 4.1, -0.5]}>
        <boxGeometry args={[10.2, 0.2, 3.2]} />
        <meshStandardMaterial color="#c0c0c0" metalness={1} roughness={0.1} />
      </mesh>
      <mesh position={[0, -4.1, -0.5]}>
        <boxGeometry args={[10.2, 0.2, 3.2]} />
        <meshStandardMaterial color="#c0c0c0" metalness={1} roughness={0.1} />
      </mesh>

      {/* Top banner with animated lights */}
      <group position={[0, 4.5, 0]}>
        <RoundedBox args={[9, 1.5, 0.8]} radius={0.1} smoothness={4} castShadow>
          <meshStandardMaterial 
            color="#0a0a1a" 
            metalness={0.9} 
            roughness={0.1}
          />
        </RoundedBox>
        
        {/* Animated chasing lights */}
        {[-4, -3, -2, -1, 0, 1, 2, 3, 4].map((x, i) => (
          <mesh key={i} position={[x, 0, 0.5]} castShadow>
            <sphereGeometry args={[0.12, 16, 16]} />
            <meshStandardMaterial
              color={`hsl(${(i * 40 + lightPulse * 360) % 360}, 100%, 50%)`}
              emissive={`hsl(${(i * 40 + lightPulse * 360) % 360}, 100%, 50%)`}
              emissiveIntensity={2}
            />
          </mesh>
        ))}
        
        {/* Jackpot text */}
        <Float speed={2} rotationIntensity={0.1} floatIntensity={0.3}>
          <Text
            position={[0, 0, 0.5]}
            fontSize={0.7}
            color="#ffd700"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.03}
            outlineColor="#ff6600"
          >
            ⭐ MEGA JACKPOT ⭐
          </Text>
        </Float>
      </group>

      {/* Reels window frame */}
      <group position={[0, 0.5, 0.5]}>
        {/* Chrome frame */}
        <RoundedBox args={[8.5, 5, 0.3]} radius={0.1} smoothness={4} position={[0, 0, 0.2]}>
          <meshStandardMaterial color="#c0c0c0" metalness={1} roughness={0.1} />
        </RoundedBox>
        
        {/* Glass panel with refraction */}
        <mesh position={[0, 0, 0.4]}>
          <planeGeometry args={[8, 4.5]} />
          <MeshTransmissionMaterial
            backside
            samples={16}
            thickness={0.3}
            chromaticAberration={0.1}
            anisotropy={0.5}
            distortion={0.2}
            distortionScale={0.3}
            temporalDistortion={0.2}
            transmission={0.9}
            color="#ffffff"
          />
        </mesh>

        {/* Reels with staggered positions */}
        <Reel 
          symbols={SYMBOLS} 
          spinning={spinning} 
          stopIndex={reelResults[0]}
          position={[-2.5, 0, 0]}
          reelIndex={0}
        />
        <Reel 
          symbols={SYMBOLS} 
          spinning={spinning} 
          stopIndex={reelResults[1]}
          position={[0, 0, 0]}
          reelIndex={1}
        />
        <Reel 
          symbols={SYMBOLS} 
          spinning={spinning} 
          stopIndex={reelResults[2]}
          position={[2.5, 0, 0]}
          reelIndex={2}
        />

        {/* Animated win line */}
        <mesh position={[0, 0, 0.5]}>
          <planeGeometry args={[8.2, 0.15]} />
          <meshStandardMaterial 
            color="#ffd700" 
            emissive="#ffd700"
            emissiveIntensity={1 + lightPulse}
            transparent 
            opacity={0.9}
          />
        </mesh>
        
        {/* Win line markers */}
        {[-4.2, 4.2].map((x, i) => (
          <mesh key={i} position={[x, 0, 0.5]}>
            <coneGeometry args={[0.2, 0.4, 4]} />
            <meshStandardMaterial 
              color="#ffd700" 
              emissive="#ffd700"
              emissiveIntensity={2}
            />
          </mesh>
        ))}
      </group>

      {/* Control panel */}
      <group position={[0, -3.5, 0.5]}>
        <RoundedBox args={[9, 2, 0.5]} radius={0.1} smoothness={4} castShadow>
          <meshStandardMaterial 
            color="#0a0a1a" 
            metalness={0.9} 
            roughness={0.1}
          />
        </RoundedBox>
        
        {/* Neon accent strips */}
        <NeonStrip position={[-3.5, 0.8, 0.3]} color="#ff00ff" length={2} />
        <NeonStrip position={[1.5, 0.8, 0.3]} color="#00ffff" length={2} />

        {/* Spin button with glow */}
        <group position={[3.5, 0, 0.3]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.8, 0.8, 0.4, 32]} />
            <meshStandardMaterial 
              color={spinning ? '#444444' : '#ff0044'}
              emissive={spinning ? '#000000' : '#ff0044'}
              emissiveIntensity={spinning ? 0 : 2}
              metalness={0.9}
              roughness={0.1}
            />
          </mesh>
          <Text
            position={[0, 0, 0.25]}
            fontSize={0.3}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
          >
            SPIN
          </Text>
          {/* Button glow */}
          {!spinning && (
            <pointLight position={[0, 0, 0.5]} color="#ff0044" intensity={1} distance={2} />
          )}
        </group>

        {/* Digital displays */}
        <group position={[-2, 0, 0.3]}>
          <mesh>
            <boxGeometry args={[2.5, 0.8, 0.1]} />
            <meshStandardMaterial color="#001100" emissive="#002200" emissiveIntensity={0.5} />
          </mesh>
          <Text
            position={[0, 0, 0.1]}
            fontSize={0.35}
            color="#00ff00"
            anchorX="center"
            anchorY="middle"
            font={undefined}
          >
            BET: $10.00
          </Text>
        </group>

        <group position={[0.5, 0, 0.3]}>
          <mesh>
            <boxGeometry args={[2.5, 0.8, 0.1]} />
            <meshStandardMaterial color="#110000" emissive="#220000" emissiveIntensity={0.5} />
          </mesh>
          <Text
            position={[0, 0, 0.1]}
            fontSize={0.35}
            color="#ffff00"
            anchorX="center"
            anchorY="middle"
          >
            CREDIT: $1,000
          </Text>
        </group>
      </group>

      {/* Side panels with neon lights */}
      {[-5.3, 5.3].map((x, i) => (
        <group key={i} position={[x, 0, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.4, 7, 2]} />
            <meshStandardMaterial 
              color="#1a0a2e"
              metalness={0.9}
              roughness={0.1}
            />
          </mesh>
          
          {/* Vertical neon strips */}
          {[-2.5, -1.5, -0.5, 0.5, 1.5, 2.5].map((y, j) => (
            <mesh key={j} position={[0, y, 1.1]} castShadow>
              <sphereGeometry args={[0.15, 16, 16]} />
              <meshStandardMaterial
                color={`hsl(${(j * 60 + i * 180 + lightPulse * 360) % 360}, 100%, 50%)`}
                emissive={`hsl(${(j * 60 + i * 180 + lightPulse * 360) % 360}, 100%, 50%)`}
                emissiveIntensity={2}
              />
            </mesh>
          ))}
        </group>
      ))}

      {/* Win celebration effects */}
      {winAmount && winAmount > 0 && (
        <>
          <Sparkles
            count={300}
            size={6}
            scale={[12, 10, 5]}
            speed={3}
            color="#ffd700"
          />
          <Sparkles
            count={100}
            size={4}
            scale={[12, 10, 5]}
            speed={2}
            color="#ff00ff"
          />
        </>
      )}
    </group>
  );
}

// ============= SLOT SCENE WITH EFFECTS =============
function SlotScene({ 
  spinning, 
  reelResults,
  winAmount
}: { 
  spinning: boolean;
  reelResults: number[];
  winAmount?: number;
}) {
  return (
    <>
      {/* Ambient environment */}
      <color attach="background" args={['#050510']} />
      <fog attach="fog" args={['#050510', 10, 30]} />
      
      {/* Multi-colored lighting */}
      <ambientLight intensity={0.2} />
      <directionalLight position={[5, 10, 5]} intensity={1} castShadow />
      <pointLight position={[0, 5, 8]} color="#ff00ff" intensity={1} distance={15} />
      <pointLight position={[-8, 5, 5]} color="#00ffff" intensity={0.8} distance={12} />
      <pointLight position={[8, 5, 5]} color="#ffff00" intensity={0.8} distance={12} />
      <spotLight position={[0, 10, 0]} color="#ffffff" intensity={0.5} angle={0.5} penumbra={1} />

      {/* Starfield background */}
      <Stars radius={50} depth={50} count={1000} factor={4} saturation={0} fade speed={1} />

      {/* Reflective floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -5, 0]} receiveShadow>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial 
          color="#0a0a1a" 
          metalness={0.95} 
          roughness={0.05}
        />
      </mesh>

      {/* Main cabinet */}
      <SlotCabinet 
        spinning={spinning} 
        reelResults={reelResults}
        winAmount={winAmount}
      />

      {/* Camera controls */}
      <OrbitControls 
        enableZoom={false} 
        enablePan={false} 
        maxPolarAngle={Math.PI / 2.2}
        minPolarAngle={Math.PI / 4}
        autoRotate={!spinning}
        autoRotateSpeed={0.5}
      />
    </>
  );
}

// ============= MAIN COMPONENT =============
interface PremiumSlotMachineProps {
  spinning?: boolean;
  reelResults?: number[];
  winAmount?: number;
  theme?: string;
  className?: string;
}

export default function PremiumSlotMachine({
  spinning = false,
  reelResults = [0, 0, 0],
  winAmount,
  theme = 'default',
  className = '',
}: PremiumSlotMachineProps) {
  return (
    <div className={`w-full h-full ${className}`}>
      <Canvas
        shadows
        camera={{ position: [0, 1, 12], fov: 50 }}
        gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping }}
        dpr={[1, 2]}
      >
        <SlotScene 
          spinning={spinning} 
          reelResults={reelResults}
          winAmount={winAmount}
        />
      </Canvas>
    </div>
  );
}