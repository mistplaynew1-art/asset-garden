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
const UltraPremiumCard = ({ value, suit, position, rotation, isRevealed, isPlayer }: any) => {
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
    <Float floatIntensity={0.2} rotationIntensity={0.1}>
      <group
        ref={cardRef}
        position={position}
        rotation={rotation}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        {/* Card Body */}
        <mesh castShadow receiveShadow>
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

// Ultra Premium Chip Component
const UltraPremiumChip = ({ value, position, color }: any) => {
  const chipRef = useRef<THREE.Group>(null);

  return (
    <Float floatIntensity={0.1} rotationIntensity={0.1}>
      <group ref={chipRef} position={position}>
        {/* Chip Body */}
        <mesh castShadow>
          <cylinderGeometry args={[0.4, 0.4, 0.08, 32]} />
          <meshStandardMaterial color={color} metalness={0.7} roughness={0.2} />
        </mesh>

        {/* Chip Edge */}
        <mesh position={[0, 0, 0.05]}>
          <torusGeometry args={[0.4, 0.03, 16, 32]} />
          <meshStandardMaterial color="#ffd700" metalness={0.9} roughness={0.1} />
        </mesh>

        {/* Chip Top */}
        <mesh position={[0, 0.05, 0]}>
          <cylinderGeometry args={[0.35, 0.35, 0.02, 32]} />
          <meshStandardMaterial color="#ffd700" metalness={0.9} roughness={0.1} />
        </mesh>

        {/* Chip Value */}
        <Text
          position={[0, 0.08, 0]}
          fontSize={0.15}
          color="#ffffff"
          font="https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxP.ttf"
          anchorX="center"
          anchorY="middle"
        >
          {value}
        </Text>

        <Sparkles count={10} scale={0.5} size={2} color="#ffd700" speed={0.3} />
      </group>
    </Float>
  );
};

// Ultra Premium Table Component
const UltraPremiumTable = () => {
  return (
    <group position={[0, -0.5, 0]}>
      {/* Table Surface */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[8, 5]} />
        <meshStandardMaterial color="#0d5c2e" metalness={0.3} roughness={0.6} />
      </mesh>

      {/* Table Border */}
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[8.5, 5.5]} />
        <meshStandardMaterial color="#8b4513" metalness={0.5} roughness={0.4} />
      </mesh>

      {/* Table Edge */}
      <mesh position={[0, 0.1, 2.6]}>
        <boxGeometry args={[8.5, 0.2, 0.3]} />
        <meshStandardMaterial color="#c9a227" metalness={0.8} roughness={0.1} />
      </mesh>
      <mesh position={[0, 0.1, -2.6]}>
        <boxGeometry args={[8.5, 0.2, 0.3]} />
        <meshStandardMaterial color="#c9a227" metalness={0.8} roughness={0.1} />
      </mesh>
      <mesh position={[4.3, 0.1, 0]}>
        <boxGeometry args={[0.3, 0.2, 5.5]} />
        <meshStandardMaterial color="#c9a227" metalness={0.8} roughness={0.1} />
      </mesh>
      <mesh position={[-4.3, 0.1, 0]}>
        <boxGeometry args={[0.3, 0.2, 5.5]} />
        <meshStandardMaterial color="#c9a227" metalness={0.8} roughness={0.1} />
      </mesh>

      {/* Center Logo */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.8, 1, 32]} />
        <meshStandardMaterial color="#ffd700" metalness={0.9} roughness={0.1} />
      </mesh>

      <Sparkles count={50} scale={8} size={3} color="#ffd700" speed={0.2} />
    </group>
  );
};

// Main Scene Component
const Blackjack3DScene = ({ gameState = 'idle', playerHand = [], dealerHand = [], playerScore = 0, dealerScore = 0 }: any) => {
  return (
    <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)' }}>
      <Canvas
        camera={{ position: [0, 4, 6], fov: 50 }}
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

        {/* Table */}
        <UltraPremiumTable />

        {/* Dealer Cards */}
        {dealerHand.map((card: any, index: number) => (
          <UltraPremiumCard
            key={`dealer-${index}`}
            value={card.value}
            suit={card.suit}
            position={[-1.5 + index * 1.3, 0.5, 0]}
            rotation={[0, 0, 0]}
            isRevealed={index === 0 || gameState === 'finished'}
            isPlayer={false}
          />
        ))}

        {/* Player Cards */}
        {playerHand.map((card: any, index: number) => (
          <UltraPremiumCard
            key={`player-${index}`}
            value={card.value}
            suit={card.suit}
            position={[-1.5 + index * 1.3, -0.5, 0]}
            rotation={[0, 0, 0]}
            isRevealed={true}
            isPlayer={true}
          />
        ))}

        {/* Chips */}
        <UltraPremiumChip value="10" position={[-3, 0, 1]} color="#ff4444" />
        <UltraPremiumChip value="25" position={[-2, 0, 1]} color="#00ff00" />
        <UltraPremiumChip value="50" position={[-1, 0, 1]} color="#0000ff" />
        <UltraPremiumChip value="100" position={[0, 0, 1]} color="#000000" />

        {/* Scores */}
        <Billboard position={[0, 2, 0]}>
          <Text
            fontSize={0.4}
            color="#ffd700"
            font="https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxP.ttf"
            anchorX="center"
            anchorY="middle"
          >
            DEALER: {dealerScore}
          </Text>
        </Billboard>
        <Billboard position={[0, -2, 0]}>
          <Text
            fontSize={0.4}
            color="#ffd700"
            font="https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxP.ttf"
            anchorX="center"
            anchorY="middle"
          >
            PLAYER: {playerScore}
          </Text>
        </Billboard>

        {/* Game Status */}
        {gameState !== 'idle' && gameState !== 'playing' && (
          <Billboard position={[0, 0, 2]}>
            <Text
              fontSize={0.6}
              color={gameState === 'won' ? '#00ff00' : gameState === 'lost' ? '#ff0000' : '#ffd700'}
              font="https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxP.ttf"
              anchorX="center"
              anchorY="middle"
            >
              {gameState === 'won' ? 'YOU WIN!' : gameState === 'lost' ? 'YOU LOSE!' : 'PUSH'}
            </Text>
          </Billboard>
        )}

        {/* Controls */}
        <OrbitControls enableZoom={true} enablePan={true} enableRotate={true} />
      </Canvas>
    </div>
  );
};

export default Blackjack3DScene;