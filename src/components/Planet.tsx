'use client';

import { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { atmosphereVert, atmosphereFrag } from '@/shaders/atmosphere';
import { planetVert, planetFrag } from '@/shaders/planet';
import type { Body } from '@/lib/solarSystem';
import { useStore } from '@/lib/store';
import FrontierMarker from './FrontierMarker';

const SUN_DIR = new THREE.Vector3(1, 0.5, 0.7).normalize();

type Props = {
  body: Body;
  worldPosRef?: { current: THREE.Vector3 };
  parentPos?: THREE.Vector3;     // for moons
  children?: React.ReactNode;
};

export default function Planet({ body, worldPosRef, parentPos, children }: Props) {
  const orbitGroup = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Mesh>(null);

  const planetId = useStore((s) => s.planetId);
  const focusPlanet = useStore((s) => s.focusPlaneta);
  const active = planetId === body.id;
  const dim = planetId && !active;

  // Per-body spin speed + seed de estilo (stable hash from id)
  const { spinSpeed, seed } = useMemo(() => {
    let h = 0;
    for (let i = 0; i < body.id.length; i++) h = (h * 31 + body.id.charCodeAt(i)) >>> 0;
    const sign = (h & 1) ? 1 : -1;
    const spin = sign * (0.12 + ((h % 100) / 100) * 0.28);
    const s = ((h >>> 8) % 1000) / 1000;
    return { spinSpeed: spin, seed: s };
  }, [body.id]);

  const planetUniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color(body.color) },
      uSunDir: { value: SUN_DIR.clone() },
      uSeed: { value: seed },
      uEmissive: { value: body.kind === 'nid' ? 0.6 : 0.12 },
      uTime: { value: 0 },
    }),
    [body.color, body.kind, seed],
  );

  const halo = useMemo(
    () => ({
      uColor: { value: new THREE.Color(body.color) },
      uSunDir: { value: SUN_DIR.clone() },
      uIntensity: { value: body.kind === 'nid' ? 2.0 : 1.1 },
    }),
    [body.color, body.kind],
  );

  useFrame((state, dt) => {
    if (!orbitGroup.current) return;
    const t = state.clock.elapsedTime;
    const angle = body.phase + t * body.speed;
    const cx = Math.cos(angle) * body.orbit;
    const cz = Math.sin(angle) * body.orbit;
    orbitGroup.current.position.set(cx, 0, cz);
    if (spin.current) spin.current.rotation.y += dt * spinSpeed;
    planetUniforms.uTime.value = t;

    if (worldPosRef) {
      worldPosRef.current.set(cx, 0, cz);
      if (parentPos) worldPosRef.current.add(parentPos);
    }
  });

  const labelFactor = body.kind === 'porto-acu' || body.kind === 'nid' ? 7 : 5;

  return (
    <group ref={orbitGroup}>
      {/* Halo */}
      <mesh scale={body.size * 1.4}>
        <sphereGeometry args={[1, 32, 32]} />
        <shaderMaterial
          vertexShader={atmosphereVert}
          fragmentShader={atmosphereFrag}
          uniforms={halo}
          transparent
          side={THREE.BackSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Body */}
      <mesh
        ref={spin}
        scale={body.size}
        onClick={(e) => {
          e.stopPropagation();
          focusPlanet(active ? null : body.id);
        }}
      >
        <sphereGeometry args={[1, 48, 48]} />
        {body.kind === 'nid' ? (
          <meshStandardMaterial
            color={body.color}
            emissive={body.color}
            emissiveIntensity={0.9}
            roughness={0.4}
            metalness={0.3}
            transparent
            opacity={dim ? 0.55 : 1}
            toneMapped={false}
          />
        ) : (
          <shaderMaterial
            vertexShader={planetVert}
            fragmentShader={planetFrag}
            uniforms={planetUniforms}
            transparent={!!dim}
            opacity={dim ? 0.55 : 1}
          />
        )}
      </mesh>

      {/* Label */}
      <Html
        position={[0, body.size + 0.15, 0]}
        center
        distanceFactor={labelFactor}
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        <div
          style={{
            padding: '3px 10px',
            borderLeft: `3px solid ${body.color}`,
            background: active ? 'rgba(10,22,40,0.95)' : 'rgba(5,11,22,0.65)',
            backdropFilter: 'blur(3px)',
            fontFamily: 'Orbitron, sans-serif',
            fontSize: 10,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            color: '#F2F7FC',
            whiteSpace: 'nowrap',
            maxWidth: 220,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            boxShadow: active ? `0 0 14px ${body.color}` : 'none',
            opacity: dim ? 0.35 : 1,
            transition: 'all .25s',
          }}
        >
          <span style={{ color: body.color, fontWeight: 700 }}>{body.nome}</span>
          {body.kind === 'setor' && body.projetos.length > 0 && (
            <span style={{ color: '#8A9BB0', marginLeft: 6 }}>
              · {body.projetos.length}
            </span>
          )}
          {body.sub && (
            <div style={{ fontSize: 8, color: '#8A9BB0', letterSpacing: 1, marginTop: 1 }}>
              {body.sub}
            </div>
          )}
        </div>
      </Html>

      {/* Fronteira: Porto do Açu e Houston ganham marcador de "nova exploração" */}
      {(body.kind === 'porto-acu' || body.kind === 'houston') && (
        <FrontierMarker
          color={body.color}
          size={body.size}
          label={body.kind === 'houston' ? 'MISSÃO LUNAR' : 'NOVA EXPLORAÇÃO'}
        />
      )}

      {children}
    </group>
  );
}
