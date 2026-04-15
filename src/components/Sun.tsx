'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Delp palette: vermelho + branco
const DELP_RED = '#E30613';
const DELP_RED_DEEP = '#B8000C';
const DELP_HOT = '#FFFFFF';
const LIGHT_WARM = '#FFEAEC';

function makeRadialTex(stops: [number, string][], size = 256) {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [o, col] of stops) g.addColorStop(o, col);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

export default function Sun({ size = 0.9 }: { size?: number }) {
  const core = useRef<THREE.Mesh>(null);
  const halo = useRef<THREE.Mesh>(null);
  const glow = useRef<THREE.Mesh>(null);
  const spikeH = useRef<THREE.Sprite>(null);
  const spikeV = useRef<THREE.Sprite>(null);
  const flare = useRef<THREE.Sprite>(null);

  const flareTex = useMemo(
    () =>
      makeRadialTex([
        [0, 'rgba(255,255,255,1)'],
        [0.18, 'rgba(255,220,225,0.85)'],
        [0.45, 'rgba(227,6,19,0.4)'],
        [1, 'rgba(0,0,0,0)'],
      ]),
    [],
  );

  const spikeTex = useMemo(
    () =>
      makeRadialTex([
        [0, 'rgba(255,255,255,1)'],
        [0.12, 'rgba(255,200,205,0.7)'],
        [0.5, 'rgba(227,6,19,0.15)'],
        [1, 'rgba(0,0,0,0)'],
      ]),
    [],
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (core.current) core.current.rotation.y = t * 0.15;

    const pulse = 1 + Math.sin(t * 1.8) * 0.04;
    if (halo.current) halo.current.scale.setScalar(size * 2.1 * pulse);
    if (glow.current) glow.current.scale.setScalar(size * 1.35 * (1 + Math.sin(t * 2.3) * 0.02));

    const flickerH = size * 7 * (1 + Math.sin(t * 3.1) * 0.12);
    const flickerV = size * 7 * (1 + Math.sin(t * 2.7 + 0.6) * 0.12);
    if (spikeH.current) spikeH.current.scale.set(flickerH, size * 0.5, 1);
    if (spikeV.current) spikeV.current.scale.set(size * 0.5, flickerV, 1);
    if (flare.current) {
      const s = size * 3.6 * (1 + Math.sin(t * 1.2) * 0.08);
      flare.current.scale.set(s, s, 1);
    }
  });

  return (
    <group>
      {/* Halo externo (aditivo) */}
      <mesh ref={halo}>
        <sphereGeometry args={[1, 24, 24]} />
        <meshBasicMaterial
          color={DELP_RED}
          transparent
          opacity={0.22}
          depthWrite={false}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Glow médio */}
      <mesh ref={glow}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial
          color={DELP_RED_DEEP}
          transparent
          opacity={0.4}
          depthWrite={false}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Core branco-quente */}
      <mesh ref={core} scale={size}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshBasicMaterial color={DELP_HOT} toneMapped={false} />
      </mesh>

      {/* Anel de plasma — tom vermelho entre core e halo */}
      <mesh scale={size * 1.08}>
        <sphereGeometry args={[1, 48, 48]} />
        <meshBasicMaterial
          color={DELP_RED}
          transparent
          opacity={0.55}
          depthWrite={false}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Lens flare: disco radial */}
      {flareTex && (
        <sprite ref={flare}>
          <spriteMaterial
            map={flareTex}
            transparent
            depthWrite={false}
            depthTest={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </sprite>
      )}

      {/* Lens flare: spikes (horizontal + vertical) */}
      {spikeTex && (
        <>
          <sprite ref={spikeH}>
            <spriteMaterial
              map={spikeTex}
              transparent
              depthWrite={false}
              depthTest={false}
              blending={THREE.AdditiveBlending}
              toneMapped={false}
              opacity={0.9}
            />
          </sprite>
          <sprite ref={spikeV}>
            <spriteMaterial
              map={spikeTex}
              transparent
              depthWrite={false}
              depthTest={false}
              blending={THREE.AdditiveBlending}
              toneMapped={false}
              opacity={0.9}
            />
          </sprite>
        </>
      )}

      <pointLight color={LIGHT_WARM} intensity={2.4} distance={34} decay={1.1} />
    </group>
  );
}
