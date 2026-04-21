import React, { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Float, Trail, Sparkles, Stars, Text, Billboard, MeshTransmissionMaterial } from '@react-three/drei';
import * as THREE from 'three';

// UltraParticles Component
const UltraParticles = ({ count = 100, color = '#ffffff', size = 0.1, spread = 5 }) => {
  const particlesRef = useRef<THREE.Points>(null);
  const positions = useRef<Float32Array>(new Float32Array(count * 3));
  const velocities = useRef<Float32Array>(new Float32Array(count * 3));

  React.useEffect(() => {
    for (let i = 0; i < count; i++) {
      positions.current[i * 3] = (Math.random() - 0.5) * spread;
      positions.current[i * 3 + 1] = (Math.random() - 0.5) * spread;
      positions.current[i * 3 + 2] = (Math.random() - 0.5) * spread;
      velocities.current[i * 3] = (Math.random() - 0.5) * 0.02;
      velocities.current[i * 3 + 1] = (Math.random() - 0.5) * 0.02;
      velocities.current[i * 3 + 2] = (Math.random() - 0.5) * 0.02;
    }
  }, [count, spread]);

  useFrame(() => {
    if (particlesRef.current) {
      const positionsArray = particlesRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < count; i++) {
        positionsArray[i * 3] += velocities.current[i * 3];
        positionsArray[i * 3 + 1] += velocities.current[i * 3 + 1];
        positionsArray[i * 3 + 2] += velocities.current[i * 3 + 2];
        
        if (Math.abs(positionsArray[i * 3]) > spread) velocities.current[i * 3] *= -1;
        if (Math.abs(positionsArray[i * 3 + 1]) > spread) velocities.current[i * 3 + 1] *= -1;
        if (Math.abs(positionsArray[i * 3 + 2]) > spread) velocities.current[i * 3 + 2] *= -1;
      }
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions.current}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={size} color={color} transparent opacity={0.8} />
    </points>
  );
};

// Ultra Premium Card Component
const UltraPremiumCard = ({ value, suit, position, rotation, isRevealed }: any) => {
  const cardRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  const suitColors: { [key: string]: string } = {
    hearts: '#ff4444',
    diamonds: '#ff4444',
    clubs: '#000000',
    spades: '#000000'
  };

  const suitSymbols: { [key: string]: string } = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠'
  };

  return (
    <Float floatIntensity={0.3} rotationIntensity={0.2}>
      <group
        ref={cardRef}
        position={position}
        rotation={rotation}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        {/* Card Body */}
        <mesh>
          <boxGeometry args={[1.2, 1.8, 0.05]} />
          <meshStandardMaterial
            color={isRevealed ? '#ffffff' : '#1a1a2e'}
            metalness={0.3}
            roughness={0.2}
          />
        </mesh>

        {/* Card Border */}
        <mesh position={[0, 0, 0.03]}>
          <boxGeometry args={[1.25, 1.85, 0.02]} />
          <meshStandardMaterial
            color={hovered ? '#ffd700' : '#c9a227'}
            metalness={0.8}
            roughness={0.1}
          />
        </mesh>

        {/* Card Content */}
        {isRevealed && (
          <>
            {/* Corner Values */}
            <Text
              position={[-0.45, 0.7, 0.04]}
              fontSize={0.2}
              color={suitColors[suit]}
              font="https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxP.ttf"
            >
              {value}
            </Text>
            <Text
              position={[-0.45, 0.5, 0.04]}
              fontSize={0.2}
              color={suitColors[suit]}
              font="https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxP.ttf"
            >
              {suitSymbols[suit]}
            </Text>
            <Text
              position={[0.45, -0.7, 0.04]}
              fontSize={0.2}
              color={suitColors[suit]}
              font="https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxP.ttf"
              rotation={[0, 0, Math.PI]}
            >
              {value}
            </Text>
            <Text
              position={[0.45, -0.5, 0.04]}
              fontSize={0.2}
              color={suitColors[suit]}
              font="https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxP.ttf"
              rotation={[0, 0, Math.PI]}
            >
              {suitSymbols[suit]}
            </Text>

            {/* Center Suit */}
            <Text
              position={[0, 0, 0.04]}
              fontSize={0.6}
              color={suitColors[suit]}
              font="https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxP.ttf"
            >
              {suitSymbols[suit]}
            </Text>
          </>
        )}

        {/* Card Back Pattern */}
        {!isRevealed && (
          <>
            <mesh position={[0, 0, 0.04]}>
              <planeGeometry args={[1.1, 1.7]} />
              <meshStandardMaterial color="#16213e" />
            </mesh>
            <Sparkles count={20} scale={1} size={3} color="#ffd700" speed={0.5} />
          </>
        )}

        {/* Glow Effect */}
        {hovered && (
          <pointLight position={[0, 0, 0.5]} intensity={2} color="#ffd700" distance={3} />
        )}
      </group>
    </Float>
  );
};

// Ultra Premium Deck Component
const UltraPremiumDeck = ({ position }: any) => {
  return (
    <group position={position}>
      {[...Array(5)].map((_, i) => (
        <mesh key={i} position={[0, 0, i * 0.03]}>
          <boxGeometry args={[1.2, 1.8, 0.05]} />
          <meshStandardMaterial
            color="#1a1a2e"
            metalness={0.3}
            roughness={0.2}
          />
        </mesh>
      ))}
      {/* Deck Top */}
      <mesh position={[0, 0, 0.16]}>
        <boxGeometry args={[1.25, 1.85, 0.02]} />
        <meshStandardMaterial
          color="#c9a227"
          metalness={0.8}
          roughness={0.1}
        />
      </mesh>
      <Sparkles count={30} scale={1.5} size={4} color="#ffd700" speed={0.3} />
    </group>
  );
};

// Main Scene Component
const Hilo3DScene = ({ gameState = 'idle', playerCard = null, dealerCard = null }: any) => {
  return (
    <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)' }}>
      <Canvas
        camera={{ position: [0, 2, 6], fov: 50 }}
        shadows
        gl={{ toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2 }}
      >
        {/* Lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 10, 5]} intensity={1} castShadow />
        <pointLight position={[-5, 5, 5]} intensity={0.8} color="#ffd700" />
        <pointLight position={[5, -5, 5]} intensity={0.8} color="#ff6b6b" />

        {/* Environment */}
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        <Sparkles count={100} scale={20} size={2} color="#ffffff" speed={0.2} />

        {/* Ground Grid */}
        <gridHelper args={[20, 20, '#444444', '#222222']} position={[0, -2, 0]} />

        {/* Ultra Particles */}
        <UltraParticles count={150} color="#ffd700" size={0.08} spread={8} />

        {/* Deck */}
        <UltraPremiumDeck position={[-3, 0, 0]} />

        {/* Player Card */}
        {playerCard && (
          <UltraPremiumCard
            value={playerCard.value}
            suit={playerCard.suit}
            position={[0, -0.5, 0]}
            rotation={[0, 0, 0]}
            isRevealed={true}
          />
        )}

        {/* Dealer Card */}
        {dealerCard && (
          <UltraPremiumCard
            value={dealerCard.value}
            suit={dealerCard.suit}
            position={[0, 0.5, 0]}
            rotation={[0, 0, 0]}
            isRevealed={gameState === 'revealed'}
          />
        )}

        {/* Game Status Text */}
        {gameState !== 'idle' && (
          <Billboard position={[0, 2, 0]}>
            <Text
              fontSize={0.5}
              color="#ffd700"
              font="https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxP.ttf"
              anchorX="center"
              anchorY="middle"
            >
              {gameState === 'won' ? 'YOU WIN!' : gameState === 'lost' ? 'YOU LOSE!' : 'HI OR LO?'}
            </Text>
          </Billboard>
        )}

        {/* Controls */}
        <OrbitControls enableZoom={true} enablePan={true} enableRotate={true} />
      </Canvas>
    </div>
  );
};

export default Hilo3DScene;