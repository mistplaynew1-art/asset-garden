/**
 * Environment3D — shared Three.js environment primitives for the Aviator/Jetpack 3D scenes.
 *
 * Provides a full-world backdrop instead of a bare flat plane + stars:
 *   - <SkyDome />       : gradient sky dome shader (day→horizon→dusk colors)
 *   - <VolumetricClouds /> : drifting sprite-like clouds using noisy planes
 *   - <MountainRange /> : procedurally generated distant mountain silhouette
 *   - <CityScape />     : skyscraper city (windows glow, parallax scroll)
 *   - <Moon />          : glowing moon disc + halo
 *   - <GroundPlane />   : metallic reflective ground with radial tint
 *
 * All components are pure procedural (no external textures needed) so they
 * render the moment the Canvas mounts — no loading delay, no 404s.
 */
import { useMemo, useRef, memo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ============= SKY DOME =============
/**
 * Large inverted sphere with a vertical gradient shader — replaces a flat
 * background color with a real atmosphere that the camera can pitch against.
 */
export const SkyDome = memo(function SkyDome({
  topColor = '#0a0a28',
  horizonColor = '#2a1548',
  bottomColor = '#050818',
  sunPosition = [0.4, 0.25] as [number, number],
  sunColor = '#ff8c44',
}: {
  topColor?: string;
  horizonColor?: string;
  bottomColor?: string;
  /** Normalized sun position on the dome [azimuth, elevation] */
  sunPosition?: [number, number];
  sunColor?: string;
}) {
  const material = useMemo(() => {
    const uniforms = {
      topColor: { value: new THREE.Color(topColor) },
      horizonColor: { value: new THREE.Color(horizonColor) },
      bottomColor: { value: new THREE.Color(bottomColor) },
      sunColor: { value: new THREE.Color(sunColor) },
      sunDir: {
        value: new THREE.Vector3(
          Math.cos(sunPosition[0] * Math.PI * 2) * Math.cos(sunPosition[1] * Math.PI),
          Math.sin(sunPosition[1] * Math.PI),
          Math.sin(sunPosition[0] * Math.PI * 2) * Math.cos(sunPosition[1] * Math.PI)
        ).normalize(),
      },
    };
    return new THREE.ShaderMaterial({
      uniforms,
      side: THREE.BackSide,
      depthWrite: false,
      vertexShader: /* glsl */ `
        varying vec3 vWorldDir;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldDir = normalize(wp.xyz);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 topColor;
        uniform vec3 horizonColor;
        uniform vec3 bottomColor;
        uniform vec3 sunColor;
        uniform vec3 sunDir;
        varying vec3 vWorldDir;
        void main() {
          float h = vWorldDir.y;
          // top half: horizon -> top
          // bottom half: horizon -> bottom (darker for ground haze)
          vec3 col = h > 0.0
            ? mix(horizonColor, topColor, pow(clamp(h, 0.0, 1.0), 0.7))
            : mix(horizonColor, bottomColor, pow(clamp(-h, 0.0, 1.0), 0.8));
          // Sun glow
          float sunD = max(0.0, dot(normalize(vWorldDir), sunDir));
          col += sunColor * pow(sunD, 24.0) * 1.4;
          col += sunColor * pow(sunD, 4.0) * 0.18;
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
  }, [topColor, horizonColor, bottomColor, sunColor, sunPosition]);

  return (
    <mesh renderOrder={-1000}>
      <sphereGeometry args={[400, 32, 16]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
});

// ============= MOON =============
export const Moon = memo(function Moon({
  position = [80, 55, -120] as [number, number, number],
  color = '#eef2ff',
  size = 6,
}: {
  position?: [number, number, number];
  color?: string;
  size?: number;
}) {
  return (
    <group position={position}>
      {/* Disc */}
      <mesh>
        <sphereGeometry args={[size, 32, 32]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      {/* Outer halo */}
      <mesh>
        <sphereGeometry args={[size * 1.8, 24, 24]} />
        <meshBasicMaterial color={color} transparent opacity={0.18} depthWrite={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[size * 3, 24, 24]} />
        <meshBasicMaterial color={color} transparent opacity={0.06} depthWrite={false} />
      </mesh>
      <pointLight color={color} intensity={1.2} distance={200} decay={2} />
    </group>
  );
});

// ============= VOLUMETRIC CLOUDS =============
/**
 * Billboards that always face the camera, scroll slowly across the sky, and
 * respawn on the far side. Uses a soft radial gradient so each plane reads
 * as a 3D-looking cloud puff.
 */
export const VolumetricClouds = memo(function VolumetricClouds({
  count = 14,
  spreadX = 180,
  spreadZ = 60,
  y = 25,
  speed = 0.6,
  color = '#e6ebff',
}: {
  count?: number;
  spreadX?: number;
  spreadZ?: number;
  y?: number;
  speed?: number;
  color?: string;
}) {
  const group = useRef<THREE.Group>(null);

  const clouds = useMemo(() => {
    const arr: Array<{
      pos: [number, number, number];
      scale: number;
      speed: number;
      seed: number;
    }> = [];
    for (let i = 0; i < count; i++) {
      arr.push({
        pos: [
          (Math.random() - 0.5) * spreadX,
          y + (Math.random() - 0.5) * 10,
          -10 - Math.random() * spreadZ,
        ],
        scale: 8 + Math.random() * 18,
        speed: (0.5 + Math.random()) * speed,
        seed: Math.random() * 6,
      });
    }
    return arr;
  }, [count, spreadX, spreadZ, y, speed]);

  const cloudMat = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uColor: { value: new THREE.Color(color) },
        uTime: { value: 0 },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main(){
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        varying vec2 vUv;
        void main(){
          vec2 p = vUv - 0.5;
          float d = length(p);
          // 3 overlapping soft discs = puffy cloud
          float a = smoothstep(0.5, 0.05, d);
          float b = smoothstep(0.45, 0.1, length(p - vec2(0.2, 0.05)));
          float c = smoothstep(0.45, 0.1, length(p - vec2(-0.2, -0.02)));
          float alpha = clamp(a + b*0.8 + c*0.8, 0.0, 1.0) * 0.55;
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
    });
  }, [color]);

  useFrame((state, delta) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;
    group.current.children.forEach((child, i) => {
      const c = clouds[i];
      child.position.x += c.speed * delta * 2.5;
      // Gentle bob
      child.position.y = c.pos[1] + Math.sin(t * 0.25 + c.seed) * 0.6;
      // Wrap
      if (child.position.x > spreadX / 2 + 20) child.position.x = -spreadX / 2 - 20;
      // Always face camera
      child.quaternion.copy(state.camera.quaternion);
    });
    cloudMat.uniforms.uTime.value = t;
  });

  return (
    <group ref={group}>
      {clouds.map((c, i) => (
        <mesh key={i} position={c.pos} scale={c.scale}>
          <planeGeometry args={[1, 0.5]} />
          <primitive object={cloudMat} attach="material" />
        </mesh>
      ))}
    </group>
  );
});

// ============= MOUNTAIN RANGE =============
/**
 * Back-plane of procedurally jagged mountain silhouettes.
 */
export const MountainRange = memo(function MountainRange({
  z = -90,
  color = '#0e1430',
  width = 220,
  height = 35,
}: {
  z?: number;
  color?: string;
  width?: number;
  height?: number;
}) {
  const geometry = useMemo(() => {
    const segments = 80;
    const shape = new THREE.Shape();
    shape.moveTo(-width / 2, 0);
    for (let i = 0; i <= segments; i++) {
      const x = -width / 2 + (width * i) / segments;
      const n =
        Math.sin(i * 0.43) * 0.5 +
        Math.sin(i * 1.1 + 1.2) * 0.25 +
        Math.sin(i * 2.7 + 3.1) * 0.12 +
        Math.sin(i * 5.2 + 0.7) * 0.06;
      const y = (0.55 + n * 0.5) * height;
      shape.lineTo(x, y);
    }
    shape.lineTo(width / 2, 0);
    shape.lineTo(-width / 2, 0);
    return new THREE.ShapeGeometry(shape);
  }, [width, height]);

  return (
    <mesh geometry={geometry} position={[0, -0.5, z]} renderOrder={-900}>
      <meshBasicMaterial color={color} />
    </mesh>
  );
});

// ============= CITY SCAPE =============
/**
 * Cluster of procedurally sized skyscrapers with glowing window grids.
 * Meant to sit on the ground far from the camera so the jetpack/plane can
 * climb above them.
 */
export const CityScape = memo(function CityScape({
  count = 40,
  spread = 160,
  depthStart = -40,
  depthEnd = -110,
  y = -0.5,
}: {
  count?: number;
  spread?: number;
  depthStart?: number;
  depthEnd?: number;
  y?: number;
}) {
  const buildings = useMemo(() => {
    const arr: Array<{
      pos: [number, number, number];
      size: [number, number, number];
      windowColor: string;
      accentColor: string;
    }> = [];
    const palette = ['#ffe7a0', '#a3c7ff', '#ff9d6b', '#c8d4ff'];
    const accentPal = ['#00f5ff', '#ff00ff', '#ffd166', '#ff3b7f'];
    for (let i = 0; i < count; i++) {
      const w = 3 + Math.random() * 5;
      const h = 12 + Math.random() * 38;
      const d = 3 + Math.random() * 5;
      const x = (Math.random() - 0.5) * spread;
      const z = depthStart + Math.random() * (depthEnd - depthStart);
      arr.push({
        pos: [x, y + h / 2, z],
        size: [w, h, d],
        windowColor: palette[Math.floor(Math.random() * palette.length)],
        accentColor: accentPal[Math.floor(Math.random() * accentPal.length)],
      });
    }
    return arr;
  }, [count, spread, depthStart, depthEnd, y]);

  return (
    <group>
      {buildings.map((b, i) => (
        <group key={i} position={b.pos}>
          {/* Body */}
          <mesh castShadow receiveShadow>
            <boxGeometry args={b.size} />
            <meshStandardMaterial
              color="#0c1028"
              metalness={0.6}
              roughness={0.45}
              emissive="#05071a"
            />
          </mesh>
          {/* Front-face glowing windows (emissive plane w/ noisy tex via shader) */}
          <mesh position={[0, 0, b.size[2] / 2 + 0.01]}>
            <planeGeometry args={[b.size[0] * 0.9, b.size[1] * 0.92]} />
            <WindowMaterial
              baseColor={b.windowColor}
              accentColor={b.accentColor}
              seed={i * 17.37}
            />
          </mesh>
          {/* Roof antenna */}
          {i % 4 === 0 && (
            <mesh position={[0, b.size[1] / 2 + 1.5, 0]}>
              <cylinderGeometry args={[0.05, 0.05, 3, 6]} />
              <meshStandardMaterial color="#44556f" metalness={0.7} roughness={0.3} />
            </mesh>
          )}
          {/* Blinking tip light */}
          {i % 4 === 0 && (
            <BlinkingLight position={[0, b.size[1] / 2 + 3, 0]} color={b.accentColor} seed={i} />
          )}
        </group>
      ))}
    </group>
  );
});

// ============= WINDOW MATERIAL (shader) =============
function WindowMaterial({
  baseColor,
  accentColor,
  seed,
}: {
  baseColor: string;
  accentColor: string;
  seed: number;
}) {
  const mat = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      uniforms: {
        uBase: { value: new THREE.Color(baseColor) },
        uAccent: { value: new THREE.Color(accentColor) },
        uSeed: { value: seed },
        uTime: { value: 0 },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main(){
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uBase;
        uniform vec3 uAccent;
        uniform float uSeed;
        uniform float uTime;
        varying vec2 vUv;
        float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        void main(){
          // 12 x 20 window grid
          vec2 g = vUv * vec2(8.0, 22.0);
          vec2 cell = floor(g);
          vec2 f = fract(g);
          float mask = step(0.08, f.x) * step(f.x, 0.92) * step(0.12, f.y) * step(f.y, 0.88);
          float on = step(0.38, hash(cell + uSeed));
          float flicker = 0.85 + 0.15 * sin(uTime * 3.0 + cell.x * 7.0 + cell.y * 3.0);
          // 10% chance of accent neon window
          float accentOn = step(0.92, hash(cell + uSeed + 1.3));
          vec3 base = mix(uBase, uAccent, accentOn);
          float alpha = mask * on * flicker;
          gl_FragColor = vec4(base * (0.7 + alpha * 0.9), 0.05 + alpha * 0.95);
        }
      `,
    });
  }, [baseColor, accentColor, seed]);

  useFrame((state) => {
    mat.uniforms.uTime.value = state.clock.elapsedTime;
  });

  return <primitive object={mat} attach="material" />;
}

// ============= BLINKING LIGHT =============
function BlinkingLight({
  position,
  color,
  seed,
}: {
  position: [number, number, number];
  color: string;
  seed: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime + seed;
    const on = Math.sin(t * 2) > 0.4 ? 1 : 0.15;
    (ref.current.material as THREE.MeshBasicMaterial).opacity = on;
  });
  return (
    <mesh ref={ref} position={position}>
      <sphereGeometry args={[0.15, 8, 8]} />
      <meshBasicMaterial color={color} transparent opacity={1} toneMapped={false} />
    </mesh>
  );
}

// ============= GROUND PLANE =============
export const GroundPlane = memo(function GroundPlane({
  color = '#0a0a18',
  size = 300,
  gridColor1 = '#1a1a4a',
  gridColor2 = '#0a0a2a',
  divisions = 60,
}: {
  color?: string;
  size?: number;
  gridColor1?: string;
  gridColor2?: string;
  divisions?: number;
}) {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
        <planeGeometry args={[size, size]} />
        <meshStandardMaterial color={color} metalness={0.85} roughness={0.35} />
      </mesh>
      <gridHelper args={[size, divisions, gridColor1, gridColor2]} position={[0, -0.48, 0]} />
    </>
  );
});
