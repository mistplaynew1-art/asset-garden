/**
 * PhaserSlotMachine - Slot game using Phaser.js for reels and Three.js for 3D cabinet
 * Demonstrates the hybrid rendering approach
 */
import React, { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

// ============= Phaser Game Configuration =============
const SYMBOLS = ['💎', '🍒', '🍋', '🍊', '⭐', '7️⃣', '🎰', '🔔'];
const REEL_COUNT = 5;
const ROW_COUNT = 3;
const SYMBOL_SIZE = 80;
const SPIN_DURATION = 2000;

class SlotScene extends Phaser.Scene {
  private reels: Phaser.GameObjects.Container[] = [];
  private spinButtons: Phaser.GameObjects.Text | null = null;
  private isSpinning: boolean = false;
  private reelResults: string[][] = [];
  private onWin?: (amount: number) => void;
  private onSpinStart?: () => void;

  constructor() {
    super({ key: 'SlotScene' });
  }

  init(data: { onWin?: (amount: number) => void; onSpinStart?: () => void }) {
    this.onWin = data.onWin;
    this.onSpinStart = data.onSpinStart;
  }

  create() {
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;

    // Create background
    this.add.rectangle(centerX, centerY, 500, 300, 0x1a1a2e, 0.9);

    // Create reels
    for (let i = 0; i < REEL_COUNT; i++) {
      const reelContainer = this.createReel(i);
      this.reels.push(reelContainer);
    }

    // Create spin button
    this.spinButtons = this.add
      .text(centerX, centerY + 180, '🎰 SPIN', {
        fontSize: '32px',
        color: '#ffffff',
        backgroundColor: '#4CAF50',
        padding: { x: 30, y: 15 },
      })
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.spin())
      .on('pointerover', () => this.spinButtons?.setStyle({ backgroundColor: '#45a049' }))
      .on('pointerout', () => this.spinButtons?.setStyle({ backgroundColor: '#4CAF50' }));

    // Create win lines display
    this.createWinLines();
  }

  private createReel(index: number): Phaser.GameObjects.Container {
    const startX = this.cameras.main.centerX - (REEL_COUNT - 1) * SYMBOL_SIZE / 2;
    const x = startX + index * SYMBOL_SIZE;
    const y = this.cameras.main.centerY;

    const container = this.add.container(x, y);

    // Create visible symbols (3 rows)
    for (let row = -1; row <= 1; row++) {
      const symbol = Phaser.Math.RND.pick(SYMBOLS);
      const text = this.add.text(0, row * SYMBOL_SIZE, symbol, {
        fontSize: '60px',
      });
      text.setOrigin(0.5);
      container.add(text);
    }

    // Create mask for visible area
    const mask = this.make.graphics({});
    mask.fillStyle(0xffffff);
    mask.fillRect(x - SYMBOL_SIZE / 2, y - SYMBOL_SIZE * 1.5, SYMBOL_SIZE, SYMBOL_SIZE * 3);
    container.setMask(mask.createGeometryMask());

    return container;
  }

  private createWinLines(): void {
    // Add decorative win lines
    const graphics = this.add.graphics();
    graphics.lineStyle(2, 0xffd700, 0.5);

    // Middle line
    graphics.moveTo(
      this.cameras.main.centerX - REEL_COUNT * SYMBOL_SIZE / 2,
      this.cameras.main.centerY
    );
    graphics.lineTo(
      this.cameras.main.centerX + REEL_COUNT * SYMBOL_SIZE / 2,
      this.cameras.main.centerY
    );
    graphics.strokePath();
  }

  spin(): void {
    if (this.isSpinning) return;
    this.isSpinning = true;
    this.onSpinStart?.();

    // Generate results
    this.reelResults = [];
    for (let i = 0; i < REEL_COUNT; i++) {
      const reelSymbols: string[] = [];
      for (let j = 0; j < ROW_COUNT; j++) {
        reelSymbols.push(Phaser.Math.RND.pick(SYMBOLS));
      }
      this.reelResults.push(reelSymbols);
    }

    // Animate each reel
    this.reels.forEach((reel, index) => {
      this.spinReel(reel, index, this.reelResults[index]);
    });

    // Check for wins after all reels stop
    const totalDuration = SPIN_DURATION + (REEL_COUNT - 1) * 300;
    this.time.delayedCall(totalDuration + 500, () => {
      this.checkWins();
      this.isSpinning = false;
    });
  }

  private spinReel(
    reel: Phaser.GameObjects.Container,
    index: number,
    finalSymbols: string[]
  ): void {
    const delay = index * 300;
    const duration = SPIN_DURATION;

    // Add extra symbols for spinning effect
    for (let i = 0; i < 20; i++) {
      const symbol = Phaser.Math.RND.pick(SYMBOLS);
      const text = this.add.text(0, -SYMBOL_SIZE * 2 - i * SYMBOL_SIZE, symbol, {
        fontSize: '60px',
      });
      text.setOrigin(0.5);
      reel.add(text);
    }

    // Final symbols
    finalSymbols.forEach((symbol, i) => {
      const text = this.add.text(0, (i - 1) * SYMBOL_SIZE, symbol, {
        fontSize: '60px',
      });
      text.setOrigin(0.5);
      reel.add(text);
    });

    // Spin animation
    this.tweens.add({
      targets: reel,
      y: reel.y + SYMBOL_SIZE * 20,
      duration: duration,
      delay: delay,
      ease: 'Power2',
      onComplete: () => {
        // Reset position and show final symbols
        reel.y = this.cameras.main.centerY;
        reel.removeAll(true);
        
        finalSymbols.forEach((symbol, i) => {
          const text = this.add.text(0, (i - 1) * SYMBOL_SIZE, symbol, {
            fontSize: '60px',
          });
          text.setOrigin(0.5);
          reel.add(text);
        });
      },
    });
  }

  private checkWins(): void {
    // Check middle row for matching symbols
    const middleRow = this.reelResults.map((reel) => reel[1]);

    // Count consecutive matches from left
    let matchCount = 1;
    const firstSymbol = middleRow[0];

    for (let i = 1; i < middleRow.length; i++) {
      if (middleRow[i] === firstSymbol) {
        matchCount++;
      } else {
        break;
      }
    }

    if (matchCount >= 3) {
      const winAmount = matchCount * 10;
      this.showWin(winAmount);
      this.onWin?.(winAmount);
    }
  }

  private showWin(amount: number): void {
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;

    const winText = this.add
      .text(centerX, centerY - 100, `WIN $${amount}!`, {
        fontSize: '48px',
        color: '#ffd700',
        fontStyle: 'bold',
        stroke: '#000',
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    // Animate win text
    this.tweens.add({
      targets: winText,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 300,
      yoyo: true,
      repeat: 3,
      onComplete: () => {
        this.tweens.add({
          targets: winText,
          alpha: 0,
          duration: 500,
          onComplete: () => winText.destroy(),
        });
      },
    });

    // Particle effects
    const particles = this.add.particles(centerX, centerY, '', {
      speed: { min: 100, max: 200 },
      scale: { start: 0.4, end: 0 },
      lifespan: 1000,
      quantity: 50,
      emitting: false,
    });

    particles.explode();
  }
}

// ============= 3D Cabinet Component =============
function SlotCabinet() {
  const groupRef = useRef<THREE.Group>(null);

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* Cabinet frame */}
      <mesh position={[0, 1.5, -0.5]} castShadow receiveShadow>
        <boxGeometry args={[3, 3, 0.3]} />
        <meshStandardMaterial color="#1a1a2e" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Screen bezel */}
      <mesh position={[0, 1.5, -0.3]} castShadow>
        <boxGeometry args={[2.8, 2.8, 0.1]} />
        <meshStandardMaterial color="#2d2d44" metalness={0.6} roughness={0.3} />
      </mesh>

      {/* Top light */}
      <mesh position={[0, 3.2, -0.3]} castShadow>
        <boxGeometry args={[2.5, 0.3, 0.2]} />
        <meshStandardMaterial color="#ffd700" emissive="#ffd700" emissiveIntensity={0.5} />
      </mesh>
      <pointLight position={[0, 3.2, 0]} color="#ffd700" intensity={1} distance={3} />

      {/* Side panels */}
      <mesh position={[-1.5, 1.5, 0]} rotation={[0, Math.PI / 2, 0]} castShadow>
        <boxGeometry args={[1, 2.5, 0.2]} />
        <meshStandardMaterial color="#4a4a6a" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[1.5, 1.5, 0]} rotation={[0, Math.PI / 2, 0]} castShadow>
        <boxGeometry args={[1, 2.5, 0.2]} />
        <meshStandardMaterial color="#4a4a6a" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Base */}
      <mesh position={[0, -0.25, 0.5]} castShadow receiveShadow>
        <boxGeometry args={[3.5, 0.5, 2]} />
        <meshStandardMaterial color="#1a1a2e" metalness={0.5} roughness={0.4} />
      </mesh>
    </group>
  );
}

// ============= Main Component =============
interface PhaserSlotMachineProps {
  onWin?: (amount: number) => void;
  onSpinStart?: () => void;
  className?: string;
}

export default function PhaserSlotMachine({
  onWin,
  onSpinStart,
  className = '',
}: PhaserSlotMachineProps) {
  const gameRef = useRef<HTMLDivElement>(null);
  const phaserGameRef = useRef<Phaser.Game | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Initialize Phaser game
  useEffect(() => {
    if (!gameRef.current || phaserGameRef.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: gameRef.current,
      width: 500,
      height: 400,
      backgroundColor: '#0a0a1a',
      transparent: true,
      scene: SlotScene,
    };

    phaserGameRef.current = new Phaser.Game(config);

    // Pass callbacks to scene
    phaserGameRef.current.scene.start('SlotScene', { onWin, onSpinStart });

    setIsReady(true);

    return () => {
      phaserGameRef.current?.destroy(true);
      phaserGameRef.current = null;
    };
  }, []);

  return (
    <div className={`relative w-full h-full ${className}`}>
      {/* Three.js 3D Background */}
      <div className="absolute inset-0 z-0">
        <Canvas
          camera={{ position: [0, 2, 5], fov: 50 }}
          gl={{ antialias: true, alpha: true }}
        >
          <ambientLight intensity={0.4} />
          <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
          <pointLight position={[-3, 3, 3]} color="#ff6b6b" intensity={0.5} />
          <pointLight position={[3, 3, -3]} color="#4ecdc4" intensity={0.5} />

          <SlotCabinet />

          <OrbitControls
            enableZoom={false}
            enablePan={false}
            maxPolarAngle={Math.PI / 2}
            minPolarAngle={Math.PI / 4}
          />
        </Canvas>
      </div>

      {/* Phaser Slot Game */}
      <div
        ref={gameRef}
        className="absolute z-10"
        style={{
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      />
    </div>
  );
}