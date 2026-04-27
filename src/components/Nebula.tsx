'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const vert = /* glsl */ `
varying vec3 vDir;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vDir = normalize(wp.xyz);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

// Nebulosa mais sutil e coerente: uma banda galáctica com 2-3 nuvens grandes,
// ao invés de um fundo totalmente colorido. Mais espaço = mais preto.
const frag = /* glsl */ `
precision highp float;
varying vec3 vDir;
uniform float uTime;

float hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float vnoise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
        mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
    mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
        mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y),
    f.z);
}

float fbm(vec3 p) {
  float v = 0.0;
  float a = 0.55;
  for (int i = 0; i < 6; i++) {
    v += a * vnoise(p);
    p *= 2.03;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec3 d = normalize(vDir);
  vec3 drift = d * 3.2 + vec3(uTime * 0.004, 0.0, uTime * 0.003);
  float n = fbm(drift);
  float m = fbm(drift * 2.1 + 5.7);
  float fine = fbm(drift * 5.5 + 12.0);

  // Paleta astronômica: hidrogênio H-alpha (vermelho-rosado) + OIII (cyan/verde-azul) + poeira escura
  vec3 halpha = vec3(0.55, 0.12, 0.22);
  vec3 oiii   = vec3(0.08, 0.25, 0.38);
  vec3 dust   = vec3(0.09, 0.04, 0.12);

  vec3 col = mix(dust, halpha, smoothstep(0.55, 0.88, n));
  col = mix(col, oiii, smoothstep(0.58, 0.9, m) * 0.5);

  // Faixa da Via Láctea ao longo do plano (levemente inclinada)
  float galacticY = d.y * 0.92 + d.x * 0.08;
  float stripe = smoothstep(0.32, 0.0, abs(galacticY));
  col += stripe * vec3(0.18, 0.08, 0.14) * smoothstep(0.45, 0.95, n);

  // Pó escuro cortando a nebulosa (aumenta realismo)
  float darkLane = smoothstep(0.5, 0.2, fine);
  col *= mix(1.0, 0.55, darkLane * stripe);

  // Mask global forte — mantém o céu predominantemente preto
  float intensity = smoothstep(0.48, 0.95, n) * 0.22 + 0.015;
  // Realça apenas dentro da faixa galáctica
  intensity *= mix(0.35, 1.0, stripe * 0.6 + 0.4);

  gl_FragColor = vec4(col * intensity, 1.0);
}
`;

export default function Nebula() {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);

  useFrame((state) => {
    uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <mesh scale={90} renderOrder={-10}>
      <sphereGeometry args={[1, 48, 48]} />
      <shaderMaterial
        ref={mat}
        vertexShader={vert}
        fragmentShader={frag}
        uniforms={uniforms}
        side={THREE.BackSide}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}
