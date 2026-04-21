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

// Ultra Premium Dragon Component
const UltraPremiumDragon = ({ position }: any) => {
  const dragonRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (dragonRef.current) {
      dragonRef.current.position.y = Math.sin(clock.elapsedTime * 1.5) * 0.1;
    }
  });

  return (
    <Float floatIntensity={0.3} rotationIntensity={0.2}>
      <group ref={dragonRef} position={position}>
        {/* Dragon Body */}
        <mesh castShadow>
          <sphereGeometry args={[0.5, 32, 32]} />
          <MeshTransmissionMaterial
            backside
            samples={4}
            thickness={0.5}
            chromaticAberration={0.3}
            anisotropy={0.5}
            distortion={0.3}
            distortionScale={0.5}
            temporalDistortion={0.2}
            iridescence={1}
            iridescenceIOR={1.5}
            iridescenceThicknessRange={[0, 1400]}
          />
        </mesh>

        {/* Dragon Wings */}
        <mesh position={[-0.5, 0.2, 0]} rotation={[0, 0, -0.3]}>
          <coneGeometry args={[0.4, 0.6, 3]} />
          <meshStandardMaterial color="#ff4444" metalness={0.6} roughness={0.3} />
        </mesh>
        <mesh position={[0.5, 0.2, 0]} rotation={[0, 0, 0.3]}>
          <coneGeometry args={[0.4, 0.6, 3]} />
          <meshStandardMaterial color="#ff4444" metalness={0.6} roughness={0.3} />
        </mesh>

        {/* Dragon Head */}
        <mesh position={[0, 0, 0.5]}>
          <sphereGeometry args={[0.25, 32, 32]} />
          <meshStandardMaterial color="#ff6b6b" metalness={0.6} roughness={0.3} />
        </mesh>

        {/* Dragon Eyes */}
        <mesh position={[-0.1, 0.05, 0.7]}>
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshStandardMaterial color="#ffff00" emissive="#ffff00" emissiveIntensity={2} />
        </mesh>
        <mesh position={[0.1, 0.05, 0.7]}>
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshStandardMaterial color="#ffff00" emissive="#ffff00" emissiveIntensity={2} />
        </mesh>

        {/* Dragon Tail */}
        <mesh position={[0, 0, -0.6]} rotation={[0, 0, 0]}>
          <coneGeometry args={[0.15, 0.4, 8]} />
          <meshStandardMaterial color="#ff4444" metalness={0.6} roughness={0.3} />
        </mesh>

        {/* Fire Effect */}
        <mesh position={[0, -0.1, 0.8]}>
          <coneGeometry args={[0.15, 0.4, 8]} />
          <meshStandardMaterial
            color="#ff8800"
            emissive="#ff4400"
            emissiveIntensity={2}
            transparent
            opacity={0.8}
          />
        </mesh>

        <Sparkles count={30} scale={1.5} size={4} color="#ff4444" speed={0.8} />
        <pointLight position={[0, 0, 0]} intensity={2} color="#ff4444" distance={3} />
      </group>
    </Float>
  );
};

// Ultra Premium Tiger Component
const UltraPremiumTiger = ({ position }: any) => {
  const tigerRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (tigerRef.current) {
      tigerRef.current.position.y = Math.sin(clock.elapsedTime * 1.5 + Math.PI) * 0.1;
    }
  });

  return (
    <Float floatIntensity={0.3} rotationIntensity={0.2}>
      <group ref={tigerRef} position={position}>
        {/* Tiger Body */}
        <mesh castShadow>
          <sphereGeometry args={[0.5, 32, 32]} />
          <MeshTransmissionMaterial
            backside
            samples={4}
            thickness={0.5}
            chromaticAberration={0.3}
            anisotropy={0.5}
            distortion={0.3}
            distortionScale={0.5}
            temporalDistortion={0.2}
            iridescence={1}
            iridescenceIOR={1.5}
            iridescenceThicknessRange={[0, 1400]}
          />
        </mesh>

        {/* Tiger Stripes */}
        {[...Array(4)].map((_, i) => (
          <mesh key={i} position={[0, 0.45 - i * 0.15, 0]} rotation={[0, 0, 0]}>
            <boxGeometry args={[0.8, 0.05, 0.1]} />
            <meshStandardMaterial color="#000000" metalness={0.7} roughness={0.3} />
          </mesh>
        ))}

        {/* Tiger Head */}
        <mesh position={[0, 0, 0.5]}>
          <sphereGeometry args={[0.3, 32, 32]} />
          <meshStandardMaterial color="#ffaa00" metalness={0.6} roughness={0.3} />
        </mesh>

        {/* Tiger Ears */}
        <mesh position={[-0.2, 0.2, 0.5]} rotation={[0, 0, -0.3]}>
          <coneGeometry args={[0.1, 0.2, 3]} />
          <meshStandardMaterial color="#ffaa00" metalness={0.6} roughness={0.3} />
        </mesh>
        <mesh position={[0.2, 0.2, 0.5]} rotation={[0, 0, 0.3]}>
          <coneGeometry args={[0.1, 0.2, 3]} />
          <meshStandardMaterial color="#ffaa00" metalness={0.6} roughness={0.3} />
        </mesh>

        {/* Tiger Eyes */}
        <mesh position={[-0.12, 0.05, 0.75]}>
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshStandardMaterial color="#00ff00" emissive="#00ff00" emissiveIntensity={2} />
        </mesh>
        <mesh position={[0.12, 0.05, 0.75]}>
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshStandardMaterial color="#00ff00" emissive="#00ff00" emissiveIntensity={2} />
        </mesh>

        {/* Tiger Nose */}
        <mesh position={[0, -0.05, 0.8]}>
          <sphereGeometry args={[0.03, 16, 16]} />
          <meshStandardMaterial color="#000000" metalness={0.8} roughness={0.2} />
        </mesh>

        {/* Whiskers */}
        {[...Array(3)].map((_, i) => (
          <mesh key={`left-${i}`} position={[-0.15, -0.08 + i * 0.03, 0.75]} rotation={[0, 0, -0.2]}>
            <boxGeometry args={[0.2, 0.005, 0.005]} />
            <meshStandardMaterial color="#000000" />
          </mesh>
        ))}
        {[...Array(3)].map((_, i) => (
          <mesh key={`right-${i}`} position={[0.15, -0.08 + i * 0.03, 0.75]} rotation={[0, 0, 0.2]}>
            <boxGeometry args={[0.2, 0.005, 0.005]} />
            <meshStandardMaterial color="#000000" />
          </mesh>
        ))}

        <Sparkles count={30} scale={1.5} size={4} color="#ffaa00" speed={0.8} />
        <pointLight position={[0, 0, 0]} intensity={2} color="#ffaa00" distance={3} />
      </group>
    </Float>
  );
};

// Ultra Premium Card Component
const UltraPremiumCard = ({ value, suit, position, isRevealed }: any) => {
  const cardRef = useRef<THREE.Group>(null);

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
    <Float floatIntensity={0.1} rotationIntensity={0.05}>
      <group ref={cardRef} position={position}>
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
          <meshStandardMaterial color="#c9a227" metalness={0.8} roughness={0.1} />
        </mesh>

        {/* Card Content */}
        {isRevealed && (
          <>
            <Text
              position={[-0.45, 0.7, 0.04]}
              fontSize={0.2}
              color={suitColors[suit]}
              font="https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxP.ttf"
            >
              {value}
            </Text>
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

        {!isRevealed && (
          <Sparkles count={15} scale={1} size={3} color="#ffd700" speed={0.5} />
        )}
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
        <planeGeometry args={[10, 6]} />
        <meshStandardMaterial color="#0d5c2e" metalness={0.3} roughness={0.6} />
      </mesh>

      {/* Table Border */}
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[10.5, 6.5]} />
        <meshStandardMaterial color="#8b4513" metalness={0.5} roughness={0.4} />
      </mesh>

      {/* Dragon Side */}
      <mesh position={[-2.5, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.5, 32]} />
        <meshStandardMaterial color="#ff4444" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[-2.5, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.4, 1.5, 32]} />
        <meshStandardMaterial color="#ffd700" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Tiger Side */}
      <mesh position={[2.5, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.5, 32]} />
        <meshStandardMaterial color="#ffaa00" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[2.5, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.4, 1.5, 32]} />
        <meshStandardMaterial color="#ffd700" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Center Tie Circle */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.8, 32]} />
        <meshStandardMaterial color="#4a90d9" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.7, 0.8, 32]} />
        <meshStandardMaterial color="#ffd700" metalness={0.9} roughness={0.1} />
      </mesh>

      <Sparkles count={60} scale={10} size={3} color="#ffd700" speed={0.2} />
    </group>
  );
};

// Main Scene Component
const DragonTiger3DScene = ({ gameState = 'idle', dragonCard = null, tigerCard = null, winner = null }: any) => {
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
        <pointLight position={[-5, 5, 5]} intensity={0.8} color="#ff4444" />
        <pointLight position={[5, 5, 5]} intensity={0.8} color="#ffaa00" />

        {/* Environment */}
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        <Sparkles count={100} scale={20} size={2} color="#ffffff" speed={0.2} />

        {/* Ground Grid */}
        <gridHelper args={[20, 20, '#444444', '#222222']} position={[0, -2, 0]} />

        {/* Ultra Particles */}
        <UltraParticles count={150} color="#ffd700" size={0.08} spread={8} />

        {/* Table */}
        <UltraPremiumTable />

        {/* Dragon */}
        <UltraPremiumDragon position={[-2.5, 1, 0]} />

        {/* Tiger */}
        <UltraPremiumTiger position={[2.5, 1, 0]} />

        {/* Dragon Card */}
        {dragonCard && (
          <UltraPremiumCard
            value={dragonCard.value}
            suit={dragonCard.suit}
            position={[-2.5, 0.5, 0]}
            isRevealed={gameState !== 'idle'}
          />
        )}

        {/* Tiger Card */}
        {tigerCard && (
          <UltraPremiumCard
            value={tigerCard.value}
            suit={tigerCard.suit}
            position={[2.5, 0.5, 0]}
            isRevealed={gameState !== 'idle'}
          />
        )}

        {/* Labels */}
        <Billboard position={[-2.5, 2.5, 0]}>
          <Text
            fontSize={0.5}
            color="#ff4444"
            font="https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxP.ttf"
            anchorX="center"
            anchorY="middle"
          >
            DRAGON
          </Text>
        </Billboard>
        <Billboard position={[2.5, 2.5, 0]}>
          <Text
            fontSize={0.5}
            color="#ffaa00"
            font="https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxP.ttf"
            anchorX="center"
            anchorY="middle"
          >
            TIGER
          </Text>
        </Billboard>

        {/* Winner Display */}
        {winner && (
          <Billboard position={[0, 3, 0]}>
            <Text
              fontSize={0.8}
              color={winner === 'dragon' ? '#ff4444' : winner === 'tiger' ? '#ffaa00' : '#4a90d9'}
              font="https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxP.ttf"
              anchorX="center"
              anchorY="middle"
            >
              {winner.toUpperCase()} WINS!
            </Text>
          </Billboard>
        )}

        {/* Controls */}
        <OrbitControls enableZoom={true} enablePan={true} enableRotate={true} />
      </Canvas>
    </div>
  );
};

export default DragonTiger3DScene;