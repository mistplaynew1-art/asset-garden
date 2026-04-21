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

// Ultra Premium Tower Block Component
const UltraPremiumTowerBlock = ({ position, level, index, isRevealed, isSafe, isSelected, onClick }: any) => {
  const blockRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dfe6e9', '#fd79a8', '#a29bfe'];
  const blockColor = colors[(level + index) % colors.length];

  return (
    <Float floatIntensity={0.1} rotationIntensity={0.1}>
      <group
        ref={blockRef}
        position={position}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onClick={onClick}
      >
        {/* Block Body */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.9, 0.4, 0.9]} />
          <meshStandardMaterial
            color={isRevealed ? (isSafe ? '#4ecdc4' : '#ff6b6b') : blockColor}
            metalness={0.4}
            roughness={0.3}
            transparent
            opacity={isRevealed ? 0.9 : 0.7}
          />
        </mesh>

        {/* Block Border */}
        <mesh position={[0, 0, 0.46]}>
          <boxGeometry args={[0.95, 0.45, 0.02]} />
          <meshStandardMaterial
            color={hovered || isSelected ? '#ffd700' : '#c9a227'}
            metalness={0.8}
            roughness={0.1}
          />
        </mesh>

        {/* Block Top */}
        <mesh position={[0, 0.23, 0]}>
          <boxGeometry args={[0.9, 0.02, 0.9]} />
          <meshStandardMaterial
            color={hovered || isSelected ? '#ffd700' : '#c9a227'}
            metalness={0.8}
            roughness={0.1}
          />
        </mesh>

        {/* Gem Indicator */}
        {isSafe && isRevealed && (
          <>
            <mesh position={[0, 0.3, 0]}>
              <octahedronGeometry args={[0.15, 0]} />
              <MeshTransmissionMaterial
                backside
                samples={4}
                thickness={0.5}
                chromaticAberration={0.2}
                anisotropy={0.5}
                distortion={0.2}
                distortionScale={0.3}
                temporalDistortion={0.1}
                iridescence={1}
                iridescenceIOR={1}
                iridescenceThicknessRange={[0, 1400]}
              />
            </mesh>
            <Sparkles count={10} scale={0.5} size={3} color="#ffd700" speed={0.5} />
          </>
        )}

        {/* Bomb Indicator */}
        {!isSafe && isRevealed && (
          <>
            <mesh position={[0, 0.3, 0]}>
              <sphereGeometry args={[0.12, 16, 16]} />
              <meshStandardMaterial color="#ff0000" metalness={0.8} roughness={0.2} />
            </mesh>
            <Sparkles count={15} scale={0.5} size={3} color="#ff0000" speed={0.8} />
          </>
        )}

        {/* Glow Effect */}
        {hovered && !isRevealed && (
          <pointLight position={[0, 0, 0.5]} intensity={1.5} color="#ffd700" distance={2} />
        )}

        {/* Selection Glow */}
        {isSelected && (
          <pointLight position={[0, 0, 0.5]} intensity={2} color="#00ff00" distance={2.5} />
        )}
      </group>
    </Float>
  );
};

// Ultra Premium Tower Component
const UltraPremiumTower = ({ levels = 8, blocksPerLevel = 3, selectedBlocks = [], revealedBlocks = [], onBlockClick }: any) => {
  return (
    <group>
      {Array.from({ length: levels }).map((_, levelIndex) => (
        <group key={levelIndex} position={[0, levelIndex * 0.5, 0]}>
          {Array.from({ length: blocksPerLevel }).map((_, blockIndex) => {
            const xPos = (blockIndex - (blocksPerLevel - 1) / 2) * 1.0;
            const blockKey = `${levelIndex}-${blockIndex}`;
            const isSelected = selectedBlocks.includes(blockKey);
            const isRevealed = revealedBlocks.find((rb: any) => rb.key === blockKey);
            const isSafe = isRevealed ? isRevealed.isSafe : false;

            return (
              <UltraPremiumTowerBlock
                key={blockKey}
                position={[xPos, 0, 0]}
                level={levelIndex}
                index={blockIndex}
                isRevealed={!!isRevealed}
                isSafe={isSafe}
                isSelected={isSelected}
                onClick={() => onBlockClick && onBlockClick(blockKey)}
              />
            );
          })}
        </group>
      ))}
    </group>
  );
};

// Ultra Premium Base Platform
const UltraPremiumBasePlatform = () => {
  return (
    <group position={[0, -0.3, 0]}>
      <mesh receiveShadow>
        <cylinderGeometry args={[2.5, 2.8, 0.3, 32]} />
        <meshStandardMaterial color="#1a1a2e" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.16, 0]}>
        <cylinderGeometry args={[2.6, 2.6, 0.02, 32]} />
        <meshStandardMaterial color="#c9a227" metalness={0.8} roughness={0.1} />
      </mesh>
      <Sparkles count={40} scale={3} size={4} color="#ffd700" speed={0.3} />
    </group>
  );
};

// Main Scene Component
const Tower3DScene = ({ gameState = 'idle', currentLevel = 0, selectedBlocks = [], revealedBlocks = [], onBlockClick }: any) => {
  return (
    <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)' }}>
      <Canvas
        camera={{ position: [0, 3, 7], fov: 50 }}
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

        {/* Base Platform */}
        <UltraPremiumBasePlatform />

        {/* Tower */}
        <UltraPremiumTower
          levels={8}
          blocksPerLevel={3}
          selectedBlocks={selectedBlocks}
          revealedBlocks={revealedBlocks}
          onBlockClick={onBlockClick}
        />

        {/* Game Status Text */}
        {gameState !== 'idle' && (
          <Billboard position={[0, 5, 0]}>
            <Text
              fontSize={0.5}
              color="#ffd700"
              font="https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxP.ttf"
              anchorX="center"
              anchorY="middle"
            >
              {gameState === 'won' ? 'YOU WIN!' : gameState === 'lost' ? 'GAME OVER' : `LEVEL ${currentLevel}`}
            </Text>
          </Billboard>
        )}

        {/* Controls */}
        <OrbitControls enableZoom={true} enablePan={true} enableRotate={true} />
      </Canvas>
    </div>
  );
};

export default Tower3DScene;