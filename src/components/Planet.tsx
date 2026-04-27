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

// Direção solar coerente com a luz em Sun.tsx (origem no centro).
// Em órbita, a posição-mundo do planeta dá a direção real pro Sol.
const SUN_WORLD = new THREE.Vector3(0, 0, 0);
const _tmpDir = new THREE.Vector3();

type Props = {
  body: Body;
  worldPosRef?: { current: THREE.Vector3 };
  parentPos?: THREE.Vector3;     // for moons
  children?: React.ReactNode;
};

// Shader do anel planetário (tipo Saturno). Derivado por hash estável do id.
const ringVert = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorldPos;
varying vec3 vLocalPos;
void main() {
  vUv = uv;
  vLocalPos = position;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;
const ringFrag = /* glsl */ `
precision highp float;
varying vec2 vUv;
varying vec3 vWorldPos;
varying vec3 vLocalPos;
uniform vec3 uColor;
uniform vec3 uSunDir;
uniform float uInner;
uniform float uOuter;

float hash(float x) { return fract(sin(x * 127.1) * 43758.5453); }

void main() {
  // distância radial no plano do anel
  float r = length(vLocalPos.xz);
  float t = (r - uInner) / (uOuter - uInner);
  if (t < 0.0 || t > 1.0) discard;

  // bandas com gaps (Cassini-style)
  float bands = 0.0;
  for (float i = 0.0; i < 7.0; i++) {
    float center = hash(i * 3.17) * 0.9 + 0.05;
    float width  = 0.04 + hash(i * 1.31) * 0.08;
    bands += smoothstep(width, 0.0, abs(t - center));
  }
  float dustLane = smoothstep(0.38, 0.42, t) * (1.0 - smoothstep(0.46, 0.5, t));
  float density = mix(0.6, 1.0, fract(t * 14.0 + hash(floor(t * 14.0))));
  density *= (1.0 - dustLane * 0.85);
  density *= mix(0.75, 1.0, bands);

  // sombra do planeta projetada no anel (lado contrário ao sol)
  vec3 toSun = normalize(uSunDir);
  // posição em espaço do planeta (origem do mesh pai == origem do ring pai)
  float sunSide = dot(normalize(vec3(vLocalPos.x, 0.0, vLocalPos.z)), toSun);
  float shadow = smoothstep(-0.25, 0.1, sunSide);

  // sutil tingimento por ângulo
  float alpha = density * 0.55;
  vec3 col = uColor * mix(0.6, 1.1, density) * shadow;
  gl_FragColor = vec4(col, alpha);
}
`;

export default function Planet({ body, worldPosRef, parentPos, children }: Props) {
  const orbitGroup = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Mesh>(null);
  const atmo = useRef<THREE.Mesh>(null);

  const planetId = useStore((s) => s.planetId);
  const focusPlanet = useStore((s) => s.focusPlaneta);
  const active = planetId === body.id;
  const dim = planetId && !active;

  // hash estável do id
  const { spinSpeed, seed, axialTilt, hasRings } = useMemo(() => {
    let h = 0;
    for (let i = 0; i < body.id.length; i++) h = (h * 31 + body.id.charCodeAt(i)) >>> 0;
    const sign = (h & 1) ? 1 : -1;
    const spin = sign * (0.08 + ((h % 100) / 100) * 0.22);
    const s = ((h >>> 8) % 1000) / 1000;
    // inclinação axial realista: -25° a +25°
    const tilt = (((h >>> 16) % 1000) / 1000 - 0.5) * (50 * Math.PI / 180);
    // só planetas gasosos maiores ganham anel, e nem todos
    const gasLike = s >= 0.33 && s < 0.66;
    const rings = gasLike && body.size > 0.28 && ((h >>> 4) & 3) === 0 && body.kind === 'setor';
    return { spinSpeed: spin, seed: s, axialTilt: tilt, hasRings: rings };
  }, [body.id, body.size, body.kind]);

  const planetUniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color(body.color) },
      uSunDir: { value: new THREE.Vector3(1, 0.2, 0.3).normalize() },
      uSeed: { value: seed },
      uEmissive: { value: body.kind === 'nid' ? 0.55 : 0.04 },
      uTime: { value: 0 },
    }),
    [body.color, body.kind, seed],
  );

  const halo = useMemo(
    () => ({
      uColor: { value: new THREE.Color(body.color) },
      uSunDir: { value: new THREE.Vector3(1, 0.2, 0.3).normalize() },
      uIntensity: { value: body.kind === 'nid' ? 1.8 : 0.9 },
    }),
    [body.color, body.kind],
  );

  const ringUniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color(body.color).lerp(new THREE.Color('#E8D8B8'), 0.4) },
      uSunDir: { value: new THREE.Vector3(1, 0.2, 0.3).normalize() },
      uInner: { value: body.size * 1.6 },
      uOuter: { value: body.size * 2.6 },
    }),
    [body.color, body.size],
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

    // atualiza direção do sol em coordenadas-mundo (mais realista: cada planeta
    // é iluminado pelo sol real, não por uma direção fixa).
    if (worldPosRef) {
      worldPosRef.current.set(cx, 0, cz);
      if (parentPos) worldPosRef.current.add(parentPos);
      _tmpDir.copy(SUN_WORLD).sub(worldPosRef.current).normalize();
      planetUniforms.uSunDir.value.copy(_tmpDir);
      halo.uSunDir.value.copy(_tmpDir);
      ringUniforms.uSunDir.value.copy(_tmpDir);
    }
  });

  const labelFactor = body.kind === 'porto-acu' || body.kind === 'nid' ? 7 : 5;

  return (
    <group ref={orbitGroup}>
      {/* Inclinação axial: rotaciona o container do corpo + atmosfera + anéis */}
      <group rotation={[0, 0, axialTilt]}>
        {/* Halo / atmosfera */}
        <mesh ref={atmo} scale={body.size * 1.06}>
          <sphereGeometry args={[1, 40, 40]} />
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
          <sphereGeometry args={[1, 64, 64]} />
          {body.kind === 'nid' ? (
            <meshStandardMaterial
              color={body.color}
              emissive={body.color}
              emissiveIntensity={0.85}
              roughness={0.35}
              metalness={0.25}
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

        {/* Anéis tipo Saturno (apenas gasosos grandes, seed-dependent) */}
        {hasRings && !dim && (
          <mesh rotation={[Math.PI / 2, 0, 0]} scale={1}>
            <ringGeometry args={[body.size * 1.6, body.size * 2.6, 96, 1]} />
            <shaderMaterial
              vertexShader={ringVert}
              fragmentShader={ringFrag}
              uniforms={ringUniforms}
              transparent
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        )}
      </group>

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
